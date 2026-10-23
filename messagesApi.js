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
  const age = Date.now() - (Number(user.lastSeenAt) || 0);
  const presence = age < 90_000 ? "online" : age < 5 * 60_000 ? "away" : "offline";
  const moderators = String(process.env.DOGEUB_MODERATOR_USERNAMES || "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const admins = String(process.env.DOGEUB_ADMIN_USERNAMES || "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const normalizedUsername = String(user.normalizedUsername || user.username || "").toLowerCase();
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarFile ? "/api/messages/avatars/" + user.id + "?v=" + (user.avatarUpdatedAt || 0) : null,
    createdAt: user.createdAt,
    bio: String(user.bio || "").slice(0, 200),
    statusMessage: String(user.statusMessage || "").slice(0, 80),
    bannerColor: /^#[0-9a-f]{6}$/i.test(user.bannerColor || "") ? user.bannerColor : "#172554",
    presence,
    lastSeenAt: presence === "online" ? null : (Number(user.lastSeenAt) || null),
    isModerator: moderators.includes(normalizedUsername),
    isAdmin: admins.includes(normalizedUsername) || user.isAdminGranted === true,
    title: admins.includes(normalizedUsername) || user.isAdminGranted === true ? "DOGEUB Architect" : null,
    isGuest: Boolean(user.isGuest)
  };
}

