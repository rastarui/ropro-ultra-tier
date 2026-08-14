var url_matches = [
	"/sandbox"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
  return roproApiAdapter.buildBrandedLoaderHtml(options);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var sandboxHTML = `
<div style="margin-top:4px;margin-left:15px;">
		<h1 class="ng-binding ropro-sandbox-title"><span>RoPro Avatar Sandbox</span><img class="ropro-page-heading-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="" aria-hidden="true"></h1>
		<div id="upgradeCTA" style="margin-top:20px;float:right;display:inline-block;" class="upgrade-cta catalog-header"> <div style="display:inline-block;margin-right:5px;" class="ng-binding upgradeText">Upgrade to save your outfits!</div>
	<a style="display:inline-block;" class="btn-primary-md ng-binding upgradeButtonText" target="_blank" href="https://ropro.io#plus">Upgrade</a> </div>
	<div style="pointer-events: none;position:relative;display:inline-block;float:left;max-height:610px;" id = "maincontent">
		<div style="pointer-events:initial;position:relative;width:970px;z-index:1;" class="sandbox-frame" id="sandboxFrame">
		<iframe class="sandbox-iframe" style="z-index:1;position:absolute;display:block;width:970px;display:none;" id="loaderView" src="https://ropro.io/render/?load"></iframe>
			<iframe class="sandbox-iframe" style="z-index:1;" id="sandboxView" src="https://ropro.io/render/?load"></iframe>
			<span id="fullscreenToggle" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'" style="opacity:0.5;position:absolute;bottom:10px;right:10px;z-index:100;width:40px;height:37px;display:none;" class="sandbox-fullscreen-toggle fullscreen toggle-three-dee btn-control btn-control-small ng-binding"><img id="fullscreenImage" src="${chrome.runtime.getURL('/images/fullscreen_0.png')}" style="height:20px;margin:-10px;" onclick=""></span>
			<div style="position: absolute; bottom: 5px; left: 10px; z-index: 100; " class="avatar-type-toggle pill-toggle ng-scope" data-toggle="tooltip" title="" data-original-title="Switch between 2D and 3D rendering in the Avatar Sandbox"> <input type="radio" id="radio-2D" value="2D" checked=true class="ng-pristine ng-untouched ng-valid ng-not-empty" name="17"> <label for="radio-2D">2D</label> <input type="radio" id="radio-3D" value="3D" class="ng-pristine ng-untouched ng-valid ng-not-empty" name="18"> <label for="radio-3D">3D</label> </div>
			<div style="position: absolute; bottom: 5px; left: 90px; z-index: 100; " class="avatar-type-toggle pill-toggle ng-scope" data-toggle="tooltip" title="Switch between classic R6 avatar and more expressive next generation R15 avatar"> <input type="radio" id="radio-R6" value="R6" class="ng-pristine ng-untouched ng-valid ng-not-empty" name="15"> <label for="radio-R6">R6</label> <input type="radio" id="radio-R15" value="R15" class="ng-pristine ng-untouched ng-valid ng-not-empty" name="16"> <label for="radio-R15">R15</label> </div>
			</div>
			<div style="float:left;position:relative;width:277px;" id="wearing">
				<h5 style="padding-bottom:0px;" class="ng-binding"><span class="outfitCostText">Outfit Cost:</span> <span>
					${buildRoProLoader({ id: "outfitCostLoading", style: "margin:-7px;transform: scale(0.6); width: 100px; height: 25px; visibility: initial !important;" })}
					<div id="outfitCostDiv" style="display:none;">
					<img src="${chrome.runtime.getURL('/images/robux_icon.svg')}" style="margin-left:-5px;margin-right:-8px;margin-bottom:2px;transform:scale(0.6);" class="ropro-robux-icon-inline ropro-robux-icon-cost" alt="Robux">
					<span style="font-size:15px;" class="rbx-text-navbar-right text-header" id="outfitCostRobux">
				</span></div></span></h5>
				<h3 style="padding-bottom:0px;" class="ng-binding currentlyWearingText">Currently Wearing</h3>
				<p style="margin-top:-2px;font-size:13px;" class="ng-binding clickAnItemText">Click an item to unequip it.</p>
				<div style="line-height:0px;pointer-events:initial;" id="wearingContainer"></div>
			</div>
			<div style="position:relative;width:277px;" id="backgroundChoice">
			<div style="margin-top:5px;float:left;position:relative;width:277px;height:240px;pointer-events:initial;display:none;" id="roproMerch">
				<h3 style="padding-bottom:0px;" class="ng-binding"><span class="roproMerchText">RoPro Merch</span> </h3>
				
				<p id="merchSubtitle" style="margin-top:-2px;font-size:13px;" class="ng-binding merchText">Buy four or more shirts/pants to unlock a special "RoPro Donor" profile icon.</p>
				<div id="scrollLeft" style="margin-top: 70px; height: 170px; margin-left: 10px; width: 20px; display: block;" class="scroller prev disabled" role="button" aria-hidden="true"><div class="arrow"><span style="transform:scale(0.8);margin-left:-4px;" class="icon-games-carousel-left"></span></div></div>
				<div style="pointer-events:initial;line-height:0px;margin-top:5px;margin-left:-10px;" id="merchContainer">
				</div>
				<div id="scrollRight" style="margin-top: 70px; height: 170px; margin-right: 18px; width: 20px; display: block;" class="scroller next" role="button" aria-hidden="true"><div style="transform:scale(0.8);margin-right:-9px;" class="arrow"><span class="icon-games-carousel-right"></span></div></div>
			</div>
			<div style="pointer-events:initial;margin-top:10px;float:left;position:relative;width:277px;height:80px;">
				<h3 style="padding-bottom:0px;" class="ng-binding"><span>Advanced Equip</span> </h3>
				<div style="display:flex;gap:6px;align-items:center;">
				<input id="advancedEquipInput" style="border-radius:5px;margin-bottom:0px;margin-top:2px;padding-left:10px;flex:1 1 auto;" class="form-control input-field" placeholder="Enter Item ID" maxlength="50" ng-keypress="" ng-model="">
				<button id="advancedEquipButton" type="button" class="btn-fixed-width btn-growth-sm" style="margin-top:2px;height:38px;min-width:62px;">Equip</button>
				</div>
			</div>
				<!--<h3 style="margin-top:5px;float:left;padding-bottom:0px;" class="ng-binding backgroundText">Background</h3>
				<p style="float:left;margin-top:-2px;font-size:13px;" class="ng-binding chooseBackgroundText">Choose a background below.</p>
				<div style="float:left;pointer-events:initial;" id="backgroundContainer">
				<div><div id="default" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/default_background.png">
				<img src="${chrome.runtime.getURL('/images/checkmark_done.gif')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="sky" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/sky_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="crossroads" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/crossroads_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="roblox_hq" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/roblox_hq_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="trade_hangout" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/trade_hangout_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="playground" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/playground_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="shuttle2" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/shuttle2_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="school" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/school_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="oval_office" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/oval_office_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>
				<div><div id="pirate" style="display:inline-block;width:50px;height:50px;margin:2px;" class="thumbnail-2d-container background-selector"><a style="position:relative;">
				<img class="item-card-thumb-container" style="width:100%;height:100%;" src="https://ropro.io/3dviewer/backgrounds/pirate_background.png">
				<img src="${chrome.runtime.getURL('/images/empty.png')}" class="background-checkmark-image active" style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-57px;top:-52px;">
				</a>
				</div></div>-->
							<div style="margin-top:5px;float:left;position:relative;width:277px;" id="roproOutfits">
				<!--<h3 style="padding-bottom:0px;" class="ng-binding">RoPro Outfits </h3>
				<p style="margin-top:-2px;font-size:13px;" class="ng-binding">Try on pre-made outfits.</p>
				<div style="pointer-events:initial;" id="premadeOutfitContainer"></div>-->
			</div>
					<div style="pointer-events:initial;margin-top:5px;float:left;position:relative;width:277px;height:100px;" id="myOutfits">
						<h3 style="padding-bottom:0px;" class="ng-binding"><span class="myOutfitsText">My Outfits</span> <button id="createOutfitButton" type="button" class="btn-fixed-width-lg btn-growth-lg ropro-sandbox-save-button" style="margin-top:7px;background-color:#0084dd;border:0px;width:60px;font-size:15px;padding:2px;float:right;">Save</button></h3>
					<div style="display:none;" id="outfitNameGroup" class="outfit-input-group">
					<div class="outfit-name-entry-row">
					<input id="outfitNameInput" style="border-radius:5px;margin-bottom:0px;margin-top:2px;padding-left:10px;" class="form-control input-field outfit-name-input" placeholder="Outfit Name" maxlength="50" ng-keypress="" ng-model="">
					<button id="submitOutfitButton" type="button" class="btn-fixed-width btn-growth-sm ropro-outfit-submit-button">Save</button>
					</div>
					<p style="margin-left:3px;margin-bottom:10px;font-size:12px;" class="ng-binding pressEnterKeyText">Press enter or Save to submit outfit name.
					</p></div>
					<p id="outfitSubtitle" style="margin-top:-2px;font-size:13px;" class="ng-binding nameAndSaveText">Name and save your outfit.</p>
					<div style="pointer-events:initial;line-height:0px;" id="outfitContainer"></div>
				</div>
				</div>
			</div>
	</div>
	<div class="catalog-tabs" style="float:right;" id="catalogcontent">
		<a index="1" data-tab-key="Accessories" style="font-size:13px;" class="catalog-tab active">All</a>
		<a index="2" data-tab-key="Limiteds" style="font-size:13px;" class="catalog-tab">Limiteds</a>
		<a index="4" data-tab-key="Faces" style="font-size:13px;" class="catalog-tab">Faces</a>
		<a index="5" data-tab-key="Layered" style="font-size:13px;" class="catalog-tab">Layered</a>
		<a index="5" data-tab-key="Classic" style="font-size:13px;" class="catalog-tab">Classic</a>
	</div>
	<div id="Accessories">
	</div>
	<div id="Limiteds">
	</div>
	<div id="Faces">
	</div>
	<div id="Layered">
	</div>
	<div id="Classic">
	</div>
</div>
`

var wearing = []
var wearingCostDict = {}
var wearingInfoDict = {}
var assetTypeDict = {}
var userID = 1
var playerType = "R15"

var sorts = {
	"Accessories":{"All Accessories":"?category=Accessories&limit=30&sortType=1&sortAggregation=1&subcategory=Accessories", "Gear": "?category=Accessories&limit=30&subcategory=Gear", "Hats": "?category=Accessories&limit=30&subcategory=HeadAccessories", "Face":"?category=Accessories&limit=30&subcategory=FaceAccessories", "Neck":"?category=Accessories&limit=30&subcategory=NeckAccessories", "Shoulder":"?category=Accessories&limit=30&subcategory=ShoulderAccessories", "Front":"?category=Accessories&limit=30&subcategory=FrontAccessories", "Back":"?category=Accessories&limit=30&subcategory=BackAccessories", "Waist":"?category=Accessories&limit=30&subcategory=WaistAccessories"},
	"Limiteds":{
		"All Limiteds":"?category=Accessories&limit=30&salesTypeFilter=2&sortAggregation=1&sortType=1&subcategory=Accessories",
		"Classic Limiteds":"?category=Accessories&limit=30&salesTypeFilter=2&sortAggregation=1&sortType=1&subcategory=Accessories&creatorName=Roblox",
		"UGC Limiteds":"?category=Accessories&limit=30&salesTypeFilter=2&sortAggregation=1&sortType=1&subcategory=Accessories"
	},
	"Faces":{"Faces": "?category=Accessories&limit=30&subcategory=FaceAccessories"},
	"Layered":{"T-Shirts":"?category=Clothing&limit=30&subcategory=TShirtAccessories", "Shirts":"?category=Clothing&limit=30&subcategory=ShirtAccessories", "Sweaters": "?category=Clothing&limit=30&subcategory=SweaterAccessories", "Jackets": "?category=Clothing&limit=30&subcategory=JacketAccessories", "Pants": "?category=Clothing&limit=30&subcategory=PantsAccessories", "Shorts": "?category=Clothing&limit=30&subcategory=ShortsAccessories", "Dresses/Skirts": "?category=Clothing&limit=30&subcategory=DressSkirtAccessories", "Shoes": "?category=Clothing&limit=30&subcategory=ShoesBundles"},
	"Classic":{"Shirts":"?category=Clothing&limit=30&subcategory=ClassicShirts", "Pants":"?category=Clothing&limit=30&subcategory=ClassicPants", "T-Shirts": "?category=Clothing&limit=30&subcategory=ClassicTShirts"}
	}
var cursors = {
	"Accessories":["",""],
	"Limiteds":["",""],
	"Faces":["",""],
	"Layered":["",""],
	"Classic":["",""]
	}
var currentTab = "Accessories"
var currentSort = "Most Popular"
var currentPage = null
var activeTab = null
var pageLoading = false
var tabs = {}
var background = "default"
var currentAnimation = null
var sandboxSearchDebounceMs = 260
var sandboxSearchDebounceTimers = new WeakMap()
var sandboxSearchLastSubmittedKeyword = new WeakMap()
var thumbnailConfig = {"thumbnailId": 2, "thumbnailType": "2d", "size": "420x420"}
var scales = {"bodyType": 0, "depth": 0, "head": 0, "height": 0, "proportion": 0, "width": 0}
var playerAvatarType = {}
var bodyColors = {}
var assets = []
var avatarRules = {}
var bodyColorPalette = {}
var layeredClothingOrder = {64: 7, 65: 7, 68: 7, 67: 10, 66: 4, 69: 5, 72: 6, 70: 3, 71: 3}
var sandboxAvatarRenderPollDelayMs = 2000
var sandboxAvatarRenderPollMaxAttempts = 12
var sandboxWearingHoverHideDelayMs = 220

function fetchAvatarRules() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://avatar.roblox.com/v1/avatar-rules"}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchAssetsView(renderParameters, overrideCancelled = false) {
	return new Promise(resolve => {
		var attemptCount = 0
		var stableRenderParameters = String(renderParameters)
		function getURL(renderParameters) {
			attemptCount++
			if (attemptCount > sandboxAvatarRenderPollMaxAttempts) {
				resolve("CANCELLED")
				return
			}
			chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://avatar.roblox.com/v1/avatar/render", jsonData: renderParameters}, 
				function(data) {
					var activeRenderParameters = JSON.stringify(getRenderParameters())
					if (overrideCancelled || stableRenderParameters === activeRenderParameters) {
						if (data == null) {
							setTimeout(function(){
								getURL(renderParameters)
							}, sandboxAvatarRenderPollDelayMs)
							return
						}
						if (typeof data === "string") {
							resolve(data)
							return
						}
						if (data.state == "Completed") {
							resolve(data.imageUrl)
						} else if (data.state == "Error" || data.state == "Failed") {
							resolve("CANCELLED")
						} else {
							setTimeout(function(){
								getURL(renderParameters)
							}, sandboxAvatarRenderPollDelayMs)
						}
					} else {
						resolve("CANCELLED")
					}
				})
		}
		getURL(renderParameters)
	})
}

