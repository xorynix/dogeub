import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock3, LoaderCircle, LogIn, LogOut, MessageCircle, Search, ShieldCheck, UserPlus, Users, UserRound, UserX, X } from 'lucide-react';
import Nav from '../layouts/Nav';

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || 'The social service could not complete that request.');
  return data;
}
const send = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
const dateText = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) || !value ? '' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
function UserAvatar({ user }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatarUrl]);
  return <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-300/20 to-violet-400/20 font-bold text-cyan-100">
    {user?.avatarUrl && !failed ? <img src={user.avatarUrl} onError={() => setFailed(true)} alt="" className="h-full w-full object-cover" /> : (user?.username?.[0]?.toUpperCase() || <UserRound size={18} />)}
  </span>;
}
function Presence({ user }) {
  const color = user?.presence === 'online' ? 'bg-emerald-400' : user?.presence === 'away' ? 'bg-amber-300' : 'bg-slate-500';
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><span className={'h-2 w-2 rounded-full ' + color} />{user?.presence === 'online' ? 'Online' : user?.presence === 'away' ? 'Away' : user?.lastSeenAt ? 'Last seen ' + dateText(user.lastSeenAt) : 'Offline'}</span>;
}
function Card({ title, icon: Icon, children, count }) {
  return <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-white"><Icon size={17} className="text-cyan-300" />{title}</h2>{count !== undefined && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{count}</span>}</div>{children}</section>;
}
export default function SocialCenter() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState('friends');
  const [social, setSocial] = useState({ friends: [], incoming: [], outgoing: [], blocked: [] });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reports, setReports] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [profileUsername, setProfileUsername] = useState('');
  const [bio, setBio] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [bannerColor, setBannerColor] = useState('#172554');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const session = await api('/api/messages/session');
      setUser(session.user);
      if (!session.user) {
        setSocial({ friends: [], incoming: [], outgoing: [], blocked: [] });
        setNotifications([]);
        setUnreadCount(0);
        setReports([]);
        return;
      }
      const [socialData, notificationData] = await Promise.all([
        api('/api/messages/social'),
        api('/api/messages/notification-center'),
      ]);
      setSocial(socialData);
      setNotifications(notificationData.notifications || []);
      setUnreadCount(notificationData.unreadCount || 0);
      if (session.user.isModerator) {
        try { const data = await api('/api/messages/moderation/reports'); setReports(data.reports || []); }
        catch { setReports([]); }
      } else setReports([]);
    } catch (problem) {
      setError(problem.message || 'Could not load the social center.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!user) return;
    setProfileUsername(user.username || '');
    setBio(user.bio || '');
    setStatusMessage(user.statusMessage || '');
    setBannerColor(user.bannerColor || '#172554');
  }, [user?.id, user?.username, user?.bio, user?.statusMessage, user?.bannerColor]);
  useEffect(() => {
    if (!user?.id) return undefined;
    const heartbeat = () => send('/api/messages/presence', {}).catch(() => {});
    heartbeat();
    const id = window.setInterval(() => { heartbeat(); refresh(); }, 30_000);
    return () => {
      window.clearInterval(id);
      send('/api/messages/presence', { hidden: true }).catch(() => {});
    };
  }, [user?.id, refresh]);

  const run = async (work) => {
    setWorking(true); setError(''); setNotice('');
    try { await work(); }
    catch (problem) { setError(problem.message || 'Something went wrong.'); }
    finally { setWorking(false); }
  };
  const submitAuth = (event) => {
    event.preventDefault();
    run(async () => {
      if (mode === 'register' && password.length < 8) throw new Error('Use a password with at least 8 characters.');
      const data = await api('/api/messages/' + mode, { method: 'POST', body: JSON.stringify({ username, password }) });
      setUser(data.user);
      await send('/api/messages/presence', {});
      await refresh();
      setPassword('');
      setNotice(mode === 'register' ? 'Account created. Your DOGEUB social profile is ready.' : 'Signed in.');
    });
  };
  const logout = () => run(async () => {
    await api('/api/messages/logout', { method: 'POST' });
    setUser(null); setSocial({ friends: [], incoming: [], outgoing: [], blocked: [] }); setNotifications([]); setReports([]);
    setNotice('Signed out of DOGEUB Messages and Social.');
  });
  const searchUsers = (event) => {
    event?.preventDefault();
    run(async () => {
      const data = await api('/api/messages/users?q=' + encodeURIComponent(searchText.trim()));
      setSearchResults(data.users || []);
      setNotice(data.users?.length ? 'Choose a user to send a friend request.' : 'No matching users found.');
    });
  };
  const requestFriend = (target) => run(async () => {
    await send('/api/messages/friend-requests', { userId: target.id });
    setSearchResults((items) => items.filter((item) => item.id !== target.id));
    await refresh();
    setNotice('Friend request sent to ' + target.username + '.');
  });
  const respondRequest = (requestId, action) => run(async () => {
    await send('/api/messages/friend-requests/respond', { requestId, action });
    await refresh();
    setNotice(action === 'accept' ? 'Friend request accepted.' : action === 'cancel' ? 'Request cancelled.' : 'Request declined.');
  });
  const removeFriend = (target) => run(async () => {
    await send('/api/messages/friends/remove', { userId: target.id });
    await refresh();
    setNotice(target.username + ' was removed from your friends list.');
  });
  const blockUser = (target, blocked) => run(async () => {
    await send('/api/messages/block', { userId: target.id, blocked });
    setSearchResults((items) => items.filter((item) => item.id !== target.id));
    await refresh();
    setNotice(blocked ? target.username + ' is blocked. Direct messages between your accounts are paused.' : target.username + ' was unblocked.');
  });
  const saveProfile = (event) => {
    event.preventDefault();
    run(async () => {
      const data = await api('/api/messages/profile', { method: 'PATCH', body: JSON.stringify({ username: profileUsername, bio, statusMessage, bannerColor }) });
      setUser(data.user);
      await refresh();
      setNotice('Profile saved.');
    });
  };
  const markNotificationRead = (id) => run(async () => { await send('/api/messages/notification-center/read', { id }); await refresh(); });
  const markAllRead = () => run(async () => { await send('/api/messages/notification-center/read', { all: true }); await refresh(); setNotice('All notifications marked as read.'); });
  const reviewReport = (reportId, action) => run(async () => {
    await send('/api/messages/moderation/action', { reportId, action });
    await refresh();
    setNotice(action === 'dismiss' ? 'Report dismissed.' : 'Reported message removed.');
  });

  const tabs = [
    { id: 'friends', name: 'Friends', icon: Users },
    { id: 'requests', name: 'Requests', icon: UserPlus, count: social.incoming?.length || 0 },
    { id: 'profile', name: 'Profile', icon: UserRound },
    { id: 'blocked', name: 'Blocked', icon: UserX },
    { id: 'notifications', name: 'Notifications', icon: Bell, count: unreadCount },
    ...(user?.isModerator ? [{ id: 'moderation', name: 'Moderation', icon: ShieldCheck, count: reports.filter((item) => item.status === 'open').length }] : []),
  ];
  const friendContent = useMemo(() => social.friends || [], [social.friends]);

  return <div className="min-h-screen text-white"><Nav /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">DOGEUB Social</p><h1 className="text-3xl font-bold sm:text-4xl">Your people, your profile.</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Friends, presence, profile details, blocks, notifications, and a moderator review queue when configured by the site owner.</p></div>{user && <button onClick={logout} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"><LogOut size={15} /> Sign out</button>}</div>
    {error && <div role="alert" className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
    {notice && <div role="status" className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}
    {loading ? <div className="mt-12 flex items-center justify-center gap-2 text-slate-300"><LoaderCircle className="animate-spin" size={19} /> Loading your social center...</div> : !user ? <div className="mx-auto mt-8 grid max-w-4xl gap-5 lg:grid-cols-[1fr_390px]"><section className="rounded-3xl border border-white/10 bg-slate-950/50 p-7"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Users size={25} /></div><h2 className="text-2xl font-semibold">Sign in to DOGEUB Social</h2><p className="mt-3 text-sm leading-6 text-slate-300">Use the same account as DOGEUB Messages. Your friend list, profile, blocks, and notification history are stored by the Messages service.</p><div className="mt-5 space-y-3">{['Send and manage friend requests','Show online, away, and offline presence','Customize your profile and status','Control unwanted direct messages'].map((item) => <p key={item} className="flex items-center gap-2 text-sm text-slate-300"><Check size={15} className="text-cyan-300" />{item}</p>)}</div></section><form onSubmit={submitAuth} className="rounded-3xl border border-white/10 bg-slate-950/65 p-6"><h2 className="text-xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><label className="mt-5 block text-sm text-slate-300">Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={20} required className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-cyan-300/50" /></label><label className="mt-3 block text-sm text-slate-300">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={128} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-cyan-300/50" /></label><button disabled={working} type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"><LogIn size={16} />{working ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button><button type="button" onClick={() => setMode((value) => value === 'login' ? 'register' : 'login')} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5">{mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}</button><p className="mt-4 text-xs leading-5 text-slate-500">Use a unique password. The service enforces the account's existing username and password rules.</p></form></div> : <>
      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10" style={{ background: 'linear-gradient(120deg, ' + (user.bannerColor || '#172554') + ', rgba(15,23,42,.98))' }}><div className="flex flex-wrap items-center gap-4 p-5 sm:p-7"><UserAvatar user={user} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{user.username}</h2>{user.isAdmin && user.title === 'DOGEUB Architect' && <span title="Exclusive title for DOGEUB administrators" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/25 bg-fuchsia-300/[.08] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-fuchsia-100"><ShieldCheck size={11} /> DOGEUB Architect</span>}</div><p className="mt-1 text-sm text-slate-200/80">{user.statusMessage || 'No status message yet.'}</p><p className="mt-2"><Presence user={user} /></p></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-white/20 bg-black/10 px-3 py-1.5">{social.friends?.length || 0} friends</span><span className="rounded-full border border-white/20 bg-black/10 px-3 py-1.5">{unreadCount} unread</span></div></div>{user.bio && <p className="px-5 pb-5 text-sm leading-6 text-slate-100/80 sm:px-7">{user.bio}</p>}</section>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ' + (tab === item.id ? 'border-cyan-300/40 bg-cyan-300/10 text-white' : 'border-white/10 bg-slate-950/35 text-slate-300 hover:bg-white/5')}><Icon size={15} />{item.name}{item.count > 0 && <span className="rounded-full bg-cyan-300 px-1.5 text-[10px] font-bold text-slate-950">{item.count}</span>}</button>; })}</div>

      {tab === 'friends' && <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
        <Card title="Your friends" icon={Users} count={friendContent.length}>{friendContent.map((friend) => <div key={friend.id} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0"><UserAvatar user={friend} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{friend.username}</p><Presence user={friend} />{friend.statusMessage && <p className="mt-1 truncate text-xs text-slate-500">{friend.statusMessage}</p>}</div><button onClick={() => navigate('/profile/' + encodeURIComponent(friend.username))} title="View profile" className="rounded-xl border border-white/10 p-2.5 hover:bg-white/10"><UserRound size={16} /></button><button onClick={() => navigate('/messages')} title="Open Messages" className="rounded-xl border border-white/10 p-2.5 hover:bg-white/10"><MessageCircle size={16} /></button><button onClick={() => removeFriend(friend)} title="Remove friend" className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:text-rose-200"><UserX size={16} /></button><button onClick={() => blockUser(friend, true)} title="Block user" className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:text-rose-200"><UserX size={16} /></button></div>)}{friendContent.length === 0 && <p className="py-5 text-sm text-slate-400">No friends yet. Search by username to send your first request.</p>}</Card>
        <Card title="Find people" icon={Search}><form onSubmit={searchUsers} className="flex gap-2"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} minLength={1} maxLength={30} placeholder="Search exact or partial username" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/50" /><button type="submit" disabled={working || !searchText.trim()} aria-label="Search users" className="rounded-xl bg-cyan-300 px-3 text-slate-950 disabled:opacity-40"><Search size={16} /></button></form><div className="mt-3 space-y-2">{searchResults.map((candidate) => <div key={candidate.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><UserAvatar user={candidate} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{candidate.username}</p><Presence user={candidate} /></div><button onClick={() => navigate('/profile/' + encodeURIComponent(candidate.username))} title="View profile" className="rounded-lg border border-white/10 p-2"><UserRound size={15} /></button><button onClick={() => blockUser(candidate, true)} title="Block user" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-rose-200"><UserX size={15} /></button><button onClick={() => requestFriend(candidate)} title="Send friend request" className="rounded-lg bg-cyan-300 p-2 text-slate-950"><UserPlus size={15} /></button></div>)}{searchResults.length === 0 && <p className="py-4 text-xs text-slate-500">Search results will appear here.</p>}</div><p className="mt-3 text-xs text-slate-500">Accounts blocked by either side are excluded from search.</p></Card>
      </div>}

      {tab === 'requests' && <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card title="Incoming requests" icon={UserPlus} count={social.incoming?.length || 0}>{(social.incoming || []).map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0"><UserAvatar user={item.user} /><div className="min-w-0 flex-1"><p className="font-medium">{item.user.username}</p><p className="text-xs text-slate-500">{dateText(item.createdAt)}</p></div><button onClick={() => respondRequest(item.id, 'accept')} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950">Accept</button><button onClick={() => respondRequest(item.id, 'decline')} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10">Decline</button></div>)}{(!social.incoming || social.incoming.length === 0) && <p className="py-4 text-sm text-slate-400">You are all caught up.</p>}</Card><Card title="Sent requests" icon={Clock3} count={social.outgoing?.length || 0}>{(social.outgoing || []).map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0"><UserAvatar user={item.user} /><div className="min-w-0 flex-1"><p className="font-medium">{item.user.username}</p><p className="text-xs text-slate-500">Sent {dateText(item.createdAt)}</p></div><button onClick={() => respondRequest(item.id, 'cancel')} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:text-rose-200">Cancel</button></div>)}{(!social.outgoing || social.outgoing.length === 0) && <p className="py-4 text-sm text-slate-400">No outgoing requests.</p>}</Card></div>}

      {tab === 'profile' && <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]"><Card title="Edit profile" icon={UserRound}><form onSubmit={saveProfile} className="space-y-4"><label className="block text-sm text-slate-300">Username<input value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} minLength={3} maxLength={20} required className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-cyan-300/50" /><span className="mt-1 block text-xs text-slate-500">3–20 letters, numbers, or underscores.</span></label><label className="block text-sm text-slate-300">Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={200} rows={4} placeholder="A little about you..." className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-cyan-300/50" /><span className="mt-1 block text-xs text-slate-500 text-right">{bio.length}/200</span></label><label className="block text-sm text-slate-300">Status message<input value={statusMessage} onChange={(event) => setStatusMessage(event.target.value)} maxLength={80} placeholder="What are you up to?" className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-cyan-300/50" /></label><label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-sm">Profile banner color<input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent" /></label><button disabled={working} type="submit" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">Save profile</button></form></Card><Card title="Profile preview" icon={UserRound}><div className="overflow-hidden rounded-2xl border border-white/10" style={{ backgroundColor: bannerColor }}><div className="p-5"><UserAvatar user={{ ...user, username: profileUsername }} /><div className="mt-3 flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{profileUsername || user.username}</h3>{user.isAdmin && user.title === 'DOGEUB Architect' && <span title="Exclusive title for DOGEUB administrators" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/25 bg-fuchsia-300/[.08] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-fuchsia-100"><ShieldCheck size={10} /> DOGEUB Architect</span>}</div><p className="mt-1 text-sm text-white/80">{statusMessage || 'No status message'}</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{bio || 'Your bio will appear here.'}</p></Card></div>}

      {tab === 'blocked' && <div className="mt-5"><Card title="Blocked accounts" icon={UserX} count={social.blocked?.length || 0}>{(social.blocked || []).map((blocked) => <div key={blocked.id} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0"><UserAvatar user={blocked} /><div className="min-w-0 flex-1"><p className="font-medium">{blocked.username}</p><p className="text-xs text-slate-500">Direct messages are paused between your accounts.</p></div><button onClick={() => blockUser(blocked, false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Unblock</button></div>)}{(!social.blocked || social.blocked.length === 0) && <p className="py-4 text-sm text-slate-400">You have not blocked any users.</p>}<p className="mt-3 text-xs text-slate-500">Use the block control on a friend or search result. Blocks are mutual for DM sending and also remove the existing friend relationship and pending requests.</p></Card></div>}

      {tab === 'notifications' && <div className="mt-5"><Card title="Notification center" icon={Bell} count={unreadCount}><div className="mb-3 flex justify-end"><button onClick={markAllRead} disabled={working || unreadCount === 0} className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40">Mark all read</button></div>{notifications.map((item) => <div key={item.id} className={'flex items-start gap-3 border-b border-white/5 py-4 last:border-0 ' + (!item.readAt ? 'bg-cyan-300/[0.035]' : '')}><span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-cyan-200"><Bell size={16} /></span><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 break-words text-sm leading-5 text-slate-300">{item.body}</p><p className="mt-2 text-xs text-slate-500">{dateText(item.createdAt)}{item.readAt ? ' · Read' : ' · Unread'}</p></div>{!item.readAt && <button onClick={() => markNotificationRead(item.id)} title="Mark as read" className="rounded-lg p-2 hover:bg-white/10"><Check size={15} /></button>}</div>)}{notifications.length === 0 && <p className="py-5 text-sm text-slate-400">Your friend requests and message alerts will show up here.</p>}</Card></div>}

      {tab === 'moderation' && user.isModerator && <div className="mt-5"><Card title="Report review queue" icon={ShieldCheck} count={reports.filter((item) => item.status === 'open').length}><p className="mb-4 text-xs leading-5 text-slate-400">This section is visible only to usernames listed in the server's DOGEUB_MODERATOR_USERNAMES environment variable. Review each report before taking action.</p>{reports.map((report) => <article key={report.id} className="mb-3 rounded-2xl border border-white/10 p-4 last:mb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{report.reason || 'Other'} <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">{report.status || 'open'}</span></p><p className="mt-1 text-xs text-slate-500">Reported by {report.reporter?.username || 'unknown'} · {dateText(report.createdAt)}</p></div><p className="text-xs text-slate-400">Message author: {report.message?.sender?.username || 'unavailable'}</p></div><p className="mt-3 break-words rounded-xl bg-black/20 p-3 text-sm text-slate-300">{report.message?.text || 'The reported message is no longer available.'}</p>{report.status === 'open' && <div className="mt-3 flex gap-2"><button onClick={() => reviewReport(report.id, 'dismiss')} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Dismiss report</button><button onClick={() => reviewReport(report.id, 'remove-message')} disabled={!report.message} className="rounded-xl bg-rose-300/90 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Remove message</button></div>}</article>)}{reports.length === 0 && <p className="py-5 text-sm text-slate-400">No reports are currently in the queue.</p>}</Card></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Presence refreshes about every 30 seconds while this page is open.</span><button onClick={() => run(refresh)} disabled={working} className="rounded-lg border border-white/10 px-3 py-2 hover:bg-white/10 disabled:opacity-40">Refresh now</button></div>
    </>}
  </main></div>;
}