export default async function registerMessagesRoutes(app) {
  const dataDirectory = process.env.DOGEUB_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || join(tmpdir(), "dogeub-messages");
  const attachmentDirectory = join(dataDirectory, "attachments");
  const avatarDirectory = join(dataDirectory, "avatars");
  const statePath = join(dataDirectory, "state.json");
  const secretPath = join(dataDirectory, "session-secret");
  await Promise.all([makeDirectory(attachmentDirectory), makeDirectory(avatarDirectory)]);

  let database = { users: [], messages: [], attachments: [], reports: [], groups: [], groupMembers: [], readStates: [], reactions: [], mutes: [], friendRequests: [], friendships: [], blocks: [], notifications: [], adminAudit: [], conversationObservers: [], adminSettings: { announcement: "", announcementEnabled: false, registrationPaused: false, updatedAt: null, updatedBy: null } };
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
  if (!Array.isArray(database.friendRequests)) database.friendRequests = [];
  if (!Array.isArray(database.friendships)) database.friendships = [];
  if (!Array.isArray(database.blocks)) database.blocks = [];
  if (!Array.isArray(database.notifications)) database.notifications = [];
  if (!Array.isArray(database.adminAudit)) database.adminAudit = [];
  if (!Array.isArray(database.conversationObservers)) database.conversationObservers = [];
  if (!database.adminSettings || typeof database.adminSettings !== "object") database.adminSettings = {};
  database.adminSettings = {
    announcement: String(database.adminSettings.announcement || "").slice(0, 300),
    announcementEnabled: database.adminSettings.announcementEnabled === true,
    registrationPaused: database.adminSettings.registrationPaused === true,
    gamesDisabled: database.adminSettings.gamesDisabled === true,
    serverMuted: database.adminSettings.serverMuted === true,
    browsingDisabled: database.adminSettings.browsingDisabled === true,
    maintenanceMode: database.adminSettings.maintenanceMode === true,
    maintenanceMessage: String(database.adminSettings.maintenanceMessage || "DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.").slice(0, 300),
    updatedAt: database.adminSettings.updatedAt || null,
    updatedBy: database.adminSettings.updatedBy || null
  };
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
    if (user.isSuspended) {
      sendError(reply, 403, "This DOGEUB Messages account is suspended. Contact a site administrator if you believe this is a mistake.");
      return null;
    }
    return user;
  };
  const configuredAdmins = new Set(String(process.env.DOGEUB_ADMIN_USERNAMES || "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  const isDeploymentAdmin = (user) => Boolean(user && configuredAdmins.has(String(user.normalizedUsername || user.username || "").toLowerCase()));
  const isAdminUser = (user) => Boolean(user && (isDeploymentAdmin(user) || user.isAdminGranted === true));
  const requireAdmin = (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return null;
    if (!isAdminUser(user)) {
      sendError(reply, 403, "Admin API access is not enabled for this account. Configure DOGEUB_ADMIN_USERNAMES on the server.");
      return null;
    }
    return user;
  };
  const recordAdminAction = (admin, action, target = null, details = "") => {
    const entry = { id: randomUUID(), actorId: admin.id, actorUsername: admin.username, action, target: target ? String(target).slice(0, 120) : null, details: String(details || "").slice(0, 240), createdAt: Date.now() };
    database.adminAudit.push(entry);
    if (database.adminAudit.length > 500) database.adminAudit.splice(0, database.adminAudit.length - 500);
    return entry;
  };

  // Maintenance mode blocks the application APIs for ordinary sessions. Login/session/status
  // endpoints remain available so an administrator can sign in and unlock the control panel.
  // Admin APIs still run through requireAdmin, which performs the server-side role check.
  app.addHook("preHandler", async (request, reply) => {
    if (database.adminSettings.maintenanceMode !== true) return;
    const pathname = String(request.url || "").split("?")[0];
    if (!pathname.startsWith("/api/")) return;
    const maintenanceExemptPaths = new Set([
      "/api/public/site-status",
      "/api/public/announcement",
      "/api/messages/session",
      "/api/messages/login",
      "/api/messages/logout",
      "/api/messages/os-session"
    ]);
    if (maintenanceExemptPaths.has(pathname)) return;
    if (isAdminUser(currentUser(request))) return;
    const message = String(database.adminSettings.maintenanceMessage || "DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.").slice(0, 300);
    return reply.code(503).send({ error: message });
  });

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
      readCount,
      isAnnouncement: Boolean(message.isAnnouncement),
      isAdminMessage: Boolean(message.isAdminMessage),
      isAdminNotice: Boolean(message.isAdminNotice)
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
  const hasBlockBetween = (firstId, secondId) => database.blocks.some((item) =>
    (item.blockerId === firstId && item.blockedId === secondId) ||
    (item.blockerId === secondId && item.blockedId === firstId)
  );
  const notifyUser = (recipientId, type, title, body, actorId = null, metadata = {}) => {
    const item = { id: randomUUID(), recipientId, type, title: String(title || "").slice(0, 100), body: String(body || "").slice(0, 240), actorId, metadata, createdAt: Date.now(), readAt: null };
    database.notifications.push(item);
    if (database.notifications.length > 10000) database.notifications.splice(0, database.notifications.length - 10000);
    return item;
  };
  const friendKey = (firstId, secondId) => [firstId, secondId].sort().join(":");
  const dmPairKeyForMessage = (message) => message?.dmPairKey || (message?.channel === "dm" && message.recipientId ? [message.senderId, message.recipientId].sort().join(":") : "");
  const isObserverForConversation = (userId, pairKey) => database.conversationObservers.some((item) => item.userId === userId && item.pairKey === pairKey);
  const areFriends = (firstId, secondId) => database.friendships.some((item) => item.key === friendKey(firstId, secondId));
  const validateMessageRate = (request, reply, user) => {
    if (!allowRate("message:" + userBucket(request, user), 12, 15000)) {
      sendError(reply, 429, "You're sending messages too quickly. Take a moment and try again.");
      return false;
    }
    return true;
  };

  app.post("/api/messages/os-session", async (request, reply) => {
    const ip = request.ip || "unknown";
    if (!allowRate("os-session:" + ip, 30, 60 * 60 * 1000)) {
      return sendError(reply, 429, "Too many Messages session attempts. Try again later.");
    }
    const username = String(request.body?.username || "").trim();
    const usernameError = validateUsername(username);
    if (usernameError) return sendError(reply, 400, usernameError);

    let user = findUsername(username);
    if (user && user.passwordHash) {
      return sendError(reply, 409, "This username already has a protected Messages account. Sign in to that account once before using automatic OS sign-in.");
    }
    if (!user) {
      user = {
        id: randomUUID(), username, normalizedUsername: normalizeUsername(username),
        passwordSalt: "", passwordHash: "", avatarFile: null, avatarType: null,
        avatarUpdatedAt: 0, createdAt: Date.now(), bio: "", statusMessage: "",
        bannerColor: "#172554", lastSeenAt: Date.now(), isGuest: false, osLinked: true
      };
      database.users.push(user);
      try { await persist(); } catch {
        database.users = database.users.filter((item) => item.id !== user.id);
        return sendError(reply, 500, "Your DOGEUB Messages profile could not be saved. Try again.");
      }
    }
    user.lastSeenAt = Date.now();
    setSession(reply, user.id);
    return reply.send({ user: publicUser(user), osLinked: true });
  });

    app.get("/api/messages/session", async (request, reply) => {
    const user = currentUser(request);
    return reply.send({ user: user?.isSuspended ? null : publicUser(user) });
  });

  app.get("/api/public/announcement", async (_request, reply) => {
    const settings = database.adminSettings;
    return reply.send({
      enabled: settings.announcementEnabled === true && Boolean(settings.announcement),
      message: settings.announcementEnabled === true ? settings.announcement : "",
      updatedAt: settings.updatedAt || null
    });
  });

  app.get("/api/public/site-status", async (request, reply) => {
    const username = String(request.query?.username || "").trim().toLowerCase();
    const sessionUser = currentUser(request);
    const matchedUser = sessionUser?.isSuspended ? sessionUser : (username ? findUsername(username) : null);
    const settings = database.adminSettings;
    return reply.send({
      gamesDisabled: settings.gamesDisabled === true,
      serverMuted: settings.serverMuted === true,
      browsingDisabled: settings.browsingDisabled === true,
      maintenanceMode: settings.maintenanceMode === true,
      maintenanceMessage: String(settings.maintenanceMessage || "DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.").slice(0, 300),
      maintenanceAdmin: Boolean(sessionUser && !sessionUser.isSuspended && isAdminUser(sessionUser)),
      maintenanceAuthenticated: Boolean(sessionUser && !sessionUser.isSuspended),
      banned: Boolean(matchedUser?.isSuspended),
      banReason: matchedUser?.isSuspended ? String(matchedUser.suspensionReason || "Access to DOGEUB has been disabled by an administrator.") : ""
    });
  });

  app.post("/api/messages/register", async (request, reply) => {
    if (database.adminSettings.registrationPaused) return sendError(reply, 503, "New account registration is temporarily paused by a DOGEUB administrator.");
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
      avatarUpdatedAt: 0, createdAt: Date.now(), bio: "", statusMessage: "", bannerColor: "#172554", lastSeenAt: Date.now()
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
    if (user.isSuspended) return sendError(reply, 403, "This account is suspended. Contact a site administrator if you believe this is a mistake.");
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
    if (Object.prototype.hasOwnProperty.call(changes, "bio") && String(changes.bio || "").length > 200) return sendError(reply, 400, "Profile bios must be 200 characters or fewer.");
    if (Object.prototype.hasOwnProperty.call(changes, "statusMessage") && String(changes.statusMessage || "").length > 80) return sendError(reply, 400, "Status messages must be 80 characters or fewer.");
    if (Object.prototype.hasOwnProperty.call(changes, "bannerColor") && !/^#[0-9a-f]{6}$/i.test(String(changes.bannerColor || ""))) return sendError(reply, 400, "Choose a valid six-digit hex banner color.");
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

    if (Object.prototype.hasOwnProperty.call(changes, "bio")) user.bio = String(changes.bio || "").trim();
    if (Object.prototype.hasOwnProperty.call(changes, "statusMessage")) user.statusMessage = String(changes.statusMessage || "").trim();
    if (Object.prototype.hasOwnProperty.call(changes, "bannerColor")) user.bannerColor = String(changes.bannerColor);
    user.lastSeenAt = Date.now();
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
      .filter((candidate) => candidate.id !== user.id && candidate.normalizedUsername.includes(query) && !hasBlockBetween(user.id, candidate.id))
      .sort((a, b) => a.normalizedUsername.localeCompare(b.normalizedUsername))
      .slice(0, 20)
      .map(publicUser);
    return reply.send({ users });
  });


  app.get("/api/messages/public-profile/:username", async (request, reply) => {
    const target = findUsername(String(request.params?.username || ""));
    if (!target) return sendError(reply, 404, "That DOGEUB profile was not found.");
    const viewer = currentUser(request);
    if (viewer && hasBlockBetween(viewer.id, target.id)) return sendError(reply, 404, "That DOGEUB profile was not found.");
    return reply.send({ user: publicUser(target), isSelf: viewer?.id === target.id, isFriend: Boolean(viewer && areFriends(viewer.id, target.id)) });
  });

  app.post("/api/messages/presence", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    user.lastSeenAt = request.body?.hidden === true ? Date.now() - 10 * 60_000 : Date.now();
    return reply.send({ user: publicUser(user) });
  });

  app.get("/api/messages/social", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const friendIds = new Set(database.friendships
      .filter((item) => item.userIds?.includes(user.id))
      .flatMap((item) => item.userIds || [])
      .filter((id) => id !== user.id));
    const incoming = database.friendRequests.filter((item) => item.toUserId === user.id && item.status === "pending")
      .map((item) => ({ id: item.id, createdAt: item.createdAt, user: publicUser(database.users.find((candidate) => candidate.id === item.fromUserId)) }))
      .filter((item) => item.user);
    const outgoing = database.friendRequests.filter((item) => item.fromUserId === user.id && item.status === "pending")
      .map((item) => ({ id: item.id, createdAt: item.createdAt, user: publicUser(database.users.find((candidate) => candidate.id === item.toUserId)) }))
      .filter((item) => item.user);
    const friends = [...friendIds].map((id) => publicUser(database.users.find((candidate) => candidate.id === id))).filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));
    const blocked = database.blocks.filter((item) => item.blockerId === user.id)
      .map((item) => publicUser(database.users.find((candidate) => candidate.id === item.blockedId))).filter(Boolean);
    return reply.send({ friends, incoming, outgoing, blocked, user: publicUser(user) });
  });

  app.post("/api/messages/friend-requests", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!allowRate("friend-request:" + user.id, 20, 60 * 60 * 1000)) return sendError(reply, 429, "Too many friend requests. Try again later.");
    const targetId = String(request.body?.userId || "");
    const targetName = String(request.body?.username || "").trim();
    const target = targetId ? database.users.find((item) => item.id === targetId) : findUsername(targetName);
    if (!target || target.id === user.id) return sendError(reply, 400, "Choose another DOGEUB user.");
    if (hasBlockBetween(user.id, target.id)) return sendError(reply, 403, "A block is active between these accounts.");
    if (areFriends(user.id, target.id)) return sendError(reply, 409, "You are already friends.");
    const reverse = database.friendRequests.find((item) => item.fromUserId === target.id && item.toUserId === user.id && item.status === "pending");
    if (reverse) return sendError(reply, 409, "They already sent you a friend request. Accept it from Requests.");
    if (database.friendRequests.some((item) => item.fromUserId === user.id && item.toUserId === target.id && item.status === "pending")) {
      return sendError(reply, 409, "You have already sent a friend request to this user.");
    }
    const item = { id: randomUUID(), fromUserId: user.id, toUserId: target.id, status: "pending", createdAt: Date.now() };
    database.friendRequests.push(item);
    const notification = notifyUser(target.id, "friend-request", "Friend request", user.username + " sent you a friend request.", user.id, { requestId: item.id });
    try { await persist(); } catch {
      database.friendRequests = database.friendRequests.filter((entry) => entry.id !== item.id);
      database.notifications = database.notifications.filter((entry) => entry.id !== notification.id);
      return sendError(reply, 500, "The friend request could not be saved.");
    }
    return reply.code(201).send({ ok: true });
  });

  app.post("/api/messages/friend-requests/respond", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const requestId = String(request.body?.requestId || "");
    const action = String(request.body?.action || "");
    const item = database.friendRequests.find((entry) => entry.id === requestId && entry.status === "pending");
    if (!item) return sendError(reply, 404, "That friend request is no longer available.");
    if (action === "cancel") {
      if (item.fromUserId !== user.id) return sendError(reply, 403, "Only the sender can cancel this request.");
    } else if (!["accept", "decline"].includes(action) || item.toUserId !== user.id) {
      return sendError(reply, 403, "You cannot respond to that friend request.");
    }
    if (action === "accept" && hasBlockBetween(item.fromUserId, item.toUserId)) return sendError(reply, 403, "Remove the active block before accepting this request.");
    database.friendRequests = database.friendRequests.filter((entry) => entry.id !== item.id);
    let notification = null;
    if (action === "accept") {
      const key = friendKey(item.fromUserId, item.toUserId);
      if (!database.friendships.some((entry) => entry.key === key)) {
        database.friendships.push({ key, userIds: [item.fromUserId, item.toUserId].sort(), createdAt: Date.now() });
      }
      notification = notifyUser(item.fromUserId, "friend-accepted", "Friend request accepted", user.username + " accepted your friend request.", user.id);
    } else if (action === "decline") {
      notification = notifyUser(item.fromUserId, "friend-declined", "Friend request update", user.username + " declined your friend request.", user.id);
    }
    try { await persist(); } catch {
      if (notification) database.notifications = database.notifications.filter((entry) => entry.id !== notification.id);
      return sendError(reply, 500, "The friend request response could not be saved.");
    }
    return reply.send({ ok: true });
  });

  app.post("/api/messages/friends/remove", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const targetId = String(request.body?.userId || "");
    if (!targetId || targetId === user.id) return sendError(reply, 400, "Choose a friend to remove.");
    const key = friendKey(user.id, targetId);
    const before = database.friendships.length;
    database.friendships = database.friendships.filter((item) => item.key !== key);
    if (database.friendships.length === before) return sendError(reply, 404, "That friend relationship was not found.");
    try { await persist(); } catch { return sendError(reply, 500, "The friend could not be removed."); }
    return reply.send({ ok: true });
  });

  app.post("/api/messages/block", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const targetId = String(request.body?.userId || "");
    const target = database.users.find((item) => item.id === targetId);
    if (!target || target.id === user.id) return sendError(reply, 400, "Choose another DOGEUB user.");
    if (request.body?.blocked === false) {
      database.blocks = database.blocks.filter((item) => !(item.blockerId === user.id && item.blockedId === target.id));
    } else {
      if (!database.blocks.some((item) => item.blockerId === user.id && item.blockedId === target.id)) {
        database.blocks.push({ blockerId: user.id, blockedId: target.id, createdAt: Date.now() });
      }
      const key = friendKey(user.id, target.id);
      database.friendships = database.friendships.filter((item) => item.key !== key);
      database.friendRequests = database.friendRequests.filter((item) =>
        !((item.fromUserId === user.id && item.toUserId === target.id) || (item.fromUserId === target.id && item.toUserId === user.id))
      );
    }
    try { await persist(); } catch { return sendError(reply, 500, "The block setting could not be saved."); }
    return reply.send({ ok: true });
  });

  app.get("/api/messages/notification-center", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const notifications = database.notifications.filter((item) => item.recipientId === user.id)
      .slice(-100).reverse().map((item) => ({
        id: item.id, type: item.type, title: item.title, body: item.body,
        createdAt: item.createdAt, readAt: item.readAt,
        actor: item.actorId ? publicUser(database.users.find((candidate) => candidate.id === item.actorId)) : null,
        metadata: item.metadata || {}
      }));
    return reply.send({ notifications, unreadCount: notifications.filter((item) => !item.readAt).length });
  });

  app.post("/api/messages/notification-center/read", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const id = request.body?.id ? String(request.body.id) : "";
    const all = request.body?.all === true;
    let changed = false;
    for (const item of database.notifications) {
      if (item.recipientId !== user.id || item.readAt) continue;
      if (all || item.id === id) { item.readAt = Date.now(); changed = true; }
    }
    if (id && !database.notifications.some((item) => item.id === id && item.recipientId === user.id)) return sendError(reply, 404, "Notification not found.");
    if (changed) {
      try { await persist(); } catch { return sendError(reply, 500, "Notification state could not be saved."); }
    }
    return reply.send({ ok: true });
  });


  // Administrative APIs are protected by a server-side username allowlist.
  // The Settings passcode is a UI gate only and is not treated as server authorization.
  app.get("/api/messages/admin/overview", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const onlineUsers = database.users.filter((user) => Date.now() - (Number(user.lastSeenAt) || 0) < 90_000).length;
    const openReports = database.reports.filter((item) => !item.status || item.status === "open").length;
    const pendingRequests = database.friendRequests.filter((item) => item.status === "pending").length;
    const stats = {
      users: database.users.length,
      onlineUsers,
      suspendedUsers: database.users.filter((user) => user.isSuspended).length,
      messages: database.messages.length,
      directMessages: database.messages.filter((item) => item.channel === "dm").length,
      groups: database.groups.length,
      groupMembers: database.groupMembers.length,
      friendRelationships: database.friendships.length,
      pendingFriendRequests: pendingRequests,
      openReports,
      notifications: database.notifications.length,
      attachments: database.attachments.length
    };
    const siteSettings = { ...database.adminSettings };
    delete siteSettings.updatedBy;
    return reply.send({ stats, siteSettings, admin: { username: admin.username }, serverTime: Date.now() });
  });

  app.get("/api/messages/admin/users", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const query = String(request.query?.q || "").trim().slice(0, 40).toLowerCase();
    const matchingUsers = database.users
      .filter((user) => !query || String(user.username || "").toLowerCase().includes(query))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    const selectedUsers = matchingUsers.slice(0, 200);
    const selectedIds = new Set(selectedUsers.map((user) => user.id));
    const messageCounts = new Map();
    const messageOwners = new Map();
    for (const message of database.messages) {
      messageOwners.set(message.id, message.senderId);
      if (selectedIds.has(message.senderId)) messageCounts.set(message.senderId, (messageCounts.get(message.senderId) || 0) + 1);
    }
    const reportCounts = new Map();
    for (const report of database.reports) {
      const ownerId = messageOwners.get(report.messageId);
      if (ownerId && selectedIds.has(ownerId)) reportCounts.set(ownerId, (reportCounts.get(ownerId) || 0) + 1);
    }
    const users = selectedUsers.map((user) => ({
      ...publicUser(user),
      isSuspended: Boolean(user.isSuspended),
      suspensionReason: String(user.suspensionReason || "").slice(0, 200),
      suspendedAt: user.suspendedAt || null,
      messageCount: messageCounts.get(user.id) || 0,
      reportCount: reportCounts.get(user.id) || 0,
      isProtectedAdmin: isAdminUser(user)
    }));
    return reply.send({ users, totalMatches: matchingUsers.length });
  });

  app.post("/api/messages/admin/users/status", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const userId = String(request.body?.userId || "");
    const suspended = request.body?.suspended === true;
    const reason = String(request.body?.reason || "").trim().slice(0, 200);
    const target = database.users.find((user) => user.id === userId);
    if (!target) return sendError(reply, 404, "That user was not found.");
    if (target.id === admin.id) return sendError(reply, 400, "You cannot suspend your own admin account.");
    if (isAdminUser(target)) return sendError(reply, 403, "Protected administrator accounts cannot be suspended from this panel.");
    if (suspended) {
      target.isSuspended = true;
      target.suspensionReason = reason || "Suspended by a DOGEUB administrator.";
      target.suspendedAt = Date.now();
      target.suspendedBy = admin.id;
    } else {
      target.isSuspended = false;
      target.suspensionReason = "";
      target.suspendedAt = null;
      target.suspendedBy = null;
    }
    const action = suspended ? "user-suspended" : "user-unsuspended";
    recordAdminAction(admin, action, target.username, target.suspensionReason);
    try { await persist(); } catch { return sendError(reply, 500, "The user status could not be saved."); }
    return reply.send({ ok: true, user: { id: target.id, username: target.username, isSuspended: Boolean(target.isSuspended), suspensionReason: target.suspensionReason || "" } });
  });

  app.get("/api/messages/admin/administrators", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const administrators = database.users
      .filter((user) => isAdminUser(user))
      .map((user) => ({
        id: user.id,
        username: user.username,
        isDeploymentAdmin: isDeploymentAdmin(user),
        isAdminGranted: user.isAdminGranted === true
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
    return reply.send({ administrators });
  });

  app.post("/api/messages/admin/administrators", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const username = String(request.body?.username || "").trim();
    const granted = request.body?.granted === true;
    if (!username || username.length > 24) return sendError(reply, 400, "Enter a valid DOGEUB username.");
    const target = findUsername(username);
    if (!target) return sendError(reply, 404, "That username does not have a DOGEUB Messages account.");
    if (isDeploymentAdmin(target)) return sendError(reply, 403, "Deployment-configured administrators are managed with DOGEUB_ADMIN_USERNAMES on the server.");
    if (granted && !target.passwordHash) return sendError(reply, 400, "This account can be claimed using its username alone. Have the user set a password for the Messages account before granting administrator access.");
    if (target.isSuspended && granted) return sendError(reply, 400, "Restore this account before granting administrator access.");
    if (target.id === admin.id && !granted) return sendError(reply, 400, "You cannot remove your own administrator access.");
    if ((target.isAdminGranted === true) === granted) {
      return reply.send({ ok: true, unchanged: true, user: { id: target.id, username: target.username, isAdminGranted: target.isAdminGranted === true } });
    }
    const priorGranted = target.isAdminGranted === true;
    target.isAdminGranted = granted;
    const auditEntry = recordAdminAction(admin, granted ? "administrator-granted" : "administrator-revoked", target.username, granted ? "Granted administrator access." : "Revoked administrator access.");
    try {
      await persist();
    } catch {
      target.isAdminGranted = priorGranted;
      database.adminAudit = database.adminAudit.filter((entry) => entry.id !== auditEntry.id);
      return sendError(reply, 500, "The administrator role could not be saved.");
    }
    const administrators = database.users
      .filter((user) => isAdminUser(user))
      .map((user) => ({
        id: user.id,
        username: user.username,
        isDeploymentAdmin: isDeploymentAdmin(user),
        isAdminGranted: user.isAdminGranted === true
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
    return reply.send({ ok: true, user: { id: target.id, username: target.username, isAdminGranted: granted }, administrators });
  });

  app.get("/api/messages/admin/reports", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const reports = database.reports.slice().reverse().slice(0, 250).map((item) => {
      const message = database.messages.find((entry) => entry.id === item.messageId);
      return {
        id: item.id, reason: item.reason, createdAt: item.createdAt, status: item.status || "open",
        reporter: publicUser(database.users.find((entry) => entry.id === item.reporterId)),
        message: message ? { id: message.id, text: message.text || (message.attachmentId ? "Attachment" : ""), sender: publicUser(database.users.find((entry) => entry.id === message.senderId)), channel: message.channel } : null
      };
    });
    return reply.send({ reports });
  });

  app.post("/api/messages/admin/reports/action", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const report = database.reports.find((item) => item.id === String(request.body?.reportId || ""));
    const action = String(request.body?.action || "");
    if (!report) return sendError(reply, 404, "Report not found.");
    if (report.status && report.status !== "open") return sendError(reply, 409, "That report has already been reviewed.");
    if (action === "dismiss") {
      report.status = "dismissed";
      report.reviewedAt = Date.now();
      recordAdminAction(admin, "report-dismissed", report.id, report.reason);
    } else if (action === "remove-message") {
      const message = database.messages.find((item) => item.id === report.messageId);
      if (!message) return sendError(reply, 404, "The reported message no longer exists.");
      message.text = "[Message removed by a DOGEUB administrator]";
      message.attachmentId = null;
      message.moderatedRemoved = true;
      database.reactions = database.reactions.filter((item) => item.messageId !== message.id);
      report.status = "removed";
      report.reviewedAt = Date.now();
      notifyUser(message.senderId, "moderation", "Message removed", "A DOGEUB administrator removed a message after reviewing a report.", admin.id, { messageId: message.id });
      recordAdminAction(admin, "message-removed", message.senderId, "Report " + report.id);
    } else return sendError(reply, 400, "Choose dismiss or remove-message.");
    try { await persist(); } catch { return sendError(reply, 500, "The moderation action could not be saved."); }
    return reply.send({ ok: true });
  });

  app.get("/api/messages/admin/audit", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    return reply.send({ entries: database.adminAudit.slice().reverse().slice(0, 150).map((item) => ({ ...item })) });
  });

  app.patch("/api/messages/admin/settings", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const changes = request.body || {};
    if (Object.prototype.hasOwnProperty.call(changes, "announcement") && String(changes.announcement || "").length > 300) {
      return sendError(reply, 400, "Announcements must be 300 characters or fewer.");
    }
    if (Object.prototype.hasOwnProperty.call(changes, "announcement")) database.adminSettings.announcement = String(changes.announcement || "").trim();
    if (Object.prototype.hasOwnProperty.call(changes, "announcementEnabled")) database.adminSettings.announcementEnabled = changes.announcementEnabled === true && Boolean(database.adminSettings.announcement);
    if (Object.prototype.hasOwnProperty.call(changes, "registrationPaused")) database.adminSettings.registrationPaused = changes.registrationPaused === true;
    if (Object.prototype.hasOwnProperty.call(changes, "gamesDisabled")) database.adminSettings.gamesDisabled = changes.gamesDisabled === true;
    if (Object.prototype.hasOwnProperty.call(changes, "serverMuted")) database.adminSettings.serverMuted = changes.serverMuted === true;
    if (Object.prototype.hasOwnProperty.call(changes, "browsingDisabled")) database.adminSettings.browsingDisabled = changes.browsingDisabled === true;
    if (Object.prototype.hasOwnProperty.call(changes, "maintenanceMode")) database.adminSettings.maintenanceMode = changes.maintenanceMode === true;
    if (Object.prototype.hasOwnProperty.call(changes, "maintenanceMessage")) {
      const maintenanceMessage = String(changes.maintenanceMessage || "").trim();
      if (maintenanceMessage.length > 300) return sendError(reply, 400, "Maintenance messages must be 300 characters or fewer.");
      database.adminSettings.maintenanceMessage = maintenanceMessage || "DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.";
    }
    database.adminSettings.updatedAt = Date.now();
    database.adminSettings.updatedBy = admin.username;
    recordAdminAction(admin, "site-settings-updated", null, "Updated announcement, registration, emergency controls, or maintenance mode.");
    try { await persist(); } catch { return sendError(reply, 500, "Admin settings could not be saved."); }
    return reply.send({ ok: true, siteSettings: { ...database.adminSettings } });
  });


  app.get("/api/messages/admin/conversations", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const q = String(request.query?.q || "").trim().toLowerCase().slice(0, 60);
    const dmsByPair = new Map();
    for (const message of database.messages) {
      if (message.channel !== "dm") continue;
      const pairKey = dmPairKeyForMessage(message);
      const ids = pairKey.split(":").filter(Boolean);
      if (ids.length !== 2 || ids[0] === ids[1]) continue;
      let item = dmsByPair.get(pairKey);
      if (!item) {
        const people = ids.map((id) => database.users.find((candidate) => candidate.id === id)).filter(Boolean);
        if (people.length !== 2) continue;
        item = { id: "dm:" + pairKey, type: "dm", pairKey, userIds: ids, participants: people.map((person) => publicUser(person)), label: people.map((person) => "@" + person.username).join(" ↔ "), messageCount: 0, lastMessageAt: 0, joined: isObserverForConversation(admin.id, pairKey) };
        dmsByPair.set(pairKey, item);
      }
      item.messageCount += 1;
      item.lastMessageAt = Math.max(item.lastMessageAt, Number(message.createdAt) || 0);
    }
    const groups = database.groups.map((group) => {
      const groupMessages = database.messages.filter((message) => message.channel === "group" && message.groupId === group.id);
      return {
        id: "group:" + group.id, type: "group", groupId: group.id, label: group.name,
        participants: database.groupMembers.filter((member) => member.groupId === group.id).map((member) => publicUser(database.users.find((candidate) => candidate.id === member.userId))).filter(Boolean),
        memberCount: database.groupMembers.filter((member) => member.groupId === group.id).length,
        isOwner: group.createdBy === admin.id,
        messageCount: groupMessages.length,
        lastMessageAt: groupMessages.reduce((latest, message) => Math.max(latest, Number(message.createdAt) || 0), Number(group.createdAt) || 0),
        joined: isGroupMember(group.id, admin.id)
      };
    });
    const conversations = [...dmsByPair.values(), ...groups]
      .filter((item) => !q || (item.label + " " + item.participants.map((person) => person.username).join(" ")).toLowerCase().includes(q))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, 200);
    return reply.send({ conversations });
  });

  app.post("/api/messages/admin/conversations/join", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const type = String(request.body?.type || "");
    if (type === "group") {
      const groupId = String(request.body?.groupId || "");
      const group = database.groups.find((item) => item.id === groupId);
      if (!group) return sendError(reply, 404, "Group conversation not found.");
      if (!isGroupMember(groupId, admin.id)) {
        database.groupMembers.push({ groupId, userId: admin.id, joinedAt: Date.now(), joinedByAdmin: true });
        const joinNotice = { id: randomUUID(), channel: "group", senderId: admin.id, recipientId: null, groupId, text: "@" + admin.username + " joined this group as a DOGEUB administrator.", attachmentId: null, replyToId: null, pinned: false, isAdminMessage: true, isAdminNotice: true, createdAt: Date.now() };
        database.messages.push(joinNotice);
        for (const member of database.groupMembers.filter((item) => item.groupId === groupId && item.userId !== admin.id)) {
          notifyUser(member.userId, "admin-joined-group", "DOGEUB admin joined a group", "@" + admin.username + " joined the group as an administrator. Admin membership is visible in the member list.", admin.id, { groupId, messageId: joinNotice.id });
        }
        recordAdminAction(admin, "admin-joined-group", group.name, "Joined group conversation as an administrator.");
      }
      try { await persist(); } catch { return sendError(reply, 500, "Could not join that group conversation."); }
      return reply.send({ ok: true, joined: true });
    }
    if (type === "dm") {
      const userA = String(request.body?.userA || "");
      const userB = String(request.body?.userB || "");
      if (!userA || !userB || userA === userB || !database.users.some((user) => user.id === userA) || !database.users.some((user) => user.id === userB)) {
        return sendError(reply, 400, "Choose a valid two-user conversation.");
      }
      const pairKey = [userA, userB].sort().join(":");
      if (!database.messages.some((message) => message.channel === "dm" && dmPairKeyForMessage(message) === pairKey)) {
        return sendError(reply, 404, "That direct conversation has no message history.");
      }
      if (!isObserverForConversation(admin.id, pairKey)) {
        database.conversationObservers.push({ userId: admin.id, pairKey, joinedAt: Date.now() });
        const joinNotice = { id: randomUUID(), channel: "dm", senderId: admin.id, recipientId: userA, groupId: null, dmPairKey: pairKey, text: "@" + admin.username + " joined this direct-message conversation as a DOGEUB administrator observer.", attachmentId: null, replyToId: null, pinned: false, isAdminMessage: true, isAdminNotice: true, createdAt: Date.now() };
        database.messages.push(joinNotice);
        for (const participantId of pairKey.split(":")) {
          notifyUser(participantId, "admin-observing-dm", "Administrator joined your conversation", "@" + admin.username + " joined this direct-message conversation as an administrator. Access is recorded in the admin audit log.", admin.id, { pairKey, messageId: joinNotice.id });
        }
        recordAdminAction(admin, "admin-joined-dm", pairKey, "Joined direct conversation in observer mode; participants were notified.");
      }
      try { await persist(); } catch { return sendError(reply, 500, "Could not join that direct conversation."); }
      return reply.send({ ok: true, joined: true, pairKey });
    }
    return sendError(reply, 400, "Choose a group or direct conversation.");
  });

  app.post("/api/messages/admin/conversations/leave", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const type = String(request.body?.type || "");
    if (type === "dm") {
      const pairKey = [String(request.body?.userA || ""), String(request.body?.userB || "")].sort().join(":");
      const before = database.conversationObservers.length;
      database.conversationObservers = database.conversationObservers.filter((item) => !(item.userId === admin.id && item.pairKey === pairKey));
      if (database.conversationObservers.length === before) return sendError(reply, 404, "You have not joined that direct conversation.");
      recordAdminAction(admin, "admin-left-dm", pairKey, "Left direct conversation observer access.");
    } else if (type === "group") {
      const groupId = String(request.body?.groupId || "");
      const group = database.groups.find((item) => item.id === groupId);
      if (!group || !isGroupMember(groupId, admin.id)) return sendError(reply, 404, "You are not in that group conversation.");
      if (group.createdBy === admin.id) return sendError(reply, 400, "Group owners cannot leave their own group.");
      database.groupMembers = database.groupMembers.filter((item) => !(item.groupId === groupId && item.userId === admin.id));
      for (const member of database.groupMembers.filter((item) => item.groupId === groupId)) {
        notifyUser(member.userId, "admin-left-group", "DOGEUB admin left a group", "@" + admin.username + " left the group.", admin.id, { groupId });
      }
      recordAdminAction(admin, "admin-left-group", group.name, "Left group conversation.");
    } else return sendError(reply, 400, "Choose a group or direct conversation.");
    try { await persist(); } catch { return sendError(reply, 500, "Could not leave that conversation."); }
    return reply.send({ ok: true, joined: false });
  });

  app.get("/api/messages/admin/conversation-messages", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const type = String(request.query?.type || "");
    let conversationMessages = [];
    let targetLabel = "";
    if (type === "group") {
      const groupId = String(request.query?.groupId || "");
      const group = database.groups.find((item) => item.id === groupId);
      if (!group || !isGroupMember(groupId, admin.id)) return sendError(reply, 403, "Join the group from the Conversations tab before opening it.");
      targetLabel = group.name;
      conversationMessages = database.messages.filter((message) => message.channel === "group" && message.groupId === groupId);
    } else if (type === "dm") {
      const userA = String(request.query?.userA || "");
      const userB = String(request.query?.userB || "");
      const pairKey = [userA, userB].sort().join(":");
      if (!userA || !userB || userA === userB || !isObserverForConversation(admin.id, pairKey)) return sendError(reply, 403, "Join the direct conversation in observer mode before opening it.");
      targetLabel = pairKey.split(":").map((id) => database.users.find((user) => user.id === id)?.username || "unknown").map((username) => "@" + username).join(" ↔ ");
      conversationMessages = database.messages.filter((message) => message.channel === "dm" && dmPairKeyForMessage(message) === pairKey);
    } else return sendError(reply, 400, "Choose a valid conversation type.");
    recordAdminAction(admin, "admin-viewed-conversation", targetLabel, "Opened conversation content in the Admin Panel.");
    try { await persist(); } catch { return sendError(reply, 500, "Could not record this conversation access."); }
    const visible = conversationMessages.slice(-100);
    return reply.send({ messages: visible.map((message) => messageForClient(message, admin.id)), label: targetLabel, total: conversationMessages.length });
  });

  app.post("/api/messages/admin/conversations/send", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const type = String(request.body?.type || "");
    const text = String(request.body?.text || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return sendError(reply, 400, "Write a message first.");
    let message;
    let targetLabel = "";
    const createdNotifications = [];
    if (type === "group") {
      const groupId = String(request.body?.groupId || "");
      const group = database.groups.find((item) => item.id === groupId);
      if (!group || !isGroupMember(groupId, admin.id)) return sendError(reply, 403, "Join that group before sending an admin message.");
      targetLabel = group.name;
      message = { id: randomUUID(), channel: "group", senderId: admin.id, recipientId: null, groupId, text: censorProfanity(text), attachmentId: null, replyToId: null, pinned: false, isAdminMessage: true, createdAt: Date.now() };
      database.messages.push(message);
      for (const member of database.groupMembers.filter((item) => item.groupId === groupId && item.userId !== admin.id)) {
        createdNotifications.push(notifyUser(member.userId, "admin-group-message", "Administrator message in " + group.name, message.text, admin.id, { groupId, messageId: message.id }));
      }
    } else if (type === "dm") {
      const userA = String(request.body?.userA || "");
      const userB = String(request.body?.userB || "");
      const pairKey = [userA, userB].sort().join(":");
      if (!userA || !userB || userA === userB || !isObserverForConversation(admin.id, pairKey)) return sendError(reply, 403, "Join the direct conversation before sending an admin message.");
      targetLabel = pairKey.split(":").map((id) => database.users.find((user) => user.id === id)?.username || "unknown").map((username) => "@" + username).join(" ↔ ");
      message = { id: randomUUID(), channel: "dm", senderId: admin.id, recipientId: userA, groupId: null, dmPairKey: pairKey, text: censorProfanity(text), attachmentId: null, replyToId: null, pinned: false, isAdminMessage: true, createdAt: Date.now() };
      database.messages.push(message);
      for (const participantId of pairKey.split(":")) {
        if (participantId !== admin.id) createdNotifications.push(notifyUser(participantId, "admin-dm-message", "Administrator message in your conversation", message.text, admin.id, { pairKey, messageId: message.id }));
      }
    } else return sendError(reply, 400, "Choose a group or direct conversation.");
    if (database.messages.length > 20000) database.messages.splice(0, database.messages.length - 20000);
    recordAdminAction(admin, "admin-sent-conversation-message", targetLabel, "Sent an admin message to an existing conversation.");
    try { await persist(); } catch {
      database.messages = database.messages.filter((item) => item.id !== message.id);
      database.notifications = database.notifications.filter((item) => !createdNotifications.some((created) => created.id === item.id));
      return sendError(reply, 500, "The admin message could not be saved.");
    }
    return reply.code(201).send({ message: messageForClient(message, admin.id) });
  });

  app.get("/api/messages/admin/announcements", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const announcements = database.messages.filter((message) => message.channel === "global" && message.isAnnouncement)
      .slice(-50).reverse().map((message) => ({
        id: message.id, text: message.text, createdAt: message.createdAt,
        sender: publicUser(database.users.find((user) => user.id === message.senderId))
      }));
    return reply.send({ announcements });
  });

  app.post("/api/messages/admin/announcements", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const text = String(request.body?.text || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return sendError(reply, 400, "Write an announcement first.");
    const message = { id: randomUUID(), channel: "global", senderId: admin.id, recipientId: null, groupId: null, text: censorProfanity(text), attachmentId: null, replyToId: null, pinned: true, isAnnouncement: true, createdAt: Date.now() };
    database.messages.push(message);
    const createdNotifications = [];
    for (const recipient of database.users) {
      if (recipient.id !== admin.id) createdNotifications.push(notifyUser(recipient.id, "global-announcement", "DOGEUB global announcement", message.text, admin.id, { messageId: message.id }));
    }
    if (database.messages.length > 20000) database.messages.splice(0, database.messages.length - 20000);
    recordAdminAction(admin, "global-announcement-sent", null, message.text);
    try { await persist(); } catch {
      database.messages = database.messages.filter((item) => item.id !== message.id);
      database.notifications = database.notifications.filter((item) => !createdNotifications.some((created) => created.id === item.id));
      return sendError(reply, 500, "The announcement could not be saved.");
    }
    return reply.code(201).send({ announcement: { id: message.id, text: message.text, createdAt: message.createdAt, sender: publicUser(admin) } });
  });

  app.get("/api/messages/moderation/reports", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!publicUser(user).isModerator) return sendError(reply, 403, "Moderator access is not enabled for this account.");
    const reports = database.reports.slice().reverse().slice(0, 200).map((item) => {
      const message = database.messages.find((entry) => entry.id === item.messageId);
      return {
        id: item.id, reason: item.reason, createdAt: item.createdAt, status: item.status || "open",
        reporter: publicUser(database.users.find((entry) => entry.id === item.reporterId)),
        message: message ? { id: message.id, text: message.text || (message.attachmentId ? "Attachment" : ""), sender: publicUser(database.users.find((entry) => entry.id === message.senderId)), channel: message.channel } : null
      };
    });
    return reply.send({ reports });
  });

  app.post("/api/messages/moderation/action", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!publicUser(user).isModerator) return sendError(reply, 403, "Moderator access is not enabled for this account.");
    const report = database.reports.find((item) => item.id === String(request.body?.reportId || ""));
    const action = String(request.body?.action || "");
    if (!report) return sendError(reply, 404, "Report not found.");
    if (action === "dismiss") {
      report.status = "dismissed";
      report.reviewedAt = Date.now();
    } else if (action === "remove-message") {
      const message = database.messages.find((item) => item.id === report.messageId);
      if (!message) return sendError(reply, 404, "The reported message no longer exists.");
      message.text = "[Message removed by a moderator]";
      message.attachmentId = null;
      message.moderatedRemoved = true;
      database.reactions = database.reactions.filter((item) => item.messageId !== message.id);
      report.status = "removed";
      report.reviewedAt = Date.now();
      notifyUser(message.senderId, "moderation", "Message removed", "A moderator removed one of your messages after review.", user.id, { messageId: message.id });
    } else return sendError(reply, 400, "Choose dismiss or remove-message.");
    try { await persist(); } catch { return sendError(reply, 500, "The moderation action could not be saved."); }
    return reply.send({ ok: true });
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
  const canReadMessage = (message, userId) => {
    if (!message) return false;
    if (message.channel === "global") return true;
    if (message.channel === "group") return isGroupMember(message.groupId, userId);
    if (message.channel === "dm") {
      const pairKey = dmPairKeyForMessage(message);
      const pairIds = pairKey ? pairKey.split(":") : [];
      if (pairIds.includes(userId) || message.senderId === userId || message.recipientId === userId) return true;
      const viewer = database.users.find((candidate) => candidate.id === userId);
      return Boolean(isAdminUser(viewer) && pairKey && isObserverForConversation(userId, pairKey));
    }
    return false;
  };
  const dmPeerFor = (message, userId) => {
    const pairIds = dmPairKeyForMessage(message).split(":");
    if (pairIds.includes(userId)) return pairIds.find((id) => id && id !== userId) || null;
    return message.senderId === userId ? message.recipientId : message.senderId;
  };
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
        (message.channel === "dm" && (message.recipientId === user.id || dmPairKeyForMessage(message).split(":").includes(user.id))) ||
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
      const pairIds = dmPairKeyForMessage(message).split(":");
      if (pairIds.includes(user.id)) otherId = pairIds.find((id) => id && id !== user.id) || null;
      else if (message.senderId === user.id) otherId = message.recipientId;
      else if (message.recipientId === user.id) otherId = message.senderId;
      if (!otherId || otherId === user.id) continue;
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
      const pairKey = [user.id, peerId].sort().join(":");
      messages = database.messages.filter((message) =>
        message.channel === "dm" && dmPairKeyForMessage(message) === pairKey
      );
    } else {
      return sendError(reply, 400, "Unknown message channel.");
    }
    const recentMessages = messages.slice(-100);
    const retainedPins = messages.filter((message) => message.pinned).slice(-50);
    // Keep recent admin broadcasts visible even during very busy global chat traffic.
    // Announcements are pinned, but ordinary pinned messages must not crowd them out.
    const retainedAnnouncements = channel === "global"
      ? messages.filter((message) => message.isAnnouncement).slice(-50)
      : [];
    const visibleMessages = [...new Map([...retainedAnnouncements, ...retainedPins, ...recentMessages].map((message) => [message.id, message])).values()]
      .sort((a, b) => a.createdAt - b.createdAt);
    return reply.send({ messages: visibleMessages.map((message) => messageForClient(message, user.id)) });
  });

  app.post("/api/messages/messages", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (database.adminSettings.serverMuted && !isAdminUser(user)) {
      return sendError(reply, 403, "DOGEUB chat is muted server-wide by an administrator.");
    }
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
      if (hasBlockBetween(user.id, recipientId)) return sendError(reply, 403, "A block is active between these accounts, so direct messages are paused.");
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
        (channel === "dm" && dmPairKeyForMessage(parent) === [user.id, recipientId].sort().join(":"))
      );
      if (!sameConversation || !canReadMessage(parent, user.id)) return sendError(reply, 400, "That reply target isn't in this conversation.");
    }
    const message = {
      id: randomUUID(), channel, senderId: user.id, recipientId, groupId,
      dmPairKey: channel === "dm" ? [user.id, recipientId].sort().join(":") : null,
      text: censorProfanity(text), attachmentId, replyToId, pinned: false, createdAt: Date.now()
    };
    database.messages.push(message);
    if (database.messages.length > 20000) database.messages.splice(0, database.messages.length - 20000);
    if (attachment) attachment.messageId = message.id;
    const createdNotifications = [];
    if (channel === "dm" && !muteMatches(recipientId, message)) {
      createdNotifications.push(notifyUser(recipientId, "dm", "New message from " + user.username, message.text || "Sent an attachment", user.id, { messageId: message.id }));
    } else if (channel === "group") {
      const groupName = database.groups.find((item) => item.id === groupId)?.name || "Group chat";
      for (const member of database.groupMembers.filter((item) => item.groupId === groupId && item.userId !== user.id)) {
        if (!muteMatches(member.userId, message)) createdNotifications.push(notifyUser(member.userId, "group-message", "New message in " + groupName, message.text || "Sent an attachment", user.id, { groupId, messageId: message.id }));
      }
    }
    try {
      await persist();
    } catch {
      database.messages = database.messages.filter((item) => item.id !== message.id);
      database.notifications = database.notifications.filter((item) => !createdNotifications.some((created) => created.id === item.id));
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
      const pairKey = channel === "dm" ? [user.id, peerId].sort().join(":") : "";
      const matches = channel === "global" ? message.channel === "global" :
        channel === "dm" ? message.channel === "dm" && dmPairKeyForMessage(message) === pairKey :
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
      else if (message.channel === "dm" && (message.senderId === user.id || message.recipientId === user.id || dmPairKeyForMessage(message).split(":").includes(user.id))) {
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
    if (message.isAdminNotice) return sendError(reply, 403, "Administrator access notices cannot be edited.");
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
    if (message.isAdminNotice) return sendError(reply, 403, "Administrator access notices cannot be deleted.");
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