function fetchAssetsView2D(assetIds) {
	return new Promise(resolve => {
		var normalizedAssets = []
		var seenIds = {}
		if (Array.isArray(assetIds)) {
			for (var i = 0; i < assetIds.length; i++) {
				var assetId = parseInt(assetIds[i])
				if (!Number.isFinite(assetId) || assetId <= 0 || seenIds[assetId]) {
					continue
				}
				seenIds[assetId] = true
				var assetType = parseInt(assetTypeDict[assetId])
				if (Number.isFinite(assetType) && layeredClothingOrder[assetType]) {
					normalizedAssets.push({"id": assetId, "meta": {"order": layeredClothingOrder[assetType], "version": 1}})
				} else {
					normalizedAssets.push({"id": assetId})
				}
				if (normalizedAssets.length >= 80) {
					break
				}
			}
		}
		if (normalizedAssets.length === 0) {
			resolve("CANCELLED")
			return
		}
		var renderParameters = {
			avatarDefinition: {
				assets: normalizedAssets,
				bodyColors: bodyColors,
				playerAvatarType: playerAvatarType,
				scales: scales
			},
			thumbnailConfig: {"thumbnailId": 2, "thumbnailType": "2d", "size": "420x420"}
		}
		fetchAssetsView(JSON.stringify(renderParameters), true).then(function(url) {
			resolve(url == null ? "CANCELLED" : String(url))
		})
	})
}

function fetchMerch() {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_merch", {},
			function(data) {
					resolve(data.split(','))
			})
	})
}

function fetchCurrentlyWearing(userId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://avatar.roblox.com/v1/users/"+userId+"/avatar"}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchBundleDetails(bundleId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://catalog.roblox.com/v1/bundles/details?bundleIds=" + bundleId}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchBundleDetailsBulk(bundleIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://catalog.roblox.com/v1/bundles/details?bundleIds=" + bundleIds.join(",")}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchBundleThumbnailsBulk(bundleIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/bundles/thumbnails?size=420x420&format=Png&isCircular=false&bundleIds=" + bundleIds.join(",")}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchOutfitDetails(outfitId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://avatar.roblox.com/v1/outfits/" + outfitId + "/details"}, 
			function(data) {
					resolve(data)
			})
	})
}

function normalizeCatalogKeyword(keyword) {
	if (typeof keyword !== "string") {
		return ""
	}
	return stripTags(keyword).replace(/\s+/g, " ").trim()
}

function fetchPage(sort, keyword, cursor) {
	var normalizedKeyword = normalizeCatalogKeyword(keyword)
	return new Promise(resolve => {
		var normalizedCursor = typeof cursor === "string" ? cursor : ""
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://catalog.roblox.com/v1/search/items" + sort + "&cursor=" + encodeURIComponent(normalizedCursor) + "&keyword=" + encodeURIComponent(normalizedKeyword) + "&includeNotForSale=true"}, 
			function(data) {
					resolve(data)
			})
	})
}


function createNewOutfit(outfitAssets, outfitName, outfitThumbnail, userId) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_create_outfit", {userId: userId, outfitAssets: outfitAssets, outfitName: outfitName, outfitThumbnail: outfitThumbnail}, 
			function(data) {
					resolve(data)
			})
	})
}

function updateThumbnail(userID, outfitAssets, newThumbnail) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_update_outfit_thumbnail", {userId: userID, outfitAssets: outfitAssets, outfitThumbnail: newThumbnail}, 
			function(data) {
					resolve(data)
			})
	})
}

function deleteOutfit(userID, outfitAssets) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_delete_outfit", {userId: userID, outfitAssets: outfitAssets}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchDetails(items) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://catalog.roblox.com/v1/catalog/items/details", jsonData: JSON.stringify(items)}, 
			function(data) {
				var requestedItems = []
				if (items != null && typeof items === "object" && Array.isArray(items.items)) {
					requestedItems = items.items
				}
				if (data != null && typeof data === "object" && Array.isArray(data.data)) {
					for (var i = 0; i < data.data.length; i++) {
						assetTypeDict[data.data[i].id] = data.data[i].assetType
					}
					resolve(data)
				} else {
					itemArray = {"data": []}
					for (i = 0; i < requestedItems.length; i++) {
						itemArray["data"].push({
							"id": requestedItems[i].id,
							"itemType": requestedItems[i].itemType || "Asset",
							"assetType": 18,
							"name": "",
							"description": "",
							"productId": -1,
							"genres": [
							  "TownAndCity"
							],
							"itemStatus": [],
							"creatorType": "User",
							"creatorTargetId": 1,
							"creatorName": "ROBLOX",
							"lowestPrice": -1,
							"unitsAvailableForConsumption": 0,
							"favoriteCount": 0,
							"offSaleDeadline": null
						  })
					}
					resolve(itemArray)
				}
			})
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

async function fetchSandboxVisualGate(gateKey) {
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

function isSandboxVisualGateAllowed(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateAllowed === "function"
	) {
		return roproApiAdapter.isVisualGateAllowed(gateInfo)
	}
	return gateInfo != null && typeof gateInfo == "object" && gateInfo.allowed === true
}

function isSandboxVisualGateUpsellEligible(gateInfo) {
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

function showSandboxVisualGateIssue(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.notifyVisualGateIssue === "function"
	) {
		roproApiAdapter.notifyVisualGateIssue(gateInfo, {
			contextLabel: "Avatar Sandbox",
			contextKey: "avatar_sandbox"
		})
	}
}

function fetchOutfits(userID) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_load_outfits", {userId: userID}, 
			function(data) {
					resolve(data)
			})
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
								for (var i = 0; i < data.data.length; i++) {
									itemBatch[data.data[i].id] = data.data[i]
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

function fetchLimitedSellers(assetId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://economy.roblox.com/v1/assets/" + assetId + "/resellers?cursor=&limit=10"}, 
			function(data) {
					resolve(data)
			})
	})
}

var thumbnailCache = {}
var thumbnailPendingRequests = {}
var thumbnailBatchQueuedIds = new Set()
var thumbnailBatchTimer = null
var thumbnailFallbackUrl = chrome.runtime.getURL('/images/empty.png')
var thumbnailKnownFallbackToken = "5d30ea2e004abe68a2db3b0d19fff763/420/420/Hat/Png"
var robuxIconUrl = chrome.runtime.getURL('/images/robux_icon.svg')

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
	if (/^http:\/\//i.test(url)) {
		url = url.replace(/^http:\/\//i, "https://")
	}
	if (url.indexOf(thumbnailKnownFallbackToken) !== -1) {
		return null
	}
	if (typeof roproApiAdapter.getSafeImageUrl === "function") {
		var safeUrl = roproApiAdapter.getSafeImageUrl(url)
		if (safeUrl == null) {
			if (
				isLikelySafeImageHost(url) &&
				/^https?:\/\/.*/i.test(url) &&
				url.indexOf(thumbnailKnownFallbackToken) === -1
			) {
				return url
			}
			return null
		}
		if (safeUrl.indexOf(thumbnailKnownFallbackToken) !== -1) {
			return null
		}
		return safeUrl
	}
	if (!isLikelySafeImageHost(url)) {
		return null
	}
	if (!/^https?:\/\//i.test(url)) {
		return null
	}
	if (url.indexOf(thumbnailKnownFallbackToken) !== -1) {
		return null
	}
	return url
}

function isLikelySafeImageHost(rawUrl) {
	if (typeof rawUrl !== "string") {
		return false
	}
	if (!/^https?:\/\//i.test(rawUrl)) {
		return false
	}
	try {
		var parsedUrl = new URL(rawUrl)
		if (parsedUrl.protocol !== "https:") {
			return false
		}
		var hostname = parsedUrl.hostname.toLowerCase()
		if (
			hostname === "cdn.ropro.io" ||
			hostname === "node.ropro.io" ||
			hostname === "assetdelivery.roblox.com" ||
			hostname === "www.ropro.io" ||
			hostname === "ropro.io"
		) {
			return true
		}
		if (
			hostname.endsWith(".rbxcdn.com") ||
			hostname.endsWith(".roblox.com") ||
			hostname.endsWith(".ropro.io")
		) {
			return true
		}
	} catch (e) {}
	return false
}

function applyAssetThumbnail(id, url) {
	var normalizedId = parseInt(id)
	var normalizedUrl = normalizeAssetThumbnailUrl(url) || thumbnailFallbackUrl
	$('.ropro-image-' + normalizedId).each(function() {
		this.onerror = function() {
			this.onerror = null
			this.src = thumbnailFallbackUrl
		}
		this.src = normalizedUrl
	})
}

