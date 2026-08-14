var url_matches = [
	"/discover",
	"/discover/*",
	"/games/*"
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

function sanitizeServerId(serverId) {
	var normalizedServerId = typeof serverId === "string" ? serverId : String(serverId || "")
	return normalizedServerId.replace(/[^0-9a-z-]/gi, "")
}

function sanitizeServerJoinParams(placeId, serverId) {
	var normalizedPlaceId = parseInt(placeId, 10)
	var normalizedServerId = sanitizeServerId(serverId)
	if (!Number.isFinite(normalizedPlaceId)) {
		normalizedPlaceId = parseInt(globalGameId, 10)
	}
	return Number.isFinite(normalizedPlaceId) && normalizedPlaceId > 0 && normalizedServerId.length > 0 ? {
		placeId: normalizedPlaceId,
		serverId: normalizedServerId
	} : null
}

function joinRobloxGameServer(placeId, serverId) {
	var joinParams = sanitizeServerJoinParams(placeId, serverId)
	if (
		joinParams == null ||
		document.body.classList.contains("ropro-cloud-play-activated")
	) {
		return
	}
	window.location.href = "roblox://experiences/start?placeId=" + joinParams.placeId + "&gameInstanceId=" + encodeURIComponent(joinParams.serverId)
}

var recentServerRejoinJoinTimeout = null

function isRecentServerRejoinJoinButton(joinButton) {
	if (
		joinButton == null ||
		typeof joinButton.getAttribute !== "function" ||
		typeof joinButton.closest !== "function"
	) {
		return false
	}
	if (joinButton.getAttribute('data-ropro-recent-rejoin') !== "true") {
		return false
	}
	return joinButton.closest('#rbx-recent-server-box') != null
}

function closeRecentServerRejoinModal(cancelPendingJoin) {
	var modalContainer = document.getElementById('recentServerRejoinModalContainer')
	if (modalContainer != null) {
		modalContainer.remove()
	}
	if (cancelPendingJoin === true && recentServerRejoinJoinTimeout != null) {
		clearTimeout(recentServerRejoinJoinTimeout)
		recentServerRejoinJoinTimeout = null
	}
}

function showRecentServerRejoinModal() {
	var outer = document.getElementById('rbx-body')
	if (outer == null) {
		outer = document.body
	}
	if (outer == null) {
		return
	}
	closeRecentServerRejoinModal(false)
	var modalcontainer = document.createElement('div')
	modalcontainer.id = "recentServerRejoinModalContainer"
	outer.appendChild(modalcontainer)
	var overlay = document.createElement('div')
	overlay.innerHTML = randomServerOverlayHTML
	var modal = document.createElement('div')
	modal.innerHTML = randomServerModalHTML
	var statusTextNode = modal.getElementsByClassName('random-server-status-text')[0]
	if (statusTextNode != null) {
		statusTextNode.textContent = "Rejoining your recent server..."
	}
	modalcontainer.appendChild(overlay)
	modalcontainer.appendChild(modal)
	var closeButton = modalcontainer.getElementsByClassName('close')[0]
	if (closeButton != null) {
		closeButton.addEventListener('click', function() {
			closeRecentServerRejoinModal(true)
		})
	}
}

function queueRecentServerRejoinJoin(placeId, serverId) {
	var joinParams = sanitizeServerJoinParams(placeId, serverId)
	if (
		joinParams == null ||
		document.body.classList.contains("ropro-cloud-play-activated")
	) {
		return
	}
	if (recentServerRejoinJoinTimeout != null) {
		clearTimeout(recentServerRejoinJoinTimeout)
		recentServerRejoinJoinTimeout = null
	}
	showRecentServerRejoinModal()
	recentServerRejoinJoinTimeout = setTimeout(function() {
		recentServerRejoinJoinTimeout = null
		closeRecentServerRejoinModal(false)
		joinRobloxGameServer(joinParams.placeId, joinParams.serverId, true)
	}, 450)
}

function bindGameServerJoinDelegatedListener() {
	if (typeof bindGameServerJoinDelegatedListener.bound === "boolean" && bindGameServerJoinDelegatedListener.bound === true) {
		return
	}
	document.addEventListener('click', function(event) {
		if (event.target == null || typeof event.target.closest !== "function") {
			return
		}
		var joinButton = event.target.closest('.rbx-public-game-server-join, .rbx-friends-game-server-join, .ropro-game-server-join')
		if (joinButton == null || document.body.classList.contains("ropro-cloud-play-activated")) {
			return
		}
		var row = joinButton.closest('.rbx-public-game-server-item, .rbx-friends-game-server-item, .rbx-private-game-server-item')
		var placeId = joinButton.getAttribute('data-placeid')
		var serverId = joinButton.getAttribute('data-serverid')
		if (serverId == null) {
			serverId = joinButton.getAttribute('data-gameid')
		}
		if (serverId == null && row != null) {
			serverId = row.getAttribute('data-gameid')
			if (placeId == null) {
				placeId = row.getAttribute('data-placeid')
			}
		}
		if (serverId == null) {
			return
		}
		if (isRecentServerRejoinJoinButton(joinButton)) {
			event.preventDefault()
			event.stopPropagation()
			queueRecentServerRejoinJoin(placeId, serverId)
			return
		}
		joinRobloxGameServer(placeId, serverId, true)
	}, true)
	bindGameServerJoinDelegatedListener.bound = true
}

var fetchAngular = document.createElement('script');
fetchAngular.src = chrome.runtime.getURL('/js/page/fetchServers.js');
(document.head||document.documentElement).appendChild(fetchAngular);
fetchAngular.onload = function() {
    fetchAngular.remove();
}

var theme = "dark"
if ($('.light-theme').length > 0) {
    var theme = "light"
}

var cloudPlayActive = false
var serverFiltersDismissListenersBound = false
var serverFiltersHeaderLayoutBound = false

var serverFiltersChipLabelHTML = `<span class="server-filters-chip-label" style="overflow:visible;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;text-indent:0;font-size:13px;line-height:1.2;"><img class="server-filters-mini-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" style="width:14px;height:14px;margin-left:0px;" alt="RoPro"><span class="server-filters-chip-text" style="display:inline !important;visibility:visible !important;opacity:1 !important;text-indent:0 !important;font-size:13px !important;line-height:1.2 !important;">RoPro Server Filters</span><img class="server-filters-icon" src="${chrome.runtime.getURL('/images/serverfilters.png')}" style="width:18px;filter:invert(1);" alt="Filters"></span>`

serverFiltersHTML = `<div id="roproServerFiltersButton" class="input-group-btn ropro-server-filters-header-control"><span id="serverFilters" class="rbx-selection-label ng-binding ropro-server-filters-header-label">RoPro Filters</span><div id="serverFiltersDropdown" class="server-filters-dropdown input-group-btn group-dropdown ropro-server-filters-chip-trigger ropro-server-filters-chip-icon-only" role="button" tabindex="0" aria-expanded="false" aria-label="Open RoPro server filters">
${serverFiltersChipLabelHTML}
</div>
			<div style="position: absolute; width: 232px; height: auto; right: 0px; top: 32px; z-index: 1000; border-radius: 12px; background-color: rgb(30, 32, 34); display: none;" class="server-filters-dropdown-box ropro-server-filters-dropdown" id="serverFiltersDropdownBox">
	<div class="server-filters-dropdown-header">
		<div class="server-filters-dropdown-title"><img class="server-filters-header-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="RoPro">RoPro Filters</div>
		<button type="button" id="serverFiltersCloseButton" class="server-filters-close-button" aria-label="Close RoPro server filters">×</button>
	</div>
	<div class="server-filters-dropdown-body">
	<div id="notFullButton" class="server-filter-option" data-filter-key="not_full" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Filters out servers which are full.</div>
		<p style="display:inline-block;">Available Space</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Not_Full.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<div class="server-filter-option" id="maxPlayersButton" data-filter-key="max_players" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Show servers at or below a selected player count.</div>
		<p style="display:inline-block;">Maximum Players</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Player_Count.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);">
		<div id="playerCountSelector" style="display:none;position:absolute;left: -218px;top:-75px;width:220px;height:auto;z-index:1000;background-color:#1E2022;border-radius:5px;padding:10px;">
			<div style="text-align:center;margin-bottom:0px;">
				<h3 style="padding-bottom:0px!important;font-size:15px;">Select Maximum Players</h3>
				<p style="display:none;width:200px;height:auto;font-size:12px;word-break: break-word;overflow-wrap: break-word;white-space: pre-wrap;">RoPro will filter out servers above this player count</p>
				<div style="background-color:#393B3D;height:276px;width:200px;margin-top:8px;border-radius:5px;padding-top:0.5px;overflow-y:scroll;overflow-x:hidden;" id="maxPlayersList" class="max-players-list">				
				</div>
			</div>
		</div>
		</div>
	<div class="server-filter-option" id="minPlayersButton" data-filter-key="min_players" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Show servers at or above a selected player count.</div>
		<p style="display:inline-block;">Minimum Players</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Player_Count.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);">
		<div id="playerCountMoreSelector" style="display:none;position:absolute;left: -218px;top:-75px;width:220px;height:auto;z-index:1000;background-color:#1E2022;border-radius:5px;padding:10px;">
			<div style="text-align:center;margin-bottom:0px;">
				<h3 style="padding-bottom:0px!important;font-size:15px;">Select Minimum Players</h3>
				<p style="display:none;width:200px;height:auto;font-size:12px;word-break: break-word;overflow-wrap: break-word;white-space: pre-wrap;">RoPro will filter out servers below this player count</p>
				<div style="background-color:#393B3D;height:276px;width:200px;margin-top:8px;border-radius:5px;padding-top:0.5px;overflow-y:scroll;overflow-x:hidden;" id="minPlayersList" class="max-players-list">				
				</div>
			</div>
		</div>
		</div>
	<div class="server-filter-option" id="randomShuffleButton" data-filter-key="random_shuffle" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Display servers in a completely random order.</div>
		<p style="display:inline-block;">Random Shuffle</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Random_Shuffle.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<div class="" style="width:190px;height:3px;background-color:#FFFFFF;margin:5px;margin-top:7px;border-radius:5px;"> </div>
	<div class="server-filter-option" id="bestConnectionButton" data-filter-key="best_connection" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip"><div class="ropro-subscriber-only-label" style="font-weight:800;text-decoration:underline;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:15px;margin-right:5px;margin-top:-2.7px;">Subscribers Only</div>RoPro looks at hundreds of servers and sorts by the lowest ping. Ping shown by RoPro is Roblox's ping to that server, not your personal ping, but it can still help estimate connection speed.</div>
		<p style="display:inline-block;">Best Connection</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Best_Connection3.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<!--<div class="server-filter-option" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip"><div style="font-weight:800;text-decoration:underline;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:15px;margin-right:5px;margin-top:-2.7px;">Subscribers Only</div>Filter servers by the update version of this experience when they were launched.</div>
		<p style="display:inline-block;">Server Version</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Server_Version2.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>-->
</div>
	</div>
         </div>`
serverFiltersMiniHTML = `<div id="roproServerFiltersMiniButton" class="ropro-server-filters-tab-chip"><div id="serverFiltersDropdownMini" class="ropro-server-filters-mini-toggle" role="button" tabindex="0" aria-expanded="false" aria-label="Open RoPro server filters">
${serverFiltersChipLabelHTML}
</div>
			<div style="position: absolute; width: 232px; height: auto; right: -4px; top: 34px; z-index: 1000; border-radius: 12px; background-color: rgb(30, 32, 34); display: none;" class="server-filters-dropdown-box ropro-server-filters-dropdown" id="serverFiltersDropdownBoxMini">
	<div class="server-filters-dropdown-header">
		<div class="server-filters-dropdown-title"><img class="server-filters-header-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="RoPro">RoPro Filters</div>
		<button type="button" id="serverFiltersCloseButtonMini" class="server-filters-close-button" aria-label="Close RoPro server filters">×</button>
	</div>
	<div class="server-filters-dropdown-body">
	<div id="notFullButtonMini" class="server-filter-option" data-filter-key="not_full" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Filters out servers which are full.</div>
		<p style="display:inline-block;">Available Space</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Not_Full.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<div class="server-filter-option" id="maxPlayersButtonMini" data-filter-key="max_players" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Show servers at or below a selected player count.</div>
		<p style="display:inline-block;">Maximum Players</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Player_Count.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);">
		<div id="playerCountSelector" style="display:none;position:absolute;left: -218px;top:-75px;width:220px;height:auto;z-index:1000;background-color:#1E2022;border-radius:5px;padding:10px;">
			<div style="text-align:center;margin-bottom:0px;">
				<h3 style="padding-bottom:0px!important;font-size:15px;">Select Maximum Players</h3>
				<p style="display:none;width:200px;height:auto;font-size:12px;word-break: break-word;overflow-wrap: break-word;white-space: pre-wrap;">RoPro will filter out servers above this player count</p>
				<div style="background-color:#393B3D;height:276px;width:200px;margin-top:8px;border-radius:5px;padding-top:0.5px;overflow-y:scroll;overflow-x:hidden;" id="maxPlayersListMini" class="max-players-list">
				</div>		
			</div>
		</div>
		</div>
	<div class="server-filter-option" id="minPlayersButtonMini" data-filter-key="min_players" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Show servers at or above a selected player count.</div>
		<p style="display:inline-block;">Minimum Players</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Player_Count.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);">
		<div id="playerCountMoreSelector" style="display:none;position:absolute;left: -218px;top:-75px;width:220px;height:auto;z-index:1000;background-color:#1E2022;border-radius:5px;padding:10px;">
			<div style="text-align:center;margin-bottom:0px;">
				<h3 style="padding-bottom:0px!important;font-size:15px;">Select Minimum Players</h3>
				<p style="display:none;width:200px;height:auto;font-size:12px;word-break: break-word;overflow-wrap: break-word;white-space: pre-wrap;">RoPro will filter out servers below this player count</p>
				<div style="background-color:#393B3D;height:276px;width:200px;margin-top:8px;border-radius:5px;padding-top:0.5px;overflow-y:scroll;overflow-x:hidden;" id="minPlayersListMini" class="max-players-list">
				</div>		
			</div>
		</div>
		</div>
	<div class="server-filter-option" id="randomShuffleButtonMini" data-filter-key="random_shuffle" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip">Display servers in a completely random order.</div>
		<p style="display:inline-block;">Random Shuffle</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Random_Shuffle.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<div class="" style="width:190px;height:3px;background-color:#FFFFFF;margin:5px;margin-top:7px;border-radius:5px;"> </div>
		<div class="server-filter-option" id="bestConnectionButtonMini" data-filter-key="best_connection" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip"><div class="ropro-subscriber-only-label" style="font-weight:800;text-decoration:underline;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:15px;margin-right:5px;margin-top:-2.7px;">Subscribers Only</div>RoPro looks at hundreds of servers and sorts by the lowest ping. Ping shown by RoPro is Roblox's ping to that server, not your personal ping, but it can still help estimate connection speed.</div>
		<p style="display:inline-block;">Best Connection</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Best_Connection3.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>
	<!--<div class="server-filter-option" id="serverVersionButtonMini" style="width:190px;height:30px;background-color:#393B3D;margin:5px;border-radius:5px;padding:3px;">
		<div style="display:none;position:absolute;top:-10px;left:200px;width:auto;inline-size:200px;;height:auto;background-color:#191B1D;color:white;padding:5px;border-radius:5px;white-space: pre-wrap;font-size:14px;" class="filter-tooltip"><div style="font-weight:800;text-decoration:underline;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:15px;margin-right:5px;margin-top:-2.7px;">Subscribers Only</div>Filter servers by the update version of this experience when they were launched.</div>
		<p style="display:inline-block;">Server Version</p><img class="server-filter-img" src="${chrome.runtime.getURL('/images/Server_Version2.svg')}" style="float:right;width:30px;margin-top:-2.5px;margin-right:2px;filter:invert(0.8);"></div>-->
</div>
	</div>
         </div>`
searchBarHTML = `<div id="searchServerMain" style="margin-top:5px;margin-bottom:25px;height:45px;position:relative;">
					<div style="float:left;width:400px;margin-left:5px;margin-bottom:10px;" class="input-group">
					<form><input autofocus="" id="searchServer" class="form-control input-field" type="text" placeholder="Enter Exact Username..." maxlength="120" autocomplete="off" value="">
					<div style="font-size:12px;color:red;" id="serverSearchError"></div>
					<div style="font-size:12px;color:green;" id="serverSearchSuccess"></div>
					</form>
					<div class="input-group-btn"><button style="margin:0px;margin-left:2px;" class="input-addon-btn" type="submit">
					<span class="icon-nav-search"></span>
					</button></div></div>
					<span id="searchServerButton" style="padding:10px;margin-bottom:10px;float-left;" class="btn-secondary-md btn-more rbx-private-server-create-button">Search</span>
					</div>`
gameRankHTML = `<div id="gameRankDiv" style="z-index:1000;position:absolute;margin-bottom:6px;visibility:initial;bottom:-10px;left:5px;"><div style="margin-left:2px;width:155px;height:24px;background-color:#0084DD;border-radius:150px;"><img style="left:0px;top:0px;position:absolute;margin-right:5px;" src="${chrome.runtime.getURL('/images/value_icon_medium.png')}" height="24px"><h5 id="valueAmount" style="font-size:15px;position:absolute;right:5px;top:-2px;width:100%;text-align:right;">Rank Today: #4</h5></div></div>`
roproVoiceServersHTML = `<div id="roproVoiceServersContainer" class="ropro-voice-servers-container stack" style="margin-top:15px;"><div class="container-header" style="margin-bottom:0px;"><h3>RoPro Voice Servers</h3><span class="tooltip-container" style="margin-top:3px;"><span class="ropro-voice-servers-info icon-moreinfo" style="cursor:pointer;margin-left:5px;position:relative;margin-top:0px;"><div style="display:none;position:absolute;left:-135px;top:-240px;font-size:13px;width:300px;background-color:#191B1D;padding:10px;border-radius:10px;" class="dark-theme ropro-voice-servers-info-tooltip"><div style="font-weight:bold;text-align:center;font-size:14px;">What are RoPro Voice Servers?</div><div style="font-size:13px;margin-top:10px;background-color:#222527;padding:10px;border-radius:10px;"> <b>RoPro Voice Servers</b> are private Roblox servers owned by RoPro on popular voice enabled experiences. These servers are only accessible to RoPro users with Voice Chat enabled on their Roblox account.<br><br><img style="margin-top:-3px;margin-left:0px;width:15px;" src="${chrome.runtime.getURL('/images/plus_icon.png')}"> RoPro Plus and <img style="margin-top:-3px;margin-left:0px;width:15px;" src="${chrome.runtime.getURL('/images/rex_icon.png')}"> RoPro Rex users can access thousands of premium RoPro Voice Servers! <a href="https://ropro.io?upgrade" target="_blank"><u><b>Upgrade Here</b></u></a></div></div></span></span><button type="button" class="btn-more rbx-refresh refresh-link-icon btn-control-xs btn-min-width" style="margin-top:7px;">Refresh</button></div><ul style="padding:0px;margin-top:0px;margin-bottom:0px;" id="ropro-voice-servers-list" class="section ropro-voice-servers-list card-list section-content-off"></ul><div style="margin-bottom:10px;"><button type="button" class="rbx-public-running-games-load-more btn-control-md btn-full-width">Load More</button></div></div>`
mostRecentServerHTML = `<div id="roproMostRecentServerContainer" class="stack" data-showshutdown="false"><div class="container-header"><h3 style="display:inline-flex;align-items:center;gap:6px;"><span>My Recent Server</span><img src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" style="width:20px;height:20px;" alt="" aria-hidden="true"></h3></div><ul style="padding:0px;margin-top:20px;border-radius:8px;" id="rbx-recent-server-box" class="section rbx-friends-game-server-item-container stack-list section-content-off"><p class="no-servers-message">No Recent Server Found.</p></ul><div class="rbx-friends-running-games-footer"></div><div class="rbx-friends-game-server-template"><li class="stack-row rbx-friends-game-server-item"><div class="section-header"><div class="link-menu rbx-friends-game-server-menu"></div></div><div class="section-left rbx-friends-game-server-details"><div class="text-info rbx-game-status rbx-friends-game-server-status"></div><div class="rbx-friends-game-server-alert"><span class="icon-remove"></span>Slow Game</div><a class="btn-full-width btn-control-xs rbx-friends-game-server-join" href="#" data-placeid="">Join</a></div><div class="section-right rbx-friends-game-server-players"></div></li></div></div>`
randomServerHTML = `<button type="button" style="width:66px;min-width:66px;margin-left:3px;position:relative;" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width random-server-button"><div class="random-server-tooltip" style="position:absolute;width:170px;background-color:#191B1D;color:white;top:-30px;right:-25px;font-size:13px;padding:5px;border-radius:5px;z-index:10000;display:none;">Random Non-Full Server</div><span style="filter:invert(1);background-image:url(${chrome.runtime.getURL('/images/random_server.svg')});background-size: 36px 36px;" class="icon-common-play"></span></button>`
randomServerOverlayHTML = `<div id="simplemodal-overlay" class="simplemodal-overlay" style="background-color: rgb(0, 0, 0); opacity: 0.8; height: 100%; width: 100%; position: fixed; left: 0px; top: 0px; z-index: 1041;"></div>`
randomServerModalHTML = `<div id="simplemodal-container" class="simplemodal-container" style="position: fixed; z-index: 1042; height: 231px; width: 400px;  left: calc(50% - 200px); top: calc(50% - 115.5px);"><a class="modalCloseImg simplemodal-close" title="Close"></a><div tabindex="-1" class="simplemodal-wrap" style="height: 100%; outline: 0px; width: 100%; overflow: visible;"><div id="modal-confirmation" class="modal-confirmation noImage protocolhandler-are-you-installed-modal simplemodal-data" data-modal-type="confirmation" style="display: block;"><div id="modal-dialog" class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal"> <span aria-hidden="true"><span class="icon-close"></span></span><span class="sr-only">Close</span> </button><h5 class="modal-title"></h5></div><div class="modal-body"><div class="modal-top-body"><div class="modal-message"><img style="filter: drop-shadow(rgb(57,59,61) 2px 2px 2px);" src="${chrome.runtime.getURL('/images/ropro_logo.png')}" width="150" alt="R"><p class="random-server-status-text">Searching for a random non-full server...</p></div><div class="modal-image-container roblox-item-image" data-image-size="medium" data-no-overlays="" data-no-click=""><img class="modal-thumb" alt="generic image"></div><div class="modal-checkbox checkbox" style="display: none;"><input id="modal-checkbox-input" type="checkbox"> <label for="modal-checkbox-input"></label></div></div><div style="display:none;" class="modal-btns"><a href="" id="confirm-btn" class="btn-primary-md">Download Studio</a> <a href="" id="decline-btn" class="btn-control-md" style="display: none;">No</a></div><div style="display:block;" class="loading modal-processing"><img class="loading-default" src="https://images.rbxcdn.com/4bed93c91f909002b1f17f05c0ce13d1.gif" alt="Processing..."></div></div><div class="modal-footer text-footer" style="display: block;"></div></div></div></div></div></div>`
voiceServerModalHTML = `<div id="simplemodal-container" class="simplemodal-container" style="position: fixed; z-index: 1042; height: 231px; width: 400px;  left: calc(50% - 200px); top: calc(50% - 115.5px);"><a class="modalCloseImg simplemodal-close" title="Close"></a><div tabindex="-1" class="simplemodal-wrap" style="height: 100%; outline: 0px; width: 100%; overflow: visible;"><div id="modal-confirmation" class="modal-confirmation noImage protocolhandler-are-you-installed-modal simplemodal-data" data-modal-type="confirmation" style="display: block;"><div id="modal-dialog" class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal"> <span aria-hidden="true"><span class="icon-close"></span></span><span class="sr-only">Close</span> </button><h5 class="modal-title"></h5></div><div class="modal-body"><div class="modal-top-body"><div class="modal-message"><img style="filter: drop-shadow(rgb(57,59,61) 2px 2px 2px);" src="${chrome.runtime.getURL('/images/ropro_logo.png')}" width="150" alt="R"><p class="voice-server-loading-text"></p></div><div class="modal-image-container roblox-item-image" data-image-size="medium" data-no-overlays="" data-no-click=""><img class="modal-thumb" alt="generic image"></div><div class="modal-checkbox checkbox" style="display: none;"><input id="modal-checkbox-input" type="checkbox"> <label for="modal-checkbox-input"></label></div></div><div style="display:none;" class="modal-btns"><a href="" id="confirm-btn" class="btn-primary-md">Download Studio</a> <a href="" id="decline-btn" class="btn-control-md" style="display: none;">No</a></div><div style="display:block;" class="loading modal-processing"><img class="loading-default" src="https://images.rbxcdn.com/4bed93c91f909002b1f17f05c0ce13d1.gif" alt="Processing..."></div></div><div class="modal-footer text-footer" style="display: block;"></div></div></div></div></div></div>`
cloudPlayHTML = `<button type="button" style="width:66px;min-width:66px;margin-left:3px;position:relative;" class="btn-full-width btn-common-play-game-lg btn-primary-md btn-min-width random-server-button"><div class="random-server-tooltip" style="position:absolute;width:170px;background-color:#191B1D;color:white;top:-30px;right:-25px;font-size:13px;padding:5px;border-radius:5px;z-index:10000;display:none;">Random Non-Full Server</div><span style="filter:invert(1);background-image:url(${chrome.runtime.getURL('/images/random_server.svg')});background-size: 36px 36px;" class="icon-common-play"></span></button>`

var pageIndex = 0;
var customServerList = null;
var globalGameId = 0;
var myUniverseId = 0;
var serverInfoQueue = [];
var serverInfoRequestInFlight = false;
var serverPingVisibilityEnabled = false;
var serverPingBestConnectionEnabled = false;
var serverPingDetailsSettingEnabled = true;
var serverPingDetailsSettingInitialized = false;
var SERVER_PING_VISUAL_GATE = "server_ping_visibility";
var serverPingVisualGate = null;
var serverPingVisualGatePromise = null;
var serverInviteLinksEnabled = false;
var serverPingHintsById = {};
var serverPingHintsRequestInFlight = null;
var serverPingHintsLastRequestedAt = 0;
var serverFilterCacheWarmupPromise = null;
var serverFilterCacheRefreshInterval = null;
var serverFilterCacheGameId = null;
var SERVER_FILTER_CACHE_REFRESH_INTERVAL_MS = 3000;
var SERVER_PING_HINT_REFRESH_INTERVAL_MS = 6000;
var SERVER_FILTER_ROWS_PER_PAGE = 2;
var SERVER_FILTER_LOAD_MORE_DELAY_MS = 600;
var SERVER_FILTER_PING_HINT_SAMPLE_SIZE = 500;
var SERVER_FILTER_DEFAULT_SAMPLE_SIZE = 150;
var SERVER_FILTER_BEST_CONNECTION_SAMPLE_SIZE = 500;
var SERVER_FILTER_BEST_CONNECTION_CURSOR_TARGET = 5;
var SERVER_FILTER_BEST_CONNECTION_WAIT_TIMEOUT_MS = 18000;
var SERVER_FILTER_BEST_CONNECTION_WAIT_POLL_INTERVAL_MS = 2100;
var SERVER_FILTER_PLAYER_COUNT_SAMPLE_SIZE = 500;
var SERVER_FILTER_PLAYER_COUNT_CURSOR_TARGET = 5;
var SERVER_FILTER_PLAYER_COUNT_MAX_RENDER_THRESHOLD = 1000;
var SERVER_FILTER_POPULATION_FALLBACK_HINT_SAMPLE_SIZE = 1200;
var SERVER_INFO_BATCH_SIZE = 80;
var serverFilterVisibleCount = 0;
var LIVE_VOTE_COUNTER_STARTUP_DELAY_MS = 1000;
var LIVE_VOTE_COUNTER_REFRESH_INTERVAL_MS = 15000;
var LIVE_PLAYING_COUNTER_REFRESH_INTERVAL_MS = 15000;
var GAME_CACHE_MAX_ID = 9007199254740991;
var GAME_CACHE_REFRESH_RETRY_WINDOW_MS = 120000;
var GAME_CACHE_REFRESH_STARTUP_JITTER_MAX_MS = 30000;
var GAME_CACHE_MIN_PLAYING_FOR_UPSERT = 26;
var GAME_CACHE_METADATA_MAX_ATTEMPTS = 4;
var GAME_CACHE_METADATA_RETRY_BASE_MS = 250;
var GAME_CACHE_METADATA_RETRY_MAX_MS = 3000;
var GAME_INFO_REQUEST_CACHE_WINDOW_MS = 2500;
var GAME_PAGE_ROUTE_REGEX = /\/(?:[a-z]{2}-[a-z]{2}\/)?(?:games|discover)\/(\d+)/i;
var roproGameCacheRefreshSharedState = window.__roproGameCacheRefreshState;
if (roproGameCacheRefreshSharedState == null || typeof roproGameCacheRefreshSharedState !== "object") {
	roproGameCacheRefreshSharedState = {};
	window.__roproGameCacheRefreshState = roproGameCacheRefreshSharedState;
}
if (roproGameCacheRefreshSharedState.inflightByPlace == null || typeof roproGameCacheRefreshSharedState.inflightByPlace !== "object") {
	roproGameCacheRefreshSharedState.inflightByPlace = {};
}
if (roproGameCacheRefreshSharedState.lastAttemptAtByPlace == null || typeof roproGameCacheRefreshSharedState.lastAttemptAtByPlace !== "object") {
	roproGameCacheRefreshSharedState.lastAttemptAtByPlace = {};
}
if (roproGameCacheRefreshSharedState.scheduledByPlace == null || typeof roproGameCacheRefreshSharedState.scheduledByPlace !== "object") {
	roproGameCacheRefreshSharedState.scheduledByPlace = {};
}
if (roproGameCacheRefreshSharedState.attemptedByPlace == null || typeof roproGameCacheRefreshSharedState.attemptedByPlace !== "object") {
	roproGameCacheRefreshSharedState.attemptedByPlace = {};
}
var gameCacheRefreshInflightByPlace = roproGameCacheRefreshSharedState.inflightByPlace;
var gameCacheRefreshLastAttemptAtByPlace = roproGameCacheRefreshSharedState.lastAttemptAtByPlace;
var gameCacheRefreshScheduledByPlace = roproGameCacheRefreshSharedState.scheduledByPlace;
var gameCacheRefreshAttemptedByPlace = roproGameCacheRefreshSharedState.attemptedByPlace;
var roproGameInfoRequestSharedState = window.__roproGameInfoRequestState;
if (roproGameInfoRequestSharedState == null || typeof roproGameInfoRequestSharedState !== "object") {
	roproGameInfoRequestSharedState = {};
	window.__roproGameInfoRequestState = roproGameInfoRequestSharedState;
}
if (roproGameInfoRequestSharedState.inflightByUniverse == null || typeof roproGameInfoRequestSharedState.inflightByUniverse !== "object") {
	roproGameInfoRequestSharedState.inflightByUniverse = {};
}
if (roproGameInfoRequestSharedState.cacheByUniverse == null || typeof roproGameInfoRequestSharedState.cacheByUniverse !== "object") {
	roproGameInfoRequestSharedState.cacheByUniverse = {};
}
var gameInfoRequestInflightByUniverse = roproGameInfoRequestSharedState.inflightByUniverse;
var gameInfoRequestCacheByUniverse = roproGameInfoRequestSharedState.cacheByUniverse;
var activeServerFilterState = {
	notFull: false,
	maxPlayers: null,
	minPlayers: null,
	randomShuffle: false,
	bestConnection: false
};
var serverFilterPlayerCountBounds = null;
var serverFilterPlayerCountBoundsPromise = null;
var serverFilterPlayerCountBoundsGameId = null;

function getCurrentGameRouteId() {
	var pathMatch = window.location.pathname.match(GAME_PAGE_ROUTE_REGEX)
	if (pathMatch == null || pathMatch.length < 2) {
		return null
	}
	var parsedGameId = parseInt(pathMatch[1], 10)
	if (!Number.isFinite(parsedGameId) || parsedGameId <= 0) {
		return null
	}
	return parsedGameId
}

function isGamePageTabActive(expectedGameId = null) {
	if (document.visibilityState !== "visible") {
		return false
	}
	if (typeof document.hasFocus === "function" && !document.hasFocus()) {
		return false
	}
	var currentGameId = getCurrentGameRouteId()
	if (currentGameId == null) {
		return false
	}
	var normalizedExpectedGameId = parseInt(expectedGameId, 10)
	if (Number.isFinite(normalizedExpectedGameId) && normalizedExpectedGameId > 0) {
		return currentGameId === normalizedExpectedGameId
	}
	return true
}

function fetchVoiceServers(placeId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_voice_servers", {placeId: parseInt(placeId)},
			function(data) {
					resolve(data)
			})
	})
}

