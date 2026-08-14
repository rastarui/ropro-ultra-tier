var url_matches = ["/board*"];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
  return roproApiAdapter.buildBrandedLoaderHtml(options);
}

if (!verifyPath(url_matches)) throw new Error("RoPro Error: Invalid path!");

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

function isTradeOffersPath() {
  return getNormalizedRobloxPath(window.location.pathname).startsWith("/board");
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function fetchVisualGates(gates) {
  if (
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.getVisualGatesPromise === "function"
  ) {
    return roproApiAdapter.getVisualGatesPromise(gates);
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ greeting: "GetVisualGates", gates: gates }, function (data) {
      resolve(data);
    });
  });
}

function fetchUserId() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ greeting: "GetUserID" }, function (data) {
      resolve(data);
    });
  });
}

function fetchTradableInventory(userId, prewarm = false) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { greeting: "GetUserTradableInventory", userID: userId, prewarm: prewarm === true },
      function (data) {
        resolve(data);
      }
    );
  });
}

function fetchTradeOfferItemDetails(itemId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        greeting: "PostValidatedURL",
        url: "https://catalog.roblox.com/v1/catalog/items/details",
        jsonData: JSON.stringify({ items: [{ id: itemId, itemType: "Asset" }] }),
      },
      function (data) {
        if (data != null && Array.isArray(data.data) && data.data.length > 0 && data.data[0] != null) {
          resolve(data.data[0]);
          return;
        }
        resolve({});
      }
    );
  });
}

function normalizeTradeOfferCatalogPriceStatus(priceStatus) {
  var normalizedStatus = typeof priceStatus === "string" ? priceStatus : "";
  return normalizedStatus.toLowerCase().replace(/\s+/g, "");
}

function isTradeOfferCatalogItemOffsale(itemDetails) {
  if (itemDetails == null || typeof itemDetails !== "object") {
    return false;
  }
  if (itemDetails.isOffSale === true) {
    return true;
  }
  return normalizeTradeOfferCatalogPriceStatus(itemDetails.priceStatus) === "offsale";
}

function fetchTradeOfferChartSalesData(collectibleItemId) {
  return new Promise(async (resolve) => {
    if (collectibleItemId == null) {
      resolve({ priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0 });
      return;
    }
    function fetchUrl(url) {
      return new Promise((resolveUrl) => {
        chrome.runtime.sendMessage({ greeting: "GetURL", url: url }, function (data) {
          resolveUrl(data);
        });
      });
    }
    for (var attempt = 0; attempt < 2; attempt++) {
      var payload = normalizeTradeOfferChartSalesPayload(
        await fetchUrl("https://apis.roblox.com/marketplace-sales/v1/item/" + collectibleItemId + "/resale-data")
      );
      if (payload.priceDataPoints.length > 0) {
        resolve(payload);
        return;
      }
      await new Promise(function (delayResolve) {
        setTimeout(delayResolve, 200 * (attempt + 1));
      });
    }
    resolve({ priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0 });
  });
}

function fetchTradeOfferSalesContext(salesData) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_trade_sales_context", { salesData: salesData }, function (data) {
      resolve(data);
    });
  });
}

function fetchTradeOfferAdditionalInfo(itemId) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_additional_item_info", { itemId: itemId }, function (data) {
      resolve(data);
    });
  });
}

var tradeOfferInfoTryOnItemId = null;
var tradeOfferAvatarRenderPollMaxAttempts = 12
var tradeOfferAvatarRenderPollDelayMs = 2000

function normalizeRobloxRenderUrlToken(rawRenderUrl) {
  var normalized = typeof rawRenderUrl === "string" ? stripTags(rawRenderUrl).trim() : ""
  if (normalized.length === 0) {
    return "";
  }
  if (normalized.charAt(0) === "?") {
    normalized = normalized.slice(1);
  }
  if (normalized.charAt(0) === "&") {
    normalized = normalized.slice(1);
  }
  if (/^https?:\/\//i.test(normalized) || normalized.indexOf(".com/") !== -1) {
    try {
      var parsedRenderUrl = new URL(normalized);
      var isRbxcdnHost = parsedRenderUrl.hostname.toLowerCase().indexOf("rbxcdn.com") !== -1;
      normalized = isRbxcdnHost
        ? parsedRenderUrl.pathname || ""
        : parsedRenderUrl.search || "";
    } catch (e) {}
  }
  if (normalized.charAt(0) === "?") {
    normalized = normalized.slice(1);
  }
  if (normalized.charAt(0) === "&") {
    normalized = normalized.slice(1);
  }
  if (normalized.charAt(0) === "/") {
    normalized = normalized.slice(1);
  }
  return normalized;
}

function fetchTradeOfferAssetRender(itemId) {
  return new Promise((resolve) => {
    var attemptCount = 0;
    var normalizedItemId = parseInt(itemId, 10);
    if (!Number.isFinite(normalizedItemId) || normalizedItemId <= 0) {
      resolve("");
      return;
    }
    function getUrl(activeItemId) {
      attemptCount++;
      if (attemptCount > tradeOfferAvatarRenderPollMaxAttempts) {
        resolve("");
        return;
      }
      var renderParameters = JSON.stringify({
        avatarDefinition: {
          assets: [{ id: activeItemId }],
          bodyColors: {
            headColor: "#F8F8F8",
            torsoColor: "#F8F8F8",
            leftArmColor: "#F8F8F8",
            rightArmColor: "#F8F8F8",
            leftLegColor: "#F8F8F8",
            rightLegColor: "#F8F8F8",
          },
          playerAvatarType: { playerAvatarType: "R15" },
          scales: { height: 1, width: 1, head: 1, depth: 1, proportion: 0, bodyType: 0 },
        },
        thumbnailConfig: {
          thumbnailId: 3,
          thumbnailType: "3d",
          size: "420x420",
        },
      });
      chrome.runtime.sendMessage(
        { greeting: "PostValidatedURL", url: "https://avatar.roblox.com/v1/avatar/render", jsonData: renderParameters },
        function (data) {
          if (activeItemId !== tradeOfferInfoTryOnItemId) {
            resolve("");
            return;
          }
          if (data == null) {
            setTimeout(function () {
              getUrl(activeItemId);
            }, tradeOfferAvatarRenderPollDelayMs);
            return;
          }
          if (data.state === "Completed") {
            resolve(normalizeRobloxRenderUrlToken(data.imageUrl));
            return;
          }
          if (data.state === "Error" || data.state === "Failed") {
            resolve("");
            return;
          }
          setTimeout(function () {
            getUrl(activeItemId);
          }, tradeOfferAvatarRenderPollDelayMs);
        }
      );
    }
    getUrl(normalizedItemId);
  });
}

function fetchWishlistAll(query) {
  var requestPayload = query != null && typeof query === "object" ? query : {};
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_get_wishlist_all", requestPayload, function (data) {
      resolve(data);
    });
  });
}

function postWishlist(payload) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_post_wishlist", payload, function (data) {
      resolve(data);
    });
  });
}

function deleteWishlistEntry(wishid) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_delete_wish", { wishid: wishid }, function (data) {
      resolve(data);
    });
  });
}

function fetchTradeItemSearch(query) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_trade_item_search", { q: query }, function (data) {
      resolve(data);
    });
  });
}

function fetchTradeItemsByIds(ids) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_trade_backend", { ids: ids }, function (data) {
      resolve(data);
    });
  });
}

function fetchMyWishlistAssets(limit) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_get_wishlist_assets", { limit: limit }, function (data) {
      resolve(data);
    });
  });
}

function setWishlistAsset(assetId, value) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_set_wishlist_asset", { assetId: assetId, value: value, type: "asset" }, function (data) {
      resolve(data);
    });
  });
}

var TRADE_TERM_TOKENS = [
  { id: -6, key: "any", name: "Any" },
  { id: -2, key: "upgrade", name: "Upgrade" },
  { id: -3, key: "downgrade", name: "Downgrade" },
  { id: -5, key: "demand", name: "Demand" },
  { id: -4, key: "rap", name: "RAP" },
  { id: -7, key: "add", name: "Add" },
  { id: -8, key: "projected", name: "Projected" },
  { id: -9, key: "robux", name: "Robux" },
];

var tradeTermTokensById = {};
for (var tradeTermTokenIndex = 0; tradeTermTokenIndex < TRADE_TERM_TOKENS.length; tradeTermTokenIndex++) {
  tradeTermTokensById[TRADE_TERM_TOKENS[tradeTermTokenIndex].id] = TRADE_TERM_TOKENS[tradeTermTokenIndex];
}

function getTradeTermTokenById(itemId) {
  var normalizedId = parseInt(itemId, 10);
  if (!Number.isFinite(normalizedId)) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(tradeTermTokensById, normalizedId)) {
    return null;
  }
  return tradeTermTokensById[normalizedId];
}

function createTradeTermSelection(termId) {
  var termToken = getTradeTermTokenById(termId);
  if (termToken == null) {
    return null;
  }
  return {
    id: termToken.id,
    assetId: termToken.id,
    name: termToken.name,
    rap: 0,
    value: 0,
    projected: false,
    demand: null,
    onHold: false,
    isTerm: true,
  };
}

function parsePayload(payload) {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (_) {
      return payload;
    }
  }
  return payload;
}

function normalizeTradeSearchText(value) {
  return stripTags(String(value == null ? "" : value)).toLowerCase().trim();
}

function parseTradeSearchItemJson(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function parseTradeSearchItemAcronym(raw) {
  var parsed = parseTradeSearchItemJson(raw);
  if (parsed == null || typeof parsed[15] !== "string") {
    return "";
  }
  return normalizeTradeSearchText(parsed[15]);
}

function parseTradeSearchItemValue(raw) {
  var parsed = parseTradeSearchItemJson(raw);
  if (parsed == null) {
    return -1;
  }
  var value = parseInt(parsed[16], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return -1;
  }
  return value;
}

function extractWantedRowAcronym(row) {
  if (row == null || typeof row !== "object") {
    return "";
  }
  var acronymFields = ["acronym", "abbr", "abbreviation", "shortName"];
  for (var i = 0; i < acronymFields.length; i++) {
    if (typeof row[acronymFields[i]] === "string") {
      var normalizedAcronym = normalizeTradeSearchText(row[acronymFields[i]]);
      if (normalizedAcronym.length > 0) {
        return normalizedAcronym;
      }
    }
  }
  return "";
}

function doesTradeSearchRowMatch(row, normalizedQuery) {
  if (row == null || typeof row !== "object") {
    return false;
  }
  if (normalizedQuery.length === 0) {
    return true;
  }
  var rowName = normalizeTradeSearchText(row.name);
  if (rowName.indexOf(normalizedQuery) !== -1) {
    return true;
  }
  if (typeof row.acronym === "string" && row.acronym.indexOf(normalizedQuery) !== -1) {
    return true;
  }
  return false;
}

var TRADE_OFFERS_VIEW_GATE = "trade_offers_view";
var TRADE_OFFERS_POST_GATE = "trade_offers_post";
var TRADE_OFFERS_WISHLIST_GATE = "trade_offers_wishlist_manage";
var TRADE_OFFERS_FILTER_QUERY_ITEM_LIMIT = 80;
var TRADE_OFFERS_APPLIED_FILTER_CHIP_COLLAPSE_LIMIT = 20;

function getDefaultTradeOffersGateResponse(gateKey) {
  return {
    key: gateKey,
    allowed: false,
    reason: "unknown",
    setting: null,
    settingEnabled: null,
    settingValid: false,
    currentTier: "unknown",
    requiredTier: null,
    upgradeTier: null,
  };
}

function normalizeTradeOffersGateMap(gates) {
  var normalized = {};
  var gateKeys = [
    TRADE_OFFERS_VIEW_GATE,
    TRADE_OFFERS_POST_GATE,
    TRADE_OFFERS_WISHLIST_GATE,
  ];
  for (var i = 0; i < gateKeys.length; i++) {
    var gateKey = gateKeys[i];
    var gate = gates != null && typeof gates === "object" ? gates[gateKey] : null;
    if (gate != null && typeof gate === "object") {
      normalized[gateKey] = gate;
    } else {
      normalized[gateKey] = getDefaultTradeOffersGateResponse(gateKey);
    }
  }
  return normalized;
}

function getTradeOffersGate(gateKey) {
  if (offersState == null || offersState.visualGates == null) {
    return getDefaultTradeOffersGateResponse(gateKey);
  }
  if (!Object.prototype.hasOwnProperty.call(offersState.visualGates, gateKey)) {
    return getDefaultTradeOffersGateResponse(gateKey);
  }
  return offersState.visualGates[gateKey];
}

function canViewTradeOffers() {
  return getTradeOffersGate(TRADE_OFFERS_VIEW_GATE).allowed === true;
}

function canPostTradeOffers() {
  return getTradeOffersGate(TRADE_OFFERS_POST_GATE).allowed === true;
}

function canManageTradeOffersWishlist() {
  return getTradeOffersGate(TRADE_OFFERS_WISHLIST_GATE).allowed === true;
}

function isTradeOffersGateBlockedByRobloxPremium(gateInfo) {
  return gateInfo != null && typeof gateInfo === "object" && gateInfo.blockedByRobloxPremium === true;
}

function isTradeOffersGateTierAllowed(gateInfo) {
  if (
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.isVisualGateTierAllowed === "function"
  ) {
    return roproApiAdapter.isVisualGateTierAllowed(gateInfo);
  }
  if (gateInfo == null || typeof gateInfo !== "object") {
    return false;
  }
  var currentTierRank =
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.getSubscriptionTierRank === "function"
      ? roproApiAdapter.getSubscriptionTierRank(gateInfo.currentTier)
      : -1;
  var requiredTierRank =
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.getSubscriptionTierRank === "function"
      ? roproApiAdapter.getSubscriptionTierRank(gateInfo.requiredTier)
      : -1;
  if (currentTierRank < 0 || requiredTierRank < 0) {
    return false;
  }
  return currentTierRank >= requiredTierRank;
}

function isTradeOffersGateUpsellEligible(gateInfo) {
  if (isTradeOffersGateBlockedByRobloxPremium(gateInfo)) {
    return false;
  }
  if (
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.isVisualGateUpsellEligible === "function"
  ) {
    return roproApiAdapter.isVisualGateUpsellEligible(gateInfo);
  }
  if (gateInfo == null || typeof gateInfo !== "object" || gateInfo.allowed === true) {
    return false;
  }
  var reason = String(gateInfo.reason == null ? "" : gateInfo.reason).trim().toLowerCase();
  if (reason === "tier") {
    return true;
  }
  if (reason === "setting_off") {
    return !isTradeOffersGateTierAllowed(gateInfo);
  }
  return false;
}

function getTradeOffersGateLockTitle(gateInfo, tierLockTitle) {
  var defaultTitle = typeof tierLockTitle === "string" ? tierLockTitle : "";
  if (gateInfo == null || typeof gateInfo !== "object") {
    return defaultTitle;
  }
  if (isTradeOffersGateBlockedByRobloxPremium(gateInfo)) {
    return "Requires an active Roblox Premium membership.";
  }
  var reason = String(gateInfo.reason == null ? "" : gateInfo.reason).trim().toLowerCase();
  if (reason === "subscription_unknown" || reason === "disabled_feature") {
    return "This feature is temporarily unavailable.";
  }
  if (reason === "setting_off" && isTradeOffersGateTierAllowed(gateInfo)) {
    return "Enable this feature in RoPro settings.";
  }
  return defaultTitle;
}

function getTradeOffersGateBlockedStatusMessage(gateInfo) {
  if (gateInfo == null || typeof gateInfo !== "object") {
    return "";
  }
  if (isTradeOffersGateBlockedByRobloxPremium(gateInfo)) {
    return "Trade Board requires an active Roblox Premium membership.";
  }
  var reason = String(gateInfo.reason == null ? "" : gateInfo.reason).trim().toLowerCase();
  if (reason === "subscription_unknown") {
    return "Subscription status is still loading. Please try again.";
  }
  if (reason === "disabled_feature") {
    return "Trade Board is temporarily unavailable.";
  }
  if (reason === "setting_off" && isTradeOffersGateTierAllowed(gateInfo)) {
    return "Enable this feature in RoPro settings to use it.";
  }
  return "";
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function formatTradeOfferCompactNumber(value) {
  var normalizedValue = Number.isFinite(parseInt(value, 10)) ? parseInt(value, 10) : 0;
  if (Math.abs(normalizedValue) < 1000000) {
    return addCommas(normalizedValue);
  }
  var compactMillions = (normalizedValue / 1000000).toFixed(3).replace(/\.?0+$/, "");
  return compactMillions + "m";
}

function getTradeOfferValueRapSegments(value, rap, compactWhenEqual) {
  var normalizedValue = Number.isFinite(parseInt(value, 10)) ? parseInt(value, 10) : -1;
  var normalizedRap = Number.isFinite(parseInt(rap, 10)) ? Math.max(0, parseInt(rap, 10)) : 0;
  if (compactWhenEqual === true && normalizedValue >= 0 && normalizedValue === normalizedRap) {
    return ["Value & RAP: " + formatTradeOfferCompactNumber(normalizedValue)];
  }
  return [
    "Value: " + (normalizedValue >= 0 ? formatTradeOfferCompactNumber(normalizedValue) : "Hidden"),
    "RAP: " + formatTradeOfferCompactNumber(normalizedRap),
  ];
}

function formatValueRapLine(value, rap, compactWhenEqual) {
  return getTradeOfferValueRapSegments(value, rap, compactWhenEqual).join(" | ");
}

function stripTags(s) {
  return roproApiAdapter.stripTags(s);
}

function relativeTimeFromMs(timestampMs) {
  var nowMs = Date.now();
  var deltaMs = Math.max(0, nowMs - timestampMs);
  var seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) {
    return "just now";
  }
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
  }
  var hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + (hours === 1 ? " hour ago" : " hours ago");
  }
  var days = Math.floor(hours / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}

function parseDemandLabel(demand) {
  var demandMap = {
    1: "Terrible",
    2: "Low",
    3: "Normal",
    4: "High",
    5: "Amazing",
  };
  if (!Number.isFinite(parseInt(demand, 10))) {
    return "";
  }
  return demandMap[parseInt(demand, 10)] || "";
}

function getTradeOfferCollectibleItemId(details) {
  var id =
    details != null && typeof details.collectibleItemId === "string" ? details.collectibleItemId.trim() : "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return null;
}

function normalizeTradeOfferChartSalesPayload(payload) {
  if (payload == null || typeof payload !== "object") {
    return { priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0 };
  }
  var priceDataPoints = Array.isArray(payload.priceDataPoints)
    ? payload.priceDataPoints.filter(function (point) {
        if (point == null || typeof point !== "object") {
          return false;
        }
        if (!point.hasOwnProperty("date")) {
          return false;
        }
        var pointTime = new Date(point.date).getTime();
        return Number.isFinite(parseInt(point.value, 10)) && Number.isFinite(pointTime);
      })
    : [];
  priceDataPoints.sort(function (a, b) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  var rap = Number.isFinite(parseInt(payload.recentAveragePrice, 10)) ? parseInt(payload.recentAveragePrice, 10) : 0;
  if (rap <= 0 && priceDataPoints.length > 0) {
    rap = parseInt(priceDataPoints[0].value, 10);
    if (!Number.isFinite(rap) || rap < 0) {
      rap = 0;
    }
  }
  return {
    priceDataPoints: priceDataPoints,
    volumeDataPoints: [],
    recentAveragePrice: rap,
  };
}

function normalizeTradeOfferRecentSalesRows(payload) {
  var rows = Array.isArray(payload) ? payload : [];
  var normalizedRows = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row == null || typeof row !== "object") {
      continue;
    }
    var oldRap = parseInt(row.oldrap, 10);
    var newRap = parseInt(row.newrap, 10);
    var timestamp = parseInt(row.date, 10);
    if (!Number.isFinite(oldRap) || !Number.isFinite(newRap) || !Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }
    normalizedRows.push({ oldrap: oldRap, newrap: newRap, date: timestamp });
  }
  return normalizedRows;
}

function normalizeTradeOfferSalesTrendMetricsPayload(payload) {
  var metrics = payload != null && typeof payload === "object" ? payload : {};
  var priceIncrease = parseFloat(metrics.priceIncrease);
  var salesMedian = parseFloat(metrics.salesMedian);
  var medianDifference = parseFloat(metrics.medianDifference);
  return {
    priceIncrease: Number.isFinite(priceIncrease) ? priceIncrease : 0,
    salesMedian: Number.isFinite(salesMedian) ? salesMedian : 0,
    medianDifference: Number.isFinite(medianDifference) ? medianDifference : 0,
    isProbablyProjected: metrics.isProbablyProjected === true,
  };
}

function parseTradeOfferSalesContext(payload) {
  var parsedPayload = parsePayload(payload);
  if (parsedPayload == null || typeof parsedPayload !== "object") {
    parsedPayload = {};
  }
  return {
    salesData: normalizeTradeOfferChartSalesPayload(parsedPayload.salesData),
    recentSales: normalizeTradeOfferRecentSalesRows(parsedPayload.recentSales),
    metrics: normalizeTradeOfferSalesTrendMetricsPayload(parsedPayload.metrics),
  };
}

function tradeOfferSalesMean(values, fallbackValue) {
  var fallback = Number.isFinite(parseFloat(fallbackValue)) ? parseFloat(fallbackValue) : 0;
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }
  var sum = 0;
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    var numeric = parseFloat(values[i]);
    if (!Number.isFinite(numeric)) {
      continue;
    }
    sum += numeric;
    count += 1;
  }
  return count === 0 ? fallback : sum / count;
}

function tradeOfferSalesMedian(values, fallbackValue) {
  var fallback = Number.isFinite(parseFloat(fallbackValue)) ? parseFloat(fallbackValue) : 0;
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }
  var numbers = [];
  for (var i = 0; i < values.length; i++) {
    var numeric = parseFloat(values[i]);
    if (Number.isFinite(numeric)) {
      numbers.push(numeric);
    }
  }
  if (numbers.length === 0) {
    return fallback;
  }
  numbers.sort(function (a, b) {
    return a - b;
  });
  var middle = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 1) {
    return numbers[middle];
  }
  return (numbers[middle - 1] + numbers[middle]) / 2;
}

function buildTradeOfferSalesContextFallback(salesData) {
  var normalizedSalesData = normalizeTradeOfferChartSalesPayload(salesData);
  var priceDataPoints = Array.isArray(normalizedSalesData.priceDataPoints) ? normalizedSalesData.priceDataPoints : [];
  var parsedPoints = [];
  for (var i = 0; i < priceDataPoints.length; i++) {
    var point = priceDataPoints[i];
    if (point == null || typeof point !== "object") {
      continue;
    }
    var value = parseInt(point.value, 10);
    var timeMs = new Date(point.date).getTime();
    if (!Number.isFinite(value) || !Number.isFinite(timeMs)) {
      continue;
    }
    parsedPoints.push({
      timeMs: timeMs,
      value: value,
    });
  }

  var recentSales = [];
  var newestFirst = parsedPoints.slice().sort(function (a, b) {
    return b.timeMs - a.timeMs;
  });
  for (var recentIndex = 0; recentIndex + 1 < newestFirst.length && recentSales.length < 50; recentIndex++) {
    var newRap = newestFirst[recentIndex].value;
    var oldRap = newestFirst[recentIndex + 1].value;
    var timestamp = parseInt(newestFirst[recentIndex].timeMs / 1000, 10);
    if (!Number.isFinite(newRap) || !Number.isFinite(oldRap) || !Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }
    recentSales.push({
      oldrap: oldRap,
      newrap: newRap,
      date: timestamp,
    });
  }

  var rap = Number.isFinite(parseInt(normalizedSalesData.recentAveragePrice, 10))
    ? parseInt(normalizedSalesData.recentAveragePrice, 10)
    : 0;
  var oldestFirst = parsedPoints.slice().sort(function (a, b) {
    return a.timeMs - b.timeMs;
  });
  var nowMs = new Date().getTime();
  var thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  var recentThirtyDayValues = [];
  var priorThirtyDayValues = [];
  for (var pointIndex = 0; pointIndex < oldestFirst.length; pointIndex++) {
    var dataPoint = oldestFirst[pointIndex];
    if (dataPoint.timeMs + thirtyDaysMs >= nowMs) {
      recentThirtyDayValues.push(dataPoint.value);
    } else if (dataPoint.timeMs + thirtyDaysMs * 2 >= nowMs) {
      priorThirtyDayValues.push(dataPoint.value);
    }
  }
  var mean60 = priorThirtyDayValues.length === 0 ? rap : tradeOfferSalesMean(priorThirtyDayValues, rap);
  var mean30 = recentThirtyDayValues.length === 0 ? rap : tradeOfferSalesMean(recentThirtyDayValues, rap);
  var priceIncrease = 0;
  if (mean60 > 0) {
    priceIncrease = ((mean30 - mean60) / mean60) * 100;
  }
  var salesMedian = recentThirtyDayValues.length === 0 ? rap : tradeOfferSalesMedian(recentThirtyDayValues, rap);
  var medianDifference = 0;
  if (salesMedian > 0) {
    medianDifference = ((rap - salesMedian) / salesMedian) * 100;
  }
  return {
    salesData: normalizedSalesData,
    recentSales: recentSales,
    metrics: {
      priceIncrease: Math.round(priceIncrease * 10) / 10,
      salesMedian: salesMedian,
      medianDifference: Math.round(medianDifference * 10) / 10,
      isProbablyProjected: salesMedian > 0 && rap / salesMedian > 1.5,
    },
  };
}

