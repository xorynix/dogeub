import { useOptions } from '/src/utils/optionsContext';

const MODES = [
  { value: 'auto', label: 'Automatic' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
];

export default function DeviceModeSelect({ value, action }) {
  const { effectiveDeviceMode } = useOptions();
  const activeLabel = MODES.find((mode) => mode.value === effectiveDeviceMode)?.label || 'Desktop';

  return (
    <div className="flex min-w-[8.5rem] flex-col items-end gap-1">
      <select
        aria-label="Device layout mode"
        value={value || 'auto'}
        onChange={(event) => action(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
      </select>
      <span className="text-[10px] text-white/45">Active: {activeLabel}</span>
    </div>
  );
}
