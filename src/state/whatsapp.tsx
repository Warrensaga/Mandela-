import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface WhatsAppContextValue {
  /** Message for the floating button; null means the general enquiry message. */
  message: string | null;
  setMessage: (message: string | null) => void;
}

const WhatsAppContext = createContext<WhatsAppContextValue | null>(null);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const value = useMemo(() => ({ message, setMessage }), [message]);
  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsAppMessage(): WhatsAppContextValue {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsAppMessage must be used inside <WhatsAppProvider>');
  return ctx;
}

/** Sets the floating button's prefilled message while a page is mounted. */
export function usePageWhatsAppMessage(message: string | null): void {
  const { setMessage } = useWhatsAppMessage();
  useEffect(() => {
    setMessage(message);
    return () => setMessage(null);
  }, [message, setMessage]);
}
