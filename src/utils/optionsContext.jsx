import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const OptionsContext = createContext();

function detectDeviceMode() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const userAgent = navigator.userAgent || '';
  const isKnownMobile = navigator.userAgentData?.mobile === true;
  const isAppleTablet = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isKnownTablet = isAppleTablet || /iPad|Tablet|PlayBook|Silk/i.test(userAgent) || /Android(?!.*Mobile)/i.test(userAgent);
  const isNarrowTouch = window.matchMedia('(pointer: coarse)').matches && width < 760;
  if (isKnownMobile || width < 640 || isNarrowTouch) return 'mobile';
  if (isKnownTablet || width < 1024) return 'tablet';
  return 'desktop';
}

const getStoredOptions = () => {
  try {
    return JSON.parse(localStorage.getItem('options') || '{}');
  } catch {
    return {};
  }
};

export const OptionsProvider = ({ children }) => {
  const [options, setOptions] = useState(getStoredOptions);
  const [detectedMode, setDetectedMode] = useState(() => detectDeviceMode());
  const requestedMode = options.deviceMode;
  const deviceMode = ['auto', 'mobile', 'tablet', 'desktop'].includes(requestedMode) ? requestedMode : 'auto';
  const effectiveDeviceMode = deviceMode === 'auto' ? detectedMode : deviceMode;

  useEffect(() => {
    const refreshMode = () => setDetectedMode(detectDeviceMode());
    refreshMode();
    window.addEventListener('resize', refreshMode, { passive: true });
    window.addEventListener('orientationchange', refreshMode, { passive: true });
    const pointer = window.matchMedia('(pointer: coarse)');
    pointer.addEventListener?.('change', refreshMode);
    return () => {
      window.removeEventListener('resize', refreshMode);
      window.removeEventListener('orientationchange', refreshMode);
      pointer.removeEventListener?.('change', refreshMode);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.deviceMode = effectiveDeviceMode;
    root.dataset.deviceModePreference = deviceMode;
  }, [deviceMode, effectiveDeviceMode]);

  useEffect(() => {
    try {
      localStorage.setItem('options', JSON.stringify(options));
    } catch {}
  }, [options]);

  const updateOption = useCallback((obj, immediate = true) => {
    if (!obj || typeof obj !== 'object') return;

    const current = getStoredOptions();
    const updated = { ...current, ...obj };

    try {
      localStorage.setItem('options', JSON.stringify(updated));
    } catch {}

    if (immediate) {
      setOptions((prev) => ({ ...prev, ...obj }));
    }
  }, []);

  const contextValue = useMemo(() => ({ options, updateOption, deviceMode, effectiveDeviceMode }), [options, updateOption, deviceMode, effectiveDeviceMode]);

  return <OptionsContext.Provider value={contextValue}>{children}</OptionsContext.Provider>;
};

export const useOptions = () => {
  const context = useContext(OptionsContext);
  if (!context) {
    throw new Error('useOptions must be used within an OptionsProvider');
  }
  return context;
};
