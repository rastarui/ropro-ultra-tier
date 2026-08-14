var url_matches = [
	"/users/friends*",
    "/users/*/friends*",
	"/search/users*",
];

function verifyPath(matches) {
    if (!window.location.host.endsWith(".roblox.com")) return false;
	var path = window.location.pathname;
	for (let match of matches) {
		var match_regex = new RegExp(`^${match.replace(/\*/g, ".*")}$`);
		var path_match = path.match(match_regex);
		if (path_match?.index == 0) {
			return true;
		} else {
			var path_split = path.split("/");
			if (path_split.length < 2) continue;
			try {
				if (Intl.getCanonicalLocales(path_split[1]).length > 0) {
					locale_subpath = "/" + path_split.slice(2).join("/");
					path_match = locale_subpath.match(match_regex);
					if (path_match?.index == 0) {
						return true;
					}
				}
			} catch (_) {
				continue;
			}
		}
	}
	return false;
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

function buildRoProLoader(options) {
	return roproApiAdapter.buildBrandedLoaderHtml(options)
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

async function fetchFriendsVisualGate(gateKey) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.getVisualGatePromise === "function"
	) {
		try {
			var gate = await roproApiAdapter.getVisualGatePromise(gateKey)
			if (gate != null && typeof gate == "object") {
				return gate
			}
		} catch (_) {}
	}
	return {
		allowed: false,
		reason: "subscription_unknown",
		currentTier: "unknown",
		requiredTier: null,
		upgradeTier: "plus"
	}
}

function isFriendsVisualGateAllowed(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateAllowed === "function"
	) {
		return roproApiAdapter.isVisualGateAllowed(gateInfo)
	}
	return gateInfo != null && typeof gateInfo == "object" && gateInfo.allowed === true
}

function isFriendsVisualGateUpsellEligible(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateUpsellEligible === "function"
	) {
		return roproApiAdapter.isVisualGateUpsellEligible(gateInfo)
	}
	return (
		gateInfo != null &&
		typeof gateInfo == "object" &&
		gateInfo.allowed !== true &&
		String(gateInfo.reason == null ? "" : gateInfo.reason).trim().toLowerCase() === "tier"
	)
}

function showFriendsVisualGateIssue(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.notifyVisualGateIssue === "function"
	) {
		roproApiAdapter.notifyVisualGateIssue(gateInfo, {
			contextLabel: "Mutuals",
			contextKey: "friends_mutuals"
		})
	}
}

async function refreshMoreMutualsGateState() {
	var gate = await fetchFriendsVisualGate("moreMutuals")
	if (gate != null && typeof gate == "object") {
		moreMutualsGate = gate
	}
	return moreMutualsGate
}

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function getIdFromURL(url) {
	if (typeof url != "string") {
		return NaN
	}
	var match = url.match(/\/users\/([0-9]{1,20})(?:\/|$)/i)
	if (match == null) {
		return NaN
	}
	return parseInt(match[1], 10)
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

function fetchMutualFollowers(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualFollowers", userID: userID},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchMutualFollowing(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualFollowing", userID: userID},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchMutualFavorites(userID, assetType) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualFavorites", userID: userID, assetType: assetType},
			function(data) {
                console.log(data)
				resolve(data)
			}
		)
	})
}

function fetchMutualBadges(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualBadges", userID: userID},
			function(data) {
                console.log(data)
				resolve(data)
			}
		)
	})
}

function fetchMutualGroups(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualGroups", userID: userID},
			function(data) {
                console.log(data)
				resolve(data)
			}
		)
	})
}

function fetchMutualItems(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualItems", userID: userID},
			function(data) {
                console.log(data)
				resolve(data)
			}
		)
	})
}

function fetchMutualLimiteds(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetMutualLimiteds", userID: userID},
			function(data) {
                console.log(data)
				resolve(data)
			}
		)
	})
}

function unfriendUser(userId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://friends.roblox.com/v1/users/" + userId + "/unfriend"}, 
			function(data) {
					resolve(data)
			})
	})
}

var ROPRO_MUTUALS_PAGE_SIZE = 24
var roproMutualCurrentPage = 0
var roproMutualLoadRenderToken = 0
var roproMutualLoadingSpinnerHTML = buildRoProLoader({className: "ropro-branded-loader-centered-section"})

function getRoProMutualSearchInput() {
	return document.getElementById('roproMutualSearchInput')
}

function getRoProMutualSearchClearButton() {
	return document.getElementById('roproMutualSearchClear')
}

function updateRoProMutualSearchClearButtonState() {
	var searchInput = getRoProMutualSearchInput()
	var searchClearButton = getRoProMutualSearchClearButton()
	if (searchInput == null || searchClearButton == null) {
		return
	}
	var hasQuery = typeof searchInput.value == "string" && searchInput.value.trim().length > 0
	searchClearButton.disabled = !hasQuery
	searchClearButton.style.opacity = hasQuery ? "1" : "0.5"
	searchClearButton.style.cursor = hasQuery ? "pointer" : "default"
}

function resetRoProMutualSearchState() {
	roproMutualCurrentPage = 0
	var searchInput = getRoProMutualSearchInput()
	if (searchInput != null) {
		searchInput.value = ""
	}
	updateRoProMutualSearchClearButtonState()
}

function getRoProMutualCardEntries(cardsContainer) {
	if (cardsContainer == null) {
		return []
	}
	return Array.from(cardsContainer.querySelectorAll('li.avatar-card'))
}

function getRoProMutualSearchQuery() {
	var input = getRoProMutualSearchInput()
	if (input == null || typeof input.value != "string") {
		return ""
	}
	return stripTags(input.value).trim().toLowerCase()
}

function cardMatchesRoProMutualQuery(card, query) {
	if (card == null) {
		return false
	}
	if (typeof query != "string" || query.length == 0) {
		return true
	}
	var cardText = stripTags(card.textContent || "").trim().toLowerCase()
	if (cardText.length == 0) {
		return false
	}
	return cardText.indexOf(query) >= 0
}

function ensureRoProMutualSearchEmptyState(cardsContainer) {
	var existing = document.getElementById('roproMutualSearchEmpty')
	if (existing != null) {
		return existing
	}
	var empty = document.createElement('div')
	empty.id = 'roproMutualSearchEmpty'
	empty.style.marginTop = "20px"
	empty.style.textAlign = "center"
	empty.style.display = "none"
	empty.textContent = "No mutuals match your search."
	if (cardsContainer != null && cardsContainer.parentNode != null) {
		cardsContainer.parentNode.insertBefore(empty, cardsContainer.nextSibling)
	} else if (cardsContainer != null) {
		cardsContainer.appendChild(empty)
	}
	return empty
}

function normalizeRoProMutualCardsMarkup(cardsContainer) {
	if (cardsContainer == null) {
		return
	}
	var directChildren = Array.from(cardsContainer.children)
	for (var i = 0; i < directChildren.length; i++) {
		var child = directChildren[i]
		if (child == null || typeof child.tagName != "string") {
			continue
		}
		var tagName = child.tagName.toUpperCase()
		var shouldWrapNode = tagName == "DIV" || tagName == "SPAN"
		if (!shouldWrapNode) {
			continue
		}
		var wrapper = document.createElement('li')
		wrapper.className = "list-item ropro-mutual-inline"
		wrapper.style.width = "100%"
		wrapper.style.float = "none"
		cardsContainer.replaceChild(wrapper, child)
		wrapper.appendChild(child)
	}
}

