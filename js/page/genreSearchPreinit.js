(() => {
  if (!window.location.host.endsWith(".roblox.com")) {
    return;
  }

  function getNormalizedRobloxPath(pathname) {
    if (typeof pathname != "string") {
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

  if (!getNormalizedRobloxPath(window.location.pathname).startsWith("/genre-search")) {
    return;
  }

  var styleId = "ropro-genre-search-404-prehide-style";
  if (document.getElementById(styleId) != null) {
    return;
  }

  var style = document.createElement("style");
  style.id = styleId;
  style.textContent =
    ".request-error-page-content,.default-error-page{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}";
  (document.head || document.documentElement).appendChild(style);

  setTimeout(function () {
    var prehideStyle = document.getElementById(styleId);
    if (prehideStyle != null) {
      prehideStyle.remove();
    }
  }, 8000);
})();
