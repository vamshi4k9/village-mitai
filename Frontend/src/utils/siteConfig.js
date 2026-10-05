import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants";

// one request per page load, shared by everything that needs the site config
let siteConfigRequest = null;

const fetchSiteConfig = () => {
  if (!siteConfigRequest) {
    siteConfigRequest = axios
      .get(`${API_BASE_URL}/site-config/`)
      .then((res) => res.data)
      .catch((err) => {
        // let the next caller try again instead of caching the failure
        siteConfigRequest = null;
        throw err;
      });
  }
  return siteConfigRequest;
};

// WhatsApp chat link for the number set in the admin; "" until it is known
// (or when no number is configured)
export function useWhatsappUrl(message = "Hi Village Mitai, I need a help.") {
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    let active = true;
    fetchSiteConfig()
      .then((data) => {
        if (active) setWhatsappNumber(data.whatsapp_number || "");
      })
      .catch((err) => console.log(err));
    return () => {
      active = false;
    };
  }, []);

  return whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";
}