function fetchVoiceServer(placeId, serverId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_voice_server", {placeId: parseInt(placeId), serverId: parseInt(serverId)},
			function(data) {
					resolve(data)
			})
	})
}

function fetchPlayTime(gameID, time, offset = 0) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_play_time", {universeId: gameID, time: time, offset: offset},
			function(data) {
					resolve(data)
			})
	})
}

function parseServerPingValue(value) {
	var ping = parseFloat(value)
	if (!Number.isFinite(ping) || ping < 0) {
		return null
	}
	return ping
}

function parseServerPingLabel(ping) {
	var pingValue = parseServerPingValue(ping)
	if (Number.isFinite(pingValue)) {
		return Math.round(pingValue) + "ms"
	}
	return null
}

function buildServerInfoMarkup(pingText, canViewPing, showLockedPingState) {
	var shouldShowLockedPing = showLockedPingState !== false
	var safePing = stripTags(typeof pingText === "string" && pingText.length > 0 ? pingText : "Unavailable")
	var isLockedPing = !canViewPing && shouldShowLockedPing
	var pingSummaryClasses = `ropro-server-info-ping${isLockedPing ? " ropro-server-info-ping-locked ropro-server-info-ping-upgrade" : ""}`
	var pingSummaryValue = isLockedPing
		? `<span class="ropro-server-info-ping-value ropro-server-info-ping-value-locked"><span class="ropro-server-info-lock-glyph" aria-hidden="true"></span></span>`
		: `<span class="ropro-server-info-ping-value">${safePing}</span>`
	var pingSummary = `<span class="${pingSummaryClasses}"><img class="server-filter-img ropro-server-info-ping-icon" src="${chrome.runtime.getURL('/images/speed_icon.svg')}" style="width:13px;filter:invert(0.8);"><span class="ropro-server-info-ping-prefix">Ping:</span>${pingSummaryValue}</span>`
	var pingTooltipValue = isLockedPing
		? `<span style="font-weight:initial;" class="ropro-server-info-ping-tooltip-value ropro-server-info-ping-tooltip-value-locked"><span class="ropro-server-info-lock-glyph" aria-hidden="true"></span></span>`
		: `<span style="font-weight:initial;" class="ropro-server-info-ping-tooltip-value">${safePing}</span>`
	var pingTooltip = `<div style="font-size:12px;font-weight:800;" class="text-info"><img class="server-filter-img ropro-server-info-ping-icon" src="${chrome.runtime.getURL('/images/speed_icon.svg')}" style="width:13px;margin-left:-2px;margin-top:-2px;margin-right:4px;filter:invert(0.8);">Live Ping: <br>${pingTooltipValue}</div>`
	return `<div class="ropro-server-info text-info"><div class="ropro-server-info-row"><span class="ropro-server-info-label">${pingSummary}</span></div><div class="ropro-server-info-tooltip">${pingTooltip}</div></div>`
}

function fetchServerFilterRandomShuffle(gameID, options = {}) {
	var normalizedMinServers = parseInt(options.minServers, 10)
	return new Promise(resolve => {
		chrome.runtime.sendMessage({
			greeting: "ServerFilterRandomShuffle",
			gameID: gameID,
			refresh: options.refresh === true,
			minServers: Number.isFinite(normalizedMinServers) && normalizedMinServers > 0 ? normalizedMinServers : undefined
		}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchServerPingHints(gameID, options = {}) {
	var normalizedMinServers = parseInt(options.minServers, 10)
	var sortOrder =
		typeof options.sortOrder === "string" && (options.sortOrder === "Asc" || options.sortOrder === "Desc")
			? options.sortOrder
			: undefined
	return new Promise(resolve => {
		chrome.runtime.sendMessage({
			greeting: "GetServerPingHints",
			gameID: gameID,
			refresh: options.refresh === true,
			minServers: Number.isFinite(normalizedMinServers) && normalizedMinServers > 0 ? normalizedMinServers : undefined,
			sortOrder: sortOrder
		},
			function(data) {
				resolve(data)
		})
	})
}

function cacheServerPingHints(sampledServers) {
	if (!Array.isArray(sampledServers)) {
		return
	}
	for (var i = 0; i < sampledServers.length; i++) {
		if (sampledServers[i] == null || typeof sampledServers[i] !== "object") {
			continue
		}
		var serverId = stripTags(typeof sampledServers[i].id === "string" ? sampledServers[i].id : "")
		if (serverId.length === 0) {
			continue
		}
		var serverPing = parseServerPingValue(sampledServers[i].ping)
		if (!Number.isFinite(serverPing)) {
			continue
		}
		serverPingHintsById[serverId] = serverPing
	}
}

function replaceServerInfoPingMarkup(elem, pingValue) {
	if (!serverPingVisibilityEnabled || elem == null || typeof elem.getElementsByClassName !== "function") {
		return
	}
	var normalizedPing = parseServerPingValue(pingValue)
	if (!Number.isFinite(normalizedPing)) {
		return
	}
	var infoElems = elem.getElementsByClassName('ropro-server-info')
	if (infoElems.length == 0) {
		return
	}
	var pingLabel = parseServerPingLabel(normalizedPing)
	if (typeof pingLabel !== "string" || pingLabel.length == 0) {
		return
	}
	var infoElem = infoElems[0]
	if (typeof infoElem.textContent === "string" && infoElem.textContent.indexOf(pingLabel) >= 0) {
		return
	}
	var infoWrapper = document.createElement('div')
	infoWrapper.innerHTML = buildServerInfoMarkup(pingLabel, true)
	var updatedInfoElem = infoWrapper.childNodes[0]
	if (updatedInfoElem != null && infoElem.parentNode != null) {
		infoElem.parentNode.replaceChild(updatedInfoElem, infoElem)
	}
}

function applyCachedServerPingHintsToVisibleRows() {
	var serverRows = document.querySelectorAll('.rbx-public-game-server-item, .rbx-friends-game-server-item')
	for (var i = 0; i < serverRows.length; i++) {
		var serverId = stripTags(serverRows[i].getAttribute('data-gameid') || "")
		if (serverId.length == 0 || !serverPingHintsById.hasOwnProperty(serverId)) {
			continue
		}
		var pingValue = parseServerPingValue(serverPingHintsById[serverId])
		if (!Number.isFinite(pingValue)) {
			continue
		}
		serverRows[i].setAttribute('data-server-ping', String(pingValue))
		replaceServerInfoPingMarkup(serverRows[i], pingValue)
	}
}

function refreshServerPingHints(force = false) {
	if (!serverPingVisibilityEnabled) {
		return Promise.resolve(null)
	}
	var normalizedGameId = parseInt(globalGameId, 10)
	if (!Number.isFinite(normalizedGameId) || normalizedGameId <= 0) {
		return Promise.resolve(null)
	}
	if (serverPingHintsRequestInFlight != null) {
		return serverPingHintsRequestInFlight
	}
	var now = Date.now()
	if (
		!force &&
		now - serverPingHintsLastRequestedAt < SERVER_PING_HINT_REFRESH_INTERVAL_MS
	) {
		return Promise.resolve(null)
	}
	serverPingHintsLastRequestedAt = now
	var sortOrder = getRobloxServerSortOrderFromSelect()
	serverPingHintsRequestInFlight = fetchServerPingHints(normalizedGameId, {
		refresh: force === true,
		minServers: SERVER_FILTER_PING_HINT_SAMPLE_SIZE,
		sortOrder: sortOrder
	})
		.then(function(sampledServers) {
			cacheServerPingHints(sampledServers)
			applyCachedServerPingHintsToVisibleRows()
			return sampledServers
		})
		.catch(function() {
			return null
		})
		.finally(function() {
			serverPingHintsRequestInFlight = null
		})
	return serverPingHintsRequestInFlight
}

function getRobloxServerSortOrderFromSelect() {
	var serverSortSelect = document.getElementById('sort-select')
	var sortOrder = "Desc"
	if (serverSortSelect != null && (serverSortSelect.value === "Asc" || serverSortSelect.value === "Desc")) {
		sortOrder = serverSortSelect.value
	}
	return sortOrder
}

function getPopulationFallbackPingHintSortOrders() {
	var sortOrders = []
	if (Number.isFinite(activeServerFilterState.minPlayers)) {
		sortOrders.push("Desc")
	}
	if (Number.isFinite(activeServerFilterState.maxPlayers)) {
		sortOrders.push("Asc")
	}
	var activeSortOrder = getRobloxServerSortOrderFromSelect()
	sortOrders.push(activeSortOrder)
	sortOrders.push(activeSortOrder === "Asc" ? "Desc" : "Asc")
	var dedupedSortOrders = []
	var seenSortOrders = {}
	for (var sortIndex = 0; sortIndex < sortOrders.length; sortIndex++) {
		var sortOrder = sortOrders[sortIndex]
		if (sortOrder !== "Asc" && sortOrder !== "Desc") {
			continue
		}
		if (seenSortOrders.hasOwnProperty(sortOrder)) {
			continue
		}
		seenSortOrders[sortOrder] = true
		dedupedSortOrders.push(sortOrder)
	}
	return dedupedSortOrders
}

function resetServerPingHintsCache() {
	serverPingHintsById = {}
	serverPingHintsRequestInFlight = null
	serverPingHintsLastRequestedAt = 0
}

function resetServerFilterPlayerCountBoundsState() {
	serverFilterPlayerCountBounds = null
	serverFilterPlayerCountBoundsPromise = null
	serverFilterPlayerCountBoundsGameId = null
}

function bindServerSortPingRefresh() {
	var sortSelect = document.getElementById('sort-select')
	if (sortSelect == null || sortSelect.getAttribute('data-ropro-ping-sort-bound') === "1") {
		return
	}
	sortSelect.setAttribute('data-ropro-ping-sort-bound', "1")
	sortSelect.addEventListener('change', function() {
		var shouldSkipSortDrivenFilterRefresh = activeServerFilterState.randomShuffle === true
		if (!serverPingVisibilityEnabled) {
			var sortOnlyGameId = parseInt(globalGameId, 10)
			if (
				Number.isFinite(sortOnlyGameId) &&
				sortOnlyGameId > 0 &&
				hasActiveServerFilters() &&
				!shouldSkipSortDrivenFilterRefresh
			) {
				applyActiveServerFilters(sortOnlyGameId, {
					visibleCount: Math.max(getServerFilterPageSize(), serverFilterVisibleCount)
				}).catch(function() {})
			}
			return
		}
		refreshServerPingHints(true).catch(function() {})
		if (!hasActiveServerFilters()) {
			return
		}
		if (shouldSkipSortDrivenFilterRefresh) {
			return
		}
		var sortGameId = parseInt(globalGameId, 10)
		if (!Number.isFinite(sortGameId) || sortGameId <= 0) {
			return
		}
		applyActiveServerFilters(sortGameId, {
			visibleCount: Math.max(getServerFilterPageSize(), serverFilterVisibleCount)
		}).catch(function() {})
	})
}

function getServerPlayingCount(serverRow) {
	if (serverRow == null || typeof serverRow !== "object") {
		return -1
	}
	var playing = parseInt(serverRow.playing, 10)
	if (Number.isFinite(playing) && playing >= 0) {
		return playing
	}
	if (Array.isArray(serverRow.playerTokens)) {
		return serverRow.playerTokens.length
	}
	return -1
}

function getServerMaxPlayersCount(serverRow) {
	if (serverRow == null || typeof serverRow !== "object") {
		return -1
	}
	var maxPlayers = parseInt(serverRow.maxPlayers, 10)
	if (Number.isFinite(maxPlayers) && maxPlayers > 0) {
		return maxPlayers
	}
	return -1
}

function getServerFilterRowId(serverRow) {
	if (serverRow == null || typeof serverRow !== "object") {
		return ""
	}
	return stripTags(typeof serverRow.id === "string" ? serverRow.id : "")
}

function hydrateServerFilterPingRows(serverRows) {
	if (!Array.isArray(serverRows)) {
		return
	}
	for (var i = 0; i < serverRows.length; i++) {
		if (serverRows[i] == null || typeof serverRows[i] !== "object") {
			continue
		}
		var normalizedPing = parseServerPingValue(serverRows[i].ping)
		if (Number.isFinite(normalizedPing)) {
			serverRows[i].ping = normalizedPing
			continue
		}
		var serverId = getServerFilterRowId(serverRows[i])
		if (serverId.length === 0 || !serverPingHintsById.hasOwnProperty(serverId)) {
			continue
		}
		var hintedPing = parseServerPingValue(serverPingHintsById[serverId])
		if (!Number.isFinite(hintedPing)) {
			continue
		}
		serverRows[i].ping = hintedPing
	}
}

function getServerFilterPingValue(serverRow) {
	if (serverRow == null || typeof serverRow !== "object") {
		return null
	}
	var serverPing = parseServerPingValue(serverRow.ping)
	if (Number.isFinite(serverPing)) {
		return serverPing
	}
	var serverId = getServerFilterRowId(serverRow)
	if (serverId.length === 0 || !serverPingHintsById.hasOwnProperty(serverId)) {
		return null
	}
	return parseServerPingValue(serverPingHintsById[serverId])
}

function normalizeServerFilterPlayerCountBounds(bounds, fallbackMaxPlayerCount = null) {
	var minPlayers = parseInt(bounds != null && typeof bounds === "object" ? bounds.minPlayers : NaN, 10)
	var maxPlayers = parseInt(bounds != null && typeof bounds === "object" ? bounds.maxPlayers : NaN, 10)
	var normalizedFallbackMaxPlayerCount = parseInt(fallbackMaxPlayerCount, 10)
	if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) {
		if (Number.isFinite(normalizedFallbackMaxPlayerCount) && normalizedFallbackMaxPlayerCount > 0) {
			maxPlayers = normalizedFallbackMaxPlayerCount
		}
	}
	if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) {
		return null
	}
	maxPlayers = Math.min(maxPlayers, SERVER_FILTER_PLAYER_COUNT_MAX_RENDER_THRESHOLD)
	if (!Number.isFinite(minPlayers) || minPlayers < 1) {
		minPlayers = 1
	}
	if (minPlayers > maxPlayers) {
		minPlayers = 1
	}
	return {
		minPlayers: minPlayers,
		maxPlayers: maxPlayers
	}
}

function deriveCursorBasedPlayerCountBounds(sampledServers, fallbackMaxPlayerCount = null) {
	var maxServerCapacity = -1
	var minLoadedPlayers = -1
	var maxLoadedPlayers = -1
	if (Array.isArray(sampledServers)) {
		for (var i = 0; i < sampledServers.length; i++) {
			var serverRow = sampledServers[i]
			var serverCapacity = getServerMaxPlayersCount(serverRow)
			if (serverCapacity > maxServerCapacity) {
				maxServerCapacity = serverCapacity
			}
			var playing = getServerPlayingCount(serverRow)
			if (!Number.isFinite(playing) || playing < 0) {
				continue
			}
			if (minLoadedPlayers < 0 || playing < minLoadedPlayers) {
				minLoadedPlayers = playing
			}
			if (playing > maxLoadedPlayers) {
				maxLoadedPlayers = playing
			}
		}
	}
	var derivedMinPlayers = minLoadedPlayers >= 0 ? Math.max(1, minLoadedPlayers) : 1
	var derivedMaxPlayers = maxServerCapacity > 0 ? maxServerCapacity : maxLoadedPlayers
	if (maxLoadedPlayers > 0 && maxLoadedPlayers > derivedMaxPlayers) {
		derivedMaxPlayers = maxLoadedPlayers
	}
	return normalizeServerFilterPlayerCountBounds({
		minPlayers: derivedMinPlayers,
		maxPlayers: derivedMaxPlayers
	}, fallbackMaxPlayerCount)
}

function getServerFilterPlayerCountThresholds(playerCountBounds) {
	var normalizedBounds = normalizeServerFilterPlayerCountBounds(playerCountBounds)
	if (normalizedBounds == null) {
		return []
	}
	var thresholds = []
	for (var i = normalizedBounds.minPlayers; i <= normalizedBounds.maxPlayers; i++) {
		thresholds.push(i)
	}
	return thresholds
}

function parsePlayerCountSelectionValue(selectionNode) {
	if (selectionNode == null || typeof selectionNode.getAttribute !== "function") {
		return null
	}
	var selectedValue = parseInt(selectionNode.getAttribute('data-player-count'), 10)
	if (!Number.isFinite(selectedValue) || selectedValue <= 0) {
		return null
	}
	return selectedValue
}

function getActiveServerFilterSummaryLabel() {
	var labels = []
	if (activeServerFilterState.notFull) {
		labels.push("Available Space")
	}
	if (Number.isFinite(activeServerFilterState.maxPlayers)) {
		labels.push("Maximum Players")
	}
	if (Number.isFinite(activeServerFilterState.minPlayers)) {
		labels.push("Minimum Players")
	}
	if (activeServerFilterState.bestConnection) {
		labels.push("Best Connection")
	}
	if (activeServerFilterState.randomShuffle) {
		labels.push("Random Shuffle")
	}
	if (labels.length == 0) {
		return "RoPro Server Filters"
	}
	return labels.join(" + ")
}

function hasActiveServerFilters() {
	return (
		activeServerFilterState.notFull === true ||
		Number.isFinite(activeServerFilterState.maxPlayers) ||
		Number.isFinite(activeServerFilterState.minPlayers) ||
		activeServerFilterState.randomShuffle === true ||
		activeServerFilterState.bestConnection === true
	)
}

function getImpossibleServerFilterStatusMessage() {
	var selectedMaxPlayers = parseInt(activeServerFilterState.maxPlayers, 10)
	var selectedMinPlayers = parseInt(activeServerFilterState.minPlayers, 10)
	if (
		Number.isFinite(selectedMaxPlayers) &&
		Number.isFinite(selectedMinPlayers) &&
		selectedMinPlayers > selectedMaxPlayers
	) {
		return "Impossible filter combination: Minimum Players (" + selectedMinPlayers + "+) is higher than Maximum Players (" + selectedMaxPlayers + " or less)."
	}
	return ""
}

function getServerFilterCardsPerRow() {
	var viewportWidth = window.innerWidth
	if (!Number.isFinite(viewportWidth)) {
		return 4
	}
	if (viewportWidth >= 992) {
		return 4
	}
	if (viewportWidth >= 768) {
		return 3
	}
	return 2
}

function getServerFilterPageSize() {
	return getServerFilterCardsPerRow() * SERVER_FILTER_ROWS_PER_PAGE
}

function setServerFilterOptionActiveState(optionKey, isActive) {
	var optionButtonIdsByKey = {
		not_full: ["notFullButton", "notFullButtonMini"],
		max_players: ["maxPlayersButton", "maxPlayersButtonMini"],
		min_players: ["minPlayersButton", "minPlayersButtonMini"],
		random_shuffle: ["randomShuffleButton", "randomShuffleButtonMini"],
		best_connection: ["bestConnectionButton", "bestConnectionButtonMini"]
	}
	if (!optionButtonIdsByKey.hasOwnProperty(optionKey)) {
		return
	}
	var buttonIds = optionButtonIdsByKey[optionKey]
	for (var i = 0; i < buttonIds.length; i++) {
		var button = document.getElementById(buttonIds[i])
		if (button == null) {
			continue
		}
		if (isActive) {
			button.classList.add("active")
		} else {
			button.classList.remove("active")
		}
	}
}

function syncServerPingFeatureState() {
	serverPingBestConnectionEnabled =
		serverPingVisualGate != null &&
		typeof serverPingVisualGate === "object" &&
		serverPingVisualGate.allowed === true
	serverPingVisibilityEnabled =
		serverPingBestConnectionEnabled &&
		serverPingDetailsSettingEnabled === true
}

function shouldShowBestConnectionTierLockState() {
	if (serverPingBestConnectionEnabled) {
		return false
	}
	if (serverPingVisualGate == null || typeof serverPingVisualGate !== "object") {
		return true
	}
	if (serverPingVisualGate.reason === "disabled_feature") {
		return false
	}
	return true
}

function isServerPingGateTierAllowed() {
	if (serverPingVisualGate == null || typeof serverPingVisualGate !== "object") {
		return false
	}
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateTierAllowed === "function"
	) {
		return roproApiAdapter.isVisualGateTierAllowed(serverPingVisualGate)
	}
	var currentTierRank =
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.getSubscriptionTierRank === "function"
			? roproApiAdapter.getSubscriptionTierRank(serverPingVisualGate.currentTier)
			: -1
	var requiredTierRank =
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.getSubscriptionTierRank === "function"
			? roproApiAdapter.getSubscriptionTierRank(serverPingVisualGate.requiredTier)
			: -1
	if (currentTierRank < 0 || requiredTierRank < 0) {
		return false
	}
	return currentTierRank >= requiredTierRank
}

function shouldUpsellServerPingGate() {
	if (serverPingVisualGate == null || typeof serverPingVisualGate !== "object" || serverPingVisualGate.allowed === true) {
		return false
	}
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateUpsellEligible === "function"
	) {
		return roproApiAdapter.isVisualGateUpsellEligible(serverPingVisualGate)
	}
	var reason = String(serverPingVisualGate.reason == null ? "" : serverPingVisualGate.reason).trim().toLowerCase()
	if (reason === "tier") {
		return true
	}
	if (reason === "setting_off") {
		return !isServerPingGateTierAllowed()
	}
	return false
}

