(() => {
  if (!window.location.host.endsWith(".roblox.com")) {
    return;
  }

  function getNormalizedRobloxPath(pathname) {
    if (typeof pathname !== "string") {
      return "";
    }
    if (!pathname.startsWith("/")) {
      pathname = "/" + pathname;
    }
    var pathSegments = pathname.split("/");
    if (pathSegments.length > 2) {
      try {
        if (Intl.getCanonicalLocales(pathSegments[1]).length > 0) {
          return "/" + pathSegments.slice(2).join("/");
        }
      } catch (_) {}
    }
    return pathname;
  }

  if (!getNormalizedRobloxPath(window.location.pathname).startsWith("/board")) {
    return;
  }

  var prehideStyleId = "ropro-trade-offers-404-prehide-style";
  if (document.getElementById(prehideStyleId) == null) {
    var prehideStyle = document.createElement("style");
    prehideStyle.id = prehideStyleId;
    prehideStyle.textContent =
      ".request-error-page-content,.default-error-page{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}";
    (document.head || document.documentElement).appendChild(prehideStyle);
  }
})();
