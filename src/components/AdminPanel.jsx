import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, BellRing, Check, ChevronRight, CircleHelp,
  Clock3, Command, Cpu, Database, ExternalLink, Eye, Gauge, Globe, LayoutDashboard, LoaderCircle,
  LockKeyhole, Megaphone, MessageSquare, MessagesSquare, RefreshCw, Search, ShieldAlert, ShieldCheck, UserCheck, UserCog,
  UserRound, UserRoundX, Users, Wrench, X
} from 'lucide-react';

const ADMIN_PANEL_CODE = 'y:LVXjJwM3nQTRU';
const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'administrators', label: 'Administrators', icon: ShieldCheck },
  { id: 'reports', label: 'Reports', icon: ShieldAlert },
  { id: 'conversations', label: 'Conversations', icon: MessagesSquare },
  { id: 'broadcast', label: 'Announcements', icon: Megaphone },
  { id: 'site', label: 'Site controls', icon: Globe },
  { id: 'audit', label: 'Audit log', icon: Activity },
];
const QUICK_LINKS = [
  { title: 'Dashboard Studio', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Toolbox', path: '/toolbox', icon: Wrench },
  { title: 'PC Center', path: '/pc-center', icon: Cpu },
  { title: 'Game Library', path: '/game-library', icon: Command },
  { title: 'Student Center', path: '/student-center', icon: UserCheck },
  { title: 'Social Center', path: '/social', icon: Users },
  { title: 'Messages', path: '/messages', icon: MessageSquare },
  { title: 'Settings', path: '/settings', icon: UserCog },
];
async function adminRequest(path, options = {}) {
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
  if (!response.ok) {
    const error = new Error(data.error || 'The admin service could not complete that request.');
    error.status = response.status;
    throw error;
  }
  return data;
}
const dateTime = (value) => {
  const date = new Date(value || 0);
  return !value || Number.isNaN(date.getTime()) ? '—' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const fmt = (value) => new Intl.NumberFormat().format(Number(value) || 0);
function StatCard({ label, value, sub, icon: Icon, accent = 'cyan' }) {
  const tone = accent === 'violet' ? 'text-violet-200 bg-violet-300/10 border-violet-200/15' : accent === 'amber' ? 'text-amber-200 bg-amber-300/10 border-amber-200/15' : accent === 'rose' ? 'text-rose-200 bg-rose-300/10 border-rose-200/15' : 'text-cyan-200 bg-cyan-300/10 border-cyan-200/15';
  return <div className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-white">{fmt(value)}</p></div><span className={'grid h-10 w-10 place-items-center rounded-xl border ' + tone}><Icon size={18} /></span></div><p className="mt-2 text-xs text-white/40">{sub}</p></div>;
}
function Panel({ title, description, icon: Icon, action, children, count }) {
  return <section className="rounded-3xl border border-white/10 bg-slate-950/65 p-4 shadow-[0_15px_60px_rgba(0,0,0,.12)] sm:p-6"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.07] text-cyan-100"><Icon size={18} /></span><div><h2 className="font-semibold text-white">{title}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">{description}</p>}</div></div><div className="flex items-center gap-2">{count !== undefined && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/55">{count}</span>}{action}</div></div>{children}</section>;
}
function Avatar({ user }) {
  return <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[.04] font-bold text-cyan-100">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.username?.[0]?.toUpperCase() || '?'}</span>;
}
function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}
export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [reports, setReports] = useState([]);
  const [audit, setAudit] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [conversationText, setConversationText] = useState('');
  const [announcementHistory, setAnnouncementHistory] = useState([]);
  const [broadcastText, setBroadcastText] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [registrationPaused, setRegistrationPaused] = useState(false);
  const [gamesDisabled, setGamesDisabled] = useState(false);
  const [serverMuted, setServerMuted] = useState(false);
  const [browsingDisabled, setBrowsingDisabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.');
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true); setError(''); setNeedsAdminSetup(false);
    try {
      const result = await adminRequest('/api/messages/admin/overview');
      setOverview({ ...(result.stats || {}), admin: result.admin || null });
      setAnnouncement(result.siteSettings?.announcement || '');
      setAnnouncementEnabled(Boolean(result.siteSettings?.announcementEnabled));
      setRegistrationPaused(Boolean(result.siteSettings?.registrationPaused));
      setGamesDisabled(Boolean(result.siteSettings?.gamesDisabled));
      setServerMuted(Boolean(result.siteSettings?.serverMuted));
      setBrowsingDisabled(Boolean(result.siteSettings?.browsingDisabled));
      setMaintenanceMode(Boolean(result.siteSettings?.maintenanceMode));
      setMaintenanceMessage(String(result.siteSettings?.maintenanceMessage || 'DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.'));
      const [usersResult, reportsResult, auditResult, conversationsResult, announcementsResult, administratorsResult] = await Promise.all([
        adminRequest('/api/messages/admin/users'),
        adminRequest('/api/messages/admin/reports'),
        adminRequest('/api/messages/admin/audit'),
        adminRequest('/api/messages/admin/conversations'),
        adminRequest('/api/messages/admin/announcements'),
        adminRequest('/api/messages/admin/administrators'),
      ]);
      setUsers(usersResult.users || []);
      setReports(reportsResult.reports || []);
      setAudit(auditResult.entries || []);
      setConversations(conversationsResult.conversations || []);
      setAnnouncementHistory(announcementsResult.announcements || []);
      setAdministrators(administratorsResult.administrators || []);
      setLastUpdated(Date.now());
    } catch (problem) {
      setError(problem.message || 'Unable to load the admin overview.');
      setNeedsAdminSetup(problem.status === 401 || problem.status === 403);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (unlocked) loadOverview(); }, [unlocked, loadOverview]);
  const runAction = async (key, callback) => {
    setActionBusy(key); setError(''); setNotice('');
    try { await callback(); }
    catch (problem) {
      setError(problem.message || 'The admin action failed.');
      setNeedsAdminSetup(problem.status === 401 || problem.status === 403);
    } finally { setActionBusy(''); }
  };
  const unlock = (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (passcode === ADMIN_PANEL_CODE) {
      setUnlocked(true); setPasscode(''); setFailedAttempts(0);
      setNotice('Admin interface unlocked for this page session.');
      return;
    }
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    setError(next >= 3 ? 'That code did not match. The panel will remain locked until you reload the Settings page.' : 'Incorrect access code.');
    if (next >= 3) setPasscode('');
  };
  const lock = () => {
    setUnlocked(false); setPasscode(''); setOverview(null); setUsers([]); setReports([]); setAudit([]);
    setNotice('Admin interface locked.');
  };
  const refreshUsers = async (query = userQuery) => {
    const result = await adminRequest('/api/messages/admin/users?q=' + encodeURIComponent(query.trim()));
    setUsers(result.users || []);
  };
  const changeSuspension = (user) => runAction('user:' + user.id, async () => {
    const suspended = !user.isSuspended;
    let reason = '';
    if (suspended) {
      reason = window.prompt('Reason for banning @' + user.username + ' from DOGEUB (shown in the admin audit log):', 'Violation of site rules') || '';
      if (!reason.trim()) { setNotice('Ban cancelled; a reason is required.'); return; }
      if (!window.confirm('Ban @' + user.username + ' from DOGEUB? Their site access will be blocked in this app, and their Messages account will be blocked too.')) return;
    } else if (!window.confirm('Restore DOGEUB access for @' + user.username + '?')) return;
    await adminRequest('/api/messages/admin/users/status', { method: 'POST', body: JSON.stringify({ userId: user.id, suspended, reason }) });
    await loadOverview();
    setNotice(suspended ? '@' + user.username + ' was banned from DOGEUB.' : '@' + user.username + ' can access DOGEUB again.');
  });
  const changeAdministrator = (username, granted) => runAction('administrator:' + username, async () => {
    const verb = granted ? 'grant administrator access to' : 'remove administrator access from';
    if (!window.confirm('Are you sure you want to ' + verb + ' @' + username + '? This changes that account\'s server-side DOGEUB permissions.')) return;
    const result = await adminRequest('/api/messages/admin/administrators', {
      method: 'POST',
      body: JSON.stringify({ username, granted }),
    });
    setAdministrators(result.administrators || []);
    await loadOverview();
    setAdminUsername('');
    setNotice(granted ? '@' + username + ' is now a DOGEUB administrator.' : 'Administrator access was removed from @' + username + '.');
  });
  const reviewReport = (report, action) => runAction('report:' + report.id, async () => {
    if (!window.confirm(action === 'remove-message' ? 'Remove the reported message? This changes the stored message text.' : 'Dismiss this report?')) return;
    await adminRequest('/api/messages/admin/reports/action', { method: 'POST', body: JSON.stringify({ reportId: report.id, action }) });
    await loadOverview();
    setNotice(action === 'dismiss' ? 'Report dismissed.' : 'Reported message removed.');
  });

  const refreshConversations = async (query = conversationSearch) => {
    const result = await adminRequest('/api/messages/admin/conversations?q=' + encodeURIComponent(query.trim()));
    setConversations(result.conversations || []);
    if (selectedConversation) {
      const updated = (result.conversations || []).find((item) => item.id === selectedConversation.id);
      if (updated) setSelectedConversation(updated);
    }
  };
  const getConversationQuery = (conversation) => {
    const params = new URLSearchParams({ type: conversation.type });
    if (conversation.type === 'group') params.set('groupId', conversation.groupId);
    else {
      params.set('userA', conversation.userIds[0]);
      params.set('userB', conversation.userIds[1]);
    }
    return params.toString();
  };
  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setConversationMessages([]);
    const data = await adminRequest('/api/messages/admin/conversation-messages?' + getConversationQuery(conversation));
    setConversationMessages(data.messages || []);
  };
  const joinConversation = (conversation) => runAction('conversation:' + conversation.id, async () => {
    await adminRequest('/api/messages/admin/conversations/join', {
      method: 'POST',
      body: JSON.stringify(conversation.type === 'group'
        ? { type: 'group', groupId: conversation.groupId }
        : { type: 'dm', userA: conversation.userIds[0], userB: conversation.userIds[1] }),
    });
    const joined = { ...conversation, joined: true };
    setSelectedConversation(joined);
    await refreshConversations();
    const data = await adminRequest('/api/messages/admin/conversation-messages?' + getConversationQuery(joined));
    setConversationMessages(data.messages || []);
    setNotice(conversation.type === 'dm' ? 'Joined direct conversation in transparent observer mode; participants were notified.' : 'Joined the group conversation as a visible member.');
  });
  const leaveConversation = (conversation) => runAction('leave:' + conversation.id, async () => {
    if (!window.confirm(conversation.type === 'dm'
      ? 'Stop observing this direct conversation? The join and leave remain in the audit log.'
      : 'Leave this group conversation as an administrator?')) return;
    await adminRequest('/api/messages/admin/conversations/leave', {
      method: 'POST',
      body: JSON.stringify(conversation.type === 'group'
        ? { type: 'group', groupId: conversation.groupId }
        : { type: 'dm', userA: conversation.userIds[0], userB: conversation.userIds[1] }),
    });
    setSelectedConversation(null);
    setConversationMessages([]);
    await refreshConversations();
    setNotice('Left the selected conversation.');
  });
  const sendConversationMessage = (event) => {
    event.preventDefault();
    if (!selectedConversation || !conversationText.trim()) return;
    runAction('conversation-send', async () => {
      await adminRequest('/api/messages/admin/conversations/send', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedConversation.type,
          groupId: selectedConversation.groupId,
          userA: selectedConversation.userIds?.[0],
          userB: selectedConversation.userIds?.[1],
          text: conversationText,
        }),
      });
      setConversationText('');
      const data = await adminRequest('/api/messages/admin/conversation-messages?' + getConversationQuery(selectedConversation));
      setConversationMessages(data.messages || []);
      await refreshConversations();
      setNotice('Admin message sent into the selected conversation.');
    });
  };
  const sendGlobalAnnouncement = (event) => {
    event.preventDefault();
    if (!broadcastText.trim()) return;
    runAction('broadcast', async () => {
      await adminRequest('/api/messages/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ text: broadcastText }),
      });
      setBroadcastText('');
      const data = await adminRequest('/api/messages/admin/announcements');
      setAnnouncementHistory(data.announcements || []);
      await loadOverview();
      setNotice('Global announcement published to DOGEUB Global Chat and notification center.');
    });
  };

  const saveSiteControls = (event) => {
    event.preventDefault();
    runAction('settings', async () => {
      const result = await adminRequest('/api/messages/admin/settings', { method: 'PATCH', body: JSON.stringify({ announcement, announcementEnabled, registrationPaused, gamesDisabled, serverMuted, browsingDisabled, maintenanceMode, maintenanceMessage }) });
      setAnnouncement(result.siteSettings?.announcement || '');
      setAnnouncementEnabled(Boolean(result.siteSettings?.announcementEnabled));
      setRegistrationPaused(Boolean(result.siteSettings?.registrationPaused));
      setGamesDisabled(Boolean(result.siteSettings?.gamesDisabled));
      setServerMuted(Boolean(result.siteSettings?.serverMuted));
      setBrowsingDisabled(Boolean(result.siteSettings?.browsingDisabled));
      setMaintenanceMode(Boolean(result.siteSettings?.maintenanceMode));
      setMaintenanceMessage(String(result.siteSettings?.maintenanceMessage || 'DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.'));
      await loadOverview();
      setNotice('Site controls saved.');
    });
  };
  const exportUsers = () => {
    downloadCsv([
      ['Username','Account created','Presence','Banned from DOGEUB','Messages sent','Related reports'],
      ...users.map((user) => [user.username, dateTime(user.createdAt), user.presence, user.isSuspended ? 'Yes' : 'No', user.messageCount, user.reportCount]),
    ], 'dogeub-admin-users.csv');
    setNotice('User list exported as a CSV without passwords, email addresses, or private message content.');
  };
  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return users.filter((user) => !query || user.username.toLowerCase().includes(query));
  }, [users, userQuery]);
  const openReports = reports.filter((report) => !report.status || report.status === 'open').length;
  const health = [
    { label: 'Browser online', value: navigator.onLine ? 'Connected' : 'Offline', ok: navigator.onLine },
    { label: 'Viewport', value: window.innerWidth + ' × ' + window.innerHeight, ok: true },
    { label: 'Secure context', value: window.isSecureContext ? 'HTTPS / secure' : 'Not secure', ok: window.isSecureContext },
    { label: 'Admin APIs', value: needsAdminSetup ? 'Setup required' : overview ? 'Connected' : 'Not checked', ok: Boolean(overview) && !needsAdminSetup },
  ];

  if (!unlocked) return <div className="flex min-h-full flex-1 items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,.12),transparent_55%)] p-4 sm:p-8">
    <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-slate-950/90 shadow-[0_0_90px_rgba(8,145,178,.09)]">
      <div className="border-b border-white/10 bg-gradient-to-br from-cyan-300/[.08] via-transparent to-violet-400/[.06] p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100"><LockKeyhole size={25} /></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/40">Restricted area</span></div>
        <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-200">DOGEUB Control Center</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Admin Panel</h1><p className="mt-3 text-sm leading-6 text-slate-300">A control room for site metrics, account moderation, announcements, and operational tools.</p>
      </div>
      <form onSubmit={unlock} className="p-6 sm:p-8"><label className="block text-sm font-medium text-slate-200">Admin access code<input autoComplete="off" autoCapitalize="off" spellCheck={false} name="dogeub-admin-passcode" type={showPasscode ? 'text' : 'password'} value={passcode} onChange={(event) => setPasscode(event.target.value)} required disabled={failedAttempts >= 3} placeholder="Type your admin code…" className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 font-mono tracking-wider text-white outline-none transition focus:border-cyan-200/50 disabled:opacity-40" /></label>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={showPasscode} onChange={(event) => setShowPasscode(event.target.checked)} className="accent-cyan-300" /> Show access code</label>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[.06] p-3 text-sm text-rose-100">{error}</p>}
        <button type="submit" disabled={failedAttempts >= 3 || !passcode} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={16} /> Unlock Admin Panel</button>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200/15 bg-amber-200/[.045] p-3 text-xs leading-5 text-amber-100/75"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><p>The code unlocks this interface only. DOGEUB source is public, so the code is not a secure server credential. Account and site changes also require your Messages username to be allowlisted on the server as <code>DOGEUB_ADMIN_USERNAMES</code>.</p></div>
      </form>
    </div>
  </div>;

  return <div className="min-h-full flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,rgba(8,145,178,.09),transparent_35%),radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,.06),transparent_35%)] p-3 text-white sm:p-6 xl:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-5 overflow-hidden rounded-3xl border border-cyan-200/15 bg-slate-950/80">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-cyan-300/[.08] via-transparent to-violet-400/[.07] p-5 sm:p-7">
          <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.25em] text-cyan-200"><ShieldCheck size={14} /> Administrator workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Control Center<span className="text-cyan-200">.</span></h1><p className="mt-2 text-sm text-white/50">The big switchboard for DOGEUB.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => loadOverview()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs font-semibold hover:bg-white/[.08] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button><button onClick={lock} className="inline-flex items-center gap-2 rounded-xl border border-rose-200/15 px-3 py-2.5 text-xs font-semibold text-rose-100/80 hover:bg-rose-200/[.05]"><LockKeyhole size={14} /> Lock panel</button></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-xs text-white/40 sm:px-7"><span className="inline-flex items-center gap-2"><span className={'h-2 w-2 rounded-full ' + (overview && !needsAdminSetup ? 'bg-emerald-300' : needsAdminSetup ? 'bg-amber-300' : 'bg-slate-500')} />{overview ? 'Server admin connected · @' + (overview.admin?.username || 'admin') : needsAdminSetup ? 'Server admin setup required' : 'Checking server authorization'}</span><span>Last refresh: {dateTime(lastUpdated)}</span></div>
      </header>
      {(error || notice) && <div role={error ? 'alert' : 'status'} className={'mb-4 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ' + (error ? 'border-rose-200/20 bg-rose-300/[.06] text-rose-100' : 'border-emerald-200/15 bg-emerald-200/[.04] text-emerald-100')}><span>{error || notice}{needsAdminSetup && <span className="mt-2 block text-xs leading-5 text-rose-100/70">Sign into your DOGEUB Messages account, then configure <code>DOGEUB_ADMIN_USERNAMES</code> on Railway with your exact username. The passcode alone cannot grant server privileges.</span>}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss message"><X size={15} /></button></div>}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{TABS.map((item) => { const Icon = item.icon; const count = item.id === 'reports' ? openReports : item.id === 'users' && overview ? overview.suspendedUsers : item.id === 'administrators' ? administrators.length : 0; return <button key={item.id} onClick={() => setTab(item.id)} className={'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ' + (tab === item.id ? 'border-cyan-200/30 bg-cyan-200/[.09] text-white' : 'border-white/10 bg-slate-950/45 text-white/50 hover:text-white')}><Icon size={14} />{item.label}{count > 0 && <span className="rounded-full bg-cyan-200 px-1.5 text-[10px] font-bold text-slate-950">{count}</span>}</button>; })}</div>

      {tab === 'overview' && <>
        {loading && !overview ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-12 text-sm text-white/50"><LoaderCircle className="animate-spin" size={17} /> Connecting to admin APIs…</div> : overview ? <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Registered users" value={overview.users} sub={fmt(overview.onlineUsers) + ' active in the last 90 seconds'} icon={Users} />
            <StatCard label="Messages stored" value={overview.messages} sub={fmt(overview.directMessages) + ' direct messages'} icon={MessageSquare} accent="violet" />
            <StatCard label="Open reports" value={overview.openReports} sub="Reports waiting for a decision" icon={ShieldAlert} accent={overview.openReports ? 'rose' : 'cyan'} />
            <StatCard label="Banned accounts" value={overview.suspendedUsers} sub={fmt(overview.groups) + ' groups created' } icon={UserRoundX} accent={overview.suspendedUsers ? 'amber' : 'cyan'} />
            <StatCard label="Friend relationships" value={overview.friendRelationships} sub={fmt(overview.pendingFriendRequests) + ' pending requests'} icon={Users} accent="violet" />
            <StatCard label="Stored attachments" value={overview.attachments} sub="Files referenced in Messages data" icon={Database} />
            <StatCard label="Notifications" value={overview.notifications} sub="Persistent notification records" icon={BellRing} />
            <StatCard label="Group memberships" value={overview.groupMembers} sub="Membership rows in Messages data" icon={Activity} />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Panel title="Quick command deck" description="Jump to any DOGEUB control area without hunting through the navigation." icon={Command}><div className="grid gap-2 sm:grid-cols-2">{QUICK_LINKS.map((item) => { const Icon = item.icon; return <a key={item.path} href={item.path} className="group flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.04]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] text-cyan-100"><Icon size={16} /></span><span className="flex-1 text-sm font-medium">{item.title}</span><ChevronRight size={14} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" /></a>; })}</div></Panel>
            <Panel title="Runtime snapshot" description="Browser-side readings only. This page cannot inspect raw server memory, disk health, or actual GPU temperature." icon={Activity}><div className="space-y-2">{health.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] px-3 py-2.5"><span className="text-xs text-white/50">{item.label}</span><span className="inline-flex items-center gap-2 text-xs"><span className={'h-1.5 w-1.5 rounded-full ' + (item.ok ? 'bg-emerald-300' : 'bg-amber-300')} />{item.value}</span></div>)}<div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-xs leading-5 text-white/45"><CircleHelp size={14} className="mr-2 inline text-cyan-200" />Server metrics reflect the persisted DOGEUB Messages store; visitor counts and host CPU/RAM are not available unless separately instrumented on the host.</div></div></Panel>
          </div>
        </> : <Panel title="Admin authorization needed" description="The UI code was accepted, but server privileges are not enabled for this session." icon={LockKeyhole}><p className="text-sm leading-6 text-white/60">Sign into DOGEUB Messages with your account and configure <code>DOGEUB_ADMIN_USERNAMES</code> on Railway to include your exact username. Only then can this panel read or change admin data.</p><a href="/messages" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950">Open Messages <ExternalLink size={14} /></a></Panel>}
      </>}

      {tab === 'users' && <Panel title="Account management" description="Search usernames and ban/restore DOGEUB access. Protected administrator accounts cannot be banned here." icon={Users} action={<button onClick={exportUsers} disabled={!users.length} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"><ArrowDownToLine size={14} /> Export CSV</button>}>
        <form onSubmit={(event) => { event.preventDefault(); runAction('users', () => refreshUsers(userQuery)); }} className="mb-4 flex gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3"><Search size={15} className="text-white/35" /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Filter users by username…" className="w-full bg-transparent py-3 text-sm outline-none" /></label><button type="submit" disabled={actionBusy === 'users'} className="rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 disabled:opacity-40">Search</button></form>
        <div className="space-y-2">{filteredUsers.map((user) => <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[.07] p-3 sm:p-4"><Avatar user={user} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">@{user.username}</p>{user.isProtectedAdmin && <span className="rounded-full border border-violet-200/20 bg-violet-200/[.07] px-2 py-0.5 text-[9px] uppercase tracking-wider text-violet-100">Protected admin</span>}{user.isSuspended && <span className="rounded-full border border-rose-200/20 bg-rose-200/[.06] px-2 py-0.5 text-[9px] uppercase tracking-wider text-rose-100" >Banned from site</span>}</div><p className="mt-1 text-[11px] text-white/40">Joined {dateTime(user.createdAt)} · {fmt(user.messageCount)} messages · {fmt(user.reportCount)} related reports</p>{user.isSuspended && user.suspensionReason && <p className="mt-1 text-xs text-rose-100/70">Reason: {user.suspensionReason}</p>}</div>{user.isProtectedAdmin ? <span className="text-[10px] text-violet-100/45">Protected</span> : <button onClick={() => changeSuspension(user)} disabled={Boolean(actionBusy) || loading} className={'rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40 ' + (user.isSuspended ? 'border-emerald-200/15 text-emerald-100 hover:bg-emerald-200/[.05]' : 'border-rose-200/15 text-rose-100 hover:bg-rose-200/[.05]')}>{actionBusy === 'user:' + user.id ? 'Saving…' : user.isSuspended ? 'Restore access' : 'Ban from site'}</button>}</div>)}{filteredUsers.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">{needsAdminSetup ? 'Configure server admin access to load accounts.' : 'No accounts match this filter.'}</p>}</div>
      </Panel>}

      {tab === 'administrators' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
        <Panel title="Manage administrators" description="Grant or revoke DOGEUB admin access by an existing Messages username. The change is checked and stored on the server." icon={ShieldCheck} action={<button type="button" onClick={() => runAction('admins-refresh', async () => { const result = await adminRequest('/api/messages/admin/administrators'); setAdministrators(result.administrators || []); })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"><RefreshCw size={13} /> Refresh</button>}>
          <form onSubmit={(event) => { event.preventDefault(); const username = adminUsername.trim(); if (username) changeAdministrator(username, true); }} className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3"><UserCog size={15} className="text-white/35" /><input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} maxLength={24} autoComplete="off" placeholder="Enter an exact DOGEUB username" className="w-full bg-transparent py-3 text-sm outline-none" /></label>
            <button type="submit" disabled={Boolean(actionBusy) || !adminUsername.trim()} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">{actionBusy.startsWith('administrator:') ? 'Saving…' : 'Grant admin access'}</button>
          </form>
          <p className="mt-3 rounded-xl border border-amber-200/15 bg-amber-200/[.04] p-3 text-xs leading-5 text-amber-100/75">The person must already have a password-protected DOGEUB Messages account; username-only OS-linked accounts cannot be promoted because they can be claimed by typing the username. Deployment-configured administrators remain managed in Railway's DOGEUB_ADMIN_USERNAMES setting, and you cannot remove your own current access.</p>
          <div className="mt-5 space-y-2">
            {administrators.map((item) => {
              const currentAdmin = String(overview?.admin?.username || '').toLowerCase() === item.username.toLowerCase();
              return <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[.07] p-3 sm:p-4">
                <Avatar user={item} />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">@{item.username}</p><p className="mt-1 text-[10px] text-white/40">{item.isDeploymentAdmin ? 'Managed by server configuration' : 'Granted from the Admin Panel'}</p></div>
                <span className="rounded-full border border-violet-200/20 bg-violet-200/[.06] px-2.5 py-1 text-[10px] font-semibold text-violet-100">Administrator</span>
                {item.isAdminGranted && !item.isDeploymentAdmin && !currentAdmin ? <button type="button" onClick={() => changeAdministrator(item.username, false)} disabled={Boolean(actionBusy)} className="rounded-xl border border-rose-200/15 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-200/[.05] disabled:opacity-40">{actionBusy === 'administrator:' + item.username ? 'Saving…' : 'Revoke admin'}</button> : <span className="text-[10px] text-white/30">{currentAdmin ? 'Current session' : 'Protected'}</span>}
              </div>;
            })}
            {administrators.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">No administrator accounts are visible. Configure at least one username on the server first.</p>}
          </div>
        </Panel>
        <Panel title="Administrator safety" description="Admin access is enforced on the server and cannot be granted by changing browser storage." icon={LockKeyhole}>
          <div className="space-y-3 text-sm leading-6 text-white/60">
            <p>Only a signed-in administrator can promote another account. The server checks the current session before saving a role change.</p>
            <p>Role changes are saved in DOGEUB's server data and recorded in the audit log.</p>
            <p>Keep at least one trusted account in the Railway <code className="text-cyan-100">DOGEUB_ADMIN_USERNAMES</code> allowlist in case a promoted account needs to be removed.</p>
          </div>
        </Panel>
      </div>}

      {tab === 'reports' && <Panel title="Report moderation" description="Review a report before dismissing it or removing its message. Actions are recorded in the audit log." icon={ShieldAlert} count={openReports}>
        {reports.map((report) => <article key={report.id} className="mb-3 rounded-2xl border border-white/[.08] p-4 last:mb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-white">{report.reason || 'Other'} <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/45">{report.status || 'open'}</span></p><p className="mt-1 text-xs text-white/40">Reporter @{report.reporter?.username || 'unknown'} · {dateTime(report.createdAt)}</p></div><span className="text-xs text-white/40">Author @{report.message?.sender?.username || 'unavailable'}</span></div><p className="mt-3 break-words rounded-xl bg-black/20 p-3 text-sm leading-6 text-white/65">{report.message?.text || 'The reported message is unavailable.'}</p>{(!report.status || report.status === 'open') && <div className="mt-3 flex flex-wrap gap-2"><button disabled={Boolean(actionBusy)} onClick={() => reviewReport(report, 'dismiss')} className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40">Dismiss</button><button disabled={Boolean(actionBusy) || !report.message} onClick={() => reviewReport(report, 'remove-message')} className="rounded-xl border border-rose-200/15 bg-rose-300/[.06] px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-300/[.1] disabled:opacity-40">Remove message</button></div>}</article>)}{reports.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">No reports loaded.</p>}</Panel>}


      {tab === 'conversations' && <div className="grid gap-5 xl:grid-cols-[minmax(300px,.82fr)_minmax(0,1.18fr)]">
        <Panel title="Conversation browser" description="Join saved group chats as a visible member or observe direct messages. Private-conversation joins notify both participants and are written to the audit log." icon={MessagesSquare} action={<button onClick={() => runAction('conversations-refresh', () => refreshConversations())} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"><RefreshCw size={13} /> Refresh</button>}>
          <form onSubmit={(event) => { event.preventDefault(); runAction('conversation-search', () => refreshConversations(conversationSearch)); }} className="mb-4 flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3"><Search size={14} className="text-white/35" /><input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Find a person or group…" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
            <button type="submit" className="rounded-xl bg-cyan-300 px-3 text-xs font-bold text-slate-950">Search</button>
          </form>
          <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
            {conversations.map((conversation) => <article key={conversation.id} className={'rounded-2xl border p-3 transition ' + (selectedConversation?.id === conversation.id ? 'border-cyan-200/30 bg-cyan-200/[.045]' : 'border-white/[.07] bg-white/[.015]')}>
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.05] text-cyan-100">{conversation.type === 'group' ? <Users size={16} /> : <MessageSquare size={16} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-semibold">{conversation.label}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/40">{conversation.type === 'dm' ? 'Direct' : 'Group'}</span>{conversation.joined && <span className="rounded-full border border-emerald-200/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-100">Joined</span>}</div><p className="mt-1 text-[10px] text-white/40">{fmt(conversation.messageCount)} messages · {conversation.type === 'group' ? fmt(conversation.memberCount) + ' members' : 'Last activity ' + dateTime(conversation.lastMessageAt)}</p></div></div>
              <div className="mt-3 flex flex-wrap gap-2"><button disabled={Boolean(actionBusy)} onClick={() => conversation.joined ? runAction('open:' + conversation.id, () => openConversation(conversation)) : (setSelectedConversation(conversation), setConversationMessages([]))} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40">{conversation.joined ? 'Open conversation' : 'View details'}</button>{!conversation.joined && <button disabled={Boolean(actionBusy)} onClick={() => joinConversation(conversation)} className="rounded-lg bg-cyan-300 px-3 py-2 text-[10px] font-bold text-slate-950 disabled:opacity-40">Join & inspect</button>}{conversation.joined && !(conversation.type === 'group' && conversation.isOwner) && <button disabled={Boolean(actionBusy)} onClick={() => leaveConversation(conversation)} className="rounded-lg border border-rose-200/15 px-3 py-2 text-[10px] text-rose-100/80 hover:bg-rose-200/[.05] disabled:opacity-40">Leave</button>}{conversation.type === 'group' && conversation.isOwner && <span className="rounded-lg border border-violet-200/15 px-3 py-2 text-[10px] text-violet-100/60">Owner</span>}</div>
            </article>)}
            {conversations.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">No direct-message history or saved groups match that search.</p>}
          </div>
        </Panel>
        <Panel title={selectedConversation ? selectedConversation.label : 'Conversation inspector'} description={selectedConversation?.type === 'dm' ? 'Administrator observer mode · private access is audited and participants are notified.' : selectedConversation?.type === 'group' ? 'Messages are shown as a group member. Your administrator username is visible to the group.' : 'Choose a conversation on the left, then join it to inspect messages.'} icon={Eye}>
          {selectedConversation ? <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[.04] p-3 text-xs leading-5 text-amber-100/80"><span>{selectedConversation.type === 'dm' ? 'The two participants receive a notification when you join. Your admin replies are labelled and visible in their DM thread.' : 'Your account is added to the group member list when you join.'}</span><span className="rounded-full border border-white/10 px-2 py-1">{fmt(conversationMessages.length)} loaded</span></div>
            {selectedConversation.joined ? <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-2xl border border-white/[.06] bg-black/15 p-3">
              {conversationMessages.map((message) => <article key={message.id} className={'rounded-xl border p-3 ' + (message.isAnnouncement ? 'border-amber-200/15 bg-amber-200/[.04]' : message.isAdminMessage ? 'border-cyan-200/15 bg-cyan-200/[.04]' : 'border-white/[.06] bg-white/[.02]')}><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">@{message.sender?.username || 'unknown'}</p>{message.isAdminMessage && <span className="rounded-full border border-cyan-200/15 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-cyan-100">Admin</span>}<span className="ml-auto text-[9px] text-white/30">{dateTime(message.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{message.text || (message.attachment ? 'Attachment: ' + message.attachment.name : 'Message')}</p></article>)}
              {conversationMessages.length === 0 && <p className="p-6 text-center text-sm text-white/40">No messages in this conversation yet.</p>}
            </div> : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><LockKeyhole size={24} className="mx-auto text-cyan-100/55" /><p className="mt-3 text-sm font-semibold">Join to inspect</p><p className="mt-1 text-xs leading-5 text-white/40">The conversation content is not loaded until you explicitly join. Joining is recorded and notifies participants for direct messages.</p><button onClick={() => joinConversation(selectedConversation)} disabled={Boolean(actionBusy)} className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Join conversation</button></div>}
            {selectedConversation.joined && <form onSubmit={sendConversationMessage} className="mt-3"><label className="block text-xs font-medium text-white/50">Send as administrator <span className="text-white/30">({conversationText.length}/1200)</span><textarea value={conversationText} onChange={(event) => setConversationText(event.target.value)} rows={3} maxLength={1200} placeholder="Write a message into this conversation…" className="mt-2 block w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-200/35" /></label><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-white/35">Admin messages are visibly labelled and notifications are sent to participants.</p><button type="submit" disabled={Boolean(actionBusy) || !conversationText.trim()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40">{actionBusy === 'conversation-send' ? 'Sending…' : 'Send message'}</button></div></form>}
          </> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><MessagesSquare size={30} className="text-cyan-100/35" /><p className="mt-3 text-sm font-semibold text-white/65">Select a conversation</p><p className="mt-1 max-w-sm text-xs leading-5 text-white/35">The inspector can show the last 100 messages after you join. Direct-message access is transparent and recorded in the audit log.</p></div>}
        </Panel>
      </div>}

      {tab === 'broadcast' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
        <Panel title="Global announcement broadcaster" description="Publish directly to DOGEUB Global Chat. The message is pinned, labelled as an announcement, and sent to other accounts through the notification center." icon={Megaphone}>
          <form onSubmit={sendGlobalAnnouncement}>
            <label className="block text-sm text-white/70">Announcement message <span className="text-white/30">({broadcastText.length}/1200)</span><textarea value={broadcastText} onChange={(event) => setBroadcastText(event.target.value)} maxLength={1200} rows={6} required placeholder="Example: DOGEUB will be updated at 6 PM. Save your work before then…" className="mt-2 block w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 outline-none focus:border-cyan-200/35" /></label>
            <div className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.04] p-3 text-xs leading-5 text-amber-100/75">This is a public broadcast. It appears in Global Chat under your admin username and is sent to other accounts as a notification. Do not include passwords, private user data, or anything that should not be public.</div>
            <button type="submit" disabled={Boolean(actionBusy) || !broadcastText.trim()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"><Megaphone size={15} />{actionBusy === 'broadcast' ? 'Publishing…' : 'Publish global announcement'}</button>
          </form>
        </Panel>
        <Panel title="Recent broadcasts" description="The latest 50 global announcement messages." icon={BellRing} action={<button onClick={() => runAction('announcement-history', async () => { const data = await adminRequest('/api/messages/admin/announcements'); setAnnouncementHistory(data.announcements || []); })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"><RefreshCw size={13} /> Refresh</button>}>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">{announcementHistory.map((item) => <article key={item.id} className="rounded-2xl border border-amber-200/15 bg-amber-200/[.025] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-xs font-semibold"><Megaphone size={13} className="text-amber-200" />@{item.sender?.username || 'admin'}</p><time className="text-[10px] text-white/35">{dateTime(item.createdAt)}</time></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{item.text}</p></article>)}{announcementHistory.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">No global announcements have been sent yet.</p>}</div>
        </Panel>
      </div>}

      {tab === 'site' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.75fr)]">
        <Panel title="Site-wide announcement" description="Publish a short banner for visitors. Updates are stored by the server." icon={BellRing}><form onSubmit={saveSiteControls}><label className="block text-sm text-white/70">Announcement text <span className="text-white/30">({announcement.length}/300)</span><textarea value={announcement} onChange={(event) => setAnnouncement(event.target.value)} maxLength={300} rows={4} placeholder="Write a maintenance notice, service update, or message for visitors…" className="mt-2 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 outline-none focus:border-cyan-200/40" /></label><label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><span className="block text-sm font-medium">Publish announcement</span><span className="mt-1 block text-xs text-white/40">Show the message banner across DOGEUB.</span></span><input type="checkbox" checked={announcementEnabled} onChange={(event) => setAnnouncementEnabled(event.target.checked)} disabled={!announcement.trim()} className="h-4 w-4 accent-cyan-300" /></label><label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><span className="block text-sm font-medium">Pause new registrations</span><span className="mt-1 block text-xs text-white/40">Existing accounts remain available; new signup attempts are rejected.</span></span><input type="checkbox" checked={registrationPaused} onChange={(event) => setRegistrationPaused(event.target.checked)} className="h-4 w-4 accent-amber-300" /></label>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-100/70">Maintenance mode</p>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-rose-200/15 bg-rose-200/[.035] p-3"><span><span className="block text-sm font-semibold">Take DOGEUB offline for visitors</span><span className="mt-1 block text-xs leading-5 text-white/45">Shows a maintenance screen to non-admin visitors and blocks their DOGEUB APIs with HTTP 503. Signed-in administrators can still open this app to turn maintenance off.</span></span><input type="checkbox" checked={maintenanceMode} onChange={(event) => setMaintenanceMode(event.target.checked)} className="h-4 w-4 accent-rose-300" /></label>
          <label className="mt-2 block text-xs font-medium text-white/60">Maintenance message <span className="text-white/30">({maintenanceMessage.length}/300)</span><textarea value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} maxLength={300} rows={3} placeholder="DOGEUB is temporarily unavailable while we perform maintenance…" className="mt-2 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 outline-none focus:border-rose-200/35" /></label>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-100/70">Emergency controls</p>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><span className="block text-sm font-medium">Disable the Games section</span><span className="mt-1 block text-xs text-white/40">Blocks DOGEUB game pages and the game library for everyone.</span></span><input type="checkbox" checked={gamesDisabled} onChange={(event) => setGamesDisabled(event.target.checked)} className="h-4 w-4 accent-rose-300" /></label>
          <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><span className="block text-sm font-medium">Mute the entire server</span><span className="mt-1 block text-xs text-white/40">Non-admins cannot send Global Chat, DM, or group messages while enabled.</span></span><input type="checkbox" checked={serverMuted} onChange={(event) => setServerMuted(event.target.checked)} className="h-4 w-4 accent-amber-300" /></label>
          <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><span className="block text-sm font-medium">Disable browsing tools in DOGEUB</span><span className="mt-1 block text-xs text-white/40">Blocks in-site apps/search browsing pages in every browser. It cannot close Chrome, Edge, or other apps on someone's device.</span></span><input type="checkbox" checked={browsingDisabled} onChange={(event) => setBrowsingDisabled(event.target.checked)} className="h-4 w-4 accent-rose-300" /></label></div></div>
          <button type="submit" disabled={Boolean(actionBusy)} className="mt-4 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{actionBusy === 'settings' ? 'Saving…' : 'Save site controls'}</button></form></Panel>
        <Panel title="Live preview" description="This is how the global announcement banner will appear." icon={Globe}><div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[.07] p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-200"><BellRing size={13} /> DOGEUB announcement</p><p className="mt-2 break-words text-sm leading-6 text-white/80">{announcementEnabled && announcement.trim() ? announcement : 'Your announcement preview will appear here when it is enabled.'}</p><p className="mt-2 text-[10px] text-white/35">{announcementEnabled && announcement.trim() ? 'Preview · ready to publish' : 'Hidden from visitors'}</p></div><p className="mt-4 text-xs leading-5 text-white/40">The public announcement contains only your enabled banner text. Admin account lists and moderation data require server-side authorization.</p></Panel>
      </div>}

      {tab === 'audit' && <Panel title="Admin audit log" description="Recent admin actions: site bans, restored access, report decisions, and site setting changes." icon={Activity} action={<button onClick={() => runAction('audit', async () => { const result = await adminRequest('/api/messages/admin/audit'); setAudit(result.entries || []); })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"><RefreshCw size={13} /> Refresh log</button>}>
        <div className="space-y-2">{audit.map((entry) => <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-white/[.06] p-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.04] text-cyan-200"><Activity size={14} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{entry.action}</p><span className="text-[10px] text-white/35">{dateTime(entry.createdAt)}</span></div><p className="mt-1 text-xs text-white/50">By @{entry.actorUsername || 'admin'}{entry.target ? ' · Target: ' + entry.target : ''}</p>{entry.details && <p className="mt-1 break-words text-xs text-white/40">{entry.details}</p>}</div></div>)}{audit.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/40">No admin actions have been recorded yet.</p>}</div>
      </Panel>}
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px] text-white/30"><span className="inline-flex items-center gap-2"><ShieldCheck size={13} /> Protected by the server-side administrator allowlist.</span><span>Admin interface unlocked only in this page session.</span></footer>
    </div>
  </div>;
}