async function ensureServerPingVisualGateState() {
	if (!serverPingDetailsSettingInitialized) {
		serverPingDetailsSettingEnabled = (await fetchSetting("additionalServerInfo")) === true
		serverPingDetailsSettingInitialized = true
	}
	if (serverPingVisualGate != null && typeof serverPingVisualGate === "object") {
		syncServerPingFeatureState()
		return serverPingVisualGate
	}
	if (serverPingVisualGatePromise == null) {
		serverPingVisualGatePromise = fetchVisualGate(SERVER_PING_VISUAL_GATE).catch(function() {
			return { allowed: false, reason: "subscription_unknown", upgradeTier: "plus" }
		})
	}
	var resolvedGate = await serverPingVisualGatePromise
	serverPingVisualGate = resolvedGate
	syncServerPingFeatureState()
	serverPingVisualGatePromise = null
	setBestConnectionFilterLockState()
	syncServerFilterOptionStateUi()
	if (serverPingVisibilityEnabled) {
		refreshServerPingHints(true).catch(function() {})
	}
	return serverPingVisualGate
}

function getBestConnectionLockTitle() {
	if (shouldUpsellServerPingGate()) {
		return "Best Connection requires RoPro Plus or Rex."
	}
	if (serverPingVisualGate != null && typeof serverPingVisualGate === "object") {
		var reason = String(serverPingVisualGate.reason == null ? "" : serverPingVisualGate.reason).trim().toLowerCase()
		if (reason === "setting_off" && isServerPingGateTierAllowed()) {
			return "Enable server ping visibility in RoPro settings."
		}
	}
	return "Best Connection is temporarily unavailable."
}

function getLockedPingTitle() {
	if (shouldUpsellServerPingGate()) {
		return "Ping requires RoPro Plus or Rex."
	}
	if (serverPingVisualGate != null && typeof serverPingVisualGate === "object") {
		var reason = String(serverPingVisualGate.reason == null ? "" : serverPingVisualGate.reason).trim().toLowerCase()
		if (reason === "setting_off" && isServerPingGateTierAllowed()) {
			return "Enable server ping visibility in RoPro settings."
		}
	}
	return "Ping is temporarily unavailable."
}

function bindLockedPingUpgradeCta(node) {
	if (node == null || typeof node.getAttribute !== "function") {
		return
	}
	node.setAttribute("title", getLockedPingTitle())
	if (!shouldUpsellServerPingGate()) {
		node.removeAttribute("role")
		node.removeAttribute("tabindex")
		return
	}
	if (node.getAttribute("data-ropro-upgrade-bound") === "1") {
		return
	}
	node.setAttribute("data-ropro-upgrade-bound", "1")
	node.setAttribute("role", "button")
	node.setAttribute("tabindex", "0")
	function openUpgradeModal(e) {
		if (e != null) {
			e.preventDefault()
			e.stopPropagation()
		}
		upgradeModalServerFilters("connection")
	}
	node.addEventListener("click", openUpgradeModal)
	node.addEventListener("keydown", function(e) {
		if (e.key === "Enter" || e.key === " ") {
			openUpgradeModal(e)
		}
	})
}

function setBestConnectionFilterLockState() {
	var shouldLock = shouldShowBestConnectionTierLockState()
	if (shouldLock && activeServerFilterState.bestConnection === true) {
		activeServerFilterState.bestConnection = false
	}
	var lockTitle = getBestConnectionLockTitle()
	var buttonIds = ["bestConnectionButton", "bestConnectionButtonMini"]
	for (var i = 0; i < buttonIds.length; i++) {
		var button = document.getElementById(buttonIds[i])
		if (button == null) {
			continue
		}
		button.classList.toggle("ropro-server-filter-locked", shouldLock)
		if (shouldLock) {
			button.setAttribute("aria-disabled", "true")
			button.setAttribute("title", lockTitle)
		} else {
			button.removeAttribute("aria-disabled")
			button.removeAttribute("title")
		}
	}
}

function syncMaxPlayersSelectionState() {
	var maxPlayersSelections = document.querySelectorAll('#maxPlayersList .max-players-selection, #maxPlayersListMini .max-players-selection')
	for (var i = 0; i < maxPlayersSelections.length; i++) {
		var selection = maxPlayersSelections[i]
		var selectedValue = parsePlayerCountSelectionValue(selection)
		if (
			Number.isFinite(activeServerFilterState.maxPlayers) &&
			selectedValue === activeServerFilterState.maxPlayers
		) {
			selection.classList.add('active')
		} else {
			selection.classList.remove('active')
		}
	}
	var minPlayersSelections = document.querySelectorAll('#minPlayersList .min-players-selection, #minPlayersListMini .min-players-selection')
	for (var j = 0; j < minPlayersSelections.length; j++) {
		var minSelection = minPlayersSelections[j]
		var minSelectedValue = parsePlayerCountSelectionValue(minSelection)
		if (
			Number.isFinite(activeServerFilterState.minPlayers) &&
			minSelectedValue === activeServerFilterState.minPlayers
		) {
			minSelection.classList.add('active')
		} else {
			minSelection.classList.remove('active')
		}
	}
}

function syncServerFilterOptionStateUi() {
	setBestConnectionFilterLockState()
	setServerFilterOptionActiveState("not_full", activeServerFilterState.notFull === true)
	setServerFilterOptionActiveState("max_players", Number.isFinite(activeServerFilterState.maxPlayers))
	setServerFilterOptionActiveState("min_players", Number.isFinite(activeServerFilterState.minPlayers))
	setServerFilterOptionActiveState("random_shuffle", activeServerFilterState.randomShuffle === true)
	setServerFilterOptionActiveState("best_connection", activeServerFilterState.bestConnection === true && serverPingBestConnectionEnabled === true)
	syncMaxPlayersSelectionState()
}

function matchesActiveServerPopulationFilters(serverRow) {
	var playing = getServerPlayingCount(serverRow)
	if (activeServerFilterState.notFull) {
		var maxPlayers = getServerMaxPlayersCount(serverRow)
		if (!(playing >= 0 && maxPlayers > 0 && playing < maxPlayers)) {
			return false
		}
	}
	if (Number.isFinite(activeServerFilterState.maxPlayers)) {
		var selectedMaxPlayers = parseInt(activeServerFilterState.maxPlayers, 10)
		if (!(playing >= 0 && playing <= selectedMaxPlayers)) {
			return false
		}
	}
	if (Number.isFinite(activeServerFilterState.minPlayers)) {
		var selectedMinPlayers = parseInt(activeServerFilterState.minPlayers, 10)
		if (playing < selectedMinPlayers) {
			return false
		}
	}
	return true
}

function filterSampledServersByActiveFilters(sampledServers) {
	if (!Array.isArray(sampledServers)) {
		return []
	}
	var filteredServers = sampledServers.filter(matchesActiveServerPopulationFilters)
	if (activeServerFilterState.bestConnection) {
		filteredServers = filteredServers.filter(function(serverRow) {
			return Number.isFinite(getServerFilterPingValue(serverRow))
		})
		filteredServers.sort(function(leftRow, rightRow) {
			return getServerFilterPingValue(leftRow) - getServerFilterPingValue(rightRow)
		})
	} else if (activeServerFilterState.randomShuffle) {
		shuffleArray(filteredServers)
	} else {
		var sortOrder = getRobloxServerSortOrderFromSelect()
		filteredServers.sort(function(leftRow, rightRow) {
			var leftPlaying = getServerPlayingCount(leftRow)
			var rightPlaying = getServerPlayingCount(rightRow)
			var leftHasPlaying = Number.isFinite(leftPlaying) && leftPlaying >= 0
			var rightHasPlaying = Number.isFinite(rightPlaying) && rightPlaying >= 0
			if (!leftHasPlaying && !rightHasPlaying) {
				return 0
			}
			if (!leftHasPlaying) {
				return 1
			}
			if (!rightHasPlaying) {
				return -1
			}
			return sortOrder === "Asc" ? leftPlaying - rightPlaying : rightPlaying - leftPlaying
		})
	}
	return filteredServers
}

function ensureServerFilterLoadingBar() {
	if (document.getElementById('loadingBar') != null) {
		return
	}
	div = document.createElement('div')
	div.innerHTML = buildRoProLoader({id: "loadingBar", className: "ropro-branded-loader-compact-section", style: "transform: scale(0.82); width:120px; min-height:72px; margin:0 auto;"})
	appendToPublicRunningGamesHeader(div.childNodes[0])
}

function removeServerFilterLoadingBar() {
	var loadingBar = document.getElementById('loadingBar')
	if (loadingBar != null) {
		loadingBar.remove()
	}
}

async function waitForBestConnectionCursorWarmup(gameID) {
	var normalizedGameId = parseInt(gameID, 10)
	if (!Number.isFinite(normalizedGameId) || normalizedGameId <= 0) {
		return null
	}
	var waitStartedAt = Date.now()
	var latestPrimeStatus = await primeServerFilterCache(normalizedGameId, false).catch(function() {
		return null
	})
	while (Date.now() - waitStartedAt < SERVER_FILTER_BEST_CONNECTION_WAIT_TIMEOUT_MS) {
		var cursorCount = parseInt(latestPrimeStatus != null ? latestPrimeStatus.cursorCount : 0, 10)
		var exhausted = latestPrimeStatus != null && latestPrimeStatus.exhausted === true
		if (!Number.isFinite(cursorCount) || cursorCount < 0) {
			cursorCount = 0
		}
		if (cursorCount >= SERVER_FILTER_BEST_CONNECTION_CURSOR_TARGET || exhausted) {
			return latestPrimeStatus
		}
		latestPrimeStatus = await primeServerFilterCache(normalizedGameId, true).catch(function() {
			return latestPrimeStatus
		})
		await new Promise(resolve => {
			setTimeout(resolve, SERVER_FILTER_BEST_CONNECTION_WAIT_POLL_INTERVAL_MS)
		})
		latestPrimeStatus = await primeServerFilterCache(normalizedGameId, false).catch(function() {
			return latestPrimeStatus
		})
	}
	return latestPrimeStatus
}

async function resolveServerFilterPlayerCountBounds(placeId, fallbackMaxPlayerCount) {
	var normalizedPlaceId = parseInt(placeId, 10)
	if (!Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
		return normalizeServerFilterPlayerCountBounds(null, fallbackMaxPlayerCount)
	}
	if (
		serverFilterPlayerCountBoundsGameId === normalizedPlaceId &&
		serverFilterPlayerCountBounds != null &&
		typeof serverFilterPlayerCountBounds === "object"
	) {
		return serverFilterPlayerCountBounds
	}
	if (
		serverFilterPlayerCountBoundsGameId === normalizedPlaceId &&
		serverFilterPlayerCountBoundsPromise != null
	) {
		return serverFilterPlayerCountBoundsPromise
	}
	serverFilterPlayerCountBoundsGameId = normalizedPlaceId
	var requestGameId = normalizedPlaceId
	serverFilterPlayerCountBoundsPromise = (async function() {
		var latestPrimeStatus = await primeServerFilterCache(requestGameId, false).catch(function() {
			return null
		})
		var cursorCount = parseInt(latestPrimeStatus != null ? latestPrimeStatus.cursorCount : 0, 10)
		var exhausted = latestPrimeStatus != null && latestPrimeStatus.exhausted === true
		if (!Number.isFinite(cursorCount) || cursorCount < 0) {
			cursorCount = 0
		}
		if (cursorCount < SERVER_FILTER_PLAYER_COUNT_CURSOR_TARGET && !exhausted) {
			await waitForBestConnectionCursorWarmup(requestGameId)
		}
		var sampledServers = await fetchServerFilterRandomShuffle(requestGameId, {
			minServers: SERVER_FILTER_PLAYER_COUNT_SAMPLE_SIZE
		}).catch(function() {
			return []
		})
		var derivedBounds = deriveCursorBasedPlayerCountBounds(sampledServers, fallbackMaxPlayerCount)
		if (derivedBounds == null) {
			derivedBounds = normalizeServerFilterPlayerCountBounds(null, fallbackMaxPlayerCount)
		}
		if (serverFilterPlayerCountBoundsGameId === requestGameId) {
			serverFilterPlayerCountBounds = derivedBounds
		}
		return derivedBounds
	})()
		.catch(function() {
			return normalizeServerFilterPlayerCountBounds(null, fallbackMaxPlayerCount)
		})
		.finally(function() {
			if (serverFilterPlayerCountBoundsGameId === requestGameId) {
				serverFilterPlayerCountBoundsPromise = null
			}
		})
	return serverFilterPlayerCountBoundsPromise
}

async function applyActiveServerFilters(placeId, options = {}) {
	var normalizedPlaceId = parseInt(placeId, 10)
	if (!Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
		return false
	}
	if (!hasActiveServerFilters()) {
		return false
	}
	var impossibleFilterStatus = getImpossibleServerFilterStatusMessage()
	if (impossibleFilterStatus.length > 0) {
		showServerFilterStatus(impossibleFilterStatus)
		return false
	}
	var normalizedVisibleCount = parseInt(options.visibleCount, 10)
	var pageSize = getServerFilterPageSize()
	if (!Number.isFinite(normalizedVisibleCount) || normalizedVisibleCount <= 0) {
		normalizedVisibleCount = pageSize
	}
	normalizedVisibleCount = Math.max(pageSize, normalizedVisibleCount)
	ensureServerFilterLoadingBar()
	try {
		await ensureServerFilterCacheWarmup(normalizedPlaceId)
		if (options.refreshSample === true) {
			await primeServerFilterCache(normalizedPlaceId, true).catch(function() {})
		}
		if (activeServerFilterState.bestConnection) {
			await waitForBestConnectionCursorWarmup(normalizedPlaceId)
		}
			var minServerSampleSize = activeServerFilterState.bestConnection
				? SERVER_FILTER_BEST_CONNECTION_SAMPLE_SIZE
				: SERVER_FILTER_DEFAULT_SAMPLE_SIZE
			var sampledServers = await fetchServerFilterRandomShuffle(normalizedPlaceId, {
				refresh: options.refreshSample === true,
				minServers: minServerSampleSize
			}).catch(function() {
				return []
			})
			if (!Array.isArray(sampledServers)) {
				sampledServers = []
			}
			if (sampledServers.length === 0) {
				await primeServerFilterCache(normalizedPlaceId, true).catch(function() {})
				var refreshedSampleRows = await fetchServerFilterRandomShuffle(normalizedPlaceId, {
					refresh: true,
					minServers: minServerSampleSize
				}).catch(function() {
					return []
				})
				if (Array.isArray(refreshedSampleRows)) {
					sampledServers = refreshedSampleRows
				} else {
					sampledServers = []
				}
			}
			cacheServerPingHints(sampledServers)
			hydrateServerFilterPingRows(sampledServers)
			var filteredServers = filterSampledServersByActiveFilters(sampledServers)
				if (
					activeServerFilterState.bestConnection &&
					filteredServers.length === 0 &&
					Array.isArray(sampledServers) &&
					sampledServers.length > 0
				) {
					var populationFilteredServers = sampledServers.filter(matchesActiveServerPopulationFilters)
					var hasPopulationCountFilters =
						Number.isFinite(activeServerFilterState.minPlayers) ||
						Number.isFinite(activeServerFilterState.maxPlayers)
					if (hasPopulationCountFilters && populationFilteredServers.length === 0) {
						var populationFallbackSortOrders = getPopulationFallbackPingHintSortOrders()
						for (var populationSortIndex = 0; populationSortIndex < populationFallbackSortOrders.length; populationSortIndex++) {
							await fetchServerPingHints(normalizedPlaceId, {
								refresh: false,
								minServers: SERVER_FILTER_POPULATION_FALLBACK_HINT_SAMPLE_SIZE,
								sortOrder: populationFallbackSortOrders[populationSortIndex]
							}).catch(function() {
								return []
							})
							var refreshedSampleRows = await fetchServerFilterRandomShuffle(normalizedPlaceId, {
								refresh: true,
								minServers: minServerSampleSize
							}).catch(function() {
								return sampledServers
							})
							if (Array.isArray(refreshedSampleRows)) {
								sampledServers = refreshedSampleRows
							}
							cacheServerPingHints(sampledServers)
							hydrateServerFilterPingRows(sampledServers)
							populationFilteredServers = sampledServers.filter(matchesActiveServerPopulationFilters)
							filteredServers = filterSampledServersByActiveFilters(sampledServers)
							if (populationFilteredServers.length > 0 || filteredServers.length > 0) {
								break
							}
						}
					}
					var hasPopulationMatchesWithoutPing =
						populationFilteredServers.length > 0 &&
						populationFilteredServers.every(function(serverRow) {
							return !Number.isFinite(getServerFilterPingValue(serverRow))
						})
					if (hasPopulationMatchesWithoutPing) {
						var pingHintSortOrders = getPopulationFallbackPingHintSortOrders()
						for (var pingSortIndex = 0; pingSortIndex < pingHintSortOrders.length; pingSortIndex++) {
							var pingHintRows = await fetchServerPingHints(normalizedPlaceId, {
								refresh: false,
								minServers: SERVER_FILTER_POPULATION_FALLBACK_HINT_SAMPLE_SIZE,
								sortOrder: pingHintSortOrders[pingSortIndex]
							}).catch(function() {
								return []
							})
							cacheServerPingHints(pingHintRows)
							hydrateServerFilterPingRows(sampledServers)
							filteredServers = filterSampledServersByActiveFilters(sampledServers)
							if (filteredServers.length > 0) {
								break
							}
						}
					}
				}
			var filterLabel = getActiveServerFilterSummaryLabel()
			var applied = applyServerFilterResults(normalizedPlaceId, filteredServers, false, filterLabel, {
				visibleCount: normalizedVisibleCount,
				sampledServerCount: Array.isArray(sampledServers) ? sampledServers.length : 0
			})
			if (applied && options.scrollIntoView === true) {
				scrollPublicRunningGamesHeaderIntoView()
			}
		return applied
	} finally {
		removeServerFilterLoadingBar()
	}
}

function primeServerFilterCache(gameID, refresh = false) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PrimeServerFilterCache", gameID: gameID, refresh: refresh === true}, 
			function(data) {
				resolve(data)
		})
	})
}

function ensureServerFilterCacheWarmup(gameID) {
	if (serverFilterCacheWarmupPromise != null) {
		return serverFilterCacheWarmupPromise
	}
	serverFilterCacheWarmupPromise = primeServerFilterCache(gameID, false)
		.catch(function() {
			return null
		})
		.finally(function() {
			serverFilterCacheWarmupPromise = null
		})
	return serverFilterCacheWarmupPromise
}

function startServerFilterCacheRefreshLoop(gameID) {
	var normalizedGameId = parseInt(gameID)
	if (!Number.isFinite(normalizedGameId) || normalizedGameId <= 0) {
		return
	}
	if (
		serverFilterCacheRefreshInterval != null &&
		serverFilterCacheGameId != null &&
		serverFilterCacheGameId !== normalizedGameId
	) {
		clearInterval(serverFilterCacheRefreshInterval)
		serverFilterCacheRefreshInterval = null
		serverFilterCacheWarmupPromise = null
		resetServerPingHintsCache()
		resetServerFilterPlayerCountBoundsState()
	}
	if (serverFilterCacheRefreshInterval != null) {
		return
	}
	serverFilterCacheGameId = normalizedGameId
	resetServerFilterPlayerCountBoundsState()
	ensureServerFilterCacheWarmup(normalizedGameId)
	serverFilterCacheRefreshInterval = setInterval(function() {
		if (document.visibilityState !== "visible" || !document.hasFocus()) {
			return
		}
		var pathMatch = window.location.pathname.match(/\/(?:[a-z]{2}-[a-z]{2}\/)?(?:games|discover)\/(\d+)/i)
		if (pathMatch == null || pathMatch.length < 2) {
			clearInterval(serverFilterCacheRefreshInterval)
			serverFilterCacheRefreshInterval = null
			serverFilterCacheWarmupPromise = null
			serverFilterCacheGameId = null
			resetServerPingHintsCache()
			resetServerFilterPlayerCountBoundsState()
			return
		}
		var currentGameId = parseInt(pathMatch[1], 10)
		if (Number.isFinite(currentGameId) && currentGameId > 0 && currentGameId !== normalizedGameId) {
			clearInterval(serverFilterCacheRefreshInterval)
			serverFilterCacheRefreshInterval = null
			serverFilterCacheWarmupPromise = null
			serverFilterCacheGameId = null
			resetServerPingHintsCache()
			resetServerFilterPlayerCountBoundsState()
			return
		}
		primeServerFilterCache(normalizedGameId, true).catch(function() {})
		}, SERVER_FILTER_CACHE_REFRESH_INTERVAL_MS)
}

function fetchDiscordID(discordUrl) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_discord_id", {link: discordUrl}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchInvite(key) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_invite", {key: key}, 
			function(data) {
				resolve(data)
		})
	})
}

function createInvite(universeid, serverid) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_create_invite", {universeId: universeid, serverId: serverid}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchGameInfo(myUniverseId) {
	var normalizedUniverseId = parseInt(myUniverseId, 10)
	if (!Number.isFinite(normalizedUniverseId) || normalizedUniverseId <= 0) {
		return new Promise(resolve => {
			chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games?universeIds=" + myUniverseId}, 
				function(data) {
					resolve(data)
			})
		})
	}
	var cacheKey = String(normalizedUniverseId)
	var now = Date.now()
	if (gameInfoRequestCacheByUniverse.hasOwnProperty(cacheKey)) {
		var cachedEntry = gameInfoRequestCacheByUniverse[cacheKey]
		if (
			cachedEntry != null &&
			typeof cachedEntry === "object" &&
			Number.isFinite(cachedEntry.fetchedAt) &&
			now - cachedEntry.fetchedAt <= GAME_INFO_REQUEST_CACHE_WINDOW_MS
		) {
			return Promise.resolve(cachedEntry.data)
		}
		delete gameInfoRequestCacheByUniverse[cacheKey]
	}
	if (gameInfoRequestInflightByUniverse.hasOwnProperty(cacheKey)) {
		return gameInfoRequestInflightByUniverse[cacheKey]
	}
	var requestPromise = new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games?universeIds=" + normalizedUniverseId}, 
			function(data) {
				resolve(data)
		})
	})
		.then(function(data) {
			gameInfoRequestCacheByUniverse[cacheKey] = {
				data: data,
				fetchedAt: Date.now()
			}
			return data
		})
		.finally(function() {
			delete gameInfoRequestInflightByUniverse[cacheKey]
		})
	gameInfoRequestInflightByUniverse[cacheKey] = requestPromise
	return requestPromise
}

function fetchPlaceInfo(placeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games/multiget-place-details?placeIds=" + placeId}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchVotes(myUniverseId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games/votes?universeIds=" + myUniverseId}, 
			function(data) {
				resolve(data)
		})
	})
}

function isGameCacheTransientErrorResponse(response) {
	if (response == null || response === "ERROR") {
		return true
	}
	if (typeof response === "string") {
		var normalized = response.trim().toUpperCase()
		return normalized === "" || normalized === "ERROR"
	}
	return false
}

function isGameInfoResponseShapeValid(response) {
	return response != null && typeof response === "object" && Array.isArray(response.data)
}

function isPlaceInfoResponseShapeValid(response) {
	return Array.isArray(response)
}

function isVotesResponseShapeValid(response) {
	return response != null && typeof response === "object" && Array.isArray(response.data)
}

function waitForGameCacheRetry(delayMs) {
	return new Promise(resolve => {
		setTimeout(resolve, delayMs)
	})
}

function getGameCacheRefreshStartupDelayMs() {
	return Math.floor(Math.random() * (GAME_CACHE_REFRESH_STARTUP_JITTER_MAX_MS + 1))
}

function scheduleGameCacheRefreshFromClient(placeId, fallbackUniverseId, fallbackGameData) {
	var normalizedPlaceId = parseGameCacheInteger(placeId, 1, GAME_CACHE_MAX_ID, false)
	if (normalizedPlaceId == null) {
		return Promise.resolve()
	}
	var inflightKey = String(normalizedPlaceId)
	if (gameCacheRefreshAttemptedByPlace.hasOwnProperty(inflightKey)) {
		return Promise.resolve()
	}
	if (gameCacheRefreshScheduledByPlace.hasOwnProperty(inflightKey)) {
		return gameCacheRefreshScheduledByPlace[inflightKey]
	}
	var startupDelayMs = getGameCacheRefreshStartupDelayMs()
	var refreshPromise = waitForGameCacheRetry(startupDelayMs)
		.then(function() {
			return refreshGameCacheFromClient(normalizedPlaceId, fallbackUniverseId, fallbackGameData)
		})
		.finally(function() {
			delete gameCacheRefreshScheduledByPlace[inflightKey]
		})
	gameCacheRefreshScheduledByPlace[inflightKey] = refreshPromise
	return refreshPromise
}

async function fetchGameCacheWithBackoff(requestFn, isValidShapeFn) {
	for (var attempt = 0; attempt < GAME_CACHE_METADATA_MAX_ATTEMPTS; attempt++) {
		var response = null
		try {
			response = await requestFn()
		} catch (_) {
			response = "ERROR"
		}
		var isValidShape = typeof isValidShapeFn === "function" ? isValidShapeFn(response) : true
		var shouldRetry = isGameCacheTransientErrorResponse(response) || !isValidShape
		if (!shouldRetry || attempt >= GAME_CACHE_METADATA_MAX_ATTEMPTS - 1) {
			return response
		}
		var delayMs = Math.min(
			GAME_CACHE_METADATA_RETRY_MAX_MS,
			GAME_CACHE_METADATA_RETRY_BASE_MS * Math.pow(2, attempt)
		)
		var jitterMs = Math.floor(Math.random() * 120)
		await waitForGameCacheRetry(delayMs + jitterMs)
	}
	return "ERROR"
}

function fetchGameInfoWithBackoff(universeId) {
	return fetchGameCacheWithBackoff(
		function() {
			return fetchGameInfo(universeId)
		},
		isGameInfoResponseShapeValid
	)
}

function fetchPlaceInfoWithBackoff(placeId) {
	return fetchGameCacheWithBackoff(
		function() {
			return fetchPlaceInfo(placeId)
		},
		isPlaceInfoResponseShapeValid
	)
}

function fetchVotesWithBackoff(universeId) {
	return fetchGameCacheWithBackoff(
		function() {
			return fetchVotes(universeId)
		},
		isVotesResponseShapeValid
	)
}

function fetchGameCacheRefreshStatus(placeId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_game_cache_refresh_status", {placeId: parseInt(placeId, 10)},
			function(data) {
				resolve(data)
			}
		)
	})
}

function upsertGameCacheFromClient(placeId, gameData) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_upsert_game_cache_from_client", {placeId: parseInt(placeId, 10), game: gameData},
			function(data) {
				resolve(data)
			}
		)
	})
}

