// Reads what this browser is willing to tell a website about the device.
// Everything stays on the device: nothing here is sent anywhere.
// Browsers deliberately hide the exact CPU model and total RAM, so those can't be shown.

let cached = null;
export const getCachedSpecs = () => cached;

const browserName = () => {
  const ua = navigator.userAgent;
  const pick = (re) => ua.match(re)?.[1];
  let v;
  if ((v = pick(/Edg\/(\d+)/))) return `Microsoft Edge ${v}`;
  if ((v = pick(/OPR\/(\d+)/))) return `Opera ${v}`;
  if ((v = pick(/Firefox\/(\d+)/))) return `Firefox ${v}`;
  if ((v = pick(/Chrome\/(\d+)/))) return navigator.brave ? `Brave (Chromium ${v})` : `Chrome ${v}`;
  if ((v = pick(/Version\/(\d+).*Safari/))) return `Safari ${v}`;
  return 'Unknown';
};

/** Tidies a WebGL renderer string like "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 ..., D3D11)". */
export const cleanGpuName = (raw) => {
  if (!raw) return '';
  let name = String(raw).trim();
  const angle = name.match(/^ANGLE \((.*)\)$/);
  if (angle) {
    const parts = angle[1].split(', ');
    name = parts.length >= 3 ? parts.slice(1, -1).join(', ') : parts[parts.length - 1];
  }
  return name
    .replace(/\(0x[0-9a-f]+\)/gi, '')
    .replace(/\b(Direct3D\d*|OpenGL Engine)\b.*$/i, '')
    .replace(/^ANGLE Metal Renderer:\s*/i, '')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
};

const gpuName = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return cleanGpuName(raw);
  } catch {
    return '';
  }
};

const osName = (platform, version) => {
  const major = parseInt(version, 10);
  if (/windows/i.test(platform)) {
    // Windows 10 reports 10.x; Windows 11 reports 13 or higher.
    if (Number.isFinite(major)) return major >= 13 ? 'Windows 11' : 'Windows 10';
    return 'Windows';
  }
  if (/mac/i.test(platform)) return version ? `macOS ${version}` : 'macOS';
  if (/android/i.test(platform)) return version ? `Android ${version}` : 'Android';
  return platform || 'Unknown';
};

const storageQuota = async () => {
  try {
    const { quota } = await navigator.storage.estimate();
    if (!quota) return '';
    const gb = quota / 1024 ** 3;
    return gb >= 1 ? `${gb.toFixed(gb >= 10 ? 0 : 1)} GB available` : `${Math.round(quota / 1024 ** 2)} MB available`;
  } catch {
    return '';
  }
};

/** Returns [{ label, value }] rows for the Device specs panel. */
export const getDeviceSpecs = async () => {
  const uad = navigator.userAgentData;
  let high = {};
  try {
    high = (await uad?.getHighEntropyValues?.(['architecture', 'bitness', 'platformVersion'])) || {};
  } catch {
    high = {};
  }

  const platform = uad?.platform || navigator.platform || '';
  const arch = high.architecture
    ? `${{ x86: 'x86', arm: 'ARM' }[high.architecture] || high.architecture}${high.bitness ? ` · ${high.bitness}-bit` : ''}`
    : '';

  const dpr = window.devicePixelRatio || 1;
  const { width, height, colorDepth } = window.screen;
  const physical = `${Math.round(width * dpr)} × ${Math.round(height * dpr)}`;

  const mem = navigator.deviceMemory;
  // Chrome caps this value at 8, so 8 really means "8 GB or more".
  const memory = !mem ? 'Not shared by this browser' : mem >= 8 ? '8 GB or more' : `About ${mem} GB`;

  let timeZone = '';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timeZone = '';
  }

  const touch = navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} points)` : 'No';
  const quota = await storageQuota();

  const rows = [
    { label: 'Operating system', value: osName(platform, high.platformVersion) },
    { label: 'Processor type', value: arch || 'Not shared by this browser' },
    { label: 'CPU threads', value: navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : 'Unknown' },
    { label: 'Memory (RAM)', value: memory },
    { label: 'Graphics', value: gpuName() || 'Not shared by this browser' },
    { label: 'Screen', value: physical },
    { label: 'Display scaling', value: `${Math.round(dpr * 100)}%${colorDepth ? ` · ${colorDepth}-bit color` : ''}` },
    { label: 'Browser', value: browserName() },
    { label: 'Language', value: navigator.language || 'Unknown' },
    { label: 'Time zone', value: timeZone || 'Unknown' },
    { label: 'Touch screen', value: touch },
  ];
  if (quota) rows.push({ label: 'Browser storage', value: quota });

  cached = rows;
  return rows;
};

export const specsToText = (rows) => ['DogeUB device specs', ...rows.map((r) => `${r.label}: ${r.value}`)].join('\n');
