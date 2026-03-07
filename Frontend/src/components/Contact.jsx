const Contact = () => {
  return (
    <div className="container mt-4 d-flex flex-column align-items-center">
      <h2 className="text-center mb-4 contact">Contact Us</h2>

      <p className="text-center w-75">
        If you have any questions regarding our services or this Privacy Policy,
        please feel free to reach out to us. Our team will be happy to assist you.
      </p>

      <div
        className="row w-100 mt-4 contact-details"
        style={{ borderTop: "1px solid #3F2305", paddingTop: "40px" }}
      >
        {/* <div className="col-md-6 d-flex justify-content-center">
          <img
            src={`${process.env.PUBLIC_URL}/images/baklava-pistachio-sobiyet-318929.webp`}
            alt="Village Mitai"
            className="img-fluid rounded"
            style={{ maxHeight: "500px" }}
          />
        </div> */}

        <div className="col-md-6 d-flex flex-column justify-content-center">
          <h5>Business Name</h5>
          <p>Chirasvi Foods</p>

          <h5>Address</h5>
          <p>
            PR Layout,<br />
            Marathahalli,<br />
            Bangalore, India
          </p>

          <h5>Phone</h5>
          <p><a href="tel:+919606717117">+91 9606717117</a></p>
          <h5>Email</h5>
          <p><a href="mailto:villagemitai@gmail.com">villagemitai@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default Contact;