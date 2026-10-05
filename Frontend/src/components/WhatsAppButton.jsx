import "../styles/WhatsAppButton.css";
import { useWhatsappUrl } from "../utils/siteConfig";

// Floating chat button, bottom right. Renders nothing until a number is configured.
export default function WhatsAppButton() {
  const whatsappUrl = useWhatsappUrl();

  if (!whatsappUrl) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-fab"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="whatsapp-fab-icon">
        <i className="bi bi-whatsapp" aria-hidden="true"></i>
      </span>
      <span className="whatsapp-fab-label">Chat with us</span>
    </a>
  );
}