function updateRoProMutualPagerState(totalMatched) {
	var pager = document.getElementById('roproMutualPager')
	var pageInfo = document.getElementById('roproMutualPageInfo')
	var prevButton = document.getElementById('roproMutualPrevPage')
	var nextButton = document.getElementById('roproMutualNextPage')
	if (pager == null || pageInfo == null || prevButton == null || nextButton == null) {
		return
	}
	var totalPages = Math.max(1, Math.ceil(totalMatched / ROPRO_MUTUALS_PAGE_SIZE))
	if (roproMutualCurrentPage >= totalPages) {
		roproMutualCurrentPage = totalPages - 1
	}
	if (roproMutualCurrentPage < 0) {
		roproMutualCurrentPage = 0
	}
	if (totalMatched <= ROPRO_MUTUALS_PAGE_SIZE) {
		pager.style.display = "none"
	} else {
		pager.style.display = "flex"
	}
	pageInfo.textContent = `Page ${roproMutualCurrentPage + 1} of ${totalPages}`
	prevButton.disabled = roproMutualCurrentPage <= 0
	nextButton.disabled = roproMutualCurrentPage >= totalPages - 1
}

function applyRoProMutualSearchAndPagination(resetPage = false) {
	var mutualTab = document.getElementsByClassName('mutuals-tab-content')[0]
	if (mutualTab == null) {
		return
	}
	var cardsContainer = mutualTab.getElementsByClassName('hlist avatar-cards')[0]
	if (cardsContainer == null) {
		return
	}
	normalizeRoProMutualCardsMarkup(cardsContainer)
	var cardEntries = getRoProMutualCardEntries(cardsContainer)
	if (cardEntries.length == 0) {
		updateRoProMutualPagerState(0)
		var emptyState = document.getElementById('roproMutualSearchEmpty')
		if (emptyState != null) {
			emptyState.style.display = "none"
		}
		return
	}
	if (resetPage) {
		roproMutualCurrentPage = 0
	}
	var query = getRoProMutualSearchQuery()
	var matchedCards = []
	for (var i = 0; i < cardEntries.length; i++) {
		if (cardMatchesRoProMutualQuery(cardEntries[i], query)) {
			matchedCards.push(cardEntries[i])
		}
	}
	var totalMatched = matchedCards.length
	updateRoProMutualPagerState(totalMatched)
	var startIndex = roproMutualCurrentPage * ROPRO_MUTUALS_PAGE_SIZE
	var endIndex = startIndex + ROPRO_MUTUALS_PAGE_SIZE
	for (var hideIndex = 0; hideIndex < cardEntries.length; hideIndex++) {
		cardEntries[hideIndex].style.display = "none"
	}
	for (var showIndex = 0; showIndex < matchedCards.length; showIndex++) {
		if (showIndex >= startIndex && showIndex < endIndex) {
			matchedCards[showIndex].style.display = ""
		}
	}
	var searchEmpty = ensureRoProMutualSearchEmptyState(cardsContainer)
	if (totalMatched == 0 && query.length > 0) {
		searchEmpty.style.display = "block"
	} else {
		searchEmpty.style.display = "none"
	}
	var mutualNumber = document.getElementById('mutualNumber')
	if (mutualNumber != null) {
		mutualNumber.innerText = String(totalMatched)
	}
}

function ensureRoProMutualPager(mutualsTab) {
	var cardsContainer = mutualsTab.getElementsByClassName('hlist avatar-cards')[0]
	if (cardsContainer == null) {
		return
	}
	var pager = document.getElementById('roproMutualPager')
	if (pager == null) {
		pager = document.createElement('div')
		pager.id = 'roproMutualPager'
		pager.style.display = "none"
		pager.style.marginTop = "16px"
		pager.style.gap = "8px"
		pager.style.alignItems = "center"
		pager.style.justifyContent = "center"
		pager.innerHTML = `
			<button id="roproMutualPrevPage" class="btn-control-sm" type="button">Previous</button>
			<span id="roproMutualPageInfo" style="font-size:13px;min-width:120px;text-align:center;">Page 1 of 1</span>
			<button id="roproMutualNextPage" class="btn-control-sm" type="button">Next</button>
		`
		if (cardsContainer.parentNode != null) {
			cardsContainer.parentNode.appendChild(pager)
		} else {
			mutualsTab.appendChild(pager)
		}
	}
	var prevButton = document.getElementById('roproMutualPrevPage')
	var nextButton = document.getElementById('roproMutualNextPage')
	if (prevButton != null && prevButton.getAttribute('data-ropro-bound') != "true") {
		prevButton.setAttribute('data-ropro-bound', "true")
		prevButton.addEventListener('click', function() {
			roproMutualCurrentPage = Math.max(0, roproMutualCurrentPage - 1)
			applyRoProMutualSearchAndPagination(false)
		})
	}
	if (nextButton != null && nextButton.getAttribute('data-ropro-bound') != "true") {
		nextButton.setAttribute('data-ropro-bound', "true")
		nextButton.addEventListener('click', function() {
			roproMutualCurrentPage = roproMutualCurrentPage + 1
			applyRoProMutualSearchAndPagination(false)
		})
	}
}

function ensureRoProMutualToolbar(mutualsTab, dropdownRoot) {
	var headerContainer = mutualsTab.getElementsByClassName('container-header')[0]
	if (headerContainer == null) {
		return
	}
	headerContainer.style.display = "flex"
	headerContainer.style.flexWrap = "wrap"
	headerContainer.style.alignItems = "center"
	headerContainer.style.justifyContent = "space-between"
	headerContainer.style.gap = "12px"
	var subtitleNode = headerContainer.querySelector('.friends-subtitle')
	if (subtitleNode != null) {
		subtitleNode.style.paddingRight = "14px"
		subtitleNode.style.marginRight = "14px"
		subtitleNode.style.marginBottom = "0px"
		subtitleNode.style.flex = "0 1 auto"
	}
	var legacyFilters = headerContainer.getElementsByClassName('friends-filter')
	while (legacyFilters.length > 0) {
		legacyFilters[0].remove()
	}
	var toolbar = document.getElementById('roproMutualToolbar')
	if (toolbar == null) {
		toolbar = document.createElement('div')
		toolbar.id = 'roproMutualToolbar'
		toolbar.style.display = "flex"
		toolbar.style.flexWrap = "wrap"
		toolbar.style.gap = "10px"
		toolbar.style.justifyContent = "flex-end"
		toolbar.style.alignItems = "center"
		toolbar.style.marginTop = "8px"
		toolbar.style.marginLeft = "12px"
		toolbar.style.flex = "1 1 420px"
		headerContainer.appendChild(toolbar)
	} else if (toolbar.parentNode !== headerContainer) {
		headerContainer.appendChild(toolbar)
	}
	var toolbarChildren = Array.from(toolbar.children)
	for (var toolbarIndex = 0; toolbarIndex < toolbarChildren.length; toolbarIndex++) {
		var childNode = toolbarChildren[toolbarIndex]
		if (childNode.id != 'roproMutualSearchGroup' && childNode.id != 'mutualDropdown') {
			childNode.remove()
		}
	}

	var searchWrapper = document.getElementById('roproMutualSearchGroup')
	if (searchWrapper == null) {
		searchWrapper = document.createElement('div')
		searchWrapper.id = 'roproMutualSearchGroup'
		searchWrapper.className = "friends-filter-searchbar-container form-control input-field"
		searchWrapper.innerHTML = `
			<span class="icon-search" aria-hidden="true"></span>
			<input id="roproMutualSearchInput" class="friends-filter-searchbar-input" type="text" placeholder="Search Mutuals">
			<button id="roproMutualSearchClear" type="button" aria-label="Clear Search" title="Clear Search">X</button>
		`
	}
	searchWrapper.style.width = "340px"
	searchWrapper.style.maxWidth = "100%"
	searchWrapper.style.flex = "1 1 320px"
	searchWrapper.style.display = "flex"
	searchWrapper.style.alignItems = "center"
	searchWrapper.style.gap = "8px"
	if (searchWrapper.parentNode !== toolbar) {
		toolbar.appendChild(searchWrapper)
	}
	var searchInput = getRoProMutualSearchInput()
	if (searchInput != null) {
		searchInput.placeholder = "Search Mutuals"
		searchInput.style.marginTop = "0px"
		searchInput.style.flex = "1 1 auto"
		searchInput.style.minWidth = "0px"
		searchInput.style.border = "0px"
		searchInput.style.outline = "none"
		searchInput.style.boxShadow = "none"
		if (searchInput.getAttribute('data-ropro-bound') != "true") {
			searchInput.setAttribute('data-ropro-bound', "true")
			searchInput.addEventListener('input', function() {
				updateRoProMutualSearchClearButtonState()
				applyRoProMutualSearchAndPagination(true)
			})
		}
	}
	var searchClearButton = getRoProMutualSearchClearButton()
	if (searchClearButton != null) {
		searchClearButton.style.flex = "0 0 auto"
		searchClearButton.style.marginLeft = "2px"
		searchClearButton.style.padding = "0px"
		searchClearButton.style.border = "0px"
		searchClearButton.style.background = "transparent"
		searchClearButton.style.fontSize = "13px"
		searchClearButton.style.fontWeight = "700"
		searchClearButton.style.lineHeight = "1"
		searchClearButton.style.color = "inherit"
		if (searchClearButton.getAttribute('data-ropro-bound') != "true") {
			searchClearButton.setAttribute('data-ropro-bound', "true")
			searchClearButton.addEventListener('click', function() {
				var input = getRoProMutualSearchInput()
				if (input == null) {
					return
				}
				if (input.value.length == 0) {
					updateRoProMutualSearchClearButtonState()
					return
				}
				input.value = ""
				updateRoProMutualSearchClearButtonState()
				applyRoProMutualSearchAndPagination(true)
			})
		}
		updateRoProMutualSearchClearButtonState()
	}

	var dropdownNode = dropdownRoot != null ? dropdownRoot : document.getElementById('mutualDropdown')
	if (dropdownNode != null) {
		dropdownNode.style.overflow = "visible"
		dropdownNode.style.borderRadius = "0px"
		dropdownNode.style.float = "none"
		dropdownNode.style.marginLeft = "0px"
		dropdownNode.style.width = "220px"
		dropdownNode.style.flex = "0 0 220px"
		if (dropdownNode.parentNode !== toolbar) {
			toolbar.appendChild(dropdownNode)
		}
	}
}

