import { useEffect, useRef, type MouseEvent } from "react";
import { X } from "lucide-react";
import { RegistrationForm } from "./RegistrationForm";

export function RegistrationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        onClose();
        return;
      }
      if (keyboardEvent.key !== "Tab") return;

      const items = getFocusable();
      if (!items.length) {
        keyboardEvent.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault();
        last.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      dialog.querySelector<HTMLElement>('[data-field="fullName"]')?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  function handleBackdropClick(mouseEvent: MouseEvent<HTMLDivElement>) {
    if (mouseEvent.target === mouseEvent.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-shade/70 p-0 sm:items-center sm:p-6"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        className="relative flex h-full w-full flex-col overflow-hidden bg-ink text-cream sm:h-auto sm:max-h-[90vh] sm:max-w-[760px] sm:border sm:border-line"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close registration"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-line bg-ink text-xl leading-none text-cream transition-colors hover:border-gold hover:text-gold"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        <RegistrationForm onClose={onClose} />
      </div>
    </div>
  );
}
