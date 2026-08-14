var url_matches = [
	"/trades*",
	"/users/*"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
	return roproApiAdapter.buildBrandedLoaderHtml(options)
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var fetchAngular = document.createElement('script');
fetchAngular.src = chrome.runtime.getURL('/js/page/fetchAngular.js');
(document.head||document.documentElement).appendChild(fetchAngular);
fetchAngular.onload = function() {
    fetchAngular.remove();
}

var tradeAssetRenderPollMaxAttempts = 12
var tradeAssetRenderPollDelayMs = 2000

function normalizeRobloxRenderUrlToken(rawRenderUrl) {
	var normalized = typeof rawRenderUrl === "string" ? stripTags(rawRenderUrl).trim() : ""
	if (normalized.length === 0) {
		return ""
	}
	if (normalized.charAt(0) === "?") {
		normalized = normalized.slice(1)
	}
	if (normalized.charAt(0) === "&") {
		normalized = normalized.slice(1)
	}
	if (/^https?:\/\//i.test(normalized) || normalized.indexOf(".com/") !== -1) {
		try {
			var parsedRenderUrl = new URL(normalized)
			var isRbxcdnHost = parsedRenderUrl.hostname.toLowerCase().indexOf("rbxcdn.com") !== -1
			normalized = isRbxcdnHost
				? parsedRenderUrl.pathname || ""
				: parsedRenderUrl.search || ""
		} catch (e) {}
	}
	if (normalized.charAt(0) === "?") {
		normalized = normalized.slice(1)
	}
	if (normalized.charAt(0) === "&") {
		normalized = normalized.slice(1)
	}
	if (normalized.charAt(0) === "/") {
		normalized = normalized.slice(1)
	}
	return normalized
}

function fetchAssetsView(itemID) {
	return new Promise(resolve => {
		var attemptCount = 0
		var normalizedItemID = parseInt(itemID, 10)
		if (!Number.isFinite(normalizedItemID) || normalizedItemID <= 0) {
			resolve("")
			return
		}
		function getURL(itemID) {
			attemptCount++
			if (attemptCount > tradeAssetRenderPollMaxAttempts) {
				resolve("")
				return
			}
			var renderParameters = JSON.stringify({"avatarDefinition":{"assets":[{"id":itemID}],"bodyColors":{"headColor":"#F8F8F8","torsoColor":"#F8F8F8","leftArmColor":"#F8F8F8","rightArmColor":"#F8F8F8","leftLegColor":"#F8F8F8","rightLegColor":"#F8F8F8"},"playerAvatarType":{"playerAvatarType":"R15"},"scales":{"height":1,"width":1,"head":1,"depth":1,"proportion":0,"bodyType":0}},"thumbnailConfig":{"thumbnailId":3,"thumbnailType":"3d","size":"420x420"}})
			chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://avatar.roblox.com/v1/avatar/render", jsonData: renderParameters}, 
				function(data) {
					if (itemID == tryOnItemID) {
						if (data == null) {
							setTimeout(function(){
								getURL(itemID)
							}, tradeAssetRenderPollDelayMs)
						} else {
							if (data.state == "Completed") {
								resolve(normalizeRobloxRenderUrlToken(data.imageUrl))
							} else if (data.state == "Error" || data.state == "Failed") {
								resolve("")
							} else {
								setTimeout(function(){
									getURL(itemID)
								}, tradeAssetRenderPollDelayMs)
							}
						}
					} else {
						resolve("")
					}
				})
		}
		getURL(itemID)
	})
}

function fetchItems(idList) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_backend", {ids: idList}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchItemMiniSearch(search) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_item_search", {q: search},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchFlag(userId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_fetch_flag", {userId: userId},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchFlagsBatch(userIds) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_fetch_flags", {userIds: userIds},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTradeBotters(userIds, reqType) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_batch_flags", {reqType: reqType, userIds: userIds},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTradeLogicDecision(operation, payload) {
	return new Promise(resolve => {
		var requestPayload = payload != null && typeof payload === "object" ? Object.assign({}, payload) : {}
		requestPayload.op = operation
		roproApiAdapter.request("ropro_trade_logic_backend", requestPayload,
			function(data) {
				resolve(data)
			}
		)
	})
}

function parseTradeLogicPayload(payload) {
	var parsedPayload = payload
	if (typeof parsedPayload == "string") {
		try {
			parsedPayload = JSON.parse(parsedPayload)
		} catch (e) {
			return {}
		}
	}
	if (parsedPayload == null || typeof parsedPayload !== "object") {
		return {}
	}
	return parsedPayload
}

function isTradeLogicErrorPayload(payload) {
	return typeof payload === "string" && payload.trim().toUpperCase() === "ERROR"
}

function normalizeTradeLogicTradeIds(payload) {
	var parsedPayload = parseTradeLogicPayload(payload)
	var ids = []
	if (Array.isArray(parsedPayload.tradeIds)) {
		ids = parsedPayload.tradeIds
	} else if (Array.isArray(parsedPayload.ids)) {
		ids = parsedPayload.ids
	}
	var normalizedIds = []
	var seen = {}
	for (var i = 0; i < ids.length; i++) {
		var tradeId = parseInt(ids[i])
		if (!Number.isFinite(tradeId) || tradeId <= 0 || seen[String(tradeId)]) {
			continue
		}
		seen[String(tradeId)] = true
		normalizedIds.push(tradeId)
	}
	return normalizedIds
}

function normalizeTradeLogicLossSummary(payload) {
	var parsedPayload = parseTradeLogicPayload(payload)
	var summary = parsedPayload.summary != null && typeof parsedPayload.summary === "object" ? parsedPayload.summary : {}
	return {
		wins: Number.isFinite(parseInt(summary.wins)) ? parseInt(summary.wins) : 0,
		equal: Number.isFinite(parseInt(summary.equal)) ? parseInt(summary.equal) : 0,
		losses: Number.isFinite(parseInt(summary.losses)) ? parseInt(summary.losses) : 0,
		validLosses: Number.isFinite(parseInt(summary.validLosses)) ? parseInt(summary.validLosses) : 0
	}
}

function normalizeTradeLogicSkippedCount(payload) {
	var parsedPayload = parseTradeLogicPayload(payload)
	var skipped = parseInt(parsedPayload.skipped)
	if (!Number.isFinite(skipped) || skipped < 0) {
		return 0
	}
	return skipped
}

function normalizeTradeBotterIds(payload) {
	var parsedPayload = payload
	if (typeof parsedPayload == "string") {
		try {
			parsedPayload = JSON.parse(parsedPayload)
		} catch (e) {
			return []
		}
	}
	var list = null
	if (Array.isArray(parsedPayload)) {
		list = parsedPayload
	} else if (parsedPayload != null && typeof parsedPayload === "object") {
		var arrayKeys = ["ids", "users", "reported", "results", "data", "botters"]
		for (var i = 0; i < arrayKeys.length; i++) {
			var key = arrayKeys[i]
			if (Array.isArray(parsedPayload[key])) {
				list = parsedPayload[key]
				break
			}
		}
		if (list == null && parsedPayload.hasOwnProperty("data") && parsedPayload.data != null && typeof parsedPayload.data === "object") {
			var nestedData = normalizeTradeBotterIds(parsedPayload.data)
			if (nestedData.length > 0) {
				return nestedData
			}
		}
		if (list == null && typeof parsedPayload.ids === "string") {
			list = parsedPayload.ids.split(",")
		}
		if (list == null) {
			var objectKeys = Object.keys(parsedPayload)
			var numericKeyedObject = objectKeys.length > 0
			for (var j = 0; j < objectKeys.length; j++) {
				if (!/^[0-9]+$/.test(objectKeys[j])) {
					numericKeyedObject = false
					break
				}
			}
			if (numericKeyedObject) {
				var hasNonFlagIndicatorValue = false
				for (var k = 0; k < objectKeys.length; k++) {
					var objectValue = parsedPayload[objectKeys[k]]
					if (objectValue !== true && objectValue !== false && objectValue !== 1 && objectValue !== 0 && objectValue !== "1" && objectValue !== "0" && objectValue !== "true" && objectValue !== "false") {
						hasNonFlagIndicatorValue = true
						break
					}
				}
				if (hasNonFlagIndicatorValue) {
					list = objectKeys.map(function(key) {
						return parsedPayload[key]
					})
				} else {
					list = objectKeys.filter(function(key) {
						return parsedPayload[key] === true || parsedPayload[key] === 1 || parsedPayload[key] === "1" || parsedPayload[key] === "true"
					})
				}
			} else {
				list = objectKeys.filter(function(key) {
					return parsedPayload[key] === true || parsedPayload[key] === 1 || parsedPayload[key] === "1" || parsedPayload[key] === "true"
				})
			}
		}
	}
	if (list == null) {
		return []
	}
	var normalizedIds = []
	for (var k = 0; k < list.length; k++) {
		var value = list[k]
		if (value != null && typeof value === "object") {
			if (value.hasOwnProperty("reported")) {
				value = value.reported
			} else if (value.hasOwnProperty("userId")) {
				value = value.userId
			} else if (value.hasOwnProperty("id")) {
				value = value.id
			}
		}
		var normalizedValue = parseInt(value)
		if (Number.isFinite(normalizedValue)) {
			normalizedIds.push(normalizedValue)
		}
	}
	return normalizedIds
}

function normalizeTradeItemSearchResults(payload) {
	var parsedPayload = payload
	var parseDepth = 0
	while (typeof parsedPayload == "string") {
		if (parsedPayload.length == 0 || parsedPayload == "ERROR") {
			return []
		}
		if (parseDepth >= 2) {
			return []
		}
		try {
			parsedPayload = JSON.parse(parsedPayload)
			parseDepth++
		} catch (e) {
			return []
		}
	}
	var items = null
	if (Array.isArray(parsedPayload)) {
		items = parsedPayload
	} else if (parsedPayload != null && typeof parsedPayload === "object") {
		if (Array.isArray(parsedPayload.data)) {
			items = parsedPayload.data
		} else if (Array.isArray(parsedPayload.items)) {
			items = parsedPayload.items
		} else {
			var payloadKeys = Object.keys(parsedPayload)
			var numericKeys = []
			for (var i = 0; i < payloadKeys.length; i++) {
				if (/^[0-9]+$/.test(payloadKeys[i])) {
					numericKeys.push(payloadKeys[i])
				}
			}
			if (numericKeys.length > 0) {
				items = []
				for (var j = 0; j < numericKeys.length; j++) {
					var numericKey = numericKeys[j]
					var mapValue = parsedPayload[numericKey]
					var mapName = ""
					if (Array.isArray(mapValue) && mapValue.length > 0) {
						mapName = mapValue[0]
					} else if (mapValue != null && typeof mapValue === "object") {
						if (mapValue.name != null) {
							mapName = mapValue.name
						} else if (mapValue.itemName != null) {
							mapName = mapValue.itemName
						}
					}
					items.push({id: numericKey, name: mapName})
				}
			}
		}
	}
	if (items == null) {
		return []
	}
	var normalizedItems = []
	var addedItemIds = {}
	for (var i = 0; i < items.length; i++) {
		var item = items[i]
		var itemId = null
		var itemName = ""
		if (Array.isArray(item)) {
			itemId = parseInt(item.length > 0 ? item[0] : null)
			itemName = stripTags(String(item.length > 1 && item[1] != null ? item[1] : ""))
		} else if (item != null && typeof item === "object") {
			itemId = parseInt(item.id != null ? item.id : item.assetId)
			itemName = stripTags(String(item.name != null ? item.name : item.itemName))
		} else {
			continue
		}
		if (!Number.isFinite(itemId) || itemId <= 0 || addedItemIds[String(itemId)]) {
			continue
		}
		if (itemName.length == 0) {
			itemName = "Item #" + itemId
		}
		addedItemIds[String(itemId)] = true
		normalizedItems.push({id: itemId, name: itemName})
	}
	return normalizedItems
}

function resolveTradeOfferSides(trade, authenticatedUserId, allowCounterpartyFallback) {
	var allowFallback = allowCounterpartyFallback !== false
	if (trade == null || !Array.isArray(trade.offers) || trade.offers.length < 2) {
		return null
	}
	var offer0 = trade.offers[0]
	var offer1 = trade.offers[1]
	if (
		offer0 == null || offer1 == null ||
		offer0.user == null || offer1.user == null
	) {
		return null
	}
	var offer0UserId = parseInt(offer0.user.id)
	var offer1UserId = parseInt(offer1.user.id)
	var normalizedAuthUserId = parseInt(authenticatedUserId)
	if (Number.isFinite(normalizedAuthUserId) && normalizedAuthUserId > 0) {
		if (offer0UserId === normalizedAuthUserId) {
			return {mySide: offer0, theirSide: offer1, theirUser: offer1.user}
		}
		if (offer1UserId === normalizedAuthUserId) {
			return {mySide: offer1, theirSide: offer0, theirUser: offer0.user}
		}
		if (!allowFallback) {
			return null
		}
	} else if (!allowFallback) {
		return null
	}
	var counterpartyId = trade.user != null ? parseInt(trade.user.id) : null
	if (Number.isFinite(counterpartyId) && counterpartyId > 0) {
		if (offer0UserId === counterpartyId) {
			return {mySide: offer1, theirSide: offer0, theirUser: offer0.user}
		}
		if (offer1UserId === counterpartyId) {
			return {mySide: offer0, theirSide: offer1, theirUser: offer1.user}
		}
	}
	return null
}

function normalizeTradeUserAssetInstanceId(id) {
	if (id == null) {
		return null
	}
	var normalizedId = stripTags(String(id)).trim().toLowerCase()
	if (normalizedId.length == 0) {
		return null
	}
	if (/^\d+$/.test(normalizedId)) {
		var numericId = parseInt(normalizedId)
		if (Number.isFinite(numericId) && numericId > 0) {
			return String(numericId)
		}
		return null
	}
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedId)) {
		return normalizedId
	}
	return null
}

function getTradeUserAssetInstanceId(userAsset) {
	if (userAsset == null || typeof userAsset !== "object") {
		return null
	}
	var candidateSources = [
		userAsset.collectibleItemInstanceId,
		userAsset.userAssetId
	]
	for (var i = 0; i < candidateSources.length; i++) {
		var normalizedId = normalizeTradeUserAssetInstanceId(candidateSources[i])
		if (normalizedId != null) {
			return normalizedId
		}
	}
	return null
}

function buildTradeValidationInventoryPayload(userInventoryByUserId) {
	var payload = {}
	if (userInventoryByUserId == null || typeof userInventoryByUserId !== "object") {
		return payload
	}
	var userIds = Object.keys(userInventoryByUserId)
	for (var i = 0; i < userIds.length; i++) {
		var normalizedUserId = parseInt(userIds[i])
		if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
			continue
		}
		var inventory = Array.isArray(userInventoryByUserId[userIds[i]]) ? userInventoryByUserId[userIds[i]] : []
		var instances = []
		for (var j = 0; j < inventory.length; j++) {
			var instanceId = getTradeUserAssetInstanceId(inventory[j])
			if (instanceId != null) {
				instances.push(instanceId)
			}
		}
		payload[String(normalizedUserId)] = instances
	}
	return payload
}

function getTradeUserAssetProjectedAssetId(userAsset) {
	if (userAsset == null || typeof userAsset !== "object") {
		return null
	}
	var candidateSources = [
		userAsset.itemTarget != null && typeof userAsset.itemTarget === "object" ? userAsset.itemTarget.targetId : null,
		userAsset.assetId
	]
	for (var i = 0; i < candidateSources.length; i++) {
		var normalizedId = parseInt(candidateSources[i])
		if (Number.isFinite(normalizedId) && normalizedId > 0) {
			return normalizedId
		}
	}
	return null
}

var tradeBotFlagCache = {}
var tradeBotSuspectedTierCache = {}
var tradeBotSuspectedTierPendingIds = new Set()
var tradeBotSuspectedTierRequestInFlight = false
var tradeBotSuspectedTierCooldownUntil = 0
var tradeBotSuspectedTierCacheTtlMs = 6 * 60 * 60 * 1000
var tradeBotSuspectedTierBatchSize = 150
var tradeBotSuspectedTierCooldownMs = 90 * 1000

function normalizeTradeUserId(value) {
	var normalizedValue = parseInt(value)
	if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
		return null
	}
	return normalizedValue
}

function setTradeBotFlagCache(userId, flagged) {
	var normalizedUserId = normalizeTradeUserId(userId)
	if (normalizedUserId == null) {
		return
	}
	if (flagged) {
		tradeBotFlagCache[String(normalizedUserId)] = true
	} else {
		delete tradeBotFlagCache[String(normalizedUserId)]
	}
}

function cacheTradeBotFlagBatch(userIds, flaggedUserIds) {
	var flaggedLookup = {}
	for (var i = 0; i < flaggedUserIds.length; i++) {
		var flaggedUserId = normalizeTradeUserId(flaggedUserIds[i])
		if (flaggedUserId != null) {
			flaggedLookup[String(flaggedUserId)] = true
		}
	}
	for (var j = 0; j < userIds.length; j++) {
		var userId = normalizeTradeUserId(userIds[j])
		if (userId == null) {
			continue
		}
		setTradeBotFlagCache(userId, flaggedLookup[String(userId)] === true)
	}
}

function getTradeRowThumbnailNode(tradeRowNode) {
	if (tradeRowNode == null) {
		return null
	}
	var thumbnailContainer = tradeRowNode.getElementsByClassName('thumbnail-2d-container')[0]
	if (typeof thumbnailContainer == "undefined") {
		return null
	}
	var thumbnail = thumbnailContainer.getElementsByTagName('img')[0]
	if (typeof thumbnail == "undefined") {
		return null
	}
	return thumbnail
}

function getTradeRowUserId(tradeRowNode) {
	if (tradeRowNode == null) {
		return null
	}
	var thumbnailContainer = tradeRowNode.getElementsByClassName('thumbnail-2d-container')[0]
	if (typeof thumbnailContainer != "undefined") {
		var thumbnailTargetId = normalizeTradeUserId(thumbnailContainer.getAttribute("thumbnail-target-id"))
		if (thumbnailTargetId != null) {
			return thumbnailTargetId
		}
	}
	var tradeUserLinkElement = tradeRowNode.getElementsByClassName('avatar-card-link')[0]
	if (typeof tradeUserLinkElement == "undefined" || typeof tradeUserLinkElement.href !== "string") {
		return null
	}
	if (tradeUserLinkElement.href.indexOf("/users/") == -1) {
		return null
	}
	return normalizeTradeUserId(tradeUserLinkElement.href.split("/users/")[1].split("/")[0])
}

function normalizeTradeBotSuspectedTier(value) {
	var normalizedTier = stripTags(String(value == null ? "" : value)).trim().toLowerCase()
	if (normalizedTier === "bit_sus" || normalizedTier === "kinda_sus" || normalizedTier === "pretty_sus" || normalizedTier === "mad_sus") {
		return normalizedTier
	}
	return null
}

function normalizeTradeBotSuspectedTierMap(payload) {
	var parsedPayload = payload
	if (typeof parsedPayload == "string") {
		try {
			parsedPayload = JSON.parse(parsedPayload)
		} catch (e) {
			return {}
		}
	}
	if (parsedPayload == null || typeof parsedPayload !== "object") {
		return {}
	}
	if (parsedPayload.hasOwnProperty("data") && parsedPayload.data != null && typeof parsedPayload.data === "object" && !Array.isArray(parsedPayload.data)) {
		parsedPayload = parsedPayload.data
	}
	if (Array.isArray(parsedPayload)) {
		return {}
	}
	var tierLookup = {}
	var keys = Object.keys(parsedPayload)
	for (var i = 0; i < keys.length; i++) {
		var rawUserId = keys[i]
		var normalizedUserId = normalizeTradeUserId(rawUserId)
		var tierValue = parsedPayload[rawUserId]
		if (tierValue != null && typeof tierValue === "object") {
			var tierObject = tierValue
			if (normalizedUserId == null) {
				normalizedUserId = normalizeTradeUserId(tierObject.userId != null ? tierObject.userId : (tierObject.reported != null ? tierObject.reported : tierObject.id))
			}
			if (tierObject.hasOwnProperty("tier")) {
				tierValue = tierObject.tier
			} else if (tierObject.hasOwnProperty("level")) {
				tierValue = tierObject.level
			}
		}
		if (normalizedUserId == null) {
			continue
		}
		var normalizedTier = normalizeTradeBotSuspectedTier(tierValue)
		if (normalizedTier != null) {
			tierLookup[String(normalizedUserId)] = normalizedTier
		}
	}
	return tierLookup
}

function getTradeBotSuspectedTierResponseStatus(payload) {
	if (typeof payload === "number" && Number.isFinite(payload)) {
		return parseInt(payload)
	}
	if (typeof payload === "string" && /^[0-9]{3}$/.test(payload.trim())) {
		return parseInt(payload.trim())
	}
	if (payload != null && typeof payload === "object" && payload.hasOwnProperty("status")) {
		var normalizedStatus = parseInt(payload.status)
		if (Number.isFinite(normalizedStatus)) {
			return normalizedStatus
		}
	}
	return null
}

function getTradeBotSuspectedTierCacheEntry(userId) {
	var normalizedUserId = normalizeTradeUserId(userId)
	if (normalizedUserId == null) {
		return null
	}
	var cacheKey = String(normalizedUserId)
	var cacheEntry = tradeBotSuspectedTierCache[cacheKey]
	if (cacheEntry == null || typeof cacheEntry !== "object") {
		return null
	}
	var expiresAt = Number.isFinite(cacheEntry.expiresAt) ? cacheEntry.expiresAt : 0
	if (expiresAt > 0 && expiresAt <= new Date().getTime()) {
		delete tradeBotSuspectedTierCache[cacheKey]
		return null
	}
	return cacheEntry
}

function setTradeBotSuspectedTierCacheEntry(userId, tierName) {
	var normalizedUserId = normalizeTradeUserId(userId)
	if (normalizedUserId == null) {
		return
	}
	tradeBotSuspectedTierCache[String(normalizedUserId)] = {
		tier: normalizeTradeBotSuspectedTier(tierName),
		expiresAt: new Date().getTime() + tradeBotSuspectedTierCacheTtlMs
	}
}

function clearTradeBotSuspectedTierCaches() {
	tradeBotSuspectedTierCache = {}
	tradeBotSuspectedTierPendingIds.clear()
	tradeBotSuspectedTierCooldownUntil = 0
}

function getTradeBotSuspectedBadgeLabel(tierName) {
	if (tierName === "mad_sus") {
		return "Mad Sus Bot"
	}
	if (tierName === "pretty_sus") {
		return "Pretty Sus Bot"
	}
	if (tierName === "kinda_sus") {
		return "Kinda Sus Bot"
	}
	if (tierName === "bit_sus") {
		return "Bit Sus Bot"
	}
	return null
}

function getTradeBotSuspectedBadgeStyles(tierName) {
	if (tierName === "mad_sus") {
		return {backgroundColor: "#5F1A1A", borderColor: "#AA4949", color: "#FFD6D6"}
	}
	if (tierName === "pretty_sus") {
		return {backgroundColor: "#6F2B22", borderColor: "#B65C4D", color: "#FFD8D0"}
	}
	if (tierName === "kinda_sus") {
		return {backgroundColor: "#6A3A1F", borderColor: "#B1784D", color: "#FFE2C7"}
	}
	return {backgroundColor: "#4F4421", borderColor: "#99884B", color: "#FFF0C4"}
}

function getTradeRowNameElement(tradeRowNode) {
	if (tradeRowNode == null || typeof tradeRowNode.getElementsByClassName !== "function") {
		return null
	}
	var rowName = tradeRowNode.getElementsByClassName('text-lead ng-binding')[0]
	if (typeof rowName === "undefined") {
		return null
	}
	return rowName
}

function getTradeRowQuickActionBadgeContainer(tradeRowNode) {
	if (tradeRowNode == null || typeof tradeRowNode.getElementsByClassName !== "function") {
		return null
	}
	var quickDeclineButton = tradeRowNode.getElementsByClassName('ropro-quick-decline')[0]
	if (typeof quickDeclineButton !== "undefined" && quickDeclineButton != null && quickDeclineButton.parentNode != null) {
		return quickDeclineButton.parentNode
	}
	var quickCancelButton = tradeRowNode.getElementsByClassName('ropro-quick-cancel')[0]
	if (typeof quickCancelButton !== "undefined" && quickCancelButton != null && quickCancelButton.parentNode != null) {
		return quickCancelButton.parentNode
	}
	return null
}

function getTradeRowStatusBadgeContainer(tradeRowNode) {
	if (tradeRowNode == null || typeof tradeRowNode.getElementsByClassName !== "function") {
		return null
	}
	var rowStatus = tradeRowNode.getElementsByClassName('text-date-hint ng-binding')[0]
	if (typeof rowStatus === "undefined" || rowStatus == null) {
		return null
	}
	return rowStatus
}

function isTradeOpenStatusText(statusText) {
	if (typeof statusText !== "string") {
		return false
	}
	return statusText.trim().indexOf("Open") === 0
}

function isTradeHintOpenStatus(hintNode) {
	if (hintNode == null) {
		return false
	}
	return isTradeOpenStatusText(stripTags(hintNode.innerHTML))
}

function appendTradeQuickDeclineRow(hintNode) {
	var quickDeclineRow = document.createElement("div")
	quickDeclineRow.classList.add("ropro-quick-decline-row")
	quickDeclineRow.style.display = "block"
	quickDeclineRow.style.marginTop = "8px"
	var quickDeclineButton = document.createElement("button")
	quickDeclineButton.type = "button"
	quickDeclineButton.classList.add("ropro-quick-decline")
	quickDeclineButton.innerText = "Decline"
	quickDeclineButton.style.display = "inline-block"
	quickDeclineButton.style.marginLeft = "0px"
	quickDeclineButton.style.padding = "1px 8px"
	quickDeclineButton.style.borderRadius = "999px"
	quickDeclineButton.style.border = "1px solid #F26A6A"
	quickDeclineButton.style.backgroundColor = "#B84343"
	quickDeclineButton.style.color = "#FFFFFF"
	quickDeclineButton.style.fontWeight = "700"
	quickDeclineButton.style.fontSize = "11px"
	quickDeclineButton.style.lineHeight = "16px"
	quickDeclineButton.style.cursor = "pointer"
	quickDeclineButton.style.verticalAlign = "middle"
	quickDeclineButton.style.boxShadow = "0 0 0 1px rgba(0, 0, 0, 0.2) inset"
	quickDeclineRow.appendChild(quickDeclineButton)
	hintNode.appendChild(quickDeclineRow)
	quickDeclineButton.addEventListener("click", function(e){
		e.preventDefault()
		e.stopPropagation()
		var tradeRow = typeof this.closest === "function" ? this.closest('.trade-row') : null
		var rowContainer = tradeRow != null ? tradeRow.getElementsByClassName('trade-row-container')[0] : null
		if (rowContainer != null) {
			rowContainer.click()
		}
		setTimeout(function(){
			decline = $(".btn-control-md:contains('Decline'):not('.ng-hide')")
			decline.click()
			document.getElementById('modal-action-button').click()
		}, 200)
	})
}

function appendTradeQuickCancelRow(hintNode) {
	var quickCancelRow = document.createElement("div")
	quickCancelRow.classList.add("ropro-quick-cancel-row")
	quickCancelRow.style.display = "block"
	quickCancelRow.style.marginTop = "8px"
	var quickCancelButton = document.createElement("button")
	quickCancelButton.type = "button"
	quickCancelButton.classList.add("ropro-quick-cancel")
	quickCancelButton.innerText = "Cancel"
	quickCancelButton.style.display = "inline-block"
	quickCancelButton.style.marginLeft = "0px"
	quickCancelButton.style.padding = "1px 8px"
	quickCancelButton.style.borderRadius = "999px"
	quickCancelButton.style.border = "1px solid #F26A6A"
	quickCancelButton.style.backgroundColor = "#B84343"
	quickCancelButton.style.color = "#FFFFFF"
	quickCancelButton.style.fontWeight = "700"
	quickCancelButton.style.fontSize = "11px"
	quickCancelButton.style.lineHeight = "16px"
	quickCancelButton.style.cursor = "pointer"
	quickCancelButton.style.verticalAlign = "middle"
	quickCancelButton.style.boxShadow = "0 0 0 1px rgba(0, 0, 0, 0.2) inset"
	quickCancelRow.appendChild(quickCancelButton)
	hintNode.appendChild(quickCancelRow)
	quickCancelButton.addEventListener("click", function(e){
		e.preventDefault()
		e.stopPropagation()
		var tradeRow = typeof this.closest === "function" ? this.closest('.trade-row') : null
		var rowContainer = tradeRow != null ? tradeRow.getElementsByClassName('trade-row-container')[0] : null
		if (rowContainer != null) {
			rowContainer.click()
		}
		setTimeout(function(){
			decline = $(".btn-control-md:contains('Decline'):not('.ng-hide')")
			decline.click()
			document.getElementById('modal-action-button').click()
		}, 200)
	})
}

function enforceTradeQuickActionButtonsForRows(tradeRows) {
	if (tradeRows == null || typeof tradeRows.length == "undefined") {
		return
	}
	var isInboundTab = quickDecline && $('.rbx-selection-label:contains("Inbound")').length > 0
	var isOutboundTab = quickCancel && $('.rbx-selection-label:contains("Outbound")').length > 0
	if (!isInboundTab && !isOutboundTab) {
		return
	}
	for (var i = 0; i < tradeRows.length; i++) {
		var hint = getTradeRowStatusBadgeContainer(tradeRows[i])
		if (hint == null || !isTradeHintOpenStatus(hint)) {
			continue
		}
		if (isInboundTab && hint.getElementsByClassName('ropro-quick-decline').length == 0) {
			hint.innerHTML = ""
			appendTradeQuickDeclineRow(hint)
			continue
		}
		if (isOutboundTab && hint.getElementsByClassName('ropro-quick-cancel').length == 0) {
			hint.innerHTML = ""
			appendTradeQuickCancelRow(hint)
		}
	}
}

function applyTradeBotSuspectedBadgeToRow(tradeRowNode) {
	if (tradeRowNode == null) {
		return
	}
	var existingBadge = tradeRowNode.getElementsByClassName('ropro-suspected-bot-badge')[0]
	var userId = getTradeRowUserId(tradeRowNode)
	var cacheEntry = getTradeBotSuspectedTierCacheEntry(userId)
	var tierName = cacheEntry != null ? normalizeTradeBotSuspectedTier(cacheEntry.tier) : null
	if (tierName == null) {
		if (typeof existingBadge !== "undefined") {
			existingBadge.remove()
		}
		return
	}
	var badgeContainer = getTradeRowQuickActionBadgeContainer(tradeRowNode)
	if (badgeContainer == null) {
		badgeContainer = getTradeRowStatusBadgeContainer(tradeRowNode)
	}
	if (badgeContainer == null) {
		badgeContainer = getTradeRowNameElement(tradeRowNode)
	}
	if (badgeContainer == null) {
		return
	}
	var badgeNode = typeof existingBadge !== "undefined" ? existingBadge : null
	if (badgeNode != null && badgeNode.parentNode !== badgeContainer) {
		badgeNode.remove()
		badgeNode = null
	}
	if (badgeNode == null) {
		badgeNode = document.createElement('span')
		badgeNode.className = 'ropro-suspected-bot-badge'
		badgeContainer.appendChild(badgeNode)
	}
	var isQuickActionContainer = badgeContainer.classList != null && (
		badgeContainer.classList.contains('ropro-quick-decline-row') ||
		badgeContainer.classList.contains('ropro-quick-cancel-row')
	)
	if (isQuickActionContainer) {
		badgeContainer.style.display = 'inline-flex'
		badgeContainer.style.alignItems = 'center'
		badgeContainer.style.columnGap = '8px'
		badgeContainer.style.flexWrap = 'nowrap'
		var quickActionButton = badgeContainer.getElementsByTagName('button')[0]
		if (typeof quickActionButton !== "undefined" && quickActionButton != null) {
			quickActionButton.style.flex = '0 0 auto'
		}
	}
	var badgeStyles = getTradeBotSuspectedBadgeStyles(tierName)
	var badgeLabel = getTradeBotSuspectedBadgeLabel(tierName)
	if (badgeLabel == null) {
		if (typeof existingBadge !== "undefined") {
			existingBadge.remove()
		}
		return
	}
	badgeNode.setAttribute('data-tier', tierName)
	badgeNode.textContent = badgeLabel
	badgeNode.title = badgeLabel
	badgeNode.style.display = 'inline-block'
	badgeNode.style.marginLeft = isQuickActionContainer ? '0px' : '6px'
	badgeNode.style.padding = '1px 6px'
	badgeNode.style.borderRadius = '999px'
	badgeNode.style.fontSize = '10px'
	badgeNode.style.fontWeight = '700'
	badgeNode.style.lineHeight = isQuickActionContainer ? '16px' : '14px'
	badgeNode.style.whiteSpace = 'nowrap'
	badgeNode.style.verticalAlign = 'middle'
	badgeNode.style.maxWidth = isQuickActionContainer ? '200px' : 'none'
	badgeNode.style.overflow = isQuickActionContainer ? 'hidden' : 'visible'
	badgeNode.style.textOverflow = isQuickActionContainer ? 'ellipsis' : 'clip'
	badgeNode.style.flex = isQuickActionContainer ? '1 1 auto' : '0 0 auto'
	badgeNode.style.minWidth = isQuickActionContainer ? '0' : 'auto'
	badgeNode.style.backgroundColor = badgeStyles.backgroundColor
	badgeNode.style.border = '1px solid ' + badgeStyles.borderColor
	badgeNode.style.color = badgeStyles.color
}

function enforceTradeBotSuspectedBadgesForRows(tradeRows) {
	if (tradeRows == null || typeof tradeRows.length == "undefined") {
		return
	}
	for (var i = 0; i < tradeRows.length; i++) {
		applyTradeBotSuspectedBadgeToRow(tradeRows[i])
	}
}

async function fetchTradeBotSuspectedTierBatch(userIds) {
	var responsePayload = await fetchTradeBotters(userIds, "suspected_tiers")
	var statusCode = getTradeBotSuspectedTierResponseStatus(responsePayload)
	if (statusCode === 429 || statusCode >= 500) {
		return {ok: false, cooldown: true, data: {}}
	}
	return {ok: true, cooldown: false, data: normalizeTradeBotSuspectedTierMap(responsePayload)}
}

