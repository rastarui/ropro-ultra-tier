var url_matches = [
	"/my/avatar*"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
  return roproApiAdapter.buildBrandedLoaderHtml(options);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var fetchAvatar = document.createElement('script');
fetchAvatar.src = chrome.runtime.getURL('/js/page/fetchAvatar.js');
(document.head||document.documentElement).appendChild(fetchAvatar);
fetchAvatar.onload = function() {
    fetchAvatar.remove();
}

// Avatar API observer: when Roblox's own native handlers complete avatar API writes,
// refresh the RoPro left panel so it stays in sync without intercepting clicks.
var avatarObserverRefreshTimer = null
var avatarObserverRefreshDebounceMs = 400

document.addEventListener('ropro-avatar-state-changed', function() {
	if (avatarObserverRefreshTimer != null) {
		clearTimeout(avatarObserverRefreshTimer)
	}
	avatarObserverRefreshTimer = setTimeout(function() {
		avatarObserverRefreshTimer = null
		if (typeof loadCurrentlyWearing === 'function') {
			loadCurrentlyWearing()
		}
	}, avatarObserverRefreshDebounceMs)
})

var wearingHTML = `<div style="float:left;position:relative;width:277px;margin-bottom:20px;" class="ropro-avatar-menu" id="wearing">
<h5 style="padding-bottom:0px;" class="ng-binding"><span class="outfitCostText">Outfit Cost:</span> <span>
	${buildRoProLoader({ id: "outfitCostLoading", style: "margin:-7px;transform: scale(0.6); width: 100px; height: 25px; position:relative; top:2px; visibility: initial !important;" })}
	<div id="outfitCostDiv" style="display:none;">
	<span style="margin-left:-5px;margin-right:-8px;margin-bottom:2px;transform: scale(0.6);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
	<span style="font-size:15px;" class="rbx-text-navbar-right text-header" id="outfitCostRobux">
</span></div></span>
</h5>
<h3 style="padding-bottom:0px;" class="ng-binding currentlyWearingText">Currently Wearing</h3>
<p style="margin-top:-2px;font-size:13px;display:inline-block;" class="ng-binding clickAnItemText">Click the red X to unequip items.</p>
<div id="avatarActionRow" style="display:flex;align-items:center;gap:6px;margin-top:2px;margin-bottom:4px;">
	<button type="button" id="redrawAvatar" class="ropro-avatar-action-btn ropro-avatar-redraw-btn" title="Force Roblox avatar thumbnail redraw">Redraw Avatar</button>
</div>
<div style="line-height:0px;pointer-events:initial;margin-top:5px;" id="wearingContainer"><span>
	${buildRoProLoader({ id: "outfitCostLoading", style: "margin:0px;transform: scale(0.8); width: 100px; height: 25px; position:relative; top:2px; visibility: initial !important;" })}
	<div id="outfitCostDiv" style="display:none;">
	<span style="margin-left:-5px;margin-right:-8px;margin-bottom:2px;transform: scale(0.6);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
	<span style="font-size:15px;" class="rbx-text-navbar-right text-header" id="outfitCostRobux">
</span></div></span></div>
<h3 style="padding-bottom:0px;margin-top:10px;position:relative;" class="ng-binding bodySelectorText">Body Selector <div style="position: absolute; top: 7px; right: 53px; z-index: 100;border-radius:0px;background:none;transform:scale(0.8);" class="avatar-type-toggle pill-toggle ng-scope" data-toggle="tooltip" title="Switch between classic R6 avatar and more expressive next generation R15 avatar"> <input type="radio" value="R6" onclick="document.getElementsByClassName('ropro-R6-label')[0].classList.add('ropro-active-radio');document.getElementsByClassName('ropro-R15-label')[0].classList.remove('ropro-active-radio');" class="ng-pristine ng-untouched ng-valid ng-not-empty" name="15"> <label onclick="document.getElementsByClassName('ropro-R6-label')[0].classList.add('ropro-active-radio');document.getElementsByClassName('ropro-R15-label')[0].classList.remove('ropro-active-radio');" class="ropro-R6-label" for="radio-R6">R6</label> <input type="radio" onclick="document.getElementsByClassName('ropro-R6-label')[0].classList.remove('ropro-active-radio');document.getElementsByClassName('ropro-R15-label')[0].classList.add('ropro-active-radio');" value="R15" class="ng-pristine ng-untouched ng-valid ng-not-empty" name="16"> <label onclick="document.getElementsByClassName('ropro-R6-label')[0].classList.remove('ropro-active-radio');document.getElementsByClassName('ropro-R15-label')[0].classList.add('ropro-active-radio');" class="ropro-R15-label" for="radio-R15">R15</label> </div><p id="defaultScales" style="position:absolute;right:17px;font-size:9px;display:inline-block;cursor:pointer;top:13px;font-weight:bold;" class="ng-binding clickAnItemText">Default</p><div></div>
</h3>
<div style="line-height:0px;pointer-events:initial;height:150px;width:275px;background-color:#1A1B1C;margin-top:5px;padding:5px;border-radius:15px;overflow:hidden;position:relative;" id="bodySelectorContainer"><div id="bodyColorContainer" style="float:left;transform:scaleX(0.8) scaleY(0.8);background-color:initial;padding:17px;margin:-17px;margin-top:-12px;border-radius:20px;margin-left:-7px;position:absolute;top:7px;left:0px;"><div style="width: 25px; height: 25px; margin-left: 37.5px; cursor: pointer; background-color: initial;" id="roproHeadColor"></div><div style="width: 25px; height: 50px; margin-left: 0px; margin-top: 2px; float: left; cursor: pointer; background-color: initial;" id="roproLeftArmColor"></div><div style="width: 46px; height: 50px; margin-left: 2px; margin-top: 2px; float: left; cursor: pointer; background-color: initial;" id="roproTorsoColor"></div><div style="width: 25px; height: 50px; margin-left: 2px; margin-top: 2px; float: left; cursor: pointer; background-color: initial;" id="roproRightArmColor"></div><br><div style="width: 22px; height: 50px; margin-left: 27px; margin-top: 2px; float: left; cursor: pointer; background-color: initial;" id="roproLeftLegColor"></div><div style="width: 22px; height: 50px; margin-left: 2px; margin-top: 2px; float: left; cursor: pointer; background-color: initial;" id="roproRightLegColor"></div></div><div id="bodyStyleBox" style="width:150px;float:right;position:absolute;top:16px;left:105px;"><img id="bodyStyleSelector" draggable="false" style="position:absolute;height:20px;top:88px;left:64.5px;cursor:pointer;-webkit-user-drag:none;user-select:none;display:none;" src="${chrome.runtime.getURL('/images/ropro_icon.png')}"><img draggable="false" style="pointer-events:none;-webkit-user-drag:none;user-select:none;" src="${chrome.runtime.getURL('/images/body_selector.svg')}"></div><div id="bodySizeBox" style="width:130px;float:right;margin-top:0px;position:absolute;top:5px;left:265px;"><img id="bodySizeSelector" draggable="false" style="position:absolute;height:20px;top:38.875px;left:104.5px;cursor:pointer;-webkit-user-drag:none;user-select:none;display:none;" src="${chrome.runtime.getURL('/images/ropro_icon.png')}"><img draggable="false" style="pointer-events:none;-webkit-user-drag:none;user-select:none;" src="${chrome.runtime.getURL('/images/body_size.svg')}"></div><div class="head-slider" id="headSizeBox" style="width:110px;float:right;margin-top:0px;position:absolute;top:25px;left:405px;"><img style="pointer-events: none; height: 80px; margin-left: 20px; transform: scale(1);" src="${chrome.runtime.getURL('/images/head_light.png')}" id="headSizeImage"><input type="range" oninput="document.getElementById('headSizeImage').style.transform='scale('+(0.9+this.value/50)+')';this.classList.remove('pr100');this.classList.remove('pr80');this.classList.remove('pr60');this.classList.remove('pr40');this.classList.remove('pr20');this.classList.remove('pr0');this.classList.add('pr' + (this.value * 20));" class="pr100" id="headSlider" step="1" min="0" max="5" value="5"></div><div id="bodyAdjustmentLockedMessage" class="ropro-body-adjustment-lock-message" aria-hidden="true">Body adjustment is only available in R15.</div></div>
</div>`

var wearing = []
var wearingCostDict = {}
var wearingInfoDict = {}
var scales = null
var scalesDetails = {height: -1, width: -1, proportion: -1, bodyType: -1, head: -1}
var rules = null
var bodyColorPalette = null
var mouseHeldBodySize = false
var mouseHeldBodyStyle = false
var bodySizeX = 0
var bodySizeY = 0
var bodySizeOffsetX = 55
var bodySizeOffsetY = 62.5
var bodyStyleX = 0
var bodyStyleY = 0
var wearingAssetPayload = []
var wearingAssetsDetails = []
var wearAssetsRequestInFlight = false
var wearAssetsLastCompletedAt = 0
var queuedWearAssetsPayload = null
var wearPayloadHydrationPromise = null
var wearPayloadStateInitialized = false
var scaleRequestInFlight = false
var pendingScalePayload = null
var avatarTypeRequestInFlight = false
var currentPlayerAvatarType = "R15"
var avatarMountSelectors = [".avatar-back", "[avatar-back]", "#avatar-react-container .left-wrapper", "[avatar-base]"]
var layeredClothingOrderByTypeName = {
	"TShirtAccessory": 7,
	"ShirtAccessory": 7,
	"SweaterAccessory": 7,
	"JacketAccessory": 10,
	"PantsAccessory": 4,
	"ShortsAccessory": 5,
	"DressSkirtAccessory": 6,
	"LeftShoeAccessory": 3,
	"RightShoeAccessory": 3
}
var thumbnailFallbackUrl = chrome.runtime.getURL('/images/empty.png')
var thumbnailKnownFallbackToken = "5d30ea2e004abe68a2db3b0d19fff763"
var avatarRedrawTimer = null
var avatarRedrawLastAt = 0
var avatarRedrawMinIntervalMs = 30000
var avatarRedrawPending = false
var avatarRedrawInProgress = false
var avatarRedrawInProgressAttemptId = 0
var avatarRedrawAttemptCounter = 0
var avatarRedrawCooldownEndsAt = 0
var avatarRedrawCooldownTimer = null
var avatarExternalSyncTimer = null
var avatarReactSelectionSyncSignature = ""

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

function getLocalStorage(key) {
  return roproApiAdapter.getLocalStorage(key);
}

function setStorage(key, value) {
  return roproApiAdapter.setStorage(key, value);
}

function setLocalStorage(key, value) {
  return roproApiAdapter.setLocalStorage(key, value);
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function fetchQuickEquipInventory(userId, prewarm = false) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage(
			{
				greeting: "GetUserQuickEquipInventory",
				userID: userId,
				prewarm: prewarm === true
			},
			function(data) {
				resolve(data)
			}
		)
	})
}

var activeBatch = null
var assetBatch = new Set()
var itemBatch = {}

async function fetchAssetDetails(assetId) {
	return new Promise(async resolve => {
		assetBatch.add(assetId)
		if (activeBatch == null) {
			activeBatch = new Promise(resolveBatch => {
				setTimeout(function() {
					try {
						activeBatch = null
						var items = []
						var batch = Array.from(assetBatch)
						assetBatch = new Set()
						for (var i = 0; i < batch.length; i++) {
							items.push(`{"id":${parseInt(batch[i])},"itemType":"Asset"}`)
						}
						chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://catalog.roblox.com/v1/catalog/items/details", jsonData: `{"items":[${items.join(",")}]}`}, 
							function(data) {
								if (data != null && typeof data == "object" && Array.isArray(data.data)) {
									for (var i = 0; i < data.data.length; i++) {
										itemBatch[data.data[i].id] = data.data[i]
									}
								}
								resolveBatch()
						})
					} catch(e) {
						resolveBatch()
					}
				}, 500)
			})
		}
		await activeBatch
		if (itemBatch.hasOwnProperty(assetId)) {
			resolve(itemBatch[assetId])
		} else {
			resolve({"id":-1,"itemType":"Asset","assetType":41,"name":"Error","description":"","productId":-1,"genres":["All"],"itemStatus":[],"itemRestrictions":[],"creatorHasVerifiedBadge":true,"creatorType":"User","creatorTargetId":1,"creatorName":"Roblox","price":0,"offSaleDeadline":null})
		}
	})
}

function fetchAvatarRules() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://avatar.roblox.com/v1/avatar-rules"}, 
			function(data) {
					resolve(data)
			})
	})
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

var _leftPaneHeightRaf = 0
var _leftPaneHeightObservedWrapper = null
var _leftPaneHeightObservedMenu = null
var _leftPaneHeightResizeObserver = null
var _leftPaneHeightFallbackTimer = null

function getElementBottomRelativeToTop(containerNode, targetNode) {
	if (containerNode == null || targetNode == null) {
		return 0
	}
	var containerRect = containerNode.getBoundingClientRect()
	var targetRect = targetNode.getBoundingClientRect()
	if (
		containerRect == null ||
		targetRect == null ||
		!Number.isFinite(containerRect.top) ||
		!Number.isFinite(targetRect.bottom)
	) {
		return 0
	}
	var bottom = targetRect.bottom - containerRect.top
	var targetStyle = window.getComputedStyle(targetNode)
	if (targetStyle != null) {
		var marginBottom = parseFloat(targetStyle.marginBottom)
		if (Number.isFinite(marginBottom)) {
			bottom += marginBottom
		}
	}
	return Math.max(0, Math.ceil(bottom))
}

function getAvatarLeftPaneRequiredHeight(leftWrapper) {
	if (leftWrapper == null) {
		return 0
	}
	var requiredHeight = Math.max(
		leftWrapper.offsetHeight || 0,
		leftWrapper.scrollHeight || 0,
		leftWrapper.clientHeight || 0
	)
	var candidateNodes = [
		leftWrapper.querySelector('.section-content'),
		document.getElementById('wearing'),
		leftWrapper.querySelector('.redraw-avatar')
	]
	for (var i = 0; i < candidateNodes.length; i++) {
		var candidateNode = candidateNodes[i]
		if (candidateNode == null || !leftWrapper.contains(candidateNode)) {
			continue
		}
		requiredHeight = Math.max(requiredHeight, getElementBottomRelativeToTop(leftWrapper, candidateNode))
	}
	return Math.max(0, Math.ceil(requiredHeight))
}

function syncAvatarLeftPaneHeight() {
	cancelAnimationFrame(_leftPaneHeightRaf)
	_leftPaneHeightRaf = requestAnimationFrame(function() {
		var leftWrapper = document.querySelector('.left-wrapper')
		if (!leftWrapper) {
			return
		}
		var placeholder = leftWrapper.closest('.left-wrapper-placeholder')
		if (!placeholder) {
			return
		}
		var requiredHeight = getAvatarLeftPaneRequiredHeight(leftWrapper)
		if (!Number.isFinite(requiredHeight) || requiredHeight <= 0) {
			return
		}
		var nextMinHeight = requiredHeight + 'px'
		if (placeholder.style.minHeight != nextMinHeight) {
			placeholder.style.minHeight = nextMinHeight
		}
	})
}

function setupLeftPaneHeightSync() {
	var leftWrapper = document.querySelector('.left-wrapper')
	if (!leftWrapper) {
		return
	}
	var wearingNode = document.getElementById('wearing')
	if (_leftPaneHeightObservedWrapper === leftWrapper && _leftPaneHeightObservedMenu === wearingNode) {
		syncAvatarLeftPaneHeight()
		return
	}
	_leftPaneHeightObservedWrapper = leftWrapper
	_leftPaneHeightObservedMenu = wearingNode
	if (_leftPaneHeightResizeObserver != null) {
		_leftPaneHeightResizeObserver.disconnect()
		_leftPaneHeightResizeObserver = null
	}
	if (typeof ResizeObserver !== 'undefined') {
		_leftPaneHeightResizeObserver = new ResizeObserver(function() {
			syncAvatarLeftPaneHeight()
		})
		_leftPaneHeightResizeObserver.observe(leftWrapper)
		var sectionContentNode = leftWrapper.querySelector('.section-content')
		if (sectionContentNode != null) {
			_leftPaneHeightResizeObserver.observe(sectionContentNode)
		}
		if (wearingNode != null && leftWrapper.contains(wearingNode)) {
			_leftPaneHeightResizeObserver.observe(wearingNode)
		}
		if (_leftPaneHeightFallbackTimer != null) {
			clearInterval(_leftPaneHeightFallbackTimer)
			_leftPaneHeightFallbackTimer = null
		}
	} else if (_leftPaneHeightFallbackTimer == null) {
		_leftPaneHeightFallbackTimer = setInterval(function() {
			syncAvatarLeftPaneHeight()
		}, 1000)
	}
	syncAvatarLeftPaneHeight()
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function normalizeCatalogPriceStatus(priceStatus) {
	var normalizedStatus = typeof priceStatus === "string" ? priceStatus : ""
	return normalizedStatus.toLowerCase().replace(/\s+/g, "")
}

function isAvatarCatalogItemOffsale(itemDetails) {
	if (itemDetails == null || typeof itemDetails !== "object") {
		return false
	}
	if (itemDetails.isOffSale === true) {
		return true
	}
	return normalizeCatalogPriceStatus(itemDetails.priceStatus) == "offsale"
}

function totalOutfitCost() {
	var total = 0
	var offsale = 0
	for (var i2 = 0; i2 < wearing.length; i2++) {
		var assetId = wearing[i2]
		if (!Object.prototype.hasOwnProperty.call(wearingCostDict, assetId)) {
			continue
		}
		if (wearingCostDict[assetId] != null) {
			total += wearingCostDict[assetId]
		} else {
			offsale += 1
		}
	}
	return [total, offsale]
}

function fetchCurrentlyWearing(userId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://avatar.roblox.com/v1/users/"+userId+"/avatar"}, 
			function(data) {
					resolve(data)
			})
	})
}

function postValidatedUrl(url, jsonData) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url: url, jsonData: jsonData}, function(data) {
			resolve(data)
		})
	})
}

function hasNativeAvatarRedrawControl() {
	return document.querySelector('.redraw-avatar button.text-link') != null
}

function getAvatarRedrawCooldownRemainingMs() {
	return Math.max(avatarRedrawCooldownEndsAt - Date.now(), 0)
}

function stopAvatarRedrawCooldownTimer() {
	if (avatarRedrawCooldownTimer != null) {
		clearInterval(avatarRedrawCooldownTimer)
		avatarRedrawCooldownTimer = null
	}
}

function updateAvatarRedrawButtonState() {
	var redrawButton = document.getElementById('redrawAvatar')
	if (redrawButton == null) {
		if (getAvatarRedrawCooldownRemainingMs() <= 0 && avatarRedrawCooldownEndsAt > 0) {
			avatarRedrawCooldownEndsAt = 0
			stopAvatarRedrawCooldownTimer()
		}
		return
	}
	var cooldownRemainingMs = getAvatarRedrawCooldownRemainingMs()
	if (cooldownRemainingMs <= 0 && avatarRedrawCooldownEndsAt > 0) {
		avatarRedrawCooldownEndsAt = 0
		stopAvatarRedrawCooldownTimer()
		cooldownRemainingMs = 0
	}
	if (avatarRedrawInProgress) {
		redrawButton.classList.remove('ropro-avatar-redraw-pending')
		redrawButton.classList.add('ropro-avatar-redraw-inflight')
		redrawButton.textContent = "Redrawing..."
		redrawButton.disabled = true
		return
	}
	redrawButton.classList.remove('ropro-avatar-redraw-inflight')
	redrawButton.classList.toggle('ropro-avatar-redraw-pending', avatarRedrawPending)
	var baseLabel = avatarRedrawPending ? "Redraw Needed" : "Redraw Avatar"
	if (cooldownRemainingMs > 0) {
		var cooldownRemainingSeconds = Math.ceil(cooldownRemainingMs / 1000)
		redrawButton.textContent = `${baseLabel} (${cooldownRemainingSeconds}s)`
	} else {
		redrawButton.textContent = baseLabel
	}
	redrawButton.disabled = cooldownRemainingMs > 0
}

function startAvatarRedrawCooldown(durationMs = avatarRedrawMinIntervalMs) {
	var safeDurationMs = parseInt(durationMs)
	if (!Number.isFinite(safeDurationMs) || safeDurationMs <= 0) {
		safeDurationMs = avatarRedrawMinIntervalMs
	}
	avatarRedrawCooldownEndsAt = Date.now() + safeDurationMs
	stopAvatarRedrawCooldownTimer()
	avatarRedrawCooldownTimer = setInterval(function() {
		updateAvatarRedrawButtonState()
	}, 250)
	updateAvatarRedrawButtonState()
}

function setAvatarRedrawPending(isPending) {
	avatarRedrawPending = isPending === true
	updateAvatarRedrawButtonState()
}

