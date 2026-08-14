function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

function formatTime(timeDifference) {
	timeSince = Math.round(timeDifference) / 1000
	if (timeSince < 60) { //seconds
		period = Math.round(timeSince)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} second${suffix}`
	} else if (timeSince / 60 < 60) { //minutes
		period = Math.round(timeSince / 60)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} minute${suffix}`
	} else if (timeSince / 60 / 60 < 24) { //hours
		period = Math.round(timeSince / 60 / 60)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} hour${suffix}`
	} else if (timeSince / 60 / 60 / 24 < 30) { //days
		period = Math.round(timeSince / 60 / 60 / 24)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} day${suffix}`
	} else if (timeSince / 60 / 60 / 24 / 30 < 12) { //months
		period = Math.round(timeSince / 60 / 60 / 24 / 30)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} month${suffix}`
	} else { //years
		period = Math.round(timeSince / 60 / 60 / 24 / 30 / 12)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} year${suffix}`
	}
	return timeString
}

function parseTradeOfferItemId(id) {
	if (typeof id === "number") {
		if (Number.isFinite(id) && id > 0 && Math.floor(id) === id) {
			return id
		}
		return null
	}
	if (typeof id === "string") {
		var trimmed = id.trim()
		if (/^\d+$/.test(trimmed)) {
			var parsedNumeric = parseInt(trimmed)
			if (Number.isFinite(parsedNumeric) && parsedNumeric > 0) {
				return parsedNumeric
			}
			return null
		}
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
			return trimmed
		}
	}
	return null
}

function getTradeWindowOffersScope() {
	var tradeWindowOffers = document.getElementsByClassName('trade-request-window-offers')[0]
	if (tradeWindowOffers == null || typeof angular == "undefined" || typeof angular.element != "function") {
		return null
	}
	return angular.element(tradeWindowOffers).scope()
}

function getTradeOfferSlotCount(scope) {
	if (scope != null && typeof scope.getNumberOfSlots == "function") {
		var count = parseInt(scope.getNumberOfSlots())
		if (Number.isFinite(count) && count > 0) {
			return count
		}
	}
	return 4
}

function patchTradeOfferSlotUpdater() {
	var scope = getTradeWindowOffersScope()
	if (scope == null || typeof scope.updateSlots != "function") {
		return false
	}
	if (scope.__roproTradeSlotUpdaterPatched === true) {
		return true
	}
	var originalUpdateSlots = scope.updateSlots
	scope.updateSlots = function(offer) {
		if (offer == null || !Array.isArray(offer.items)) {
			return originalUpdateSlots.apply(this, arguments)
		}
		var slotCount = getTradeOfferSlotCount(this)
		var items = offer.items
		var existingSlots = Array.isArray(offer.slots) ? offer.slots : []
		var nextSlots = new Array(slotCount)
		for (var i = 0; i < slotCount; i++) {
			var slot = existingSlots[i]
			if (slot == null || typeof slot != "object") {
				slot = {}
			}
			var item = items[i]
			if (item != null) {
				slot.type = "item"
				slot.tradableItem = item
			} else if (i === 0 || items[i - 1] != null) {
				slot.type = "add-item"
				if (Object.prototype.hasOwnProperty.call(slot, "tradableItem")) {
					delete slot.tradableItem
				}
			} else {
				slot.type = "empty"
				if (Object.prototype.hasOwnProperty.call(slot, "tradableItem")) {
					delete slot.tradableItem
				}
			}
			nextSlots[i] = slot
		}
		offer.slots = nextSlots
	}
	scope.__roproTradeSlotUpdaterPatched = true
	return true
}

function startTradeOfferSlotUpdaterPatchWatcher() {
	var patchAttempts = 0
	var patchInterval = setInterval(function() {
		patchAttempts += 1
		if (patchTradeOfferSlotUpdater() || patchAttempts >= 40) {
			clearInterval(patchInterval)
		}
	}, 250)
}

startTradeOfferSlotUpdaterPatchWatcher()

document.addEventListener('fetchTradeRows', function(event) {
	elements = $(".trade-row:not(.trade-id)")
	for (var i = 0; i < elements.size(); i++) {
		tradeRow = elements.get(i)
		tradeInfo = angular.element(tradeRow).scope().trade
		tradeId = tradeInfo.id
		tradeRow.setAttribute('tradeid', parseInt(tradeId))
		tradeRow.setAttribute('username', stripTags(tradeInfo.user.name))
		tradeRow.classList.add('trade-id')
		tradeRow.classList.add(tradeId)
		if (event.detail.tradeTimeDisplay) {
			timeDifference = new Date().getTime() - new Date(tradeInfo.created).getTime()
			tradeRow.getElementsByClassName('trade-sent-date')[0].setAttribute("title", stripTags(tradeRow.getElementsByClassName('trade-sent-date')[0].innerText))
			tradeRow.getElementsByClassName('trade-sent-date')[0].innerText = formatTime(timeDifference)
		}
	}
})

