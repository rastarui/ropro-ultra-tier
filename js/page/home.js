var url_matches = [
	"/home*"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');
window.__roproHomeScriptLoaded = true;

var theme = "dark"
if ($('.light-theme').length > 0) {
    var theme = "light"
}

var mostPlayedLoadingHTML = `<li style="width:100%;display:block!important;" class="list-item ropro-most-played-loader-item"><div id="mostPlayedLoadingIndicator" class="ropro-most-played-loader" role="status" aria-live="polite"><div class="ropro-most-played-loader-ring"><img class="ropro-most-played-loader-spin" src="${chrome.runtime.getURL('/images/reload.png')}" alt="" aria-hidden="true"><img class="ropro-most-played-loader-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="" aria-hidden="true"></div><span class="ropro-most-played-loader-label">Loading...</span></div></li>`
	
mostPlayedHTML = `<div id="scrollLeft" style="margin-top:32px;height:115px;margin-left:8px;width:26px;" class="scroller prev disabled" role="button" aria-hidden="true"><div class="arrow"><span style="transform:scale(1.0);margin-left:-2px;" class="icon-games-carousel-left"></span></div></div>
<div class="container-header games-filter-changer">
<div style="display:inline-flex;align-items:center;float:left;margin-top:2px;margin-bottom:-10px;">
<img src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" style="width:18px;height:18px;margin-right:6px;margin-top:-3px;" alt="RoPro">
<h3 style="font-size:17px;margin:0px;">Your Most Played</h3>
</div>
<div id="timeDropdown" style="overflow:visible;margin-top:-4px;margin-left:50px;width:185px;margin-right:0px;z-index:10;float:right;margin-bottom:-7px;" class="input-group-btn group-dropdown">
<button style="border:none;height:28px;" type="button" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
<span style="float:right;" class="icon-down-16x16"></span><span id="timeLabel" class="rbx-selection-label ng-binding" ng-bind="layout.selectedTab.label" style="font-size:12px;float:right;margin-right:6px;margin-top:1px;">Past 30 Days</span> 
</button>
<ul style="max-height:1000px;width:160px;margin-left:4px;z-index:2;margin-top:-20px;transform:scale(0.8);" id="timeOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu"> 
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
</a></li></ul></div>
<div id="displayOnProfile" style="width:150px;position:absolute;right:-10px;top:6px;float:right;display:none;" class="input-group-btn group-dropdown">
<button id="btn-toggle-off" class="btn-toggle" style="transform:scale(0.6);float:right;">
  <span class="toggle-flip"></span>
  <span id="toggle-on" class="toggle-on"></span>
  <span id="toggle-off" class="toggle-off"></span>
</button><div style="margin-right:-1px;margin-top:4px;right:50px;font-size:11px;float:right;color:#bdbebe;">Display on Profile</div>
</div>
<div style="display:none;width:150px;position:absolute;right:55px;top:60px;float:right;" class="input-group-btn group-dropdown" id="emptyPlaytimeLabel">
<div style="text-align:center;z-index:1;margin-right:-1px;margin-top:4px;font-size:11px;float:right;">No playtime info available yet for your user.<br>RoPro will show your most played experiences here.</div>
</div>
</div>
<ul style="overflow:hidden;" id="mostPlayedContainer" class="hlist game-cards">
${mostPlayedLoadingHTML}
</ul>
<div id="scrollRight" style="margin-top:32px;height:115px;margin-right:15px;width:26px;z-index:1;" class="scroller next disabled" role="button" aria-hidden="true"><div style="transform:scale(1.0);margin-right:-6px;" class="arrow"><span class="icon-games-carousel-right"></span></div></div>`

roproHomePanelHTML = `<div class="ropro-home-panel" style="position:absolute;right:30px;top:30px;width:350px;height:auto;"><div class="ropro-message-box" style="padding:3px;width:auto;height:auto;background-color:#191B1D;border-radius:10px;margin:10px;margin-left:0px;margin-right:0px;"><div style="background-color:#232527;margin:10px;padding:10px;box-shadow:inset 0 -4px 0 0 #fff;position:relative;"><h3 style="display:inline-block;">Messages</h3><div style="display:inline-block;float:right;position:absolute;top:18px;right:8px;" class="checkbox">
<input type="checkbox" id="checkbox3">
<label style="font-size:10px;" for="checkbox3"><span>System Messages</span></label>
</div></div><div style="background-color:#232527;margin:10px;padding:5px;"><div style="box-shadow:inset 4px 0 0 0 #fff;" class="sub-divider-bottom messageDivider roblox-message-row">   <div style="display:inline-block!important;float:left;margin-right:10px;margin-top:7px;margin-left:11px;" class="roblox-avatar-image avatar avatar-headshot-sm">  <a class="avatar-card-link"> <thumbnail-2d class="avatar-card-image "><span class="thumbnail-2d-container"> <!-- ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --><img ng-if="$ctrl.thumbnailUrl &amp;&amp; !$ctrl.isLazyLoadingEnabled()" ng-src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png" thumbnail-error="$ctrl.setThumbnailLoadFailed" ng-class="{'loading': $ctrl.thumbnailUrl &amp;&amp; !isLoaded }" image-load="" alt="" title="" class="ng-scope ng-isolate-scope" src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png"><!-- end ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --> <!-- ngIf: $ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled() --> </span> </thumbnail-2d>  </a> </div> <div class="roblox-messageRow roblox-message-summary"> <div class="wrapped-text message-summary-body"> <span style="font-size:12px;" class="font-header-2 paired-name message-summary-username positionAboveLink "><span class="element">builderman</span><span class="connector">@</span><span class="element">builderman</span></span>  <div class="text-label text-overflow message-summary-content"> <span style="font-size:14px;" class="font-subheader-2 text-subheader subject ng-binding" ng-bind="message.Subject">Welcome to Roblox!</span><span> -</span> <span class="text-preview ng-binding" ng-bind-html="message.Body | htmlToPlaintext">Hello, and welcome to Roblox! My name is Builderman. I started Roblox so you and your friends can experience just about anything you could possibly imagine across millions of immersive user-generated 3D worlds, whether you’re sailing across the open seas, exploring the farthest reaches of outer space, or hanging out with your friends in a virtual club. I’m here to make sure your experience stays fun, safe, and creative.&nbsp;&nbsp;Before you jump in and start playing, here’s a few tips. You can customize your avatar using our massive catalog of clothing and accessory options. Once you’re set, pick something to play by checking out our most popular games! Did you know you can also play games with your friends across different devices at the same time, even if you’re on a computer and they’re using their phone or VR headset? Finding friends on Roblox is easy! Visit our forums, join or create a group, or invite others to play a game with you by sending them a chat message. Last but not least, be sure to read more about our rules and our account safety tips here.&nbsp;That’s all there is to it! Now, get ready for an epic adventure. We hope you have a blast!&nbsp;Sincerely,&nbsp;Builderman, CEO of Roblox</span> </div> </div> <span class="font-caption-body text-date-hint text message-summary-date text-messageDate read">Sep 1, 2017 | 11:37 PM</span> </div> </div><div style="box-shadow:inset 4px 0 0 0 #fff;" class="border-top sub-divider-bottom messageDivider roblox-message-row">   <div style="display:inline-block!important;float:left;margin-right:10px;margin-top:7px;margin-left:11px;" class="roblox-avatar-image avatar avatar-headshot-sm">  <a class="avatar-card-link"> <thumbnail-2d class="avatar-card-image "><span class="thumbnail-2d-container"> <!-- ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --><img ng-if="$ctrl.thumbnailUrl &amp;&amp; !$ctrl.isLazyLoadingEnabled()" ng-src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png" thumbnail-error="$ctrl.setThumbnailLoadFailed" ng-class="{'loading': $ctrl.thumbnailUrl &amp;&amp; !isLoaded }" image-load="" alt="" title="" class="ng-scope ng-isolate-scope" src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png"><!-- end ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --> <!-- ngIf: $ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled() --> </span> </thumbnail-2d>  </a> </div> <div class="roblox-messageRow roblox-message-summary"> <div class="wrapped-text message-summary-body"> <span style="font-size:12px;" class="font-header-2 paired-name message-summary-username positionAboveLink "><span class="element">builderman</span><span class="connector">@</span><span class="element">builderman</span></span>  <div class="text-label text-overflow message-summary-content"> <span style="font-size:14px;" class="font-subheader-2 text-subheader subject ng-binding" ng-bind="message.Subject">Welcome to Roblox!</span><span> -</span> <span class="text-preview ng-binding" ng-bind-html="message.Body | htmlToPlaintext">Hello, and welcome to Roblox! My name is Builderman. I started Roblox so you and your friends can experience just about anything you could possibly imagine across millions of immersive user-generated 3D worlds, whether you’re sailing across the open seas, exploring the farthest reaches of outer space, or hanging out with your friends in a virtual club. I’m here to make sure your experience stays fun, safe, and creative.&nbsp;&nbsp;Before you jump in and start playing, here’s a few tips. You can customize your avatar using our massive catalog of clothing and accessory options. Once you’re set, pick something to play by checking out our most popular games! Did you know you can also play games with your friends across different devices at the same time, even if you’re on a computer and they’re using their phone or VR headset? Finding friends on Roblox is easy! Visit our forums, join or create a group, or invite others to play a game with you by sending them a chat message. Last but not least, be sure to read more about our rules and our account safety tips here.&nbsp;That’s all there is to it! Now, get ready for an epic adventure. We hope you have a blast!&nbsp;Sincerely,&nbsp;Builderman, CEO of Roblox</span> </div> </div> <span class="font-caption-body text-date-hint text message-summary-date text-messageDate read">Sep 1, 2017 | 11:37 PM</span> </div> </div><div class="border-top sub-divider-bottom messageDivider roblox-message-row">   <div style="display:inline-block!important;float:left;margin-right:10px;margin-top:7px;margin-left:11px;" class="roblox-avatar-image avatar avatar-headshot-sm">  <a class="avatar-card-link"> <thumbnail-2d class="avatar-card-image "><span class="thumbnail-2d-container"> <!-- ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --><img ng-if="$ctrl.thumbnailUrl &amp;&amp; !$ctrl.isLazyLoadingEnabled()" ng-src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png" thumbnail-error="$ctrl.setThumbnailLoadFailed" ng-class="{'loading': $ctrl.thumbnailUrl &amp;&amp; !isLoaded }" image-load="" alt="" title="" class="ng-scope ng-isolate-scope" src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png"><!-- end ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --> <!-- ngIf: $ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled() --> </span> </thumbnail-2d>  </a> </div> <div class="roblox-messageRow roblox-message-summary"> <div class="wrapped-text message-summary-body"> <span style="font-size:12px;" class="font-header-2 paired-name message-summary-username positionAboveLink "><span class="element">builderman</span><span class="connector">@</span><span class="element">builderman</span></span>  <div class="text-label text-overflow message-summary-content"> <span style="font-size:14px;" class="font-subheader-2 text-subheader subject ng-binding" ng-bind="message.Subject">Welcome to Roblox!</span><span> -</span> <span class="text-preview ng-binding" ng-bind-html="message.Body | htmlToPlaintext">Hello, and welcome to Roblox! My name is Builderman. I started Roblox so you and your friends can experience just about anything you could possibly imagine across millions of immersive user-generated 3D worlds, whether you’re sailing across the open seas, exploring the farthest reaches of outer space, or hanging out with your friends in a virtual club. I’m here to make sure your experience stays fun, safe, and creative.&nbsp;&nbsp;Before you jump in and start playing, here’s a few tips. You can customize your avatar using our massive catalog of clothing and accessory options. Once you’re set, pick something to play by checking out our most popular games! Did you know you can also play games with your friends across different devices at the same time, even if you’re on a computer and they’re using their phone or VR headset? Finding friends on Roblox is easy! Visit our forums, join or create a group, or invite others to play a game with you by sending them a chat message. Last but not least, be sure to read more about our rules and our account safety tips here.&nbsp;That’s all there is to it! Now, get ready for an epic adventure. We hope you have a blast!&nbsp;Sincerely,&nbsp;Builderman, CEO of Roblox</span> </div> </div> <span class="font-caption-body text-date-hint text message-summary-date text-messageDate read">Sep 1, 2017 | 11:37 PM</span> </div> </div><div class="border-top sub-divider-bottom messageDivider roblox-message-row">   <div style="display:inline-block!important;float:left;margin-right:10px;margin-top:7px;margin-left:11px;" class="roblox-avatar-image avatar avatar-headshot-sm">  <a class="avatar-card-link"> <thumbnail-2d class="avatar-card-image "><span class="thumbnail-2d-container"> <!-- ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --><img ng-if="$ctrl.thumbnailUrl &amp;&amp; !$ctrl.isLazyLoadingEnabled()" ng-src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png" thumbnail-error="$ctrl.setThumbnailLoadFailed" ng-class="{'loading': $ctrl.thumbnailUrl &amp;&amp; !isLoaded }" image-load="" alt="" title="" class="ng-scope ng-isolate-scope" src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png"><!-- end ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --> <!-- ngIf: $ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled() --> </span> </thumbnail-2d>  </a> </div> <div class="roblox-messageRow roblox-message-summary"> <div class="wrapped-text message-summary-body"> <span style="font-size:12px;" class="font-header-2 paired-name message-summary-username positionAboveLink "><span class="element">builderman</span><span class="connector">@</span><span class="element">builderman</span></span>  <div class="text-label text-overflow message-summary-content"> <span style="font-size:14px;" class="font-subheader-2 text-subheader subject ng-binding" ng-bind="message.Subject">Welcome to Roblox!</span><span> -</span> <span class="text-preview ng-binding" ng-bind-html="message.Body | htmlToPlaintext">Hello, and welcome to Roblox! My name is Builderman. I started Roblox so you and your friends can experience just about anything you could possibly imagine across millions of immersive user-generated 3D worlds, whether you’re sailing across the open seas, exploring the farthest reaches of outer space, or hanging out with your friends in a virtual club. I’m here to make sure your experience stays fun, safe, and creative.&nbsp;&nbsp;Before you jump in and start playing, here’s a few tips. You can customize your avatar using our massive catalog of clothing and accessory options. Once you’re set, pick something to play by checking out our most popular games! Did you know you can also play games with your friends across different devices at the same time, even if you’re on a computer and they’re using their phone or VR headset? Finding friends on Roblox is easy! Visit our forums, join or create a group, or invite others to play a game with you by sending them a chat message. Last but not least, be sure to read more about our rules and our account safety tips here.&nbsp;That’s all there is to it! Now, get ready for an epic adventure. We hope you have a blast!&nbsp;Sincerely,&nbsp;Builderman, CEO of Roblox</span> </div> </div> <span class="font-caption-body text-date-hint text message-summary-date text-messageDate read">Sep 1, 2017 | 11:37 PM</span> </div> </div><div class="border-top sub-divider-bottom messageDivider roblox-message-row">   <div style="display:inline-block!important;float:left;margin-right:10px;margin-top:7px;margin-left:11px;" class="roblox-avatar-image avatar avatar-headshot-sm">  <a class="avatar-card-link"> <thumbnail-2d class="avatar-card-image "><span class="thumbnail-2d-container"> <!-- ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --><img ng-if="$ctrl.thumbnailUrl &amp;&amp; !$ctrl.isLazyLoadingEnabled()" ng-src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png" thumbnail-error="$ctrl.setThumbnailLoadFailed" ng-class="{'loading': $ctrl.thumbnailUrl &amp;&amp; !isLoaded }" image-load="" alt="" title="" class="ng-scope ng-isolate-scope" src="https://tr.rbxcdn.com/9041e913381166626a534ba33e5f3bbf/150/150/AvatarHeadshot/Png"><!-- end ngIf: $ctrl.thumbnailUrl && !$ctrl.isLazyLoadingEnabled() --> <!-- ngIf: $ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled() --> </span> </thumbnail-2d>  </a> </div> <div class="roblox-messageRow roblox-message-summary"> <div class="wrapped-text message-summary-body"> <span style="font-size:12px;" class="font-header-2 paired-name message-summary-username positionAboveLink "><span class="element">builderman</span><span class="connector">@</span><span class="element">builderman</span></span>  <div class="text-label text-overflow message-summary-content"> <span style="font-size:14px;" class="font-subheader-2 text-subheader subject ng-binding" ng-bind="message.Subject">Welcome to Roblox!</span><span> -</span> <span class="text-preview ng-binding" ng-bind-html="message.Body | htmlToPlaintext">Hello, and welcome to Roblox! My name is Builderman. I started Roblox so you and your friends can experience just about anything you could possibly imagine across millions of immersive user-generated 3D worlds, whether you’re sailing across the open seas, exploring the farthest reaches of outer space, or hanging out with your friends in a virtual club. I’m here to make sure your experience stays fun, safe, and creative.&nbsp;&nbsp;Before you jump in and start playing, here’s a few tips. You can customize your avatar using our massive catalog of clothing and accessory options. Once you’re set, pick something to play by checking out our most popular games! Did you know you can also play games with your friends across different devices at the same time, even if you’re on a computer and they’re using their phone or VR headset? Finding friends on Roblox is easy! Visit our forums, join or create a group, or invite others to play a game with you by sending them a chat message. Last but not least, be sure to read more about our rules and our account safety tips here.&nbsp;That’s all there is to it! Now, get ready for an epic adventure. We hope you have a blast!&nbsp;Sincerely,&nbsp;Builderman, CEO of Roblox</span> </div> </div> <span class="font-caption-body text-date-hint text message-summary-date text-messageDate read">Sep 1, 2017 | 11:37 PM</span> </div> </div></div><ul style="text-align:center!important;display:inline-block;margin:auto!important;display:flex;justify-content:center;align-items:center;padding:10px;padding-top:0px;" class="pager" data-toggle="pager"><li class="first disabled"><a href="#"><span class="icon-first-page"></span></a></li><li class="pager-prev disabled"><a href="#"><span class="icon-left"></span></a></li><li class="pager-cur"><span id="rbx-current-page">1</span></li><li class="pager-total"><span>of</span><a>35</a></li><li class="pager-next"><a href="#"><span class="icon-right"></span></a></li><li class="last"><a href="#"><span class="icon-last-page"></span></a></li></ul>
</div></div>`

function fetchMostPlayed(time) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_most_played_universe", {time: time}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchUniverseDetails(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games?universeIds=" + universeIds.join(",")}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchGameIcons(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/games/icons?universeIds=" + universeIds.join(",") + "&size=150x150&format=Png&isCircular=false"}, 
			function(data) {
					resolve(data)
			})
	})
}