function formatTradeOfferInfoCardTime(time) {
  var timeSince = Math.round(new Date().getTime() - parseInt(time, 10)) / 1000;
  if (timeSince < 60) {
    return Math.round(timeSince) + "s";
  }
  if (timeSince / 60 < 60) {
    return Math.round(timeSince / 60) + "m";
  }
  if (timeSince / 60 / 60 < 24) {
    return Math.round(timeSince / 60 / 60) + "h";
  }
  return Math.round(timeSince / 60 / 60 / 24) + "d";
}

function normalizeOfferItem(item) {
  if (item == null || typeof item !== "object") {
    return { id: -1 };
  }
  var id = parseInt(item.id, 10);
  if (!Number.isFinite(id)) {
    return { id: -1 };
  }
  if (id < 0) {
    var termToken = getTradeTermTokenById(id);
    if (termToken == null) {
      return { id: -1 };
    }
    return {
      id: termToken.id,
      name: termToken.name,
      rap: 0,
      value: 0,
      projected: false,
      demand: null,
      onHold: false,
      isTerm: true,
    };
  }
  if (id === 0) {
    return { id: -1 };
  }
  var rap = parseInt(item.rap, 10);
  if (!Number.isFinite(rap) || rap < 0) {
    rap = 0;
  }
  var value = parseInt(item.value, 10);
  if (!Number.isFinite(value)) {
    value = -1;
  }
  return {
    id: id,
    name: typeof item.name === "string" ? stripTags(item.name) : "",
    rap: rap,
    value: value,
    projected: item.projected === true,
    demand: Number.isFinite(parseInt(item.demand, 10)) ? parseInt(item.demand, 10) : null,
    onHold: item.onHold === true,
  };
}

function normalizeTradeBackendEntry(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  var parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  var projected = parsed[19] === 1;
  var demand = Number.isFinite(parseInt(parsed[17], 10)) ? parseInt(parsed[17], 10) + 1 : null;
  var value = Number.isFinite(parseInt(parsed[16], 10)) ? parseInt(parsed[16], 10) : -1;
  if (!Number.isFinite(value) || value <= 0) {
    value = -1;
  }
  return {
    projected: projected,
    demand: demand,
    value: value,
  };
}

function isRobloxOffers404Overlay(node) {
  if (node == null || node.nodeType !== 1) {
    return false;
  }
  if (!isTradeOffersPath()) {
    return false;
  }
  var text = (node.textContent || "").toLowerCase();
  return text.includes("404") && text.includes("page not found");
}

var offers404PrehideStyleId = "ropro-trade-offers-404-prehide-style";
var offers404Observer = null;

function installOffers404Prehide() {
  if (!isTradeOffersPath()) {
    return;
  }
  if (document.getElementById(offers404PrehideStyleId) != null) {
    return;
  }
  var prehideStyle = document.createElement("style");
  prehideStyle.id = offers404PrehideStyleId;
  prehideStyle.textContent =
    ".request-error-page-content,.default-error-page{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}";
  var styleHost = document.head || document.documentElement;
  if (styleHost != null) {
    styleHost.appendChild(prehideStyle);
  }
}

function removeOffers404Prehide() {
  var prehideStyle = document.getElementById(offers404PrehideStyleId);
  if (prehideStyle != null) {
    prehideStyle.remove();
  }
}

function dismissRobloxOffers404Overlay() {
  var overlayNode = document.querySelector(".request-error-page-content");
  if (overlayNode == null) {
    return;
  }
  if (!isRobloxOffers404Overlay(overlayNode)) {
    return;
  }
  overlayNode.style.display = "none";
  overlayNode.style.visibility = "hidden";
  overlayNode.style.pointerEvents = "none";
  var errorPage = overlayNode.closest(".default-error-page");
  if (errorPage != null) {
    errorPage.style.display = "none";
    errorPage.style.visibility = "hidden";
    errorPage.style.pointerEvents = "none";
  }
}

function startOffers404Suppression() {
  if (!isTradeOffersPath()) {
    return;
  }
  installOffers404Prehide();
  dismissRobloxOffers404Overlay();
  if (offers404Observer != null) {
    return;
  }
  offers404Observer = new MutationObserver(function () {
    dismissRobloxOffers404Overlay();
  });
  if (document.documentElement != null) {
    offers404Observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

function stopOffers404Suppression() {
  if (offers404Observer != null) {
    offers404Observer.disconnect();
    offers404Observer = null;
  }
  removeOffers404Prehide();
}

var offersState = {
  tradeOffersPageEnabled: false,
  valueCalculatorEnabled: false,
  tier: "unknown",
  visualGates: normalizeTradeOffersGateMap(null),
  myUserId: null,
  activeTab: "offers",
  loading: false,
  page: 0,
  hasMore: false,
  wishes: [],
  myPostsLoading: false,
  myPostsPage: 0,
  myPostsHasMore: false,
  myPosts: [],
  myPostsLoadedOnce: false,
  itemMetadata: {},
  thumbnails: {
    urlByAssetId: {},
    inflightByAssetId: {},
  },
  filters: {
    selectedItems: [],
    selectedTerms: [],
    appliedChipExpanded: false,
    side: "either",
    sort: "newest",
    searchQuery: "",
    searchRows: [],
    searchRequestId: 0,
    wishlistSearchQuery: "",
    wishlistSearchRows: [],
    wishlistSearchRequestId: 0,
    myWishlistItems: [],
    myWishlistById: {},
  },
  postCooldown: {
    cooldownSeconds: 1800,
    remainingSeconds: 0,
    nextPostAtMs: 0,
    ticker: null,
    showTimer: true,
  },
  ui: {
    shell: null,
    list: null,
    status: null,
    loadMore: null,
    postButton: null,
    lockBox: null,
    refreshButton: null,
    offersTabButton: null,
    wishlistTabButton: null,
    myPostsTabButton: null,
    filtersPanel: null,
    appliedFiltersSection: null,
    appliedFilterChips: null,
    offersView: null,
    wishlistView: null,
    myPostsView: null,
    wishlistStatus: null,
    wishlistCurrentList: null,
    myPostsStatus: null,
    myPostsList: null,
    myPostsLoadMore: null,
    myPostsDeleteAllButton: null,
    addWishlistItemsButton: null,
    addMyItemsButton: null,
    sideSelect: null,
    postCooldown: null,
    postCooldownText: null,
    postCooldownToggle: null,
  },
  composer: {
    visible: false,
    overlay: null,
    offeredFilter: "",
    offeredRows: [],
    offeredAcronymByAssetId: {},
    offeredSelected: [],
    wantedFilter: "",
    wantedRows: [],
    wantedSelected: [],
    wantedAcronymByAssetId: {},
    offeredValueByAssetId: {},
    wantedRequestId: 0,
    status: "",
  },
  chartModal: {
    visible: false,
    overlay: null,
    requestId: 0,
  },
  myPostsDeleteModal: {
    visible: false,
    overlay: null,
    deleting: false,
  },
};

var tradeOffersGlobalKeydownBound = false;

function handleTradeOffersGlobalKeydown(event) {
  if (event == null || event.key !== "Escape") {
    return;
  }
  if (offersState.myPostsDeleteModal.visible) {
    if (offersState.myPostsDeleteModal.deleting) {
      return;
    }
    event.preventDefault();
    closeMyPostsDeleteAllModal();
    return;
  }
  if (offersState.chartModal.visible) {
    event.preventDefault();
    closeTradeOfferItemChartModal();
    return;
  }
  if (offersState.composer.visible) {
    event.preventDefault();
    closeComposerModal();
  }
}

function ensureTradeOffersGlobalKeydownBound() {
  if (tradeOffersGlobalKeydownBound) {
    return;
  }
  document.addEventListener("keydown", handleTradeOffersGlobalKeydown);
  tradeOffersGlobalKeydownBound = true;
}

function openUpgradeModalForTier(tier, featureLabel) {
  if (
    typeof window.RoProUpgradeModal === "undefined" ||
    window.RoProUpgradeModal == null ||
    typeof window.RoProUpgradeModal.open !== "function"
  ) {
    return;
  }
  window.RoProUpgradeModal.open({
    modalId: "tradeOffersUpgradeModal",
    tier: tier,
    title: tier === "rex" ? "RoPro Rex Feature" : "RoPro Plus Feature",
    featureLabel: featureLabel,
    contextLabel: "Trade Board",
    ctaLabel: tier === "rex" ? "Upgrade to Rex" : "Upgrade to Plus",
  });
}

function openUpgradeModalForGate(gateKey, fallbackTier, featureLabel) {
  var gate = getTradeOffersGate(gateKey);
  if (!isTradeOffersGateUpsellEligible(gate)) {
    var blockedMessage = getTradeOffersGateBlockedStatusMessage(gate);
    if (blockedMessage.length > 0) {
      setStatusText(blockedMessage);
    }
    return null;
  }
  if (
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.openUpgradeModalForVisualGate === "function"
  ) {
    roproApiAdapter.openUpgradeModalForVisualGate(gate, {
      modalId: "tradeOffersUpgradeModal",
      fallbackTier: fallbackTier,
      featureLabel: featureLabel,
      contextLabel: "Trade Board",
    });
    return;
  }
  var tier = fallbackTier;
  if (gate != null && typeof gate === "object" && typeof gate.upgradeTier === "string") {
    tier = gate.upgradeTier;
  }
  openUpgradeModalForTier(tier, featureLabel);
}

function createButton(label, className) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function createRoProTitleHeading(titleClassName, featureLabel) {
  var heading = document.createElement("h1");
  heading.className = titleClassName;
  var logo = document.createElement("img");
  logo.className = "ropro-page-heading-logo";
  logo.src = chrome.runtime.getURL("/images/ropro_icon_small.png");
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");
  var titleText = document.createElement("span");
  titleText.textContent = "RoPro " + stripTags(String(featureLabel || ""));
  heading.appendChild(logo);
  heading.appendChild(titleText);
  return heading;
}

function createClearableSearchInput(placeholder, inputClassName, wrapperClassName) {
  var wrapper = document.createElement("div");
  wrapper.className = wrapperClassName || "ropro-trade-offers-search-input-wrap";
  var input = document.createElement("input");
  input.className = inputClassName || "form-control input-field";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  var clearButton = createButton("X", "btn-control-sm ropro-trade-offers-search-clear");
  clearButton.setAttribute("aria-label", "Clear search");
  clearButton.title = "Clear search";
  clearButton.style.display = "none";
  wrapper.appendChild(input);
  wrapper.appendChild(clearButton);
  return {
    wrapper: wrapper,
    input: input,
    clearButton: clearButton,
  };
}

function bindClearSearchInput(searchInput, clearButton, onInput, onClear) {
  function updateClearButtonVisibility() {
    var hasValue = String(searchInput.value || "").trim().length > 0;
    clearButton.style.display = hasValue ? "inline-flex" : "none";
  }
  searchInput.addEventListener("input", function (event) {
    if (typeof onInput === "function") {
      onInput(event);
    }
    updateClearButtonVisibility();
  });
  clearButton.addEventListener("click", function () {
    if (String(searchInput.value || "").length === 0) {
      searchInput.focus();
      return;
    }
    searchInput.value = "";
    if (typeof onClear === "function") {
      onClear();
    } else if (typeof onInput === "function") {
      onInput({ target: searchInput });
    }
    updateClearButtonVisibility();
    searchInput.focus();
  });
  updateClearButtonVisibility();
}

function setRefreshButtonLoading(isLoading) {
  if (offersState.ui.refreshButton == null) {
    return;
  }
  offersState.ui.refreshButton.classList.toggle("ropro-trade-offers-refresh-btn-loading", isLoading === true);
}

function setTradeOfferLockedButtonState(buttonNode, isLocked, lockTitle) {
  if (buttonNode == null) {
    return;
  }
  buttonNode.classList.toggle("ropro-trade-offers-btn-locked", isLocked === true);
  if (isLocked === true && typeof lockTitle === "string" && lockTitle.length > 0) {
    buttonNode.setAttribute("title", lockTitle);
    buttonNode.setAttribute("aria-disabled", "true");
    return;
  }
  buttonNode.removeAttribute("aria-disabled");
  buttonNode.removeAttribute("title");
}

function renderTradeOfferTierAccessControls() {
  var canView = canViewTradeOffers();
  var canPost = canPostTradeOffers();
  var canManageWishlist = canManageTradeOffersWishlist();
  var viewGate = getTradeOffersGate(TRADE_OFFERS_VIEW_GATE);
  var postGate = getTradeOffersGate(TRADE_OFFERS_POST_GATE);
  var wishlistGate = getTradeOffersGate(TRADE_OFFERS_WISHLIST_GATE);
  var viewLockTitle = getTradeOffersGateLockTitle(viewGate, "Trade Board requires RoPro Plus or Rex.");
  var postLockTitle = getTradeOffersGateLockTitle(postGate, "My Posts requires RoPro Rex.");
  var wishlistLockTitle = getTradeOffersGateLockTitle(
    wishlistGate,
    "Trade Board More Options requires RoPro Rex."
  );
  if (
    typeof roproApiAdapter !== "undefined" &&
    roproApiAdapter != null &&
    typeof roproApiAdapter.applyVisualGateLockedState === "function"
  ) {
    roproApiAdapter.applyVisualGateLockedState(
      offersState.ui.offersTabButton,
      viewGate,
      {
        lockClass: "ropro-trade-offers-btn-locked",
        lockTitle: viewLockTitle,
      }
    );
    roproApiAdapter.applyVisualGateLockedState(
      offersState.ui.myPostsTabButton,
      postGate,
      {
        lockClass: "ropro-trade-offers-btn-locked",
        lockTitle: postLockTitle,
      }
    );
    roproApiAdapter.applyVisualGateLockedState(
      offersState.ui.wishlistTabButton,
      wishlistGate,
      {
        lockClass: "ropro-trade-offers-btn-locked",
        lockTitle: wishlistLockTitle,
      }
    );
    roproApiAdapter.applyVisualGateLockedState(
      offersState.ui.addWishlistItemsButton,
      wishlistGate,
      {
        lockClass: "ropro-trade-offers-btn-locked",
        lockTitle: wishlistLockTitle,
      }
    );
    roproApiAdapter.applyVisualGateLockedState(
      offersState.ui.addMyItemsButton,
      wishlistGate,
      {
        lockClass: "ropro-trade-offers-btn-locked",
        lockTitle: wishlistLockTitle,
      }
    );
    return;
  }
  setTradeOfferLockedButtonState(
    offersState.ui.offersTabButton,
    !canView,
    viewLockTitle
  );
  setTradeOfferLockedButtonState(
    offersState.ui.myPostsTabButton,
    !canPost,
    postLockTitle
  );
  setTradeOfferLockedButtonState(
    offersState.ui.wishlistTabButton,
    !canManageWishlist,
    wishlistLockTitle
  );
  setTradeOfferLockedButtonState(
    offersState.ui.addWishlistItemsButton,
    !canManageWishlist,
    wishlistLockTitle
  );
  setTradeOfferLockedButtonState(
    offersState.ui.addMyItemsButton,
    !canManageWishlist,
    wishlistLockTitle
  );
}

function setActiveTradeOffersTab(tabName) {
  var nextTab = "offers";
  if (tabName === "wishlist") {
    nextTab = "wishlist";
  } else if (tabName === "myposts") {
    nextTab = "myposts";
  }
  offersState.activeTab = nextTab;
  if (offersState.ui.offersTabButton != null) {
    offersState.ui.offersTabButton.classList.toggle("ropro-trade-offers-tab-active", nextTab === "offers");
    offersState.ui.offersTabButton.setAttribute("aria-pressed", nextTab === "offers" ? "true" : "false");
  }
  if (offersState.ui.wishlistTabButton != null) {
    offersState.ui.wishlistTabButton.classList.toggle("ropro-trade-offers-tab-active", nextTab === "wishlist");
    offersState.ui.wishlistTabButton.setAttribute("aria-pressed", nextTab === "wishlist" ? "true" : "false");
  }
  if (offersState.ui.myPostsTabButton != null) {
    offersState.ui.myPostsTabButton.classList.toggle("ropro-trade-offers-tab-active", nextTab === "myposts");
    offersState.ui.myPostsTabButton.setAttribute("aria-pressed", nextTab === "myposts" ? "true" : "false");
  }
  if (offersState.ui.offersView != null) {
    offersState.ui.offersView.style.display = nextTab === "offers" ? "" : "none";
  }
  if (offersState.ui.wishlistView != null) {
    offersState.ui.wishlistView.style.display = nextTab === "wishlist" ? "" : "none";
  }
  if (offersState.ui.myPostsView != null) {
    offersState.ui.myPostsView.style.display = nextTab === "myposts" ? "" : "none";
  }
}

function normalizeCooldownSeconds(value) {
  var parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function formatCooldownCountdown(totalSeconds) {
  var normalized = normalizeCooldownSeconds(totalSeconds);
  var hours = Math.floor(normalized / 3600);
  var minutes = Math.floor((normalized % 3600) / 60);
  var seconds = normalized % 60;
  var minuteLabel = String(minutes);
  if (hours > 0 && minutes < 10) {
    minuteLabel = "0" + minuteLabel;
  }
  var secondLabel = seconds < 10 ? "0" + seconds : String(seconds);
  if (hours > 0) {
    return String(hours) + ":" + minuteLabel + ":" + secondLabel;
  }
  return minuteLabel + ":" + secondLabel;
}

function getTradeOfferPostCooldownRemainingSeconds() {
  var nowMs = Date.now();
  var nextPostAtMs = parseInt(offersState.postCooldown.nextPostAtMs, 10);
  if (Number.isFinite(nextPostAtMs) && nextPostAtMs > 0) {
    if (nextPostAtMs > nowMs) {
      return normalizeCooldownSeconds(Math.ceil((nextPostAtMs - nowMs) / 1000));
    }
    return 0;
  }
  return normalizeCooldownSeconds(offersState.postCooldown.remainingSeconds);
}

function stopTradeOfferCooldownTicker() {
  if (offersState.postCooldown.ticker != null) {
    clearInterval(offersState.postCooldown.ticker);
    offersState.postCooldown.ticker = null;
  }
}

function ensureTradeOfferPostCooldownUi() {
  var cooldownNode = offersState.ui.postCooldown;
  if (cooldownNode == null) {
    return;
  }
  var cooldownText = cooldownNode.querySelector(".ropro-trade-offers-post-cooldown-text");
  var cooldownToggle = cooldownNode.querySelector(".ropro-trade-offers-post-cooldown-toggle");
  if (cooldownText == null || cooldownToggle == null) {
    cooldownNode.textContent = "";
    cooldownText = document.createElement("span");
    cooldownText.className = "ropro-trade-offers-post-cooldown-text";
    cooldownToggle = createButton("Hide Timer", "btn-control-sm ropro-trade-offers-post-cooldown-toggle");
    cooldownToggle.setAttribute("aria-label", "Hide cooldown timer");
    cooldownToggle.addEventListener("click", function () {
      offersState.postCooldown.showTimer = offersState.postCooldown.showTimer === false;
      renderTradeOfferPostControls();
    });
    cooldownNode.appendChild(cooldownText);
    cooldownNode.appendChild(cooldownToggle);
  }
  offersState.ui.postCooldownText = cooldownText;
  offersState.ui.postCooldownToggle = cooldownToggle;
}

function renderTradeOfferPostControls() {
  if (offersState.ui.postButton == null) {
    return;
  }
  var postButton = offersState.ui.postButton;
  var cooldownNode = offersState.ui.postCooldown;
  var cooldownTextNode = offersState.ui.postCooldownText != null
    ? offersState.ui.postCooldownText
    : cooldownNode;
  var cooldownToggle = offersState.ui.postCooldownToggle;
  function hideCooldownUi() {
    if (cooldownNode == null) {
      return;
    }
    cooldownNode.style.display = "none";
    if (cooldownTextNode != null) {
      cooldownTextNode.textContent = "";
    }
    if (cooldownToggle != null) {
      cooldownToggle.style.display = "none";
      cooldownToggle.textContent = "Show Timer";
      cooldownToggle.setAttribute("aria-pressed", "false");
      cooldownToggle.setAttribute("aria-label", "Show cooldown timer");
    }
  }
  if (!offersState.tradeOffersPageEnabled || !canViewTradeOffers()) {
    var viewGate = getTradeOffersGate(TRADE_OFFERS_VIEW_GATE);
    var viewPostLockTitle = getTradeOffersGateLockTitle(viewGate, "Posting on Trade Board requires RoPro Rex.");
    postButton.classList.add("ropro-trade-offers-btn-locked");
    postButton.disabled = false;
    postButton.textContent = "Make Offer";
    postButton.setAttribute("title", viewPostLockTitle);
    postButton.setAttribute("aria-disabled", "true");
    hideCooldownUi();
    return;
  }
  if (!canPostTradeOffers()) {
    var postGate = getTradeOffersGate(TRADE_OFFERS_POST_GATE);
    var postLockTitle = getTradeOffersGateLockTitle(postGate, "Posting on Trade Board requires RoPro Rex.");
    postButton.classList.add("ropro-trade-offers-btn-locked");
    postButton.disabled = false;
    postButton.textContent = "Make Offer";
    postButton.setAttribute("title", postLockTitle);
    postButton.setAttribute("aria-disabled", "true");
    hideCooldownUi();
    return;
  }
  postButton.classList.remove("ropro-trade-offers-btn-locked");
  postButton.removeAttribute("title");
  postButton.removeAttribute("aria-disabled");
  var remainingSeconds = getTradeOfferPostCooldownRemainingSeconds();
  if (remainingSeconds > 0) {
    var formatted = formatCooldownCountdown(remainingSeconds);
    var showTimer = offersState.postCooldown.showTimer !== false;
    postButton.disabled = true;
    postButton.textContent = "Make Offer";
    if (cooldownNode != null) {
      cooldownNode.style.display = "";
      if (cooldownTextNode != null) {
        if (showTimer) {
          cooldownTextNode.textContent = "Offer Post Cooldown: " + formatted + " until able to post.";
        } else {
          cooldownTextNode.textContent = "Offer Post Cooldown hidden.";
        }
      }
      if (cooldownToggle != null) {
        cooldownToggle.style.display = "inline-flex";
        cooldownToggle.textContent = showTimer ? "Hide Timer" : "Show Timer";
        cooldownToggle.setAttribute("aria-pressed", showTimer ? "true" : "false");
        cooldownToggle.setAttribute("aria-label", showTimer ? "Hide cooldown timer" : "Show cooldown timer");
      }
    }
    return;
  }
  postButton.disabled = false;
  postButton.textContent = "Make Offer";
  hideCooldownUi();
}

function refreshTradeOfferCooldownState() {
  var remainingSeconds = getTradeOfferPostCooldownRemainingSeconds();
  offersState.postCooldown.remainingSeconds = remainingSeconds;
  if (remainingSeconds <= 0) {
    offersState.postCooldown.nextPostAtMs = 0;
    stopTradeOfferCooldownTicker();
  }
  renderTradeOfferPostControls();
}

function startTradeOfferCooldownTicker() {
  stopTradeOfferCooldownTicker();
  if (getTradeOfferPostCooldownRemainingSeconds() <= 0) {
    refreshTradeOfferCooldownState();
    return;
  }
  offersState.postCooldown.ticker = setInterval(function () {
    refreshTradeOfferCooldownState();
  }, 1000);
  refreshTradeOfferCooldownState();
}

function applyTradeOfferPostCooldownState(remainingSeconds, cooldownSeconds, nextPostAtMs) {
  var normalizedCooldown = normalizeCooldownSeconds(cooldownSeconds);
  if (normalizedCooldown > 0) {
    offersState.postCooldown.cooldownSeconds = normalizedCooldown;
  }
  var normalizedRemaining = normalizeCooldownSeconds(remainingSeconds);
  var normalizedNextPostAtMs = parseInt(nextPostAtMs, 10);
  if (!Number.isFinite(normalizedNextPostAtMs) || normalizedNextPostAtMs <= Date.now()) {
    normalizedNextPostAtMs = normalizedRemaining > 0 ? Date.now() + normalizedRemaining * 1000 : 0;
  }
  offersState.postCooldown.remainingSeconds = normalizedRemaining;
  offersState.postCooldown.nextPostAtMs = normalizedNextPostAtMs;
  if (normalizedRemaining > 0 || normalizedNextPostAtMs > Date.now()) {
    startTradeOfferCooldownTicker();
  } else {
    stopTradeOfferCooldownTicker();
    renderTradeOfferPostControls();
  }
}

function setTradeOfferPostCooldown(remainingSeconds, cooldownSeconds) {
  applyTradeOfferPostCooldownState(
    remainingSeconds,
    cooldownSeconds,
    normalizeCooldownSeconds(remainingSeconds) > 0 ? Date.now() + normalizeCooldownSeconds(remainingSeconds) * 1000 : 0
  );
}

function syncTradeOfferPostCooldownFromPayload(payload) {
  if (payload == null || typeof payload !== "object") {
    return;
  }
  var cooldownSeconds = normalizeCooldownSeconds(
    payload.post_cooldown_seconds != null ? payload.post_cooldown_seconds : payload.cooldown_seconds
  );
  var remainingSeconds = normalizeCooldownSeconds(
    payload.post_retry_after_seconds != null ? payload.post_retry_after_seconds : payload.retry_after_seconds
  );
  var nextPostAtMs = parseInt(
    payload.post_next_at_ms != null ? payload.post_next_at_ms : payload.next_post_at_ms,
    10
  );
  if (!Number.isFinite(nextPostAtMs) || nextPostAtMs <= 0) {
    nextPostAtMs = 0;
  }
  if (remainingSeconds <= 0 && nextPostAtMs > Date.now()) {
    remainingSeconds = Math.ceil((nextPostAtMs - Date.now()) / 1000);
  }
  if (cooldownSeconds <= 0 && remainingSeconds <= 0 && nextPostAtMs <= 0) {
    return;
  }
  applyTradeOfferPostCooldownState(remainingSeconds, cooldownSeconds, nextPostAtMs);
}

var thumbnailFallbackUrl = chrome.runtime.getURL("/images/empty.png");
var thumbnailKnownFallbackToken = "5d30ea2e004abe68a2db3b0d19fff763";
var tradeOffersThumbnailMaxRetries = 2;
var tradeOffersThumbnailRetryCounts = {};

function extractThumbnailUrlFromResponse(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value == null || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      var nested = extractThumbnailUrlFromResponse(value[i]);
      if (typeof nested === "string") {
        return nested;
      }
    }
    return null;
  }
  if (typeof value.imageUrl === "string") {
    return value.imageUrl;
  }
  if (typeof value.thumbnailUrl === "string") {
    return value.thumbnailUrl;
  }
  if (typeof value.url === "string") {
    return value.url;
  }
  if (Array.isArray(value.data) && value.data.length > 0) {
    return extractThumbnailUrlFromResponse(value.data[0]);
  }
  return null;
}

function normalizeThumbnailUrl(value) {
  var rawUrl = extractThumbnailUrlFromResponse(value);
  if (typeof rawUrl !== "string") {
    return null;
  }
  var trimmed = stripTags(rawUrl).trim();
  if (trimmed.length === 0 || trimmed.toUpperCase() === "ERROR") {
    return null;
  }
  if (trimmed.indexOf("//") === 0) {
    trimmed = "https:" + trimmed;
  }
  if (/^http:\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^http:\/\//i, "https://");
  }
  if (!/^https:\/\//i.test(trimmed)) {
    return null;
  }
  if (trimmed.indexOf(thumbnailKnownFallbackToken) !== -1) {
    return null;
  }
  return trimmed;
}

function requestAssetThumbnailUrl(assetId) {
  return new Promise((resolve) => {
    var settled = false;
    var timeout = setTimeout(function () {
      if (settled) {
        return;
      }
      settled = true;
      resolve(null);
    }, 10000);
    chrome.runtime.sendMessage(
      {
        greeting: "PostValidatedURL",
        url: "https://thumbnails.roblox.com/v1/batch",
        jsonData: [
          {
            requestId: assetId + ":undefined:Asset:150x150:webp:regular:0",
            type: "Asset",
            targetId: String(assetId),
            size: "150x150",
            format: "webp",
          },
        ],
      },
      function (data) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(data);
      }
    );
  });
}