async function processTradeBotSuspectedTierQueue() {
	if (!suspectedBotBadges) {
		tradeBotSuspectedTierPendingIds.clear()
		return
	}
	if (tradeBotSuspectedTierRequestInFlight) {
		return
	}
	var now = new Date().getTime()
	if (now < tradeBotSuspectedTierCooldownUntil) {
		return
	}
	if (tradeBotSuspectedTierPendingIds.size === 0) {
		return
	}
	var requestUserIds = []
	tradeBotSuspectedTierPendingIds.forEach(function(userId) {
		if (requestUserIds.length >= tradeBotSuspectedTierBatchSize) {
			return
		}
		var normalizedUserId = normalizeTradeUserId(userId)
		if (normalizedUserId != null) {
			requestUserIds.push(normalizedUserId)
		}
	})
	if (requestUserIds.length === 0) {
		return
	}
	for (var i = 0; i < requestUserIds.length; i++) {
		tradeBotSuspectedTierPendingIds.delete(requestUserIds[i])
	}
	tradeBotSuspectedTierRequestInFlight = true
	try {
		var batchResponse = await fetchTradeBotSuspectedTierBatch(requestUserIds)
		if (!batchResponse.ok) {
			if (batchResponse.cooldown) {
				tradeBotSuspectedTierCooldownUntil = new Date().getTime() + tradeBotSuspectedTierCooldownMs
			}
			for (var responseIndex = 0; responseIndex < requestUserIds.length; responseIndex++) {
				tradeBotSuspectedTierPendingIds.add(requestUserIds[responseIndex])
			}
			return
		}
		var tierLookup = batchResponse.data
		for (var responseIndex = 0; responseIndex < requestUserIds.length; responseIndex++) {
			var normalizedUserId = requestUserIds[responseIndex]
			var cacheKey = String(normalizedUserId)
			var tierName = tierLookup.hasOwnProperty(cacheKey) ? tierLookup[cacheKey] : null
			setTradeBotSuspectedTierCacheEntry(normalizedUserId, tierName)
		}
	} catch (e) {
		tradeBotSuspectedTierCooldownUntil = new Date().getTime() + tradeBotSuspectedTierCooldownMs
		for (var responseIndex = 0; responseIndex < requestUserIds.length; responseIndex++) {
			tradeBotSuspectedTierPendingIds.add(requestUserIds[responseIndex])
		}
	} finally {
		tradeBotSuspectedTierRequestInFlight = false
		enforceTradeBotSuspectedBadgesForRows(document.getElementsByClassName('trade-row-details'))
		if (tradeBotSuspectedTierPendingIds.size > 0 && new Date().getTime() >= tradeBotSuspectedTierCooldownUntil) {
			processTradeBotSuspectedTierQueue()
		}
	}
}

function queueTradeBotSuspectedTierFetchForRows(tradeRows) {
	if (!suspectedBotBadges || tradeRows == null || typeof tradeRows.length == "undefined") {
		return
	}
	for (var i = 0; i < tradeRows.length; i++) {
		var userId = getTradeRowUserId(tradeRows[i])
		if (userId == null) {
			continue
		}
		if (getTradeBotSuspectedTierCacheEntry(userId) != null) {
			continue
		}
		tradeBotSuspectedTierPendingIds.add(userId)
	}
	processTradeBotSuspectedTierQueue()
}

function applyTradeBotFaceToRow(tradeRowNode) {
	var thumbnail = getTradeRowThumbnailNode(tradeRowNode)
	if (thumbnail == null) {
		return
	}
	var currentSrc = stripTags(typeof thumbnail.src === "string" ? thumbnail.src : "")
	if (currentSrc.indexOf("robot.png") == -1) {
		thumbnail.setAttribute("old-src", currentSrc)
	}
	thumbnail.src = chrome.runtime.getURL('/images/robot.png')
}

function restoreTradeBotFaceFromRow(tradeRowNode) {
	var thumbnail = getTradeRowThumbnailNode(tradeRowNode)
	if (thumbnail == null) {
		return
	}
	var oldSrc = thumbnail.getAttribute("old-src")
	if (typeof oldSrc === "string" && oldSrc.length > 0 && oldSrc.indexOf("robot.png") == -1) {
		thumbnail.src = oldSrc
	}
}

function enforceTradeBotFacesForRows(tradeRows) {
	if (tradeRows == null || typeof tradeRows.length == "undefined") {
		return
	}
	for (var i = 0; i < tradeRows.length; i++) {
		var tradeRow = tradeRows[i]
		var userId = getTradeRowUserId(tradeRow)
		if (userId == null) {
			continue
		}
		if (tradeBotFlagCache[String(userId)] === true) {
			applyTradeBotFaceToRow(tradeRow)
		}
	}
}

function fetchItemDetails(itemId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://catalog.roblox.com/v1/catalog/items/details", jsonData: JSON.stringify({"items":[{"id":itemId,"itemType":"Asset"}]})}, 
			function(data) {
					if (data && data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0]) {
						resolve(data.data[0])
					} else {
						resolve({})
					}
			})
	})
}

function normalizeCatalogPriceStatus(priceStatus) {
	var normalizedStatus = typeof priceStatus === "string" ? priceStatus : ""
	return normalizedStatus.toLowerCase().replace(/\s+/g, "")
}

function isCatalogItemOffsale(itemDetails) {
	if (itemDetails == null || typeof itemDetails !== "object") {
		return false
	}
	if (itemDetails.isOffSale === true) {
		return true
	}
	return normalizeCatalogPriceStatus(itemDetails.priceStatus) == "offsale"
}

function normalizeSalesDataPayload(payload) {
	if (!payload || typeof payload !== "object") {
		return {priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0}
	}
	var priceDataPoints = Array.isArray(payload.priceDataPoints) ? payload.priceDataPoints.filter(function(point) {
		if (!point || typeof point !== "object") return false
		if (!point.hasOwnProperty("date")) return false
		var pointTime = new Date(point.date).getTime()
		return Number.isFinite(parseInt(point.value)) && Number.isFinite(pointTime)
	}) : []
	priceDataPoints.sort(function(a, b) {
		return new Date(b.date).getTime() - new Date(a.date).getTime()
	})
	var rap = Number.isFinite(parseInt(payload.recentAveragePrice)) ? parseInt(payload.recentAveragePrice) : 0
	if (rap <= 0 && priceDataPoints.length > 0) {
		rap = parseInt(priceDataPoints[0].value)
		if (!Number.isFinite(rap) || rap < 0) {
			rap = 0
		}
	}
	return {
		priceDataPoints: priceDataPoints,
		volumeDataPoints: [],
		recentAveragePrice: rap
	}
}

function normalizeRecentSalesRows(payload) {
	var rows = Array.isArray(payload) ? payload : []
	var normalizedRows = []
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i]
		if (!row || typeof row !== "object") {
			continue
		}
		var oldRAP = parseInt(row.oldrap)
		var newRAP = parseInt(row.newrap)
		var timestamp = parseInt(row.date)
		if (!Number.isFinite(oldRAP) || !Number.isFinite(newRAP) || !Number.isFinite(timestamp) || timestamp <= 0) {
			continue
		}
		normalizedRows.push({oldrap: oldRAP, newrap: newRAP, date: timestamp})
	}
	return normalizedRows
}

function normalizeSalesTrendMetricsPayload(payload) {
	var metrics = payload != null && typeof payload === "object" ? payload : {}
	var priceIncrease = parseFloat(metrics.priceIncrease)
	var salesMedian = parseFloat(metrics.salesMedian)
	var medianDifference = parseFloat(metrics.medianDifference)
	return {
		priceIncrease: Number.isFinite(priceIncrease) ? priceIncrease : 0,
		salesMedian: Number.isFinite(salesMedian) ? salesMedian : 0,
		medianDifference: Number.isFinite(medianDifference) ? medianDifference : 0,
		isProbablyProjected: metrics.isProbablyProjected === true
	}
}

function parseTradeSalesContext(payload) {
	var parsedPayload = parseTradeLogicPayload(payload)
	return {
		salesData: normalizeSalesDataPayload(parsedPayload.salesData),
		recentSales: normalizeRecentSalesRows(parsedPayload.recentSales),
		metrics: normalizeSalesTrendMetricsPayload(parsedPayload.metrics)
	}
}

function tradeSalesMean(values, fallbackValue) {
	var fallback = Number.isFinite(parseFloat(fallbackValue)) ? parseFloat(fallbackValue) : 0
	if (!Array.isArray(values) || values.length == 0) {
		return fallback
	}
	var sum = 0
	var count = 0
	for (var i = 0; i < values.length; i++) {
		var numeric = parseFloat(values[i])
		if (!Number.isFinite(numeric)) {
			continue
		}
		sum += numeric
		count++
	}
	return count === 0 ? fallback : (sum / count)
}

function tradeSalesMedian(values, fallbackValue) {
	var fallback = Number.isFinite(parseFloat(fallbackValue)) ? parseFloat(fallbackValue) : 0
	if (!Array.isArray(values) || values.length == 0) {
		return fallback
	}
	var numbers = []
	for (var i = 0; i < values.length; i++) {
		var numeric = parseFloat(values[i])
		if (Number.isFinite(numeric)) {
			numbers.push(numeric)
		}
	}
	if (numbers.length == 0) {
		return fallback
	}
	numbers.sort(function(a, b) {
		return a - b
	})
	var middle = Math.floor(numbers.length / 2)
	if (numbers.length % 2 === 1) {
		return numbers[middle]
	}
	return (numbers[middle - 1] + numbers[middle]) / 2
}

function buildTradeSalesContextFallback(salesData) {
	var normalizedSalesData = normalizeSalesDataPayload(salesData)
	var priceDataPoints = Array.isArray(normalizedSalesData.priceDataPoints) ? normalizedSalesData.priceDataPoints : []
	var parsedPoints = []
	for (var i = 0; i < priceDataPoints.length; i++) {
		var point = priceDataPoints[i]
		if (point == null || typeof point !== "object") {
			continue
		}
		var value = parseInt(point.value)
		var timeMs = new Date(point.date).getTime()
		if (!Number.isFinite(value) || !Number.isFinite(timeMs)) {
			continue
		}
		parsedPoints.push({
			timeMs: timeMs,
			value: value
		})
	}

	var recentSales = []
	var newestFirst = parsedPoints.slice().sort(function(a, b) {
		return b.timeMs - a.timeMs
	})
	for (var recentIndex = 0; recentIndex + 1 < newestFirst.length && recentSales.length < 50; recentIndex++) {
		var newRAP = newestFirst[recentIndex].value
		var oldRAP = newestFirst[recentIndex + 1].value
		var timestamp = parseInt(newestFirst[recentIndex].timeMs / 1000)
		if (!Number.isFinite(newRAP) || !Number.isFinite(oldRAP) || !Number.isFinite(timestamp) || timestamp <= 0) {
			continue
		}
		recentSales.push({
			oldrap: oldRAP,
			newrap: newRAP,
			date: timestamp
		})
	}

	var rap = Number.isFinite(parseInt(normalizedSalesData.recentAveragePrice)) ? parseInt(normalizedSalesData.recentAveragePrice) : 0
	var oldestFirst = parsedPoints.slice().sort(function(a, b) {
		return a.timeMs - b.timeMs
	})
	var nowMs = new Date().getTime()
	var thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
	var recentThirtyDayValues = []
	var priorThirtyDayValues = []
	for (var pointIndex = 0; pointIndex < oldestFirst.length; pointIndex++) {
		var dataPoint = oldestFirst[pointIndex]
		if (dataPoint.timeMs + thirtyDaysMs >= nowMs) {
			recentThirtyDayValues.push(dataPoint.value)
		} else if (dataPoint.timeMs + (thirtyDaysMs * 2) >= nowMs) {
			priorThirtyDayValues.push(dataPoint.value)
		}
	}
	var mean60 = priorThirtyDayValues.length === 0 ? rap : tradeSalesMean(priorThirtyDayValues, rap)
	var mean30 = recentThirtyDayValues.length === 0 ? rap : tradeSalesMean(recentThirtyDayValues, rap)
	var priceIncrease = 0
	if (mean60 > 0) {
		priceIncrease = ((mean30 - mean60) / mean60) * 100
	}
	var salesMedian = recentThirtyDayValues.length === 0 ? rap : tradeSalesMedian(recentThirtyDayValues, rap)
	var medianDifference = 0
	if (salesMedian > 0) {
		medianDifference = ((rap - salesMedian) / salesMedian) * 100
	}
	return {
		salesData: normalizedSalesData,
		recentSales: recentSales,
		metrics: {
			priceIncrease: Math.round(priceIncrease * 10) / 10,
			salesMedian: salesMedian,
			medianDifference: Math.round(medianDifference * 10) / 10,
			isProbablyProjected: salesMedian > 0 && (rap / salesMedian) > 1.5
		}
	}
}

function getCollectibleItemId(details) {
	var id = details != null && typeof details.collectibleItemId === "string" ? details.collectibleItemId.trim() : ""
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
		return id
	}
	return null
}

async function fetchSalesData(collectibleItemId) {
	if (collectibleItemId == null) {
		return {priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0}
	}
	async function fetchURL(url) {
		return new Promise(resolve => {
			chrome.runtime.sendMessage({greeting: "GetURL", url: url}, function(data) {
				resolve(data)
			})
		})
	}
	for (var attempt = 0; attempt < 2; attempt++) {
		var livePayload = normalizeSalesDataPayload(await fetchURL("https://apis.roblox.com/marketplace-sales/v1/item/" + collectibleItemId + "/resale-data"))
		if (livePayload.priceDataPoints.length > 0) {
			return livePayload
		}
		await new Promise(function(resolve) { setTimeout(resolve, 200 * (attempt + 1)) })
	}
	return {priceDataPoints: [], volumeDataPoints: [], recentAveragePrice: 0}
}

function fetchTradeSalesContext(salesData) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_sales_context", {salesData: salesData},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchValues(trades) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_preview_backend", {trades: trades, form: true}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchCachedTrades() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetCachedTrades"},
			function(data) {
				resolve(data)
			}
		)
	})
}

