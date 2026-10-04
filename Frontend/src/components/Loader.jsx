import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPending, subscribePending } from "../utils/loading";
import "../styles/Loader.css";

const MIN_VISIBLE_MS = 350; // avoids a flicker on fast screens
const SETTLE_MS = 150; // lets the new screen start its requests
const MAX_VISIBLE_MS = 10000; // never block the screen forever

// Small bouncing laddu shown on first load and on every screen change; a near-clear
// layer behind it blocks clicks while the screen is loading. It stays
// until the new screen's API calls have finished. Requests made later on the
// same screen (add to cart, apply coupon...) do not bring it back.
export default function RouteLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const started = Date.now();
    let timer;

    const check = () => {
      clearTimeout(timer);
      if (getPending() > 0) return;
      const wait = Math.max(MIN_VISIBLE_MS - (Date.now() - started), SETTLE_MS);
      timer = setTimeout(() => {
        if (getPending() === 0) setVisible(false);
      }, wait);
    };

    const unsubscribe = subscribePending(check);
    check();
    const maxTimer = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
      clearTimeout(maxTimer);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div className="route-loader" role="status" aria-label="Loading">
      <div className="route-loader-box">
        <div className="laddu-loader">
          <div className="laddu"></div>
          <div className="laddu-shadow"></div>
        </div>
      </div>
    </div>
  );
}
