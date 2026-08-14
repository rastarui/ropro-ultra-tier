function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
}

function validateLicense() {
	chrome.runtime.sendMessage({greeting: "ValidateLicense"})
}

function fetchSetting(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSetting", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchVisualGate(gateKey) {
	return new Promise(resolve => {
		if (typeof roproApiAdapter != "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getVisualGatePromise == "function") {
			roproApiAdapter.getVisualGatePromise(gateKey).then(function(data) {
				resolve(data)
			}).catch(function() {
				resolve(null)
			})
			return
		}
		chrome.runtime.sendMessage({greeting: "GetVisualGate", gateKey: gateKey}, function(data) {
			resolve(data)
		})
	})
}

function shouldShowTradeOffersMenuItem(tradeOffersGate) {
	if (tradeOffersGate == null || typeof tradeOffersGate != "object") {
		return false
	}
	if (
		typeof roproApiAdapter != "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateAllowed == "function"
	) {
		return roproApiAdapter.isVisualGateAllowed(tradeOffersGate)
	}
	return tradeOffersGate.allowed === true
}

function normalizeAlertDisplay(rawDisplay) {
	if (typeof rawDisplay != "string") {
		return "block"
	}
	var display = rawDisplay.trim().toLowerCase()
	if (display === "none" || display === "inline" || display === "inline-block" || display === "inline-flex" || display === "flex" || display === "grid" || display === "block") {
		return display
	}
	return "block"
}

function normalizeAlertText(rawText) {
	if (typeof rawText != "string") {
		return ""
	}
	return rawText
		.replace(/(<([^>]+)>)/gi, "")
		.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
		.trim()
}

function normalizeAlertLink(rawUrl) {
	if (typeof rawUrl != "string") {
		return ""
	}
	var candidate = rawUrl.trim().slice(0, 2048)
	if (candidate.length == 0) {
		return ""
	}
	if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeUpgradeUrl === "function") {
		var safeUpgradeUrl = roproApiAdapter.getSafeUpgradeUrl(candidate)
		if (typeof safeUpgradeUrl == "string" && safeUpgradeUrl.length > 0) {
			return safeUpgradeUrl
		}
	}
	try {
		var parsedUrl = new URL(candidate, window.location.origin)
		if (parsedUrl.protocol !== "https:") {
			return ""
		}
		var host = parsedUrl.hostname.toLowerCase()
		if (
			host === "ropro.io" ||
			host === "www.ropro.io" ||
			host.endsWith(".ropro.io") ||
			host === "roblox.com" ||
			host === "www.roblox.com" ||
			host.endsWith(".roblox.com")
		) {
			return parsedUrl.href
		}
	} catch (_) {}
	return ""
}

function parseStoredAlertPayload(rawAlert) {
	if (typeof rawAlert != "string") {
		return null
	}
	var alertString = rawAlert.trim()
	if (alertString.length == 0) {
		return null
	}
	try {
		var parsedAlert = JSON.parse(alertString)
		if (parsedAlert != null && typeof parsedAlert == "object" && !Array.isArray(parsedAlert)) {
			var parsedMessage = normalizeAlertText(typeof parsedAlert.message == "string" ? parsedAlert.message : "")
			if (parsedMessage.length == 0) {
				return null
			}
			var parsedLink = normalizeAlertLink(parsedAlert.link)
			var parsedLinkText = normalizeAlertText(typeof parsedAlert.linkText == "string" ? parsedAlert.linkText : "")
			if (parsedLink.length == 0 || parsedLinkText.length == 0) {
				parsedLink = ""
				parsedLinkText = ""
			}
			return {
				display: normalizeAlertDisplay(parsedAlert.display),
				message: parsedMessage,
				link: parsedLink,
				linkText: parsedLinkText
			}
		}
	} catch (_) {}
	var alertParts = alertString.split(";")
	var fallbackMessage = normalizeAlertText(alertParts.length > 1 ? alertParts.slice(1).join(";") : alertParts[0])
	if (fallbackMessage.length == 0) {
		return null
	}
	return {
		display: normalizeAlertDisplay(alertParts[0]),
		message: fallbackMessage,
		link: "",
		linkText: ""
	}
}

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function getStorage_UniquelyNamedFunction(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: value}, function(){
			resolve()
		})
	})
}

function getLocalStorage(key) {
	return new Promise(resolve => {
		chrome.storage.local.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setLocalStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.local.set({[key]: value}, function(){
			resolve()
		})
	})
}

function fetchSubscription(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSubscription", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function getUserId() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetUserID"},
			function(data) {
				resolve(data)
			}
		)
	})
}