function setAvatarRedrawInProgress(isInProgress, attemptId) {
	var safeAttemptId = parseInt(attemptId)
	if (isInProgress === true) {
		avatarRedrawInProgress = true
		if (Number.isFinite(safeAttemptId) && safeAttemptId > 0) {
			avatarRedrawInProgressAttemptId = safeAttemptId
		}
		updateAvatarRedrawButtonState()
		return
	}
	if (
		avatarRedrawInProgressAttemptId > 0 &&
		Number.isFinite(safeAttemptId) &&
		safeAttemptId > 0 &&
		safeAttemptId != avatarRedrawInProgressAttemptId
	) {
		return
	}
	avatarRedrawInProgress = false
	avatarRedrawInProgressAttemptId = 0
	updateAvatarRedrawButtonState()
}

function triggerNativeAvatarRedraw() {
	var redrawButton = document.querySelector('.redraw-avatar button.text-link')
	if (redrawButton == null) {
		return false
	}
	try {
		redrawButton.click()
		return true
	} catch (e) {
		return false
	}
}

function delay(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}

function isAvatarRedrawFailureResponse(response) {
	if (response == null || response == "ERROR") {
		return true
	}
	if (typeof response != "object") {
		return false
	}
	if (response.success === false) {
		return true
	}
	if (Array.isArray(response.errors) && response.errors.length > 0) {
		return true
	}
	return false
}

async function waitForAvatarPreviewChange(previousSignature, timeoutMs = 2400, stepMs = 300) {
	var safePreviousSignature = typeof previousSignature == "string" ? previousSignature : ""
	var elapsed = 0
	while (elapsed < timeoutMs) {
		await delay(stepMs)
		var currentSignature = getAvatarPreviewSignature()
		if (currentSignature.length > 0 && currentSignature != safePreviousSignature) {
			avatarPreviewSignature = currentSignature
			return true
		}
		elapsed += stepMs
	}
	return false
}

function scheduleAvatarRedraw(delayMs = 200, options = {}) {
	if (avatarRedrawTimer != null) {
		clearTimeout(avatarRedrawTimer)
	}
	avatarRedrawAttemptCounter += 1
	var redrawAttemptId = avatarRedrawAttemptCounter
	var forceRedraw = options != null && options.force === true
	var requestManualRedraw = options != null && options.requestManualRedraw === true
	if (!forceRedraw && hasNativeAvatarRedrawControl()) {
		if (requestManualRedraw) {
			setAvatarRedrawPending(true)
		}
		return
	}
	var safeDelayMs = parseInt(delayMs)
	if (!Number.isFinite(safeDelayMs) || safeDelayMs < 0) {
		safeDelayMs = 0
	}
	var now = Date.now()
	var cooldownDelay = Math.max(avatarRedrawMinIntervalMs - (now - avatarRedrawLastAt), 0)
	var redrawDelay = Math.max(safeDelayMs, cooldownDelay)
	avatarRedrawTimer = setTimeout(async function() {
		avatarRedrawTimer = null
		avatarRedrawLastAt = Date.now()
		var previousPreviewSignature = getAvatarPreviewSignature()
		var triggeredNativeRedraw = false
		var fallbackResponse = null
		var redrawSucceeded = false
		setAvatarRedrawInProgress(true, redrawAttemptId)
		try {
			triggeredNativeRedraw = triggerNativeAvatarRedraw()
			if (!triggeredNativeRedraw) {
				fallbackResponse = await postValidatedUrl("https://avatar.roblox.com/v1/avatar/redraw-thumbnail", {})
			}
			redrawSucceeded = triggeredNativeRedraw || !isAvatarRedrawFailureResponse(fallbackResponse)
			if (triggeredNativeRedraw || redrawSucceeded) {
				var previewChanged = await waitForAvatarPreviewChange(previousPreviewSignature)
				redrawSucceeded = redrawSucceeded || previewChanged
			}
		} catch (e) {
			redrawSucceeded = false
		}
		if (redrawAttemptId != avatarRedrawAttemptCounter) {
			setAvatarRedrawInProgress(false, redrawAttemptId)
			return
		}
		setAvatarRedrawInProgress(false, redrawAttemptId)
		setAvatarRedrawPending(!redrawSucceeded)
	}, redrawDelay)
}

function normalizePlayerAvatarType(playerAvatarType) {
	if (playerAvatarType == "R6" || playerAvatarType == 1 || playerAvatarType == "1") {
		return "R6"
	}
	return "R15"
}

function normalizePlayerAvatarTypeValue(playerAvatarType) {
	return normalizePlayerAvatarType(playerAvatarType) == "R6" ? 1 : 3
}

function areBodyAdjustmentsEnabled() {
	return normalizePlayerAvatarType(currentPlayerAvatarType) == "R15"
}

function setBodyAdjustmentsAvailability(playerAvatarType) {
	var normalizedAvatarType = normalizePlayerAvatarType(playerAvatarType)
	currentPlayerAvatarType = normalizedAvatarType
	var bodySelectorContainerNode = document.getElementById('bodySelectorContainer')
	var defaultScalesNode = document.getElementById('defaultScales')
	var headSliderNode = document.getElementById('headSlider')
	var bodyAdjustmentMessageNode = document.getElementById('bodyAdjustmentLockedMessage')
	var bodyAdjustmentsLocked = normalizedAvatarType == "R6"
	if (bodySelectorContainerNode != null) {
		bodySelectorContainerNode.classList.toggle('ropro-body-adjustments-locked', bodyAdjustmentsLocked)
		bodySelectorContainerNode.setAttribute('data-ropro-body-adjustments-locked', bodyAdjustmentsLocked ? "1" : "0")
	}
	if (defaultScalesNode != null) {
		defaultScalesNode.classList.toggle('ropro-body-adjustments-disabled', bodyAdjustmentsLocked)
		defaultScalesNode.setAttribute('aria-disabled', bodyAdjustmentsLocked ? "true" : "false")
	}
	if (headSliderNode != null) {
		headSliderNode.disabled = bodyAdjustmentsLocked
		headSliderNode.setAttribute('aria-disabled', bodyAdjustmentsLocked ? "true" : "false")
	}
	if (bodyAdjustmentMessageNode != null) {
		bodyAdjustmentMessageNode.setAttribute('aria-hidden', bodyAdjustmentsLocked ? "false" : "true")
	}
	if (bodyAdjustmentsLocked) {
		mouseHeldBodySize = false
		mouseHeldBodyStyle = false
	}
}

function syncAvatarTypeToggleUi(playerAvatarType) {
	var normalizedAvatarType = normalizePlayerAvatarType(playerAvatarType)
	var avatarTypeToggle = document.getElementsByClassName('avatar-type-toggle')
	if (avatarTypeToggle.length > 0) {
		var avatarTypeInputs = avatarTypeToggle[0].getElementsByTagName('input')
		if (avatarTypeInputs.length >= 2) {
			avatarTypeInputs[0].checked = normalizedAvatarType == "R6"
			avatarTypeInputs[1].checked = normalizedAvatarType == "R15"
		}
	}
	var r6LabelNode = document.getElementsByClassName('ropro-R6-label')[0]
	var r15LabelNode = document.getElementsByClassName('ropro-R15-label')[0]
	if (r6LabelNode != null && r15LabelNode != null) {
		if (normalizedAvatarType == "R6") {
			r6LabelNode.classList.add('ropro-active-radio')
			r15LabelNode.classList.remove('ropro-active-radio')
		} else {
			r15LabelNode.classList.add('ropro-active-radio')
			r6LabelNode.classList.remove('ropro-active-radio')
		}
	}
	setBodyAdjustmentsAvailability(normalizedAvatarType)
	return normalizedAvatarType
}

function getCurrentDepthScale() {
	if (scales != null && typeof scales == "object" && Number.isFinite(parseFloat(scales.depth))) {
		return parseFloat(scales.depth)
	}
	if (rules != null && rules.scales != null && rules.scales.depth != null) {
		var depthMin = parseFloat(rules.scales.depth.min)
		if (Number.isFinite(depthMin)) {
			return depthMin
		}
	}
	return 1
}

function normalizeWearAssets(assets) {
	var normalizedAssets = []
	var seen = {}
	if (!Array.isArray(assets)) {
		return normalizedAssets
	}
	for (var i = 0; i < assets.length; i++) {
		var item = assets[i]
		if (item == null || typeof item != "object") {
			continue
		}
		var itemId = parseInt(item.id)
		if (!Number.isFinite(itemId) || itemId <= 0 || seen[itemId]) {
			continue
		}
		seen[itemId] = true
		var normalizedItem = {id: itemId}
		if (item.meta != null && typeof item.meta == "object") {
			normalizedItem.meta = item.meta
		}
		normalizedAssets.push(normalizedItem)
	}
	return normalizedAssets
}

function getAssetTypeLimit(assetTypeName) {
	if (typeof assetTypeName != "string" || assetTypeName.length == 0) {
		return null
	}
	if (rules == null || rules.wearableAssetTypes == null || !Array.isArray(rules.wearableAssetTypes)) {
		return null
	}
	for (var i = 0; i < rules.wearableAssetTypes.length; i++) {
		var wearableType = rules.wearableAssetTypes[i]
		if (wearableType != null && wearableType.name == assetTypeName) {
			var maxNumber = parseInt(wearableType.maxNumber)
			if (Number.isFinite(maxNumber) && maxNumber >= 0) {
				return maxNumber
			}
			return null
		}
	}
	return null
}

function normalizeWearAssetMetaVector(vec) {
	if (vec == null || typeof vec != "object" || Array.isArray(vec)) {
		return null
	}
	var x = parseFloat(vec.X)
	var y = parseFloat(vec.Y)
	var z = parseFloat(vec.Z)
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
		return null
	}
	return {X: x, Y: y, Z: z}
}

function normalizeWearAssetMeta(meta) {
	if (meta == null || typeof meta != "object" || Array.isArray(meta)) {
		return null
	}
	var normalizedMeta = {}
	if (Object.prototype.hasOwnProperty.call(meta, "order")) {
		var order = parseInt(meta.order)
		if (Number.isFinite(order)) {
			normalizedMeta.order = order
		}
	}
	if (Object.prototype.hasOwnProperty.call(meta, "version")) {
		var version = parseInt(meta.version)
		if (Number.isFinite(version)) {
			normalizedMeta.version = version
		}
	}
	if (Object.prototype.hasOwnProperty.call(meta, "position")) {
		var pos = normalizeWearAssetMetaVector(meta.position)
		if (pos != null) {
			normalizedMeta.position = pos
		}
	}
	if (Object.prototype.hasOwnProperty.call(meta, "rotation")) {
		var rot = normalizeWearAssetMetaVector(meta.rotation)
		if (rot != null) {
			normalizedMeta.rotation = rot
		}
	}
	if (Object.prototype.hasOwnProperty.call(meta, "scale")) {
		var sc = normalizeWearAssetMetaVector(meta.scale)
		if (sc != null) {
			normalizedMeta.scale = sc
		}
	}
	if (Object.keys(normalizedMeta).length == 0) {
		return null
	}
	return normalizedMeta
}

function buildAvatarSetWearingAssetsPayload(assets) {
	var normalizedAssets = normalizeWearAssets(assets)
	var requestAssets = []
	for (var i = 0; i < normalizedAssets.length; i++) {
		var safeAssetId = parseInt(normalizedAssets[i].id)
		if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
			continue
		}
		var requestItem = {id: safeAssetId}
		var normalizedMeta = normalizeWearAssetMeta(normalizedAssets[i].meta)
		if (normalizedMeta != null) {
			requestItem.meta = normalizedMeta
		}
		requestAssets.push(requestItem)
	}
	return requestAssets
}

function isAvatarWearAssetsFailureResponse(response) {
	if (response == null || response == "ERROR") {
		return true
	}
	if (typeof response != "object") {
		return false
	}
	if (response.success === false) {
		return true
	}
	if (Array.isArray(response.errors) && response.errors.length > 0) {
		return true
	}
	return false
}

function setAvatarWearWriteStatus(status, detail = "") {
	var safeStatus = typeof status == "string" ? stripTags(status).trim() : ""
	if (safeStatus.length == 0) {
		safeStatus = "unknown"
	}
	var safeDetail = typeof detail == "string" ? stripTags(detail).trim() : ""
	var timestamp = Date.now()
	document.documentElement.setAttribute('data-ropro-avatar-wear-status', safeStatus)
	document.documentElement.setAttribute('data-ropro-avatar-wear-at', String(timestamp))
	document.documentElement.setAttribute('data-ropro-avatar-wear-detail', safeDetail.slice(0, 180))
}

async function hydrateWearPayloadFromServer() {
	var userId = getAvatarPageUserId()
	if (!Number.isFinite(userId) || userId <= 0) {
		return false
	}
	var currentlyWearing = await fetchCurrentlyWearing(userId)
	if (currentlyWearing == "ERROR" || currentlyWearing == null || typeof currentlyWearing != "object") {
		return false
	}
	var assets = Array.isArray(currentlyWearing.assets) ? currentlyWearing.assets : null
	if (assets == null) {
		return false
	}
	wearingAssetsDetails = assets
	wearingAssetPayload = normalizeWearAssets(assets)
	wearPayloadStateInitialized = true
	return true
}

async function ensureWearPayloadHydrated(forceRefresh = false) {
	if (!forceRefresh && Array.isArray(wearingAssetPayload) && wearingAssetPayload.length > 0) {
		return true
	}
	if (wearPayloadHydrationPromise != null) {
		return await wearPayloadHydrationPromise
	}
	wearPayloadHydrationPromise = hydrateWearPayloadFromServer()
		.then(function(result) {
			return result === true
		})
		.catch(function() {
			return false
		})
		.finally(function() {
			wearPayloadHydrationPromise = null
	})
	return await wearPayloadHydrationPromise
}

async function waitForWearPayloadAssetPresence(assetId, expectedIsEquipped, maxAttempts = 3, delayMs = 180) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return {resolved: false, present: false, hydrated: false}
	}
	var expectedPresence = expectedIsEquipped === true
	var safeMaxAttempts = parseInt(maxAttempts)
	if (!Number.isFinite(safeMaxAttempts) || safeMaxAttempts < 1) {
		safeMaxAttempts = 1
	}
	var safeDelayMs = parseInt(delayMs)
	if (!Number.isFinite(safeDelayMs) || safeDelayMs < 0) {
		safeDelayMs = 0
	}
	var hydrated = false
	var lastPresence = isAvatarAssetEquippedInWearPayload(safeAssetId)
	for (var attempt = 0; attempt < safeMaxAttempts; attempt++) {
		var hydrationResult = await ensureWearPayloadHydrated(true)
		hydrated = hydrated || hydrationResult
		lastPresence = isAvatarAssetEquippedInWearPayload(safeAssetId)
		if (lastPresence === expectedPresence) {
			return {resolved: true, present: lastPresence, hydrated: hydrated}
		}
		if (attempt < safeMaxAttempts - 1 && safeDelayMs > 0) {
			await delay(safeDelayMs * (attempt + 1))
		}
	}
	return {resolved: false, present: lastPresence, hydrated: hydrated}
}

async function reconcileWearPayloadFromServerAfterWrite(expectedPayload = null) {
	var optimisticPayload = normalizeWearAssets(Array.isArray(expectedPayload) ? expectedPayload : wearingAssetPayload)
	var optimisticDetails = Array.isArray(wearingAssetsDetails) ? wearingAssetsDetails.slice() : []
	var expectedSignature = getAvatarEquippedAssetSignature(optimisticPayload)
	var maxAttempts = expectedSignature.length > 0 ? 4 : 2
	for (var attempt = 0; attempt < maxAttempts; attempt++) {
		if (attempt > 0) {
			await delay(160 * (attempt + 1))
		}
		var reconciled = await ensureWearPayloadHydrated(true)
		if (!reconciled) {
			continue
		}
		if (expectedSignature.length == 0) {
			syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
			return true
		}
		var hydratedSignature = getAvatarEquippedAssetSignature(wearingAssetPayload)
		if (hydratedSignature == expectedSignature) {
			syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
			return true
		}
		if (attempt < maxAttempts - 1) {
			wearingAssetsDetails = optimisticDetails.slice()
			wearingAssetPayload = normalizeWearAssets(optimisticPayload)
			wearPayloadStateInitialized = true
			syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
			continue
		}
		syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
		return false
	}
	wearingAssetsDetails = optimisticDetails.slice()
	wearingAssetPayload = normalizeWearAssets(optimisticPayload)
	wearPayloadStateInitialized = true
	syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
	return false
}

async function flushWearAssetsQueue() {
	if (wearAssetsRequestInFlight || queuedWearAssetsPayload == null) {
		return
	}
	wearAssetsRequestInFlight = true
	var nextPayload = normalizeWearAssets(queuedWearAssetsPayload)
	queuedWearAssetsPayload = null
	var requestAssets = buildAvatarSetWearingAssetsPayload(nextPayload)
	setAvatarWearWriteStatus("posting", "assets=" + requestAssets.length)
	var previousPreviewSignature = getAvatarPreviewSignature()
	var response = await postValidatedUrl("https://avatar.roblox.com/v2/avatar/set-wearing-assets", {assets: requestAssets})
	wearAssetsRequestInFlight = false
	wearAssetsLastCompletedAt = Date.now()
	if (queuedWearAssetsPayload != null) {
		setAvatarWearWriteStatus("requeued", "pending=" + queuedWearAssetsPayload.length)
		flushWearAssetsQueue()
		return
	}
	if (isAvatarWearAssetsFailureResponse(response)) {
		setAvatarWearWriteStatus("post_failed", "")
		loadCurrentlyWearing()
		return
	}
	var reconciledAfterWrite = await reconcileWearPayloadFromServerAfterWrite(nextPayload)
	setAvatarWearWriteStatus("post_success", "assets=" + requestAssets.length + ";reconciled=" + (reconciledAfterWrite ? "1" : "0"))
	setTimeout(function() {
		loadCurrentlyWearing()
	}, 220)
	scheduleAvatarExternalSync(700)
	setAvatarRedrawPending(true)
	var previewChanged = await waitForAvatarPreviewChange(previousPreviewSignature, 8000, 500)
	if (previewChanged) {
		setAvatarRedrawPending(false)
	}
}

function queueWearAssetsUpdate(nextAssets) {
	var normalizedPayload = normalizeWearAssets(nextAssets)
	wearingAssetPayload = normalizedPayload
	wearPayloadStateInitialized = true
	queuedWearAssetsPayload = normalizedPayload
	syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
	setAvatarWearWriteStatus("queued", "assets=" + normalizedPayload.length)
	flushWearAssetsQueue()
}

function getScalePostData(height, width, proportion, bodyType, head) {
	var safeHeight = parseFloat(height)
	var safeWidth = parseFloat(width)
	var safeProportion = parseFloat(proportion)
	var safeBodyType = parseFloat(bodyType)
	var safeHead = parseFloat(head)
	if (
		!Number.isFinite(safeHeight) ||
		!Number.isFinite(safeWidth) ||
		!Number.isFinite(safeProportion) ||
		!Number.isFinite(safeBodyType) ||
		!Number.isFinite(safeHead)
	) {
		return null
	}
	return {
		height: parseFloat((safeHeight / 100).toFixed(2)),
		width: parseFloat((safeWidth / 100).toFixed(2)),
		proportion: parseFloat((safeProportion / 100).toFixed(2)),
		bodyType: parseFloat((safeBodyType / 100).toFixed(2)),
		head: parseFloat((safeHead / 100).toFixed(2)),
		depth: getCurrentDepthScale()
	}
}

async function flushScaleQueue() {
	if (scaleRequestInFlight || pendingScalePayload == null) {
		return
	}
	scaleRequestInFlight = true
	var nextScalePayload = pendingScalePayload
	pendingScalePayload = null
	var response = await postValidatedUrl("https://avatar.roblox.com/v1/avatar/set-scales", nextScalePayload)
	scaleRequestInFlight = false
	if (pendingScalePayload != null) {
		flushScaleQueue()
		return
	}
	if (response != null && response.success !== false) {
		scheduleAvatarRedraw(200, {requestManualRedraw: true})
		setTimeout(function() {
			loadCurrentlyWearing()
		}, 250)
	}
}

function getAvatarPanelInsertionAnchor() {
	var anchorSelectors = [
		'#avatar-react-container .left-wrapper .avatar-back',
		'#avatar-react-container [avatar-back]',
		'.left-wrapper .avatar-back',
		'[avatar-back]'
	]
	for (var i = 0; i < anchorSelectors.length; i++) {
		var anchorNode = document.querySelector(anchorSelectors[i])
		if (anchorNode != null && anchorNode.parentNode != null) {
			return anchorNode
		}
	}
	return null
}

