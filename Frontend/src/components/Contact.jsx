const Contact = () => {
  return (
    <div className="container page-static">
      <h2 className="page-title">Contact Us</h2>

      <p className="page-text text-center">
        If you have any questions regarding our services or this Privacy Policy,
        please feel free to reach out to us. Our team will be happy to assist you.
      </p>

      <div className="page-block text-center">
        {/* <div className="col-md-6 d-flex justify-content-center">
          <img
            src={`${process.env.PUBLIC_URL}/images/baklava-pistachio-sobiyet-318929.webp`}
            alt="Village Mitai"
            className="img-fluid rounded"
            style={{ maxHeight: "500px" }}
          />
        </div> */}

        <div>
          <h3 className="section-title">Business Name</h3>
          <p>Chirasvi Foods</p>

          <h3 className="section-title">Address</h3>
          <p>
            PR Layout,<br />
            Marathahalli,<br />
            Bangalore, India
          </p>

          <h3 className="section-title">Phone</h3>
          <p><a href="tel:+919606717117">+91 9606717117</a></p>
          <h3 className="section-title">Email</h3>
          <p><a href="mailto:villagemitai@gmail.com">villagemitai@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default Contact;