function openOptions() {
	chrome.runtime.sendMessage({greeting: "OpenOptions"})
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function parseRgb(c) {
	if (typeof c != "string") {
		return null
	}
	var normalized = c.trim().toLowerCase()
	if (normalized.length == 0 || normalized == "transparent") {
		return null
	}
	var openParenIndex = normalized.indexOf("(")
	var closeParenIndex = normalized.lastIndexOf(")")
	if (!(normalized.startsWith("rgb(") || normalized.startsWith("rgba(")) || openParenIndex == -1 || closeParenIndex == -1) {
		return null
	}
	var content = normalized.substring(openParenIndex + 1, closeParenIndex).trim()
	var alpha = 1
	if (content.includes("/")) {
		var slashSplit = content.split("/")
		content = slashSplit[0].trim()
		alpha = parseFloat(slashSplit[1])
	}
	var channels = content.includes(",") ? content.split(",") : content.split(/\s+/)
	if (channels.length < 3) {
		return null
	}
	var r = parseInt(channels[0], 10)
	var g = parseInt(channels[1], 10)
	var b = parseInt(channels[2], 10)
	if (channels.length >= 4 && !content.includes("/")) {
		alpha = parseFloat(channels[3])
	}
	if (isNaN(alpha)) {
		alpha = 1
	}
	if (isNaN(r) || isNaN(g) || isNaN(b) || alpha <= 0) {
		return null
	}
	return {
		r: Math.max(0, Math.min(255, r)),
		g: Math.max(0, Math.min(255, g)),
		b: Math.max(0, Math.min(255, b)),
		a: alpha
	}
}

function parseCssColor(color) {
	if (typeof color != "string") {
		return null
	}
	var normalized = color.trim().toLowerCase()
	if (normalized.length == 0 || normalized == "transparent") {
		return null
	}
	if (normalized.startsWith("#")) {
		var rgb = hexToRgb(normalized)
		if (rgb != null) {
			rgb.a = 1
		}
		return rgb
	}
	return parseRgb(normalized)
}

function isThemesPage() {
	var path = window.location.pathname || ""
	if (/\/themes\/?$/i.test(path)) {
		return true
	}
	var pathParts = path.split("/").filter(function(part) {
		return part.length > 0
	})
	if (pathParts.length < 2) {
		return false
	}
	try {
		if (Intl.getCanonicalLocales(pathParts[0]).length > 0) {
			return /^themes\/?$/i.test(pathParts.slice(1).join("/"))
		}
	} catch (_) {
		return false
	}
	return false
}

function getCurrentPathWithoutLocalePrefix() {
	var path = window.location.pathname || ""
	var pathParts = path.split("/").filter(function(part) {
		return part.length > 0
	})
	if (pathParts.length < 2) {
		return path
	}
	try {
		if (Intl.getCanonicalLocales(pathParts[0]).length > 0) {
			return "/" + pathParts.slice(1).join("/")
		}
	} catch (_) {}
	return path
}

function isCommunitiesLayoutPage() {
	var normalizedPath = getCurrentPathWithoutLocalePrefix().toLowerCase()
	return /^\/(?:my\/)?communities(?:\/|$)/.test(normalizedPath)
		|| /^\/(?:my\/)?groups(?:\/|$)/.test(normalizedPath)
}

function shouldUseCommunitiesThemeSideGutters() {
	if (!isCommunitiesLayoutPage()) {
		return false
	}
	if (typeof window.matchMedia == "function") {
		return window.matchMedia("(min-width: 992px)").matches
	}
	return typeof window.innerWidth != "number" || window.innerWidth >= 992
}

function getCommunitiesThemeSideGutterPadding() {
	return shouldUseCommunitiesThemeSideGutters() ? "0 20px" : ""
}

var roproThemeBackdropFrameId = "roproThemeBackdropFrame"
var pendingThemeVisualSettings = {foregroundOpacity: undefined, backdropBlur: undefined}
var themeForegroundOpacityRange = {min: 0.3, max: 1}
var themeVisualObserver = null
var themeVisualRetryTimer = null
var themeVisualRetryAttemptsLeft = 0
var themeVisualApplyTimer = null
var themeFrameNodeObserver = null
var themeFrameNodeObserverTarget = null
var themeFramePresenceObserver = null
var themeBlurTargetObserver = null
var themeBlurTargetObserverTarget = null
var themeBlurTargetResizeObserver = null

function setThemeDocumentBackgroundForBackdrop(isBackdropReady) {
	var backgroundColor = isBackdropReady ? "transparent" : ""
	if (document.documentElement != null) {
		document.documentElement.style.backgroundColor = backgroundColor
	}
	if (document.body != null) {
		document.body.style.backgroundColor = backgroundColor
	}
}

function ensureThemeBackdropLayer() {
	var themeFrame = document.getElementById('roproThemeFrame')
	if (themeFrame == null) {
		return false
	}
	var themeSrc = themeFrame.getAttribute('src')
	if (typeof themeSrc != "string" || themeSrc.length == 0) {
		return false
	}
	var safeThemeSrc = typeof roproApiAdapter.getSafeThemeFrameUrl == "function" ? roproApiAdapter.getSafeThemeFrameUrl(themeSrc) : themeSrc
	if (safeThemeSrc == null) {
		return false
	}
	var backdropFrame = document.getElementById(roproThemeBackdropFrameId)
	if (backdropFrame == null) {
		backdropFrame = document.createElement('iframe')
		backdropFrame.id = roproThemeBackdropFrameId
		backdropFrame.setAttribute('frameborder', '0')
		backdropFrame.setAttribute('aria-hidden', 'true')
		backdropFrame.setAttribute('tabindex', '-1')
		backdropFrame.setAttribute('data-loaded-src', '')
		backdropFrame.style.top = "0"
		backdropFrame.style.left = "0"
		backdropFrame.style.position = "fixed"
		backdropFrame.style.border = "0"
		backdropFrame.style.width = "100%"
		backdropFrame.style.height = "100%"
		backdropFrame.style.pointerEvents = "none"
		backdropFrame.style.zIndex = "-1"
		backdropFrame.addEventListener('load', function() {
			var loadedSrc = backdropFrame.getAttribute('src')
			if (typeof loadedSrc == "string" && loadedSrc.length > 0) {
				backdropFrame.setAttribute('data-loaded-src', loadedSrc)
			}
			setThemeDocumentBackgroundForBackdrop(true)
			queueThemeVisualApplyAttempt()
		})
		var host = document.body != null ? document.body : document.documentElement
		if (host == null) {
			return false
		}
		host.appendChild(backdropFrame)
	}
	if (backdropFrame.getAttribute('src') != safeThemeSrc) {
		backdropFrame.setAttribute('data-loaded-src', '')
		setThemeDocumentBackgroundForBackdrop(false)
		backdropFrame.setAttribute('src', safeThemeSrc)
	}
	setThemeDocumentBackgroundForBackdrop(backdropFrame.getAttribute('data-loaded-src') == safeThemeSrc)
	return true
}

function clearThemeBackdropLayer() {
	var backdropFrame = document.getElementById(roproThemeBackdropFrameId)
	if (backdropFrame != null) {
		backdropFrame.remove()
	}
	if (document.documentElement != null) {
		document.documentElement.style.backgroundColor = ""
	}
	if (document.body != null) {
		document.body.style.backgroundColor = ""
	}
}

function detachThemeFrameNodeObserver() {
	if (themeFrameNodeObserver != null) {
		themeFrameNodeObserver.disconnect()
		themeFrameNodeObserver = null
	}
	themeFrameNodeObserverTarget = null
}

function attachThemeFrameNodeObserver(themeFrame) {
	if (themeFrame == null || themeFrameNodeObserverTarget === themeFrame) {
		return
	}
	detachThemeFrameNodeObserver()
	themeFrameNodeObserverTarget = themeFrame
	themeFrameNodeObserver = new MutationObserver(function() {
		ensureThemeBackdropLayer()
	})
	themeFrameNodeObserver.observe(themeFrame, {attributes: true, attributeFilter: ["src"]})
}

function mutationTouchesThemeFrame(mutation) {
	var mutationNodeLists = [mutation.addedNodes, mutation.removedNodes]
	for (var listIndex = 0; listIndex < mutationNodeLists.length; listIndex++) {
		var nodeList = mutationNodeLists[listIndex]
		for (var i = 0; i < nodeList.length; i++) {
			var node = nodeList[i]
			if (node == null || node.nodeType !== 1) {
				continue
			}
			if (node.id == "roproThemeFrame") {
				return true
			}
			if (typeof node.querySelector == "function" && node.querySelector('#roproThemeFrame') != null) {
				return true
			}
		}
	}
	return false
}

function syncThemeBackdropLayerForCurrentFrame() {
	var themeFrame = document.getElementById('roproThemeFrame')
	if (themeFrame == null) {
		detachThemeFrameNodeObserver()
		if (isThemesPage()) {
			clearThemeBackdropLayer()
		}
		return false
	}
	attachThemeFrameNodeObserver(themeFrame)
	return ensureThemeBackdropLayer()
}

function startThemeBackdropSync() {
	if (document.documentElement == null) {
		return
	}
	if (themeFramePresenceObserver == null) {
		themeFramePresenceObserver = new MutationObserver(function(mutations) {
			for (var i = 0; i < mutations.length; i++) {
				if (mutationTouchesThemeFrame(mutations[i])) {
					syncThemeBackdropLayerForCurrentFrame()
					return
				}
			}
		})
		themeFramePresenceObserver.observe(document.documentElement, {childList: true, subtree: true})
	}
	syncThemeBackdropLayerForCurrentFrame()
}

function stopThemeBackdropSync() {
	detachThemeFrameNodeObserver()
	if (themeFramePresenceObserver != null) {
		themeFramePresenceObserver.disconnect()
		themeFramePresenceObserver = null
	}
	clearThemeBackdropLayer()
	detachThemeBlurTargetObserver()
}

function getForegroundOpacityElements() {
	var selectors = [
		"#content",
		".content",
		".section-content",
		"#inventory-container",
		"#HomeContainer",
		".place-list-container",
		".game-home-page-container",
		".assets-explorer-main-content",
		".tab-content-group",
		".recommendations-container",
		".recommended-items",
		".item-cards-embed",
		"#private-message-web-app",
		".messages-container",
		".friends-container",
		".catalog-header",
		".catalog-heading-container",
		".catalog-search-options-top-bar",
		".catalog-header .search-bars",
		".catalog-header .search-container",
		".catalog-header .topic-container",
		".catalog-header .topic-carousel",
		".catalog-header .topic-navigation-right",
		".catalog-header .topic-navigation-blur-right",
		".groups-list-sidebar",
		".group-react-groups-list",
		".groups-list-new",
		".group-section-content",
		"#footer-container",
		".container-footer",
		".summary"
	]
	var elements = []
	var nodes = document.querySelectorAll(selectors.join(","))
	for (var i = 0; i < nodes.length; i++) {
		elements.push(nodes[i])
	}
	return elements
}

function getElementDomDepth(element) {
	var depth = 0
	var node = element
	while (node != null && node.parentElement != null) {
		depth++
		node = node.parentElement
	}
	return depth
}

function getForegroundOpacityElementsByPriority() {
	var elements = getForegroundOpacityElements()
	elements.sort(function(a, b) {
		var depthDelta = getElementDomDepth(a) - getElementDomDepth(b)
		if (depthDelta != 0) {
			return depthDelta
		}
		if (a === b) {
			return 0
		}
		if (typeof a.compareDocumentPosition == "function") {
			var position = a.compareDocumentPosition(b)
			if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
				return -1
			}
			if (position & Node.DOCUMENT_POSITION_PRECEDING) {
				return 1
			}
		}
		return 0
	})
	return elements
}

function hasAppliedForegroundAncestor(element, appliedRoots) {
	for (var i = 0; i < appliedRoots.length; i++) {
		var root = appliedRoots[i]
		if (root != null && root !== element && root.contains(element)) {
			return true
		}
	}
	return false
}

function shouldPreserveNestedForegroundLayer(element) {
	if (element == null || element.classList == null) {
		return false
	}
	// Keep communities sidebar shell tinted; inner card is normalized to avoid double alpha stacking.
	return element.classList.contains('groups-list-sidebar')
}

function shouldKeepNestedForegroundBaseLayer(element) {
	if (element == null || element.classList == null) {
		return false
	}
	// Avatar/profile tab flyout menus lose text contrast when forced transparent.
	return element.classList.contains('tab-horizontal-submenu')
		|| (element.classList.contains('section-content') && element.classList.contains('six-column'))
}

function clearNestedForegroundSurfaceOverride(element) {
	if (element == null || element.style == null) {
		return
	}
	if (element.style.backgroundColor == "transparent") {
		element.style.backgroundColor = ""
	}
	if (element.style.backgroundImage == "none") {
		element.style.backgroundImage = ""
	}
}

function getForegroundOpacityColorSourceElement(element) {
	if (element == null || element.classList == null) {
		return element
	}
	// Keep communities shell and card color in sync so transparency changes do not reveal a mismatched edge.
	if (element.classList.contains('groups-list-sidebar')) {
		var communitiesCard = element.querySelector('.groups-list-new')
		if (communitiesCard != null) {
			return communitiesCard
		}
	}
	return element
}

function getThemeForegroundFallbackRgb(element) {
	if (element == null) {
		return null
	}
	var isLightTheme = document.body != null && document.body.classList.contains('light-theme')
	var fallback = isLightTheme ? {r: 242, g: 244, b: 245, a: 1} : {r: 18, g: 18, b: 21, a: 1}
	if (element.classList.contains('content')
		|| element.id == "content"
		|| element.id == "inventory-container"
		|| element.id == "HomeContainer"
		|| element.id == "private-message-web-app"
		|| element.classList.contains('messages-container')
		|| element.classList.contains('friends-container')
		|| element.classList.contains('assets-explorer-main-content')
		|| element.classList.contains('tab-content-group')
		|| element.classList.contains('recommendations-container')
		|| element.classList.contains('recommended-items')
		|| element.classList.contains('item-cards-embed')
		|| element.classList.contains('catalog-header')
		|| element.classList.contains('catalog-heading-container')
		|| element.classList.contains('catalog-search-options-top-bar')
		|| element.classList.contains('search-bars')
		|| element.classList.contains('search-container')
		|| element.classList.contains('topic-container')
		|| element.classList.contains('topic-carousel')
		|| element.classList.contains('topic-navigation-right')
		|| element.classList.contains('topic-navigation-blur-right')
		|| element.classList.contains('groups-list-sidebar')
		|| element.classList.contains('group-react-groups-list')
		|| element.classList.contains('groups-list-new')
		|| element.classList.contains('group-section-content')
		|| element.id == "footer-container"
		|| element.classList.contains('container-footer')
		|| element.classList.contains('summary')) {
		return fallback
	}
	return null
}

function getForegroundOpacityRgb(element) {
	if (element == null) {
		return null
	}
	var sourceElement = getForegroundOpacityColorSourceElement(element)
	if (sourceElement == null) {
		sourceElement = element
	}
	var color = window.getComputedStyle(sourceElement, null).getPropertyValue('background-color')
	var rgb = parseCssColor(color)
	if (rgb == null) {
		rgb = getThemeForegroundFallbackRgb(sourceElement)
	}
	if (rgb == null && sourceElement !== element) {
		rgb = getThemeForegroundFallbackRgb(element)
	}
	return rgb
}

