var url_matches = [
	"/users/*",
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var reputationDivPosition = document.getElementsByClassName('header-userstatus-text').length == 0 && document.getElementsByClassName('profile-display-name').length == 0 ? "margin-bottom" : "margin-top"
var profileUserID = null
function fetchProfileValue(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetProfileValue", userID: userID}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchStatus(userID) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_user_last_online", {userId: userID},
			function(data) {
				resolve(data)
			}
		)
	})
}

var ROPRO_PROFILE_LAST_ONLINE_CACHE_TTL_MS = 60 * 1000
var roproProfileLastOnlineCache = {}
var roproProfileLastOnlinePending = {}

function normalizeRoProProfileLastOnlineUserId(userID) {
	var parsed = parseInt(userID, 10)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}
	return String(parsed)
}

function getRoProProfileCachedLastOnlineStatus(userID) {
	var normalizedUserID = normalizeRoProProfileLastOnlineUserId(userID)
	if (normalizedUserID == null) {
		return undefined
	}
	var entry = roproProfileLastOnlineCache[normalizedUserID]
	if (entry == null || typeof entry != "object" || !Number.isFinite(entry.fetchedAt)) {
		return undefined
	}
	if (Date.now() - entry.fetchedAt > ROPRO_PROFILE_LAST_ONLINE_CACHE_TTL_MS) {
		delete roproProfileLastOnlineCache[normalizedUserID]
		return undefined
	}
	return entry.status
}

async function fetchRoProProfileLastOnlineStatus(userID) {
	var normalizedUserID = normalizeRoProProfileLastOnlineUserId(userID)
	if (normalizedUserID == null) {
		return null
	}
	var cachedStatus = getRoProProfileCachedLastOnlineStatus(normalizedUserID)
	if (cachedStatus !== undefined) {
		return cachedStatus
	}
	if (roproProfileLastOnlinePending[normalizedUserID] != null) {
		return await roproProfileLastOnlinePending[normalizedUserID]
	}
	roproProfileLastOnlinePending[normalizedUserID] = fetchStatus(normalizedUserID)
		.then(function(status) {
			roproProfileLastOnlineCache[normalizedUserID] = {
				status: status,
				fetchedAt: Date.now()
			}
			return status
		})
		.catch(function() {
			roproProfileLastOnlineCache[normalizedUserID] = {
				status: null,
				fetchedAt: Date.now()
			}
			return null
		})
	try {
		return await roproProfileLastOnlinePending[normalizedUserID]
	} finally {
		delete roproProfileLastOnlinePending[normalizedUserID]
	}
}