function ensureAvatarMenuAnchorPlacement() {
	var wearingNode = document.getElementById('wearing')
	if (wearingNode == null) {
		return false
	}
	var anchorNode = getAvatarPanelInsertionAnchor()
	if (anchorNode == null || anchorNode.parentNode == null) {
		return false
	}
	if (wearingNode.parentNode === anchorNode.parentNode && wearingNode.previousElementSibling === anchorNode) {
		setupLeftPaneHeightSync()
		syncAvatarLeftPaneHeight()
		return true
	}
	insertAfter(wearingNode, anchorNode)
	setupLeftPaneHeightSync()
	syncAvatarLeftPaneHeight()
	return true
}

async function setPlayerAvatarType(playerAvatarType) {
	if (avatarTypeRequestInFlight) {
		return
	}
	var normalizedAvatarType = normalizePlayerAvatarType(playerAvatarType)
	var previousAvatarType = currentPlayerAvatarType
	syncAvatarTypeToggleUi(normalizedAvatarType)
	avatarTypeRequestInFlight = true
	var response = await postValidatedUrl(
		"https://avatar.roblox.com/v1/avatar/set-player-avatar-type",
		{playerAvatarType: normalizePlayerAvatarTypeValue(normalizedAvatarType)}
	)
	avatarTypeRequestInFlight = false
	if (response != null && response.success !== false) {
		scheduleAvatarRedraw(200, {requestManualRedraw: true})
		setTimeout(function() {
			loadCurrentlyWearing()
		}, 250)
	} else {
		syncAvatarTypeToggleUi(previousAvatarType)
	}
}

function reloadAvatar() {
	if (getAvatarRedrawCooldownRemainingMs() > 0) {
		updateAvatarRedrawButtonState()
		return
	}
	startAvatarRedrawCooldown(avatarRedrawMinIntervalMs)
	scheduleAvatarRedraw(0, {force: true})
	loadCurrentlyWearing()
}

function scheduleAvatarExternalSync(delayMs = 900) {
	if (avatarExternalSyncTimer != null) {
		clearTimeout(avatarExternalSyncTimer)
	}
	avatarExternalSyncTimer = setTimeout(function() {
		avatarExternalSyncTimer = null
		Promise.resolve(loadCurrentlyWearing())
			.catch(function() {})
	}, delayMs)
}

function extractCatalogAssetIdFromHref(hrefValue) {
	if (typeof hrefValue != "string") {
		return null
	}
	var match = hrefValue.match(/\/catalog\/(\d+)(?:\/|$|\?)/i)
	if (match == null || match.length < 2) {
		return null
	}
	var parsedAssetId = parseInt(match[1])
	if (!Number.isFinite(parsedAssetId) || parsedAssetId <= 0) {
		return null
	}
	return parsedAssetId
}

function hasAvatarAssetInList(assets, assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0 || !Array.isArray(assets)) {
		return false
	}
	for (var i = 0; i < assets.length; i++) {
		var asset = assets[i]
		if (asset == null || typeof asset != "object") {
			continue
		}
		var candidateAssetId = parseInt(asset.id)
		if (Number.isFinite(candidateAssetId) && candidateAssetId == safeAssetId) {
			return true
		}
	}
	return false
}

function getAvatarAssetTypeIdByName(assetTypeName) {
	if (typeof assetTypeName != "string" || assetTypeName.length == 0) {
		return null
	}
	if (rules == null || !Array.isArray(rules.wearableAssetTypes)) {
		return null
	}
	for (var i = 0; i < rules.wearableAssetTypes.length; i++) {
		var wearableType = rules.wearableAssetTypes[i]
		if (wearableType == null || wearableType.name != assetTypeName) {
			continue
		}
		var parsedTypeId = parseInt(wearableType.id)
		if (Number.isFinite(parsedTypeId) && parsedTypeId > 0) {
			return parsedTypeId
		}
	}
	return null
}

function getAvatarWornAssetTypeInfo(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0 || !Array.isArray(wearingAssetsDetails)) {
		return null
	}
	for (var i = 0; i < wearingAssetsDetails.length; i++) {
		var wearingAsset = wearingAssetsDetails[i]
		if (wearingAsset == null || typeof wearingAsset != "object") {
			continue
		}
		if (parseInt(wearingAsset.id) != safeAssetId) {
			continue
		}
		if (wearingAsset.assetType == null || typeof wearingAsset.assetType != "object") {
			continue
		}
		var assetTypeName = typeof wearingAsset.assetType.name == "string" ? wearingAsset.assetType.name : ""
		var assetTypeId = parseInt(wearingAsset.assetType.id)
		return {
			name: assetTypeName,
			id: Number.isFinite(assetTypeId) && assetTypeId > 0 ? assetTypeId : null
		}
	}
	return null
}

function getAvatarInventoryAssetTypeName(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return ""
	}
	if (inventory_dict == null || typeof inventory_dict != "object" || !Object.prototype.hasOwnProperty.call(inventory_dict, safeAssetId)) {
		return ""
	}
	var inventoryEntry = inventory_dict[safeAssetId]
	if (inventoryEntry == null || typeof inventoryEntry != "object" || typeof inventoryEntry.assetType != "string") {
		return ""
	}
	return inventoryEntry.assetType
}

function resolveAvatarNativeToggleAssetType(assetId, preferredAssetTypeName, templateItem) {
	var assetTypeName = typeof preferredAssetTypeName == "string" ? preferredAssetTypeName : ""
	var wornAssetType = getAvatarWornAssetTypeInfo(assetId)
	if (assetTypeName.length == 0 && wornAssetType != null && typeof wornAssetType.name == "string") {
		assetTypeName = wornAssetType.name
	}
	if (assetTypeName.length == 0) {
		assetTypeName = getAvatarInventoryAssetTypeName(assetId)
	}
	var templateAssetType = templateItem != null && typeof templateItem == "object" ? templateItem.assetType : null
	if (assetTypeName.length == 0 && templateAssetType != null && typeof templateAssetType == "object" && typeof templateAssetType.name == "string") {
		assetTypeName = templateAssetType.name
	}
	var assetTypeId = wornAssetType != null ? wornAssetType.id : null
	if (!Number.isFinite(assetTypeId) || assetTypeId <= 0) {
		assetTypeId = getAvatarAssetTypeIdByName(assetTypeName)
	}
	if ((!Number.isFinite(assetTypeId) || assetTypeId <= 0) && templateAssetType != null && typeof templateAssetType == "object") {
		var templateAssetTypeId = parseInt(templateAssetType.id)
		if (Number.isFinite(templateAssetTypeId) && templateAssetTypeId > 0) {
			assetTypeId = templateAssetTypeId
		}
	}
	if (assetTypeName.length == 0) {
		assetTypeName = "Hat"
	}
	if (!Number.isFinite(assetTypeId) || assetTypeId <= 0) {
		var fallbackTypeId = getAvatarAssetTypeIdByName(assetTypeName)
		assetTypeId = Number.isFinite(fallbackTypeId) && fallbackTypeId > 0 ? fallbackTypeId : 8
	}
	return {
		id: assetTypeId,
		name: assetTypeName
	}
}

function resolveAvatarNativeToggleAssetName(assetId, templateItem) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return "Item"
	}
	var preferredName = ""
	if (wearingInfoDict != null && typeof wearingInfoDict == "object" && Object.prototype.hasOwnProperty.call(wearingInfoDict, safeAssetId)) {
		preferredName = typeof wearingInfoDict[safeAssetId] == "string" ? wearingInfoDict[safeAssetId] : ""
	}
	if (preferredName.length == 0 && inventory_dict != null && typeof inventory_dict == "object" && Object.prototype.hasOwnProperty.call(inventory_dict, safeAssetId)) {
		var inventoryEntry = inventory_dict[safeAssetId]
		if (inventoryEntry != null && typeof inventoryEntry == "object" && typeof inventoryEntry.name == "string") {
			preferredName = inventoryEntry.name
		}
	}
	if (preferredName.length == 0 && templateItem != null && typeof templateItem == "object" && typeof templateItem.name == "string") {
		preferredName = templateItem.name
	}
	if (typeof stripTags == "function" && preferredName.length > 0) {
		preferredName = stripTags(preferredName)
	}
	if (preferredName.length == 0) {
		return "Item " + safeAssetId
	}
	return preferredName
}

function buildAvatarNativeToggleItem(assetId, currentlySelected, preferredAssetTypeName = null, templateItem = null) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return null
	}
	var syntheticItem = {}
	if (templateItem != null && typeof templateItem == "object") {
		syntheticItem = Object.assign({}, templateItem)
	}
	var resolvedType = resolveAvatarNativeToggleAssetType(safeAssetId, preferredAssetTypeName, templateItem)
	var syntheticAssetType = {}
	if (syntheticItem.assetType != null && typeof syntheticItem.assetType == "object") {
		syntheticAssetType = Object.assign({}, syntheticItem.assetType)
	}
	syntheticAssetType.id = resolvedType.id
	syntheticAssetType.name = resolvedType.name
	syntheticItem.assetType = syntheticAssetType
	syntheticItem.type = "Asset"
	syntheticItem.id = safeAssetId
	syntheticItem.selected = currentlySelected === true
	syntheticItem.thumbnailType = "Asset"
	syntheticItem.name = resolveAvatarNativeToggleAssetName(safeAssetId, templateItem)
	if (typeof syntheticItem.link != "string" || extractCatalogAssetIdFromHref(syntheticItem.link) != safeAssetId) {
		syntheticItem.link = "https://www.roblox.com/catalog/" + safeAssetId + "/Item"
	}
	return syntheticItem
}

function getAvatarNativeCardContainers() {
	var nativeCards = []
	var seenCards = new Set()
	var cardSelectors = [
		'.right-panel .item-card-container.remove-panel',
		'.right-panel .item-card-container',
		'#avatar-react-container .tab-content .item-card-container'
	]
	for (var selectorIndex = 0; selectorIndex < cardSelectors.length; selectorIndex++) {
		var cardNodes = document.querySelectorAll(cardSelectors[selectorIndex])
		for (var cardIndex = 0; cardIndex < cardNodes.length; cardIndex++) {
			var cardNode = cardNodes[cardIndex]
			if (cardNode == null || seenCards.has(cardNode)) {
				continue
			}
			if (cardNode.closest('.recommendations-container') != null) {
				continue
			}
			seenCards.add(cardNode)
			nativeCards.push(cardNode)
		}
	}
	if (nativeCards.length > 0) {
		return nativeCards
	}
	var fallbackLinkNodes = document.querySelectorAll(
		'.right-panel a.item-card-thumb-container[href], ' +
		'.right-panel a.item-card-name-link[href], ' +
		'#avatar-react-container .tab-content a.item-card-thumb-container[href], ' +
		'#avatar-react-container .tab-content a.item-card-name-link[href]'
	)
	for (var linkIndex = 0; linkIndex < fallbackLinkNodes.length; linkIndex++) {
		var linkNode = fallbackLinkNodes[linkIndex]
		if (linkNode == null || typeof linkNode.closest != "function") {
			continue
		}
		var fallbackCard = linkNode.closest('.item-card-container')
		if (fallbackCard == null || seenCards.has(fallbackCard)) {
			continue
		}
		if (fallbackCard.closest('.recommendations-container') != null) {
			continue
		}
		seenCards.add(fallbackCard)
		nativeCards.push(fallbackCard)
	}
	return nativeCards
}

function getAvatarCardContainerByAssetId(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return null
	}
	var nativeCards = getAvatarNativeCardContainers()
	for (var i = 0; i < nativeCards.length; i++) {
		var card = nativeCards[i]
		if (card == null) {
			continue
		}
		if (getAvatarAssetIdFromCardContainer(card) == safeAssetId) {
			return card
		}
	}
	return null
}

function getAvatarAssetIdFromCardContainer(cardContainer) {
	if (cardContainer == null || typeof cardContainer.getAttribute != "function") {
		return null
	}
	var directAttributeId = parseInt(cardContainer.getAttribute('data-thumbnail-target-id'))
	if (Number.isFinite(directAttributeId) && directAttributeId > 0) {
		return directAttributeId
	}
	if (typeof cardContainer.querySelectorAll == "function") {
		var dataIdNodes = cardContainer.querySelectorAll('[data-thumbnail-target-id], [itemid], [data-item-id], [data-asset-id]')
		for (var i = 0; i < dataIdNodes.length; i++) {
			var dataNode = dataIdNodes[i]
			if (dataNode == null || typeof dataNode.getAttribute != "function") {
				continue
			}
			var candidateId = parseInt(
				dataNode.getAttribute('data-thumbnail-target-id') ||
				dataNode.getAttribute('itemid') ||
				dataNode.getAttribute('data-item-id') ||
				dataNode.getAttribute('data-asset-id')
			)
			if (Number.isFinite(candidateId) && candidateId > 0) {
				return candidateId
			}
		}
		var linkNodes = cardContainer.querySelectorAll('a[href]')
		for (var j = 0; j < linkNodes.length; j++) {
			var linkNode = linkNodes[j]
			if (linkNode == null || typeof linkNode.getAttribute != "function") {
				continue
			}
			var linkedAssetId = extractCatalogAssetIdFromHref(linkNode.getAttribute('href'))
			if (Number.isFinite(linkedAssetId) && linkedAssetId > 0) {
				return linkedAssetId
			}
		}
		var thumbAnchor = cardContainer.querySelector('a.item-card-thumb-container[href], a.item-card-thumb-container')
		var nameAnchor = cardContainer.querySelector('a.item-card-name-link[href], a.item-card-name-link')
		var reactCandidates = [thumbAnchor, nameAnchor, cardContainer]
		for (var k = 0; k < reactCandidates.length; k++) {
			var reactCandidate = reactCandidates[k]
			if (reactCandidate == null) {
				continue
			}
			var reactAssetId = getAvatarAssetIdFromReactNode(reactCandidate)
			if (Number.isFinite(reactAssetId) && reactAssetId > 0) {
				return reactAssetId
			}
		}
	}
	return null
}

function isAvatarAssetEquippedInWearPayload(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0 || !Array.isArray(wearingAssetPayload)) {
		return false
	}
	for (var i = 0; i < wearingAssetPayload.length; i++) {
		var payloadEntry = wearingAssetPayload[i]
		var payloadAssetId = parseInt(payloadEntry != null && typeof payloadEntry == "object" ? payloadEntry.id : payloadEntry)
		if (Number.isFinite(payloadAssetId) && payloadAssetId == safeAssetId) {
			return true
		}
	}
	return false
}

function getAvatarEquippedAssetIdSetFromAssetIds(assetIds) {
	var equippedAssetIdSet = new Set()
	if (!Array.isArray(assetIds)) {
		return equippedAssetIdSet
	}
	for (var i = 0; i < assetIds.length; i++) {
		var assetEntry = assetIds[i]
		var candidateId = parseInt(assetEntry != null && typeof assetEntry == "object" ? assetEntry.id : assetEntry)
		if (Number.isFinite(candidateId) && candidateId > 0) {
			equippedAssetIdSet.add(candidateId)
		}
	}
	return equippedAssetIdSet
}

function getAvatarEquippedAssetSignature(assetIds) {
	var equippedAssetIdSet = getAvatarEquippedAssetIdSetFromAssetIds(assetIds)
	if (equippedAssetIdSet.size == 0) {
		return ""
	}
	var equippedIds = Array.from(equippedAssetIdSet)
	equippedIds.sort(function(a, b) {
		return a - b
	})
	return equippedIds.join(",")
}

function getAvatarSelectionItemId(candidateItem) {
	if (candidateItem == null || typeof candidateItem != "object") {
		return null
	}
	var idCandidates = [candidateItem.id, candidateItem.assetId, candidateItem.targetId, candidateItem.itemId]
	for (var i = 0; i < idCandidates.length; i++) {
		var candidateId = parseInt(idCandidates[i])
		if (Number.isFinite(candidateId) && candidateId > 0) {
			return candidateId
		}
	}
	return null
}

function isAvatarSelectionItemCandidate(candidateItem) {
	if (candidateItem == null || typeof candidateItem != "object") {
		return false
	}
	var candidateId = getAvatarSelectionItemId(candidateItem)
	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		return false
	}
	if (typeof candidateItem.type == "string" && candidateItem.type != "Asset") {
		return false
	}
	if (typeof candidateItem.itemType == "string" && candidateItem.itemType != "Asset") {
		return false
	}
	var hasAssetHint = false
	if (candidateItem.assetType != null && typeof candidateItem.assetType == "object") {
		hasAssetHint = true
	}
	if (!hasAssetHint && typeof candidateItem.thumbnailType == "string" && candidateItem.thumbnailType == "Asset") {
		hasAssetHint = true
	}
	if (!hasAssetHint && typeof candidateItem.type == "string" && candidateItem.type == "Asset") {
		hasAssetHint = true
	}
	if (!hasAssetHint && typeof candidateItem.itemType == "string" && candidateItem.itemType == "Asset") {
		hasAssetHint = true
	}
	if (!hasAssetHint && typeof candidateItem.link == "string" && extractCatalogAssetIdFromHref(candidateItem.link) == candidateId) {
		hasAssetHint = true
	}
	if (!hasAssetHint && (candidateItem.hasOwnProperty('selected') || candidateItem.hasOwnProperty('isSelected') || candidateItem.hasOwnProperty('equipped') || candidateItem.hasOwnProperty('isEquipped') || candidateItem.hasOwnProperty('itemStatus'))) {
		hasAssetHint = true
	}
	return hasAssetHint
}

function applyAvatarSelectionStateToCandidateItem(candidateItem, equippedAssetIdSet, seenItems) {
	if (!isAvatarSelectionItemCandidate(candidateItem)) {
		return 0
	}
	if (seenItems != null && seenItems.has(candidateItem)) {
		return 0
	}
	var candidateId = getAvatarSelectionItemId(candidateItem)
	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		return 0
	}
	if (seenItems != null) {
		seenItems.add(candidateItem)
	}
	applyAvatarCardSelectionStateToItemObject(candidateItem, equippedAssetIdSet.has(candidateId))
	return 1
}

function getAvatarReactRootFiberFromNode(containerNode) {
	if (containerNode == null || typeof containerNode != "object") {
		return null
	}
	var nodeKeys = []
	try {
		nodeKeys = Object.keys(containerNode)
	} catch (e) {
		nodeKeys = []
	}
	for (var i = 0; i < nodeKeys.length; i++) {
		var key = nodeKeys[i]
		if (!key.startsWith("__reactContainer$")) {
			continue
		}
		var reactContainer = containerNode[key]
		if (reactContainer == null || typeof reactContainer != "object") {
			continue
		}
		if (reactContainer.current != null && typeof reactContainer.current == "object") {
			return reactContainer.current
		}
		if (reactContainer.stateNode != null && reactContainer.stateNode.current != null && typeof reactContainer.stateNode.current == "object") {
			return reactContainer.stateNode.current
		}
		if ((reactContainer.child != null || reactContainer.sibling != null) && reactContainer.memoizedProps != null) {
			return reactContainer
		}
	}
	return null
}

function getAvatarReactRootFiber() {
	var rootSelectors = ['#avatar-react-container', '#avatar-web-app']
	for (var i = 0; i < rootSelectors.length; i++) {
		var rootNode = document.querySelector(rootSelectors[i])
		if (rootNode == null) {
			continue
		}
		var rootFiber = getAvatarReactRootFiberFromNode(rootNode)
		if (rootFiber != null) {
			return rootFiber
		}
	}
	var avatarRootContainer = document.querySelector('#avatar-react-container .tab-content')
	if (avatarRootContainer != null) {
		var nestedRootFiber = getAvatarReactRootFiberFromNode(avatarRootContainer)
		if (nestedRootFiber != null) {
			return nestedRootFiber
		}
	}
	return null
}

function getAvatarObjectKeysSafe(value) {
	if (value == null || typeof value != "object") {
		return []
	}
	try {
		return Object.keys(value)
	} catch (e) {
		return []
	}
}

function isAvatarEquippedIdCollectionKey(candidateKey) {
	if (typeof candidateKey != "string" || candidateKey.length == 0) {
		return false
	}
	var normalizedKey = candidateKey.toLowerCase()
	if (normalizedKey.indexOf("asset") < 0) {
		return false
	}
	var hasEquippedStateHint = (
		normalizedKey.indexOf("equipped") >= 0 ||
		normalizedKey.indexOf("selected") >= 0 ||
		normalizedKey.indexOf("wearing") >= 0 ||
		normalizedKey.indexOf("worn") >= 0 ||
		normalizedKey.indexOf("active") >= 0
	)
	if (!hasEquippedStateHint) {
		return false
	}
	return (
		normalizedKey.indexOf("id") >= 0 ||
		normalizedKey.endsWith("ids") ||
		normalizedKey.indexOf("set") >= 0
	)
}

