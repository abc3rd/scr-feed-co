import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const TABS = ["/", "/orders", "/profile", "/seo"];

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const scrollMap = useRef({});
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    if (prevPath.current !== pathname) {
      scrollMap.current[prevPath.current] = window.scrollY;
    }

    if (TABS.includes(pathname) && scrollMap.current[pathname] != null) {
      window.scrollTo({ top: scrollMap.current[pathname], left: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    prevPath.current = pathname;
  }, [pathname, hash, navigationType]);

  return null;
}