async function getThumbnailUrl(assetId) {
  var normalizedAssetId = parseInt(assetId, 10);
  if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
    return null;
  }
  var cacheKey = String(normalizedAssetId);
  if (offersState.thumbnails.urlByAssetId.hasOwnProperty(cacheKey)) {
    return offersState.thumbnails.urlByAssetId[cacheKey];
  }
  if (offersState.thumbnails.inflightByAssetId.hasOwnProperty(cacheKey)) {
    return offersState.thumbnails.inflightByAssetId[cacheKey];
  }
  var loadPromise = (async function () {
    var thumbnailUrl = null;
    for (var attempt = 0; thumbnailUrl == null && attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 200 * (attempt + 1));
        });
      }
      thumbnailUrl = normalizeThumbnailUrl(await requestAssetThumbnailUrl(normalizedAssetId));
    }
    if (thumbnailUrl != null) {
      tradeOffersThumbnailRetryCounts[cacheKey] = 0;
      offersState.thumbnails.urlByAssetId[cacheKey] = thumbnailUrl;
      return thumbnailUrl;
    }
    var retryCount = tradeOffersThumbnailRetryCounts[cacheKey] || 0;
    if (retryCount < tradeOffersThumbnailMaxRetries) {
      tradeOffersThumbnailRetryCounts[cacheKey] = retryCount + 1;
      setTimeout(function () {
        if (!offersState.thumbnails.urlByAssetId.hasOwnProperty(cacheKey)) {
          getThumbnailUrl(normalizedAssetId);
        }
      }, 1200 * (retryCount + 1));
    }
    return null;
  })()
    .catch(function () {
      return null;
    })
    .finally(function () {
      delete offersState.thumbnails.inflightByAssetId[cacheKey];
    });
  offersState.thumbnails.inflightByAssetId[cacheKey] = loadPromise;
  return await loadPromise;
}

function applyThumbnailToImage(imgNode, assetId, frameNode) {
  if (imgNode == null || imgNode.nodeType !== 1) {
    return;
  }
  var normalizedAssetId = parseInt(assetId, 10);
  var fallbackUrl = thumbnailFallbackUrl;
  var requestToken = String(normalizedAssetId) + ":" + Date.now() + ":" + Math.random().toString(36).slice(2);
  imgNode.setAttribute("data-ropro-thumb-token", requestToken);

  var frame = frameNode != null && frameNode.nodeType === 1 ? frameNode : null;

  function markLoaded() {
    if (frame != null) {
      frame.classList.remove("ropro-thumb-loading");
      frame.classList.add("ropro-thumb-loaded");
    }
  }

  function markLoading() {
    if (frame != null) {
      frame.classList.add("ropro-thumb-loading");
      frame.classList.remove("ropro-thumb-loaded");
    }
  }

  function setImageSource(url, allowFallbackRetry) {
    if (imgNode.getAttribute("data-ropro-thumb-token") !== requestToken) {
      return;
    }
    imgNode.onload = function () {
      if (imgNode.getAttribute("data-ropro-thumb-token") !== requestToken) {
        return;
      }
      imgNode.onload = null;
      imgNode.onerror = null;
      markLoaded();
    };
    imgNode.onerror = function () {
      if (imgNode.getAttribute("data-ropro-thumb-token") !== requestToken) {
        return;
      }
      if (allowFallbackRetry && imgNode.src !== fallbackUrl) {
        setImageSource(fallbackUrl, false);
        return;
      }
      imgNode.onload = null;
      imgNode.onerror = null;
      markLoaded();
    };
    imgNode.src = url;
  }

  if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
    markLoaded();
    setImageSource(fallbackUrl, false);
    return;
  }

  var cacheKey = String(normalizedAssetId);
  var cachedThumbnailUrl = offersState.thumbnails.urlByAssetId[cacheKey];
  if (typeof cachedThumbnailUrl === "string" && cachedThumbnailUrl.length > 0) {
    markLoaded();
    setImageSource(cachedThumbnailUrl, true);
    return;
  }

  markLoading();

  getThumbnailUrl(normalizedAssetId)
    .then(function (thumbnailUrl) {
      setImageSource(thumbnailUrl != null ? thumbnailUrl : fallbackUrl, true);
    })
    .catch(function () {
      setImageSource(fallbackUrl, false);
    });
}

function createThumbnailFrame(imageClassName, altText, assetId) {
  var frame = document.createElement("div");
  frame.className = "ropro-trade-thumb-frame";
  frame.classList.add(
    imageClassName === "ropro-trade-offer-thumb"
      ? "ropro-trade-thumb-frame-card"
      : "ropro-trade-thumb-frame-picker"
  );
  var image = document.createElement("img");
  image.className = imageClassName;
  image.loading = "lazy";
  image.alt = stripTags(String(altText || ""));
  frame.appendChild(image);
  applyThumbnailToImage(image, assetId, frame);
  return frame;
}

function getTradeOffersFilterItemIds() {
  var ids = [];
  var seen = {};
  var mergedFilters = offersState.filters.selectedItems.concat(offersState.filters.selectedTerms);
  for (var i = 0; i < mergedFilters.length; i++) {
    var item = mergedFilters[i];
    if (item == null || !Number.isFinite(parseInt(item.id, 10))) {
      continue;
    }
    var itemId = parseInt(item.id, 10);
    if (itemId === 0 || seen[String(itemId)]) {
      continue;
    }
    seen[String(itemId)] = true;
    ids.push(itemId);
  }
  return ids;
}

function buildTradeOffersQueryPayload(page) {
  var payload = { page: page };
  var filterItemIds = getTradeOffersFilterItemIds();
  if (filterItemIds.length > 0) {
    payload.item_ids = filterItemIds.slice(0, TRADE_OFFERS_FILTER_QUERY_ITEM_LIMIT);
  }
  payload.item_side = offersState.filters.side;
  payload.sort = offersState.filters.sort === "oldest" ? "oldest" : "newest";
  return payload;
}

function getTradeOffersQueryFilterOverflowCount() {
  return Math.max(0, getTradeOffersFilterItemIds().length - TRADE_OFFERS_FILTER_QUERY_ITEM_LIMIT);
}

function buildMyPostsQueryPayload(page) {
  return {
    page: page,
    sort: "newest",
    my_posts_only: true,
  };
}

function hasActiveTradeOffersFilters() {
  return getTradeOffersFilterItemIds().length > 0;
}

function ensureShellMounted() {
  if (offersState.ui.shell != null) {
    return;
  }
  var host =
    document.querySelector("#container-main .content") ||
    document.querySelector("#container-main") ||
    document.querySelector("main") ||
    document.body;
  if (host == null) {
    return;
  }
  var existing = document.querySelector(".ropro-trade-offers-shell");
  if (existing != null) {
    offersState.ui.shell = existing;
    offersState.ui.offersView = existing.querySelector(".ropro-trade-offers-tab-content-offers");
    offersState.ui.wishlistView = existing.querySelector(".ropro-trade-offers-tab-content-wishlist");
    offersState.ui.myPostsView = existing.querySelector(".ropro-trade-offers-tab-content-my-posts");
    offersState.ui.list = existing.querySelector(".ropro-trade-offers-tab-content-offers .ropro-trade-offers-list");
    offersState.ui.status = existing.querySelector(".ropro-trade-offers-tab-content-offers .ropro-trade-offers-status");
    offersState.ui.wishlistStatus = existing.querySelector(".ropro-trade-offers-wishlist-status");
    offersState.ui.myPostsStatus = existing.querySelector(".ropro-trade-offers-my-posts-status");
    offersState.ui.myPostsList = existing.querySelector(".ropro-trade-offers-my-posts-list");
    offersState.ui.loadMore = existing.querySelector(".ropro-trade-offers-tab-content-offers .ropro-trade-offers-load-more");
    offersState.ui.myPostsLoadMore = existing.querySelector(".ropro-trade-offers-my-posts-load-more");
    offersState.ui.lockBox = existing.querySelector(".ropro-trade-offers-lock");
    offersState.ui.postButton = existing.querySelector(".ropro-trade-offers-post-btn");
    offersState.ui.refreshButton = existing.querySelector(".ropro-trade-offers-refresh-btn");
    offersState.ui.addWishlistItemsButton = existing.querySelector(".ropro-trade-offers-add-wishlist-btn");
    offersState.ui.addMyItemsButton = existing.querySelector(".ropro-trade-offers-add-my-items-btn");
    offersState.ui.offersTabButton = existing.querySelector(".ropro-trade-offers-offers-tab-btn");
    offersState.ui.wishlistTabButton = existing.querySelector(".ropro-trade-offers-wishlist-tab-btn");
    offersState.ui.myPostsTabButton = existing.querySelector(".ropro-trade-offers-my-posts-tab-btn");
    offersState.ui.myPostsDeleteAllButton = existing.querySelector(".ropro-trade-offers-delete-all-btn");
    offersState.ui.filtersPanel = existing.querySelector(".ropro-trade-offers-filters");
    offersState.ui.appliedFiltersSection = existing.querySelector(".ropro-trade-offers-applied-filters");
    offersState.ui.appliedFilterChips = existing.querySelector(".ropro-trade-offers-filter-chips");
    offersState.ui.sideSelect = existing.querySelector(".ropro-trade-offers-side-select");
    offersState.ui.postCooldown = existing.querySelector(".ropro-trade-offers-post-cooldown");
    offersState.ui.wishlistCurrentList = existing.querySelector(".ropro-trade-offers-wishlist-current-list");
    ensureTradeOfferPostCooldownUi();
    renderTradeOfferTierAccessControls();
    setActiveTradeOffersTab(offersState.activeTab);
    renderTradeOfferPostControls();
    updateMyPostsDeleteAllButtonState();
    return;
  }

  var shell = document.createElement("div");
  shell.className = "ropro-trade-offers-shell";

  var header = document.createElement("div");
  header.className = "ropro-trade-offers-header";
  var headingBlock = document.createElement("div");
  headingBlock.className = "ropro-trade-offers-heading";
  var title = createRoProTitleHeading("ropro-trade-offers-title", "Trade Board");
  var subtitle = document.createElement("p");
  subtitle.className = "ropro-trade-offers-subtitle";
  headingBlock.appendChild(title);
  headingBlock.appendChild(subtitle);

  var actions = document.createElement("div");
  actions.className = "ropro-trade-offers-actions";
  var refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "ropro-trade-offers-refresh-btn";
  refreshButton.setAttribute("aria-label", "Refresh Trade Board");
  refreshButton.title = "Refresh Trade Board";
  var refreshIcon = document.createElement("img");
  refreshIcon.src = chrome.runtime.getURL("/images/reload.png");
  refreshIcon.alt = "";
  refreshIcon.setAttribute("aria-hidden", "true");
  refreshButton.appendChild(refreshIcon);
  var offersTabButton = createButton(
    "Trade Board",
    "btn-control-sm ropro-trade-offers-tab-btn ropro-trade-offers-offers-tab-btn"
  );
  offersTabButton.setAttribute("aria-pressed", "true");
  var wishlistTabButton = createButton(
    "Wishlist",
    "btn-control-sm ropro-trade-offers-tab-btn ropro-trade-offers-wishlist-tab-btn"
  );
  wishlistTabButton.setAttribute("aria-pressed", "false");
  var myPostsTabButton = createButton(
    "My Posts",
    "btn-control-sm ropro-trade-offers-tab-btn ropro-trade-offers-my-posts-tab-btn"
  );
  myPostsTabButton.setAttribute("aria-pressed", "false");
  var postButton = createButton(
    "Make Offer",
    "btn-control-sm ropro-trade-offers-tab-btn ropro-trade-offers-post-btn ropro-trade-offers-post-tab-btn"
  );
  actions.appendChild(refreshButton);
  actions.appendChild(offersTabButton);
  actions.appendChild(wishlistTabButton);
  actions.appendChild(myPostsTabButton);
  actions.appendChild(postButton);
  var postCooldownNode = document.createElement("div");
  postCooldownNode.className = "ropro-trade-offers-post-cooldown";
  postCooldownNode.style.display = "none";
  header.appendChild(headingBlock);
  header.appendChild(actions);

  var lockBox = document.createElement("div");
  lockBox.className = "ropro-trade-offers-lock";
  lockBox.style.display = "none";

  var offersView = document.createElement("div");
  offersView.className = "ropro-trade-offers-tab-content ropro-trade-offers-tab-content-offers";

  var filtersPanel = document.createElement("div");
  filtersPanel.className = "ropro-trade-offers-filters";

  var filtersHeader = document.createElement("div");
  filtersHeader.className = "ropro-trade-offers-filters-header";
  var filtersTitle = document.createElement("div");
  filtersTitle.className = "ropro-trade-offer-section-title";
  filtersTitle.textContent = "Listing Filters";
  var clearFiltersButton = createButton("Clear Filters", "btn-control-sm");
  clearFiltersButton.classList.add("ropro-trade-offers-clear-filters");
  filtersHeader.appendChild(filtersTitle);
  filtersHeader.appendChild(clearFiltersButton);

  var filtersSearchRow = document.createElement("div");
  filtersSearchRow.className = "ropro-trade-offers-filters-search-row";
  var filterSearchField = createClearableSearchInput(
    "Search items and add to listing filters",
    "form-control input-field ropro-trade-offers-filter-search-input",
    "ropro-trade-offers-search-input-wrap ropro-trade-offers-filter-search-wrap"
  );
  var filterSearchInput = filterSearchField.input;
  var filterSearchResults = document.createElement("div");
  filterSearchResults.className = "ropro-trade-offers-filter-results";
  filtersSearchRow.appendChild(filterSearchField.wrapper);
  filtersSearchRow.appendChild(filterSearchResults);

  var termFiltersSection = document.createElement("div");
  termFiltersSection.className = "ropro-trade-offers-term-filters";
  var termFiltersTitle = document.createElement("div");
  termFiltersTitle.className = "ropro-trade-offer-section-title";
  termFiltersTitle.textContent = "Trading Terms";
  var termFiltersChips = document.createElement("div");
  termFiltersChips.className = "ropro-trade-offers-selected ropro-trade-offers-term-filter-chips";
  for (var termIndex = 0; termIndex < TRADE_TERM_TOKENS.length; termIndex++) {
    var termToken = TRADE_TERM_TOKENS[termIndex];
    if (termToken.key === "robux") {
      continue;
    }
    var termChip = createButton(termToken.name, "ropro-trade-offers-chip ropro-trade-offers-term-filter-chip");
    termChip.setAttribute("data-term-id", String(termToken.id));
    termFiltersChips.appendChild(termChip);
  }
  termFiltersSection.appendChild(termFiltersTitle);
  termFiltersSection.appendChild(termFiltersChips);

  var appliedFiltersSection = document.createElement("div");
  appliedFiltersSection.className = "ropro-trade-offers-applied-filters";
  appliedFiltersSection.style.display = "none";
  var appliedFiltersTitle = document.createElement("div");
  appliedFiltersTitle.className = "ropro-trade-offer-section-title";
  appliedFiltersTitle.textContent = "Applied Filters";
  var filterChips = document.createElement("div");
  filterChips.className = "ropro-trade-offers-selected ropro-trade-offers-filter-chips";
  appliedFiltersSection.appendChild(appliedFiltersTitle);
  appliedFiltersSection.appendChild(filterChips);

  var controlsRow = document.createElement("div");
  controlsRow.className = "ropro-trade-offers-filter-controls";

  var sideControl = document.createElement("label");
  sideControl.className = "ropro-trade-offers-select-control";
  var sideLabel = document.createElement("span");
  sideLabel.className = "ropro-trade-offers-select-label";
  sideLabel.textContent = "Side";
  var sideSelect = document.createElement("select");
  sideSelect.className = "form-control input-field ropro-trade-offers-side-select";
  var sideOptions = [
    { value: "either", label: "Either Side" },
    { value: "wanted", label: "Wants Side" },
    { value: "offered", label: "Offering Side" },
  ];
  for (var sideOptionIndex = 0; sideOptionIndex < sideOptions.length; sideOptionIndex++) {
    var sideOption = document.createElement("option");
    sideOption.value = sideOptions[sideOptionIndex].value;
    sideOption.textContent = sideOptions[sideOptionIndex].label;
    sideSelect.appendChild(sideOption);
  }
  sideSelect.value = offersState.filters.side;

  sideControl.appendChild(sideLabel);
  sideControl.appendChild(sideSelect);

  var sortControl = document.createElement("label");
  sortControl.className = "ropro-trade-offers-select-control";
  var sortLabel = document.createElement("span");
  sortLabel.className = "ropro-trade-offers-select-label";
  sortLabel.textContent = "Sort";
  var sortSelect = document.createElement("select");
  sortSelect.className = "form-control input-field ropro-trade-offers-sort-select";
  var sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
  ];
  for (var sortOptionIndex = 0; sortOptionIndex < sortOptions.length; sortOptionIndex++) {
    var sortOption = document.createElement("option");
    sortOption.value = sortOptions[sortOptionIndex].value;
    sortOption.textContent = sortOptions[sortOptionIndex].label;
    sortSelect.appendChild(sortOption);
  }
  sortSelect.value = offersState.filters.sort;
  sortControl.appendChild(sortLabel);
  sortControl.appendChild(sortSelect);

  var addWishlistItemsButton = createButton("Add Wishlist Items", "btn-control-sm ropro-trade-offers-add-wishlist-btn");
  var addMyItemsButton = createButton("Looking For My Items", "btn-control-sm ropro-trade-offers-add-my-items-btn");
  controlsRow.appendChild(sideControl);
  controlsRow.appendChild(sortControl);
  controlsRow.appendChild(addWishlistItemsButton);
  controlsRow.appendChild(addMyItemsButton);

  filtersPanel.appendChild(filtersHeader);
  filtersPanel.appendChild(filtersSearchRow);
  filtersPanel.appendChild(termFiltersSection);
  filtersPanel.appendChild(controlsRow);

  var status = document.createElement("div");
  status.className = "ropro-trade-offers-status";

  var list = document.createElement("div");
  list.className = "ropro-trade-offers-list";

  var loadMore = createButton("Load More", "btn-secondary-md ropro-trade-offers-load-more");
  loadMore.style.display = "none";

  offersView.appendChild(filtersPanel);
  offersView.appendChild(appliedFiltersSection);
  offersView.appendChild(status);
  offersView.appendChild(list);
  offersView.appendChild(loadMore);

  var wishlistView = document.createElement("div");
  wishlistView.className = "ropro-trade-offers-tab-content ropro-trade-offers-tab-content-wishlist";

  var wishlistPanel = document.createElement("div");
  wishlistPanel.className = "ropro-trade-offers-filters ropro-trade-offers-wishlist-panel";
  var wishlistPanelTitle = document.createElement("div");
  wishlistPanelTitle.className = "ropro-trade-offer-section-title";
  wishlistPanelTitle.textContent = "Wishlist";
  var wishlistPanelHint = document.createElement("div");
  wishlistPanelHint.className = "ropro-trade-offers-wishlist-copy";
  wishlistPanelHint.textContent = "Search limited items and add or remove them from your wishlist.";
  var wishlistSearchField = createClearableSearchInput(
    "Search limited items",
    "form-control input-field ropro-trade-offers-wishlist-search",
    "ropro-trade-offers-search-input-wrap ropro-trade-offers-wishlist-search-wrap"
  );
  var wishlistSearchInput = wishlistSearchField.input;
  var wishlistResults = document.createElement("div");
  wishlistResults.className = "ropro-trade-offers-filter-results ropro-trade-offers-wishlist-results";
  var wishlistCurrentTitle = document.createElement("div");
  wishlistCurrentTitle.className = "ropro-trade-offer-section-title";
  wishlistCurrentTitle.textContent = "Wishlist";
  var wishlistCurrentList = document.createElement("div");
  wishlistCurrentList.className = "ropro-trade-offers-item-picker ropro-trade-offers-wishlist-current-list";
  var wishlistStatus = document.createElement("div");
  wishlistStatus.className = "ropro-trade-offers-wishlist-status";
  wishlistStatus.textContent = "Type at least 2 characters to search.";
  wishlistPanel.appendChild(wishlistPanelTitle);
  wishlistPanel.appendChild(wishlistPanelHint);
  wishlistPanel.appendChild(wishlistSearchField.wrapper);
  wishlistPanel.appendChild(wishlistResults);
  wishlistPanel.appendChild(wishlistCurrentTitle);
  wishlistPanel.appendChild(wishlistCurrentList);
  wishlistPanel.appendChild(wishlistStatus);
  wishlistView.appendChild(wishlistPanel);

  var myPostsView = document.createElement("div");
  myPostsView.className = "ropro-trade-offers-tab-content ropro-trade-offers-tab-content-my-posts";
  myPostsView.style.display = "none";

  var myPostsPanel = document.createElement("div");
  myPostsPanel.className = "ropro-trade-offers-filters ropro-trade-offers-my-posts-panel";
  var myPostsPanelHeader = document.createElement("div");
  myPostsPanelHeader.className = "ropro-trade-offers-filters-header";
  var myPostsPanelTitle = document.createElement("div");
  myPostsPanelTitle.className = "ropro-trade-offer-section-title";
  myPostsPanelTitle.textContent = "My Posts";
  var myPostsDeleteAllButton = createButton(
    "Delete All",
    "btn-control-sm ropro-trade-offers-delete-all-btn"
  );
  myPostsDeleteAllButton.disabled = true;
  myPostsPanelHeader.appendChild(myPostsPanelTitle);
  myPostsPanelHeader.appendChild(myPostsDeleteAllButton);
  var myPostsPanelHint = document.createElement("div");
  myPostsPanelHint.className = "ropro-trade-offers-my-posts-copy";
  myPostsPanelHint.textContent = "Manage and delete your Trade Board posts.";
  myPostsPanel.appendChild(myPostsPanelHeader);
  myPostsPanel.appendChild(myPostsPanelHint);

  var myPostsStatus = document.createElement("div");
  myPostsStatus.className = "ropro-trade-offers-status ropro-trade-offers-my-posts-status";
  myPostsStatus.textContent = "Loading your posts...";

  var myPostsList = document.createElement("div");
  myPostsList.className = "ropro-trade-offers-list ropro-trade-offers-my-posts-list";

  var myPostsLoadMore = createButton(
    "Load More",
    "btn-secondary-md ropro-trade-offers-load-more ropro-trade-offers-my-posts-load-more"
  );
  myPostsLoadMore.style.display = "none";

  myPostsView.appendChild(myPostsPanel);
  myPostsView.appendChild(myPostsStatus);
  myPostsView.appendChild(myPostsList);
  myPostsView.appendChild(myPostsLoadMore);

  shell.appendChild(header);
  shell.appendChild(postCooldownNode);
  shell.appendChild(lockBox);
  shell.appendChild(offersView);
  shell.appendChild(wishlistView);
  shell.appendChild(myPostsView);

  host.insertBefore(shell, host.firstChild || null);

  offersState.ui.shell = shell;
  offersState.ui.offersView = offersView;
  offersState.ui.wishlistView = wishlistView;
  offersState.ui.myPostsView = myPostsView;
  offersState.ui.list = list;
  offersState.ui.status = status;
  offersState.ui.wishlistStatus = wishlistStatus;
  offersState.ui.wishlistCurrentList = wishlistCurrentList;
  offersState.ui.myPostsStatus = myPostsStatus;
  offersState.ui.myPostsList = myPostsList;
  offersState.ui.loadMore = loadMore;
  offersState.ui.myPostsLoadMore = myPostsLoadMore;
  offersState.ui.lockBox = lockBox;
  offersState.ui.postButton = postButton;
  offersState.ui.refreshButton = refreshButton;
  offersState.ui.addWishlistItemsButton = addWishlistItemsButton;
  offersState.ui.addMyItemsButton = addMyItemsButton;
  offersState.ui.sideSelect = sideSelect;
  offersState.ui.offersTabButton = offersTabButton;
  offersState.ui.wishlistTabButton = wishlistTabButton;
  offersState.ui.myPostsTabButton = myPostsTabButton;
  offersState.ui.myPostsDeleteAllButton = myPostsDeleteAllButton;
  offersState.ui.filtersPanel = filtersPanel;
  offersState.ui.appliedFiltersSection = appliedFiltersSection;
  offersState.ui.appliedFilterChips = filterChips;
  offersState.ui.postCooldown = postCooldownNode;
  setTradeBoardLoadingStatus();
  ensureTradeOfferPostCooldownUi();
  renderTradeOfferTierAccessControls();

  refreshButton.addEventListener("click", function () {
    if (!canViewTradeOffers()) {
      openUpgradeModalForGate(TRADE_OFFERS_VIEW_GATE, "plus", "Trade Board");
      return;
    }
    setActiveTradeOffersTab("offers");
    loadTradeOffers(true);
  });
  offersTabButton.addEventListener("click", function () {
    if (!canViewTradeOffers()) {
      openUpgradeModalForGate(TRADE_OFFERS_VIEW_GATE, "plus", "Trade Board");
      return;
    }
    setActiveTradeOffersTab("offers");
  });
  wishlistTabButton.addEventListener("click", function () {
    if (!canManageTradeOffersWishlist()) {
      openUpgradeModalForGate(TRADE_OFFERS_WISHLIST_GATE, "rex", "Trade Board More Options");
      return;
    }
    setActiveTradeOffersTab("wishlist");
    if (offersState.filters.myWishlistItems.length === 0) {
      loadMyWishlistItems(false);
    }
  });
  myPostsTabButton.addEventListener("click", function () {
    if (!canPostTradeOffers()) {
      openUpgradeModalForGate(TRADE_OFFERS_POST_GATE, "rex", "My Posts");
      return;
    }
    setActiveTradeOffersTab("myposts");
    if (!offersState.myPostsLoadedOnce) {
      loadMyTradePosts(true);
    }
  });
  postButton.addEventListener("click", function () {
    if (!canPostTradeOffers()) {
      openUpgradeModalForGate(TRADE_OFFERS_POST_GATE, "rex", "Posting on Trade Board");
      return;
    }
    var remainingSeconds = getTradeOfferPostCooldownRemainingSeconds();
    if (remainingSeconds > 0) {
      setStatusText("You can post again in " + formatCooldownCountdown(remainingSeconds) + ".");
      renderTradeOfferPostControls();
      return;
    }
    setActiveTradeOffersTab("offers");
    openComposerModal();
  });
  loadMore.addEventListener("click", function () {
    if (offersState.loading || !offersState.hasMore) {
      return;
    }
    loadTradeOffers(false);
  });
  myPostsLoadMore.addEventListener("click", function () {
    if (offersState.myPostsLoading || !offersState.myPostsHasMore) {
      return;
    }
    loadMyTradePosts(false);
  });
  myPostsDeleteAllButton.addEventListener("click", function () {
    openMyPostsDeleteAllModal();
  });

  bindClearSearchInput(
    filterSearchInput,
    filterSearchField.clearButton,
    function (event) {
      offersState.filters.searchQuery = String(event.target.value || "");
      queueBoardFilterSearch(offersState.filters.searchQuery);
    },
    function () {
      offersState.filters.searchQuery = "";
      offersState.filters.searchRows = [];
      renderBoardFilterSearchResults();
    }
  );
  bindClearSearchInput(
    wishlistSearchInput,
    wishlistSearchField.clearButton,
    function (event) {
      offersState.filters.wishlistSearchQuery = String(event.target.value || "");
      queueWishlistTabSearch(offersState.filters.wishlistSearchQuery);
    },
    function () {
      offersState.filters.wishlistSearchQuery = "";
      offersState.filters.wishlistSearchRows = [];
      renderWishlistTabSearchResults();
      setWishlistStatusText("Type at least 2 characters to search.");
    }
  );

  sideSelect.addEventListener("change", function (event) {
    var nextSide = String(event.target.value || "either");
    if (nextSide !== "either" && nextSide !== "wanted" && nextSide !== "offered") {
      nextSide = "either";
    }
    if (offersState.filters.side === nextSide) {
      return;
    }
    offersState.filters.side = nextSide;
    loadTradeOffers(true);
  });
  sortSelect.addEventListener("change", function (event) {
    var nextSort = String(event.target.value || "newest").toLowerCase() === "oldest" ? "oldest" : "newest";
    if (offersState.filters.sort === nextSort) {
      return;
    }
    offersState.filters.sort = nextSort;
    loadTradeOffers(true);
  });

  addWishlistItemsButton.addEventListener("click", async function () {
    if (!canManageTradeOffersWishlist()) {
      openUpgradeModalForGate(TRADE_OFFERS_WISHLIST_GATE, "rex", "Trade Board More Options");
      return;
    }
    if (offersState.filters.myWishlistItems.length === 0) {
      var wishlistLoadResult = await loadMyWishlistItems(true);
      if (wishlistLoadResult == null || wishlistLoadResult.ok !== true) {
        setStatusText(
          stripTags(
            String(
              (wishlistLoadResult != null && typeof wishlistLoadResult.error === "string"
                ? wishlistLoadResult.error
                : "") || "Unable to load wishlist items."
            )
          )
        );
        return;
      }
    }
    if (offersState.filters.myWishlistItems.length === 0) {
      setStatusText("No wishlist items found. Add wishlist items first.");
      return;
    }
    var addedCount = applyWishlistItemsToBoardFilters();
    offersState.filters.appliedChipExpanded = false;
    renderBoardFilterChips();
    renderBoardFilterSearchResults();
    var overflowCount = getTradeOffersQueryFilterOverflowCount();
    var overflowCopy = overflowCount > 0
      ? " Showing first " + addCommas(TRADE_OFFERS_FILTER_QUERY_ITEM_LIMIT) + " filters in results."
      : "";
    if (addedCount <= 0) {
      setStatusText("Wishlist items are already applied." + overflowCopy);
      return;
    }
    setStatusText(
      "Added " + addCommas(addedCount) + " wishlist item" + (addedCount === 1 ? "" : "s") + " to filters." + overflowCopy
    );
    loadTradeOffers(true);
  });
  addMyItemsButton.addEventListener("click", async function () {
    if (!canManageTradeOffersWishlist()) {
      openUpgradeModalForGate(TRADE_OFFERS_WISHLIST_GATE, "rex", "Trade Board More Options");
      return;
    }
    setStatusText("Loading your tradable inventory...");
    var tradableRowsResult = await loadMyTradableInventoryRowsForBoardFilters();
    if (!tradableRowsResult.ok) {
      setStatusText(stripTags(String(tradableRowsResult.error || "Unable to load your tradable inventory.")));
      return;
    }
    var tradableRows = Array.isArray(tradableRowsResult.rows) ? tradableRowsResult.rows : [];
    var previousSide = offersState.filters.side;
    var addedCount = applyMyTradableItemsToBoardFilters();
    offersState.filters.side = "wanted";
    if (offersState.ui.sideSelect != null) {
      offersState.ui.sideSelect.value = "wanted";
    }
    offersState.filters.appliedChipExpanded = false;
    renderBoardFilterChips();
    renderBoardFilterSearchResults();
    var myItemsOverflowCount = getTradeOffersQueryFilterOverflowCount();
    var myItemsOverflowCopy = myItemsOverflowCount > 0
      ? " Showing first " + addCommas(TRADE_OFFERS_FILTER_QUERY_ITEM_LIMIT) + " filters in results."
      : "";
    if (addedCount <= 0) {
      if (tradableRows.length === 0) {
        if (previousSide !== "wanted") {
          setStatusText("No tradable items found. Listing filters are now set to Wants Side." + myItemsOverflowCopy);
          loadTradeOffers(true);
          return;
        }
        setStatusText("No tradable items found in your inventory." + myItemsOverflowCopy);
        return;
      }
      if (previousSide !== "wanted") {
        setStatusText("Set listing filters to Wants Side using your tradable items." + myItemsOverflowCopy);
        loadTradeOffers(true);
        return;
      }
      setStatusText("Your tradable items are already applied." + myItemsOverflowCopy);
      return;
    }
    setStatusText(
      "Added " + addCommas(addedCount) + " of your tradable item" + (addedCount === 1 ? "" : "s") + " to wants-side filters." + myItemsOverflowCopy
    );
    loadTradeOffers(true);
  });

  termFiltersChips.addEventListener("click", function (event) {
    var chip = event.target.closest(".ropro-trade-offers-term-filter-chip");
    if (!(chip instanceof HTMLElement)) {
      return;
    }
    var termId = parseInt(chip.getAttribute("data-term-id"), 10);
    var termToken = getTradeTermTokenById(termId);
    if (termToken == null) {
      return;
    }
    var existingIndex = -1;
    for (var termFilterIndex = 0; termFilterIndex < offersState.filters.selectedTerms.length; termFilterIndex++) {
      if (parseInt(offersState.filters.selectedTerms[termFilterIndex].id, 10) === termToken.id) {
        existingIndex = termFilterIndex;
        break;
      }
    }
    if (existingIndex >= 0) {
      offersState.filters.selectedTerms.splice(existingIndex, 1);
    } else {
      offersState.filters.selectedTerms.push({
        id: termToken.id,
        name: termToken.name,
        isTerm: true,
      });
    }
    renderBoardTermFilterChips();
    renderBoardFilterChips();
    loadTradeOffers(true);
  });

  clearFiltersButton.addEventListener("click", function () {
    offersState.filters.selectedItems = [];
    offersState.filters.selectedTerms = [];
    offersState.filters.appliedChipExpanded = false;
    offersState.filters.searchRows = [];
    offersState.filters.searchQuery = "";
    offersState.filters.side = "either";
    offersState.filters.sort = "newest";
    filterSearchInput.value = "";
    filterSearchField.clearButton.style.display = "none";
    sideSelect.value = "either";
    sortSelect.value = "newest";
    renderBoardTermFilterChips();
    renderBoardFilterChips();
    renderBoardFilterSearchResults();
    loadTradeOffers(true);
  });

  setActiveTradeOffersTab("offers");
  renderBoardTermFilterChips();
  renderTradeOfferPostControls();
}