function cacheTrade(tradeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "DoCacheTrade", tradeId: tradeId},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchAdditionalInfo(itemId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_additional_item_info", {itemId: itemId},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTradesType(type) {
	return new Promise(resolve => {
		var normalizedType = typeof type === "string" ? type.trim().toLowerCase() : type
		chrome.runtime.sendMessage({greeting: "GetTrades", type: normalizedType},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTradesData(type) {
	return new Promise(resolve => {
		var normalizedType = typeof type === "string" ? type.trim().toLowerCase() : type
		chrome.runtime.sendMessage({greeting: "GetTradesData", type: normalizedType},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function declineTrade(tradeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "DeclineTrade", tradeId: tradeId}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchInventory(userID) {
	return ensureTradeInventory(userID)
}

function getTradeInventoryPanelUserId(index) {
	var panel = document.getElementsByClassName('trade-inventory-panel')[index]
	if (panel == null) {
		return null
	}
	var userId = parseInt(panel.getAttribute('trade-user'))
	if (!Number.isFinite(userId) || userId <= 0) {
		return null
	}
	return userId
}

async function ensureTradeInventoryForSearch(self) {
	var inventoryIndex = self ? 0 : 1
	var userId = getTradeInventoryPanelUserId(inventoryIndex)
	if (userId == null) {
		resetTradeSearchAcronymState(inventoryIndex)
		return []
	}
	if (tradeInventory[inventoryIndex] == null || tradeInventoryUsers[inventoryIndex] !== userId) {
		if (tradeInventoryUsers[inventoryIndex] !== userId) {
			resetTradeSearchAcronymState(inventoryIndex)
		}
		tradeInventoryUsers[inventoryIndex] = userId
		tradeInventory[inventoryIndex] = ensureTradeInventory(userId)
	}
	try {
		var data = await tradeInventory[inventoryIndex]
		if (Array.isArray(data)) {
			return data
		}
	} catch (e) {
		// Retry once in case cached promise was rejected by a transient failure.
	}
	tradeInventoryUsers[inventoryIndex] = userId
	tradeInventory[inventoryIndex] = ensureTradeInventory(userId)
	try {
		var retryData = await tradeInventory[inventoryIndex]
		if (Array.isArray(retryData)) {
			return retryData
		}
	} catch (e) {
	}
	tradeInventory[inventoryIndex] = null
	return []
}

function resetTradeSearchAcronymState(index) {
	tradeSearchAcronymCache[index] = null
	tradeSearchAcronymUsers[index] = null
	tradeSearchAcronymPending[index] = null
}

function normalizeTradeSearchText(value) {
	return stripTags(String(value == null ? "" : value)).toLowerCase().trim()
}

function parseTradeSearchItemJson(raw) {
	if (Array.isArray(raw)) {
		return raw
	}
	if (typeof raw !== "string" || raw.length === 0) {
		return null
	}
	try {
		var parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed : null
	} catch (e) {
		return null
	}
}

function parseTradeSearchItemAcronym(raw) {
	var parsed = parseTradeSearchItemJson(raw)
	if (parsed == null || typeof parsed[15] !== "string") {
		return ""
	}
	return normalizeTradeSearchText(parsed[15])
}

function parseTradeSearchItemValue(raw, fallbackRap) {
	var parsed = parseTradeSearchItemJson(raw)
	if (parsed == null) {
		return Number.isFinite(parseInt(fallbackRap)) ? parseInt(fallbackRap) : 0
	}
	var value = parseInt(parsed[16])
	if (!Number.isFinite(value) || value <= 0) {
		value = parseInt(parsed[8])
	}
	if (!Number.isFinite(value) || value < 0) {
		value = Number.isFinite(parseInt(fallbackRap)) ? parseInt(fallbackRap) : 0
	}
	return value
}

function doesTradeSearchItemMatch(item, normalizedQuery, acronymMap, includeAcronym) {
	if (!item || typeof item !== "object") {
		return false
	}
	if (normalizedQuery.length === 0) {
		return true
	}
	var itemName = normalizeTradeSearchText(item.name != null ? item.name : item.itemName)
	if (itemName.indexOf(normalizedQuery) > -1) {
		return true
	}
	if (!includeAcronym) {
		return false
	}
	var assetId = parseInt(item.assetId)
	if (!Number.isFinite(assetId) || assetId <= 0) {
		return false
	}
	var acronym = acronymMap != null && typeof acronymMap[String(assetId)] === "string" ? acronymMap[String(assetId)] : ""
	if (acronym.length === 0) {
		return false
	}
	return acronym.indexOf(normalizedQuery) > -1
}

async function ensureTradeSearchAcronymCache(self, inventory) {
	var cacheIndex = self ? 0 : 1
	var userId = getTradeInventoryPanelUserId(cacheIndex)
	if (userId == null) {
		return {}
	}
	if (tradeSearchAcronymUsers[cacheIndex] !== userId) {
		resetTradeSearchAcronymState(cacheIndex)
		tradeSearchAcronymUsers[cacheIndex] = userId
	}
	if (tradeSearchAcronymCache[cacheIndex] != null) {
		return tradeSearchAcronymCache[cacheIndex]
	}
	if (tradeSearchAcronymPending[cacheIndex] != null) {
		return await tradeSearchAcronymPending[cacheIndex]
	}
	var pending = new Promise(async resolve => {
		var acronymMap = {}
		var uniqueAssetIds = []
		var seen = {}
		for (var i = 0; i < inventory.length; i++) {
			var assetId = parseInt(inventory[i].assetId)
			if (!Number.isFinite(assetId) || assetId <= 0 || seen[assetId]) {
				continue
			}
			seen[assetId] = true
			uniqueAssetIds.push(assetId)
		}
		for (var start = 0; start < uniqueAssetIds.length; start += 120) {
			var chunk = uniqueAssetIds.slice(start, start + 120)
			var itemJsonMap = await fetchItems(chunk)
			if (!itemJsonMap || typeof itemJsonMap !== "object") {
				continue
			}
			var itemIds = Object.keys(itemJsonMap)
			for (var j = 0; j < itemIds.length; j++) {
				var id = itemIds[j]
				acronymMap[id] = parseTradeSearchItemAcronym(itemJsonMap[id])
				if (!(id in valueCache)) {
					valueCache[id] = parseTradeSearchItemValue(itemJsonMap[id], 0)
				}
			}
		}
		tradeSearchAcronymCache[cacheIndex] = acronymMap
		resolve(acronymMap)
	})
	tradeSearchAcronymPending[cacheIndex] = pending
	try {
		return await pending
	} finally {
		if (tradeSearchAcronymPending[cacheIndex] === pending) {
			tradeSearchAcronymPending[cacheIndex] = null
		}
	}
}

function requestInventory(greeting, userID, timeoutMs, prewarm = false) {
	return new Promise(resolve => {
		var settled = false
		var timeout = setTimeout(function() {
			if (settled) return
			settled = true
			resolve({ok: false, error: "Inventory request timed out.", data: []})
		}, timeoutMs)
		chrome.runtime.sendMessage({greeting: greeting, userID: userID, prewarm: prewarm === true}, function(data) {
			if (settled) return
			settled = true
			clearTimeout(timeout)
			resolve(data)
		})
	})
}

function getTradeInventoryError(result) {
	if (!result) return "Failed to load inventory."
	if (typeof result.error === "string" && result.error.length > 0) {
		return result.error
	}
	return "Failed to load inventory."
}

async function ensureTradeInventory(userID) {
	var tradableResult = await requestInventory("GetUserTradableInventory", userID, 12000)
	if (tradableResult && tradableResult.ok === true && Array.isArray(tradableResult.data)) {
		return tradableResult.data
	}
	throw new Error(getTradeInventoryError(tradableResult))
}

function prewarmTradeTradableInventoryForCurrentUser() {
	if (tradeTradableInventoryPrewarmDone) {
		return
	}
	tradeTradableInventoryPrewarmDone = true
	fetchUserID().then(function(userId) {
		var safeUserId = parseInt(userId)
		if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
			return
		}
		requestInventory("GetUserTradableInventory", safeUserId, 12000, true)
	})
}


function fetchUserID() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetUserID"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function flagTrader(userId, reqType) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_flag_trader", {userId: userId, reqType: reqType}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

function getLocalStorage(key) {
  return roproApiAdapter.getLocalStorage(key);
}

function getIdFromCard(item) {
	url = item.getElementsByClassName("item-card-caption")[0].getElementsByTagName("a")[0].href
	id = url.split("/catalog/")[1].split("/")[0]
	return id
}

function getIdFromTradeCard(item) {
	return item.getElementsByClassName('thumbnail-2d-container')[0].getAttribute("thumbnail-target-id")
}
async function getJSON() {
	itemList = []
	itemCards = document.getElementsByClassName("item-card-container")
	for (var i = 0; i < itemCards.length; i++) {
		item = itemCards[i]
		itemList.push(getIdFromCard(item))
	}
	tradeItem = document.getElementsByClassName("trade-request-item ng-scope")
	for (var i = 0; i < tradeItem.length; i++) {
		item = tradeItem[i]
		if (item.getElementsByClassName('thumbnail-2d-container')[0] != undefined) {
			itemList.push(getIdFromTradeCard(item))
		}
	}
	itemJSON = await fetchItems(itemList)
	return itemJSON
}

function addRecentSaleCard(sale) {
	oldRAP = parseInt(sale.oldrap)
	newRAP = parseInt(sale.newrap)
	if (!Number.isFinite(oldRAP) || oldRAP <= 0) {
		oldRAP = 1
	}
	if (!Number.isFinite(newRAP) || newRAP < 0) {
		newRAP = 0
	}
	price = Math.max(((newRAP - oldRAP) * -10 - oldRAP) / -1, 1)
	percentChange = (((newRAP - oldRAP) / oldRAP) * 100).toFixed(1)
	trendGlyph = newRAP >= oldRAP ? "▲" : "▼"
	trendColor = newRAP >= oldRAP ? "#6ED102" : "#CC0700"
	recentSaleCardHTML = `<li class="recent-sale-card" style="position:relative;padding:15px;padding-right:0px;padding-left:0px;padding-top:0px;padding-bottom:0px;margin-bottom:0px;margin-top:5px;"><div style="width:90%;padding:5px;background-color:#393B3D;margin-left:0px;border-radius:4px;margin-left:5%;" class="icon-text-wrapper clearfix icon-robux-price-container">
	<span class="item-card-price-trend-icon" style="color:${trendColor};font-weight:700;display:inline-block;width:14px;text-align:center;">${trendGlyph}</span><span class="icon-robux-white-16x16 wait-for-i18n-format-render"></span>
	<b class="text-robux-md wait-for-i18n-format-render item-card-rap">${addCommas(price)}</b>
	</div><div style="position:absolute;right:12px;top:8px;font-size:12px;color:gray;">${formatTime(parseInt(sale.date)*1000)}</div>
	<div class="recent-sale-more-info" style="position:absolute;left:-162px;top:-20px;font-size:12px;color:white;background-color:#393B3D;min-width:165px;height:85px;border-radius:7px;filter: drop-shadow(${percentChange >= 0 ? "#39ff14" : "#ff073a"} 0px 0px 2px);padding:5px;text-align:center;"><div style="width:60%;font-size:12px;float:left;"><b><u>New RAP</u><div><span class="icon-robux-white-16x16 wait-for-i18n-format-render" style="transform:scale(0.8);"></span><b class="text-robux-md wait-for-i18n-format-render item-card-rap" style="font-size:12px;">${addCommas(parseInt(newRAP))}</b></div></b><b><u>Old RAP</u><div><span class="icon-robux-white-16x16 wait-for-i18n-format-render" style="transform:scale(0.8);"></span><b class="text-robux-md wait-for-i18n-format-render item-card-rap" style="font-size:12px;">${addCommas(parseInt(oldRAP))}</b></div></b></div><div style="display:inline-block;width:40%;float:right;"><div style="margin-top:25px;font-size:18px;font-weight:bold;color:${percentChange >= 0 ? "#39ff14" : "#ff073a"};">${percentChange >= 0 ? "+" + Math.abs(percentChange): percentChange}%</div></div></div>
	</li>`
	div = document.createElement('div')
	div.innerHTML = recentSaleCardHTML
	document.getElementById('recentSalesList').appendChild(div)
}

var tryOnItemID = null;

var foregroundOpacity = undefined;

var tradeInventory = [null, null];
var tradeInventoryUsers = [null, null];
var tradeInventoryCacheWatcherStarted = false;
var tradeTradableInventoryPrewarmDone = false;
var tradeSearchAcronymCache = [null, null];
var tradeSearchAcronymUsers = [null, null];
var tradeSearchAcronymPending = [null, null];
var tradeWindowOfferObserver = null;
var tradeWindowOfferObserverTarget = null;
var tradeWindowOfferRefreshTimer = null;
var tradeWindowOfferRefreshInFlight = false;
var tradeWindowOfferRefreshPending = false;
var tradeOfferKnownThumbnailByAssetId = {}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

async function formatCard(itemid, infoCard) {
	tryOnItemID = itemid
	tryOnURL = fetchAssetsView(itemid)
	details = await fetchItemDetails(itemid)
	if (!details || typeof details !== "object") {
		details = {}
	}
	if (typeof details.creatorName !== "string") {
		details.creatorName = "Roblox"
	}
	if (!Number.isFinite(parseInt(details.creatorTargetId))) {
		details.creatorTargetId = 1
	}
	if (typeof details.name !== "string" || details.name.length == 0) {
		details.name = "Unknown Item"
	}
	var normalizedLowestPrice = Number.isFinite(parseInt(details.lowestPrice)) ? parseInt(details.lowestPrice) : 0
	var itemIsOffsale = isCatalogItemOffsale(details)
	var collectibleItemId = getCollectibleItemId(details)
	var salesData = normalizeSalesDataPayload(await fetchSalesData(collectibleItemId))
	var rawSalesContext = await fetchTradeSalesContext(salesData)
	var salesContext = isTradeLogicErrorPayload(rawSalesContext)
		? buildTradeSalesContextFallback(salesData)
		: parseTradeSalesContext(rawSalesContext)
	salesData = salesContext.salesData
	var recentSales = salesContext.recentSales
	var salesMetrics = salesContext.metrics
	var additionalInfo = await fetchAdditionalInfo(itemid)
	if (!additionalInfo || typeof additionalInfo !== "object") {
		additionalInfo = {}
	}
	itemCardLoading = infoCard.getElementsByClassName('item-card-loading')[0]
	itemCardName = infoCard.getElementsByClassName('item-card-name')[0]
	itemCardNameContainer = infoCard.getElementsByClassName('item-name-container')[0]
	itemCardCreator = infoCard.getElementsByClassName('item-card-creator')[0] 
	itemCardBestPrice = infoCard.getElementsByClassName('item-card-bestprice')[0]
	itemCardRAP = infoCard.getElementsByClassName('item-card-rap')[0]
	itemCardPriceTrend = infoCard.getElementsByClassName('item-card-price-trend')[0]
	itemCardPriceTrendIcon = infoCard.getElementsByClassName('item-card-price-trend-icon')[0]
	itemCardAcronym = infoCard.getElementsByClassName('item-card-acronym')[0]
	itemCardIFrame = infoCard.getElementsByClassName('item-card-iframe')[0]
	itemCardCreator.textContent = stripTags(details.creatorName)
	itemCardCreator.href = getSafeCreatorProfileLink(details.creatorTargetId) || "https://www.roblox.com/users/1/profile/"
	itemCardName.textContent = stripTags(details.name)
	itemCardBestPrice.textContent = itemIsOffsale ? "Offsale" : addCommas(normalizedLowestPrice)
	var previewHeight = 296 - itemCardNameContainer.getBoundingClientRect().height
	if (!Number.isFinite(previewHeight) || previewHeight < 170) {
		previewHeight = 170
	}
	itemCardIFrame.style.height = previewHeight + "px"
	infoCard.getElementsByClassName('item-sales-data')[0].value = JSON.stringify(salesData)
	infoCard.getElementsByClassName('item-graph-form')[0].submit()
	infoCard.getElementsByClassName('item-card-graph')[0].setAttribute('loaded', 'true')

	var rap = Number.isFinite(parseInt(salesData.recentAveragePrice)) ? parseInt(salesData.recentAveragePrice) : 0
	var priceIncrease = Number.isFinite(parseFloat(salesMetrics.priceIncrease)) ? parseFloat(salesMetrics.priceIncrease) : 0
	var salesMedian = Number.isFinite(parseFloat(salesMetrics.salesMedian)) ? parseFloat(salesMetrics.salesMedian) : rap
	var trendIsNegative = priceIncrease < 0
	var priceIncreaseText = (Math.round(priceIncrease * 10) / 10).toFixed(1)
	itemCardPriceTrendIcon.innerText = trendIsNegative ? "▼" : "▲"
	itemCardPriceTrendIcon.style.color = trendIsNegative ? "#CC0700" : "#7FD60D"

	itemCardPriceTrend.textContent = priceIncreaseText + "%"
	var tradeTrendPeriodNode = document.createElement('p')
	tradeTrendPeriodNode.setAttribute('style', 'font-size:9px;display:inline-block;margin-left:5px;')
	tradeTrendPeriodNode.textContent = " Past Month"
	itemCardPriceTrend.appendChild(tradeTrendPeriodNode)

	if (salesMetrics.isProbablyProjected && salesMedian > 0) {
		possiblyProjectedHTML = `<img src="${chrome.runtime.getURL('/images/warning_symbol.png')}" style="width:40px;float:left;margin-left:40px;"><b style="font-size:14px;float:right;margin-right:40px;"> Probably Projected</b><br><p style="font-size:10px;text-align:right;display:inline-block;float:right;margin-top:-3px;margin-right:40px;">RAP ${Math.round((rap - salesMedian) / salesMedian * 100)}% Above Median</p>`
		div = document.createElement('div')
		div.setAttribute('style', 'left:8px;top:250px;position:absolute;background-color:#393b3d;padding:10px;border-radius:5px;filter: drop-shadow(#F9CE3A 0px 0px 5px);width:290px;')
		div.innerHTML = possiblyProjectedHTML
		infoCard.childNodes[0].appendChild(div)	
	}

	itemCardRAP.textContent = addCommas(parseInt(salesData.recentAveragePrice)) // + `<p style="font-size:8px;display:inline-block;margin-left:5px;">${Math.abs(medianDifference)}% ${medianDifference >= 0 ? "Above" : "Below"} Median RAP</p>`

	if ('acronym' in additionalInfo) {
		infoCard.getElementsByClassName('item-card-acronym')[0].textContent = `${stripTags(additionalInfo['acronym'] == null ? "None" : additionalInfo['acronym'])}`
	}

  for (var i = 0; i < recentSales.length; i++) {
		addRecentSaleCard(recentSales[i])
	}

	if (itemCardLoading && itemCardLoading.parentNode) {
		itemCardLoading.remove()
	}
	tryOnURL = await tryOnURL
	var safeTryOnSrc = buildSafeTradeTryOnFrameSrc(tryOnURL) || "https://ropro.io/render?background=preview"
	itemCardIFrame.src = safeTryOnSrc
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

function buildSafeTradeTryOnFrameSrc(tryOnURL) {
	if (
		typeof roproApiAdapter == null ||
		typeof roproApiAdapter.getSafeUpgradeUrl !== "function"
	) {
		return null
	}
	try {
		var baseRenderUrl = "https://ropro.io/render"
		var normalizedQuery = normalizeRobloxRenderUrlToken(tryOnURL)
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

var currentInfoCard = null
var currentInfoCardOverlay = null
var currentInfoButton = null
var windowItems = {}

function closeCurrentInfoCard() {
	if (currentInfoCardOverlay != null) {
		currentInfoCardOverlay.remove()
		currentInfoCardOverlay = null
	}
	if (currentInfoCard != null) {
		currentInfoCard.remove()
		currentInfoCard = null
	}
	currentInfoButton = null
}

function closeTradePanelModal() {
	var tradePanelModal = document.getElementById('tradePanelModal')
	if (tradePanelModal != null && tradePanelModal.parentNode != null) {
		tradePanelModal.parentNode.remove()
	}
}

function openTradeUpgradeModal(options) {
	function isAllowedUpgradeHost(hostname) {
		if (typeof hostname !== "string") {
			return false
		}
		hostname = hostname.toLowerCase()
		return hostname === "ropro.io"
	}

	function isAllowedUpgradePath(pathname) {
		var normalizedPath = typeof pathname === "string" ? pathname : "/"
		return (
			normalizedPath === "/" ||
			normalizedPath === "/upgrade" ||
			normalizedPath === "/terms" ||
			normalizedPath.indexOf("/dances/") === 0 ||
			normalizedPath.indexOf("/render/") === 0
		)
	}

	function normalizeUpgradeUrl(rawUrl) {
		var safeFallback = "https://ropro.io#plus"
		var normalizedRaw = typeof rawUrl === "string" ? rawUrl : ""
		if (
			typeof roproApiAdapter !== "undefined" &&
			roproApiAdapter != null &&
			typeof roproApiAdapter.getSafeUpgradeUrl === "function"
		) {
			var adapterSafeHref = roproApiAdapter.getSafeUpgradeUrl(normalizedRaw)
			if (adapterSafeHref != null) {
				return adapterSafeHref
			}
		}

		if (normalizedRaw.length === 0) {
			return safeFallback
		}
		try {
			var parsedUpgradeUrl = new URL(normalizedRaw, safeFallback)
			if (
				parsedUpgradeUrl.protocol !== "https:" ||
				!isAllowedUpgradeHost(parsedUpgradeUrl.hostname) ||
				!isAllowedUpgradePath(parsedUpgradeUrl.pathname)
			) {
				return safeFallback
			}
			if (!parsedUpgradeUrl.hash || parsedUpgradeUrl.hash === "#") {
				parsedUpgradeUrl.hash = ""
			}
			return parsedUpgradeUrl.href
		} catch (e) {
			return safeFallback
		}
	}

	var config = typeof options === "object" && options != null ? options : {}
	// Keep upgrade prompts above the trade panel by closing the panel first.
	closeTradePanelModal()
	if (window.RoProUpgradeModal != null && typeof window.RoProUpgradeModal.open === "function") {
		var upgradeModal = window.RoProUpgradeModal.open(config)
		if (upgradeModal != null) {
			upgradeModal.style.zIndex = "100100"
		}
		return
	}
	var fallbackHref = "https://ropro.io#plus"
	if (typeof config.ctaHref === "string" && config.ctaHref.length > 0) {
		fallbackHref = config.ctaHref
	}
	if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeUpgradeUrl === "function") {
		fallbackHref = roproApiAdapter.getSafeUpgradeUrl(fallbackHref) || "https://ropro.io#plus"
	}
	fallbackHref = normalizeUpgradeUrl(fallbackHref)
		if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.openSafeUrl === "function") {
			if (roproApiAdapter.openSafeUrl(fallbackHref, "_blank", "noopener,noreferrer")) {
				return
			}
		}
		if (typeof fallbackHref === "string" && fallbackHref.indexOf("javascript:") !== 0) {
			window.open(fallbackHref, "_blank", "noopener,noreferrer")
		}
	}

function openMoreTradePanelUpgradeModal() {
	openTradeUpgradeModal({
		tier: "rex",
		contextLabel: "RoPro Trade Panel",
		subtitleText: "These advanced Trade Panel automation actions are available on RoPro Rex.",
		featureLabel: "RoPro Rex Trade Panel automation actions",
		benefits: [
			"Decline inbound and outbound losses by threshold",
			"Decline invalid and projected inbound trades",
			"Filter trades by item from the Trade Panel",
			"Bulk trade management tools from RoPro"
		],
		ctaLabel: "Upgrade",
		ctaHref: "https://ropro.io#rex",
		footerText: "Find a full list in RoPro settings."
	})
}

function openTradeSearchUpgradeModal() {
	openTradeUpgradeModal({
		tier: "rex",
		contextLabel: "RoPro Trade Search",
		subtitleText: "Trade Search is available on RoPro Plus and Advanced Trade Search is available on RoPro Rex.",
		benefits: [
			"Search your trade inventory by item name",
			"Advanced Trade Search with value-focused matching",
			"Faster trade targeting workflows inside RoPro Trade Panel",
			"Additional RoPro premium trade utilities"
		],
		ctaLabel: "Upgrade",
		ctaHref: "https://ropro.io#rex",
		footerText: "Find a full list in RoPro settings."
	})
}

function normalizeTradeVisualGateReason(reason) {
	return String(reason == null ? "" : reason).trim().toLowerCase()
}

function getTradeVisualGateTierRank(tierName) {
	var normalizedTier = "unknown"
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.normalizeSubscriptionTier === "function"
	) {
		normalizedTier = roproApiAdapter.normalizeSubscriptionTier(tierName)
	} else {
		var normalized = String(tierName == null ? "" : tierName).trim().toLowerCase()
		if (normalized === "free" || normalized === "free_tier") {
			normalizedTier = "free_tier"
		} else if (normalized === "plus" || normalized === "standard_tier") {
			normalizedTier = "standard_tier"
		} else if (
			normalized === "rex" ||
			normalized === "pro_tier" ||
			normalized === "ultra_tier" ||
			normalized === "ultra"
		) {
			normalizedTier = "pro_tier"
		}
	}
	if (normalizedTier === "free_tier") {
		return 0
	}
	if (normalizedTier === "standard_tier") {
		return 1
	}
	if (normalizedTier === "pro_tier") {
		return 2
	}
	return -1
}

function isTradeVisualGateTierAllowed(gateInfo) {
	if (gateInfo == null || typeof gateInfo !== "object") {
		return false
	}
	var currentTierRank = getTradeVisualGateTierRank(gateInfo.currentTier)
	var requiredTierRank = getTradeVisualGateTierRank(gateInfo.requiredTier)
	if (currentTierRank < 0 || requiredTierRank < 0) {
		return false
	}
	return currentTierRank >= requiredTierRank
}

function isTradeVisualGateAllowed(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateAllowed === "function"
	) {
		return roproApiAdapter.isVisualGateAllowed(gateInfo)
	}
	return gateInfo != null && typeof gateInfo === "object" && gateInfo.allowed === true
}

function isTradeVisualGateUpsellEligible(gateInfo) {
	if (gateInfo == null || typeof gateInfo !== "object" || gateInfo.allowed === true) {
		return false
	}
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateUpsellEligible === "function"
	) {
		return roproApiAdapter.isVisualGateUpsellEligible(gateInfo)
	}
	var reason = normalizeTradeVisualGateReason(gateInfo.reason)
	if (reason === "tier") {
		return true
	}
	if (reason === "setting_off") {
		return !isTradeVisualGateTierAllowed(gateInfo)
	}
	return false
}

function shouldShowTradeVisualGateLock(gateInfo) {
	if (gateInfo == null || typeof gateInfo !== "object") {
		return false
	}
	if (gateInfo.allowed === true || gateInfo.settingEnabled === false) {
		return false
	}
	return isTradeVisualGateUpsellEligible(gateInfo)
}

function shouldShowTradePanelLaunchUpsell() {
	return shouldShowTradeVisualGateLock(tradePanelVisualGateState)
}

async function fetchTradeVisualGateState(gateKey) {
	if (
		typeof roproApiAdapter === "undefined" ||
		roproApiAdapter == null ||
		typeof roproApiAdapter.getVisualGatePromise !== "function"
	) {
		return null
	}
	try {
		var gate = await roproApiAdapter.getVisualGatePromise(gateKey)
		if (gate != null && typeof gate === "object") {
			return gate
		}
	} catch (e) {}
	return null
}

async function refreshMoreTradePanelGateState() {
	var gate = await fetchTradeVisualGateState("moreTradePanel")
	if (gate != null && typeof gate === "object") {
		moreTradePanelVisualGateState = gate
	}
	return moreTradePanelVisualGateState
}

function showTradeVisualGateIssue(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.notifyVisualGateIssue === "function"
	) {
		roproApiAdapter.notifyVisualGateIssue(gateInfo, {
			contextLabel: "Trade Panel",
			contextKey: "trade_panel"
		})
	}
}

function openTradePanelLaunchUpgradeModal() {
	var gateInfo = tradePanelVisualGateState
	if (
		gateInfo != null &&
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.openUpgradeModalForVisualGate === "function"
	) {
		var modal = roproApiAdapter.openUpgradeModalForVisualGate(gateInfo, {
			modalId: "tradePanelLaunchUpgradeModal",
			fallbackTier: "plus",
			contextLabel: "RoPro Trade Panel",
			featureLabel: "Trade Panel access",
			subtitleText: "Trade Panel is available on RoPro Plus and RoPro Rex.",
			benefits: [
				"Bulk inbound and outbound trade actions",
				"One-click decline/cancel workflows from /trades",
				"Faster trade-list management with panel controls",
				"Advanced Trade Panel automation on RoPro Rex"
			],
			ctaLabel: "Upgrade to Plus",
			ctaHref: "https://ropro.io#plus",
			footerText: "Find a full list in RoPro settings."
		})
		if (modal != null) {
			modal.style.zIndex = "100100"
			return
		}
	}
	openTradeUpgradeModal({
		tier: "plus",
		contextLabel: "RoPro Trade Panel",
		subtitleText: "Trade Panel is available on RoPro Plus and RoPro Rex.",
		featureLabel: "Trade Panel access",
		benefits: [
			"Bulk inbound and outbound trade actions",
			"One-click decline/cancel workflows from /trades",
			"Faster trade-list management with panel controls",
			"Advanced Trade Panel automation on RoPro Rex"
		],
		ctaLabel: "Upgrade to Plus",
		ctaHref: "https://ropro.io#plus",
		footerText: "Find a full list in RoPro settings."
	})
}

function refreshTradeRowsAndCloseTradePanel(tabId) {
	var refreshTabId = typeof tabId === "string" ? tabId : "tab-Inbound"
	var tab = document.getElementById(refreshTabId)
	if (tab == null || tab.children == null || tab.children.length == 0) {
		tab = document.getElementById('tab-Inbound')
	}
	if (tab != null && tab.children != null && tab.children.length > 0) {
		tab.children[0].click()
		firstLoad = true
	}
	closeTradePanelModal()
}

function getCurrentTradeTabId() {
	var tabIds = ["tab-Inbound", "tab-Outbound", "tab-Completed", "tab-Inactive"]
	function labelToTradeTabId(labelText) {
		var normalizedLabel = stripTags(String(labelText || "")).toLowerCase()
		if (normalizedLabel.indexOf("outbound") !== -1) {
			return "tab-Outbound"
		}
		if (normalizedLabel.indexOf("completed") !== -1) {
			return "tab-Completed"
		}
		if (normalizedLabel.indexOf("inactive") !== -1) {
			return "tab-Inactive"
		}
		if (normalizedLabel.indexOf("inbound") !== -1) {
			return "tab-Inbound"
		}
		return null
	}
	function isTradeTabActive(tab) {
		if (tab == null) {
			return false
		}
		if (stripTags(String(tab.getAttribute('aria-selected') || "")).toLowerCase() === "true") {
			return true
		}
		var tabClassName = stripTags(String(tab.className || "")).toLowerCase()
		if (tabClassName.indexOf("active") !== -1 || tabClassName.indexOf("selected") !== -1) {
			return true
		}
		if (typeof tab.querySelector === "function") {
			if (tab.querySelector('[aria-selected="true"]') != null) {
				return true
			}
			if (tab.querySelector('.active, .selected') != null) {
				return true
			}
		}
		var tabLinks = tab.getElementsByTagName('a')
		if (tabLinks.length > 0) {
			if (stripTags(String(tabLinks[0].getAttribute('aria-selected') || "")).toLowerCase() === "true") {
				return true
			}
			var linkClassName = stripTags(String(tabLinks[0].className || "")).toLowerCase()
			if (linkClassName.indexOf("active") !== -1 || linkClassName.indexOf("selected") !== -1) {
				return true
			}
		}
		return false
	}
	for (var i = 0; i < tabIds.length; i++) {
		var tab = document.getElementById(tabIds[i])
		if (isTradeTabActive(tab)) {
			return tabIds[i]
		}
	}
	var selectedDropdownLabel = document.querySelector('.trades-header .trade-list-dropdown .input-dropdown-btn .rbx-selection-label')
	if (selectedDropdownLabel != null) {
		var dropdownTabId = labelToTradeTabId(selectedDropdownLabel.getAttribute('title') || selectedDropdownLabel.textContent)
		if (dropdownTabId != null) {
			return dropdownTabId
		}
	}
	var selectedLabels = document.querySelectorAll('.rbx-selection-label.active, .rbx-selection-label.selected, .rbx-selection-label[aria-selected="true"]')
	for (var i = 0; i < selectedLabels.length; i++) {
		var selectedTabId = labelToTradeTabId(selectedLabels[i].textContent)
		if (selectedTabId != null) {
			return selectedTabId
		}
	}
	return "tab-Inbound"
}

function refreshCurrentTradeTab() {
	if (suspectedBotBadges) {
		clearTradeBotSuspectedTierCaches()
	}
	var tab = document.getElementById(getCurrentTradeTabId())
	if (tab == null || tab.children == null || tab.children.length == 0) {
		tab = document.getElementById('tab-Inbound')
	}
	if (tab != null && tab.children != null && tab.children.length > 0) {
		firstLoad = true
		tab.children[0].click()
	}
}

function positionInfoCardCloseButton(infoCard) {
	if (infoCard == null) {
		return
	}
	var button = infoCard.getElementsByClassName('ropro-infocard-close')[0]
	if (button == null || infoCard.childNodes.length == 0) {
		return
	}
	var cardRect = infoCard.childNodes[0].getBoundingClientRect()
	var left = Math.min(window.innerWidth - 44, Math.max(8, cardRect.right - 36))
	var top = Math.min(window.innerHeight - 44, Math.max(8, cardRect.top + 8))
	button.style.left = `${left}px`
	button.style.top = `${top}px`
}

async function addInfoCard(item, id) {
	thumbnailContainer = item.getElementsByClassName("item-card-thumb-container")[0]
	infoButton = document.createElement("div")
	infoButton.setAttribute('style', 'cursor:pointer;')
	infoButton.innerHTML = `<span style="transform:scale(0.8);top:4px;bottom:initial;left:4px;z-index:10000;" class="limited-icon-container tooltip-pastnames infocardbutton" data-toggle="tooltip" title="" data-original-title="RoPro Item Info Card"><img class="infocardicon" src="${chrome.runtime.getURL('/images/chart_icon.svg')}" style="width:28px;filter:invert(0.7);"></span></span>`
	thumbnailContainer.insertBefore(infoButton, thumbnailContainer.childNodes[1])
	infoButton.addEventListener('click', function(e){
		e.preventDefault()
		e.stopPropagation()
		if (this == currentInfoButton) {
			closeCurrentInfoCard()
			return
		}
		closeCurrentInfoCard()
		currentInfoButton = this

		var normalizedAssetId = parseInt(id)
		if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
			return
		}
		var chartTarget = "item_card_graph_" + normalizedAssetId + "_" + new Date().getTime()
		var infoCardHTML = `<div uib-popover-template-popup="" uib-title="" class="dark-theme tradeinfocard popover ng-scope ng-isolate-scope bottom people-info-card-container card-with-game fade in" tooltip-animation-class="fade" uib-tooltip-classes="" ng-class="{ in: isOpen }" style="position:relative;filter: drop-shadow(rgb(0, 0, 0) 0px 0px 2px); width:950px; min-width:950px; min-height:420px; max-height:calc(100vh - 24px); overflow:auto;">
			<button type="button" aria-label="Close item info card" class="btn-control-sm ropro-trade-infocard-close-inline" style="position:absolute;top:4px;right:10px;z-index:12;background:rgba(20,22,26,0.95);color:#fff;border:1px solid rgba(255,255,255,0.45);border-radius:8px;width:28px;height:28px;line-height:26px;padding:0;font-weight:700;font-size:21px;">×</button>
			<div style="left:0px;top:0px;width:100%;height:100%;background-color:#393b3d;" class="arrow item-card-loading">${buildRoProLoader({id: "itemCardLoading", className: "ropro-branded-loader-fill", style: "width:100%; height:100%; visibility: initial !important;"})}</div>
			<div style="left:467px;transform:scale(2);top:-10px;" class="arrow"></div>
			<div class="popover-inner" style="width:950px;height:320px;">
				<div style="float:left;"><h3 style="width:300px;padding-top:5px;padding-left:10px;padding-bottom:5px;transform:scale(1);"><div class="border-bottom item-name-container">
					<a href="https://www.roblox.com/catalog/${normalizedAssetId}/" target="_blank"><h3 class="item-card-name">---</h3></a>
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
			
			</div>`
		var overlay = document.createElement('div')
		overlay.className = 'ropro-trade-infocard-overlay'
		overlay.style.position = 'fixed'
		overlay.style.inset = '0'
		overlay.style.zIndex = '100101'
		overlay.style.backgroundColor = 'rgba(0,0,0,0.66)'
		overlay.style.display = 'flex'
		overlay.style.alignItems = 'center'
		overlay.style.justifyContent = 'center'
		overlay.style.padding = '12px'
		overlay.style.overflow = 'auto'
		var infoCard = document.createElement('div')
		infoCard.innerHTML = infoCardHTML
		var infoCardRoot = infoCard.childNodes[0]
		if (infoCardRoot != null && infoCardRoot.style != null) {
			infoCardRoot.style.margin = '0 auto'
		}
		var inlineClose = infoCardRoot != null ? infoCardRoot.getElementsByClassName('ropro-trade-infocard-close-inline')[0] : null
		if (inlineClose != null) {
			inlineClose.addEventListener('click', function(clickEvent) {
				clickEvent.preventDefault()
				clickEvent.stopPropagation()
				closeCurrentInfoCard()
			})
		}
		overlay.addEventListener('click', function(clickEvent) {
			if (infoCardRoot == null || !infoCardRoot.contains(clickEvent.target)) {
				closeCurrentInfoCard()
			}
		})
		overlay.appendChild(infoCard)
		currentInfoCard = infoCard
		currentInfoCardOverlay = overlay
		document.body.appendChild(overlay)
		formatCard(normalizedAssetId, infoCard)
	})
}


window.addEventListener('click', function(e){
	if (currentInfoCard != null && currentInfoButton != null && !currentInfoCard.contains(e.target) && !currentInfoButton.contains(e.target)) {
		closeCurrentInfoCard()
	}
})

window.addEventListener('keydown', function(e) {
	if (e.key !== 'Escape') {
		return
	}
	closeCurrentInfoCard()
	if (document.getElementById('tradePanelModal') != null) {
		closeTradePanelModal()
	}
})

window.addEventListener('resize', function() {
	positionInfoCardCloseButton(currentInfoCard)
	var secondaryModal = document.getElementById('secondaryModal')
	if (secondaryModal != null) {
		scheduleSecondaryModalViewportLayout(secondaryModal)
	}
})

window.addEventListener('scroll', function() {
	positionInfoCardCloseButton(currentInfoCard)
}, true)

function formatTime(time) {
	timeSince = Math.round(new Date().getTime() - parseInt(time)) / 1000
	if (timeSince < 60) { //seconds
		period = Math.round(timeSince)
		timeString = `${period}s`
	} else if (timeSince / 60 < 60) { //minutes
		period = Math.round(timeSince / 60)
		timeString = `${period}m`
	} else if (timeSince / 60 / 60 < 24) { //hours
		period = Math.round(timeSince / 60 / 60)
		timeString = `${period}h`
	} else { //days
		period = Math.round(timeSince / 60 / 60 / 24)
		timeString = `${period}d`
	}
	return timeString
}

function kFormatter(num) {
    return Math.abs(num) > 999 ? Math.abs(num) > 999999 ? Math.sign(num)*((Math.abs(num)/1000000).toFixed(1)) + 'm' : Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num)
}

function parseDemandRating(json) {
	if (!json || json[17] == null) {
		return null
	}
	var demand = parseInt(json[17])
	if (isNaN(demand)) {
		return null
	}
	return demand + 1
}

function demandLabel(demand) {
	var demandEquivalence = {
		"0": "Projected",
		"1": "Terrible",
		"2": "Low",
		"3": "Normal",
		"4": "High",
		"5": "Amazing"
	}
	if (demand == null || !demandEquivalence.hasOwnProperty(demand.toString())) {
		return "Not Assigned"
	}
	return demandEquivalence[demand.toString()]
}

function demandDisplayValue(demand) {
	if (demand == null || isNaN(demand)) {
		return "N/A"
	}
	return parseFloat(demand).toFixed(1)
}

function getTradeItemValueForAggregation(item) {
	if (item == null || typeof item.getAttribute !== "function") {
		return 0
	}
	var value = parseInt(item.getAttribute("value"))
	if (!Number.isFinite(value) || value <= 0) {
		return 0
	}
	return value
}

function getTradeItemDemandForAggregation(item) {
	if (item == null || typeof item.getAttribute !== "function") {
		return 1
	}
	var demand = parseFloat(item.getAttribute("demand"))
	if (!Number.isFinite(demand) || demand < 1 || demand > 5) {
		return 1
	}
	return demand
}

function getTradeDemandDisplay(totalDemandWeighted, totalDemandValue) {
	if (!Number.isFinite(totalDemandWeighted) || !Number.isFinite(totalDemandValue) || totalDemandValue <= 0) {
		return "N/A"
	}
	return (totalDemandWeighted / totalDemandValue).toFixed(1)
}

function formatItem(item, id, json, inWindow) {
	if (item.getAttribute("data-ropro-formatted") !== "1") {
		item.setAttribute("data-ropro-formatted", "1")
		thumbnailContainer = item.getElementsByClassName("item-card-thumb-container")[0]
		robuxNode = item.getElementsByClassName("item-card-price")[0]
		if (inWindow) {
			robuxNode.setAttribute("style", "margin-top:-5px;margin-bottom:4px;")
		}
		valueNode = robuxNode.cloneNode(true)
		logoSpan = valueNode.getElementsByTagName("span")[0]
		valueSpan = valueNode.getElementsByTagName("span")[1]
		logoSpan.setAttribute("class", "ropro-rolimons-icon")
		logoSpan.setAttribute("style", `display:inline-block;width:16px;height:16px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:5px 2px;background-size:60%;`)
		linkSpan = logoSpan.cloneNode(true)
		linkSpan.setAttribute("style", "display:inline-block;width:16px;height:16px;vertical-align:top;position:relative;top:-2px;background-repeat:no-repeat;background-color:transparent;background-image:none;background-position:5px 2px;background-size:60%;")
		linkSpan.innerHTML += '<a target = "_blank" href = "https://www.rolimons.com/item/' + parseInt(id) + '"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" width="1em" height="1em" style="vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path class="linkpath" d="M10.586 13.414a1 1 0 0 1-1.414 1.414 5 5 0 0 1 0-7.07l3.535-3.536a5 5 0 0 1 7.071 7.071l-1.485 1.486a7.017 7.017 0 0 0-.405-2.424l.476-.476a3 3 0 1 0-4.243-4.243l-3.535 3.536a3 3 0 0 0 0 4.242zm2.828-4.242a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.07l-3.535 3.536a5 5 0 0 1-7.071-7.07l1.485-1.486c-.008.82.127 1.641.405 2.423l-.476.476a3 3 0 1 0 4.243 4.243l3.535-3.536a3 3 0 0 0 0-4.242 1 1 0 0 1 0-1.414z" fill="#fff"></path></svg></a>'
			if (tradeItemValue) {
				robuxNode.parentNode.appendChild(valueNode)
			}
			if (embeddedRolimonsItemLink && (!inWindow || isUserTradePath())) {
				valueNode.appendChild(linkSpan)
			}
		$(".linkpath").css("fill", $('body').css("color"))
		var rolimonsValue = parseInt(json[16])
		value = addCommas(rolimonsValue)
		demand = parseDemandRating(json)
		if (!Number.isFinite(rolimonsValue) || rolimonsValue <= 0) {
			value = stripTags(robuxNode.getElementsByTagName("span")[1].innerHTML)
		}
		demandInternal = demand == null ? 1.001 : demand
		demandEquivalence = {"1.001":"Not Assigned", "0":"Projected", "1":"Terrible", "2":"Low", "3":"Normal", "4":"High", "5":"Amazing"}
		demandTooltip = document.createElement("span")
		demandTooltip.setAttribute("style", "left:initial; right:4px; z-index:7;")
		demandTooltip.setAttribute("class", "demand-tooltip limited-icon-container ng-isolate-scope")
		demandTooltip.setAttribute("uib-tooltip", "Demand: " + demandEquivalence[demandInternal.toString()])
		demandTooltip.setAttribute("title", "Demand: " + demandEquivalence[demandInternal.toString()])
		demandTooltip.setAttribute("tooltip-placement", "right")
		demandTooltip.setAttribute("tooltip-append-to-body", "true")
		demandTooltip.setAttribute("limited-icon", "")
		demandTooltip.setAttribute("layout-options", "userAsset.layoutOptions")
		demandTooltip.innerHTML = '<div class="demand-tooltip-text" style="padding:3px;font-size:12px;font-weight:500;color:hsla(0,0%,100%,.7);"> ' + demandDisplayValue(demand) + ' </div><span class="limited-number-container ng-hide" ng-show="layoutOptions.isUnique"> <span class="font-caption-header">#</span> <span class="font-caption-header text-subheader limited-number ng-binding ng-hide" ng-show="layoutOptions.isLimitedNumberShown" ng-bind="layoutOptions.limitedNumber"></span> </span>'
		if (tradeItemDemand) {
			thumbnailContainer.insertBefore(demandTooltip, thumbnailContainer.childNodes[1])
			// Search cards apply custom thumbnail layering; keep demand badge above overlays after insertion.
			enforceTradeSearchThumbnailLayering(thumbnailContainer)
		}
		item.setAttribute("value", stripTags(value.replace(",","").replace(",","").replace(",","").replace(",","")))
		if (itemInfoCard) {
			addInfoCard(item, id)
		}
		ensureTradeThumbnailRolimonsLink(item, id)
		if (demand == null) {
			item.removeAttribute("demand")
		} else {
			item.setAttribute("demand", demand)
		}
		valueSpan.innerHTML = stripTags(value);
		if (json[19] == 1) {
			setTimeout(function() {
				if (tradePageProjectedWarning) {
					projectedDisplay(item.getElementsByClassName('item-card-thumb-container')[0])
				}
			}, 500)
		}
	}
	syncTradeThumbLoaderForItem(item)
}

function clearStaleTradeOfferItemFormatting(item, id) {
	if (item == null || typeof item.getAttribute !== "function") {
		return false
	}
	var normalizedTradeCardId = normalizeTradeInstanceId(id)
	if (normalizedTradeCardId.length === 0) {
		return false
	}
	var previousFormattedTradeCardId = normalizeTradeInstanceId(item.getAttribute("data-ropro-formatted-id"))
	if (item.getAttribute("data-ropro-formatted") !== "1" || previousFormattedTradeCardId === normalizedTradeCardId) {
		return false
	}
	var staleRobuxNode = item.getElementsByClassName('item-value')[0]
	if (staleRobuxNode != null) {
		while (staleRobuxNode.childNodes.length > 2) {
			staleRobuxNode.removeChild(staleRobuxNode.lastChild)
		}
	}
	refreshTradeOfferReusedCardThumbnail(item, normalizedTradeCardId)
	item.removeAttribute("data-ropro-formatted")
	item.removeAttribute("data-ropro-formatted-id")
	return true
}

function formatTradeItem(item, id, json, inWindow) {
	var normalizedTradeCardId = normalizeTradeInstanceId(id)
	clearStaleTradeOfferItemFormatting(item, normalizedTradeCardId)
	if (item.getAttribute("data-ropro-formatted") !== "1") {
		item.setAttribute("data-ropro-formatted", "1")
		item.setAttribute("data-ropro-formatted-id", normalizedTradeCardId)
		robuxNode = item.getElementsByClassName('item-value')[0]
		logoSpan = robuxNode.childNodes[0].cloneNode(true)
		valueSpan = robuxNode.childNodes[1].cloneNode(true)
		logoSpan.setAttribute("class", "ropro-rolimons-icon")
		logoSpan.setAttribute("style", `margin-left:5px;display:inline-block;width:16px;height:16px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:5px 2px;background-size:60%;`)
		linkSpan = logoSpan.cloneNode(true)
		linkSpan.setAttribute("style", "display:inline-block;width:16px;height:16px;vertical-align:top;position:relative;top:-2px;background-repeat:no-repeat;background-color:transparent;background-image:none;background-position:5px 2px;background-size:60%;")
		linkSpan.innerHTML += '<a style="margin-left:5px;" target = "_blank" href = "https://www.rolimons.com/item/' + parseInt(id) + '"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" width="1em" height="1em" style="vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path class="linkpath" d="M10.586 13.414a1 1 0 0 1-1.414 1.414 5 5 0 0 1 0-7.07l3.535-3.536a5 5 0 0 1 7.071 7.071l-1.485 1.486a7.017 7.017 0 0 0-.405-2.424l.476-.476a3 3 0 1 0-4.243-4.243l-3.535 3.536a3 3 0 0 0 0 4.242zm2.828-4.242a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.07l-3.535 3.536a5 5 0 0 1-7.071-7.07l1.485-1.486c-.008.82.127 1.641.405 2.423l-.476.476a3 3 0 1 0 4.243 4.243l3.535-3.536a3 3 0 0 0 0-4.242 1 1 0 0 1 0-1.414z" fill="#fff"></path></svg></a>'
		var rolimonsValue = parseInt(json[16])
		value = addCommas(rolimonsValue)
		demand = parseDemandRating(json)
		if (!Number.isFinite(rolimonsValue) || rolimonsValue <= 0) {
			value = stripTags(robuxNode.getElementsByTagName("span")[1].innerHTML)
		}
		item.setAttribute("value", stripTags(value.replace(",","").replace(",","").replace(",","").replace(",","")))
		if (demand == null) {
			item.removeAttribute("demand")
		} else {
			item.setAttribute("demand", demand)
		}
			valueSpan.innerHTML = stripTags(value);
			robuxNode.appendChild(logoSpan)
			robuxNode.appendChild(valueSpan)
			if (embeddedRolimonsItemLink && (!inWindow || isUserTradePath())) {
				robuxNode.appendChild(linkSpan)
			}
			ensureTradeThumbnailRolimonsLink(item, id)
		$(".linkpath").css("fill", $('body').css("color"))
		if (json[19] == 1) {
			setTimeout(function() {
				if (tradePageProjectedWarning) {
					projectedDisplay(item.getElementsByClassName('item-card-thumb-container')[0])
				}
			}, 500)
		}
	}
	syncTradeThumbLoaderForItem(item)
}

async function formatTrades(items) {
	if (items.getAttribute("class").indexOf("tradesloaded") == -1) {
		items.setAttribute("class", stripTags(items.getAttribute("class")) + " tradesloaded")
		itemCards = items.getElementsByClassName("item-card-container")
		totalTradeValue = 0
		totalTradeDemandWeighted = 0
		totalDemandValue = 0
		itemCount = 0
		robuxLine = items.getElementsByClassName('robux-line')[1]
		for (var i = 0; i < itemCards.length; i++) {
			item = itemCards[i]
			value = getTradeItemValueForAggregation(item)
			demand = getTradeItemDemandForAggregation(item)
			if (value <= 0) {
				continue
			}
			totalTradeValue += value
			if (demand != null) {
				totalTradeDemandWeighted += demand * value
				totalDemandValue += value
			}
			itemCount++
		}
		try {
			robuxAmount = parseInt(items.getElementsByClassName('text-label robux-line-value')[0].innerText.replace(",", "").replace(",", "").replace(",", "").replace(",", ""))
			if (isNaN(robuxAmount)) {
				robuxAmount = 0
			}
			totalTradeValue += Math.round(robuxAmount / 0.7)
		} catch (e) {
			console.log(e)
		}
		totalTradeDemand = getTradeDemandDisplay(totalTradeDemandWeighted, totalDemandValue)
		if (tradeValueCalculator) {
			totalValue = `<div style="margin-top:-10px;" class="robux-line"> <span class="text-lead ng-binding" ng-bind="'Label.TotalValue' | translate">Rolimons Value:</span> <span class="robux-line-amount"> <span style="position:relative;left:-8px;display:inline-block;width:18px;height:18px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:2px 1px;background-size:72%;" class="ropro-rolimons-icon"></span><span class="text-robux-lg robux-line-value ng-binding" style="font-size:22px;line-height:22px;">` + addCommas(parseInt(totalTradeValue)) + '</span> </span> </div>'
		} else {
			totalValue = ''
		}
		if (tradeDemandRatingCalculator) {
			totalDemand = `<div style = "margin-top:-10px;" class="robux-line"> <span class="text-lead ng-binding" ng-bind="'Label.TotalValue' | translate">Demand Rating:</span> <span class="robux-line-amount"> <span style="position:relative;left:-8px;display:inline-block;width:18px;height:18px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:2px 1px;background-size:72%;" class="ropro-rolimons-icon"></span><span class="text-robux-lg robux-line-value ng-binding" style="font-size:22px;line-height:22px;">` + (totalTradeDemand == "N/A" ? "N/A" : addCommas(totalTradeDemand) + '/5.0') + `</span> </span> </div>`
		} else {
			totalDemand = ''
		}
		robuxLine.parentNode.innerHTML += totalValue + totalDemand
		return totalTradeValue
	}
	var fallbackItemCards = items.getElementsByClassName("item-card-container")
	var fallbackTotalTradeValue = 0
	for (var fallbackCardIndex = 0; fallbackCardIndex < fallbackItemCards.length; fallbackCardIndex++) {
		var fallbackCard = fallbackItemCards[fallbackCardIndex]
		var fallbackValue = getTradeItemValueForAggregation(fallbackCard)
		if (fallbackValue <= 0) {
			continue
		}
		fallbackTotalTradeValue += fallbackValue
	}
	try {
		var fallbackRobuxAmount = parseInt(items.getElementsByClassName('text-label robux-line-value')[0].innerText.replace(",", "").replace(",", "").replace(",", "").replace(",", ""))
		if (isNaN(fallbackRobuxAmount)) {
			fallbackRobuxAmount = 0
		}
		fallbackTotalTradeValue += Math.round(fallbackRobuxAmount / 0.7)
	} catch (e) {
		console.log(e)
	}
	return fallbackTotalTradeValue
}

function formatTradesWindow(items) {
		itemCards = items.getElementsByClassName("trade-request-item")
		totalTradeValue = 0
		totalTradeDemandWeighted = 0
		totalDemandValue = 0
		itemCount = 0
		robuxLine = items.getElementsByClassName('robux-line')[1]
		if (items.getElementsByClassName('thumbnail-2d-container')[0] != undefined) {
			for (var i = 0; i < itemCards.length; i++) {
				item = itemCards[i]
				if (item.getElementsByClassName('thumbnail-2d-container')[0] != undefined) {
					value = getTradeItemValueForAggregation(item)
					demand = getTradeItemDemandForAggregation(item)
					if (value <= 0) {
						continue
					}
					totalTradeValue += value
					if (demand != null) {
						totalTradeDemandWeighted += demand * value
						totalDemandValue += value
					}
					itemCount++
				}
			}
		}
		totalTradeDemand = getTradeDemandDisplay(totalTradeDemandWeighted, totalDemandValue)
		robux = parseInt(items.getElementsByClassName('robux-line-value')[0].innerHTML.replace(",","").replace(",","").replace(",",""))
		totalTradeValue += Math.round(robux / 0.7)
		robuxLine.getElementsByClassName('robux-line-amount')[0].setAttribute("style", "height:0px;")
		if (items.getElementsByClassName('rolimons-value')[0] == undefined && items.getElementsByClassName('rolimons-demand')[0] == undefined) {
			if (tradeValueCalculator) {
				rolimonsLine = robuxLine.cloneNode(true)
				rolimonsLine.setAttribute("style", "margin-top:-5px")
				rolimonsLine.innerHTML = `<span style="margin-top:-5px;" class="rolimons-value text-lead ng-binding">Rolimons Value:</span> <span class="robux-line-amount"> <span style="position:relative;left:-8px;display:inline-block;width:18px;height:18px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:2px 1px;background-size:72%;" class="ropro-rolimons-icon"></span><span class="text-robux-lg rolimons-line-value robux-line-value ng-binding" style="font-size:22px;line-height:22px;">` + addCommas(parseInt(totalTradeValue)) + '</span> </span>'
				robuxLine.parentNode.appendChild(rolimonsLine)
			}
			if (tradeDemandRatingCalculator) {
				rolimonsLine = robuxLine.cloneNode(true)
				rolimonsLine.setAttribute("style", "margin-top:-5px")
				rolimonsLine.innerHTML = `<span style="margin-top:-5px;" class="rolimons-demand text-lead ng-binding">Demand Rating:</span> <span class="robux-line-amount"> <span style="position:relative;left:-8px;display:inline-block;width:18px;height:18px;vertical-align:middle;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')});background-position:2px 1px;background-size:72%;" class="ropro-rolimons-icon"></span><span class="text-robux-lg rolimons-line-demand robux-line-value ng-binding" style="font-size:22px;line-height:22px;">` + (totalTradeDemand == "N/A" ? "N/A" : addCommas(totalTradeDemand) + '/5.0') + `</span> </span>`
				robuxLine.parentNode.appendChild(rolimonsLine)
			}
		} else {
			if (tradeValueCalculator) {
				items.getElementsByClassName('rolimons-line-value')[0].innerHTML = addCommas(parseInt(totalTradeValue));
			}
			if (tradeDemandRatingCalculator) {
				items.getElementsByClassName('rolimons-line-demand')[0].innerHTML = totalTradeDemand == "N/A" ? "N/A" : totalTradeDemand + "/5.0";
			}
		}
		return totalTradeValue
}

function projectedDisplay(assetThumbnail) {
	if (typeof assetThumbnail != "undefined") {
		if (assetThumbnail.getElementsByClassName('ropro-projected-badge').length > 0) {
			return
		}
		div = document.createElement('div')
		projectedHTML = `<span style="background:intial;background-color:initial;top:-2px;right:-2px;left:initial;bottom:initial;pointer-events:none;" class="limited-icon-container ng-isolate-scope ropro-projected-badge" uib-tooltip="Demand: Normal" title="Projected Item" tooltip-placement="top" tooltip-append-to-body="true" limited-icon="" layout-options="userAsset.layoutOptions"><img width="110" src="${chrome.runtime.getURL('/images/projected_icon.png')}"></span>`
		div.innerHTML += projectedHTML
		assetThumbnail.appendChild(div)
	}
}

function removeTradeDetailWinLossBadges() {
	var existingBadges = document.getElementsByClassName('ropro-trade-detail-winloss')
	for (var i = existingBadges.length - 1; i >= 0; i--) {
		existingBadges[i].remove()
	}
}

function getWinLossPercentText(myValue, theirValue) {
	var normalizedMyValue = parseInt(myValue)
	var normalizedTheirValue = parseInt(theirValue)
	if (!Number.isFinite(normalizedMyValue) || !Number.isFinite(normalizedTheirValue)) {
		return "---"
	}
	if (normalizedMyValue <= 0 || normalizedTheirValue <= 0) {
		return "---"
	}
	var differencePercent = Math.abs(((normalizedMyValue - normalizedTheirValue) / normalizedMyValue) * 100)
	if (!Number.isFinite(differencePercent)) {
		return "---"
	}
	return parseFloat(differencePercent.toFixed(1)) + "%"
}

async function checkTrade() {
	itemJSON = await getJSON()
	itemCards = document.getElementsByClassName("item-card-container")
	for (var i = 0; i < itemCards.length; i++) {
		item = itemCards[i]
		id = getIdFromCard(item)
		json = itemJSON[parseInt(id)]
		if (json == undefined) {
			json = "[\"NOT FOUND\",0,0,0,0,0,0,0,0,0,0,0,0,0,0,\"NOT FOUND\",0,0,0,null,null,null,0]"
			json[16] = 0
		}
		formatItem(item, id, JSON.parse(json), false)
	}
	var detailOffers = document.getElementsByClassName('trade-list-detail-offer')
	if (detailOffers.length < 2) {
		return
	}
	val1 = await formatTrades(detailOffers[0])
	val2 = await formatTrades(detailOffers[1])
	removeTradeDetailWinLossBadges()
	if (await fetchSetting("winLossDisplay")) {
		if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
			return
		}
		var detailOfferHeaders = document.getElementsByClassName('trade-list-detail-offer-header')
		if (detailOfferHeaders.length < 2) {
			return
		}
		difference = val2 - val1
		if (!Number.isFinite(difference)) {
			return
		}
		differencePercent = getWinLossPercentText(val1, val2)
		winHTML = `<div style="position:absolute;display:block;top:-19.5px;left:159px;width:100%;text-align:center;width:250px;"><span class="robux-line-amount" style="padding-top:5px;${foregroundOpacity < 1 ? 'background-color:none!important;' : ''}"> <span class="ropro-delta-arrow-icon" style="display:inline-block;position:relative;top:-4px;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL(`/images/${difference >= 0 ? 'up_arrow' : 'down_arrow'}.png`)});background-position:0px -1px;background-size:100%;width:12px;height:12px;vertical-align:middle;margin-left:1px;margin-bottom:-1px;margin-right:3px;"></span><span class="text-robux-lg robux-line-value ng-binding">${difference >= 0 ? "+" : ''}${addCommas(parseInt(difference))}</span><span style="vertical-align:top;" class="text-robux robux-line-value ng-binding"> (${differencePercent})</span></span></div>`
		div = document.createElement('div')
		div.className = "ropro-trade-detail-winloss"
		div.innerHTML = winHTML
		detailOfferHeaders[1].style.position = "relative"
		detailOfferHeaders[1].appendChild(div)
	}
}

async function checkTradeFree() {
	itemCards = document.getElementsByClassName("item-card-container")
	for (var i = 0; i < itemCards.length; i++) {
		item = itemCards[i]
		id = getIdFromCard(item)
		if (item.getElementsByClassName('infocardicon').length == 0) {
			addInfoCard(item, id)
		}
	}
}

async function checkTradeWindow() {
	itemJSON = await getJSON()
	Object.keys(itemJSON).forEach(function(id, json) {
		windowItems[id] = itemJSON[id]
	})
	itemCards = document.getElementsByClassName("item-card-container")
	for (var i = 0; i < itemCards.length; i++) {
		item = itemCards[i]
		id = getIdFromCard(item)
		json = itemJSON[parseInt(id)]
		if (json == undefined) {
			json = "[\"NOT FOUND\",0,0,0,0,0,0,0,0,0,0,0,0,0,0,\"NOT FOUND\",0,0,0,null,null,null,0]"
		}
		formatItem(item, id, JSON.parse(json), true)
	}
}

async function checkTradeWindowOffers() {
	if (Object.keys(windowItems).length > 0) {
		if (Object.keys(windowItems).length > 0) {
			itemCards = document.getElementsByClassName("trade-request-item")
			itemFound = false
			undefinedItems = []
			for (var i = 0; i < itemCards.length; i++) {
				item = itemCards[i]
				if (item.getElementsByClassName('thumbnail-2d-container')[0] != undefined) {
					id = getIdFromTradeCard(item)
					clearStaleTradeOfferItemFormatting(item, id)
					json = windowItems[parseInt(id)]
					if (json == undefined) {
						undefinedItems.push(id)
						json = "[\"NOT FOUND\",0,0,0,0,0,0,0,0,0,0,0,0,0,0,\"NOT FOUND\",0,0,0,null,null,null,0]"
						json[16] = 0
					} else {
						formatTradeItem(item, id, JSON.parse(json), true)
					}
				}
			}
			if (undefinedItems.length > 0) {
				itemJSON = await fetchItems(undefinedItems)
				Object.keys(itemJSON).forEach(function(id, json) {
					windowItems[id] = itemJSON[id]
				})
				for (var i = 0; i < itemCards.length; i++) {
					item = itemCards[i]
					if (item.getElementsByClassName('thumbnail-2d-container')[0] != undefined) {
						id = getIdFromTradeCard(item)
						json = windowItems[parseInt(id)]
						if (json == undefined) {
							json = "[\"NOT FOUND\",0,0,0,0,0,0,0,0,0,0,0,0,0,0,\"NOT FOUND\",0,0,0,null,null,null,0]"
							json[16] = 0
						}
						formatTradeItem(item, id, JSON.parse(json), true)
					}
				}
			}
			formatTradesWindow(document.getElementsByClassName('trade-request-window-offer')[0])
			formatTradesWindow(document.getElementsByClassName('trade-request-window-offer')[1])
		}
		val1 = await formatTradesWindow(document.getElementsByClassName('trade-request-window-offer')[0])
		val2 = await formatTradesWindow(document.getElementsByClassName('trade-request-window-offer')[1])
		rememberVisibleTradeOfferThumbnails()
		if (await fetchSetting("winLossDisplay")) {
			if (document.getElementById('winDiv') != null) {
				document.getElementById('winDiv').remove()
			}
			if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
				return
			}
			difference = val2 - val1
			if (!Number.isFinite(difference)) {
				return
			}
			differencePercent = getWinLossPercentText(val1, val2)
			winHTML = `<div style="position:absolute;display:block;top:-19px;left:0px;text-align:center;width:100%;"><div class="rbx-divider" style="margin-top: 0px; margin-bottom: -10px;"></div><span class="robux-line-amount" style="padding-top:5px;${foregroundOpacity < 1 ? 'background-color:none!important;' : ''}"> <span class="ropro-delta-arrow-icon" style="display:inline-block;position:relative;top:-4px;background-repeat:no-repeat;background-color:transparent;background-image:url(${chrome.runtime.getURL(`/images/${difference >= 0 ? 'up_arrow' : 'down_arrow'}.png`)});background-position:0px -1px;background-size:100%;width:12px;height:12px;vertical-align:middle;margin-left:1px;margin-bottom:-1px;margin-right:3px;"></span><span class="text-robux-lg robux-line-value ng-binding">${difference >= 0 ? "+" : ''}${addCommas(parseInt(difference))}</span><span style="vertical-align:top;" class="text-robux robux-line-value ng-binding"> (${differencePercent})</span></span></div>`
			div = document.createElement('div')
			div.id = "winDiv"
			div.innerHTML = winHTML
			document.getElementsByClassName('trade-request-window-offer')[1].style.position = "relative"
			document.getElementsByClassName('trade-request-window-offer')[1].appendChild(div)
		}
	} else {
		scheduleTradeWindowOfferRefresh(500)
	}
}

