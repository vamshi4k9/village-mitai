
const AboutUs = () => {
  return (
    <div className="container mt-4 d-flex flex-column align-items-center">

      <h2 className="text-center mb-4 contact">About Us</h2>

      <h4 className="text-center mb-3"> A Sweet Legacy Since 1972</h4>

      <p className="text-center w-75">
        Our story began in <strong>1972</strong>, when our elders started a traditional
        sweet-making journey built on <strong>purity, patience, and authentic recipes</strong>.
        What began as a humble family venture soon became known for its rich taste and
        handcrafted quality.
      </p>

      <p className="text-center w-75">
        Although the earlier chapter of our business concluded in <strong>2015</strong>,
        the knowledge, techniques, and treasured recipes were carefully preserved
        within our family.
      </p>

      <p className="text-center w-75">
        Today, with the blessings of our elders and the guidance of our mother,
        we proudly continue this legacy under a new chapter. While the brand name
        is new, the experience behind it carries over <strong>five decades of
        traditional sweet-making expertise</strong>.
      </p>

      <div
        className="row w-100 mt-4 contact-details"
        style={{ borderTop: "1px solid #3F2305", paddingTop: "40px" }}
      >

        {/* <div className="col-md-6 d-flex justify-content-center">
          <img
            src={`${process.env.PUBLIC_URL}/images/baklava-pistachio-sobiyet-318929.webp`}
            alt="Traditional Sweets"
            className="img-fluid rounded"
            style={{ maxHeight: "450px" }}
          />
        </div> */}

        <div className="col-md-6 d-flex flex-column justify-content-center">

          <h5 className="mb-3">Every Sweet We Prepare Reflects:</h5>

          <ul style={{ lineHeight: "2" }}>
            <li>Authentic traditional recipes</li>
            <li>Carefully selected quality ingredients</li>
            <li>Time-tested preparation methods</li>
            <li>A commitment to purity and taste</li>
          </ul>

          <p className="mt-3">
            Our specialty, including our handcrafted <strong>Bandar Halwa</strong>,
            carries forward the same dedication and craftsmanship that began in
            <strong> 1972</strong>.
          </p>

          <p>
            We are not just building a brand.<br />
            <strong>
              We are continuing a family sweet tradition — crafted with experience,
              served with pride.
            </strong>
          </p>

          <p className="mt-2">
            Thank you for being part of our journey.
          </p>

        </div>

      </div>

    </div>
  );
};

export default AboutUs;