document.addEventListener('replaceRows', function(event) {
	scrollContent = $('#trade-row-scroll-container').get(0).getElementsByClassName('simplebar-content')[0]
	document.getElementById('tab-Inbound').click()
	tradesDiv = document.getElementById('filteredTrades')
	if (tradesDiv != null) {
		trades = JSON.parse(decodeURI(tradesDiv.innerText))
		angular.element(scrollContent).scope().data.trades = trades
		angular.element(scrollContent).scope().selectTrade(angular.element(scrollContent).scope().data.trades[0])
		setTimeout(function() {
			angular.element(scrollContent).scope().data.trades.push(trades[trades.length - 1])
		}, 1000)
	}
})

document.addEventListener('fetchTradeWindowUsers', function(event) {
	patchTradeOfferSlotUpdater()
	var inventoryPanel = angular.element(document.getElementsByClassName('inventory-panel-holder')[0]).scope()
	document.getElementsByClassName('trade-inventory-panel')[inventoryPanel.data.offers[0].isMyOffer ? 0 : 1].setAttribute('trade-user', parseInt(inventoryPanel.data.offers[0].user.id))
	document.getElementsByClassName('trade-inventory-panel')[inventoryPanel.data.offers[1].isMyOffer ? 0 : 1].setAttribute('trade-user', parseInt(inventoryPanel.data.offers[1].user.id))
})

document.addEventListener('addItemToTrade', function(event) {
	patchTradeOfferSlotUpdater()
	var assetId = parseInt(event.detail.assetId)
	var recentAveragePrice = parseInt(event.detail.recentAveragePrice)
	var serialNumber = parseInt(event.detail.serialNumber)
	var assetStock = parseInt(event.detail.assetStock)
	var userId = parseInt(event.detail.userId)
	if (!Number.isFinite(assetId) || assetId <= 0) {
		return
	}
	if (!Number.isFinite(recentAveragePrice) || recentAveragePrice < 0) {
		recentAveragePrice = 0
	}
	if (!Number.isFinite(serialNumber)) {
		serialNumber = null
	}
	if (!Number.isFinite(assetStock)) {
		assetStock = null
	}
	if (!Number.isFinite(userId) || userId <= 0) {
		userId = null
	}
	var parsedOfferId = parseTradeOfferItemId(event.detail.collectibleItemInstanceId ?? event.detail.userAssetId)
	if (parsedOfferId == null) {
		return
	}
	var sanitizedName = stripTags(String(event.detail.itemName != null ? event.detail.itemName : (event.detail.name != null ? event.detail.name : "")))
	var defaultLayoutOptions = {
		isUnique: serialNumber != null,
		isLimitedNumberShown: serialNumber != null,
		limitedNumber: serialNumber
	}
	var layoutOptions =
		event.detail.layoutOptions && typeof event.detail.layoutOptions === "object"
			? Object.assign({}, defaultLayoutOptions, event.detail.layoutOptions)
			: defaultLayoutOptions
	var normalizedItemTarget =
		event.detail.itemTarget && typeof event.detail.itemTarget === "object"
			? Object.assign({}, event.detail.itemTarget)
			: {itemType: "Asset", targetId: String(assetId)}
	if (normalizedItemTarget.itemType == null) {
		normalizedItemTarget.itemType = "Asset"
	}
	normalizedItemTarget.targetId = String(
		normalizedItemTarget.targetId == null ? assetId : normalizedItemTarget.targetId
	)
	angular.element(document.getElementsByClassName('trade-request-window-offers')[0]).scope().addItemToOffer({
		"id": parsedOfferId,
		"userAssetId": parsedOfferId,
		"collectibleItemInstanceId": parsedOfferId,
		"assetId": assetId,
		"name": sanitizedName,
		"itemName": sanitizedName,
		"recentAveragePrice": recentAveragePrice,
		"serialNumber": serialNumber,
		"assetStock": assetStock,
		"userId": userId,
		"isOnHold": false,
		"itemTarget": normalizedItemTarget,
		"layoutOptions": layoutOptions
	})
	angular.element(document.getElementsByClassName('trade-request-window-offers')[0]).scope().$apply()
})

document.addEventListener('removeItemFromTrade', function(event) {
	patchTradeOfferSlotUpdater()
	var parsedOfferId = parseTradeOfferItemId(event.detail.userAssetId)
	if (parsedOfferId == null) {
		return
	}
	angular.element(document.getElementsByClassName('trade-request-window-offers')[0]).scope().removeItemFromOffer({
		"id": parsedOfferId
	})
	angular.element(document.getElementsByClassName('trade-request-window-offers')[0]).scope().$apply()
})
