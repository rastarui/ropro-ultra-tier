var currentQueryExperience = ""
var currentQueryItem = ""
var thumbnailsDict = {}
var itemThumbnailsDict = {}
var queryDictExperience = {}
var queryDictItem = {}
var currentSearchInput = null
var quickItemSearch = false
var experienceQuickSearch = false
var quickPlayThumbnailFallbackToken = "5d30ea2e004abe68a2db3b0d19fff763"
var searchSession = "ropro-" + randomString(4) + "-" + randomString(4) + "-" + randomString(4) + "-" + randomString(12)

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function fetchGameSearch(keyword) {
	return new Promise(resolve => {
		var encodedKeyword = encodeURIComponent(String(keyword == null ? "" : keyword));
		var encodedSession = encodeURIComponent(String(searchSession == null ? "" : searchSession));
		chrome.runtime.sendMessage({greeting: "GetURL", url:`https://apis.roblox.com/search-api/omni-search?searchQuery=${encodedKeyword}&pageToken=&sessionId=${encodedSession}&pageType=Game`},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchItemSearch(keyword) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_item_search", {q: keyword},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchItemThumbnail(itemId) {
	return new Promise(resolve => {
		var normalizedItemId = parseInt(itemId)
		if (!Number.isFinite(normalizedItemId) || normalizedItemId <= 0) {
			resolve(null)
			return
		}
		var settled = false
		var timeout = setTimeout(function() {
			if (settled) {
				return
			}
			settled = true
			resolve(null)
		}, 10000)
		var payload = [{
			requestId: normalizedItemId + ":Asset:150x150:Webp",
			type: "Asset",
			targetId: String(normalizedItemId),
			size: "150x150",
			format: "Webp"
		}]
		chrome.runtime.sendMessage(
			{greeting: "PostValidatedURL", url: "https://thumbnails.roblox.com/v1/batch", jsonData: payload},
			function(data) {
				if (settled) {
					return
				}
				settled = true
				clearTimeout(timeout)
				resolve(data)
			}
		)
	})
}

function fetchThumbnail(universeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/games/icons?universeIds=" + parseInt(universeId) + "&size=150x150&format=Png&isCircular=false"},
			function(data) {
				resolve(data)
			}
		)
	})
}