function getRoProMutualCountWrapper() {
	return document.getElementById('mutualCountWrapper')
}

function setRoProMutualHeaderLoading(headerText) {
	var headerNode = document.getElementById('mutualHeader')
	if (headerNode != null) {
		headerNode.innerText = stripTags(headerText || "Mutual Friends")
	}
	var countNode = document.getElementById('mutualNumber')
	if (countNode != null) {
		countNode.innerText = ""
	}
	var countWrapper = getRoProMutualCountWrapper()
	if (countWrapper != null) {
		countWrapper.style.display = "none"
	}
}

function setRoProMutualHeaderCount(countValue) {
	var countNode = document.getElementById('mutualNumber')
	if (countNode != null) {
		countNode.innerText = String(countValue)
	}
	var countWrapper = getRoProMutualCountWrapper()
	if (countWrapper != null) {
		countWrapper.style.display = ""
	}
}

function getRoProMutualCardsContainer() {
	var mutualTab = document.getElementsByClassName('mutuals-tab-content')[0]
	if (mutualTab == null) {
		return null
	}
	var cardsContainer = mutualTab.getElementsByClassName('hlist avatar-cards')[0]
	if (cardsContainer == null) {
		return null
	}
	return cardsContainer
}

function ensureRoProMutualRenderSurface(renderToken) {
	if (renderToken !== roproMutualLoadRenderToken) {
		return false
	}
	return getRoProMutualCardsContainer() != null
}

function setRoProMutualCardsMarkup(markup, renderToken) {
	if (!ensureRoProMutualRenderSurface(renderToken)) {
		return false
	}
	var cardsContainer = getRoProMutualCardsContainer()
	if (cardsContainer == null) {
		return false
	}
	cardsContainer.innerHTML = markup
	return true
}

function setRoProMutualLoadingState(headerText, renderToken) {
	setRoProMutualHeaderLoading(headerText)
	return setRoProMutualCardsMarkup(roproMutualLoadingSpinnerHTML, renderToken)
}

function setRoProMutualEmptyState(message, renderToken) {
	return setRoProMutualCardsMarkup(
		`<div style="margin-top:20px;text-align:center;">${message}</div>`,
		renderToken
	)
}