function parseGameCacheInteger(value, min, max) {
	if (value == null || value === "") {
		return null
	}
	var parsed = parseInt(value, 10)
	if (!Number.isFinite(parsed)) {
		return null
	}
	if (Number.isFinite(min) && parsed < min) {
		return null
	}
	if (Number.isFinite(max) && parsed > max) {
		return null
	}
	return parsed
}

function normalizeGameCacheText(value, maxLength, allowEmpty) {
	if (value == null) {
		return allowEmpty ? "" : null
	}
	var normalized = stripTags(String(value))
	normalized = normalized.replace(/[\u0000-\u001F\u007F]/g, " ")
	normalized = normalized.replace(/\s+/g, " ").trim()
	if (normalized.length === 0) {
		return allowEmpty ? "" : null
	}
	if (Number.isFinite(maxLength) && maxLength > 0 && normalized.length > maxLength) {
		normalized = normalized.slice(0, maxLength)
	}
	return normalized
}

function extractGameCacheVotesRow(universeId, votesResponse) {
	var normalizedUniverseId = parseGameCacheInteger(universeId, 1, GAME_CACHE_MAX_ID, false)
	if (normalizedUniverseId == null) {
		return null
	}
	if (votesResponse == null || typeof votesResponse !== "object" || !Array.isArray(votesResponse.data)) {
		return null
	}
	for (var i = 0; i < votesResponse.data.length; i++) {
		var row = votesResponse.data[i]
		if (row == null || typeof row !== "object") {
			continue
		}
		var rowId = parseGameCacheInteger(row.id, 1, GAME_CACHE_MAX_ID, false)
		if (rowId === normalizedUniverseId) {
			return row
		}
	}
	for (var j = 0; j < votesResponse.data.length; j++) {
		var fallbackRow = votesResponse.data[j]
		if (fallbackRow != null && typeof fallbackRow === "object") {
			return fallbackRow
		}
	}
	return null
}

function normalizeGameCacheGamePayload(placeId, gameData) {
	if (gameData == null || typeof gameData !== "object") {
		return null
	}
	var normalizedPlaceId = parseGameCacheInteger(placeId, 1, GAME_CACHE_MAX_ID, false)
	if (normalizedPlaceId == null) {
		return null
	}
	var universeId = parseGameCacheInteger(gameData.id, 1, GAME_CACHE_MAX_ID, false)
	if (universeId == null) {
		return null
	}
	var rootPlaceId = parseGameCacheInteger(gameData.rootPlaceId, 1, GAME_CACHE_MAX_ID, true)
	if (rootPlaceId == null) {
		rootPlaceId = normalizedPlaceId
	}
	var creator = gameData.creator != null && typeof gameData.creator === "object" ? gameData.creator : {}
	var creatorId = parseGameCacheInteger(
		gameData.creatorId != null ? gameData.creatorId : creator.id,
		0,
		GAME_CACHE_MAX_ID,
		true
	)
	var playing = parseGameCacheInteger(gameData.playing, 0, 1000000000, true)
	var visits = parseGameCacheInteger(gameData.visits, 0, GAME_CACHE_MAX_ID, true)
	var favoritedCount = parseGameCacheInteger(gameData.favoritedCount, 0, GAME_CACHE_MAX_ID, true)
	return {
		id: universeId,
		rootPlaceId: rootPlaceId,
		creatorId: creatorId == null ? 0 : creatorId,
		genre: normalizeGameCacheText(gameData.genre, 80, true),
		genre_l1: normalizeGameCacheText(gameData.genre_l1, 80, true),
		genre_l2: normalizeGameCacheText(gameData.genre_l2, 80, true),
		untranslated_genre_l1: normalizeGameCacheText(gameData.untranslated_genre_l1, 80, true),
		playing: playing == null ? 0 : playing,
		visits: visits == null ? 0 : visits,
		favoritedCount: favoritedCount == null ? 0 : favoritedCount
	}
}

function mergeGameCacheVotePayload(gamePayload, voteRow) {
	if (gamePayload == null || typeof gamePayload !== "object" || voteRow == null || typeof voteRow !== "object") {
		return gamePayload
	}
	var upVotes = parseGameCacheInteger(voteRow.upVotes, 0, GAME_CACHE_MAX_ID, true)
	var downVotes = parseGameCacheInteger(voteRow.downVotes, 0, GAME_CACHE_MAX_ID, true)
	if (upVotes != null || downVotes != null) {
		gamePayload.upVotes = upVotes == null ? 0 : upVotes
		gamePayload.downVotes = downVotes == null ? 0 : downVotes
	}
	return gamePayload
}

async function refreshGameCacheFromClient(placeId, fallbackUniverseId, fallbackGameData) {
	var normalizedPlaceId = parseGameCacheInteger(placeId, 1, GAME_CACHE_MAX_ID, false)
	if (normalizedPlaceId == null) {
		return
	}
	var inflightKey = String(normalizedPlaceId)
	if (gameCacheRefreshAttemptedByPlace.hasOwnProperty(inflightKey)) {
		return
	}
	if (gameCacheRefreshInflightByPlace.hasOwnProperty(inflightKey)) {
		return await gameCacheRefreshInflightByPlace[inflightKey]
	}
	var now = Date.now()
	var lastAttemptAt = gameCacheRefreshLastAttemptAtByPlace[inflightKey]
	if (Number.isFinite(lastAttemptAt) && now - lastAttemptAt < GAME_CACHE_REFRESH_RETRY_WINDOW_MS) {
		return
	}
	gameCacheRefreshLastAttemptAtByPlace[inflightKey] = now
	var refreshPromise = (async function() {
		gameCacheRefreshAttemptedByPlace[inflightKey] = true
		var refreshStatus = await fetchGameCacheRefreshStatus(normalizedPlaceId)
		if (
			refreshStatus == null ||
			typeof refreshStatus !== "object" ||
			refreshStatus.needsRefresh !== true
		) {
			return
		}
		var universeId = parseGameCacheInteger(fallbackUniverseId, 1, GAME_CACHE_MAX_ID, true)
		if (universeId == null) {
			universeId = parseGameCacheInteger(refreshStatus.universeId, 1, GAME_CACHE_MAX_ID, true)
		}
		var gamePayload = normalizeGameCacheGamePayload(normalizedPlaceId, fallbackGameData)
		if (gamePayload == null && universeId != null) {
			var gameInfoResponse = await fetchGameInfoWithBackoff(universeId)
			if (
				gameInfoResponse != null &&
				typeof gameInfoResponse === "object" &&
				Array.isArray(gameInfoResponse.data) &&
				gameInfoResponse.data.length > 0
			) {
				gamePayload = normalizeGameCacheGamePayload(normalizedPlaceId, gameInfoResponse.data[0])
			}
		}
		if (gamePayload == null && universeId == null) {
			var placeInfoResponse = await fetchPlaceInfoWithBackoff(normalizedPlaceId)
			if (
				Array.isArray(placeInfoResponse) &&
				placeInfoResponse.length > 0 &&
				placeInfoResponse[0] != null &&
				typeof placeInfoResponse[0] === "object"
			) {
				universeId = parseGameCacheInteger(placeInfoResponse[0].universeId, 1, GAME_CACHE_MAX_ID, true)
			}
			if (universeId != null) {
				var resolvedGameInfoResponse = await fetchGameInfoWithBackoff(universeId)
				if (
					resolvedGameInfoResponse != null &&
					typeof resolvedGameInfoResponse === "object" &&
					Array.isArray(resolvedGameInfoResponse.data) &&
					resolvedGameInfoResponse.data.length > 0
				) {
					gamePayload = normalizeGameCacheGamePayload(normalizedPlaceId, resolvedGameInfoResponse.data[0])
				}
			}
		}
			if (gamePayload == null) {
				return
			}
			var normalizedPlaying = parseGameCacheInteger(gamePayload.playing, 0, 1000000000, true)
			if (normalizedPlaying == null || normalizedPlaying < GAME_CACHE_MIN_PLAYING_FOR_UPSERT) {
				return
			}
			gamePayload.playing = normalizedPlaying
			var votesResponse = null
			try {
				votesResponse = await fetchVotesWithBackoff(gamePayload.id)
		} catch (_) {}
		var voteRow = extractGameCacheVotesRow(gamePayload.id, votesResponse)
		if (voteRow != null) {
			gamePayload = mergeGameCacheVotePayload(gamePayload, voteRow)
		}
		await upsertGameCacheFromClient(normalizedPlaceId, gamePayload)
	})()
		.catch(function() {})
		.finally(function() {
			delete gameCacheRefreshInflightByPlace[inflightKey]
		})
	gameCacheRefreshInflightByPlace[inflightKey] = refreshPromise
	return await refreshPromise
}

function fetchRandomServer(placeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetRandomServer", gameID: placeId}, 
			function(data) {
				resolve(data)
			})
	})
}

function normalizeRandomServerPayload(randomServerPayload) {
	if (randomServerPayload == null) {
		return null
	}
	var normalizedId = ""
	if (typeof randomServerPayload === "string") {
		normalizedId = sanitizeServerId(randomServerPayload)
	} else if (typeof randomServerPayload === "object") {
		normalizedId =
			sanitizeServerId(randomServerPayload.id) ||
			sanitizeServerId(randomServerPayload.server) ||
			sanitizeServerId(randomServerPayload.serverId) ||
			sanitizeServerId(randomServerPayload.jobId);
	}
	return normalizedId.length > 0 ? { id: normalizedId } : null
}

function closeRandomServerModal() {
	var modalContainer = document.getElementById('randomGameModalContainer')
	if (modalContainer != null) {
		modalContainer.remove()
	}
}

function launchCloudPlay(serverID = null, accessCode = null) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "LaunchCloudPlay", placeID: globalGameId, serverID: serverID, accessCode: accessCode}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchThumbnailBatch(batch) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://thumbnails.roblox.com/v1/batch", jsonData: JSON.stringify(batch)}, 
			function(data) {
				resolve(data)
			})
	})
}

function loadPlayerThumbnails(userIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userIds.join() + "&size=420x420&format=Png&isCircular=false"}, 
			function(data) {
				for (var i = 0; i < data.data.length; i++) {
					 $('.ropro-player-thumbnail-' + data.data[i].targetId).attr("src", stripTags(data.data[i].imageUrl))
				}
			}
		)
	})
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
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.getVisualGatePromise === "function"
	) {
		return roproApiAdapter.getVisualGatePromise(gateKey)
	}
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetVisualGate", gateKey: gateKey},
			function(data) {
				resolve(data)
			}
		)
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

function getStorage(key) {
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

function checkVerification() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "CheckVerification"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function addCommas(nStr){
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

async function getPlayerThumbnails(playerTokens, thumbnailType = "AvatarHeadshot") {
	if (!Array.isArray(playerTokens) || playerTokens.length === 0) {
		return
	}
	var fallbackThumbnailUrl = chrome.runtime.getURL('/images/empty.png')
	var dedupedTokens = []
	var seenTokens = {}
	for (var tokenIndex = 0; tokenIndex < playerTokens.length; tokenIndex++) {
		var normalizedToken = stripTags(playerTokens[tokenIndex])
		if (typeof normalizedToken !== "string" || normalizedToken.length === 0 || seenTokens.hasOwnProperty(normalizedToken)) {
			continue
		}
		seenTokens[normalizedToken] = true
		dedupedTokens.push(normalizedToken)
	}
	for (var i = 0; i < dedupedTokens.length; i += 100) {
		var pendingChunk = dedupedTokens.slice(i, i + 100)
		for (var attempt = 0; attempt < 2 && pendingChunk.length > 0; attempt++) {
			var batch = []
			for (var j = 0; j < pendingChunk.length; j++) {
				batch.push({
					format: "png",
					requestId: "0:" + pendingChunk[j] + ":AvatarHeadshot:150x150:png:regular",
					size: "150x150",
					targetId: 0,
					token: pendingChunk[j],
					type: thumbnailType
				})
			}
			var thumbnails = await fetchThumbnailBatch(batch)
			var unresolvedTokens = {}
			for (var pendingIndex = 0; pendingIndex < pendingChunk.length; pendingIndex++) {
				unresolvedTokens[pendingChunk[pendingIndex]] = true
			}
			if (thumbnails != null && Array.isArray(thumbnails.data)) {
				for (var k = 0; k < thumbnails.data.length; k++) {
					if (thumbnails.data[k] == null || typeof thumbnails.data[k] !== "object") {
						continue
					}
					var requestId = typeof thumbnails.data[k].requestId === "string" ? thumbnails.data[k].requestId : ""
					var requestSegments = requestId.split(":")
					if (requestSegments.length < 2) {
						continue
					}
					var playerToken = stripTags(requestSegments[1])
					if (playerToken.length === 0) {
						continue
					}
					delete unresolvedTokens[playerToken]
					var imageUrl = typeof thumbnails.data[k].imageUrl === "string" ? stripTags(thumbnails.data[k].imageUrl) : ""
					if (imageUrl.length > 0) {
						$('.ropro-player-thumbnail-' + playerToken).attr("src", imageUrl)
					}
				}
			}
			pendingChunk = Object.keys(unresolvedTokens)
			if (attempt === 0 && pendingChunk.length > 0) {
				await new Promise(resolve => {
					setTimeout(resolve, 250)
				})
			}
		}
		for (var unresolvedIndex = 0; unresolvedIndex < pendingChunk.length; unresolvedIndex++) {
			$('.ropro-player-thumbnail-' + pendingChunk[unresolvedIndex]).attr("src", fallbackThumbnailUrl)
		}
	}
}

var loadMoreInitialized = false

async function loadServerPage(gameID, index, reverse){
	serversHTML = ""
	serverPage = Array.isArray(customServerList) ? customServerList : []
	var pageSize = getServerFilterPageSize()
	var normalizedVisibleCount = parseInt(index, 10)
	if (!Number.isFinite(normalizedVisibleCount) || normalizedVisibleCount <= 0) {
		normalizedVisibleCount = pageSize
	}
	normalizedVisibleCount = Math.max(pageSize, normalizedVisibleCount)
	var maxRenderCount = Math.min(serverPage.length, normalizedVisibleCount)
	if (document.getElementsByClassName('btr-server-pager').length > 0) {
		document.getElementsByClassName('btr-server-pager')[0].style.display = "none"
	}
	isCardList = $('.card-list.rbx-public-game-server-item-container').length > 0
	setRoProFilteredServerGridActive(isCardList)
	var playerTokens = []
	for (i = 0; i < maxRenderCount; i++) {
		server = serverPage[i]
		if (server == null || typeof server !== "object") {
			continue
		}
		var serverPing = parseServerPingValue(server.ping)
		gameId = sanitizeServerId(server.id)
		if (gameId.length === 0) {
			continue
		}
		placeId = parseInt(globalGameId)
		var playingCount = parseInt(server.playing, 10)
		if (!Number.isFinite(playingCount) || playingCount < 0) {
			playingCount = 0
		}
		var maxPlayersCount = parseInt(server.maxPlayers, 10)
		if (!Number.isFinite(maxPlayersCount) || maxPlayersCount <= 0) {
			maxPlayersCount = 1
		}
		if (playingCount > maxPlayersCount) {
			playingCount = maxPlayersCount
		}
		var playerCountGaugePercent = Math.max(0, Math.min(100, Math.round(playingCount / maxPlayersCount * 100)))
		playerCount = playingCount + " of " + maxPlayersCount + " people max"
		playersHTML = ""
		var serverPlayerTokens = Array.isArray(server.playerTokens) ? server.playerTokens : []
		for (j = 0; j < Math.min(serverPlayerTokens.length, 5); j++) {
			playerToken = stripTags(serverPlayerTokens[j])
			if (typeof playerToken !== "string" || playerToken.length === 0) {
				continue
			}
			if (isCardList) {
				playerHTML = `<span class="avatar avatar-headshot-md player-avatar"><span class="thumbnail-2d-container avatar-card-image"><img class="ropro-player-thumbnail-${stripTags(playerToken)}" src="${chrome.runtime.getURL('/images/empty.png')}" alt="" title=""></span></span>`
			} else {
				playerHTML = `<span class="special-span avatar avatar-headshot-sm player-avatar"><a class="avatar-card-link"><img class="ropro-player-thumbnail-${stripTags(playerToken)} avatar-card-image"></a></span>`
			}
			playersHTML += playerHTML
			playerTokens.push(playerToken)
		}
		var shortServerId = "";
		if (gameId.split("-").length >= 3) {
			shortServerId = gameId.split("-")[1] + "-" + gameId.split("-")[2]
		} else {
			shortServerId = "Null"
		}
		if (isCardList) {
			serversHTML += `<li class="rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6" data-gameid="${gameId}" data-placeid="${placeId}" data-server-ping="${Number.isFinite(serverPing) ? serverPing : ""}"><div class="card-item card-item-public-server">
			<div class="player-thumbnails-container">${playersHTML}${playingCount > 5 ? `<span class="avatar avatar-headshot-md player-avatar hidden-players-placeholder">+${playingCount - 5}</span>` : ``}</div>
			<div class="rbx-public-game-server-details game-server-details">
			<div class="text-info rbx-game-status rbx-public-game-server-status text-overflow">${playerCount}</div>
			<div class="server-player-count-gauge border"><div class="gauge-inner-bar border" style="width: ${playerCountGaugePercent}%;"></div></div>
			<span><button type="button" class="btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width" data-gameid="${sanitizeServerId(gameId)}" data-placeid="${placeId}">Join</button></span>
			<div class="server-id-text text-info xsmall">ID: ${stripTags(shortServerId)}</div>
			</div></div></li>`
		} else {
			serversHTML += `<li class="stack-row rbx-public-game-server-item ropro-checked" data-gameid="${gameId}" data-placeid="${placeId}" data-server-ping="${Number.isFinite(serverPing) ? serverPing : ""}"><div class="section-header">
						<div class="link-menu rbx-public-game-server-menu"></div></div>
						<div class="section-left rbx-public-game-server-details">
								<div class="text-info rbx-game-status rbx-public-game-server-status">${playerCount}</div>
								<div class="rbx-public-game-server-alert hidden"><span class="icon-remove"></span></div>
								<a class="btn-full-width btn-control-xs rbx-public-game-server-join" href="#" data-gameid="${sanitizeServerId(gameId)}" data-placeid="${placeId}">Join</a></div>
							<div class="section-right rbx-public-game-server-players">${playersHTML}</div></li>`
		}
	}
	if (playerTokens.length > 0) {
		getPlayerThumbnails(playerTokens)
	}
	pageIndex = maxRenderCount
	serverFilterVisibleCount = maxRenderCount
	var filterLoader = document.getElementById('maxPlayersLoadingBar')
	if (filterLoader != null) {
		filterLoader.style.display = "none"
	}
	showServerFilterStatus("")
	$('#rbx-public-game-server-item-container').html(serversHTML)
	var hasMoreCustomServers = serverPage.length > maxRenderCount
	if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
		document.getElementsByClassName('rbx-public-running-games-footer')[0].style.display = "none"
	}
	if (document.getElementsByClassName('ropro-running-games-footer').length == 0) {
		div = document.createElement('div')
		div.innerHTML = `<div class="ropro-running-games-footer"><button type="button" id="loadMoreButton" class="btn-control-sm btn-full-width" style="display: block;">Load More</button></div>`
		if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
			document.getElementsByClassName('rbx-public-running-games-footer')[0].parentNode.appendChild(div.childNodes[0])
		} else if (document.getElementById('rbx-public-running-games') != null) {
			document.getElementById('rbx-public-running-games').appendChild(div.childNodes[0])
		}
	}
	if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
		document.getElementsByClassName('ropro-running-games-footer')[0].style.display = hasMoreCustomServers ? "block" : "none"
	}
	$('#loadMoreButton').off('click').on('click', function() {
		if (!hasActiveServerFilters()) {
			return
		}
		applyActiveServerFilters(gameID, {
			visibleCount: serverFilterVisibleCount + getServerFilterPageSize()
		}).catch(function() {})
	})
	loadMoreInitialized = hasMoreCustomServers
	$('.rbx-refresh').off('click.roproServerFilters').on('click.roproServerFilters', function() {
		if (!isPublicRunningGamesRefreshButton(this)) {
			return
		}
		if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
			document.getElementsByClassName('ropro-running-games-footer')[0].style.display = "none"
		}
		if (hasActiveServerFilters()) {
			setTimeout(function() {
				applyActiveServerFilters(gameID, {
					refreshSample: true,
					visibleCount: Math.max(getServerFilterPageSize(), serverFilterVisibleCount)
				}).catch(function() {})
			}, SERVER_FILTER_LOAD_MORE_DELAY_MS)
		}
	})
}

function addRandomServerButton() {
	var randomServerButtonInterval = setInterval(function() {
		var container = document.getElementById('game-details-play-button-container')
		if (container == null) {
			return
		}
		var playButton = getPrimaryGamePlayButton(container)
		if (playButton == null) {
			return
		}
		clearInterval(randomServerButtonInterval)
		if (container.getElementsByClassName('error-message').length == 0 && container.getElementsByClassName('icon-robux-white').length == 0) {
			var randomServerButton = container.getElementsByClassName('random-server-button')[0]
			if (typeof randomServerButton == 'undefined') {
				div = document.createElement('div')
				div.innerHTML = randomServerHTML
				randomServerButton = div.childNodes[0]
			}
			placeRandomServerButton(container, randomServerButton, playButton)
				if (randomServerButton.getAttribute('data-ropro-random-server-bound') != "true") {
					randomServerButton.setAttribute('data-ropro-random-server-bound', "true")
					randomServerButton.addEventListener('click', async function() {
						var outer = document.getElementById('rbx-body')
						if (outer == null) {
							return
						}
						var modalcontainer = document.createElement('div')
						modalcontainer.id = "randomGameModalContainer"
						outer.appendChild(modalcontainer)
						var overlay = document.createElement('div')
						overlay.innerHTML = randomServerOverlayHTML
						var modal = document.createElement('div')
						modal.innerHTML = randomServerModalHTML
						modalcontainer.appendChild(overlay)
						modalcontainer.appendChild(modal)
						modalcontainer.getElementsByClassName('close')[0].addEventListener('click', function() {
							closeRandomServerModal()
						})
						var rawResponse = await fetchRandomServer(globalGameId)
						console.log("[RoPro hop] raw response:", rawResponse)
						var server = normalizeRandomServerPayload(rawResponse)
						console.log("[RoPro hop] normalized server:", server)
						var statusTextNode = modal.getElementsByClassName('random-server-status-text')[0]
						if (statusTextNode == null) {
							console.log("[RoPro hop] statusTextNode is null, closing modal")
							closeRandomServerModal()
							return
						}
						var loadingNode = modal.getElementsByClassName('loading')[0]
						if (loadingNode != null) {
							loadingNode.style.display = "none"
						}
						if (server == null) {
							console.log("[RoPro hop] server is null after normalization")
							statusTextNode.textContent = "No open non-full servers were found. Please try again."
							setTimeout(closeRandomServerModal, 1200)
							return
						}
						statusTextNode.textContent = "Joining a random non-full server..."
						closeRandomServerModal()
						console.log("[RoPro hop] joining: placeId=" + globalGameId + " serverId=" + server.id + " cloudPlay=" + cloudPlayActive)
						console.log("[RoPro hop] Roblox.GameLauncher available:", typeof Roblox !== "undefined" && Roblox.GameLauncher && typeof Roblox.GameLauncher.joinGameInstance === "function")
						if (cloudPlayActive) {
							launchCloudPlay(server.id)
						} else {
							joinRobloxGameServer(globalGameId, server.id, true)
						}
					})
				}
			if (window.location.hash == "#ropro-random-server") {
				async function doClick() {
					clicked = await getLocalStorage('quickSearchLinkClicked')
					if (typeof clicked != 'undefined' && clicked != null && clicked > Date.now() - 15000) {
						randomServerButton.click()
					}
				}
				doClick()
			} else if (window.location.hash == "#ropro-quick-play") {
				async function doClick() {
					clicked = await getLocalStorage('quickSearchLinkClicked')
					if (typeof clicked != 'undefined' && clicked != null && clicked > Date.now() - 15000) {
						randomServerButton.parentNode.getElementsByTagName('button')[0].click()
					}
				}
				doClick()
			}
		}
	}, 50)
}

function getPrimaryGamePlayButton(playButtonContainer) {
	if (playButtonContainer == null || typeof playButtonContainer.querySelector != "function") {
		return null
	}
	var playButton = playButtonContainer.querySelector('button[data-testid="play-button"]')
	if (playButton != null) {
		return playButton
	}
	var playButtons = playButtonContainer.getElementsByClassName('btn-common-play-game-lg')
	for (var i = 0; i < playButtons.length; i++) {
		if (!playButtons[i].classList.contains('random-server-button')) {
			return playButtons[i]
		}
	}
	return null
}

function placeRandomServerButton(playButtonContainer, randomServerButton, playButton) {
	if (playButtonContainer == null || randomServerButton == null) {
		return
	}
	var anchorNode = playButtonContainer.querySelector('#id-verification-container')
	if (anchorNode == null) {
		anchorNode = playButton
	}
	playButtonContainer.style.flexDirection = "row"
	if (anchorNode != null && anchorNode.parentNode == playButtonContainer) {
		playButtonContainer.insertBefore(randomServerButton, anchorNode.nextSibling)
		return
	}
	playButtonContainer.appendChild(randomServerButton)
}

