import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useT } from '@/i18n';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useT();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so a parent passing a new inline onClose each render
  // doesn't re-run the effect below and steal focus back to the dialog.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keyboard a11y (WCAG 2.1.1 / 2.4.3): move focus into the dialog, keep Tab
  // inside it, close on Escape, and hand focus back to whatever opened it.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto bg-surface-900/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          {/*
            This wrapper (not the fixed backdrop above) does the centering,
            and its min-h-full + py-* live on THIS scrollable layer. That
            way, if the card's real height ever exceeds the viewport —
            long content, a browser zoom level, or a `dvh` viewport unit
            that briefly under-reports available height before a resize —
            the overflow is reachable by scrolling the backdrop instead of
            being clipped above the fixed container with no way to reach
            it. Previously only the card's *inner* content scrolled, so a
            too-tall card lost its header off the top of the screen with
            no scrollbar able to reach it.
          */}
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-popover outline-none sm:rounded-2xl"
              style={{ maxHeight: '90dvh' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between p-6 pb-4">
                <h2 id={titleId} className="text-lg font-semibold text-surface-900">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.common.close}
                  className="-my-2 -mr-2.5 flex h-11 w-11 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-6 pb-6">{children}</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