function renderBoardTermFilterChips() {
  if (offersState.ui.filtersPanel == null) {
    return;
  }
  var termButtons = offersState.ui.filtersPanel.querySelectorAll(".ropro-trade-offers-term-filter-chip");
  if (termButtons == null || termButtons.length === 0) {
    return;
  }
  var selectedTermMap = {};
  for (var i = 0; i < offersState.filters.selectedTerms.length; i++) {
    selectedTermMap[String(offersState.filters.selectedTerms[i].id)] = true;
  }
  for (var buttonIndex = 0; buttonIndex < termButtons.length; buttonIndex++) {
    var termId = String(termButtons[buttonIndex].getAttribute("data-term-id") || "");
    termButtons[buttonIndex].classList.toggle(
      "ropro-trade-offers-term-filter-chip-active",
      selectedTermMap[termId] === true
    );
    termButtons[buttonIndex].setAttribute("aria-pressed", selectedTermMap[termId] === true ? "true" : "false");
  }
}

function renderBoardFilterChips() {
  if (offersState.ui.appliedFiltersSection == null || offersState.ui.appliedFilterChips == null) {
    return;
  }
  var chipsNode = offersState.ui.appliedFilterChips;
  chipsNode.textContent = "";
  var seenFilterIds = {};
  var chipRows = [];
  for (var i = 0; i < offersState.filters.selectedItems.length; i++) {
    var selectedItem = offersState.filters.selectedItems[i];
    if (selectedItem == null || !Number.isFinite(parseInt(selectedItem.id, 10))) {
      continue;
    }
    var itemId = String(parseInt(selectedItem.id, 10));
    if (seenFilterIds[itemId] === true) {
      continue;
    }
    seenFilterIds[itemId] = true;
    chipRows.push({
      type: "item",
      id: selectedItem.id,
      name: selectedItem.name,
    });
  }
  for (var termIndex = 0; termIndex < offersState.filters.selectedTerms.length; termIndex++) {
    var selectedTerm = offersState.filters.selectedTerms[termIndex];
    if (selectedTerm == null || !Number.isFinite(parseInt(selectedTerm.id, 10))) {
      continue;
    }
    var termIdKey = String(parseInt(selectedTerm.id, 10));
    if (seenFilterIds[termIdKey] === true) {
      continue;
    }
    seenFilterIds[termIdKey] = true;
    chipRows.push({
      type: "term",
      id: selectedTerm.id,
      name: selectedTerm.name,
    });
  }
  if (chipRows.length === 0) {
    offersState.filters.appliedChipExpanded = false;
    offersState.ui.appliedFiltersSection.style.display = "none";
    return;
  }
  var shouldCollapse = chipRows.length > TRADE_OFFERS_APPLIED_FILTER_CHIP_COLLAPSE_LIMIT;
  if (!shouldCollapse) {
    offersState.filters.appliedChipExpanded = false;
  }
  var isExpanded = offersState.filters.appliedChipExpanded === true;
  var visibleCount = shouldCollapse && !isExpanded
    ? TRADE_OFFERS_APPLIED_FILTER_CHIP_COLLAPSE_LIMIT
    : chipRows.length;
  for (var chipIndex = 0; chipIndex < visibleCount; chipIndex++) {
    var chipRow = chipRows[chipIndex];
    var chip = createButton(chipRow.name + " \u00D7", "ropro-trade-offers-chip ropro-trade-offers-chip-applied");
    chip.addEventListener("click", function (row) {
      return function () {
        if (row.type === "term") {
          offersState.filters.selectedTerms = offersState.filters.selectedTerms.filter(function (entry) {
            return parseInt(entry.id, 10) !== parseInt(row.id, 10);
          });
          renderBoardTermFilterChips();
        } else {
          offersState.filters.selectedItems = offersState.filters.selectedItems.filter(function (entry) {
            return String(entry.id) !== String(row.id);
          });
          renderBoardFilterSearchResults();
        }
        renderBoardFilterChips();
        loadTradeOffers(true);
      };
    }(chipRow));
    chipsNode.appendChild(chip);
  }
  if (shouldCollapse) {
    var hiddenCount = Math.max(0, chipRows.length - TRADE_OFFERS_APPLIED_FILTER_CHIP_COLLAPSE_LIMIT);
    var expandLabel = isExpanded ? "Show Less" : "... +" + addCommas(hiddenCount) + " More";
    var expandButton = createButton(
      expandLabel,
      "ropro-trade-offers-chip ropro-trade-offers-chip-expand"
    );
    expandButton.setAttribute("aria-pressed", isExpanded ? "true" : "false");
    expandButton.addEventListener("click", function () {
      offersState.filters.appliedChipExpanded = !offersState.filters.appliedChipExpanded;
      renderBoardFilterChips();
    });
    chipsNode.appendChild(expandButton);
  }
  offersState.ui.appliedFiltersSection.style.display = "";
}

function applyWishlistItemsToBoardFilters() {
  var seen = {};
  for (var selectedIndex = 0; selectedIndex < offersState.filters.selectedItems.length; selectedIndex++) {
    var selectedItem = offersState.filters.selectedItems[selectedIndex];
    if (selectedItem == null || !Number.isFinite(parseInt(selectedItem.id, 10))) {
      continue;
    }
    seen[String(parseInt(selectedItem.id, 10))] = true;
  }
  var addedCount = 0;
  for (var wishlistIndex = 0; wishlistIndex < offersState.filters.myWishlistItems.length; wishlistIndex++) {
    var wishlistItem = offersState.filters.myWishlistItems[wishlistIndex];
    if (wishlistItem == null || !Number.isFinite(parseInt(wishlistItem.id, 10))) {
      continue;
    }
    var wishlistId = parseInt(wishlistItem.id, 10);
    if (seen[String(wishlistId)] === true) {
      continue;
    }
    seen[String(wishlistId)] = true;
    offersState.filters.selectedItems.push({
      id: wishlistId,
      name: stripTags(String(wishlistItem.name || "Item " + wishlistId)),
      rap: Number.isFinite(parseInt(wishlistItem.rap, 10)) ? parseInt(wishlistItem.rap, 10) : 0,
      value: Number.isFinite(parseInt(wishlistItem.value, 10)) ? parseInt(wishlistItem.value, 10) : -1,
      projected: wishlistItem.projected === true,
      demand: Number.isFinite(parseInt(wishlistItem.demand, 10)) ? parseInt(wishlistItem.demand, 10) : null,
    });
    addedCount += 1;
  }
  return addedCount;
}

async function loadMyTradableInventoryRowsForBoardFilters() {
  if (
    Array.isArray(offersState.composer.offeredRows) &&
    offersState.composer.offeredRows.length > 0
  ) {
    return {
      ok: true,
      rows: offersState.composer.offeredRows,
      error: "",
    };
  }
  if (!Number.isFinite(parseInt(offersState.myUserId, 10)) || parseInt(offersState.myUserId, 10) <= 0) {
    return {
      ok: false,
      rows: [],
      error: "Unable to load your tradable inventory.",
    };
  }
  var tradableResult = await fetchTradableInventory(offersState.myUserId);
  var rawRows = [];
  if (tradableResult != null && tradableResult.ok === true && Array.isArray(tradableResult.data)) {
    for (var i = 0; i < tradableResult.data.length; i++) {
      var row = tradableResult.data[i];
      if (row == null || typeof row !== "object") {
        continue;
      }
      var assetId = parseInt(row.assetId, 10);
      if (!Number.isFinite(assetId) || assetId <= 0) {
        continue;
      }
      var name = typeof row.name === "string" ? stripTags(row.name) : "Item " + assetId;
      rawRows.push({
        assetId: assetId,
        name: name,
        recentAveragePrice: Number.isFinite(parseInt(row.recentAveragePrice, 10))
          ? parseInt(row.recentAveragePrice, 10)
          : 0,
        value: Number.isFinite(parseInt(row.value, 10)) ? parseInt(row.value, 10) : -1,
        serialNumber: Number.isFinite(parseInt(row.serialNumber, 10))
          ? parseInt(row.serialNumber, 10)
          : null,
        isOnHold: row.isOnHold === true,
      });
    }
  }
  offersState.composer.offeredRows = normalizeComposerOfferedRows(rawRows);
  if (tradableResult != null && tradableResult.ok === true) {
    return {
      ok: true,
      rows: offersState.composer.offeredRows,
      error: "",
    };
  }
  return {
    ok: false,
    rows: offersState.composer.offeredRows,
    error: tradableResult != null && typeof tradableResult.error === "string"
      ? tradableResult.error
      : "Unable to load your tradable inventory.",
  };
}

function applyMyTradableItemsToBoardFilters() {
  var seen = {};
  for (var selectedIndex = 0; selectedIndex < offersState.filters.selectedItems.length; selectedIndex++) {
    var selectedItem = offersState.filters.selectedItems[selectedIndex];
    if (selectedItem == null || !Number.isFinite(parseInt(selectedItem.id, 10))) {
      continue;
    }
    seen[String(parseInt(selectedItem.id, 10))] = true;
  }
  var addedCount = 0;
  for (var offeredIndex = 0; offeredIndex < offersState.composer.offeredRows.length; offeredIndex++) {
    var offeredRow = offersState.composer.offeredRows[offeredIndex];
    if (offeredRow == null || !Number.isFinite(parseInt(offeredRow.assetId, 10))) {
      continue;
    }
    var assetId = parseInt(offeredRow.assetId, 10);
    if (seen[String(assetId)] === true) {
      continue;
    }
    seen[String(assetId)] = true;
    offersState.filters.selectedItems.push({
      id: assetId,
      name: stripTags(String(offeredRow.name || "Item " + assetId)),
      rap: Number.isFinite(parseInt(offeredRow.rap, 10)) ? parseInt(offeredRow.rap, 10) : 0,
      value: Number.isFinite(parseInt(offeredRow.value, 10)) ? parseInt(offeredRow.value, 10) : -1,
      projected: false,
      demand: null,
    });
    addedCount += 1;
  }
  return addedCount;
}

function setWishlistStatusText(text) {
  if (offersState.ui.wishlistStatus == null) {
    return;
  }
  offersState.ui.wishlistStatus.textContent = stripTags(String(text || ""));
}

function setMyPostsStatusText(text) {
  if (offersState.ui.myPostsStatus == null) {
    return;
  }
  offersState.ui.myPostsStatus.textContent = stripTags(String(text || ""));
}

function updateMyPostsDeleteAllButtonState() {
  if (offersState.ui.myPostsDeleteAllButton == null) {
    return;
  }
  offersState.ui.myPostsDeleteAllButton.disabled =
    offersState.myPostsLoading || offersState.myPostsDeleteModal.deleting || offersState.myPosts.length === 0;
}

function renderWishlistCurrentList() {
  if (offersState.ui.wishlistCurrentList == null) {
    return;
  }
  var listNode = offersState.ui.wishlistCurrentList;
  listNode.textContent = "";
  if (offersState.filters.myWishlistItems.length === 0) {
    var empty = document.createElement("div");
    empty.className = "ropro-trade-offer-empty";
    empty.textContent = "No wishlist items yet.";
    listNode.appendChild(empty);
    return;
  }
  for (var i = 0; i < offersState.filters.myWishlistItems.length; i++) {
    var row = offersState.filters.myWishlistItems[i];
    if (row == null || !Number.isFinite(parseInt(row.id, 10))) {
      continue;
    }
    var wishlistRow = document.createElement("div");
    wishlistRow.className = "ropro-trade-offers-picker-row";
    wishlistRow.appendChild(createThumbnailFrame("ropro-trade-offers-picker-thumb", row.name, row.id));
    var meta = document.createElement("div");
    meta.className = "ropro-trade-offers-picker-meta";
    var name = document.createElement("div");
    name.className = "ropro-trade-offers-picker-name";
    name.textContent = row.name;
    var sub = document.createElement("div");
    sub.className = "ropro-trade-offers-picker-sub";
    sub.textContent = formatValueRapLine(row.value, row.rap);
    meta.appendChild(name);
    meta.appendChild(sub);
    wishlistRow.appendChild(meta);
    var removeButton = createButton("X", "ropro-outfit-delete-button ropro-wearing-delete-button");
    removeButton.classList.add("ropro-trade-offers-inline-remove");
    removeButton.setAttribute("aria-label", "Remove from wishlist");
    removeButton.addEventListener("click", function (itemRow, buttonNode) {
      return async function () {
        if (!canManageTradeOffersWishlist()) {
          openUpgradeModalForGate(TRADE_OFFERS_WISHLIST_GATE, "rex", "Trade Board More Options");
          return;
        }
        buttonNode.disabled = true;
        var response = await setWishlistAsset(itemRow.id, false);
        buttonNode.disabled = false;
        var parsed = parsePayload(response);
        if (parsed != null && typeof parsed === "object" && typeof parsed.error === "string") {
          setWishlistStatusText(parsed.error);
          return;
        }
        await loadMyWishlistItems(true);
      };
    }(row, removeButton));
    wishlistRow.appendChild(removeButton);
    listNode.appendChild(wishlistRow);
  }
}

async function loadMyWishlistItems(showStatus) {
  if (!canManageTradeOffersWishlist()) {
    offersState.filters.myWishlistItems = [];
    offersState.filters.myWishlistById = {};
    offersState.filters.wishlistSearchRows = [];
    renderBoardFilterChips();
    renderBoardFilterSearchResults();
    renderWishlistTabSearchResults();
    renderWishlistCurrentList();
    if (showStatus) {
      setWishlistStatusText("Managing wishlist items requires RoPro Rex.");
    }
    return {
      ok: false,
      error: "Managing wishlist items requires RoPro Rex.",
      rows: [],
    };
  }
  var response = await fetchMyWishlistAssets(150);
  var parsed = parsePayload(response);
  if (parsed == null || typeof parsed !== "object") {
    if (showStatus) {
      setWishlistStatusText("Unable to load wishlist items.");
    }
    return {
      ok: false,
      error: "Unable to load wishlist items.",
      rows: [],
    };
  }
  if (typeof parsed.error === "string") {
    if (showStatus) {
      setWishlistStatusText(parsed.error);
    }
    return {
      ok: false,
      error: stripTags(parsed.error),
      rows: [],
    };
  }
  var rows = normalizeWantedRows(parsed);
  offersState.filters.myWishlistItems = rows;
  offersState.filters.myWishlistById = {};
  for (var i = 0; i < rows.length; i++) {
    offersState.filters.myWishlistById[String(rows[i].id)] = true;
  }
  renderBoardFilterChips();
  renderBoardFilterSearchResults();
  renderWishlistTabSearchResults();
  renderWishlistCurrentList();
  return {
    ok: true,
    error: "",
    rows: rows,
  };
}

function isBoardFilterItemSelected(itemId) {
  for (var i = 0; i < offersState.filters.selectedItems.length; i++) {
    if (String(offersState.filters.selectedItems[i].id) === String(itemId)) {
      return true;
    }
  }
  return false;
}