async function addTradeDetails(tradeRowDetails) {
	if (embeddedRolimonsUserLink) {
		tradeUserLink = tradeRowDetails.getElementsByClassName('avatar-card-link')[0].href
		tradeUserID = stripTags(tradeUserLink.split("/users/")[1].split("/profile")[0])
		div = document.createElement("div")
		div.style.display = "inline-block";
		div.style.marginLeft = "3px";
		div.style.paddingTop = "0px";
		div.style.verticalAlign = "top";
		rolimonsUserLinkHTML = `<span class="rolimons-user-link" style="display:inline-block;width:16px;height:16px;vertical-align:top;position:relative;top:-2px;background-image:none;background-repeat:no-repeat;background-color:transparent;background-position:2px 2px;background-size:80%;"><a target="_blank" href="https://www.rolimons.com/player/${parseInt(tradeUserID)}"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" width="1em" height="1em" style="vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path class="linkpath" d="M10.586 13.414a1 1 0 0 1-1.414 1.414 5 5 0 0 1 0-7.07l3.535-3.536a5 5 0 0 1 7.071 7.071l-1.485 1.486a7.017 7.017 0 0 0-.405-2.424l.476-.476a3 3 0 1 0-4.243-4.243l-3.535 3.536a3 3 0 0 0 0 4.242zm2.828-4.242a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.07l-3.535 3.536a5 5 0 0 1-7.071-7.07l1.485-1.486c-.008.82.127 1.641.405 2.423l-.476.476a3 3 0 1 0 4.243 4.243l3.535-3.536a3 3 0 0 0 0-4.242 1 1 0 0 1 0-1.414z" fill="#fff" style="fill: rgb(255, 255, 255);"></path></svg></a></span>`
		div.innerHTML += rolimonsUserLinkHTML
		tradeUserElement = tradeRowDetails.getElementsByClassName('text-lead ng-binding')[0]
		tradeUserElement.appendChild(div)
	}
	tradeRowDetails.classList.add("rolimons-user-link-added")
	var hint = tradeRowDetails.getElementsByClassName('text-date-hint ng-binding')[0]
	var isOutboundTab = $('.rbx-selection-label:contains("Outbound")').length > 0
	var outboundStatusOpen = false
	if (isOutboundTab && hint != null && isTradeHintOpenStatus(hint)) {
		outboundStatusOpen = true
		hint.innerHTML = ""
	}
	if (quickDecline && $('.rbx-selection-label:contains("Inbound")').length > 0) {
		hint = tradeRowDetails.getElementsByClassName('text-date-hint ng-binding')[0]
		var inboundStatusOpen = hint != null && isTradeHintOpenStatus(hint)
		if (inboundStatusOpen) {
			hint.innerHTML = ""
		}
		if (inboundStatusOpen && hint.getElementsByClassName('ropro-quick-decline').length == 0) {
			appendTradeQuickDeclineRow(hint)
		}
	}
	if (quickCancel && isOutboundTab) {
		hint = tradeRowDetails.getElementsByClassName('text-date-hint ng-binding')[0]
		if (hint != null && outboundStatusOpen && hint.getElementsByClassName('ropro-quick-cancel').length == 0) {
			appendTradeQuickCancelRow(hint)
		}
	}
}

async function addBatchTradeDetails(tradeRows) {
	iconBroken = document.getElementsByClassName('icon-broken')
	for (var i = 0; i < iconBroken.length; i++) {
		broken = iconBroken[i]
		broken.classList.remove('icon-broken')
	}
	var userIds = []
	for (var rowIndex = 0; rowIndex < tradeRows.length; rowIndex++) {
		var tradeRowUserId = getTradeRowUserId(tradeRows[rowIndex])
		if (tradeRowUserId != null) {
			userIds.push(tradeRowUserId)
		}
	}
	if (userIds.length == 0) {
		if (suspectedBotBadges) {
			enforceTradeBotSuspectedBadgesForRows(tradeRows)
		}
		return
	}
	if (tradePanel) {
		tradeFlags = await fetchFlagsBatch(userIds)
		tradeFlags = normalizeTradeBotterIds(tradeFlags)
		cacheTradeBotFlagBatch(userIds, tradeFlags)
		enforceTradeBotFacesForRows(tradeRows)
		// Roblox can rebind avatar src after initial render; re-apply once delayed.
		setTimeout(function() {
			enforceTradeBotFacesForRows(tradeRows)
		}, 300)
	}
	if (suspectedBotBadges) {
		queueTradeBotSuspectedTierFetchForRows(tradeRows)
		enforceTradeBotSuspectedBadgesForRows(tradeRows)
	}
}

function toggleSerials() {
	serialContainers = document.getElementsByClassName('limited-number-container')
	for (var i = 0; i < serialContainers.length; i++) {
		serialContainer = serialContainers[i]
		serials = serialContainer.getElementsByTagName('span');
		for (var j = 0; j < serials.length; j++) {
			serials[j].classList.toggle("text-blur")
		}
	}
}

function addHideButton(tradeTitle) {
	if ($('.light-theme').length > 0) {
		theme2 = "_lightmode"
	} else {
		theme2 = ""
	}
	div = document.createElement("div")
	div.classList.add("inactive")
	div.classList.add("buttontooltip")
	div.style.display = "inline-block";
	hideHTML = `<img class="hide-button limited-icon-container tooltip-pastnames" style="width:25px;margin-top:-3px;cursor:pointer;" src="${chrome.runtime.getURL('/images/serials_on'+theme2+'.png')}"><span style="margin-top:-5.5px;margin-left:3px;pointer-events:none;width:130px;" class="tooltiptext">Blur Serials</span>`
	div.innerHTML += hideHTML
	if (tradeTitle.parentNode.parentNode.getElementsByClassName('text-label ng-binding')[0].classList.contains("ng-hide")) {
		tradeTitle.parentNode.parentNode.getElementsByClassName('text-label ng-binding')[0].innerHTML = ""
		tradeTitle.parentNode.parentNode.getElementsByClassName('text-label ng-binding')[0].classList.remove("ng-hide")
	}
	tradeTitle.parentNode.parentNode.getElementsByClassName('text-label ng-binding')[0].appendChild(div)
	tradeTitle.classList.add("hide-button-inserted")
	div.addEventListener("click", function() {
		if (this.classList.contains("inactive")) {
			this.classList.remove("inactive")
			this.getElementsByTagName('img')[0].src = chrome.runtime.getURL('/images/serials_on'+theme2+'.png')
			toggleSerials()
		} else {
			this.classList.add("inactive")
			this.getElementsByTagName('img')[0].src = chrome.runtime.getURL('/images/serials_on'+theme2+'.png')
			toggleSerials()	
		}
	})
}