function addCloudPlayButton() {
	document.body.classList.add('ropro-cloud-play-enabled')
	var cloudPlayButtonInterval1 = setInterval(async function() {
		if (document.getElementById('game-age-recommendation-details') != null) {
			clearInterval(cloudPlayButtonInterval1)
			var div = document.createElement('div')
			div.innerHTML = `<div class="ropro-cloud-play-container" style="float:right;background-color:${theme == "dark" ? "#383B3D" : "#DEE1E3"};padding:15px;border-radius:8px;cursor:pointer;">
				<div class="tooltip-container" style="position:relative;">
					<div class="ropro-cloud-play-button">
						<a>
						<img class="ropro-cloud-play-icon-active" src="${chrome.runtime.getURL('/images/cloud_play_active.svg')}" style="height:23px;">
						<img class="ropro-cloud-play-icon-inactive" src="${chrome.runtime.getURL('/images/cloud_play_inactive.svg')}" style="height:23px;filter:invert(0);">
						</a>
					</div>
					<div style="z-index:1000;background-color:${theme == "dark" ? '#191B1D' : '#DEE1E3'};position:absolute;bottom:-325px;left:-70px;padding:10px;width:auto;border-radius:10px;" class="ropro-cloud-play-tooltip">
					<div style="font-size:14px;margin:auto;font-weight:600;margin-bottom:3px;width:180px;text-align:center;">RoPro Cloud Play</div>
					<p style="font-size:12px;width:auto;height:auto;white-space: normal;text-align:left;">• Launch this game in the cloud via now.gg.<br>• Cloud Play is rendered through servers in the cloud, allowing any device to play Roblox in full graphics mode.<br>• Note: RoPro Cloud Play uses a now.gg affiliate link, and RoPro earns a percentage of revenue from advertisements which run on now.gg (after cloud server costs).</p>
					</div>
				</div>
			</div>`
			insertAfter(div.childNodes[0], document.getElementById('game-age-recommendation-details'))
			var button = document.getElementsByClassName('ropro-cloud-play-container')[0]
			button.addEventListener('click', async function() {
				if (this.getElementsByClassName('ropro-cloud-play-button')[0].classList.contains('active')) {
					this.getElementsByClassName('ropro-cloud-play-button')[0].classList.remove('active')
					document.body.classList.remove("ropro-cloud-play-activated")
					cloudPlayActive = false
				} else {
					this.getElementsByClassName('ropro-cloud-play-button')[0].classList.add('active')
					document.body.classList.add("ropro-cloud-play-activated")
					cloudPlayActive = true
				}
			})
		}
	}, 50)
	var cloudPlayButtonInterval2 = setInterval(function() {
		var playButtonContainer = document.getElementById('game-details-play-button-container')
		var playButton = getPrimaryGamePlayButton(playButtonContainer)
		if (playButton != null) {
			clearInterval(cloudPlayButtonInterval2)
			playButton.addEventListener('click', function(event) {
				if (cloudPlayActive && this.getElementsByClassName('btn-text').length == 0) {
					event.stopPropagation()
					launchCloudPlay()
				}
			})
		}
	}, 50)
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function closeServerFiltersDropdownBoxes(clearActiveState) {
	var dropdownIds = ['serverFiltersDropdownBox', 'serverFiltersDropdownBoxMini']
	for (var i = 0; i < dropdownIds.length; i++) {
		var dropdownBox = document.getElementById(dropdownIds[i])
		if (dropdownBox != null) {
			dropdownBox.style.display = "none"
			setServerFiltersToggleExpandedState(dropdownIds[i], false)
		}
	}
	var playerCountButtons = ['maxPlayersButton', 'maxPlayersButtonMini', 'minPlayersButton', 'minPlayersButtonMini']
	for (var buttonIndex = 0; buttonIndex < playerCountButtons.length; buttonIndex++) {
		var playerCountButton = document.getElementById(playerCountButtons[buttonIndex])
		if (playerCountButton != null) {
			playerCountButton.classList.remove('selector-open')
		}
	}
	if (clearActiveState) {
		syncServerFilterOptionStateUi()
	}
}

function setServerFiltersToggleExpandedState(dropdownId, isExpanded) {
	var triggerMap = {
		serverFiltersDropdownBox: 'serverFiltersDropdown',
		serverFiltersDropdownBoxMini: 'serverFiltersDropdownMini'
	}
	var triggerId = triggerMap[dropdownId]
	if (typeof triggerId === "undefined") {
		return
	}
	var trigger = document.getElementById(triggerId)
	if (trigger != null) {
		trigger.setAttribute('aria-expanded', isExpanded ? "true" : "false")
	}
}

function toggleServerFiltersDropdown(dropdownId) {
	var dropdownBox = document.getElementById(dropdownId)
	if (dropdownBox == null) {
		return
	}
	if (dropdownBox.style.display == "block") {
		closeServerFiltersDropdownBoxes(true)
		return
	}
	closeServerFiltersDropdownBoxes(false)
	if (dropdownId === 'serverFiltersDropdownBox') {
		layoutServerFiltersHeaderControl()
	}
	dropdownBox.style.display = "block"
	setServerFiltersToggleExpandedState(dropdownId, true)
}

function isServerFiltersClickWithinNode(e, node) {
	if (node == null || e == null) {
		return false
	}
	if (typeof e.composedPath === "function") {
		var path = e.composedPath()
		for (var i = 0; i < path.length; i++) {
			if (path[i] === node) {
				return true
			}
		}
	}
	return node.contains(e.target)
}

function isServerFiltersInteractionEvent(e) {
	var interactiveIds = [
		'roproServerFiltersButton',
		'roproServerFiltersMiniButton',
		'serverFiltersDropdown',
		'serverFiltersDropdownMini',
		'serverFiltersDropdownBox',
		'serverFiltersDropdownBoxMini'
	]
	for (var i = 0; i < interactiveIds.length; i++) {
		var interactiveNode = document.getElementById(interactiveIds[i])
		if (isServerFiltersClickWithinNode(e, interactiveNode)) {
			return true
		}
	}
	return false
}

function bindServerFiltersDismissListeners() {
	if (serverFiltersDismissListenersBound) {
		return
	}
	document.addEventListener('click', function(e) {
		if (isServerFiltersInteractionEvent(e)) {
			return
		}
		closeServerFiltersDropdownBoxes(true)
	}, true)
	document.addEventListener('keydown', function(e) {
		if (e.key === "Escape") {
			closeServerFiltersDropdownBoxes(true)
		}
	})
	serverFiltersDismissListenersBound = true
}

function bindServerFiltersCloseButton(buttonId) {
	var closeButton = document.getElementById(buttonId)
	if (closeButton == null || closeButton.getAttribute('data-ropro-bound') === "1") {
		return
	}
	closeButton.setAttribute('data-ropro-bound', "1")
	closeButton.addEventListener('click', function(e) {
		e.preventDefault()
		e.stopPropagation()
		closeServerFiltersDropdownBoxes(true)
	})
}

function bindServerFiltersDropdownToggle(triggerId, dropdownId) {
	var trigger = document.getElementById(triggerId)
	if (trigger == null || trigger.getAttribute('data-ropro-bound') === "1") {
		return
	}
	trigger.setAttribute('data-ropro-bound', "1")
	function toggleFromTrigger(e) {
		e.preventDefault()
		e.stopPropagation()
		toggleServerFiltersDropdown(dropdownId)
	}
	trigger.addEventListener('click', toggleFromTrigger)
	trigger.addEventListener('keydown', function(e) {
		if (e.key === "Enter" || e.key === " ") {
			toggleFromTrigger(e)
		}
	})
}

function ensureServerTabFiltersBranding() {
	var serverTab = document.getElementById('tab-game-instances')
	if (serverTab == null) {
		return null
	}
	var serverTabHeading = serverTab.getElementsByClassName('rbx-tab-heading')[0]
	if (serverTabHeading == null) {
		return null
	}
	serverTabHeading.classList.remove('ropro-server-tab-heading')
	var staleMiniButton = document.getElementById('roproServerFiltersMiniButton')
	if (staleMiniButton != null) {
		staleMiniButton.remove()
	}
	var existingTabLogos = serverTabHeading.getElementsByClassName('ropro-server-tab-logo')
	for (var logoIndex = existingTabLogos.length - 1; logoIndex >= 0; logoIndex--) {
		existingTabLogos[logoIndex].remove()
	}
	return serverTabHeading
}

function getPublicRunningGamesHeader() {
	var primaryHeader = document.querySelector('#rbx-public-running-games .container-header, #rbx-public-running-games .server-list-container-header')
	if (primaryHeader != null) {
		return primaryHeader
	}
	var headerCandidates = document.querySelectorAll('.server-list-container-header, .container-header')
	for (var i = 0; i < headerCandidates.length; i++) {
		var header = headerCandidates[i]
		var refreshButton = header.querySelector('.rbx-refresh.refresh-link-icon')
		if (refreshButton == null) {
			continue
		}
		var headerTitle = header.querySelector('.server-list-header, h2, h3')
		var headerText = typeof headerTitle?.textContent === "string" ? headerTitle.textContent.trim().toLowerCase() : ""
		if (headerText === "other servers" || headerText === "servers") {
			return header
		}
	}
	return null
}

function getPublicRunningGamesOptionsRow() {
	var optionsRow = document.querySelector('#rbx-public-running-games .server-list-options')
	if (optionsRow != null) {
		return optionsRow
	}
	var header = getPublicRunningGamesHeader()
	if (header == null) {
		return null
	}
	return header.querySelector('.server-list-options')
}

function appendToPublicRunningGamesHeader(node) {
	var header = getPublicRunningGamesHeader()
	if (header == null || node == null) {
		return false
	}
	header.appendChild(node)
	return true
}

function scrollPublicRunningGamesHeaderIntoView() {
	var header = getPublicRunningGamesHeader()
	if (header != null) {
		header.scrollIntoView()
	}
}

function getPublicRunningGamesRefreshButton() {
	var header = getPublicRunningGamesHeader()
	if (header != null) {
		var headerRefreshButton = header.querySelector('.rbx-refresh.refresh-link-icon')
		if (headerRefreshButton != null) {
			return headerRefreshButton
		}
	}
	return document.querySelector('#rbx-public-running-games .rbx-refresh.refresh-link-icon')
}

function isPublicRunningGamesRefreshButton(refreshButton) {
	if (refreshButton == null) {
		return false
	}
	return refreshButton === getPublicRunningGamesRefreshButton()
}

function bindServerLoadMoreScrollGuard() {
	$(document).off('click.roproServerLoadMoreScrollGuard').on('click.roproServerLoadMoreScrollGuard', '#loadMoreButton, .rbx-public-running-games-load-more', function(event) {
		var isRoProLoadMoreButton = this.id === 'loadMoreButton'
		var isWithinPublicRunningGames = $(this).closest('#rbx-public-running-games').length > 0
		if (!isRoProLoadMoreButton && !isWithinPublicRunningGames) {
			return
		}
		if (this.tagName === 'A') {
			var href = this.getAttribute('href')
			if (href == null || href === '' || href.charAt(0) === '#') {
				event.preventDefault()
			}
		}
		var scrollBeforeClick = window.scrollY || window.pageYOffset || 0
		if (!Number.isFinite(scrollBeforeClick) || scrollBeforeClick <= 0) {
			return
		}
		var restoreAttempts = 0
		var restoreScrollIfNeeded = function() {
			restoreAttempts += 1
			var currentScrollY = window.scrollY || window.pageYOffset || 0
			if (currentScrollY + 120 < scrollBeforeClick) {
				window.scrollTo(0, scrollBeforeClick)
			}
			if (restoreAttempts < 8) {
				setTimeout(restoreScrollIfNeeded, 80)
			}
		}
		setTimeout(restoreScrollIfNeeded, 0)
	})
}

function setRoProFilteredServerGridActive(isActive) {
	var serverContainer = document.getElementById('rbx-public-game-server-item-container')
	if (serverContainer == null) {
		return
	}
	if (isActive === true) {
		serverContainer.classList.add('ropro-filtered-server-grid')
	} else {
		serverContainer.classList.remove('ropro-filtered-server-grid')
	}
}

function resetRoProCustomServerListView() {
	var serverContainer = document.getElementById('rbx-public-game-server-item-container')
	if (serverContainer == null) {
		return
	}
	setRoProFilteredServerGridActive(false)
	serverFilterVisibleCount = 0
	serverContainer.innerHTML = ``
	if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
		document.getElementsByClassName('rbx-public-running-games-footer')[0].style.display = "none"
	}
	if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
		loadMoreInitialized = false
		document.getElementsByClassName('ropro-running-games-footer')[0].remove()
	}
}

function restoreRobloxServerListAfterFilterClear() {
	customServerList = null
	serverFilterVisibleCount = 0
	setRoProFilteredServerGridActive(false)
	showServerFilterStatus("")
	if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
		loadMoreInitialized = false
		document.getElementsByClassName('ropro-running-games-footer')[0].remove()
	}
	if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
		document.getElementsByClassName('rbx-public-running-games-footer')[0].style.display = "block"
	}
	var refreshButton = getPublicRunningGamesRefreshButton()
	if (refreshButton != null && typeof refreshButton.click === "function") {
		refreshButton.click()
	}
}

function showServerFilterStatus(message) {
	var header = getPublicRunningGamesHeader()
	if (header == null) {
		return
	}
	var statusNode = document.getElementById('roproServerFilterStatus')
	if (statusNode == null) {
		statusNode = document.createElement('span')
		statusNode.id = 'roproServerFilterStatus'
		statusNode.style.cssText = "display:none;margin-left:8px;font-size:12px;color:#f6b5b5;white-space:normal;max-width:320px;"
		header.appendChild(statusNode)
	}
	if (typeof message === "string" && message.length > 0) {
		statusNode.textContent = message
		statusNode.style.display = "inline-block"
	} else {
		statusNode.textContent = ""
		statusNode.style.display = "none"
	}
}

function buildNoMatchingServerFilterStatus(filterName) {
	var normalizedFilterName = typeof filterName === "string" ? filterName.trim() : ""
	if (normalizedFilterName.length === 0) {
		normalizedFilterName = "Selected filters"
	}
	return normalizedFilterName + " found no matching servers right now."
}

function applyServerFilterResults(placeId, serverList, reverse, filterName, options = {}) {
	if (!Array.isArray(serverList) || serverList.length === 0) {
		var sampledServerCount = parseInt(options.sampledServerCount, 10)
		var hasSampledServerData = Number.isFinite(sampledServerCount) && sampledServerCount > 0
		if (hasSampledServerData) {
			showServerFilterStatus(buildNoMatchingServerFilterStatus(filterName))
		} else {
			showServerFilterStatus((filterName || "This filter") + " could not load server data right now.")
		}
		var hasExistingCustomList = Array.isArray(customServerList) && customServerList.length > 0
		if (hasExistingCustomList) {
			if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
				document.getElementsByClassName('rbx-public-running-games-footer')[0].style.display = "none"
			}
			if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
				var hasMoreExistingServers = customServerList.length > serverFilterVisibleCount
				document.getElementsByClassName('ropro-running-games-footer')[0].style.display = hasMoreExistingServers ? "block" : "none"
			}
			return false
		}
		customServerList = null
		serverFilterVisibleCount = 0
		if (document.getElementsByClassName('rbx-public-running-games-footer').length > 0) {
			document.getElementsByClassName('rbx-public-running-games-footer')[0].style.display = "block"
		}
		if (document.getElementsByClassName('ropro-running-games-footer').length > 0) {
			document.getElementsByClassName('ropro-running-games-footer')[0].style.display = "none"
		}
		return false
	}
	showServerFilterStatus("")
	resetRoProCustomServerListView()
	customServerList = serverList
	var normalizedVisibleCount = parseInt(options.visibleCount, 10)
	var pageSize = getServerFilterPageSize()
	if (!Number.isFinite(normalizedVisibleCount) || normalizedVisibleCount <= 0) {
		normalizedVisibleCount = pageSize
	}
	normalizedVisibleCount = Math.max(pageSize, normalizedVisibleCount)
	loadServerPage(placeId, normalizedVisibleCount, reverse === true)
	return true
}

function layoutServerFiltersHeaderControl() {
	var headerControl = document.getElementById('roproServerFiltersButton')
	if (headerControl == null) {
		return
	}
	var header = headerControl.parentElement
	if (header == null) {
		return
	}
	var dropdownTrigger = document.getElementById('serverFiltersDropdown')
	var dropdownBox = document.getElementById('serverFiltersDropdownBox')
	headerControl.classList.remove('ropro-server-filters-header-tight')
	var headerTitle = header.querySelector('.server-list-header, h2, h3')
	if (headerTitle != null) {
		var titleRect = headerTitle.getBoundingClientRect()
		var controlRect = headerControl.getBoundingClientRect()
		if (controlRect.left <= titleRect.right + 8) {
			headerControl.classList.add('ropro-server-filters-header-tight')
		}
	}
	headerControl.style.left = ""
	headerControl.style.right = ""
	headerControl.style.top = ""
	headerControl.style.transform = ""
	if (dropdownTrigger != null && dropdownBox != null) {
		dropdownBox.style.left = "0px"
		dropdownBox.style.right = "auto"
		dropdownBox.style.top = (dropdownTrigger.offsetHeight + 6) + "px"
	}
}

function bindServerFiltersHeaderLayout() {
	if (serverFiltersHeaderLayoutBound) {
		return
	}
	window.addEventListener('resize', layoutServerFiltersHeaderControl)
	serverFiltersHeaderLayoutBound = true
}

function addServerFilters(placeId, maxPlayerCount) {
	if (document.getElementById('serverFiltersDropdown') != null) { 
		return
	}

	var serverContainerHeader = getPublicRunningGamesHeader()
	if (serverContainerHeader == null) {
		return
	}
	serverFiltersDiv = document.createElement('div')
	serverFiltersDiv.innerHTML = serverFiltersHTML
	var serverFiltersButton = serverFiltersDiv.childNodes[0]
	var optionsRow = getPublicRunningGamesOptionsRow()
	var mountedInOptionsRow = false
	if (optionsRow != null) {
		mountedInOptionsRow = true
		serverFiltersButton.classList.add('ropro-server-filters-options-control')
		var excludeFullServersToggle = optionsRow.querySelector('.checkbox')
		if (excludeFullServersToggle != null && excludeFullServersToggle.parentNode === optionsRow) {
			optionsRow.insertBefore(serverFiltersButton, excludeFullServersToggle.nextSibling)
		} else {
			optionsRow.appendChild(serverFiltersButton)
		}
	}
	if (!mountedInOptionsRow) {
		var serverRefreshButton = serverContainerHeader.querySelector('.rbx-refresh.refresh-link-icon')
		var serverFiltersHost = serverContainerHeader
		if (serverRefreshButton != null && serverRefreshButton.parentElement != null) {
			serverFiltersHost = serverRefreshButton.parentElement
			serverFiltersHost.classList.add('ropro-server-filters-header-host')
		}
		if (serverRefreshButton != null && serverRefreshButton.parentNode === serverFiltersHost) {
			serverFiltersHost.insertBefore(serverFiltersButton, serverRefreshButton)
		} else {
			serverFiltersHost.appendChild(serverFiltersButton)
		}
	}
	bindServerFiltersHeaderLayout()
	layoutServerFiltersHeaderControl()
	setTimeout(layoutServerFiltersHeaderControl, 120)

	async function checkSettings() {
		if (await fetchSetting("serverFilters") == false) {
			document.getElementById('roproServerFiltersButton').style.display = "none"
			var miniButton = document.getElementById('roproServerFiltersMiniButton')
			if (miniButton != null) {
				miniButton.style.display = "none"
			}
		}
	}

	checkSettings()
	setBestConnectionFilterLockState()
	startServerFilterCacheRefreshLoop(parseInt(placeId))
	bindServerFiltersDismissListeners()
	bindServerFiltersCloseButton('serverFiltersCloseButton')
	bindServerFiltersCloseButton('serverFiltersCloseButtonMini')
	bindServerFiltersDropdownToggle('serverFiltersDropdown', 'serverFiltersDropdownBox')

	function closePlayerCountSelectors() {
		var playerCountButtons = [
			document.getElementById('maxPlayersButton'),
			document.getElementById('maxPlayersButtonMini'),
			document.getElementById('minPlayersButton'),
			document.getElementById('minPlayersButtonMini')
		]
		for (var i = 0; i < playerCountButtons.length; i++) {
			if (playerCountButtons[i] != null) {
				playerCountButtons[i].classList.remove('selector-open')
			}
		}
	}

	async function applyServerFiltersFromSelection(scrollIntoView) {
		closePlayerCountSelectors()
		closeServerFiltersDropdownBoxes(false)
		syncServerFilterOptionStateUi()
		if (!hasActiveServerFilters()) {
			restoreRobloxServerListAfterFilterClear()
			if (scrollIntoView === true) {
				scrollPublicRunningGamesHeaderIntoView()
			}
			return
		}
		await applyActiveServerFilters(placeId, {scrollIntoView: scrollIntoView === true})
	}

	function bindPlayerCountSelectorToggle(buttonId) {
		var selectorButton = document.getElementById(buttonId)
		if (selectorButton == null) {
			return
		}
		selectorButton.addEventListener('click', function() {
			this.classList.toggle('selector-open')
		})
	}

	function bindPlayerCountSelection(button, stateKey) {
		if (button == null) {
			return
		}
		button.addEventListener('click', async function() {
			var selectedPlayerCount = parsePlayerCountSelectionValue(this)
			if (!Number.isFinite(selectedPlayerCount) || selectedPlayerCount <= 0) {
				return
			}
			if (!activeServerFilterState.hasOwnProperty(stateKey)) {
				return
			}
			if (activeServerFilterState[stateKey] === selectedPlayerCount) {
				activeServerFilterState[stateKey] = null
			} else {
				activeServerFilterState[stateKey] = selectedPlayerCount
			}
			scrollPublicRunningGamesHeaderIntoView()
			await applyServerFiltersFromSelection(true)
		})
	}

		function createPlayerCountSelectionNode(selectionClass, playerCount, suffixText) {
			var normalizedPlayerCount = parseInt(playerCount, 10)
			if (!Number.isFinite(normalizedPlayerCount) || normalizedPlayerCount <= 0) {
				return null
			}
			var button = document.createElement('div')
			button.className = selectionClass
			button.style.backgroundColor = "#232527"
			button.style.height = "40px"
			button.style.width = "177.5px"
			button.style.margin = "5px"
			button.style.borderRadius = "5px"
			button.style.padding = "10px"
			button.style.fontSize = "15px"
			button.style.fontWeight = "800"
			button.textContent = normalizedPlayerCount + " player" + (normalizedPlayerCount == 1 ? '' : 's') + " " + suffixText
			button.setAttribute('data-player-count', String(normalizedPlayerCount))
			return button
		}

		var playerCountListIds = ['maxPlayersList', 'maxPlayersListMini', 'minPlayersList', 'minPlayersListMini']

		function clearPlayerCountSelectionLists() {
			for (var i = 0; i < playerCountListIds.length; i++) {
				var listNode = document.getElementById(playerCountListIds[i])
				if (listNode == null) {
					continue
				}
				listNode.innerHTML = ""
			}
		}

		function appendPlayerCountLoadingState(listNode) {
			if (listNode == null) {
				return
			}
			var loadingState = document.createElement('div')
			loadingState.className = 'ropro-player-count-loading-state'
			loadingState.setAttribute('role', 'status')
			loadingState.setAttribute('aria-live', 'polite')
			var spinner = document.createElement('span')
			spinner.className = 'ropro-player-count-spinner'
			spinner.setAttribute('aria-hidden', 'true')
			var loadingLabel = document.createElement('span')
			loadingLabel.className = 'ropro-player-count-loading-label'
			loadingLabel.textContent = "Gathering server data..."
			loadingState.appendChild(spinner)
			loadingState.appendChild(loadingLabel)
			listNode.appendChild(loadingState)
		}

		function appendPlayerCountEmptyState(listNode, message) {
			if (listNode == null) {
				return
			}
			var emptyState = document.createElement('div')
			emptyState.className = 'ropro-player-count-empty-state'
			emptyState.textContent = message
			listNode.appendChild(emptyState)
		}

		function renderPlayerCountSelectionLoadingState() {
			clearPlayerCountSelectionLists()
			for (var i = 0; i < playerCountListIds.length; i++) {
				var listNode = document.getElementById(playerCountListIds[i])
				appendPlayerCountLoadingState(listNode)
			}
		}

		function reconcileActivePlayerCountFilterState(playerCountBounds) {
			var normalizedBounds = normalizeServerFilterPlayerCountBounds(playerCountBounds, maxPlayerCount)
			if (normalizedBounds == null) {
				activeServerFilterState.maxPlayers = null
				activeServerFilterState.minPlayers = null
				return
			}
			if (
				Number.isFinite(activeServerFilterState.maxPlayers) &&
				(activeServerFilterState.maxPlayers < normalizedBounds.minPlayers ||
					activeServerFilterState.maxPlayers > normalizedBounds.maxPlayers)
			) {
				activeServerFilterState.maxPlayers = null
			}
			if (
				Number.isFinite(activeServerFilterState.minPlayers) &&
				(activeServerFilterState.minPlayers < normalizedBounds.minPlayers ||
					activeServerFilterState.minPlayers > normalizedBounds.maxPlayers)
			) {
				activeServerFilterState.minPlayers = null
			}
		}

		function renderPlayerCountSelectionOptions(playerCountBounds) {
			clearPlayerCountSelectionLists()
			var normalizedBounds = normalizeServerFilterPlayerCountBounds(playerCountBounds, maxPlayerCount)
			var thresholds = getServerFilterPlayerCountThresholds(normalizedBounds)
			reconcileActivePlayerCountFilterState(normalizedBounds)
			var maxPlayersList = document.getElementById('maxPlayersList')
			var maxPlayersListMini = document.getElementById('maxPlayersListMini')
			var minPlayersList = document.getElementById('minPlayersList')
			var minPlayersListMini = document.getElementById('minPlayersListMini')
			if (thresholds.length === 0) {
				appendPlayerCountEmptyState(maxPlayersList, "No player-count range available.")
				appendPlayerCountEmptyState(maxPlayersListMini, "No player-count range available.")
				appendPlayerCountEmptyState(minPlayersList, "No player-count range available.")
				appendPlayerCountEmptyState(minPlayersListMini, "No player-count range available.")
				syncServerFilterOptionStateUi()
				return
			}
			for (var thresholdIndex = 0; thresholdIndex < thresholds.length; thresholdIndex++) {
				var playerCountThreshold = thresholds[thresholdIndex]
				var maxPlayersButton = createPlayerCountSelectionNode("max-players-selection", playerCountThreshold, "or less")
				var maxPlayersButtonMini = createPlayerCountSelectionNode("max-players-selection", playerCountThreshold, "or less")
				var minPlayersButton = createPlayerCountSelectionNode("min-players-selection", playerCountThreshold, "or more")
				var minPlayersButtonMini = createPlayerCountSelectionNode("min-players-selection", playerCountThreshold, "or more")
				if (maxPlayersButton != null && maxPlayersList != null) {
					maxPlayersList.appendChild(maxPlayersButton)
					bindPlayerCountSelection(maxPlayersButton, "maxPlayers")
				}
				if (maxPlayersButtonMini != null && maxPlayersListMini != null) {
					maxPlayersListMini.appendChild(maxPlayersButtonMini)
					bindPlayerCountSelection(maxPlayersButtonMini, "maxPlayers")
				}
				if (minPlayersButton != null && minPlayersList != null) {
					minPlayersList.appendChild(minPlayersButton)
					bindPlayerCountSelection(minPlayersButton, "minPlayers")
				}
				if (minPlayersButtonMini != null && minPlayersListMini != null) {
					minPlayersListMini.appendChild(minPlayersButtonMini)
					bindPlayerCountSelection(minPlayersButtonMini, "minPlayers")
				}
			}
			syncServerFilterOptionStateUi()
		}

		async function warmPlayerCountSelectionOptions() {
			var normalizedPlaceId = parseInt(placeId, 10)
			if (!Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
				renderPlayerCountSelectionOptions(normalizeServerFilterPlayerCountBounds(null, maxPlayerCount))
				return
			}
			renderPlayerCountSelectionLoadingState()
			var derivedBounds = await resolveServerFilterPlayerCountBounds(normalizedPlaceId, maxPlayerCount)
			var currentGameId = getCurrentGameRouteId()
			if (Number.isFinite(currentGameId) && currentGameId !== normalizedPlaceId) {
				return
			}
			renderPlayerCountSelectionOptions(derivedBounds)
		}

	bindPlayerCountSelectorToggle('maxPlayersButton')
	bindPlayerCountSelectorToggle('maxPlayersButtonMini')
	bindPlayerCountSelectorToggle('minPlayersButton')
	bindPlayerCountSelectorToggle('minPlayersButtonMini')

	document.getElementById('randomShuffleButton').addEventListener('click', async function() {
		activeServerFilterState.randomShuffle = !activeServerFilterState.randomShuffle
		if (activeServerFilterState.randomShuffle) {
			activeServerFilterState.bestConnection = false
		}
		await applyServerFiltersFromSelection(false)
	})

	var randomShuffleButtonMini = document.getElementById('randomShuffleButtonMini')
	if (randomShuffleButtonMini != null) {
		randomShuffleButtonMini.addEventListener('click', async function() {
			document.getElementById('randomShuffleButton').click()
			scrollPublicRunningGamesHeaderIntoView()
		})
	}

	document.getElementById('notFullButton').addEventListener('click', async function() {
		activeServerFilterState.notFull = !activeServerFilterState.notFull
		await applyServerFiltersFromSelection(false)
	})

	var notFullButtonMini = document.getElementById('notFullButtonMini')
	if (notFullButtonMini != null) {
		notFullButtonMini.addEventListener('click', async function() {
			document.getElementById('notFullButton').click()
			scrollPublicRunningGamesHeaderIntoView()
		})
	}

		document.getElementById('bestConnectionButton').addEventListener('click', async function() {
				if (!serverPingBestConnectionEnabled) {
					await ensureServerPingVisualGateState()
					if (!serverPingBestConnectionEnabled) {
						if (!shouldUpsellServerPingGate()) {
							return
						}
					upgradeModalServerFilters("connection")
					return
				}
			}
			activeServerFilterState.bestConnection = !activeServerFilterState.bestConnection
			if (activeServerFilterState.bestConnection) {
				activeServerFilterState.randomShuffle = false
			}
			await applyServerFiltersFromSelection(false)
	})

		var bestConnectionButtonMini = document.getElementById('bestConnectionButtonMini')
		if (bestConnectionButtonMini != null) {
			bestConnectionButtonMini.addEventListener('click', async function() {
			document.getElementById('bestConnectionButton').click()
			scrollPublicRunningGamesHeaderIntoView()
		})
		}

		renderPlayerCountSelectionLoadingState()
		syncServerFilterOptionStateUi()
		warmPlayerCountSelectionOptions().catch(function() {
			renderPlayerCountSelectionOptions(normalizeServerFilterPlayerCountBounds(null, maxPlayerCount))
		})
	}

