import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RegistrationModal } from "./RegistrationModal";

type RegistrationModalContextValue = {
  openRegistration: (opener?: HTMLElement) => void;
  closeRegistration: () => void;
  isRegistrationOpen: boolean;
};

const RegistrationModalContext = createContext<RegistrationModalContextValue | null>(null);

export function RegistrationModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const openRegistration = useCallback((opener?: HTMLElement) => {
    openerRef.current =
      opener instanceof HTMLElement
        ? opener
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    setIsOpen(true);
  }, []);

  const closeRegistration = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => {
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        openerRef.current.focus();
      }
      openerRef.current = null;
    }, 0);
  }, []);

  return (
    <RegistrationModalContext.Provider
      value={{ openRegistration, closeRegistration, isRegistrationOpen: isOpen }}
    >
      {children}
      <RegistrationModal open={isOpen} onClose={closeRegistration} />
    </RegistrationModalContext.Provider>
  );
}

export function useRegistrationModal() {
  const context = useContext(RegistrationModalContext);
  if (!context) {
    throw new Error("useRegistrationModal must be used within RegistrationModalProvider");
  }
  return context;
}