function normalizeRobloxDataRows(payload) {
	if (payload != null && typeof payload == "object" && Array.isArray(payload.data)) {
		return payload.data
	}
	if (Array.isArray(payload)) {
		return payload
	}
	return []
}

function checkVerification() {
  return roproApiAdapter.checkVerification();
}

function doVerification(code) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "HandleUserVerification", verification_code: code}, 
			function(data) {
				if (chrome.runtime.lastError) {
					console.error("HandleUserVerification failed:", chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function getLocalStorage(key) {
  return roproApiAdapter.getLocalStorage(key);
}

function setLocalStorage(key, value) {
  return roproApiAdapter.setLocalStorage(key, value);
}

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

function setStorage(key, value) {
  return roproApiAdapter.setStorage(key, value);
}


function formatTime(time) {
    suffix = " hour"
    if (time < 60) {
        suffix = " minute"
    } else {
        time = Math.floor(time / 60)
    }
    if (time != 1) {
        suffix += "s"
    }
    return time + suffix
}

function stripTags(s) {
	return roproApiAdapter.stripTags(s);
}

function addGame(name, id, url, thumbnail, time) {
    var safeGameUrl = "https://www.roblox.com/games/0"
    if (typeof roproApiAdapter != "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeRobloxGameUrl === "function") {
        safeGameUrl = roproApiAdapter.getSafeRobloxGameUrl(url) || safeGameUrl
    }

    var safeThumbnailUrl = chrome.runtime.getURL('/images/empty.png')
    if (typeof roproApiAdapter != "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeImageUrl === "function") {
        safeThumbnailUrl = roproApiAdapter.getSafeImageUrl(thumbnail) || safeThumbnailUrl
    }

    gameHTML = `<div class="game-card-container"><a class="game-card-link" href="${safeGameUrl}" id="${parseInt(id)}">
    <div class="game-card-thumb-container" style="width:117px;height:117px;"><div style="width:117px;height:117px;" class="game-card-thumb">
    <span class="thumbnail-2d-container"><img style="width:117px;height:117px;" class="game-card-thumb" src="${safeThumbnailUrl}" alt="${stripTags(name)}" title="${stripTags(name)}"></span>
    </div></div><div style="margin-top:4px;font-size:14px;padding:0px;text-overflow: ellipsis;white-space: nowrap;" class="game-card-name game-name-title" title="${stripTags(name)}">${stripTags(name)}</div><div style="margin-top:-2px;" class="game-card-info">
    <img style="background-image:none;margin:-5px;margin-top:1px;margin-bottom:1px;transform:scale(0.5);border:none;margin-left:-2px;margin-right:-3px;" src="${chrome.runtime.getURL(`/images/timer_${theme}.svg`)}" class="info-label icon-pastname"><span style="margin-left:2px;padding:0px;font-size:12.5px;" title="Played for ${parseInt(time)} minutes" class="info-label vote-percentage-label">${formatTime(time)}</span>
    </div></a></div>`
    li = document.createElement('li')
    li.setAttribute("style", "height:195px;width:130px;")
    li.setAttribute("class", "list-item game-card game-tile")
    li.setAttribute("title", stripTags(name))
    li.innerHTML = gameHTML
    document.getElementById("mostPlayedContainer").appendChild(li)
    return li
}

//This function is a bit of a mess, but it's a temporary solution until RoPro v2.0 where it is better implemented in React & Tailwind.
function roproVerificationModal() {
    var verificationIngameLink = "https://www.roblox.com/games/16699976687/"
    if (typeof roproApiAdapter != "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeRobloxGameUrl === "function") {
        verificationIngameLink = roproApiAdapter.getSafeRobloxGameUrl(verificationIngameLink) || verificationIngameLink
    }

    modalDiv = document.createElement('div')
    modalDiv.setAttribute('id', 'verificationModal')
    modalDiv.setAttribute('class', 'upgrade-modal')
    modalDiv.style.zIndex = 100000
    modalHTML = `
    <div id="verificationModal" style="z-index:10000;display:block;" class="upgrade-modal">
    <div class="dark-theme modal-content upgrade-modal-content ropro-verification-modal" style="background-color:#232527;position:absolute;width:350px;height:220px;left:calc(50% - 175px);top:calc(50% - 110px);">
    <span style="position:absolute;top:5px;right:10px;font-size:30px;cursor:pointer;z-index:1;" class="upgrade-modal-close">&times;</span>
    <div class="ropro-verification-modal-start" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
    <h3 id="modal-connect" style="
    text-align:center;
    width: 100%;
    font-size: 20px;
    font-weight: bold;
    margin-top: 0;
    margin-bottom: 12px;">Verify RoPro User</h3>
    <div
    class="ropro-verification-modal-ingame-button"
    style="
    width: 250px;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;"><img src="${chrome.runtime.getURL('/images/game_verification.svg')}" style="width:100%;display:block;"></div>
    </div>
    <div class="ropro-verification-modal-ingame" style="display:none;">
    
    <h3 class="text-2xl font-bold w-full text-center" id="modal-connect" style="
    width: 100%;
    font-size: 23px;
    font-weight: bold;
    margin-top: 35px;
    margin-bottom: 10px;
    ">Emoji Verification Code</h3><div style="
    width: 100%;"><form style="
    text-align:center;
"><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-1" name="ropro-verification-emoji-1" data-next="ropro-verification-emoji-2" data-previous="none" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-2" name="ropro-verification-emoji-2" data-next="ropro-verification-emoji-3" data-previous="ropro-verification-emoji-1" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-3" name="ropro-verification-emoji-3" data-next="ropro-verification-emoji-4" data-previous="ropro-verification-emoji-2" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><span style="
    margin: 2.5px;
">–</span><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-4" name="ropro-verification-emoji-4" data-next="ropro-verification-emoji-5" data-previous="ropro-verification-emoji-3" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-5" name="ropro-verification-emoji-5" data-next="ropro-verification-emoji-6" data-previous="ropro-verification-emoji-4" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-6" name="ropro-verification-emoji-6" data-next="ropro-verification-emoji-7" data-previous="ropro-verification-emoji-5" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><span style="
    margin: 2.5px;
">–</span><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-7" name="ropro-verification-emoji-7" data-next="ropro-verification-emoji-8" data-previous="ropro-verification-emoji-6" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-8" name="ropro-verification-emoji-8" data-next="ropro-verification-emoji-9" data-previous="ropro-verification-emoji-7" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "><input class="ropro-code-entry" type="text" id="ropro-verification-emoji-9" name="ropro-verification-emoji-9" data-next="none" data-previous="ropro-verification-emoji-8" placeholder="🤍" style="
    height:36px;
    width: 36px;
    padding: 5px;
    border-radius: 10px;
    margin: 2px;
    text-align: center;
    border: 1px solid #636363;
    "></form><div class="ropro-ingame-verification-message" style="text-align: center;
    font-size: 14px;
    margin-top: 15px;
    font-weight: 500;
"></div></div><div style="padding:12px;border-radius:10px;margin:auto;width:330px;margin-top:15px;background-color:#191B1D;">
<div><p style="font-size:15px;text-align:center;">RoPro features won't work until you open <a target="_blank" href="https://roblox.com/games/16699976687/RoPro-User-Verification" style="font-weight:bold;">RoPro User Verification <img src="${chrome.runtime.getURL('/images/roblox_link.svg')}" style="width:17px;"></a>, copy the emoji code, and paste it here.</p></div>
</div>
    <a href="${verificationIngameLink}" target="_blank" rel="noopener noreferrer" style="display:block;width:330px;margin:8px auto 0 auto;"><button style="border:none;background-color:#0084DC;border-radius:10px;height:45px;width:100%;cursor:pointer;"><img src="${chrome.runtime.getURL('/images/play.svg')}"></button></a></div>
    </div>
    </div>`
    modalDiv.innerHTML += modalHTML
    body = document.getElementsByTagName('body')[0]
    body.insertBefore(modalDiv, body.childNodes[0])
    var closeVerificationModal = function() {
        var modal = document.getElementById('verificationModal')
        if (modal) {
            document.removeEventListener('keydown', escVerificationHandler)
            modal.remove()
        }
    }
    var escVerificationHandler = function(e) {
        if (e.key === 'Escape') closeVerificationModal()
    }
    document.addEventListener('keydown', escVerificationHandler)
    modalDiv.addEventListener('click', function(e) {
        if (e.target === modalDiv) closeVerificationModal()
    })
    $('.upgrade-modal-close').click(function(){
        closeVerificationModal()
    })
    document.getElementById('verificationModal').style.display = "block"
    $('.ropro-verification-modal-ingame-button').click(function(){
        $('.ropro-verification-modal-start').hide()
        $('.ropro-verification-modal').css({'width': '500px', 'height': '320px', 'left': 'calc(50% - 250px)', 'top': 'calc(50% - 160px)'})
        $('.ropro-verification-modal-ingame').show()
        window.open('roblox://experiences/start?placeId=16699976687', '_self')
    });
    $('.ropro-code-entry').on('input', handleVerificationInput);
    $('.ropro-code-entry').on('keydown', handleVerificationKeystroke);
}

async function codeFinished() {
    const code = Array.from(document.getElementsByClassName("ropro-code-entry"))
        .map((element) => element.value)
        .filter((i) => i.match(/([\uD800-\uDBFF][\uDC00-\uDFFF])/));
    if (code.length == 9) {
        $('.ropro-ingame-verification-message').text('Verifying code...');
        verificationResult = await doVerification(code.join(""));
        if (verificationResult == true) {
            $('.ropro-ingame-verification-message').text('Verification successful! Reloading...');
            setTimeout(function () {
                location.reload();
            }, 1000);
        } else {
            $('.ropro-ingame-verification-message').text('Verification failed. Please try again.');
            setTimeout(function () {
                $('.ropro-ingame-verification-message').text('');
            }, 5000);
        }
    }
}

function handleVerificationKeystroke(e) {
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "ArrowLeft") {
      if (e.target.getAttribute("data-previous") !== "none") {
        document.getElementById(e.target.getAttribute("data-previous")).focus();
        document
          .getElementById(e.target.getAttribute("data-previous"))
          .select();
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.target.value = "";
        e.stopPropagation();
        e.preventDefault();
        $('.ropro-ingame-verification-message').text('');
      }
    } else if (
      e.key === "ArrowRight" ||
      e.key === "Enter" ||
      e.key === "Space"
    ) {
      if (e.target.getAttribute("data-next") !== "none") {
        document.getElementById(e.target.getAttribute("data-next")).focus();
        document.getElementById(e.target.getAttribute("data-next")).select();
      }
    }
  }


function handleVerificationInput(e) {
    const input = e.target.value
        .split(/([\uD800-\uDBFF][\uDC00-\uDFFF])/)
        .filter((i) => i.match(/([\uD800-\uDBFF][\uDC00-\uDFFF])/));
    if (input.length == 1) {
        e.target.value = input[0];
        if (e.target.getAttribute("data-next") !== "none") {
            setTimeout(function () {
                document.getElementById(e.target.getAttribute("data-next")).focus();
            }, 1);
        } else {
            codeFinished();
        }
    } else if (input.length > 1) {
        if (e?.inputType == "insertFromPaste" || e?.originalEvent?.inputType == "insertFromPaste") {
            e.target.value = input[0];
            input.shift();
            let next = document.getElementById(e.target.getAttribute("data-next"));
            while (input.length >= 1 && next) {
                next.focus();
                next.value = input[0];
                input.shift();
                if (next.getAttribute("data-next") != "none") {
                    next = document.getElementById(next.getAttribute("data-next"));
                } else {
                    next = null;
                }
            }
            if (!next) {
                codeFinished();
            }
        } else {
            e.target.value = input.pop();
            if (e.target.getAttribute("data-next") == "none") {
                codeFinished();
            }
        }
    } else if (input.length == 0) {
        e.target.value = "";
        $('.ropro-ingame-verification-message').text(`Code can only contain emojis.`);
        setTimeout(function () {
            $('.ropro-ingame-verification-message').text('');
        }, 5000);
    }
}

function createUpgradeModal() {
    if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
        return null
    }
    return window.RoProUpgradeModal.open({
        tier: "plus",
        contextLabel: "RoPro Most Played",
        featureLabel: "Sorting your playtime by Month, Year, and All Time",
        benefits: [
            "Best Connection sorting and live server ping visibility",
            "More Game Filters and Like Ratio Filter",
            "Trade Value and Demand Calculator",
            "Save Sandbox Outfits and Use Bundles"
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

function getDaysSince(date) {
    now = new Date().getTime()
    return Math.floor(Math.abs((date - now) / (24 * 60 * 60 * 1000)))
}

var page = 0
var pages = [[]]
var mostPlayedRenderToken = 0
var mostPlayedRemountPending = false

function isHomeRouteActive() {
	try {
		return verifyPath(url_matches)
	} catch (_) {
		return false
	}
}

function scheduleMostPlayedRemount() {
	if (mostPlayedRemountPending || !isHomeRouteActive()) {
		return
	}
	mostPlayedRemountPending = true
	checkCount = 0
	setTimeout(function() {
		mostPlayedRemountPending = false
		checkLoad()
	}, 100)
}

function ensureMostPlayedRenderSurface(renderToken) {
	if (renderToken !== mostPlayedRenderToken) {
		return false
	}
	if (document.getElementById("mostPlayedContainer") == null) {
		scheduleMostPlayedRemount()
		return false
	}
	return true
}

function setMostPlayedLoadingState() {
	var mostPlayedContainer = document.getElementById("mostPlayedContainer")
	if (mostPlayedContainer == null) {
		scheduleMostPlayedRemount()
		return false
	}
	mostPlayedContainer.innerHTML = mostPlayedLoadingHTML
	return true
}

async function renderMostPlayed(time) {
	var renderToken = ++mostPlayedRenderToken
	if (!ensureMostPlayedRenderSurface(renderToken)) {
		return
	}
    if (await fetchSetting("playtimeTracking")) {
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
        page = 0
        pages = [[]]
        timePlayed = await getLocalStorage("timePlayed")
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
        if (typeof timePlayed == "undefined") {
            timePlayed = {}
        }
        mostPlayed = await fetchMostPlayed(time)
        if (!Array.isArray(mostPlayed)) {
            mostPlayed = []
        }
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
        console.log(mostPlayed)
        for (i = 0; i < mostPlayed.length; i++) {
            game = mostPlayed[i]
            gameId = parseInt(game.id)
            if (gameId in timePlayed) {
                if (getDaysSince(timePlayed[gameId][1]) > time) {
                    timePlayed[gameId][0] = 0
                }
                timePlayed[gameId] = [timePlayed[gameId][0] + game.time_played, new Date().getTime(), true]
            } else {
                timePlayed[gameId] = [game.time_played, new Date().getTime(), true]
            }
        }
        for (key in timePlayed) {
            if (getDaysSince(timePlayed[key][1]) > time) {
                delete timePlayed[key]
            }
        }
        playTimes = Object.keys(timePlayed).filter(function(key) { return timePlayed[key].length == 3 ? true : false }).map(function(key) {
            return [key, timePlayed[key][0]];
        });
        console.log(playTimes)
        playTimes.sort(function(first, second) {
            return second[1] - first[1];
        });
        playTimes = playTimes.slice(0, 24)
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
		var emptyPlaytimeLabel = document.getElementById('emptyPlaytimeLabel')
		if (emptyPlaytimeLabel == null) {
			scheduleMostPlayedRemount()
			return
		}
        if (playTimes.length == 0) {
            emptyPlaytimeLabel.style.display = "block"
        } else {
            emptyPlaytimeLabel.style.display = "none"
        }
        universeIds = []
        for (i = 0; i < playTimes.length; i++) {
            universeIds.push(playTimes[i][0])
        }
        gameDetails = await fetchUniverseDetails(universeIds)
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
        console.log(gameDetails, universeIds)
        gameDetails = normalizeRobloxDataRows(gameDetails)
        gameIcons = normalizeRobloxDataRows(await fetchGameIcons(universeIds))
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
		var mostPlayedContainer = document.getElementById("mostPlayedContainer")
		if (mostPlayedContainer == null) {
			scheduleMostPlayedRemount()
			return
		}
        mostPlayedContainer.innerHTML = ""
        icons = {}
        for (i = 0; i < gameIcons.length; i++) {
            icons[gameIcons[i].targetId] = gameIcons[i].imageUrl
        }
		var scrollRight = document.getElementById('scrollRight')
		var scrollLeft = document.getElementById('scrollLeft')
		if (scrollRight == null || scrollLeft == null) {
			scheduleMostPlayedRemount()
			return
		}
        if (universeIds.length > 4) {
            scrollRight.style.display = "block";
            scrollLeft.style.display = "block";
            scrollLeft.classList.add("disabled")
            scrollRight.classList.remove("disabled")
        } else {
            scrollRight.style.display = "block";
            scrollLeft.style.display = "block";
        }
        for (i = 0; i < gameDetails.length; i++) {
            game = gameDetails[i]
            if (pages[pages.length - 1].length >= 4) {
                pages.push([])
            }
            gameCard = addGame(game.name, game.rootPlaceId, "https://www.roblox.com/games/" + game.rootPlaceId, icons[game.id], timePlayed[game.id][0])
            if (pages.length > 1) {
                gameCard.style.display = "none"
            }
            pages[pages.length - 1].push(gameCard)
        }
        console.log(pages)
    } else {
		if (!ensureMostPlayedRenderSurface(renderToken)) {
			return
		}
        enableHTML = `<div style="text-align:center;font-size:14px;margin-top:-3px;"><span style="font-size:12px;margin-top:-8px;">RoPro will keep track of the games you spend<br>the most time playing, and show them here!</span><br><li class="rbx-upgrade-now" style="margin-top:5px;display: inline-block;"><a class="btn-growth-md btn-secondary-md" id="enablePlaytimeTracking">Enable RoPro Playtime Tracking</a></li><p style="margin-top:3px;font-size:10px;">
        You can toggle this feature in the RoPro Settings.</p></div>`
		var mostPlayedContainer = document.getElementById("mostPlayedContainer")
		if (mostPlayedContainer == null) {
			scheduleMostPlayedRemount()
			return
		}
        mostPlayedContainer.innerHTML = enableHTML
        document.getElementById('enablePlaytimeTracking').addEventListener('click', async function(){
            rpSettings = await getStorage("rpSettings")
            rpSettings['playtimeTracking'] = true
            await setStorage('rpSettings', rpSettings)
            window.location.reload()
        })
    }
}

async function mainHome() {
    if (await fetchSetting("mostPlayedGames")) {
		if (document.getElementById("mostPlayedContainer") != null) {
			if (document.getElementById("mostPlayedLoadingIndicator") != null && await checkVerification()) {
				renderMostPlayed(30)
			}
			return
		}
        var div = document.createElement('div')
        div.setAttribute("style", "height:205px;margin-left:auto;width:520px;display:inline-block;float:right;margin-right:0px;position:relative;min-width:500px;margin-bottom:10px;")
        div.innerHTML = mostPlayedHTML
        if (document.getElementsByClassName('home-header').length > 0) {
            document.getElementsByClassName('home-header')[0].appendChild(div)
        } else {
            document.getElementsByClassName('home-container')[0].getElementsByClassName('container-header')[0].appendChild(div)
            div.setAttribute("style", stripTags(div.getAttribute("style"))+"margin-top:-60px;")
            document.getElementsByClassName('home-container')[0].getElementsByTagName('h1')[0].style.height = "50px"
        }
        if (await checkVerification()) {
            renderMostPlayed(30)
        } else {
			var mostPlayedLoadingBar = document.getElementById('mostPlayedLoadingIndicator')
			var timeLabel = document.getElementById('timeLabel')
			if (mostPlayedLoadingBar != null) {
            	mostPlayedLoadingBar.style.display = "none"
			}
			if (timeLabel != null && timeLabel.parentNode != null) {
            	timeLabel.parentNode.style.pointerEvents = "none"
			}
        }
        document.getElementById('scrollLeft').addEventListener('click', (event) => {
            if (page > 0) {
                for (i = 0; i < pages[page].length; i++) {
                    pages[page][i].style.display = "none"
                }
                page = page - 1
                for (i = 0; i < pages[page].length; i++) {
                    pages[page][i].style.display = "inline-block"
                }
                if (page == 0) {
                    document.getElementById('scrollLeft').classList.add("disabled")
                }
                if (page >= 0) {
                    document.getElementById('scrollRight').classList.remove("disabled")
                }
            }
        })
        document.getElementById('scrollRight').addEventListener('click', (event) => {
            if (page < pages.length - 1) {
                for (i = 0; i < pages[page].length; i++) {
                    pages[page][i].style.display = "none"
                }
                page = page + 1
                for (i = 0; i < pages[page].length; i++) {
                    pages[page][i].style.display = "inline-block"
                }
                if (page == pages.length - 1) {
                    document.getElementById('scrollRight').classList.add("disabled")
                }
                if (page <= pages.length - 1) {
                    document.getElementById('scrollLeft').classList.remove("disabled")
                }
            }
        })
        morePlaytimeSorts = true
        $('.timeChoice').click(function(){
            time = this.getAttribute("time")
            if (time == "pastWeek") {
                document.getElementById('timeLabel').innerText = "Past 7 Days"
                setMostPlayedLoadingState()
                renderMostPlayed(7)
            } else if (time == "pastMonth") {
                if (morePlaytimeSorts) {
                    document.getElementById('timeLabel').innerText = "Past 30 Days"
                    setMostPlayedLoadingState()
                    renderMostPlayed(30)
                } else {
                    upgradeModal()
                }
            } else if (time == "pastYear") {
                if (morePlaytimeSorts) {
                    document.getElementById('timeLabel').innerText = "Past 365 Days"
                    setMostPlayedLoadingState()
                    renderMostPlayed(365)
                } else {
                    upgradeModal()
                }
            } else if (time == "allTime") {
                if (morePlaytimeSorts) {
                    document.getElementById('timeLabel').innerText = "All Time"
                    setMostPlayedLoadingState()
                    renderMostPlayed(999)
                } else {
                    upgradeModal()
                }
            }
        })
    }
    if (!(await checkVerification())) {
        var loaderItem = document.querySelector('.ropro-most-played-loader-item')
        if (loaderItem) {
            loaderItem.style.cssText = 'width:100%;display:flex!important;align-items:center;justify-content:center;min-height:195px;height:195px;'
            loaderItem.innerHTML = `<a id="roproVerifyButton" class="btn-growth-md btn-secondary-md" style="cursor:pointer;">Verify RoPro User</a>`
        } else {
            var verifyDiv = document.createElement('div')
            verifyDiv.innerHTML = `<div style="position:absolute;right:30px;top:35px;width:350px;z-index:100;"><br><li class="rbx-upgrade-now" style="display:block;text-align:center;"><a id="roproVerifyButton" class="btn-growth-md btn-secondary-md" style="cursor:pointer;">Verify RoPro User</a></li></div>`
            if (document.getElementById('home-header') != null) {
                document.getElementById('home-header').appendChild(verifyDiv)
            } else {
                document.getElementsByClassName('container-header')[0].appendChild(verifyDiv)
            }
        }
        document.getElementById('roproVerifyButton').addEventListener('click', async function() {
            roproVerificationModal()
        })
    }
}

var checkCount = 0

function checkLoad() {
	if (!isHomeRouteActive()) {
		return
	}
	if (document.getElementById('HomeContainer') != null && (document.getElementsByClassName('container-header').length > 0 || document.getElementsByClassName('home-header').length > 0)) {
		checkCount = 0
        console.log(document.getElementsByClassName('container-header').length, document.getElementsByClassName('home-header').length)
        mainHome()
	} else if (checkCount < 30) {
        console.log(document.getElementsByClassName('container-header').length, document.getElementsByClassName('home-header').length)
		checkCount++
		setTimeout(function(){
			checkLoad()
		}, 500)
	}
}
checkLoad()

// Detect SPA soft-navigation (e.g. clicking Home while already on /home).
// Roblox tears down and rebuilds the DOM without a full page reload, so our
// mostPlayedContainer gets destroyed. Watch for HomeContainer being re-added
// and re-trigger injection when our container is missing.
;(function observeSPANavigation() {
	var pendingReinject = false
	var observer = new MutationObserver(function() {
		if (pendingReinject) return
		if (!isHomeRouteActive()) return
		// HomeContainer exists (page rendered) but our container is gone (SPA rebuild)
		if (document.getElementById('HomeContainer') != null &&
			document.getElementById('mostPlayedContainer') == null &&
			(document.getElementsByClassName('container-header').length > 0 ||
			 document.getElementsByClassName('home-header').length > 0)) {
			pendingReinject = true
			setTimeout(function() {
				pendingReinject = false
				checkCount = 0
				checkLoad()
			}, 150)
		}
	})
	observer.observe(document.body, { childList: true, subtree: true })
})()