async function liveCounters() {
	var liveVoteAnimationState = {
		up: { currentValue: null, timerId: null, node: null },
		down: { currentValue: null, timerId: null, node: null }
	}

	function parseVoteCounterNodeValue(node) {
		if (!(node instanceof Element)) {
			return null
		}
		var rawText = stripTags(node.textContent || '').replace(/,/g, '').trim()
		if (!/^[0-9]+$/.test(rawText)) {
			return null
		}
		var parsed = parseInt(rawText, 10)
		if (!Number.isFinite(parsed) || parsed < 0) {
			return null
		}
		return parsed
	}

	function clearVoteAnimationTimer(kind) {
		var state = liveVoteAnimationState[kind]
		if (state == null) {
			return
		}
		if (state.timerId != null) {
			clearInterval(state.timerId)
			state.timerId = null
		}
	}

	function setVoteCounterNodeValue(node, value) {
		if (!(node instanceof Element) || !Number.isFinite(value) || value < 0) {
			return
		}
		node.style.fontSize = "11px"
		node.textContent = addCommas(Math.floor(value))
		node.setAttribute("title", stripTags(node.textContent))
	}

	function animateLiveVoteCounter(kind, node, targetValue) {
		if (!(node instanceof Element) || !Number.isFinite(targetValue) || targetValue < 0) {
			return
		}
		var state = liveVoteAnimationState[kind]
		if (state == null) {
			return
		}
		clearVoteAnimationTimer(kind)
		state.node = node
		var startValue = Number.isFinite(state.currentValue)
			? Math.floor(state.currentValue)
			: parseVoteCounterNodeValue(node)
		var endValue = Math.floor(targetValue)
		if (!Number.isFinite(startValue) || startValue < 0) {
			startValue = endValue
		}
		if (startValue === endValue) {
			state.currentValue = endValue
			setVoteCounterNodeValue(node, endValue)
			return
		}
		var direction = endValue > startValue ? 1 : -1
		var range = Math.abs(endValue - startValue)
		var frameMs = 50
		var durationMs = Math.min(10000, Math.max(900, Math.floor(range / 2)))
		var frames = Math.max(1, Math.floor(durationMs / frameMs))
		var stepAmount = Math.max(1, Math.ceil(range / frames))
		var currentValue = startValue
		setVoteCounterNodeValue(node, currentValue)
		state.timerId = setInterval(function() {
			if (!(state.node instanceof Element) || !document.contains(state.node)) {
				clearVoteAnimationTimer(kind)
				return
			}
			currentValue += stepAmount * direction
			if ((direction > 0 && currentValue >= endValue) || (direction < 0 && currentValue <= endValue)) {
				currentValue = endValue
			}
			state.currentValue = currentValue
			setVoteCounterNodeValue(state.node, currentValue)
			if (currentValue === endValue) {
				clearVoteAnimationTimer(kind)
			}
		}, frameMs)
	}

	function isVoteLabelMatch(text, kind) {
		if (typeof text !== "string" || text.trim().length === 0) {
			return false
		}
		var normalized = text.trim().toLowerCase()
		if (kind === "up") {
			return normalized.indexOf("like") !== -1 && normalized.indexOf("dislike") === -1
		}
		if (kind === "down") {
			return normalized.indexOf("dislike") !== -1
		}
		return false
	}

	function findVoteCountNodeFromLabeledButton(root, kind) {
		if (root == null || typeof root.querySelectorAll !== "function") {
			return null
		}
		var buttons = root.querySelectorAll('button, [role="button"]')
		for (var i = 0; i < buttons.length; i++) {
			var button = buttons[i]
			if (!(button instanceof Element)) {
				continue
			}
			var ariaLabel = button.getAttribute('aria-label')
			if (!isVoteLabelMatch(ariaLabel, kind)) {
				continue
			}
			var countNodes = button.querySelectorAll('span, p, div')
			for (var j = 0; j < countNodes.length; j++) {
				var candidate = countNodes[j]
				if (!(candidate instanceof Element)) {
					continue
				}
				var text = stripTags(candidate.textContent || '').replace(/,/g, '').trim()
				if (/^[0-9]+$/.test(text)) {
					return candidate
				}
			}
		}
		return null
	}

	function findVoteCounterNode(root, kind) {
		var primaryId = kind === "up" ? 'vote-up-text' : 'vote-down-text'
		var byId = document.getElementById(primaryId)
		if (byId != null) {
			return byId
		}
		if (root == null || typeof root.querySelector !== "function") {
			return null
		}
		var fallbackSelectors = kind === "up"
			? [
				'[data-testid="upvote-count"]',
				'[data-testid="up-vote-count"]',
				'[data-testid="vote-up-count"]'
			]
			: [
				'[data-testid="downvote-count"]',
				'[data-testid="down-vote-count"]',
				'[data-testid="vote-down-count"]'
			]
		for (var i = 0; i < fallbackSelectors.length; i++) {
			var node = root.querySelector(fallbackSelectors[i])
			if (node != null) {
				return node
			}
		}
		return findVoteCountNodeFromLabeledButton(root, kind)
	}

	function resolveLiveVoteCounterNodes() {
		var statsRoots = [
			document.querySelector('#game-detail-meta-data'),
			document.querySelector('.game-stat-container'),
			document.querySelector('.game-stats-container'),
			document.body
		]
		for (var i = 0; i < statsRoots.length; i++) {
			var root = statsRoots[i]
			if (!(root instanceof Element)) {
				continue
			}
			var upNode = findVoteCounterNode(root, "up")
			var downNode = findVoteCounterNode(root, "down")
			if (upNode != null || downNode != null) {
				return { up: upNode, down: downNode }
			}
		}
		return { up: null, down: null }
	}

	async function loadCounters() {
		if (document.hidden || !isGamePageTabActive(parseInt(globalGameId, 10))) {
			return
		}
		var votesResponse = null
		try {
			votesResponse = await fetchVotes(myUniverseId)
		} catch (_) {
			return
		}
		var votes = extractGameCacheVotesRow(myUniverseId, votesResponse)
		if (votes == null || typeof votes !== "object") {
			return
		}
		var counterNodes = resolveLiveVoteCounterNodes()
		var upvotes = counterNodes.up
		var downvotes = counterNodes.down
		var upvoteCount = parseInt(votes.upVotes, 10)
		var downvoteCount = parseInt(votes.downVotes, 10)
		if (upvotes != null && Number.isFinite(upvoteCount) && upvoteCount >= 0) {
			animateLiveVoteCounter("up", upvotes, upvoteCount)
		}
		if (downvotes != null && Number.isFinite(downvoteCount) && downvoteCount >= 0) {
			animateLiveVoteCounter("down", downvotes, downvoteCount)
		}
	}
	async function loadCountersIfEnabled() {
		var liveCountersEnabled = false
		try {
			liveCountersEnabled = (await fetchSetting("liveLikeDislikeFavoriteCounters")) === true
		} catch (_) {
			liveCountersEnabled = false
		}
		if (!liveCountersEnabled) {
			return
		}
		await loadCounters()
	}
	setTimeout(function() {
		loadCountersIfEnabled().catch(function() {})
	}, LIVE_VOTE_COUNTER_STARTUP_DELAY_MS)
	setInterval(function() {
		loadCountersIfEnabled().catch(function() {})
	}, LIVE_VOTE_COUNTER_REFRESH_INTERVAL_MS)
}

var timerArray = [];

function animateValue(obj, start, end, duration) {
    if (start === end) return;
    var range = end - start;
    var current = start;
    var increment = end > start? Math.ceil(Math.abs(end-start)/500) : -1 * Math.ceil(Math.abs(end-start)/500);
    var stepTime = Math.abs(Math.floor(duration / (range/Math.abs(increment))));
    timer = setInterval(function() {
		if (typeof currentVisits != 'undefined' && (start == currentVisits || start == currentPlayers)) {
			current += increment;
			obj.textContent = addCommas(current);
			if ((increment >= 0 && current >= end) || (increment < 0 && current <= end)) {
				clearInterval(timer);
				obj.textContent = addCommas(end);
				obj.setAttribute("title", stripTags(obj.innerHTML))
			}
		}
	}, stepTime);
	timerArray.push([obj, timer])
}

async function livePlaying() {
	liveVisitsSetting = await fetchSetting("liveVisits");
	livePlayingSetting = await fetchSetting("livePlayers");
	if (liveVisitsSetting || livePlayingSetting) {
		async function loadPlaying() {
			if (!isGamePageTabActive(parseInt(globalGameId, 10))) {
				return
			}
			if (liveVisitsSetting || livePlayingSetting) {
				gameInfo = await fetchGameInfo(myUniverseId)
				playing = parseInt(gameInfo.data[0].playing)
				visits = parseInt(gameInfo.data[0].visits)
				playingObj = document.getElementsByClassName('game-stat')[0].getElementsByTagName('p')[1]
				visitsObj = document.getElementById('game-visits-count')
				if (playingObj.classList.contains('ropro-live-stats')) {
					oldPlaying = parseInt(playingObj.getAttribute('ropro-live-stats'))
					oldVisits = parseInt(visitsObj.getAttribute('ropro-live-stats'))
					playingObj.setAttribute('ropro-live-stats', oldPlaying)
					visitsObj.setAttribute('ropro-live-stats', oldVisits)
				} else {
					oldPlaying = playing
					oldVisits = visits
					playingObj.setAttribute('ropro-live-stats', oldPlaying)
					visitsObj.setAttribute('ropro-live-stats', oldVisits)
					playingObj.classList.add('ropro-live-stats')
					visitsObj.classList.add('ropro-live-stats')
				}
				if (livePlayingSetting) {
					playingObj.textContent = addCommas(oldPlaying)
				}
				if (liveVisitsSetting) {
					visitsObj.textContent = addCommas(oldVisits)
				}
				for (i = 0; i < timerArray.length; i++) {
					clearInterval(timerArray[i][1])
				}
				timerArray = []
				if (livePlaying) {
					animateValue(playingObj, oldPlaying, playing, 5000);
					currentPlayers = oldPlaying;
				}
				if (oldVisits <= visits && liveVisitsSetting) {
					animateValue(visitsObj, oldVisits, visits, 10000);
					currentVisits = oldVisits;
				}
			}
		}
		setTimeout(loadPlaying, 1000)
		setInterval(loadPlaying, LIVE_PLAYING_COUNTER_REFRESH_INTERVAL_MS)
	}
}


function stripTags(s) {
	if (typeof s == "undefined" || s == null) {
		return ""
	}
	return String(s).replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

function formatTime(time) {
    suffix = " hr"
    if (time < 60) {
        suffix = " minute"
		if (time != 1) {
			suffix += "s"
		}
    } else {
		oldTime = time
        time = Math.floor(time / 60)
		if (time != 1) {
			suffix += "s"
		}
		if (time <= 99) {
			suffix += " " + (oldTime - (time * 60)) + " min"
			if ((oldTime - (time * 60)) != 1) {
				suffix += "s"
			}
		}
    }
    return time + suffix
}

function getDaysSince(date) {
    now = new Date().getTime()
    return Math.floor(Math.abs((date - now) / (24 * 60 * 60 * 1000)))
}

async function getTimePlayed(gameId, timePeriod, offset = 0) {
	playTime = await fetchPlayTime(gameId, timePeriod, offset)
	if (playTime.length > 0) {
		time = playTime[0].time_played
	} else {
		time = 0
	}
	timePlayedCache = await getLocalStorage("timePlayed")
	if (typeof timePlayedCache == "undefined") {
        timePlayedCache = {}
    }
	if (gameId in timePlayedCache && getDaysSince(timePlayedCache[gameId][1]) <= timePeriod) {
		time += timePlayedCache[gameId][0]
	}
	return time
}

function createUpgradeModalWithContent(config) {
	if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
		return null
	}
	return window.RoProUpgradeModal.open(config)
}

function createUpgradeModal() {
	return createUpgradeModalWithContent(
		{
			tier: "plus",
			contextLabel: "RoPro Most Played",
			featureLabel: "Sorting your playtime by Month, Year, and All Time",
			benefits: [
				"Best Connection sorting and live server ping visibility",
				"Animated Profile Themes",
				"Trade Value and Demand Calculator",
				"Save Sandbox Outfits and Use Bundles"
			],
			ctaLabel: "Upgrade",
			ctaHref: "https://ropro.io#plus",
			footerText: "Find a full list in RoPro settings."
		}
	)
}

function upgradeModal() {
	var modal = createUpgradeModal()
	if (modal != null) {
		modal.style.display = "block"
	}
}

function getServerFilterUpgradeLabel(featureKey) {
	var labelMap = {
		connection: "The Best Connection server filter"
	}
	var normalizedKey = typeof featureKey === "string" ? featureKey.toLowerCase() : ""
	if (normalizedKey in labelMap) {
		return labelMap[normalizedKey]
	}
	return "This server filter"
}

function buildServerFilterUpgradeModalConfig(featureKey) {
	var featureLabel = getServerFilterUpgradeLabel(featureKey)
	return {
		tier: "plus",
		contextLabel: "RoPro Server Filters",
		featureLabel: featureLabel,
		benefits: [
			"Use Best Connection sorting and see live server ping values",
			"Animated Profile Themes",
			"Trade Value and Demand Calculator",
			"Save Sandbox Outfits and Use Bundles"
		],
		ctaLabel: "Subscribe",
		ctaHref: "https://ropro.io#plus",
		footerText: "Find a full list in RoPro settings."
	}
}

function createUpgradeModalServerFilters(featureKey) {
	return createUpgradeModalWithContent(buildServerFilterUpgradeModalConfig(featureKey))
}

function upgradeModalServerFilters(featureKey) {
	if (!shouldUpsellServerPingGate()) {
		return
	}
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.openUpgradeModalForVisualGate === "function"
	) {
		var config = buildServerFilterUpgradeModalConfig(featureKey)
		config.fallbackTier = "plus"
		roproApiAdapter.openUpgradeModalForVisualGate(serverPingVisualGate, config)
		return
	}
	var modal = createUpgradeModalServerFilters(featureKey)
	if (modal != null) {
		modal.style.display = "block"
	}
}

var playTimeRenderToken = 0

function getPlayTimeTextNode() {
	return document.getElementById("playTimeText")
}

function ensurePlayTimeRenderSurface(renderToken) {
	if (renderToken !== playTimeRenderToken) {
		return null
	}
	var playTimeText = getPlayTimeTextNode()
	if (playTimeText == null) {
		return null
	}
	if (playTimeText.getAttribute("data-ropro-playtime-render-token") != String(renderToken)) {
		return null
	}
	return playTimeText
}


async function updatePlayTime(gameId, timePeriod, offset = 0) {
	var playTimeText = getPlayTimeTextNode()
	if (playTimeText == null) {
		return
	}
	var renderToken = ++playTimeRenderToken
	playTimeText.setAttribute("data-ropro-playtime-render-token", String(renderToken))
	playTimeText.innerHTML = buildRoProLoader({id: "mostPlayedLoadingBar", className: "ropro-branded-loader-compact-section", style: "position:absolute; left:50%; top:50%; transform:translate(-50%, -50%) scale(0.58); width:130px; min-height:80px; margin:0;"})
	var time = await getTimePlayed(gameId, timePeriod, offset)
	playTimeText = ensurePlayTimeRenderSurface(renderToken)
	if (playTimeText == null) {
		return
	}
	var parsedTime = parseInt(time, 10)
	if (!Number.isFinite(parsedTime)) {
		parsedTime = 0
	}
	playTimeText.title = `${parsedTime} minutes`
	playTimeText.innerText = formatTime(parsedTime)
}

async function addPlayTime(gameId) {
	playTimeHTML = `<div style="margin-top:5px;font-size:12px;position:relative;" class="text-label">Played <img style="background-image:none;margin:0px;margin-top:-2px;margin-bottom:0px;transform:scale(1);border:none;margin-left:0px;margin-right:1px;width:12px;height:12px;" src="${chrome.runtime.getURL(`/images/timer${theme == "dark" ? "_dark" : "_light"}.svg`)}" class="info-label icon-pastname">
	<a href="#!/game-instances" style="font-size:13px;display:inline-block;position:relative;min-width:130px;min-height:48px;" id="playTimeText" class="text-name" title="">${buildRoProLoader({ id: "mostPlayedLoadingBar", className: "ropro-branded-loader-compact-section", style: "position:absolute; left:50%; top:50%; transform:translate(-50%, -50%) scale(0.58); width:130px; min-height:80px; margin:0;" })}</a><div id="timeDropdown" style="overflow:visible;margin-top:-10px;margin-left:0px;float:right;width:auto;font-size:0.8em;margin-right:-37px;z-index:10;margin-bottom:0px;" class="input-group-btn group-dropdown">
	<button style="border:none;" type="button" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
	<span style="float:right;" class="icon-down-16x16"></span><span id="timeLabel" class="rbx-selection-label ng-binding" ng-bind="layout.selectedTab.label" style="font-size:14px;float:right;margin-right:5px;">Past Day</span> 
	</button>
	<ul style="max-height:1000px;width:130px;margin-left:-15px;top:-100px;" id="timeOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu"> 
	<li>
	<a time="today" class="timeChoice">
		<span style="font-size:14px;" ng-bind="tab.label" class="ng-binding">Past Day</span>
	</a></li>
	<li>
	<a time="pastWeek" class="timeChoice">
		<span ng-bind="tab.label" class="ng-binding" style="font-size:14px;">Past 7 Days</span>
	</a></li><li>
	<a time="pastMonth" class="timeChoice">
		<span style="font-size:14px;" ng-bind="tab.label" class="ng-binding">Past 30 Days</span>
	</a></li><li>
	<a time="pastYear" class="timeChoice">
		<span style="font-size:14px;" ng-bind="tab.label" class="ng-binding">Past 365 Days</span>
	</a></li><li>
	<a time="allTime" class="timeChoice">
		<span style="font-size:14px;" ng-bind="tab.label" class="ng-binding">All Time</span>
	</a></li></ul></div></div>`
	div = document.createElement('div')
	div.innerHTML = playTimeHTML
	titleContainer = document.getElementsByClassName('game-title-container')
	if (titleContainer.length > 0) {
		titleContainer[0].appendChild(div)
	}
	if (await checkVerification()) {
		updatePlayTime(gameId, 1)
	} else {
		var mostPlayedLoadingBar = document.getElementById('mostPlayedLoadingBar')
		var timeDropdown = document.getElementById('timeDropdown')
		var playTimeText = getPlayTimeTextNode()
		if (mostPlayedLoadingBar != null) {
			mostPlayedLoadingBar.style.display = "none"
		}
		if (timeDropdown != null) {
			timeDropdown.style.pointerEvents = "none"
		}
		if (playTimeText != null) {
			playTimeRenderToken = playTimeRenderToken + 1
			playTimeText.setAttribute("data-ropro-playtime-render-token", String(playTimeRenderToken))
				playTimeText.textContent = "Verify User"
			playTimeText.href = "https://roblox.com/home"
			playTimeText.target = "_blank"
		}
	}
	var morePlaytimeSorts = true
	$('.timeChoice').click(function(){
		time = this.getAttribute("time")
		if (time == "today") {
			document.getElementById('timeLabel').innerText = "Past Day"
			updatePlayTime(gameId, 1)
		} else if (time == "pastWeek") {
			document.getElementById('timeLabel').innerText = "Past 7 Days"
			updatePlayTime(gameId, 7)
		} else if (time == "pastMonth") {
			if (morePlaytimeSorts) {
				document.getElementById('timeLabel').innerText = "Past 30 Days"
				updatePlayTime(gameId, 30)
			} else {
				upgradeModal()
			}
		} else if (time == "pastYear") {
			if (morePlaytimeSorts) {
				document.getElementById('timeLabel').innerText = "Past 365 Days"
				updatePlayTime(gameId, 365)
			} else {
				upgradeModal()
			}
		} else if (time == "allTime") {
			if (morePlaytimeSorts) {
				document.getElementById('timeLabel').innerText = "All Time"
				updatePlayTime(gameId, 999)
			} else {
				upgradeModal()
			}
		}
	})
}

function addRecentServer(myUniverseId) {
	friendServers = document.getElementById('rbx-friends-running-games')
	if (friendServers != null) {
		mostRecentServerDiv = document.createElement('div')
		mostRecentServerDiv.innerHTML = mostRecentServerHTML
		friendServers.parentNode.insertBefore(mostRecentServerDiv, friendServers)
	}
	$(".rbx-refresh").off('click.roproMostRecentServer').on('click.roproMostRecentServer', function() {
		if (!isPublicRunningGamesRefreshButton(this)) {
			return
		}
		loadMostRecentServer(myUniverseId)
	})
}

function divide(number, divisor) {
  // From GeeksforGeeks
  let ans = "";
  let idx = 0;
  let temp = number[idx] - "0";
  while (temp < divisor) {
    temp = temp * 10 + number[idx + 1].charCodeAt(0) - "0".charCodeAt(0);
    idx += 1;
  }
  idx += 1;
  while (number.length > idx) {
    ans += String.fromCharCode(Math.floor(temp / divisor) + "0".charCodeAt(0));
    temp =
      (temp % divisor) * 10 + number[idx].charCodeAt(0) - "0".charCodeAt(0);
    idx += 1;
  }
  ans += String.fromCharCode(Math.floor(temp / divisor) + "0".charCodeAt(0));
  if (ans.length == 0) return "0";
  return ans;
}

async function playVoiceServer(serverId, serverName) {
	outer = document.getElementById('rbx-body')
	modalcontainer = document.createElement('div')
	modalcontainer.id = "voiceServerModalContainer"
	outer.appendChild(modalcontainer)
	overlay = document.createElement('div')
	overlay.innerHTML = randomServerOverlayHTML
	modal = document.createElement('div')
	modal.innerHTML = voiceServerModalHTML
	modal.getElementsByClassName('voice-server-loading-text')[0].innerText = `Loading voice server ${stripTags(serverName)}...`
	modalcontainer.appendChild(overlay)
	modalcontainer.appendChild(modal)
	modalcontainer.getElementsByClassName('close')[0].addEventListener('click', function() {
		document.getElementById('voiceServerModalContainer').remove()
	})
	setTimeout(async function() {
		server = await fetchVoiceServer(globalGameId, serverId)
		document.getElementById('voiceServerModalContainer').remove()
		if (server.hasOwnProperty('accessCode')) {
			if (!document.body.classList.contains("ropro-cloud-play-activated")) {
				Roblox.GameLauncher.joinPrivateGame(
					parseInt(globalGameId),
					stripTags(server.accessCode),
					stripTags(divide(divide(atob(atob(server.key)), "" + serverId), "" + globalGameId))
				)
			}
		}
	}, 1000)
}