function fetchInfo(userID, myId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_user_info_test", {userId: userID, myId: myId}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTheme(userID) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_profile_theme", {userId: userID}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function fetchMutualFriends(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualFriends", userID: userID},
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

async function postReputation(type) {
	userID = await getUserId()
	return new Promise(resolve => {
		json = {reqType: type, myUser: userID, theirUser: getIdFromURL(location.href)}
		roproApiAdapter.request("ropro_post_reputation", {reputation: json}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function getInfo(userID, myId) {
	response = await fetchInfo(userID, myId)
	return response
}


async function getTheme(userID) {
	response = await fetchTheme(userID)
	return response
}

async function getProfileValue(userID) {
	var response = await fetchProfileValue(userID)
	return response
}

function parseRoProInteger(value, fallbackValue = 0) {
	var parsed = parseInt(value, 10)
	if (isNaN(parsed)) {
		return fallbackValue
	}
	return parsed
}

function parseRoProBoolean(value) {
	if (value === true || value === "true" || value === 1 || value === "1") {
		return true
	}
	return false
}

function normalizeRoProUserInfo(info) {
	var normalized = info != null && typeof info == "object" ? info : {}
	return {
		reputation: parseRoProInteger(normalized.reputation, 0),
		liked: parseRoProBoolean(normalized.liked),
		discord: typeof normalized.discord == "string" ? normalized.discord : "",
		tier: typeof normalized.tier == "string" ? normalized.tier : "none",
		user_since: typeof normalized.user_since == "string" ? normalized.user_since : "",
		subscribed_for: typeof normalized.subscribed_for == "string" ? normalized.subscribed_for : "",
		icons: Array.isArray(normalized.icons) ? normalized.icons : []
	}
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function getIdFromURL(url) {
	return parseInt(url.split("users/")[1].split("/profile")[0])
}

function formatRoProLastOnlineRelative(date) {
	var seconds = Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 1000))
	if (seconds < 60) {
		return `${seconds} sec${seconds == 1 ? "" : "s"} ago`
	}
	var minutes = Math.floor(seconds / 60)
	if (minutes < 60) {
		return `${minutes} min${minutes == 1 ? "" : "s"} ago`
	}
	var hours = Math.floor(minutes / 60)
	if (hours < 24) {
		return `${hours} hour${hours == 1 ? "" : "s"} ago`
	}
	var days = Math.floor(hours / 24)
	if (days < 30) {
		return `${days} day${days == 1 ? "" : "s"} ago`
	}
	var months = Math.floor(days / 30)
	if (months < 20) {
		return `${months} month${months == 1 ? "" : "s"} ago`
	}
	var years = Math.floor(months / 12)
	return `${years} year${years == 1 ? "" : "s"} ago`
}

function formatRoProLastOnlineAbsolute(date, timezone) {
	var options = {dateStyle: "medium", timeStyle: "short"}
	if (timezone != "local") {
		options.timeZone = timezone
	}
	try {
		var formatted = new Intl.DateTimeFormat(undefined, options).format(date)
		return timezone == "local" ? formatted : `${formatted} ${timezone}`
	} catch (e) {
		return date.toLocaleString()
	}
}

function clearRoProLastOnlineHeaderLine() {
	var existing = document.getElementById("roproLastOnlineHeaderLine")
	if (existing != null) {
		existing.remove()
	}
}

function getRoProProfilePresenceState() {
	var header = document.getElementById("user-profile-header-bg")
	var statusNodes = null
	if (header != null) {
		statusNodes = header.querySelectorAll(".avatar-status")
	}
	if (statusNodes == null || statusNodes.length == 0) {
		statusNodes = document.querySelectorAll(".profile-header .avatar-status, .profile-container .avatar-status")
	}
	if (statusNodes.length == 0) {
		return "loading"
	}
	var hasOnlineSignal = false
	var hasOfflineSignal = false
	for (var i = 0; i < statusNodes.length; i++) {
		var statusNode = statusNodes[i]
		if (statusNode == null) {
			continue
		}
		if (statusNode.querySelector('[data-testid="presence-icon"], .icon-online, .icon-game, .icon-studio, .icon-mobile') != null) {
			hasOnlineSignal = true
			break
		}
		if (statusNode.querySelector('.icon-offline, .offline, [title="Offline"]') != null) {
			hasOfflineSignal = true
		}
	}
	if (hasOnlineSignal) {
		return "active"
	}
	if (hasOfflineSignal) {
		return "offline"
	}
	return "unknown"
}

function shouldRenderRoProLastOnlineByPresence(attempt) {
	var presenceState = getRoProProfilePresenceState()
	if (presenceState == "active") {
		return false
	}
	if (presenceState == "offline") {
		return true
	}
	if (presenceState == "loading") {
		return attempt >= 3
	}
	return attempt >= 3
}

function findRoProLastOnlineHeaderParent() {
	var primaryUsername = document.getElementsByClassName('stylistic-alts-username')
	if (primaryUsername.length > 0 && primaryUsername[0].parentElement != null) {
		return primaryUsername[0].parentElement
	}
	var profileHeaderName = document.getElementById("profile-header-title-container-name")
	if (profileHeaderName != null && profileHeaderName.parentElement != null && profileHeaderName.parentElement.parentElement != null) {
		return profileHeaderName.parentElement.parentElement
	}
	var legacyCaption = document.getElementsByClassName('profile-header-names')
	if (legacyCaption.length > 0) {
		return legacyCaption[0]
	}
	return null
}

function moveRoProLastOnlineHeaderLineToBottom(parent) {
	var line = document.getElementById("roproLastOnlineHeaderLine")
	if (line == null) {
		return
	}
	var resolvedParent = parent != null ? parent : findRoProLastOnlineHeaderParent()
	if (resolvedParent == null) {
		return
	}
	if (line.parentElement !== resolvedParent || resolvedParent.lastElementChild !== line) {
		resolvedParent.appendChild(line)
	}
}

function upsertRoProLastOnlineHeaderLine(valueText, tooltipText, hidden) {
	var parent = findRoProLastOnlineHeaderParent()
	if (parent == null) {
		return false
	}
	var line = document.getElementById("roproLastOnlineHeaderLine")
	if (line == null) {
		line = document.createElement("div")
		line.id = "roproLastOnlineHeaderLine"
		line.className = "ropro-last-online-header-line"

		var label = document.createElement("span")
		label.className = "ropro-last-online-header-label"
		label.textContent = "RoPro Last Online:"
		line.appendChild(label)

		var value = document.createElement("span")
		value.id = "roproLastOnlineHeaderValue"
		value.className = "ropro-last-online-header-value"
		line.appendChild(value)

		parent.appendChild(line)
	}
	var valueNode = document.getElementById("roproLastOnlineHeaderValue")
	if (valueNode == null) {
		return false
	}
	valueNode.textContent = stripTags(valueText)
	if (typeof tooltipText == "string" && tooltipText.length > 0) {
		valueNode.title = stripTags(tooltipText)
	} else {
		valueNode.removeAttribute("title")
	}
	if (hidden) {
		line.classList.add("ropro-last-online-header-hidden")
	} else {
		line.classList.remove("ropro-last-online-header-hidden")
	}
	moveRoProLastOnlineHeaderLineToBottom(parent)
	return true
}

async function renderRoProLastOnlineLine(userID, attempt = 0) {
	var statusPromise = fetchRoProProfileLastOnlineStatus(userID)
	if (!shouldRenderRoProLastOnlineByPresence(attempt)) {
		clearRoProLastOnlineHeaderLine()
		if (attempt < 25) {
			setTimeout(function() {
				renderRoProLastOnlineLine(userID, attempt + 1)
			}, 250)
		}
		return
	}
	var status = await statusPromise
	var shouldShowLastOnline =
		status != null &&
		typeof status == "object" &&
		status.available === true &&
		status.isVisible === true &&
		typeof status.lastOnline == "string"
	if (!shouldShowLastOnline) {
		clearRoProLastOnlineHeaderLine()
		return
	}
	var date = new Date(status.lastOnline)
	if (isNaN(date.getTime())) {
		clearRoProLastOnlineHeaderLine()
		return
	}
	var relativeString = formatRoProLastOnlineRelative(date)
	var absoluteString = formatRoProLastOnlineAbsolute(date, "local")
	var valueText = `${relativeString} (${absoluteString})`
	var tooltipText = absoluteString
	if (getRoProProfilePresenceState() == "active") {
		clearRoProLastOnlineHeaderLine()
		return
	}
	var inserted = upsertRoProLastOnlineHeaderLine(valueText, tooltipText, false)
	if (!inserted && attempt < 25) {
		setTimeout(function() {
			renderRoProLastOnlineLine(userID, attempt + 1)
		}, 250)
	}
}

function findRoProProfileSocialCountsContainer() {
	var legacyDetails = document.getElementsByClassName('profile-header-details')
	if (legacyDetails.length > 0) {
		var legacyCounts = legacyDetails[0].getElementsByClassName('profile-header-social-counts')
		if (legacyCounts.length > 0) {
			return legacyCounts[0]
		}
	}
	var header = document.getElementById("user-profile-header-bg")
	if (header == null) {
		header = document.querySelector(".user-profile-header")
	}
	if (header == null) {
		return null
	}

	var directLink = header.querySelector('a[href*="/friends#!/"], a[href*="/friends"], a[href*="#!/friends"], a[href*="#friends"]')
	var container = directLink != null ? directLink.parentElement : null
	while (container != null && container !== document.body) {
		if (getRoProProfileSocialSignals(container).length >= 2) {
			return container
		}
		container = container.parentElement
	}

	var structuralCandidates = header.querySelectorAll('div, ul, nav, section')
	for (var candidateIndex = 0; candidateIndex < structuralCandidates.length; candidateIndex++) {
		var candidate = structuralCandidates[candidateIndex]
		if (getRoProProfileSocialSignals(candidate).length >= 2) {
			return candidate
		}
	}

	if (directLink != null && directLink.parentElement != null) {
		return directLink.parentElement
	}
	return null
}

function getRoProProfileSocialSignals(container) {
	if (container == null || typeof container.children == "undefined") {
		return []
	}
	var signals = []
	for (var i = 0; i < container.children.length; i++) {
		var node = container.children[i]
		if (node == null || node.id == "roproMutualCountNode") {
			continue
		}
		if (typeof node.matches != "function" || !node.matches('a, button, [role="link"], [role="button"]')) {
			continue
		}
		var text = stripTags(node.textContent || "").trim().toLowerCase()
		if (text.length == 0) {
			continue
		}
		var hasSocialText =
			text.indexOf("connection") >= 0 ||
			text.indexOf("follower") >= 0 ||
			text.indexOf("following") >= 0
		if (hasSocialText) {
			signals.push(node)
		}
	}
	return signals
}

function getRoProMutualDisplayText(numMutuals, showCount = true) {
	if (!showCount) {
		return "Mutuals"
	}
	var parsedCount = parseInt(numMutuals, 10)
	if (!Number.isFinite(parsedCount) || parsedCount < 0) {
		parsedCount = 0
	}
	return `${parsedCount} Mutual${parsedCount == 1 ? "" : "s"}`
}

function setRoProMutualNodeDisplayText(mutualNode, textValue) {
	if (mutualNode == null || typeof textValue != "string" || textValue.length == 0) {
		return
	}
	var textNode = mutualNode.querySelector("span.text-no-wrap, span")
	if (textNode != null) {
		textNode.textContent = textValue
		return
	}
	mutualNode.textContent = textValue
}

function findRoProProfileMutualTemplateNode(container) {
	if (container == null || typeof container.children == "undefined") {
		return null
	}
	var explicitTemplate = null
	for (var childIndex = 0; childIndex < container.children.length; childIndex++) {
		var child = container.children[childIndex]
		if (
			child != null &&
			typeof child.matches == "function" &&
			child.matches('a[href*="/friends#!/"], a[href*="/friends"], a[href*="#!/friends"], a[href*="#friends"]')
		) {
			explicitTemplate = child
			break
		}
	}
	if (explicitTemplate == null && typeof container.querySelector == "function") {
		explicitTemplate = container.querySelector('a[href*="/friends#!/"], a[href*="/friends"], a[href*="#!/friends"], a[href*="#friends"]')
	}
	if (explicitTemplate != null) {
		return explicitTemplate
	}
	var candidates = container.children
	for (var i = 0; i < candidates.length; i++) {
		var candidate = candidates[i]
		if (candidate == null || candidate.id == "roproMutualCountNode") {
			continue
		}
		if (typeof candidate.matches != "function" || !candidate.matches('a, [role="link"]')) {
			continue
		}
		var text = stripTags(candidate.textContent || "").trim().toLowerCase()
		if (
			text.indexOf("connection") >= 0 ||
			text.indexOf("follower") >= 0 ||
			text.indexOf("following") >= 0
		) {
			return candidate
		}
	}
	return null
}

function buildRoProMutualSocialNode(numMutuals, profileUserId, container, showCount = true) {
	var displayText = getRoProMutualDisplayText(numMutuals, showCount)
	var mutualTitle = showCount ? `Mutual${parseInt(numMutuals, 10) == 1 ? "" : "s"}` : "Mutuals"
	var mutualLinkHref = `https://www.roblox.com/users/${parseInt(profileUserId)}/friends#!/friends#mutuals`
	if (container != null && container.tagName != null && container.tagName.toUpperCase() == "UL") {
		var legacyNode = document.createElement("li")
		legacyNode.id = "roproMutualCountNode"
		var legacyNodeLink = document.createElement("a")
		legacyNodeLink.className = "profile-header-social-count"
		legacyNodeLink.href = mutualLinkHref
		legacyNodeLink.title = mutualTitle
		var countNode = document.createElement("span")
		countNode.className = "MuiTypography-root web-blox-css-tss-hzyup-Typography-body1-Typography-root MuiTypography-inherit web-blox-css-mui-clml2g"
		if (showCount) {
			var countPrefixNode = document.createElement("b")
			countPrefixNode.textContent = String(parseInt(numMutuals, 10))
			countNode.appendChild(countPrefixNode)
			countNode.appendChild(document.createTextNode(" "))
		}
		countNode.appendChild(document.createTextNode(displayText))
		legacyNodeLink.appendChild(countNode)
		legacyNode.appendChild(legacyNodeLink)
		return legacyNode
	}
	var templateLink = findRoProProfileMutualTemplateNode(container)
	if (templateLink != null) {
		var nextGenNode = templateLink.cloneNode(true)
		nextGenNode.id = "roproMutualCountNode"
		nextGenNode.href = mutualLinkHref
		nextGenNode.setAttribute("aria-disabled", "false")
		nextGenNode.classList.remove("opacity-[0.5]")
		setRoProMutualNodeDisplayText(nextGenNode, displayText)
		return nextGenNode
	}
	var fallbackNode = document.createElement("a")
	fallbackNode.id = "roproMutualCountNode"
	fallbackNode.href = mutualLinkHref
	fallbackNode.className = "profile-header-social-count"
	fallbackNode.title = mutualTitle
	fallbackNode.textContent = displayText
	return fallbackNode
}

var ROPRO_PROFILE_MUTUAL_COUNT_CACHE_TTL_MS = 60 * 1000
var roproProfileMutualCountCache = {}
var roproProfileMutualCountPending = {}

function normalizeRoProProfileMutualUserId(value) {
	var parsed = parseInt(value, 10)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}
	return String(parsed)
}

function getRoProProfileCachedMutualFriendCount(userId) {
	var normalizedUserId = normalizeRoProProfileMutualUserId(userId)
	if (normalizedUserId == null) {
		return undefined
	}
	var cached = roproProfileMutualCountCache[normalizedUserId]
	if (cached == null || typeof cached != "object" || !Number.isFinite(cached.fetchedAt)) {
		return undefined
	}
	if (Date.now() - cached.fetchedAt > ROPRO_PROFILE_MUTUAL_COUNT_CACHE_TTL_MS) {
		delete roproProfileMutualCountCache[normalizedUserId]
		return undefined
	}
	return cached.count
}

async function fetchRoProProfileMutualFriendCount(userId) {
	var normalizedUserId = normalizeRoProProfileMutualUserId(userId)
	if (normalizedUserId == null) {
		return null
	}
	var cached = getRoProProfileCachedMutualFriendCount(normalizedUserId)
	if (cached !== undefined) {
		return cached
	}
	if (roproProfileMutualCountPending[normalizedUserId] != null) {
		return await roproProfileMutualCountPending[normalizedUserId]
	}
	roproProfileMutualCountPending[normalizedUserId] = fetchMutualFriends(normalizedUserId)
		.then(function(mutuals) {
			var count = Array.isArray(mutuals) ? mutuals.length : null
			roproProfileMutualCountCache[normalizedUserId] = {
				count: count,
				fetchedAt: Date.now()
			}
			return count
		})
		.catch(function() {
			roproProfileMutualCountCache[normalizedUserId] = {
				count: null,
				fetchedAt: Date.now()
			}
			return null
		})
	try {
		return await roproProfileMutualCountPending[normalizedUserId]
	} finally {
		delete roproProfileMutualCountPending[normalizedUserId]
	}
}

function roproProfileContainerIsVisible(container) {
	if (container == null || typeof container != "object" || container.isConnected !== true) {
		return false
	}
	try {
		var style = window.getComputedStyle(container)
		if (style.display == "none" || style.visibility == "hidden") {
			return false
		}
	} catch (e) {
		return false
	}
	return container.getClientRects().length > 0
}

function upsertRoProProfileMutualNode(mutualNode, targetContainer, insertionRef) {
	if (mutualNode == null || targetContainer == null) {
		return false
	}
	var existingNode = document.getElementById("roproMutualCountNode")
	if (
		insertionRef != null &&
		insertionRef.parentElement === targetContainer &&
		insertionRef !== existingNode
	) {
		targetContainer.insertBefore(mutualNode, insertionRef)
	} else {
		targetContainer.appendChild(mutualNode)
	}
	if (existingNode != null && existingNode !== mutualNode) {
		existingNode.remove()
	}
	return true
}

function insertRoProProfileMutualSocialNode(mutualNode, friendsBar) {
	if (mutualNode == null || friendsBar == null) {
		return false
	}
	mutualNode.classList.remove("ropro-profile-mutual-fallback-link")
	var insertionRef = getRoProProfileMutualInsertionRef(friendsBar)
	return upsertRoProProfileMutualNode(mutualNode, friendsBar, insertionRef)
}

function getRoProProfileMutualInsertionRef(friendsBar) {
	var socialNodes = getRoProProfileSocialSignals(friendsBar)
	if (!Array.isArray(socialNodes) || socialNodes.length == 0) {
		return null
	}
	var connectionIndex = -1
	for (var i = 0; i < socialNodes.length; i++) {
		var nodeText = stripTags(socialNodes[i].textContent || "").trim().toLowerCase()
		if (nodeText.indexOf("connection") >= 0) {
			connectionIndex = i
			break
		}
	}
	var targetIndex = connectionIndex >= 0 ? connectionIndex + 1 : 1
	if (targetIndex >= 0 && targetIndex < socialNodes.length) {
		return socialNodes[targetIndex]
	}
	return null
}

function insertRoProProfileMutualFallbackNode(mutualNode) {
	if (mutualNode == null) {
		return false
	}
	var socialContainer = findRoProProfileSocialCountsContainer()
	if (roproProfileContainerIsVisible(socialContainer)) {
		mutualNode.classList.remove("ropro-profile-mutual-fallback-link")
		return insertRoProProfileMutualSocialNode(mutualNode, socialContainer)
	}
	var fallbackHost = findRoProLastOnlineHeaderParent()
	if (fallbackHost == null) {
		return false
	}
	mutualNode.classList.add("ropro-profile-mutual-fallback-link")
	var lastOnlineLine = document.getElementById("roproLastOnlineHeaderLine")
	var insertionRef = null
	if (lastOnlineLine != null && lastOnlineLine.parentElement === fallbackHost) {
		insertionRef = lastOnlineLine
	}
	var inserted = upsertRoProProfileMutualNode(mutualNode, fallbackHost, insertionRef)
	if (!inserted) {
		return false
	}
	moveRoProLastOnlineHeaderLineToBottom(fallbackHost)
	return inserted
}

async function addMutuals(attempt = 0) {
	var userIdFromUrl = parseInt(getIdFromURL(location.href))
	if (!Number.isFinite(userIdFromUrl) || userIdFromUrl <= 0) {
		return
	}
	var initialFriendsBar = findRoProProfileSocialCountsContainer()
	if (roproProfileContainerIsVisible(initialFriendsBar)) {
		var initialSocialNode = buildRoProMutualSocialNode(0, userIdFromUrl, initialFriendsBar, false)
		if (initialSocialNode != null) {
			insertRoProProfileMutualSocialNode(initialSocialNode, initialFriendsBar)
		}
	} else if (initialFriendsBar == null && attempt >= 8) {
		var initialFallbackNode = buildRoProMutualSocialNode(0, userIdFromUrl, null, false)
		if (initialFallbackNode != null) {
			insertRoProProfileMutualFallbackNode(initialFallbackNode)
		}
	}

	var mutualFriendCount = await fetchRoProProfileMutualFriendCount(userIdFromUrl)
	var showCount = Number.isFinite(mutualFriendCount) && mutualFriendCount > 0
	var displayCount = Number.isFinite(mutualFriendCount) && mutualFriendCount > 0 ? mutualFriendCount : 0

	var finalFriendsBar = findRoProProfileSocialCountsContainer()
	if (roproProfileContainerIsVisible(finalFriendsBar)) {
		var finalSocialNode = buildRoProMutualSocialNode(displayCount, userIdFromUrl, finalFriendsBar, showCount)
		if (finalSocialNode != null) {
			insertRoProProfileMutualSocialNode(finalSocialNode, finalFriendsBar)
			if (attempt < 8) {
				setTimeout(function() {
					addMutuals(attempt + 1)
				}, 1200)
			}
			return
		}
	}
	if (finalFriendsBar == null) {
		var finalFallbackNode = buildRoProMutualSocialNode(displayCount, userIdFromUrl, null, showCount)
		if (finalFallbackNode != null) {
			insertRoProProfileMutualFallbackNode(finalFallbackNode)
		}
	}
	if (attempt < 25) {
		setTimeout(function() {
			addMutuals(attempt + 1)
		}, 400)
	}
}

async function addThemeMain(theme) {
	if (document.documentElement != null) {
		document.documentElement.classList.add('ropro-profile-theme-active')
		document.documentElement.classList.remove('ropro-profile-theme-loading')
	}
	if (document.body != null) {
		document.body.classList.add('ropro-profile-theme-active')
		document.body.classList.remove('ropro-profile-theme-loading')
	}
	if (theme.hasOwnProperty('version') && theme['version'] == 2) {
		var div = document.createElement('div')
		var themeName = typeof theme['name'] == "string" ? stripTags(theme['name']) : ""
		var themeUrlOptions = {
			hardCache: myUserID == profileUserID,
			h: theme.hasOwnProperty('h') ? parseInt(theme['h']) : null,
			s: theme.hasOwnProperty('s') ? parseFloat(theme['s']) : null,
			l: theme.hasOwnProperty('l') ? parseFloat(theme['l']) : null
		}
		if (themeName.includes('.mp4')) {
			themeName = myUserID != profileUserID ? themeName.replace('_4K.mp4', '_HD.mp4') : themeName
		}
		var rawThemeFrameUrl = roproApiAdapter.buildThemeFrameUrl(themeName, Object.assign({}, themeUrlOptions, {video: themeName.includes('.mp4')}))
		var safeThemeFrameUrl = typeof roproApiAdapter.getSafeThemeFrameUrl == "function" ? roproApiAdapter.getSafeThemeFrameUrl(rawThemeFrameUrl) : rawThemeFrameUrl
		if (safeThemeFrameUrl == null) {
			return
		}
		var frame = document.createElement('iframe')
		frame.id = "roproThemeFrame"
		frame.setAttribute("frameborder", "0")
		frame.setAttribute("style", "top:0;left:0;position:absolute;border:0;width:100%;height:100%;z-index:-1;")
		if (theme.hasOwnProperty('h')) {
			frame.setAttribute("h", String(parseInt(theme['h'])))
		}
		if (theme.hasOwnProperty('s')) {
			frame.setAttribute("s", String(parseFloat(theme['s'])))
		}
		if (theme.hasOwnProperty('l')) {
			frame.setAttribute("l", String(parseFloat(theme['l'])))
		}
		frame.src = safeThemeFrameUrl
		div.appendChild(frame)
		document.getElementById('container-main').appendChild(div.childNodes[0])
		mainContainer = document.getElementById('container-main')
		profileContainer = document.getElementsByClassName('profile-container')[0]
		profileContainer.style.padding = "24px"
		profileContainer.style.paddingTop = "10px"
		mainContainer.style.borderRadius = "20px"
		mainContainer.style.padding = "24px"
		if (document.getElementById('accoutrements-slider') != null) {
			document.getElementById('accoutrements-slider').setAttribute('style', 'width:470px;transform:scale(0.95);margin-left:-7px;')
		}
		contentContainer = document.getElementsByClassName('content')
		contentContainer = contentContainer[0]
		contentContainer.style.borderRadius = "10px"
		profileThemeName = theme['name']
		accoutrementsContainer = document.getElementsByClassName('accoutrement-items-container')
		if (accoutrementsContainer.length > 0) {
			accoutrementsContainer[0].setAttribute('style', 'width:105%;transform:scale(0.95);margin-left:-2.5%;')
		}
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
			mainContainer = document.getElementById('container-main')
			profileContainer = document.getElementsByClassName('profile-container')[0]
			profileContainer.style.padding = "24px"
			profileContainer.style.paddingTop = "10px"
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
		mainContainer.style.borderRadius = "20px"
		mainContainer.style.padding = "24px"
			accoutrementsContainer = document.getElementsByClassName('accoutrement-items-container')
			if (accoutrementsContainer.length > 0) {
				accoutrementsContainer[0].setAttribute('style', 'width:105%;transform:scale(0.95);margin-left:-2.5%;')
			}
			contentContainer = document.getElementsByClassName('content')
			contentContainer = contentContainer[0]
			contentContainer.style.borderRadius = "10px"
		}
		favoritesContainer = document.getElementsByClassName('favorite-games-container')
		for (var i = 0; i < favoritesContainer.length; i++) {
			favoritesContainer[i].style.overflowX = 'hidden'
		}
	var foregroundOpacity = await getStorage('foregroundOpacity')
	if (typeof foregroundOpacity == 'undefined' || foregroundOpacity === null || foregroundOpacity === "") {
		foregroundOpacity = 1
	}
	var parsedForegroundOpacity = parseFloat(foregroundOpacity)
	if (isNaN(parsedForegroundOpacity)) {
		parsedForegroundOpacity = 1
	}
	setForegroundOpacity(parsedForegroundOpacity)
	if (parsedForegroundOpacity < 1) {
		if (document.getElementById('game-details-carousel-container') != null) {
			document.getElementById('game-details-carousel-container').style.borderRadius = "10px"
		}
	}
	var backdropBlur = await getStorage('backdropBlur')
	if (typeof backdropBlur == 'undefined' || backdropBlur === null || backdropBlur === "") {
		backdropBlur = 0
	}
	var parsedBackdropBlur = parseInt(backdropBlur)
	if (isNaN(parsedBackdropBlur)) {
		parsedBackdropBlur = 0
	}
	if (parsedBackdropBlur > 0) {
		setBackdropBlur(parsedBackdropBlur)
	}
}

function resolveRoProProfileBadgeHost() {
	var legacyHeader = document.getElementsByClassName('profile-header-title-container')
	if (legacyHeader.length > 0 && legacyHeader[0] != null) {
		return {
			header: legacyHeader[0],
			mode: "legacy"
		}
	}
	var profileHeaderName = document.getElementById("profile-header-title-container-name")
	if (profileHeaderName == null || profileHeaderName.parentElement == null) {
		return null
	}
	var titleRow = profileHeaderName.parentElement
	var iconContainer = null
	var premiumIcon = titleRow.querySelector('.icon-filled-premium')
	if (premiumIcon != null && premiumIcon.parentElement != null) {
		iconContainer = premiumIcon.parentElement
	}
	if (iconContainer == null) {
		var verifiedIcon = titleRow.querySelector('.icon-filled-verified-mono')
		if (verifiedIcon != null && verifiedIcon.parentElement != null) {
			iconContainer = verifiedIcon.parentElement
		}
	}
	if (iconContainer == null) {
		iconContainer = document.createElement("span")
		iconContainer.className = "items-center gap-xxsmall flex"
		titleRow.appendChild(iconContainer)
	}
	return {
		header: iconContainer,
		mode: "modern"
	}
}

function insertRoProProfileBadgeNode(header, mode, badgeNode) {
	if (header == null || badgeNode == null) {
		return
	}
	if (mode == "legacy") {
		if (document.getElementsByClassName("profile-themes-button").length == 0) {
			header.appendChild(badgeNode)
		} else {
			header.insertBefore(badgeNode, header.childNodes[header.childNodes.length - 1])
		}
		return
	}
	header.appendChild(badgeNode)
}

async function addRoProInfo(tier, user_since, subscribed_for) {
	var tierName = "Free Tier"
	var icon = chrome.runtime.getURL('/images/free_icon.png')
	var link = "https://ropro.io/"
	var subscriber = false
	if (tier == "free_tier") {
		tierName = "RoPro Free"
		icon = chrome.runtime.getURL('/images/free_icon.png')
		link = "https://ropro.io/"
	} else if (tier == "standard_tier" || tier == "plus") {
		tierName = "RoPro Plus"
		icon = chrome.runtime.getURL('/images/plus_icon.png')
		link = "https://ropro.io#plus"
		subscriber = true
	} else if (tier == "pro_tier" || tier == "rex" || tier == "ultra_tier" || tier == "ultra") {
		tierName = "RoPro Rex"
		icon = chrome.runtime.getURL('/images/rex_icon.png')
		link = "https://ropro.io#rex"
		subscriber = true
	}
	var badgeHost = resolveRoProProfileBadgeHost()
	if (badgeHost == null) {
		return
	}
	var div = document.createElement('div')
	div.setAttribute("class", "ropro-user-info ropro-profile-header-badge")
	if (badgeHost.mode == "legacy") {
		if (document.getElementsByClassName('icon-badge-medium').length == 0) {
			div.setAttribute("style", "margin-left:2px;margin-right:8px;margin-top:0px;")
		} else {
			div.setAttribute("style", "margin-right:6px;margin-left:6px;margin-left:8px;margin-top:1px;")
		}
	} else {
		div.setAttribute("style", "margin-left:4px;position:relative;display:inline-flex;align-items:center;")
	}
	var iconSizeStyle = badgeHost.mode == "legacy" ? "width:30px;" : "width:18px;height:18px;display:block;"
	div.innerHTML = `<a target="_blank" href="${link}"><img class="ropro-profile-icon" src="${icon}" style="${iconSizeStyle}"></a>`
	insertRoProProfileBadgeNode(badgeHost.header, badgeHost.mode, div)
	var infoCardTop = badgeHost.mode == "legacy" ? (subscriber ? "-19" : "-4") : "26"
	var infoCardLeft = badgeHost.mode == "legacy" ? "200" : "-62"
	if (badgeHost.mode == "legacy") {
		var profileNames = document.getElementsByClassName('profile-header-names')
		if (profileNames.length > 0 && profileNames[0].getElementsByClassName('ropro-profile-icon').length > 0) {
			infoCardLeft = String(profileNames[0].getElementsByClassName('ropro-profile-icon')[0].getBoundingClientRect().left - profileNames[0].getBoundingClientRect().left + 200)
		}
	}
	div.innerHTML += `<div class="ropro-info-card ropro-tier-info-card" style="pointer-events:none;filter:drop-shadow(2px 2px 2px #363636);display:none;z-index:1000;top:${infoCardTop}px;left:${infoCardLeft}px;position:absolute;min-width:260px;max-width:320px;white-space:normal;overflow-wrap:anywhere;"><div style="position:relative;"><div style="background:${$('.dark-theme').length > 0 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)"};padding:10px 12px;border-radius:8px;line-height:1.35;">
	<div style="text-align:center;margin-bottom:4px;"><a style="font-size:13px;font-weight:bold;display:inline-block;white-space:normal;overflow-wrap:anywhere;" target="_blank" href="${link}">${tierName} User</a></div>
	${subscriber ? `<div style="text-align:center;margin-bottom:4px;"><a style="font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:normal;overflow-wrap:anywhere;" href="${link}"><img class="ropro-profile-icon" src="${icon}" style="width:12px;height:12px;display:block;"> Subscriber for ${stripTags(subscribed_for)}</a></div>` : ``}
	<div style="text-align:center;"><a style="font-size:13px;display:inline-block;white-space:normal;overflow-wrap:anywhere;" href="${link}">RoPro User for ${stripTags(user_since)}</a></div></div></div></div>`
	$(".linkpath").css("fill", $('body').css("color"))
}

async function addProfileIcon(name, description, image, link) {
	var badgeHost = resolveRoProProfileBadgeHost()
	if (badgeHost == null) {
		return
	}
	var div = document.createElement('div')
	div.setAttribute("class", "ropro-user-info ropro-profile-header-badge")
	if (badgeHost.mode == "legacy") {
		if (document.getElementsByClassName('icon-badge-medium').length == 0) {
			div.setAttribute("style", "margin-right:6px;margin-top:0px;")
		} else {
			div.setAttribute("style", "margin-right:6px;margin-left:6px;margin-top:1px;")
		}
	} else {
		div.setAttribute("style", "margin-left:4px;position:relative;display:inline-flex;align-items:center;")
	}
	var profileIconSizeStyle = /donor/i.test(name) ? (badgeHost.mode == "legacy" ? "height:90px;" : "width:54px;height:54px;display:block;") : (badgeHost.mode == "legacy" ? "height:30px;" : "width:18px;height:18px;display:block;")
	var profileLink = document.createElement("a")
	profileLink.setAttribute("target", "_blank")
	profileLink.href = normalizeProfileIconLink(link)
	var profileImage = document.createElement("img")
	profileImage.className = "ropro-profile-icon"
	profileImage.setAttribute("style", profileIconSizeStyle)
	profileImage.src = normalizeProfileIconSrc(image) || chrome.runtime.getURL('/images/empty.png')
	profileLink.appendChild(profileImage)
	div.appendChild(profileLink)
	insertRoProProfileBadgeNode(badgeHost.header, badgeHost.mode, div)
	var infoCardTop = badgeHost.mode == "legacy" ? "40" : "26"
	var infoCardLeft = badgeHost.mode == "legacy" ? "50" : "-62"
	div.innerHTML += `<div class="ropro-info-card ropro-icon-info-card" style="display:none;pointer-events:none;filter:drop-shadow(2px 2px 2px #363636);z-index:1000;top:${infoCardTop}px;left:${infoCardLeft}px;position:absolute;background-color:#232527;color:white;padding:8px;border-radius:8px;min-width:280px;max-width:360px;white-space:normal;overflow-wrap:anywhere;"><div style="position:relative;max-width:344px;"><div style="text-align:center;margin-top:4px;margin-bottom:6px;"><a style="font-size:16px;font-weight:bold;display:inline-block;white-space:normal;overflow-wrap:anywhere;" target="_blank">${stripTags(name)}</a></div><div style="font-size:12px;text-align:left;margin:auto;background-color:#393B3D;padding:8px;border-radius:6px;white-space:normal;overflow-wrap:anywhere;">
	${stripTags(description)}
	</div></div></div>`
	//$(".linkpath").css("fill", $('body').css("color"))
}

function stripTags(s) {
	return roproApiAdapter.stripTags(s);
}

function normalizeProfileIconLink(rawLink) {
	var candidate = typeof rawLink == "string" ? stripTags(rawLink) : ""
	if (typeof candidate != "string") {
		candidate = ""
	}
	candidate = candidate.trim()
	if (candidate.length == 0) {
		return "#"
	}
	if (candidate.startsWith("/")) {
		return candidate
	}
	try {
		var parsed = new URL(candidate, window.location.origin)
		if (parsed.protocol != "http:" && parsed.protocol != "https:") {
			return "#"
		}
		var host = parsed.hostname.toLowerCase()
		if (host == "roblox.com" || host == "www.roblox.com" || host.endsWith(".roblox.com") || host == "ropro.io" || host.endsWith(".ropro.io") || host.endsWith(".staging.ropro.io")) {
			return parsed.href
		}
	} catch (e) {}
	return "#"
}

function normalizeProfileIconSrc(rawImage) {
	var candidate = typeof rawImage == "string" ? stripTags(rawImage) : ""
	if (typeof candidate != "string") {
		candidate = ""
	}
	candidate = candidate.trim()
	if (candidate.length == 0) {
		return ""
	}
	if (candidate.startsWith("/")) {
		candidate = candidate.substring(1)
	}
	try {
		var baseUrl = new URL("https://ropro.io/profile_icons/")
		var parsed = new URL(candidate, baseUrl)
		if (parsed.hostname.toLowerCase() !== "ropro.io") {
			return ""
		}
		if (!parsed.pathname.startsWith("/profile_icons/")) {
			return ""
		}
		if (parsed.search.length > 0 || parsed.hash.length > 0) {
			return ""
		}
		return parsed.href
	} catch (e) {}
	return ""
}

function createRoProProfileChipImage(src, height, styleText, imageId = null) {
	var image = document.createElement("img")
	image.src = src
	image.setAttribute("height", stripTags(height))
	if (imageId != null && typeof imageId == "string" && imageId.length > 0) {
		image.id = imageId
	}
	if (typeof styleText == "string" && styleText.length > 0) {
		image.setAttribute("style", styleText)
	}
	return image
}

function getRoProProfileHeaderChipOrder(chipId) {
	if (chipId == "valueLink") {
		return 10
	}
	if (chipId == "reputationLikeButton") {
		return 20
	}
	if (chipId == "discordLink") {
		return 30
	}
	return 100
}

function insertRoProProfileHeaderChip(reputationDiv, chipNode) {
	if (reputationDiv == null || chipNode == null) {
		return
	}
	if (chipNode.id == null || chipNode.id.length == 0) {
		reputationDiv.appendChild(chipNode)
		return
	}
	var existingChip = reputationDiv.querySelector(`#${chipNode.id}`)
	if (existingChip != null) {
		existingChip.remove()
	}
	var chipOrder = getRoProProfileHeaderChipOrder(chipNode.id)
	var children = reputationDiv.children
	for (var i = 0; i < children.length; i++) {
		var existingOrder = getRoProProfileHeaderChipOrder(children[i].id)
		if (existingOrder > chipOrder) {
			reputationDiv.insertBefore(chipNode, children[i])
			return
		}
	}
	reputationDiv.appendChild(chipNode)
}

function addValue(value, userID) {
	var reputationDiv = document.getElementById('reputationDiv')
	if (reputationDiv == null) {
		return
	}
	var valueNode = document.createElement("a")
	valueNode.id = "valueLink"
	valueNode.href = `https://www.rolimons.com/player/${parseInt(userID)}`
	valueNode.target = "_blank"
	valueNode.setAttribute("style", "margin-right:5px;")
	valueNode.appendChild(
		createRoProProfileChipImage(
			chrome.runtime.getURL('/images/rolimons_start.png'),
			"24px",
			"margin-right:-1px;float:left;"
		)
	)
	var valueAmount = document.createElement("div")
	valueAmount.id = "valueAmount"
	valueAmount.setAttribute("style", "color:white;text-align:bottom;font-weight:500;text-align:center;display:inline-block;background-color:#0084DD;height:24px;padding:1.5px;float:left;")
	var valueLoadingBar = document.createElement("span")
	valueLoadingBar.id = "valueLoadingBar"
	valueLoadingBar.className = "spinner spinner-default"
	valueLoadingBar.setAttribute("style", "transform:scale(0.6);width:100px;margin-right:-20px;margin-left:-20px;margin-top:-2px;")
	valueAmount.appendChild(valueLoadingBar)
	valueNode.appendChild(valueAmount)
	valueNode.appendChild(
		createRoProProfileChipImage(
			chrome.runtime.getURL('/images/rolimons_end.png'),
			"24px",
			"float:left;margin-right:5px;"
		)
	)
	insertRoProProfileHeaderChip(reputationDiv, valueNode)
	moveRoProLastOnlineHeaderLineToBottom(reputationDiv.parentElement)
	Promise.resolve(value).then(function(result) {
		var resolvedValue = result != null && typeof result == "object" ? result['value'] : null
		var valueAmount = document.getElementById('valueAmount')
		if (valueAmount == null) {
			return
		}
		if (resolvedValue == "private") {
			valueAmount.innerText = "Private Inventory"
			return
		}
		var parsedValue = parseInt(resolvedValue, 10)
		if (!isNaN(parsedValue)) {
			valueAmount.innerText = addCommas(parsedValue)
			return
		}
		if (typeof resolvedValue == "string" && resolvedValue.length > 0) {
			valueAmount.innerText = stripTags(resolvedValue)
			return
		}
		valueAmount.innerText = "Unavailable"
	}).catch(function() {
		var valueAmount = document.getElementById('valueAmount')
		if (valueAmount != null) {
			valueAmount.innerText = "Unavailable"
		}
	})
}

function addDiscord(discord) {
	var captionNodes = document.getElementsByClassName('profile-header-names')
	var caption = captionNodes.length > 0 ? captionNodes[0] : findRoProLastOnlineHeaderParent()
	var reputationDiv = document.getElementById("reputationDiv")
	if (reputationDiv == null) {
		return
	}
	var discordNode = document.createElement("a")
	discordNode.id = "discordLink"
	discordNode.href = "discord://"
	discordNode.setAttribute("style", "margin-right:5px;")
	discordNode.appendChild(
		createRoProProfileChipImage(
			chrome.runtime.getURL('/images/discord_start.png'),
			"24px",
			"margin-right:-1px;float:left;"
		)
	)
	var discordName = document.createElement("div")
	discordName.id = "discordName"
	discordName.textContent = stripTags(discord)
	discordName.setAttribute("style", "color:white;text-align:bottom;font-weight:500;text-align:center;display:inline-block;background-color:#5865F2;height:24px;padding:1.5px;float:left;")
	discordNode.appendChild(discordName)
	discordNode.appendChild(
		createRoProProfileChipImage(
			chrome.runtime.getURL('/images/discord_end.png'),
			"24px",
			"float:left;margin-right:5px;"
		)
	)
	insertRoProProfileHeaderChip(reputationDiv, discordNode)
	if (caption != null && caption.childNodes.length > 2) {
		caption.insertBefore(reputationDiv, caption.childNodes[2])
	}
	moveRoProLastOnlineHeaderLineToBottom(caption)
}

sendingPost = false

function changeReputation() {
	if (!sendingPost) {
		sendingPost = true
		var type = "add"
		var likeButton = document.getElementById('reputationLikeButton')
		var likeImage = document.getElementById('reputationLikeImage')
		var repValueText = document.getElementById('repValueText')
		if (likeButton == null || likeImage == null || repValueText == null) {
			sendingPost = false
			return
		}
		var repValue = parseRoProInteger(likeButton.getAttribute('reputation-value'), 0)
		if (likeButton.getAttribute("liked") == "true") {
			likeImage.setAttribute("src", chrome.runtime.getURL('/images/like_inactive.png'))
			likeButton.setAttribute("liked", "false")
			type = "remove"
			repValueText.innerText = addCommas(repValue - 1)
			likeButton.setAttribute('reputation-value', repValue - 1)
		} else {
			likeImage.setAttribute("src", chrome.runtime.getURL('/images/like_active.png'))
			likeButton.setAttribute("liked", "true")
			type = "add"
			repValueText.innerText = addCommas(repValue + 1)
			likeButton.setAttribute('reputation-value', repValue + 1)
		}
		postReputation(type)
		setTimeout(function() {
			sendingPost = false
		}, 500)
	}
}

async function addReputation(reputation, liked, isMe) {
	var isLiked = parseRoProBoolean(liked)
	var safeReputationValue = parseRoProInteger(reputation, 0)
	var likeImage = null
	if (isLiked) {
		likeImage = chrome.runtime.getURL('/images/like_active.png')
	} else {
		likeImage = chrome.runtime.getURL('/images/like_inactive.png')
	}
	var reputationDiv = document.getElementById("reputationDiv")
	if (reputationDiv == null) {
		return
	}
	if (await fetchSetting("reputation")) {
		var reputationNode = document.createElement("a")
		reputationNode.id = "reputationLikeButton"
		reputationNode.setAttribute("liked", isLiked ? "true" : "false")
		reputationNode.setAttribute("reputation-value", safeReputationValue)
		reputationNode.setAttribute("style", "margin-right:5px;")
		reputationNode.appendChild(
			createRoProProfileChipImage(
				chrome.runtime.getURL('/images/like_start.png'),
				"24px",
				"margin-right:-1px;float:left;"
			)
		)
		var repValueNode = document.createElement("div")
		repValueNode.id = "repValue"
		repValueNode.setAttribute("style", "color:white;font-weight:500;text-align:center;display:inline-flex;align-items:center;justify-content:center;gap:4px;background-color:#262B30;height:24px;padding:1.5px 6px;float:left;")
		repValueNode.appendChild(
			createRoProProfileChipImage(
				likeImage,
				"22.5px",
				"float:none;margin-right:0px;",
				"reputationLikeImage"
			)
		)
		var repValueTextNode = document.createElement("span")
		repValueTextNode.id = "repValueText"
		repValueTextNode.textContent = addCommas(safeReputationValue)
		repValueNode.appendChild(repValueTextNode)
		reputationNode.appendChild(repValueNode)
		reputationNode.appendChild(
			createRoProProfileChipImage(
				chrome.runtime.getURL('/images/like_start.png'),
				"24px",
				"float:left;margin-right:5px;transform:scaleX(-1);"
			)
		)
		insertRoProProfileHeaderChip(reputationDiv, reputationNode)
		var reputationLikeButton = document.getElementById('reputationLikeButton')
		if (reputationLikeButton != null) {
			reputationLikeButton.addEventListener('click', function() {
				changeReputation()
			})
		}
	}
}

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

async function mainProfile() {
	if (location.href.includes("/profile")) {
		try {
			if (document.documentElement != null) {
				document.documentElement.classList.remove('ropro-profile-theme-active')
				document.documentElement.classList.add('ropro-profile-theme-loading')
			}
			if (document.body != null) {
				document.body.classList.remove('ropro-profile-theme-active')
				document.body.classList.add('ropro-profile-theme-loading')
			}
			;(async function() {
				var profileThemesEnabled = await fetchSetting("profileThemes")
				if (!profileThemesEnabled) {
					if (document.documentElement != null) {
						document.documentElement.classList.remove('ropro-profile-theme-loading')
						document.documentElement.classList.remove('ropro-profile-theme-active')
					}
					if (document.body != null) {
						document.body.classList.remove('ropro-profile-theme-loading')
						document.body.classList.remove('ropro-profile-theme-active')
					}
					return
				}
				try {
					profileUserID = getIdFromURL(location.href)
					myUserID = await getStorage("rpUserID")
					var info = await getTheme(profileUserID)
					if (info != null && info.theme != null) {
						await addThemeMain(JSON.parse(info.theme))
					}
				} catch (themeError) {
					console.log(themeError)
				}
				if (document.documentElement != null && !document.documentElement.classList.contains('ropro-profile-theme-active')) {
					document.documentElement.classList.remove('ropro-profile-theme-loading')
				}
				if (document.body != null && !document.body.classList.contains('ropro-profile-theme-active')) {
					document.body.classList.remove('ropro-profile-theme-loading')
				}
			})()
				setTimeout(async function() {
					userID = getIdFromURL(location.href)
					renderRoProLastOnlineLine(userID)
				}, 1)
			} catch (e) {
				console.log(e)
			}
			userID = getIdFromURL(location.href)
			if (userID != undefined && userID != 0) {
				var captionNodes = document.getElementsByClassName('profile-header-names')
				var caption = captionNodes.length > 0 ? captionNodes[0] : findRoProLastOnlineHeaderParent()
				var reputationEnabled = await fetchSetting("reputation")
				var linkedDiscordEnabled = await fetchSetting("linkedDiscord")
				var profileValueEnabled = await fetchSetting("profileValue")
				var reputationDiv = document.createElement('div')
				reputationDiv.setAttribute("id", "reputationDiv")
				reputationDiv.setAttribute("style", stripTags(reputationDivPosition) + ":6px;visibility:initial;text-align:center;")
				if (caption != null) {
					var legacyProfileDetails = caption.getElementsByClassName('profile-header-details')
					if (legacyProfileDetails.length > 0) {
						caption.insertBefore(reputationDiv, legacyProfileDetails[0])
					} else {
						caption.appendChild(reputationDiv)
					}
					moveRoProLastOnlineHeaderLineToBottom(caption)
				} else if (document.body != null) {
					document.body.appendChild(reputationDiv)
				}
				var myId = await getStorage("rpUserID")
				if (userID != myId && await fetchSetting("mutualFriends")) {
					try {
						addMutuals()
					} catch(e) {
						console.log(e)
					}
				}
				var info = normalizeRoProUserInfo(await getInfo(userID, myId))
				if (reputationEnabled) {
					addReputation(info.reputation, info.liked, myId == userID)
				}
				if (info.discord.length > 0 && linkedDiscordEnabled) {
					addDiscord(info.discord)
				}
			if (reputationEnabled) {
				likeButton = document.getElementById('likeButton')
				if (likeButton != null) {
					likeButton.addEventListener("click", function(){
						changeReputation()
					})
				}
				}
				var discordLink = document.getElementById('discordLink')
				if (discordLink != null) {
					discordLink.addEventListener("click", function(){
						var discordValue = stripTags(document.getElementById('discordName').innerText)
						var input = document.createElement("input")
						input.value = discordValue
						document.body.appendChild(input)
					input.select();
					input.setSelectionRange(0, 99999); /*For mobile devices*/
					document.execCommand("copy");
					document.body.removeChild(input)
					document.getElementById('discordName').innerText = "Copied to clipboard."
					setTimeout(function() {
						document.getElementById('discordName').innerText = stripTags(discordValue)
					}, 2000)
				})
			}
				var showRoProBadgeOnMyProfile = await fetchSetting("roproBadge")
				var shouldRenderRoProBadge = userID != myId || showRoProBadgeOnMyProfile
				if (info.tier != "none" && shouldRenderRoProBadge) {
					addRoProInfo(info.tier, info.user_since, info.subscribed_for)
				}
				if (shouldRenderRoProBadge) {
					console.log(info.icons)
					for (var i = 0; i < info.icons.length; i++) {
						addProfileIcon(info.icons[i].name, info.icons[i].description, info.icons[i].image, info.icons[i].link)
					}
				}
			if (profileValueEnabled) {
				addValue(getProfileValue(userID), userID)
			}
		}
	}
}

mainProfile()

window.addEventListener('load', (event) => {
	if (window.location.hash.includes("#ropro-status")) {
		document.getElementById('profile-header-update-status').click()
	}
});