function syncAvatarEquippedIdArrayCollection(collectionValue, equippedAssetIdList) {
	if (!Array.isArray(collectionValue)) {
		return 0
	}
	for (var i = 0; i < collectionValue.length; i++) {
		var entry = collectionValue[i]
		if (entry == null) {
			continue
		}
		var entryType = typeof entry
		if (entryType == "number" || entryType == "string") {
			continue
		}
		return 0
	}
	var currentIds = []
	for (var j = 0; j < collectionValue.length; j++) {
		var parsedId = parseInt(collectionValue[j])
		if (Number.isFinite(parsedId) && parsedId > 0) {
			currentIds.push(parsedId)
		}
	}
	currentIds.sort(function(a, b) {
		return a - b
	})
	var sameLength = currentIds.length == equippedAssetIdList.length
	var sameValues = sameLength
	for (var k = 0; k < currentIds.length && sameValues; k++) {
		if (currentIds[k] != equippedAssetIdList[k]) {
			sameValues = false
		}
	}
	if (sameValues) {
		return 0
	}
	collectionValue.splice(0, collectionValue.length)
	for (var n = 0; n < equippedAssetIdList.length; n++) {
		collectionValue.push(equippedAssetIdList[n])
	}
	return 1
}

function syncAvatarEquippedIdSetCollection(collectionValue, equippedAssetIdList) {
	var setTag = Object.prototype.toString.call(collectionValue)
	if (setTag != "[object Set]") {
		return 0
	}
	var currentIds = []
	try {
		collectionValue.forEach(function(entry) {
			var parsedId = parseInt(entry)
			if (Number.isFinite(parsedId) && parsedId > 0) {
				currentIds.push(parsedId)
			}
		})
	} catch (e) {
		return 0
	}
	currentIds.sort(function(a, b) {
		return a - b
	})
	var sameLength = currentIds.length == equippedAssetIdList.length
	var sameValues = sameLength
	for (var i = 0; i < currentIds.length && sameValues; i++) {
		if (currentIds[i] != equippedAssetIdList[i]) {
			sameValues = false
		}
	}
	if (sameValues) {
		return 0
	}
	try {
		collectionValue.clear()
		for (var j = 0; j < equippedAssetIdList.length; j++) {
			collectionValue.add(equippedAssetIdList[j])
		}
		return 1
	} catch (e2) {
		return 0
	}
}

function syncAvatarSelectionCollectionByKey(value, parentKey, equippedAssetIdList) {
	if (!isAvatarEquippedIdCollectionKey(parentKey)) {
		return 0
	}
	var updatedCount = 0
	updatedCount += syncAvatarEquippedIdArrayCollection(value, equippedAssetIdList)
	updatedCount += syncAvatarEquippedIdSetCollection(value, equippedAssetIdList)
	return updatedCount
}

function syncAvatarSelectionStateInReactValue(value, equippedAssetIdSet, equippedAssetIdList, seenValues, seenItems, budget, depth = 0, parentKey = "") {
	if (value == null || typeof value != "object" || depth > 5) {
		return 0
	}
	if (budget.remaining <= 0) {
		return 0
	}
	if (seenValues.has(value)) {
		return 0
	}
	seenValues.add(value)
	budget.remaining -= 1
	var updatedCount = 0
	updatedCount += syncAvatarSelectionCollectionByKey(value, parentKey, equippedAssetIdList)
	updatedCount += applyAvatarSelectionStateToCandidateItem(value, equippedAssetIdSet, seenItems)
	if (budget.remaining <= 0) {
		return updatedCount
	}
	if (Array.isArray(value)) {
		for (var i = 0; i < value.length; i++) {
			if (budget.remaining <= 0) {
				break
			}
			updatedCount += syncAvatarSelectionStateInReactValue(value[i], equippedAssetIdSet, equippedAssetIdList, seenValues, seenItems, budget, depth + 1, parentKey)
		}
		return updatedCount
	}
	var valueKeys = getAvatarObjectKeysSafe(value)
	for (var keyIndex = 0; keyIndex < valueKeys.length; keyIndex++) {
		if (budget.remaining <= 0) {
			break
		}
		var childValue = null
		try {
			childValue = value[valueKeys[keyIndex]]
		} catch (e) {
			childValue = null
		}
		if (childValue == null || typeof childValue != "object") {
			continue
		}
		updatedCount += syncAvatarSelectionStateInReactValue(
			childValue,
			equippedAssetIdSet,
			equippedAssetIdList,
			seenValues,
			seenItems,
			budget,
			depth + 1,
			valueKeys[keyIndex]
		)
	}
	return updatedCount
}

function syncAvatarReactItemSelectionStateFromAssetIds(assetIds) {
	try {
		var syncOptions = arguments.length > 1 && arguments[1] != null && typeof arguments[1] == "object" ? arguments[1] : null
		var forceSync = syncOptions != null && syncOptions.force === true
		var payloadSignature = getAvatarEquippedAssetSignature(assetIds)
		if (!forceSync && payloadSignature == avatarReactSelectionSyncSignature) {
			return 0
		}
		var equippedAssetIdSet = getAvatarEquippedAssetIdSetFromAssetIds(assetIds)
		var equippedAssetIdList = Array.from(equippedAssetIdSet)
		equippedAssetIdList.sort(function(a, b) {
			return a - b
		})
		if (equippedAssetIdSet.size == 0 && (!Array.isArray(assetIds) || assetIds.length == 0)) {
			avatarReactSelectionSyncSignature = payloadSignature
			return 0
		}
		var rootFiber = getAvatarReactRootFiber()
		if (rootFiber == null) {
			return 0
		}
		var stack = [rootFiber]
		var seenFibers = new Set()
		var seenValues = new Set()
		var seenItems = new Set()
		var budget = {remaining: 7000}
		var updatedCount = 0
		while (stack.length > 0 && budget.remaining > 0) {
			var fiber = stack.pop()
			if (fiber == null || typeof fiber != "object" || seenFibers.has(fiber)) {
				continue
			}
			seenFibers.add(fiber)
			if (fiber.sibling != null) {
				stack.push(fiber.sibling)
			}
			if (fiber.child != null) {
				stack.push(fiber.child)
			}
			updatedCount += syncAvatarSelectionStateInReactValue(fiber.memoizedProps, equippedAssetIdSet, equippedAssetIdList, seenValues, seenItems, budget, 0, "")
			updatedCount += syncAvatarSelectionStateInReactValue(fiber.memoizedState, equippedAssetIdSet, equippedAssetIdList, seenValues, seenItems, budget, 0, "")
			updatedCount += syncAvatarSelectionStateInReactValue(fiber.updateQueue, equippedAssetIdSet, equippedAssetIdList, seenValues, seenItems, budget, 0, "")
		}
		avatarReactSelectionSyncSignature = payloadSignature
		return updatedCount
	} catch (e) {
		return 0
	}
}

function applyAvatarCardSelectionStateToItemObject(itemState, isEquipped) {
	if (itemState == null || typeof itemState != "object") {
		return
	}
	itemState.selected = isEquipped === true
	itemState.isSelected = isEquipped === true
	itemState.equipped = isEquipped === true
	itemState.isEquipped = isEquipped === true
	if (typeof itemState.itemStatus == "string") {
		itemState.itemStatus = isEquipped ? "equipped" : "available"
	}
}

function applyAvatarCardSelectionStateIfAssetMatches(candidateItem, targetAssetId, isEquipped, seenItems) {
	if (candidateItem == null || typeof candidateItem != "object") {
		return
	}
	if (seenItems != null && seenItems.has(candidateItem)) {
		return
	}
	var candidateId = parseInt(candidateItem.id)
	if (!Number.isFinite(candidateId) || candidateId <= 0 || candidateId != targetAssetId) {
		return
	}
	if (seenItems != null) {
		seenItems.add(candidateItem)
	}
	applyAvatarCardSelectionStateToItemObject(candidateItem, isEquipped)
}

function syncAvatarCardReactSelectionState(cardContainer, isEquipped) {
	if (cardContainer == null || typeof cardContainer.querySelector != "function") {
		return
	}
	var cardAssetId = getAvatarAssetIdFromCardContainer(cardContainer)
	if (!Number.isFinite(cardAssetId) || cardAssetId <= 0) {
		return
	}
	var seenItems = new Set()
	var thumbAnchor = cardContainer.querySelector('a.item-card-thumb-container[href], a.item-card-thumb-container')
	var nameAnchor = cardContainer.querySelector('a.item-card-name-link[href], a.item-card-name-link')
	var reactCandidates = [thumbAnchor, nameAnchor, cardContainer]
	for (var i = 0; i < reactCandidates.length; i++) {
		var reactCandidate = reactCandidates[i]
		if (reactCandidate == null) {
			continue
		}
		var fiber = getReactFiberNode(reactCandidate)
		if (fiber == null) {
			continue
		}
		var cursor = fiber
		var depth = 0
		while (cursor != null && depth < 80) {
			var memoizedProps = cursor.memoizedProps
			if (memoizedProps != null && typeof memoizedProps == "object") {
				var templateItem = getAvatarNativeItemTemplateFromProps(memoizedProps)
				applyAvatarCardSelectionStateIfAssetMatches(templateItem, cardAssetId, isEquipped, seenItems)
				var directItemKeys = ["item", "activeItem", "selectedItem", "asset", "avatarItem", "rowItem", "entry"]
				for (var keyIndex = 0; keyIndex < directItemKeys.length; keyIndex++) {
					var directItem = memoizedProps[directItemKeys[keyIndex]]
					applyAvatarCardSelectionStateIfAssetMatches(directItem, cardAssetId, isEquipped, seenItems)
				}
				if (Array.isArray(memoizedProps.items)) {
					for (var itemIndex = 0; itemIndex < memoizedProps.items.length; itemIndex++) {
						applyAvatarCardSelectionStateIfAssetMatches(memoizedProps.items[itemIndex], cardAssetId, isEquipped, seenItems)
					}
				}
			}
			cursor = cursor.return
			depth += 1
		}
	}
}

function syncAvatarSelectionStateFromCollection(collection, equippedAssetIdSet, seenItems) {
	if (!Array.isArray(collection)) {
		return 0
	}
	var updatedCount = 0
	for (var i = 0; i < collection.length; i++) {
		updatedCount += applyAvatarSelectionStateToCandidateItem(collection[i], equippedAssetIdSet, seenItems)
	}
	return updatedCount
}

function syncAvatarSelectionStateFromCollectionHolder(holder, equippedAssetIdSet, seenCollections, seenItems) {
	if (holder == null || typeof holder != "object") {
		return 0
	}
	var updatedCount = 0
	var directCollectionKeys = ["items", "visibleItems", "allItems", "assetItems", "catalogItems", "results", "entries", "rowItems"]
	for (var i = 0; i < directCollectionKeys.length; i++) {
		var collection = holder[directCollectionKeys[i]]
		if (!Array.isArray(collection) || seenCollections.has(collection)) {
			continue
		}
		seenCollections.add(collection)
		updatedCount += syncAvatarSelectionStateFromCollection(collection, equippedAssetIdSet, seenItems)
	}
	return updatedCount
}

function syncAvatarPanelItemCollectionsFromAssetIds(assetIds) {
	var equippedAssetIdSet = getAvatarEquippedAssetIdSetFromAssetIds(assetIds)
	var nativeCards = getAvatarNativeCardContainers()
	if (nativeCards.length == 0) {
		return 0
	}
	var seenCollections = new Set()
	var seenItems = new Set()
	var updatedCount = 0
	for (var cardIndex = 0; cardIndex < nativeCards.length; cardIndex++) {
		var cardContainer = nativeCards[cardIndex]
		if (cardContainer == null || typeof cardContainer.querySelector != "function") {
			continue
		}
		var thumbAnchor = cardContainer.querySelector('a.item-card-thumb-container[href], a.item-card-thumb-container')
		var nameAnchor = cardContainer.querySelector('a.item-card-name-link[href], a.item-card-name-link')
		var reactCandidates = [thumbAnchor, nameAnchor, cardContainer]
		for (var candidateIndex = 0; candidateIndex < reactCandidates.length; candidateIndex++) {
			var reactCandidate = reactCandidates[candidateIndex]
			if (reactCandidate == null) {
				continue
			}
			var fiber = getReactFiberNode(reactCandidate)
			if (fiber == null) {
				continue
			}
			var cursor = fiber
			var depth = 0
			while (cursor != null && depth < 80) {
				var memoizedProps = cursor.memoizedProps
				if (memoizedProps != null && typeof memoizedProps == "object") {
					updatedCount += syncAvatarSelectionStateFromCollectionHolder(memoizedProps, equippedAssetIdSet, seenCollections, seenItems)
				}
				var memoizedState = cursor.memoizedState
				if (memoizedState != null && typeof memoizedState == "object") {
					updatedCount += syncAvatarSelectionStateFromCollectionHolder(memoizedState, equippedAssetIdSet, seenCollections, seenItems)
				}
				cursor = cursor.return
				depth += 1
			}
		}
	}
	return updatedCount
}


function syncAvatarCardEquippedState(cardContainer, isEquipped) {
	if (cardContainer == null || typeof cardContainer.querySelector != "function") {
		return
	}
	var equippedValue = isEquipped ? 'equipped' : 'available'
	var selectedValue = isEquipped ? 'true' : 'false'
	function setCardAttributeIfNeeded(node, attributeName, attributeValue) {
		if (node == null || typeof node.getAttribute != "function" || typeof node.setAttribute != "function") {
			return
		}
		if (node.getAttribute(attributeName) === attributeValue) {
			return
		}
		node.setAttribute(attributeName, attributeValue)
	}
	if (typeof cardContainer.setAttribute == "function") {
		setCardAttributeIfNeeded(cardContainer, 'data-item-status', equippedValue)
		setCardAttributeIfNeeded(cardContainer, 'aria-checked', selectedValue)
		setCardAttributeIfNeeded(cardContainer, 'aria-selected', selectedValue)
	}
	var statusNodes = cardContainer.querySelectorAll('[data-item-status]')
	for (var i = 0; i < statusNodes.length; i++) {
		var statusNode = statusNodes[i]
		if (statusNode == null) {
			continue
		}
		setCardAttributeIfNeeded(statusNode, 'data-item-status', equippedValue)
	}
	var ariaNodes = cardContainer.querySelectorAll('[aria-checked], [aria-selected], [aria-pressed]')
	for (var j = 0; j < ariaNodes.length; j++) {
		var ariaNode = ariaNodes[j]
		if (ariaNode == null || typeof ariaNode.hasAttribute != "function") {
			continue
		}
		if (ariaNode.hasAttribute('aria-checked')) {
			setCardAttributeIfNeeded(ariaNode, 'aria-checked', selectedValue)
		}
		if (ariaNode.hasAttribute('aria-selected')) {
			setCardAttributeIfNeeded(ariaNode, 'aria-selected', selectedValue)
		}
		if (ariaNode.hasAttribute('aria-pressed')) {
			setCardAttributeIfNeeded(ariaNode, 'aria-pressed', selectedValue)
		}
	}
	syncAvatarCardReactSelectionState(cardContainer, isEquipped)
	var equippedNode = cardContainer.querySelector('.item-card-equipped')
	if (equippedNode == null && isEquipped) {
		var captionNode = cardContainer.querySelector('.item-card-caption')
		if (captionNode != null && typeof captionNode.insertBefore == "function") {
			equippedNode = document.createElement('div')
			equippedNode.className = 'item-card-equipped'
			equippedNode.setAttribute('data-item-status', 'equipped')
			var equippedLabelNode = document.createElement('div')
			equippedLabelNode.className = 'item-card-equipped-label'
			var equippedCheckNode = document.createElement('span')
			equippedCheckNode.className = 'icon-check-selection'
			equippedCheckNode.setAttribute('aria-hidden', 'false')
			equippedNode.appendChild(equippedLabelNode)
			equippedNode.appendChild(equippedCheckNode)
			var nameLinkNode = captionNode.querySelector('a.item-card-name-link')
			if (nameLinkNode != null && nameLinkNode.parentNode === captionNode) {
				captionNode.insertBefore(equippedNode, nameLinkNode)
			} else if (captionNode.firstChild != null) {
				captionNode.insertBefore(equippedNode, captionNode.firstChild)
			} else {
				captionNode.appendChild(equippedNode)
			}
		}
	}
	var equippedNodes = cardContainer.querySelectorAll('.item-card-equipped')
	if (equippedNodes.length == 0) {
		return
	}
	var iconDisplayValue = isEquipped ? "" : "none"
	var iconAriaValue = isEquipped ? 'false' : 'true'
	for (var equippedNodeIndex = 0; equippedNodeIndex < equippedNodes.length; equippedNodeIndex++) {
		var currentEquippedNode = equippedNodes[equippedNodeIndex]
		if (currentEquippedNode == null || typeof currentEquippedNode.setAttribute != "function") {
			continue
		}
		setCardAttributeIfNeeded(currentEquippedNode, 'data-item-status', equippedValue)
		if (currentEquippedNode.classList != null && typeof currentEquippedNode.classList.add == "function") {
			if (isEquipped) {
				currentEquippedNode.classList.remove('ng-hide')
			} else {
				currentEquippedNode.classList.add('ng-hide')
			}
		}
		if (isEquipped) {
			if (currentEquippedNode.hasAttribute('hidden')) {
				currentEquippedNode.removeAttribute('hidden')
			}
			if (currentEquippedNode.style != null && currentEquippedNode.style.display != "") {
				currentEquippedNode.style.display = ""
			}
		} else {
			if (!currentEquippedNode.hasAttribute('hidden')) {
				currentEquippedNode.setAttribute('hidden', 'hidden')
			}
			if (currentEquippedNode.style != null && currentEquippedNode.style.display != "none") {
				currentEquippedNode.style.display = "none"
			}
		}
		var checkIcons = currentEquippedNode.querySelectorAll('.icon-check-selection')
		for (var iconIndex = 0; iconIndex < checkIcons.length; iconIndex++) {
			var checkIcon = checkIcons[iconIndex]
			if (checkIcon != null && checkIcon.style != null && checkIcon.style.display != iconDisplayValue) {
				checkIcon.style.display = iconDisplayValue
			}
			setCardAttributeIfNeeded(checkIcon, 'aria-hidden', iconAriaValue)
		}
	}
}

function syncAvatarInventoryEquippedStateFromAssetIds(assetIds) {
	var syncOptions = arguments.length > 1 && arguments[1] != null && typeof arguments[1] == "object" ? arguments[1] : null
	var forceReactRoot = syncOptions != null && (syncOptions.forceReactRoot === true || syncOptions.force === true)
	var payloadToSync = Array.isArray(assetIds) ? assetIds : wearingAssetPayload
	var equippedAssetIdSet = getAvatarEquippedAssetIdSetFromAssetIds(payloadToSync)
	var nativeCards = getAvatarNativeCardContainers()
	for (var j = 0; j < nativeCards.length; j++) {
		var card = nativeCards[j]
		var cardAssetId = getAvatarAssetIdFromCardContainer(card)
		if (!Number.isFinite(cardAssetId) || cardAssetId <= 0) {
			continue
		}
		syncAvatarCardEquippedState(card, equippedAssetIdSet.has(cardAssetId))
	}
	syncAvatarPanelItemCollectionsFromAssetIds(payloadToSync)
	syncAvatarReactItemSelectionStateFromAssetIds(payloadToSync, {force: forceReactRoot})
}

function getAvatarAssetIdFromReactNode(node) {
	var fiber = getReactFiberNode(node)
	if (fiber == null) {
		return null
	}
	var cursor = fiber
	var depth = 0
	while (cursor != null && depth < 60) {
		var memoizedProps = cursor.memoizedProps
		if (memoizedProps != null && typeof memoizedProps == "object") {
			var templateItem = getAvatarNativeItemTemplateFromProps(memoizedProps)
			if (templateItem != null) {
				var templateId = parseInt(templateItem.id)
				if (Number.isFinite(templateId) && templateId > 0) {
					return templateId
				}
			}
			var directIdCandidates = [memoizedProps.assetId, memoizedProps.itemId, memoizedProps.targetId, memoizedProps.id]
			for (var i = 0; i < directIdCandidates.length; i++) {
				var candidateId = parseInt(directIdCandidates[i])
				if (Number.isFinite(candidateId) && candidateId > 0) {
					return candidateId
				}
			}
		}
		cursor = cursor.return
		depth += 1
	}
	return null
}

