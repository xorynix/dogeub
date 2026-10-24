import { useEffect, useRef, useState } from 'react';
import { Monitor, Copy, PhoneOff, ShieldCheck, MessageCircle, Send, Search, Users } from 'lucide-react';
import Nav from '../layouts/Nav';

async function messagesApi(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || 'Dogeub Messages could not complete that request.');
  return data;
}

async function ensureRemoteMessagesSession() {
  let data = await messagesApi('/api/messages/session');
  if (data.user) return data.user;
  let username = '';
  try { username = String(window.localStorage.getItem('dogeub-os-username-v1') || '').trim(); } catch {}
  if (!username) throw new Error('Set up your Dogeub OS username before searching users or sending invites.');
  data = await messagesApi('/api/messages/os-session', { method: 'POST', body: JSON.stringify({ username }) });
  return data.user;
}

const makeShortPeerId = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
};

export default function RemoteDesktop() {
  const localVideo = useRef(null), remoteVideo = useRef(null);
  const peerRef = useRef(null), callRef = useRef(null), streamRef = useRef(null);
  const requestRef = useRef(null), stoppingRef = useRef(false), controlSocketRef = useRef(null), controlEnabledRef = useRef(false);
  const [mode, setMode] = useState('idle'), [code, setCode] = useState('');
  const [peerId, setPeerId] = useState(''), [incoming, setIncoming] = useState(false);
  const [connected, setConnected] = useState(false), [status, setStatus] = useState('Not connected');
  const [error, setError] = useState('');
  const [controlReady, setControlReady] = useState(false), [controlEnabled, setControlEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState([]), [chatDraft, setChatDraft] = useState('');
  const [inviteSearch, setInviteSearch] = useState(''), [inviteResults, setInviteResults] = useState([]);
  const [inviteBusy, setInviteBusy] = useState(false), [sendingInviteTo, setSendingInviteTo] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');

  const stop = () => {
    stoppingRef.current = true;
    callRef.current?.close();
    requestRef.current?.close();
    if (controlSocketRef.current?.readyState === WebSocket.OPEN) controlSocketRef.current.send(JSON.stringify({ type: 'disarm' }));
    controlSocketRef.current?.close(); controlSocketRef.current = null; controlEnabledRef.current = false;
    setControlReady(false); setControlEnabled(false);
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach(t => t.stop());
    callRef.current = requestRef.current = peerRef.current = streamRef.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setMode('idle'); setPeerId(''); setIncoming(false); setConnected(false);
    setChatMessages([]); setChatDraft(''); setInviteSearch(''); setInviteResults([]); setInviteNotice('');
    setError(''); setStatus('Disconnected — session ended');
  };

  useEffect(() => () => {
    callRef.current?.close();
    requestRef.current?.close();
    controlSocketRef.current?.close();
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const wireCall = (call, answerIncoming = false) => {
    callRef.current = call;
    call.on('stream', stream => {
      if (remoteVideo.current) remoteVideo.current.srcObject = stream;
      setConnected(true); setStatus('Connected — screen is live');
    });
    call.on('close', () => {
      const wasCurrentCall = callRef.current === call;
      if (wasCurrentCall) {
        callRef.current = null;
        requestRef.current?.close();
        requestRef.current = null;
      }
      setConnected(false);
      if (!stoppingRef.current) setStatus('The other computer disconnected');
      if (remoteVideo.current) remoteVideo.current.srcObject = null;
    });
    call.on('error', err => {
      if (!stoppingRef.current) setError(`Connection failed${err?.type ? ` (${err.type})` : ''}. Check both devices and try a new code.`);
    });
    if (answerIncoming) call.answer();
  };

  const host = async () => {
    stoppingRef.current = false; setError('');
    if (!window.Peer) return setError('Connection library did not load. Refresh and try again.');
    if (!navigator.mediaDevices?.getDisplayMedia) return setError('Screen sharing requires HTTPS and a supported browser.');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', stop, { once: true });
      const peer = new window.Peer(makeShortPeerId()); peerRef.current = peer; setMode('host');
      setStatus('Starting connection…');
      peer.on('open', id => { setPeerId(id); setStatus('Ready — waiting for connection'); });
      peer.on('connection', connection => {
        // A data connection is only a request. The host sends no screen
        // stream until the user explicitly approves it below.
        if (requestRef.current || callRef.current) {
          connection.close();
          return;
        }
        if (connection.metadata?.type !== 'dogeub-screen-share-request') {
          connection.close();
          return;
        }
        requestRef.current = connection;
        connection.on('data', data => {
          if (data?.type === 'remote-chat' && typeof data.text === 'string') {
            setChatMessages(previous => [...previous.slice(-99), { id: String(data.id || Date.now()), sender: String(data.sender || 'Viewer').slice(0, 40), text: data.text.slice(0, 500), at: Number(data.at) || Date.now() }]);
            return;
          }
          if (!controlEnabledRef.current || !controlSocketRef.current || controlSocketRef.current.readyState !== WebSocket.OPEN) return;
          if (data && ['pointer','click','mouse-down','mouse-up','scroll','key-down','key-up','type-text'].includes(data.type)) controlSocketRef.current.send(JSON.stringify(data));
        });
        connection.on('open', () => {
          if (requestRef.current !== connection) return;
          setIncoming(true);
          setStatus('Incoming request — approval required');
        });
        connection.on('error', err => {
          if (!stoppingRef.current) {
            setError(`Connection request failed${err?.type ? ` (${err.type})` : ''}. Try a new code.`);
          }
        });
        connection.on('close', () => {
          if (requestRef.current !== connection) return;
          requestRef.current = null;
          setIncoming(false);
          if (!stoppingRef.current && !callRef.current) setStatus('Connection request ended');
        });
      });
      // The host is always the sender of the screen stream. Reject unsolicited
      // incoming media calls so sharing never starts without host approval.
      peer.on('call', call => call.close());
      peer.on('error', err => {
        if (stoppingRef.current) return;
        setError(err?.type === 'unavailable-id'
          ? 'That short code is already in use. Stop hosting and start again for a new code.'
          : `Host setup failed${err?.type ? ` (${err.type})` : ''}. Check the internet connection and refresh if needed.`);
      });
    } catch (err) {
      if (!['NotAllowedError', 'AbortError'].includes(err?.name)) setError('Could not share screen. Check browser permissions.');
    }
  };

  const join = () => {
    stoppingRef.current = false; setError('');
    if (!window.Peer) return setError('Connection library did not load. Refresh and try again.');
    if (!code.trim()) return setError('Enter the host connection code.');
    const peer = new window.Peer(); peerRef.current = peer; setMode('viewer');
    setStatus('Connecting to host…');
    peer.on('open', () => {
      const hostCode = code.trim().toLowerCase();
      let connection;
      try {
        connection = peer.connect(hostCode, {
          reliable: true,
          metadata: { type: 'dogeub-screen-share-request' },
        });
      } catch {
        setError('Could not send the connection request. Check the host code and try again.');
        setStatus('Request could not start');
        return;
      }
      if (!connection) {
        setError('Could not send the connection request. Check the host code and try again.');
        setStatus('Request could not start');
        return;
      }
      requestRef.current = connection;
      connection.on('data', data => {
        if (data?.type === 'remote-chat' && typeof data.text === 'string') {
          setChatMessages(previous => [...previous.slice(-99), { id: String(data.id || Date.now()), sender: String(data.sender || 'Host').slice(0, 40), text: data.text.slice(0, 500), at: Number(data.at) || Date.now() }]);
        }
      });
      connection.on('open', () => {
        if (requestRef.current === connection) setStatus('Request sent — waiting for host approval');
      });
      connection.on('error', err => {
        if (stoppingRef.current) return;
        setError(`Connection request failed${err?.type ? ` (${err.type})` : ''}. Check the host code and both internet connections.`);
        setStatus('Request failed');
      });
      connection.on('close', () => {
        if (requestRef.current !== connection) return;
        requestRef.current = null;
        if (!stoppingRef.current && !callRef.current) setStatus('Request ended before the screen connected');
      });
    });
    peer.on('call', call => {
      // The host calls back with its screen stream only after approval. The
      // viewer answers without sharing its own camera or microphone.
      if (stoppingRef.current || callRef.current) {
        call.close();
        return;
      }
      wireCall(call, true);
      setStatus('Approved — connecting to screen…');
    });
    peer.on('error', err => {
      if (stoppingRef.current) return;
      const messages = {
        'peer-unavailable': 'Host code not found. Make sure hosting is active and copy the newest 10-character code.',
        'network': 'PeerJS signaling connection failed. Check internet on both laptops and try again.',
        'server-error': 'PeerJS signaling server error. Wait a moment and retry.',
        'socket-error': 'Could not reach the signaling server. Check internet access and try again.',
        'disconnected': 'Disconnected from the signaling server. Stop and start the connection again.',
      };
      setError(messages[err?.type] || `Connection failed${err?.type ? ` (${err.type})` : ''}. Check the code and both internet connections.`);
      setStatus('Connection failed');
    });
  };

  const approve = () => {
    const request = requestRef.current;
    const peer = peerRef.current;
    const stream = streamRef.current;
    if (!request || !peer || !stream) return;
    setError('');
    setIncoming(false);
    // PeerJS requires a MediaStream for outgoing media calls. Previously the
    // viewer called peer.call() without one, so PeerJS returned nothing.
    // Now the approved host calls the viewer with its captured screen stream.
    const call = peer.call(request.peer, stream);
    if (!call) {
      setError('Could not start screen sharing after approval. Stop hosting and try again.');
      setStatus('Screen sharing could not start');
      requestRef.current = null;
      request.close();
      return;
    }
    wireCall(call);
    setConnected(true);
    setStatus('Approved — sharing screen');
  };

  const enableControl = () => {
    if (mode !== 'host' || !connected || !requestRef.current) { setError('Connect and approve a viewer before enabling control.'); return; }
    if (!window.confirm('Enable remote mouse and keyboard control? Only do this for someone you trust.')) return;
    setError('');
    try {
      const socket = new WebSocket('ws://127.0.0.1:8765'); controlSocketRef.current = socket;
      socket.onopen = () => {
        // Wait for the local agent's acknowledgement before forwarding input.
        socket.send(JSON.stringify({ type: 'arm', confirmed: true }));
        setStatus('Waiting for host agent confirmation…');
      };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'agent-error') {
            controlEnabledRef.current = false;
            setControlEnabled(false);
            setControlReady(false);
            setError('Host agent: ' + message.message);
          } else if (message.type === 'agent-state') {
            const armed = message.armed === true;
            controlEnabledRef.current = armed;
            setControlEnabled(armed);
            setControlReady(armed);
            if (armed) setStatus('Remote control enabled — host can disconnect at any time');
          }
        } catch { /* Ignore malformed messages. */ }
      };
      socket.onerror = () => {
        controlEnabledRef.current = false; setControlEnabled(false); setControlReady(false);
        setError('Host agent not reachable on this computer. Start the agent on the computer being shared, then retry.');
      };
      socket.onclose = () => { controlEnabledRef.current = false; setControlEnabled(false); setControlReady(false); };
    } catch { setError('Could not connect to the local host agent.'); }
  };
  const sendChat = event => {
    event.preventDefault();
    const text = chatDraft.trim().slice(0, 500);
    const connection = requestRef.current;
    if (!text || !connected || !connection?.open) return;
    let username = '';
    try { username = String(window.localStorage.getItem('dogeub-os-username-v1') || '').trim(); } catch {}
    const payload = { type: 'remote-chat', id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8), sender: username ? '@' + username : (mode === 'host' ? 'Host' : 'Viewer'), text, at: Date.now() };
    try {
      connection.send(payload);
      setChatMessages(previous => [...previous.slice(-99), payload]);
      setChatDraft('');
    } catch { setError('Message could not be sent. Check that the connection is still active.'); }
  };

  const sendInvite = async user => {
    if (!peerId || mode !== 'host') return;
    setSendingInviteTo(user.id);
    setInviteNotice('');
    try {
      const account = await ensureRemoteMessagesSession();
      const text = 'Remote Desktop invite from @' + account.username + '.\nConnection code: ' + peerId + '\nOpen ' + window.location.origin + '/remote-desktop and enter the code. The host must approve the connection.';
      await messagesApi('/api/messages/messages', { method: 'POST', body: JSON.stringify({ channel: 'dm', recipientId: user.id, text }) });
      setInviteNotice('Invite sent to @' + user.username + '.');
    } catch (err) { setInviteNotice(err.message || 'Could not send that invite.'); }
    finally { setSendingInviteTo(''); }
  };

  useEffect(() => {
    const query = inviteSearch.trim();
    if (mode !== 'host' || !peerId || query.length < 2) { setInviteResults([]); return undefined; }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setInviteBusy(true);
      try {
        await ensureRemoteMessagesSession();
        const data = await messagesApi('/api/messages/users?q=' + encodeURIComponent(query));
        if (alive) setInviteResults((data.users || []).filter(user => user?.id));
      } catch (err) { if (alive) setInviteNotice(err.message || 'Could not search Dogeub users.'); }
      finally { if (alive) setInviteBusy(false); }
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [inviteSearch, mode, peerId]);

  const sendInput = payload => { const connection = requestRef.current; if (mode === 'viewer' && connected && connection?.open) { try { connection.send(payload); } catch { /* Connection may be closing. */ } } };
  const handleScreenPointer = event => {
    if (mode !== 'viewer' || !connected) return;
    const video = event.currentTarget;
    const rect = video.getBoundingClientRect();
    const sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
    if (!rect.width || !rect.height || !sourceWidth || !sourceHeight) return;
    // Map around object-contain letterboxing so the cursor lands on the same
    // pixel in the shared desktop instead of the video element's outer box.
    const scale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
    const displayedWidth = sourceWidth * scale, displayedHeight = sourceHeight * scale;
    const offsetX = (rect.width - displayedWidth) / 2, offsetY = (rect.height - displayedHeight) / 2;
    const localX = event.clientX - rect.left - offsetX, localY = event.clientY - rect.top - offsetY;
    if (localX < 0 || localY < 0 || localX > displayedWidth || localY > displayedHeight) return;
    sendInput({ type: 'pointer', x: Math.max(0, Math.min(1, localX / displayedWidth)), y: Math.max(0, Math.min(1, localY / displayedHeight)) });
  };
  const handleScreenKeyDown = event => {
    if (mode !== 'viewer' || !connected || event.repeat) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      sendInput({ type: 'type-text', text: event.key });
      return;
    }
    sendInput({ type: 'key-down', key: event.key === ' ' ? 'Space' : event.key });
  };
  const handleScreenKeyUp = event => {
    if (mode !== 'viewer' || !connected) return;
    event.preventDefault();
    event.stopPropagation();
    sendInput({ type: 'key-up', key: event.key === ' ' ? 'Space' : event.key });
  };
  const enterRemoteFullscreen = async event => {
    if (mode !== 'viewer') return;
    try {
      await event.currentTarget.requestFullscreen?.();
      // Chrome's Keyboard Lock may let the viewer forward more keys in
      // fullscreen. ChromeOS-reserved shortcuts remain controlled by ChromeOS.
      await navigator.keyboard?.lock?.();
    } catch { /* Managed browsers may disable fullscreen or keyboard lock. */ }
  };

  const decline = () => {
    const request = requestRef.current;
    requestRef.current = null;
    request?.close();
    setIncoming(false);
    setStatus('Connection declined');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(peerId); setStatus('Connection code copied'); }
    catch { setError('Copy was blocked; select the code and copy it manually.'); }
  };

  const panel = 'rounded-2xl border border-white/10 bg-slate-950/70 p-5';
  const button = 'w-full rounded-xl px-4 py-3 text-sm font-semibold';
  return <div className="min-h-screen text-white"><Nav />
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold tracking-widest text-cyan-300">DOGEUB CONNECT</p><h1 className="mt-2 text-3xl font-bold">Remote Desktop</h1><p className="mt-2 text-sm text-slate-400">Share a screen with another browser. The host must approve every request.</p></div>
        <span className="flex items-center gap-2 rounded-full border border-emerald-300/20 px-3 py-2 text-xs"><ShieldCheck size={15}/> Approval required</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-semibold">{mode === 'viewer' ? 'Remote screen' : 'Your screen'}</h2><p className="mt-1 text-xs text-slate-400">{status}</p></div>
            {mode !== 'idle' && <button onClick={stop} className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-400"><PhoneOff size={14} className="mr-2 inline"/>EMERGENCY DISCONNECT</button>}
          </header>
          <div className="grid min-h-[300px] place-items-center bg-black/50 p-3">
            <video ref={mode === 'viewer' ? remoteVideo : localVideo} autoPlay playsInline muted={mode !== 'viewer'} tabIndex={mode === 'viewer' ? 0 : -1} onPointerMove={handleScreenPointer} onPointerDown={event => { if (mode !== 'viewer') return; event.preventDefault(); event.currentTarget.focus(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture may be unavailable. */ } handleScreenPointer(event); sendInput({ type: 'mouse-down', button: event.button === 2 ? 'right' : event.button === 1 ? 'middle' : 'left' }); }} onPointerUp={event => { if (mode === 'viewer') { event.preventDefault(); handleScreenPointer(event); sendInput({ type: 'mouse-up', button: event.button === 2 ? 'right' : event.button === 1 ? 'middle' : 'left' }); try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ } } }} onDoubleClick={enterRemoteFullscreen} onContextMenu={event => { if (mode === 'viewer') event.preventDefault(); }} onWheel={event => { if (mode === 'viewer') { event.preventDefault(); sendInput({ type: 'scroll', amount: Math.sign(event.deltaY) * 3 }); } }} onKeyDown={handleScreenKeyDown} onKeyUp={handleScreenKeyUp} className={(connected || (mode === 'host' && streamRef.current) ? 'block' : 'hidden') + ' max-h-[65vh] w-full rounded-xl object-contain'}/>
            {!connected && !(mode === 'host' && streamRef.current) && <div className="p-8 text-center text-slate-400"><Monitor size={32} className="mx-auto mb-3"/><p className="text-sm">Start hosting or enter a connection code.</p></div>}
          </div>
        </section>
        <aside className="space-y-4">
          {mode === 'idle' && <>
            <section className={panel}><h2 className="font-semibold">Share this computer</h2><p className="my-2 text-sm text-slate-400">Select the screen to share, then send the code to your other device.</p><button onClick={host} className={button + ' bg-cyan-200 text-slate-950'}>Start hosting</button></section>
            <section className={panel}><h2 className="font-semibold">Connect to a computer</h2><input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && join()} placeholder="Paste host connection code" className="my-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-cyan-200/50"/><button onClick={join} className={button + ' border border-white/15 hover:bg-white/10'}>Request connection</button></section>
          </>}
          {mode === 'host' && <section className={panel}><h2 className="font-semibold">Connection code</h2><div className="my-3 flex items-center gap-2 rounded-xl bg-black/30 p-3"><code className="flex-1 break-all text-sm text-cyan-100">{peerId || 'Creating code…'}</code><button onClick={copy} disabled={!peerId} aria-label="Copy code" className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40"><Copy size={16}/></button></div>
            {incoming && <div className="rounded-xl border border-amber-200/20 p-3"><p className="text-sm">Someone wants to view your screen.</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={approve} className="rounded-lg bg-emerald-200 p-2 text-sm font-bold text-slate-950">Approve</button><button onClick={decline} className="rounded-lg border border-white/15 p-2 text-sm">Decline</button></div></div>}
            {connected && <div className="mt-4 rounded-xl border border-white/10 p-3"><h3 className="font-semibold">Remote control</h3><p className="my-2 text-xs text-slate-400">Your Chromebook stays browser-only; the optional agent runs on the computer being controlled.</p><div className="text-xs text-slate-400">{controlReady ? 'Host agent armed' : 'Host agent not connected'}</div><button onClick={enableControl} className={button + ' mt-3 border border-emerald-300/30 hover:bg-emerald-300/10'}>Enable mouse + keyboard control</button>{controlEnabled && <button onClick={() => { controlSocketRef.current?.send(JSON.stringify({type:'disarm'})); controlSocketRef.current?.close(); controlSocketRef.current = null; controlEnabledRef.current = false; setControlEnabled(false); setControlReady(false); }} className={button + ' mt-2 border border-rose-300/30'}>Disable remote control</button>}</div>}
          </section>}
          {mode === 'host' && peerId && <section className={panel}>
            <div className="flex items-center gap-2"><Users size={17} className="text-cyan-200"/><h2 className="font-semibold">Invite a Dogeub user</h2></div>
            <p className="my-2 text-xs text-slate-400">Search for a Dogeub username and send your current connection code in a private message.</p>
            <div className="relative"><Search size={15} className="absolute left-3 top-3.5 text-slate-500"/><input value={inviteSearch} onChange={event => setInviteSearch(event.target.value)} placeholder="Search usernames…" className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-9 pr-3 text-sm outline-none focus:border-cyan-200/50"/></div>
            {inviteBusy && <p className="mt-2 text-xs text-slate-400">Searching Dogeub users…</p>}
            {inviteResults.length > 0 && <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{inviteResults.map(user => <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span className="truncate text-sm">@{user.username}</span><button onClick={() => sendInvite(user)} disabled={Boolean(sendingInviteTo)} className="shrink-0 rounded-lg bg-cyan-200 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{sendingInviteTo === user.id ? 'Sending…' : 'Send code'}</button></div>)}</div>}
            {inviteNotice && <p role="status" className="mt-3 break-words text-xs text-cyan-100">{inviteNotice}</p>}
          </section>}
          {connected && <section className={panel}>
            <div className="flex items-center gap-2"><MessageCircle size={17} className="text-cyan-200"/><h2 className="font-semibold">Session chat</h2><span className="ml-auto text-[10px] text-slate-500">Private to this connection</span></div>
            <div role="log" aria-label="Remote desktop chat messages" className="mt-3 max-h-56 min-h-20 space-y-2 overflow-y-auto rounded-xl bg-black/25 p-3">{chatMessages.length === 0 ? <p className="text-xs text-slate-500">No messages yet. Say hi!</p> : chatMessages.map(message => <div key={message.id} className="rounded-lg bg-white/[.04] px-3 py-2"><p className="text-[10px] font-semibold text-cyan-200">{message.sender}</p><p className="mt-1 break-words text-sm text-slate-200">{message.text}</p></div>)}</div>
            <form onSubmit={sendChat} className="mt-3 flex gap-2"><input value={chatDraft} onChange={event => setChatDraft(event.target.value.slice(0, 500))} maxLength={500} placeholder="Message the other person…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-cyan-200/50"/><button type="submit" disabled={!chatDraft.trim()} aria-label="Send chat message" className="rounded-xl bg-cyan-200 px-4 text-slate-950 disabled:opacity-40"><Send size={16}/></button></form>
          </section>}
          {mode === 'viewer' && <section className={panel}><p className="text-sm text-slate-300">Request sent. The host must approve before the screen appears. After connecting, click the screen to focus it; input requires host approval.</p><button onClick={stop} className={button + ' mt-3 border border-white/15'}>Cancel request</button></section>}
          {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}
        </aside>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">Built to use from a ChromeOS browser without a Chromebook extension or app. For full desktop input, the computer being controlled must run the optional host agent; browser-only hosting stays view-only. Some ChromeOS/browser-reserved shortcuts cannot be forwarded. Only control computers you own or have permission to access.</p>
    </main>
  </div>;
}