async function addTradeFlag(tradeTitle) {
	tradeTitle.classList.add("trade-flag-inserted")
	if (tradeTitle.parentNode.parentNode.getElementsByClassName('trade-flag').length == 0) {
		if ($('.light-theme').length > 0) {
			theme = "lightmode"
		} else {
			theme = "darkmode"
		}
		//username = stripTags(tradeTitle.innerHTML.split(" ")[tradeTitle.innerHTML.split(" ").length - 1])
		row = $(".trade-row.selected .trade-row-container")
		if (row.length > 0) {
			userID = parseInt(row.get(0).getElementsByClassName('thumbnail-2d-container')[0].getAttribute("thumbnail-target-id"))
			rowImage = row.get(0).getElementsByClassName('thumbnail-2d-container')[0].getElementsByTagName('img')[0]
			flag = typeof rowImage != 'undefined' && rowImage.src.includes("robot.png") ? "1" : "0"
			div = document.createElement("div")
			div.style.display = "inline-block";
			div.style.position = "relative";
			div.style.marginLeft = "5px";
			div.classList.add("buttontooltip")
			div.classList.add("trade-flag-div")
			if (flag == "0") {
				flagHTML = `<img class="hide-button limited-icon-container tooltip-pastnames trade-flag" style="width:25px;margin-top:-3px;cursor:pointer;" src="${chrome.runtime.getURL('/images/trade_flag_inactive_'+theme+'3.png')}"><span style="margin-top:-5.5px;margin-left:3px;pointer-events:none;" class="tooltiptext">Flag User as Trade Bot</span>`
			} else {
				flagHTML = `<img class="hide-button limited-icon-container tooltip-pastnames trade-flag active" style="width:25px;margin-top:-3px;cursor:pointer;" src="${chrome.runtime.getURL('/images/trade_flag_active_'+theme+'3.png')}"><span style="margin-top:-5.5px;margin-left:3px;pointer-events:none;" class="tooltiptext">User Flagged as Trade Bot</span>`
			}
			div.innerHTML += flagHTML
			if (tradeTitle.parentNode.parentNode.getElementsByClassName('trade-flag').length == 0) {
				tradeTitle.parentNode.parentNode.getElementsByClassName('text-label ng-binding')[0].appendChild(div)
				firstLoad = false
				div.getElementsByTagName('img')[0].addEventListener("click", function() {
					if (this.classList.contains("active")) {
						row = $(".trade-row.selected .trade-row-container")
						for (var i = 0; i < row.length; i++) {
							restoreTradeBotFaceFromRow(row.get(i))
						}
						setTradeBotFlagCache(userID, false)
						this.classList.remove("active")
						this.src = chrome.runtime.getURL('/images/trade_flag_inactive_'+theme+'3.png')
						this.parentNode.getElementsByClassName('tooltiptext')[0].innerHTML = "Flag User as Trade Bot"
						flagTrader(userID, "remove")
					} else {
						row = $(".trade-row.selected .trade-row-container")
						for (var i = 0; i < row.length; i++) {
							applyTradeBotFaceToRow(row.get(i))
						}
						setTradeBotFlagCache(userID, true)
						this.classList.add("active")
						this.src = chrome.runtime.getURL('/images/trade_flag_active_'+theme+'3.png')
						this.parentNode.getElementsByClassName('tooltiptext')[0].innerHTML = "User Flagged as Trade Bot"
						flagTrader(userID, "add")
					}
				})
			}
		}
	}
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var TRADE_PANEL_SECONDARY_DEFAULT_WIDTH_PX = 720
var TRADE_PANEL_SECONDARY_MIN_WIDTH_PX = 320
var TRADE_PANEL_SECONDARY_RESULT_MIN_HEIGHT_PX = 390

function applyTradePanelResultLayout(info, minHeightPx) {
	var parsedHeight = parseInt(minHeightPx)
	var targetHeight = Number.isFinite(parsedHeight) ? parsedHeight : TRADE_PANEL_SECONDARY_RESULT_MIN_HEIGHT_PX
	if (targetHeight < TRADE_PANEL_SECONDARY_RESULT_MIN_HEIGHT_PX) {
		targetHeight = TRADE_PANEL_SECONDARY_RESULT_MIN_HEIGHT_PX
	}
	var secondaryModal = document.getElementById('secondaryModal')
	if (secondaryModal != null) {
		secondaryModal.style.height = targetHeight + "px"
		secondaryModal.scrollTop = 0
		scheduleSecondaryModalViewportLayout(secondaryModal)
	}
	if (info != null && info.parentNode != null) {
		info.parentNode.style.marginTop = "0px"
	}
}

function appendTradePanelBackButton(info, marginTopPx) {
	if (info == null || document.getElementById('secondaryClose') != null) {
		return
	}
	var buttonMarginTop = Number.isFinite(parseInt(marginTopPx)) ? parseInt(marginTopPx) : 16
	var div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:${buttonMarginTop}px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
}

function showTradePanelActionError(info, message) {
	if (info == null) {
		return
	}
	info.innerHTML = stripTags(message)
	appendTradePanelBackButton(info, 8)
	applyTradePanelResultLayout(info)
}

function showTradePanelNoResult(info, message) {
	if (info == null) {
		return
	}
	info.innerHTML = stripTags(message)
	if (info.parentNode != null && info.parentNode.childNodes != null && info.parentNode.childNodes.length > 0) {
		var leadingIcon = info.parentNode.childNodes[0]
		if (leadingIcon != null && typeof leadingIcon.style === "object") {
			leadingIcon.style.width = "60px"
			leadingIcon.style.margin = "-15px"
			leadingIcon.style.marginRight = "-5px"
			leadingIcon.style.marginBottom = "-10px"
			leadingIcon.src = chrome.runtime.getURL('/images/checkmark.png')
		}
	}
	appendTradePanelBackButton(info, 8)
	applyTradePanelResultLayout(info)
}

async function loadTradesWithCache(tradeType, info, loadingLabel) {
	var label = typeof loadingLabel === "string" && loadingLabel.length > 0 ? loadingLabel : tradeType
	info.innerHTML = `Loading ${label} Trades...`
	var trades = await fetchTradesType(tradeType)
	info.innerHTML = `Loading Trades... (0/${trades.length})`
	var cache = await fetchCachedTrades()
	var loadedTrades = []
	var uncachedTrades = []
	var count = 0
	for (var j = 0; j < trades.length; j++) {
		var tradeId = parseInt(trades[j][0])
		if (tradeId in cache && cache[tradeId] != null) {
			loadedTrades.push(cache[tradeId])
			count++
			info.innerHTML = `Loading Trades... (${count}/${trades.length})`
		} else {
			uncachedTrades.push(tradeId)
		}
	}
	for (var i = 0; i < uncachedTrades.length; i++) {
		count++
		async function doCache(tradeId) {
			var cachedTrade = await cacheTrade(tradeId)
			if (Number.isInteger(cachedTrade)) {
				if (cachedTrade == 429) {
					await timeout(2000)
					return await doCache(tradeId)
				}
				return null
			}
			if (Array.isArray(cachedTrade) && cachedTrade.length >= 1 && cachedTrade[0] != null) {
				return cachedTrade[0]
			}
			return null
		}
		try {
			var hydratedTrade = await doCache(uncachedTrades[i])
			if (hydratedTrade != null) {
				loadedTrades.push(hydratedTrade)
			}
		} catch (e) {
			console.log(e)
		}
		info.innerHTML = `Loading Trades... (${count}/${trades.length})`
	}
	return loadedTrades
}

function declineTrades(trades, info) {
	return new Promise(resolve => {
		async function doDecline(trades, info) {
			var completedCount = 0
			var declinedCount = 0
			for (var k = 0; k < trades.length; k++) {
				var tradeId = trades[k][0]
				var declineStatus = null
				for (var j = 0; j < 12; j++) {
					declineStatus = await declineTrade(tradeId)
					if (declineStatus == 429) {
						await timeout(10000) //Upon ratelimit, wait 10 seconds and try again
					} else {
						break
					}
				}
				if (isTradeMutationSuccessStatus(declineStatus)) {
					declinedCount++
				}
				completedCount++
				info.innerHTML = `Declining Trades... (${parseInt(completedCount)}/${parseInt(trades.length)})`
			}
			resolve(declinedCount)
		}
		doDecline(trades, info)
	})
}

async function declineAllInbounds(info) {
	loadedCount = 0
	info.innerHTML = "Loading Inbound Trades..."
	trades = await fetchTradesType("Inbound")
	info.innerHTML = `Declining Trades... (0/${parseInt(trades.length)})`
	declined = await declineTrades(trades, info)
	info.innerHTML = `Done. Declined ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'}`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}

function getTradesAtLeastAgeHours(trades, minimumAgeHours, nowMs) {
	var oldTrades = []
	var currentTimeMs = Number.isFinite(nowMs) ? nowMs : new Date().getTime()
	for (var j = 0; j < trades.length; j++) {
		var trade = trades[j]
		if (trade == null || trade.user == null) {
			continue
		}
		var createdMs = new Date(trade.created).getTime()
		if (!Number.isFinite(createdMs)) {
			continue
		}
		var tradeAge = (currentTimeMs - createdMs) / 1000 / 60 / 60
		if (tradeAge >= minimumAgeHours) {
			oldTrades.push([trade.id, trade.user.id])
		}
	}
	return oldTrades
}

async function declineOldTrades(info, age, tradesType) {
	applyTradePanelResultLayout()
	loadedCount = 0
	info.innerHTML = "Loading Trades..."
	var trades
	var tradesName
	if (tradesType == "Outbound") {
		tradesName = "Cancelled"
		trades = await fetchTradesData("Outbound")
	} else {
		tradesName = "Declined"
		trades = await fetchTradesData("Inbound")
	}
	var oldTrades = getTradesAtLeastAgeHours(trades, age)
	info.innerHTML = `Declining Trades... (0/${parseInt(oldTrades.length)})`
	var declined = await declineTrades(oldTrades, info)
	info.innerHTML = `Done. ${tradesName} ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'} which were ${(age <= 24 ? age : Math.round(age / 24)) + (age <= 24 ? ' hour' + (age == 1 ? '' : 's') + ' old': ' day' + (Math.round(age / 24) == 1 ? '' : 's') + ' old')} or older.`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel(tradesType == "Outbound" ? "tab-Outbound" : "tab-Inbound")
}

function isTradeMutationSuccessStatus(status) {
	var normalizedStatus = parseInt(status)
	return Number.isFinite(normalizedStatus) && normalizedStatus >= 200 && normalizedStatus < 300
}

async function declineAllInboundLosses(info, percentLoss) {
	if (!isTradeVisualGateAllowed(moreTradePanelVisualGateState)) {
		showTradeVisualGateIssue(moreTradePanelVisualGateState)
		return
	}
	var loadedTrades = await loadTradesWithCache("Inbound", info, "Inbound")
	if (loadedTrades.length === 0) {
		showTradePanelNoResult(info, `Done. Declined 0 Losses of ${percentLoss}% or more.`)
		return
	}
	var myUserId = await fetchUserID()
	info.innerHTML = "Analyzing Trades..."
	var rawLossResult = await fetchTradeLogicDecision("loss_threshold", {
		trades: loadedTrades,
		myUserId: myUserId,
		threshold: percentLoss
	})
	if (isTradeLogicErrorPayload(rawLossResult)) {
		showTradePanelActionError(info, "Unable to analyze trades right now. Please try again.")
		return
	}
	var lossResult = parseTradeLogicPayload(rawLossResult)
	var winsLosses = normalizeTradeLogicLossSummary(lossResult)
	var declineTradeIds = normalizeTradeLogicTradeIds(lossResult)
	var decline = []
	for (var i = 0; i < declineTradeIds.length; i++) {
		decline.push([declineTradeIds[i], 0])
	}
	info.innerHTML = `Analyzed Trades.<br><u style="font-size:13px;">Wins: ${winsLosses["wins"]} | Equal: ${winsLosses["equal"]} | Losses: ${winsLosses["losses"]} | Losses To Decline: ${winsLosses["validLosses"]}</u>`
	info.innerHTML = `Declining Trades... (0/${parseInt(decline.length)})`
	declined = await declineTrades(decline, info)
	info.innerHTML = `Done. Declined ${parseInt(declined)} Loss${parseInt(declined) == 1 ? '' : 'es'} of ${percentLoss}% or more.`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}

async function declineInvalidInbounds(info) {
	if (!isTradeVisualGateAllowed(moreTradePanelVisualGateState)) {
		showTradeVisualGateIssue(moreTradePanelVisualGateState)
		return
	}
	var loadedTrades = await loadTradesWithCache("Inbound", info, "Inbound")
	if (loadedTrades.length === 0) {
		showTradePanelNoResult(info, "Done. Declined 0 Trades. All remaining trades are valid.")
		return
	}
	var decline = []
	var userInventory = {}
	info.innerHTML = `Loading Your Inventory...`
	var myId = await fetchUserID()
	try {
		userInventory[myId] = await fetchInventory(myId)
	} catch (e) {
		console.log(e)
		info.innerHTML = "Failed to load your tradable inventory. No trades were declined."
		return
	}

	var counterpartyUserIds = new Set()
	var counterpartyUserNames = {}
	for (var j = 0; j < loadedTrades.length; j++) {
		var tradeSides = resolveTradeOfferSides(loadedTrades[j], myId, true)
		var theirUserId = null
		if (tradeSides != null && tradeSides.theirUser != null) {
			theirUserId = parseInt(tradeSides.theirUser.id)
		} else if (loadedTrades[j].user != null) {
			theirUserId = parseInt(loadedTrades[j].user.id)
		}
		if (Number.isFinite(theirUserId) && theirUserId > 0 && theirUserId !== parseInt(myId)) {
			counterpartyUserIds.add(theirUserId)
			if (loadedTrades[j].user != null && typeof loadedTrades[j].user.name === "string") {
				counterpartyUserNames[String(theirUserId)] = loadedTrades[j].user.name
			}
		}
	}

	var counterparties = Array.from(counterpartyUserIds)
	for (var i = 0; i < counterparties.length; i++) {
		var counterpartyUserId = counterparties[i]
		var counterpartyDisplayName = counterpartyUserNames.hasOwnProperty(String(counterpartyUserId))
			? counterpartyUserNames[String(counterpartyUserId)]
			: ("User " + counterpartyUserId)
		info.innerHTML = `Loading ${stripTags(counterpartyDisplayName)}'s Inventory... (${i + 1}/${counterparties.length})`
		if (counterpartyUserId in userInventory) {
			continue
		}
		try {
			userInventory[counterpartyUserId] = await fetchInventory(counterpartyUserId)
		} catch (e) {
			console.log(e)
			info.innerHTML = `Failed to load ${stripTags(counterpartyDisplayName)}'s tradable inventory. No trades were declined.`
			return
		}
	}

	info.innerHTML = "Validating Inbound Trades..."
	var rawInvalidResult = await fetchTradeLogicDecision("invalid_inbounds", {
		trades: loadedTrades,
		myUserId: myId,
		inventories: buildTradeValidationInventoryPayload(userInventory)
	})
	if (isTradeLogicErrorPayload(rawInvalidResult)) {
		showTradePanelActionError(info, "Unable to validate inbound trades right now. Please try again.")
		return
	}
	var invalidResult = parseTradeLogicPayload(rawInvalidResult)
	var declineTradeIds = normalizeTradeLogicTradeIds(invalidResult)
	var skippedValidationTrades = normalizeTradeLogicSkippedCount(invalidResult)
	for (var tradeIndex = 0; tradeIndex < declineTradeIds.length; tradeIndex++) {
		decline.push([declineTradeIds[tradeIndex], 0])
	}

	info.innerHTML = `Declining Trades... (0/${parseInt(decline.length)})`
	declined = await declineTrades(decline, info)
	if (skippedValidationTrades > 0) {
		info.innerHTML = `Done. Declined ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'}. ${parseInt(skippedValidationTrades)} Trade${parseInt(skippedValidationTrades) == 1 ? '' : 's'} were skipped because collectible item instance IDs could not be validated safely.`
	} else {
		info.innerHTML = `Done. Declined ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'}. All remaining trades are valid.`
	}
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}

async function declineProjectedInbounds(info) {
	if (!isTradeVisualGateAllowed(moreTradePanelVisualGateState)) {
		showTradeVisualGateIssue(moreTradePanelVisualGateState)
		return
	}
	var loadedTrades = await loadTradesWithCache("Inbound", info, "Inbound")
	if (loadedTrades.length === 0) {
		showTradePanelNoResult(info, "Done. Declined 0 Trades With Projecteds.")
		return
	}
	var decline = []
	var myId = await fetchUserID()
	info.innerHTML = `Checking Trades For Projected Items...`
	var rawProjectedResult = await fetchTradeLogicDecision("projected_inbounds", {
		trades: loadedTrades,
		myUserId: myId
	})
	if (isTradeLogicErrorPayload(rawProjectedResult)) {
		showTradePanelActionError(info, "Unable to check projected inbounds right now. Please try again.")
		return
	}
	var projectedResult = parseTradeLogicPayload(rawProjectedResult)
	var declineTradeIds = normalizeTradeLogicTradeIds(projectedResult)
	var skippedProjectedTrades = normalizeTradeLogicSkippedCount(projectedResult)
	for (var i = 0; i < declineTradeIds.length; i++) {
		decline.push([declineTradeIds[i], 0])
	}
	info.innerHTML = `Declining Trades... (0/${parseInt(decline.length)})`
	declined = await declineTrades(decline, info)
	if (skippedProjectedTrades > 0) {
		info.innerHTML = `Done. Declined ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'} With Projecteds. ${parseInt(skippedProjectedTrades)} Trade${parseInt(skippedProjectedTrades) == 1 ? '' : 's'} were skipped because offer sides could not be resolved safely.`
	} else {
		info.innerHTML = `Done. Declined ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'} With Projecteds.`
	}
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.style.marginTop = "0px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}


async function filterTradesByItem(info, item) {
	if (!isTradeVisualGateAllowed(moreTradePanelVisualGateState)) {
		showTradeVisualGateIssue(moreTradePanelVisualGateState)
		return
	}
	filterHTML = `<div style="margin-top:8px;background-color:#393B3D;border-radius:6px;min-height:38px;position:relative;display:inline-flex;align-items:center;gap:8px;padding:6px 48px 6px 10px;overflow:hidden;max-width:calc(100vw - 32px);"><span style="font-weight:bold;color:white;flex:0 0 auto;font-size:15px;line-height:20px;">Trade Filter:</span><img class="ropro-image-${parseInt(item.id)}" style="width:24px;height:24px;flex:0 0 auto;" src="${chrome.runtime.getURL('/images/empty.png')}"><span id="tradeFilterText" style="color:white;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:20px;">${stripTags(item.name)}</span><button type="button" class="trade-filter-close" aria-label="Clear trade filter" style="position:absolute;right:0;top:0;width:40px;height:100%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;padding:0;z-index:2;"><span style="pointer-events:none;font-size:30px;line-height:1;font-family:Arial,sans-serif;">×</span></button></div>`
	var loadedTrades = await loadTradesWithCache("Inbound", info, "Inbound")
	info.innerHTML = "Filtering Trades..."
	var filterResult = {}
	if (loadedTrades.length > 0) {
		var rawFilterResult = await fetchTradeLogicDecision("filter_by_item", {
			trades: loadedTrades,
			itemId: item.id
		})
		if (isTradeLogicErrorPayload(rawFilterResult)) {
			showTradePanelActionError(info, "Unable to filter trades right now. Please try again.")
			return
		}
		filterResult = parseTradeLogicPayload(rawFilterResult)
	}
	var matchedTradeIdSet = new Set(normalizeTradeLogicTradeIds(filterResult))
	var filteredTrades = []
	for (var j = 0; j < loadedTrades.length; j++) {
		var tradeId = parseInt(loadedTrades[j].id)
		if (!Number.isFinite(tradeId) || !matchedTradeIdSet.has(tradeId)) {
			continue
		}
		loadedTrades[j].user.nameForDisplay = loadedTrades[j].user.displayName
		loadedTrades[j].isActive = true
		loadedTrades[j].tradeStatusType = "Inbound"
		loadedTrades[j].status = "Open"
		filteredTrades.push(loadedTrades[j])
	}
				if (filteredTrades.length == 0) {
					info.innerHTML = `There are no inbound trades with this item.`
					info.parentNode.childNodes[0].style.width = "60px"
					info.parentNode.childNodes[0].style.margin = "-15px"
					info.parentNode.childNodes[0].style.marginRight = "-5px"
					info.parentNode.childNodes[0].style.marginBottom = "-10px"
					var secondaryBody = document.getElementById('secondaryBody')
					var filterSearchSection = document.getElementById('filterSearchSection')
					if (filterSearchSection != null) {
						filterSearchSection.style.display = "none"
						filterSearchSection.style.height = "0px"
						filterSearchSection.style.margin = "0px"
						filterSearchSection.style.padding = "0px"
					}
					var filterSearchBar = document.getElementById('filterSearchBar')
					if (filterSearchBar != null) {
						filterSearchBar.style.display = "none"
					}
					var itemSearchList = document.getElementById('itemSearchList')
					if (itemSearchList != null) {
						itemSearchList.style.display = "none"
					}
					var itemSearchSelection = document.getElementById('itemSearchSelection')
					if (itemSearchSelection != null) {
						itemSearchSelection.style.display = "none"
					}
				if (secondaryBody != null) {
					secondaryBody.style.marginTop = "0px"
					}
					info.parentNode.style.marginTop = "0px"
					info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
			if (secondaryBody != null) {
			var existingResultActions = secondaryBody.getElementsByClassName('ropro-secondary-result-actions')
			for (var actionIndex = existingResultActions.length - 1; actionIndex >= 0; actionIndex--) {
				existingResultActions[actionIndex].remove()
			}
			div = document.createElement('div')
			div.className = 'ropro-secondary-result-actions'
			div.style.marginTop = '14px'
			div.style.display = 'flex'
			div.style.flexDirection = 'column'
			div.style.alignItems = 'center'
			div.style.gap = '10px'
			div.innerHTML = `<p id="secondaryReload" style="margin:0;cursor:pointer;line-height:20px;">Reload</p><a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
			secondaryBody.appendChild(div)
		} else {
			div = document.createElement('div')
			div.innerHTML = `<p id="secondaryReload" style="margin-top:3px;cursor:pointer;">Reload</p><a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
			info.appendChild(div)
		}
			applyTradePanelResultLayout(info, 440)
			$("#secondaryReload").click(function(){
			closeSecondary()
			setTimeout(function() {
				document.getElementById('filterTradesByItem').click()
			}, 500)
		})
		$("#secondaryClose").click(function(){
			closeSecondary()
		})
	} else {
		if (document.getElementById('filteredTrades') == null) {
			filteredTradesDiv = document.createElement('div')
			filteredTradesDiv.setAttribute('id', 'filteredTrades')
			filteredTradesDiv.style.display = 'none'
			filteredTradesDiv.innerText = encodeURI(JSON.stringify(filteredTrades))
			document.body.appendChild(filteredTradesDiv)
		} else {
			filteredTradesDiv = document.getElementById('filteredTrades')
			filteredTradesDiv.innerText = encodeURI(JSON.stringify(filteredTrades))
		}
		if (document.getElementById('filterText') == null) {
			div = document.createElement('div')
			div.id = 'filterText'
			div.innerHTML = filterHTML
		} else {
			div = document.getElementById('filterText')
			div.innerHTML = filterHTML
		}
			div.getElementsByClassName('trade-filter-close')[0].addEventListener('click', function() {
					document.getElementById('tab-Inbound').children[0].click()
					document.getElementById('filterText').remove()
				})
			var tradeHeader = document.getElementsByClassName('trades-header')[0]
			div.style.display = "block"
			div.style.marginTop = "2px"
			if (tradeHeader != null && tradeHeader.parentNode != null) {
				if (tradeHeader.nextSibling != null) {
					tradeHeader.parentNode.insertBefore(div, tradeHeader.nextSibling)
				} else {
					tradeHeader.parentNode.appendChild(div)
				}
			} else if (tradeHeader != null) {
				tradeHeader.appendChild(div)
			}
			setAssetThumbnail(parseInt(item.id))
			document.getElementById('tab-Inbound').children[0].addEventListener('click', function() {
				if (document.getElementById('filterText') != null) {
					document.getElementById('filterText').remove()
			}
			firstLoad = true
		})
		document.getElementById('tab-Outbound').children[0].addEventListener('click', function() {
			if (document.getElementById('filterText') != null) {
				document.getElementById('filterText').remove()
			}
			firstLoad = true
		})
		document.getElementById('tab-Completed').children[0].addEventListener('click', function() {
			if (document.getElementById('filterText') != null) {
				document.getElementById('filterText').remove()
			}
			firstLoad = true
		})
		document.getElementById('tab-Inactive').children[0].addEventListener('click', function() {
			if (document.getElementById('filterText') != null) {
				document.getElementById('filterText').remove()
			}
			firstLoad = true
		})
		document.dispatchEvent(new CustomEvent('replaceRows'));
		document.getElementById('tradePanelModal').parentNode.remove()
	}
}

async function cancelAllOutbounds(info) {
	loadedCount = 0
	info.innerHTML = "Loading Outbound Trades..."
	trades = await fetchTradesType("Outbound")
	info.innerHTML = `Cancelling Trades... (0/${parseInt(trades.length)})`
	declined = await declineTrades(trades, info)
	info.innerHTML = `Done. Cancelled ${parseInt(declined)} Trade${parseInt(declined) == 1 ? '' : 's'}`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Outbound')
}

async function cancelAllOutboundLosses(info, percentLoss) {
	if (!isTradeVisualGateAllowed(moreTradePanelVisualGateState)) {
		showTradeVisualGateIssue(moreTradePanelVisualGateState)
		return
	}
	var loadedTrades = await loadTradesWithCache("Outbound", info, "Outbound")
	if (loadedTrades.length === 0) {
		showTradePanelNoResult(info, `Done. Cancelled 0 Losses of ${parseInt(percentLoss)}% or more.`)
		return
	}
	var myUserId = await fetchUserID()
	info.innerHTML = "Analyzing Outbound Trades..."
	var rawLossResult = await fetchTradeLogicDecision("loss_threshold", {
		trades: loadedTrades,
		myUserId: myUserId,
		threshold: percentLoss
	})
	if (isTradeLogicErrorPayload(rawLossResult)) {
		showTradePanelActionError(info, "Unable to analyze outbound trades right now. Please try again.")
		return
	}
	var lossResult = parseTradeLogicPayload(rawLossResult)
	var winsLosses = normalizeTradeLogicLossSummary(lossResult)
	var declineTradeIds = normalizeTradeLogicTradeIds(lossResult)
	var decline = []
	for (var i = 0; i < declineTradeIds.length; i++) {
		decline.push([declineTradeIds[i], 0])
	}
	info.innerHTML = `Analyzed Outbound Trades.<br><u style="font-size:13px;">Wins: ${winsLosses["wins"]} | Equal: ${winsLosses["equal"]} | Losses: ${winsLosses["losses"]} | Losses To Cancel: ${winsLosses["validLosses"]}</u>`
	info.innerHTML = `Cancelling Trades... (0/${parseInt(decline.length)})`
	declined = await declineTrades(decline, info)
	info.innerHTML = `Done. Cancelled ${parseInt(declined)} Loss${parseInt(declined) == 1 ? '' : 'es'} of ${parseInt(percentLoss)}% or more.`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Outbound')
}

async function declineFlaggedTradeBotters(info) {
	loadedCount = 0
	info.innerHTML = "Loading Inbound Trades..."
	trades = await fetchTradesType("Inbound")
	users = new Set()
	for (var j = 0; j < trades.length; j++) {
		users.add(trades[j][1])
	}
	users = Array.from(users)
	info.innerHTML = "Checking For Users You've Flagged..."
	botters = new Set(normalizeTradeBotterIds(await fetchTradeBotters(users, "flagged")))
	botTrades = []
	for (var j = 0; j < trades.length; j++) {
		if (botters.has(parseInt(trades[j][1]))) {
			botTrades.push(trades[j])
		}
	}
	info.innerHTML = `Declining Trades... (0/${parseInt(botTrades.length)})`
	declined = await declineTrades(botTrades, info)
	info.innerHTML = `Done. Declined ${parseInt(declined)} Bot Trade${parseInt(declined) == 1 ? '' : 's'}`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}

async function declineSuspectedTradeBotters(info) {
	selectionText = $(".sus-selection").get(0).textContent
	if (selectionText == "A Bit Sus") {
		selection = "bit_sus"
		selectionText2 = "A Bit Sus"
	} else if (selectionText == "Kinda Sus") {
		selection = "kinda_sus"
		selectionText2 = "Kinda Sus"
	} else if (selectionText == "Pretty Sus") {
		selection = "pretty_sus"
		selectionText2 = "Pretty Sus"
	} else {
		selection = "mad_sus"
		selectionText2 = "Mad Sus"
	}
	loadedCount = 0
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.innerHTML = "Loading Inbound Trades..."
	trades = await fetchTradesType("Inbound")
	users = new Set()
	for (var j = 0; j < trades.length; j++) {
		users.add(trades[j][1])
	}
	users = Array.from(users)
	info.textContent = "Checking For Traders Who Are " + selectionText2 + "..."
	botters = new Set(normalizeTradeBotterIds(await fetchTradeBotters(users, selection)))
	await timeout(5000)
	botTrades = []
	for (var j = 0; j < trades.length; j++) {
		if (botters.has(parseInt(trades[j][1]))) {
			botTrades.push(trades[j])
		}
	}
	info.innerHTML = `Declining Trades... (0/${parseInt(botTrades.length)})`
	declined = await declineTrades(botTrades, info)
	info.innerHTML = `Done. Declined ${parseInt(declined)} Suspected Bot Trade${parseInt(declined) == 1 ? '' : 's'}`
	info.parentNode.childNodes[0].style.width = "60px"
	info.parentNode.childNodes[0].style.margin = "-15px"
	info.parentNode.childNodes[0].style.marginRight = "-5px"
	info.parentNode.childNodes[0].style.marginBottom = "-10px"
	info.parentNode.childNodes[0].src = chrome.runtime.getURL('/images/checkmark.png')
	div = document.createElement('div')
	div.innerHTML = `<a style="width:240px;color:white;background-color:rgb(0, 132, 221);display:inline-block;margin:16px 0 0 0;" class="btn-growth-md btn-secondary-md" id="secondaryClose"><p style="font-weight:bold;color:white;">Back</p></a>`
	info.appendChild(div)
	applyTradePanelResultLayout(info, 420)
	$("#secondaryClose").click(function(){
		closeSecondary()
	})
	refreshTradeRowsAndCloseTradePanel('tab-Inbound')
}



function addTradePanelSecondaryCloseButton(secondaryModal) {
	if (secondaryModal == null || secondaryModal.getElementsByClassName('trade-panel-secondary-close').length > 0) {
		return
	}
	var closeButton = document.createElement('button')
	closeButton.type = 'button'
	closeButton.className = 'trade-panel-secondary-close'
	closeButton.setAttribute('aria-label', 'Close trade panel modal')
	closeButton.innerText = '×'
	closeButton.style.position = 'absolute'
	closeButton.style.top = '8px'
	closeButton.style.right = '12px'
	closeButton.style.width = '34px'
	closeButton.style.height = '34px'
	closeButton.style.border = '1px solid rgba(255,255,255,0.35)'
	closeButton.style.borderRadius = '8px'
	closeButton.style.background = 'rgba(20,22,26,0.95)'
	closeButton.style.color = 'white'
	closeButton.style.fontSize = '30px'
	closeButton.style.lineHeight = '26px'
	closeButton.style.padding = '0'
	closeButton.style.cursor = 'pointer'
	closeButton.style.zIndex = '10002'
	closeButton.addEventListener('click', function(e) {
		e.preventDefault()
		e.stopPropagation()
		closeTradePanelModal()
	})
	secondaryModal.appendChild(closeButton)
}

function getSecondaryModalInnerContentContainers(secondaryModal) {
	if (secondaryModal == null || typeof secondaryModal.querySelectorAll !== 'function') {
		return []
	}
	return secondaryModal.querySelectorAll('div[style*="position:absolute"][style*="top:110px"]')
}

function applySecondaryModalViewportLayout(secondaryModal) {
	if (secondaryModal == null) {
		return
	}
	var viewportWidth = Number.isFinite(window.innerWidth) && window.innerWidth > 0 ? window.innerWidth : TRADE_PANEL_SECONDARY_DEFAULT_WIDTH_PX
	var viewportHeight = Number.isFinite(window.innerHeight) && window.innerHeight > 0 ? window.innerHeight : 720
	var modalWidth = Math.min(TRADE_PANEL_SECONDARY_DEFAULT_WIDTH_PX, Math.max(TRADE_PANEL_SECONDARY_MIN_WIDTH_PX, viewportWidth - 24))
	secondaryModal.style.width = modalWidth + "px"
	secondaryModal.style.left = "calc(50% - " + Math.round(modalWidth / 2) + "px)"
	secondaryModal.style.maxHeight = Math.max(260, viewportHeight - 24) + "px"
	secondaryModal.style.overflowY = "auto"
	secondaryModal.style.overflowX = "hidden"
	var secondaryHeader = secondaryModal.getElementsByTagName('h2')[0]
	if (secondaryHeader != null) {
		secondaryHeader.style.width = Math.max(240, modalWidth - 50) + "px"
	}
	var contentContainers = getSecondaryModalInnerContentContainers(secondaryModal)
	for (var i = 0; i < contentContainers.length; i++) {
		var contentContainer = contentContainers[i]
		contentContainer.style.width = Math.max(240, modalWidth - 50) + "px"
		contentContainer.style.height = "auto"
		contentContainer.style.maxHeight = Math.max(160, viewportHeight - 220) + "px"
		contentContainer.style.overflowY = "auto"
		contentContainer.style.overflowX = "hidden"
		contentContainer.style.paddingBottom = "14px"
	}
	var modalHeight = secondaryModal.getBoundingClientRect().height
	if (!Number.isFinite(modalHeight) || modalHeight <= 0) {
		return
	}
	var top = Math.max(12, Math.round((viewportHeight - modalHeight) / 2))
	secondaryModal.style.top = top + "px"
}

function scheduleSecondaryModalViewportLayout(secondaryModal) {
	if (secondaryModal == null) {
		return
	}
	applySecondaryModalViewportLayout(secondaryModal)
	setTimeout(function() {
		applySecondaryModalViewportLayout(secondaryModal)
	}, 0)
	setTimeout(function() {
		applySecondaryModalViewportLayout(secondaryModal)
	}, 80)
}

function observeSecondaryModalLayout(secondaryModal) {
	if (secondaryModal == null || typeof MutationObserver === "undefined") {
		return
	}
	if (secondaryModal.__roproLayoutObserver != null && typeof secondaryModal.__roproLayoutObserver.disconnect === "function") {
		secondaryModal.__roproLayoutObserver.disconnect()
	}
	var observer = new MutationObserver(function() {
		scheduleSecondaryModalViewportLayout(secondaryModal)
	})
	observer.observe(secondaryModal, {childList: true, subtree: true, characterData: true})
	secondaryModal.__roproLayoutObserver = observer
}

function disconnectSecondaryModalLayoutObserver(secondaryModal) {
	if (secondaryModal == null) {
		return
	}
	if (secondaryModal.__roproLayoutObserver != null && typeof secondaryModal.__roproLayoutObserver.disconnect === "function") {
		secondaryModal.__roproLayoutObserver.disconnect()
	}
	secondaryModal.__roproLayoutObserver = null
}

function getTradePanelBaseModalContent() {
	if (document.getElementsByClassName('upgrade-modal-content').length > 0) {
		return document.getElementsByClassName('upgrade-modal-content')[0]
	}
	if (document.getElementsByClassName('upgrade-modal-content-tertiary').length > 0) {
		return document.getElementsByClassName('upgrade-modal-content-tertiary')[0]
	}
	if (document.getElementsByClassName('upgrade-modal-content-secondary').length > 0) {
		return document.getElementsByClassName('upgrade-modal-content-secondary')[0]
	}
	return null
}

function isTradePanelClickInsideNode(e, node) {
	if (node == null) {
		return false
	}
	if (typeof e.composedPath === 'function') {
		var path = e.composedPath()
		for (var i = 0; i < path.length; i++) {
			if (path[i] === node) {
				return true
			}
		}
	}
	return node.contains(e.target)
}

function handleTradePanelBackdropClick(e) {
	var secondaryModal = document.getElementById('secondaryModal')
	var baseModalContent = getTradePanelBaseModalContent()
	if (secondaryModal != null) {
		// While a secondary modal is open, only close on true backdrop clicks.
		// Clicks inside the base panel (for example, the button that opens a secondary modal)
		// should not be treated as outside clicks.
		if (isTradePanelClickInsideNode(e, secondaryModal) || isTradePanelClickInsideNode(e, baseModalContent)) {
			return
		}
		closeTradePanelModal()
		return
	}
	if (baseModalContent != null && !isTradePanelClickInsideNode(e, baseModalContent)) {
		closeTradePanelModal()
	}
}

function openSecondary() {
	modal = document.getElementsByClassName('upgrade-modal-content').length > 0 ? document.getElementsByClassName('upgrade-modal-content')[0] : document.getElementsByClassName('upgrade-modal-content-tertiary')[0]
	if (typeof modal != 'undefined') {
		modal.classList.remove('upgrade-modal-content')
		modal.classList.remove('upgrade-modal-content-tertiary')
		modal.classList.add('upgrade-modal-content-secondary')
		if (secondary != null) {
			secondary.classList.add('ropro-trade-panel-secondary-modal')
		}
		modal.parentNode.appendChild(secondary)
		var secondaryBackLabel = secondary.querySelector('#secondaryCancel p')
		if (secondaryBackLabel != null) {
			secondaryBackLabel.innerText = 'Back'
		}
		addTradePanelSecondaryCloseButton(secondary)
		observeSecondaryModalLayout(secondary)
		scheduleSecondaryModalViewportLayout(secondary)
		secondary.style.display = "block"
		setTimeout(function() {
			scheduleSecondaryModalViewportLayout(secondary)
		}, 10)
	}
}

function closeSecondary() {
	if (document.getElementsByClassName('upgrade-modal-content-secondary').length > 0) {
		modal = document.getElementsByClassName('upgrade-modal-content-secondary')[0]
		modal.classList.remove('upgrade-modal-content-secondary')
		modal.classList.add('upgrade-modal-content-tertiary')
	}
	if ($("#secondaryModal").length == 0) {
		return
	}
	disconnectSecondaryModalLayoutObserver($("#secondaryModal").get(0))
	$("#secondaryModal").get(0).style.left = "2000px"
	setTimeout(function(){
		if ($("#secondaryModal").length > 0) {
			disconnectSecondaryModalLayoutObserver($("#secondaryModal").get(0))
			$("#secondaryModal").get(0).remove()
		}
	}, 400)
}

async function addTradePanel() {
	var currentMoreTradePanelGate = await refreshMoreTradePanelGateState()
	var hasRexTradePanel = isTradeVisualGateAllowed(currentMoreTradePanelGate)
	tradePanelHTML = `<div id="tradePanelModal" class="upgrade-modal ropro-upgrade-modal" style="z-index: 100000; display: block;">
		<div style="z-index:10000;display:block;overflow:visible;" class="upgrade-modal ropro-upgrade-modal">
			<div style="background-color:#232527;position:absolute;width:600px;height:775px;left:calc(50% - 300px);top:calc(50% - 400px);" class="dark-theme modal-content upgrade-modal-content ropro-upgrade-card ropro-trade-panel-card">
				<span aria-label="Close trade panel modal" style="font-size:30px;line-height:30px;" class="upgrade-modal-close ropro-upgrade-close ropro-trade-panel-close">×</span>
				<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;">
					<img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}">
					<p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p>
				</h2>
				<video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance9.webm" autoplay="" loop="" muted=""></video>
				<a href="https://ropro.io#plus" target="_blank"></a>
				<div style="position:absolute;top:110px;width:550px;height:675px;left:25px;">
					<li class="panel-button" style="display: block;margin:10px;position:relative">
						<a style="width:100%;color:white;background-color:#0077CC;" class="btn-growth-md btn-secondary-md" id="declineAllInbounds">
							<img src="${chrome.runtime.getURL('/images/inbound_icon.png')}" style="width:20px;float:left;">
							<p style="font-weight:bold;color:white;">Decline All Inbounds</p>
						</a>
						<span style="position:absolute;top:-3px;left:535px;width:210px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline all trades you have inbound.</span>
					</li>
					<li class="panel-button" style="display: block;margin:10px;position:relative;">
						<a style="width:100%;color:white;background-color:#0077CC;" class="btn-growth-md btn-secondary-md" id="cancelAllOutbounds">
							<img src="${chrome.runtime.getURL('/images/inbound_icon.png')}" style="width:20px;float:left;transform: scaleX(-1);">
							<p style="font-weight:bold;color:white;">Cancel All Outbounds</p>
						</a>
						<span style="position:absolute;top:-3px;left:535px;width:210px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Cancel all trades you have outbound.</span>
					</li>
					<li class="panel-button" style="display: block;margin:10px;position:relative;">
						<a style="width:100%;color:white;background-color:#0077CC;" class="btn-growth-md btn-secondary-md" id="declineFlaggedTradeBotters">
							<img src="${chrome.runtime.getURL('/images/robot_white2.png')}" style="margin:-3px;width:30px;float:left;transform: scaleX(-1);">
							<p style="font-weight:bold;color:white;">Decline Trade Botters You've Flagged</p>
						</a>
						<span style="position:absolute;top:-15px;left:535px;width:210px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline all trades from users you have flagged as trade bots.</span>
					</li>
					<li class="panel-button" style="display: block;margin:10px;position:relative;">
						<a style="width:100%;color:white;background-color:#0077CC;" class="btn-growth-md btn-secondary-md" id="declineSuspectedTradeBotters">
							<img src="${chrome.runtime.getURL('/images/robot_white2.png')}" style="margin:-3px;width:30px;float:left;transform: scaleX(-1);">
							<p style="font-weight:bold;color:white;">Decline Suspected Trade Botters</p>
						</a>
						<span style="position:absolute;top:-30px;left:535px;width:210px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline all trades from users who are suspected to be trade botters based on RoPro community flags.</span>
					</li>
					<li class="panel-button" style="display: block;margin:10px;padding-bottom:15px;border-bottom: 3px solid #FFFFFF;position:relative;">
						<a style="width:100%;color:white;background-color:#0077CC;" class="btn-growth-md btn-secondary-md" id="declineOldTrades">
							<img src="${chrome.runtime.getURL('/images/timer_light.svg')}" style="width:30px;float:left;filter:invert(1);margin-left:-3px;margin-top:-2px;margin-bottom:-5px;">
							<p style="font-weight:bold;color:white;">Decline Old Trades</p>
						</a>
						<span style="position:absolute;top:-15px;left:535px;width:210px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline trades which are older than a certain age in hours/days.</span>
					</li>
						<li style="display: block;margin:10px;height:55px;">
							<div style="float:left;">
								<p style="font-weight:bold;color:white;font-size:23px;text-align:left;">RoPro Rex Features</p>
								<p id="outfitSubtitle" style="margin-top:-2px;font-size:13px;width:350px;line-height:13px;" class="ng-binding nameAndSaveText">These advanced Trade Panel actions are available on RoPro Rex only.</p>
							</div>
							<div style="float:right;${hasRexTradePanel ? 'display:none;' : ''}">
							<a href="#" id="tradePanelUpgradeNow" style="width:180px;height:50px;color:white;" class="btn-growth-md btn-secondary-md">
								<p style="margin-top:3px;font-weight:bold;color:white;">Upgrade to Rex</p>
							</a>
							</div>
						</li>
							<li class="panel-button" style="display: block;margin:10px;position:relative;">
									<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="declineAllInboundLosses">
										<img class="ropro-trade-panel-loss-arrow-icon" src="${chrome.runtime.getURL('/images/down_arrow.png')}" style="width:20px;float:left;filter:${hasRexTradePanel ? 'contrast(0) sepia(400%) hue-rotate(190deg) brightness(1000%)' : 'brightness(0) invert(1)'};">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Decline All Inbound Losses</p>
								</a>
								<span style="position:absolute;top:-45px;left:535px;width:250px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline inbound trades in which you lose beyond a certain threshold. Losses are calculated automatically using real-time Rolimons.com item values.</span>
								</li>
							<li class="panel-button" style="display: block;margin:10px;position:relative;">
									<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="cancelAllOutboundLosses">
										<img class="ropro-trade-panel-loss-arrow-icon" src="${chrome.runtime.getURL('/images/down_arrow.png')}" style="width:20px;float:left;filter:${hasRexTradePanel ? 'contrast(0) sepia(100%) hue-rotate(190deg) brightness(1000%)' : 'brightness(0) invert(1)'};">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Cancel All Outbound Losses</p>
								</a>
								<span style="position:absolute;top:-45px;left:535px;width:250px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline outbound trades in which you lose beyond a certain threshold. Losses are calculated automatically using real-time Rolimons.com item values.</span>					</li>
							<li class="panel-button" style="display: block;margin:10px;position:relative">
								<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="declineInvalidInbounds">
									<img src="${chrome.runtime.getURL('/images/inbound_icon.png')}" style="width:20px;float:left;filter:contrast(0) sepia(100%) hue-rotate(190deg) brightness(1000%) ${hasRexTradePanel ? '' : 'invert(0.5)'};">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Decline Invalid Inbounds</p>
								</a>
								<span style="position:absolute;top:-35px;left:535px;width:250px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline inbound trades in which either you or the other player no longer have one of the items being offered (impossible trades).</span>
							</li>
							<li class="panel-button" style="display: block;margin:10px;position:relative;">
								<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="declineProjectedInbounds">
									<img src="${chrome.runtime.getURL('/images/inbound_icon.png')}" style="width:20px;float:left;filter:contrast(0) sepia(100%) hue-rotate(190deg) brightness(1000%) ${hasRexTradePanel ? '' : 'invert(0.5)'};">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Decline Projected Inbounds</p>
								</a>
								<span style="position:absolute;top:-17px;left:535px;width:250px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Decline inbound trades from which you would receive a projected item.</span>
							</li>
							<li class="panel-button" style="display: block;margin:10px;position:relative;">
								<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="filterTradesByItem">
									<img src="${chrome.runtime.getURL('/images/dominusicon.png')}" style="width:27px;float:left;margin-left:-3px;filter: ${hasRexTradePanel ? '' : 'invert(0.5)'};">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Filter Trades By Item</p>
								</a>
								<span style="position:absolute;top:-15px;left:535px;width:250px;background-color:black;padding:10px;border-radius:10px;display:none;" class="panel-button-info">Filter your inbound trades list by trades which contain a certain item.</span>
							</li>
							<li class="panel-button" style="display: block;margin:10px;display:none;position:relative;">
								<a style="width:100%;color:white;background-color:#${hasRexTradePanel ? '0077CC' : 'D8D8D8'};${hasRexTradePanel ? '' : 'cursor:not-allowed;'}" class="btn-growth-md btn-secondary-md ropro-trade-panel-plus-feature${hasRexTradePanel ? '' : ' ropro-trade-panel-plus-feature-locked'}" id="upgrade-now-button">
									<img src="${chrome.runtime.getURL('/images/chart_icon.svg')}" style="width:27px;float:left;filter:contrast(0) sepia(100%) hue-rotate(190deg) brightness(1000%) ${hasRexTradePanel ? '' : 'invert(0.5)'};margin:-3px;">
									<p class="ropro-trade-panel-plus-feature-label" style="font-weight:bold;color:${hasRexTradePanel ? 'white' : '#939393'};">Calculate Daily Profit</p>
								</a>
							</li>
				</div>
			</div>
		</div>
	</div>`
	tradePanelDiv = document.createElement('div')
	tradePanelDiv.innerHTML = tradePanelHTML
	document.body.appendChild(tradePanelDiv)
	var tradePanelModal = document.getElementById('tradePanelModal')
	if (tradePanelModal != null) {
		tradePanelModal.addEventListener('click', handleTradePanelBackdropClick)
		var tradePanelCloseButton = tradePanelModal.getElementsByClassName('upgrade-modal-close')[0]
		if (tradePanelCloseButton != null) {
			tradePanelCloseButton.addEventListener('click', function(e) {
				e.preventDefault()
				closeTradePanelModal()
			})
		}
		var tradePanelUpgradeNow = document.getElementById('tradePanelUpgradeNow')
		if (tradePanelUpgradeNow != null) {
			tradePanelUpgradeNow.addEventListener('click', function(e) {
				e.preventDefault()
				openMoreTradePanelUpgradeModal()
			})
		}
	}
	$("#declineAllInbounds").click(function() {
		secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:275px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
		<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
		<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline All Inbounds?</h3></li>
		<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
		<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
		</div>`
		div = document.createElement('div')
		div.innerHTML = secondaryHTML
		secondary = div.firstChild
		openSecondary(secondary)
		$("#secondaryCancel").click(function(){
			closeSecondary()
		})
		$("#secondaryContinue").click(function(){
			$("#secondaryContinue").get(0).style.display = "none"
			$("#secondaryCancel").get(0).style.display = "none"
			$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining All Inbounds...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
			$("#secondaryBody").get(0).style.display = "block"
			declineAllInbounds($("#secondaryInfo").get(0))
		})
	})
	$("#cancelAllOutbounds").click(function() {
		secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:275px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
		<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
		<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Cancel All Outbounds?</h3></li>
		<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
		<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
		</div>`
		div = document.createElement('div')
		div.innerHTML = secondaryHTML
		secondary = div.firstChild
		openSecondary(secondary)
		$("#secondaryCancel").click(function(){
			closeSecondary()
		})
		$("#secondaryContinue").click(function(){
			$("#secondaryContinue").get(0).style.display = "none"
			$("#secondaryCancel").get(0).style.display = "none"
			$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Cancelling all outbounds...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
			$("#secondaryBody").get(0).style.display = "block"
			cancelAllOutbounds($("#secondaryInfo").get(0))
		})
	})
	$("#declineFlaggedTradeBotters").click(function() {
		secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:275px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
		<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
		<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Users You've Flagged as Trade Botters?</h3></li>
		<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
		<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
		</div>`
		div = document.createElement('div')
		div.innerHTML = secondaryHTML
		secondary = div.firstChild
		openSecondary(secondary)
		$("#secondaryCancel").click(function(){
			closeSecondary()
		})
		$("#secondaryContinue").click(function(){
			$("#secondaryContinue").get(0).style.display = "none"
			$("#secondaryCancel").get(0).style.display = "none"
			$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Users You've Flagged...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
			$("#secondaryBody").get(0).style.display = "block"
			declineFlaggedTradeBotters($("#secondaryInfo").get(0))
		})
	})
	$("#declineSuspectedTradeBotters").click(function() {
					secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:430px;left:2000px;top:calc(50% - 215px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
		<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
		<div style="position:absolute;top:110px;width:550px;height:340px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Suspected Trade Botters?</h3></li>
		<div style="margin-left:140px;height:150px;"><p>Decline Traders Who Are:</p>
		<div id="susDropdown" style="overflow:visible;margin-top:-5px;margin-left:0px;float:left;width:150px;margin-left:25px;" class="input-group-btn">
		<button type="button" style="border-radius:0px;border:none;" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
		<span id="genreLabel" class="rbx-selection-label sus-selection ng-binding" style="width:110px;overflow:hidden;" ng-bind="layout.selectedTab.label">Kinda Sus</span> 
		<span class="icon-down-16x16"></span></button>
		<ul style="max-height:160px;overflow-y:auto;width:140px;" id="genreOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu"> 
		<li>
		<a genre="A Bit Sus" class="susChoice">
			<span ng-bind="tab.label" class="ng-binding">A Bit Sus</span>
		</a></li><li>
		<a genre="Kinda Sus" class="susChoice">
			<span ng-bind="tab.label" class="ng-binding">Kinda Sus</span>
		</a></li><li>
		<a genre="Pretty Sus" class="susChoice">
			<span ng-bind="tab.label" class="ng-binding">Pretty Sus</span>
		</a></li><li>
		<a genre="Mad Sus" class="susChoice">
			<span ng-bind="tab.label" class="ng-binding">Mad Sus</span>
		</a></li></ul></div></div>
		<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
		<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
		</div>`
		div = document.createElement('div')
		div.innerHTML = secondaryHTML
		secondary = div.firstChild
		openSecondary(secondary)
		$(".susChoice").click(function(){
			$(".sus-selection").get(0).textContent = stripTags(this.getAttribute("genre"))
		})
		$("#secondaryCancel").click(function(){
			closeSecondary()
		})
		$("#secondaryContinue").click(function(){
			$("#susDropdown").get(0).parentNode.style.display = "none"
			$("#secondaryContinue").get(0).style.display = "none"
			$("#secondaryCancel").get(0).style.display = "none"
			$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Suspected Trade Bots...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p><br>`
			$("#secondaryBody").get(0).style.display = "block"
			declineSuspectedTradeBotters($("#secondaryInfo").get(0))
		})
	})
	$("#declineOldTrades").click(function() {
		secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:470px;left:2000px;top:calc(50% - 235px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
		<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
		<div style="position:absolute;top:110px;width:550px;height:380px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Old Trades?</h3></li>
		<div style="margin-left:145px;height:145px;"><div id="minimumAgeDiv"><p style="margin-left:40px;">Minimum Trade Age:</p>
		<div style="float:left;width:350px;margin-left:0px;margin-top:-2px;">
		<input id="lossPercentage" oninput="this.nextElementSibling.childNodes[0].value = (this.value <= 24 ? this.value : Math.round(this.value / 24)) + (this.value <= 24 ? ' hour' + (this.value == 1 ? '' : 's') + ' old': ' day' + (Math.round(this.value / 24) == 1 ? '' : 's') + ' old')" value="24" max="108" min="0" type="range" style="float: left; width: 150px; height: 30px; margin-top: 2px;" step="1">
		<div style="margin-top:5px;"><output style="margin-left:10px;font-size:14px;height:30px;">24 hours old</output></div>
		</div></div>
		<div id="susDropdown" style="overflow:visible;margin-top:5px;margin-left:0px;float:left;width:167px;margin-left:25px;" class="input-group-btn">
		<button type="button" style="border-radius:0px;border:none;" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
		<p style="margin-left:30px;">Trade Type:</p>
		<span id="genreLabel" class="rbx-selection-label trade-selection ng-binding" style="width:110px;overflow:hidden;text-align:center;margin-left:17px;" ng-bind="layout.selectedTab.label">Inbound</span> 
		<span class="icon-down-16x16"></span></button>
		<ul style="max-height:140px;overflow-y:auto;width:200px;" id="genreOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu">
		<li><a genre="Inbound" class="tradeChoice">
			<span ng-bind="tab.label" class="ng-binding">Inbound Trades</span>
		</a></li>
		<li><a genre="Outbound" class="tradeChoice">
			<span ng-bind="tab.label" class="ng-binding">Outbound Trades</span>
		</a></li>
		</ul>
		</div>
		</div>
		<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
		<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
		</div>`
		div = document.createElement('div')
		div.innerHTML = secondaryHTML
		secondary = div.firstChild
		openSecondary(secondary)
		$(".tradeChoice").click(function(){
			$(".trade-selection").get(0).textContent = stripTags(this.getAttribute("genre"))
		})
		$("#secondaryCancel").click(function(){
			closeSecondary()
		})
		$("#secondaryContinue").click(function(){
			$("#minimumAgeDiv").get(0).parentNode.style.display = "none"
			$("#secondaryContinue").get(0).style.display = "none"
			$("#secondaryCancel").get(0).style.display = "none"
			$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Old Trades...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
			$("#secondaryBody").get(0).style.display = "block"
			declineOldTrades($("#secondaryInfo").get(0), parseInt($("#lossPercentage").get(0).value), $("#genreLabel").get(0).innerHTML)
		})
	})
	$("#declineAllInboundLosses").click(async function() {
		var moreTradePanelGate = await refreshMoreTradePanelGateState()
		if (isTradeVisualGateAllowed(moreTradePanelGate)) {
				secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:390px;left:2000px;top:calc(50% - 180px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
			<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
			<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Inbound Losses?</h3></li>
			<div style="margin-left:145px;height:50px;"><div id="minimumLossDiv"><p>Minimum Value Loss Percentage:</p>
			<div style="float:left;width:350px;margin-left:0px;margin-top:-2px;">

			<input id="lossPercentage" oninput="this.nextElementSibling.childNodes[0].value = this.value + '% Value Loss' + (this.value == 0 ? ' (Equal)' : '')" value="10" max="100" min="0" type="range" style="float: left; width: 150px; height: 30px; margin-top: 2px;" step="5">

			<div style="margin-top:5px;"><output style="margin-left:10px;font-size:14px;height:30px;">10% Value Loss</output></div>
			</div></div></div>
			<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
			<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
			</div>`
			div = document.createElement('div')
			div.innerHTML = secondaryHTML
			secondary = div.firstChild
			openSecondary(secondary)
			$("#secondaryCancel").click(function(){
				closeSecondary()
			})
			$("#secondaryContinue").click(function(){
				$("#minimumLossDiv").get(0).parentNode.style.display = "none"
				$("#secondaryContinue").get(0).style.display = "none"
				$("#secondaryCancel").get(0).style.display = "none"
				$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Inbound Losses...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
				$("#secondaryBody").get(0).style.display = "block"
				declineAllInboundLosses($("#secondaryInfo").get(0), parseInt($("#lossPercentage").get(0).value))
			})
		} else if (isTradeVisualGateUpsellEligible(moreTradePanelGate)) {
			openMoreTradePanelUpgradeModal()
		} else {
			showTradeVisualGateIssue(moreTradePanelGate)
		}
	})
	$("#cancelAllOutboundLosses").click(async function() {
		var moreTradePanelGate = await refreshMoreTradePanelGateState()
		if (isTradeVisualGateAllowed(moreTradePanelGate)) {
			secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:325px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
			<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
			<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Cancel Outbound Losses?</h3></li>
			<div style="margin-left:145px;height:50px;"><div id="minimumLossDiv"><p>Minimum Value Loss Percentage:</p>
			<div style="float:left;width:350px;margin-left:0px;margin-top:-2px;">

			<input id="lossPercentage" oninput="this.nextElementSibling.childNodes[0].value = this.value + '% Value Loss' + (this.value == 0 ? ' (Equal)' : '')" value="10" max="100" min="0" type="range" style="float: left; width: 150px; height: 30px; margin-top: 2px;" step="5">
			<div style="margin-top:5px;"><output style="margin-left:10px;font-size:14px;height:30px;">10% Value Loss</output></div>
			</div></div></div>
			<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
			<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
			</div>`
			div = document.createElement('div')
			div.innerHTML = secondaryHTML
			secondary = div.firstChild
			openSecondary(secondary)
			$("#secondaryCancel").click(function(){
				closeSecondary()
			})
			$("#secondaryContinue").click(function(){
				$("#minimumLossDiv").get(0).parentNode.style.display = "none"
				$("#secondaryContinue").get(0).style.display = "none"
				$("#secondaryCancel").get(0).style.display = "none"
				$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Cancelling Outbound Losses...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
				$("#secondaryBody").get(0).style.display = "block"
				cancelAllOutboundLosses($("#secondaryInfo").get(0), parseInt($("#lossPercentage").get(0).value))
			})
		} else if (isTradeVisualGateUpsellEligible(moreTradePanelGate)) {
			openMoreTradePanelUpgradeModal()
		} else {
			showTradeVisualGateIssue(moreTradePanelGate)
		}
	})
	$("#declineInvalidInbounds").click(async function() {
		var moreTradePanelGate = await refreshMoreTradePanelGateState()
		if (isTradeVisualGateAllowed(moreTradePanelGate)) {
			secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:275px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
			<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
			<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Invalid Inbounds?</h3></li>
			<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
			<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
			</div>`
			div = document.createElement('div')
			div.innerHTML = secondaryHTML
			secondary = div.firstChild
			openSecondary(secondary)
			$("#secondaryCancel").click(function(){
				closeSecondary()
			})
			$("#secondaryContinue").click(function(){
				$("#secondaryContinue").get(0).style.display = "none"
				$("#secondaryCancel").get(0).style.display = "none"
				$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Invalid Inbounds...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p>`
				$("#secondaryBody").get(0).style.display = "block"
				declineInvalidInbounds($("#secondaryInfo").get(0))
			})
		} else if (isTradeVisualGateUpsellEligible(moreTradePanelGate)) {
			openMoreTradePanelUpgradeModal()
		} else {
			showTradeVisualGateIssue(moreTradePanelGate)
		}
	})
	$("#declineProjectedInbounds").click(async function() {
		var moreTradePanelGate = await refreshMoreTradePanelGateState()
		if (isTradeVisualGateAllowed(moreTradePanelGate)) {
			secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:325px;left:2000px;top:calc(50% - 150px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
			<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
			<div style="position:absolute;top:110px;width:550px;height:250px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Decline Projected Item Inbounds?</h3></li>
			<p style="margin-top:6px;text-align:center;font-size:13px;">Projected item inbound cancellation uses Rolimons values.</p>
			<li id="secondaryBody" style="display:none;margin:10px;margin-top:20px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
			<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#0077CC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryContinue"><p style="font-weight:bold;color:white;">Continue</p></a></li></div>
			</div>`
			div = document.createElement('div')
			div.innerHTML = secondaryHTML
			secondary = div.firstChild
			openSecondary(secondary)
			$("#secondaryCancel").click(function(){
				closeSecondary()
			})
			$("#secondaryContinue").click(function(){
				$("#secondaryContinue").get(0).style.display = "none"
				$("#secondaryCancel").get(0).style.display = "none"
				$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Declining Projected Item Inbounds...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p><br>`
				$("#secondaryBody").get(0).style.display = "block"
				declineProjectedInbounds($("#secondaryInfo").get(0))
			})
		} else if (isTradeVisualGateUpsellEligible(moreTradePanelGate)) {
			openMoreTradePanelUpgradeModal()
		} else {
			showTradeVisualGateIssue(moreTradePanelGate)
		}
	})
	$("#filterTradesByItem").click(async function() {
		var moreTradePanelGate = await refreshMoreTradePanelGateState()
		if (isTradeVisualGateAllowed(moreTradePanelGate)) {
			secondaryHTML = `<div style="background-color:#232527;position:absolute;width:600px;height:560px;left:2000px;top:calc(50% - 280px);" id="secondaryModal" class="dark-theme modal-content secondary-modal-content">
			<h2 style="padding-bottom:5px;border-bottom: 3px solid #FFFFFF;font-family:'HCo Gotham SSm', Arial, Helvetica, sans-serif;color:white;font-size:30px;position:absolute;top:25px;left:25px;width:550px;margin-top:10px;"><img style="width:119px;left:0px;margin-right:10px;margin-top:-20px;margin-left:35px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}"><p style="color:white;display:inline-block;font-size:31px;font-weight:650;">Trade Panel</p></h2><video style="pointer-events: none;position:absolute;top:-85px;right:-20px;width:250px;" src="https://ropro.io/dances/dance${(16 + Math.floor(Math.random() * 4))}.webm" autoplay="" loop="" muted=""></video>
				<div style="position:absolute;top:110px;width:550px;height:450px;left:25px;"><li style="display: block;margin:10px;text-align:center;"><h3 id="secondaryTitle">Filter Inbound Trades By Item?</h3></li>
				<div id="filterSearchSection" style="height:290px;display:flex;justify-content:center;">
			<div id="filterSearchBar" style="overflow:visible;margin:-5px auto 0 auto;float:none;width:340px;max-width:100%;position:relative;" class="input-group-btn">
			<div class="input-group"><div><input id="filterSearch" class="form-control input-field new-input-field" placeholder="Item Search" maxlength="120" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value=""></div><div class="input-group-btn"><button style="margin-left:9px;" class="input-addon-btn"><span class="icon-common-search-sm"></span></button></div></div>
			<ul id="itemSearchList" style="position:absolute;top:38px;z-index:1000;max-height:240px;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;width:100%;"></ul>
			<ul id="itemSearchSelection" style="position:absolute;top:48px;width:100%;"></ul>
			</div>
			</div>
			<li id="secondaryBody" style="display:none;margin:10px;margin-top:-60px;margin-left:auto;text-align:center;"><p style="font-weight:bold;color:white;"><img style="width:30px;margin-right:10px;margin-bottom:3px;" src="${chrome.runtime.getURL('/images/ropro_icon_animated.webp')}"><span id="secondaryInfo"></span></p></li>
					<li style="display: block;margin:10px;margin-top:20px;"><a style="width:240px;color:white;background-color:#393B3D;float:left;margin:10px;" class="btn-growth-md btn-secondary-md" id="secondaryCancel"><p style="font-weight:bold;color:white;">Back</p></a><a style="width:240px;color:white;background-color:#CCCCCC;float:right;margin:10px;" class="btn-growth-md btn-secondary-md" active=false id="secondaryContinue"><p style="font-weight:bold;color:gray;">Continue</p></a></li></div>
			</div>`
			div = document.createElement('div')
			div.innerHTML = secondaryHTML
			secondary = div.firstChild
			openSecondary(secondary)
			setTimeout(function() {
				document.getElementById('filterSearch').focus()
			}, 200)
			$("#secondaryCancel").click(function(){
				closeSecondary()
			})
			$("#filterSearch").on("keyup", function(event) {
				if (event.keyCode === 13) {
					if (document.getElementById('itemSearchList').children.length > 0) {
						document.getElementById('itemSearchList').children[0].click()
					} else if (document.getElementById('secondaryContinue').getAttribute('active') == 'true') {
						document.getElementById('secondaryContinue').click()
					} else if (document.getElementById('secondaryReload') != null) {
						document.getElementById('secondaryReload').click()
					}
				}
			});			  
				$("#filterSearch").on('input', async function(){
					var query = this.value
					if (query.trim() != '') {
						var items = normalizeTradeItemSearchResults(await fetchItemMiniSearch(query))
						if (this.value == query) {
							var list = document.getElementById('itemSearchList')
							list.innerHTML = ''
							var fallbackThumbnail = chrome.runtime.getURL('/images/empty.png')
							for (var j = 0; j < items.length; j++) {
								var itemId = parseInt(items[j].id)
								var itemName = stripTags(items[j].name)
								if (itemName.length == 0) {
									itemName = "Item #" + itemId
								}
								var itemThumbnailClass = "ropro-image-" + itemId
								var li = document.createElement('li')
								li.classList.add('item-search-element')
								li.style.backgroundColor = '#393B3D'
								li.style.borderBottom = '1px solid hsla(0,0%,100%,.1)'
								li.setAttribute('itemid', itemId)
								li.setAttribute('itemname', itemName)
								var row = document.createElement('div')
								row.setAttribute('style', 'z-index:1000;margin-top:0px;padding-left:8px;height:44px;position:relative;display:flex;align-items:center;')
								var rowBody = document.createElement('div')
								rowBody.setAttribute('style', 'margin-left:0px;display:flex;align-items:center;width:335px;text-align:left;overflow:hidden;white-space: nowrap;')
								var thumbnail = document.createElement('img')
								thumbnail.className = itemThumbnailClass
								thumbnail.setAttribute('style', 'width:36px;height:36px;margin-left:-2px;margin-right:8px;')
								thumbnail.src = fallbackThumbnail
								attachImageFallback(thumbnail, fallbackThumbnail)
								var itemNameSpan = document.createElement('span')
								itemNameSpan.setAttribute('style', 'color:white;font-size:16px;line-height:20px;')
								itemNameSpan.textContent = itemName
								rowBody.appendChild(thumbnail)
								rowBody.appendChild(itemNameSpan)
								row.appendChild(rowBody)
								li.appendChild(row)
								list.appendChild(li)
								setAssetThumbnail(itemId)
								li.addEventListener('click', function(){
									var itemName = this.getAttribute('itemname')
									var itemId = this.getAttribute('itemid')
									var selectedItemId = parseInt(itemId)
									var selectedItemName = stripTags(itemName)
									if (selectedItemName.length == 0) {
										selectedItemName = "Item #" + selectedItemId
									}
									var selectedThumbnailClass = "ropro-image-" + selectedItemId
									var selection_li = document.createElement('li')
									selection_li.setAttribute('itemid', selectedItemId)
									selection_li.setAttribute('itemname', selectedItemName)
									var selectedRow = document.createElement('div')
									selectedRow.setAttribute('style', 'border-radius:6px;padding-top:2px;background-color:#393B3D;margin-top:-3px;padding-left:8px;height:44px;position:relative;display:flex;align-items:center;')
									var selectedRowBody = document.createElement('div')
									selectedRowBody.setAttribute('style', 'margin-left:auto;margin-right:auto;display:flex;align-items:center;text-align:left;overflow:hidden;white-space: nowrap;')
									var selectedThumbnail = document.createElement('img')
									selectedThumbnail.className = selectedThumbnailClass
									selectedThumbnail.setAttribute('style', 'float:left;width:36px;height:36px;margin-left:-2px;margin-right:8px;')
									selectedThumbnail.src = fallbackThumbnail
									attachImageFallback(selectedThumbnail, fallbackThumbnail)
									var selectedNameSpan = document.createElement('span')
									selectedNameSpan.setAttribute('style', 'float:left;display:inline-block;height:36px;line-height:36px;width:268px;color:white;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')
									selectedNameSpan.textContent = selectedItemName
									var closeSelection = document.createElement('p')
									closeSelection.classList.add('close-selection')
									closeSelection.setAttribute('style', 'position:absolute;right:8px;top:4px;font-size:30px;line-height:28px;cursor:pointer;color:white;')
									closeSelection.textContent = 'x'
									selectedRowBody.appendChild(selectedThumbnail)
									selectedRowBody.appendChild(selectedNameSpan)
									selectedRow.appendChild(selectedRowBody)
									selectedRow.appendChild(closeSelection)
									selection_li.appendChild(selectedRow)
									document.getElementById('itemSearchSelection').innerHTML = ''
									document.getElementById('itemSearchSelection').appendChild(selection_li)
									setAssetThumbnail(selectedItemId)
									document.getElementById('itemSearchList').innerHTML = ''
									document.getElementById('filterSearch').value = ''
									document.getElementById('secondaryContinue').setAttribute('active', 'true')
									document.getElementById('secondaryContinue').style.backgroundColor = "#0077CC"
									document.getElementById('secondaryContinue').childNodes[0].style.color = "white"
								selection_li.getElementsByClassName('close-selection')[0].addEventListener('click', function(){
									document.getElementById('itemSearchSelection').innerHTML = ''
									document.getElementById('secondaryContinue').setAttribute('active', 'false')
									document.getElementById('secondaryContinue').style.backgroundColor = "#CCCCCC"
									document.getElementById('secondaryContinue').childNodes[0].style.color = "grey"
								})
							})
						}
					}
				} else {
					document.getElementById('itemSearchList').innerHTML = ''
				}
			})
				$("#secondaryContinue").click(function(){
					var selectedItem = document.getElementById('itemSearchSelection').childNodes[0]
					if (this.getAttribute('active') == "true" && selectedItem != null && selectedItem.getAttribute('itemid') != null) {
						document.getElementById('filterSearchBar').style.display = 'none'
						var itemid = parseInt(selectedItem.getAttribute('itemid'))
						var itemname = stripTags(selectedItem.getAttribute('itemname'))
					$("#secondaryContinue").get(0).style.display = "none"
					$("#secondaryCancel").get(0).style.display = "none"
					$("#secondaryTitle").get(0).parentNode.innerHTML = `<h3 id="secondaryTitle">Scanning Trades...</h3><p style="font-size:13px;" id="secondarySubtitle">Due to Roblox ratelimits, this may take several minutes. <br>Please do not refresh this page.</p><br>`
					$("#secondaryBody").get(0).style.display = "block"
					filterTradesByItem($("#secondaryInfo").get(0), {"id": itemid, "name": itemname})
				}
			})
		} else if (isTradeVisualGateUpsellEligible(moreTradePanelGate)) {
			openMoreTradePanelUpgradeModal()
		} else {
			showTradeVisualGateIssue(moreTradePanelGate)
		}
	})
}

var tradeValueCalculator = false;
var tradeDemandRatingCalculator = false;
var tradeItemValue = false;
var tradeItemDemand = false;
var itemInfoCard = false;
var tradePageProjectedWarning = false;
var embeddedRolimonsItemLink = false;
var quickDecline = false;
var quickCancel = false;
var underOverRAP = false;
var tradePanel = true;
var suspectedBotBadges = false;
var tradePanelVisualGateState = null;
var tradeSearchVisualGateState = null;
var moreTradePanelVisualGateState = null;

function ensureTradeHeaderClearfix(header) {
	if (header == null) {
		return
	}
	var shouldEnableClearfix = window.innerWidth <= 1200
	var clearfix = document.getElementById('roproTradeHeaderClearfix')
	if (clearfix != null && clearfix.parentNode !== header) {
		clearfix.remove()
		clearfix = null
	}
	if (!shouldEnableClearfix) {
		if (clearfix != null) {
			clearfix.remove()
		}
		return
	}
	if (clearfix == null) {
		clearfix = document.createElement('div')
		clearfix.id = 'roproTradeHeaderClearfix'
		clearfix.style.clear = 'right'
		clearfix.style.height = '0px'
		clearfix.style.lineHeight = '0'
		clearfix.style.display = 'block'
	}
	header.appendChild(clearfix)
}

function updateTradeHeaderLauncherSpacing(header, tabIdOverride) {
	var tradeHeader = header
	if (tradeHeader == null) {
		var headers = document.getElementsByClassName('trades-header')
		if (headers.length == 0) {
			return
		}
		tradeHeader = headers[0]
	}
	var currentTabId = getCurrentTradeTabId()
	if (typeof tabIdOverride === "string" && tabIdOverride.length > 0) {
		currentTabId = tabIdOverride
	}
	var shouldApplySpacing = currentTabId === "tab-Outbound" || currentTabId === "tab-Completed" || currentTabId === "tab-Inactive"
	tradeHeader.style.paddingBottom = shouldApplySpacing ? '8px' : '0px'
}

function alignTradeTabDropdownMenu(dropdownContainer) {
	if (dropdownContainer == null) {
		return
	}
	var dropdownButton = dropdownContainer.getElementsByClassName('input-dropdown-btn')[0]
	var dropdownMenu = dropdownContainer.getElementsByClassName('dropdown-menu')[0]
	if (dropdownButton == null || dropdownMenu == null) {
		return
	}
	var buttonHeight = Math.ceil(dropdownButton.getBoundingClientRect().height)
	if (!Number.isFinite(buttonHeight) || buttonHeight <= 0) {
		buttonHeight = dropdownButton.offsetHeight
	}
	if (!Number.isFinite(buttonHeight) || buttonHeight <= 0) {
		return
	}
	dropdownMenu.style.top = buttonHeight + 'px'
	dropdownMenu.style.marginTop = '0px'
	dropdownMenu.style.zIndex = '10005'
}

function ensureTradePanelTabButton() {
	var header = document.getElementsByClassName('trades-header')[0]
	if (header == null) {
		return false
	}
	var shouldLockPanelLaunch = !tradePanel && shouldShowTradePanelLaunchUpsell()
	if (!tradePanel && !shouldLockPanelLaunch) {
		return false
	}
	var dropdownContainer = header.getElementsByClassName('trade-list-dropdown')[0]
	if (dropdownContainer == null) {
		return false
	}
	ensureTradeHeaderClearfix(header)
	updateTradeHeaderLauncherSpacing(header)
	alignTradeTabDropdownMenu(dropdownContainer)
	var tradePanelButtonMode = shouldLockPanelLaunch ? "locked" : "enabled"
	var tradePanelButton = document.getElementById('roproTradePanelTabButton')
	if (tradePanelButton != null && tradePanelButton.parentNode !== dropdownContainer) {
		tradePanelButton.remove()
		tradePanelButton = null
	}
	if (tradePanelButton != null && tradePanelButton.getAttribute('data-ropro-mode') !== tradePanelButtonMode) {
		tradePanelButton.remove()
		tradePanelButton = null
	}
	if (tradePanelButton != null) {
		return true
	}
	tradePanelButton = document.createElement('div')
	tradePanelButton.id = 'roproTradePanelTabButton'
	tradePanelButton.classList.add('ropro-trade-panel-tab-button')
	tradePanelButton.setAttribute('data-ropro-mode', tradePanelButtonMode)
	tradePanelButton.style.display = 'block'
	tradePanelButton.style.width = '100%'
	tradePanelButton.style.marginTop = '8px'
	tradePanelButton.style.position = 'relative'
	tradePanelButton.style.overflow = 'visible'
	var panelButtonClass = shouldLockPanelLaunch ? "ropro-trade-panel-launch ropro-trade-panel-launch-locked" : "ropro-trade-panel-launch"
	var panelButtonTitle = shouldLockPanelLaunch ? ` title="RoPro Trade Panel is available on RoPro Plus and RoPro Rex." aria-disabled="true"` : ""
	var refreshButtonHTML = shouldLockPanelLaunch ? "" : `<a class="ropro-trade-refresh-launch" title="Refresh Trades" aria-label="Refresh Trades" style="position:absolute;left:-45px;top:50%;transform:translateY(-50%);width:33px;height:33px;border-radius:999px;background-color:#3B3E44;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,0.18) inset;"><img src="${chrome.runtime.getURL('/images/reload.png')}" style="width:18px;height:18px;display:block;filter:brightness(0) invert(1);"></a>`
	tradePanelButton.innerHTML = `<a class="${panelButtonClass}"${panelButtonTitle} style="cursor:pointer;padding:6px 10px;border-radius:6px;background-color:#0077CC;color:white;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:6px;"><img class="ropro-trade-panel-launch-icon" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="" aria-hidden="true"><span class="ropro-trade-panel-launch-label" style="font-size:13px;line-height:14px;color:inherit;">Trade Panel</span></a>${refreshButtonHTML}`
	dropdownContainer.appendChild(tradePanelButton)
	var refreshButton = tradePanelButton.getElementsByClassName('ropro-trade-refresh-launch')[0]
	if (refreshButton != null) {
		refreshButton.addEventListener('click', function(e) {
			e.preventDefault()
			refreshCurrentTradeTab()
		})
	}
	var panelButton = tradePanelButton.getElementsByClassName('ropro-trade-panel-launch')[0]
	if (panelButton != null) {
		panelButton.addEventListener('click', function(e) {
			e.preventDefault()
			if (shouldLockPanelLaunch) {
				openTradePanelLaunchUpgradeModal()
				return
			}
			addTradePanel()
		})
	}
	return true
}

function ensureTradePanelDropdownButton(header) {
	if (header == null) {
		return false
	}
	var shouldLockPanelLaunch = !tradePanel && shouldShowTradePanelLaunchUpsell()
	if (!tradePanel && !shouldLockPanelLaunch) {
		return false
	}
	ensureTradeHeaderClearfix(header)
	updateTradeHeaderLauncherSpacing(header)
	alignTradeTabDropdownMenu(header.getElementsByClassName('trade-list-dropdown')[0])
	if (header.getElementsByClassName('dropdown-menu').length == 0) {
		return false
	}
	var dropdownMenu = header.getElementsByClassName('dropdown-menu')[0]
	var refreshRows = header.getElementsByClassName('trade-refresh-button-row')
	if (refreshRows.length > 0 && !tradePanel) {
		refreshRows[0].remove()
	}
	if (header.getElementsByClassName('trade-refresh-button').length == 0 && tradePanel) {
		var refreshLi = document.createElement("li")
		refreshLi.classList.add('trade-refresh-button-row')
		refreshLi.setAttribute("style", "background-color:#3B3E44;color:white;")
		refreshLi.innerHTML = '<a> <h3 style="font-size:15px;text-left;margin-right:10%;padding:0px;" class="ng-binding trade-refresh-button"> Refresh Trades</h3> </a>'
		dropdownMenu.appendChild(refreshLi)
		refreshLi.addEventListener("click", function(){
			refreshCurrentTradeTab()
		})
	}
	var tradePanelButtonMode = shouldLockPanelLaunch ? "locked" : "enabled"
	var existingTradePanelRows = header.getElementsByClassName('trade-panel-button-row')
	if (
		existingTradePanelRows.length > 0 &&
		existingTradePanelRows[0].getAttribute('data-ropro-mode') !== tradePanelButtonMode
	) {
		existingTradePanelRows[0].remove()
	}
	if (header.getElementsByClassName('trade-panel-button').length == 0) {
		var li = document.createElement("li")
		li.classList.add('trade-panel-button-row')
		li.setAttribute('data-ropro-mode', tradePanelButtonMode)
		if (shouldLockPanelLaunch) {
			li.classList.add('ropro-trade-panel-dropdown-button-locked')
		} else {
			li.setAttribute("style", "background-color:#0077CC;color:white;")
		}
		var panelButtonLabelClass = shouldLockPanelLaunch
			? "ng-binding trade-panel-button ropro-trade-panel-dropdown-label ropro-trade-panel-dropdown-label-locked"
			: "ng-binding trade-panel-button ropro-trade-panel-dropdown-label"
		var panelButtonIconUrl = chrome.runtime.getURL('/images/ropro_icon_small.png')
		li.innerHTML = `<a> <h3 style="font-size:15px;text-left;margin-right:10%;padding:0px;" class="${panelButtonLabelClass}"><img class="ropro-trade-panel-dropdown-icon" src="${panelButtonIconUrl}" alt="" aria-hidden="true"> Trade Panel</h3> </a>`
		dropdownMenu.appendChild(li)
		li.addEventListener("click", function(e){
			if (shouldLockPanelLaunch) {
				e.preventDefault()
				openTradePanelLaunchUpgradeModal()
				return
			}
			addTradePanel()
		})
	}
	return true
}

function pageCheck() {
	headers = document.getElementsByClassName('trades-header')
	if (tradePanel && headers.length > 0) {
		bindTradeTabSpacingListeners()
		ensureTradeHeaderClearfix(headers[0])
		updateTradeHeaderLauncherSpacing(headers[0])
		alignTradeTabDropdownMenu(headers[0].getElementsByClassName('trade-list-dropdown')[0])
	}
	if (!tradePanel && shouldShowTradePanelLaunchUpsell() && headers.length > 0) {
		bindTradeTabSpacingListeners()
		ensureTradeHeaderClearfix(headers[0])
		updateTradeHeaderLauncherSpacing(headers[0])
		alignTradeTabDropdownMenu(headers[0].getElementsByClassName('trade-list-dropdown')[0])
	}
	if (headers.length > 0 && headers[0].getAttribute('headerchecked') != "true") {
		headers[0].setAttribute('headerchecked', 'true')
		function check() {
			if (headers.length > 0) {
				links = headers[0].getElementsByClassName('text-link text-secondary ng-binding')
				if (links.length > 0) {
					if (!ensureTradePanelTabButton()) {
						ensureTradePanelDropdownButton(headers[0])
					}
				}
			} else {
				setTimeout(check, 1000)
			}
		}
		if (tradePanel) {
			check()
		} else if (shouldShowTradePanelLaunchUpsell()) {
			check()
		}
	}
}

var thumbnailCache = {}
var thumbnailPendingRequests = {}
var thumbnailRetryCounts = {}
var maxThumbnailRetries = 2
var thumbnailFallbackUrl = chrome.runtime.getURL('/images/empty.png')
var thumbnailKnownFallbackToken = "5d30ea2e004abe68a2db3b0d19fff763/420/420/Hat/Png"

function extractThumbnailUrlFromResponse(value) {
	if (typeof value === "string") {
		return value
	}
	if (!value || typeof value !== "object") {
		return null
	}
	if (Array.isArray(value)) {
		for (var i = 0; i < value.length; i++) {
			var nestedUrl = extractThumbnailUrlFromResponse(value[i])
			if (typeof nestedUrl === "string") {
				return nestedUrl
			}
		}
		return null
	}
	if (typeof value.imageUrl === "string") {
		return value.imageUrl
	}
	if (typeof value.thumbnailUrl === "string") {
		return value.thumbnailUrl
	}
	if (typeof value.url === "string") {
		return value.url
	}
	if (Array.isArray(value.data) && value.data.length > 0) {
		return extractThumbnailUrlFromResponse(value.data[0])
	}
	return null
}

function normalizeAssetThumbnailUrl(value) {
	var rawUrl = extractThumbnailUrlFromResponse(value)
	if (typeof rawUrl !== "string") {
		return null
	}
	var url = stripTags(rawUrl).trim()
	if (url.length === 0 || url.toUpperCase() === "ERROR") {
		return null
	}
	if (url.indexOf("//") === 0) {
		url = "https:" + url
	}
	if (!/^https?:\/\//i.test(url)) {
		return null
	}
	if (url.indexOf(thumbnailKnownFallbackToken) !== -1) {
		return null
	}
	return url
}

function ensureTradeThumbLoader(thumbContainer) {
	if (thumbContainer == null || typeof thumbContainer.getElementsByClassName !== "function") {
		return null
	}
	thumbContainer.classList.add('ropro-trade-thumb-loader-host')
	var loader = thumbContainer.getElementsByClassName('ropro-trade-thumb-loader')[0]
	if (loader != null) {
		return loader
	}
	loader = document.createElement('div')
	loader.className = 'ropro-trade-thumb-loader'
	loader.innerHTML = buildRoProLoader({className: "ropro-trade-thumb-loader-inner"})
	thumbContainer.appendChild(loader)
	return loader
}

function setTradeThumbLoaderVisible(thumbContainer, visible) {
	if (thumbContainer == null || typeof thumbContainer.getElementsByClassName !== "function") {
		return
	}
	var loader = thumbContainer.getElementsByClassName('ropro-trade-thumb-loader')[0]
	if (loader == null) {
		if (!visible) {
			return
		}
		loader = ensureTradeThumbLoader(thumbContainer)
		if (loader == null) {
			return
		}
	}
	loader.style.display = visible ? "flex" : "none"
}

function shouldShowTradeThumbLoaderForImage(imageNode) {
	if (imageNode == null) {
		return false
	}
	var source = stripTags(String(imageNode.getAttribute('src') || imageNode.src || "")).trim()
	if (source.length === 0) {
		return true
	}
	if (source.indexOf('data:image/gif;base64,R0lGODlhAQABA') === 0) {
		return true
	}
	return imageNode.complete !== true
}

function bindTradeThumbLoaderForImage(imageNode) {
	if (imageNode == null || typeof imageNode.addEventListener !== "function") {
		return
	}
	if (imageNode.getAttribute('data-ropro-thumb-loader-bound') === "1") {
		return
	}
	imageNode.setAttribute('data-ropro-thumb-loader-bound', "1")
	imageNode.addEventListener('load', function() {
		syncTradeThumbLoaderForImage(this, false)
	})
	imageNode.addEventListener('error', function() {
		syncTradeThumbLoaderForImage(this, false)
	})
}

function syncTradeThumbLoaderForImage(imageNode, forceLoading) {
	if (imageNode == null || typeof imageNode.closest !== "function") {
		return
	}
	var thumbContainer = imageNode.closest('.item-card-thumb-container')
	if (thumbContainer == null) {
		return
	}
	bindTradeThumbLoaderForImage(imageNode)
	setTradeThumbLoaderVisible(thumbContainer, forceLoading === true || shouldShowTradeThumbLoaderForImage(imageNode))
}

function syncTradeThumbLoaderForItem(itemNode) {
	if (itemNode == null || typeof itemNode.getElementsByClassName !== "function") {
		return
	}
	var thumbContainers = itemNode.getElementsByClassName('item-card-thumb-container')
	for (var i = 0; i < thumbContainers.length; i++) {
		var images = thumbContainers[i].getElementsByTagName('img')
		var shouldShow = false
		for (var j = 0; j < images.length; j++) {
			bindTradeThumbLoaderForImage(images[j])
			if (shouldShowTradeThumbLoaderForImage(images[j])) {
				shouldShow = true
			}
		}
		setTradeThumbLoaderVisible(thumbContainers[i], shouldShow)
	}
}

function setTradeThumbLoaderForAssetId(assetId, forceLoading) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	$('.ropro-image-' + normalizedAssetId).each(function() {
		if (this == null || typeof this.closest !== "function" || this.closest('.item-card-thumb-container') == null) {
			return
		}
		syncTradeThumbLoaderForImage(this, forceLoading === true)
	})
}

function applyAssetThumbnail(id, url) {
	var normalizedId = parseInt(id)
	var normalizedUrl = normalizeAssetThumbnailUrl(url) || thumbnailFallbackUrl
	$('.ropro-image-' + normalizedId).each(function() {
		enforceTradeSearchThumbnailLayering(this)
		bindTradeThumbLoaderForImage(this)
		if (normalizedUrl !== thumbnailFallbackUrl) {
			syncTradeThumbLoaderForImage(this, true)
		}
		this.onerror = function() {
			this.onerror = null
			this.src = thumbnailFallbackUrl
			syncTradeThumbLoaderForImage(this, false)
		}
		this.src = normalizedUrl
		syncTradeThumbLoaderForImage(this, false)
	})
}

function enforceTradeSearchThumbnailLayering(node) {
	if (node == null || typeof node.closest !== "function") {
		return
	}
	var card = node.closest('.trade-item-card')
	if (card == null || typeof card.getElementsByClassName !== "function") {
		return
	}
	var thumbContainers = card.getElementsByClassName('item-card-thumb-container')
	for (var i = 0; i < thumbContainers.length; i++) {
		thumbContainers[i].style.position = "relative"
		var images = thumbContainers[i].getElementsByTagName('img')
		for (var j = 0; j < images.length; j++) {
			images[j].style.position = "relative"
		}
		var serialOverlays = thumbContainers[i].getElementsByClassName('limited-icon-container')
		for (var j = 0; j < serialOverlays.length; j++) {
			serialOverlays[j].style.zIndex = "6"
		}
	}
}

function getTradeItemAssetId(item) {
	if (item == null || typeof item.getElementsByClassName !== "function") {
		return null
	}
	var thumbnailContainers = item.getElementsByClassName('thumbnail-2d-container')
	for (var i = 0; i < thumbnailContainers.length; i++) {
		var thumbnailTargetId = parseInt(thumbnailContainers[i].getAttribute('thumbnail-target-id'))
		if (Number.isFinite(thumbnailTargetId) && thumbnailTargetId > 0) {
			return thumbnailTargetId
		}
	}
	var captions = item.getElementsByClassName('item-card-caption')
	if (captions.length === 0) {
		return null
	}
	var links = captions[0].getElementsByTagName('a')
	if (links.length === 0) {
		return null
	}
	var href = stripTags(String(links[0].getAttribute('href') || links[0].href || ""))
	var match = href.match(/\/catalog\/(\d+)/i)
	if (match == null) {
		return null
	}
	var assetId = parseInt(match[1])
	if (!Number.isFinite(assetId) || assetId <= 0) {
		return null
	}
	return assetId
}

function createTradeThumbRolimonsLink(assetId) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return null
	}
	var link = document.createElement('a')
	link.className = 'ropro-trade-thumb-rolimons-link'
	link.target = '_blank'
	link.rel = 'noopener noreferrer'
	link.href = `https://www.rolimons.com/item/${normalizedAssetId}`
	link.setAttribute('aria-label', "Open Rolimon's item page")
	link.title = "Open Rolimon's item page"
	link.setAttribute('data-ropro-trade-asset-id', `${normalizedAssetId}`)
	var logo = document.createElement('img')
	logo.src = chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')
	logo.alt = ''
	logo.setAttribute('aria-hidden', 'true')
	link.appendChild(logo)
	link.addEventListener('mousedown', function(event) {
		event.stopPropagation()
	})
	link.addEventListener('mouseup', function(event) {
		event.stopPropagation()
	})
	link.addEventListener('click', function(event) {
		event.stopPropagation()
	})
	link.addEventListener('keydown', function(event) {
		event.stopPropagation()
	})
	return link
}