function normalizeNestedForegroundSurface(element) {
	if (element == null) {
		return
	}
	var rgb = getForegroundOpacityRgb(element)
	if (rgb == null) {
		return
	}
	element.style.backgroundColor = "transparent"
	element.style.backgroundImage = "none"
}

function normalizeCommunitiesSidebarNestedLayers(element) {
	if (element == null || element.classList == null || !element.classList.contains('groups-list-sidebar')) {
		return
	}
	var nestedLayers = element.querySelectorAll('.group-react-groups-list, .groups-list-new')
	for (var i = 0; i < nestedLayers.length; i++) {
		normalizeNestedForegroundSurface(nestedLayers[i])
	}
}

function normalizeFooterOpacityLayers(opacity) {
	var footerContainer = document.getElementById('footer-container')
	if (footerContainer == null) {
		footerContainer = document.querySelector('.container-footer')
	}
	if (footerContainer == null) {
		return
	}
	var innerFooter = footerContainer.querySelector('.footer')
	if (innerFooter == null && footerContainer.id == "footer-container") {
		innerFooter = footerContainer.querySelector('.container-footer')
	}
	var parsedOpacity = normalizeForegroundOpacity(opacity)
	var containerColor = window.getComputedStyle(footerContainer, null).getPropertyValue('background-color')
	var innerFooterColor = ""
	if (innerFooter != null) {
		innerFooterColor = window.getComputedStyle(innerFooter, null).getPropertyValue('background-color')
	}
	var rgb = parseCssColor(containerColor)
	if (rgb == null) {
		rgb = parseCssColor(innerFooterColor)
	}
	if (rgb == null) {
		rgb = getThemeForegroundFallbackRgb(footerContainer)
	}
	if (rgb == null) {
		rgb = getThemeForegroundFallbackRgb(innerFooter)
	}
	if (rgb != null) {
		footerContainer.style.setProperty('background-color', `rgba(${rgb['r']}, ${rgb['g']}, ${rgb['b']}, ${parsedOpacity})`, 'important')
	} else {
		footerContainer.style.setProperty('background-color', containerColor, 'important')
	}
	footerContainer.style.setProperty('background-image', "none", 'important')
	if (innerFooter != null && innerFooter !== footerContainer) {
		innerFooter.style.setProperty('background-color', "transparent", 'important')
		innerFooter.style.setProperty('background-image', "none", 'important')
		innerFooter.style.setProperty('box-shadow', "none", 'important')
	}
}

function hasThemeVisualSettingValue(value) {
	return typeof value != 'undefined' && value !== null && value !== ""
}

function normalizeForegroundOpacity(opacity) {
	var parsedOpacity = parseFloat(opacity)
	if (isNaN(parsedOpacity) || !isFinite(parsedOpacity)) {
		return themeForegroundOpacityRange.max
	}
	if (parsedOpacity < themeForegroundOpacityRange.min) {
		return themeForegroundOpacityRange.min
	}
	if (parsedOpacity > themeForegroundOpacityRange.max) {
		return themeForegroundOpacityRange.max
	}
	return parsedOpacity
}

function startThemeVisualObserver() {
	if (themeVisualObserver != null || document.documentElement == null) {
		return
	}
	themeVisualObserver = new MutationObserver(function() {
		if (!hasThemeVisualSettingValue(pendingThemeVisualSettings.foregroundOpacity)
			&& !hasThemeVisualSettingValue(pendingThemeVisualSettings.backdropBlur)) {
			return
		}
		queueThemeVisualApplyAttempt()
	})
	themeVisualObserver.observe(document.documentElement, {childList: true, subtree: true})
}

function queueThemeVisualApplyAttempt() {
	if (themeVisualApplyTimer != null) {
		return
	}
	themeVisualApplyTimer = setTimeout(function() {
		themeVisualApplyTimer = null
		runThemeVisualApplyAttempt()
	}, 75)
}

function scheduleThemeVisualRetryAttempt() {
	if (themeVisualRetryAttemptsLeft <= 0 || themeVisualRetryTimer != null) {
		return
	}
	themeVisualRetryTimer = setTimeout(function() {
		themeVisualRetryTimer = null
		themeVisualRetryAttemptsLeft--
		queueThemeVisualApplyAttempt()
	}, 100)
}

function runThemeVisualApplyAttempt() {
	if (document.getElementById('roproThemeFrame') == null || !ensureThemeBackdropLayer()) {
		scheduleThemeVisualRetryAttempt()
		return false
	}
	var needsRetry = false
	if (hasThemeVisualSettingValue(pendingThemeVisualSettings.foregroundOpacity)) {
		if (!setForegroundOpacity(pendingThemeVisualSettings.foregroundOpacity)) {
			needsRetry = true
		}
		var foregroundOpacity = normalizeForegroundOpacity(pendingThemeVisualSettings.foregroundOpacity)
		if (!isNaN(foregroundOpacity)
			&& foregroundOpacity < 1
			&& document.getElementById('game-details-carousel-container') != null) {
			document.getElementById('game-details-carousel-container').style.borderRadius = "10px"
		}
	}
	if (hasThemeVisualSettingValue(pendingThemeVisualSettings.backdropBlur)
		&& parseInt(pendingThemeVisualSettings.backdropBlur) > 0) {
		if (!setBackdropBlur(pendingThemeVisualSettings.backdropBlur)) {
			needsRetry = true
		}
	}
	if (needsRetry) {
		scheduleThemeVisualRetryAttempt()
		return false
	}
	themeVisualRetryAttemptsLeft = 0
	if (themeVisualRetryTimer != null) {
		clearTimeout(themeVisualRetryTimer)
		themeVisualRetryTimer = null
	}
	return true
}

function applyThemeVisualSettingsWhenReady(foregroundOpacity, backdropBlur, retries) {
	if (isThemesPage()) {
		stopThemeBackdropSync()
		return
	}
	startThemeBackdropSync()
	if (typeof foregroundOpacity == 'undefined' || foregroundOpacity === null || foregroundOpacity === "") {
		foregroundOpacity = 1
	}
	pendingThemeVisualSettings.foregroundOpacity = foregroundOpacity
	if (typeof backdropBlur != 'undefined') {
		pendingThemeVisualSettings.backdropBlur = backdropBlur
	}
	if (typeof retries != "number") {
		retries = 20
	}
	themeVisualRetryAttemptsLeft = Math.max(themeVisualRetryAttemptsLeft, retries)
	startThemeVisualObserver()
	queueThemeVisualApplyAttempt()
}

function hasActiveThemeVisualContext() {
	if (document.getElementById('roproThemeFrame') != null) {
		return true
	}
	if (document.body != null && document.body.classList.contains('ropro-profile-theme-active')) {
		return true
	}
	var mainContainer = document.getElementById('container-main')
	return mainContainer != null && mainContainer.classList.contains('ropro-theme')
}

function getThemeVisualPrimaryContentContainer() {
	var contentById = document.getElementById('content')
	if (contentById != null) {
		return contentById
	}
	var content = document.getElementsByClassName('content')
	if (content.length == 0 || content[0] == null) {
		return null
	}
	return content[0]
}

function detachThemeBlurTargetObserver() {
	if (themeBlurTargetObserver != null) {
		themeBlurTargetObserver.disconnect()
		themeBlurTargetObserver = null
	}
	if (themeBlurTargetResizeObserver != null) {
		themeBlurTargetResizeObserver.disconnect()
		themeBlurTargetResizeObserver = null
	}
	themeBlurTargetObserverTarget = null
}

function attachThemeBlurTargetObserver(targetElement) {
	if (targetElement == null) {
		detachThemeBlurTargetObserver()
		return
	}
	if (themeBlurTargetObserverTarget === targetElement) {
		return
	}
	detachThemeBlurTargetObserver()
	themeBlurTargetObserverTarget = targetElement
	themeBlurTargetObserver = new MutationObserver(function(mutations) {
		if (!hasThemeVisualSettingValue(pendingThemeVisualSettings.backdropBlur)
			|| parseInt(pendingThemeVisualSettings.backdropBlur) <= 0) {
			return
		}
		for (var i = 0; i < mutations.length; i++) {
			if (mutations[i].type == "attributes") {
				queueThemeVisualApplyAttempt()
				return
			}
		}
	})
	themeBlurTargetObserver.observe(targetElement, {attributes: true, attributeFilter: ["style", "class"]})
	if (typeof ResizeObserver == "function") {
		themeBlurTargetResizeObserver = new ResizeObserver(function() {
			if (!hasThemeVisualSettingValue(pendingThemeVisualSettings.backdropBlur)
				|| parseInt(pendingThemeVisualSettings.backdropBlur) <= 0) {
				return
			}
			queueThemeVisualApplyAttempt()
		})
		themeBlurTargetResizeObserver.observe(targetElement)
	}
}

function clearThemeBackdropFrameBlur() {
	var backdropFrame = document.getElementById(roproThemeBackdropFrameId)
	if (backdropFrame == null) {
		return
	}
	backdropFrame.style.filter = ""
	backdropFrame.style.webkitFilter = ""
	backdropFrame.style.clipPath = ""
	backdropFrame.style.webkitClipPath = ""
}