function getRoProMutualLoadConfig(type) {
	if (type == "Mutual Friends") {
		return {
			headerText: "Mutual Friends",
			emptyMessage: "You don't share any friends with this user.",
			loadFn: function() {
				return fetchMutualFriends(userId)
			},
			logResults: false,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Followers") {
		return {
			headerText: "Mutual Followers",
			emptyMessage: "You don't share any followers with this user.",
			loadFn: function() {
				return fetchMutualFollowers(userId)
			},
			logResults: false,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Following") {
		return {
			headerText: "Mutual Following",
			emptyMessage: "You don't share any following with this user.",
			loadFn: function() {
				return fetchMutualFollowing(userId)
			},
			logResults: false,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Favorite Games") {
		return {
			headerText: "Mutual Favorite Games",
			emptyMessage: "You don't share any favorite games with this user.",
			loadFn: function() {
				return fetchMutualFavorites(userId, 9)
			},
			logResults: true,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Badges") {
		return {
			headerText: "Mutual Badges",
			emptyMessage: "You don't share any badges with this user.",
			loadFn: function() {
				return fetchMutualBadges(userId)
			},
			logResults: true,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Communities" || type == "Mutual Groups") {
		return {
			headerText: "Mutual Communities",
			emptyMessage: "You don't share any communities with this user.",
			loadFn: function() {
				return fetchMutualGroups(userId)
			},
			logResults: true,
			supportsInventoryPrivateError: false
		}
	}
	if (type == "Mutual Items") {
		return {
			headerText: "Mutual Items",
			emptyMessage: "You don't share any items with this user.",
			loadFn: function() {
				return fetchMutualItems(userId)
			},
			logResults: true,
			supportsInventoryPrivateError: true
		}
	}
	if (type == "Mutual Limiteds") {
		return {
			headerText: "Mutual Limiteds",
			emptyMessage: "You don't share any limiteds with this user.",
			loadFn: function() {
				return fetchMutualLimiteds(userId)
			},
			logResults: true,
			supportsInventoryPrivateError: true
		}
	}
	return null
}

async function loadMutuals(type) {
	console.log(type)
	var renderToken = ++roproMutualLoadRenderToken
	resetRoProMutualSearchState()
	if (type != "Mutual Friends") {
		var currentMoreMutualsGate = await refreshMoreMutualsGateState()
		if (!isFriendsVisualGateAllowed(currentMoreMutualsGate)) {
			if (isFriendsVisualGateUpsellEligible(currentMoreMutualsGate)) {
				upgradeModal()
			} else {
				showFriendsVisualGateIssue(currentMoreMutualsGate)
			}
			return
		}
	}
	var loadConfig = getRoProMutualLoadConfig(type)
	if (loadConfig == null) {
		return
	}
	if (!setRoProMutualLoadingState(loadConfig.headerText, renderToken)) {
		return
	}
	var mutuals = await loadConfig.loadFn()
	if (!ensureRoProMutualRenderSurface(renderToken)) {
		return
	}
	if (!Array.isArray(mutuals)) {
		mutuals = []
	}
	if (loadConfig.logResults) {
		console.log(mutuals)
	}
	if (!setRoProMutualCardsMarkup("", renderToken)) {
		return
	}
	var hasInventoryPrivateError =
		loadConfig.supportsInventoryPrivateError &&
		mutuals.length > 0 &&
		mutuals[0] != null &&
		typeof mutuals[0] == "object" &&
		("error" in mutuals[0])
	if (hasInventoryPrivateError) {
		setRoProMutualHeaderCount("Error")
		if (!setRoProMutualEmptyState("This user's Inventory is private.", renderToken)) {
			return
		}
	} else {
		setRoProMutualHeaderCount(mutuals.length)
		for (var i = 0; i < mutuals.length; i++) {
			if (!ensureRoProMutualRenderSurface(renderToken)) {
				return
			}
			addMutualCard(mutuals[i])
		}
		if (mutuals.length == 0) {
			if (!setRoProMutualEmptyState(loadConfig.emptyMessage, renderToken)) {
				return
			}
		}
	}
	if (!ensureRoProMutualRenderSurface(renderToken)) {
		return
	}
	applyRoProMutualSearchAndPagination(true)
}

function createUpgradeModal() {
    if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
        return null
    }
    return window.RoProUpgradeModal.open({
        tier: "plus",
        contextLabel: "RoPro Mutuals",
        featureLabel: "Viewing mutuals other than mutual friends",
        benefits: [
            "Fastest Server and Server Size Sort",
            "Animated Profile Themes",
            "Trade Value and Demand Calculator",
            "More Game Playtime Sorts"
        ],
        ctaLabel: "Upgrade",
        ctaHref: "https://ropro.io#plus",
        footerText: "Find a full list in RoPro settings."
    })
}

function upgradeModal() {
    var modal = createUpgradeModal()
    if (modal != null) {
        modal.style.display = "block"
    }
}

function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

function sanitizeMutualText(value, fallback = "") {
	var normalized = stripTags(value)
	if (typeof normalized != "string") {
		return fallback
	}
	var trimmed = normalized.trim()
	if (trimmed.length == 0) {
		return fallback
	}
	return trimmed
}

function safeMutualLinkHref(value) {
	var candidate = sanitizeMutualText(value, "")
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
		if (host == "roblox.com" || host.endsWith(".roblox.com")) {
			return parsed.href
		}
	} catch (e) {}
	return "#"
}

function safeMutualImageSrc(value) {
	var candidate = sanitizeMutualText(value, "")
	if (candidate.length == 0) {
		return ""
	}
	if (candidate.startsWith("/")) {
		return candidate
	}
	try {
		var parsed = new URL(candidate, window.location.origin)
		if (parsed.protocol != "http:" && parsed.protocol != "https:") {
			return ""
		}
		var host = parsed.hostname.toLowerCase()
		if (
			host == "roblox.com" ||
			host.endsWith(".roblox.com") ||
			host.endsWith(".rbxcdn.com")
		) {
			return parsed.href
		}
	} catch (e) {}
	return ""
}

function getMutualUserId(mutual) {
	if (mutual != null && Number.isInteger(mutual.userId) && mutual.userId > 0) {
		return mutual.userId
	}
	var link = mutual != null ? sanitizeMutualText(mutual.link, "") : ""
	if (link.length == 0) {
		return null
	}
	var match = link.match(/\/users\/([0-9]{1,20})\/profile/i)
	if (match == null) {
		return null
	}
	var parsed = parseInt(match[1], 10)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}
	return parsed
}

function isMutualUserCard(mutual) {
	if (mutual == null || typeof mutual != "object") {
		return false
	}
	if (mutual.type == "user") {
		return true
	}
	return getMutualUserId(mutual) != null
}

function isMutualUserOnline(mutual, statusText) {
	if (mutual != null && mutual.isOnline === true) {
		return true
	}
	var normalizedStatus = sanitizeMutualText(statusText, "").toLowerCase()
	if (normalizedStatus.length == 0) {
		return false
	}
	return (
		normalizedStatus.indexOf("online") >= 0 ||
		normalizedStatus.indexOf("game") >= 0 ||
		normalizedStatus.indexOf("studio") >= 0
	)
}

function buildMutualPresenceIcon(statusText) {
	var normalizedStatus = sanitizeMutualText(statusText, "").toLowerCase()
	var iconClass = "online icon-online"
	var title = "Website"
	if (normalizedStatus.indexOf("studio") >= 0) {
		iconClass = "studio icon-studio"
		title = "Studio"
	} else if (normalizedStatus.indexOf("game") >= 0) {
		iconClass = "game icon-game"
		title = "In Game"
	}
	var icon = document.createElement("span")
	icon.setAttribute("data-testid", "presence-icon")
	icon.setAttribute("title", title)
	icon.setAttribute("class", iconClass)
	return icon
}

function addMutualCard(mutual) {
    var mutualsTabs = document.getElementsByClassName('mutuals-tab-content')
    if (mutualsTabs.length == 0) {
        return
    }
    var cards = mutualsTabs[0].getElementsByClassName('hlist avatar-cards')
    if (cards.length == 0) {
        return
    }
    var isUserCard = isMutualUserCard(mutual)
    var safeLink = safeMutualLinkHref(mutual != null ? mutual.link : "")
    var safeIcon = safeMutualImageSrc(mutual != null ? mutual.icon : "")
    var displayName = sanitizeMutualText(mutual != null ? mutual.name : "", "Unknown User")
    var additionalLabel = sanitizeMutualText(mutual != null ? mutual.additional : "", "")
    var statusLabel = sanitizeMutualText(mutual != null ? (mutual.status || mutual.additional) : "", "Offline")
    var userNameText = sanitizeMutualText(mutual != null ? mutual.username : "", displayName)
    if (!userNameText.startsWith("@")) {
        userNameText = `@${userNameText}`
    }

    var li = document.createElement("li")
    li.setAttribute("class", "list-item avatar-card")
    if (isUserCard) {
        var userId = getMutualUserId(mutual)
        if (userId != null) {
            li.id = String(userId)
        }
    }

    var cardContainer = document.createElement("div")
    cardContainer.setAttribute("class", "avatar-card-container")
    var cardContent = document.createElement("div")
    cardContent.setAttribute("class", "avatar-card-content")
    var avatar = document.createElement("div")
    avatar.setAttribute("class", "avatar avatar-card-fullbody")
    var avatarLink = document.createElement("a")
    avatarLink.setAttribute("href", safeLink)
    avatarLink.setAttribute("class", "avatar-card-link")
    var imageContainer = document.createElement("span")
    imageContainer.setAttribute("class", "thumbnail-2d-container avatar-card-image")
    var image = document.createElement("img")
    image.setAttribute("class", "")
    image.setAttribute("src", safeIcon)
    image.setAttribute("alt", "")
    image.setAttribute("title", "")
    imageContainer.appendChild(image)
    avatarLink.appendChild(imageContainer)
    avatar.appendChild(avatarLink)
    var avatarStatus = document.createElement("div")
    avatarStatus.setAttribute("class", "avatar-status")
    if (isUserCard && isMutualUserOnline(mutual, statusLabel)) {
        avatarStatus.appendChild(buildMutualPresenceIcon(statusLabel))
    }
    avatar.appendChild(avatarStatus)
    cardContent.appendChild(avatar)

    var caption = document.createElement("div")
    caption.setAttribute("class", "avatar-card-caption")
    if (isUserCard) {
        var wrapper = document.createElement("span")
        var nameContainer = document.createElement("div")
        nameContainer.setAttribute("class", "avatar-name-container")
        var nameLink = document.createElement("a")
        nameLink.setAttribute("href", safeLink)
        nameLink.setAttribute("class", "text-overflow avatar-name")
        nameLink.textContent = displayName
        nameContainer.appendChild(nameLink)
        wrapper.appendChild(nameContainer)

        var usernameLabel = document.createElement("div")
        usernameLabel.setAttribute("class", "avatar-card-label")
        usernameLabel.textContent = userNameText
        wrapper.appendChild(usernameLabel)

        var stateLabel = document.createElement("div")
        stateLabel.setAttribute("class", "avatar-card-label")
        stateLabel.textContent = statusLabel
        wrapper.appendChild(stateLabel)
        caption.appendChild(wrapper)
    } else {
        var genericNameLink = document.createElement("a")
        genericNameLink.setAttribute("href", safeLink)
        genericNameLink.setAttribute("class", "text-overflow avatar-name")
        genericNameLink.textContent = displayName
        caption.appendChild(genericNameLink)
        if (additionalLabel.length > 0) {
            var genericLabel = document.createElement("div")
            genericLabel.setAttribute("class", "avatar-card-label")
            genericLabel.textContent = additionalLabel
            caption.appendChild(genericLabel)
        }
    }

    cardContent.appendChild(caption)
    cardContainer.appendChild(cardContent)
    li.appendChild(cardContainer)
    cards[0].appendChild(li)
}

function addMutualsDropdown(mutualsTab) {
    var dropdownRoot = document.getElementById('mutualDropdown')
    if (dropdownRoot == null) {
        var mutualDropdownHTML = `<div id="mutualDropdown" style="overflow:visible;border-radius:0px;" class="input-group-btn group-dropdown">
    <button style="border-radius:0px;" type="button" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
    <span style="font-size:14px;" id="customLabel" class="mutual-selection-label rbx-selection-label ng-binding" ng-bind="layout.selectedTab.label">Mutual Friends</span> 
    <span class="icon-down-16x16"></span></button>
    <ul style="max-height:1000px;" id="mutualOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu"> 
    <li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Friends</span>
    </a></li><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Following</span>
    </a></li><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Followers</span>
    </a></li><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Favorite Games</span>
    </a></li><!--<li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Badges</span>
    </a></li>--><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Communities</span>
    </a></li><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Items</span>
    </a></li><li class="mutual-button">
    <a class="customChoice">
        <span style="font-size:14px;" ng-bind="tab.label" class="mutual-text ng-binding">Mutual Limiteds</span>
    </a></li></ul></div>`
        var div = document.createElement('div')
        div.innerHTML += mutualDropdownHTML
        dropdownRoot = div.childNodes[0]
    }
    ensureRoProMutualToolbar(mutualsTab, dropdownRoot)
    ensureRoProMutualPager(mutualsTab)
    var mutualButtons = dropdownRoot.getElementsByClassName('mutual-button')
    for (var i = 0; i < mutualButtons.length; i++) {
        var button = mutualButtons[i]
        var buttonTextNodes = button.getElementsByClassName('mutual-text')
        var buttonLabel = buttonTextNodes.length > 0 ? stripTags(buttonTextNodes[0].innerText || "").trim() : ""
        var isLockedMutualType = buttonLabel.length > 0 && !isFriendsVisualGateAllowed(moreMutualsGate) && buttonLabel != "Mutual Friends"
        button.classList.toggle("ropro-mutual-option-locked", isLockedMutualType)
        button.setAttribute("data-ropro-locked", isLockedMutualType ? "true" : "false")
        var buttonChoiceNode = button.getElementsByClassName('customChoice')[0]
        if (buttonChoiceNode != null) {
            buttonChoiceNode.setAttribute('aria-disabled', isLockedMutualType ? "true" : "false")
        }
        if (button.getAttribute('data-ropro-bound') == "true") {
            continue
        }
        button.setAttribute('data-ropro-bound', "true")
        button.addEventListener('click', async function(e) {
            var textNodes = this.getElementsByClassName('mutual-text')
            if (textNodes.length == 0) {
                return
            }
            var selectedLabel = stripTags(textNodes[0].innerText || "").trim()
            if (selectedLabel.length == 0) {
                return
            }
            if (selectedLabel != "Mutual Friends") {
                var gateState = await refreshMoreMutualsGateState()
                if (!isFriendsVisualGateAllowed(gateState)) {
                    if (e != null && typeof e.preventDefault == "function") {
                        e.preventDefault()
                    }
                    if (isFriendsVisualGateUpsellEligible(gateState)) {
                        upgradeModal()
                    } else {
                        showFriendsVisualGateIssue(gateState)
                    }
                    return
                }
            }
            var selectionNode = document.getElementsByClassName("mutual-selection-label")[0]
            if (selectionNode != null) {
                selectionNode.innerText = selectedLabel
            }
            loadMutuals(selectedLabel)
        })
    }
}

function ensureMutualsTabStructure(mutualsTab) {
    while (mutualsTab.firstChild != null) {
        mutualsTab.removeChild(mutualsTab.firstChild)
    }
    var pane = document.createElement('div')
    pane.setAttribute('role', 'tabpanel')
    pane.setAttribute('class', 'subtract-item tab-pane active')
    var section = document.createElement('div')
    section.setAttribute('class', 'friends-content section')
	var headerContainer = document.createElement('div')
	headerContainer.setAttribute('class', 'container-header')
	headerContainer.style.display = "flex"
	headerContainer.style.flexWrap = "wrap"
	headerContainer.style.alignItems = "center"
	headerContainer.style.justifyContent = "space-between"
	headerContainer.style.gap = "12px"
	var subtitleContainer = document.createElement('h2')
	subtitleContainer.setAttribute('class', 'friends-subtitle')
	subtitleContainer.innerHTML = "<span id='mutualHeader'>Mutual Friends</span><span id='mutualCountWrapper' style='display:none;'> (<span id='mutualNumber'></span>)</span>"
	subtitleContainer.style.paddingRight = "14px"
	subtitleContainer.style.marginRight = "14px"
	subtitleContainer.style.marginBottom = "0px"
	subtitleContainer.style.flex = "0 1 auto"
	headerContainer.appendChild(subtitleContainer)
    section.appendChild(headerContainer)
    var cardsList = document.createElement('ul')
    cardsList.setAttribute('class', 'hlist avatar-cards')
    section.appendChild(cardsList)
    pane.appendChild(section)
    mutualsTab.appendChild(pane)
    var searchEmpty = document.getElementById('roproMutualSearchEmpty')
    if (searchEmpty != null) {
        searchEmpty.remove()
    }
    var mutualPager = document.getElementById('roproMutualPager')
    if (mutualPager != null) {
        mutualPager.remove()
    }
    ensureRoProMutualPager(mutualsTab)
}

function shouldOpenRoProMutualsFromHash() {
    return typeof window.location.hash == "string" && window.location.hash.indexOf("#mutuals") >= 0
}

function positionRoProMutualTabButton(tabs, mutualTabButton) {
    if (tabs == null || mutualTabButton == null) {
        return
    }
    var followersTab = tabs.querySelector('#followers')
    if (followersTab != null) {
        if (followersTab.nextElementSibling !== mutualTabButton) {
            tabs.insertBefore(mutualTabButton, followersTab.nextSibling)
        }
        return
    }
    if (tabs.lastElementChild !== mutualTabButton) {
        tabs.appendChild(mutualTabButton)
    }
}

function activateRoProMutualsTab(mutualTabButton, defaultTabContent, mutualsTab) {
    $('.subtract-item.rbx-tab a').removeClass("active")
    if (mutualTabButton != null && mutualTabButton.getElementsByTagName('a').length > 0) {
        mutualTabButton.getElementsByTagName('a')[0].classList.add("active")
    }
    if (defaultTabContent != null) {
        defaultTabContent.style.visibility = "visible"
        defaultTabContent.style.display = "none"
    }
    if (mutualsTab != null) {
        mutualsTab.style.display = "block"
    }
}

function addMutualsTab(attempt = 0) {
    var tabs = document.getElementsByClassName('nav nav-tabs')[0]
    var defaultTabContent = document.getElementsByClassName('tab-content rbx-tab-content')[0]
    if (tabs == null || defaultTabContent == null) {
        if (attempt < 25) {
            setTimeout(function() {
                addMutualsTab(attempt + 1)
            }, 400)
        } else if (defaultTabContent != null) {
            defaultTabContent.style.visibility = "visible"
        }
        return
    }
    var tabsHydrated = tabs.querySelector('#friends') != null && tabs.querySelector('#following') != null && tabs.querySelector('#followers') != null
    if (!tabsHydrated && attempt < 25) {
        setTimeout(function() {
            addMutualsTab(attempt + 1)
        }, 200)
        return
    }
    var mutualTabButton = document.getElementById('mutuals')
    var mutualsTab = document.getElementsByClassName('mutuals-tab-content')[0]
    if (mutualTabButton != null && mutualsTab == null) {
        mutualTabButton.remove()
        mutualTabButton = null
    }
    if (mutualsTab != null && mutualTabButton == null) {
        mutualsTab.remove()
        mutualsTab = null
    }
    if (mutualTabButton == null) {
        mutualTabButton = document.createElement("li")
        mutualTabButton.setAttribute("id", "mutuals")
        mutualTabButton.setAttribute("role", "tab")
        mutualTabButton.setAttribute("class", "subtract-item rbx-tab")
        var mutualsTabHTML = '<a class="rbx-tab-heading"><span class="text-lead">Mutuals</span><span class="rbx-tab-subtitle"></span></a>'
        mutualTabButton.innerHTML += mutualsTabHTML
    }
    positionRoProMutualTabButton(tabs, mutualTabButton)
    if (mutualsTab == null) {
        mutualsTab = document.createElement('div')
        mutualsTab.setAttribute("class", "tab-content mutuals-tab-content")
        mutualsTab.style.display = "none"
        ensureMutualsTabStructure(mutualsTab)
        defaultTabContent.parentNode.appendChild(mutualsTab)
        mutualsTab.setAttribute('data-ropro-mutuals-loaded', "false")
    } else if (
        mutualsTab.getElementsByClassName('hlist avatar-cards').length == 0 ||
        mutualsTab.querySelector('#mutualHeader') == null ||
        mutualsTab.querySelector('#mutualNumber') == null ||
        mutualsTab.getElementsByClassName('friends-filter').length > 0 ||
        mutualsTab.getElementsByClassName('section-content-off').length > 0
    ) {
        ensureMutualsTabStructure(mutualsTab)
        mutualsTab.setAttribute('data-ropro-mutuals-loaded', "false")
    }
    $('.subtract-item.rbx-tab').css("min-width", "25%")
    if (tabs.getAttribute('data-ropro-mutuals-bound') != "true") {
        tabs.setAttribute('data-ropro-mutuals-bound', "true")
        tabs.addEventListener('click', function(event) {
            var clickedTab = event.target.closest('.subtract-item.rbx-tab')
            if (clickedTab == null) {
                return
            }
            var mutualTabNode = document.getElementById('mutuals')
            var defaultTabNode = document.getElementsByClassName('tab-content rbx-tab-content')[0]
            var mutualsTabNode = document.getElementsByClassName('mutuals-tab-content')[0]
            if (mutualTabNode == null || defaultTabNode == null || mutualsTabNode == null) {
                return
            }
            if (clickedTab.id == "mutuals") {
                activateRoProMutualsTab(mutualTabNode, defaultTabNode, mutualsTabNode)
                return
            }
            defaultTabNode.style.visibility = "visible"
            defaultTabNode.style.display = "block"
            mutualsTabNode.style.display = "none"
            $('.subtract-item.rbx-tab a').removeClass("active")
            var tabAnchors = clickedTab.getElementsByTagName('a')
            if (tabAnchors.length > 0) {
                tabAnchors[0].classList.add("active")
            }
        }, {passive: true})
    }
    addMutualsDropdown(mutualsTab)
    if (mutualsTab.getAttribute('data-ropro-mutuals-loaded') != "true") {
        mutualsTab.setAttribute('data-ropro-mutuals-loaded', "true")
        loadMutuals("Mutual Friends")
    }
    if (shouldOpenRoProMutualsFromHash()) {
        activateRoProMutualsTab(mutualTabButton, defaultTabContent, mutualsTab)
    } else {
        defaultTabContent.style.visibility = "visible"
    }
}

function setUnfriended(elem) {
    elem.parentNode.getElementsByClassName('avatar-card-container')[0].classList.add('disabled')
    elem.parentNode.getElementsByClassName('avatar-card-container')[0].getElementsByClassName('avatar')[0].style.filter = "grayscale(1)"
    div = document.createElement('div')
    div.innerHTML = `<div class="avatar-card-label">Unfriended</div>`
    elem.parentNode.getElementsByClassName('avatar-card-container')[0].getElementsByClassName('avatar-card-caption')[0].getElementsByTagName('span')[0].appendChild(div.childNodes[0])
    elem.remove()
}

var unfriendedUsers = {}

var ROPRO_FRIEND_LAST_ONLINE_PUBLIC_CACHE_MS = 5 * 60 * 1000
var ROPRO_FRIEND_LAST_ONLINE_UNAVAILABLE_CACHE_MS = 2 * 60 * 1000
var ROPRO_FRIEND_LAST_ONLINE_ERROR_CACHE_MS = 60 * 1000
var ROPRO_FRIEND_LAST_ONLINE_SCAN_INTERVAL_MS = 60 * 1000
var roproFriendLastOnlineCache = {}
var roproFriendLastOnlinePending = {}
var roproFriendLastOnlineObserver = null
var roproFriendLastOnlineScanTimeout = null
var roproFriendLastOnlineInterval = null
var roproFriendLastOnlineRefreshRunning = false
var roproFriendLastOnlineRefreshQueued = false
var roproFriendLastOnlineInitialized = false

function normalizeRoProFriendUserId(value) {
	if (typeof value == "number" && Number.isInteger(value) && value > 0) {
		return value
	}
	if (typeof value != "string") {
		return null
	}
	var candidate = value.trim()
	if (!/^[0-9]{1,20}$/.test(candidate)) {
		return null
	}
	var parsed = parseInt(candidate, 10)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}
	return parsed
}

function getRoProFriendCardUserId(card) {
	if (card == null || typeof card != "object") {
		return null
	}
	var cardId = normalizeRoProFriendUserId(card.id)
	if (cardId != null) {
		return cardId
	}
	if (typeof card.querySelector != "function") {
		return null
	}
	var profileLink = card.querySelector('a.avatar-card-link[href*="/users/"]')
	if (profileLink == null || typeof profileLink.getAttribute != "function") {
		return null
	}
	var href = profileLink.getAttribute("href")
	if (typeof href != "string" || href.length == 0) {
		return null
	}
	var match = href.match(/\/users\/([0-9]{1,20})(?:\/|$)/i)
	if (match == null) {
		return null
	}
	return normalizeRoProFriendUserId(match[1])
}

function getRoProFriendLastOnlineCards() {
	var candidates = document.querySelectorAll('.avatar-cards .avatar-card, .avatar-card-content')
	var cards = []
	var seenCaptionNodes = new Set()
	for (var i = 0; i < candidates.length; i++) {
		var card = candidates[i]
		if (card == null || typeof card.querySelector != "function") {
			continue
		}
		var caption = card.querySelector('.avatar-card-caption')
		if (caption == null || seenCaptionNodes.has(caption)) {
			continue
		}
		var userId = getRoProFriendCardUserId(card)
		if (userId == null) {
			continue
		}
		seenCaptionNodes.add(caption)
		cards.push({card: card, userId: userId})
	}
	return cards
}

function formatRoProFriendLastOnlineRelative(date) {
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

function formatRoProFriendLastOnlineAbsolute(date, timezone) {
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

function getRoProFriendLastOnlineCacheEntry(userId) {
	var entry = roproFriendLastOnlineCache[userId]
	if (entry == null || typeof entry != "object") {
		return undefined
	}
	if (!Number.isFinite(entry.fetchedAt)) {
		delete roproFriendLastOnlineCache[userId]
		return undefined
	}
	var ttlMs = Number.isFinite(entry.ttlMs) ? entry.ttlMs : ROPRO_FRIEND_LAST_ONLINE_PUBLIC_CACHE_MS
	if (Date.now() >= entry.fetchedAt + ttlMs) {
		delete roproFriendLastOnlineCache[userId]
		return undefined
	}
	return entry.status
}

function setRoProFriendLastOnlineCacheEntry(userId, status, ttlMs) {
	roproFriendLastOnlineCache[userId] = {
		status: status,
		fetchedAt: Date.now(),
		ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : ROPRO_FRIEND_LAST_ONLINE_PUBLIC_CACHE_MS
	}
}

function getRoProFriendLastOnlineLabel(card) {
	return card.querySelector('.ropro-friends-last-online-label')
}

function getRoProFriendLastOnlineStatusLabel(card) {
	return card.querySelector('.avatar-card-caption .avatar-card-label.ropro-friends-last-online-status')
}

function removeRoProFriendLastOnlineLabel(card) {
	var existing = getRoProFriendLastOnlineLabel(card)
	if (existing != null) {
		existing.remove()
	}
	var statusLabel = getRoProFriendLastOnlineStatusLabel(card)
	if (statusLabel == null) {
		return
	}
	var originalStatus = stripTags(statusLabel.getAttribute("data-ropro-original-status") || "").trim()
	var originalTitle = stripTags(statusLabel.getAttribute("data-ropro-original-title") || "")
	if (originalStatus.length == 0) {
		originalStatus = "Offline"
	}
	statusLabel.textContent = originalStatus
	if (originalTitle.length > 0) {
		statusLabel.title = originalTitle
	} else {
		statusLabel.removeAttribute("title")
	}
	statusLabel.classList.remove("ropro-friends-last-online-status")
	statusLabel.removeAttribute("data-ropro-original-status")
	statusLabel.removeAttribute("data-ropro-original-title")
}

function getRoProFriendStatusLabel(card) {
	var labels = card.querySelectorAll('.avatar-card-caption .avatar-card-label:not(.ropro-friends-last-online-label)')
	if (labels.length == 0) {
		return null
	}
	return labels[labels.length - 1]
}

function roproConnectionsCardIsOffline(card) {
	var presenceContainer = card.querySelector('.avatar-status')
	if (presenceContainer != null) {
		var offlineIcon = presenceContainer.querySelector('.icon-offline, [title="Offline"]')
		if (offlineIcon != null) {
			return true
		}
		var activePresenceIcon = presenceContainer.querySelector('[data-testid="presence-icon"], .icon-online, .icon-game, .icon-studio, .icon-mobile')
		if (activePresenceIcon != null) {
			return false
		}
		var genericIcon = presenceContainer.querySelector('[class*="icon-"]')
		if (genericIcon != null) {
			var iconTitle = stripTags(
				(genericIcon.getAttribute("title") || presenceContainer.getAttribute("title") || "")
			).trim().toLowerCase()
			if (iconTitle.indexOf("offline") >= 0) {
				return true
			}
			if (iconTitle.length > 0) {
				return false
			}
		}
	}
	var statusLabel = getRoProFriendStatusLabel(card)
	if (statusLabel == null) {
		return true
	}
	var statusText = stripTags(statusLabel.textContent || "").trim().toLowerCase()
	if (statusText.length == 0) {
		return true
	}
	if (statusText.indexOf("offline") >= 0) {
		return true
	}
	if (statusText.indexOf("online") >= 0 || statusText.indexOf("studio") >= 0 || statusText.indexOf("game") >= 0) {
		return false
	}
	return true
}

function roproIsUsersSearchPage() {
	return typeof window.location.pathname == "string" && window.location.pathname.indexOf("/search/users") >= 0
}

function roproShouldShowLastOnlineForCard(card) {
	if (roproIsUsersSearchPage()) {
		return true
	}
	return roproConnectionsCardIsOffline(card)
}

function upsertRoProFriendLastOnlineLabel(card, valueText, tooltipText) {
	var statusLabel = getRoProFriendStatusLabel(card)
	if (statusLabel != null) {
		if (!statusLabel.classList.contains("ropro-friends-last-online-status")) {
			statusLabel.setAttribute("data-ropro-original-status", stripTags(statusLabel.textContent || "").trim())
			var existingTitle = stripTags(statusLabel.getAttribute("title") || "")
			if (existingTitle.length > 0) {
				statusLabel.setAttribute("data-ropro-original-title", existingTitle)
			} else {
				statusLabel.removeAttribute("data-ropro-original-title")
			}
			statusLabel.classList.add("ropro-friends-last-online-status")
		}
		statusLabel.textContent = stripTags(valueText)
		if (typeof tooltipText == "string" && tooltipText.length > 0) {
			statusLabel.title = stripTags(tooltipText)
		} else {
			statusLabel.removeAttribute("title")
		}
		var staleLabel = getRoProFriendLastOnlineLabel(card)
		if (staleLabel != null) {
			staleLabel.remove()
		}
		return
	}

	var caption = card.querySelector('.avatar-card-caption span')
	if (caption == null) {
		caption = card.querySelector('.avatar-card-caption')
	}
	if (caption == null) {
		return
	}
	var label = getRoProFriendLastOnlineLabel(card)
	if (label == null) {
		label = document.createElement('div')
		label.className = 'avatar-card-label ropro-friends-last-online-label'
		caption.appendChild(label)
	}
	label.textContent = stripTags(valueText)
	if (typeof tooltipText == "string" && tooltipText.length > 0) {
		label.title = stripTags(tooltipText)
	} else {
		label.removeAttribute('title')
	}
}

function buildRoProFriendLastOnlineDisplay(status) {
	if (status == null || typeof status != "object" || Array.isArray(status)) {
		return null
	}
	if (status.available !== true || status.isVisible !== true || typeof status.lastOnline != "string") {
		return null
	}
	var date = new Date(status.lastOnline)
	if (isNaN(date.getTime())) {
		return null
	}
	var relativeString = formatRoProFriendLastOnlineRelative(date)
	var absoluteString = formatRoProFriendLastOnlineAbsolute(date, "local")
	return {
		valueText: `RoPro Last Online: ${relativeString}`,
		tooltipText: absoluteString
	}
}

function applyRoProFriendLastOnlineToCard(card, status) {
	if (!roproShouldShowLastOnlineForCard(card)) {
		removeRoProFriendLastOnlineLabel(card)
		return
	}
	var display = buildRoProFriendLastOnlineDisplay(status)
	if (display == null) {
		removeRoProFriendLastOnlineLabel(card)
		return
	}
	upsertRoProFriendLastOnlineLabel(card, display.valueText, display.tooltipText)
}

function fetchRoProFriendLastOnlineBatch(userIds) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_users_last_online", {userIds: userIds},
			function(data) {
				resolve(data)
			}
		)
	})
}