function isAvatarCardMarkedEquipped(cardContainer) {
	if (cardContainer == null || typeof cardContainer.querySelector != "function") {
		return false
	}
	function isAvatarSelectionNodeHidden(node) {
		if (node == null || typeof node != "object") {
			return true
		}
		if (typeof node.hasAttribute == "function" && node.hasAttribute('hidden')) {
			return true
		}
		if (typeof node.getAttribute == "function") {
			var ariaHidden = (node.getAttribute('aria-hidden') || "").toLowerCase()
			if (ariaHidden == "true") {
				return true
			}
		}
		if (node.classList != null && typeof node.classList.contains == "function" && node.classList.contains('ng-hide')) {
			return true
		}
		if (node.style != null) {
			if (node.style.display == "none") {
				return true
			}
			if (node.style.visibility == "hidden") {
				return true
			}
		}
		return false
	}
	if (typeof cardContainer.getAttribute == "function") {
		var containerStatus = (cardContainer.getAttribute('data-item-status') || "").toLowerCase()
		if (containerStatus == "equipped") {
			return true
		}
		var containerChecked = (cardContainer.getAttribute('aria-checked') || "").toLowerCase()
		if (containerChecked == "true") {
			return true
		}
		var containerSelected = (cardContainer.getAttribute('aria-selected') || "").toLowerCase()
		if (containerSelected == "true") {
			return true
		}
	}
	var attributeSelectedNodes = cardContainer.querySelectorAll('[data-item-status="equipped"], [aria-checked="true"], [aria-selected="true"], [aria-pressed="true"]')
	for (var attributeNodeIndex = 0; attributeNodeIndex < attributeSelectedNodes.length; attributeNodeIndex++) {
		var attributeSelectedNode = attributeSelectedNodes[attributeNodeIndex]
		if (!isAvatarSelectionNodeHidden(attributeSelectedNode)) {
			return true
		}
	}
	var equippedNodes = cardContainer.querySelectorAll('.item-card-equipped')
	for (var equippedNodeIndex = 0; equippedNodeIndex < equippedNodes.length; equippedNodeIndex++) {
		var equippedNode = equippedNodes[equippedNodeIndex]
		if (isAvatarSelectionNodeHidden(equippedNode)) {
			continue
		}
		var equippedStatus = ""
		if (typeof equippedNode.getAttribute == "function") {
			equippedStatus = (equippedNode.getAttribute('data-item-status') || "").toLowerCase()
		}
		if (equippedStatus == "available") {
			continue
		}
		if (equippedStatus == "equipped") {
			return true
		}
		var checkIcons = equippedNode.querySelectorAll('.icon-check-selection')
		for (var iconIndex = 0; iconIndex < checkIcons.length; iconIndex++) {
			if (!isAvatarSelectionNodeHidden(checkIcons[iconIndex])) {
				return true
			}
		}
	}
	return false
}

function getReactClickHandler(node) {
	if (node == null || typeof node != "object") {
		return null
	}
	var nodeKeys = Object.keys(node)
	for (var i = 0; i < nodeKeys.length; i++) {
		var key = nodeKeys[i]
		if (!key.startsWith("__reactProps$") && !key.startsWith("__reactEventHandlers$")) {
			continue
		}
		var reactProps = node[key]
		if (reactProps != null && typeof reactProps.onClick == "function") {
			return reactProps.onClick
		}
	}
	return null
}

function triggerSingleDomClick(node) {
	if (node == null) {
		return false
	}
	var reactClickHandler = getReactClickHandler(node)
	if (typeof reactClickHandler == "function") {
		try {
			var defaultPrevented = false
			var propagationStopped = false
			reactClickHandler.call(node, {
				type: "click",
				button: 0,
				buttons: 1,
				target: node,
				currentTarget: node,
				nativeEvent: {
					type: "click",
					target: node,
					currentTarget: node,
					preventDefault: function() {
						defaultPrevented = true
					},
					stopPropagation: function() {
						propagationStopped = true
					}
				},
				preventDefault: function() {
					defaultPrevented = true
				},
				stopPropagation: function() {
					propagationStopped = true
				},
				persist: function() {},
				isDefaultPrevented: function() {
					return defaultPrevented
				},
				isPropagationStopped: function() {
					return propagationStopped
				}
			})
			return true
		} catch (e) {}
	}
	var navigationGuard = null
	if (node.tagName == "A") {
		navigationGuard = function(event) {
			if (event == null || event.isTrusted || !event.cancelable) {
				return
			}
			var matchesTarget = event.target === node
			if (!matchesTarget && typeof event.composedPath == "function") {
				var path = event.composedPath()
				matchesTarget = Array.isArray(path) && path.indexOf(node) >= 0
			}
			if (!matchesTarget && event.target != null && typeof event.target.closest == "function") {
				matchesTarget = event.target.closest('a') === node
			}
			if (matchesTarget) {
				event.preventDefault()
			}
		}
		document.addEventListener("click", navigationGuard, true)
	}
	try {
		if (typeof node.focus == "function") {
			node.focus()
		}
		if (typeof node.click == "function") {
			node.click()
			return true
		}
		return false
	} catch (e) {}
	finally {
		if (navigationGuard != null) {
			document.removeEventListener("click", navigationGuard, true)
		}
	}
	return false
}

function getReactFiberNode(node) {
	if (node == null || typeof node != "object") {
		return null
	}
	var nodeKeys = Object.keys(node)
	for (var i = 0; i < nodeKeys.length; i++) {
		var key = nodeKeys[i]
		if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
			return node[key]
		}
	}
	return null
}

function getAvatarNativeToggleHandlerFromProps(reactProps) {
	if (reactProps == null || typeof reactProps != "object") {
		return null
	}
	var preferredKeys = [
		"onItemClicked",
		"onItemClick",
		"onAvatarItemClicked",
		"onCardClick",
		"onCardClicked",
		"onToggleItem",
		"onClickItem"
	]
	for (var i = 0; i < preferredKeys.length; i++) {
		var key = preferredKeys[i]
		if (typeof reactProps[key] == "function") {
			return reactProps[key]
		}
	}
	return null
}

function getAvatarNativeItemTemplateFromProps(reactProps) {
	if (reactProps == null || typeof reactProps != "object") {
		return null
	}
	var templateKeys = ["item", "activeItem", "selectedItem", "asset", "avatarItem"]
	for (var i = 0; i < templateKeys.length; i++) {
		var candidate = reactProps[templateKeys[i]]
		if (candidate == null || typeof candidate != "object") {
			continue
		}
		var candidateId = parseInt(candidate.id)
		if (!Number.isFinite(candidateId) || candidateId <= 0) {
			continue
		}
		if (typeof candidate.type == "string" && candidate.type != "Asset") {
			continue
		}
		return candidate
	}
	return null
}

function getAvatarNativeToggleBridgeFromNode(node) {
	var fiber = getReactFiberNode(node)
	if (fiber == null) {
		return null
	}
	var bridge = {
		eventTarget: node,
		onItemClicked: null,
		itemTemplate: null
	}
	var depth = 0
	var cursor = fiber
	while (cursor != null && depth < 80) {
		var memoizedProps = cursor.memoizedProps
		if (memoizedProps != null && typeof memoizedProps == "object") {
			if (bridge.onItemClicked == null) {
				bridge.onItemClicked = getAvatarNativeToggleHandlerFromProps(memoizedProps)
			}
			if (bridge.itemTemplate == null) {
				bridge.itemTemplate = getAvatarNativeItemTemplateFromProps(memoizedProps)
			}
			if (typeof bridge.onItemClicked == "function" && bridge.itemTemplate != null) {
				return bridge
			}
		}
		cursor = cursor.return
		depth += 1
	}
	if (typeof bridge.onItemClicked == "function") {
		return bridge
	}
	return null
}

function getAvatarNativeToggleBridgeFromCard(cardContainer) {
	if (cardContainer == null || typeof cardContainer.querySelector != "function") {
		return null
	}
	var thumbAnchor = cardContainer.querySelector('a.item-card-thumb-container[href]')
	var nameAnchor = cardContainer.querySelector('a.item-card-name-link[href]')
	var bridgeCandidates = [thumbAnchor, nameAnchor, cardContainer]
	for (var i = 0; i < bridgeCandidates.length; i++) {
		var bridgeCandidate = bridgeCandidates[i]
		if (bridgeCandidate == null) {
			continue
		}
		var bridge = getAvatarNativeToggleBridgeFromNode(bridgeCandidate)
		if (bridge != null && typeof bridge.onItemClicked == "function") {
			return bridge
		}
	}
	return null
}

function getAvatarNativeToggleBridge(preferredCardContainer = null) {
	if (preferredCardContainer != null) {
		var preferredBridge = getAvatarNativeToggleBridgeFromCard(preferredCardContainer)
		if (preferredBridge != null) {
			return preferredBridge
		}
	}
	var nativeCards = getAvatarNativeCardContainers()
	for (var i = 0; i < nativeCards.length; i++) {
		var card = nativeCards[i]
		if (card == null || card === preferredCardContainer) {
			continue
		}
		var cardBridge = getAvatarNativeToggleBridgeFromCard(card)
		if (cardBridge != null) {
			return cardBridge
		}
	}
	return null
}

function buildSyntheticAvatarNativeToggleEvent(targetNode) {
	var defaultPrevented = false
	var propagationStopped = false
	return {
		type: "click",
		button: 0,
		buttons: 1,
		target: targetNode,
		currentTarget: targetNode,
		nativeEvent: {
			type: "click",
			target: targetNode,
			currentTarget: targetNode,
			preventDefault: function() {
				defaultPrevented = true
			},
			stopPropagation: function() {
				propagationStopped = true
			}
		},
		preventDefault: function() {
			defaultPrevented = true
		},
		stopPropagation: function() {
			propagationStopped = true
		},
		persist: function() {},
		isDefaultPrevented: function() {
			return defaultPrevented
		},
		isPropagationStopped: function() {
			return propagationStopped
		}
	}
}

function triggerAvatarNativeToggleBridge(assetId, currentlySelected, preferredAssetTypeName = null, preferredCardContainer = null) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return false
	}
	var nativeBridge = getAvatarNativeToggleBridge(preferredCardContainer)
	if (nativeBridge == null || typeof nativeBridge.onItemClicked != "function") {
		return false
	}
	var syntheticItem = buildAvatarNativeToggleItem(
		safeAssetId,
		currentlySelected === true,
		preferredAssetTypeName,
		nativeBridge.itemTemplate
	)
	if (syntheticItem == null) {
		return false
	}
	var eventTarget = nativeBridge.eventTarget != null ? nativeBridge.eventTarget : preferredCardContainer
	var syntheticEvent = buildSyntheticAvatarNativeToggleEvent(eventTarget)
	try {
		nativeBridge.onItemClicked(syntheticItem, syntheticEvent)
		return true
	} catch (e) {}
	return false
}

function getAvatarCardNativeClickTarget(cardContainer, includeEquippedBadgeFallback = false) {
	if (cardContainer == null || typeof cardContainer.querySelector != "function") {
		return null
	}
	var thumbAnchor = cardContainer.querySelector('a.item-card-thumb-container[href]')
	var nameAnchor = cardContainer.querySelector('a.item-card-name-link[href]')
	var clickTarget = null
	if (typeof getReactClickHandler(thumbAnchor) == "function") {
		clickTarget = thumbAnchor
	} else if (typeof getReactClickHandler(nameAnchor) == "function") {
		clickTarget = nameAnchor
	} else if (thumbAnchor != null) {
		clickTarget = thumbAnchor
	} else if (nameAnchor != null) {
		clickTarget = nameAnchor
	}
	if (clickTarget == null && includeEquippedBadgeFallback) {
		clickTarget = cardContainer.querySelector('.item-card-equipped')
	}
	return clickTarget
}

async function fetchAvatarWornStateByAssetId(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return null
	}
	var userId = getAvatarPageUserId()
	if (!Number.isFinite(userId) || userId <= 0) {
		return null
	}
	var currentlyWearing = await fetchCurrentlyWearing(userId)
	if (currentlyWearing == "ERROR" || currentlyWearing == null || typeof currentlyWearing != "object") {
		return null
	}
	if (!Array.isArray(currentlyWearing.assets)) {
		return null
	}
	return hasAvatarAssetInList(currentlyWearing.assets, safeAssetId)
}

async function waitForNativeAvatarUnequip(assetId, timeoutMs = 700, stepMs = 70) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return false
	}
	var observedCard = false
	var cardMissingAfterObservationTicks = 0
	var nextStateProbeAt = 0
	var elapsed = 0
	while (elapsed <= timeoutMs) {
		var card = getAvatarCardContainerByAssetId(safeAssetId)
		if (card != null) {
			observedCard = true
			cardMissingAfterObservationTicks = 0
		} else if (observedCard) {
			cardMissingAfterObservationTicks += 1
			if (cardMissingAfterObservationTicks >= 2) {
				return true
			}
		}
		if (card != null && !isAvatarCardMarkedEquipped(card)) {
			return true
		}
		if (card == null && elapsed >= nextStateProbeAt) {
			var wornState = await fetchAvatarWornStateByAssetId(safeAssetId)
			if (wornState === false) {
				return true
			}
			nextStateProbeAt = elapsed + Math.max(stepMs * 3, 300)
		}
		await delay(stepMs)
		elapsed += stepMs
	}
	var finalCard = getAvatarCardContainerByAssetId(safeAssetId)
	if (finalCard == null) {
		if (observedCard) {
			return true
		}
		var finalWornState = await fetchAvatarWornStateByAssetId(safeAssetId)
		return finalWornState === false
	}
	return !isAvatarCardMarkedEquipped(finalCard)
}

async function waitForNativeAvatarEquip(assetId, timeoutMs = 700, stepMs = 70) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return false
	}
	var observedCard = false
	var cardMissingAfterObservationTicks = 0
	var nextStateProbeAt = 0
	var elapsed = 0
	while (elapsed <= timeoutMs) {
		var card = getAvatarCardContainerByAssetId(safeAssetId)
		if (card != null) {
			observedCard = true
			cardMissingAfterObservationTicks = 0
		} else if (observedCard) {
			cardMissingAfterObservationTicks += 1
			if (cardMissingAfterObservationTicks >= 2) {
				return true
			}
		}
		if (card != null && isAvatarCardMarkedEquipped(card)) {
			return true
		}
		if (card == null && elapsed >= nextStateProbeAt) {
			var wornState = await fetchAvatarWornStateByAssetId(safeAssetId)
			if (wornState === true) {
				return true
			}
			nextStateProbeAt = elapsed + Math.max(stepMs * 3, 300)
		}
		await delay(stepMs)
		elapsed += stepMs
	}
	var finalCard = getAvatarCardContainerByAssetId(safeAssetId)
	if (finalCard == null) {
		if (observedCard) {
			return true
		}
		var finalWornState = await fetchAvatarWornStateByAssetId(safeAssetId)
		return finalWornState === true
	}
	return isAvatarCardMarkedEquipped(finalCard)
}

async function triggerNativeAvatarUnequip(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return false
	}
	var card = getAvatarCardContainerByAssetId(safeAssetId)
	if (card != null) {
		if (!isAvatarCardMarkedEquipped(card)) {
			return true
		}
		var clickTarget = getAvatarCardNativeClickTarget(card, true)
		if (clickTarget == null) {
			return false
		}
		var invokedCardClickHandler = triggerSingleDomClick(clickTarget)
		if (!invokedCardClickHandler) {
			return false
		}
		return await waitForNativeAvatarUnequip(safeAssetId, 2600, 110)
	}
	var initialWornState = await fetchAvatarWornStateByAssetId(safeAssetId)
	if (initialWornState === false) {
		return true
	}
	var invokedNativeBridge = triggerAvatarNativeToggleBridge(safeAssetId, true, null, card)
	if (!invokedNativeBridge) {
		return false
	}
	return await waitForNativeAvatarUnequip(safeAssetId, 2600, 110)
}

async function triggerNativeAvatarEquip(assetId, assetTypeName = null) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return false
	}
	var card = getAvatarCardContainerByAssetId(safeAssetId)
	if (card != null) {
		if (isAvatarCardMarkedEquipped(card)) {
			return true
		}
		var clickTarget = getAvatarCardNativeClickTarget(card)
		if (clickTarget == null) {
			return false
		}
		var invokedCardClickHandler = triggerSingleDomClick(clickTarget)
		if (!invokedCardClickHandler) {
			return false
		}
		return await waitForNativeAvatarEquip(safeAssetId, 2600, 110)
	}
	var initialWornState = await fetchAvatarWornStateByAssetId(safeAssetId)
	if (initialWornState === true) {
		return true
	}
	var invokedNativeBridge = triggerAvatarNativeToggleBridge(safeAssetId, false, assetTypeName, card)
	if (!invokedNativeBridge) {
		return false
	}
	return await waitForNativeAvatarEquip(safeAssetId, 2600, 110)
}

function removeAssetFromWearPayload(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return normalizeWearAssets(wearingAssetPayload)
	}
	var nextAssets = []
	for (var i = 0; i < wearingAssetPayload.length; i++) {
		var item = wearingAssetPayload[i]
		if (item != null && parseInt(item.id) != safeAssetId) {
			nextAssets.push(item)
		}
	}
	return normalizeWearAssets(nextAssets)
}

async function unequipItem(assetId) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return
	}
	setAvatarWearWriteStatus("unequip_clicked", "asset=" + safeAssetId)
	// Primary: let Roblox handle unequip natively so React state, card UI, and 3D preview stay consistent
	var nativeUnequip = await triggerNativeAvatarUnequip(safeAssetId)
	if (nativeUnequip) {
		setAvatarWearWriteStatus("native_unequip", "asset=" + safeAssetId)
		setTimeout(function() {
			loadCurrentlyWearing()
		}, 220)
		scheduleAvatarExternalSync(700)
		return
	}
	// Fallback: direct API when native handler unavailable
	setAvatarWearWriteStatus("native_unequip_unavailable", "asset=" + safeAssetId)
	var hydratedWearPayload = await ensureWearPayloadHydrated(false)
	if ((!Array.isArray(wearingAssetPayload) || wearingAssetPayload.length == 0) && !hydratedWearPayload) {
		setAvatarWearWriteStatus("hydrate_failed_unequip", "asset=" + safeAssetId)
		loadCurrentlyWearing()
		return
	}
	var nextWearPayload = removeAssetFromWearPayload(safeAssetId)
	if (nextWearPayload.length == wearingAssetPayload.length) {
		var refreshed = await ensureWearPayloadHydrated(true)
		if (refreshed) {
			nextWearPayload = removeAssetFromWearPayload(safeAssetId)
		}
	}
	if (nextWearPayload.length == wearingAssetPayload.length) {
		var awaitedPresence = await waitForWearPayloadAssetPresence(safeAssetId, true, 3, 180)
		if (awaitedPresence.resolved && awaitedPresence.present) {
			nextWearPayload = removeAssetFromWearPayload(safeAssetId)
		}
	}
	if (nextWearPayload.length == wearingAssetPayload.length) {
		setAvatarWearWriteStatus("unequip_nochange", "asset=" + safeAssetId)
		return
	}
	queueWearAssetsUpdate(nextWearPayload)
}

async function equipItem(assetId, assetTypeName) {
	var safeAssetId = parseInt(assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return
	}
	setAvatarWearWriteStatus("equip_clicked", "asset=" + safeAssetId)
	// Primary: let Roblox handle equip natively so React state, card UI, and 3D preview stay consistent
	var nativeEquip = await triggerNativeAvatarEquip(safeAssetId, assetTypeName)
	if (nativeEquip) {
		setAvatarWearWriteStatus("native_equip", "asset=" + safeAssetId)
		setTimeout(function() {
			loadCurrentlyWearing()
		}, 220)
		scheduleAvatarExternalSync(700)
		return
	}
	// Fallback: direct API when native handler unavailable
	setAvatarWearWriteStatus("native_equip_unavailable", "asset=" + safeAssetId)
	var hydratedWearPayload = await ensureWearPayloadHydrated(false)
	if ((!Array.isArray(wearingAssetPayload) || wearingAssetPayload.length == 0) && !hydratedWearPayload) {
		setAvatarWearWriteStatus("hydrate_failed_equip", "asset=" + safeAssetId)
		loadCurrentlyWearing()
		return
	}
	var nextAssets = []
	var alreadyWearing = false
	for (var i = 0; i < wearingAssetPayload.length; i++) {
		var item = wearingAssetPayload[i]
		if (item == null || typeof item != "object") {
			continue
		}
		if (parseInt(item.id) == safeAssetId) {
			alreadyWearing = true
		}
		nextAssets.push(item)
	}
	if (alreadyWearing) {
		var refreshed = await ensureWearPayloadHydrated(true)
		if (refreshed) {
			alreadyWearing = false
			nextAssets = []
			for (var r = 0; r < wearingAssetPayload.length; r++) {
				var refreshedItem = wearingAssetPayload[r]
				if (refreshedItem == null || typeof refreshedItem != "object") {
					continue
				}
				if (parseInt(refreshedItem.id) == safeAssetId) {
					alreadyWearing = true
				}
				nextAssets.push(refreshedItem)
			}
		}
	}
	if (alreadyWearing) {
		var awaitedAbsence = await waitForWearPayloadAssetPresence(safeAssetId, false, 3, 180)
		if (awaitedAbsence.resolved && !awaitedAbsence.present) {
			alreadyWearing = false
			nextAssets = []
			for (var rr = 0; rr < wearingAssetPayload.length; rr++) {
				var awaitedItem = wearingAssetPayload[rr]
				if (awaitedItem == null || typeof awaitedItem != "object") {
					continue
				}
				nextAssets.push(awaitedItem)
			}
		}
	}
	if (alreadyWearing) {
		setAvatarWearWriteStatus("equip_nochange", "asset=" + safeAssetId)
		return
	}
	var typeLimit = getAssetTypeLimit(assetTypeName)
	if (Number.isFinite(typeLimit) && typeLimit >= 0) {
		if (typeLimit == 0) {
			return
		}
		var sameTypeIds = []
		for (var j = 0; j < wearingAssetsDetails.length; j++) {
			var wornAsset = wearingAssetsDetails[j]
			if (wornAsset == null || wornAsset.assetType == null || typeof wornAsset.assetType.name != "string") {
				continue
			}
			if (wornAsset.assetType.name == assetTypeName) {
				var wornId = parseInt(wornAsset.id)
				if (Number.isFinite(wornId) && wornId > 0 && wornId != safeAssetId) {
					sameTypeIds.push(wornId)
				}
			}
		}
		var allowedExistingCount = Math.max(typeLimit - 1, 0)
		while (sameTypeIds.length > allowedExistingCount) {
			var removeId = sameTypeIds.shift()
			nextAssets = nextAssets.filter(function(assetItem) {
				return parseInt(assetItem.id) != removeId
			})
		}
	}
	var nextAsset = {id: safeAssetId}
	if (typeof assetTypeName == "string" && layeredClothingOrderByTypeName.hasOwnProperty(assetTypeName)) {
		nextAsset.meta = {order: layeredClothingOrderByTypeName[assetTypeName], version: 1}
	}
	nextAssets.push(nextAsset)
	var nextWearPayload = normalizeWearAssets(nextAssets)
	queueWearAssetsUpdate(nextWearPayload)
}

