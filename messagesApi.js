import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";

const scrypt = promisify(scryptCallback);
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_AVATAR_BYTES = 512 * 1024;
const MAX_MESSAGE_LENGTH = 1200;
const SESSION_DAYS = 7;
const PROFANITY = [
  "fuck", "fucking", "fucked", "fucker", "fuckers", "motherfucker", "shit", "shitty",
  "bullshit", "bitch", "bitches", "bitching", "asshole", "assholes", "bastard",
  "bastards", "dickhead", "dickheads", "dick", "dicks", "prick", "pricks",
  "piss", "pissed", "crap", "damn", "dammit", "wtf", "jackass", "jackasses"
];
const PROFANITY_REGEX = new RegExp("\\b(" + PROFANITY.join("|") + ")\\b", "gi");
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".dll", ".com", ".scr", ".msi", ".bat", ".cmd", ".ps1", ".sh", ".js",
  ".mjs", ".cjs", ".html", ".htm", ".svg", ".jar", ".app", ".apk", ".reg", ".vbs"
]);
const MIME_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/json": "json",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "application/octet-stream": "bin"
};
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const makeDirectory = async (path) => mkdir(path, { recursive: true });
const safeFilename = (value) => basename(String(value || "attachment").replace(/[\u0000-\u001f\u007f]/g, "")).replace(/[<>:"/\\|?*]/g, "_").trim().slice(0, 120) || "attachment";
const hasProfanity = (value) => new RegExp(PROFANITY_REGEX.source, "i").test(String(value || ""));
const censorProfanity = (value) => String(value || "").replace(PROFANITY_REGEX, (word) => "*".repeat(Math.min(word.length, 12)));

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarFile ? "/api/messages/avatars/" + user.id + "?v=" + (user.avatarUpdatedAt || 0) : null,
    createdAt: user.createdAt
  };
}