function randomString(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function normalizeQuickPlayPayload(payload) {
	var parsedPayload = payload
	if (typeof parsedPayload == "string") {
		var normalizedPayload = parsedPayload.trim()
		if (normalizedPayload.length == 0 || normalizedPayload.toUpperCase() == "ERROR") {
			return null
		}
		try {
			parsedPayload = JSON.parse(normalizedPayload)
		} catch (e) {
			return null
		}
	}
	if (parsedPayload == null || typeof parsedPayload !== "object") {
		return null
	}
	return parsedPayload
}

function normalizeQuickPlayGameSearchResults(payload) {
	var parsedPayload = normalizeQuickPlayPayload(payload)
	if (parsedPayload == null) {
		return []
	}
	if (Array.isArray(parsedPayload.searchResults)) {
		return parsedPayload.searchResults
	}
	if (Array.isArray(parsedPayload.results)) {
		return parsedPayload.results
	}
	if (Array.isArray(parsedPayload.data)) {
		return parsedPayload.data
	}
	if (parsedPayload.data != null && typeof parsedPayload.data === "object") {
		if (Array.isArray(parsedPayload.data.searchResults)) {
			return parsedPayload.data.searchResults
		}
		if (Array.isArray(parsedPayload.data.results)) {
			return parsedPayload.data.results
		}
	}
	return []
}

function normalizeQuickPlayItemSearchPayload(payload) {
	var parsedPayload = normalizeQuickPlayPayload(payload)
	if (parsedPayload == null) {
		return null
	}
	if (Array.isArray(parsedPayload)) {
		if (parsedPayload.length == 0) {
			return null
		}
		return normalizeQuickPlayItemSearchPayload(parsedPayload[0])
	}
	if (parsedPayload.item != null) {
		var nestedItem = normalizeQuickPlayItemSearchPayload(parsedPayload.item)
		if (nestedItem != null) {
			return nestedItem
		}
	}
	if (parsedPayload.data != null) {
		var nestedDataItem = normalizeQuickPlayItemSearchPayload(parsedPayload.data)
		if (nestedDataItem != null) {
			return nestedDataItem
		}
	}
	var itemId = parseInt(parsedPayload.id)
	if (!Number.isFinite(itemId) || itemId <= 0) {
		return null
	}
	return Object.assign({}, parsedPayload, {id: itemId})
}

function normalizeQuickPlayItemJson(payload) {
	var parsedPayload = normalizeQuickPlayPayload(payload)
	if (Array.isArray(parsedPayload)) {
		return parsedPayload
	}
	if (parsedPayload != null && typeof parsedPayload === "object" && Array.isArray(parsedPayload.data)) {
		return parsedPayload.data
	}
	return null
}

function extractQuickPlayThumbnailUrl(payload) {
	if (typeof payload === "string") {
		return payload
	}
	if (payload == null || typeof payload !== "object") {
		return null
	}
	if (Array.isArray(payload)) {
		for (var i = 0; i < payload.length; i++) {
			var nestedUrl = extractQuickPlayThumbnailUrl(payload[i])
			if (typeof nestedUrl === "string") {
				return nestedUrl
			}
		}
		return null
	}
	if (typeof payload.imageUrl === "string") {
		return payload.imageUrl
	}
	if (typeof payload.thumbnailUrl === "string") {
		return payload.thumbnailUrl
	}
	if (typeof payload.url === "string") {
		return payload.url
	}
	if (Array.isArray(payload.data) && payload.data.length > 0) {
		return extractQuickPlayThumbnailUrl(payload.data[0])
	}
	return null
}

function normalizeQuickPlayAssetThumbnailUrl(payload) {
	var rawUrl = extractQuickPlayThumbnailUrl(payload)
	if (typeof rawUrl !== "string") {
		return null
	}
	var thumbnailUrl = rawUrl.trim()
	if (thumbnailUrl.length == 0 || thumbnailUrl.toUpperCase() == "ERROR") {
		return null
	}
	if (thumbnailUrl.indexOf("//") == 0) {
		thumbnailUrl = "https:" + thumbnailUrl
	}
	if (typeof roproApiAdapter.getSafeImageUrl === "function") {
		var safeThumbnailUrl = roproApiAdapter.getSafeImageUrl(thumbnailUrl)
		if (safeThumbnailUrl == null || safeThumbnailUrl.indexOf(quickPlayThumbnailFallbackToken) !== -1) {
			return null
		}
		return safeThumbnailUrl
	}
	thumbnailUrl = normalizeQuickPlayImageUrl(thumbnailUrl)
	if (thumbnailUrl == null) {
		return null
	}
	if (thumbnailUrl.indexOf(quickPlayThumbnailFallbackToken) !== -1) {
		return null
	}
	return thumbnailUrl
}

function normalizeQuickPlayImageUrl(rawImageUrl) {
	var normalizedImageUrl = normalizeQuickPlayUrl(rawImageUrl)
	if (normalizedImageUrl == null) {
		return null
	}
	if (!isQuickPlayAllowedImageHost(normalizedImageUrl.hostname)) {
		return null
	}
	return normalizedImageUrl.toString()
}

function normalizeQuickPlayUrl(rawUrl) {
	if (typeof rawUrl !== "string") {
		return null
	}
	var candidate = rawUrl.trim().slice(0, 2048)
	if (candidate.length == 0) {
		return null
	}
	try {
		var parsed = new URL(candidate, window.location.href)
		var normalized = String(candidate == null ? "" : candidate).toLowerCase().trim()
		var controlFree = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
		if (hasBlockedQuickPlayUrlScheme(controlFree, parsed.protocol)) {
			return null
		}
		if (hasBlockedQuickPlayUrlScheme(decodeQuickPlayUrlLikely(controlFree), parsed.protocol)) {
			return null
		}
		if (parsed.protocol !== "https:") {
			return null
		}
		return parsed
	} catch (e) {
		return null
	}
}

function hasBlockedQuickPlayUrlScheme(rawUrl, parsedProtocol) {
	var normalizedProtocol = typeof parsedProtocol === "string" ? parsedProtocol.toLowerCase() : ""
	if (normalizedProtocol !== "https:") {
		return true
	}
	var blockedSchemes = ["javascript", "data", "vbscript", "file", "chrome", "chrome-extension", "safari-web-extension", "moz-extension", "moz", "app"]
	var normalizedUrl = String(rawUrl == null ? "" : rawUrl).trim()
	for (var i = 0; i < blockedSchemes.length; i++) {
		var blockedScheme = blockedSchemes[i]
		var blockedPrefix = blockedScheme + ":"
		var blockedBypass = blockedScheme + "-"
		if (normalizedUrl.indexOf(blockedPrefix) === 0 || normalizedUrl.indexOf(blockedBypass) === 0 || normalizedUrl.indexOf(blockedPrefix + "%") === 0 || normalizedUrl.indexOf(blockedBypass + "%") === 0) {
			return true
		}
	}
	return false
}

function decodeQuickPlayUrlLikely(rawUrl) {
	var decoded = rawUrl
	for (var i = 0; i < 3; i++) {
		try {
			var nextDecoded = decodeURIComponent(decoded)
			if (nextDecoded === decoded) {
				break
			}
			decoded = nextDecoded
		} catch (e) {
			break
		}
	}
	return decoded
}

function isQuickPlayAllowedImageHost(hostname) {
	var normalizedHostname = String(hostname == null ? "" : hostname).toLowerCase()
	if (normalizedHostname.length == 0) {
		return false
	}
	if (
		normalizedHostname === "cdn.ropro.io" ||
		normalizedHostname === "node.ropro.io" ||
		normalizedHostname === "assetdelivery.roblox.com"
	) {
		return true
	}
	return (
		normalizedHostname.endsWith(".ropro.io") ||
		normalizedHostname.endsWith(".roblox.com") ||
		normalizedHostname.endsWith(".rbxcdn.com")
	)
}

async function getGame(keyword) {
	var games = normalizeQuickPlayGameSearchResults(await fetchGameSearch(keyword))
	if (games.length > 0) {
		for (var i = 0; i < games.length; i++) {
			if (games[i] != null && games[i].contentGroupType == "Game") {
				return games[i]
			}
		}
	}
	return null
}

async function getItemSearch(keyword) {
	var item = normalizeQuickPlayItemSearchPayload(await fetchItemSearch(keyword))
	if (item != null) {
		return item
	}
	return null
}

function setLocalStorage(key, value) {
  return roproApiAdapter.setLocalStorage(key, value);
}

function stripTags(s) {
	return roproApiAdapter.stripTags(s);
}

function kFormatter(num) {
	var normalized = Number.isFinite(parseFloat(num)) ? parseFloat(num) : 0
	return Math.abs(normalized) > 999
		? Math.abs(normalized) > 999999
			? Math.sign(normalized) * (Math.abs(normalized) / 1000000).toFixed(1) + 'm'
			: Math.sign(normalized) * (Math.abs(normalized) / 1000).toFixed(1) + 'k'
		: Math.sign(normalized) * Math.abs(normalized)
}

function normalizeQuickPlayPlaceLink(rawPlaceLink, hashSuffix) {
	var candidate = typeof rawPlaceLink == "string" ? rawPlaceLink.trim() : ""
	if (candidate.length == 0) {
		return null
	}
	if (/^\d+$/.test(candidate)) {
		candidate = "https://roblox.com/games/" + parseInt(candidate, 10)
	}
	if (typeof roproApiAdapter.getSafeRobloxGameUrl == "function") {
		var safePlaceUrl = roproApiAdapter.getSafeRobloxGameUrl(candidate)
		if (safePlaceUrl == null) {
			return null
		}
		candidate = safePlaceUrl
	}
	try {
		var parsedPlaceLink = new URL(candidate, window.location.origin)
		var hostname = parsedPlaceLink.hostname.toLowerCase()
		if (hostname !== "roblox.com" && hostname !== "www.roblox.com") {
			return null
		}
		if (parsedPlaceLink.pathname.indexOf("/games/") !== 0) {
			return null
		}
		if (!isQuickPlayImagePathAllowed(parsedPlaceLink.pathname)) {
			return null
		}
		parsedPlaceLink.hash = "#" + String(hashSuffix || "").replace(/^#/, "")
		return parsedPlaceLink.origin + parsedPlaceLink.pathname + parsedPlaceLink.search + parsedPlaceLink.hash
	} catch (e) {}
	return null
}

function normalizeQuickPlayPlaceLinkFromPlaceId(placeId, hashSuffix) {
	var normalizedPlaceId = parseInt(placeId)
	if (!Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
		return null
	}
	return normalizeQuickPlayPlaceLink("https://roblox.com/games/" + normalizedPlaceId, hashSuffix)
}

function isQuickPlayImagePathAllowed(pathname) {
	var normalizedPath = pathname == null ? "/" : String(pathname)
	if (normalizedPath.length === 0) {
		normalizedPath = "/"
	}
	return normalizedPath === "/" || normalizedPath.indexOf("/games/") === 0
}

function parseQuickPlayItemMetric(value, fallbackValue) {
	var fallback = Number.isFinite(parseFloat(fallbackValue)) ? parseFloat(fallbackValue) : 0
	if (typeof value === "number" && Number.isFinite(value)) {
		return value
	}
	if (typeof value !== "string") {
		return fallback
	}
	var normalizedValue = value.trim().toLowerCase().replace(/,/g, "")
	if (normalizedValue.length == 0) {
		return fallback
	}
	var multiplier = 1
	if (normalizedValue.endsWith("k")) {
		multiplier = 1000
		normalizedValue = normalizedValue.slice(0, -1)
	} else if (normalizedValue.endsWith("m")) {
		multiplier = 1000000
		normalizedValue = normalizedValue.slice(0, -1)
	} else if (normalizedValue.endsWith("b")) {
		multiplier = 1000000000
		normalizedValue = normalizedValue.slice(0, -1)
	}
	var parsedValue = parseFloat(normalizedValue)
	if (!Number.isFinite(parsedValue)) {
		return fallback
	}
	return parsedValue * multiplier
}

function getNormalizedRobloxPath(pathname) {
	var normalizedPath = typeof pathname == "string" ? pathname : (window.location.pathname || "")
	var pathSplit = normalizedPath.split("/")
	if (pathSplit.length < 3) {
		return normalizedPath
	}
	try {
		if (Intl.getCanonicalLocales(pathSplit[1]).length > 0) {
			return "/" + pathSplit.slice(2).join("/")
		}
	} catch (_) {}
	return normalizedPath
}

function isRoProMostPlayedHomePath(pathname) {
	return getNormalizedRobloxPath(pathname).startsWith("/home")
}

function isRoProMostPlayedChartsPath(pathname) {
	return getNormalizedRobloxPath(pathname).startsWith("/charts")
}

function shouldForceRoProMostPlayedHardNavigation(pathname) {
	return isRoProMostPlayedHomePath(pathname) || isRoProMostPlayedChartsPath(pathname)
}

function isModifierNavigationEvent(event) {
	return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function forceRoProMostPlayedHardNavigation(targetUrl) {
	if (typeof targetUrl != "string" || targetUrl.length == 0) {
		return
	}
	if (window.__roproMostPlayedHardNavigationPending === targetUrl) {
		return
	}
	window.__roproMostPlayedHardNavigationPending = targetUrl
	window.location.assign(targetUrl)
}

function handleRoProMostPlayedNavigationClick(event) {
	if (event.defaultPrevented || isModifierNavigationEvent(event)) {
		return
	}
	var href = this?.getAttribute?.("href")
	if (typeof href != "string" || href.length == 0) {
		return
	}
	var destinationUrl = null
	try {
		destinationUrl = new URL(href, window.location.origin)
	} catch (_) {
		return
	}
	if (destinationUrl.origin != window.location.origin) {
		return
	}
	if (!shouldForceRoProMostPlayedHardNavigation(destinationUrl.pathname)) {
		return
	}
	if (destinationUrl.href == window.location.href) {
		return
	}
	event.preventDefault()
	event.stopImmediatePropagation()
	forceRoProMostPlayedHardNavigation(destinationUrl.href)
}

function bindRoProMostPlayedNavbarLinks() {
	$("a[href*=\"/home\"], a[href*=\"/charts\"]").not(".ropro-most-played-hard-nav").each(function() {
		this.classList.add("ropro-most-played-hard-nav")
		this.addEventListener("click", handleRoProMostPlayedNavigationClick, true)
	})
}

function ensureRoProMostPlayedScriptsAfterRouteChange() {
	var pathname = window.location.pathname || ""
	if (isRoProMostPlayedHomePath(pathname) && window.__roproHomeScriptLoaded !== true) {
		forceRoProMostPlayedHardNavigation(window.location.href)
	} else if (isRoProMostPlayedChartsPath(pathname) && window.__roproShuffleScriptLoaded !== true) {
		forceRoProMostPlayedHardNavigation(window.location.href)
	}
}

async function handleExperienceInput(e) {
	if ($("#navbar-search-input").val() != "") {
		if (e.type == "keydown" && e.originalEvent.code == "ArrowUp" && $('.ropro-quick-game-search').length > 0) {
			if ($('.ropro-quick-game-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-game-search').get(0).classList.remove('new-selected')
			} else {
				nextsibling = $('.ropro-quick-game-search').get(0).nextElementSibling
				if (nextsibling.classList.contains('new-selected')) {
					e.stopPropagation()
					nextsibling.classList.remove('new-selected')
					$('.ropro-quick-game-search').get(0).classList.add('new-selected')
				}
			}
		}
		if (e.type == "keydown" &&  e.originalEvent.code == "ArrowDown" && $('.ropro-quick-game-search').length > 0) {
			if ($('.ropro-quick-game-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-game-search').get(0).classList.remove('new-selected')
			} else {
				experiences = $('.ropro-quick-game-search').get(0).previousElementSibling
				if (experiences.classList.contains('new-selected')) {
					e.stopPropagation()
					experiences.classList.remove('new-selected')
					$('.ropro-quick-game-search').get(0).classList.add('new-selected')
				}
			}
		}
	}
	if (e.type != "keydown") {
		if (e.type == "keyup" && e.originalEvent.code == "Enter" && $('.ropro-quick-game-search').length > 0) {
			if ($('.ropro-quick-game-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-game-search a').get(0).click()
				e.stopPropagation()
				return
			}
		}
		var query = $("#navbar-search-input").val()
		if (query.length > 0 && query != currentQueryExperience) {
			currentQueryExperience = query
			if (query in queryDictExperience) {
				var game = queryDictExperience[query]
			} else {
				var game = await getGame(query)
				if (game != null && typeof game != "undefined") {
					game = game.contents[0]
					queryDictExperience[query] = game
				}
			}
			if (query == $("#navbar-search-input").val() && game != null && typeof game != "undefined") {
				var quickSearchPlaceLink = normalizeQuickPlayPlaceLinkFromPlaceId(game.rootPlaceId, "ropro-quick-search")
				var quickPlayPlaceLink = normalizeQuickPlayPlaceLinkFromPlaceId(game.rootPlaceId, "ropro-quick-play")
				var quickRandomServerPlaceLink = normalizeQuickPlayPlaceLinkFromPlaceId(game.rootPlaceId, "ropro-random-server")
				if (quickSearchPlaceLink == null || quickPlayPlaceLink == null || quickRandomServerPlaceLink == null) {
					return
				}
				quicksearchHTML = `<li style="height:0px;" universeId="0" class="ropro-quick-game-search quick-game-search navbar-search-option rbx-clickable-li"><a id="ropro-quick-search-link" href="${quickSearchPlaceLink}" style="height:57px;position:relative;display:flex;align-items:center;padding-top:0px;padding-bottom:0px;"><div style="position:relative;display:inline-block;width:36px;height:36px;margin:-6px 6px -6px 0;border-radius:2px;border:1px solid #a0a0a0"><span><img class="ropro-quick-search-game-icon" style="width:100%;height:100%;opacity:0;transition:opacity .5s ease;" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="></span></div><div><div style="width:230px;font-size: 16px; font-weight:300;white-space:nowrap;overflow:hidden;text-overflow: ellipsis;"><b>${stripTags(game.name)}</b></div><div style="display:inline-block;font-size:12px;font-weight:400;" class="text-label">${stripTags(game.creatorName)}</div><div style="display:inline-block!important;"><span class="info-label icon-playing-counts-gray" style="transform:scale(0.45);margin:-10px;margin-left:0px;margin-right:-6px;"></span><span style="font-size:11px;" class="info-label playing-counts-label" title="${game.playerCount == 0 ? 'Unknown' : parseInt(game.playerCount)} Current Players">${game.playerCount == 0 ? '---' : kFormatter(parseInt(game.playerCount))}</span><span class="info-label icon-rating-sm" style="transform:scale(0.65);margin:-10px;margin-left:5px;margin-right:2px;"></span><span style="font-size:11px;" class="info-label playing-counts-label" title="${game.totalUpVotes == 0 ? 0 : Math.round(game.totalUpVotes / (game.totalUpVotes + game.totalDownVotes) * 100)}% Like Rating">${game.totalUpVotes == 0 ? 0 : Math.round(game.totalUpVotes / (game.totalUpVotes + game.totalDownVotes) * 100)}%</span></div><button id="ropro-quick-play-button" type="button" style="position:absolute;right:31.5px;top:4px;width:50px;min-width:50px;height:50px;min-height:50px;padding:5px;transform:scale(0.6);" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width roproquickjoin" data-testid="play-button"><div class="quick-game-search-tooltip" style="display:none;position:absolute;width:auto;background-color:#191B1D;color:white;top:-30px;right:-40px;font-size:13px;padding:5px;border-radius:5px;">RoPro Quick Play</div><span style="margin-left:3px;transform:scale(0.75);" class="icon-common-play"></span></button>
						<button type="button" id="ropro-quick-random-server-button" style="position:absolute;right:0px;top:4px;width:50px;min-width:50px;height:50px;min-height:50px;padding:5px;transform:scale(0.6);" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width roproquickjoin" data-testid="play-button"><div class="quick-game-search-tooltip" style="display:none;position:absolute;width:auto;background-color:#191B1D;color:white;top:-30px;right:-20px;font-size:13px;padding:5px;border-radius:5px;">Random Non-Full Server</div><span style="margin-left:0px;transform:scale(0.75);filter:invert(1);background-image:url(${chrome.runtime.getURL('/images/random_server.svg')});background-size: 36px 36px;" class="icon-common-play"></span></button></div></a></li>`
					search = document.getElementsByClassName('navbar-search')
				if (search.length > 0) {
					options = search[0].getElementsByClassName('navbar-search-option')
					var experiences = null
					for (var i = 0; i < options.length; i++) {
						if (
							options[i].getElementsByTagName('a').length > 0 &&
							(
								options[i].getElementsByTagName('a')[0].href.includes('/discover') ||
								options[i].getElementsByTagName('a')[0].href.includes('/charts')
							)
						) {
							experiences = options[i]
							break
						}
					}
					if (experiences != null) {
						flag = false
						if ($('.ropro-quick-game-search').length > 0) {
							if (parseInt($('.ropro-quick-game-search').get(0).getAttribute('universeId')) == game.universeId) {
								flag = true
							}
						}
						$('.ropro-quick-game-search').remove()
						div = document.createElement('div')
						div.innerHTML = quicksearchHTML
						quicksearchLi = div.childNodes[0]
						quicksearchLi.setAttribute('universeId', parseInt(game.universeId))
						insertAfter(quicksearchLi, experiences)
						if (flag == false) {
							setTimeout(function(){
								quicksearchLi.classList.add('loaded')
							}, 10)
						} else {
							quicksearchLi.classList.add('loaded')
						}
						if (game.universeId in thumbnailsDict) {
							thumbnails = thumbnailsDict[game.universeId]
						} else {
							thumbnails = await fetchThumbnail(game.universeId)
							thumbnailsDict[game.universeId] = thumbnails
						}
						if (query == $("#navbar-search-input").val() && thumbnails.data.length > 0) {
							thumbnail = thumbnails.data[0].imageUrl
							gameIcon = quicksearchLi.getElementsByClassName('ropro-quick-search-game-icon')
							if (gameIcon.length > 0) {
								var safeGameThumbnail = normalizeQuickPlayAssetThumbnailUrl(thumbnail)
								if (safeGameThumbnail != null) {
									gameIcon[0].src = safeGameThumbnail
								}
								gameIcon[0].style.opacity = 1
							}
						}
							var quickSearchAnchor = document.getElementById('ropro-quick-search-link')
							var randomServerButton = document.getElementById('ropro-quick-random-server-button')
							var quickPlayButton = document.getElementById('ropro-quick-play-button')
							randomServerButton.addEventListener('mouseenter', function() {
								quickSearchAnchor.href = quickRandomServerPlaceLink
							})
							quickPlayButton.addEventListener('mouseenter', function() {
								quickSearchAnchor.href = quickPlayPlaceLink
							})
							randomServerButton.addEventListener('mouseleave', function() {
								quickSearchAnchor.href = quickSearchPlaceLink
							})
							quickPlayButton.addEventListener('mouseleave', function() {
								quickSearchAnchor.href = quickSearchPlaceLink
							})
						document.getElementById('ropro-quick-search-link').addEventListener('click', function() {
							setLocalStorage('quickSearchLinkClicked', Date.now())
						})
					}
				}
			}
		} else if (query.length == 0) {
			currentQueryExperience = ""
		}
	}
}

async function handleItemInput(e) {
	if ($("#navbar-search-input").val() != "") {
		if (e.type == "keydown" && e.originalEvent.code == "ArrowUp" && $('.ropro-quick-item-search').length > 0) {
			if ($('.ropro-quick-item-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-item-search').get(0).classList.remove('new-selected')
			} else {
				nextsibling = $('.ropro-quick-item-search').get(0).nextElementSibling
				if (nextsibling.classList.contains('new-selected')) {
					e.stopPropagation()
					nextsibling.classList.remove('new-selected')
					$('.ropro-quick-item-search').get(0).classList.add('new-selected')
				}
			}
		}
		if (e.type == "keydown" &&  e.originalEvent.code == "ArrowDown" && $('.ropro-quick-item-search').length > 0) {
			if ($('.ropro-quick-item-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-item-search').get(0).classList.remove('new-selected')
			} else {
				experiences = $('.ropro-quick-item-search').get(0).previousElementSibling
				if (experiences.classList.contains('new-selected')) {
					e.stopPropagation()
					experiences.classList.remove('new-selected')
					$('.ropro-quick-item-search').get(0).classList.add('new-selected')
				}
			}
		}
	}
	if (e.type != "keydown") {
		if (e.type == "keyup" && e.originalEvent.code == "Enter" && $('.ropro-quick-item-search').length > 0) {
			if ($('.ropro-quick-item-search').get(0).classList.contains('new-selected')) {
				$('.ropro-quick-item-search a').get(0).click()
				e.stopPropagation()
				return
			}
		}
		var query = $("#navbar-search-input").val()
		if (query.length > 0 && query != currentQueryItem) {
			currentQueryItem = query
			if (query in queryDictItem) {
				var item = queryDictItem[query]
			} else {
				var item = await getItemSearch(query)
				queryDictItem[query] = item
			}
			if (query == $("#navbar-search-input").val() && item != null) {
				var itemJSON = normalizeQuickPlayItemJson(item.json)
				if (itemJSON == null || itemJSON.length == 0) {
					return
				}
				var itemName = typeof itemJSON[0] == "string" ? itemJSON[0] : ""
				var itemRap = parseQuickPlayItemMetric(itemJSON[8], 0)
				var itemValue = parseQuickPlayItemMetric(itemJSON[16], itemRap)
				quicksearchHTML = `<li style="height:0px;position:relative;" itemid="${parseInt(item.id)}" class="ropro-quick-item-search quick-item-search navbar-search-option rbx-clickable-li"><a id="ropro-quick-item-link" href="https://roblox.com/catalog/${parseInt(item.id)}/#ropro-quick-item-search" style="height:57px;position:relative;display:flex;align-items:center;padding-top:0px;padding-bottom:0px;"><div style="position:relative;display:inline-block;width:36px;height:36px;margin:-6px 6px -6px 0;border-radius:2px;background-color:${$('.dark-theme').length > 0 ? '#343638' : '#C3C5C6'};"><span><img class="ropro-quick-search-item-icon" style="width:100%;height:100%;opacity:0;transition:opacity .5s ease;" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="></span></div><div><div style="max-width:300px;font-size: 16px; font-weight:300;white-space:nowrap;overflow:hidden;text-overflow: ellipsis;"><b>${stripTags(itemName)}</b></div><div style="display:inline-block!important;"><span style="font-size:11px;" class="info-label" title=""><b>RAP:</b> ${kFormatter(itemRap)}  <b>Value:</b> ${kFormatter(itemValue)}</span></div></div></a><div style="width:30px;height:30px;position:absolute;top:15px;right:10px;"><button id="ropro-rolimons-button" type="button" style="width:50px;min-width:50px;height:50px;min-height:50px;padding:5px;transform:scale(0.6);background-color:#0084DD;margin-top:-10px;margin-left:-10px;" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width"><a href="https://www.rolimons.com/item/${parseInt(item.id)}" style="padding:10px;padding-bottom:5px;transform:scale(1.2);"><img src="${chrome.runtime.getURL('/images/rolimons_icon_white.png')}" style="margin-left:2px;width:20px;margin-top:-7px;"></a></button></div></li>`
				search = document.getElementsByClassName('navbar-search')
				if (search.length > 0) {
					options = search[0].getElementsByClassName('navbar-search-option')
					var avatarShop = null
					for (var i = 0; i < options.length; i++) {
						if (options[i].getElementsByTagName('a').length > 0 && options[i].getElementsByTagName('a')[0].href.includes('/catalog')) {
							avatarShop = options[i]
							break
						}
					}
					if (avatarShop != null) {
						flag = false
						if ($('.ropro-quick-item-search').length > 0) {
							if (parseInt($('.ropro-quick-item-search').get(0).getAttribute('itemid')) == item.id) {
								flag = true
							}
						}
						$('.ropro-quick-item-search').remove()
						div = document.createElement('div')
						div.innerHTML = quicksearchHTML
						var quicksearchLi = div.childNodes[0]
						quicksearchLi.setAttribute('itemid', parseInt(item.id))
						insertAfter(quicksearchLi, avatarShop)
						if (flag == false) {
							setTimeout(function(){
								quicksearchLi.classList.add('loaded')
							}, 10)
						} else {
							quicksearchLi.classList.add('loaded')
						}
						if (query == $("#navbar-search-input").val()) {
							var thumbnail = null
							var normalizedItemId = parseInt(item.id)
							if (Object.prototype.hasOwnProperty.call(itemThumbnailsDict, normalizedItemId)) {
								thumbnail = itemThumbnailsDict[normalizedItemId]
							} else {
								thumbnail = normalizeQuickPlayAssetThumbnailUrl(await fetchItemThumbnail(normalizedItemId))
								itemThumbnailsDict[normalizedItemId] = thumbnail
							}
							var itemIcon = quicksearchLi.getElementsByClassName('ropro-quick-search-item-icon')
							if (itemIcon.length > 0 && thumbnail != null && query == $("#navbar-search-input").val()) {
								var safeItemThumbnail = normalizeQuickPlayAssetThumbnailUrl(thumbnail)
								if (safeItemThumbnail != null) {
									itemIcon[0].src = safeItemThumbnail
								}
								itemIcon[0].style.opacity = 1
							}
						}
					}
				}
			}
		} else if (query.length == 0) {
			currentQueryItem = ""
		}
	}
}

async function addCardQuickPlay(card) {
	if ($(card).find('.ropro-card-quick-play-options').length > 0) {
		return
	}

	var cardLink = $(card).closest('.game-card-link').get(0)
	if (cardLink == null) {
		cardLink = $(card).closest('a[href]').get(0)
		if (cardLink == null) {
			cardLink = $(card)
				.find('a[href]')
				.filter(function () {
					return this != null && this.getAttribute != null && this.getAttribute('href') != null
				})
				.get(0)
		}
	}
	if (cardLink == null || cardLink.getAttribute == null) {
		return
	}

	var placeLink = cardLink.getAttribute('href')
	var safeQuickPlayPlaceLink = normalizeQuickPlayPlaceLink(placeLink, 'ropro-quick-play')
	var safeRandomServerPlaceLink = normalizeQuickPlayPlaceLink(placeLink, 'ropro-random-server')
	if (
		safeQuickPlayPlaceLink == null ||
		safeRandomServerPlaceLink == null ||
		typeof placeLink !== 'string' ||
		placeLink.length === 0
	) {
		return
	}

	var isRoProPopularTodayCard = $(card).closest('.ropro-all-experiences-list-container').length > 0
	var quickPlayVerticalAnchor = card.classList.contains('large-game-tile-thumb-container')
		? (isRoProPopularTodayCard ? 'bottom:6px' : 'top:5px')
		: 'bottom:50px'
	var quickPlayContainerSizing = isRoProPopularTodayCard ? 'width:82px;height:50px;' : ''
	cardQuickPlayHTML = `<div style="position:absolute;${quickPlayVerticalAnchor};${quickPlayContainerSizing}z-index:10;" class="ropro-card-quick-play-options"><a href="${safeQuickPlayPlaceLink}"><button type="button" style="position:absolute;right:32px;top:0px;width:50px;min-width:50px;height:50px;min-height:50px;padding:5px;transform:scale(0.6);" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width roproquickjoin ropro-card-quick-play-button" data-testid="play-button"><span style="margin-left:3px;transform:scale(0.75);display:block;" class="icon-common-play"></span></button></a><a href="${safeRandomServerPlaceLink}"><button type="button" style="position:absolute;right:0px;top:0px;width:50px;min-width:50px;height:50px;min-height:50px;padding:5px;transform:scale(0.6);" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width ropro-quick-random-server-button ropro-card-random-play-button" data-testid="play-button"><span style="margin-left:0px;transform:scale(0.75);filter:invert(1);background-image:url(${chrome.runtime.getURL('/images/random_server.svg')});background-size: 36px 36px;display:block;" class="icon-common-play"></span></button></a></div>`
	div = document.createElement('div')
	div.innerHTML = cardQuickPlayHTML
	cardQuickPlayElement = div.childNodes[0]
	card.appendChild(cardQuickPlayElement)
	setTimeout(function () {
		card.getElementsByClassName('ropro-card-quick-play-options')[0].classList.add('animate')
	}, 10)

	var quickPlayButton = cardQuickPlayElement.getElementsByClassName('ropro-card-quick-play-button')[0]
	var randomPlayButton = cardQuickPlayElement.getElementsByClassName('ropro-card-random-play-button')[0]
	if (quickPlayButton != null) {
		quickPlayButton.addEventListener('click', function () {
			setLocalStorage('quickSearchLinkClicked', Date.now())
		})
		quickPlayButton.addEventListener('auxclick', function () {
			setLocalStorage('quickSearchLinkClicked', Date.now())
		})
	}
	if (randomPlayButton != null) {
		randomPlayButton.addEventListener('click', function () {
			setLocalStorage('quickSearchLinkClicked', Date.now())
		})
		randomPlayButton.addEventListener('auxclick', function () {
			setLocalStorage('quickSearchLinkClicked', Date.now())
		})
	}
}
async function quicksearchMain() {
	var quickItemSearch = await fetchSetting('quickItemSearch');
	var experienceQuickSearch = await fetchSetting('experienceQuickSearch');
	var experienceQuickPlay = await fetchSetting('experienceQuickPlay');
	var previousPathname = window.location.pathname || ""
	var navbarSearchInterval = setInterval(async function() {
		bindRoProMostPlayedNavbarLinks()
		if ((window.location.pathname || "") != previousPathname) {
			previousPathname = window.location.pathname || ""
			ensureRoProMostPlayedScriptsAfterRouteChange()
		}
		if (document.getElementById('navbar-search-input') != currentSearchInput) {
			currentSearchInput = document.getElementById('navbar-search-input')
			if (experienceQuickSearch) {
				$(document.getElementById('navbar-search-input')).bind('input change paste keyup keydown mouseup', function(e){
						handleExperienceInput(e)
				})
			}
			if (quickItemSearch) {
				$(document.getElementById('navbar-search-input')).bind('input change paste keyup keydown mouseup', function(e){
						handleItemInput(e)
				})
			}
		}
		if (experienceQuickPlay) {
			$('.game-card-thumb-container:not(.ropro-card-quick-play)').each(function(){
				this.classList.add('ropro-card-quick-play')
				if ($(this).find('.ropro-card-quick-play-options').length == 0) {
					$(this).mouseover(function(){
						addCardQuickPlay(this)
					})
				}
			})
			$('.featured-game-icon-container:not(.ropro-card-quick-play)').each(function(){
				this.classList.add('ropro-card-quick-play')
				if ($(this).find('.ropro-card-quick-play-options').length == 0) {
					$(this).mouseover(function(){
						addCardQuickPlay(this)
					})
				}
			})
				$('.large-game-tile-thumb-container:not(.ropro-card-quick-play)').each(function(){
					this.classList.add('ropro-card-quick-play')
					if ($(this).find('.ropro-card-quick-play-options').length == 0) {
						$(this).mouseover(function(){
							addCardQuickPlay(this)
					})
						if ($(this).closest('.ropro-all-experiences-list-container').length > 0) {
							addCardQuickPlay(this)
						}
					}
				})
				}
			}, 250)
}

quicksearchMain()