var thumbnailCache = {}
var thumbnailPendingRequests = {}
var thumbnailBatchQueuedIds = new Set()
var thumbnailBatchTimer = null
var thumbnailRenderModes = {}
var thumbnailBatchMaxRetries = 2
var thumbnailBatchRequestChunkSize = 60
var thumbnailDeferredRetryCounts = {}
var thumbnailDeferredRetryMax = 2

function extractThumbnailUrlFromResponse(value) {
	if (typeof value === "string") {
		return value
	}
	if (value == null || typeof value !== "object") {
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
	if (typeof roproApiAdapter.getSafeImageUrl === "function") {
		var safeUrl = roproApiAdapter.getSafeImageUrl(url.startsWith("//") ? "https:" + url : url)
		if (safeUrl == null || safeUrl.indexOf(thumbnailKnownFallbackToken) !== -1) {
			return null
		}
		return safeUrl
	}
	if (url.indexOf("//") === 0) {
		url = "https:" + url
	}
	if (/^http:\/\//i.test(url)) {
		url = url.replace(/^http:\/\//i, "https://")
	}
	if (
		!/^https?:\/\//i.test(url) &&
		!/^chrome-extension:\/\//i.test(url) &&
		!/^safari-web-extension:\/\//i.test(url)
	) {
		return null
	}
	if (url.indexOf(thumbnailKnownFallbackToken) !== -1) {
		return null
	}
	return url
}

function getThumbnailRenderMode(id) {
	var normalizedId = parseInt(id)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return {setSrc: true, setDataSrc: false}
	}
	if (!thumbnailRenderModes.hasOwnProperty(normalizedId)) {
		thumbnailRenderModes[normalizedId] = {setSrc: false, setDataSrc: false}
	}
	return thumbnailRenderModes[normalizedId]
}

function shouldShowQuickEquipThumbLoader(imageNode) {
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

function setQuickEquipThumbLoaderVisible(imageNode, visible) {
	if (imageNode == null || typeof imageNode.closest !== "function") {
		return
	}
	var thumbLink = imageNode.closest('.ropro-quick-equip-thumb-link')
	if (thumbLink == null || typeof thumbLink.getElementsByClassName !== "function") {
		return
	}
	var loader = thumbLink.getElementsByClassName('ropro-quick-equip-thumb-loader')[0]
	if (loader == null) {
		return
	}
	loader.style.display = visible ? "flex" : "none"
}

function syncQuickEquipThumbLoader(imageNode, forceLoading) {
	setQuickEquipThumbLoaderVisible(imageNode, forceLoading === true || shouldShowQuickEquipThumbLoader(imageNode))
}

function bindQuickEquipThumbLoader(imageNode) {
	if (imageNode == null || typeof imageNode.addEventListener !== "function") {
		return
	}
	if (imageNode.getAttribute('data-ropro-quick-equip-loader-bound') === "1") {
		return
	}
	imageNode.setAttribute('data-ropro-quick-equip-loader-bound', "1")
	imageNode.addEventListener('load', function() {
		syncQuickEquipThumbLoader(this, false)
	})
	imageNode.addEventListener('error', function() {
		syncQuickEquipThumbLoader(this, false)
	})
}

function setQuickEquipThumbLoaderForAssetId(assetId, forceLoading) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	$('.ropro-image-' + normalizedAssetId).each(function() {
		if (this == null || typeof this.closest !== "function" || this.closest('.ropro-quick-equip-thumb-link') == null) {
			return
		}
		bindQuickEquipThumbLoader(this)
		syncQuickEquipThumbLoader(this, forceLoading === true)
	})
}

function applyAssetThumbnail(id, url) {
	var normalizedId = parseInt(id)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return thumbnailFallbackUrl
	}
	var normalizedUrl = normalizeAssetThumbnailUrl(url) || thumbnailFallbackUrl
	var mode = getThumbnailRenderMode(normalizedId)
	$('.ropro-image-' + normalizedId).each(function() {
		bindQuickEquipThumbLoader(this)
		if (mode.setSrc && normalizedUrl !== thumbnailFallbackUrl) {
			syncQuickEquipThumbLoader(this, true)
		}
		var previousDataSrc = mode.setDataSrc ? this.getAttribute("data-src") : null
		this.onerror = function() {
			this.onerror = null
			this.src = thumbnailFallbackUrl
			if (mode.setDataSrc) {
				this.setAttribute("data-src", thumbnailFallbackUrl)
			}
			syncQuickEquipThumbLoader(this, false)
		}
		if (mode.setDataSrc) {
			this.setAttribute("data-src", normalizedUrl)
		}
		if (mode.setSrc) {
			this.src = normalizedUrl
			syncQuickEquipThumbLoader(this, false)
		} else {
			// If a lazy row already rendered fallback once, repaint it when a deferred retry resolves.
			if (mode.setDataSrc && previousDataSrc === "loaded" && normalizedUrl !== thumbnailFallbackUrl) {
				this.src = normalizedUrl
				this.setAttribute("data-src", "loaded")
			}
			syncQuickEquipThumbLoader(this, false)
		}
	})
	return normalizedUrl
}

function queueAssetThumbnailBatchFlush() {
	if (thumbnailBatchTimer != null) {
		return
	}
	thumbnailBatchTimer = setTimeout(flushAssetThumbnailBatchQueue, 40)
}

function fetchAssetThumbnailBatchChunk(ids) {
	return new Promise(resolve => {
		if (!Array.isArray(ids) || ids.length === 0) {
			resolve({})
			return
		}
		var settled = false
		var timeout = setTimeout(function() {
			if (settled) {
				return
			}
			settled = true
			resolve({})
		}, 10000)
		var payload = []
		for (var i = 0; i < ids.length; i++) {
			var normalizedId = parseInt(ids[i])
			if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
				continue
			}
			payload.push({
				requestId: normalizedId + ":undefined:Asset:150x150:webp:regular:0",
				type: "Asset",
				targetId: String(normalizedId),
				size: "150x150",
				format: "webp"
			})
		}
		if (payload.length === 0) {
			clearTimeout(timeout)
			resolve({})
			return
		}
		chrome.runtime.sendMessage(
			{greeting: "PostValidatedURL", url: "https://thumbnails.roblox.com/v1/batch", jsonData: payload},
			function(data) {
				if (settled) {
					return
				}
				settled = true
				clearTimeout(timeout)
				var urlsById = {}
				if (data != null && typeof data === "object" && Array.isArray(data.data)) {
					for (var j = 0; j < data.data.length; j++) {
						var row = data.data[j]
						var rowId = parseInt(row != null ? row.targetId : NaN)
						if (!Number.isFinite(rowId) || rowId <= 0) {
							if (row != null && typeof row.requestId === "string") {
								rowId = parseInt(row.requestId.split(":")[0])
							}
						}
						if (!Number.isFinite(rowId) || rowId <= 0) {
							continue
						}
						var normalizedUrl = normalizeAssetThumbnailUrl(row)
						if (normalizedUrl != null) {
							urlsById[rowId] = normalizedUrl
						}
					}
				}
				resolve(urlsById)
			}
		)
	})
}

async function fetchAssetThumbnailBatch(ids) {
	if (!Array.isArray(ids) || ids.length === 0) {
		return {}
	}
	var normalizedIds = []
	var seenIds = {}
	for (var i = 0; i < ids.length; i++) {
		var normalizedId = parseInt(ids[i])
		if (!Number.isFinite(normalizedId) || normalizedId <= 0 || seenIds[normalizedId]) {
			continue
		}
		seenIds[normalizedId] = true
		normalizedIds.push(normalizedId)
	}
	if (normalizedIds.length === 0) {
		return {}
	}
	var urlsById = {}
	for (var offset = 0; offset < normalizedIds.length; offset += thumbnailBatchRequestChunkSize) {
		var chunkIds = normalizedIds.slice(offset, offset + thumbnailBatchRequestChunkSize)
		var chunkUrls = await fetchAssetThumbnailBatchChunk(chunkIds)
		var chunkKeys = Object.keys(chunkUrls)
		for (var keyIndex = 0; keyIndex < chunkKeys.length; keyIndex++) {
			var chunkId = parseInt(chunkKeys[keyIndex])
			if (!Number.isFinite(chunkId) || chunkId <= 0) {
				continue
			}
			urlsById[chunkId] = chunkUrls[chunkKeys[keyIndex]]
		}
	}
	return urlsById
}

function scheduleDeferredAssetThumbnailRetry(assetId) {
	var normalizedId = parseInt(assetId)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return
	}
	var retryCount = thumbnailDeferredRetryCounts[normalizedId] || 0
	if (retryCount >= thumbnailDeferredRetryMax) {
		return
	}
	thumbnailDeferredRetryCounts[normalizedId] = retryCount + 1
	var mode = getThumbnailRenderMode(normalizedId)
	var useDataSrcOnly = mode.setDataSrc === true && mode.setSrc !== true
	setTimeout(function() {
		if (thumbnailCache.hasOwnProperty(normalizedId) || thumbnailPendingRequests.hasOwnProperty(normalizedId)) {
			return
		}
		setAssetThumbnail(normalizedId, useDataSrcOnly)
	}, 900 * (retryCount + 1))
}

async function flushAssetThumbnailBatchQueue() {
	thumbnailBatchTimer = null
	var queuedIds = Array.from(thumbnailBatchQueuedIds)
	thumbnailBatchQueuedIds = new Set()
	if (queuedIds.length === 0) {
		return
	}
	var urlsById = {}
	var unresolvedIds = queuedIds.slice()
	for (var attempt = 0; unresolvedIds.length > 0 && attempt <= thumbnailBatchMaxRetries; attempt++) {
		if (attempt > 0) {
			await new Promise(resolve => setTimeout(resolve, 220 * (attempt + 1)))
		}
		var batchUrls = await fetchAssetThumbnailBatch(unresolvedIds)
		var nextUnresolvedIds = []
		for (var unresolvedIndex = 0; unresolvedIndex < unresolvedIds.length; unresolvedIndex++) {
			var unresolvedId = parseInt(unresolvedIds[unresolvedIndex])
			if (!Number.isFinite(unresolvedId) || unresolvedId <= 0) {
				continue
			}
			if (batchUrls.hasOwnProperty(unresolvedId)) {
				urlsById[unresolvedId] = batchUrls[unresolvedId]
			} else {
				nextUnresolvedIds.push(unresolvedId)
			}
		}
		unresolvedIds = nextUnresolvedIds
	}
	for (var i = 0; i < queuedIds.length; i++) {
		var normalizedId = parseInt(queuedIds[i])
		if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
			continue
		}
		var resolvedUrl = urlsById.hasOwnProperty(normalizedId)
			? urlsById[normalizedId]
			: thumbnailFallbackUrl
		if (resolvedUrl !== thumbnailFallbackUrl) {
			thumbnailCache[normalizedId] = resolvedUrl
			if (thumbnailDeferredRetryCounts.hasOwnProperty(normalizedId)) {
				delete thumbnailDeferredRetryCounts[normalizedId]
			}
		} else {
			scheduleDeferredAssetThumbnailRetry(normalizedId)
		}
		applyAssetThumbnail(normalizedId, resolvedUrl)
		if (thumbnailPendingRequests.hasOwnProperty(normalizedId)) {
			thumbnailPendingRequests[normalizedId].resolve(resolvedUrl)
			delete thumbnailPendingRequests[normalizedId]
		}
	}
	var quickEquipInventoryList = document.getElementById('quickEquipInventoryList')
	if (quickEquipInventoryList != null) {
		loadScrollImage(quickEquipInventoryList)
	}
	if (quickEquipActiveUserId > 0) {
		scheduleQuickEquipThumbnailCacheSave(quickEquipActiveUserId)
	}
}

function setAssetThumbnail(id, dataSrc = false) {
	var normalizedId = parseInt(id)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return Promise.resolve(thumbnailFallbackUrl)
	}
	var mode = getThumbnailRenderMode(normalizedId)
	if (dataSrc) {
		mode.setDataSrc = true
	} else {
		mode.setSrc = true
	}
	if (thumbnailCache.hasOwnProperty(normalizedId)) {
		return Promise.resolve(applyAssetThumbnail(normalizedId, thumbnailCache[normalizedId]))
	}
	if (thumbnailPendingRequests.hasOwnProperty(normalizedId)) {
		if (!dataSrc) {
			setQuickEquipThumbLoaderForAssetId(normalizedId, true)
		}
		return thumbnailPendingRequests[normalizedId].promise
	}
	if (!dataSrc) {
		setQuickEquipThumbLoaderForAssetId(normalizedId, true)
	}
	var pendingResolve = null
	var pendingPromise = new Promise(resolve => {
		pendingResolve = resolve
	})
	thumbnailPendingRequests[normalizedId] = {
		promise: pendingPromise,
		resolve: pendingResolve
	}
	thumbnailBatchQueuedIds.add(normalizedId)
	if (thumbnailBatchQueuedIds.size >= 50) {
		if (thumbnailBatchTimer != null) {
			clearTimeout(thumbnailBatchTimer)
			thumbnailBatchTimer = null
		}
		flushAssetThumbnailBatchQueue()
	} else {
		queueAssetThumbnailBatchFlush()
	}
	return pendingPromise
}

function setScales(height, width, proportion, bodyType, head) {
	if (!areBodyAdjustmentsEnabled()) {
		return
	}
	scalesDetails = {height: height, width: width, proportion: proportion, bodyType: bodyType, head: head}
	var scalePostData = getScalePostData(height, width, proportion, bodyType, head)
	if (scalePostData == null) {
		return
	}
	pendingScalePayload = scalePostData
	flushScaleQueue()
}

var inventory = []
var inventory_dict = {}
var quickEquipPublicEnabled = true
var quickEquipEscHandler = null
var quickEquipActiveUserId = 0
var quickEquipThumbnailCacheVersion = 1
var quickEquipThumbnailCacheTtlMs = 12 * 60 * 60 * 1000
var quickEquipThumbnailPersistTimer = null
var quickEquipSharedInventoryPrimedUserId = 0

function getQuickEquipThumbnailCacheKey(userId) {
	return `roproQuickEquipThumbCache_v${quickEquipThumbnailCacheVersion}_${parseInt(userId)}`
}

async function loadQuickEquipThumbnailCache(userId) {
	var safeUserId = parseInt(userId)
	if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
		return
	}
	var cachePayload = await getLocalStorage(getQuickEquipThumbnailCacheKey(safeUserId))
	if (cachePayload == null || typeof cachePayload != "object") {
		return
	}
	if (parseInt(cachePayload.version) != quickEquipThumbnailCacheVersion) {
		return
	}
	var cachedAt = parseInt(cachePayload.cachedAt)
	if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > quickEquipThumbnailCacheTtlMs) {
		return
	}
	if (cachePayload.urls == null || typeof cachePayload.urls != "object") {
		return
	}
	var keys = Object.keys(cachePayload.urls)
	for (var i = 0; i < keys.length; i++) {
		var assetId = parseInt(keys[i])
		if (!Number.isFinite(assetId) || assetId <= 0) {
			continue
		}
		var normalizedUrl = normalizeAssetThumbnailUrl(cachePayload.urls[keys[i]])
		if (normalizedUrl != null) {
			thumbnailCache[assetId] = normalizedUrl
		}
	}
}

function scheduleQuickEquipThumbnailCacheSave(userId) {
	var safeUserId = parseInt(userId)
	if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
		return
	}
	if (quickEquipThumbnailPersistTimer != null) {
		clearTimeout(quickEquipThumbnailPersistTimer)
	}
	quickEquipThumbnailPersistTimer = setTimeout(async function() {
		quickEquipThumbnailPersistTimer = null
		var urls = {}
		var maxEntries = 600
		var addedEntries = 0
		for (var i = 0; i < inventory.length; i++) {
			if (addedEntries >= maxEntries) {
				break
			}
			var safeAssetId = parseInt(inventory[i] != null ? inventory[i].assetId : NaN)
			if (!Number.isFinite(safeAssetId) || safeAssetId <= 0 || !thumbnailCache.hasOwnProperty(safeAssetId)) {
				continue
			}
			var normalizedUrl = normalizeAssetThumbnailUrl(thumbnailCache[safeAssetId])
			if (normalizedUrl == null) {
				continue
			}
			urls[safeAssetId] = normalizedUrl
			addedEntries += 1
		}
		if (addedEntries == 0) {
			return
		}
		await setLocalStorage(getQuickEquipThumbnailCacheKey(safeUserId), {
			version: quickEquipThumbnailCacheVersion,
			cachedAt: Date.now(),
			urls: urls
		})
	}, 1400)
}

function normalizeQuickEquipInventoryItem(rawItem) {
	if (rawItem == null || typeof rawItem != "object") {
		return null
	}
	var assetId = parseInt(rawItem.assetId)
	if (!Number.isFinite(assetId) || assetId <= 0) {
		return null
	}
	var name = typeof rawItem.name == "string" ? stripTags(rawItem.name).trim() : ""
	var assetType = typeof rawItem.assetType == "string" ? stripTags(rawItem.assetType).trim() : ""
	return {
		assetId: assetId,
		name: name.length > 0 ? name : "Unknown Item",
		assetType: assetType
	}
}

function hydrateQuickEquipInventory(items) {
	if (!Array.isArray(items)) {
		return 0
	}
	inventory = []
	inventory_dict = {}
	for (var i = 0; i < items.length; i++) {
		var normalizedItem = normalizeQuickEquipInventoryItem(items[i])
		if (normalizedItem == null || inventory_dict.hasOwnProperty(normalizedItem.assetId)) {
			continue
		}
		inventory.push(normalizedItem)
		inventory_dict[normalizedItem.assetId] = normalizedItem
	}
	return inventory.length
}

function getAvatarPageUserId() {
	var userDataNodes = document.getElementsByName("user-data")
	if (userDataNodes.length == 0) {
		return null
	}
	var userID = parseInt(userDataNodes[0].getAttribute("data-userid"))
	if (!Number.isFinite(userID) || userID <= 0) {
		return null
	}
	return userID
}

function primeQuickEquipSharedInventory(userId) {
	var safeUserId = parseInt(userId)
	if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
		return
	}
	if (quickEquipSharedInventoryPrimedUserId === safeUserId) {
		return
	}
	quickEquipSharedInventoryPrimedUserId = safeUserId
	try {
		fetchQuickEquipInventory(safeUserId, true)
	} catch (e) {
	}
}

function scheduleQuickEquipSharedInventoryPrewarm(attempt = 0) {
	var userId = getAvatarPageUserId()
	if (userId != null) {
		primeQuickEquipSharedInventory(userId)
		return
	}
	if (attempt >= 20) {
		return
	}
	setTimeout(function() {
		scheduleQuickEquipSharedInventoryPrewarm(attempt + 1)
	}, 500)
}

async function loadQuickEquipInventory(userId) {
	var safeUserId = parseInt(userId)
	if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
		return false
	}
	var data = await fetchQuickEquipInventory(safeUserId, false)
	if (data == null || typeof data != "object" || data.ok !== true || !Array.isArray(data.data)) {
		return false
	}
	return hydrateQuickEquipInventory(data.data) > 0
}

