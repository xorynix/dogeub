import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, MessageCircle, UserPlus, UserRound } from 'lucide-react';
import Nav from '../layouts/Nav';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || 'Could not load that profile.');
  return data;
}
export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isSelf, setIsSelf] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true); setError('');
      try {
        const [result, session] = await Promise.all([
          api('/api/messages/public-profile/' + encodeURIComponent(username || '')),
          api('/api/messages/session'),
        ]);
        if (cancelled) return;
        setProfile(result.user); setIsSelf(Boolean(result.isSelf)); setIsFriend(Boolean(result.isFriend)); setCurrentUser(session.user);
      } catch (problem) {
        if (!cancelled) setError(problem.message || 'This profile could not be loaded.');
      } finally { if (!cancelled) setLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [username]);
  const sendFriendRequest = async () => {
    setError(''); setNotice('');
    try {
      await api('/api/messages/friend-requests', { method: 'POST', body: JSON.stringify({ userId: profile.id }) });
      setNotice('Friend request sent. Check Social Center to manage requests.');
    } catch (problem) { setError(problem.message || 'Could not send friend request.'); }
  };
  const signInNeeded = !currentUser && !loading;
  return <div className="min-h-screen text-white"><Nav /><main className="mx-auto max-w-4xl px-4 py-8 sm:px-7">
    <button onClick={() => navigate('/social')} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={15} /> Back to Social Center</button>
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Public Profile</p>
    {loading && <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-10 text-center text-slate-300">Loading profile…</div>}
    {error && !loading && <div role="alert" className="rounded-3xl border border-rose-300/20 bg-rose-400/10 p-6 text-rose-100">{error}</div>}
    {profile && !loading && <><section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
      <div className="h-36 sm:h-48" style={{ background: 'linear-gradient(120deg, ' + (profile.bannerColor || '#172554') + ', #020617)' }} />
      <div className="flex flex-wrap items-start gap-4 p-5 sm:p-7"><div className="-mt-14 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-slate-950 bg-gradient-to-br from-cyan-300/20 to-violet-400/20 text-2xl font-bold text-cyan-100">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.username?.[0]?.toUpperCase() || <UserRound size={25} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{profile.username}</h1>{profile.isAdmin && profile.title === 'DOGEUB Architect' && <span title="Exclusive title for DOGEUB administrators" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/25 bg-fuchsia-300/[.08] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-fuchsia-100"><Crown size={11} /> DOGEUB Architect</span>}</div><p className="mt-1 text-sm text-slate-300">{profile.statusMessage || 'No status message set.'}</p><p className="mt-2 text-xs text-slate-500">Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'DOGEUB'}</p></div>{!isSelf && currentUser && <div className="flex gap-2"><button onClick={sendFriendRequest} disabled={isFriend} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"><UserPlus size={15} />{isFriend ? 'Friends' : 'Add friend'}</button><button onClick={() => navigate('/messages')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/10"><MessageCircle size={15} /> Messages</button></div>}{isSelf && <button onClick={() => navigate('/social')} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/10">Edit profile</button>}</div>
      <div className="px-5 pb-6 sm:px-7"><h2 className="text-sm font-semibold text-slate-300">About</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{profile.bio || 'This user has not added a bio yet.'}</p></div>
    </section>
    {notice && <p role="status" className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{notice}</p>}
    {signInNeeded && <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">Sign in to DOGEUB Social to add friends or open Messages.</p>}
    {!currentUser && !loading && <button onClick={() => navigate('/social')} className="mt-3 rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950">Sign in to Social Center</button>}
    </>}
  </main></div>;
}
