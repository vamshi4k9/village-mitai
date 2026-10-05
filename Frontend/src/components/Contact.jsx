import "../styles/StaticPages.css";
import { useWhatsappUrl } from "../utils/siteConfig";

const Contact = () => {
  const whatsappUrl = useWhatsappUrl();

  return (
    <div className="static-page">
      <header className="static-hero">
        <span className="static-eyebrow">We're Here To Help</span>
        <h1 className="page-title">Contact Us</h1>
        <p className="static-lead">
          If you have any questions about our sweets, your order or our services,
          please feel free to reach out to us. Our team will be happy to assist you.
        </p>
      </header>

      <section className="static-section contact-grid">
        <a href="tel:+919606717117" className="static-card contact-card">
          <span className="static-icon">
            <i className="bi bi-telephone" aria-hidden="true"></i>
          </span>
          <div className="contact-card-body">
            <p className="contact-label">Phone</p>
            <p className="contact-value">+91 9606717117</p>
            <p className="contact-hint">Tap to call us</p>
          </div>
        </a>

        <a href="mailto:villagemitai@gmail.com" className="static-card contact-card">
          <span className="static-icon">
            <i className="bi bi-envelope" aria-hidden="true"></i>
          </span>
          <div className="contact-card-body">
            <p className="contact-label">Email</p>
            <p className="contact-value">villagemitai@gmail.com</p>
            <p className="contact-hint">Write to us any time</p>
          </div>
        </a>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="static-card contact-card wide"
          >
            <span className="static-icon contact-icon-whatsapp">
              <i className="bi bi-whatsapp" aria-hidden="true"></i>
            </span>
            <div className="contact-card-body">
              <p className="contact-label">WhatsApp</p>
              <p className="contact-value">Chat with us</p>
              <p className="contact-hint">Opens a chat in WhatsApp</p>
            </div>
          </a>
        )}

        <div className="static-card contact-card wide">
          <span className="static-icon">
            <i className="bi bi-geo-alt" aria-hidden="true"></i>
          </span>
          <div className="contact-card-body">
            <p className="contact-label">Address</p>
            <p className="contact-value">Chirasvi Foods</p>
            <p>
              PR Layout,<br />
              Marathahalli,<br />
              Bangalore, India
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