async function hydrateAcronymCacheForAssetIds(assetIds, cacheByAssetId, valueByAssetId) {
  var idsToLoad = [];
  for (var i = 0; i < assetIds.length; i++) {
    var assetId = parseInt(assetIds[i], 10);
    if (!Number.isFinite(assetId) || assetId <= 0) {
      continue;
    }
    var hasAcronym = typeof cacheByAssetId[String(assetId)] === "string";
    var hasValue =
      valueByAssetId == null ||
      (valueByAssetId != null &&
        typeof valueByAssetId === "object" &&
        Object.prototype.hasOwnProperty.call(valueByAssetId, String(assetId)));
    if (hasAcronym && hasValue) {
      continue;
    }
    idsToLoad.push(assetId);
  }
  if (idsToLoad.length === 0) {
    return;
  }
  for (var start = 0; start < idsToLoad.length; start += 120) {
    var chunk = idsToLoad.slice(start, start + 120);
    var response = await fetchTradeItemsByIds(chunk);
    var parsed = parsePayload(response);
    if (parsed == null || typeof parsed !== "object") {
      continue;
    }
    var keys = Object.keys(parsed);
    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var key = keys[keyIndex];
      var normalizedId = parseInt(key, 10);
      if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
        continue;
      }
      cacheByAssetId[String(normalizedId)] = parseTradeSearchItemAcronym(parsed[key]);
      if (valueByAssetId != null && typeof valueByAssetId === "object") {
        valueByAssetId[String(normalizedId)] = parseTradeSearchItemValue(parsed[key]);
      }
    }
  }
}

async function hydrateRowAcronyms(rows, cacheByAssetId) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }
  var ids = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row == null || !Number.isFinite(parseInt(row.id, 10))) {
      continue;
    }
    ids.push(parseInt(row.id, 10));
  }
  await hydrateAcronymCacheForAssetIds(ids, cacheByAssetId);
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var rowEntry = rows[rowIndex];
    if (rowEntry == null || !Number.isFinite(parseInt(rowEntry.id, 10))) {
      continue;
    }
    if (typeof rowEntry.acronym === "string" && rowEntry.acronym.length > 0) {
      continue;
    }
    var cachedAcronym = cacheByAssetId[String(parseInt(rowEntry.id, 10))];
    if (typeof cachedAcronym === "string") {
      rowEntry.acronym = cachedAcronym;
    }
  }
}

function renderBoardFilterSearchResults() {
  if (offersState.ui.filtersPanel == null) {
    return;
  }
  var resultsNode = offersState.ui.filtersPanel.querySelector(".ropro-trade-offers-filter-results");
  if (resultsNode == null) {
    return;
  }
  resultsNode.textContent = "";
  if (offersState.filters.searchRows.length === 0) {
    resultsNode.style.display = "none";
    return;
  }
  resultsNode.style.display = "";
  for (var i = 0; i < offersState.filters.searchRows.length; i++) {
    var row = offersState.filters.searchRows[i];
    var alreadySelected = isBoardFilterItemSelected(row.id);
    var resultRow = document.createElement("div");
    resultRow.className = "ropro-trade-offers-picker-row ropro-trade-offers-picker-row-clickable";
    resultRow.classList.toggle("ropro-trade-offers-picker-row-selected", alreadySelected);
    resultRow.classList.toggle("ropro-trade-offers-picker-row-disabled", alreadySelected);
    resultRow.setAttribute("role", "button");
    resultRow.setAttribute("tabindex", alreadySelected ? "-1" : "0");

    resultRow.appendChild(createThumbnailFrame("ropro-trade-offers-picker-thumb", row.name, row.id));

    var meta = document.createElement("div");
    meta.className = "ropro-trade-offers-picker-meta";
    var name = document.createElement("div");
    name.className = "ropro-trade-offers-picker-name";
    name.textContent = row.name;
    var sub = document.createElement("div");
    sub.className = "ropro-trade-offers-picker-sub";
    var boardSegments = [formatValueRapLine(row.value, row.rap)];
    sub.textContent = boardSegments.join(" | ");
    meta.appendChild(name);
    meta.appendChild(sub);
    resultRow.appendChild(meta);

    var actionLabel = document.createElement("div");
    actionLabel.className = "ropro-trade-offers-picker-action";
    actionLabel.textContent = alreadySelected ? "Added" : "Click to add";
    resultRow.appendChild(actionLabel);
    var handleAddFilter = function (itemRow) {
      return function () {
        if (isBoardFilterItemSelected(itemRow.id)) {
          return;
        }
        offersState.filters.selectedItems.push(itemRow);
        renderBoardFilterChips();
        renderBoardFilterSearchResults();
        loadTradeOffers(true);
      };
    }(row);
    resultRow.addEventListener("click", handleAddFilter);
    resultRow.addEventListener("keydown", function (onAdd) {
      return function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        onAdd();
      };
    }(handleAddFilter));
    resultsNode.appendChild(resultRow);
  }
}

var boardFilterSearchTimer = null;

function queueBoardFilterSearch(query) {
  if (boardFilterSearchTimer != null) {
    clearTimeout(boardFilterSearchTimer);
  }
  boardFilterSearchTimer = setTimeout(async function () {
    var trimmed = normalizeTradeSearchText(query);
    if (trimmed.length < 2) {
      offersState.filters.searchRows = [];
      renderBoardFilterSearchResults();
      return;
    }
    var requestId = offersState.filters.searchRequestId + 1;
    offersState.filters.searchRequestId = requestId;
    var response = await fetchTradeItemSearch(trimmed);
    if (offersState.filters.searchRequestId !== requestId) {
      return;
    }
    var rows = normalizeWantedRows(response);
    await hydrateRowAcronyms(rows, offersState.composer.wantedAcronymByAssetId);
    if (offersState.filters.searchRequestId !== requestId) {
      return;
    }
    offersState.filters.searchRows = rows.filter(function (row) {
      return doesTradeSearchRowMatch(row, trimmed);
    }).slice(0, 8);
    renderBoardFilterSearchResults();
  }, 220);
}

function renderWishlistTabSearchResults() {
  if (offersState.ui.wishlistView == null) {
    return;
  }
  var resultsNode = offersState.ui.wishlistView.querySelector(".ropro-trade-offers-wishlist-results");
  if (resultsNode == null) {
    return;
  }
  resultsNode.textContent = "";
  if (offersState.filters.wishlistSearchRows.length === 0) {
    resultsNode.style.display = "none";
    return;
  }
  resultsNode.style.display = "";
  for (var i = 0; i < offersState.filters.wishlistSearchRows.length; i++) {
    var row = offersState.filters.wishlistSearchRows[i];
    var isWishlisted = offersState.filters.myWishlistById.hasOwnProperty(String(row.id));
    var resultRow = document.createElement("div");
    resultRow.className = "ropro-trade-offers-picker-row ropro-trade-offers-picker-row-clickable";
    resultRow.classList.toggle("ropro-trade-offers-picker-row-selected", isWishlisted);
    resultRow.classList.toggle("ropro-trade-offers-picker-row-disabled", isWishlisted);
    resultRow.setAttribute("role", "button");
    resultRow.setAttribute("tabindex", isWishlisted ? "-1" : "0");

    resultRow.appendChild(createThumbnailFrame("ropro-trade-offers-picker-thumb", row.name, row.id));

    var meta = document.createElement("div");
    meta.className = "ropro-trade-offers-picker-meta";
    var name = document.createElement("div");
    name.className = "ropro-trade-offers-picker-name";
    name.textContent = row.name;
    var sub = document.createElement("div");
    sub.className = "ropro-trade-offers-picker-sub";
    var details = [formatValueRapLine(row.value, row.rap)];
    sub.textContent = details.join(" | ");
    meta.appendChild(name);
    meta.appendChild(sub);
    resultRow.appendChild(meta);

    var actionLabel = document.createElement("div");
    actionLabel.className = "ropro-trade-offers-picker-action";
    actionLabel.textContent = isWishlisted ? "In wishlist" : "Click to add";
    resultRow.appendChild(actionLabel);

    var handleAddWishlist = function (itemRow, selectedAtRender, rowNode, labelNode) {
      var isPending = false;
      return async function () {
        if (!canManageTradeOffersWishlist()) {
          openUpgradeModalForGate(TRADE_OFFERS_WISHLIST_GATE, "rex", "Trade Board More Options");
          return;
        }
        if (selectedAtRender || isPending) {
          return;
        }
        isPending = true;
        rowNode.classList.add("ropro-trade-offers-picker-row-disabled");
        labelNode.textContent = "Adding...";
        var response = await setWishlistAsset(itemRow.id, true);
        var parsed = parsePayload(response);
        isPending = false;
        if (parsed != null && typeof parsed === "object" && typeof parsed.error === "string") {
          rowNode.classList.remove("ropro-trade-offers-picker-row-disabled");
          labelNode.textContent = "Click to add";
          setWishlistStatusText(parsed.error);
          return;
        }
        await loadMyWishlistItems(true);
      };
    }(row, isWishlisted, resultRow, actionLabel);
    resultRow.addEventListener("click", handleAddWishlist);
    resultRow.addEventListener("keydown", function (onAdd) {
      return function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        onAdd();
      };
    }(handleAddWishlist));
    resultsNode.appendChild(resultRow);
  }
}

var wishlistTabSearchTimer = null;

function queueWishlistTabSearch(query) {
  if (wishlistTabSearchTimer != null) {
    clearTimeout(wishlistTabSearchTimer);
  }
  wishlistTabSearchTimer = setTimeout(async function () {
    if (!canManageTradeOffersWishlist()) {
      offersState.filters.wishlistSearchRows = [];
      renderWishlistTabSearchResults();
      setWishlistStatusText("Managing wishlist items requires RoPro Rex.");
      return;
    }
    var trimmed = normalizeTradeSearchText(query);
    if (trimmed.length < 2) {
      offersState.filters.wishlistSearchRows = [];
      renderWishlistTabSearchResults();
      setWishlistStatusText("Type at least 2 characters to search.");
      return;
    }
    var requestId = offersState.filters.wishlistSearchRequestId + 1;
    offersState.filters.wishlistSearchRequestId = requestId;
    var response = await fetchTradeItemSearch(trimmed);
    if (offersState.filters.wishlistSearchRequestId !== requestId) {
      return;
    }
    var rows = normalizeWantedRows(response);
    await hydrateRowAcronyms(rows, offersState.composer.wantedAcronymByAssetId);
    if (offersState.filters.wishlistSearchRequestId !== requestId) {
      return;
    }
    offersState.filters.wishlistSearchRows = rows.filter(function (row) {
      return doesTradeSearchRowMatch(row, trimmed);
    }).slice(0, 12);
    renderWishlistTabSearchResults();
    if (offersState.filters.wishlistSearchRows.length === 0) {
      setWishlistStatusText("No items found for that search.");
    } else {
      setWishlistStatusText("Click any row to add it to your wishlist.");
    }
  }, 220);
}

function setStatusText(text) {
  if (offersState.ui.status == null) {
    return;
  }
  offersState.ui.status.classList.remove("ropro-trade-offers-status-loading");
  offersState.ui.status.textContent = stripTags(String(text || ""));
}

function setTradeBoardLoadingStatus() {
  if (offersState.ui.status == null) {
    return;
  }
  offersState.ui.status.classList.add("ropro-trade-offers-status-loading");
  offersState.ui.status.innerHTML = buildRoProLoader({
    className: "ropro-trade-offers-status-loader ropro-branded-loader-compact-section",
    style: "visibility: initial !important;",
  });
}

function setLockMessage(message, ctaLabel, ctaGateKey, fallbackTier) {
  if (offersState.ui.lockBox == null) {
    return;
  }
  var lockBox = offersState.ui.lockBox;
  lockBox.textContent = "";
  lockBox.style.display = "";
  var copy = document.createElement("p");
  copy.textContent = stripTags(message);
  lockBox.appendChild(copy);
  if (typeof ctaLabel === "string" && ctaLabel.length > 0) {
    var cta = createButton(ctaLabel, "btn-growth-md");
    cta.addEventListener("click", function () {
      openUpgradeModalForGate(ctaGateKey, fallbackTier, "Trade Board");
    });
    lockBox.appendChild(cta);
  }
}

function clearLockMessage() {
  if (offersState.ui.lockBox == null) {
    return;
  }
  offersState.ui.lockBox.style.display = "none";
  offersState.ui.lockBox.textContent = "";
}

function normalizeWishRow(wish) {
  if (wish == null || typeof wish !== "object") {
    return null;
  }
  var wishId = parseInt(wish.wishid, 10);
  if (!Number.isFinite(wishId) || wishId <= 0) {
    return null;
  }
  var userId = parseInt(wish.user, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    userId = -1;
  }
  var posted = parseInt(wish.posted, 10);
  if (!Number.isFinite(posted) || posted <= 0) {
    posted = Date.now();
  }
  var normalized = {
    wishid: wishId,
    user: userId,
    username: typeof wish.username === "string" ? stripTags(wish.username) : "Unknown User",
    posted: posted,
    value: Number.isFinite(parseInt(wish.value, 10)) ? parseInt(wish.value, 10) : 0,
    items: [],
    wantedItems: [],
  };
  var offerRows = Array.isArray(wish.items) ? wish.items : [];
  for (var i = 0; i < 4; i++) {
    normalized.items.push(normalizeOfferItem(offerRows[i]));
  }
  normalized.wantedItems.push(normalizeOfferItem(wish.item));
  normalized.wantedItems.push(normalizeOfferItem(wish.item2));
  normalized.wantedItems.push(normalizeOfferItem(wish.item3));
  normalized.wantedItems.push(normalizeOfferItem(wish.item4));
  return normalized;
}

function collectMissingMetadataIds(wishes) {
  var ids = {};
  for (var i = 0; i < wishes.length; i++) {
    var wish = wishes[i];
    var itemSets = [wish.items, wish.wantedItems];
    for (var setIndex = 0; setIndex < itemSets.length; setIndex++) {
      var itemSet = itemSets[setIndex];
      for (var itemIndex = 0; itemIndex < itemSet.length; itemIndex++) {
        var item = itemSet[itemIndex];
        if (item == null || item.id <= 0) {
          continue;
        }
        if (item.projected === true || item.demand != null) {
          continue;
        }
        if (offersState.itemMetadata.hasOwnProperty(String(item.id))) {
          continue;
        }
        ids[item.id] = true;
      }
    }
  }
  return Object.keys(ids).map(function (id) {
    return parseInt(id, 10);
  });
}

async function hydrateItemMetadataForWishes(wishes) {
  var missingIds = collectMissingMetadataIds(wishes);
  if (missingIds.length === 0) {
    return;
  }
  var tradeItemResponse = await fetchTradeItemsByIds(missingIds);
  var parsedResponse = parsePayload(tradeItemResponse);
  if (parsedResponse == null || typeof parsedResponse !== "object") {
    return;
  }
  for (var i = 0; i < missingIds.length; i++) {
    var itemId = missingIds[i];
    if (!Object.prototype.hasOwnProperty.call(parsedResponse, itemId)) {
      continue;
    }
    var metadata = normalizeTradeBackendEntry(parsedResponse[itemId]);
    if (metadata == null) {
      continue;
    }
    offersState.itemMetadata[String(itemId)] = metadata;
  }
}

function enrichItemFromMetadata(item) {
  if (item == null || item.id <= 0) {
    return item;
  }
  var metadata = offersState.itemMetadata[String(item.id)];
  if (metadata == null || typeof metadata !== "object") {
    return item;
  }
  if (item.projected !== true && metadata.projected === true) {
    item.projected = true;
  }
  if (item.demand == null && metadata.demand != null) {
    item.demand = metadata.demand;
  }
  if (
    (!Number.isFinite(parseInt(item.value, 10)) || parseInt(item.value, 10) < 0) &&
    Number.isFinite(parseInt(metadata.value, 10)) &&
    parseInt(metadata.value, 10) > 0
  ) {
    item.value = parseInt(metadata.value, 10);
  }
  return item;
}

function sumItemValues(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item == null || item.id <= 0) {
      continue;
    }
    if (!Number.isFinite(item.value) || item.value < 0) {
      continue;
    }
    total += item.value;
  }
  return total;
}

function closeTradeOfferItemChartModal() {
  if (!offersState.chartModal.visible || offersState.chartModal.overlay == null) {
    return;
  }
  var overlay = offersState.chartModal.overlay;
  if (overlay.parentNode != null) {
    overlay.parentNode.removeChild(overlay);
  }
  offersState.chartModal.visible = false;
  offersState.chartModal.overlay = null;
  offersState.chartModal.requestId += 1;
}

function isTradeOfferItemInfoModalActive(requestId) {
  return (
    offersState.chartModal.visible &&
    offersState.chartModal.overlay != null &&
    offersState.chartModal.requestId === requestId
  );
}

function addTradeOfferRecentSaleCard(sale, recentSalesList) {
  if (recentSalesList == null) {
    return;
  }
  var oldRap = parseInt(sale.oldrap, 10);
  var newRap = parseInt(sale.newrap, 10);
  if (!Number.isFinite(oldRap) || oldRap <= 0) {
    oldRap = 1;
  }
  if (!Number.isFinite(newRap) || newRap < 0) {
    newRap = 0;
  }
  var price = Math.max(((newRap - oldRap) * -10 - oldRap) / -1, 1);
  var percentChange = (((newRap - oldRap) / oldRap) * 100).toFixed(1);
  var trendGlyph = newRap >= oldRap ? "▲" : "▼";
  var trendColor = newRap >= oldRap ? "#6ED102" : "#CC0700";
  var recentSaleCardHtml =
    `<li class="recent-sale-card" style="position:relative;padding:15px;padding-right:0px;padding-left:0px;padding-top:0px;padding-bottom:0px;margin-bottom:0px;margin-top:5px;"><div style="width:90%;padding:5px;background-color:#393B3D;margin-left:0px;border-radius:4px;margin-left:5%;" class="icon-text-wrapper clearfix icon-robux-price-container">
	<span class="item-card-price-trend-icon" style="color:${trendColor};font-weight:700;display:inline-block;width:14px;text-align:center;">${trendGlyph}</span><span class="icon-robux-white-16x16 wait-for-i18n-format-render"></span>
	<b class="text-robux-md wait-for-i18n-format-render item-card-rap">${addCommas(price)}</b>
	</div><div style="position:absolute;right:12px;top:8px;font-size:12px;color:gray;">${formatTradeOfferInfoCardTime(parseInt(sale.date, 10) * 1000)}</div>
	<div class="recent-sale-more-info" style="position:absolute;left:-162px;top:-20px;font-size:12px;color:white;background-color:#393B3D;min-width:165px;height:85px;border-radius:7px;filter: drop-shadow(${percentChange >= 0 ? "#39ff14" : "#ff073a"} 0px 0px 2px);padding:5px;text-align:center;"><div style="width:60%;font-size:12px;float:left;"><b><u>New RAP</u><div><span class="icon-robux-white-16x16 wait-for-i18n-format-render" style="transform:scale(0.8);"></span><b class="text-robux-md wait-for-i18n-format-render item-card-rap" style="font-size:12px;">${addCommas(parseInt(newRap, 10))}</b></div></b><b><u>Old RAP</u><div><span class="icon-robux-white-16x16 wait-for-i18n-format-render" style="transform:scale(0.8);"></span><b class="text-robux-md wait-for-i18n-format-render item-card-rap" style="font-size:12px;">${addCommas(parseInt(oldRap, 10))}</b></div></b></div><div style="display:inline-block;width:40%;float:right;"><div style="margin-top:25px;font-size:18px;font-weight:bold;color:${percentChange >= 0 ? "#39ff14" : "#ff073a"};">${percentChange >= 0 ? "+" + Math.abs(percentChange) : percentChange}%</div></div></div>
	</li>`;
  var cardNode = document.createElement("div");
  cardNode.innerHTML = recentSaleCardHtml;
  recentSalesList.appendChild(cardNode);
}

async function formatTradeOfferItemInfoCard(item, infoCard, requestId) {
  if (item == null || infoCard == null) {
    return;
  }
  var itemId = parseInt(item.id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return;
  }
  tradeOfferInfoTryOnItemId = itemId;
  var tryOnUrl = fetchTradeOfferAssetRender(itemId);
  var details = await fetchTradeOfferItemDetails(itemId);
  if (!isTradeOfferItemInfoModalActive(requestId)) {
    return;
  }
  if (details == null || typeof details !== "object") {
    details = {};
  }
  if (typeof details.creatorName !== "string") {
    details.creatorName = "Roblox";
  }
  if (!Number.isFinite(parseInt(details.creatorTargetId, 10))) {
    details.creatorTargetId = 1;
  }
  if (typeof details.name !== "string" || details.name.length === 0) {
    details.name = "Unknown Item";
  }
  var normalizedLowestPrice = Number.isFinite(parseInt(details.lowestPrice, 10)) ? parseInt(details.lowestPrice, 10) : 0;
  var itemIsOffsale = isTradeOfferCatalogItemOffsale(details);
  var collectibleItemId = getTradeOfferCollectibleItemId(details);
  var salesData = normalizeTradeOfferChartSalesPayload(await fetchTradeOfferChartSalesData(collectibleItemId));
  var rawSalesContext = await fetchTradeOfferSalesContext(salesData);
  var salesContext =
    typeof rawSalesContext === "string" && rawSalesContext.trim().toUpperCase() === "ERROR"
      ? buildTradeOfferSalesContextFallback(salesData)
      : parseTradeOfferSalesContext(rawSalesContext);
  salesData = salesContext.salesData;
  var recentSales = salesContext.recentSales;
  var salesMetrics = salesContext.metrics;
  var additionalInfo = await fetchTradeOfferAdditionalInfo(itemId);
  if (!isTradeOfferItemInfoModalActive(requestId)) {
    return;
  }
  if (additionalInfo == null || typeof additionalInfo !== "object") {
    additionalInfo = {};
  }

  var itemCardLoading = infoCard.getElementsByClassName("item-card-loading")[0];
  var itemCardName = infoCard.getElementsByClassName("item-card-name")[0];
  var itemCardNameContainer = infoCard.getElementsByClassName("item-name-container")[0];
  var itemCardCreator = infoCard.getElementsByClassName("item-card-creator")[0];
  var itemCardBestPrice = infoCard.getElementsByClassName("item-card-bestprice")[0];
  var itemCardRap = infoCard.getElementsByClassName("item-card-rap")[0];
  var itemCardPriceTrend = infoCard.getElementsByClassName("item-card-price-trend")[0];
  var itemCardPriceTrendIcon = infoCard.getElementsByClassName("item-card-price-trend-icon")[0];
  var itemCardAcronym = infoCard.getElementsByClassName("item-card-acronym")[0];
  var itemCardIFrame = infoCard.getElementsByClassName("item-card-iframe")[0];

  if (itemCardCreator != null) {
    itemCardCreator.textContent = stripTags(details.creatorName);
    itemCardCreator.href = getSafeCreatorProfileLink(details.creatorTargetId) || "https://www.roblox.com/users/1/profile/";
  }
  if (itemCardName != null) {
    itemCardName.textContent = stripTags(details.name);
  }
  if (itemCardBestPrice != null) {
    itemCardBestPrice.textContent = itemIsOffsale ? "Offsale" : addCommas(normalizedLowestPrice);
  }
  if (itemCardIFrame != null && itemCardNameContainer != null) {
    var previewHeight = 296 - itemCardNameContainer.getBoundingClientRect().height;
    if (!Number.isFinite(previewHeight) || previewHeight < 170) {
      previewHeight = 170;
    }
    itemCardIFrame.style.height = previewHeight + "px";
  }
  var salesInput = infoCard.getElementsByClassName("item-sales-data")[0];
  if (salesInput != null) {
    salesInput.value = JSON.stringify(salesData);
  }
  var graphForm = infoCard.getElementsByClassName("item-graph-form")[0];
  if (graphForm != null) {
    graphForm.submit();
  }
  var graphFrame = infoCard.getElementsByClassName("item-card-graph")[0];
  if (graphFrame != null) {
    graphFrame.setAttribute("loaded", "true");
  }

  var rap = Number.isFinite(parseInt(salesData.recentAveragePrice, 10))
    ? parseInt(salesData.recentAveragePrice, 10)
    : 0;
  var priceIncrease = Number.isFinite(parseFloat(salesMetrics.priceIncrease))
    ? parseFloat(salesMetrics.priceIncrease)
    : 0;
  var salesMedian = Number.isFinite(parseFloat(salesMetrics.salesMedian))
    ? parseFloat(salesMetrics.salesMedian)
    : rap;
  var trendIsNegative = priceIncrease < 0;
  var priceIncreaseText = (Math.round(priceIncrease * 10) / 10).toFixed(1);
  if (itemCardPriceTrendIcon != null) {
    itemCardPriceTrendIcon.innerText = trendIsNegative ? "▼" : "▲";
    itemCardPriceTrendIcon.style.color = trendIsNegative ? "#CC0700" : "#7FD60D";
  }
  if (itemCardPriceTrend != null) {
    itemCardPriceTrend.textContent = priceIncreaseText + "%";
    var tradeOfferTrendPeriodNode = document.createElement("p");
    tradeOfferTrendPeriodNode.setAttribute("style", "font-size:9px;display:inline-block;margin-left:5px;");
    tradeOfferTrendPeriodNode.textContent = " Past Month";
    itemCardPriceTrend.appendChild(tradeOfferTrendPeriodNode);
  }

  if (salesMetrics.isProbablyProjected && salesMedian > 0) {
    var projectedWarningHtml =
      `<img src="${chrome.runtime.getURL('/images/warning_symbol.png')}" style="width:40px;float:left;margin-left:40px;"><b style="font-size:14px;float:right;margin-right:40px;"> Probably Projected</b><br><p style="font-size:10px;text-align:right;display:inline-block;float:right;margin-top:-3px;margin-right:40px;">RAP ${Math.round((rap - salesMedian) / salesMedian * 100)}% Above Median</p>`;
    var projectedWarningNode = document.createElement("div");
    projectedWarningNode.setAttribute(
      "style",
      "left:8px;top:250px;position:absolute;background-color:#393b3d;padding:10px;border-radius:5px;filter: drop-shadow(#F9CE3A 0px 0px 5px);width:290px;"
    );
    projectedWarningNode.innerHTML = projectedWarningHtml;
    if (infoCard.childNodes.length > 0 && infoCard.childNodes[0] != null) {
      infoCard.childNodes[0].appendChild(projectedWarningNode);
    }
  }

  if (itemCardRap != null) {
    itemCardRap.textContent = addCommas(parseInt(salesData.recentAveragePrice, 10));
  }
  if (additionalInfo.hasOwnProperty("acronym") && itemCardAcronym != null) {
    itemCardAcronym.textContent = stripTags(additionalInfo["acronym"] == null ? "None" : additionalInfo["acronym"]);
  }

  var recentSalesList = infoCard.querySelector("#recentSalesList");
  if (recentSalesList != null) {
    recentSalesList.textContent = "";
    for (var i = 0; i < recentSales.length; i++) {
      addTradeOfferRecentSaleCard(recentSales[i], recentSalesList);
    }
  }

  if (itemCardLoading != null && itemCardLoading.parentNode != null) {
    itemCardLoading.remove();
  }
  tryOnUrl = await tryOnUrl;
  if (!isTradeOfferItemInfoModalActive(requestId)) {
    return;
  }
  if (itemCardIFrame != null) {
    var safeTryOnSrc = null;
    safeTryOnSrc = buildSafeTradeOfferTryOnFrameSrc(tryOnUrl) || "https://ropro.io/render?background=preview";
    itemCardIFrame.src = safeTryOnSrc;
  }
}

