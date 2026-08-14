(function (globalScope) {
  if (globalScope.roproApiAdapter) {
    return;
  }

  var API_BASE_URL = "https://api.ropro.io";
  var STAGING_BASE_URL = "https://ropro.io";

  var TRUSTED_URL_HOSTS = Object.freeze({
    upgrade: Object.freeze({
      exactHosts: Object.freeze([
        "ropro.io",
        "www.ropro.io",
      ]),
      suffixHosts: Object.freeze([".ropro.io"]),
      allowedPathPrefixes: Object.freeze(["/", "/upgrade", "/render", "/terms", "/terms/", "/dances/", "/render/"]),
    }),
    robloxProfile: Object.freeze({
      exactHosts: Object.freeze(["roblox.com", "www.roblox.com"]),
      suffixHosts: Object.freeze([".roblox.com"]),
      allowedPathPrefixes: Object.freeze(["/users/"]),
    }),
    robloxGame: Object.freeze({
      exactHosts: Object.freeze(["roblox.com", "www.roblox.com"]),
      suffixHosts: Object.freeze([".roblox.com"]),
      allowedPathPrefixes: Object.freeze(["/games/"]),
    }),
    themeFrame: Object.freeze({
      exactHosts: Object.freeze([
        "api.ropro.io",
        "ropro.io",
        "www.ropro.io",
        "cdn.ropro.io",
        "node.ropro.io",
      ]),
      suffixHosts: Object.freeze([".ropro.io"]),
      allowedPathPrefixes: Object.freeze([
        "/itemGraph.php",
        "/themeFrame.php",
        "/themeFrameVideo.php",
      ]),
    }),
    image: Object.freeze({
      exactHosts: Object.freeze([
        "cdn.ropro.io",
        "node.ropro.io",
        "assetdelivery.roblox.com",
      ]),
      suffixHosts: Object.freeze([".ropro.io", ".roblox.com", ".rbxcdn.com"]),
      allowedPathPrefixes: Object.freeze([
        "/",
        "/v1/asset",
        "/v1/asset-delivery/",
        "/v1/asset-thumbnail/",
      ]),
    }),
  });

  var URL_SECURITY_SCHEME_ALLOWLIST = Object.freeze(["https:"]);
  var URL_SECURITY_EVENT_LIMIT = 64;
  var URL_SECURITY_MAX_LENGTH = 2048;
  var URL_SECURITY_SCHEME_BLOCKLIST = Object.freeze([
    "javascript",
    "data",
    "vbscript",
    "file",
    "chrome",
    "chrome-extension",
    "safari-web-extension",
    "moz-extension",
    "moz",
    "app",
  ]);
  var urlSecurityProbeLog = [];

  function normalizeRawUrl(value) {
    if (typeof value !== "string") {
      return null;
    }
    var normalized = value.trim().slice(0, URL_SECURITY_MAX_LENGTH);
    if (normalized.length === 0) {
      return "";
    }
    return normalized;
  }

  function stripUrlControlChars(value) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  }

  function resolveUrlPolicy(policy) {
    if (policy == null) {
      return TRUSTED_URL_HOSTS.upgrade;
    }
    if (typeof policy === "string") {
      return TRUSTED_URL_HOSTS[policy];
    }
    return policy;
  }

  function isLikelySchemeEncoded(rawUrl) {
    var decoded = rawUrl;
    for (var i = 0; i < 3; i++) {
      try {
        var nextDecoded = decodeURIComponent(decoded);
        if (nextDecoded === decoded) {
          break;
        }
        decoded = nextDecoded;
      } catch (e) {
        break;
      }
    }
    return decoded;
  }

  function getPolicyName(policy) {
    if (policy == null) {
      return "unknown";
    }
    if (policy.policyName != null) {
      return policy.policyName;
    }
    for (var policyKey in TRUSTED_URL_HOSTS) {
      if (TRUSTED_URL_HOSTS[policyKey] === policy) {
        return policyKey;
      }
    }
    return "custom";
  }

  function recordUrlSecurityEvent(status, rawUrl, policy, reason, parsedUrl) {
    urlSecurityProbeLog.push({
      status: status,
      reason: reason,
      policy: getPolicyName(policy),
      host: parsedUrl == null ? null : parsedUrl.hostname,
      path: parsedUrl == null ? null : parsedUrl.pathname,
      url: rawUrl,
      timestamp: Date.now(),
    });
    if (urlSecurityProbeLog.length > URL_SECURITY_EVENT_LIMIT) {
      urlSecurityProbeLog.shift();
    }
  }

  function hasBlockedUrlScheme(rawUrl, parsedProtocol) {
    var normalizedProtocol =
      typeof parsedProtocol === "string" ? parsedProtocol.toLowerCase() : "";
    if (URL_SECURITY_SCHEME_ALLOWLIST.indexOf(normalizedProtocol) === -1) {
      return true;
    }
    var normalizedUrl = String(rawUrl == null ? "" : rawUrl).trim().toLowerCase();
    var normalizedUrlControlFree = stripUrlControlChars(normalizedUrl);
    var decodedUrl = isLikelySchemeEncoded(normalizedUrlControlFree);
    var checkedUrls = [normalizedUrlControlFree, decodedUrl];
    for (var i = 0; i < URL_SECURITY_SCHEME_BLOCKLIST.length; i++) {
      var blockedScheme = URL_SECURITY_SCHEME_BLOCKLIST[i];
      var blockedPrefix = blockedScheme + ":";
      var blockedBypass = blockedScheme + "-";
      for (var j = 0; j < checkedUrls.length; j++) {
        var candidate = stripUrlControlChars(checkedUrls[j]).trim();
        if (candidate.indexOf(blockedPrefix) === 0) {
          return true;
        }
        if (candidate.indexOf(blockedBypass) === 0) {
          return true;
        }
        if (candidate.indexOf(blockedPrefix + "%") === 0) {
          return true;
        }
        if (candidate.indexOf(blockedBypass + "%") === 0) {
          return true;
        }
      }
    }
    return false;
  }

  function isAllowedPath(pathname, policy) {
    var normalizedPath = pathname == null ? "/" : String(pathname);
    if (normalizedPath.length === 0) {
      normalizedPath = "/";
    }
    var allowedPrefixes =
      policy == null || !Array.isArray(policy.allowedPathPrefixes)
        ? Object.freeze(["/"])
        : policy.allowedPathPrefixes;
    for (var i = 0; i < allowedPrefixes.length; i++) {
      var prefix = allowedPrefixes[i];
      if (prefix === "/" || normalizedPath === prefix || normalizedPath.indexOf(prefix) === 0) {
        return true;
      }
    }
    return false;
  }

  function getUrlSecurityProbeState() {
    return {
      total: urlSecurityProbeLog.length,
      events: urlSecurityProbeLog.slice(),
    };
  }

  function resetUrlSecurityProbeState() {
    urlSecurityProbeLog = [];
    return true;
  }

  function isAllowedHostname(hostname, policy) {
    if (typeof hostname != "string") {
      return false;
    }
    var normalizedHostname = hostname.toLowerCase();
    var exactHosts = policy == null || policy.exactHosts == null ? [] : policy.exactHosts;
    for (var i = 0; i < exactHosts.length; i++) {
      if (normalizedHostname === exactHosts[i]) {
        return true;
      }
    }

    var suffixHosts = policy == null || policy.suffixHosts == null ? [] : policy.suffixHosts;
    for (var i = 0; i < suffixHosts.length; i++) {
      var suffix = suffixHosts[i];
      if (normalizedHostname === suffix.replace(/^\./, "") || normalizedHostname.indexOf(suffix) === normalizedHostname.length - suffix.length) {
        return true;
      }
    }

    return false;
  }

  function parseUrlWithoutNativeUrl(rawUrl) {
    var normalized = String(rawUrl == null ? "" : rawUrl).trim();
    if (normalized.length === 0) {
      return null;
    }
    var protocolRelative = normalized.indexOf("//") === 0;
    if (protocolRelative) {
      normalized = "https:" + normalized;
    }
    var absoluteMatch = normalized.match(/^https:\/\/([^\/?#]+)(\/[^?#]*)?(?:[?#].*)?$/i);
    if (absoluteMatch != null) {
      var absoluteHost = absoluteMatch[1].toLowerCase().split(":")[0];
      if (absoluteHost.length === 0) {
        return null;
      }
      return {
        protocol: "https:",
        hostname: absoluteHost,
        pathname: typeof absoluteMatch[2] === "string" && absoluteMatch[2].length > 0 ? absoluteMatch[2] : "/",
        href: normalized,
      };
    }
    if (normalized.indexOf("/") === 0) {
      var locationHref = "";
      if (
        typeof window !== "undefined" &&
        window.location != null &&
        typeof window.location.href === "string"
      ) {
        locationHref = window.location.href;
      }
      var locationMatch = locationHref.match(/^https:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
      if (locationMatch == null) {
        return null;
      }
      var relativeHost = locationMatch[1].toLowerCase().split(":")[0];
      if (relativeHost.length === 0) {
        return null;
      }
      return {
        protocol: "https:",
        hostname: relativeHost,
        pathname: normalized,
        href: "https://" + relativeHost + normalized,
      };
    }
    return null;
  }

  function getSafeUrl(rawUrl, policy) {
    var normalizedPolicy = resolveUrlPolicy(policy);
    var normalizedUrl = normalizeRawUrl(rawUrl);
    if (normalizedUrl == null) {
      recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "invalid_input");
      return null;
    }
    if (normalizedUrl.length === 0) {
      recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "invalid_input");
      return null;
    }
    try {
      var parsedUrl;
      var UrlConstructor =
        typeof URL === "function"
          ? URL
          : typeof window !== "undefined" && typeof window.URL === "function"
          ? window.URL
          : null;
      if (UrlConstructor != null) {
        var baseHref =
          typeof window !== "undefined" &&
          window.location != null &&
          typeof window.location.href === "string"
            ? window.location.href
            : "https://ropro.io/";
        parsedUrl = new UrlConstructor(normalizedUrl, baseHref);
      } else {
        parsedUrl = parseUrlWithoutNativeUrl(normalizedUrl);
      }
      if (parsedUrl == null) {
        recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "invalid_url");
        return null;
      }
      if (hasBlockedUrlScheme(normalizedUrl, parsedUrl.protocol)) {
        recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "blocked_scheme", parsedUrl);
        return null;
      }
      if (!isAllowedPath(parsedUrl.pathname, normalizedPolicy)) {
        recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "blocked_path", parsedUrl);
        return null;
      }
      if (!isAllowedHostname(parsedUrl.hostname, normalizedPolicy)) {
        recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "blocked_host", parsedUrl);
        return null;
      }
      recordUrlSecurityEvent("allow", rawUrl, normalizedPolicy, "allowed", parsedUrl);
      return parsedUrl.href;
    } catch (e) {
      recordUrlSecurityEvent("reject", rawUrl, normalizedPolicy, "invalid_url");
      return null;
    }
  }

  function getSafeUpgradeUrl(rawUrl) {
    return getSafeUrl(rawUrl, TRUSTED_URL_HOSTS.upgrade);
  }

  function getSafeRobloxProfileUrl(rawUrl) {
    return getSafeUrl(rawUrl, TRUSTED_URL_HOSTS.robloxProfile);
  }

  function getSafeRobloxGameUrl(rawUrl) {
    return getSafeUrl(rawUrl, TRUSTED_URL_HOSTS.robloxGame);
  }

  function getSafeThemeFrameUrl(rawUrl) {
    return getSafeUrl(rawUrl, TRUSTED_URL_HOSTS.themeFrame);
  }

  function getSafeImageUrl(rawUrl) {
    return getSafeUrl(rawUrl, TRUSTED_URL_HOSTS.image);
  }

  function openSafeUrl(rawUrl, target, features, policyKey) {
    var safeUrl = rawUrl == null ? null : getSafeUrl(rawUrl, policyKey || "upgrade");
    if (safeUrl == null) {
      return false;
    }
    window.open(safeUrl, target || "_blank", features || "noopener,noreferrer");
    return true;
  }

  function sanitizeQueryValue(value) {
    if (value == null) {
      return "";
    }
    return String(value);
  }

  function buildQuery(query) {
    if (query == null || typeof query !== "object") {
      return "";
    }
    var entries = [];
    var keys = Object.keys(query);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = query[key];
      if (value == null) {
        continue;
      }
      if (Array.isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          entries.push(
            encodeURIComponent(key) + "=" + encodeURIComponent(sanitizeQueryValue(value[j]))
          );
        }
      } else {
        entries.push(
          encodeURIComponent(key) + "=" + encodeURIComponent(sanitizeQueryValue(value))
        );
      }
    }
    return entries.join("&");
  }

  function buildApiUrl(path, query) {
    var normalizedPath = String(path || "").replace(/^\/+/, "");
    var queryString = buildQuery(query);
    if (queryString.length > 0) {
      return API_BASE_URL + "/" + normalizedPath + "?" + queryString;
    }
    return API_BASE_URL + "/" + normalizedPath;
  }

  function buildStagingUrl(path, query) {
    var normalizedPath = String(path || "").replace(/^\/+/, "");
    var queryString = buildQuery(query);
    if (queryString.length > 0) {
      return STAGING_BASE_URL + "/" + normalizedPath + "?" + queryString;
    }
    return STAGING_BASE_URL + "/" + normalizedPath;
  }

  function request(operation, payload, callback) {
    chrome.runtime.sendMessage(
      {
        greeting: "RoProApiRequest",
        operation: String(operation || ""),
        payload: payload == null ? {} : payload,
      },
      function (response) {
        if (typeof callback === "function") {
          callback(response);
        }
      }
    );
  }

  function requestPromise(operation, payload) {
    return new Promise(function (resolve) {
      request(operation, payload, function (response) {
        resolve(response);
      });
    });
  }

  function getSetting(setting) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(
        {
          greeting: "GetSetting",
          setting: setting,
        },
        function (data) {
          resolve(data);
        }
      );
    });
  }

  function getStorage(key) {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(key, function (obj) {
        resolve(obj[key]);
      });
    });
  }

  function setStorage(key, value) {
    return new Promise(function (resolve) {
      chrome.storage.sync.set(
        {
          [key]: value,
        },
        function () {
          resolve();
        }
      );
    });
  }

  function getLocalStorage(key) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(key, function (obj) {
        resolve(obj[key]);
      });
    });
  }

  function setLocalStorage(key, value) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(
        {
          [key]: value,
        },
        function () {
          resolve();
        }
      );
    });
  }

  function checkVerification() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(
        {
          greeting: "CheckVerification",
        },
        function (data) {
          if (chrome.runtime.lastError) {
            console.error(
              "CheckVerification failed:",
              chrome.runtime.lastError.message
            );
            resolve(false);
            return;
          }
          resolve(data);
        }
      );
    });
  }

  function verifyPath(matches) {
    if (
      typeof window === "undefined" ||
      window.location == null ||
      typeof window.location.host !== "string" ||
      !window.location.host.endsWith(".roblox.com")
    ) {
      return false;
    }
    var normalizedMatches = Array.isArray(matches) ? matches : [];
    var path = String(window.location.pathname || "");
    for (var i = 0; i < normalizedMatches.length; i++) {
      var match = String(normalizedMatches[i] == null ? "" : normalizedMatches[i]);
      var matchRegex = new RegExp("^" + match.replace(/\*/g, ".*") + "$");
      var pathMatch = path.match(matchRegex);
      if (pathMatch != null && pathMatch.index === 0) {
        return true;
      }
      var pathSplit = path.split("/");
      if (pathSplit.length < 2) {
        continue;
      }
      try {
        if (Intl.getCanonicalLocales(pathSplit[1]).length > 0) {
          var localeSubpath = "/" + pathSplit.slice(2).join("/");
          pathMatch = localeSubpath.match(matchRegex);
          if (pathMatch != null && pathMatch.index === 0) {
            return true;
          }
        }
      } catch (_) {
        continue;
      }
    }
    return false;
  }

  function addCommas(nStr) {
    var normalized = String(nStr == null ? "" : nStr);
    var parts = normalized.split(".");
    var left = parts[0];
    var right = parts.length > 1 ? "." + parts[1] : "";
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(left)) {
      left = left.replace(rgx, "$1" + "," + "$2");
    }
    return left + right;
  }

  function stripTags(value) {
    if (typeof value === "undefined") {
      return value;
    }
    return String(value)
      .replace(/(<([^>]+)>)/gi, "")
      .replace(/</g, "")
      .replace(/>/g, "")
      .replace(/'/g, "")
      .replace(/"/g, "")
      .replace(/`/g, "");
  }

  function getVisualGate(gateKey, callback) {
    chrome.runtime.sendMessage(
      {
        greeting: "GetVisualGate",
        gateKey: String(gateKey == null ? "" : gateKey),
      },
      function (response) {
        if (typeof callback === "function") {
          callback(response);
        }
      }
    );
  }

  function normalizeVisualGateReason(reason) {
    return String(reason == null ? "" : reason).trim().toLowerCase();
  }

  function shouldRetryVisualGate(response) {
    return (
      response != null &&
      typeof response === "object" &&
      response.allowed !== true &&
      normalizeVisualGateReason(response.reason) === "subscription_unknown"
    );
  }

  function getVisualGatePromise(gateKey) {
    return new Promise(function (resolve) {
      getVisualGate(gateKey, function (response) {
        if (shouldRetryVisualGate(response)) {
          setTimeout(function () {
            getVisualGate(gateKey, function (retryResponse) {
              resolve(
                retryResponse != null && typeof retryResponse === "object"
                  ? retryResponse
                  : response
              );
            });
          }, 2000);
          return;
        }
        resolve(response);
      });
    });
  }

  function getVisualGates(gateKeys, callback) {
    var keys = Array.isArray(gateKeys) ? gateKeys : [];
    chrome.runtime.sendMessage(
      {
        greeting: "GetVisualGates",
        gates: keys,
      },
      function (response) {
        if (typeof callback === "function") {
          callback(response);
        }
      }
    );
  }

  function getVisualGatesPromise(gateKeys) {
    return new Promise(function (resolve) {
      getVisualGates(gateKeys, function (response) {
        var needsRetry = false;
        if (response != null && typeof response === "object") {
          var keys = Object.keys(response);
          for (var i = 0; i < keys.length; i++) {
            if (shouldRetryVisualGate(response[keys[i]])) {
              needsRetry = true;
              break;
            }
          }
        }
        if (needsRetry) {
          setTimeout(function () {
            getVisualGates(gateKeys, function (retryResponse) {
              resolve(
                retryResponse != null && typeof retryResponse === "object"
                  ? retryResponse
                  : response
              );
            });
          }, 2000);
          return;
        }
        resolve(response);
      });
    });
  }

  var SUBSCRIPTION_TIER_ALIASES = Object.freeze({
    free: "free_tier",
    free_tier: "free_tier",
    plus: "standard_tier",
    standard: "standard_tier",
    standard_tier: "standard_tier",
    rex: "pro_tier",
    pro: "pro_tier",
    pro_tier: "pro_tier",
    ultra: "pro_tier",
    ultra_tier: "pro_tier",
  });

  var SUBSCRIPTION_TIER_RANKS = Object.freeze({
    free_tier: 0,
    standard_tier: 1,
    pro_tier: 2,
  });

  function isVisualGateAllowed(gateInfo) {
    return gateInfo != null && typeof gateInfo === "object" && gateInfo.allowed === true;
  }

  function normalizeSubscriptionTier(tierName) {
    var normalized = String(tierName == null ? "" : tierName).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(SUBSCRIPTION_TIER_ALIASES, normalized)) {
      return SUBSCRIPTION_TIER_ALIASES[normalized];
    }
    return "unknown";
  }

  function getSubscriptionTierRank(tierName) {
    var normalizedTier = normalizeSubscriptionTier(tierName);
    if (Object.prototype.hasOwnProperty.call(SUBSCRIPTION_TIER_RANKS, normalizedTier)) {
      return SUBSCRIPTION_TIER_RANKS[normalizedTier];
    }
    return -1;
  }

  function getVisualGateTierRank(tierName) {
    return getSubscriptionTierRank(tierName);
  }

  function isVisualGateTierAllowed(gateInfo) {
    if (gateInfo == null || typeof gateInfo !== "object") {
      return false;
    }
    var currentTierRank = getVisualGateTierRank(gateInfo.currentTier);
    var requiredTierRank = getVisualGateTierRank(gateInfo.requiredTier);
    if (currentTierRank < 0 || requiredTierRank < 0) {
      return false;
    }
    return currentTierRank >= requiredTierRank;
  }

  function isVisualGateUpsellEligible(gateInfo) {
    if (gateInfo == null || typeof gateInfo !== "object" || gateInfo.allowed === true) {
      return false;
    }
    if (gateInfo.blockedByRobloxPremium === true) {
      return false;
    }
    var reason = String(gateInfo.reason == null ? "" : gateInfo.reason).trim().toLowerCase();
    if (reason === "tier") {
      return true;
    }
    if (reason === "setting_off") {
      return !isVisualGateTierAllowed(gateInfo);
    }
    if (
      reason === "subscription_unknown" ||
      reason === "disabled_feature" ||
      reason === "policy" ||
      reason === "blocked" ||
      reason === "unknown_gate"
    ) {
      return false;
    }
    if (reason.length === 0 || reason === "unknown") {
      return !isVisualGateTierAllowed(gateInfo);
    }
    return false;
  }

  function normalizeUpgradeTier(tierName) {
    if (normalizeSubscriptionTier(tierName) === "pro_tier") {
      return "rex";
    }
    return "plus";
  }

  function resolveVisualGateUpgradeTier(gateInfo, fallbackTier) {
    if (gateInfo != null && typeof gateInfo === "object" && typeof gateInfo.upgradeTier === "string") {
      var upgradeTier = String(gateInfo.upgradeTier).trim().toLowerCase();
      if (upgradeTier === "plus" || upgradeTier === "rex") {
        return upgradeTier;
      }
    }
    return normalizeUpgradeTier(fallbackTier);
  }

  function applyVisualGateLockedState(targetNode, gateInfo, options) {
    if (!(targetNode instanceof HTMLElement)) {
      return;
    }
    var opts = options || {};
    var lockClass = typeof opts.lockClass === "string" && opts.lockClass.length > 0
      ? opts.lockClass
      : "ropro-gate-locked";
    var lockTitle = typeof opts.lockTitle === "string" ? opts.lockTitle : "";
    var locked = !isVisualGateAllowed(gateInfo);
    targetNode.classList.toggle(lockClass, locked);
    if (locked) {
      targetNode.setAttribute("aria-disabled", "true");
      if (lockTitle.length > 0) {
        targetNode.setAttribute("title", lockTitle);
      }
      return;
    }
    targetNode.removeAttribute("aria-disabled");
    targetNode.removeAttribute("title");
  }

  function openUpgradeModalForVisualGate(gateInfo, options) {
    if (!isVisualGateUpsellEligible(gateInfo)) {
      return null;
    }
    if (
      typeof window === "undefined" ||
      window.RoProUpgradeModal == null ||
      typeof window.RoProUpgradeModal.open !== "function"
    ) {
      return null;
    }
    var opts = options || {};
    var tier = resolveVisualGateUpgradeTier(gateInfo, opts.fallbackTier);
    var config = Object.assign({}, opts, {
      tier: tier,
    });
    if (typeof config.title !== "string" || config.title.length === 0) {
      config.title = tier === "rex" ? "RoPro Rex Feature" : "RoPro Plus Feature";
    }
    if (typeof config.ctaLabel !== "string" || config.ctaLabel.length === 0) {
      config.ctaLabel = tier === "rex" ? "Upgrade to Rex" : "Upgrade to Plus";
    }
    delete config.fallbackTier;
    return window.RoProUpgradeModal.open(config);
  }

  var roproVisualGateIssueNoticeTimers = {};

  function getVisualGateIssueMessage(gateInfo, options) {
    var opts = options == null || typeof options !== "object" ? {} : options;
    var reason = normalizeVisualGateReason(
      gateInfo != null && typeof gateInfo === "object" ? gateInfo.reason : null
    );
    var contextLabel =
      typeof opts.contextLabel === "string" && opts.contextLabel.trim().length > 0
        ? opts.contextLabel.trim()
        : "";
    var prefix = contextLabel.length > 0 ? contextLabel + ": " : "";
    if (reason === "subscription_unknown") {
      return (
        prefix +
        "RoPro could not verify your subscription right now. Please try again in a few seconds."
      );
    }
    if (reason === "disabled_feature") {
      return prefix + "This feature is temporarily unavailable.";
    }
    if (reason === "policy" || reason === "blocked") {
      return prefix + "This feature is currently unavailable for your account.";
    }
    return "";
  }

  function getVisualGateIssueNoticeHost() {
    if (typeof document === "undefined" || document.body == null) {
      return null;
    }
    var host = document.getElementById("ropro-visual-gate-notice-host");
    if (host != null) {
      return host;
    }
    host = document.createElement("div");
    host.id = "ropro-visual-gate-notice-host";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");
    host.style.position = "fixed";
    host.style.top = "18px";
    host.style.right = "18px";
    host.style.zIndex = "2147483647";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.gap = "8px";
    host.style.maxWidth = "min(420px, calc(100vw - 24px))";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);
    return host;
  }

  function notifyVisualGateIssue(gateInfo, options) {
    var opts = options == null || typeof options !== "object" ? {} : options;
    var noticeMessage =
      typeof opts.message === "string" && opts.message.trim().length > 0
        ? opts.message.trim()
        : getVisualGateIssueMessage(gateInfo, opts);
    if (noticeMessage.length === 0) {
      return null;
    }
    var host = getVisualGateIssueNoticeHost();
    if (host == null) {
      return null;
    }
    var reason = normalizeVisualGateReason(
      gateInfo != null && typeof gateInfo === "object" ? gateInfo.reason : null
    );
    var contextKey =
      typeof opts.contextKey === "string" && opts.contextKey.trim().length > 0
        ? opts.contextKey.trim()
        : "default";
    var dedupeKey = contextKey + ":" + reason;
    var noticeId = "ropro-visual-gate-issue-" + dedupeKey.replace(/[^A-Za-z0-9_-]/g, "_");
    var existingNotice = document.getElementById(noticeId);
    var notice = existingNotice != null ? existingNotice : document.createElement("div");
    notice.id = noticeId;
    notice.textContent = noticeMessage;
    notice.style.pointerEvents = "none";
    notice.style.background = "rgba(17, 22, 34, 0.96)";
    notice.style.color = "#ffffff";
    notice.style.borderRadius = "8px";
    notice.style.border = "1px solid rgba(255, 255, 255, 0.22)";
    notice.style.padding = "10px 12px";
    notice.style.fontSize = "13px";
    notice.style.lineHeight = "1.35";
    notice.style.fontWeight = "600";
    notice.style.letterSpacing = "0.1px";
    notice.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.35)";
    notice.style.maxWidth = "100%";
    notice.style.wordBreak = "break-word";
    notice.style.opacity = "1";
    notice.style.transform = "translateY(0)";
    notice.style.transition = "opacity 180ms ease, transform 180ms ease";
    if (existingNotice == null) {
      host.appendChild(notice);
    }
    if (Object.prototype.hasOwnProperty.call(roproVisualGateIssueNoticeTimers, dedupeKey)) {
      clearTimeout(roproVisualGateIssueNoticeTimers[dedupeKey]);
    }
    var lifetimeMs =
      Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 4500;
    roproVisualGateIssueNoticeTimers[dedupeKey] = setTimeout(function () {
      notice.style.opacity = "0";
      notice.style.transform = "translateY(-4px)";
      setTimeout(function () {
        if (notice.parentNode != null) {
          notice.parentNode.removeChild(notice);
        }
      }, 200);
      delete roproVisualGateIssueNoticeTimers[dedupeKey];
    }, lifetimeMs);
    return notice;
  }

  function buildThemeFrameUrl(themeName, options) {
    var opts = options || {};
    var query = {
      theme: themeName,
    };
    if (opts.hardCache) {
      query["hard-cache"] = "";
    }
    if (opts.h != null) {
      query.h = opts.h;
    }
    if (opts.s != null) {
      query.s = opts.s;
    }
    if (opts.l != null) {
      query.l = opts.l;
    }
    if (opts.video) {
      return buildApiUrl("themeFrameVideo.php", query);
    }
    return buildApiUrl("themeFrame.php", query);
  }

  var BRANDED_LOADER_STYLE_ID = "ropro-branded-loader-style";

  function ensureBrandedLoaderStyles() {
    if (typeof document === "undefined") {
      return;
    }
    if (document.getElementById(BRANDED_LOADER_STYLE_ID) != null) {
      return;
    }
    var style = document.createElement("style");
    style.id = BRANDED_LOADER_STYLE_ID;
    style.textContent = `
.ropro-branded-loader {
  width: 100%;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.ropro-branded-loader-ring {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 0;
  background-color: #3b3e44;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
  position: relative;
}

.ropro-branded-loader-spin {
  width: 19px;
  height: 19px;
  display: block;
  filter: brightness(0) invert(1);
  animation: ropro-branded-loader-spin 0.8s linear infinite;
}

.ropro-branded-loader-logo {
  width: 12px;
  height: 12px;
  object-fit: contain;
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  box-shadow: 0 0 0 2px #3b3e44;
}

.ropro-branded-loader-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.15;
  opacity: 0.84;
  color: inherit;
}

.ropro-branded-loader-centered-section {
  width: 100%;
  min-height: 180px;
  margin: 0 auto;
}

.ropro-branded-loader-compact-section {
  width: 100%;
  min-height: 120px;
  margin: 0 auto;
}

.ropro-branded-loader-fill {
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
}

.light-theme .ropro-branded-loader-ring {
  background-color: #4a4f57;
}

.light-theme .ropro-branded-loader-logo {
  box-shadow: 0 0 0 2px #4a4f57;
}

@keyframes ropro-branded-loader-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ropro-branded-loader-spin {
    animation: none;
  }
}
`;
    var styleParent = document.head || document.documentElement;
    if (styleParent != null) {
      styleParent.appendChild(style);
    }
  }

  function escapeHtmlAttribute(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function sanitizeLoaderId(value) {
    var normalized = String(value == null ? "" : value).trim();
    if (!/^[A-Za-z][A-Za-z0-9_:.-]*$/.test(normalized)) {
      return "";
    }
    return normalized;
  }

  function sanitizeLoaderClasses(value) {
    if (typeof value !== "string") {
      return [];
    }
    var tokens = value.trim().split(/\s+/);
    var cleaned = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!/^[A-Za-z0-9_-]+$/.test(token)) {
        continue;
      }
      if (cleaned.indexOf(token) !== -1) {
        continue;
      }
      cleaned.push(token);
    }
    return cleaned;
  }

  function buildBrandedLoaderHtml(options) {
    ensureBrandedLoaderStyles();
    var opts = options == null || typeof options !== "object" ? {} : options;
    var classNames = ["ropro-branded-loader"];
    var extraClasses = sanitizeLoaderClasses(opts.className);
    for (var i = 0; i < extraClasses.length; i++) {
      if (classNames.indexOf(extraClasses[i]) === -1) {
        classNames.push(extraClasses[i]);
      }
    }
    var attrs = ['class="' + classNames.join(" ") + '"', 'role="status"', 'aria-live="polite"'];
    var loaderId = sanitizeLoaderId(opts.id);
    if (loaderId.length > 0) {
      attrs.push('id="' + escapeHtmlAttribute(loaderId) + '"');
    }
    if (typeof opts.style === "string" && opts.style.trim().length > 0) {
      attrs.push('style="' + escapeHtmlAttribute(opts.style.trim()) + '"');
    }
    return `<div ${attrs.join(" ")}><div class="ropro-branded-loader-ring"><img class="ropro-branded-loader-spin" src="${chrome.runtime.getURL('/images/reload.png')}" alt="" aria-hidden="true"><img class="ropro-branded-loader-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="" aria-hidden="true"></div><span class="ropro-branded-loader-label">Loading...</span></div>`;
  }

  var roproApiAdapter = {
    API_BASE_URL: API_BASE_URL,
    STAGING_BASE_URL: STAGING_BASE_URL,
    buildApiUrl: buildApiUrl,
    buildStagingUrl: buildStagingUrl,
    buildThemeFrameUrl: buildThemeFrameUrl,
    ensureBrandedLoaderStyles: ensureBrandedLoaderStyles,
    buildBrandedLoaderHtml: buildBrandedLoaderHtml,
    buildItemGraphUrl: function () {
      return buildApiUrl("itemGraph.php");
    },
    buildAssetThumbnailUrl: function (assetId) {
      return buildApiUrl("getAssetThumbnail.php", { id: assetId });
    },
    getSafeUpgradeUrl: getSafeUpgradeUrl,
    getSafeRobloxProfileUrl: getSafeRobloxProfileUrl,
    getSafeRobloxGameUrl: getSafeRobloxGameUrl,
    getSafeThemeFrameUrl: getSafeThemeFrameUrl,
    getSafeImageUrl: getSafeImageUrl,
    getUrlSecurityProbeState: getUrlSecurityProbeState,
    resetUrlSecurityProbeState: resetUrlSecurityProbeState,
    openSafeUrl: openSafeUrl,
    request: request,
    requestPromise: requestPromise,
    getSetting: getSetting,
    getStorage: getStorage,
    setStorage: setStorage,
    getLocalStorage: getLocalStorage,
    setLocalStorage: setLocalStorage,
    checkVerification: checkVerification,
    verifyPath: verifyPath,
    addCommas: addCommas,
    stripTags: stripTags,
    getVisualGate: getVisualGate,
    getVisualGatePromise: getVisualGatePromise,
    getVisualGates: getVisualGates,
    getVisualGatesPromise: getVisualGatesPromise,
    normalizeSubscriptionTier: normalizeSubscriptionTier,
    getSubscriptionTierRank: getSubscriptionTierRank,
    isVisualGateAllowed: isVisualGateAllowed,
    isVisualGateTierAllowed: isVisualGateTierAllowed,
    isVisualGateUpsellEligible: isVisualGateUpsellEligible,
    normalizeVisualGateReason: normalizeVisualGateReason,
    normalizeUpgradeTier: normalizeUpgradeTier,
    resolveVisualGateUpgradeTier: resolveVisualGateUpgradeTier,
    applyVisualGateLockedState: applyVisualGateLockedState,
    openUpgradeModalForVisualGate: openUpgradeModalForVisualGate,
    getVisualGateIssueMessage: getVisualGateIssueMessage,
    notifyVisualGateIssue: notifyVisualGateIssue,
  };

  Object.freeze(roproApiAdapter);
  globalScope.roproApiAdapter = roproApiAdapter;
})(typeof window !== "undefined" ? window : self);