export default async function registerMessagesRoutes(app) {
  const dataDirectory = process.env.DOGEUB_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || join(tmpdir(), "dogeub-messages");
  const attachmentDirectory = join(dataDirectory, "attachments");
  const avatarDirectory = join(dataDirectory, "avatars");
  const statePath = join(dataDirectory, "state.json");
  const secretPath = join(dataDirectory, "session-secret");
  await Promise.all([makeDirectory(attachmentDirectory), makeDirectory(avatarDirectory)]);

  let database = { users: [], messages: [], attachments: [], reports: [], groups: [], groupMembers: [], readStates: [], reactions: [], mutes: [] };
  try {
    const loaded = JSON.parse(await readFile(statePath, "utf8"));
    if (Array.isArray(loaded.users) && Array.isArray(loaded.messages) && Array.isArray(loaded.attachments)) {
      database = { ...database, ...loaded };
    }
  } catch {}
  if (!Array.isArray(database.groups)) database.groups = [];
  if (!Array.isArray(database.groupMembers)) database.groupMembers = [];
  if (!Array.isArray(database.readStates)) database.readStates = [];
  if (!Array.isArray(database.reactions)) database.reactions = [];
  if (!Array.isArray(database.mutes)) database.mutes = [];
  const makeInviteCode = () => {
    let code;
    do { code = randomBytes(4).toString("hex").toUpperCase(); }
    while (database.groups.some((group) => group.inviteCode === code));
    return code;
  };
  let legacyInviteCodesChanged = false;
  for (const group of database.groups) {
    if (!group.inviteCode) { group.inviteCode = makeInviteCode(); legacyInviteCodesChanged = true; }
  }
  const typingSessions = new Map();
  let sessionSecret = process.env.DOGEUB_CHAT_SECRET || process.env.SESSION_SECRET || "";
  if (!sessionSecret) {
    try {
      sessionSecret = await readFile(secretPath, "utf8");
    } catch {
      sessionSecret = randomBytes(48).toString("hex");
      await writeFile(secretPath, sessionSecret, { mode: 0o600 });
    }
  }

  let writeQueue = Promise.resolve();
  const persist = () => {
    const snapshot = JSON.stringify(database);
    writeQueue = writeQueue.catch(() => {}).then(async () => {
      const temporary = statePath + "." + process.pid + ".tmp";
      await writeFile(temporary, snapshot, { mode: 0o600 });
      await rename(temporary, statePath);
    });
    return writeQueue;
  };
  if (legacyInviteCodesChanged) await persist();

  // Clean up abandoned uploads from users who picked a file but never sent it.
  const referencedAttachmentIds = new Set(database.messages.map((message) => message.attachmentId).filter(Boolean));
  const expired = database.attachments.filter((attachment) => !referencedAttachmentIds.has(attachment.id) && Date.now() - attachment.createdAt > 24 * 60 * 60 * 1000);
  for (const attachment of expired) await unlink(join(attachmentDirectory, attachment.diskName)).catch(() => {});
  if (expired.length) {
    database.attachments = database.attachments.filter((item) => !expired.some((expiredItem) => expiredItem.id === item.id));
    await persist();
  }

  const signatureFor = (userId, expiresAt) => createHmac("sha256", sessionSecret).update(userId + "." + expiresAt).digest("base64url");
  const sessionFor = (userId) => {
    const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    return userId + "." + expiresAt + "." + signatureFor(userId, expiresAt);
  };
  const currentUser = (request) => {
    const value = request.cookies?.dogeub_chat_session;
    if (!value) return null;
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const userId = parts[0];
    const expiresAt = Number(parts[1]);
    const suppliedSignature = parts[2];
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
    const expected = Buffer.from(signatureFor(userId, expiresAt), "utf8");
    const supplied = Buffer.from(suppliedSignature, "utf8");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    return database.users.find((user) => user.id === userId) || null;
  };
  const setSession = (reply, userId) => {
    reply.setCookie("dogeub_chat_session", sessionFor(userId), {
      path: "/", httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DAYS * 24 * 60 * 60
    });
  };
  const clearSession = (reply) => reply.clearCookie("dogeub_chat_session", { path: "/" });
  const sendError = (reply, statusCode, message) => reply.code(statusCode).send({ error: message });
  const requireUser = (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      sendError(reply, 401, "Sign in to DOGEUB Messages to continue.");
      return null;
    }
    return user;
  };

  const rateBuckets = new Map();
  const allowRate = (key, limit, windowMs) => {
    const current = Date.now();
    const recent = (rateBuckets.get(key) || []).filter((stamp) => current - stamp < windowMs);
    if (recent.length >= limit) {
      rateBuckets.set(key, recent);
      return false;
    }
    recent.push(current);
    rateBuckets.set(key, recent);
    if (rateBuckets.size > 10000) {
      for (const [bucket, stamps] of rateBuckets) {
        if (!stamps.length || current - stamps[stamps.length - 1] > 60 * 60 * 1000) rateBuckets.delete(bucket);
      }
    }
    return true;
  };

  const userBucket = (request, user) => user?.id || request.ip || "unknown";
  const getAttachment = (attachmentId) => database.attachments.find((item) => item.id === attachmentId);
  const attachmentForMessage = (attachmentId) => {
    const attachment = getAttachment(attachmentId);
    if (!attachment) return null;
    return { id: attachment.id, name: attachment.name, type: attachment.type, size: attachment.size, url: "/api/messages/attachments/" + attachment.id };
  };
  const messageForClient = (message, viewerId = null) => {
    const parent = message.replyToId ? database.messages.find((item) => item.id === message.replyToId) : null;
    const sender = publicUser(database.users.find((user) => user.id === message.senderId));
    const reactions = new Map();
    for (const reaction of database.reactions.filter((item) => item.messageId === message.id)) {
      const existing = reactions.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, reacted: false };
      existing.count += 1;
      if (viewerId && reaction.userId === viewerId) existing.reacted = true;
      reactions.set(reaction.emoji, existing);
    }
    let receipt = null;
    if (viewerId && message.senderId === viewerId && message.channel === "dm" && message.recipientId) {
      receipt = getReadAt(message.recipientId, "dm", message.senderId) >= message.createdAt ? "Read" : "Sent";
    }
    let readCount = 0;
    if (viewerId && message.senderId === viewerId && message.channel === "group" && message.groupId) {
      readCount = database.groupMembers
        .filter((member) => member.groupId === message.groupId && member.userId !== viewerId)
        .filter((member) => getReadAt(member.userId, "group", null, message.groupId) >= message.createdAt).length;
    }
    return {
      id: message.id,
      channel: message.channel,
      groupId: message.groupId || null,
      text: message.text,
      createdAt: message.createdAt,
      editedAt: message.editedAt || null,
      pinned: Boolean(message.pinned),
      replyToId: message.replyToId || null,
      replyTo: parent ? {
        id: parent.id,
        text: parent.text || (parent.attachmentId ? "Attachment" : ""),
        sender: publicUser(database.users.find((user) => user.id === parent.senderId))
      } : null,
      sender,
      attachment: message.attachmentId ? attachmentForMessage(message.attachmentId) : null,
      reactions: [...reactions.values()],
      receipt,
      readCount
    };
  };
  const normalizeUsername = (username) => String(username || "").trim().toLowerCase();
  const validateUsername = (username) => {
    const normalized = normalizeUsername(username);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(String(username || "").trim())) {
      return "Usernames must be 3–20 characters and use only letters, numbers, and underscores.";
    }
    if (hasProfanity(normalized)) return "Please choose a username without profanity.";
    return null;
  };
  const findUsername = (username) => database.users.find((user) => user.normalizedUsername === normalizeUsername(username));
  const validateMessageRate = (request, reply, user) => {
    if (!allowRate("message:" + userBucket(request, user), 12, 15000)) {
      sendError(reply, 429, "You're sending messages too quickly. Take a moment and try again.");
      return false;
    }
    return true;
  };

  app.get("/api/messages/session", async (request, reply) => reply.send({ user: publicUser(currentUser(request)) }));

  app.post("/api/messages/register", async (request, reply) => {
    const ip = request.ip || "unknown";
    if (!allowRate("register:" + ip, 8, 60 * 60 * 1000)) return sendError(reply, 429, "Too many sign-up attempts. Try again later.");
    const username = String(request.body?.username || "").trim();
    const password = String(request.body?.password || "");
    const usernameError = validateUsername(username);
    if (usernameError) return sendError(reply, 400, usernameError);
    if (password.length < 8 || password.length > 128) return sendError(reply, 400, "Use a password between 8 and 128 characters.");
    if (findUsername(username)) return sendError(reply, 409, "That username is already taken.");
    const salt = randomBytes(16).toString("base64url");
    const passwordHash = (await scrypt(password, salt, 64)).toString("base64url");
    // Re-check after async password hashing so simultaneous registrations cannot claim the same username.
    if (findUsername(username)) return sendError(reply, 409, "That username is already taken.");
    const user = {
      id: randomUUID(), username, normalizedUsername: normalizeUsername(username),
      passwordSalt: salt, passwordHash, avatarFile: null, avatarType: null,
      avatarUpdatedAt: 0, createdAt: Date.now()
    };
    database.users.push(user);
    try {
      await persist();
    } catch {
      database.users = database.users.filter((item) => item.id !== user.id);
      return sendError(reply, 500, "Your account could not be saved. Check that the messages data directory is writable.");
    }
    setSession(reply, user.id);
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post("/api/messages/login", async (request, reply) => {
    const ip = request.ip || "unknown";
    if (!allowRate("login:" + ip, 15, 5 * 60 * 1000)) return sendError(reply, 429, "Too many sign-in attempts. Try again in a few minutes.");
    const username = String(request.body?.username || "").trim();
    const password = String(request.body?.password || "");
    const user = findUsername(username);
    const salt = user?.passwordSalt || "dogeub-invalid-user-salt";
    const suppliedHash = (await scrypt(password, salt, 64)).toString("base64url");
    if (!user || suppliedHash !== user.passwordHash) return sendError(reply, 401, "That username or password doesn't match.");
    setSession(reply, user.id);
    return reply.send({ user: publicUser(user) });
  });

  app.post("/api/messages/logout", async (_request, reply) => {
    clearSession(reply);
    return reply.send({ ok: true });
  });

  app.patch("/api/messages/profile", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const changes = request.body || {};
    const oldUsername = user.username;
    const oldNormalizedUsername = user.normalizedUsername;
    if (Object.prototype.hasOwnProperty.call(changes, "username")) {
      const username = String(changes.username || "").trim();
      const usernameError = validateUsername(username);
      if (usernameError) return sendError(reply, 400, usernameError);
      const existing = findUsername(username);
      if (existing && existing.id !== user.id) return sendError(reply, 409, "That username is already taken.");
      user.username = username;
      user.normalizedUsername = normalizeUsername(username);
    }

    let oldAvatarFile = null;
    if (typeof changes.avatarDataUrl === "string") {
      const match = changes.avatarDataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        user.username = oldUsername;
        user.normalizedUsername = oldNormalizedUsername;
        return sendError(reply, 400, "Choose a PNG, JPG, WebP, or GIF profile picture.");
      }
      const mime = match[1];
      const bytes = Buffer.from(match[2], "base64");
      if (!ALLOWED_AVATAR_TYPES.has(mime) || bytes.length > MAX_AVATAR_BYTES) {
        user.username = oldUsername;
        user.normalizedUsername = oldNormalizedUsername;
        return sendError(reply, 400, "Profile pictures must be supported images under 512 KB.");
      }
      const fileName = user.id + "." + MIME_EXTENSIONS[mime];
      oldAvatarFile = user.avatarFile;
      await writeFile(join(avatarDirectory, fileName), bytes, { mode: 0o600 });
      user.avatarFile = fileName;
      user.avatarType = mime;
      user.avatarUpdatedAt = Date.now();
    } else if (changes.clearAvatar === true) {
      oldAvatarFile = user.avatarFile;
      user.avatarFile = null;
      user.avatarType = null;
      user.avatarUpdatedAt = Date.now();
    }

    try {
      await persist();
    } catch {
      return sendError(reply, 500, "Your profile could not be saved.");
    }
    if (oldAvatarFile && oldAvatarFile !== user.avatarFile) await unlink(join(avatarDirectory, oldAvatarFile)).catch(() => {});
    return reply.send({ user: publicUser(user) });
  });

  app.get("/api/messages/users", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("users:" + user.id, 60, 60_000)) return sendError(reply, 429, "Please slow down your user searches.");
    const query = String(request.query?.q || "").trim().slice(0, 30).toLowerCase();
    if (!query) return reply.send({ users: [] });
    const users = database.users
      .filter((candidate) => candidate.id !== user.id && candidate.normalizedUsername.includes(query))
      .sort((a, b) => a.normalizedUsername.localeCompare(b.normalizedUsername))
      .slice(0, 20)
      .map(publicUser);
    return reply.send({ users });
  });

  const publicGroup = (group, viewerId = null) => ({
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    inviteCode: group.inviteCode,
    isOwner: Boolean(viewerId && group.createdBy === viewerId),
    memberCount: database.groupMembers.filter((member) => member.groupId === group.id).length
  });
  const isGroupMember = (groupId, userId) => database.groupMembers.some((member) => member.groupId === groupId && member.userId === userId);
  const getReadAt = (userId, channel, peerId = null, groupId = null) => {
    const state = database.readStates.find((item) => item.userId === userId && item.channel === channel &&
      (item.peerId || null) === peerId && (item.groupId || null) === groupId);
    return state?.lastReadAt || 0;
  };
  const setReadAt = (userId, channel, peerId = null, groupId = null, timestamp = Date.now()) => {
    let state = database.readStates.find((item) => item.userId === userId && item.channel === channel &&
      (item.peerId || null) === peerId && (item.groupId || null) === groupId);
    if (!state) {
      state = { userId, channel, peerId, groupId, lastReadAt: timestamp };
      database.readStates.push(state);
    } else {
      state.lastReadAt = Math.max(state.lastReadAt || 0, timestamp);
    }
    return state.lastReadAt;
  };
  const canReadMessage = (message, userId) => Boolean(message && (
    message.channel === "global" ||
    (message.channel === "dm" && (message.senderId === userId || message.recipientId === userId)) ||
    (message.channel === "group" && isGroupMember(message.groupId, userId))
  ));
  const dmPeerFor = (message, userId) => message.senderId === userId ? message.recipientId : message.senderId;
  const muteMatches = (userId, message) => database.mutes.some((mute) => {
    if (mute.userId !== userId || mute.channel !== message.channel) return false;
    if (message.channel === "dm") return mute.peerId === dmPeerFor(message, userId);
    if (message.channel === "group") return mute.groupId === message.groupId;
    return message.channel === "global";
  });
  const typingScope = (channel, userId, peerId, groupId) => {
    if (channel === "global") return "global";
    if (channel === "group") return "group:" + groupId;
    return "dm:" + [userId, peerId].sort().join(":");
  };

  app.get("/api/messages/groups", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const groups = database.groups
      .filter((group) => isGroupMember(group.id, user.id))
      .map((group) => publicGroup(group, user.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return reply.send({ groups });
  });

  // Entering a known name joins that saved group; entering a new name creates it.
  app.post("/api/messages/groups/join", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("groups:" + user.id, 20, 60_000)) return sendError(reply, 429, "Please slow down group joins.");
    const name = String(request.body?.name || "").trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 40) return sendError(reply, 400, "Group names must be 3–40 characters.");
    if (hasProfanity(name)) return sendError(reply, 400, "Please choose a group name without profanity.");
    const normalizedName = name.toLocaleLowerCase("en-US");
    let group = database.groups.find((candidate) => candidate.normalizedName === normalizedName || candidate.inviteCode?.toLowerCase() === normalizedName);
    let created = false;
    if (!group) {
      group = { id: randomUUID(), name, normalizedName, createdBy: user.id, inviteCode: makeInviteCode(), createdAt: Date.now() };
      database.groups.push(group);
      created = true;
    }
    let membership = database.groupMembers.find((item) => item.groupId === group.id && item.userId === user.id);
    if (!membership) {
      membership = { groupId: group.id, userId: user.id, joinedAt: Date.now() };
      database.groupMembers.push(membership);
    }
    try {
      await persist();
    } catch {
      if (created) database.groups = database.groups.filter((item) => item.id !== group.id);
      database.groupMembers = database.groupMembers.filter((item) => item !== membership);
      return sendError(reply, 500, "That group could not be saved. Check the Messages data directory.");
    }
    return reply.send({ group: publicGroup(group, user.id), created, joined: true });
  });

  app.get("/api/messages/notifications", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const since = Number(request.query?.since || 0);
    const cursor = Date.now();
    const notifications = database.messages
      .filter((message) => message.createdAt > since && message.createdAt <= cursor && message.senderId !== user.id && !muteMatches(user.id, message) && (
        message.channel === "global" ||
        (message.channel === "dm" && message.recipientId === user.id) ||
        (message.channel === "group" && isGroupMember(message.groupId, user.id))
      ))
      .slice(-50)
      .map((message) => ({
        kind: message.channel,
        groupName: message.channel === "group" ? database.groups.find((group) => group.id === message.groupId)?.name || "Group chat" : null,
        message: messageForClient(message)
      }));
    return reply.send({ notifications, cursor });
  });

  app.get("/api/messages/conversations", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const latestByUser = new Map();
    for (const message of database.messages) {
      if (message.channel !== "dm") continue;
      let otherId = null;
      if (message.senderId === user.id) otherId = message.recipientId;
      else if (message.recipientId === user.id) otherId = message.senderId;
      if (!otherId) continue;
      const prior = latestByUser.get(otherId);
      if (!prior || prior.createdAt < message.createdAt) latestByUser.set(otherId, message);
    }
    const conversations = [...latestByUser.entries()]
      .map(([otherId, lastMessage]) => ({
        user: publicUser(database.users.find((candidate) => candidate.id === otherId)),
        lastMessage: censorProfanity(lastMessage.text || ""),
        createdAt: lastMessage.createdAt
      }))
      .filter((item) => item.user)
      .sort((a, b) => b.createdAt - a.createdAt);
    return reply.send({ conversations });
  });

  app.get("/api/messages/messages", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const channel = String(request.query?.channel || "global");
    let messages;
    if (channel === "global") {
      messages = database.messages.filter((message) => message.channel === "global");
    } else if (channel === "group") {
      const groupId = String(request.query?.groupId || "");
      const group = database.groups.find((candidate) => candidate.id === groupId);
      if (!group || !isGroupMember(groupId, user.id)) return sendError(reply, 404, "Join that group before opening its messages.");
      messages = database.messages.filter((message) => message.channel === "group" && message.groupId === groupId);
    } else if (channel === "dm") {
      const peerId = String(request.query?.with || "");
      if (!peerId || !database.users.some((candidate) => candidate.id === peerId) || peerId === user.id) {
        return sendError(reply, 400, "Choose a valid direct-message conversation.");
      }
      messages = database.messages.filter((message) =>
        message.channel === "dm" &&
        ((message.senderId === user.id && message.recipientId === peerId) ||
         (message.senderId === peerId && message.recipientId === user.id))
      );
    } else {
      return sendError(reply, 400, "Unknown message channel.");
    }
    const recentMessages = messages.slice(-100);
    const retainedPins = messages.filter((message) => message.pinned).slice(-50);
    const visibleMessages = [...new Map([...retainedPins, ...recentMessages].map((message) => [message.id, message])).values()]
      .sort((a, b) => a.createdAt - b.createdAt);
    return reply.send({ messages: visibleMessages.map((message) => messageForClient(message, user.id)) });
  });

  app.post("/api/messages/messages", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!validateMessageRate(request, reply, user)) return;
    const channel = String(request.body?.channel || "global");
    const text = String(request.body?.text || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    const attachmentId = request.body?.attachmentId ? String(request.body.attachmentId) : null;
    if (!text && !attachmentId) return sendError(reply, 400, "Write a message or attach a file.");
    let recipientId = null;
    let groupId = null;
    if (channel === "group") {
      groupId = String(request.body?.groupId || "");
      const group = database.groups.find((candidate) => candidate.id === groupId);
      if (!group || !isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group before sending messages there.");
    } else if (channel === "dm") {
      recipientId = String(request.body?.recipientId || "");
      if (!recipientId || recipientId === user.id || !database.users.some((candidate) => candidate.id === recipientId)) {
        return sendError(reply, 400, "Choose a valid direct-message recipient.");
      }
    } else if (channel !== "global") {
      return sendError(reply, 400, "Unknown message channel.");
    }
    let attachment = null;
    if (attachmentId) {
      attachment = getAttachment(attachmentId);
      if (!attachment || attachment.ownerId !== user.id || attachment.messageId) {
        return sendError(reply, 400, "That attachment is no longer available. Pick it from DogeFiler again.");
      }
    }
    const replyToId = request.body?.replyToId ? String(request.body.replyToId) : null;
    if (replyToId) {
      const parent = database.messages.find((item) => item.id === replyToId);
      const sameConversation = parent && parent.channel === channel && (
        channel === "global" ||
        (channel === "group" && parent.groupId === groupId) ||
        (channel === "dm" && [parent.senderId, parent.recipientId].sort().join(":") === [user.id, recipientId].sort().join(":"))
      );
      if (!sameConversation || !canReadMessage(parent, user.id)) return sendError(reply, 400, "That reply target isn't in this conversation.");
    }
    const message = {
      id: randomUUID(), channel, senderId: user.id, recipientId, groupId,
      text: censorProfanity(text), attachmentId, replyToId, pinned: false, createdAt: Date.now()
    };
    database.messages.push(message);
    if (database.messages.length > 20000) database.messages.splice(0, database.messages.length - 20000);
    if (attachment) attachment.messageId = message.id;
    try {
      await persist();
    } catch {
      database.messages = database.messages.filter((item) => item.id !== message.id);
      if (attachment) attachment.messageId = null;
      return sendError(reply, 500, "Your message could not be saved. Try again.");
    }
    return reply.code(201).send({ message: messageForClient(message, user.id) });
  });

  app.post("/api/messages/attachments", { bodyLimit: 8 * 1024 * 1024 }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("upload:" + user.id, 10, 60_000)) return sendError(reply, 429, "Too many file uploads. Try again in a minute.");
    const body = request.body || {};
    const name = safeFilename(body.name);
    const type = String(body.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
    if (BLOCKED_EXTENSIONS.has(extname(name).toLowerCase())) return sendError(reply, 415, "That file type cannot be attached.");
    if (!MIME_EXTENSIONS[type]) return sendError(reply, 415, "This file type is not supported in Messages yet.");
    if (typeof body.base64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64)) return sendError(reply, 400, "The attachment data is invalid.");
    const bytes = Buffer.from(body.base64, "base64");
    if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES) return sendError(reply, 413, "Attachments must be between 1 byte and 4 MB.");
    if (Number(body.size) !== bytes.length) return sendError(reply, 400, "The attachment size did not match the uploaded data.");
    const accountStorageBytes = database.attachments
      .filter((item) => item.ownerId === user.id)
      .reduce((total, item) => total + item.size, 0);
    if (accountStorageBytes + bytes.length > 50 * 1024 * 1024) {
      return sendError(reply, 413, "Your Messages attachment storage has reached its 50 MB limit. Old attachments still count toward this limit.");
    }
    const id = randomUUID();
    const diskName = id + "." + MIME_EXTENSIONS[type];
    try {
      await writeFile(join(attachmentDirectory, diskName), bytes, { flag: "wx", mode: 0o600 });
    } catch {
      return sendError(reply, 500, "The attachment could not be stored.");
    }
    const attachment = { id, name, type, size: bytes.length, ownerId: user.id, messageId: null, createdAt: Date.now(), diskName };
    database.attachments.push(attachment);
    try {
      await persist();
    } catch {
      database.attachments = database.attachments.filter((item) => item.id !== id);
      await unlink(join(attachmentDirectory, diskName)).catch(() => {});
      return sendError(reply, 500, "The attachment could not be saved.");
    }
    return reply.code(201).send({ attachment: attachmentForMessage(id) });
  });

  app.get("/api/messages/attachments/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const attachment = getAttachment(String(request.params?.id || ""));
    if (!attachment) return sendError(reply, 404, "Attachment not found.");
    const message = database.messages.find((candidate) => candidate.id === attachment.messageId);
    const isUploader = attachment.ownerId === user.id;
    const canReadMessage = message && (
      message.channel === "global" ||
      (message.channel === "dm" && (message.senderId === user.id || message.recipientId === user.id)) ||
      (message.channel === "group" && isGroupMember(message.groupId, user.id))
    );
    if (!isUploader && !canReadMessage) return sendError(reply, 404, "Attachment not found.");
    let bytes;
    try {
      bytes = await readFile(join(attachmentDirectory, attachment.diskName));
    } catch {
      return sendError(reply, 404, "Attachment file is missing.");
    }
    const asciiName = attachment.name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    reply.header("Content-Type", "application/octet-stream");
    reply.header("Content-Disposition", "attachment; filename=\"" + asciiName + "\"; filename*=UTF-8''" + encodeURIComponent(attachment.name));
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "private, no-store");
    return reply.send(bytes);
  });

  app.get("/api/messages/avatars/:userId", async (request, reply) => {
    const viewer = requireUser(request, reply);
    if (!viewer) return;
    const user = database.users.find((candidate) => candidate.id === String(request.params?.userId || ""));
    if (!user?.avatarFile || !ALLOWED_AVATAR_TYPES.has(user.avatarType)) return sendError(reply, 404, "Profile picture not found.");
    let bytes;
    try {
      bytes = await readFile(join(avatarDirectory, user.avatarFile));
    } catch {
      return sendError(reply, 404, "Profile picture not found.");
    }
    reply.header("Content-Type", user.avatarType);
    reply.header("Content-Length", bytes.length);
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(bytes);
  });

  app.post("/api/messages/read", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const channel = String(request.body?.channel || "");
    let peerId = null;
    let groupId = null;
    if (channel === "dm") {
      peerId = String(request.body?.peerId || "");
      if (!peerId || peerId === user.id || !database.users.some((candidate) => candidate.id === peerId)) return sendError(reply, 400, "Choose a valid DM conversation.");
    } else if (channel === "group") {
      groupId = String(request.body?.groupId || "");
      if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group to mark it as read.");
    } else if (channel !== "global") return sendError(reply, 400, "Unknown read state.");
    const lastMessageAt = database.messages.reduce((latest, message) => {
      const matches = channel === "global" ? message.channel === "global" :
        channel === "dm" ? message.channel === "dm" && ((message.senderId === user.id && message.recipientId === peerId) || (message.senderId === peerId && message.recipientId === user.id)) :
        message.channel === "group" && message.groupId === groupId;
      return matches ? Math.max(latest, message.createdAt) : latest;
    }, 0);
    const previousReadAt = getReadAt(user.id, channel, peerId, groupId);
    const timestamp = Math.max(previousReadAt, lastMessageAt);
    if (timestamp > previousReadAt) {
      setReadAt(user.id, channel, peerId, groupId, timestamp);
      try { await persist(); } catch { return sendError(reply, 500, "Read state could not be saved."); }
    }
    return reply.send({ ok: true, lastReadAt: timestamp });
  });

  app.get("/api/messages/unread", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const unread = { global: 0, dms: {}, groups: {} };
    for (const message of database.messages) {
      if (message.senderId === user.id) continue;
      if (message.channel === "global" && message.createdAt > getReadAt(user.id, "global")) unread.global += 1;
      else if (message.channel === "dm" && (message.senderId === user.id || message.recipientId === user.id)) {
        const peerId = dmPeerFor(message, user.id);
        if (message.createdAt > getReadAt(user.id, "dm", peerId)) unread.dms[peerId] = (unread.dms[peerId] || 0) + 1;
      } else if (message.channel === "group" && isGroupMember(message.groupId, user.id) && message.createdAt > getReadAt(user.id, "group", null, message.groupId)) {
        unread.groups[message.groupId] = (unread.groups[message.groupId] || 0) + 1;
      }
    }
    return reply.send({ unread });
  });

  app.get("/api/messages/typing", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const channel = String(request.query?.channel || "global");
    let peerId = null;
    let groupId = null;
    if (channel === "dm") {
      peerId = String(request.query?.with || "");
      if (!peerId || peerId === user.id) return sendError(reply, 400, "Choose a DM conversation.");
    } else if (channel === "group") {
      groupId = String(request.query?.groupId || "");
      if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group first.");
    } else if (channel !== "global") return sendError(reply, 400, "Unknown typing channel.");
    const scope = typingScope(channel, user.id, peerId, groupId);
    const now = Date.now();
    for (const [key, item] of typingSessions) if (item.expiresAt < now) typingSessions.delete(key);
    const users = [...typingSessions.values()].filter((item) => item.scope === scope && item.userId !== user.id && item.expiresAt >= now).map((item) => ({ id: item.userId, username: item.username }));
    return reply.send({ users });
  });

  app.post("/api/messages/typing", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const channel = String(request.body?.channel || "global");
    let peerId = null;
    let groupId = null;
    if (channel === "dm") {
      peerId = String(request.body?.peerId || "");
      if (!peerId || peerId === user.id) return sendError(reply, 400, "Choose a DM conversation.");
    } else if (channel === "group") {
      groupId = String(request.body?.groupId || "");
      if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group first.");
    } else if (channel !== "global") return sendError(reply, 400, "Unknown typing channel.");
    const scope = typingScope(channel, user.id, peerId, groupId);
    const key = scope + ":" + user.id;
    if (request.body?.typing === false) typingSessions.delete(key);
    else typingSessions.set(key, {
      scope, userId: user.id, username: user.username,
      expiresAt: Date.now() + 6500
    });
    return reply.send({ ok: true });
  });

  app.get("/api/messages/mutes", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return reply.send({ mutes: database.mutes.filter((item) => item.userId === user.id) });
  });

  app.post("/api/messages/mute", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const channel = String(request.body?.channel || "");
    let peerId = null;
    let groupId = null;
    if (channel === "global") {
      // Global chat can be muted as a whole.
    } else if (channel === "dm") {
      peerId = String(request.body?.peerId || "");
      if (!peerId || peerId === user.id) return sendError(reply, 400, "Choose a DM conversation.");
    } else if (channel === "group") {
      groupId = String(request.body?.groupId || "");
      if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group first.");
    } else return sendError(reply, 400, "Unknown mute channel.");
    database.mutes = database.mutes.filter((item) => !(item.userId === user.id && item.channel === channel && (item.peerId || null) === peerId && (item.groupId || null) === groupId));
    const muted = request.body?.muted === true;
    if (muted) database.mutes.push({ userId: user.id, channel, peerId, groupId, createdAt: Date.now() });
    try { await persist(); } catch { return sendError(reply, 500, "Mute preference could not be saved."); }
    return reply.send({ ok: true, muted });
  });

  app.get("/api/messages/search", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("search:" + user.id, 30, 60_000)) return sendError(reply, 429, "Please slow down message searches.");
    const q = String(request.query?.q || "").trim().slice(0, 100).toLowerCase();
    if (q.length < 2) return reply.send({ messages: [] });
    const channel = String(request.query?.channel || "global");
    let allowed;
    if (channel === "global") allowed = database.messages.filter((message) => message.channel === "global");
    else if (channel === "dm") {
      const peerId = String(request.query?.with || "");
      if (!peerId || peerId === user.id) return sendError(reply, 400, "Choose a DM conversation.");
      allowed = database.messages.filter((message) => message.channel === "dm" && ((message.senderId === user.id && message.recipientId === peerId) || (message.senderId === peerId && message.recipientId === user.id)));
    } else if (channel === "group") {
      const groupId = String(request.query?.groupId || "");
      if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group first.");
      allowed = database.messages.filter((message) => message.channel === "group" && message.groupId === groupId);
    } else return sendError(reply, 400, "Unknown search channel.");
    const results = allowed.filter((message) => String(message.text || "").toLowerCase().includes(q)).slice(-50).reverse();
    return reply.send({ messages: results.map((message) => messageForClient(message, user.id)) });
  });

  app.post("/api/messages/reactions", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const messageId = String(request.body?.messageId || "");
    const emoji = String(request.body?.emoji || "");
    if (!["👍", "❤️", "😂", "😮", "🎉", "👎"].includes(emoji)) return sendError(reply, 400, "Choose a supported reaction.");
    const message = database.messages.find((item) => item.id === messageId);
    if (!canReadMessage(message, user.id)) return sendError(reply, 404, "Message not found.");
    const existing = database.reactions.find((item) => item.messageId === messageId && item.userId === user.id && item.emoji === emoji);
    if (existing) database.reactions = database.reactions.filter((item) => item !== existing);
    else database.reactions.push({ messageId, userId: user.id, emoji, createdAt: Date.now() });
    try { await persist(); } catch { return sendError(reply, 500, "Reaction could not be saved."); }
    return reply.send({ ok: true, reactions: database.reactions.filter((item) => item.messageId === messageId) });
  });

  app.post("/api/messages/edit", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const message = database.messages.find((item) => item.id === String(request.body?.messageId || ""));
    if (!message || message.senderId !== user.id || !canReadMessage(message, user.id)) return sendError(reply, 404, "You can only edit your own messages in conversations you can access.");
    const text = String(request.body?.text || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return sendError(reply, 400, "Edited messages cannot be empty.");
    message.text = censorProfanity(text);
    message.editedAt = Date.now();
    try { await persist(); } catch { return sendError(reply, 500, "Message edit could not be saved."); }
    return reply.send({ message: messageForClient(message, user.id) });
  });

  app.post("/api/messages/delete", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const message = database.messages.find((item) => item.id === String(request.body?.messageId || ""));
    if (!message || message.senderId !== user.id || !canReadMessage(message, user.id)) return sendError(reply, 404, "You can only delete your own messages in conversations you can access.");
    database.messages = database.messages.filter((item) => item.id !== message.id);
    database.reactions = database.reactions.filter((item) => item.messageId !== message.id);
    for (const child of database.messages) if (child.replyToId === message.id) child.replyToId = null;
    try { await persist(); } catch { return sendError(reply, 500, "Message deletion could not be saved."); }
    return reply.send({ ok: true, messageId: message.id });
  });

  app.post("/api/messages/pin", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const message = database.messages.find((item) => item.id === String(request.body?.messageId || ""));
    if (!canReadMessage(message, user.id)) return sendError(reply, 404, "Message not found.");
    message.pinned = request.body?.pinned === true;
    message.pinnedBy = message.pinned ? user.id : null;
    message.pinnedAt = message.pinned ? Date.now() : null;
    try { await persist(); } catch { return sendError(reply, 500, "Pin could not be saved."); }
    return reply.send({ ok: true, pinned: message.pinned });
  });

  app.get("/api/messages/groups/members", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const groupId = String(request.query?.groupId || "");
    if (!isGroupMember(groupId, user.id)) return sendError(reply, 403, "Join that group first.");
    const group = database.groups.find((item) => item.id === groupId);
    return reply.send({
      group: publicGroup(group, user.id),
      members: database.groupMembers.filter((member) => member.groupId === groupId).map((member) => ({
        id: member.userId,
        username: database.users.find((candidate) => candidate.id === member.userId)?.username || "Unknown",
        owner: group.createdBy === member.userId
      }))
    });
  });

  app.post("/api/messages/groups/manage", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const groupId = String(request.body?.groupId || "");
    const group = database.groups.find((item) => item.id === groupId);
    if (!group || !isGroupMember(groupId, user.id)) return sendError(reply, 404, "Group not found.");
    if (group.createdBy !== user.id) return sendError(reply, 403, "Only the group owner can manage members or rename the group.");
    const action = String(request.body?.action || "");
    if (action === "rename") {
      const name = String(request.body?.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 3 || name.length > 40 || hasProfanity(name)) return sendError(reply, 400, "Choose a group name between 3 and 40 characters without profanity.");
      const normalizedName = name.toLocaleLowerCase("en-US");
      if (database.groups.some((other) => other.id !== groupId && other.normalizedName === normalizedName)) return sendError(reply, 409, "That group name is already taken.");
      group.name = name;
      group.normalizedName = normalizedName;
    } else if (action === "kick") {
      const targetId = String(request.body?.userId || "");
      if (!targetId || targetId === user.id || !isGroupMember(groupId, targetId)) return sendError(reply, 400, "Choose another member to remove.");
      database.groupMembers = database.groupMembers.filter((item) => !(item.groupId === groupId && item.userId === targetId));
    } else if (action === "invite-code") {
      group.inviteCode = makeInviteCode();
    } else return sendError(reply, 400, "Unknown group management action.");
    try { await persist(); } catch { return sendError(reply, 500, "Group changes could not be saved."); }
    return reply.send({ group: publicGroup(group, user.id), ok: true });
  });

  app.post("/api/messages/report", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("report:" + user.id, 5, 60 * 60 * 1000)) return sendError(reply, 429, "You have reached the hourly report limit.");
    const messageId = String(request.body?.messageId || "");
    const reason = String(request.body?.reason || "Other").slice(0, 80);
    const message = database.messages.find((candidate) => candidate.id === messageId);
    if (!message || message.senderId === user.id) return sendError(reply, 404, "Message not found.");
    const report = { id: randomUUID(), messageId, reporterId: user.id, reason, createdAt: Date.now() };
    if (!Array.isArray(database.reports)) database.reports = [];
    database.reports.push(report);
    if (database.reports.length > 5000) database.reports.splice(0, database.reports.length - 5000);
    try {
      await persist();
    } catch {
      database.reports = database.reports.filter((item) => item.id !== report.id);
      return sendError(reply, 500, "The report could not be submitted.");
    }
    return reply.code(201).send({ ok: true });
  });
}