function getSafeCreatorProfileLink(creatorId) {
  if (
    typeof roproApiAdapter == null ||
    typeof roproApiAdapter.getSafeRobloxProfileUrl !== "function"
  ) {
    return null
  }
  var normalizedCreatorId = parseInt(creatorId)
  if (!Number.isFinite(normalizedCreatorId) || normalizedCreatorId <= 0) {
    return null
  }
  return roproApiAdapter.getSafeRobloxProfileUrl(
    "https://www.roblox.com/users/" + normalizedCreatorId + "/profile/"
  )
}

function buildSafeTradeOfferTryOnFrameSrc(tryOnUrl) {
  if (
    typeof roproApiAdapter == null ||
    typeof roproApiAdapter.getSafeUpgradeUrl !== "function"
  ) {
    return null
  }
  try {
    var baseRenderUrl = "https://ropro.io/render"
    var normalizedQuery = normalizeRobloxRenderUrlToken(tryOnUrl)
    var renderSrc = baseRenderUrl
    if (normalizedQuery.length > 0) {
      renderSrc += "?" + normalizedQuery
    }
    renderSrc += (normalizedQuery.length > 0 ? "&" : "?") + "background=preview"
    return roproApiAdapter.getSafeUpgradeUrl(renderSrc)
  } catch (e) {
    return null
  }
}

function openTradeOfferItemChartModal(item) {
  if (item == null || !Number.isFinite(parseInt(item.id, 10)) || parseInt(item.id, 10) <= 0) {
    return;
  }
  closeTradeOfferItemChartModal();
  var itemId = parseInt(item.id, 10);
  var requestId = offersState.chartModal.requestId + 1;
  offersState.chartModal.requestId = requestId;

  var overlay = document.createElement("div");
  overlay.className = "ropro-trade-offers-chart-modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "100002";
  overlay.style.backgroundColor = "rgba(0,0,0,0.66)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "12px";
  overlay.style.overflow = "auto";

  var chartTarget = "item_card_graph_" + itemId + "_" + new Date().getTime();
  var infoCardHtml =
    `<div uib-popover-template-popup="" uib-title="" class="dark-theme tradeinfocard popover ng-scope ng-isolate-scope bottom people-info-card-container card-with-game fade in" tooltip-animation-class="fade" uib-tooltip-classes="" ng-class="{ in: isOpen }" style="position:relative;filter: drop-shadow(rgb(0, 0, 0) 0px 0px 2px); width:950px; min-width:950px; min-height:420px; max-height:calc(100vh - 24px); overflow:auto; margin:0 auto;">
			<button type="button" aria-label="Close item info card" class="btn-control-sm ropro-trade-infocard-close-inline" style="position:absolute;top:4px;right:10px;z-index:12;background:rgba(20,22,26,0.95);color:#fff;border:1px solid rgba(255,255,255,0.45);border-radius:8px;width:28px;height:28px;line-height:26px;padding:0;font-weight:700;font-size:21px;">×</button>
			<div style="left:0px;top:0px;width:100%;height:100%;background-color:#393b3d;" class="arrow item-card-loading">${buildRoProLoader({id: "itemCardLoading", className: "ropro-branded-loader-fill", style: "width:100%; height:100%; visibility: initial !important;"})}</div>
			<div style="left:467px;transform:scale(2);top:-10px;" class="arrow"></div>
			<div class="popover-inner" style="width:950px;height:320px;">
				<div style="float:left;"><h3 style="width:300px;padding-top:5px;padding-left:10px;padding-bottom:5px;transform:scale(1);"><div class="border-bottom item-name-container">
					<a href="https://www.roblox.com/catalog/${itemId}/" target="_blank"><h3 class="item-card-name">---</h3></a>
					<div><span class="text-label">By <a href="" class="text-name item-card-creator">---</a></span></div>
				</div></h3><iframe class="item-card-iframe" style="float:left;border:none;width:290px;margin-left:8.5px;height:245px;border-radius:7px;background-color:#232527;" src="https://ropro.io/render/index.php?background=preview" scrolling="no"></iframe></div>
				<form class="item-graph-form" style="display:none;" action="${roproApiAdapter.buildItemGraphUrl()}" method="post" target="${chartTarget}">
					<input class="item-sales-data" name="salesData" value=''>
					<input class="input-submit" type="submit">
				</form>
				<div class="ropro-item-card-graph-shell" style="position:relative;display:inline-block;width:466px;height:307px;vertical-align:top;">
					${buildRoProLoader({id: "itemGraphLoading", className: "ropro-branded-loader-fill", style: "visibility: initial !important;position:absolute;left:7px;top:7px;width:452px;height:300px;z-index:1;"})}
					<iframe loaded='false' name="${chartTarget}" onload="if (this.getAttribute('loaded') == 'true') { var loader = this.parentNode.querySelector('#itemGraphLoading'); if (loader != null) { loader.remove(); } }" class="item-card-graph" style="display:block;border:none;width:452px;height:300px;border-radius:10px;margin-left:7px;margin-right:7px;margin-top:7px;background-color:#232527;" src="" scrolling="no"></iframe>
				</div>
				<div style="margin-left:-1.5px;width:100%;height:340px;background-color:#232527;border-radius:6px;float:right;width:173px;height:406px;margin-right:10px;margin-top:7px;"><div style="padding:5px;padding-left:10px;padding-right:10px;"><h5 style="font-weight:bold;font-size:20px;text-align:center;padding-bottom:0px;border-bottom:1px solid white;">Recent Sales</h5><p style="font-weight:bold;font-size:10px;text-align:center;padding:0px;padding-bottom:0px;padding-top:4px;">Detected by ropro.io</p></div>
				<ul style="width:100%;height:340px;background-color:#232527;overflow-y:auto;overflow-x:hidden;" id="recentSalesList">
				</ul></div><div class="popover-inner" style="width:768px;height:100px;">
				<div style="float:left;width:100%;height:100%;padding:10px;padding-top:0px;margin-top:0px;padding-bottom:0px;"><div style="width:100%;height:100%;background-color:#232527;border-radius:6px;display:flex;"><div style="flex:1;padding:15px;padding-right:0px;"><h3 class="text-label field-label price-label">Best Price</h3><div class="icon-text-wrapper clearfix icon-robux-price-container">
															<span class="icon-robux-white-16x16 wait-for-i18n-format-render"></span>
			
															<b class="text-robux-md wait-for-i18n-format-render item-card-bestprice">---</b>
													</div></div><div style="flex:1;padding:15px;padding-right:0px;"><h3 class="text-label field-label price-label">Average Price</h3><div class="icon-text-wrapper clearfix icon-robux-price-container">
															<span class="icon-robux-white-16x16 wait-for-i18n-format-render"></span>
			
															<b class="text-robux-md wait-for-i18n-format-render item-card-rap">---</b>
													</div></div><div style="flex:1;padding:15px;padding-right:0px;"><h3 class="text-label field-label price-label">Monthly Trend</h3><div class="icon-text-wrapper clearfix icon-robux-price-container">
															<span class="item-card-price-trend-icon" style="color:#7FD60D;font-weight:700;display:inline-block;width:14px;text-align:center;">▲</span>
			
															<b class="text-robux-md wait-for-i18n-format-render item-card-price-trend"><p style="font-size:11px;display:inline-block;margin-left:5px;"> This Month</p></b>
													</div></div><div style="flex:1;padding:15px;padding-right:0px;"><h3 class="text-label field-label price-label">Acronym</h3><div class="icon-text-wrapper clearfix icon-robux-price-container">
															
			
															<b class="text-robux-md wait-for-i18n-format-render item-card-acronym">AKoTN</b>
													</div></div></div></div>
			</div></div><div class="popover-inner" style="width:100px;height:100px;">		
			</div>
			
			</div>`;

  var infoCard = document.createElement("div");
  infoCard.innerHTML = infoCardHtml;
  var infoCardRoot = infoCard.childNodes[0];
  var inlineClose = infoCard.getElementsByClassName("ropro-trade-infocard-close-inline")[0];
  if (inlineClose != null) {
    inlineClose.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeTradeOfferItemChartModal();
    });
  }
  overlay.addEventListener("click", function (event) {
    if (infoCardRoot == null || !infoCardRoot.contains(event.target)) {
      closeTradeOfferItemChartModal();
    }
  });
  overlay.appendChild(infoCard);
  offersState.chartModal.visible = true;
  offersState.chartModal.overlay = overlay;
  document.body.appendChild(overlay);
  formatTradeOfferItemInfoCard(item, infoCard, requestId);
}

function createTradeOfferRobloxItemLink(assetId, nameText) {
  var normalizedId = parseInt(assetId, 10);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }
  var link = document.createElement("a");
  link.className = "ropro-trade-offer-item-name ropro-trade-offer-item-name-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.href = "https://www.roblox.com/catalog/" + normalizedId + "/Item";
  link.textContent = stripTags(String(nameText || ("Item " + normalizedId)));
  link.title = "Open Roblox item page";
  link.setAttribute("aria-label", "Open Roblox item page");
  return link;
}

function createTradeOfferItemRolimonsLogoLink(assetId) {
  var normalizedId = parseInt(assetId, 10);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }
  var link = document.createElement("a");
  link.className = "ropro-trade-offer-item-rolimons-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.href = "https://www.rolimons.com/item/" + normalizedId;
  link.setAttribute("aria-label", "Rolimon's item page");
  link.title = "Open Rolimon's item page";
  var logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("/images/rolimons_logo_icon_blue.png");
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");
  link.appendChild(logo);
  return link;
}

function createTradeOfferInlineRolimonsItemLink(assetId) {
  var normalizedId = parseInt(assetId, 10);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }
  var link = document.createElement("a");
  link.className = "ropro-trade-offers-inline-item-rolimons-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.href = "https://www.rolimons.com/item/" + normalizedId;
  link.setAttribute("aria-label", "Open Rolimon's item page");
  link.title = "Open Rolimon's item page";
  var logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("/images/rolimons_logo_icon_blue.png");
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");
  link.appendChild(logo);
  link.addEventListener("click", function (event) {
    event.stopPropagation();
  });
  link.addEventListener("keydown", function (event) {
    event.stopPropagation();
  });
  return link;
}

function createTradeOfferPickerNameNode(nameText, assetId, includeRolimonsLink) {
  var nameRow = document.createElement("div");
  nameRow.className = "ropro-trade-offers-picker-name-row";
  var nameNode = document.createElement("div");
  nameNode.className = "ropro-trade-offers-picker-name";
  nameNode.textContent = stripTags(String(nameText || ""));
  nameRow.appendChild(nameNode);
  if (includeRolimonsLink !== true) {
    return nameRow;
  }
  var rolimonsLink = createTradeOfferInlineRolimonsItemLink(assetId);
  if (rolimonsLink == null) {
    return nameRow;
  }
  rolimonsLink.classList.add("ropro-trade-offers-inline-item-rolimons-link-name");
  nameRow.appendChild(rolimonsLink);
  return nameRow;
}

function createTradeOfferItemChartButton(item) {
  var button = createButton("", "ropro-trade-offer-item-chart-btn");
  button.setAttribute(
    "aria-label",
    "Open chart for " +
      stripTags(String(item != null && typeof item.name === "string" && item.name.length > 0 ? item.name : "item"))
  );
  button.title = "Open chart";
  var icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("/images/chart_icon.svg");
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);
  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openTradeOfferItemChartModal(item);
  });
  return button;
}

function createTradeOfferItemValueStack(value, rap) {
  var wrapper = document.createElement("div");
  wrapper.className = "ropro-trade-offer-item-value";
  var valueRapSegments = getTradeOfferValueRapSegments(value, rap, false);
  for (var segmentIndex = 0; segmentIndex < valueRapSegments.length; segmentIndex++) {
    var segmentLine = document.createElement("div");
    segmentLine.className = "ropro-trade-offer-item-value-line";
    segmentLine.textContent = valueRapSegments[segmentIndex];
    wrapper.appendChild(segmentLine);
  }
  return wrapper;
}

function createItemCard(item) {
  var card = document.createElement("div");
  card.className = "ropro-trade-offer-item";
  if (item == null || item.id <= 0) {
    if (item != null && item.isTerm === true) {
      card.classList.add("ropro-trade-offer-item-term");
      var termName = document.createElement("div");
      termName.className = "ropro-trade-offer-item-name";
      termName.textContent = item.name || "Term";
      card.appendChild(termName);
      return card;
    }
    var empty = document.createElement("div");
    empty.className = "ropro-trade-offer-empty";
    empty.textContent = "No item selected";
    card.appendChild(empty);
    return card;
  }
  card.appendChild(
    createThumbnailFrame("ropro-trade-offer-thumb", item.name || ("Item " + item.id), item.id)
  );

  var actions = document.createElement("div");
  actions.className = "ropro-trade-offer-item-actions";
  actions.appendChild(createTradeOfferItemChartButton(item));
  card.appendChild(actions);

  var nameRow = document.createElement("div");
  nameRow.className = "ropro-trade-offer-item-name-row";
  var nameText = item.name || ("Item " + item.id);
  var name = createTradeOfferRobloxItemLink(item.id, nameText);
  if (name == null) {
    name = document.createElement("div");
    name.className = "ropro-trade-offer-item-name";
    name.textContent = stripTags(String(nameText));
  }
  nameRow.appendChild(name);
  var rolimonsItemLink = createTradeOfferItemRolimonsLogoLink(item.id);
  if (rolimonsItemLink != null) {
    nameRow.appendChild(rolimonsItemLink);
  }
  card.appendChild(nameRow);

  card.appendChild(createTradeOfferItemValueStack(item.value, item.rap));

  var badgeRow = document.createElement("div");
  badgeRow.className = "ropro-trade-offer-badge-row";
  if (item.projected === true) {
    var projectedBadge = document.createElement("span");
    projectedBadge.className = "ropro-trade-offer-badge ropro-trade-offer-badge-projected";
    projectedBadge.textContent = "Projected";
    badgeRow.appendChild(projectedBadge);
  }
  if (item.onHold === true) {
    var holdBadge = document.createElement("span");
    holdBadge.className = "ropro-trade-offer-badge ropro-trade-offer-badge-hold";
    holdBadge.textContent = "On Hold";
    badgeRow.appendChild(holdBadge);
  }
  var demandLabel = parseDemandLabel(item.demand);
  if (demandLabel.length > 0) {
    var demandBadge = document.createElement("span");
    demandBadge.className = "ropro-trade-offer-badge";
    demandBadge.textContent = "Demand: " + demandLabel;
    badgeRow.appendChild(demandBadge);
  }
  if (badgeRow.childNodes.length > 0) {
    card.appendChild(badgeRow);
  }
  return card;
}

function createExternalTradeOfferLink(label, href) {
  var link = document.createElement("a");
  link.className = "ropro-trade-offer-inline-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.href = href;
  link.textContent = label;
  return link;
}

function createRolimonsProfileLogoLink(userId) {
  var link = document.createElement("a");
  link.className = "ropro-trade-offer-rolimons-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.href = "https://www.rolimons.com/player/" + userId;
  link.setAttribute("aria-label", "Rolimon's profile");
  link.title = "Rolimon's profile";
  var logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("/images/rolimons_logo_icon_blue.png");
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");
  link.appendChild(logo);
  return link;
}

async function deleteTradeOfferById(wishId) {
  var response = await deleteWishlistEntry(wishId);
  var parsed = parsePayload(response);
  if (parsed == null || parsed === "ERROR") {
    return { ok: false, error: "Unable to delete that trade board post right now." };
  }
  if (typeof parsed === "object" && typeof parsed.error === "string" && parsed.error.length > 0) {
    return { ok: false, error: parsed.error };
  }
  if (typeof parsed === "object" && parsed.success === true) {
    return { ok: true };
  }
  return { ok: false, error: "Unable to confirm that the trade board post was deleted." };
}

function normalizeWishRowsFromPayload(parsed) {
  var rows = Array.isArray(parsed.wishes) ? parsed.wishes : [];
  var normalizedRows = [];
  for (var i = 0; i < rows.length; i++) {
    var normalizedRow = normalizeWishRow(rows[i]);
    if (normalizedRow != null) {
      normalizedRows.push(normalizedRow);
    }
  }
  return normalizedRows;
}

function maybeRefreshOffersListAfterPostMutations() {
  if (offersState.loading) {
    return;
  }
  if (offersState.wishes.length === 0) {
    return;
  }
  loadTradeOffers(true);
}

async function handleDeleteOfferFromOffersTab(wishId, buttonNode) {
  if (buttonNode != null) {
    buttonNode.disabled = true;
  }
  var deleteResult = await deleteTradeOfferById(wishId);
  if (buttonNode != null) {
    buttonNode.disabled = false;
  }
  if (deleteResult.ok !== true) {
    setStatusText(deleteResult.error);
    return;
  }
  await loadTradeOffers(true);
}

async function handleDeleteOfferFromMyPostsTab(wishId, buttonNode) {
  if (buttonNode != null) {
    buttonNode.disabled = true;
  }
  var deleteResult = await deleteTradeOfferById(wishId);
  if (buttonNode != null) {
    buttonNode.disabled = false;
  }
  if (deleteResult.ok !== true) {
    setMyPostsStatusText(deleteResult.error);
    return;
  }
  await loadMyTradePosts(true);
  maybeRefreshOffersListAfterPostMutations();
}

async function renderWishCards(wishes, listNode, loadMoreNode, hasMore, onDeleteWish) {
  if (listNode == null) {
    return;
  }
  listNode.textContent = "";
  for (var i = 0; i < wishes.length; i++) {
    var wish = wishes[i];
    for (var offerIndex = 0; offerIndex < wish.items.length; offerIndex++) {
      enrichItemFromMetadata(wish.items[offerIndex]);
    }
    for (var wantIndex = 0; wantIndex < wish.wantedItems.length; wantIndex++) {
      enrichItemFromMetadata(wish.wantedItems[wantIndex]);
    }

    var card = document.createElement("div");
    card.className = "ropro-trade-offer-card";

    var header = document.createElement("div");
    header.className = "ropro-trade-offer-header";
    var userBlock = document.createElement("div");
    var userLink = document.createElement("a");
    userLink.className = "ropro-trade-offer-user";
    userLink.target = "_blank";
    userLink.rel = "noopener noreferrer";
    userLink.href = wish.user > 0 ? "https://www.roblox.com/users/" + wish.user + "/profile" : "#";
    userLink.textContent = wish.username;
    var userRow = document.createElement("div");
    userRow.className = "ropro-trade-offer-user-row";
    userRow.appendChild(userLink);
    if (wish.user > 0) {
      userRow.appendChild(createRolimonsProfileLogoLink(wish.user));
      var tradeLink = createExternalTradeOfferLink("Trade", "https://www.roblox.com/users/" + wish.user + "/trade");
      tradeLink.classList.add("ropro-trade-offer-trade-link");
      userRow.appendChild(tradeLink);
    }
    userBlock.appendChild(userRow);
    var meta = document.createElement("div");
    meta.className = "ropro-trade-offer-meta";
    meta.textContent = relativeTimeFromMs(wish.posted);
    userBlock.appendChild(meta);
    header.appendChild(userBlock);

    var showSideTotals = offersState.valueCalculatorEnabled;
    var offerTotal = 0;
    var wantedTotal = 0;
    if (showSideTotals) {
      offerTotal = sumItemValues(wish.items);
      wantedTotal = sumItemValues(wish.wantedItems);
    }

    if (
      offersState.myUserId != null &&
      wish.user === offersState.myUserId &&
      typeof onDeleteWish === "function"
    ) {
      var deleteButton = createButton("Delete", "btn-control-sm ropro-trade-offers-danger");
      deleteButton.addEventListener("click", function (wishId, buttonNode) {
        return async function () {
          await onDeleteWish(wishId, buttonNode);
        };
      }(wish.wishid, deleteButton));
      header.appendChild(deleteButton);
    }

    card.appendChild(header);

    var sections = document.createElement("div");
    sections.className = "ropro-trade-offer-sections";

    var offerSection = document.createElement("div");
    offerSection.className = "ropro-trade-offer-side ropro-trade-offer-side-offering";
    var offerTitle = document.createElement("div");
    offerTitle.className = "ropro-trade-offer-section-title";
    offerTitle.classList.add("ropro-trade-offer-side-title");
    offerTitle.textContent = "Offering";
    if (showSideTotals) {
      var offerTotalValue = document.createElement("span");
      offerTotalValue.className = "ropro-trade-offer-side-value";
      offerTotalValue.textContent = ": " + addCommas(offerTotal);
      offerTitle.appendChild(offerTotalValue);
    }
    var offerItems = document.createElement("div");
    offerItems.className = "ropro-trade-offer-items";
    var offerVisibleCount = 0;
    for (var offerItemIndex = 0; offerItemIndex < wish.items.length; offerItemIndex++) {
      if (wish.items[offerItemIndex].id === -1) {
        continue;
      }
      offerVisibleCount++;
      offerItems.appendChild(createItemCard(wish.items[offerItemIndex]));
    }
    if (offerVisibleCount === 0) {
      var offerEmpty = document.createElement("div");
      offerEmpty.className = "ropro-trade-offer-empty";
      offerEmpty.textContent = "No offered items listed.";
      offerItems.appendChild(offerEmpty);
    }
    offerSection.appendChild(offerTitle);
    offerSection.appendChild(offerItems);
    sections.appendChild(offerSection);

    var wantedSection = document.createElement("div");
    wantedSection.className = "ropro-trade-offer-side ropro-trade-offer-side-wants";
    var wantedTitle = document.createElement("div");
    wantedTitle.className = "ropro-trade-offer-section-title";
    wantedTitle.classList.add("ropro-trade-offer-side-title");
    wantedTitle.textContent = "Wants";
    if (showSideTotals) {
      var wantedTotalValue = document.createElement("span");
      wantedTotalValue.className = "ropro-trade-offer-side-value";
      wantedTotalValue.textContent = ": " + addCommas(wantedTotal);
      wantedTitle.appendChild(wantedTotalValue);
    }
    var wantedItems = document.createElement("div");
    wantedItems.className = "ropro-trade-offer-items";
    var wantedVisibleCount = 0;
    for (var wantedIndex = 0; wantedIndex < wish.wantedItems.length; wantedIndex++) {
      if (wish.wantedItems[wantedIndex].id === -1) {
        continue;
      }
      wantedVisibleCount++;
      wantedItems.appendChild(createItemCard(wish.wantedItems[wantedIndex]));
    }
    if (wantedVisibleCount === 0) {
      var wantedEmpty = document.createElement("div");
      wantedEmpty.className = "ropro-trade-offer-empty";
      wantedEmpty.textContent = "No requested items listed.";
      wantedItems.appendChild(wantedEmpty);
    }
    wantedSection.appendChild(wantedTitle);
    wantedSection.appendChild(wantedItems);
    sections.appendChild(wantedSection);
    card.appendChild(sections);

    listNode.appendChild(card);
  }

  if (loadMoreNode != null) {
    loadMoreNode.style.display = hasMore === true ? "" : "none";
  }
}

async function renderWishes() {
  await renderWishCards(
    offersState.wishes,
    offersState.ui.list,
    offersState.ui.loadMore,
    offersState.hasMore,
    handleDeleteOfferFromOffersTab
  );
}

async function renderMyPosts() {
  await renderWishCards(
    offersState.myPosts,
    offersState.ui.myPostsList,
    offersState.ui.myPostsLoadMore,
    offersState.myPostsHasMore,
    handleDeleteOfferFromMyPostsTab
  );
  updateMyPostsDeleteAllButtonState();
}