function loadScrollImage(list) {
	if (list == null) {
		return
	}
	var rows = list.children
	for (var i = 0; i < rows.length; i++) {
		var elem = rows[i]
		if (elem.offsetTop >= (list.clientHeight + list.scrollTop + 140)) {
			break
		}
		if (elem.style.display == "none" || elem.offsetTop < (list.scrollTop - 20)) {
			continue
		}
		var rowThumbNode = elem.querySelector('.ropro-quick-equip-thumb')
		if (rowThumbNode != null && rowThumbNode.getAttribute('data-ropro-quick-equip-thumb-requested') !== "1") {
			var lazyAssetId = parseInt(rowThumbNode.getAttribute('data-ropro-quick-equip-asset-id'))
			if (!Number.isFinite(lazyAssetId) || lazyAssetId <= 0) {
				lazyAssetId = parseInt(elem.getAttribute('itemid'))
			}
			if (Number.isFinite(lazyAssetId) && lazyAssetId > 0) {
				rowThumbNode.setAttribute('data-ropro-quick-equip-thumb-requested', "1")
				setAssetThumbnail(lazyAssetId, false)
			}
		}
		var thumbNode = elem.querySelector('img[data-src]')
		if (thumbNode != null && thumbNode.getAttribute('data-src') != "loaded") {
			bindQuickEquipThumbLoader(thumbNode)
			syncQuickEquipThumbLoader(thumbNode, true)
			thumbNode.src = thumbNode.getAttribute('data-src')
			thumbNode.setAttribute('data-src', 'loaded')
		}
	}
}

function closeQuickEquipModal() {
	if (quickEquipEscHandler != null) {
		document.removeEventListener('keydown', quickEquipEscHandler)
		quickEquipEscHandler = null
	}
	quickEquipActiveUserId = 0
	var quickEquipModal = document.getElementById('quickEquipModal')
	if (quickEquipModal != null && quickEquipModal.parentNode != null) {
		quickEquipModal.parentNode.remove()
	}
}

function addQuickEquipItem(item) {
	var safeAssetId = parseInt(item.assetId)
	if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
		return
	}
	var li = document.createElement('li')
	li.setAttribute('itemid', safeAssetId)
	li.setAttribute('class', 'qeitem ropro-quick-equip-item')
	li.innerHTML = `<div class="ropro-quick-equip-row">
		<a class="ropro-quick-equip-thumb-link" target="_blank" rel="noopener noreferrer" href="https://www.roblox.com/catalog/${safeAssetId}/Item">
			${buildRoProLoader({ className: "ropro-quick-equip-thumb-loader" })}
			<img class="ropro-quick-equip-thumb ropro-image-${safeAssetId}" src="" alt="">
		</a>
		<div class="ropro-quick-equip-item-main">
			<a class="ropro-quick-equip-item-name" target="_blank" rel="noopener noreferrer" href="https://www.roblox.com/catalog/${safeAssetId}/Item">${stripTags(item.name)}</a>
		</div>
		<button type="button" class="btn-growth-lg add-quick-equip-item-button ropro-quick-equip-add-button" itemassettypename="${stripTags(item.assetType)}" itemid="${safeAssetId}" aria-label="Equip item">+</button>
	</div>`
	li.getElementsByClassName('add-quick-equip-item-button')[0].addEventListener('click', function() {
		equipItem(parseInt(this.getAttribute('itemid')), this.getAttribute('itemassettypename'))
		closeQuickEquipModal()
	})
	var quickEquipThumb = li.getElementsByClassName('ropro-quick-equip-thumb')[0]
	bindQuickEquipThumbLoader(quickEquipThumb)
	syncQuickEquipThumbLoader(quickEquipThumb, false)
	quickEquipThumb.setAttribute('data-ropro-quick-equip-asset-id', String(safeAssetId))
	quickEquipThumb.setAttribute('data-ropro-quick-equip-thumb-requested', "0")
	var quickEquipInventoryList = document.getElementById('quickEquipInventoryList')
	quickEquipInventoryList.appendChild(li)
	var shouldEagerLoad = quickEquipInventoryList.children.length <= 48
	if (shouldEagerLoad) {
		quickEquipThumb.setAttribute('data-ropro-quick-equip-thumb-requested', "1")
		setAssetThumbnail(item.assetId, false)
	}
}

async function addQuickEquipModal() {
	if (!quickEquipPublicEnabled) {
		return
	}
	closeQuickEquipModal()
	var quickEquipHTML = `<div id="quickEquipModal" class="upgrade-modal ropro-quick-equip-modal" style="z-index:100000;display:block;">
		<div class="upgrade-modal-content ropro-quick-equip-card dark-theme modal-content" role="dialog" aria-modal="true" aria-labelledby="quickEquipTitle">
			<div class="ropro-quick-equip-header">
				<div class="ropro-quick-equip-title-wrap">
					<img class="ropro-quick-equip-logo" src="${chrome.runtime.getURL('/images/ropro_logo_small.png')}" alt="RoPro">
					<div class="ropro-quick-equip-title-copy">
						<h2 id="quickEquipTitle" class="ropro-quick-equip-title">Quick Equip</h2>
						<p class="ropro-quick-equip-subtitle">Equip items from your inventory instantly.</p>
					</div>
				</div>
				<button type="button" id="quickEquipModalClose" class="ropro-quick-equip-close-button" aria-label="Close quick equip">×</button>
			</div>
			<div class="ropro-quick-equip-search-shell">
				<svg class="ropro-quick-equip-search-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.5 3a7.5 7.5 0 1 1 0 15a7.5 7.5 0 0 1 0-15m0-1.5a9 9 0 1 0 5.68 15.98l4.42 4.42l1.06-1.06l-4.42-4.42A9 9 0 0 0 10.5 1.5"></path></svg>
				<input id="filterSearch" class="form-control input-field new-input-field ropro-quick-equip-search-input" placeholder="Inventory Search" maxlength="120" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="">
			</div>
			${buildRoProLoader({ id: "quickEquipLoading", className: "ropro-quick-equip-loading" })}
			<div id="inventoryDiv" class="ropro-quick-equip-body" style="display:none;">
				<ul class="inventoryList ropro-quick-equip-list" id="quickEquipInventoryList"></ul>
			</div>
		</div>
	</div>`
	var quickEquipDiv = document.createElement('div')
	quickEquipDiv.innerHTML = quickEquipHTML
	document.body.appendChild(quickEquipDiv)
	document.getElementById('quickEquipModal').addEventListener('click', function(e) {
		if (e.target === this) {
			closeQuickEquipModal()
		}
	})
	document.getElementById('quickEquipModalClose').addEventListener('click', function() {
		closeQuickEquipModal()
	})
	quickEquipEscHandler = function(event) {
		if (event.key === "Escape") {
			closeQuickEquipModal()
		}
	}
	document.addEventListener('keydown', quickEquipEscHandler)
	var userDataNodes = document.getElementsByName("user-data")
	var userID = userDataNodes.length > 0 ? parseInt(userDataNodes[0].getAttribute("data-userid")) : NaN
	quickEquipActiveUserId = Number.isFinite(userID) && userID > 0 ? userID : 0
	await loadQuickEquipThumbnailCache(userID)
	primeQuickEquipSharedInventory(userID)
	if (inventory.length == 0) {
		try {
			await loadQuickEquipInventory(userID)
		} catch {
			console.log("Inventory load error...")
		}
	}
	for (var i = 0; i < inventory.length; i++) {
		addQuickEquipItem(inventory[i])
	}
	document.getElementById('quickEquipLoading').style.display = "none"
	document.getElementById('inventoryDiv').style.display = "block"
	loadScrollImage(document.getElementById('quickEquipInventoryList'))
	$("#quickEquipInventoryList").scroll(function() {
		loadScrollImage(this)
	})
	document.getElementById('filterSearch').focus()
	document.getElementById('filterSearch').addEventListener('input', function() {
		var items = document.getElementsByClassName('qeitem')
		for (var i = 0; i < items.length; i++) {
			var id = parseInt(items[i].getAttribute('itemid'))
			if (inventory_dict[id].name.toLowerCase().includes(this.value.toLowerCase())) {
				items[i].style.display = "block"
			} else {
				items[i].style.display = "none"
			}
		}
		document.getElementById('quickEquipInventoryList').scrollTop = 0
		loadScrollImage(document.getElementById('quickEquipInventoryList'))
	})
}

function createUpgradeModal() {
    if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
        return null
    }
    return window.RoProUpgradeModal.open({
        tier: "plus",
        contextLabel: "RoPro Avatar",
        featureLabel: "RoPro Outfit Swapper",
        subtitleExtra: "This feature switches your avatar to a randomly chosen outfit you have created at a selected time interval.",
        benefits: [
            "Fastest Server and Server Size Sort",
            "More Game Filters and Like Ratio Filter",
            "Trade Value and Demand Calculator",
            "More Game Playtime Sorts"
        ],
        ctaLabel: "Upgrade",
        ctaHref: "https://ropro.io#plus",
        footerText: "Find a full list in RoPro settings."
    })
}

function checkCharacterType() {
	inputs = document.getElementsByClassName('avatar-type-toggle')[0].getElementsByTagName('input')
	for (i = 0; i < inputs.length; i++) {
		if (inputs[i].checked == true) {
			if (i == 0) {
				document.getElementsByClassName('left-wrapper')[0].getElementsByClassName('scale-container')[0].style.display = "none"
			} else {
				document.getElementsByClassName('left-wrapper')[0].getElementsByClassName('scale-container')[0].style.display = "block"
			}
		}
	}
}

function upgradeModal() {
    var modal = createUpgradeModal()
    if (modal != null) {
        modal.style.display = "block"
    }
}

async function addOutfitSwapper() {
	div = document.createElement('div')
	outfitRandomizerButtonHTML = `<button id="outfitRandomizerButton" style="margin-right:150px;" ng-if="selectedMenu.name !== 'PresetCostumes'" ng-type="button" class="btn-secondary-xs btn-float-right ng-binding ng-scope" ng-click="createOutfitClicked()"> <img class="outfit-randomizer-icon" style="width:15px;margin-top:-12px;margin-bottom:-10px;margin-right:4px;" src="${chrome.runtime.getURL('/images/random_game.svg')}">Outfit Swapper </button>`
	div.innerHTML = outfitRandomizerButtonHTML
	button = div.childNodes[0]
	document.getElementsByClassName('btn-secondary-xs btn-float-right ng-binding ng-scope')[0].parentNode.appendChild(button)
	button.addEventListener('click', function() {
		upgradeModal()
	})
}

function updateCurrentlyWearing() {
	var wearingContainer = document.getElementById('wearingContainer')
	if (wearingContainer == null) {
		return
	}
	wearingContainer.innerHTML = ""
	for (var i = 0; i < wearing.length; i++) {
		var item = parseInt(stripTags(wearing[i].toString()))
		if (!Number.isFinite(item) || item <= 0) {
			continue
		}
		var div = document.createElement("div")
		var itemName = typeof wearingInfoDict[item] == "string" && wearingInfoDict[item].length > 0
			? stripTags(wearingInfoDict[item])
			: "Loading..."
		var hasKnownCost = Object.prototype.hasOwnProperty.call(wearingCostDict, item)
		var itemCostDisplay = "..."
		if (hasKnownCost) {
			if (wearingCostDict[item] == null) {
				itemCostDisplay = "Offsale"
			} else {
				itemCostDisplay = addCommas(parseInt(wearingCostDict[item]))
			}
		}
		div.innerHTML += `<div class="wearing-name input-group input-field"><div class="wearing-item-link-row"><span class="wearing-item-link wearing-${item}">${itemName}</span></div>
			<div class="wearing-item-cost">
			<span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
			<span style="font-size:12px;" class="rbx-text-navbar-right text-header wearing-robux-${item}">${itemCostDisplay}</span></div>
			</div>
				<div class="wearing-delete"><button type="button" class="ropro-outfit-delete-button ropro-wearing-delete-button" data-itemid="${item}" aria-label="Unequip item">X</button></div>
				<div style="display:inline-block;width:50px;height:50px;" class="thumbnail-2d-container wearing-card">
				<img itemid="${item}" class="item-card-thumb-container ${item} ropro-image-${parseInt(item)}" style="width:100%;height:100%;" src="${chrome.runtime.getURL('/images/empty.png')}">
				</div>`
			div.setAttribute("class", "wearing-div")
			wearingContainer.appendChild(div)
			var wearingDeleteButton = div.getElementsByClassName('ropro-wearing-delete-button')[0]
			if (wearingDeleteButton != null) {
				wearingDeleteButton.addEventListener('click', function(event) {
					if (event != null) {
						event.preventDefault()
						event.stopPropagation()
					}
					var itemID = parseInt(this.getAttribute('data-itemid'))
					if (Number.isFinite(itemID) && itemID > 0) {
						unequipItem(itemID)
					}
				})
			}
			setAssetThumbnail(item)
		}
	if (quickEquipPublicEnabled) {
		var div = document.createElement('div')
		div.innerHTML += `<div class="wearing-div"><div style="height:25px!important;margin-top:15px;z-index:1000;" class="wearing-name input-group input-field"><a style="font-size:13px;font-weight:bold;"><img src="${chrome.runtime.getURL('/images/ropro_logo_small.png')}" style="height:18px;margin-top:-2px;filter: drop-shadow(rgb(57,59,61) 2px 2px 1px);"> Quick Equip</a>
	<br>
	</div>
	<div style="display:inline-block;width:50px;height:50px;" class="thumbnail-2d-container wearing-card">
	<a><img class="item-card-thumb-container" style="width:100%;height:100%;filter:invert(0.7);" src="${chrome.runtime.getURL('/images/quick_add.png')}">
	</a></div></div>`
		div.setAttribute("class", "wearing-div")
		div.addEventListener('click', function() {
			addQuickEquipModal()
		})
		wearingContainer.appendChild(div)
	}
	syncAvatarLeftPaneHeight()
}

var assetDetailsCache = {}

async function calculateCost(assetId) {
	var outfitCostLoadingNode = document.getElementById("outfitCostLoading")
	var outfitCostDivNode = document.getElementById("outfitCostDiv")
	var outfitCostRobuxNode = document.getElementById("outfitCostRobux")
	if (outfitCostLoadingNode != null) {
		outfitCostLoadingNode.style.display = "inline-block"
	}
	if (outfitCostDivNode != null) {
		outfitCostDivNode.style.display = "none"
	}
	if (assetId != -1) {
		var assetDetails = null
		if (assetId in assetDetailsCache) {
			assetDetails = assetDetailsCache[assetId]
		} else {
			assetDetailsCache[assetId] = await fetchAssetDetails(assetId)
			assetDetails = assetDetailsCache[assetId]
		}
		if (assetDetails == null || typeof assetDetails != "object") {
			assetDetails = {"name": "Unknown Item", "price": null, "lowestPrice": null}
		}
		$(".wearing-" + assetId).text(stripTags(assetDetails.name))
		wearingInfoDict[assetId] = stripTags(assetDetails.name)
		if (isAvatarCatalogItemOffsale(assetDetails)) {
			wearingCostDict[assetId] = null
			$(".wearing-robux-" + assetId).text("Offsale")
		} else if (assetDetails.hasOwnProperty('lowestPrice')) {
			if (assetDetails.lowestPrice != null) {
				wearingCostDict[assetId] = assetDetails.lowestPrice
				$(".wearing-robux-" + assetId).text(addCommas(assetDetails.lowestPrice))
			} else {
				wearingCostDict[assetId] = null
				$(".wearing-robux-" + assetId).text("Offsale")
			}
		} else {
			if (assetDetails.price != null) {
				wearingCostDict[assetId] = assetDetails.price
				$(".wearing-robux-" + assetId).text(addCommas(assetDetails.price))
			} else {
				wearingCostDict[assetId] = null
				$(".wearing-robux-" + assetId).text("Offsale")
			}
		}
	}
	var cost = totalOutfitCost()
	var costString = ""
	if (cost[1] == 0) {
		costString = addCommas(parseInt(cost[0]))
	} else {
		costString = addCommas(parseInt(cost[0])) + "<b style='font-size:10px;'> + " + parseInt(cost[1]) + " offsale</b>"
	}
	if (outfitCostRobuxNode != null) {
		if (cost[1] == 0) {
			outfitCostRobuxNode.textContent = costString
		} else {
			outfitCostRobuxNode.textContent = ""
			var baseCostNode = document.createTextNode(addCommas(parseInt(cost[0])))
			var offsaleNode = document.createElement("b")
			offsaleNode.style.fontSize = "10px"
			offsaleNode.textContent = " + " + parseInt(cost[1]) + " offsale"
			outfitCostRobuxNode.appendChild(baseCostNode)
			outfitCostRobuxNode.appendChild(offsaleNode)
		}
	}
	if (outfitCostLoadingNode != null) {
		outfitCostLoadingNode.style.display = "none"
	}
	if (outfitCostDivNode != null) {
		outfitCostDivNode.style.display = "inline-block"
	}
}

function selectBodyPart(type) {
	var bodyColors = document.getElementById('bodyColors')
	if (bodyColors == null) {
		return
	}
	var advancedLinks = bodyColors.getElementsByClassName('advanced-link')
	if (advancedLinks.length == 0) {
		return
	}
	advancedLinks[0].click()
	if (type == "roproHeadColor") {
		if (document.getElementById('radio-headColorId') != null) {
			document.getElementById('radio-headColorId').click()
		}
	} else if (type == "roproLeftArmColor") {
		if (document.getElementById('radio-leftArmColorId') != null) {
			document.getElementById('radio-leftArmColorId').click()
		}
	} else if (type == "roproTorsoColor") {
		if (document.getElementById('radio-torsoColorId') != null) {
			document.getElementById('radio-torsoColorId').click()
		}
	} else if (type == "roproRightArmColor") {
		if (document.getElementById('radio-rightArmColorId') != null) {
			document.getElementById('radio-rightArmColorId').click()
		}
	} else if (type == "roproLeftLegColor") {
		if (document.getElementById('radio-leftLegColorId') != null) {
			document.getElementById('radio-leftLegColorId').click()
		}
	} else if (type == "roproRightLegColor") {
		if (document.getElementById('radio-rightLegColorId') != null) {
			document.getElementById('radio-rightLegColorId').click()
		}
	}
}