function removeTradeNameRowRolimonsLinks(item) {
	if (item == null || typeof item.getElementsByClassName !== "function") {
		return
	}
	var links = item.getElementsByClassName('ropro-trade-thumb-rolimons-link')
	while (links.length > 0) {
		links[0].remove()
	}
	var wrappedNames = item.getElementsByClassName('ropro-trade-item-name-link-with-rolimons')
	while (wrappedNames.length > 0) {
		wrappedNames[0].classList.remove('ropro-trade-item-name-link-with-rolimons')
	}
}

function ensureTradeThumbnailRolimonsLink(item, assetId) {
	if (item == null || typeof item.getElementsByClassName !== "function") {
		return
	}
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	if (isUserTradePath()) {
		removeTradeNameRowRolimonsLinks(item)
		return
	}
	var captions = item.getElementsByClassName('item-card-caption')
	if (captions.length === 0) {
		return
	}
	var caption = captions[0]
	var nameContainers = caption.getElementsByClassName('item-card-name-link')
	var nameContainer = nameContainers.length > 0 ? nameContainers[0] : null
	if (nameContainer == null) {
		var captionLinks = caption.getElementsByTagName('a')
		if (captionLinks.length === 0) {
			return
		}
		nameContainer = captionLinks[0]
	}
	nameContainer.classList.add('ropro-trade-item-name-link-with-rolimons')
	var existingThumbContainers = item.getElementsByClassName('item-card-thumb-container')
	if (existingThumbContainers.length > 0) {
		var staleThumbLinks = existingThumbContainers[0].getElementsByClassName('ropro-trade-thumb-rolimons-link')
		while (staleThumbLinks.length > 0) {
			staleThumbLinks[0].remove()
		}
	}
	var link = nameContainer.getElementsByClassName('ropro-trade-thumb-rolimons-link')[0]
	if (link == null) {
		link = createTradeThumbRolimonsLink(normalizedAssetId)
		if (link == null) {
			return
		}
		nameContainer.appendChild(link)
	} else if (link.parentNode !== nameContainer) {
		nameContainer.appendChild(link)
	}
	link.href = `https://www.rolimons.com/item/${normalizedAssetId}`
	link.setAttribute('data-ropro-trade-asset-id', `${normalizedAssetId}`)
}

