import "../styles/StaticPages.css";
import useAgentId from "./useAgentId";

const VALUES = [
  { icon: "bi-journal-bookmark", text: "Authentic traditional recipes" },
  { icon: "bi-basket2", text: "Carefully selected quality ingredients" },
  { icon: "bi-hourglass-split", text: "Time-tested preparation methods" },
  { icon: "bi-heart", text: "A commitment to purity and taste" },
];

const AboutUs = () => {
  const { getUrlWithAgentId } = useAgentId();

  return (
    <div className="static-page">
      <header className="static-hero">
        <span className="static-eyebrow">Our Story</span>
        <h1 className="page-title">About Us</h1>
        <p className="static-lead">A Sweet Legacy Since 1972</p>
      </header>

      <section className="static-section">
        <h2 className="section-title">Our Journey</h2>

        <ol className="about-timeline">
          <li>
            <span className="about-year">1972</span>
            <div className="static-card">
              <p>
                Our story began in <strong>1972</strong>, when our elders started a
                traditional sweet-making journey built on{" "}
                <strong>purity, patience, and authentic recipes</strong>. What began
                as a humble family venture soon became known for its rich taste and
                handcrafted quality.
              </p>
            </div>
          </li>

          <li>
            <span className="about-year">2015</span>
            <div className="static-card">
              <p>
                Although the earlier chapter of our business concluded in{" "}
                <strong>2015</strong>, the knowledge, techniques, and treasured
                recipes were carefully preserved within our family.
              </p>
            </div>
          </li>

          <li>
            <span className="about-year">Today</span>
            <div className="static-card">
              <p>
                Today, with the blessings of our elders and the guidance of our
                mother, we proudly continue this legacy under a new chapter. While
                the brand name is new, the experience behind it carries over{" "}
                <strong>
                  five decades of traditional sweet-making expertise
                </strong>
                .
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="static-section">
        <h2 className="section-title">Every Sweet We Prepare Reflects</h2>

        <div className="about-values">
          {VALUES.map((value) => (
            <div key={value.text} className="static-card about-value">
              <span className="static-icon">
                <i className={`bi ${value.icon}`} aria-hidden="true"></i>
              </span>
              {value.text}
            </div>
          ))}
        </div>
      </section>

      <section className="static-section about-closing">
        <p>
          Our specialty, including our handcrafted <strong>Bandar Halwa</strong>,
          carries forward the same dedication and craftsmanship that began in{" "}
          <strong>1972</strong>.
        </p>

        <p className="about-quote">
          We are not just building a brand. We are continuing a family sweet
          tradition — crafted with experience, served with pride.
        </p>

        <p>Thank you for being part of our journey.</p>

        <a href={getUrlWithAgentId("/items")} className="static-btn">
          Shop All Items
          <i className="bi bi-arrow-right" aria-hidden="true"></i>
        </a>
      </section>
    </div>
  );
};

export default AboutUs;
