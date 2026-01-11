import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
      prevPath.current = pathname;
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