function ensureTradeRolimonsItemLinks() {
	var itemCards = document.getElementsByClassName('item-card-container')
	for (var i = 0; i < itemCards.length; i++) {
		var itemCardAssetId = getTradeItemAssetId(itemCards[i])
		if (itemCardAssetId == null) {
			continue
		}
		ensureTradeThumbnailRolimonsLink(itemCards[i], itemCardAssetId)
	}
	var tradeRequestItems = document.getElementsByClassName('trade-request-item')
	for (var j = 0; j < tradeRequestItems.length; j++) {
		var tradeRequestAssetId = getTradeItemAssetId(tradeRequestItems[j])
		if (tradeRequestAssetId == null) {
			continue
		}
		ensureTradeThumbnailRolimonsLink(tradeRequestItems[j], tradeRequestAssetId)
	}
}

function setAssetThumbnail(id) {
	if (id <= 0) {
		return Promise.resolve(thumbnailFallbackUrl)
	}
	var normalizedId = parseInt(id)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return Promise.resolve(thumbnailFallbackUrl)
	}
	if (normalizedId in thumbnailCache) {
		applyAssetThumbnail(normalizedId, thumbnailCache[normalizedId])
		return thumbnailCache[normalizedId]
	}
	if (normalizedId in thumbnailPendingRequests) {
		setTradeThumbLoaderForAssetId(normalizedId, true)
		return thumbnailPendingRequests[normalizedId]
	}
	setTradeThumbLoaderForAssetId(normalizedId, true)
	function requestThumbnailUrl() {
		return new Promise(resolve => {
			var settled = false
			var timeout = setTimeout(function() {
				if (settled) return
				settled = true
				resolve(null)
			}, 10000)
			var batchPayload = [{
				requestId: normalizedId + ":undefined:Asset:150x150:webp:regular:0",
				type: "Asset",
				targetId: String(normalizedId),
				size: "150x150",
				format: "webp"
			}]
			chrome.runtime.sendMessage({greeting: "PostValidatedURL", url: "https://thumbnails.roblox.com/v1/batch", jsonData: batchPayload}, function(data) {
				if (settled) return
				settled = true
				clearTimeout(timeout)
				resolve(data)
			})
		})
	}
	var pendingRequest = new Promise(async resolve => {
		var thumbnailUrl = normalizeAssetThumbnailUrl(await requestThumbnailUrl())
		for (var attempt = 0; thumbnailUrl == null && attempt < 2; attempt++) {
			if (attempt > 0) {
				await new Promise(function(waitResolve) { setTimeout(waitResolve, 200 * (attempt + 1)) })
			}
			thumbnailUrl = normalizeAssetThumbnailUrl(await requestThumbnailUrl())
		}
		if (thumbnailUrl != null) {
			thumbnailRetryCounts[normalizedId] = 0
			thumbnailCache[normalizedId] = thumbnailUrl
			applyAssetThumbnail(normalizedId, thumbnailUrl)
			resolve(thumbnailUrl)
			return
		}
		applyAssetThumbnail(normalizedId, thumbnailFallbackUrl)
		var retryCount = thumbnailRetryCounts[normalizedId] || 0
		if (retryCount < maxThumbnailRetries) {
			thumbnailRetryCounts[normalizedId] = retryCount + 1
			setTimeout(function() {
				if (!(normalizedId in thumbnailCache)) {
					setAssetThumbnail(normalizedId)
				}
			}, 1200 * (retryCount + 1))
		}
		resolve(thumbnailFallbackUrl)
	})
	thumbnailPendingRequests[normalizedId] = pendingRequest
	pendingRequest.finally(function() {
		delete thumbnailPendingRequests[normalizedId]
	})
	return pendingRequest
}

async function addItemToTrade(userAssetId, assetId, name, recentAveragePrice, serialNumber, assetStock, userId) {
	var normalizedAssetId = parseInt(assetId)
	var normalizedSerial = serialNumber == null ? null : parseInt(serialNumber)
	var sanitizedName = stripTags(String(name == null ? "" : name))
	var normalizedUserAssetId = normalizeTradeInstanceId(userAssetId)
	document.dispatchEvent(new CustomEvent('addItemToTrade', {detail: {userAssetId: normalizedUserAssetId, collectibleItemInstanceId: normalizedUserAssetId, assetId: normalizedAssetId, name: sanitizedName, itemName: sanitizedName, recentAveragePrice: recentAveragePrice, serialNumber: serialNumber, assetStock: assetStock, userId: userId, itemTarget: {itemType: "Asset", targetId: String(normalizedAssetId)}, layoutOptions: {isUnique: normalizedSerial != null && Number.isFinite(normalizedSerial), isLimitedNumberShown: normalizedSerial != null && Number.isFinite(normalizedSerial), limitedNumber: normalizedSerial}}}))
}

async function removeItemFromTrade(userAssetId) {
	document.dispatchEvent(new CustomEvent('removeItemFromTrade', {detail: {userAssetId: userAssetId}}))
}

async function checkInventoryCache() {
	if (tradeInventoryCacheWatcherStarted) {
		return
	}
	tradeInventoryCacheWatcherStarted = true
	setInterval(function() {
		for (var i = 0; i < 2; i++) {
			var panel = document.getElementsByClassName('trade-inventory-panel')[i]
			if (panel == null) {
				tradeInventory[i] = null
				tradeInventoryUsers[i] = null
				resetTradeSearchAcronymState(i)
				continue
			}
			var currentUserId = parseInt(panel.getAttribute('trade-user'))
			if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
				continue
			}
			if (tradeInventoryUsers[i] != null && tradeInventoryUsers[i] !== currentUserId) {
				tradeInventory[i] = null
				tradeInventoryUsers[i] = null
				resetTradeSearchAcronymState(i)
			}
		}
	}, 1000)
}

function getTradeOfferElement(self) {
	var offers = document.getElementsByClassName('trade-request-window-offer')
	if (offers == null || offers.length <= (self ? 0 : 1)) {
		return null
	}
	return offers[self ? 0 : 1]
}

function getTradeOfferItemCount(self) {
	var offer = getTradeOfferElement(self)
	if (offer == null) {
		return 0
	}
	var tradeItems = offer.getElementsByClassName('trade-request-item')
	var count = 0
	for (var i = 0; i < tradeItems.length; i++) {
		if (tradeItems[i].getElementsByClassName('thumbnail-2d-container').length > 0) {
			count += 1
		}
	}
	return count
}

function getTradeOfferSignature(self) {
	var offer = getTradeOfferElement(self)
	if (offer == null) {
		return ""
	}
	var tradeItems = offer.getElementsByClassName('trade-request-item')
	var signatureParts = []
	for (var i = 0; i < tradeItems.length; i++) {
		var thumbnailContainer = tradeItems[i].getElementsByClassName('thumbnail-2d-container')[0]
		if (thumbnailContainer == null) {
			continue
		}
		var itemId = normalizeTradeInstanceId(thumbnailContainer.getAttribute("thumbnail-target-id"))
		if (itemId.length === 0) {
			itemId = "slot-" + i
		}
		signatureParts.push(itemId)
	}
	return signatureParts.join("|")
}

function getKnownTradeOfferThumbnailUrl(assetId) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return null
	}
	if (Object.prototype.hasOwnProperty.call(tradeOfferKnownThumbnailByAssetId, String(normalizedAssetId))) {
		return sanitizeTradeSearchImageSrc(tradeOfferKnownThumbnailByAssetId[String(normalizedAssetId)], "")
	}
	return null
}

function rememberTradeOfferThumbnailForAssetId(assetId, thumbnailUrl) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	var normalizedUrl = sanitizeTradeSearchImageSrc(thumbnailUrl, "")
	if (normalizedUrl.length === 0 || normalizedUrl === thumbnailFallbackUrl) {
		return
	}
	tradeOfferKnownThumbnailByAssetId[String(normalizedAssetId)] = normalizedUrl
}

function rememberVisibleTradeOfferThumbnails() {
	var tradeItems = document.getElementsByClassName("trade-request-item")
	for (var i = 0; i < tradeItems.length; i++) {
		var assetId = getTradeItemAssetId(tradeItems[i])
		if (!Number.isFinite(parseInt(assetId)) || parseInt(assetId) <= 0) {
			continue
		}
		var thumbnailContainers = tradeItems[i].getElementsByClassName('thumbnail-2d-container')
		for (var containerIndex = 0; containerIndex < thumbnailContainers.length; containerIndex++) {
			var images = thumbnailContainers[containerIndex].getElementsByTagName('img')
			for (var imageIndex = 0; imageIndex < images.length; imageIndex++) {
				var src = getTradeSearchThumbnailUrlFromImage(images[imageIndex])
				if (src != null) {
					rememberTradeOfferThumbnailForAssetId(assetId, src)
					break
				}
			}
		}
	}
}

function refreshTradeOfferReusedCardThumbnail(item, normalizedTradeCardId) {
	var normalizedAssetId = parseInt(normalizedTradeCardId)
	if (item == null || !Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	var knownThumbnailUrl = getKnownTradeOfferThumbnailUrl(normalizedAssetId)
	var cachedThumbnailUrl = Object.prototype.hasOwnProperty.call(thumbnailCache, normalizedAssetId)
		? normalizeAssetThumbnailUrl(thumbnailCache[normalizedAssetId])
		: null
	var immediateThumbnailUrl = knownThumbnailUrl != null && knownThumbnailUrl.length > 0
		? knownThumbnailUrl
		: cachedThumbnailUrl
	var targetThumbnailUrl = immediateThumbnailUrl != null && immediateThumbnailUrl.length > 0
		? immediateThumbnailUrl
		: thumbnailFallbackUrl
	var thumbnailContainers = item.getElementsByClassName('thumbnail-2d-container')
	for (var i = 0; i < thumbnailContainers.length; i++) {
		thumbnailContainers[i].setAttribute('thumbnail-target-id', `${normalizedAssetId}`)
		var images = thumbnailContainers[i].getElementsByTagName('img')
		for (var imageIndex = 0; imageIndex < images.length; imageIndex++) {
			var image = images[imageIndex]
			var className = stripTags(String(image.className || ""))
			className = className.replace(/\bropro-image-\d+\b/g, "").trim()
			image.className = `${className} ropro-image-${normalizedAssetId}`.trim()
			image.removeAttribute('data-src')
			image.src = targetThumbnailUrl
			syncTradeThumbLoaderForImage(image, targetThumbnailUrl === thumbnailFallbackUrl)
		}
	}
	if (targetThumbnailUrl !== thumbnailFallbackUrl) {
		rememberTradeOfferThumbnailForAssetId(normalizedAssetId, targetThumbnailUrl)
	}
	setAssetThumbnail(normalizedAssetId)
}

function clearStaleTradeOfferFormattingForVisibleCards() {
	var tradeItems = document.getElementsByClassName("trade-request-item")
	for (var i = 0; i < tradeItems.length; i++) {
		var thumbnailContainer = tradeItems[i].getElementsByClassName('thumbnail-2d-container')[0]
		if (thumbnailContainer == null) {
			continue
		}
		clearStaleTradeOfferItemFormatting(tradeItems[i], getIdFromTradeCard(tradeItems[i]))
	}
}

async function runTradeWindowOfferRefresh() {
	if (tradeWindowOfferRefreshInFlight) {
		tradeWindowOfferRefreshPending = true
		return
	}
	tradeWindowOfferRefreshInFlight = true
	try {
		if (document.getElementsByClassName('trade-request-window-offers').length === 0) {
			return
		}
		if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
			await checkTradeWindowOffers()
		}
	} catch (error) {
		console.log(error)
	} finally {
		tradeWindowOfferRefreshInFlight = false
		if (tradeWindowOfferRefreshPending) {
			tradeWindowOfferRefreshPending = false
			scheduleTradeWindowOfferRefresh(0)
		}
	}
}

function scheduleTradeWindowOfferRefresh(delayMs) {
	if (tradeWindowOfferRefreshTimer != null) {
		clearTimeout(tradeWindowOfferRefreshTimer)
	}
	var normalizedDelayMs = parseInt(delayMs)
	if (!Number.isFinite(normalizedDelayMs) || normalizedDelayMs < 0) {
		normalizedDelayMs = 0
	}
	tradeWindowOfferRefreshTimer = setTimeout(function() {
		tradeWindowOfferRefreshTimer = null
		runTradeWindowOfferRefresh()
	}, normalizedDelayMs)
}

function disconnectTradeWindowOfferObserver() {
	if (tradeWindowOfferObserver != null && typeof tradeWindowOfferObserver.disconnect === "function") {
		tradeWindowOfferObserver.disconnect()
	}
	tradeWindowOfferObserver = null
	tradeWindowOfferObserverTarget = null
	if (tradeWindowOfferRefreshTimer != null) {
		clearTimeout(tradeWindowOfferRefreshTimer)
		tradeWindowOfferRefreshTimer = null
	}
	tradeWindowOfferRefreshPending = false
	tradeOfferKnownThumbnailByAssetId = {}
}

function ensureTradeWindowOfferObserver() {
	if (typeof MutationObserver === "undefined") {
		return
	}
	var offersContainer = document.getElementsByClassName('trade-request-window-offers')[0]
	if (offersContainer == null) {
		disconnectTradeWindowOfferObserver()
		return
	}
	if (tradeWindowOfferObserver != null && tradeWindowOfferObserverTarget === offersContainer) {
		return
	}
	disconnectTradeWindowOfferObserver()
	var observer = new MutationObserver(function(mutations) {
		var shouldProcess = false
		for (var i = 0; i < mutations.length; i++) {
			if (mutations[i].type === "childList" || mutations[i].type === "attributes") {
				shouldProcess = true
				break
			}
		}
		if (!shouldProcess) {
			return
		}
		clearStaleTradeOfferFormattingForVisibleCards()
		scheduleTradeWindowOfferRefresh(0)
	})
	observer.observe(offersContainer, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["thumbnail-target-id", "data-userassetid", "data-collectibleiteminstanceid"]
	})
	tradeWindowOfferObserver = observer
	tradeWindowOfferObserverTarget = offersContainer
}

function isTradeOfferFull(self) {
	return getTradeOfferItemCount(self) >= 4
}

function hasUnformattedTradeInventoryCards(panel) {
	if (panel == null) {
		return false
	}
	var itemCards = panel.getElementsByClassName('item-card-container')
	if (itemCards.length === 0) {
		return false
	}
	for (var i = 0; i < itemCards.length; i++) {
		if (itemCards[i].getAttribute('data-ropro-formatted') !== "1") {
			return true
		}
	}
	return false
}

function hasUnformattedTradeRequestCards() {
	var itemCards = document.getElementsByClassName('trade-request-item')
	if (itemCards.length === 0) {
		return false
	}
	for (var i = 0; i < itemCards.length; i++) {
		if (itemCards[i].getElementsByClassName('thumbnail-2d-container').length === 0) {
			continue
		}
		if (itemCards[i].getAttribute('data-ropro-formatted') !== "1") {
			return true
		}
	}
	return false
}

function normalizeTradeInstanceId(id) {
	if (id == null) {
		return ""
	}
	return stripTags(String(id)).trim().toLowerCase()
}

function isTradeSearchCardInOffer(userAssetId, self) {
	var normalizedUserAssetId = normalizeTradeInstanceId(userAssetId)
	if (normalizedUserAssetId.length === 0) {
		return false
	}
	var offer = getTradeOfferElement(self)
	if (offer == null) {
		return false
	}
	var tradeItems = offer.getElementsByClassName('trade-request-item')
	for (var i = 0; i < tradeItems.length; i++) {
		var itemUserAssetId = normalizeTradeInstanceId(tradeItems[i].getAttribute('data-collectibleiteminstanceid') || tradeItems[i].getAttribute('data-userassetid') || "")
		if (itemUserAssetId.length > 0 && itemUserAssetId === normalizedUserAssetId) {
			return true
		}
	}
	return false
}

function findInventoryCardContainerByUserAssetId(userAssetId, self) {
	var normalizedUserAssetId = normalizeTradeInstanceId(userAssetId)
	if (normalizedUserAssetId.length === 0) {
		return null
	}
	var panel = document.getElementsByClassName('trade-inventory-panel')[self ? 0 : 1]
	if (panel == null) {
		return null
	}
	var containers = panel.getElementsByClassName('item-card-container')
	for (var i = 0; i < containers.length; i++) {
		var candidate = normalizeTradeInstanceId(containers[i].getAttribute('data-collectibleiteminstanceid') || containers[i].getAttribute('data-userassetid') || "")
		if (candidate.length > 0 && candidate === normalizedUserAssetId) {
			return containers[i]
		}
	}
	return null
}

function cloneNativeTradeCardStateOverlay(userAssetId, self) {
	var sourceContainer = findInventoryCardContainerByUserAssetId(userAssetId, self)
	if (sourceContainer == null) {
		return null
	}
	var sourceThumb = sourceContainer.getElementsByClassName('item-card-thumb-container')[0]
	if (sourceThumb == null) {
		return null
	}
	var sourceOverlays = sourceThumb.getElementsByClassName('item-card-equipped')
	if (sourceOverlays.length === 0) {
		return null
	}
	return sourceOverlays[0].cloneNode(true)
}

function ensureTradeSearchHoldIndicator(overlay, onHold) {
	if (overlay == null) {
		return
	}
	var existingHoldIndicators = overlay.getElementsByClassName('item-card-holding')
	for (var i = existingHoldIndicators.length - 1; i >= 0; i--) {
		if (!onHold || i > 0) {
			existingHoldIndicators[i].remove()
		}
	}
	if (!onHold || overlay.getElementsByClassName('item-card-holding').length > 0) {
		return
	}
	var holdIndicator = document.createElement('div')
	holdIndicator.className = 'item-card-holding ng-scope'
	var holdIcon = document.createElement('div')
	holdIcon.className = 'icon-uiblox-pending'
	var holdLabel = document.createElement('div')
	holdLabel.className = 'item-card-holding-label font-header-2 ng-binding'
	holdLabel.innerText = 'Holding'
	holdIndicator.appendChild(holdIcon)
	holdIndicator.appendChild(holdLabel)
	overlay.appendChild(holdIndicator)
}

function setTradeSearchCardState(card, self) {
	if (card == null) {
		return
	}
	$(card).find('.item-card-equipped').remove()
	var cardContainer = card.getElementsByClassName('item-card-container')[0]
	var thumbContainer = card.getElementsByClassName('item-card-thumb-container')[0]
	if (cardContainer == null || thumbContainer == null) {
		return
	}
	var userAssetId = cardContainer.getAttribute('data-userassetid')
	var selected = isTradeSearchCardInOffer(userAssetId, self)
	var onHold = cardContainer.getAttribute('data-ropro-is-on-hold') === '1'
	var unavailable = !selected && (onHold || isTradeOfferFull(self))
	if (selected || unavailable) {
		cardContainer.classList.add('checked')
	} else {
		cardContainer.classList.remove('checked')
	}
	if (!selected && !unavailable) {
		return
	}
	var insertAnchor = null
	var overlays = thumbContainer.getElementsByClassName('limited-icon-container')
	for (var i = 0; i < overlays.length; i++) {
		if (overlays[i].getElementsByClassName('icon-shop-limited').length > 0) {
			insertAnchor = overlays[i]
			break
		}
	}
	if (insertAnchor == null) {
		var thumbnails = thumbContainer.getElementsByTagName('thumbnail-2d')
		if (thumbnails.length > 0) {
			insertAnchor = thumbnails[0]
		}
	}
	var overlay = cloneNativeTradeCardStateOverlay(userAssetId, self)
	if (overlay == null) {
		var div = document.createElement('div')
		div.innerHTML = `<div class="item-card-equipped ng-scope" data-ropro-trade-search-state="1"></div>`
		overlay = div.childNodes[0]
		div.remove()
	}
	overlay.setAttribute('data-ropro-trade-search-state', '1')
	ensureTradeSearchHoldIndicator(overlay, onHold && !selected)
	var checkIndicators = overlay.getElementsByClassName('icon-check-selection')
	for (var i = checkIndicators.length - 1; i >= 0; i--) {
		checkIndicators[i].remove()
	}
	if (selected) {
		var checkSpan = document.createElement('span')
		checkSpan.className = 'icon-check-selection ng-scope'
		overlay.appendChild(checkSpan)
	}
	// Keep unavailable/selected gray overlay above thumbnail layer while preserving native badge stacking.
	overlay.style.zIndex = "5"
	if (insertAnchor != null) {
		thumbContainer.insertBefore(overlay, insertAnchor)
	} else {
		thumbContainer.appendChild(overlay)
	}
}

function refreshTradeSearchCardStates(self) {
	var searchResults = document.getElementsByClassName('trade-search-result')
	for (var i = 0; i < searchResults.length; i++) {
		if (!searchResults[i].classList.contains(self ? 'self' : 'not-self')) {
			continue
		}
		var cards = searchResults[i].getElementsByClassName('trade-item-card')
		for (var j = 0; j < cards.length; j++) {
			setTradeSearchCardState(cards[j], self)
		}
	}
}

function getTradeSearchPrimarySerialOverlay(card) {
	if (card == null || typeof card.getElementsByClassName !== "function") {
		return null
	}
	var overlays = card.getElementsByClassName('limited-icon-container')
	for (var i = 0; i < overlays.length; i++) {
		if (overlays[i].getElementsByClassName('icon-shop-limited').length > 0) {
			return overlays[i]
		}
	}
	return null
}

function assignTradeSearchSerial(card, serialNumber) {
	var serialOverlay = getTradeSearchPrimarySerialOverlay(card)
	if (serialOverlay == null || serialNumber == null) {
		return
	}
	var normalizedSerial = parseInt(serialNumber)
	if (!Number.isFinite(normalizedSerial)) {
		return
	}
	var serialContainers = serialOverlay.getElementsByClassName('limited-number-container')
	for (var i = 0; i < serialContainers.length; i++) {
		serialContainers[i].classList.remove('ng-hide')
	}
	var serialNodes = serialOverlay.getElementsByClassName('limited-number')
	for (var i = 0; i < serialNodes.length; i++) {
		serialNodes[i].innerText = normalizedSerial
		serialNodes[i].classList.remove('ng-hide')
	}
	serialOverlay.setAttribute('uib-tooltip', '')
}

function getTradeSearchThumbnailUrlFromImage(image) {
	if (image == null) {
		return null
	}
	var src = stripTags(String(image.getAttribute('src') || image.src || "")).trim()
	var dataSrc = stripTags(String(image.getAttribute('data-src') || "")).trim()
	var candidates = [src, dataSrc]
	for (var i = 0; i < candidates.length; i++) {
		var candidate = candidates[i]
		if (candidate.length === 0) {
			continue
		}
		if (candidate.indexOf("//") === 0) {
			candidate = "https:" + candidate
		}
		if (candidate.indexOf(chrome.runtime.getURL('/images/empty.png')) !== -1 || candidate.indexOf('/images/empty.png') !== -1) {
			continue
		}
		if (candidate === thumbnailFallbackUrl) {
			continue
		}
		if (candidate.indexOf('data:image/gif;base64,R0lGODlhAQABA') === 0) {
			continue
		}
		if (/^https?:\/\//i.test(candidate) || candidate.indexOf('data:image/') === 0) {
			return candidate
		}
	}
	return null
}

function hydrateTradeSearchLazyThumbnail(image) {
	if (image == null) {
		return false
	}
	var src = stripTags(String(image.getAttribute('src') || image.src || "")).trim()
	var dataSrc = stripTags(String(image.getAttribute('data-src') || "")).trim()
	if (dataSrc.length === 0) {
		return false
	}
	var srcLooksPlaceholder = src.length === 0
		|| src.indexOf(chrome.runtime.getURL('/images/empty.png')) !== -1
		|| src.indexOf('/images/empty.png') !== -1
		|| src === thumbnailFallbackUrl
		|| src.indexOf('data:image/gif;base64,R0lGODlhAQABA') === 0
	if (!srcLooksPlaceholder) {
		return false
	}
	if (dataSrc.indexOf("//") === 0) {
		dataSrc = "https:" + dataSrc
	}
	if (!/^https?:\/\//i.test(dataSrc)) {
		return false
	}
	image.src = dataSrc
	return true
}

function sanitizeTradeSearchImageSrc(source, fallback) {
	var fallbackSrc = typeof fallback === "string" ? fallback : ""
	var candidate = stripTags(String(source == null ? "" : source)).trim()
	if (candidate.length === 0) {
		return fallbackSrc
	}
	if (candidate.indexOf("//") === 0) {
		candidate = "https:" + candidate
	}
	if (candidate.indexOf(chrome.runtime.getURL('/images/')) === 0) {
		return candidate
	}
	if (!/^https?:\/\//i.test(candidate)) {
		return fallbackSrc
	}
	return candidate
}

function attachImageFallback(imageNode, fallbackSrc) {
	if (imageNode == null || typeof imageNode.addEventListener !== "function") {
		return
	}
	imageNode.addEventListener('error', function onError() {
		if (imageNode.src === fallbackSrc) {
			return
		}
		imageNode.src = fallbackSrc
	}, {once: true})
}

function assignTradeSearchThumbnailClass(card, assetId) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return {image: null, needsFetch: false}
	}
	if (card == null || typeof card.getElementsByClassName !== "function") {
		return {image: null, needsFetch: false}
	}
	var thumbnailContainers = card.getElementsByClassName('thumbnail-2d-container')
	var primaryImage = null
	var renderableImage = null
	for (var i = 0; i < thumbnailContainers.length; i++) {
		thumbnailContainers[i].setAttribute('thumbnail-target-id', normalizedAssetId)
		var images = thumbnailContainers[i].getElementsByTagName('img')
		for (var j = 0; j < images.length; j++) {
			hydrateTradeSearchLazyThumbnail(images[j])
			var className = stripTags(String(images[j].className || ""))
			className = className.replace(/\bropro-image-\d+\b/g, "").trim()
			images[j].className = className
			if (primaryImage == null) {
				primaryImage = images[j]
			}
			if (renderableImage == null && getTradeSearchThumbnailUrlFromImage(images[j]) != null) {
				renderableImage = images[j]
			}
		}
	}
	var targetImage = renderableImage != null ? renderableImage : primaryImage
	var needsFetch = getTradeSearchThumbnailUrlFromImage(targetImage) == null
	if (targetImage != null && needsFetch) {
		targetImage.className = `${stripTags(String(targetImage.className || "")).trim()} ropro-image-${normalizedAssetId}`.trim()
	}
	return {image: targetImage, needsFetch: needsFetch}
}

