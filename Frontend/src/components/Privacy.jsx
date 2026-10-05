import "../styles/StaticPages.css";
import useAgentId from "./useAgentId";

const EFFECTIVE_DATE = "2029-12-31";

// each section: optional intro line, optional bullet list, then closing paragraphs
const SECTIONS = [
  {
    title: "Information We Collect",
    intro: "We may collect the following information:",
    items: [
      "Name",
      "Mobile number",
      "Email address",
      "Delivery address",
      "Order details",
      "Feedback and reviews",
      "Payment information (processed through secure payment gateways)",
    ],
  },
  {
    title: "How We Use Your Information",
    intro: "We use your information to:",
    items: [
      "Process and deliver orders",
      "Respond to inquiries",
      "Improve our products and services",
      "Send order updates",
      "Share promotional offers (only if you opt-in)",
    ],
    paragraphs: [
      <>
        We do <strong>not sell, rent, or trade</strong> your personal information
        to third parties.
      </>,
    ],
  },
  {
    title: "Payment Security",
    paragraphs: [
      "All online payments are processed through secure third-party payment gateways. We do not store your card or banking details on our servers.",
    ],
  },
  {
    title: "Data Protection",
    paragraphs: [
      "We implement reasonable security measures to protect your personal information from unauthorized access, misuse, or disclosure.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "Our website may use cookies to improve user experience and analyze website traffic.",
      "You may choose to disable cookies through your browser settings.",
    ],
  },
  {
    title: "Third-Party Services",
    intro: "We may use trusted third-party services for:",
    items: ["Payment processing", "Delivery services", "Website analytics"],
    paragraphs: [
      "These providers only access information necessary to perform their services.",
    ],
  },
  {
    title: "Your Consent",
    paragraphs: ["By using our website, you consent to our Privacy Policy."],
  },
];

const PrivacyPolicy = () => {
  const { getUrlWithAgentId } = useAgentId();

  return (
    <div className="static-page">
      <header className="static-hero">
        <span className="static-eyebrow">Your Data, Your Trust</span>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="static-lead">
          At <strong>Village Mitai</strong>, we value your trust and are committed
          to protecting your personal information. This Privacy Policy explains how
          we collect, use, and safeguard your data when you visit our website or
          place an order with us.
        </p>
        <p className="static-meta">
          <i className="bi bi-calendar3" aria-hidden="true"></i>
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </header>

      <div className="static-section policy-list">
        {SECTIONS.map((section, index) => (
          <section key={section.title} className="static-card policy-section">
            <span className="policy-number" aria-hidden="true">{index + 1}</span>

            <div className="policy-body">
              <h2>{section.title}</h2>

              {section.intro && <p>{section.intro}</p>}

              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.paragraphs?.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="static-section static-card policy-help">
        <p>Have a question about this policy or your data?</p>
        <a href={getUrlWithAgentId("/contact")} className="static-btn">
          Contact Us
          <i className="bi bi-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