function setThemeBackdropFrameBlurForContentShell(contentContainer, parsedPixels) {
	if (contentContainer == null || parsedPixels <= 0) {
		clearThemeBackdropFrameBlur()
		return false
	}
	var backdropFrame = document.getElementById(roproThemeBackdropFrameId)
	if (backdropFrame == null) {
		return false
	}
	var blurValue = `blur(${parsedPixels}px)`
	if (backdropFrame.style.filter == blurValue) {
		backdropFrame.style.filter = ""
	}
	backdropFrame.style.filter = blurValue
	if (backdropFrame.style.webkitFilter == blurValue) {
		backdropFrame.style.webkitFilter = ""
	}
	backdropFrame.style.webkitFilter = blurValue

	// Constrain frame blur to content shell so off-content background remains unblurred.
	var rect = contentContainer.getBoundingClientRect()
	if (isCommunitiesLayoutPage()) {
		var communitiesSidebar = document.querySelector('.groups-list-sidebar')
		if (communitiesSidebar != null) {
			var sidebarRect = communitiesSidebar.getBoundingClientRect()
			if (sidebarRect.width > 0 && sidebarRect.height > 0) {
				rect = {
					top: Math.min(rect.top, sidebarRect.top),
					right: Math.max(rect.right, sidebarRect.right),
					bottom: Math.max(rect.bottom, sidebarRect.bottom),
					left: Math.min(rect.left, sidebarRect.left)
				}
			}
		}
	}
	var topInset = Math.max(0, Math.round(rect.top))
	var rightInset = Math.max(0, Math.round(window.innerWidth - rect.right))
	var bottomInset = Math.max(0, Math.round(window.innerHeight - rect.bottom))
	var leftInset = Math.max(0, Math.round(rect.left))
	var borderRadius = window.getComputedStyle(contentContainer, null).getPropertyValue('border-radius')
	var clipPath = `inset(${topInset}px ${rightInset}px ${bottomInset}px ${leftInset}px)`
	if (typeof borderRadius == "string" && borderRadius.length > 0 && borderRadius != "0px") {
		clipPath = `inset(${topInset}px ${rightInset}px ${bottomInset}px ${leftInset}px round ${borderRadius})`
	}
	backdropFrame.style.clipPath = clipPath
	backdropFrame.style.webkitClipPath = clipPath
	return true
}

function setForegroundOpacity(opacity) {
	var hasThemeFrame = document.getElementById('roproThemeFrame') != null
	if (!hasThemeFrame && !hasActiveThemeVisualContext()) {
		return false
	}
	if (isThemesPage()) {
		clearThemeBackdropLayer()
	} else if (hasThemeFrame) {
		ensureThemeBackdropLayer()
	}
	var parsedOpacity = normalizeForegroundOpacity(opacity)
	var elements = getForegroundOpacityElementsByPriority()
	var appliedCount = 0
	var appliedRoots = []
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i]
		if (element == null) {
			continue
		}
		if (shouldKeepNestedForegroundBaseLayer(element)) {
			clearNestedForegroundSurfaceOverride(element)
			continue
		}
		if (hasAppliedForegroundAncestor(element, appliedRoots)) {
			if (shouldKeepNestedForegroundBaseLayer(element)) {
				clearNestedForegroundSurfaceOverride(element)
				continue
			}
			if (!shouldPreserveNestedForegroundLayer(element)) {
				normalizeNestedForegroundSurface(element)
				continue
			}
		}
		var rgb = getForegroundOpacityRgb(element)
		if (rgb == null) {
			continue
		}
		element.style.backgroundColor = `rgba(${rgb['r']}, ${rgb['g']}, ${rgb['b']}, ${parsedOpacity})`
		normalizeCommunitiesSidebarNestedLayers(element)
		appliedCount++
		appliedRoots.push(element)
		if (parsedOpacity < 1 && (element.id == "content" || element.classList.contains('content'))) {
			element.style.boxShadow = `rgba(0, 0, 0, 0.25) 0px 0px 3px 1px`
		}
	}
	normalizeFooterOpacityLayers(parsedOpacity)
	return appliedCount > 0
}

function setBackdropBlur(pixels) {
	var hasThemeFrame = document.getElementById('roproThemeFrame') != null
	if (!hasThemeFrame && !hasActiveThemeVisualContext()) {
		return false
	}
	if (isThemesPage()) {
		clearThemeBackdropLayer()
	} else if (hasThemeFrame) {
		ensureThemeBackdropLayer()
	}
	var parsedPixels = parseInt(pixels)
	if (isNaN(parsedPixels) || parsedPixels < 0) {
		parsedPixels = 0
	}
	var contentContainer = getThemeVisualPrimaryContentContainer()
	if (contentContainer == null) {
		detachThemeBlurTargetObserver()
		clearThemeBackdropFrameBlur()
		return false
	}
	var blurValue = `blur(${parsedPixels}px)`
	// Communities/groups pages have sidebar + content as siblings inside #content.
	// backdrop-filter on #content creates a new containing block which breaks
	// sidebar positioning. Use filter:blur() on the fixed backdrop iframe instead.
	// Full-viewport blur avoids the clip-edge scroll desync from THM-007.
	if (isCommunitiesLayoutPage()) {
		contentContainer.style.backdropFilter = ""
		contentContainer.style.webkitBackdropFilter = ""
		var appliedFrameBlur = setThemeBackdropFrameBlurForContentShell(contentContainer, parsedPixels)
		if (appliedFrameBlur) {
			attachThemeBlurTargetObserver(contentContainer)
		}
	} else {
		// Default path: use backdrop-filter on the content container. Chrome's
		// compositor desynchronizes filter:blur() on position:fixed layers during
		// momentum/elastic scroll, so backdrop-filter on the scrolling content
		// element is preferred on standard layouts.
		clearThemeBackdropFrameBlur()
		// Force a value transition on reapply so Chromium compositor/hydration clears cannot leave stale no-blur state.
		if (contentContainer.style.backdropFilter == blurValue) {
			contentContainer.style.backdropFilter = ""
		}
		contentContainer.style.backdropFilter = blurValue
		if (contentContainer.style.webkitBackdropFilter == blurValue) {
			contentContainer.style.webkitBackdropFilter = ""
		}
		contentContainer.style.webkitBackdropFilter = blurValue
		attachThemeBlurTargetObserver(contentContainer)
	}
	$('.alert').addClass('ropro-hidden')
	setTimeout(function() {
		$('.alert').addClass('ropro-hidden')
	}, 100)
	setTimeout(function() {
		$('.alert').addClass('ropro-hidden')
	}, 1000)
	return true
}

async function checkAlerts() {
	var alreadyAlerted = await getLocalStorage("alreadyAlerted")
	var rpAlert = await getLocalStorage("rpAlert")
	if (typeof rpAlert != "string" || rpAlert.length == 0 || alreadyAlerted == rpAlert) {
		return
	}
	var alertPayload = parseStoredAlertPayload(rpAlert)
	if (alertPayload == null) {
		return
	}
	var alertContainer = document.getElementsByClassName('alert-container')[0]
	if (alertContainer == null) {
		return
	}
	var alertDiv = document.createElement('div')
	alertDiv.style.display = alertPayload.display
	alertDiv.style.backgroundColor = "#0084dd"
	alertDiv.style.color = "#ffffff"
	alertDiv.style.padding = "12px 20px"
	alertDiv.style.fontSize = "16px"
	alertDiv.style.fontWeight = "600"
	alertDiv.style.textAlign = "center"
	alertDiv.style.width = "100vw"
	alertDiv.style.position = "relative"
	alertDiv.style.left = "50%"
	alertDiv.style.marginLeft = "-50vw"
	alertDiv.style.boxSizing = "border-box"
	var messageSpan = document.createElement("span")
	messageSpan.textContent = alertPayload.message
	alertDiv.appendChild(messageSpan)
	if (alertPayload.link.length > 0 && alertPayload.linkText.length > 0) {
		var alertLink = document.createElement("a")
		alertLink.setAttribute("target", "_blank")
		alertLink.setAttribute("rel", "noopener noreferrer")
		alertLink.style.marginLeft = "10px"
		alertLink.style.textDecoration = "underline"
		alertLink.style.color = "#ffffff"
		alertLink.style.fontWeight = "bold"
		alertLink.href = alertPayload.link
		alertLink.textContent = alertPayload.linkText
		alertDiv.appendChild(alertLink)
	}
	var closeAlertButton = document.createElement("button")
	closeAlertButton.type = "button"
	closeAlertButton.style.marginLeft = "20px"
	closeAlertButton.style.cursor = "pointer"
	closeAlertButton.style.backgroundColor = "rgba(255,255,255,0.2)"
	closeAlertButton.style.border = "1px solid rgba(255,255,255,0.5)"
	closeAlertButton.style.borderRadius = "4px"
	closeAlertButton.style.color = "#ffffff"
	closeAlertButton.style.font = "inherit"
	closeAlertButton.style.fontSize = "13px"
	closeAlertButton.style.fontWeight = "600"
	closeAlertButton.style.padding = "4px 12px"
	closeAlertButton.style.verticalAlign = "middle"
	closeAlertButton.textContent = "Close"
	alertDiv.appendChild(closeAlertButton)
	alertContainer.appendChild(alertDiv)
	closeAlertButton.addEventListener('click', async function() {
		console.log("Close Alert")
		await setLocalStorage("alreadyAlerted", rpAlert)
		alertDiv.remove()
	})
}