function normalizeRoProFriendLastOnlineResults(response) {
	if (response == null || typeof response != "object" || Array.isArray(response)) {
		return {}
	}
	var results = response.results
	if (results == null || typeof results != "object" || Array.isArray(results)) {
		return {}
	}
	return results
}

async function refreshRoProFriendLastOnlineOnce() {
	var cardEntries = getRoProFriendLastOnlineCards()
	if (cardEntries.length == 0) {
		return
	}
	var userIdsToFetch = []
	var seenUserIds = {}
	var cardsByUserId = {}
	for (var i = 0; i < cardEntries.length; i++) {
		var card = cardEntries[i].card
		var userId = cardEntries[i].userId
		if (!roproShouldShowLastOnlineForCard(card)) {
			removeRoProFriendLastOnlineLabel(card)
			continue
		}
		if (!Array.isArray(cardsByUserId[userId])) {
			cardsByUserId[userId] = []
		}
		cardsByUserId[userId].push(card)
		var cachedStatus = getRoProFriendLastOnlineCacheEntry(userId)
		if (cachedStatus !== undefined) {
			applyRoProFriendLastOnlineToCard(card, cachedStatus)
			continue
		}
		if (roproFriendLastOnlinePending[userId] === true || seenUserIds[userId] === true) {
			continue
		}
		seenUserIds[userId] = true
		userIdsToFetch.push(userId)
	}
	if (userIdsToFetch.length == 0) {
		return
	}

	for (var j = 0; j < userIdsToFetch.length; j += 50) {
		var userIdChunk = userIdsToFetch.slice(j, j + 50)
		for (var chunkIndex = 0; chunkIndex < userIdChunk.length; chunkIndex++) {
			roproFriendLastOnlinePending[userIdChunk[chunkIndex]] = true
		}
		var response = await fetchRoProFriendLastOnlineBatch(userIdChunk)
		var normalizedResults = normalizeRoProFriendLastOnlineResults(response)
		for (var resultIndex = 0; resultIndex < userIdChunk.length; resultIndex++) {
			var chunkUserId = userIdChunk[resultIndex]
			var chunkUserKey = String(chunkUserId)
			var chunkStatus = null
			if (Object.prototype.hasOwnProperty.call(normalizedResults, chunkUserKey)) {
				var candidateStatus = normalizedResults[chunkUserKey]
				if (candidateStatus != null && typeof candidateStatus == "object" && !Array.isArray(candidateStatus)) {
					chunkStatus = candidateStatus
				}
			}
			if (chunkStatus != null) {
				var cacheTtl = chunkStatus.available === true
					? ROPRO_FRIEND_LAST_ONLINE_PUBLIC_CACHE_MS
					: ROPRO_FRIEND_LAST_ONLINE_UNAVAILABLE_CACHE_MS
				setRoProFriendLastOnlineCacheEntry(chunkUserId, chunkStatus, cacheTtl)
			} else {
				setRoProFriendLastOnlineCacheEntry(chunkUserId, null, ROPRO_FRIEND_LAST_ONLINE_ERROR_CACHE_MS)
			}
			var cardsForUserId = cardsByUserId[chunkUserId]
			if (Array.isArray(cardsForUserId)) {
				var resolvedStatus = getRoProFriendLastOnlineCacheEntry(chunkUserId)
				if (resolvedStatus !== undefined) {
					for (var cardIndex = 0; cardIndex < cardsForUserId.length; cardIndex++) {
						applyRoProFriendLastOnlineToCard(cardsForUserId[cardIndex], resolvedStatus)
					}
				}
			}
			delete roproFriendLastOnlinePending[chunkUserId]
		}
	}
}

