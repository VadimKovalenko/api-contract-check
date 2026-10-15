import { useEffect, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useModalAccessibility(isOpen: boolean, onClose: () => void) {
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  function rememberOpener() {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('[data-accessible-modal]');

    if (!isOpen || !dialog) {
      return undefined;
    }
    const focusInitialElement = () => {
      const initialElement = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]');
      (initialElement ?? dialog).focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const animationFrame = window.requestAnimationFrame(focusInitialElement);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [isOpen]);

  return { rememberOpener };
}