var voiceServerIndex = 0;
var voiceServers = null;
async function addVoiceServers(placeId) {
	var initialLoad = document.getElementsByClassName('ropro-voice-servers-container').length == 0
	var roproVoiceServersDiv = document.createElement('div')
	roproVoiceServersDiv.id = "roproVoiceServers"
	document.body.appendChild(roproVoiceServersDiv)
	friendServers = document.getElementById('rbx-friends-running-games')
	voiceEnabledLabel = document.getElementById('voice-enabled-label')
	if (friendServers != null && voiceEnabledLabel != null) {
		voiceServers = await fetchVoiceServers(placeId)
		if (voiceServers.length > 0) {
			var voiceServersDiv = document.createElement('div')
			voiceServersDiv.innerHTML = roproVoiceServersHTML
			voiceServersDiv = voiceServersDiv.childNodes[0]
			var initialLoad = document.getElementsByClassName('ropro-voice-servers-container').length == 0
			if (initialLoad) {
				friendServers.parentNode.insertBefore(voiceServersDiv, friendServers)
				voiceServersDiv.getElementsByClassName('rbx-refresh')[0].addEventListener('click', function() {
					document.getElementById('ropro-voice-servers-list').innerHTML = ""
					document.getElementById('roproVoiceServersContainer').getElementsByClassName('rbx-public-running-games-load-more')[0].style.display = "block"
					addVoiceServers(globalGameId)
				})
			}
			voiceServerIndex = 0;
			var playerTokens = []
			for (var i = 0; i < Math.min(voiceServers.length, 3); i++) {
				thumbnails = ""
				for (var j = 0; j < voiceServers[i].playerTokens.length; j++) {
					playerTokens.push(voiceServers[i].playerTokens[j])
					thumbnails += `<span class="avatar avatar-headshot-md player-avatar" style="width:57px;height:57px;"><span class="thumbnail-2d-container avatar-card-image" style="border-radius:25%;background-color:${theme == "dark" ? "#2E2F31" : "#E3E3E3"};"><img class="ropro-player-thumbnail-${stripTags(voiceServers[i].playerTokens[j])}" src="${chrome.runtime.getURL('/images/empty.png')}" alt="" title=""></span></span>`
				}
				voiceServerHTML = `<li class="rbx-public-game-server-item col-md-4 col-sm-4 col-xs-4 ropro-checked ropro-server-invite-added"><div class="card-item ropro-voice-server-card" style="border-radius:10px;filter: drop-shadow(0px 0px 1px ${theme == "dark" ? "#242527" : "#5E5E5E"});"><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-14px;font-size:12px;padding:8px;border-top-left-radius:10px;border-top-right-radius:10px;float:left;background-color:${theme == "dark" ? "#2E2F31" : "#E3E3E3"};padding-top:4px;"><span style="margin-top:5px;margin-left:10px;font-weight:bold;font-size:17px;float:left;color:${theme == "dark" ? "white" : "#393b3d"};">${stripTags(voiceServers[i].name)}</span><span style="margin-top:5px;margin-right:10px;font-size:15px;float:right;">${parseInt(voiceServers[i].numPlayers)} / ${parseInt(voiceServers[i].maxPlayers)}</span></div><div class="player-thumbnails-container ropro-player-icon-list" style="max-width:${voiceServers[i].playerTokens.length > 8 ? '265px' : '249px'};height:126px;overflow-y:auto;">${thumbnails}</div><div class="ropro-voice-server-play-button" data-server-id="${parseInt(voiceServers[i].vipServerId)}" data-server-name="${stripTags(voiceServers[i].name)}" style="cursor:pointer;width:100%;height:40px;background-color:#5E5E5E;margin-top:-12px;border-radius:8px;position:relative;overflow:hidden;"><img src="${chrome.runtime.getURL('/images/Signet.png')}" style="position:absolute;left:0;height:100%;"><img src="${chrome.runtime.getURL('/images/play.png')}" style="height:20px;margin-top:10px;"></div><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-12px;font-size:12px;padding:0px;height:6px;border-bottom-left-radius:10px;border-bottom-right-radius:10px;float:left;background-color:${theme == "dark" ? "#191B1D" : "#E3E3E3"};overflow:hidden;"><div style="width:${parseInt(voiceServers[i].numPlayers) / parseInt(voiceServers[i].maxPlayers) * 100}%;height:100%;background-color:#7C7C7C;"></div></div></div></li>`
				var div = document.createElement('div')
				div.innerHTML += voiceServerHTML
				div.getElementsByClassName('ropro-voice-server-play-button')[0].addEventListener('click', function(){
					var serverId = parseInt(this.getAttribute('data-server-id'))
					var serverName = this.getAttribute('data-server-name')
					playVoiceServer(serverId, serverName)
				})
				document.getElementById('ropro-voice-servers-list').appendChild(div.childNodes[0])
			}
			getPlayerThumbnails(playerTokens, "AvatarBust")
			voiceServerIndex += 3
			if (initialLoad) {
				document.getElementById('roproVoiceServersContainer').getElementsByClassName('rbx-public-running-games-load-more')[0].addEventListener('click', async function(){
					premiumVoiceServers = await fetchSetting('premiumVoiceServers')
					var playerTokens = []
					for (var i = voiceServerIndex; i < Math.min(voiceServers.length, voiceServerIndex + 3); i++) {
						thumbnails = ""
						for (var j = 0; j < voiceServers[i].playerTokens.length; j++) {
							playerTokens.push(voiceServers[i].playerTokens[j])
							thumbnails += `<span class="avatar avatar-headshot-md player-avatar" style="width:57px;height:57px;"><span class="thumbnail-2d-container avatar-card-image" style="border-radius:25%;background-color:${theme == "dark" ? "#2E2F31" : "#E3E3E3"};"><img class="ropro-player-thumbnail-${stripTags(voiceServers[i].playerTokens[j])}" src="${chrome.runtime.getURL('/images/empty.png')}" alt="" title=""></span></span>`
						}
						if (premiumVoiceServers) {
							voiceServerHTML = `<li class="rbx-public-game-server-item col-md-4 col-sm-4 col-xs-4 ropro-checked ropro-server-invite-added"><div class="card-item ropro-voice-server-card" style="border-radius:10px;filter: drop-shadow(0px 0px 1px ${theme == "dark" ? "#242527" : "#5E5E5E"});"><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-14px;font-size:12px;padding:8px;border-top-left-radius:10px;border-top-right-radius:10px;float:left;background-color:${theme == "dark" ? "#2E2F31" : "#E3E3E3"};padding-top:4px;"><span style="margin-top:5px;margin-left:10px;font-weight:bold;font-size:17px;float:left;color:${theme == "dark" ? "white" : "#393b3d"};">${stripTags(voiceServers[i].name)}</span><span style="margin-top:5px;margin-right:10px;font-size:15px;float:right;">${parseInt(voiceServers[i].numPlayers)} / ${parseInt(voiceServers[i].maxPlayers)}</span></div><div class="player-thumbnails-container ropro-player-icon-list" style="max-width:249px;height:126px;overflow-y:auto;">${thumbnails}</div><div class="ropro-voice-server-play-button" data-server-id="${parseInt(voiceServers[i].vipServerId)}" data-server-name="${stripTags(voiceServers[i].name)}" style="cursor:pointer;width:100%;height:40px;margin-top:-12px;border-radius:8px;position:relative;overflow:hidden;background-color:#0084DC;"><img src="${chrome.runtime.getURL('/images/Signet.png')}" style="position:absolute;left:0;height:100%;"><img src="${chrome.runtime.getURL('/images/play.png')}" style="height:20px;margin-top:10px;"></div><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-12px;font-size:12px;padding:0px;height:6px;border-bottom-left-radius:10px;border-bottom-right-radius:10px;float:left;background-color:${theme == "dark" ? "#191B1D" : "#E3E3E3"};overflow:hidden;"><div style="width:${parseInt(voiceServers[i].numPlayers) / parseInt(voiceServers[i].maxPlayers) * 100}%;height:100%;background-color:#0084DC;"></div></div></div></li>`
						} else {
				voiceServerHTML = `<li class="rbx-public-game-server-item col-md-4 col-sm-4 col-xs-4 ropro-checked ropro-server-invite-added"><div class="card-item ropro-voice-server-card" style="border-radius:10px;filter: drop-shadow(0px 0px 1px ${theme == "dark" ? "#242527" : "#5E5E5E"});"><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-14px;font-size:12px;padding:8px;border-top-left-radius:10px;border-top-right-radius:10px;float:left;background-color:${theme == "dark" ? "#2E2F31" : "#E3E3E3"};padding-top:4px;"><span style="margin-top:5px;margin-left:10px;font-weight:bold;font-size:17px;float:left;color:${theme == "dark" ? "white" : "#393b3d"};">${stripTags(voiceServers[i].name)}</span><span style="margin-top:5px;margin-right:10px;font-size:15px;float:right;">${parseInt(voiceServers[i].numPlayers)} / ${parseInt(voiceServers[i].maxPlayers)}</span></div><div class="player-thumbnails-container ropro-player-icon-list" style="max-width:249px;height:126px;overflow-y:auto;">${thumbnails}</div><a href="https://ropro.io?upgrade" target="_blank" rel="noopener noreferrer" class="ropro-voice-server-upgrade-link" style="position:absolute;bottom:0px;left:calc(50% - 33.5px);z-index:10;"><img class="ropro-voice-server-play-lock" src="${chrome.runtime.getURL('/images/lock.png')}" style="height:90px;"></a><a href="https://ropro.io?upgrade" target="_blank" rel="noopener noreferrer" class="ropro-voice-server-play-button ropro-voice-server-upgrade-link" data-server-id="${parseInt(voiceServers[i].vipServerId)}" data-server-name="${stripTags(voiceServers[i].name)}" style="cursor:pointer;width:100%;height:40px;margin-top:-12px;border-radius:8px;position:relative;overflow:hidden;background-color:#0084DC;opacity:0.6;"><img src="${chrome.runtime.getURL('/images/Signet.png')}" style="position:absolute;left:0;height:100%;"><img src="${chrome.runtime.getURL('/images/play.png')}" style="height:20px;margin-top:10px;"></a><div style="margin-top:-12px;margin-left:-12px;width:calc(100% + 24px);margin-bottom:-12px;font-size:12px;padding:0px;height:6px;border-bottom-left-radius:10px;border-bottom-right-radius:10px;float:left;background-color:${theme == "dark" ? "#191B1D" : "#E3E3E3"};overflow:hidden;"><div style="width:${parseInt(voiceServers[i].numPlayers) / parseInt(voiceServers[i].maxPlayers) * 100}%;height:100%;background-color:#0084DC;"></div></div></div></li>`
						}
						var div = document.createElement('div')
						div.innerHTML += voiceServerHTML
						if (premiumVoiceServers) {
							div.getElementsByClassName('ropro-voice-server-play-button')[0].addEventListener('click', function(){
								var serverId = parseInt(this.getAttribute('data-server-id'))
								var serverName = this.getAttribute('data-server-name')
								playVoiceServer(serverId, serverName)
							})
						}
						document.getElementById('ropro-voice-servers-list').appendChild(div.childNodes[0])
						if (i == voiceServers.length - 1) {
							document.getElementById('roproVoiceServersContainer').getElementsByClassName('rbx-public-running-games-load-more')[0].style.display = "none"
						}
					}
					getPlayerThumbnails(playerTokens, "AvatarBust")
					voiceServerIndex += 3
				})
			}
		}
	}
}

async function loadMostRecentServer(myUniverseId) { //Check if recent server is still active before displaying it to user, otherwise remove it from recent server cache.
	mostRecentServers = await getLocalStorage("mostRecentServers")
	if (myUniverseId in mostRecentServers) {
		addMostRecentServer(mostRecentServers[myUniverseId][0], mostRecentServers[myUniverseId][1], mostRecentServers[myUniverseId][2], mostRecentServers[myUniverseId][3], true)
		/**var serverStatus = new XMLHttpRequest();
		serverStatus.open("GET", `https://assetgame.roblox.com/Game/PlaceLauncher.ashx?request=RequestGameJob&placeId=${mostRecentServers[myUniverseId][0]}&gameId=${mostRecentServers[myUniverseId][1]}`, true);
		serverStatus.withCredentials = true;
		serverStatus.send();
		serverStatus.onreadystatechange = function() {
			if (serverStatus.readyState === 4) {
			  var status = JSON.parse(serverStatus.responseText);
				if (serverStatus.status === 200) {
					if (status.jobId != null) { //Server is still active - display it in recent server box.
						addMostRecentServer(mostRecentServers[myUniverseId][0], mostRecentServers[myUniverseId][1], mostRecentServers[myUniverseId][2], mostRecentServers[myUniverseId][3], true)
					} else { //Server is now inactive - remove it from recent.
						addMostRecentServer(mostRecentServers[myUniverseId][0], mostRecentServers[myUniverseId][1], mostRecentServers[myUniverseId][2], mostRecentServers[myUniverseId][3], false)
					}
				}
			}
		}**/
	}
}

function ensureShareInviteModalStyles() {
	if (document.getElementById('ropro-share-invite-modal-style') != null) {
		return
	}
	var style = document.createElement('style')
	style.id = 'ropro-share-invite-modal-style'
	style.textContent = `
.ropro-share-link-card {
	position: absolute;
	width: 260px;
	padding: 12px;
	border-radius: 14px;
	background: linear-gradient(145deg, rgba(27, 31, 40, 0.96), rgba(19, 24, 31, 0.96));
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow: 0 10px 26px rgba(0, 0, 0, 0.34);
	backdrop-filter: blur(8px);
	color: #ffffff;
	z-index: 1200;
}
.ropro-share-link-header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
}
.ropro-share-link-header-icon {
	width: 20px;
	height: 20px;
}
.ropro-share-link-title {
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 0.02em;
	margin: 0;
}
.ropro-share-link-subtitle {
	margin: 0;
	font-size: 11px;
	color: rgba(255, 255, 255, 0.7);
}
.ropro-share-link-field {
	position: relative;
}
.ropro-share-link-input {
	width: 100%;
	height: 36px;
	background: rgba(0, 0, 0, 0.24);
	border: 1px solid rgba(255, 255, 255, 0.24);
	border-radius: 10px;
	color: #ffffff;
	font-size: 12px;
	padding: 0 40px 0 10px;
	outline: none;
}
.ropro-share-link-copy-button {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	background: rgba(255, 255, 255, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
}
.ropro-share-link-copy-button:hover {
	background: rgba(255, 255, 255, 0.2);
}
.ropro-share-link-copy-button:disabled {
	cursor: default;
	opacity: 0.45;
}
.ropro-share-link-copy-icon {
	width: 14px;
	height: 14px;
	filter: invert(1);
}
.ropro-share-link-feedback {
	position: absolute;
	top: -24px;
	right: 0;
	background: rgba(15, 18, 24, 0.96);
	padding: 3px 8px;
	border-radius: 7px;
	font-size: 11px;
	opacity: 0;
	transform: translateY(4px);
	transition: opacity 140ms ease, transform 140ms ease;
}
.ropro-share-link-feedback.active {
	opacity: 1;
	transform: translateY(0);
}
.ropro-share-link-loading {
	display: inline-flex;
	width: 100%;
	min-height: 96px;
	margin: 6px auto 0;
}
.ropro-share-link-arrow {
	left: 146px;
	transform: rotate(180deg) scale(2);
	top: initial;
	bottom: -10px;
}
.ropro-share-link-card.ropro-share-link-error .ropro-share-link-input {
	color: #ffc9c9;
	border-color: rgba(255, 131, 131, 0.6);
}
`
	document.head.appendChild(style)
}