function findTradeInventoryThumbnailUrlByAssetId(assetId, self) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return null
	}
	var panel = document.getElementsByClassName('trade-inventory-panel')[self ? 0 : 1]
	if (panel == null) {
		return null
	}
	var thumbnailContainers = panel.getElementsByClassName('thumbnail-2d-container')
	for (var i = 0; i < thumbnailContainers.length; i++) {
		var targetId = parseInt(thumbnailContainers[i].getAttribute('thumbnail-target-id'))
		if (!Number.isFinite(targetId) || targetId !== normalizedAssetId) {
			continue
		}
		var images = thumbnailContainers[i].getElementsByTagName('img')
		for (var j = 0; j < images.length; j++) {
			hydrateTradeSearchLazyThumbnail(images[j])
			var source = getTradeSearchThumbnailUrlFromImage(images[j])
			if (source != null) {
				return source
			}
		}
	}
	return null
}

function addItemCard(panel, item, self) {
	var userAssetKey = stripTags(String(item.userAssetId))
	var itemName = stripTags(String(item.name != null ? item.name : (item.itemName != null ? item.itemName : "")))
	var itemRap = item.recentAveragePrice
	var itemOnHold = item != null && item.isOnHold === true
	var normalizedAssetId = parseInt(item.assetId)
	var card = null
	var sourceContainer = findInventoryCardContainerByUserAssetId(userAssetKey, self)
	if (sourceContainer != null && sourceContainer.closest != null) {
		var sourceCard = sourceContainer.closest('.trade-item-card')
		if (sourceCard != null) {
			card = sourceCard.cloneNode(true)
		}
	}
	if (card == null) {
		var div = document.createElement('div')
		div.innerHTML = `<li class="list-item item-card trade-item-card ng-scope"> <div trade-item-card=""><div class="item-card-container" data-userassetid="" data-collectibleiteminstanceid=""> <div class="item-card-link"> <div class="item-card-thumb-container" ng-click="root.onItemCardClick(tradableItem)"> <span class="limited-icon-container ng-isolate-scope" uib-tooltip="Serial N/A" tooltip-placement="right" tooltip-append-to-body="true" limited-icon="" style="z-index:6;"> <span class="icon-shop-limited"> </span> <span class="limited-number-container ng-hide"> <span class="font-caption-header">#</span> <span class="font-caption-header text-subheader limited-number ng-hide"></span> </span></span> <thumbnail-2d><span class="thumbnail-2d-container" thumbnail-type="Asset" thumbnail-target-id="${normalizedAssetId}"><img class="ropro-image-${normalizedAssetId}" src="${chrome.runtime.getURL('/images/empty.png')}"></span> </thumbnail-2d> </div> </div> <div class="item-card-caption"><a target="_self" href="https://www.roblox.com/catalog/${normalizedAssetId}/Item"> <div class="item-card-name-link"> <div class="item-card-name ropro-item-name" title=""></div> </div> </a> <div class="text-overflow item-card-price"> <span class="icon-robux-16x16"></span> <span class="text-robux ropro-item-rap"></span> </div> </div> </div></div> </li>`
		card = div.childNodes[0]
		div.remove()
	}
	var cardContainer = card.getElementsByClassName('item-card-container')[0]
	if (cardContainer != null) {
		cardContainer.setAttribute('data-userassetid', userAssetKey)
		cardContainer.setAttribute('data-collectibleiteminstanceid', userAssetKey)
		cardContainer.setAttribute('data-ropro-is-on-hold', itemOnHold ? '1' : '0')
	}
	if (itemInfoCard) {
		var staleInfoButtons = card.getElementsByClassName('infocardbutton')
		while (staleInfoButtons.length > 0) {
			var staleInfoButton = staleInfoButtons[0]
			var staleWrapper = staleInfoButton.parentNode
			if (staleWrapper != null && staleWrapper.parentNode != null) {
				staleWrapper.parentNode.removeChild(staleWrapper)
			} else {
				staleInfoButton.remove()
			}
		}
		addInfoCard(card, normalizedAssetId)
	}
	var thumbnailBinding = assignTradeSearchThumbnailClass(card, normalizedAssetId)
	var primaryThumbnailImage = thumbnailBinding.image
	var needsThumbnailFetch = thumbnailBinding.needsFetch
	var cardLinks = card.getElementsByClassName('item-card-caption')[0].getElementsByTagName('a')
	if (cardLinks.length > 0) {
		cardLinks[0].href = `https://www.roblox.com/catalog/${normalizedAssetId}/Item`
		cardLinks[0].setAttribute('ng-href', `https://www.roblox.com/catalog/${normalizedAssetId}/Item`)
	}
	enforceTradeSearchThumbnailLayering(primaryThumbnailImage != null ? primaryThumbnailImage : card.getElementsByClassName('ropro-image-' + normalizedAssetId)[0])
	var itemNameNodes = card.getElementsByClassName('item-card-name')
	if (itemNameNodes.length > 0) {
		itemNameNodes[0].innerText = itemName
		itemNameNodes[0].setAttribute('title', itemName)
	}
	var rapNodes = card.getElementsByClassName('text-robux')
	if (rapNodes.length > 0) {
		rapNodes[0].innerText = itemRap == null ? 'N/A' : addCommas(itemRap)
	}
	assignTradeSearchSerial(card, item.serialNumber)
	ensureTradeThumbnailRolimonsLink(card, normalizedAssetId)
	panel.appendChild(card)
	var updateState = function() {
		refreshTradeSearchCardStates(self)
		setTimeout(function() {
			refreshTradeSearchCardStates(self)
		}, 50)
	}
	card.getElementsByClassName('item-card-thumb-container')[0].addEventListener('click', function() {
		if (isTradeSearchCardInOffer(item.userAssetId, self)) {
			removeItemFromTrade(item.userAssetId)
			updateState()
			return
		}
		if (itemOnHold) {
			updateState()
			return
		}
		if (isTradeOfferFull(self)) {
			updateState()
			return
		}
				addItemToTrade(item.userAssetId, item.assetId, itemName, itemRap, item.serialNumber, item.assetStock, parseInt(document.getElementsByClassName('trade-inventory-panel')[self ? 0 : 1].getAttribute('trade-user')))
				updateState()
			})
	setTradeSearchCardState(card, self)
	syncTradeThumbLoaderForItem(card)
	return needsThumbnailFetch
}

function getTradeSearchItemCardsContainer(panel, self) {
	var targetPanel = panel
	if (targetPanel == null || !targetPanel.classList || !targetPanel.classList.contains('trade-inventory-panel')) {
		targetPanel = document.getElementsByClassName('trade-inventory-panel')[self ? 0 : 1]
	}
	if (targetPanel == null) {
		return null
	}
	var itemCards = targetPanel.getElementsByClassName('item-cards-stackable')[0]
	if (itemCards == null || itemCards.parentNode == null) {
		return null
	}
	return itemCards.parentNode
}

function clearTradeSearchResults(panel, self) {
	var itemCards = getTradeSearchItemCardsContainer(panel, self)
	if (itemCards == null) {
		return
	}
	if (itemCards.parentNode != null) {
		var existingResults = itemCards.parentNode.getElementsByClassName('trade-search-result')
		for (var i = existingResults.length - 1; i >= 0; i--) {
			existingResults[i].remove()
		}
	}
	itemCards.style.display = "block"
}

async function displayTradeSearchResults(results, query, self, panel, options) {
	options = options || {}
	var includeAcronym = options.includeAcronym === true
	var itemCards = getTradeSearchItemCardsContainer(panel, self)
	if (itemCards == null) {
		return
	}
	itemCards.style.display = "none"
	if (itemCards.parentNode != null) {
		var existingResults = itemCards.parentNode.getElementsByClassName('trade-search-result')
		for (var i = existingResults.length - 1; i >= 0; i--) {
			existingResults[i].remove()
		}
	}
	var searchResult = document.createElement('div')
	searchResult.innerHTML = `<ul class="hlist item-cards item-cards-stackable">  </ul> ${buildRoProLoader({className: "ropro-trade-search-loading ropro-branded-loader-centered-section"})} <div class="col-xs-12 container-empty ng-hide">No items found for this search query.</div> <div class="pager-holder"><ul class="pager ng-hide"> <li class="pager-prev"> <button class="btn-generic-left-sm" disabled="disabled"> <span class="icon-left"></span> </button> </li> <li> <span class="page-number">Page 1</span> </li> <li class="pager-next"> <button class="btn-generic-right-sm"> <span class="icon-right"></span> </button> </li> </ul> </div>`
	searchResult.classList.add('trade-search-result')
	searchResult.classList.add(self ? 'self' : 'not-self')
	insertAfter(searchResult, itemCards)
	var spinner = searchResult.getElementsByClassName('ropro-trade-search-loading')[0]
	try {
		if (results == null) {
			results = []
			var inventory = await ensureTradeInventoryForSearch(self)
			var normalizedQuery = normalizeTradeSearchText(query)
			var allowAcronymMatch = includeAcronym && normalizedQuery.length >= 2
			var acronymMap = allowAcronymMatch ? await ensureTradeSearchAcronymCache(self, inventory) : {}
			for (var i = 0; i < inventory.length; i++) {
				if (doesTradeSearchItemMatch(inventory[i], normalizedQuery, acronymMap, allowAcronymMatch)) {
					results.push(inventory[i])
				}
			}
		}
		if (results.length > 0) {
			var thumbnailFetchIds = new Set()
			for (var i = 0; i < Math.min(results.length, 10); i++) {
				if (addItemCard(searchResult.getElementsByClassName('item-cards-stackable')[0], results[i], self)) {
					thumbnailFetchIds.add(results[i].assetId)
				}
			}
			refreshTradeSearchCardStates(self)
			if (results.length > 10) {
				searchResult.getElementsByClassName('pager')[0].classList.remove('ng-hide')
				var page = 0
				searchResult.getElementsByClassName('pager-next')[0].addEventListener('click', function() {
					if ((page + 1) * 10 >= results.length) return
					page += 1
					$(searchResult).find('.item-card').remove()
					searchResult.getElementsByClassName('page-number')[0].innerText = `Page ${parseInt(page + 1)}`
					if (results.length <= page * 10 + 10) {
						searchResult.getElementsByClassName('pager-next')[0].getElementsByTagName('button')[0].setAttribute('disabled', 'disabled')
					} else {
						searchResult.getElementsByClassName('pager-prev')[0].getElementsByTagName('button')[0].removeAttribute('disabled')
					}
					var pageFetchIds = new Set()
					for (var i = page * 10; i < Math.min(results.length, page * 10 + 10); i++) {
						if (addItemCard(searchResult.getElementsByClassName('item-cards-stackable')[0], results[i], self)) {
							pageFetchIds.add(results[i].assetId)
						}
					}
					var itemIds = Array.from(pageFetchIds)
					for (var i = 0; i < itemIds.length; i++) {
						setAssetThumbnail(itemIds[i])
					}
					refreshTradeSearchCardStates(self)
					if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
						checkTradeWindow()
					} else if (itemInfoCard) {
						checkTradeFree()
					}
				})
				searchResult.getElementsByClassName('pager-prev')[0].addEventListener('click', function() {
					if ((page - 1) * 10 < 0) return
					page -= 1
					$(searchResult).find('.item-card').remove()
					searchResult.getElementsByClassName('page-number')[0].innerText = `Page ${parseInt(page + 1)}`
					if (page * 10 - 10 < 0) {
						searchResult.getElementsByClassName('pager-prev')[0].getElementsByTagName('button')[0].setAttribute('disabled', 'disabled')
					} else {
						searchResult.getElementsByClassName('pager-next')[0].getElementsByTagName('button')[0].removeAttribute('disabled')
					}
					var pageFetchIds = new Set()
					for (var i = page * 10; i < Math.min(results.length, page * 10 + 10); i++) {
						if (addItemCard(searchResult.getElementsByClassName('item-cards-stackable')[0], results[i], self)) {
							pageFetchIds.add(results[i].assetId)
						}
					}
					var itemIds = Array.from(pageFetchIds)
					for (var i = 0; i < itemIds.length; i++) {
						setAssetThumbnail(itemIds[i])
					}
					refreshTradeSearchCardStates(self)
					if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
						checkTradeWindow()
					} else if (itemInfoCard) {
						checkTradeFree()
					}
				})
			}
			var itemIds = Array.from(thumbnailFetchIds)
			for (var i = 0; i < itemIds.length; i++) {
				setAssetThumbnail(itemIds[i])
			}
			refreshTradeSearchCardStates(self)
		} else {
			searchResult.getElementsByClassName('container-empty')[0].classList.remove('ng-hide')
		}
		if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
			checkTradeWindow()
		} else if (itemInfoCard) {
			checkTradeFree()
		}
	} finally {
		if (spinner != null && spinner.parentNode != null) {
			spinner.remove()
		}
	}
}

var valueCache = {}

async function addAdvancedTradeDropdown(searchBar, search, self, panel) {
	$('.ropro-advanced-trade-search-dropdown').remove()
	var div = document.createElement('div')
	div.innerHTML = `<div class="ropro-advanced-trade-search-dropdown" style="color:white;z-index:100;position:absolute;width:100%;max-height:300px;overflow-y:auto;background-color:#232527;border-bottom-right-radius:10px;border-bottom-left-radius:10px;">${buildRoProLoader({className: "ropro-advanced-trade-search-loading ropro-branded-loader-compact-section"})}</div>`
	var dropdown = div.childNodes[0]
	searchBar.appendChild(dropdown)
	div.remove()
	var spinner = searchBar.getElementsByClassName('ropro-advanced-trade-search-loading')[0]
	try {
		var normalizedSearch = normalizeTradeSearchText(search)
		if (normalizedSearch.length < 2) {
			return
		}
		var inventory = await ensureTradeInventoryForSearch(self)
		if (normalizedSearch != normalizeTradeSearchText(searchBar.getElementsByTagName('input')[0].value)) return
		var includeAcronymMatch = normalizedSearch.length >= 2
		var acronymMap = includeAcronymMatch ? await ensureTradeSearchAcronymCache(self, inventory) : {}
		if (normalizedSearch != normalizeTradeSearchText(searchBar.getElementsByTagName('input')[0].value)) return
		var items = {}
		for (var i = 0; i < inventory.length; i++) {
			if (!doesTradeSearchItemMatch(inventory[i], normalizedSearch, acronymMap, includeAcronymMatch)) continue
			if (inventory[i].assetId in items) {
				items[inventory[i].assetId].count += 1
			} else {
				items[inventory[i].assetId] = {id: inventory[i].assetId, name: inventory[i].name, rap: inventory[i].recentAveragePrice, value: null, count: 1}
			}
		}
		var assetIds = Object.keys(items)
		for (var i = 0; i < assetIds.length; i++) {
			if (assetIds[i] in valueCache) {
				items[assetIds[i]].value = valueCache[assetIds[i]]
				assetIds.splice(i, 1)
				i--
			}
		}
		if (assetIds.length > 0) {
			var itemsJSON = await fetchItems(assetIds)
			assetIds = Object.keys(itemsJSON)
			for (var i = 0; i < assetIds.length; i++) {
				var parsedValue = parseTradeSearchItemValue(itemsJSON[assetIds[i]], items[assetIds[i]].rap)
				items[assetIds[i]].value = parsedValue
				valueCache[assetIds[i]] = parsedValue
			}
		}
		assetIds = Object.keys(items)
		assetIds.sort(function(a, b) {
			return items[b].value - items[a].value
		})
		for (var i = 0; i < assetIds.length; i++) {
			var assetId = parseInt(assetIds[i])
			var immediateThumbnail = findTradeInventoryThumbnailUrlByAssetId(assetId, self)
			var fallbackThumbnail = chrome.runtime.getURL('/images/empty.png')
			var thumbnailSrc = sanitizeTradeSearchImageSrc(immediateThumbnail, fallbackThumbnail)
			var thumbnailClass = thumbnailSrc === fallbackThumbnail ? `ropro-image-${assetId}` : ""
			var div = document.createElement('div')
				div.innerHTML = `<div style="margin-bottom:1px;width:100%;height:50px;display:flex;align-items:center;${i == 0 ? '' : 'border-top:1px solid #393b3d;'}" class="ropro-advanced-dropdown-item"><img src="${thumbnailSrc}" style="flex:0 0 18%;max-width:56px;min-width:50px;" class="${thumbnailClass}"><div style="font-size:14px;flex:1;min-width:0;padding:0 8px;" class="item-card-name text-overflow"></div><div style="font-weight:bold;flex:0 0 auto;min-width:42px;text-align:right;font-size:10px;white-space:nowrap;">${kFormatter(parseInt(items[assetIds[i]].value))}</div><div style="flex:0 0 auto;margin-left:8px;margin-right:8px;"><div style="background-color:#32353D;padding:5px 7px;font-weight:bold;border-radius:20px;font-size:10px;line-height:1;white-space:nowrap;">x${parseInt(items[assetIds[i]].count)}</div></div></div>`
			div.getElementsByClassName('item-card-name')[0].innerText = items[assetIds[i]].name
			var item = div.childNodes[0]
			dropdown.appendChild(item)
			div.remove()
			if (thumbnailClass.length > 0) {
				setAssetThumbnail(assetId)
			}
			item.setAttribute('data-asset-id', assetId)
			item.addEventListener('click', function() {
				var assetId = parseInt(this.getAttribute('data-asset-id'))
				var results = []
				for (var i = 0; i < inventory.length; i++) {
					if (inventory[i].assetId == assetId) {
						results.push(inventory[i])
					}
				}
				displayTradeSearchResults(results, null, self, panel, {includeAcronym: true})
			})
		}
	} finally {
		if (spinner != null && spinner.parentNode != null) {
			spinner.remove()
		}
	}
}

async function handleTradeSearch(searchBar, self, panel) {
	var searchInput = searchBar.getElementsByClassName('trade-search-input')[0]
	var searchActionButton = searchBar.getElementsByClassName('ropro-trade-search-input-action')[0]
	function submitTradeSearchQuery() {
		var normalizedQuery = normalizeTradeSearchText(searchInput.value)
		displayTradeSearchResults(null, normalizedQuery, self, panel, {includeAcronym: advancedTradeSearchEnabled && normalizedQuery.length >= 2})
	}
	searchInput.focus()
	var advancedTradeSearchEnabled = await fetchSetting('advancedTradeSearch')
	var liveSearchTimeout = null
	if (advancedTradeSearchEnabled) {
		searchInput.addEventListener('focus', async function(e) {
			addAdvancedTradeDropdown(searchBar, normalizeTradeSearchText(this.value), self, panel)
		})
		searchBar.addEventListener('focusout', async function(e) {
			setTimeout(function() {
				$(searchBar).find('.ropro-advanced-trade-search-dropdown').remove()
			}, 250)
		})
		searchInput.addEventListener('input', async function(e) {
			var normalizedQuery = normalizeTradeSearchText(this.value)
			addAdvancedTradeDropdown(searchBar, normalizedQuery, self, panel)
			if (liveSearchTimeout != null) {
				clearTimeout(liveSearchTimeout)
			}
			if (normalizedQuery.length < 2) {
				clearTradeSearchResults(panel, self)
				return
			}
			liveSearchTimeout = setTimeout(function() {
				if (normalizeTradeSearchText(searchInput.value) !== normalizedQuery) {
					return
				}
				displayTradeSearchResults(null, normalizedQuery, self, panel, {includeAcronym: true})
			}, 140)
		})
		addAdvancedTradeDropdown(searchBar, "", self, panel)
	}
	searchInput.addEventListener('keypress', async function(e) {
		if (e.key == 'Enter') {
			e.preventDefault()
			submitTradeSearchQuery()
		}
	})
	if (searchActionButton != null) {
		searchActionButton.addEventListener('click', function(e) {
			e.preventDefault()
			submitTradeSearchQuery()
		})
	}
}

async function addTradeSearch(panel, self) {
	var dropdown = panel.getElementsByClassName('inventory-type-dropdown')[0]
	var div = document.createElement('div')
	div.innerHTML = `<div class="input-group-btn group-dropdown inventory-type-dropdown ropro-trade-search-button disabled" style="width:auto;margin-left:5px;"> <button type="button" class="input-dropdown-btn" style="padding:4px;">  <span class="icon-search" style="margin-top:0px;"></span> </button>  </div>`
	var button = div.childNodes[0]
	dropdown.classList.add('accessories-dropdown')
	dropdown.parentNode.insertBefore(button, dropdown)
	if (await fetchSetting('tradeSearch')) {
		button.classList.remove('disabled')
		button.addEventListener('click', function() {
			if (this.classList.contains('active')) {
				button.classList.remove('active')
				button.getElementsByClassName('icon-close')[0].classList.add('icon-search')
				button.getElementsByClassName('icon-close')[0].classList.remove('icon-close')
				var existingResults = panel.parentNode.getElementsByClassName('trade-search-result')
				for (var i = existingResults.length - 1; i >= 0; i--) {
					existingResults[i].remove()
				}
				panel.getElementsByClassName('trade-search-bar')[0].remove()
				panel.getElementsByClassName('item-cards-stackable')[0].parentNode.style.display = "block"
				panel.getElementsByClassName('accessories-dropdown')[0].style.display = "block"
			} else {
				button.classList.add('active')
				button.getElementsByClassName('icon-search')[0].classList.add('icon-close')
				button.getElementsByClassName('icon-search')[0].classList.remove('icon-search')
				this.parentNode.getElementsByClassName('accessories-dropdown')[0].style.display = "none"
				var div = document.createElement('div')
					div.innerHTML = `<div class="trade-search-bar input-group-btn group-dropdown inventory-type-dropdown"><div class="ropro-trade-search-input-wrap"><input class="trade-search-input form-control input-field new-input-field" placeholder="Search" maxlength="120" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="" style="background:none;"><button type="button" class="ropro-trade-search-input-action" aria-label="Search trade inventory" title="Search trade inventory"><span class="ropro-trade-search-input-glyph" aria-hidden="true"></span></button></div></div>`
					var search = div.childNodes[0]
				insertAfter(search, this)
				document.dispatchEvent(new CustomEvent('fetchTradeWindowUsers'));
				ensureTradeInventoryForSearch(self)
				handleTradeSearch(search, self, panel)
			}
		})
	} else {
		if (shouldShowTradeVisualGateLock(tradeSearchVisualGateState)) {
			button.classList.remove('disabled')
			button.classList.add('ropro-trade-search-button-locked')
		}
		button.addEventListener('click', function() {
			openTradeSearchUpgradeModal()
		})
	}
}

async function main() {
	if (location.href.includes("/trade")) {
		if (parent.location.hash == "#outbound") {
			document.getElementById('tab-Outbound').getElementsByTagName('a')[0].click()
			parent.location.hash = ""
		} else if (parent.location.hash == "#completed") {
			document.getElementById('tab-Completed').getElementsByTagName('a')[0].click()
			parent.location.hash = ""
		} else if (parent.location.hash == "#inactive") {
			document.getElementById('tab-Inactive').getElementsByTagName('a')[0].click()
			parent.location.hash = ""
		}
			try {
				document.getElementsByClassName('content')[0].style.marginBottom = "300px"
			} catch (e) {
				console.log(e)
			}
				prewarmTradeTradableInventoryForCurrentUser()
				var values = ["0", "0"]
				var offerSignatures = ["", ""]
			var settings = await Promise.all([
				fetchSetting("tradeValueCalculator"),
				fetchSetting("tradeDemandRatingCalculator"),
				fetchSetting("tradeItemValue"),
				fetchSetting("tradeItemDemand"),
				fetchSetting("tradePageProjectedWarning"),
				fetchSetting("embeddedRolimonsItemLink"),
				fetchSetting("embeddedRolimonsUserLink"),
				fetchSetting("itemInfoCard"),
				fetchSetting("hideSerials"),
				fetchSetting("quickDecline"),
				fetchSetting("quickCancel"),
				fetchSetting("tradePanel"),
				fetchSetting("underOverRAP"),
				fetchSetting("suspectedBotBadges"),
				fetchTradeVisualGateState("tradePanel"),
				fetchTradeVisualGateState("tradeSearch"),
				fetchTradeVisualGateState("moreTradePanel")
			])
		tradeValueCalculator = settings[0]
		tradeDemandRatingCalculator = settings[1]
		tradeItemValue = settings[2]
		tradeItemDemand = settings[3]
			tradePageProjectedWarning = settings[4]
			embeddedRolimonsItemLink = settings[5]
			embeddedRolimonsUserLink = settings[6]
			itemInfoCard = settings[7]
			hideSerials = settings[8]
			quickDecline = settings[9]
			quickCancel = settings[10]
			tradePanel = settings[11]
			underOverRAP = settings[12]
			suspectedBotBadges = settings[13]
			tradePanelVisualGateState = settings[14]
			tradeSearchVisualGateState = settings[15]
			moreTradePanelVisualGateState = settings[16]
		pageCheck()
		setInterval(function() {
			pageCheck()
		}, 1000)
		setInterval(function() {
			offerHeader = document.getElementsByClassName('trade-list-detail-offer-header')[0]
			if (offerHeader != undefined) {
				var detailOffers = document.getElementsByClassName('trade-list-detail-offer')
				var needsDetailFormatting = false
				for (var detailOfferIndex = 0; detailOfferIndex < detailOffers.length; detailOfferIndex++) {
					var detailCards = detailOffers[detailOfferIndex].getElementsByClassName('item-card-container')
					for (var detailCardIndex = 0; detailCardIndex < detailCards.length; detailCardIndex++) {
						if (detailCards[detailCardIndex].getAttribute("data-ropro-formatted") !== "1") {
							needsDetailFormatting = true
							break
						}
					}
					if (needsDetailFormatting) {
						break
					}
				}
				if (needsDetailFormatting) {
					if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
						checkTrade()
					} else if (itemInfoCard) {
						checkTradeFree()
					}
				}
			}
			tradeWindow = document.getElementsByClassName('trade-request-window')[0]
			if (tradeWindow != undefined) {
				inventoryPanel = document.getElementsByClassName('trade-inventory-panel')[0]
				if (inventoryPanel != undefined) {
					if (hasUnformattedTradeInventoryCards(inventoryPanel)) {
						if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
							checkTradeWindow()
						} else if (itemInfoCard) {
							checkTradeFree()
						}
					}
					if (inventoryPanel.getElementsByClassName('ropro-trade-search-button').length == 0) {
						addTradeSearch(inventoryPanel, true)
						checkInventoryCache()
					}
				}
				inventoryPanel = document.getElementsByClassName('trade-inventory-panel')[1]
				if (inventoryPanel != undefined) {
					if (hasUnformattedTradeInventoryCards(inventoryPanel)) {
						if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
							checkTradeWindow()
						} else if (itemInfoCard) {
							checkTradeFree()
						}
					}
					if (inventoryPanel.getElementsByClassName('ropro-trade-search-button').length == 0) {
						addTradeSearch(inventoryPanel, false)
					}
				}
			}
			tradeWindowOffers = document.getElementsByClassName('trade-request-window-offers')[0]
			if (tradeWindowOffers != undefined) {
				ensureTradeWindowOfferObserver()
				cardContainer = document.getElementsByClassName('trade-request-item')[0]
				if (cardContainer != undefined && hasUnformattedTradeRequestCards()) {
					if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
						scheduleTradeWindowOfferRefresh(0)
					}
				} else {
					if (cardContainer != undefined) {
						myRobux = stripTags(document.getElementsByClassName('trade-request-window-offer')[0].getElementsByClassName('robux-line-value')[0].innerHTML)
						theirRobux = stripTags(document.getElementsByClassName('trade-request-window-offer')[1].getElementsByClassName('robux-line-value')[0].innerHTML)
						var myOfferSignature = getTradeOfferSignature(true)
						var theirOfferSignature = getTradeOfferSignature(false)
						if (myRobux != values[0] || theirRobux != values[1] || myOfferSignature != offerSignatures[0] || theirOfferSignature != offerSignatures[1]) {
							values[0] = myRobux
							values[1] = theirRobux
							offerSignatures[0] = myOfferSignature
							offerSignatures[1] = theirOfferSignature
							if (tradeValueCalculator || tradeDemandRatingCalculator || tradeItemValue || tradeItemDemand) {
								scheduleTradeWindowOfferRefresh(0)
							}
						}
					}
				}
				refreshTradeSearchCardStates(true)
				refreshTradeSearchCardStates(false)
			} else {
				disconnectTradeWindowOfferObserver()
				values = ["0", "0"]
				offerSignatures = ["", ""]
			}
			if (tradePanel) {
				enforceTradeBotFacesForRows(document.getElementsByClassName('trade-row-details'))
				tradeTitle = $(".trades-header-nowrap .paired-name:not('.ng-hide'):not('.trade-flag-inserted')")
				for (var i = 0; i < tradeTitle.length; i++) {
					if (!tradeTitle.get(i).parentNode.parentNode.classList.contains('trade-request-window')) {
						function doFlag(tradeTitle) {
							setTimeout(function() {
								addTradeFlag(tradeTitle)
							}, firstLoad ? 1000 : 1)
						}
						doFlag(tradeTitle.get(i))
					}
				}
				$(".trade-row-container").click(function(){
					tradeFlagDiv = document.getElementsByClassName('trade-flag-div')
					if (tradeFlagDiv.length > 0) {
						tradeFlagDiv[0].remove()
					}
				})
				}
				if (hideSerials) {
					tradeTitle = $(".trades-header-nowrap .paired-name:not('.ng-hide'):not('.hide-button-inserted')")
					for (var i = 0; i < tradeTitle.length; i++) {
						if (!tradeTitle.get(i).parentNode.parentNode.classList.contains('trade-request-window')) {
							addHideButton(tradeTitle.get(i))
						}
					}
					$(".trade-row-container").click(function(){
						if ($('.light-theme').length > 0) {
							theme2 = "_lightmode"
						} else {
							theme2 = ""
						}
						hideButtonImage = $('.hide-button')
						if (hideButtonImage.length > 0) {
							hideButtonImage.get(0).src = chrome.runtime.getURL('/images/serials_on' + theme2 + '.png')
							hideButtonImage.get(0).parentNode.classList.add("inactive")
						}
					})
				}
				var visibleTradeRows = document.getElementsByClassName('trade-row-details')
				enforceTradeQuickActionButtonsForRows(visibleTradeRows)
				if (suspectedBotBadges) {
					queueTradeBotSuspectedTierFetchForRows(visibleTradeRows)
					processTradeBotSuspectedTierQueue()
					enforceTradeBotSuspectedBadgesForRows(visibleTradeRows)
				}
				tradeRowDetails = $(".trade-row-details:not(.rolimons-user-link-added)")
				if (tradeRowDetails.length > 0) {
					tradeRows = []
					for (var i = 0; i < tradeRowDetails.length; i++) {
						addTradeDetails(tradeRowDetails.get(i))
						tradeRows.push(tradeRowDetails.get(i))
					}
					addBatchTradeDetails(tradeRows)
					$(".trade-row-container:not('.click-detection')").click(function(){
						tradeTitle = $(".trades-header-nowrap .paired-name.trade-flag-inserted:not('.ng-hide')")
						for (var i = 0; i < tradeTitle.length; i++) {
							if (!tradeTitle.get(i).parentNode.parentNode.classList.contains('trade-request-window')) {
								tradeTitle.get(i).classList.remove("trade-flag-inserted")
							}
						}
					})
					$(".trade-row-container:not('.click-detection')").addClass("click-detection")
				}
				ensureTradeRolimonsItemLinks()
			}, 100)
		}
	var myForegroundOpacity = await getStorage('foregroundOpacity')
	if (typeof myForegroundOpacity != 'undefined') {
		foregroundOpacity = parseFloat(myForegroundOpacity)
	}
}

var checkCount = 0
var firstLoad = true

function getLocaleNormalizedTradePath() {
	var path = window.location.pathname || "/"
	var pathSplit = path.split("/")
	if (pathSplit.length < 3) {
		return path
	}
	var localeCandidate = pathSplit[1]
	if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(localeCandidate)) {
		return path
	}
	try {
		if (Intl.getCanonicalLocales(localeCandidate).length > 0) {
			return "/" + pathSplit.slice(2).join("/")
		}
	} catch (_) {}
	return path
}

function isUserTradePath() {
	var normalizedPath = getLocaleNormalizedTradePath().replace(/\/+$/, "")
	return /^\/users\/[^/]+\/trade$/.test(normalizedPath)
}

function isTradePageReady() {
	if (isUserTradePath()) {
		if (document.getElementsByClassName('trade-request-window').length > 0) {
			return true
		}
		if (document.getElementsByClassName('trade-request-window-offers').length > 0) {
			return true
		}
		return document.getElementsByClassName('trade-inventory-panel').length > 0
	}
	if (document.getElementById('tab-Inbound') == null) {
		return false
	}
	if (document.getElementById('trades-web-app') != null) {
		return true
	}
	if (document.getElementById('trades-container') != null) {
		return true
	}
	return document.getElementsByClassName('trades-container').length > 0
}

function checkLoad() {
	if (!location.href.includes("/trade")) {
		main()
		return
	}
	if (isTradePageReady() || checkCount > 120) {
		main()
	} else {
		checkCount++
		setTimeout(function(){
			checkLoad()
		}, 100)
	}
}
checkLoad()

function bindTradeTabFirstLoadListener(tabId) {
	var tab = document.getElementById(tabId)
	if (tab == null || tab.children == null || tab.children.length == 0) {
		return
	}
	var tabAnchor = tab.children[0]
	if (tabAnchor.getAttribute('data-ropro-tab-spacing-bound') === "1") {
		return
	}
	tabAnchor.setAttribute('data-ropro-tab-spacing-bound', "1")
	tabAnchor.addEventListener('click', function() {
		firstLoad = true
		updateTradeHeaderLauncherSpacing(null, tabId)
		setTimeout(function() {
			updateTradeHeaderLauncherSpacing()
		}, 0)
	})
}

function bindTradeTabSpacingListeners() {
	bindTradeTabFirstLoadListener('tab-Inbound')
	bindTradeTabFirstLoadListener('tab-Outbound')
	bindTradeTabFirstLoadListener('tab-Completed')
	bindTradeTabFirstLoadListener('tab-Inactive')
}

window.addEventListener('load', function() {
	bindTradeTabSpacingListeners()
})