async function loadTradeOffers(reset) {
  if (offersState.loading) {
    return;
  }
  if (!canViewTradeOffers()) {
    return;
  }
  offersState.loading = true;
  setRefreshButtonLoading(true);
  if (reset) {
    offersState.page = 0;
    offersState.wishes = [];
    offersState.hasMore = false;
  }
  setTradeBoardLoadingStatus();
  if (offersState.ui.loadMore != null) {
    offersState.ui.loadMore.disabled = true;
  }

  var response = await fetchWishlistAll(buildTradeOffersQueryPayload(offersState.page));
  var parsed = parsePayload(response);
  if (parsed == null || typeof parsed !== "object") {
    setStatusText("Unable to load Trade Board right now.");
    offersState.loading = false;
    if (offersState.ui.loadMore != null) {
      offersState.ui.loadMore.disabled = false;
    }
    setRefreshButtonLoading(false);
    return;
  }
  syncTradeOfferPostCooldownFromPayload(parsed);
  if (typeof parsed.error === "string") {
    setStatusText(parsed.error);
    offersState.loading = false;
    if (offersState.ui.loadMore != null) {
      offersState.ui.loadMore.disabled = false;
    }
    setRefreshButtonLoading(false);
    return;
  }

  var normalizedRows = normalizeWishRowsFromPayload(parsed);

  await hydrateItemMetadataForWishes(normalizedRows);

  if (reset) {
    offersState.wishes = normalizedRows;
  } else {
    offersState.wishes = offersState.wishes.concat(normalizedRows);
  }

  offersState.hasMore = parsed.more === true;
  offersState.page += 1;

  if (offersState.wishes.length === 0) {
    if (hasActiveTradeOffersFilters()) {
      setStatusText("No Trade Board posts match the current filters.");
    } else {
      setStatusText("No Trade Board posts yet. Post one to get started.");
    }
  } else {
    setStatusText("");
  }

  await renderWishes();

  offersState.loading = false;
  if (offersState.ui.loadMore != null) {
    offersState.ui.loadMore.disabled = false;
  }
  setRefreshButtonLoading(false);
}

async function loadMyTradePosts(reset) {
  if (offersState.myPostsLoading) {
    return;
  }
  if (!canViewTradeOffers()) {
    return;
  }
  if (!Number.isFinite(parseInt(offersState.myUserId, 10)) || parseInt(offersState.myUserId, 10) <= 0) {
    offersState.myPosts = [];
    offersState.myPostsHasMore = false;
    setMyPostsStatusText("You must be signed in to manage your posts.");
    await renderMyPosts();
    return;
  }
  offersState.myPostsLoading = true;
  updateMyPostsDeleteAllButtonState();
  if (reset) {
    offersState.myPostsPage = 0;
    offersState.myPosts = [];
    offersState.myPostsHasMore = false;
  }
  setMyPostsStatusText("Loading your posts...");
  if (offersState.ui.myPostsLoadMore != null) {
    offersState.ui.myPostsLoadMore.disabled = true;
  }

  var response = await fetchWishlistAll(buildMyPostsQueryPayload(offersState.myPostsPage));
  var parsed = parsePayload(response);
  if (parsed == null || typeof parsed !== "object") {
    setMyPostsStatusText("Unable to load your posts right now.");
    offersState.myPostsLoading = false;
    if (offersState.ui.myPostsLoadMore != null) {
      offersState.ui.myPostsLoadMore.disabled = false;
    }
    updateMyPostsDeleteAllButtonState();
    return;
  }
  syncTradeOfferPostCooldownFromPayload(parsed);
  if (typeof parsed.error === "string") {
    setMyPostsStatusText(parsed.error);
    offersState.myPostsLoading = false;
    if (offersState.ui.myPostsLoadMore != null) {
      offersState.ui.myPostsLoadMore.disabled = false;
    }
    updateMyPostsDeleteAllButtonState();
    return;
  }

  var normalizedRows = normalizeWishRowsFromPayload(parsed).filter(function (row) {
    return offersState.myUserId != null && row.user === offersState.myUserId;
  });
  await hydrateItemMetadataForWishes(normalizedRows);
  if (reset) {
    offersState.myPosts = normalizedRows;
  } else {
    offersState.myPosts = offersState.myPosts.concat(normalizedRows);
  }
  offersState.myPostsHasMore = parsed.more === true;
  offersState.myPostsPage += 1;
  offersState.myPostsLoadedOnce = true;

  if (offersState.myPosts.length === 0) {
    setMyPostsStatusText("You have no posted Trade Board posts.");
  } else {
    setMyPostsStatusText(addCommas(offersState.myPosts.length) + " posted offers");
  }

  await renderMyPosts();
  offersState.myPostsLoading = false;
  if (offersState.ui.myPostsLoadMore != null) {
    offersState.ui.myPostsLoadMore.disabled = false;
  }
  updateMyPostsDeleteAllButtonState();
}

function closeMyPostsDeleteAllModal() {
  if (!offersState.myPostsDeleteModal.visible || offersState.myPostsDeleteModal.overlay == null) {
    return;
  }
  var overlay = offersState.myPostsDeleteModal.overlay;
  if (overlay.parentNode != null) {
    overlay.parentNode.removeChild(overlay);
  }
  offersState.myPostsDeleteModal.visible = false;
  offersState.myPostsDeleteModal.overlay = null;
  updateMyPostsDeleteAllButtonState();
}

async function fetchAllMyPostIdsForDeletion() {
  if (!Number.isFinite(parseInt(offersState.myUserId, 10)) || parseInt(offersState.myUserId, 10) <= 0) {
    return { error: "You must be signed in to delete your posts." };
  }
  var ids = [];
  var seen = {};
  var page = 0;
  var guard = 0;
  while (guard < 250) {
    var response = await fetchWishlistAll(buildMyPostsQueryPayload(page));
    var parsed = parsePayload(response);
    if (parsed == null || typeof parsed !== "object") {
      return { error: "Unable to load your posts right now." };
    }
    syncTradeOfferPostCooldownFromPayload(parsed);
    if (typeof parsed.error === "string") {
      return { error: parsed.error };
    }
    var normalizedRows = normalizeWishRowsFromPayload(parsed);
    for (var rowIndex = 0; rowIndex < normalizedRows.length; rowIndex++) {
      var row = normalizedRows[rowIndex];
      if (
        row == null ||
        !Number.isFinite(parseInt(row.wishid, 10)) ||
        row.user !== offersState.myUserId
      ) {
        continue;
      }
      var wishId = parseInt(row.wishid, 10);
      if (seen[String(wishId)] === true) {
        continue;
      }
      seen[String(wishId)] = true;
      ids.push(wishId);
    }
    if (parsed.more !== true) {
      break;
    }
    page += 1;
    guard += 1;
  }
  if (guard >= 250) {
    return { error: "Unable to confirm every post for deletion. Please try again." };
  }
  return { ids: ids };
}

async function deleteAllMyPosts() {
  var collected = await fetchAllMyPostIdsForDeletion();
  if (collected == null || typeof collected !== "object") {
    return { error: "Unable to load your posts right now." };
  }
  if (typeof collected.error === "string") {
    return { error: collected.error };
  }
  var ids = Array.isArray(collected.ids) ? collected.ids : [];
  if (ids.length === 0) {
    return { deleted: 0, failed: 0, total: 0 };
  }
  var deleted = 0;
  var failed = 0;
  var firstError = "";
  for (var i = 0; i < ids.length; i++) {
    var deleteResult = await deleteTradeOfferById(ids[i]);
    if (deleteResult.ok === true) {
      deleted += 1;
    } else {
      failed += 1;
      if (firstError.length === 0 && typeof deleteResult.error === "string" && deleteResult.error.length > 0) {
        firstError = deleteResult.error;
      }
    }
  }
  return {
    deleted: deleted,
    failed: failed,
    total: ids.length,
    firstError: firstError,
  };
}

function openMyPostsDeleteAllModal() {
  if (offersState.myPostsDeleteModal.deleting || offersState.myPosts.length === 0) {
    return;
  }
  closeMyPostsDeleteAllModal();
  var overlay = document.createElement("div");
  overlay.className = "ropro-trade-offers-confirm-overlay";
  var modal = document.createElement("div");
  modal.className = "ropro-trade-offers-confirm-modal";
  var title = document.createElement("div");
  title.className = "ropro-trade-offers-confirm-title";
  title.textContent = "Delete all posts?";
  var message = document.createElement("p");
  message.className = "ropro-trade-offers-confirm-copy";
  message.textContent =
    "This will delete all of your Trade Board posts. This action cannot be undone.";
  var actions = document.createElement("div");
  actions.className = "ropro-trade-offers-confirm-actions";
  var cancelButton = createButton("Cancel", "btn-control-sm");
  var confirmButton = createButton("Delete All", "btn-control-sm ropro-trade-offers-delete-all-confirm-btn");

  cancelButton.addEventListener("click", function () {
    if (offersState.myPostsDeleteModal.deleting) {
      return;
    }
    closeMyPostsDeleteAllModal();
  });
  confirmButton.addEventListener("click", async function () {
    if (offersState.myPostsDeleteModal.deleting) {
      return;
    }
    offersState.myPostsDeleteModal.deleting = true;
    updateMyPostsDeleteAllButtonState();
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    setMyPostsStatusText("Deleting your posts...");
    var deletionResult = await deleteAllMyPosts();
    offersState.myPostsDeleteModal.deleting = false;
    closeMyPostsDeleteAllModal();
    if (deletionResult == null || typeof deletionResult !== "object") {
      setMyPostsStatusText("Unable to delete your posts right now.");
      updateMyPostsDeleteAllButtonState();
      return;
    }
    if (typeof deletionResult.error === "string") {
      setMyPostsStatusText(deletionResult.error);
      updateMyPostsDeleteAllButtonState();
      return;
    }
    var deleted = Number.isFinite(parseInt(deletionResult.deleted, 10)) ? parseInt(deletionResult.deleted, 10) : 0;
    var failed = Number.isFinite(parseInt(deletionResult.failed, 10)) ? parseInt(deletionResult.failed, 10) : 0;
    await loadMyTradePosts(true);
    maybeRefreshOffersListAfterPostMutations();
    if (deleted === 0 && failed === 0) {
      setMyPostsStatusText("You have no posted Trade Board posts.");
      return;
    }
    if (failed > 0) {
      var failureCopy = "Deleted " + addCommas(deleted) + " post" + (deleted === 1 ? "" : "s") + ".";
      if (deleted === 0) {
        failureCopy = "Unable to delete your posts right now.";
      }
      if (typeof deletionResult.firstError === "string" && deletionResult.firstError.length > 0) {
        failureCopy += " " + deletionResult.firstError;
      }
      setMyPostsStatusText(failureCopy);
      return;
    }
    setMyPostsStatusText("Deleted " + addCommas(deleted) + " post" + (deleted === 1 ? "" : "s") + ".");
  });

  actions.appendChild(cancelButton);
  actions.appendChild(confirmButton);
  modal.appendChild(title);
  modal.appendChild(message);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay && !offersState.myPostsDeleteModal.deleting) {
      closeMyPostsDeleteAllModal();
    }
  });

  offersState.myPostsDeleteModal.visible = true;
  offersState.myPostsDeleteModal.overlay = overlay;
  document.body.appendChild(overlay);
}

function closeComposerModal() {
  if (!offersState.composer.visible || offersState.composer.overlay == null) {
    return;
  }
  if (offersState.composer.overlay.parentNode != null) {
    offersState.composer.overlay.parentNode.removeChild(offersState.composer.overlay);
  }
  offersState.composer.visible = false;
  offersState.composer.overlay = null;
  offersState.composer.offeredFilter = "";
  offersState.composer.wantedFilter = "";
  offersState.composer.wantedRows = [];
  offersState.composer.wantedSelected = [];
  offersState.composer.offeredSelected = [];
  offersState.composer.status = "";
}

function updateComposerStatus(text) {
  offersState.composer.status = stripTags(String(text || ""));
  var statusNode = offersState.composer.overlay
    ? offersState.composer.overlay.querySelector(".ropro-trade-offers-composer-status")
    : null;
  if (statusNode != null) {
    statusNode.textContent = offersState.composer.status;
  }
}

function getComposerOfferedSelectionIndex(selectionKey) {
  for (var i = 0; i < offersState.composer.offeredSelected.length; i++) {
    if (String(offersState.composer.offeredSelected[i].selectionKey) === String(selectionKey)) {
      return i;
    }
  }
  return -1;
}

function getComposerOfferedSelectedCount() {
  var total = 0;
  for (var i = 0; i < offersState.composer.offeredSelected.length; i++) {
    var quantity = parseInt(offersState.composer.offeredSelected[i].quantity, 10);
    total += Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }
  return total;
}

function getComposerWantedSelectionIndex(itemId) {
  for (var i = 0; i < offersState.composer.wantedSelected.length; i++) {
    if (String(offersState.composer.wantedSelected[i].id) === String(itemId)) {
      return i;
    }
  }
  return -1;
}

function removeComposerOfferedSelection(selectionKey) {
  offersState.composer.offeredSelected = offersState.composer.offeredSelected.filter(function (entry) {
    return String(entry.selectionKey) !== String(selectionKey);
  });
}

function normalizeComposerWantedSelection(entry) {
  if (entry != null && entry.isTerm === true) {
    return createTradeTermSelection(entry.id);
  }
  if (entry == null || !Number.isFinite(parseInt(entry.id, 10))) {
    return null;
  }
  var normalizedId = parseInt(entry.id, 10);
  return {
    id: normalizedId,
    assetId: normalizedId,
    name: stripTags(String(entry.name || "Item " + normalizedId)),
    rap: Number.isFinite(parseInt(entry.rap, 10)) ? parseInt(entry.rap, 10) : 0,
    value: Number.isFinite(parseInt(entry.value, 10)) ? parseInt(entry.value, 10) : -1,
    projected: entry.projected === true,
    demand: Number.isFinite(parseInt(entry.demand, 10)) ? parseInt(entry.demand, 10) : null,
    isTerm: false,
  };
}

function removeOneComposerOfferedSelection(selectionKey) {
  var selectionIndex = getComposerOfferedSelectionIndex(selectionKey);
  if (selectionIndex === -1) {
    return;
  }
  var currentCount = parseInt(offersState.composer.offeredSelected[selectionIndex].quantity, 10);
  if (!Number.isFinite(currentCount) || currentCount <= 1) {
    removeComposerOfferedSelection(selectionKey);
  } else {
    offersState.composer.offeredSelected[selectionIndex].quantity = currentCount - 1;
  }
}

function getComposerOfferedSlotEntries() {
  var slots = [];
  for (var i = 0; i < offersState.composer.offeredSelected.length; i++) {
    var offeredEntry = offersState.composer.offeredSelected[i];
    var quantity = parseInt(offeredEntry.quantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      quantity = 1;
    }
    for (var quantityIndex = 0; quantityIndex < quantity && slots.length < 4; quantityIndex++) {
      slots.push({
        selectionKey: offeredEntry.selectionKey,
        assetId: offeredEntry.assetId,
        name: offeredEntry.name,
        rap: Number.isFinite(parseInt(offeredEntry.rap, 10)) ? parseInt(offeredEntry.rap, 10) : 0,
        value: Number.isFinite(parseInt(offeredEntry.value, 10)) ? parseInt(offeredEntry.value, 10) : -1,
        isTerm: offeredEntry.isTerm === true,
      });
    }
    if (slots.length >= 4) {
      break;
    }
  }
  return slots;
}

function createComposerSlotNode(entry, side) {
  var slot = document.createElement("button");
  slot.type = "button";
  slot.className = "ropro-trade-offers-slot";
  if (entry == null) {
    slot.classList.add("ropro-trade-offers-slot-empty");
    slot.disabled = true;
    return slot;
  }
  slot.classList.add("ropro-trade-offers-slot-filled");
  slot.title = "Click to remove";
  var resolvedAssetId = Number.isFinite(parseInt(entry.assetId, 10))
    ? parseInt(entry.assetId, 10)
    : Number.isFinite(parseInt(entry.id, 10))
      ? parseInt(entry.id, 10)
      : -1;
  if (entry.isTerm === true) {
    slot.classList.add("ropro-trade-offers-slot-term");
    var termName = document.createElement("div");
    termName.className = "ropro-trade-offers-slot-name";
    termName.textContent = entry.name || "Term";
    slot.appendChild(termName);
  } else {
    var contentNode = document.createElement("div");
    contentNode.className = "ropro-trade-offers-slot-content";
    contentNode.appendChild(createThumbnailFrame("ropro-trade-offers-slot-thumb", entry.name, resolvedAssetId));
    var detailsNode = document.createElement("div");
    detailsNode.className = "ropro-trade-offers-slot-details";
    var nameNode = document.createElement("div");
    nameNode.className = "ropro-trade-offers-slot-name";
    nameNode.textContent = entry.name || ("Item " + resolvedAssetId);
    detailsNode.appendChild(nameNode);
    var metaNode = document.createElement("div");
    metaNode.className = "ropro-trade-offers-slot-meta";
    var resolvedValue = Number.isFinite(parseInt(entry.value, 10)) ? parseInt(entry.value, 10) : -1;
    if (resolvedValue < 0 && resolvedAssetId > 0) {
      var cachedValue = parseInt(offersState.composer.offeredValueByAssetId[String(resolvedAssetId)], 10);
      if (Number.isFinite(cachedValue) && cachedValue > 0) {
        resolvedValue = cachedValue;
      }
    }
    metaNode.textContent = formatValueRapLine(resolvedValue, entry.rap, true);
    detailsNode.appendChild(metaNode);
    contentNode.appendChild(detailsNode);
    slot.appendChild(contentNode);
  }
  var removeIndicator = document.createElement("span");
  removeIndicator.className = "ropro-outfit-delete-button ropro-wearing-delete-button ropro-trade-offers-slot-remove-indicator";
  removeIndicator.textContent = "\u00D7";
  removeIndicator.setAttribute("aria-hidden", "true");
  slot.appendChild(removeIndicator);
  slot.addEventListener("click", function () {
    if (side === "offered") {
      removeOneComposerOfferedSelection(entry.selectionKey);
      renderComposerSelections();
      renderComposerOfferedRows();
      return;
    }
    offersState.composer.wantedSelected = offersState.composer.wantedSelected.filter(function (wantedEntry) {
      return String(wantedEntry.id) !== String(entry.id);
    });
    renderComposerSelections();
    renderComposerWantedRows();
  });
  return slot;
}

function renderComposerTermRows(side) {
  if (offersState.composer.overlay == null) {
    return;
  }
  var selector = side === "offered"
    ? ".ropro-trade-offers-term-list-offered"
    : ".ropro-trade-offers-term-list-wanted";
  var listNode = offersState.composer.overlay.querySelector(selector);
  if (listNode == null) {
    return;
  }
  listNode.textContent = "";
  for (var i = 0; i < TRADE_TERM_TOKENS.length; i++) {
    var termToken = TRADE_TERM_TOKENS[i];
    if (termToken.key === "robux") {
      continue;
    }
    var isSelected = false;
    if (side === "offered") {
      isSelected = getComposerOfferedSelectionIndex("term:" + termToken.id) !== -1;
    } else {
      isSelected = getComposerWantedSelectionIndex(termToken.id) !== -1;
    }

    var termPill = createButton(termToken.name, "ropro-trade-offers-chip ropro-trade-offers-term-pill");
    termPill.classList.toggle("ropro-trade-offers-term-pill-active", isSelected);
    termPill.setAttribute("aria-pressed", isSelected ? "true" : "false");
    termPill.addEventListener("click", function (token, selected, sideName) {
      return function () {
        if (sideName === "offered") {
          if (selected) {
            removeComposerOfferedSelection("term:" + token.id);
          } else {
            if (getComposerOfferedSelectedCount() >= 4) {
              updateComposerStatus("You can only offer up to 4 items.");
              return;
            }
            offersState.composer.offeredSelected.push({
              selectionKey: "term:" + token.id,
              assetId: token.id,
              id: token.id,
              name: token.name,
              quantity: 1,
              maxQuantity: 1,
              rap: 0,
              value: 0,
              isTerm: true,
            });
          }
          renderComposerSelections();
          renderComposerOfferedRows();
          return;
        }
        if (selected) {
          offersState.composer.wantedSelected = offersState.composer.wantedSelected.filter(function (entry) {
            return String(entry.id) !== String(token.id);
          });
        } else {
          if (offersState.composer.wantedSelected.length >= 4) {
            updateComposerStatus("You can only request up to 4 items.");
            return;
          }
          var termSelection = createTradeTermSelection(token.id);
          if (termSelection != null) {
            offersState.composer.wantedSelected.push(termSelection);
          }
        }
        renderComposerSelections();
        renderComposerWantedRows();
      };
    }(termToken, isSelected, side));
    listNode.appendChild(termPill);
  }
}

function renderComposerSelections() {
  if (offersState.composer.overlay == null) {
    return;
  }
  var offeredSlotsContainer = offersState.composer.overlay.querySelector(".ropro-trade-offers-slot-grid-offered");
  if (offeredSlotsContainer != null) {
    offeredSlotsContainer.textContent = "";
    var offeredSlotEntries = getComposerOfferedSlotEntries();
    for (var offeredSlotIndex = 0; offeredSlotIndex < 4; offeredSlotIndex++) {
      offeredSlotsContainer.appendChild(createComposerSlotNode(offeredSlotEntries[offeredSlotIndex], "offered"));
    }
  }
  var wantedSlotsContainer = offersState.composer.overlay.querySelector(".ropro-trade-offers-slot-grid-wanted");
  if (wantedSlotsContainer != null) {
    wantedSlotsContainer.textContent = "";
    for (var wantedSlotIndex = 0; wantedSlotIndex < 4; wantedSlotIndex++) {
      wantedSlotsContainer.appendChild(
        createComposerSlotNode(offersState.composer.wantedSelected[wantedSlotIndex], "wanted")
      );
    }
  }
  renderComposerTermRows("offered");
  renderComposerTermRows("wanted");
}

function renderComposerOfferedRows() {
  if (offersState.composer.overlay == null) {
    return;
  }
  var listNode = offersState.composer.overlay.querySelector(".ropro-trade-offers-offered-list");
  if (listNode == null) {
    return;
  }
  listNode.textContent = "";
  var filter = normalizeTradeSearchText(offersState.composer.offeredFilter);
  var visibleRows = offersState.composer.offeredRows.filter(function (row) {
    if (filter.length === 0) {
      return true;
    }
    var rowName = normalizeTradeSearchText(row.name);
    if (rowName.indexOf(filter) !== -1) {
      return true;
    }
    var rowAcronym = offersState.composer.offeredAcronymByAssetId[String(row.assetId)];
    return typeof rowAcronym === "string" && rowAcronym.indexOf(filter) !== -1;
  });
  visibleRows = visibleRows.slice(0, 180);
  if (visibleRows.length === 0) {
    var empty = document.createElement("div");
    empty.className = "ropro-trade-offer-empty";
    empty.textContent = "No tradable items found for this search.";
    listNode.appendChild(empty);
    return;
  }

  for (var i = 0; i < visibleRows.length; i++) {
    var row = visibleRows[i];
    var selectionIndex = getComposerOfferedSelectionIndex(row.selectionKey);
    var selectedQuantity =
      selectionIndex === -1 ? 0 : parseInt(offersState.composer.offeredSelected[selectionIndex].quantity, 10);
    if (!Number.isFinite(selectedQuantity) || selectedQuantity < 0) {
      selectedQuantity = 0;
    }
    var pickerRow = document.createElement("div");
    pickerRow.className = "ropro-trade-offers-picker-row ropro-trade-offers-picker-row-clickable";
    pickerRow.appendChild(createThumbnailFrame("ropro-trade-offers-picker-thumb", row.name, row.assetId));

    var meta = document.createElement("div");
    meta.className = "ropro-trade-offers-picker-meta";
    meta.appendChild(createTradeOfferPickerNameNode(row.name, row.assetId, true));
    var sub = document.createElement("div");
    sub.className = "ropro-trade-offers-picker-sub";
    var subSegments = [formatValueRapLine(row.value, row.rap, true)];
    if (Number.isFinite(row.serialNumber)) {
      subSegments.push("Serial #" + row.serialNumber);
    }
    if (row.holdCount > 0) {
      subSegments.push("On Hold: " + row.holdCount);
    }
    if (selectedQuantity > 0) {
      var availableCountForDisplay = row.availableCount > 0 ? row.availableCount : selectedQuantity;
      subSegments.push("Selected " + selectedQuantity + "/" + availableCountForDisplay);
    } else if (row.availableCount > 1) {
      subSegments.push("Count: " + row.availableCount);
    } else if (row.availableCount <= 0) {
      subSegments.push("Unavailable");
    }
    sub.textContent = subSegments.join(" | ");
    meta.appendChild(sub);
    pickerRow.appendChild(meta);
    var canAdd = row.availableCount > selectedQuantity && getComposerOfferedSelectedCount() < 4;
    pickerRow.classList.toggle("ropro-trade-offers-picker-row-selected", selectedQuantity > 0);
    pickerRow.classList.toggle("ropro-trade-offers-picker-row-disabled", !canAdd);
    var actionLabel = document.createElement("div");
    actionLabel.className = "ropro-trade-offers-picker-action";
    if (row.availableCount <= 0) {
      actionLabel.textContent = "Unavailable";
    } else if (selectedQuantity > 0) {
      actionLabel.textContent = "Click to add";
    } else {
      actionLabel.textContent = "Click to add";
    }
    pickerRow.appendChild(actionLabel);
    pickerRow.addEventListener("click", function (inventoryRow) {
      return function () {
        var totalCount = getComposerOfferedSelectedCount();
        var currentIndex = getComposerOfferedSelectionIndex(inventoryRow.selectionKey);
        var currentCount = currentIndex === -1
          ? 0
          : parseInt(offersState.composer.offeredSelected[currentIndex].quantity, 10);
        if (!Number.isFinite(currentCount) || currentCount < 0) {
          currentCount = 0;
        }
        if (totalCount >= 4) {
          updateComposerStatus("You can only offer up to 4 items.");
          return;
        }
        if (inventoryRow.availableCount <= 0 || currentCount >= inventoryRow.availableCount) {
          return;
        }
        if (currentIndex === -1) {
          offersState.composer.offeredSelected.push({
            selectionKey: inventoryRow.selectionKey,
            assetId: inventoryRow.assetId,
            id: inventoryRow.assetId,
            name: inventoryRow.name,
            quantity: 1,
            maxQuantity: inventoryRow.availableCount,
            rap: Number.isFinite(parseInt(inventoryRow.rap, 10)) ? parseInt(inventoryRow.rap, 10) : 0,
            value: Number.isFinite(parseInt(inventoryRow.value, 10)) ? parseInt(inventoryRow.value, 10) : -1,
            isTerm: false,
          });
        } else {
          offersState.composer.offeredSelected[currentIndex].quantity = currentCount + 1;
        }
        renderComposerSelections();
        renderComposerOfferedRows();
      };
    }(row));
    listNode.appendChild(pickerRow);
  }
}