function queueAssetThumbnailBatchFlush() {
	if (thumbnailBatchTimer != null) {
		return
	}
	thumbnailBatchTimer = setTimeout(flushAssetThumbnailBatchQueue, 40)
}

function fetchAssetThumbnailBatch(ids) {
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
				requestId: normalizedId + ":Asset:150x150:Webp",
				type: "Asset",
				targetId: String(normalizedId),
				size: "150x150",
				format: "Webp"
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

async function flushAssetThumbnailBatchQueue() {
	thumbnailBatchTimer = null
	var queuedIds = Array.from(thumbnailBatchQueuedIds)
	thumbnailBatchQueuedIds = new Set()
	if (queuedIds.length === 0) {
		return
	}
	var urlsById = await fetchAssetThumbnailBatch(queuedIds)
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
		}
		applyAssetThumbnail(normalizedId, resolvedUrl)
		if (thumbnailPendingRequests.hasOwnProperty(normalizedId)) {
			thumbnailPendingRequests[normalizedId].resolve(resolvedUrl)
			delete thumbnailPendingRequests[normalizedId]
		}
	}
}

function setAssetThumbnail(id) {
	var normalizedId = parseInt(id)
	if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
		return Promise.resolve(thumbnailFallbackUrl)
	}
	if (thumbnailCache.hasOwnProperty(normalizedId)) {
		applyAssetThumbnail(normalizedId, thumbnailCache[normalizedId])
		return Promise.resolve(thumbnailCache[normalizedId])
	}
	if (thumbnailPendingRequests.hasOwnProperty(normalizedId)) {
		return thumbnailPendingRequests[normalizedId].promise
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

function setAssetThumbnailBulk(ids) {
	if (!Array.isArray(ids)) {
		return Promise.resolve([])
	}
	var requests = []
	var seen = {}
	for (var i = 0; i < ids.length; i++) {
		var normalizedId = parseInt(ids[i])
		if (!Number.isFinite(normalizedId) || normalizedId <= 0 || seen.hasOwnProperty(normalizedId)) {
			continue
		}
		seen[normalizedId] = true
		requests.push(setAssetThumbnail(normalizedId))
	}
	return Promise.all(requests)
}

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
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

function getRenderParameters() {
	params = {}
	params["avatarDefinition"] = {"assets": wearing, "bodyColors": bodyColors, "playerAvatarType": playerAvatarType, "scales": scales}
	params["thumbnailConfig"] = thumbnailConfig
	return params
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function buildRobuxIconMarkup(iconClass) {
	return `<img src="${robuxIconUrl}" class="ropro-robux-icon-inline ${iconClass}" alt="Robux">`
}

function normalizeCatalogPriceStatus(priceStatus) {
	if (typeof priceStatus !== "string") {
		return ""
	}
	return priceStatus.toLowerCase().replace(/\s+/g, "")
}

function isSandboxCatalogItemOffsale(itemDetails) {
	if (itemDetails == null || typeof itemDetails !== "object") {
		return false
	}
	if (itemDetails.isOffSale === true) {
		return true
	}
	return normalizeCatalogPriceStatus(itemDetails.priceStatus) == "offsale"
}

function normalizeCatalogPriceDisplay(price) {
	if (price == null) {
		return {label: "", showRobux: false}
	}
	var normalizedText = stripTags(String(price)).trim()
	if (normalizedText.length === 0) {
		return {label: "", showRobux: false}
	}
	var lowered = normalizedText.toLowerCase()
	var normalizedStatus = normalizeCatalogPriceStatus(normalizedText)
	if (normalizedStatus === "offsale") {
		return {label: "Offsale", showRobux: false}
	}
	if (lowered === "free") {
		return {label: "Free", showRobux: false}
	}
	if (
		lowered === "no sellers" ||
		lowered === "no resellers" ||
		normalizedStatus === "nosellers" ||
		normalizedStatus === "noresellers"
	) {
		return {label: "No Sellers", showRobux: false}
	}
	var numericValue = parseInt(normalizedText.replace(/,/g, ""), 10)
	if (!Number.isFinite(numericValue) || isNaN(numericValue) || numericValue < 0) {
		return {label: normalizedText, showRobux: false}
	}
	return {label: addCommas(numericValue), showRobux: true}
}

function normalizeOutfitThumbnailUrl(value) {
	var fallback = thumbnailFallbackUrl
	if (typeof value !== "string" && typeof value !== "number") {
		return fallback
	}
	var thumbnail = stripTags(String(value)).trim()
	if (thumbnail.length === 0) {
		return fallback
	}
	var loweredThumbnail = thumbnail.toLowerCase()
	if (
		loweredThumbnail === "null" ||
		loweredThumbnail === "undefined" ||
		loweredThumbnail === "none" ||
		loweredThumbnail === "nan"
	) {
		return fallback
	}
	if (/^[1-9]\d*$/.test(thumbnail)) {
		return fallback
	}
	if (thumbnail.indexOf("//") === 0) {
		thumbnail = "https:" + thumbnail
	}
	if (/^http:\/\//i.test(thumbnail)) {
		thumbnail = thumbnail.replace(/^http:\/\//i, "https://")
	}
	if (
		!/^https?:\/\//i.test(thumbnail) &&
		!/^chrome-extension:\/\//i.test(thumbnail) &&
		!/^safari-web-extension:\/\//i.test(thumbnail)
	) {
		return fallback
	}
	if (thumbnail.indexOf(thumbnailKnownFallbackToken) !== -1) {
		return fallback
	}
	return thumbnail
}

function isSandboxPath() {
	return /\/sandbox\/?$/i.test(window.location.pathname)
}

function isRobloxSandbox404Overlay(node) {
	if (node == null || node.nodeType !== 1) {
		return false
	}
	if (!isSandboxPath()) {
		return false
	}
	var text = (node.textContent || "").toLowerCase()
	return text.includes("404") && text.includes("page not found")
}

var sandbox404PrehideStyleId = "ropro-sandbox-404-prehide-style"
var sandbox404PrehideTimer = null
var sandbox404Observer = null

function installSandbox404Prehide() {
	if (!isSandboxPath()) {
		return
	}
	if (document.getElementById(sandbox404PrehideStyleId) != null) {
		return
	}
	var prehideStyle = document.createElement("style")
	prehideStyle.id = sandbox404PrehideStyleId
	prehideStyle.textContent = ".request-error-page-content{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}"
	var styleHost = document.head || document.documentElement
	if (styleHost != null) {
		styleHost.appendChild(prehideStyle)
	}
	if (sandbox404PrehideTimer != null) {
		clearTimeout(sandbox404PrehideTimer)
	}
	sandbox404PrehideTimer = setTimeout(function() {
		removeSandbox404Prehide()
	}, 5000)
}

function removeSandbox404Prehide() {
	var prehideStyle = document.getElementById(sandbox404PrehideStyleId)
	if (prehideStyle != null) {
		prehideStyle.remove()
	}
	if (sandbox404PrehideTimer != null) {
		clearTimeout(sandbox404PrehideTimer)
		sandbox404PrehideTimer = null
	}
}

function dismissRobloxSandbox404Overlay() {
	var overlayNode = document.querySelector('.request-error-page-content')
	if (overlayNode == null) {
		return
	}
	if (!isRobloxSandbox404Overlay(overlayNode)) {
		return
	}
	overlayNode.style.display = "none"
	overlayNode.style.visibility = "hidden"
	overlayNode.style.pointerEvents = "none"
	var errorPage = overlayNode.closest('.default-error-page')
	if (errorPage != null) {
		errorPage.style.display = "none"
		errorPage.style.visibility = "hidden"
		errorPage.style.pointerEvents = "none"
	}
}

function startSandbox404Suppression() {
	if (!isSandboxPath()) {
		return
	}
	installSandbox404Prehide()
	dismissRobloxSandbox404Overlay()
	if (sandbox404Observer != null) {
		return
	}
	sandbox404Observer = new MutationObserver(function() {
		dismissRobloxSandbox404Overlay()
	})
	if (document.documentElement != null) {
		sandbox404Observer.observe(document.documentElement, {childList: true, subtree: true})
	}
}

function stopSandbox404Suppression() {
	if (sandbox404Observer != null) {
		sandbox404Observer.disconnect()
		sandbox404Observer = null
	}
	removeSandbox404Prehide()
}

function buildCatalogPriceContentMarkup(price, useWhiteText) {
	var priceDisplay = normalizeCatalogPriceDisplay(price)
	if (priceDisplay.label.length === 0) {
		return ""
	}
	var textStyle = useWhiteText ? "margin-left:1px;color:white;position:relative;top:-1px;" : "margin-left:1px;position:relative;top:-1px;"
	return `${priceDisplay.showRobux ? buildRobuxIconMarkup("ropro-robux-icon-price") : ""}<span style="${textStyle}" class="text-robux-tile ropro-catalog-price-label">${priceDisplay.label}</span>`
}

function totalOutfitCost() {
	total = 0
	offsale = 0
	for (key in wearingCostDict) {
		if (wearingCostDict[key] != null) {
			total += wearingCostDict[key]
		} else {
			offsale += 1
		}
	}
	return [total, offsale]
}

function stripTags(s) {
	return roproApiAdapter.stripTags(s);
}

 var merchCount = 0
 var merchStep = 3
 var merchPage = 0

 async function addMerch(id, name, price) {
	merchCount++
	merchContainer = document.getElementById('merchContainer')
	var merchPriceContent = buildCatalogPriceContentMarkup(price, true)
	merchHTML = `<div style="float:left;margin-left:1px;margin-right:1px;"><div style="width:76px;" class="item-card-container remove-panel"><div class="item-card-link">
	<a class="item-card-thumb-container">
	<thumbnail-2d id="${parseInt(id)}" type="Asset" style="overflow:visible;height:76px;width:76px;position:relative;" class="item-card-thumb-container item-card-thumb ng-isolate-scope  ${parseInt(id)}">
	<span class="thumbnail-2d-container">
	<img class="item-card-image" style="height:76px;width:76px;position:absolute;margin-left:5px;margin-top:5px;" src="${chrome.runtime.getURL('/images/empty.png')}"></span>
	<img style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-50px;top:-35px;" class="checkmark-image " src="${chrome.runtime.getURL('/images/checkmark_start.png')}">
	</thumbnail-2d> </a> </div> <div style="width:76px;" class="item-card-caption"> <div class="item-card-equipped ng-hide"> <div class="item-card-equipped-label"></div>
	<span class="icon-check-selection"></span> </div>
	<a target="_blank" href="https://www.roblox.com/catalog/${parseInt(id)}/item" class="item-card-name-link">
	<div style="float:left;margin-top:5px;font-size:13px;width:85px;" title="${stripTags(name)}" class="text-overflow item-card-name ng-binding">${stripTags(name)}</div>
	<div class="action-button"><button type="button" class="btn-fixed-width btn-growth-sm " style="width:80px;height:30px;margin-top:0px;"><div class="text-overflow item-card-price font-header-2 text-subheader margin-top-none" style="float:left;margin-top:-3px;margin-left:7px;">
	${merchPriceContent}
	</div></button></div>
	</a></div></div></div>`
	li = document.createElement('li')
	li.setAttribute('style', 'height: 170px; width: 76px; margin-left: 10px; margin-right: 5px; display: inline-block;')
	li.classList.add("ropro-merch")
	if (merchCount > merchStep) {
		li.style.display = "none"
	}
	li.innerHTML = merchHTML
	li.getElementsByClassName('item-card-thumb')[0].addEventListener('click', async function() {
		if ($(this).find('.checkmark-image').attr('class').includes('active')) {
			$(this).find('.checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark_end.png'))
			$(this).find('.checkmark-image').removeClass('active')
			removeItem(parseInt($(this).attr('id')))
		} else {
			$(this).find('.checkmark-image').addClass('active')
			$(this).find('.checkmark-image').attr('src',chrome.runtime.getURL('/images/checkmark.png'))
			function changeImage(checkmark) {
				setTimeout(function(){
					$(checkmark).find('.checkmark-image').attr('src',chrome.runtime.getURL('/images/checkmark_done.gif'))
				}, 400)
			}
			changeImage(this)
			addItem(parseInt($(this).attr('id')))
		}
	})
	merchContainer.appendChild(li)
 }

 var assetDetailsCache = {}

 async function calculateCost(assetId) {
	 document.getElementById("outfitCostLoading").style.display = "inline-block"
	 document.getElementById("outfitCostDiv").style.display = "none"
	 if (assetId != -1) {
		 if (assetId in assetDetailsCache) {
			 assetDetails = assetDetailsCache[assetId]
		 } else {
			 assetDetailsCache[assetId] = await fetchAssetDetails(assetId)
			 assetDetails = assetDetailsCache[assetId]
		 }
		 $(".wearing-" + assetId).html(stripTags(assetDetails.name))
		 wearingInfoDict[assetId] = stripTags(assetDetails.name)
		 if (isSandboxCatalogItemOffsale(assetDetails)) {
			 wearingCostDict[assetId] = null
			 $(".wearing-robux-" + assetId).html("Offsale")
		 } else if (assetDetails.hasOwnProperty('lowestPrice')) {
			 if (assetDetails.lowestPrice != null) {
				 wearingCostDict[assetId] = assetDetails.lowestPrice
				 $(".wearing-robux-" + assetId).html(addCommas(assetDetails.lowestPrice))
			 } else {
				 wearingCostDict[assetId] = null
				 $(".wearing-robux-" + assetId).html("Offsale")
			 }
		 } else {
			 if (assetDetails.price != null) {
				 wearingCostDict[assetId] = assetDetails.price
				 $(".wearing-robux-" + assetId).html(addCommas(assetDetails.price))
			 } else {
				 wearingCostDict[assetId] = null
				 $(".wearing-robux-" + assetId).html("Offsale")
			 }
		 }
	 }
	 cost = totalOutfitCost()
	 if (cost[1] == 0) {
		 costString = addCommas(parseInt(cost[0]))
	 } else {
		 costString = addCommas(parseInt(cost[0])) + "<span class='outfit-cost-offsale-pill'> + " + parseInt(cost[1]) + " offsale</span>"
	 }
	 document.getElementById("outfitCostRobux").innerHTML = costString
	 document.getElementById("outfitCostLoading").style.display = "none"
	 document.getElementById("outfitCostDiv").style.display = "inline-block"
 }

function addOutfit(userID, assets, name, thumbnail) {
	var safeOutfitName = stripTags(typeof name === "string" ? name : "")
	var safeThumbnail = normalizeOutfitThumbnailUrl(thumbnail)
	outfitHTML = `<div class="outfit-delete" style="z-index:10000;position:absolute;top:-8px;right:-8px;white-space:nowrap;">
				<button type="button" class="ropro-outfit-delete-button" aria-label="Delete outfit">X</button>
				</div>
				<div class="outfit-name">${safeOutfitName}</div>
				<div assets='${JSON.stringify(assets)}' outfit-name="${safeOutfitName}" style="display:inline-block;width:85px;height:85px;margin:2px;" class="thumbnail-2d-container outfit-selector"><a style="position:relative;">
				<img class="item-card-thumb-container ropro-outfit-thumbnail" style="width:100%;height:100%;" src="${safeThumbnail}" alt="${safeOutfitName}">
				</a>
				</div>`
	div = document.createElement('div')
	div.setAttribute('class', 'outfit-div')
	div.setAttribute('style', 'display:inline-block;width:85px;height:85px;position:relative;margin:2px;')
	div.innerHTML = outfitHTML
	document.getElementById('outfitContainer').insertBefore(div, document.getElementById('outfitContainer').childNodes[0])
	var outfitImage = div.getElementsByClassName('ropro-outfit-thumbnail')[0]
	if (outfitImage != null) {
		outfitImage.onerror = function() {
			this.onerror = null
			this.src = thumbnailFallbackUrl
		}
	}
	div.getElementsByClassName('outfit-delete')[0].addEventListener('click', function(event) {
		if (event != null) {
			event.preventDefault()
			event.stopPropagation()
		}
		this.parentNode.remove();
		deleteOutfit(userID, assets);
	});
	div.getElementsByClassName('outfit-selector')[0].addEventListener('click', async function() {
		ids = getIds(wearing)
		var itemsArray = []
		for (i = 0; i < ids.length; i++) {
			delete wearingCostDict[ids[i]]
			itemsArray.push({"id":ids[i],"itemType":"Asset"})
		}
		calculateCost(-1)
		wearing = []
		await fetchDetails({"items":itemsArray})
		addItemBulk(assets)
	})
	return div
}

function normalizeOutfitAssets(outfitAssets) {
	var normalized = []
	var seenIds = {}
	if (!Array.isArray(outfitAssets)) {
		return normalized
	}
	for (var i = 0; i < outfitAssets.length; i++) {
		var assetId = parseInt(outfitAssets[i])
		if (!Number.isFinite(assetId) || assetId <= 0 || seenIds[assetId]) {
			continue
		}
		seenIds[assetId] = true
		normalized.push(assetId)
	}
	return normalized
}

async function updateOutfitThumbnail(userID, div, outfitAssets) {
	var normalizedOutfitAssets = normalizeOutfitAssets(outfitAssets)
	if (normalizedOutfitAssets.length === 0) {
		return
	}
	var url = await fetchAssetsView2D(normalizedOutfitAssets)
	url = normalizeOutfitThumbnailUrl(url)
	if (url != 'CANCELLED' && url != null && url != "" && url !== thumbnailFallbackUrl) {
		var outfitImage = div.getElementsByClassName('ropro-outfit-thumbnail')[0]
		if (outfitImage != null) {
			outfitImage.setAttribute('src', url);
		}
		await updateThumbnail(userID, normalizedOutfitAssets, url);
	}
}

async function createOutfit(name) {
	var outfitAssets = normalizeOutfitAssets(getIds(wearing))
	//var params = getRenderParameters()
	//params["thumbnailConfig"] = {"thumbnailId": 2, "thumbnailType": "2d", "size": "420x420"}
	//url = await fetchAssetsView(JSON.stringify(params))
	var url = chrome.runtime.getURL('/images/empty.png')
	var userId = await getUserId()
	var createOutfitReq = await createNewOutfit(outfitAssets, stripTags(name), url, userId)
	if (createOutfitReq == "1") {
		var div = addOutfit(userId, outfitAssets, stripTags(name), url)
		updateOutfitThumbnail(userId, div, outfitAssets)
		document.getElementById('outfitSubtitle').textContent = chrome.i18n.getMessage("SuccessfullyCreatedOutfit")
		document.getElementById('outfitNameGroup').style.display = "none"
		document.getElementById('createOutfitButton').textContent = "Save"
		document.getElementById('outfitSubtitle').style.display = "block"
		document.getElementById('outfitNameInput').value = ""
	} else {
		document.getElementById('outfitSubtitle').textContent = "Error: You already have this outfit."
		document.getElementById('outfitNameGroup').style.display = "none"
		document.getElementById('createOutfitButton').textContent = "Save"
		document.getElementById('outfitSubtitle').style.display = "block"
		document.getElementById('outfitNameInput').value = ""
	}
}

function submitOutfitCreation() {
	var outfitInput = document.getElementById('outfitNameInput')
	if (outfitInput == null) {
		return
	}
	var outfitName = stripTags((outfitInput.value || "").trim())
	if (outfitName.length === 0) {
		return
	}
	createOutfit(outfitName)
}

const paidList = () => {
	let paidItems = []
	const addPaidItem = (item) => {
		paidItems.push(item)
	}
	const getPaidItems = () => {
		return paidItems
	}
	return {
		addPaidItem,
		getPaidItems
	}
}

const paidItemsList = paidList()

function createItem(name, assetId, price, limited, limitedU, itemType, thumbnail, bundleType = "") {
	li = document.createElement('li')
	li.style.height = "200px"
	li.style.width = "126px"
	li.style.marginLeft = "5px"
	li.style.marginRight = "5px"
	li.style.display = "inline-block"
	if (getIds(wearing).includes(assetId)) {
		active = "active"
		src = chrome.runtime.getURL('/images/checkmark_done.gif')
	} else {
		active = ""
		src = chrome.runtime.getURL('/images/checkmark_start.png')
	}
	if (thumbnail.length == 0) {
		thumbnail = chrome.runtime.getURL('/images/empty.png')
	}
	if (itemType == "Bundle") {
			subdirectory = "bundles"
		} else {
			subdirectory = "catalog"
		}
		if ((itemType == "Bundle" || itemType == "61") && price != "Free" && bundleType != "Shoes") {
			//paidItemsList.addPaidItem(parseInt(assetId))
		}
		var safeThumbnailUrl = normalizeAssetThumbnailUrl({
			imageUrl: stripTags(thumbnail)
		})
		if (safeThumbnailUrl == null) {
			safeThumbnailUrl = chrome.runtime.getURL('/images/empty.png')
		}
		var itemPriceContent = buildCatalogPriceContentMarkup(price, false)
		var itemPriceMarkup = itemPriceContent.length > 0
			? `<div class="text-overflow item-card-price font-header-2 text-subheader margin-top-none ropro-sandbox-item-price">${itemPriceContent}</div>`
			: ``
		itemHTML = `<div style="float:left;margin-left:1px;margin-right:1px;"><div class="item-card-container remove-panel"><div class="item-card-link">
	<a class="item-card-thumb-container">
	<thumbnail-2d id=${parseInt(assetId)} type="${stripTags(itemType)}" style="overflow:visible;height:126px;width:126px;position:relative;" class="item-card-thumb-container item-card-thumb ng-isolate-scope ${active} ${parseInt(assetId)}">
	<span class="thumbnail-2d-container">
		<img class="item-card-image ropro-image-${parseInt(assetId)}" style="height:126px;width:126px;position:absolute;" src="${safeThumbnailUrl}">
	</span>
	<img style="pointer-events:none;transform:scale(0.4);overflow:visible;width:164px;height:126px;position:absolute;right:-50px;top:-35px;" class="checkmark-image ${active}" src="${src}">
	</thumbnail-2d> </a> </div> <div class="item-card-caption"> <div class="item-card-equipped ng-hide"> <div class="item-card-equipped-label"></div>
	<span class="icon-check-selection"></span> </div>
	<a target="_blank" href="https://www.roblox.com/${subdirectory}/${parseInt(assetId)}/item" class="item-card-name-link">
	<div style="margin-top:5px;" title="${stripTags(name)}" class="text-overflow item-card-name ng-binding ropro-sandbox-item-name">${stripTags(name)}</div>
	${itemPriceMarkup}
	</a></div></div></div>`
	li.innerHTML = itemHTML
	var imageNode = li.getElementsByClassName('item-card-image')[0]
	if (imageNode != null) {
		imageNode.onerror = function() {
			this.onerror = null
			this.src = thumbnailFallbackUrl
		}
	}
	return li
}

function createTab(tabName) {
tabList = ""
firstTab = null
count = 1
for (sort in sorts[tabName]) {
	if (firstTab == null) {
		firstTab = sort
	}
	if (activeTab == null) {
		activeTab = tabName
		currentTab = tabName
		currentSort = Object.keys(sorts[tabName])[0]
	}
	tabList += `<li class="dropdown-custom-item" class="ng-scope"> <a style="font-size:13px;">${stripTags(sort)}</a></li>`
	count++
}

	div = document.createElement("div")
	tabHTML = `
		<div id="navbar-universal-search" style="margin-top:10px;margin-right:14px;float:right;width:680px;" role="search">
		   <div class="search-container">
		      <div class="input-group ropro-sandbox-search-row">
		         <input style="unicode-bidi:bidi-override!important;direction:LTR!important;" class="input-field sandbox-search ropro-sandbox-search-input" placeholder="Search" maxlength="50"> 
		         <button class="sandbox-search-clear-button ropro-sandbox-search-clear-button input-addon-btn" type="button" aria-label="Clear search" title="Clear search">X</button>
		         <div style="width:150px;" class="input-group-btn ropro-sandbox-search-controls">
		            <button style="height:38px;" type="button" class="input-dropdown-btn category-options ng-scope"> <span style="font-size:13px;" class="text-overflow rbx-selection-label ng-binding">${stripTags(firstTab)}</span> <span class="icon-down-16x16"></span> </button> 
		            <ul page="0" style="width:150px;display:block;" class="dropdown_menu dropdown_menu-4 dropdown-menu dropdown-custom">
						${tabList}
		            </ul>
		         </div>
		      </div>
		   </div>
		</div>`

itemContentHTML = `
<div style="width:680px;min-height:50px;margin-right:14px;float:right;margin-top:10px;" class="item-content">
<ul page="0" class="item-list hlist item-cards-stackable">
${buildRoProLoader({ className: "ropro-branded-loader-centered-section" })}
</ul>
</div>
`

	div.innerHTML = tabHTML + itemContentHTML
	return div
}

function getSandboxSearchInput(triggerElement) {
	if (triggerElement == null) {
		return null
	}
	var searchContainer = triggerElement.closest('.search-container')
	if (searchContainer == null) {
		return null
	}
	var searchInput = searchContainer.getElementsByClassName('sandbox-search')
	if (searchInput.length === 0) {
		return null
	}
	return searchInput[0]
}

function clearSandboxSearchDebounce(searchInput) {
	if (searchInput == null) {
		return
	}
	var pendingTimer = sandboxSearchDebounceTimers.get(searchInput)
	if (pendingTimer != null) {
		clearTimeout(pendingTimer)
	}
	sandboxSearchDebounceTimers.delete(searchInput)
}

function scheduleSandboxSearchFromInput(searchInput) {
	if (searchInput == null) {
		return
	}
	clearSandboxSearchDebounce(searchInput)
	var debounceTimer = setTimeout(function() {
		var normalizedKeyword = normalizeCatalogKeyword(searchInput.value || "")
		var lastSubmittedKeyword = sandboxSearchLastSubmittedKeyword.get(searchInput)
		if (lastSubmittedKeyword === normalizedKeyword) {
			return
		}
		sandboxSearchLastSubmittedKeyword.set(searchInput, normalizedKeyword)
		updatePage("", normalizedKeyword, false)
	}, sandboxSearchDebounceMs)
	sandboxSearchDebounceTimers.set(searchInput, debounceTimer)
}

function submitSandboxSearch(triggerElement) {
	var searchInput = getSandboxSearchInput(triggerElement)
	if (searchInput == null) {
		return
	}
	clearSandboxSearchDebounce(searchInput)
	var normalizedKeyword = normalizeCatalogKeyword(searchInput.value || "")
	sandboxSearchLastSubmittedKeyword.set(searchInput, normalizedKeyword)
	updatePage("", normalizedKeyword, false)
}

function clearSandboxSearch(triggerElement) {
	var searchInput = getSandboxSearchInput(triggerElement)
	if (searchInput == null) {
		return
	}
	clearSandboxSearchDebounce(searchInput)
	searchInput.value = ""
	sandboxSearchLastSubmittedKeyword.set(searchInput, "")
	updatePage("", "", false)
	searchInput.focus()
}

function createUpgradeModal() {
    if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
        return null
    }
    return window.RoProUpgradeModal.open({
        tier: "plus",
        contextLabel: "RoPro Avatar Sandbox",
        featureLabel: "Saving Sandbox Outfits",
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

function upgradeModal() {
    var modal = createUpgradeModal()
    if (modal != null) {
        modal.style.display = "block"
    }
}

var bundleThumbnails = {}

function getLimitedFilterMode() {
	if (currentTab !== "Limiteds") {
		return "all"
	}
	if (currentSort === "Classic Limiteds") {
		return "classic"
	}
	if (currentSort === "UGC Limiteds") {
		return "ugc"
	}
	return "all"
}

function isRobloxCreator(item) {
	if (item == null || typeof item !== "object") {
		return false
	}
	var creatorName = typeof item.creatorName === "string" ? item.creatorName.trim().toLowerCase() : ""
	if (creatorName === "roblox") {
		return true
	}
	var creatorTargetId = parseInt(item.creatorTargetId)
	if (Number.isFinite(creatorTargetId) && creatorTargetId === 1) {
		return true
	}
	return false
}

function isUgcCreator(item) {
	if (item == null || typeof item !== "object") {
		return false
	}
	if (isRobloxCreator(item)) {
		return false
	}
	var creatorType = typeof item.creatorType === "string" ? item.creatorType.trim().toLowerCase() : ""
	if (creatorType === "user" || creatorType === "group") {
		return true
	}
	var creatorName = typeof item.creatorName === "string" ? item.creatorName.trim() : ""
	return creatorName.length > 0
}

function filterLimitedCatalogItems(items, limitedFilterMode) {
	if (!Array.isArray(items)) {
		return []
	}
	if (limitedFilterMode === "all") {
		return items
	}
	var filteredItems = []
	for (var i = 0; i < items.length; i++) {
		var item = items[i]
		if (item == null || typeof item !== "object") {
			continue
		}
		if (limitedFilterMode === "classic") {
			if (isRobloxCreator(item)) {
				filteredItems.push(item)
			}
			continue
		}
		if (limitedFilterMode === "ugc") {
			if (isUgcCreator(item)) {
				filteredItems.push(item)
			}
			continue
		}
		filteredItems.push(item)
	}
	return filteredItems
}

async function fetchLimitedFilteredDetails(catalogPage, keyword, sortQuery, limitedFilterMode) {
	var mergedItems = []
	var page = catalogPage
	var nextCursor = null
	var previousCursor = null
	var fetchCount = 0
	while (page != null && typeof page === "object" && fetchCount < 5) {
		if (previousCursor == null) {
			previousCursor = page.previousPageCursor == null ? null : page.previousPageCursor
		}
		nextCursor = page.nextPageCursor == null ? null : page.nextPageCursor
		var pageData = Array.isArray(page.data) ? page.data : []
		if (pageData.length > 0) {
			var detailResponse = await fetchDetails({"items": pageData})
			var detailRows = detailResponse != null && typeof detailResponse === "object" && Array.isArray(detailResponse.data)
				? detailResponse.data
				: []
			var filteredRows = filterLimitedCatalogItems(detailRows, limitedFilterMode)
			for (var i = 0; i < filteredRows.length; i++) {
				mergedItems.push(filteredRows[i])
				if (mergedItems.length >= 30) {
					break
				}
			}
		}
		if (mergedItems.length >= 30 || nextCursor == null) {
			break
		}
		page = await fetchPage(sortQuery, keyword, nextCursor)
		fetchCount++
	}
	return {
		"previousPageCursor": previousCursor,
		"nextPageCursor": nextCursor,
		"data": mergedItems
	}
}

async function updatePage(cursor, keyword, back) {
	function toSafeArray(value) {
		return Array.isArray(value) ? value : []
	}

	setTimeout(function(){
		pageLoading = false
	},500)
	if (pageLoading == false) {
		pageLoading = true
		mySort = ""
		if (sorts[currentTab] != null && typeof sorts[currentTab] === "object") {
			if (typeof sorts[currentTab][currentSort] === "string") {
				mySort = sorts[currentTab][currentSort]
			} else {
				var sortKeys = Object.keys(sorts[currentTab])
				if (sortKeys.length > 0) {
					mySort = sorts[currentTab][sortKeys[0]]
				}
			}
		}
		itemList = currentPage != null && typeof currentPage.getElementsByClassName === "function"
			? currentPage.getElementsByClassName('item-list')[0]
			: null
		if (itemList == null || mySort.length === 0) {
			return
		}
		catalogPage = await fetchPage(mySort, keyword, cursor)
		if (catalogPage != null && typeof catalogPage === "object") {
			var limitedFilterMode = getLimitedFilterMode()
			if (limitedFilterMode === "all") {
				itemDetails = await fetchDetails({"items": toSafeArray(catalogPage.data)})
			} else {
				itemDetails = await fetchLimitedFilteredDetails(catalogPage, keyword, mySort, limitedFilterMode)
				if (itemDetails != null && typeof itemDetails === "object") {
					if (typeof itemDetails.previousPageCursor !== "undefined") {
						catalogPage.previousPageCursor = itemDetails.previousPageCursor
					}
					if (typeof itemDetails.nextPageCursor !== "undefined") {
						catalogPage.nextPageCursor = itemDetails.nextPageCursor
					}
				}
			}
			if (itemDetails == null || typeof itemDetails !== "object") {
				itemDetails = {"data": []}
			}
			var itemRows = toSafeArray(itemDetails.data)
			newCursor = catalogPage.nextPageCursor
			oldCursor = catalogPage.previousPageCursor
			cursors[currentTab][0] = oldCursor
			cursors[currentTab][1] = newCursor
			loadedFlag = false
			itemList.innerHTML = buildRoProLoader({className: "ropro-branded-loader-centered-section"})
			bundleIds = []
			bundleItems = []
			var assetThumbnailIds = []
			for (i = 0; i < itemRows.length; i++) {
				item = itemRows[i]
				if (item == null || typeof item !== "object") {
					continue
				}
				if (isSandboxCatalogItemOffsale(item)) {
					price = "Offsale"
				} else if (typeof item.lowestPrice != 'undefined') {
					if (item.lowestPrice == -1) {
						price = ""
					} else {
						price = item.lowestPrice
					}
				} else if (normalizeCatalogPriceStatus(item.priceStatus) == "noresellers") {
					price = "No Sellers"
				} else {
					price = item.price > 0 ? item.price : "Free"
				}
				if (item.itemType != "Bundle") {
					if (loadedFlag == false) {
						loadedFlag = true
						itemList.innerHTML = ""
					}
					itemElement = createItem(stripTags(item.name), item.id, price, false, false, parseInt(item.assetType).toString(), "")
					itemList.innerHTML += itemElement.outerHTML
					assetThumbnailIds.push(item.id)
				} else {
					bundleIds.push(item.id)
					bundleItems.push(item)
				}
			}
			setAssetThumbnailBulk(assetThumbnailIds)
			if (itemRows.length == 0) {
				if (loadedFlag == false) {
					loadedFlag = true
					itemList.innerHTML = ""
				}
			}
			if (bundleIds.length > 0) {
				bundles = await fetchBundleDetailsBulk(bundleIds)
				thumbs = await fetchBundleThumbnailsBulk(bundleIds)
				var thumbnailRows = toSafeArray(thumbs && thumbs.data)
				for (i = 0; i < thumbnailRows.length; i++) {
					if (thumbnailRows[i] != null && typeof thumbnailRows[i] === "object") {
						bundleThumbnails[parseInt(thumbnailRows[i].targetId)] = thumbnailRows[i].imageUrl
					}
				}
				var bundleRows = toSafeArray(bundles)
				for (i = 0; i < bundleItems.length && i < bundleRows.length; i++) {
					item = bundleItems[i]
					userOutfitId = -1
					bundle = bundleRows[i]
					if (bundle == null || bundle.product == null) {
						continue
					}
					price = bundle.product.priceInRobux
					if (price == null) {
						if (bundle.product.noPriceText == "Free") {
							price = "Free"
						} else {
							price = "Offsale"
						}
					}
					for (j = 0; j < bundle.items.length; j++) {
						bundleItem = bundle.items[j]
						if (bundleItem.type == "UserOutfit") {
							userOutfitId = bundleItem.id
						}
					}
					if (loadedFlag == false) {
						loadedFlag = true
						itemList.innerHTML = ""
					}
					itemElement = createItem(stripTags(item.name), item.id, price, false, false, "Bundle", stripTags(bundleThumbnails[bundle.id]), bundle.bundleType)
					itemList.innerHTML += itemElement.outerHTML
				}
			}
			prevPage = itemList.getAttribute("page")
			if (cursor == "" & !back) {
				prevPage = 0
			}
			if (!back) {
				itemList.setAttribute("page", (parseInt(prevPage) + 1).toString())
			} else {
				itemList.setAttribute("page", (parseInt(prevPage) - 1).toString())
			}
			page = itemList.getAttribute("page")
			if (page == "1") {
				disabledString = "disabled"
			} else {
				disabledString = ""
			}
			if (newCursor == null) {
				disabledString2 = "disabled"
			} else {
				disabledString2 = ""
			}
			pagerHTML = `
			<div class="pager-holder" cursor-pagination="pager" ng-show="paginations.isEnabled">
				<ul class="pager">
				<li class="pager-prev ${disabledString}">
				<a class="prev-page"><span class="icon-back"></span></a></li>
				<li><span cursor="" class="page-num-text">Page ${parseInt(page)}</span> </li>
				<li class="pager-next ${disabledString2}">
				<a class="next-page">
				<span class="icon-next"></span></a> </li>
				</ul></div>
			</div>
			`
			itemList.innerHTML += pagerHTML
			$(itemList).find('.item-card-thumb').click(async function() {
				if ($(this).attr('class').includes('active')) {
					$(this).find('.checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark_end.png'))
					$(this).find('.checkmark-image').removeClass('active')
					if ($(this).attr('type') == "Bundle") {
						bundleDetails = await fetchBundleDetails($(this).attr('id'))
						bundleItems = bundleDetails[0].items
						bundleAssetIds = []
						for (i = 0; i < bundleItems.length; i++) {
							item = bundleItems[i]
							if (item.type == "Asset") {
								//if (!item.name.includes("Animation") && !item.name.includes("Rthro")) {
									bundleAssetIds.push(item.id)
								//}
							}
						}
						removeItemBulk(bundleAssetIds)
					} else {
						removeItem(parseInt($(this).attr('id')))
					}
				} else {
					if (paidItemsList.getPaidItems().includes(parseInt($(this).attr('id')))) {
						var sandboxGate = await fetchSandboxVisualGate("sandboxOutfits")
						if (!isSandboxVisualGateAllowed(sandboxGate)) {
							if (isSandboxVisualGateUpsellEligible(sandboxGate)) {
								upgradeModal()
							} else {
								showSandboxVisualGateIssue(sandboxGate)
							}
							return
						}
					}
					{
						$(this).find('.checkmark-image').addClass('active')
						$(this).find('.checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark.png'))
						function changeImage(checkmark) {
							setTimeout(function(){
								$(checkmark).find('.checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark_done.gif'))
							}, 400)
						}
						changeImage(this)
						if ($(this).attr('type') == "Bundle") {
							bundleDetails = await fetchBundleDetails($(this).attr('id'))
							bundleItems = bundleDetails[0].items
							animationItems = []
							bundleAssetIds = []
							if (bundleDetails[0].bundleType == "Shoes") {
								for (var i = 0; i < bundleItems.length; i++) {
									item = bundleItems[i]
									if (i == 0) {
										assetTypeDict[item.id] = 70
									} else {
										assetTypeDict[item.id] = 71
									}
									bundleAssetIds.push(item.id)
								}
							} else {
								for (var i = 0; i < bundleItems.length; i++) {
									item = bundleItems[i]
									if (item.type == "UserOutfit") {
										outfitDetails = await fetchOutfitDetails(item.id)
										assets = outfitDetails.assets
										for (j = 0; j < assets.length; j++) {
											asset = assets[j]
											if ((!asset.assetType.name.includes("Animation")) || currentTab == "Animations") {
												if (asset.assetType.name.includes("Animation")) {
													animationItems.push(asset)
												} else {
													bundleAssetIds.push(asset.id)
												}
											}
										}
									}
								}
							}
							addItemBulk(bundleAssetIds)
						} else {
							addItem(parseInt($(this).attr('id')))
						}
					}
				}
				$(this).toggleClass('active')
			})
			$(itemList).find('.next-page').click(function() {
				currentTab = $(this).closest('.item-list').get(0).parentNode.parentNode.parentNode.id
				if (pageLoading == false) {
					if (!this.parentNode.classList.contains("disabled")) {
						updatePage(cursors[currentTab][1], keyword, false)
					}
				}
			})
			$(itemList).find('.prev-page').click(function() {
				if (pageLoading == false) {
					if (!this.parentNode.classList.contains("disabled")) {
						updatePage(cursors[currentTab][0], keyword, true)
					}
				}
			})
		}
	}
}

async function loadWearing() {
	var loaderView = document.getElementById('loaderView')
	var sandboxView = document.getElementById('sandboxView')
	if (loaderView != null) {
		loaderView.setAttribute('style', 'position:absolute;display:block;')
	}
	updateCurrentlyWearing()
	var params = getRenderParameters()
	var assetsViewURL = await fetchAssetsView(JSON.stringify(params))
	if (assetsViewURL != "CANCELLED" && sandboxView != null) {
		var sandboxRenderUrl = resolveSandboxRenderUrl(assetsViewURL, background)
		if (sandboxRenderUrl != null) {
			sandboxView.src = sandboxRenderUrl
		}
	}
	setTimeout(function(){
		if (loaderView != null) {
			loaderView.setAttribute('style', 'position:absolute;display:none;')
		}
	}, 500)
}

function bindSandboxWearingHoverIntent(wearingCardNode) {
	if (wearingCardNode == null) {
		return
	}
	var hideTimer = null
	function clearHideTimer() {
		if (hideTimer != null) {
			clearTimeout(hideTimer)
			hideTimer = null
		}
	}
	function openFlyout() {
		clearHideTimer()
		wearingCardNode.classList.add('ropro-wearing-hover-open')
	}
	function scheduleClose() {
		clearHideTimer()
		hideTimer = setTimeout(function() {
			hideTimer = null
			if (wearingCardNode.isConnected) {
				wearingCardNode.classList.remove('ropro-wearing-hover-open')
			}
		}, sandboxWearingHoverHideDelayMs)
	}
	wearingCardNode.addEventListener("mouseenter", openFlyout)
	wearingCardNode.addEventListener("mouseleave", scheduleClose)
	wearingCardNode.addEventListener("focusin", openFlyout)
	wearingCardNode.addEventListener("focusout", function(event) {
		if (event != null && event.relatedTarget != null && wearingCardNode.contains(event.relatedTarget)) {
			return
		}
		scheduleClose()
	})
}

function updateCurrentlyWearing() {
	var wearingContainer = document.getElementById('wearingContainer')
	if (wearingContainer == null) {
		return
	}
	wearingContainer.innerHTML = ""
	var thumbnailIds = []
	for (i = 0; i < wearing.length; i++) {
		item = parseInt(wearing[i].id)
		if (!Number.isFinite(item) || item <= 0) {
			continue
		}
		thumbnailIds.push(item)
		div = document.createElement("div")
		var catalogItemUrl = `https://www.roblox.com/catalog/${item}/item`
		var rolimonsItemUrl = `https://www.rolimons.com/item/${item}`
		div.innerHTML += `<div class="wearing-delete"><button type="button" class="ropro-outfit-delete-button ropro-wearing-delete-button" aria-label="Unequip item">X</button></div>
			<div class="wearing-name input-group input-field"><div class="wearing-item-link-row"><a class="wearing-item-link wearing-${item}" href="${catalogItemUrl}" target="_blank" rel="noopener noreferrer">${stripTags(wearingInfoDict[item])}</a>
			<a class="wearing-catalog-link" href="${rolimonsItemUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open Rolimons item page" title="Open in Rolimons"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="1em" height="1em" style="vertical-align:-0.125em;transform:rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path class="linkpath" d="M10.586 13.414a1 1 0 0 1-1.414 1.414 5 5 0 0 1 0-7.07l3.535-3.536a5 5 0 0 1 7.071 7.071l-1.485 1.486a7.017 7.017 0 0 0-.405-2.424l.476-.476a3 3 0 1 0-4.243-4.243l-3.535 3.536a3 3 0 0 0 0 4.242zm2.828-4.242a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.07l-3.535 3.536a5 5 0 0 1-7.071-7.07l1.485-1.486c-.008.82.127 1.641.405 2.423l-.476.476a3 3 0 1 0 4.243 4.243l3.535-3.536a3 3 0 0 0 0-4.242 1 1 0 0 1 0-1.414z" fill="currentColor"></path></svg></a></div>
			<div class="wearing-item-cost">
			${buildRobuxIconMarkup("ropro-robux-icon-wearing")}
			<span style="font-size:12px;" class="rbx-text-navbar-right text-header wearing-robux-${item}">${wearingCostDict[item] == null ? "Offsale" : addCommas(parseInt(wearingCostDict[item]))}</span></div>
			</div>
			<div style="display:inline-block;width:50px;height:50px;" class="thumbnail-2d-container wearing-card">
			<a><img itemid="${item}" class="item-card-thumb-container ropro-image-${item}" style="width:100%;height:100%;" src="${chrome.runtime.getURL('/images/empty.png')}">
			</a></div>`
		div.setAttribute("class", "wearing-div")
		wearingContainer.appendChild(div)
		bindSandboxWearingHoverIntent(div)
		itemImage = div.querySelector('img[itemid]')
		function listen(itemImage) {
			if (itemImage == null) {
				return
			}
			itemImage.addEventListener("click", function(){
				itemID = itemImage.getAttribute("itemid")
				removeItem(parseInt(itemID))
			})
		}
		function listenDelete(deleteButton, itemID) {
			if (deleteButton == null) {
				return
			}
			deleteButton.addEventListener("click", function(event){
				if (event != null) {
					event.preventDefault()
					event.stopPropagation()
				}
				removeItem(parseInt(itemID))
			})
		}
		listen(itemImage)
		listenDelete(div.getElementsByClassName('ropro-wearing-delete-button')[0], item)
	}
	setAssetThumbnailBulk(thumbnailIds)
}

var userID;

var SANDBOX_RENDER_BASE_URL = "https://ropro.io";
var SANDBOX_RENDER_PATH_PREFIX = "/render/";

function normalizeSandboxBackground(backgroundValue) {
	var normalized = typeof backgroundValue === "string" ? stripTags(backgroundValue).trim() : ""
	if (normalized.length === 0) {
		return "default"
	}
	return normalized
}

function normalizeSandboxRenderPayload(rawRenderUrl) {
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
	try {
		if (/^https?:\/\//i.test(normalized) || normalized.indexOf(".com/") !== -1) {
			var parsedRenderUrl = new URL(normalized)
			var isRbxcdnHost = parsedRenderUrl.hostname.toLowerCase().indexOf("rbxcdn.com") !== -1
			normalized = isRbxcdnHost
				? parsedRenderUrl.pathname || ""
				: parsedRenderUrl.search || ""
		}
	} catch (e) {}
	var renderPathIndex = normalized.indexOf("/render/")
	if (renderPathIndex !== -1) {
		normalized = normalized.slice(renderPathIndex + "/render/".length)
	}
	if (normalized.indexOf(".com/") !== -1) {
		normalized = normalized.split(".com/")[1] || ""
	}
	if (normalized.charAt(0) === "/") {
		normalized = normalized.slice(1)
	}
	if (normalized.charAt(0) === "?") {
		normalized = normalized.slice(1)
	}
	if (normalized.charAt(0) === "&") {
		normalized = normalized.slice(1)
	}
	return normalized
}

function buildSandboxRenderUrl(rawRenderUrl, backgroundValue) {
	var safeBackground = normalizeSandboxBackground(backgroundValue)
	try {
		if (typeof roproApiAdapter == null || typeof roproApiAdapter.getSafeUpgradeUrl !== "function") {
			return null
		}
		var renderSrc = SANDBOX_RENDER_BASE_URL + SANDBOX_RENDER_PATH_PREFIX
		var normalizedQuery = normalizeSandboxRenderPayload(rawRenderUrl)
		if (normalizedQuery.length > 0) {
			renderSrc += "?" + normalizedQuery
		}
		renderSrc += (normalizedQuery.length > 0 ? "&" : "?") + "background=" + safeBackground
		return roproApiAdapter.getSafeUpgradeUrl(renderSrc)
	} catch (e) {
		return null
	}
}

function resolveSandboxRenderUrl(rawRenderUrl, backgroundValue) {
	var sandboxRenderUrl = buildSandboxRenderUrl(rawRenderUrl, backgroundValue)
	if (sandboxRenderUrl == null) {
		return null
	}
	return sandboxRenderUrl
}

function getIds(wearing) {
	ids = []
	for (var i = 0; i < wearing.length; i++) {
		ids.push(parseInt(wearing[i].id))
	}
	return ids
}

function syncSandboxItemCheckmark(assetId, isSelected) {
	var normalizedAssetId = parseInt(assetId)
	if (!Number.isFinite(normalizedAssetId) || normalizedAssetId <= 0) {
		return
	}
	var checkmarkImages = document.querySelectorAll('thumbnail-2d[id="' + normalizedAssetId + '"] .checkmark-image')
	for (var i = 0; i < checkmarkImages.length; i++) {
		var checkmarkImage = checkmarkImages[i]
		if (checkmarkImage == null || typeof checkmarkImage.classList !== "function") {
			continue
		}
		checkmarkImage.classList[isSelected ? 'add' : 'remove']('active')
		if (!isSelected) {
			checkmarkImage.src = chrome.runtime.getURL('/images/checkmark_end.png')
			continue
		}
		checkmarkImage.src = chrome.runtime.getURL('/images/checkmark.png')
		(function(targetImage) {
			setTimeout(function() {
				if (targetImage == null || typeof targetImage.classList !== "function") {
					return
				}
				if (!targetImage.classList.contains('active')) {
					return
				}
				targetImage.src = chrome.runtime.getURL('/images/checkmark_done.gif')
			}, 400)
		})(checkmarkImage)
	}
}

async function loadCurrentlyWearing() {
	userID = await getStorage("rpUserID")
	var sandboxRenderUrl = buildSandboxRenderUrl("https://ropro.io/render/", background)
	if (sandboxRenderUrl != null) {
		document.getElementById('sandboxView').src = sandboxRenderUrl
	}
	currentlyWearing = await fetchCurrentlyWearing(userID)
	if (currentlyWearing == null || typeof currentlyWearing !== "object") {
		currentlyWearing = {}
	}
	avatarRules = await fetchAvatarRules()
	var bodyColorsPaletteValues = []
	if (avatarRules != null && typeof avatarRules === "object" && Array.isArray(avatarRules.bodyColorsPalette)) {
		bodyColorsPaletteValues = avatarRules.bodyColorsPalette
	}
	for (const [_, value] of Object.entries(bodyColorsPaletteValues)) {
		bodyColorPalette[value['brickColorId']] = value['hexColor']
	}
	var safeAvatarType = currentlyWearing.playerAvatarType === "R6" ? "R6" : "R15"
	playerType = safeAvatarType
	playerAvatarType = {"playerAvatarType": safeAvatarType}
	var safeBodyColors = {}
	if (currentlyWearing.bodyColors != null && typeof currentlyWearing.bodyColors === "object") {
		safeBodyColors = currentlyWearing.bodyColors
	}
	bodyColors = {
		"headColor": bodyColorPalette[safeBodyColors.headColorId],
		"torsoColor": bodyColorPalette[safeBodyColors.torsoColorId],
		"leftArmColor": bodyColorPalette[safeBodyColors.leftArmColorId],
		"rightArmColor": bodyColorPalette[safeBodyColors.rightArmColorId],
		"leftLegColor": bodyColorPalette[safeBodyColors.leftLegColorId],
		"rightLegColor": bodyColorPalette[safeBodyColors.rightLegColorId]
	}
	if (currentlyWearing.scales != null && typeof currentlyWearing.scales === "object") {
		scales = currentlyWearing.scales
	}
	if (safeAvatarType == "R6") {
		document.getElementById('radio-R6').checked = true
	} else {
		document.getElementById('radio-R15').checked = true
	}
	document.getElementById('radio-R6').addEventListener('click', function() {
		document.getElementById('radio-R15').checked = false
		playerType = "R6"
		playerAvatarType = {"playerAvatarType": "R6"}
		loadWearing()
	})
	document.getElementById('radio-R15').addEventListener('click', function() {
		document.getElementById('radio-R6').checked = false
		playerType = "R15"
		playerAvatarType = {"playerAvatarType": "R15"}
		loadWearing()
	})
	document.getElementById('radio-2D').addEventListener('click', function() {
		document.getElementById('fullscreenToggle').style.display = "none"
		document.getElementById('radio-3D').checked = false
		thumbnailConfig = {"thumbnailId": 2, "thumbnailType": "2d", "size": "420x420"}
		loadWearing()
	})
	document.getElementById('radio-3D').addEventListener('click', function() {
		document.getElementById('fullscreenToggle').style.display = "block"
		document.getElementById('radio-2D').checked = false
		thumbnailConfig = {"thumbnailId": 3, "thumbnailType": "3d", "size": "420x420"}
		loadWearing()
	})
	assets = Array.isArray(currentlyWearing.assets) ? currentlyWearing.assets : []
	var pricedAssetCount = 0
	for (i = 0; i < assets.length; i++) {
		asset = assets[i]
		if (asset == null || typeof asset !== "object") {
			continue
		}
		var assetTypeName = ""
		if (asset.assetType != null && typeof asset.assetType === "object" && typeof asset.assetType.name === "string") {
			assetTypeName = asset.assetType.name
		}
		var assetName = typeof asset.name === "string" ? asset.name : ""
		var assetId = parseInt(asset.id)
		if (!Number.isFinite(assetId) || assetId <= 0) {
			continue
		}
		if (!assetTypeName.includes('Animation') || assetName.includes('Idle')) {
			asset.id = assetId
			wearing.push(asset)
			pricedAssetCount += 1
			calculateCost(assetId)
		}
	}
	if (pricedAssetCount === 0) {
		var outfitCostLoadingNode = document.getElementById("outfitCostLoading")
		var outfitCostDivNode = document.getElementById("outfitCostDiv")
		var outfitCostRobuxNode = document.getElementById("outfitCostRobux")
		if (outfitCostRobuxNode != null) {
			outfitCostRobuxNode.textContent = "0"
		}
		if (outfitCostLoadingNode != null) {
			outfitCostLoadingNode.style.display = "none"
		}
		if (outfitCostDivNode != null) {
			outfitCostDivNode.style.display = "inline-block"
		}
	}
	loadWearing()
	if (sandboxOutfitsEnabled) {
		outfits = await fetchOutfits(userID);
		var outfitsJSON;
		try {
			outfitsJSON = JSON.parse(outfits);
		} catch (e) {
			outfitsJSON = outfits;
		}
		if (!Array.isArray(outfitsJSON)) {
			outfitsJSON = []
		}
		for (i = 0; i < outfitsJSON.length; i++) {
			outfit = outfitsJSON[i];
			if (typeof outfit !== "object" || outfit == null) {
				continue
			}
			var itemsArray = []
			if (Array.isArray(outfit.items)) {
				itemsArray = outfit.items
			} else if (typeof outfit.items === "string") {
				var rawItems = stripTags(outfit.items).trim()
				if (rawItems.length > 0) {
					itemsArray = rawItems.split(",")
				}
			}
			var outfitName = typeof outfit.name === "string" ? stripTags(outfit.name) : ""
			var outfitThumbnail = normalizeOutfitThumbnailUrl(outfit.thumbnail)
			var normalizedItems = normalizeOutfitAssets(itemsArray)
			var div = addOutfit(userID, normalizedItems, outfitName, outfitThumbnail);
			if (normalizedItems.length > 0) {
				updateOutfitThumbnail(userID, div, normalizedItems)
			}
		}
	}
}

async function addItem(assetId) {
	if (paidItemsList.getPaidItems().includes(assetId)) {
		var sandboxOutfitsGate = await fetchSandboxVisualGate("sandboxOutfits")
		if (!isSandboxVisualGateAllowed(sandboxOutfitsGate)) {
			showSandboxVisualGateIssue(sandboxOutfitsGate)
			return
		}
	}
	{
		if (activeTab == "Animations") {
			if (currentAnimation != null) {
				removeItem(currentAnimation)
				$('.'+currentAnimation).toggleClass('active')
			}
			currentAnimation = assetId
			if (playerType == "R6") {
				document.getElementById('radio-R6').checked = false
				document.getElementById('radio-R15').checked = true
				switchPlayerType("R15")
				playerType = "R15"
			}
		}
		assetType = -1
		if (parseInt(assetId) in assetTypeDict) {
			assetType = assetTypeDict[parseInt(assetId)]
		}
		if (assetType in layeredClothingOrder) {
			wearing.push({"id": parseInt(assetId), "meta": {"order": layeredClothingOrder[assetType], "version": 1}})
		} else {
			wearing.push({"id": parseInt(assetId)})
		}
		syncSandboxItemCheckmark(assetId, true)
		calculateCost(assetId)
		loadWearing()
	}
}

function addItemBulk(assetIds) {
	for (i = 0; i < assetIds.length; i++) {
		assetId = assetIds[i]
		assetType = -1
		if (parseInt(assetId) in assetTypeDict) {
			assetType = assetTypeDict[parseInt(assetId)]
		}
		if (assetType in layeredClothingOrder) {
			wearing.push({"id": parseInt(assetId), "meta": {"order": layeredClothingOrder[assetType], "version": 1}})
		} else {
			wearing.push({"id": parseInt(assetId)})
		}
		syncSandboxItemCheckmark(assetId, true)
		calculateCost(assetId)
	}
	loadWearing()
}

function removeItem(assetId) {
	index = getIds(wearing).indexOf(parseInt(assetId))
	if (index != -1) {
		syncSandboxItemCheckmark(assetId, false)
		wearing.splice(index, 1)
		delete wearingCostDict[assetId]
		calculateCost(-1)
		loadWearing()
	}
}

function removeItemBulk(assetIds) {
	for (i = 0; i < assetIds.length; i++) {
		assetId = assetIds[i]
		index = getIds(wearing).indexOf(parseInt(assetId))
		if (index != -1) {
			wearing.splice(index, 1)
			syncSandboxItemCheckmark(assetId, false)
			delete wearingCostDict[assetId]
			calculateCost(-1)
		}
	}
	loadWearing()
}

function clearItems() {
	wearing = []
	loadWearing()
}

async function advancedEquip(id) {
	if (parseInt(id).toString() != id) {
		alert("Invalid input. Input must be a numerical item ID.")
		return
	}
	itemDetails = await fetchDetails({"items": [{"id":parseInt(id),"itemType":"Asset"}]})
	if (itemDetails.data.length == 0) {
		alert("Item not found.")
		return
	}
	if (itemDetails.data[0].productId == -1) {
		alert("Invalid item ID.")
		return
	}
	if (getIds(wearing).includes(parseInt(id))) {
		alert("You already have this item equipped.")
		return
	}
	addItem(parseInt(id))
}

async function sandboxMain() {
	sandbox = document.createElement("div")
	sandbox.innerHTML += sandboxHTML
	sandbox.setAttribute("id", "sandbox")
	sandbox.setAttribute("class", "tab-pane resellers-container")
	sandbox.setAttribute("style", "width:1000px;margin:auto;")
	document.getElementsByClassName('content')[0].appendChild(sandbox)
	dismissRobloxSandbox404Overlay()
	stopSandbox404Suppression()
	$(sandbox).find('.background-selector').click(function() {
		$('.background-checkmark-image').attr('src', chrome.runtime.getURL('/images/empty.png'))
		$(this).find('.background-checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark.png'))
		function changeImage(checkmark) {
			setTimeout(function(){
				$(checkmark).find('.background-checkmark-image').attr('src', chrome.runtime.getURL('/images/checkmark_done.gif'))
			}, 400)
		}
		changeImage(this)
		background = this.id
		loadWearing()
	})
	tab1 = createTab("Accessories")
	document.getElementById("Accessories").appendChild(tab1)
	tabs["Accessories"] = tab1
	currentPage = tab1
	tab1.getElementsByClassName('input-dropdown-btn')[0].addEventListener('click', function(){
		dropdown = tab1.getElementsByClassName('dropdown-custom')[0]
		dropdown.classList.toggle("active")
	})
	$('#advancedEquipInput').on('keypress', async function(e) {
		if(e.which == 13) {
			e.preventDefault()
			var value = (this.value || "").trim()
			if (value.length === 0) {
				return
			}
			await advancedEquip(value)
			this.value = ""
		}
	})
	$('#advancedEquipButton').click(async function() {
		var input = document.getElementById('advancedEquipInput')
		if (input == null) {
			return
		}
		var value = (input.value || "").trim()
		if (value.length === 0) {
			return
		}
		await advancedEquip(value)
		input.value = ""
	})
	$('.sandbox-search').on('keypress',function(e) {
		if(e.which == 13) {
			e.preventDefault()
			submitSandboxSearch(this)
		}
	})
	$('.sandbox-search').on('input',function() {
		scheduleSandboxSearchFromInput(this)
	})
	$('.sandbox-search-clear-button').click(function() {
		clearSandboxSearch(this)
	})
	$('.dropdown-custom-item').click(function(){
			sortSelected = this.getElementsByTagName('a')[0].textContent
			this.parentNode.parentNode.getElementsByClassName('rbx-selection-label')[0].textContent = stripTags(sortSelected)
		this.parentNode.classList.toggle("active")
		currentSort = sortSelected
		updatePage("", "", false)
		
		})
		var sandboxOutfitsGate = await fetchSandboxVisualGate("sandboxOutfits")
		sandboxOutfitsEnabled = isSandboxVisualGateAllowed(sandboxOutfitsGate)
		var sandboxOutfitsSettingOff =
			!sandboxOutfitsEnabled &&
			sandboxOutfitsGate != null &&
			typeof sandboxOutfitsGate === "object" &&
			sandboxOutfitsGate.settingEnabled === false
		var myOutfitsSection = document.getElementById('myOutfits')
		var createOutfitButton = document.getElementById('createOutfitButton')
		if (sandboxOutfitsSettingOff) {
			if (myOutfitsSection != null) {
				myOutfitsSection.style.display = "none"
			}
		} else {
			if (myOutfitsSection != null) {
				myOutfitsSection.style.display = ""
			}
			if (createOutfitButton != null) {
				createOutfitButton.classList.toggle('ropro-sandbox-save-button-locked', !sandboxOutfitsEnabled)
				createOutfitButton.setAttribute('aria-disabled', sandboxOutfitsEnabled ? "false" : "true")
			}
		}
		$('#createOutfitButton').click(async function(){
			var gate = await fetchSandboxVisualGate("sandboxOutfits")
			if (isSandboxVisualGateAllowed(gate)) {
				if (this.textContent == "Save") {
				document.getElementById('outfitNameGroup').style.display = "block"
				this.textContent = "Close"
				document.getElementById('outfitSubtitle').style.display = "none"
			} else {
				document.getElementById('outfitNameGroup').style.display = "none"
				this.textContent = "Save"
				document.getElementById('outfitSubtitle').style.display = "block"
			}
		} else if (isSandboxVisualGateUpsellEligible(gate)) {
			upgradeModal()
		} else {
			showSandboxVisualGateIssue(gate)
		}
	})
		$('#outfitNameInput').on('keypress', function(e) {
			if (e.which == 13) {
				submitOutfitCreation()
			}
		})
		$('#submitOutfitButton').click(function() {
			submitOutfitCreation()
		})
	$('.catalog-tab').click(function() {
		$('.catalog-tab').removeClass('active')
		$(this).toggleClass('active')
		tabName = this.getAttribute("data-tab-key") || stripTags(this.innerHTML.split("<span")[0])
		if (tabName in tabs) {
			tabs[tabName].style.display = "block"
			for (i = 0; i < Object.keys(tabs).length; i++) {
				tabCheck = Object.keys(tabs)[i]
				if (tabCheck != tabName) {
					tabs[tabCheck].style.display = "none"
				}
			}
			currentPage = document.getElementById(tabName)
			activeTab = tabName
			currentTab = tabName
			currentSort = Object.keys(sorts[tabName])[0]
		} else {
			tab = createTab(tabName)
			tabDiv = document.getElementById(tabName)
			tabDiv.appendChild(tab)
			tab.style.display = "block"
			tabs[tabName] = tab
			currentPage = tab
			for (i = 0; i < Object.keys(tabs).length; i++) {
				tabCheck = Object.keys(tabs)[i]
				if (tabCheck != tabName) {
					tabs[tabCheck].style.display = "none"
				}
			}
			tab.getElementsByClassName('input-dropdown-btn')[0].addEventListener('click', function(){
				dropdown = this.parentNode.getElementsByClassName('dropdown-custom')[0]
				dropdown.classList.toggle("active")
			})
			$(tabDiv).find('.sandbox-search').on('keypress',function(e) {
				if(e.which == 13) {
					e.preventDefault()
					submitSandboxSearch(this)
				}
			})
			$(tabDiv).find('.sandbox-search').on('input',function() {
				scheduleSandboxSearchFromInput(this)
			})
			$(tabDiv).find('.sandbox-search-clear-button').click(function() {
				clearSandboxSearch(this)
			})
			$(tabDiv).find('.dropdown-custom-item').click(function(){
				sortSelected = this.getElementsByTagName('a')[0].textContent
				this.parentNode.parentNode.getElementsByClassName('rbx-selection-label')[0].textContent = stripTags(sortSelected)
				this.parentNode.classList.toggle("active")
				currentSort = sortSelected
				updatePage("", "", false)
			})
			activeTab = tabName
			currentTab = tabName
			currentSort = Object.keys(sorts[tabName])[0]
			updatePage("", "", false)
		}
	})
	updatePage("", "", false)
	document.getElementById("fullscreenToggle").addEventListener("click", function() {
		sandboxFrame = document.getElementById('sandboxFrame')
		state = sandboxFrame.getAttribute('class')
		if (state == "sandbox-frame") {
			sandboxFrame.setAttribute('class', 'sandbox-frame-full')
			document.getElementById('fullscreenImage').src = chrome.runtime.getURL('/images/fullscreen_1.png')
		} else {
			sandboxFrame.setAttribute('class', 'sandbox-frame')
			document.getElementById('fullscreenImage').src = chrome.runtime.getURL('/images/fullscreen_0.png')
		}
	})
		if (sandboxOutfitsSettingOff) {
			var upgradeCTAEl = document.getElementById("upgradeCTA")
			if (upgradeCTAEl != null) {
				upgradeCTAEl.style.display = "none"
			}
		} else {
			var sandboxCtaGate = await fetchSandboxVisualGate("sandboxOutfits")
			if (isSandboxVisualGateAllowed(sandboxCtaGate)) {
				document.getElementById("upgradeCTA").childNodes[1].textContent = chrome.i18n.getMessage("PleaseConsiderLeavingUsAReview")
				document.getElementById("upgradeCTA").childNodes[3].textContent = chrome.i18n.getMessage("Review")
				document.getElementById("upgradeCTA").childNodes[3].href = "https://ropro.io/install"
			} else if (isSandboxVisualGateUpsellEligible(sandboxCtaGate)) {
				$('.upgradeText').text(chrome.i18n.getMessage("UpgradeToSaveYourOutfits"));
				$('.upgradeButtonText').text(chrome.i18n.getMessage("Upgrade"));
			} else {
				var upgradeCTAEl = document.getElementById("upgradeCTA")
				if (upgradeCTAEl != null) {
					upgradeCTAEl.style.display = "none"
				}
			}
		}
		var sandboxUpgradeButton = document.getElementsByClassName('upgradeButtonText')[0]
			if (sandboxUpgradeButton != null) {
				sandboxUpgradeButton.addEventListener('click', async function(e) {
					var href = this.getAttribute('href')
				if (typeof href === "string" && href.indexOf('/install') !== -1) {
					return
				}
					e.preventDefault()
					var gate = await fetchSandboxVisualGate("sandboxOutfits")
					if (isSandboxVisualGateUpsellEligible(gate)) {
						upgradeModal()
					} else {
						showSandboxVisualGateIssue(gate)
					}
				})
			}
		$('.currentlyWearingText').text(chrome.i18n.getMessage("CurrentlyWearing"));
		$('.clickAnItemText').text(chrome.i18n.getMessage("ClickAnItemToUnequipIt"));
	$('.backgroundText').text(chrome.i18n.getMessage("Background"));
	$('.chooseBackgroundText').text(chrome.i18n.getMessage("ChooseABackgroundBelow"));
	$('.myOutfitsText').text(chrome.i18n.getMessage("MyOutfits"));
	$('.pressEnterKeyText').text(chrome.i18n.getMessage("PressTheEnterKeyToSubmitOutfitName"));
	$('.nameAndSaveText').text(chrome.i18n.getMessage("NameAndSaveYourOutfit"));
	$('.outfitCostText').text(chrome.i18n.getMessage("OutfitCost"));
	merch = await fetchMerch()
	merchJSON = {
		"items": [
		]
	}
	for (k = 0; k < merch.length; k++) {
		merchJSON.items.push(		  {
			"itemType": "Asset",
			"id": merch[k]
		  })
	}
	//itemDetails = await fetchDetails(merchJSON)
	//for (k = 0; k < itemDetails.data.length; k++) {
		//addMerch(itemDetails.data[k].id, itemDetails.data[k].name, itemDetails.data[k].price)
	//}
	document.getElementById('scrollLeft').addEventListener('click', function() {
		if (merchPage > 0) {
			merchPage--
			$('.ropro-merch').css("display", "none")
			for (k = merchPage * merchStep; k < Math.min(merchPage * merchStep + merchStep, merchCount); k++) {
				document.getElementsByClassName('ropro-merch')[k].style.display = "inline-block"
			}
		}
		if (merchPage == 0) {
			this.classList.add('disabled')
		} else {
			this.classList.remove('disabled')
		}
		if (merchPage >= Math.floor(merchCount / merchStep)) {
			document.getElementById('scrollRight').classList.add('disabled')
		} else {
			document.getElementById('scrollRight').classList.remove('disabled')
		}
	})
	document.getElementById('scrollRight').addEventListener('click', function() {
		if (merchPage < Math.floor(merchCount / merchStep)) {
			merchPage++
			$('.ropro-merch').css("display", "none")
			for (k = merchPage * merchStep; k < Math.min(merchPage * merchStep + merchStep, merchCount); k++) {
				document.getElementsByClassName('ropro-merch')[k].style.display = "inline-block"
			}
		}
		if (merchPage >= Math.floor(merchCount / merchStep)) {
			this.classList.add('disabled')
		} else {
			this.classList.remove('disabled')
		}
		if (merchPage == 0) {
			document.getElementById('scrollLeft').classList.add('disabled')
		} else {
			document.getElementById('scrollLeft').classList.remove('disabled')
		}
	})
}

function doMain() {
	setTimeout(async function() {
		try{
			document.getElementsByClassName('content')[0].style.height = "2000px"
			await sandboxMain()
			await loadCurrentlyWearing()
			dismissRobloxSandbox404Overlay()
			document.title = 'RoPro Avatar Sandbox'
		}catch{
			doMain()
		}
	}, 500)
}

startSandbox404Suppression()
doMain()
