import { useEffect } from 'react';

const PANIC_URL = 'https://classroom.google.com/';

const isEditable = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/**
 * Keyboard-only panic trigger: pressing Ctrl+C (or Cmd+C) redirects to Google Classroom.
 *
 * Ctrl+C is also the standard copy shortcut, so to avoid breaking normal copying the
 * redirect is skipped when the user has text selected or is typing in an input,
 * textarea, or contenteditable element. The redirect only fires when there is
 * nothing to copy.
 */
const PanicButton = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key !== 'c' && event.key !== 'C') return;

      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      if (isEditable(document.activeElement) || isEditable(event.target)) return;

      event.preventDefault();
      // replace() so the back button does not return to this site
      window.location.replace(PANIC_URL);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
};

export default PanicButton;