function normalizeWantedRows(payload) {
  var parsed = parsePayload(payload);
  var rows = [];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed != null && typeof parsed === "object") {
    if (Array.isArray(parsed.items)) {
      rows = parsed.items;
    } else if (Array.isArray(parsed.data)) {
      rows = parsed.data;
    }
  }
  var normalizedRows = [];
  var seenIds = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row == null || typeof row !== "object") {
      continue;
    }
    var id = parseInt(row.id || row.assetId, 10);
    if (!Number.isFinite(id) || id <= 0 || seenIds[String(id)]) {
      continue;
    }
    seenIds[String(id)] = true;
    normalizedRows.push({
      id: id,
      name: typeof row.name === "string" ? stripTags(row.name) : "Item " + id,
      rap: Number.isFinite(parseInt(row.rap, 10)) ? parseInt(row.rap, 10) : 0,
      value: Number.isFinite(parseInt(row.value, 10)) ? parseInt(row.value, 10) : -1,
      projected: row.projected === true,
      demand: Number.isFinite(parseInt(row.demand, 10)) ? parseInt(row.demand, 10) : null,
      acronym: extractWantedRowAcronym(row),
    });
  }
  return normalizedRows;
}

function renderComposerWantedRows() {
  if (offersState.composer.overlay == null) {
    return;
  }
  var listNode = offersState.composer.overlay.querySelector(".ropro-trade-offers-wanted-list");
  if (listNode == null) {
    return;
  }
  listNode.textContent = "";
  if (offersState.composer.wantedRows.length === 0) {
    var empty = document.createElement("div");
    empty.className = "ropro-trade-offer-empty";
    empty.textContent = "Search for limited items to add.";
    listNode.appendChild(empty);
    return;
  }
  for (var i = 0; i < offersState.composer.wantedRows.length; i++) {
    var row = offersState.composer.wantedRows[i];
    var selected = getComposerWantedSelectionIndex(row.id) !== -1;
    var pickerRow = document.createElement("div");
    pickerRow.className = "ropro-trade-offers-picker-row ropro-trade-offers-picker-row-clickable";
    pickerRow.classList.toggle("ropro-trade-offers-picker-row-selected", selected);
    var canAdd = selected || offersState.composer.wantedSelected.length < 4;
    pickerRow.classList.toggle("ropro-trade-offers-picker-row-disabled", !canAdd);
    pickerRow.appendChild(createThumbnailFrame("ropro-trade-offers-picker-thumb", row.name, row.id));

    var meta = document.createElement("div");
    meta.className = "ropro-trade-offers-picker-meta";
    meta.appendChild(createTradeOfferPickerNameNode(row.name, row.id, true));
    var sub = document.createElement("div");
    sub.className = "ropro-trade-offers-picker-sub";
    var wantedSegments = [formatValueRapLine(row.value, row.rap, true)];
    sub.textContent = wantedSegments.join(" | ");
    meta.appendChild(sub);
    pickerRow.appendChild(meta);
    var actionLabel = document.createElement("div");
    actionLabel.className = "ropro-trade-offers-picker-action";
    actionLabel.textContent = selected ? "Selected" : "Click to add";
    pickerRow.appendChild(actionLabel);
    pickerRow.addEventListener("click", function (wantedRow, isSelected) {
      return function () {
        if (isSelected) {
          offersState.composer.wantedSelected = offersState.composer.wantedSelected.filter(
            function (entry) {
              return String(entry.id) !== String(wantedRow.id);
            }
          );
        } else {
          if (offersState.composer.wantedSelected.length >= 4) {
            updateComposerStatus("You can only request up to 4 items.");
            return;
          }
          var wantedSelection = normalizeComposerWantedSelection(wantedRow);
          if (wantedSelection != null) {
            offersState.composer.wantedSelected.push(wantedSelection);
          }
        }
        renderComposerSelections();
        renderComposerWantedRows();
      };
    }(row, selected));
    listNode.appendChild(pickerRow);
  }
}

var wantedSearchTimer = null;

function queueWantedSearch(query) {
  if (wantedSearchTimer != null) {
    clearTimeout(wantedSearchTimer);
  }
  wantedSearchTimer = setTimeout(async function () {
    var trimmed = normalizeTradeSearchText(query);
    if (trimmed.length < 2) {
      offersState.composer.wantedRows = [];
      renderComposerWantedRows();
      return;
    }
    var requestId = offersState.composer.wantedRequestId + 1;
    offersState.composer.wantedRequestId = requestId;
    var response = await fetchTradeItemSearch(trimmed);
    if (offersState.composer.wantedRequestId !== requestId) {
      return;
    }
    var rows = normalizeWantedRows(response);
    await hydrateRowAcronyms(rows, offersState.composer.wantedAcronymByAssetId);
    if (offersState.composer.wantedRequestId !== requestId) {
      return;
    }
    offersState.composer.wantedRows = rows.filter(function (row) {
      return doesTradeSearchRowMatch(row, trimmed);
    });
    renderComposerWantedRows();
  }, 240);
}

function normalizeComposerOfferedRows(rows) {
  var grouped = {};
  var orderedKeys = [];
  var normalizedRows = [];
  if (!Array.isArray(rows)) {
    return normalizedRows;
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row == null || typeof row !== "object") {
      continue;
    }
    var assetId = parseInt(row.assetId, 10);
    if (!Number.isFinite(assetId) || assetId <= 0) {
      continue;
    }
    var name = typeof row.name === "string" ? stripTags(row.name) : "Item " + assetId;
    var rap = Number.isFinite(parseInt(row.recentAveragePrice, 10))
      ? parseInt(row.recentAveragePrice, 10)
      : Number.isFinite(parseInt(row.rap, 10))
        ? parseInt(row.rap, 10)
        : 0;
    var value = Number.isFinite(parseInt(row.value, 10)) ? parseInt(row.value, 10) : -1;
    var serialNumber = parseInt(row.serialNumber, 10);
    if (!Number.isFinite(serialNumber) || serialNumber <= 0) {
      serialNumber = null;
    }
    var hold = row.isOnHold === true;
    var selectionKey = serialNumber == null
      ? "asset:" + assetId + ":bulk"
      : "asset:" + assetId + ":serial:" + serialNumber;
    if (!grouped.hasOwnProperty(selectionKey)) {
      grouped[selectionKey] = {
        selectionKey: selectionKey,
        assetId: assetId,
        name: name,
        rap: rap,
        value: value,
        serialNumber: serialNumber,
        availableCount: 0,
        holdCount: 0,
      };
      orderedKeys.push(selectionKey);
    }
    if (hold) {
      grouped[selectionKey].holdCount += 1;
    } else {
      grouped[selectionKey].availableCount += 1;
    }
  }
  for (var keyIndex = 0; keyIndex < orderedKeys.length; keyIndex++) {
    var groupedRow = grouped[orderedKeys[keyIndex]];
    if (groupedRow == null) {
      continue;
    }
    normalizedRows.push(groupedRow);
  }
  return normalizedRows;
}

async function submitComposerOffer() {
  if (getComposerOfferedSelectedCount() === 0) {
    updateComposerStatus("Select at least one offered item.");
    return;
  }
  if (offersState.composer.wantedSelected.length === 0) {
    updateComposerStatus("Select at least one wanted item.");
    return;
  }
  var submitButton = offersState.composer.overlay
    ? offersState.composer.overlay.querySelector(".ropro-trade-offers-submit")
    : null;
  if (submitButton != null) {
    submitButton.disabled = true;
  }
  updateComposerStatus("Posting offer...");
  var offered = [];
  for (var offeredIndex = 0; offeredIndex < offersState.composer.offeredSelected.length; offeredIndex++) {
    var offeredEntry = offersState.composer.offeredSelected[offeredIndex];
    var quantity = parseInt(offeredEntry.quantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      quantity = 1;
    }
    for (var quantityIndex = 0; quantityIndex < quantity && offered.length < 4; quantityIndex++) {
      offered.push(offeredEntry);
    }
    if (offered.length >= 4) {
      break;
    }
  }
  var wanted = offersState.composer.wantedSelected.slice(0, 4);
  function getPostedItemId(entry, side) {
    if (entry == null || typeof entry !== "object") {
      return -1;
    }
    if (entry.isTerm === true) {
      return Number.isFinite(parseInt(entry.id, 10)) ? parseInt(entry.id, 10) : -1;
    }
    if (side === "offered") {
      return Number.isFinite(parseInt(entry.assetId, 10)) ? parseInt(entry.assetId, 10) : -1;
    }
    return Number.isFinite(parseInt(entry.id, 10)) ? parseInt(entry.id, 10) : -1;
  }
  var payload = {
    userId: offersState.myUserId,
    want_item: getPostedItemId(wanted[0], "wanted"),
    want_item2: getPostedItemId(wanted[1], "wanted"),
    want_item3: getPostedItemId(wanted[2], "wanted"),
    want_item4: getPostedItemId(wanted[3], "wanted"),
    want_value: 0,
    item1: getPostedItemId(offered[0], "offered"),
    item2: getPostedItemId(offered[1], "offered"),
    item3: getPostedItemId(offered[2], "offered"),
    item4: getPostedItemId(offered[3], "offered"),
    note: "",
  };
  var parsed = null;
  try {
    var response = await postWishlist(payload);
    parsed = parsePayload(response);
  } catch (_) {
    parsed = null;
  }
  if (submitButton != null) {
    submitButton.disabled = false;
  }
  if (parsed == null || parsed === "ERROR") {
    updateComposerStatus("Unable to post offer right now. Please try again.");
    return;
  }
  if (typeof parsed !== "object") {
    updateComposerStatus("Unable to confirm the post response. Please try again.");
    return;
  }
  if (typeof parsed.error === "string" && parsed.error.length > 0) {
    syncTradeOfferPostCooldownFromPayload(parsed);
    updateComposerStatus(parsed.error);
    return;
  }
  var postedWishId = parseInt(parsed.wishid, 10);
  if (parsed.success !== true && !Number.isFinite(postedWishId)) {
    syncTradeOfferPostCooldownFromPayload(parsed);
    updateComposerStatus("Unable to confirm that your offer posted. Please refresh and try again.");
    return;
  }
  syncTradeOfferPostCooldownFromPayload(parsed);
  if (getTradeOfferPostCooldownRemainingSeconds() <= 0) {
    setTradeOfferPostCooldown(
      offersState.postCooldown.cooldownSeconds,
      offersState.postCooldown.cooldownSeconds
    );
  }
  updateComposerStatus("Offer posted.");
  closeComposerModal();
  await loadTradeOffers(true);
}

async function openComposerModal() {
  if (offersState.composer.visible) {
    return;
  }
  var remainingSeconds = getTradeOfferPostCooldownRemainingSeconds();
  if (remainingSeconds > 0) {
    setStatusText("You can post again in " + formatCooldownCountdown(remainingSeconds) + ".");
    renderTradeOfferPostControls();
    return;
  }
  updateComposerStatus("");
  offersState.composer.visible = true;

  var overlay = document.createElement("div");
  overlay.className = "ropro-trade-offers-composer-overlay";

  var modal = document.createElement("div");
  modal.className = "ropro-trade-offers-composer";

  var header = document.createElement("div");
  header.className = "ropro-trade-offers-composer-header";
  var headerTitle = document.createElement("div");
  headerTitle.textContent = "Post to Trade Board";
  var closeButton = createButton("Close", "btn-control-sm");
  closeButton.addEventListener("click", closeComposerModal);
  header.appendChild(headerTitle);
  header.appendChild(closeButton);

  var body = document.createElement("div");
  body.className = "ropro-trade-offers-composer-body";

  var slotsLayout = document.createElement("div");
  slotsLayout.className = "ropro-trade-offers-composer-slots";

  var offeredSlotsSide = document.createElement("div");
  offeredSlotsSide.className = "ropro-trade-offers-slot-side";
  var offeredSlotsTitle = document.createElement("div");
  offeredSlotsTitle.className = "ropro-trade-offer-section-title";
  offeredSlotsTitle.textContent = "Your Offer";
  var offeredSlotsGrid = document.createElement("div");
  offeredSlotsGrid.className = "ropro-trade-offers-slot-grid ropro-trade-offers-slot-grid-offered";
  offeredSlotsSide.appendChild(offeredSlotsTitle);
  offeredSlotsSide.appendChild(offeredSlotsGrid);

  var wantedSlotsSide = document.createElement("div");
  wantedSlotsSide.className = "ropro-trade-offers-slot-side";
  var wantedSlotsTitle = document.createElement("div");
  wantedSlotsTitle.className = "ropro-trade-offer-section-title";
  wantedSlotsTitle.textContent = "You Want";
  var wantedSlotsGrid = document.createElement("div");
  wantedSlotsGrid.className = "ropro-trade-offers-slot-grid ropro-trade-offers-slot-grid-wanted";
  wantedSlotsSide.appendChild(wantedSlotsTitle);
  wantedSlotsSide.appendChild(wantedSlotsGrid);

  slotsLayout.appendChild(offeredSlotsSide);
  slotsLayout.appendChild(wantedSlotsSide);
  body.appendChild(slotsLayout);

  var columns = document.createElement("div");
  columns.className = "ropro-trade-offers-composer-columns";

  var offeredColumn = document.createElement("div");
  offeredColumn.className = "ropro-trade-offers-column";
  var offeredTitle = document.createElement("div");
  offeredTitle.className = "ropro-trade-offer-section-title";
  offeredTitle.textContent = "Your Tradable Items";
  var offeredSearchField = createClearableSearchInput(
    "Search",
    "form-control input-field ropro-trade-offers-composer-offered-search",
    "ropro-trade-offers-search-input-wrap"
  );
  var offeredSearch = offeredSearchField.input;
  var offeredTermsTitle = document.createElement("div");
  offeredTermsTitle.className = "ropro-trade-offers-term-pill-title";
  offeredTermsTitle.textContent = "Common Terms";
  var offeredTermsList = document.createElement("div");
  offeredTermsList.className = "ropro-trade-offers-term-list ropro-trade-offers-term-list-offered";
  var offeredList = document.createElement("div");
  offeredList.className = "ropro-trade-offers-item-picker ropro-trade-offers-offered-list";
  offeredColumn.appendChild(offeredTitle);
  offeredColumn.appendChild(offeredSearchField.wrapper);
  offeredColumn.appendChild(offeredTermsTitle);
  offeredColumn.appendChild(offeredTermsList);
  offeredColumn.appendChild(offeredList);

  var wantedColumn = document.createElement("div");
  wantedColumn.className = "ropro-trade-offers-column";
  var wantedTitle = document.createElement("div");
  wantedTitle.className = "ropro-trade-offer-section-title";
  wantedTitle.textContent = "Items You Want";
  var wantedSearchField = createClearableSearchInput(
    "Search",
    "form-control input-field ropro-trade-offers-composer-wanted-search",
    "ropro-trade-offers-search-input-wrap"
  );
  var wantedSearch = wantedSearchField.input;
  var wantedTermsTitle = document.createElement("div");
  wantedTermsTitle.className = "ropro-trade-offers-term-pill-title";
  wantedTermsTitle.textContent = "Common Terms";
  var wantedTermsList = document.createElement("div");
  wantedTermsList.className = "ropro-trade-offers-term-list ropro-trade-offers-term-list-wanted";
  var wantedList = document.createElement("div");
  wantedList.className = "ropro-trade-offers-item-picker ropro-trade-offers-wanted-list";
  wantedColumn.appendChild(wantedTitle);
  wantedColumn.appendChild(wantedSearchField.wrapper);
  wantedColumn.appendChild(wantedTermsTitle);
  wantedColumn.appendChild(wantedTermsList);
  wantedColumn.appendChild(wantedList);

  columns.appendChild(offeredColumn);
  columns.appendChild(wantedColumn);
  body.appendChild(columns);

  var footer = document.createElement("div");
  footer.className = "ropro-trade-offers-composer-footer";
  var status = document.createElement("div");
  status.className = "ropro-trade-offers-composer-status";
  var submit = createButton("Post Offer", "btn-growth-md ropro-trade-offers-submit");
  submit.addEventListener("click", submitComposerOffer);
  footer.appendChild(status);
  footer.appendChild(submit);
  body.appendChild(footer);

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeComposerModal();
    }
  });

  offersState.composer.overlay = overlay;
  document.body.appendChild(overlay);

  updateComposerStatus("");

  bindClearSearchInput(
    offeredSearch,
    offeredSearchField.clearButton,
    function (event) {
      offersState.composer.offeredFilter = String(event.target.value || "");
      renderComposerOfferedRows();
    },
    function () {
      offersState.composer.offeredFilter = "";
      renderComposerOfferedRows();
    }
  );
  bindClearSearchInput(
    wantedSearch,
    wantedSearchField.clearButton,
    function (event) {
      offersState.composer.wantedFilter = String(event.target.value || "");
      queueWantedSearch(offersState.composer.wantedFilter);
    },
    function () {
      offersState.composer.wantedFilter = "";
      offersState.composer.wantedRows = [];
      renderComposerWantedRows();
    }
  );

  if (!Array.isArray(offersState.composer.offeredRows) || offersState.composer.offeredRows.length === 0) {
    updateComposerStatus("Loading your tradable inventory...");
    var tradableResult = await fetchTradableInventory(offersState.myUserId);
    var rawRows = [];
    if (tradableResult != null && tradableResult.ok === true && Array.isArray(tradableResult.data)) {
      for (var i = 0; i < tradableResult.data.length; i++) {
        var row = tradableResult.data[i];
        if (row == null || typeof row !== "object") {
          continue;
        }
        var assetId = parseInt(row.assetId, 10);
        if (!Number.isFinite(assetId) || assetId <= 0) {
          continue;
        }
        var name = typeof row.name === "string" ? stripTags(row.name) : "Item " + assetId;
        rawRows.push({
          assetId: assetId,
          name: name,
          recentAveragePrice: Number.isFinite(parseInt(row.recentAveragePrice, 10))
            ? parseInt(row.recentAveragePrice, 10)
            : 0,
          value: Number.isFinite(parseInt(row.value, 10)) ? parseInt(row.value, 10) : -1,
          serialNumber: Number.isFinite(parseInt(row.serialNumber, 10))
            ? parseInt(row.serialNumber, 10)
            : null,
          isOnHold: row.isOnHold === true,
        });
      }
    }
    offersState.composer.offeredRows = normalizeComposerOfferedRows(rawRows);
  }

  var offeredAssetIds = [];
  for (var offeredAssetIndex = 0; offeredAssetIndex < offersState.composer.offeredRows.length; offeredAssetIndex++) {
    var offeredAssetId = parseInt(offersState.composer.offeredRows[offeredAssetIndex].assetId, 10);
    if (!Number.isFinite(offeredAssetId) || offeredAssetId <= 0) {
      continue;
    }
    offeredAssetIds.push(offeredAssetId);
  }
  var composerOverlayRef = overlay;
  hydrateAcronymCacheForAssetIds(
    offeredAssetIds,
    offersState.composer.offeredAcronymByAssetId,
    offersState.composer.offeredValueByAssetId
  )
    .then(function () {
      if (offersState.composer.overlay === composerOverlayRef) {
        for (var offeredRowIndex = 0; offeredRowIndex < offersState.composer.offeredRows.length; offeredRowIndex++) {
          var offeredRow = offersState.composer.offeredRows[offeredRowIndex];
          if (offeredRow == null || !Number.isFinite(parseInt(offeredRow.assetId, 10))) {
            continue;
          }
          if (Number.isFinite(parseInt(offeredRow.value, 10)) && parseInt(offeredRow.value, 10) >= 0) {
            continue;
          }
          var hydratedValue = parseInt(
            offersState.composer.offeredValueByAssetId[String(parseInt(offeredRow.assetId, 10))],
            10
          );
          if (!Number.isFinite(hydratedValue) || hydratedValue <= 0) {
            continue;
          }
          offeredRow.value = hydratedValue;
        }
        for (var offeredSelectedIndex = 0; offeredSelectedIndex < offersState.composer.offeredSelected.length; offeredSelectedIndex++) {
          var selectedEntry = offersState.composer.offeredSelected[offeredSelectedIndex];
          if (selectedEntry == null || !Number.isFinite(parseInt(selectedEntry.assetId, 10))) {
            continue;
          }
          if (Number.isFinite(parseInt(selectedEntry.value, 10)) && parseInt(selectedEntry.value, 10) >= 0) {
            continue;
          }
          var selectedHydratedValue = parseInt(
            offersState.composer.offeredValueByAssetId[String(parseInt(selectedEntry.assetId, 10))],
            10
          );
          if (!Number.isFinite(selectedHydratedValue) || selectedHydratedValue <= 0) {
            continue;
          }
          selectedEntry.value = selectedHydratedValue;
        }
        renderComposerSelections();
        renderComposerOfferedRows();
      }
    })
    .catch(function () {});

  updateComposerStatus("");
  renderComposerSelections();
  renderComposerOfferedRows();
  renderComposerWantedRows();
}

async function initializeTradeOffersPage() {
  startOffers404Suppression();
  ensureTradeOffersGlobalKeydownBound();
  ensureShellMounted();
  dismissRobloxOffers404Overlay();

  try {
    var settings = await Promise.all([
      fetchSetting("tradeOffersValueCalculator"),
      fetchUserId(),
      fetchVisualGates([
        TRADE_OFFERS_VIEW_GATE,
        TRADE_OFFERS_POST_GATE,
        TRADE_OFFERS_WISHLIST_GATE,
      ]),
    ]);

    offersState.valueCalculatorEnabled = settings[0] === true;
    offersState.myUserId = Number.isFinite(parseInt(settings[1], 10))
      ? parseInt(settings[1], 10)
      : null;
    offersState.visualGates = normalizeTradeOffersGateMap(settings[2]);
    offersState.tier = getTradeOffersGate(TRADE_OFFERS_VIEW_GATE).currentTier || "unknown";
    offersState.tradeOffersPageEnabled = getTradeOffersGate(TRADE_OFFERS_VIEW_GATE).settingEnabled !== false;
    renderTradeOfferTierAccessControls();
    if (offersState.myUserId != null) {
      fetchTradableInventory(offersState.myUserId, true);
    }
    renderTradeOfferPostControls();

    if (!offersState.tradeOffersPageEnabled) {
      stopTradeOfferCooldownTicker();
      setLockMessage(
        "Trade Board page is disabled in your RoPro settings.",
        "",
        "",
        ""
      );
      setStatusText("Enable Trade Board in settings to use this page.");
      renderTradeOfferPostControls();
      if (offersState.ui.refreshButton != null) {
        offersState.ui.refreshButton.disabled = true;
      }
      return;
    }

    clearLockMessage();
    if (!canViewTradeOffers()) {
      stopTradeOfferCooldownTicker();
      var viewGate = getTradeOffersGate(TRADE_OFFERS_VIEW_GATE);
      if (isTradeOffersGateBlockedByRobloxPremium(viewGate)) {
        setLockMessage(
          "Trade Board requires an active Roblox Premium membership.",
          "",
          "",
          ""
        );
        setStatusText("Enable Roblox Premium to use Trade Board.");
      } else if (viewGate.reason === "disabled_feature") {
        setLockMessage(
          "Trade Board is currently disabled for maintenance.",
          "",
          "",
          ""
        );
        setStatusText("Trade Board is temporarily unavailable.");
      } else if (viewGate.reason === "subscription_unknown") {
        setLockMessage(
          "Trade Board is temporarily unavailable while your subscription status loads.",
          "",
          "",
          ""
        );
        setStatusText("Trade Board is temporarily unavailable.");
      } else {
        var showViewUpsell = isTradeOffersGateUpsellEligible(viewGate);
        setLockMessage(
          showViewUpsell
            ? "Viewing Trade Board requires RoPro Plus or Rex."
            : "Trade Board is currently unavailable.",
          showViewUpsell ? "Upgrade to Plus" : "",
          TRADE_OFFERS_VIEW_GATE,
          "plus"
        );
        setStatusText(showViewUpsell ? "Upgrade to Plus or Rex to view Trade Board." : "Trade Board is temporarily unavailable.");
      }
      renderTradeOfferPostControls();
      return;
    }

    renderTradeOfferPostControls();
    if (offersState.ui.refreshButton != null) {
      offersState.ui.refreshButton.disabled = false;
    }

    if (offersState.ui.filtersPanel != null) {
      var sideSelect = offersState.ui.filtersPanel.querySelector(".ropro-trade-offers-side-select");
      if (sideSelect != null) {
        sideSelect.value = offersState.filters.side;
      }
    }
    renderBoardFilterChips();
    renderBoardFilterSearchResults();
    renderWishlistTabSearchResults();
    if (offersState.myPostsLoadedOnce) {
      await renderMyPosts();
    } else {
      setMyPostsStatusText("Open My Posts to manage your Trade Board posts.");
      updateMyPostsDeleteAllButtonState();
    }
    if (canManageTradeOffersWishlist()) {
      setWishlistStatusText("Type at least 2 characters to search.");
      await loadMyWishlistItems(false);
    } else {
      setWishlistStatusText("Managing wishlist items requires RoPro Rex.");
    }
    await loadTradeOffers(true);
  } catch (error) {
    console.error("RoPro Trade Board initialization failed.", error);
    setStatusText("Unable to load Trade Board right now.");
  } finally {
    dismissRobloxOffers404Overlay();
    stopOffers404Suppression();
  }
}

initializeTradeOffersPage();