function addThemeMain(theme) {
	var isCommunitiesThemeRoute = isCommunitiesLayoutPage()
	if (theme.hasOwnProperty('version') && theme['version'] == 2) {
		myTheme = theme
		var themeUrlOptions = {
			hardCache: true,
			h: theme.hasOwnProperty('h') ? parseInt(theme['h']) : null,
			s: theme.hasOwnProperty('s') ? parseFloat(theme['s']) : null,
			l: theme.hasOwnProperty('l') ? parseFloat(theme['l']) : null
		}
		var frameUrl = roproApiAdapter.buildThemeFrameUrl(theme['name'], Object.assign({}, themeUrlOptions, {video: theme['name'].endsWith('.mp4')}))
		var safeFrameUrl = typeof roproApiAdapter.getSafeThemeFrameUrl === "function"
			? roproApiAdapter.getSafeThemeFrameUrl(frameUrl)
			: frameUrl
		if (safeFrameUrl == null) {
			return
		}
		var frame = document.createElement('iframe')
		frame.id = "roproThemeFrame"
		frame.setAttribute("frameborder", "0")
		frame.setAttribute("style", "top:0;left:0;position:absolute;border:0;width:100%;height:100%;z-index:-1;")
		frame.src = safeFrameUrl
		var myInterval1 = setInterval(function(){
			mainContainer = document.getElementById('container-main')
			if (mainContainer == null) {
				return
				} else {
					clearInterval(myInterval1)
				}
					mainContainer.appendChild(frame)
					if (isCommunitiesThemeRoute) {
						mainContainer.style.borderRadius = ""
						mainContainer.style.padding = getCommunitiesThemeSideGutterPadding()
					} else {
						mainContainer.style.borderRadius = "20px"
						mainContainer.style.padding = "20px"
					}
				}, 50)
	} else {
		themeName = theme['name']
		profileThemeName = theme['name']
		if ('repeat' in theme){
			repeat = theme['repeat']
		} else {
			repeat = "repeat"
		}
		if ('width' in theme) {
			width = theme['width']
		} else {
			width = "100%"
		}
		if ('color' in theme) {
			color = theme['color']
		} else {
			color = ""
		}
			themeImages = theme['images'].split(",")
			var safeThemeImageOne = ""
			var safeThemeImageTwo = ""
			if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeImageUrl === "function") {
				safeThemeImageOne = roproApiAdapter.getSafeImageUrl(themeImages[0]) || ""
				safeThemeImageTwo = roproApiAdapter.getSafeImageUrl(themeImages[1]) || ""
			}
			var myInterval1 = setInterval(function(){
			mainContainer = document.getElementById('container-main')
			if (mainContainer == null) {
				return
			} else {
				clearInterval(myInterval1)
				}
				mainContainer.classList.add("ropro-theme")
				if (themeImages.length == 1) {
					mainContainer.style.backgroundImage = safeThemeImageOne.length > 0 ? `url(${safeThemeImageOne})` : "none"
					mainContainer.style.backgroundSize = width
				} else {
					if (safeThemeImageOne.length > 0 && safeThemeImageTwo.length > 0) {
						mainContainer.style.backgroundImage = `url(${safeThemeImageOne}), url(${safeThemeImageTwo})`
						mainContainer.style.backgroundPosition = "left top, right top"
						if (width == "100% 100%") {
							mainContainer.style.backgroundSize = "50% 100%"
						} else {
							mainContainer.style.backgroundSize = "50%"
						}
						if (repeat == "repeat") {
							repeat = "repeat-y"
						}
					} else if (safeThemeImageOne.length > 0) {
						mainContainer.style.backgroundImage = `url(${safeThemeImageOne})`
						mainContainer.style.backgroundSize = width
					} else if (safeThemeImageTwo.length > 0) {
						mainContainer.style.backgroundImage = `url(${safeThemeImageTwo})`
						mainContainer.style.backgroundSize = width
					} else {
						mainContainer.style.backgroundImage = "none"
					}
				}
				mainContainer.style.backgroundColor = color
				mainContainer.style.backgroundRepeat = repeat
					if (isCommunitiesThemeRoute) {
						mainContainer.style.padding = getCommunitiesThemeSideGutterPadding()
					} else {
						mainContainer.style.padding = "20px"
					}
				}, 50)
		}
	var myInterval2 = setInterval(function(){
		var contentContainer = getThemeVisualPrimaryContentContainer()
		if (contentContainer == null) {
			return
		} else {
			clearInterval(myInterval2)
		}
			if (isCommunitiesThemeRoute) {
				contentContainer.style.padding = ""
				contentContainer.style.borderRadius = ""
			} else {
			contentContainer.style.padding = "20px"
			contentContainer.style.borderRadius = "10px"
		}
		// if (window.location.href.includes('/home') || (window.location.href.match('/games/[0-9]+/') != null && window.location.href.match('/games/[0-9]+/').length > 0)) {
		// 	contentContainer.style.maxWidth = "1000px"
		// 	contentContainer.style.marginLeft = "auto"
		// }
	}, 50)
	var myInterval3 = setInterval(function(){
		right = document.getElementById('Skyscraper-Abp-Right')
		left = document.getElementById('Skyscraper-Abp-Left')
		if (right == null && left == null) {
			return
		} else {
			clearInterval(myInterval3)
		}
		if (window.location.href.includes('/home') || (window.location.href.match('/games/[0-9]+/') != null && window.location.href.match('/games/[0-9]+/').length > 0)) {
			document.getElementById('Skyscraper-Abp-Right').style.marginRight = "-200px"
			document.getElementById('Skyscraper-Abp-Left').style.marginLeft = "-185px"
		}
	}, 50)
}