async function refreshRoProFriendLastOnline() {
	if (roproFriendLastOnlineRefreshRunning) {
		roproFriendLastOnlineRefreshQueued = true
		return
	}
	roproFriendLastOnlineRefreshRunning = true
	do {
		roproFriendLastOnlineRefreshQueued = false
		try {
			await refreshRoProFriendLastOnlineOnce()
		} catch (e) {}
	} while (roproFriendLastOnlineRefreshQueued)
	roproFriendLastOnlineRefreshRunning = false
}

function scheduleRoProFriendLastOnlineRefresh(delayMs) {
	if (roproFriendLastOnlineScanTimeout != null) {
		clearTimeout(roproFriendLastOnlineScanTimeout)
	}
	roproFriendLastOnlineScanTimeout = setTimeout(function() {
		roproFriendLastOnlineScanTimeout = null
		refreshRoProFriendLastOnline().then(function() {
			var cardEntries = getRoProFriendLastOnlineCards()
			for (var i = 0; i < cardEntries.length; i++) {
				var card = cardEntries[i].card
				var userId = cardEntries[i].userId
				var cachedStatus = getRoProFriendLastOnlineCacheEntry(userId)
				if (cachedStatus !== undefined) {
					applyRoProFriendLastOnlineToCard(card, cachedStatus)
				}
			}
		})
	}, Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0)
}

