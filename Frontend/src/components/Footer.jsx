
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import HorizontalScroller from "./HorizontalScroller";
import NewsLetter from "./NewsLetter";
import "../styles/HeaderFooter.css";
import useAgentId from "./useAgentId"; // Import hook to persist agentid

export default function Footer() {
  const { getUrlWithAgentId } = useAgentId(); // Get function to append agentid

  return (
    <div>
      {/* <NewsLetter />
      <HorizontalScroller /> */}
      <footer className="py-5 footer" style={{ backgroundColor: "#859F3D", color: "#221100", marginTop:'70px' }}>
      <div className="container">
  <div className="row">
    <div className="col-md-4 flex justify-center mb-3">
      <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Logo" className="object-scale-down w-40" />
    </div>

            <div className="col-md-4 mb-3">
              <h5 style={{ color: "#31511E", textTransform: "uppercase", fontSize: "1rem" }}>Quick Links</h5>
              <ul className="list-unstyled">
                <li><a href={getUrlWithAgentId("/about")} className="text-decoration-none">About Us</a></li>
                <li><a href={getUrlWithAgentId("/items")} className="text-decoration-none">Shop</a></li>
                <li><a href={getUrlWithAgentId("/contact")} className="text-decoration-none">Contact</a></li>
              </ul>
            </div>

            <div className="col-md-4 mb-3">
              <h5 style={{ color: "#31511E", textTransform: "uppercase", fontSize: "1rem" }}>Customer Service</h5>
              <ul className="list-unstyled">
                <li><a href={getUrlWithAgentId("/shipping")} className="text-decoration-none">Shipping & Returns</a></li>
                <li><a href={getUrlWithAgentId("/faq")} className="text-decoration-none">FAQ</a></li>
                <li><a href={getUrlWithAgentId("/privacy")} className="text-decoration-none">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-3">
          {/* <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Partner with us" className="object-scale-down w-40"/> */}

          </div>
        </div>
      </footer>
    </div>
  );
}