async function loadCurrentlyWearing() {
	var userDataNodes = document.getElementsByName("user-data")
	if (userDataNodes.length == 0) {
		return
	}
	var userID = parseInt(userDataNodes[0].getAttribute("data-userid"))
	if (!Number.isFinite(userID) || userID <= 0) {
		return
	}
	primeQuickEquipSharedInventory(userID)
	var currentlyWearing = await fetchCurrentlyWearing(userID)
	if (currentlyWearing == "ERROR" || currentlyWearing == null || typeof currentlyWearing != "object") {
		return
	}
	wearing = []
	wearingCostDict = {}
	wearingInfoDict = {}
	var assets = Array.isArray(currentlyWearing.assets) ? currentlyWearing.assets : []
	wearingAssetsDetails = assets
	wearingAssetPayload = normalizeWearAssets(assets)
	wearPayloadStateInitialized = true
	var assetIdsToPrice = []
	for (var i1 = 0; i1 < assets.length; i1++) {
		var asset = assets[i1]
		if (asset == null || typeof asset != "object") {
			continue
		}
		var assetTypeName = ""
		if (asset.assetType != null && typeof asset.assetType == "object" && typeof asset.assetType.name == "string") {
			assetTypeName = asset.assetType.name
		}
		var assetId = parseInt(asset.id)
		if (!Number.isFinite(assetId) || assetId <= 0) {
			continue
		}
		if (!assetTypeName.includes("Animation") && !wearing.includes(assetId)) {
			wearing.push(assetId)
			wearingInfoDict[assetId] = typeof asset.name == "string" ? stripTags(asset.name) : "Loading..."
			assetIdsToPrice.push(assetId)
		}
	}
	syncAvatarInventoryEquippedStateFromAssetIds(wearingAssetPayload, {forceReactRoot: true})
	updateCurrentlyWearing()
	if (assetIdsToPrice.length == 0) {
		var outfitCostLoadingNode = document.getElementById("outfitCostLoading")
		var outfitCostDivNode = document.getElementById("outfitCostDiv")
		var outfitCostRobuxNode = document.getElementById("outfitCostRobux")
		if (outfitCostRobuxNode != null) {
			outfitCostRobuxNode.innerHTML = "0"
		}
		if (outfitCostLoadingNode != null) {
			outfitCostLoadingNode.style.display = "none"
		}
		if (outfitCostDivNode != null) {
			outfitCostDivNode.style.display = "inline-block"
		}
	} else {
		for (var j = 0; j < assetIdsToPrice.length; j++) {
			calculateCost(assetIdsToPrice[j])
		}
	}
	var bodyColors = currentlyWearing.bodyColors
	if (bodyColors != null && typeof bodyColors == "object") {
		if (document.getElementById('roproHeadColor') != null) {
			document.getElementById('roproHeadColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['headColorId']])
		}
		if (document.getElementById('roproLeftArmColor') != null) {
			document.getElementById('roproLeftArmColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['leftArmColorId']])
		}
		if (document.getElementById('roproTorsoColor') != null) {
			document.getElementById('roproTorsoColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['torsoColorId']])
		}
		if (document.getElementById('roproRightArmColor') != null) {
			document.getElementById('roproRightArmColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['rightArmColorId']])
		}
		if (document.getElementById('roproLeftLegColor') != null) {
			document.getElementById('roproLeftLegColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['leftLegColorId']])
		}
		if (document.getElementById('roproRightLegColor') != null) {
			document.getElementById('roproRightLegColor').style.backgroundColor = stripTags(bodyColorPalette[bodyColors['rightLegColorId']])
		}
	}
	if (currentlyWearing.scales == null || typeof currentlyWearing.scales != "object") {
		return
	}
	var bodySizeSelectorNode = document.getElementById('bodySizeSelector')
	var bodyStyleSelectorNode = document.getElementById('bodyStyleSelector')
	var headSliderNode = document.getElementById('headSlider')
	var headSizeImageNode = document.getElementById('headSizeImage')
	var bodyColorContainerNode = document.getElementById('bodyColorContainer')
	var r6LabelNode = document.getElementsByClassName('ropro-R6-label')[0]
	var r15LabelNode = document.getElementsByClassName('ropro-R15-label')[0]
	if (
		bodySizeSelectorNode == null ||
		bodyStyleSelectorNode == null ||
		headSliderNode == null ||
		headSizeImageNode == null ||
		bodyColorContainerNode == null ||
		r6LabelNode == null ||
		r15LabelNode == null
	) {
		return
	}
	scales = currentlyWearing.scales
	if ((scalesDetails.width / 100).toFixed(2) != scales.width) {
		bodySizeX = ((scales.width - rules.scales.width.min) / (rules.scales.width.max - rules.scales.width.min)) * 100
		bodySizeLeft = (bodySizeOffsetX - 50 + ((scales.width - rules.scales.width.min) / (rules.scales.width.max - rules.scales.width.min) * 100)).toFixed(1)
		bodySizeSelectorNode.style.left = parseFloat(bodySizeLeft) + "px"	
	}
	if ((scalesDetails.height / 100).toFixed(2) != scales.height) {
		bodySizeY = ((scales.height - rules.scales.height.min) / (rules.scales.height.max - rules.scales.height.min)) * 100
		bodySizeTop = (bodySizeOffsetY - 50 + 100 - ((scales.height - rules.scales.height.min) / (rules.scales.height.max - rules.scales.height.min) * 100)).toFixed(1)
		bodySizeSelectorNode.style.top = parseFloat(bodySizeTop) + "px"
	}
	if ((scalesDetails.bodyType / 100).toFixed(2) != scales.bodyType) {
		bodyStyleY = ((scales.bodyType - rules.scales.bodyType.min) / (rules.scales.bodyType.max - rules.scales.bodyType.min)) * 100
		bodyStyleTop = 95 - ((scales.bodyType - rules.scales.bodyType.min) / (rules.scales.bodyType.max - rules.scales.bodyType.min) * 100).toFixed(1)
		bodyStyleSelectorNode.style.top = parseFloat(bodyStyleTop) + "px"
	}
	if ((scalesDetails.proportion / 100).toFixed(2) != scales.proportion) {
		bodyStyleX = 55 - ((scales.proportion - rules.scales.proportion.min) / (rules.scales.proportion.max - rules.scales.proportion.min)) * 110
		bounds = [bodyStyleY / - (5 / 3), bodyStyleY / (5 / 3)]
		if (bodyStyleX > bounds[0]) {
			if (bodyStyleX < bounds[1]) {
				bodyStyleLeft = bodyStyleX
			} else {
				bodyStyleLeft = bounds[1]
			}
		} else {
			bodyStyleLeft = bounds[0]
		}
		bodyStyleLeft += 64.5
		bodyStyleSelectorNode.style.left = parseFloat(bodyStyleLeft) + "px"
	}
	if ((scalesDetails.head / 100).toFixed(2) != scales.head) {
		headSliderNode.setAttribute('class', '')
		headSliderNode.value = ((scales.head - rules.scales.head.min) * 100).toFixed()
		headSliderNode.classList.add('pr' + (parseInt(headSliderNode.value) * 20));
		headSizeImageNode.style.transform='scale('+(0.9+parseInt(headSliderNode.value)/50)+')';
	}
	bodySizeSelectorNode.style.display = "block"
	bodyStyleSelectorNode.style.display = "block"
	height = scales.height
	width = scales.width
	proportion = scales.proportion
	bodyType = scales.bodyType
	bodyColorContainerNode.style.transform = "scaleX(" + (0.8 * width - (0.1 * (0.5 - (1 - proportion)))) + ") scaleY(" + (0.9 * height - (0.2 * (0.25 - bodyType))) + ")"
	syncAvatarTypeToggleUi(currentlyWearing.playerAvatarType)
}

function calculateDistance(elem, mouseX, mouseY) {
	return [mouseX - (elem.offset().left+(elem.width()/2)), mouseY - (elem.offset().top+(elem.height()/2))]
}

function getDistance(x1, y1, x2, y2){
    let y = x2 - x1;
    let x = y2 - y1;
    
    return Math.sqrt(x * x + y * y);
}

async function mainAvatar() {
	if (await fetchSetting("avatarEditorChanges")) {
		if (document.getElementById('wearing') != null) {
			ensureAvatarMenuAnchorPlacement()
			return
		}
		var avatarInsertionNode = getAvatarPanelInsertionAnchor()
		if (avatarInsertionNode != null) {
			div = document.createElement('div')
			div.innerHTML = wearingHTML
			insertAfter(div.childNodes[0], avatarInsertionNode)
			setupLeftPaneHeightSync()
			try{
				hideUI = document.createElement('a')
				hideUI.classList.add('text-link')
				hideUI.setAttribute('style', 'margin-right:10px')
				hideUI.innerText = 'Hide UI'
				document.getElementsByClassName('redraw-avatar')[0].appendChild(hideUI)
				hideUI.addEventListener('click', function() {
					var toggle3dButton = document.querySelector('.toggle-three-dee.btn-control')
					if (document.getElementsByClassName('avatar-type-toggle')[0].style.display == "none") {
						document.getElementsByClassName('avatar-type-toggle')[0].style.display = "block"
						if (toggle3dButton != null) {
							toggle3dButton.style.display = "block"
						}
						//document.getElementsByClassName('left-wrapper')[0].getElementsByClassName('scale-container')[0].style.display = "block"
						this.innerText = "Hide UI"
						//checkCharacterType()
					} else {
						document.getElementsByClassName('avatar-type-toggle')[0].style.display = "none"
						if (toggle3dButton != null) {
							toggle3dButton.style.display = "none"
						}
						//document.getElementsByClassName('left-wrapper')[0].getElementsByClassName('scale-container')[0].style.display = "none"
						this.innerText = "Show UI"
					}
				})
				var avatarTypeToggle = document.getElementsByClassName('avatar-type-toggle')
				if (avatarTypeToggle.length > 0) {
					var avatarTypeInputs = avatarTypeToggle[0].getElementsByTagName('input')
					var avatarTypeLabels = avatarTypeToggle[0].getElementsByTagName('label')
					if (avatarTypeInputs.length >= 2) {
						avatarTypeInputs[0].name = "ropro-avatar-type"
						avatarTypeInputs[1].name = "ropro-avatar-type"
						avatarTypeInputs[0].id = "ropro-avatar-type-r6"
						avatarTypeInputs[1].id = "ropro-avatar-type-r15"
						if (avatarTypeLabels.length >= 2) {
							avatarTypeLabels[0].setAttribute("for", "ropro-avatar-type-r6")
							avatarTypeLabels[1].setAttribute("for", "ropro-avatar-type-r15")
						}
						avatarTypeInputs[0].addEventListener('change', function() {
							if (this.checked) {
								setPlayerAvatarType("R6")
							}
						})
						avatarTypeInputs[1].addEventListener('change', function() {
							if (this.checked) {
								setPlayerAvatarType("R15")
							}
						})
					}
				}
				var avatarBackNode = document.querySelector('.avatar-back')
				if (avatarBackNode != null) {
					avatarBackNode.style.height = "initial"
					avatarBackNode.style.zIndex = 2
				}
				if (document.getElementsByClassName('ropro-avatar-menu').length > 0) {
					document.getElementsByClassName('ropro-avatar-menu')[0].style.zIndex = 1
				}
			} catch(e) {
				console.log(e)
			}
			document.getElementById('redrawAvatar').addEventListener('click', function() {
				reloadAvatar()
			})
			setAvatarRedrawPending(avatarRedrawPending)
			rules = await fetchAvatarRules()
			if (rules == null || rules == "ERROR" || typeof rules != "object" || !Array.isArray(rules.bodyColorsPalette) || rules.scales == null) {
				return
			}
			bodyColorPalette = {}
				for (const [key, value] of Object.entries(rules.bodyColorsPalette)) {
					bodyColorPalette[value['brickColorId']] = value['hexColor']
				}
				loadCurrentlyWearing()
			if (document.getElementsByClassName('backgroundText').length > 0) {
				document.getElementsByClassName('backgroundText')[0].remove()
			}
			if (document.getElementById('saveBackgroundButton') != null) {
				document.getElementById('saveBackgroundButton').remove()
			}
			//addOutfitSwapper()
			$("#roproHeadColor").click(function(){
				selectBodyPart(this.id)
			})
			$("#roproLeftArmColor").click(function(){
				selectBodyPart(this.id)
			})
			$("#roproTorsoColor").click(function(){
				selectBodyPart(this.id)
			})
			$("#roproRightArmColor").click(function(){
				selectBodyPart(this.id)
			})
			$("#roproLeftLegColor").click(function(){
				selectBodyPart(this.id)
			})
			$("#roproRightLegColor").click(function(){
				selectBodyPart(this.id)
			})
			document.addEventListener('click', function(e) {
				if (!document.getElementById('wearing')) {
					return
				}
				if (e == null || e.target == null || typeof e.target.closest != "function") {
					return
				}
				if (e.target.closest('#wearing') != null) {
					return
				}
				scheduleAvatarExternalSync(900)
			})
			document.getElementById('bodySizeSelector').addEventListener('mousedown', e => {
				e.preventDefault()
				if (!areBodyAdjustmentsEnabled()) {
					return
				}
				mouseHeldBodySize = true
			});
			document.getElementById('bodyStyleSelector').addEventListener('mousedown', e => {
				e.preventDefault()
				if (!areBodyAdjustmentsEnabled()) {
					return
				}
				mouseHeldBodyStyle = true
			});
			document.getElementById('bodySizeSelector').addEventListener('dragstart', function(e) {
				e.preventDefault()
			});
			document.getElementById('bodyStyleSelector').addEventListener('dragstart', function(e) {
				e.preventDefault()
			});
			$(document).mouseup(function(e){
				if (mouseHeldBodySize == true) {
					mouseHeldBodySize = false
					width = 0
					height = 0
					if (bodySizeX > 50) {
						width = (rules.scales.width.min + (rules.scales.width.max - rules.scales.width.min) * (Math.ceil(bodySizeX) / 100)).toFixed(2)
					} else {
						width = (rules.scales.width.min + (rules.scales.width.max - rules.scales.width.min) * (Math.floor(bodySizeX) / 100)).toFixed(2)
					}
					if (bodySizeY > 50) {
						height = (rules.scales.height.min + (rules.scales.height.max - rules.scales.height.min) * (Math.ceil(bodySizeY) / 100)).toFixed(2)
					} else {
						height = (rules.scales.height.min + (rules.scales.height.max - rules.scales.height.min) * (Math.floor(bodySizeY) / 100)).toFixed(2)
					}
					setScales(height * 100, width * 100, scales.proportion * 100, scales.bodyType * 100, scales.head * 100)
				}
				if (mouseHeldBodyStyle == true) {
					mouseHeldBodyStyle = false
					distance = calculateDistance($("#bodyStyleBox"), e.pageX, e.pageY)
					proportion = (rules.scales.proportion.min + (rules.scales.proportion.max - rules.scales.proportion.min) * (1 - Math.floor(Math.min(getDistance(-54.599, 91, bodyStyleX, bodyStyleY), 90)) / 90).toFixed(2)).toFixed(2)
					bodyType = (rules.scales.bodyType.min + (rules.scales.bodyType.max - rules.scales.bodyType.min) * (Math.round(bodyStyleY) / 91)).toFixed(2)
					setScales(scales.height * 100, scales.width * 100, proportion * 100, bodyType * 100, scales.head * 100)
				}
			});
			document.addEventListener('mousemove', function(e) {
				if (mouseHeldBodySize) {
					distance = calculateDistance($("#bodySizeBox"), e.pageX, e.pageY)
					if (Math.abs(distance[1]) <= 50) {
						bodySizeY = 100 - (distance[1] + 50)
						document.getElementById('bodySizeSelector').style.top = (distance[1] + bodySizeOffsetY) + "px"
						//document.getElementById('bodyColorContainer').style.transform = "scaleX(" + parseFloat(document.getElementById('bodyColorContainer').style.transform.split("scaleX(")[1].split(")")[0]) + ") scaleY(" + (0.8 * (rules.scales.height.min + (rules.scales.height.max - rules.scales.height.min) * (Math.ceil(bodySizeY) / 100)).toFixed(2)) + ")"
					}
					if (Math.abs(distance[0]) <= 50) {
						bodySizeX = distance[0] + 50
						document.getElementById('bodySizeSelector').style.left = (distance[0] + bodySizeOffsetX) + "px"
						//document.getElementById('bodyColorContainer').style.transform = "scaleX(" + (0.8 * (rules.scales.width.min + (rules.scales.width.max - rules.scales.width.min) * (Math.ceil(bodySizeX) / 100)).toFixed(2)) + ") scaleY(" + parseFloat(document.getElementById('bodyColorContainer').style.transform.split("scaleY(")[1].split(")")[0]) + ")"
					}
					height = (rules.scales.height.min + (rules.scales.height.max - rules.scales.height.min) * (Math.floor(bodySizeY) / 100)).toFixed(2)
					width = (rules.scales.width.min + (rules.scales.width.max - rules.scales.width.min) * (Math.ceil(bodySizeX) / 100)).toFixed(2)
					proportion = (rules.scales.proportion.min + (rules.scales.proportion.max - rules.scales.proportion.min) * (1 - Math.floor(Math.min(getDistance(-54.599, 91, bodyStyleX, bodyStyleY), 90)) / 90).toFixed(2)).toFixed(2)
					bodyType = (rules.scales.bodyType.min + (rules.scales.bodyType.max - rules.scales.bodyType.min) * (Math.round(bodyStyleY) / 91)).toFixed(2)
					document.getElementById('bodyColorContainer').style.transform = "scaleX(" + (0.8 * width - (0.1 * (0.5 - (1 - proportion)))) + ") scaleY(" + (0.9 * height - (0.2 * (0.25 - bodyType))) + ")"
				}
				if (mouseHeldBodyStyle) {
					distance = calculateDistance($("#bodyStyleBox"), e.pageX, e.pageY)
					if (distance[1] <= 38 && distance[1] >= -55) {
						bodyStyleY = Math.max(0, parseInt(92 - (distance[1] + 55)))
						document.getElementById('bodyStyleSelector').style.top = (distance[1] + 50) + "px"
					}
					if (distance[0] >= 0) {
						bodyStyleX = Math.max(0, parseInt(distance[0]))
						bodyStyleX = Math.min(bodyStyleX, bodyStyleY / (5 / 3))
						document.getElementById('bodyStyleSelector').style.left = (bodyStyleX + 64.5) + "px"
					} else {
						bodyStyleX = Math.min(0, parseInt(distance[0]))
						bodyStyleX = Math.max(bodyStyleX, -bodyStyleY / (5 / 3))
						document.getElementById('bodyStyleSelector').style.left = (bodyStyleX + 64.5) + "px"
					}
					height = (rules.scales.height.min + (rules.scales.height.max - rules.scales.height.min) * (Math.floor(bodySizeY) / 100)).toFixed(2)
					width = (rules.scales.width.min + (rules.scales.width.max - rules.scales.width.min) * (Math.ceil(bodySizeX) / 100)).toFixed(2)
					proportion = (rules.scales.proportion.min + (rules.scales.proportion.max - rules.scales.proportion.min) * (1 - Math.floor(Math.min(getDistance(-54.599, 91, bodyStyleX, bodyStyleY), 90)) / 90).toFixed(2)).toFixed(2)
					bodyType = (rules.scales.bodyType.min + (rules.scales.bodyType.max - rules.scales.bodyType.min) * (Math.round(bodyStyleY) / 91)).toFixed(2)
					document.getElementById('bodyColorContainer').style.transform = "scaleX(" + (0.8 * width - (0.1 * (0.5 - (1 - proportion)))) + ") scaleY(" + (0.9 * height - (0.2 * (0.25 - bodyType))) + ")"
				}
			});
			document.getElementById('headSlider').addEventListener('change', function() {
				if (!areBodyAdjustmentsEnabled()) {
					return
				}
				setScales(scales.height * 100, scales.width * 100, scales.proportion * 100, scales.bodyType * 100, (((rules.scales.head.max - rules.scales.head.min) * (parseInt(this.value) / 5) + rules.scales.head.min) * 100).toFixed())
			})
			document.getElementById('defaultScales').addEventListener('click', function() {
				if (!areBodyAdjustmentsEnabled()) {
					return
				}
				setScales(100, 100, 0, 0, 100)
				scalesDetails = {height: -1, width: -1, proportion: -1, bodyType: -1, head: -1}
			})
		} else {
			setTimeout(function() {
				mainAvatar()
			}, 100)
		}
	}
}

mainAvatar()

var thumbnailExists = 0
var loadingWearing = false
var avatarPreviewSignature = ""

function getAvatarPreviewSignature() {
	var previewSelectors = [
		'#UserAvatar .thumbnail-2d img',
		'#UserAvatar .thumbnail-3d img',
		'#UserAvatar .thumbnail-2d',
		'#UserAvatar .thumbnail-3d',
		'#avatar-react-container .left-wrapper .thumbnail-2d img',
		'#avatar-react-container .left-wrapper .thumbnail-3d img',
		'#avatar-react-container .left-wrapper .thumbnail-2d',
		'#avatar-react-container .left-wrapper .thumbnail-3d',
		'[avatar-back] .thumbnail-2d img',
		'[avatar-back] .thumbnail-3d img',
		'[avatar-back] .thumbnail-2d',
		'[avatar-back] .thumbnail-3d',
		'[avatar-base] .thumbnail-2d img',
		'[avatar-base] .thumbnail-3d img',
		'[avatar-base] .thumbnail-2d',
		'[avatar-base] .thumbnail-3d'
	]
	var previewNode = null
	for (var i = 0; i < previewSelectors.length; i++) {
		var selectorMatches = document.querySelectorAll(previewSelectors[i])
		for (var j = 0; j < selectorMatches.length; j++) {
			var selectorMatch = selectorMatches[j]
			if (selectorMatch == null || typeof selectorMatch.closest != "function") {
				continue
			}
			if (selectorMatch.closest('.right-panel') != null) {
				continue
			}
			previewNode = selectorMatch
			break
		}
		if (previewNode != null) {
			break
		}
	}
	if (previewNode == null) {
		return ""
	}
	return [
		previewNode.tagName || "",
		previewNode.getAttribute('src') || "",
		previewNode.getAttribute('data-src') || "",
		previewNode.getAttribute('class') || "",
		previewNode.getAttribute('style') || ""
	].join("|")
}

async function mainInterval() {
	if (await fetchSetting("avatarEditorChanges")) {
		scheduleQuickEquipSharedInventoryPrewarm()
		setInterval(function() {
			ensureAvatarMenuAnchorPlacement()
			if (loadingWearing == false && !wearAssetsRequestInFlight && (Date.now() - wearAssetsLastCompletedAt > 2000)) {
				var currentThumbnailCount = Math.max($('#UserAvatar .thumbnail-2d').length, $('#UserAvatar .thumbnail-3d').length)
				var currentPreviewSignature = getAvatarPreviewSignature()
				if (currentThumbnailCount != thumbnailExists || currentPreviewSignature != avatarPreviewSignature) {
					thumbnailExists = currentThumbnailCount
					avatarPreviewSignature = currentPreviewSignature
					setTimeout(function() {
						loadingWearing = true
						setTimeout(function() {
							loadingWearing = false
						}, 1500)
						loadCurrentlyWearing()
					}, 120)
				}
			}
		}, 250)
		$(document).ready(function() {
			document.getElementsByTagName('body')[0].classList.add('ropro-changes')
		})
		window.addEventListener('load', (event) => {
			//checkCharacterType()
		});
	} else {
		$(document).ready(function() {
			document.getElementsByTagName('body')[0].classList.add('changes-disabled')
		})
	}
}
mainInterval()