function initRoProFriendLastOnline() {
	if (roproFriendLastOnlineInitialized) {
		return
	}
	roproFriendLastOnlineInitialized = true
	if (document.body != null && roproFriendLastOnlineObserver == null) {
		roproFriendLastOnlineObserver = new MutationObserver(function() {
			scheduleRoProFriendLastOnlineRefresh(250)
		})
		roproFriendLastOnlineObserver.observe(document.body, {subtree: true, childList: true})
	}
	window.addEventListener('hashchange', function() {
		scheduleRoProFriendLastOnlineRefresh(120)
	}, {passive: true})
	if (roproFriendLastOnlineInterval == null) {
		roproFriendLastOnlineInterval = setInterval(function() {
			scheduleRoProFriendLastOnlineRefresh(0)
		}, ROPRO_FRIEND_LAST_ONLINE_SCAN_INTERVAL_MS)
	}
	scheduleRoProFriendLastOnlineRefresh(120)
}

function addQuickUnfriend() {
    quickUnfriendHTML = `<div class="quick-unfriend" style="position:absolute;top:3px;right:10px;z-index:1000;"><div class="ropro-tooltip" style="display:none;position:absolute;width:auto;background-color:#191B1D;color:white;top:-23px;left:calc(50% - 60px);font-size:10px;padding:5px;border-radius:5px;width:120px;text-align:center;z-index:100000;">Quick Unfriend User</div><span style="cursor:pointer;transform:scale(1.25);" class="icon-close-gray-16x16"></span></div>`
    friends = $('.friends-content .avatar-cards .avatar-card:not(.added)')
    for (i = 0; i < friends.length; i++) {
        friend = friends.get(i)
        friend.classList.add('added')
        div = document.createElement('div')
        div.innerHTML = quickUnfriendHTML
        var friendButton = div.childNodes[0]
        friend.style.position = "relative"
        friend.appendChild(friendButton)
        if (parseInt(friend.id) in unfriendedUsers) {
            setUnfriended(friendButton)
        }
        friendButton.addEventListener('click', function(e) {
            id = this.parentNode.id
            setUnfriended(this)
            unfriendUser(parseInt(id))
            unfriendedUsers[parseInt(id)] = true
        })
    }
}