function normalizeShareInviteValue(invite) {
	if (typeof invite !== "string") {
		return "Error creating link, please try again."
	}
	var normalizedInvite = stripTags(invite).trim()
	if (normalizedInvite.length === 0) {
		return "Error creating link, please try again."
	}
	normalizedInvite = normalizedInvite.replace(/^https?:\/\//i, "")
	normalizedInvite = normalizedInvite.replace(/^ropro\.io\/join\//i, "ro.pro/")
	normalizedInvite = normalizedInvite.replace(/^staging\.ropro\.io\/join\//i, "ro.pro/")
	return normalizedInvite
}

async function createInviteLink(elem, serverid, placeid) {
	if (document.getElementsByClassName('server-invite-link-box').length > 0) {
		if (document.getElementsByClassName('server-invite-link-box')[0].parentNode == elem) {
			document.getElementsByClassName('server-invite-link-box')[0].remove()
			return
		}
		document.getElementsByClassName('server-invite-link-box')[0].remove()
	}
	ensureShareInviteModalStyles()
	var topOffset = "-120px"
	var leftOffset = elem.classList.contains('create-server-invite-button') ? "-97px" : "-107px"
	var inviteContainer = document.createElement('div')
	inviteContainer.innerHTML = `<div uib-popover-template-popup="" uib-title="" class="dark-theme tradeinfocard popover ng-scope ng-isolate-scope bottom people-info-card-container card-with-game fade in server-invite-link-box ropro-share-link-card" tooltip-animation-class="fade" uib-tooltip-classes="" ng-class="{ in: isOpen }">
		<div class="ropro-share-link-header">
			<img src="${chrome.runtime.getURL('/images/ropro_icon_white.png')}" class="ropro-share-link-header-icon">
			<div>
				<p class="ropro-share-link-title">RoPro Share Link</p>
				<p class="ropro-share-link-subtitle">Copy and share this server instantly.</p>
			</div>
		</div>
		<div class="ropro-share-link-field">
			<p class="ropro-share-link-feedback">Copied to clipboard.</p>
			<input class="ropro-share-link-input copy-clipboard-button" readonly value="">
			<button class="ropro-share-link-copy-button" type="button" disabled>
				<img src="${chrome.runtime.getURL('/images/copy.png')}" class="ropro-share-link-copy-icon">
			</button>
		</div>
		${buildRoProLoader({ className: "ropro-share-link-loading" })}
		<div class="ropro-arrow arrow ropro-share-link-arrow"></div>
	</div>`
	var inviteBox = inviteContainer.childNodes[0]
	inviteBox.style.top = topOffset
	inviteBox.style.left = leftOffset
	elem.appendChild(inviteBox)
	var inviteInput = inviteBox.getElementsByClassName('copy-clipboard-button')[0]
	var inviteCopyButton = inviteBox.getElementsByClassName('ropro-share-link-copy-button')[0]
	var inviteFeedback = inviteBox.getElementsByClassName('ropro-share-link-feedback')[0]
	var inviteLoading = inviteBox.getElementsByClassName('ropro-share-link-loading')[0]
	var inviteResponse = await createInvite(myUniverseId, serverid)
	var invite = normalizeShareInviteValue(inviteResponse)
	inviteInput.value = invite
	inviteLoading.style.display = "none"
	if (invite.toLowerCase().indexOf("error creating link") === 0) {
		inviteBox.classList.add('ropro-share-link-error')
	} else {
		inviteCopyButton.disabled = false
		var copyInviteLink = async function(event) {
			inviteInput.select()
			inviteInput.setSelectionRange(0, 99999)
			try {
				await navigator.clipboard.writeText(inviteInput.value)
			} catch (_) {}
			inviteFeedback.classList.add('active')
			setTimeout(function() {
				inviteFeedback.classList.remove('active')
			}, 650)
				if (event != null) {
					if (typeof event.preventDefault === "function") {
						event.preventDefault()
					}
					event.stopPropagation()
				}
		}
		inviteInput.addEventListener('click', copyInviteLink)
		inviteCopyButton.addEventListener('click', copyInviteLink)
	}
	inviteBox.addEventListener('click', function(event) {
		event.stopPropagation()
	})
}

async function createSpeedTest(elem, serverid, placeid) {
	if (document.getElementsByClassName('server-speed-test-box').length > 0) {
		if (document.getElementsByClassName('server-speed-test-box')[0].parentNode == elem) {
			document.getElementsByClassName('server-speed-test-box')[0].remove()
			return
		}
		document.getElementsByClassName('server-speed-test-box')[0].remove()
	}
	if (elem.classList.contains('create-server-invite-button')) {
		pos = "top: -315px; left: -102px;"
	} else {
		pos = "top: -315px; left: -123px;"
	}
	speedTestHTML = `<div uib-popover-template-popup="" uib-title="" class="dark-theme tradeinfocard popover ng-scope ng-isolate-scope bottom people-info-card-container card-with-game fade in server-speed-test-box" tooltip-animation-class="fade" uib-tooltip-classes="" ng-class="{ in: isOpen }" style="filter: drop-shadow(rgb(0, 0, 0) 0px 0px 1px);${pos} width: 300px; height: 300px;border-radius:10px;">
	<h2 style="padding-bottom:5px;border-bottom: 2px solid #FFFFFF;font-family:HCo Gotham SSm;color:white;font-size:30px;top:25px;left:25px;width:250px;margin:auto;">
			<img style="width:50px;left:0px;margin-bottom:-5px;margin-left:10px;" src="${chrome.runtime.getURL('/images/ropro_logo.png')}">
			<p style="color:white;display:inline-block;font-size:15px;font-weight:650;border-bottom: 1px solid #FFFFFF;">Server Ping Test<img src="${chrome.runtime.getURL('/images/speed_icon.svg')}" style="filter:invert(1);width:20px;margin-left:7px;"></p><p style="margin-top:5px;margin-left:10px;color:white;display:inline-block;font-size:9px;font-weight:100;">To avoid sending unnecessary traffic to Roblox servers, RoPro sends test data to one of our own servers in the same region as this Roblox server.</p>
		</h2><div style="width:250px;margin:auto;margin-top:10px;border-radius:10px;" class="input-group server-invite-link-input">${buildRoProLoader({ className: "ropro-branded-loader-compact-section", style: "width:100%; min-height:140px; margin-top:24px;" })}</div><div style="left: 135px; transform: rotate(180deg) scale(2); top: initial; bottom: -10px;" class="ropro-arrow arrow"></div>
	<div class="popover-inner" style="width:100px;height:100px;">		
	</div></div>`
	div = document.createElement('div')
	div.innerHTML = speedTestHTML
	speedTestBox = div.childNodes[0]
	elem.appendChild(speedTestBox)
	speedTestBox.addEventListener('click', function(event) {
		event.stopPropagation()
	})
}

function normalizeServerRowPopulationDisplay(elem) {
	if (elem == null || typeof elem.getElementsByClassName !== "function") {
		return
	}
	var gaugeBars = elem.getElementsByClassName('gauge-inner-bar')
	var gaugeBar = gaugeBars.length > 0 ? gaugeBars[0] : null
	var rawGaugeWidth = gaugeBar != null ? parseFloat(gaugeBar.style.width) : NaN
	if (Number.isFinite(rawGaugeWidth) && rawGaugeWidth > 100) {
		gaugeBar.style.width = "100%"
	}
	var statusNodes = elem.getElementsByClassName('rbx-public-game-server-status')
	if (statusNodes.length === 0) {
		statusNodes = elem.getElementsByClassName('rbx-friends-game-server-status')
	}
	if (statusNodes.length === 0) {
		return
	}
	var populationStatusNode = statusNodes[0]
	var statusText = stripTags(populationStatusNode.textContent || "")
	var statusMatch = statusText.match(/(\d+)\s+of\s+(\d+)\s+people\s+max/i)
	if (statusMatch == null || statusMatch.length < 3) {
		return
	}
	var playingCount = parseInt(statusMatch[1], 10)
	var maxPlayersCount = parseInt(statusMatch[2], 10)
	if (!Number.isFinite(playingCount) || playingCount < 0 || !Number.isFinite(maxPlayersCount) || maxPlayersCount <= 0) {
		return
	}
	var normalizedPlayingCount = Math.min(playingCount, maxPlayersCount)
	var normalizedPlayerCountText = normalizedPlayingCount + " of " + maxPlayersCount + " people max"
	if (populationStatusNode.textContent !== normalizedPlayerCountText) {
		populationStatusNode.textContent = normalizedPlayerCountText
	}
	var normalizedGaugePercent = Math.max(0, Math.min(100, Math.round(normalizedPlayingCount / maxPlayersCount * 100)))
	if (gaugeBar != null) {
		gaugeBar.style.width = normalizedGaugePercent + "%"
	}
	var hiddenPlayerPlaceholders = elem.getElementsByClassName('hidden-players-placeholder')
	if (hiddenPlayerPlaceholders.length > 0) {
		var hiddenPlayerCount = normalizedPlayingCount - 5
		if (hiddenPlayerCount > 0) {
			hiddenPlayerPlaceholders[0].textContent = "+" + hiddenPlayerCount
		} else {
			hiddenPlayerPlaceholders[0].remove()
		}
	}
}

function addServerInviteButton(elem, serverid, placeid, serverPing) {
	var normalizedServerPing = parseServerPingValue(serverPing)
	var normalizedServerId = sanitizeServerId(serverid)
	var normalizedPlaceId = parseInt(placeid, 10)
	if (!Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
		normalizedPlaceId = parseInt(globalGameId, 10)
	}
	if (normalizedServerId.length === 0 || !Number.isFinite(normalizedPlaceId) || normalizedPlaceId <= 0) {
		return
	}
	var serverInviteButtonHTML = ""
	var div = null
	var button = null
	normalizeServerRowPopulationDisplay(elem)
	if (
		serverPingVisibilityEnabled &&
		!Number.isFinite(normalizedServerPing)
	) {
		refreshServerPingHints(false).catch(function() {})
	}
	if (!elem.classList.contains("ropro-server-invite-added")) {
		if (serverPingVisibilityEnabled) {
			serverInfoQueue.push([elem, normalizedServerId, normalizedServerPing])
		}
		elem.classList.add('ropro-server-invite-added')
	}
	if (!serverInviteLinksEnabled) {
		return
	}
	if (elem.getElementsByClassName('create-server-link').length > 0) {
		return
	}
	if (elem.classList.contains('rbx-friends-game-server-item')) {
		serverInviteButtonHTML = `<a style="width:30%;margin-left:2%;position:relative!important;" class="btn-full-width btn-control-xs create-server-link" data-placeid="${normalizedPlaceId}" data-serverid="${normalizedServerId}">Share</a>`
		div = document.createElement('div')
		div.innerHTML = serverInviteButtonHTML
		button = div.childNodes[0]
		elem.getElementsByClassName('rbx-friends-game-server-join')[0].style.width = "68%"
		if (elem.getElementsByClassName('rbx-friends-game-server-details').length > 0) {
			elem.getElementsByClassName('rbx-friends-game-server-details')[0].appendChild(button)
		} else if (elem.getElementsByClassName("rbx-friends-game-server-details'").length > 0) {
			elem.getElementsByClassName("rbx-friends-game-server-details'")[0].appendChild(button)
		}
		button.addEventListener('click', function(event) {
			createInviteLink(this, this.getAttribute('data-serverid'), this.getAttribute('data-placeid'))
			event.stopPropagation()
		})
		} else {
			serverInviteButtonHTML = `<a class="btn-full-width btn-control-xs create-server-link ropro-server-share-btn" data-placeid="${normalizedPlaceId}" data-serverid="${normalizedServerId}">Share</a>`
			div = document.createElement('div')
			div.innerHTML = serverInviteButtonHTML
			button = div.childNodes[0]
			var publicJoinButton = elem.getElementsByClassName('rbx-public-game-server-join')[0]
			if (typeof publicJoinButton != 'undefined') {
				publicJoinButton.classList.add('ropro-server-join-btn-with-share')
			}
			var gameServerDetails = elem.getElementsByClassName('rbx-public-game-server-details')[0]
			if (typeof gameServerDetails == 'undefined' && elem.getElementsByClassName("rbx-public-game-server-details'").length > 0) {
				gameServerDetails = elem.getElementsByClassName("rbx-public-game-server-details'")[0]
			}
			if (typeof gameServerDetails != 'undefined') {
				var joinButtonContainer = gameServerDetails.querySelector('span[data-placeid]')
				if (joinButtonContainer == null && publicJoinButton != null) {
					joinButtonContainer = publicJoinButton.parentElement
				}
				var serverIdText = gameServerDetails.getElementsByClassName('server-id-text')[0]
				if (joinButtonContainer != null) {
					joinButtonContainer.classList.add('ropro-server-join-btn-container')
					var actionsRow = gameServerDetails.getElementsByClassName('ropro-server-actions-row')[0]
					if (typeof actionsRow == 'undefined') {
						actionsRow = document.createElement('div')
						actionsRow.className = 'ropro-server-actions-row'
						if (typeof serverIdText != 'undefined') {
							gameServerDetails.insertBefore(actionsRow, serverIdText)
						} else {
							gameServerDetails.appendChild(actionsRow)
						}
					}
					if (
  						joinButtonContainer &&
  						actionsRow &&
  						joinButtonContainer.parentNode !== actionsRow &&
  						!joinButtonContainer.contains(actionsRow)
					) {
  					actionsRow.appendChild(joinButtonContainer)
					}
					actionsRow.appendChild(button)
				} else if (typeof serverIdText != 'undefined') {
					gameServerDetails.insertBefore(button, serverIdText)
				} else {
					gameServerDetails.appendChild(button)
				}
			}
			button.addEventListener('click', function(event) {
				createInviteLink(this, this.getAttribute('data-serverid'), this.getAttribute('data-placeid'))
				event.stopPropagation()
			})
		/**if (serverSpeedButton) {
			button.setAttribute('style', 'width:15%;position:relative!important;float:right;margin-right:0%;')
			serverSpeedButtonHTML = `<a style="width:15%;position:relative!important;float:right;margin-right:3%;" class="btn-full-width btn-control-xs server-speed-button" data-placeid="${normalizedPlaceId}" data-serverid="${normalizedServerId}"><img src="${chrome.runtime.getURL('/images/speed_icon.svg')}" style="filter:invert(1);width:11.5px;transform:scale(1.2);"></a>`
			div = document.createElement('div')
			div.innerHTML = serverSpeedButtonHTML
			button = div.childNodes[0]
			elem.getElementsByClassName('rbx-public-game-server-join')[0].style.width = "64%"
			elem.getElementsByClassName('rbx-public-game-server-details')[0].appendChild(button)
			button.addEventListener('click', function(event) {
				createSpeedTest(this, this.getAttribute('data-serverid'), this.getAttribute('data-placeid'))
				event.stopPropagation()
			})
		}**/
	}
}

function addMostRecentServer(placeID, serverID, userID, time, serverActive) {
	timeSince = Math.round(new Date().getTime() - parseInt(time)) / 1000
	var recentServerTimerIconSrc = chrome.runtime.getURL('/images/timer_light.svg')
	var recentServerTimerIconFilter = theme == "dark" ? "invert(1) brightness(1.2)" : "none"
	var recentServerButtonOffsetStyle = "margin-top:8px;"
	if (timeSince < 60) { //seconds
		period = Math.round(timeSince)
		suffix = period == 1 ? "" : "s"
		timeString = `Now`
	} else if (timeSince / 60 < 60) { //minutes
		period = Math.round(timeSince / 60)
		if (timeSince / 60 > 1.25) {
			suffix = period == 1 ? "" : "s"
			timeString = `${period} minute${suffix} ago`
		} else {
			timeString = `Now`
		}
	} else if (timeSince / 60 / 60 < 24) { //hours
		period = Math.round(timeSince / 60 / 60)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} hour${suffix} ago`
	} else if (timeSince / 60 / 60 / 24 < 30) { //days
		period = Math.round(timeSince / 60 / 60 / 24)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} day${suffix} ago`
	} else { //months
		period = Math.round(timeSince / 60 / 60 / 24 / 30)
		suffix = period == 1 ? "" : "s"
		timeString = `${period} month${suffix} ago`
	}
	if (serverActive) {
		document.getElementById('rbx-recent-server-box').innerHTML = `<li style="border-radius:8px;margin-top:-5px;margin-left:-5px;margin-right:5px;padding:20px;" data-gameid="${stripTags(serverID)}" class="stack-row rbx-public-game-server-item ropro-checked"><div class="section-header"><div class="link-menu rbx-public-game-server-menu"></div></div><div style="width:90%;position:relative;" class="section-left rbx-public-game-server-details">
		<div style="float:left;" class="text-info rbx-game-status rbx-public-game-server-status"><b>Last Played:</b><img style="background-image:none;margin:0px;margin-top:-2px;margin-bottom:1px;transform:scale(1);border:none;margin-left:5px;margin-right:5px;width:15px;height:15px;filter:${recentServerTimerIconFilter};" src="${recentServerTimerIconSrc}" class="info-label icon-pastname">${stripTags(timeString)}</div><div style="float:left;" class="text-info rbx-game-status rbx-public-game-server-status"></div>
		<div class="rbx-public-game-server-alert hidden"><span class="icon-remove"></span>Slow Game</div><a style="${recentServerButtonOffsetStyle}" class="ropro-game-server-join rbx-public-game-server-join ropro-server-join-btn-with-share btn-full-width btn-control-xs" data-ropro-recent-rejoin="true" data-serverid="${sanitizeServerId(serverID)}" data-gameid="${sanitizeServerId(serverID)}" data-placeid="${parseInt(placeID)}">Rejoin Server</a><a style="${recentServerButtonOffsetStyle}" class="create-server-link ropro-server-share-btn create-server-invite-button btn-full-width btn-control-xs" data-serverid="${sanitizeServerId(serverID)}" data-placeid="${parseInt(placeID)}">Share</a></div><div style="width:5%;margin-top:13px;margin-right:2.1%;float:right;" class="section-right rbx-public-game-server-players"><span style="transform:scale(1.3);" class="avatar avatar-headshot-sm player-avatar"><a class="avatar-card-link"><img class="avatar-card-image ropro-player-thumbnail-${parseInt(userID)}"></a></span></div></li>`	
		document.getElementById('rbx-recent-server-box').getElementsByClassName('create-server-invite-button')[0].addEventListener('click', function(event) {
			createInviteLink(this, this.getAttribute('data-serverid'), this.getAttribute('data-placeid'))
			event.stopPropagation()
		})
	} else {
		document.getElementById('rbx-recent-server-box').innerHTML = `<li style="border-radius:8px;margin-top:-5px;margin-left:-5px;margin-right:5px;" data-gameid="${stripTags(serverID)}" class="stack-row rbx-public-game-server-item ropro-checked"><div class="section-header"><div class="link-menu rbx-public-game-server-menu"></div></div><div style="width:90%;position:relative;" class="section-left rbx-public-game-server-details">
		<div style="float:left;" class="text-info rbx-game-status rbx-public-game-server-status"><b>Last Played:</b><img style="background-image:none;margin:0px;margin-top:-2px;margin-bottom:1px;transform:scale(1);border:none;margin-left:5px;margin-right:5px;width:15px;height:15px;filter:${recentServerTimerIconFilter};" src="${recentServerTimerIconSrc}" class="info-label icon-pastname">${stripTags(timeString)}</div><div style="float:left;" class="text-info rbx-game-status rbx-public-game-server-status"></div>
		<div class="rbx-public-game-server-alert hidden"><span class="icon-remove"></span>Slow Game</div><a style="${recentServerButtonOffsetStyle}" class="ropro-game-server-join rbx-public-game-server-join btn-full-width btn-control-xs" data-serverid="${sanitizeServerId(serverID)}" data-gameid="${sanitizeServerId(serverID)}" data-placeid="${parseInt(placeID)}">Server No Longer Active</a></div><div style="width:9%;margin-top:13px;margin-left:1%;" class="section-right rbx-public-game-server-players"><span style="transform:scale(1.3);" class="avatar avatar-headshot-sm player-avatar"><a class="avatar-card-link"><img class="avatar-card-image ropro-player-thumbnail-${parseInt(userID)}"></a></span></div></li>`	
	}
	serverInfoQueue.push([document.getElementById('rbx-recent-server-box').getElementsByTagName('li')[0], stripTags(serverID)])
	loadPlayerThumbnails([parseInt(userID)])
}

var hidePrivateServers = false

function getPrivateServersToggleHost() {
	var privateServerCreateSections = document.getElementsByClassName('rbx-private-server-create')
	if (privateServerCreateSections.length > 0) {
		return privateServerCreateSections[0]
	}
	var privateServersList = document.getElementById('rbx-private-running-games')
	if (privateServersList != null) {
		var privateServersRoot = privateServersList.closest('.stack, .server-list-container')
		if (privateServersRoot != null) {
			var privateServersHeader = privateServersRoot.querySelector('.container-header, .server-list-container-header')
			if (privateServersHeader != null) {
				return privateServersHeader
			}
		}
	}
	return null
}

function setPrivateServersHiddenState(controlButton, statusHint) {
	var privateServersList = document.getElementById('rbx-private-running-games')
	if (privateServersList != null) {
		privateServersList.style.display = hidePrivateServers ? "none" : "block"
	}
	controlButton.innerText = hidePrivateServers ? 'Show Private Servers' : 'Hide Private Servers'
	statusHint.textContent = hidePrivateServers ? 'Hidden by default' : 'Visible'
	statusHint.title = hidePrivateServers
		? 'Private servers are hidden by RoPro. Click Show Private Servers.'
		: 'Private servers are visible. Click Hide Private Servers to hide them.'
	statusHint.setAttribute('data-hidden-state', hidePrivateServers ? "1" : "0")
}

async function persistHidePrivateServersSetting(isHidden) {
	var settings = await getStorage("rpSettings")
	if (settings == null || typeof settings !== "object") {
		settings = {}
	}
	settings["hidePrivateServers"] = isHidden
	setStorage("rpSettings", settings)
}

async function addHidePrivateServers() {
	var privateServersList = document.getElementById('rbx-private-running-games')
	var privateServersToggleHost = getPrivateServersToggleHost()
	if (privateServersList == null || privateServersToggleHost == null || document.getElementById('roproPrivateServersToggleControl') != null) {
		return
	}

	hidePrivateServers = (await fetchSetting('hidePrivateServers')) == true

	if (!hidePrivateServers) {
		return
	}

	var privateServersToggleControl = document.createElement('div')
	privateServersToggleControl.id = 'roproPrivateServersToggleControl'
	privateServersToggleControl.className = 'ropro-private-servers-toggle-control'

	var toggleButton = document.createElement('button')
	toggleButton.type = 'button'
	toggleButton.id = 'roproPrivateServersToggleButton'
	toggleButton.className = 'btn-more btn-secondary-md btn-min-width ropro-private-servers-toggle-button'

	var toggleHint = document.createElement('div')
	toggleHint.id = 'roproPrivateServersToggleHint'
	toggleHint.className = 'ropro-private-servers-toggle-hint'
	toggleHint.setAttribute('role', 'status')
	toggleHint.setAttribute('aria-live', 'polite')
	privateServersToggleControl.appendChild(toggleHint)
	privateServersToggleControl.appendChild(toggleButton)

	privateServersToggleHost.insertBefore(privateServersToggleControl, privateServersToggleHost.childNodes[0] || null)
	setPrivateServersHiddenState(toggleButton, toggleHint)

	toggleButton.addEventListener('click', async function() {
		hidePrivateServers = !hidePrivateServers
		setPrivateServersHiddenState(toggleButton, toggleHint)
		await persistHidePrivateServersSetting(hidePrivateServers)
	})
}


async function getServerInfo(queue) {
	var pendingRows = []
	var missingPingHints = false
	applyCachedServerPingHintsToVisibleRows()
	for (var i = 0; i < queue.length; i++) {
		if (!Array.isArray(queue[i]) || queue[i].length < 2) {
			continue
		}
		var elem = queue[i][0]
		var serverId = stripTags(queue[i][1])
		var serverPing = parseServerPingValue(queue[i].length > 2 ? queue[i][2] : null)
		if (elem == null || typeof elem.getAttribute !== "function") {
			continue
		}
		if (!Number.isFinite(serverPing)) {
			serverPing = parseServerPingValue(elem.getAttribute('data-server-ping'))
		}
		if (typeof serverId !== "string" || serverId.length === 0) {
			continue
		}
		if (!Number.isFinite(serverPing) && serverPingHintsById.hasOwnProperty(serverId)) {
			serverPing = parseServerPingValue(serverPingHintsById[serverId])
			if (Number.isFinite(serverPing)) {
				elem.setAttribute('data-server-ping', String(serverPing))
			}
		}
		if (serverPingVisibilityEnabled && !Number.isFinite(serverPing)) {
			missingPingHints = true
		}
		if (typeof elem.getElementsByClassName !== "function") {
			continue
		}
		if (elem.getElementsByClassName('ropro-server-info').length > 0) {
			continue
		}
		pendingRows.push({
			elem: elem,
			serverPing: serverPing
		})
	}
	if (pendingRows.length === 0) {
		return
	}
	for (var i = 0; i < pendingRows.length; i++) {
		var elem = pendingRows[i].elem
		if (
			elem == null ||
			(typeof elem.isConnected === "boolean" && !elem.isConnected) ||
			elem.getElementsByClassName('ropro-server-info').length > 0
		) {
			continue
		}
		var fallbackPingValue = pendingRows[i].serverPing
		if (!Number.isFinite(fallbackPingValue)) {
			fallbackPingValue = parseServerPingValue(elem.getAttribute('data-server-ping'))
		}
		div = document.createElement('div')
		div.innerHTML = buildServerInfoMarkup(
			parseServerPingLabel(fallbackPingValue),
			true
		)
			serverInfoDiv = div.childNodes[0]
			joinButton = elem.getElementsByClassName('rbx-public-game-server-join')[0]
			if (typeof joinButton == 'undefined') {
				joinButton = elem.getElementsByClassName('rbx-friends-game-server-join')[0]
			}
			if (typeof joinButton == 'undefined') {
				joinButton = elem.getElementsByClassName('ropro-game-server-join')[0]
				joinButton.parentNode.insertBefore(document.createElement('br'), joinButton)
				serverInfoDiv.style.float = "left"
			}
			joinButton.parentNode.insertBefore(serverInfoDiv, joinButton)
	}
	if (missingPingHints) {
		refreshServerPingHints(Object.keys(serverPingHintsById).length === 0).catch(function() {})
	}
}

function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

async function checkGamePage() {
	bindGameServerJoinDelegatedListener()
	if (window.location.href.includes("games/")) {
		gameSplit = window.location.href.split("games/")[1]
	} else {
		gameSplit = window.location.href.split("discover/")[1]
	}
			if (typeof gameSplit != 'undefined') {
				globalGameId = gameSplit.split("/")[0]
				if (isNormalInteger(globalGameId)) { // Valid Game Page
					bindServerLoadMoreScrollGuard()
					var normalizedGameId = parseInt(globalGameId, 10)
				var serverFiltersSettingPromise = fetchSetting("serverFilters")
				var serverInviteLinksSettingPromise = fetchSetting("serverInviteLinks")
				var serverPingDetailsSettingHydrationPromise = fetchSetting("additionalServerInfo")
				serverPingVisualGatePromise = fetchVisualGate(SERVER_PING_VISUAL_GATE).catch(function() {
					return { allowed: false, reason: "subscription_unknown", upgradeTier: "plus" }
				})
			serverInviteLinksSettingPromise.then(function(isEnabled) {
				serverInviteLinksEnabled = isEnabled === true
			}).catch(function() {})
			serverFiltersSettingPromise.then(function(serverFiltersEnabled) {
				if (serverFiltersEnabled && Number.isFinite(normalizedGameId) && normalizedGameId > 0) {
					startServerFilterCacheRefreshLoop(normalizedGameId)
				}
			}).catch(function() {})
			if (await fetchSetting("randomServer")) {
				addRandomServerButton()
			}
			if (await fetchSetting("cloudPlay")) {
				addCloudPlayButton()
				setInterval(function() {
					$('.ropro-cloud-play-enabled .rbx-public-game-server-join:not(.ropro-cloud-play-listener)').click(function(e) {
						if (document.body.classList.contains('ropro-cloud-play-activated')) {
							e.stopPropagation()
							var serverId = stripTags($(this).parents('.rbx-public-game-server-item').get(0).getAttribute('data-gameid'))
							launchCloudPlay(serverId)
						}
					})
					$('.ropro-cloud-play-enabled .rbx-private-game-server-join:not(.ropro-cloud-play-listener)').click(function(e) {
						if (document.body.classList.contains('ropro-cloud-play-activated')) {
							e.stopPropagation()
							var accessCode = stripTags($(this).parents('.rbx-private-game-server-item').get(0).getAttribute('data-accesscode'))
							launchCloudPlay(null, accessCode)
						}
					})
					$('.ropro-cloud-play-enabled .ropro-game-server-join:not(.ropro-cloud-play-listener)').click(function(e) {
						if (document.body.classList.contains('ropro-cloud-play-activated')) {
							e.stopPropagation()
							var serverId = stripTags($(this).parents('.rbx-public-game-server-item').get(0).getAttribute('data-gameid'))
							launchCloudPlay(serverId)
						}
					})
					$('.ropro-cloud-play-enabled .rbx-friends-game-server-join:not(.ropro-cloud-play-listener)').click(function(e) {
						if (document.body.classList.contains('ropro-cloud-play-activated')) {
							e.stopPropagation()
							var serverId = stripTags($(this).parents('.rbx-friends-game-server-item').get(0).getAttribute('data-gameid'))
							launchCloudPlay(serverId)
						}
					})
					$('.ropro-cloud-play-enabled .rbx-public-game-server-join:not(.ropro-cloud-play-listener)').addClass('ropro-cloud-play-listener')
					$('.ropro-cloud-play-enabled .rbx-private-game-server-join:not(.ropro-cloud-play-listener)').addClass('ropro-cloud-play-listener')
					$('.ropro-cloud-play-enabled .ropro-game-server-join:not(.ropro-cloud-play-listener)').addClass('ropro-cloud-play-listener')
					$('.ropro-cloud-play-enabled .rbx-friends-game-server-join:not(.ropro-cloud-play-listener)').addClass('ropro-cloud-play-listener')
				}, 500)
				}
				placeInfo = await fetchPlaceInfo(parseInt(globalGameId))
				myUniverseId = parseInt(placeInfo[0]['universeId'])
				gameInfo = await fetchGameInfo(myUniverseId)
			var primaryGameData = null
			if (gameInfo != null && typeof gameInfo === "object" && Array.isArray(gameInfo.data) && gameInfo.data.length > 0) {
				primaryGameData = gameInfo.data[0]
			}
			scheduleGameCacheRefreshFromClient(normalizedGameId, myUniverseId, primaryGameData).catch(function() {})
				var mostRecentServerSetting = await fetchSetting("mostRecentServer")
				var serverFiltersSetting = await serverFiltersSettingPromise
				serverInviteLinksEnabled = await serverInviteLinksSettingPromise
				var roproVoiceServersSetting = await fetchSetting("roproVoiceServers")
				serverPingDetailsSettingEnabled = (await serverPingDetailsSettingHydrationPromise) === true
				serverPingDetailsSettingInitialized = true
				serverPingVisualGate = await serverPingVisualGatePromise
				syncServerPingFeatureState()
				setBestConnectionFilterLockState()
				syncServerFilterOptionStateUi()
				serverPingVisualGatePromise = null
			if (serverPingVisibilityEnabled) {
				refreshServerPingHints(true).catch(function() {})
			}
			try {
				var serverInterval = setInterval(async function(){
					if (!isGamePageTabActive(normalizedGameId)) {
						return
					}
					if (document.getElementById('rbx-public-running-games') != null) {
						//clearInterval(serverInterval)
						bindServerSortPingRefresh()
						if (serverFiltersSetting && document.getElementById('roproServerFiltersButton') == null) {
							addServerFilters(globalGameId, gameInfo.data[0].maxPlayers)
						}
						if (serverFiltersSetting) {
							ensureServerTabFiltersBranding()
						}
						if (roproVoiceServersSetting && document.getElementById('roproVoiceServers') == null) {
							addVoiceServers(globalGameId)
						}
						if (mostRecentServerSetting && document.getElementById('roproMostRecentServerContainer') == null) {
							//clearInterval(serverInterval)
							addRecentServer(parseInt(myUniverseId))
							loadMostRecentServer(myUniverseId)
							setInterval(function(){
								if (!isGamePageTabActive(normalizedGameId)) {
									return
								}
								if (mostRecentServerSetting) {
									loadMostRecentServer(myUniverseId)
								}
							}, 120000)
						}
					}
				}, 500)
			} catch (e) {
				console.log(e)
			}
			liveCounters()
			livePlaying()
			if (await fetchSetting("playtimeTracking")) {
				addPlayTime(parseInt(myUniverseId))
			}
			var shouldAttachServerRows = serverInviteLinksEnabled || serverPingVisibilityEnabled
			if (shouldAttachServerRows) {
				setInterval(function() {
					if (!isGamePageTabActive(normalizedGameId)) {
						return
					}
					if (serverPingVisibilityEnabled && Object.keys(serverPingHintsById).length === 0) {
						refreshServerPingHints(true).catch(function() {})
					}
					servers = document.getElementsByClassName('rbx-public-game-server-item')
					for (i = 0; i < servers.length; i++) {
						joinbutton = servers[i].getElementsByClassName('rbx-public-game-server-join')[0]
						if (typeof joinbutton != 'undefined' && servers[i].getElementsByClassName('create-server-link').length == 0 && !servers[i].classList.contains('ropro-server-invite-added')) {
							joinbutton.setAttribute('create-server-link-added', 'true')
							serverid = servers[i].getAttribute('data-gameid')
							placeid = globalGameId
							if (serverid != null) {
								addServerInviteButton(servers[i], serverid, placeid, parseServerPingValue(servers[i].getAttribute('data-server-ping')))
							}
						}
					}
					servers = document.getElementsByClassName('rbx-friends-game-server-item')
					for (i = 0; i < servers.length; i++) {
						joinbutton = servers[i].getElementsByClassName('rbx-friends-game-server-join')[0]
						if (typeof joinbutton != 'undefined' && servers[i].getElementsByClassName('create-server-link').length == 0 && !servers[i].classList.contains('ropro-server-invite-added')) {
							joinbutton.setAttribute('create-server-link-added', 'true')
							serverid = servers[i].getAttribute('data-gameid')
							placeid = globalGameId
							if (serverid != null) {
								addServerInviteButton(servers[i], serverid, placeid, parseServerPingValue(servers[i].getAttribute('data-server-ping')))
							}
						}
					}
				}, 1000)
				const observer = new MutationObserver(function(a) {
					if (!isGamePageTabActive(normalizedGameId)) {
						return
					}
					servers = document.getElementsByClassName('rbx-public-game-server-item')
					for (i = 0; i < servers.length; i++) {
						//console.log(servers[i])
							joinbutton = servers[i].getElementsByClassName('rbx-public-game-server-join')[0]
							if (typeof joinbutton != 'undefined' && servers[i].getElementsByClassName('create-server-link').length == 0 && !servers[i].classList.contains('ropro-server-invite-added')) {
								joinbutton.setAttribute('create-server-link-added', 'true')
								serverid = servers[i].getAttribute('data-gameid')
								placeid = globalGameId
								if (serverid != null) {
									//console.log("ADDING INVITE")
									addServerInviteButton(servers[i], serverid, placeid, parseServerPingValue(servers[i].getAttribute('data-server-ping')))
								}
							}
						}
				});
				var serverContainerInterval = setInterval(function(){ 
					serverContainer = document.getElementById('rbx-public-game-server-item-container')
					//console.log(serverContainer)
					if (serverContainer != null) {
						clearInterval(serverContainerInterval)
						observer.observe(serverContainer, {subtree: true, childList: true})
					}
				}, 1000)
			}
			if (serverPingVisibilityEnabled) {
				setInterval(function(){
					if (!isGamePageTabActive(normalizedGameId)) {
						return
					}
					if (!serverInfoRequestInFlight && serverInfoQueue.length > 0) {
						var tempQueue = serverInfoQueue.slice(0, SERVER_INFO_BATCH_SIZE)
						serverInfoQueue = serverInfoQueue.slice(SERVER_INFO_BATCH_SIZE)
						serverInfoRequestInFlight = true
						getServerInfo(tempQueue).catch(function() {
						}).finally(function() {
							serverInfoRequestInFlight = false
						})
					}
				}, 100)
			}
			var psInterval1 = setInterval(function() {
				if (document.getElementById('rbx-private-running-games') != null && getPrivateServersToggleHost() != null) {
					clearInterval(psInterval1)
					addHidePrivateServers()
					$('.rbx-refresh.refresh-link-icon').off('click.roproServerRowReset').on('click.roproServerRowReset', function() {
						if (!isPublicRunningGamesRefreshButton(this) || hasActiveServerFilters()) {
							return
						}
						gameServers = document.getElementsByClassName('rbx-public-game-server-item')
						for (i = 0; i < gameServers.length; i++) {
							gameServers[i].classList.remove('ropro-checked')
							gameServers[i].classList.remove('ropro-server-invite-added')
							info = gameServers[i].getElementsByClassName('ropro-server-info')
							if (info.length > 0) {
								info[0].remove()
							}
							link = gameServers[i].getElementsByClassName('create-server-link')
							if (link.length > 0) {
								link[0].remove()
							}
						}
					})
				}
			}, 100)
		}
	}
}
checkGamePage()

$(document).ready(async function() {
	servers = document.getElementsByClassName('rbx-public-game-server-item')
	for (i = 0; i < servers.length; i++) {
		joinbutton = servers[i].getElementsByClassName('rbx-public-game-server-join')[0]
		if (typeof joinbutton != 'undefined' && servers[i].getElementsByClassName('create-server-link').length == 0 && !servers[i].classList.contains('ropro-server-invite-added')) {
			joinbutton.setAttribute('create-server-link-added', 'true')
			serverid = servers[i].getAttribute('data-gameid')
			placeid = globalGameId
			if (serverid != null) {
				addServerInviteButton(servers[i], serverid, placeid, parseServerPingValue(servers[i].getAttribute('data-server-ping')))
			}
		}
	}
})

window.addEventListener('beforeunload', function() {
	closeRecentServerRejoinModal(true)
	if (serverFilterCacheRefreshInterval != null) {
		clearInterval(serverFilterCacheRefreshInterval)
		serverFilterCacheRefreshInterval = null
	}
	serverFilterCacheWarmupPromise = null
	serverFilterCacheGameId = null
	resetServerPingHintsCache()
	resetServerFilterPlayerCountBoundsState()
})

chrome.runtime.onMessage.addListener(async function(event, sender) {
	if (
		sender == null ||
		typeof sender.id !== "string" ||
		sender.id !== chrome.runtime.id
	) {
		return;
	}
	if (
		event == null ||
		typeof event !== "object" ||
		event.type !== "invite" ||
		Object.keys(event).some(function (key) {
			return key !== "type" && key !== "key";
		})
	) {
		return;
	}
	var inviteKey = typeof event.key === "string" ? event.key.substring(0, 6).replace(/[^0-9a-z-]/gi, "") : "";
	if (inviteKey.length === 0) {
		return;
	}
	var invite = await fetchInvite(inviteKey);
	if (invite == null) {
		return;
	}
	var gameNameElements = document.getElementsByClassName("game-name")
	if (gameNameElements.length === 0) {
		return;
	}
		if (document.body.classList.contains("ropro-cloud-play-activated")) {
			launchCloudPlay(invite.jobid.replace(/[^0-9a-z-]/gi, ''))
		} else {
			joinRobloxGameServer(
				invite.placeid,
				invite.jobid.replace(/[^0-9a-z-]/gi, ""),
				true
			)
		}
	setTimeout(function() {
		//window.close()
	}, 2000)
})

$(window).click(function(event) {
	if (document.getElementsByClassName('server-invite-link-box').length > 0) {
		document.getElementsByClassName('server-invite-link-box')[0].remove()
	}
	//if (document.getElementsByClassName('server-speed-test-box').length > 0) {
	//	document.getElementsByClassName('server-speed-test-box')[0].remove()
	//}
})