var roproSidebarMenuObserver = null
var roproSidebarMenuObserverHost = null
var roproSidebarMenuHydrationTimer = null
var roproSidebarMenuHydrationState = null
var roproSidebarMenuHydrationInProgress = false
var roproSidebarMenuCandidateSelectors = "nav ul, .left-col-list"
var roproSidebarMenuRouteMatchers = [
	/\/home\/?$/i,
	/\/users\/(?:[^\/?#]+\/)?profile\/?$/i,
	/\/my\/messages\//i,
	/\/users\/friends/i,
	/\/my\/avatar\/?$/i,
	/\/users\/(?:[^\/?#]+\/)?inventory\/?$/i,
	/\/trades\/?$/i,
	/\/(?:my\/)?communities\/?$/i,
	/\/giftcards-us\/?$/i
]
var roproSidebarMenuRequiredRouteGroups = [
	[/\/home\/?$/i],
	[/\/trades\/?$/i],
	[/\/my\/avatar\/?$/i, /\/users\/(?:[^\/?#]+\/)?inventory\/?$/i]
]
var roproSidebarInsertionAnchorMatchers = {
	sandbox: [/\/my\/avatar\/?$/i, /\/users\/(?:[^\/?#]+\/)?inventory\/?$/i],
	tradeOffers: [/\/trades\/?$/i],
	themes: [/\/(?:my\/)?communities\/?$/i]
}
var roproSidebarTemplateAnchorMatchers = {
	sandbox: [/\/users\/(?:[^\/?#]+\/)?inventory\/?$/i, /\/my\/avatar\/?$/i, /\/home\/?$/i],
	tradeOffers: [/\/trades\/?$/i, /\/users\/(?:[^\/?#]+\/)?inventory\/?$/i, /\/my\/avatar\/?$/i],
	themes: [/\/(?:my\/)?communities\/?$/i, /\/trades\/?$/i, /\/users\/(?:[^\/?#]+\/)?inventory\/?$/i]
}
var roproSidebarIconInlineStyles = {
	sandbox: "transform:scale(0.85);margin-left:1px;",
	tradeOffers: "transform:scale(0.8);margin-top:-1px;",
	themes: "transform:scale(1);margin-top:-3px;background-size:95%;"
}

function normalizeRoProSidebarPath(rawHref) {
	var rawCandidate = String(rawHref == null ? "" : rawHref).trim()
	if (rawCandidate.length == 0) {
		return ""
	}
	var parsedPath = rawCandidate
	try {
		parsedPath = new URL(rawCandidate, window.location.origin).pathname || ""
	} catch (_) {}
	var normalizedPath = parsedPath.toLowerCase()
	normalizedPath = normalizedPath.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/)/i, "")
	normalizedPath = normalizedPath.replace(/\/+$/, "")
	if (normalizedPath.length == 0) {
		return "/"
	}
	return normalizedPath
}

function getRoProSidebarAnchors(menuNode) {
	if (menuNode == null) {
		return []
	}
	var anchors = menuNode.querySelectorAll("li > a[href]")
	if (anchors.length > 0) {
		return anchors
	}
	return menuNode.querySelectorAll("a[href]")
}

function isLegacyRoProSidebarMenu(menuNode) {
	return menuNode != null && typeof menuNode.matches == "function" && menuNode.matches(".left-col-list")
}

function isRoProSidebarAvatarCardAnchor(anchorNode) {
	if (anchorNode == null || typeof anchorNode.querySelector != "function") {
		return false
	}
	if (anchorNode.querySelector(".avatar") != null || anchorNode.querySelector(".avatar-headshot-xs") != null || anchorNode.querySelector(".avatar-card-image") != null || anchorNode.querySelector(".thumbnail-2d-container") != null) {
		return true
	}
	return anchorNode.querySelector("img") != null
}

function matchesRoProSidebarRouteGroups(pathname, routeGroups) {
	if (typeof pathname != "string" || !Array.isArray(routeGroups)) {
		return false
	}
	for (var groupIndex = 0; groupIndex < routeGroups.length; groupIndex++) {
		var groupMatchers = routeGroups[groupIndex]
		if (!Array.isArray(groupMatchers) || groupMatchers.length == 0) {
			continue
		}
		for (var matcherIndex = 0; matcherIndex < groupMatchers.length; matcherIndex++) {
			if (groupMatchers[matcherIndex].test(pathname)) {
				return true
			}
		}
	}
	return false
}

function scoreRoProSidebarMenuCandidate(menuNode) {
	if (menuNode == null || menuNode.tagName !== "UL") {
		return -1
	}
	var anchors = getRoProSidebarAnchors(menuNode)
	if (anchors.length < 6) {
		return -1
	}
	var uniquePaths = {}
	for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
		var normalizedPath = normalizeRoProSidebarPath(anchors[anchorIndex].getAttribute("href"))
		if (normalizedPath.length > 0) {
			uniquePaths[normalizedPath] = true
		}
	}
	for (var groupIndex = 0; groupIndex < roproSidebarMenuRequiredRouteGroups.length; groupIndex++) {
		var groupMatchers = roproSidebarMenuRequiredRouteGroups[groupIndex]
		var matchedGroup = false
		for (var pathKeyForGroup in uniquePaths) {
			if (matchesRoProSidebarRouteGroups(pathKeyForGroup, [groupMatchers])) {
				matchedGroup = true
				break
			}
		}
		if (!matchedGroup) {
			return -1
		}
	}
	var score = 0
	for (var matcherIndex = 0; matcherIndex < roproSidebarMenuRouteMatchers.length; matcherIndex++) {
		var matcher = roproSidebarMenuRouteMatchers[matcherIndex]
		for (var pathKey in uniquePaths) {
			if (matcher.test(pathKey)) {
				score++
				break
			}
		}
	}
	return score
}

function isRoProSidebarMenuNodeVisible(menuNode) {
	if (menuNode == null || typeof window.getComputedStyle != "function" || typeof menuNode.getBoundingClientRect != "function") {
		return false
	}
	var computedStyle = window.getComputedStyle(menuNode)
	if (computedStyle != null && (computedStyle.display == "none" || computedStyle.visibility == "hidden")) {
		return false
	}
	var rect = menuNode.getBoundingClientRect()
	return rect.width > 0 && rect.height > 0
}

function getRoProSidebarMenuNode() {
	var menuCandidates = document.querySelectorAll(roproSidebarMenuCandidateSelectors)
	var bestVisibleCandidate = null
	var bestVisibleScore = -1
	var bestHiddenCandidate = null
	var bestHiddenScore = -1
	for (var candidateIndex = 0; candidateIndex < menuCandidates.length; candidateIndex++) {
		var menuCandidate = menuCandidates[candidateIndex]
		var candidateScore = scoreRoProSidebarMenuCandidate(menuCandidate)
		if (candidateScore < 3) {
			continue
		}
		if (isRoProSidebarMenuNodeVisible(menuCandidate)) {
			if (candidateScore > bestVisibleScore) {
				bestVisibleScore = candidateScore
				bestVisibleCandidate = menuCandidate
			}
			continue
		}
		if (candidateScore > bestHiddenScore) {
			bestHiddenScore = candidateScore
			bestHiddenCandidate = menuCandidate
		}
	}
	return bestVisibleCandidate || bestHiddenCandidate || null
}

function nodeTouchesRoProSidebarMenu(node) {
	if (node == null || node.nodeType !== 1) {
		return false
	}
	if (typeof node.matches == "function" && node.matches("li[data-ropro-sidebar-item]")) {
		return true
	}
	if (node.tagName === "UL" && scoreRoProSidebarMenuCandidate(node) >= 3) {
		return true
	}
	if (typeof node.querySelector == "function") {
		if (node.querySelector("li[data-ropro-sidebar-item]") != null) {
			return true
		}
		var nestedMenus = node.querySelectorAll("ul")
		for (var nestedIndex = 0; nestedIndex < nestedMenus.length; nestedIndex++) {
			if (scoreRoProSidebarMenuCandidate(nestedMenus[nestedIndex]) >= 3) {
				return true
			}
		}
	}
	return false
}

function mutationTouchesRoProSidebarMenu(mutation) {
	if (mutation == null || mutation.type != "childList") {
		return false
	}
	if (nodeTouchesRoProSidebarMenu(mutation.target)) {
		return true
	}
	for (var nodeIndex = 0; nodeIndex < mutation.addedNodes.length; nodeIndex++) {
		if (nodeTouchesRoProSidebarMenu(mutation.addedNodes[nodeIndex])) {
			return true
		}
	}
	for (var removedIndex = 0; removedIndex < mutation.removedNodes.length; removedIndex++) {
		if (nodeTouchesRoProSidebarMenu(mutation.removedNodes[removedIndex])) {
			return true
		}
	}
	return false
}

function shouldHydrateRoProSidebarMenu(menuNode) {
	if (menuNode == null || roproSidebarMenuHydrationState == null) {
		return false
	}
	if (roproSidebarMenuHydrationState.showTradeOffersMenuItem && menuNode.querySelector("li[data-ropro-sidebar-item='trade-offers']") == null) {
		return true
	}
	if (roproSidebarMenuHydrationState.sandbox && menuNode.querySelector("li[data-ropro-sidebar-item='sandbox']") == null) {
		return true
	}
	if (roproSidebarMenuHydrationState.themes && menuNode.querySelector("li[data-ropro-sidebar-item='themes']") == null) {
		return true
	}
	return false
}

function resolveRoProSidebarMenuObserverHost(menuNode) {
	if (menuNode == null) {
		return document.body || document.documentElement
	}
	var observerHost = menuNode.closest("#navigation")
	if (observerHost == null) {
		observerHost = menuNode.closest("#left-navigation-container")
	}
	if (observerHost == null) {
		observerHost = menuNode.closest("#left-navigation")
	}
	if (observerHost == null) {
		observerHost = menuNode.closest(".left-col")
	}
	if (observerHost == null) {
		observerHost = menuNode.closest("nav")
	}
	if (observerHost == null) {
		observerHost = menuNode.parentElement
	}
	return observerHost || document.body || document.documentElement
}

function scheduleRoProSidebarMenuHydration() {
	if (roproSidebarMenuHydrationTimer != null) {
		return
	}
	roproSidebarMenuHydrationTimer = setTimeout(function() {
		roproSidebarMenuHydrationTimer = null
		if (ensureRoProSidebarMenuItems()) {
			ensureRoProSidebarMenuObserver()
		}
	}, 0)
}

function ensureRoProSidebarMenuObserver() {
	if (roproSidebarMenuHydrationState == null) {
		return
	}
	var menuNode = getRoProSidebarMenuNode()
	var observerHost = resolveRoProSidebarMenuObserverHost(menuNode)
	if (observerHost == null) {
		return
	}
	if (roproSidebarMenuObserver != null && roproSidebarMenuObserverHost === observerHost) {
		return
	}
	if (roproSidebarMenuObserver != null) {
		roproSidebarMenuObserver.disconnect()
		roproSidebarMenuObserver = null
		roproSidebarMenuObserverHost = null
	}
	roproSidebarMenuObserver = new MutationObserver(function(mutations) {
		if (roproSidebarMenuHydrationInProgress || roproSidebarMenuHydrationState == null) {
			return
		}
		for (var mutationIndex = 0; mutationIndex < mutations.length; mutationIndex++) {
			if (mutationTouchesRoProSidebarMenu(mutations[mutationIndex])) {
				var currentMenuNode = getRoProSidebarMenuNode()
				if (shouldHydrateRoProSidebarMenu(currentMenuNode)) {
					scheduleRoProSidebarMenuHydration()
				}
				return
			}
		}
	})
	roproSidebarMenuObserver.observe(observerHost, {childList: true, subtree: true})
	roproSidebarMenuObserverHost = observerHost
}

function getRoProSidebarAnchorByMatchers(menuNode, matchers) {
	if (menuNode == null || !Array.isArray(matchers) || matchers.length == 0) {
		return null
	}
	var anchors = getRoProSidebarAnchors(menuNode)
	for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
		var anchorPath = normalizeRoProSidebarPath(anchors[anchorIndex].getAttribute("href"))
		for (var matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
			if (matchers[matcherIndex].test(anchorPath)) {
				return anchors[anchorIndex]
			}
		}
	}
	return null
}

function getRoProSidebarTemplateAnchor(menuNode, itemKey) {
	var templateMatchers = roproSidebarTemplateAnchorMatchers[itemKey] || []
	var anchors = getRoProSidebarAnchors(menuNode)
	var avatarFallbackAnchor = null
	for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
		var candidateAnchor = anchors[anchorIndex]
		var anchorPath = normalizeRoProSidebarPath(candidateAnchor.getAttribute("href"))
		for (var matcherIndex = 0; matcherIndex < templateMatchers.length; matcherIndex++) {
			if (!templateMatchers[matcherIndex].test(anchorPath)) {
				continue
			}
			if (!isRoProSidebarAvatarCardAnchor(candidateAnchor)) {
				return candidateAnchor
			}
			if (avatarFallbackAnchor == null) {
				avatarFallbackAnchor = candidateAnchor
			}
		}
	}
	if (avatarFallbackAnchor != null) {
		return avatarFallbackAnchor
	}
	for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
		var fallbackAnchor = anchors[anchorIndex]
		var normalizedPath = normalizeRoProSidebarPath(fallbackAnchor.getAttribute("href"))
		if (
			!isRoProSidebarAvatarCardAnchor(fallbackAnchor) &&
			normalizedPath.indexOf("/sandbox") == -1 &&
			normalizedPath.indexOf("/themes") == -1 &&
			normalizedPath.indexOf("/board") == -1
		) {
			return fallbackAnchor
		}
	}
	return anchors.length > 0 ? anchors[0] : null
}

function clearRoProSidebarAnchorActiveState(anchorNode) {
	if (anchorNode == null) {
		return
	}
	anchorNode.removeAttribute("aria-current")
	var currentClassName = String(anchorNode.className || "")
	var classTokens = currentClassName.split(/\s+/)
	var nextTokens = []
	for (var tokenIndex = 0; tokenIndex < classTokens.length; tokenIndex++) {
		var classToken = classTokens[tokenIndex].trim()
		if (classToken.length == 0) {
			continue
		}
		if (
			classToken === "active" ||
			classToken === "selected" ||
			classToken === "current" ||
			classToken === "bg-surface-300"
		) {
			continue
		}
		nextTokens.push(classToken)
	}
	anchorNode.className = nextTokens.join(" ")
}

function removeRoProSidebarAccessoryNodes(anchorNode) {
	if (anchorNode == null) {
		return
	}
	var accessoryNodes = anchorNode.querySelectorAll(".dynamic-width-item, .notification, .notification-blue, .foundation-web-badge")
	for (var accessoryIndex = 0; accessoryIndex < accessoryNodes.length; accessoryIndex++) {
		accessoryNodes[accessoryIndex].remove()
	}
}

function getRoProSidebarLabelNode(anchorNode) {
	if (anchorNode == null) {
		return null
	}
	var labelSelectors = [".dynamic-ellipsis-item", ".text-truncate-end", ".text-no-wrap", ".ropro-sidebar-item-label"]
	for (var selectorIndex = 0; selectorIndex < labelSelectors.length; selectorIndex++) {
		var labelNode = anchorNode.querySelector(labelSelectors[selectorIndex])
		if (labelNode != null && String(labelNode.textContent || "").trim().length > 0) {
			return labelNode
		}
	}
	var textNodes = anchorNode.querySelectorAll("span, div, p")
	for (var nodeIndex = textNodes.length - 1; nodeIndex >= 0; nodeIndex--) {
		var node = textNodes[nodeIndex]
		if (node == null || node.children.length > 0) {
			continue
		}
		if (String(node.textContent || "").trim().length > 0) {
			return node
		}
	}
	return null
}

function ensureRoProSidebarIconNode(anchorNode) {
	if (anchorNode == null) {
		return null
	}
	var iconNode = anchorNode.querySelector(".new-menu-icon")
	if (iconNode != null) {
		return iconNode
	}
	var spanNodes = anchorNode.querySelectorAll("span")
	for (var spanIndex = 0; spanIndex < spanNodes.length; spanIndex++) {
		var spanNode = spanNodes[spanIndex]
		if (spanNode.querySelector("img") != null) {
			continue
		}
		var spanClassName = String(spanNode.className || "")
		if (
			spanNode.getAttribute("role") == "presentation" ||
			spanClassName.indexOf("icon") != -1 ||
			spanClassName.indexOf("avatar") != -1
		) {
			return spanNode
		}
	}
	var firstContainer = null
	for (var childIndex = 0; childIndex < anchorNode.children.length; childIndex++) {
		var child = anchorNode.children[childIndex]
		if (child.tagName == "DIV" && child.getAttribute("role") == "presentation") {
			continue
		}
		if (child.tagName == "DIV" || child.tagName == "SPAN") {
			firstContainer = child
			break
		}
	}
	if (firstContainer == null) {
		firstContainer = document.createElement("span")
		anchorNode.insertBefore(firstContainer, anchorNode.firstChild)
	}
	iconNode = document.createElement("span")
	if (firstContainer.firstChild != null) {
		firstContainer.insertBefore(iconNode, firstContainer.firstChild)
	} else {
		firstContainer.appendChild(iconNode)
	}
	return iconNode
}

function createRoProSidebarListItem(menuNode, itemKey, anchorClassName, href, label) {
	var templateAnchor = getRoProSidebarTemplateAnchor(menuNode, itemKey)
	if (templateAnchor == null) {
		return null
	}
	var templateListItem = templateAnchor.closest("li")
	if (templateListItem == null) {
		return null
	}
	var listItemNode = templateListItem.cloneNode(true)
	var sidebarItemKey = itemKey === "tradeOffers" ? "trade-offers" : itemKey
	listItemNode.setAttribute("data-ropro-sidebar-item", sidebarItemKey)
	var anchorNode = listItemNode.querySelector("a[href]")
	if (anchorNode == null) {
		return null
	}
	clearRoProSidebarAnchorActiveState(anchorNode)
	removeRoProSidebarAccessoryNodes(anchorNode)
	anchorNode.href = href
	anchorNode.removeAttribute("id")
	anchorNode.removeAttribute("target")
	if (anchorNode.getAttribute("role") == "button") {
		anchorNode.removeAttribute("role")
	}
	anchorNode.classList.add(anchorClassName)
	var labelNode = getRoProSidebarLabelNode(anchorNode)
	if (labelNode == null) {
		labelNode = document.createElement("span")
		anchorNode.appendChild(labelNode)
	}
	labelNode.textContent = label
	labelNode.classList.add("ropro-sidebar-item-label")
	var iconNode = ensureRoProSidebarIconNode(anchorNode)
	if (iconNode != null) {
		iconNode.className = "new-menu-icon ropro-sidebar-icon"
		iconNode.removeAttribute("style")
		if (isLegacyRoProSidebarMenu(menuNode) && typeof roproSidebarIconInlineStyles[itemKey] == "string") {
			iconNode.setAttribute("style", roproSidebarIconInlineStyles[itemKey])
		}
	}
	return listItemNode
}

function createTradeOffersSidebarListItem(menuNode) {
	var offerLI = createRoProSidebarListItem(menuNode, "tradeOffers", "offers-icon", "/board", "Trade Board")
	if (offerLI == null) {
		return null
	}
	return offerLI
}

function createSandboxSidebarListItem(menuNode) {
	return createRoProSidebarListItem(menuNode, "sandbox", "sandbox-icon", "/sandbox", "Sandbox")
}

function createThemesSidebarListItem(menuNode) {
	return createRoProSidebarListItem(menuNode, "themes", "themes-icon", "/themes", "Themes")
}

function insertSidebarMenuItemAfterAnchor(menuNode, listItemNode, anchorMatchers) {
	if (menuNode == null || listItemNode == null) {
		return
	}
	var anchor = getRoProSidebarAnchorByMatchers(menuNode, anchorMatchers || [])
	if (anchor == null) {
		menuNode.appendChild(listItemNode)
		return
	}
	var anchorListItem = anchor.closest("li")
	if (anchorListItem == null || anchorListItem.parentElement !== menuNode) {
		menuNode.appendChild(listItemNode)
		return
	}
	if (anchorListItem.nextElementSibling != null) {
		menuNode.insertBefore(listItemNode, anchorListItem.nextElementSibling)
		return
	}
	menuNode.appendChild(listItemNode)
}

function ensureRoProSidebarMenuItems() {
	var menu = getRoProSidebarMenuNode()
	if (menu == null || roproSidebarMenuHydrationState == null) {
		return false
	}
	roproSidebarMenuHydrationInProgress = true
	try {
		var existingRoProItems = menu.querySelectorAll("li[data-ropro-sidebar-item]")
		for (var existingIndex = 0; existingIndex < existingRoProItems.length; existingIndex++) {
			existingRoProItems[existingIndex].remove()
		}
		if (roproSidebarMenuHydrationState.sandbox) {
			var sandboxLI = createSandboxSidebarListItem(menu)
			if (sandboxLI != null) {
				insertSidebarMenuItemAfterAnchor(menu, sandboxLI, roproSidebarInsertionAnchorMatchers.sandbox)
			}
		}
		if (roproSidebarMenuHydrationState.showTradeOffersMenuItem) {
			var offerLI = createTradeOffersSidebarListItem(menu)
			if (offerLI != null) {
				insertSidebarMenuItemAfterAnchor(menu, offerLI, roproSidebarInsertionAnchorMatchers.tradeOffers)
			}
		}
		if (roproSidebarMenuHydrationState.themes) {
			var themesLI = createThemesSidebarListItem(menu)
			if (themesLI != null) {
				insertSidebarMenuItemAfterAnchor(menu, themesLI, roproSidebarInsertionAnchorMatchers.themes)
			}
		}
		if (isLegacyRoProSidebarMenu(menu)) {
			var menuItems = menu.getElementsByTagName("li")
			for (var itemIndex = 0; itemIndex < menuItems.length; itemIndex++) {
				var listItem = menuItems[itemIndex]
				listItem.style.display = "block"
				if (listItem.getElementsByTagName("a").length > 0) {
					listItem.getElementsByTagName("a")[0].style.display = ""
				}
			}
		}
	} finally {
		roproSidebarMenuHydrationInProgress = false
	}
	return true
}

function waitForSelector(selector, intervalMs, timeoutMs) {
	return new Promise(function(resolve) {
		var el = document.querySelector(selector)
		if (el != null) {
			resolve(el)
			return
		}
		var elapsed = 0
		var timer = setInterval(function() {
			elapsed += intervalMs
			el = document.querySelector(selector)
			if (el != null) {
				clearInterval(timer)
				resolve(el)
				return
			}
			if (elapsed >= timeoutMs) {
				clearInterval(timer)
				resolve(null)
			}
		}, intervalMs)
	})
}

function waitForSidebarMenu(intervalMs, timeoutMs) {
	return new Promise(function(resolve) {
		var menu = getRoProSidebarMenuNode()
		if (menu != null) {
			resolve(menu)
			return
		}
		var elapsed = 0
		var timer = setInterval(function() {
			elapsed += intervalMs
			menu = getRoProSidebarMenuNode()
			if (menu != null) {
				clearInterval(timer)
				resolve(menu)
				return
			}
			if (elapsed >= timeoutMs) {
				clearInterval(timer)
				resolve(null)
			}
		}, intervalMs)
	})
}

var roproSyntheticNavPagePattern = /\/(sandbox|themes|board|genre-search)\/?$/i

function isRoProSyntheticNavPage() {
	var pathname = window.location.pathname.toLowerCase()
	pathname = pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/)/, '')
	return roproSyntheticNavPagePattern.test(pathname)
}

function isNewReactLeftNav(container) {
	if (container == null) {
		return false
	}
	return container.querySelector('.left-nav') != null
}

function cacheLeftNavHTML() {
	var container = document.getElementById('left-navigation-container')
	if (container == null || container.children.length === 0) {
		return
	}
	if (!isNewReactLeftNav(container)) {
		return
	}
	var clone = container.cloneNode(true)
	var roProItems = clone.querySelectorAll('li[data-ropro-sidebar-item]')
	for (var i = 0; i < roProItems.length; i++) {
		roProItems[i].remove()
	}
	var activeLinks = clone.querySelectorAll('.bg-surface-300')
	for (var i = 0; i < activeLinks.length; i++) {
		activeLinks[i].classList.remove('bg-surface-300')
	}
	var roProClasses = clone.querySelectorAll('[class*="ropro-"]')
	for (var i = 0; i < roProClasses.length; i++) {
		var el = roProClasses[i]
		var classes = el.className.split(/\s+/)
		for (var j = classes.length - 1; j >= 0; j--) {
			if (classes[j].indexOf('ropro-') !== -1) {
				el.classList.remove(classes[j])
			}
		}
	}
	var loadingImgs = clone.querySelectorAll('img.loading')
	for (var i = 0; i < loadingImgs.length; i++) {
		loadingImgs[i].classList.remove('loading')
	}
	var shimmerEls = clone.querySelectorAll('.shimmer')
	for (var i = 0; i < shimmerEls.length; i++) {
		shimmerEls[i].classList.remove('shimmer')
	}
	setLocalStorage('roproCachedLeftNavHTML', clone.innerHTML)
}

function fixRestoredNavShimmer(container) {
	var shimmerEls = container.querySelectorAll('.shimmer')
	for (var i = 0; i < shimmerEls.length; i++) {
		shimmerEls[i].classList.remove('shimmer')
	}
	var loadingImgs = container.querySelectorAll('img.loading')
	for (var i = 0; i < loadingImgs.length; i++) {
		loadingImgs[i].classList.remove('loading')
	}
	var thumbContainers = container.querySelectorAll('.thumbnail-2d-container')
	for (var i = 0; i < thumbContainers.length; i++) {
		thumbContainers[i].style.animation = 'none'
		thumbContainers[i].style.background = 'transparent'
	}
}

function fixRestoredNavAvatar(container) {
	var thumbContainers = container.querySelectorAll('.thumbnail-2d-container')
	if (thumbContainers.length === 0) { return }
	var alreadyHasImg = false
	for (var i = 0; i < thumbContainers.length; i++) {
		if (thumbContainers[i].querySelector('img[src]') != null) {
			alreadyHasImg = true
			break
		}
	}
	if (alreadyHasImg) { return }
	getUserId().then(function(userId) {
		if (!userId) { return }
		chrome.runtime.sendMessage(
			{greeting: "GetURL", url: "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userId + "&size=150x150&format=Png&isCircular=false"},
			function(resp) {
				try {
					var data = typeof resp === 'string' ? JSON.parse(resp) : resp
					if (!data || !data.data || !data.data[0] || !data.data[0].imageUrl) { return }
					var imgUrl = data.data[0].imageUrl
					var freshContainers = container.querySelectorAll('.thumbnail-2d-container')
					for (var i = 0; i < freshContainers.length; i++) {
						if (freshContainers[i].querySelector('img[src]') != null) { continue }
						freshContainers[i].style.animation = 'none'
						freshContainers[i].style.background = 'transparent'
						freshContainers[i].classList.remove('shimmer')
						var img = document.createElement('img')
						img.src = imgUrl
						img.alt = ''
						img.style.width = '100%'
						img.style.height = '100%'
						img.style.borderRadius = '50%'
						img.style.objectFit = 'cover'
						freshContainers[i].innerHTML = ''
						freshContainers[i].appendChild(img)
					}
				} catch (e) {}
			}
		)
	})
}

function wireRestoredNavHamburger(container) {
	var leftNav = container.querySelector('.left-nav')
	if (leftNav == null) {
		return
	}
	var hamburger = document.querySelector('#header-menu-icon button.menu-button')
	if (hamburger == null) {
		return
	}
	hamburger.addEventListener('click', function() {
		var isOpen = leftNav.classList.contains('ropro-nav-force-open')
		leftNav.classList.remove('ropro-nav-force-open')
		leftNav.classList.remove('ropro-nav-force-closed')
		if (isOpen) {
			leftNav.classList.add('ropro-nav-force-closed')
		} else {
			leftNav.classList.add('ropro-nav-force-open')
		}
	})
	window.addEventListener('resize', function() {
		var hamburgerVisible = hamburger.offsetWidth > 0 && hamburger.offsetHeight > 0
		if (!hamburgerVisible) {
			leftNav.classList.remove('ropro-nav-force-open')
			leftNav.classList.remove('ropro-nav-force-closed')
		}
	})
}

async function restoreCachedLeftNav() {
	var container = document.getElementById('left-navigation-container')
	if (container == null) {
		return false
	}
	if (container.children.length > 0) {
		return true
	}
	var cached = await getLocalStorage('roproCachedLeftNavHTML')
	if (typeof cached !== 'string' || cached.length === 0) {
		return false
	}
	if (cached.indexOf('left-nav') === -1) {
		return false
	}
	container.innerHTML = cached
	fixRestoredNavShimmer(container)
	fixRestoredNavAvatar(container)
	wireRestoredNavHamburger(container)
	return true
}

async function insertSidebarItems(sandbox, themes, tradeOffersGate) {
	var showTradeOffersMenuItem = shouldShowTradeOffersMenuItem(tradeOffersGate)
	roproSidebarMenuHydrationState = {
		showTradeOffersMenuItem: showTradeOffersMenuItem,
		sandbox: sandbox,
		themes: themes,
		tradeOffersGate: tradeOffersGate
	}
	if (!showTradeOffersMenuItem && !sandbox && !themes) {
		return
	}
	var isSynthetic = isRoProSyntheticNavPage()
	var menu = await waitForSidebarMenu(10, isSynthetic ? 1500 : 8000)
	if (menu != null) {
		cacheLeftNavHTML()
	} else if (isSynthetic) {
		var restored = await restoreCachedLeftNav()
		if (restored) {
			menu = getRoProSidebarMenuNode()
		}
	}
	if (menu == null) {
		return
	}
	ensureRoProSidebarMenuItems()
	ensureRoProSidebarMenuObserver()
}

async function insertRoProIcon() {
	var iconGroup = await waitForSelector(".navbar-right.rbx-navbar-icon-group", 10, 8000)
	if (iconGroup == null) {
		return
	}
	console.log('loaded')
	if (await fetchSetting('roproIcon') && document.getElementsByClassName('nav navbar-right rbx-navbar-icon-group').length > 0) {
		subscription = "ultra"
		if (subscription.includes("free")) {
			subscriptionPrefix = "free"
			subscriptionName = "RoPro Free"
		} else if (subscription.includes("plus") || subscription.includes("standard")) {
			subscriptionPrefix = "plus"
			subscriptionName = "RoPro Plus"
		} else if (subscription.includes("rex") || subscription.includes("pro") || subscription.includes("ultra")) {
			subscriptionPrefix = "rex"
			subscriptionName = "RoPro Ultra"
		} else {
			subscriptionPrefix = "free"
			subscriptionName = "RoPro Free"
		}
		li3 = document.createElement('li')
		li3.style.marginLeft = "6px"
		li3.classList.add('buttontooltip')
		var iconName = "free"
		if (subscriptionPrefix === "plus") {
			iconName = "plus"
		} else if (subscriptionPrefix === "rex") {
			iconName = "ultra"
		}
		var iconNode = document.createElement("img")
		iconNode.className = "ropro-icon"
		iconNode.style.marginTop = "6px"
		iconNode.style.marginLeft = "0px"
		iconNode.style.width = "25px"
		iconNode.src = chrome.runtime.getURL('/images/ultra_icon.png')
		var tooltipNode = document.createElement("span")
		tooltipNode.className = "tooltiptext"
		tooltipNode.style.marginTop = "-5.5px"
		tooltipNode.style.marginLeft = "3px"
		tooltipNode.style.top = "45px"
		tooltipNode.style.left = "-160px"
		tooltipNode.style.width = "190px"
		var tooltipTitle = document.createElement("p")
		tooltipTitle.style.color = "white"
		var tooltipVersion = document.createElement("b")
		tooltipVersion.textContent = "RoPro v1.7"
		tooltipTitle.appendChild(tooltipVersion)
		var tooltipText = document.createTextNode((stripTags(subscriptionName) || "") + " Active")
		tooltipNode.appendChild(tooltipTitle)
		tooltipNode.appendChild(tooltipText)
		li3.appendChild(iconNode)
		li3.appendChild(tooltipNode)
		document.getElementsByClassName('nav navbar-right rbx-navbar-icon-group')[0].appendChild(li3)
		li3.addEventListener('click', function() {
			openOptions()
		})
	}
}

async function insertSettingsMenuItem() {
	var settingsIcon = await waitForSelector(".nav-settings-icon", 250, 8000)
	if (settingsIcon == null) {
		return
	}
	document.getElementById('settings-icon').addEventListener('click', function(){
		if(document.getElementsByClassName('ropro-settings-toggle').length == 0) {
			setTimeout(function(){
				settingsButtonHTML = `<a style="padding-left:5px;padding-right:5px;" class="rbx-menu-item ropro-settings-toggle">RoPro Settings</a>`
				liSettings = document.createElement('li')
				liSettings.innerHTML += settingsButtonHTML
				document.getElementById('settings-popover').style.left = parseFloat(document.getElementById('settings-popover').style.left) - 17 + "px"
				document.getElementById('settings-popover').getElementsByClassName('arrow')[0].style.left = "55.8%"
				document.getElementById('settings-popover-menu').childNodes[0].after(liSettings)
				liSettings.addEventListener('click', function() {
					openOptions()
				})
			}, 10)
		}
	})
}

async function insertMenuItems() {
	var startupSettings = await Promise.all([
		fetchSetting('sandbox'),
		fetchSetting('profileThemes'),
		fetchVisualGate('trade_offers_view')
	])
	var sandbox = startupSettings[0]
	var themes = startupSettings[1]
	var tradeOffersGate = startupSettings[2]
	insertSidebarItems(sandbox, themes, tradeOffersGate)
	insertRoProIcon()
	insertSettingsMenuItem()
	var foregroundOpacity = await getStorage_UniquelyNamedFunction('foregroundOpacity')
	var backdropBlur = await getStorage_UniquelyNamedFunction('backdropBlur')
	applyThemeVisualSettingsWhenReady(foregroundOpacity, backdropBlur, 20)
}

insertMenuItems()

setTimeout(async function() {
    var user = parseInt(await getUserId(), 10)
    if (!isNaN(user) && user != await getStorage('rpUserID')) {
		console.log("Updating UserID")
		setStorage('rpUserID', user)
        validateLicense()
    }
	function checkAlertContainer() {
		if (typeof document.getElementsByClassName('alert-container')[0] != "undefined") {
			checkAlerts()
		} else {
			setTimeout(function() {
				checkAlertContainer()
			}, 100)
		}
	}
	checkAlertContainer()
	if (!window.location.href.includes('/profile') && !isThemesPage() && await fetchSetting('globalThemes')) {
		theme = await getStorage('globalTheme')
		if (typeof theme == 'string' && theme.length > 0) {
			addThemeMain(JSON.parse(theme))
			var foregroundOpacity = await getStorage_UniquelyNamedFunction('foregroundOpacity')
			var backdropBlur = await getStorage_UniquelyNamedFunction('backdropBlur')
			applyThemeVisualSettingsWhenReady(foregroundOpacity, backdropBlur, 20)
		}
	}
}, 1)