var mutualFriends = false;
var moreMutualsGate = null;
var userId = getIdFromURL(location.href)

async function friendsMain() {
    mutualFriends = await fetchSetting("mutualFriends")
    moreMutualsGate = await refreshMoreMutualsGateState()
    initRoProFriendLastOnline()
    if (isNaN(userId) || await getStorage("rpUserID") == userId) { //My "friends" page
        /**console.log("My friends")
        const observer = new MutationObserver(function(a) {
            addQuickUnfriend()
        });
        if (document.getElementById('friends').getElementsByClassName('active').length > 0) {
            addQuickUnfriend()
        }
        var myInterval = setInterval(function() {
            if (document.getElementById('friends').getElementsByClassName('active').length > 0) {
                friendsContent = $('.friends-content .avatar-cards:not(.loaded)')
                if (friendsContent.length > 0) {
                    friendsContent.get(0).classList.add('loaded')
                    addQuickUnfriend()
                    observer.observe(friendsContent.get(0), {subtree: true, childList: true})
                }
            }
        }, 250)**/
    } else { //Other user's "friends" page
        if (mutualFriends) {
            addMutualsTab()
            wrap = document.getElementById('wrap')
            if (wrap != null) {
                wrap.style.minHeight = "1300px"
            }
        }
    }
}

window.onload = (event) => {
    friendsMain()
};
