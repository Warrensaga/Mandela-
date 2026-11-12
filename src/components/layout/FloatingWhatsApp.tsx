import { generalMessage, whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { useWhatsAppMessage } from '../../state/whatsapp';
import { WhatsAppIcon } from '../ui/Icon';

/** Floating WhatsApp button on every storefront page. Product pages prefill the product. */
export function FloatingWhatsApp() {
  const { settings } = useSite();
  const { message } = useWhatsAppMessage();
  if (!settings.whatsappNumber) return null;
  const href = whatsappLink(settings.whatsappNumber, message ?? generalMessage(settings.storeName));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-4 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-[#1f7a4d] pr-5 pl-4 text-sm font-medium text-white shadow-lift transition-transform hover:-translate-y-0.5 hover:bg-[#186440] sm:right-6 sm:bottom-6"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
