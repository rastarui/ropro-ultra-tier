var url_matches = [
	"/themes"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
	return roproApiAdapter.buildBrandedLoaderHtml(options)
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this is accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var myTheme = null

var theme = "dark"
if ($('.light-theme').length > 0) {
	var theme = "light"
}

function normalizeThemeForegroundOpacity(rawOpacity) {
	var parsedOpacity = parseFloat(rawOpacity)
	if (isNaN(parsedOpacity) || !isFinite(parsedOpacity)) {
		return 1
	}
	if (parsedOpacity > 1 && parsedOpacity <= 100) {
		parsedOpacity = parsedOpacity / 100
	}
	if (parsedOpacity < 0.3) {
		return 0.3
	}
	if (parsedOpacity > 1) {
		return 1
	}
	return parsedOpacity
}

var profileThemeBoxHTML = `<div class="section-content ropro-themes-page-root">
<div class="content theme-color ropro-theme-header-shell"><div class="ropro-theme-header">
<div class="ropro-theme-header-main"><h1 class="ng-binding ropro-theme-title"><img class="ropro-page-heading-logo" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" alt="" aria-hidden="true"><span>RoPro Themes</span></h1>
<div class="ropro-theme-visibility-row"><div class="ropro-theme-visibility-toggle"><div class="ropro-theme-visibility-option"><button type="button" id="theme-visibility-global" class="ropro-theme-visibility-btn" aria-describedby="theme-visibility-global-tip">Global (not on profile)</button><div id="theme-visibility-global-tip" class="ropro-theme-visibility-tooltip" role="tooltip">Shows everywhere except your profile page.</div></div><div class="ropro-theme-visibility-option"><button type="button" id="theme-visibility-profile" class="ropro-theme-visibility-btn" aria-describedby="theme-visibility-profile-tip">Show on Profile</button><div id="theme-visibility-profile-tip" class="ropro-theme-visibility-tooltip" role="tooltip">Shows only on your profile for you and all other RoPro users.</div></div></div><div id="themeVisibilityValidation" class="ropro-theme-visibility-validation" style="display:none;">You must select at least one visibility option.</div></div></div>
<div class="ropro-theme-action-wrap"><div id="themeActionStatus" class="ropro-theme-action-status ropro-theme-action-status-remove">Click Remove Theme to clear your current theme.</div><button id="saveTheme" type="button" class="btn-fixed-width-lg btn-growth-lg ropro-theme-action-btn ropro-theme-action-btn-remove">${chrome.i18n.getMessage("RemoveTheme")}</button></div>
</div></div><p id="themeResponseText"></p>

<div class="content theme-color" style="width:100%;float:left;margin-top:0px;height:auto;padding:20px;padding-bottom:0px;border-radius:10px;border-bottom-left-radius:0px;border-bottom-right-radius:0px;"><h3 style="margin-bottom:-10px;">Default Themes</h3><h7 id="defaultThemesSubtitle" style="font-size:14px;margin-top:-10px;display:none;"></h7><br><br></div><div class="content theme-color" style="width:100%;height:240px;float:left;padding:0px;padding-bottom:20px;padding-left:0px;border-radius-top:0px;border-bottom-left-radius:10px;border-bottom-right-radius:10px;position:relative;" id="roproThemeContainer">
<div id="themesLeftArrow" class="ropro-theme-arrow" style="position:absolute;top:95px;left:25px;"><img src="${chrome.runtime.getURL('/images/left_arrow.svg')}"></div><div class="ropro-theme-arrow" id="themesRightArrow" style="position:absolute;top:95px;right:25px;"><img src="${chrome.runtime.getURL('/images/right_arrow.svg')}"></div>${buildRoProLoader({ id: "profileThemesLoader", className: "ropro-branded-loader-fill", style: "position:absolute; inset:0; pointer-events:none;" })}<div style="position:relative;width:auto;height:240px;margin:auto;padding:auto;white-space:nowrap;overflow-x:hidden;padding-top:10px;"><div id="profileThemeCardBox" style="position:absolute;left:0px;top:0px;padding-top:10px;"></div></div></div><br>

<div class="content theme-color" style="width:100%;float:left;margin-top:20px;height:auto;padding:20px;padding-bottom:0px;border-radius:10px;border-bottom-left-radius:0px;border-bottom-right-radius:0px;"><h3 style="margin-bottom:-10px;">Animated Themes <img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:20px;margin:0px;margin-right:5px;margin-top:-3px;"></h3><h7 style="font-size:14px;margin-top:-10px;"><b>RoPro Plus and RoPro Rex users.</b> Officially licensed video themes. Toggle between 4K & HD and hover to preview.</h7><li id="video-upgrade-button" style="float:right;background-color:#0084DD;border:none;border-radius:10px;"><a id="videoUpgradeLink" href="https://ropro.io/upgrade?ref=video" target="_blank" class="btn-growth-md btn-secondary-md" style="border:none;color:white;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:25px;margin:-5px;margin-right:5px;margin-top:-7px;">Upgrade to Plus or Rex</a></li><br><br></div><div class="content theme-color" style="width:100%;height:310px;float:left;padding:0px;padding-bottom:20px;padding-left:0px;border-radius-top:0px;border-bottom-left-radius:10px;border-bottom-right-radius:10px;position:relative;" id="roproVideoThemeContainer">
<div id="videoThemesLeftArrow" class="ropro-theme-arrow" style="position:absolute;top:95px;left:25px;"><img src="${chrome.runtime.getURL('/images/left_arrow.svg')}"></div><div class="ropro-theme-arrow" id="videoThemesRightArrow" style="position:absolute;top:95px;right:25px;"><img src="${chrome.runtime.getURL('/images/right_arrow.svg')}"></div>${buildRoProLoader({ id: "videoThemesLoader", className: "ropro-branded-loader-fill", style: "position:absolute; inset:0; pointer-events:none;" })}<div style="position:relative;width:auto;height:310px;margin:auto;padding:auto;white-space:nowrap;overflow-x:hidden;padding-top:10px;"><div id="videoThemeCardBox" style="position:absolute;left:0px;top:0px;padding-top:10px;"></div></div></div><br>

<br><div class="content theme-color" style="width:100%;float:left;margin-top:20px;margin-bottom:20px;padding:20px;border-radius:10px;display:none;"><h3 style="margin-top:5px;margin-bottom:-10px;">Custom Profile Themes<div style="display:inline-block;font-size:10px;vertical-align:top;margin-top:2px;margin-left:3px;"> BETA</div></h3><h7 style="font-size:14px;margin-top:-10px;">Use Roblox decals to create custom profile themes. </h7><p style="font-size:11px;margin-top:5px;">• Scaling, repetition, and background color are fully customizable.<br>• Other RoPro users will see your custom theme when they visit your profile. <br>• Any Roblox decal you use for a theme must be publicly available and not violate the <a href="https://roblox.com/info/terms"><u>Roblox</u></a> or <a href="https://ropro.io/terms/"><u>RoPro</u></a> Terms of Service. <br>• Equipping a Roblox decal which violates the <a href="https://en.help.roblox.com/hc/en-us/articles/203313410-Roblox-Community-Standards"><u>Roblox Community Standards</u></a> will result in a suspension or ban from using RoPro Custom Themes. <br>• You can report profile themes to RoPro moderation by clicking 'Report Profile Theme' next to the Report Abuse button.</p><br>
<div style="position:relative;height:auto;"><div id="customThemeOuter" class="import-decal-outer" style="padding:0px;padding-left:0px;padding-right:0px;width:auto;margin-left:0px;margin-top:-10px;overflow:hidden;">
<div style="margin-top:-10px;margin-bottom:10px;height:240px;min-height:110px;position:relative;" id="customThemeBox">
	<div style="height:200px;width:920px;transform:scale(0.7);float:left;margin-left:-100px;margin-right:-320px;padding-right:-50px;"><div id="decalScrollLeft" style="display:block;transform:scale(0.8);margin-top:-20px;" class="scroller prev disabled" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-left"></span></div></div><div id="decalSearchResults" style="width:900px;height:200px;">${buildRoProLoader({ id: "customThemeLoader", className: "ropro-branded-loader-fill" })}</div><div id="decalScrollRight" style="transform:scale(0.8);margin-top:-20px;left:650px;" class="scroller next disabled" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-right"></span></div></div><input id="decalSearch" style="width:650px;height:auto;" class="form-control input-field" placeholder="Search decal name or directly enter a decal's Roblox ID..." value=""><div style="margin-top:5px;margin-left:5px;"><a target="_blank" href="https://www.roblox.com/develop/library?CatalogContext=2&amp;SortAggregation=5&amp;LegendExpanded=true&amp;Category=8"><b>+ Find More Decal IDs</b></a><a style="margin-left:15px;" target="_blank" href="https://www.roblox.com/develop?View=13"><b>+ Upload Decals</b></a></div></div><div style="height:200px;width:360px;margin-top:20px;;float:right;border-left: 2px solid #656668;padding:20px;"><div style="display:inline-block;float:left;"><div class="item-card-thumb-container">
	<thumbnail-2d class="item-card-thumb "><span style="width:100%; height:100%;" class="thumbnail-2d-container"> <img id="selectedDecal" class="ng-scope ng-isolate-scope" title="" alt="" style="background-color:#656668;" default-src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="></span> </thumbnail-2d>
</div><div id="selectedDecalName" style="font-size:12px;font-weight:bold;text-align:center;width:126px;">Resolution: <br>256 x 256</div></div><div style="float:right;"><div style="font-size:12px;margin-left:5px;">Decal Width (%):
</div><input id="percentFill" placeholder="Width (%)" class="form-control input-field" style="font-size:10px;" type="number" value=10 max="100" min="1"><div style="font-size:12px;margin-left:5px;margin-top:5px;">Background Color:
<br></div>
<input id="colorHex" placeholder="Color Hex (#FFFFF)" class="form-control input-field" style="font-size:10px;"><a target="_blank" href="https://htmlcolorcodes.com"><img style="position:absolute;width:20px;right:-2px;margin-top:-26px;" src="${chrome.runtime.getURL('/images/ultra_icon.png')}"></a>
<div style="margin-left:5px;font-size:12px;margin-top:5px;" class="checkbox">
	<input id="repeatDecal" checked="true" type="checkbox">
	<label for="repeatDecal"> Repeat Decal</label>
</div>
</div>
</div>
</div>
</div>
<li class="rbx-upgrade-now" id="customThemeCTA" style="width:400px;text-align:center;display:none;z-index:10000!important;position:absolute;top:80px;left:calc(50% - 200px);"><span style="font-weight:bold;font-size:18px;margin-right:5px;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:40px;margin-top:-3px;margin-right:5px;">RoPro Plus Feature</span><br><a style="margin-left:0px;width:150px;margin-top:15px;" target="_blank" href="https://ropro.io/?upgrade" class="btn-growth-md btn-secondary-md" id="upgrade-now-button">Upgrade RoPro</a></li>
</div>
</div>
<div class="content theme-color" style="width: 48.5%; float: left; margin-top: 20px; height: auto; margin-bottom: 0px; padding: 20px 20px 10px; border-radius: 10px; padding-bottom: 38px;"><h3 style="margin-bottom:-10px;">Foreground Opacity</h3><div style="height:70px;margin:auto;width:100%;text-align:center;margin-bottom:15px;"><input id="foregroundOpacitySlider" type="range" step="5" min="30" max="100" value="100" style="margin-top:20px;margin-left:10px;margin-right:20px;display:block;width:calc(100% - 140px);display:inline-block;float:left;"><div style="font-weight:500;font-size:20px;background-color:#191B1D;padding:10px;border-radius:10px;display:block;width:100px;margin-top:17px;display:inline-block;float:left;color:white;">100%</div></div>
</div>
<div class="content theme-color" id="backdropBlurSection" style="width: 48.5%; float: left; margin-top: 20px; height: auto; margin-bottom: 0px; padding: 20px 20px 10px; border-radius: 10px; margin-left: 3%;"><h3 style="margin-bottom:-10px;margin-left:3%;">Backdrop Blur</h3><div style="height:70px;margin:auto;width:100%;text-align:center;margin-bottom:15px;"><input id="backdropBlurSlider" type="range" step="1" min="0" max="15" value="0" style="margin-top:20px;margin-left:10px;margin-right:20px;display:block;width:calc(100% - 140px);display:inline-block;float:left;"><div style="font-weight:500;font-size:20px;background-color:#191B1D;padding:10px;border-radius:10px;display:block;width:100px;margin-top:17px;display:inline-block;float:left;color:white;">0 px</div></div><div style="display:inline-block;float:right;"><span class="icon-status-alert" style="transform:scale(0.8);"></span><b style="font-size:13px;"> Blur may cause lag on lower end devices.</b></div>
</div>
<div class="content theme-color" style="width: 100%; float: left; margin-top: 20px; height: auto; margin-bottom: 10px; padding: 20px 20px 10px; border-radius: 10px;" id="hslUpsell"><h3 style="margin-bottom:-10px;">Theme Color Adjustments<div style="display:inline-block;font-size:10px;vertical-align:top;margin-top:2px;margin-left:3px;"></div></h3><h7 style="font-size:14px;margin-top:-10px;">Adjust the hue (color), saturation, and lightness of your theme.</h7><li style="float:right;background-color:#0084DD;border:none;border-radius:10px;margin-top:-10px;"><a id="hslUpgradeLink" href="https://ropro.io/upgrade?ref=hsl" target="_blank" class="btn-growth-md btn-secondary-md" style="border:none;color:white;"><img src="${chrome.runtime.getURL('/images/plus_icon.png')}" style="width:25px;margin:-5px;margin-right:5px;margin-top:-7px;">Upgrade to Plus</a></li>
<br><br></div>
</div>
</div>`

var profileThemeName = null
var colorAdjustments = {h: 0, s: 1, l: 1}
var selectedThemeData = null
var persistedThemeData = null
var storedGlobalThemeData = null
var hasThemeDraftChanges = false
var hasThemeSelectionCleared = false
var hasPersistedOrGlobalTheme = false
var themeVisibilitySelection = {globalThemes: false, profileThemeVisible: true}
var initialThemeVisibilitySelection = {globalThemes: false, profileThemeVisible: true}

function cloneThemeData(themeData) {
	if (themeData == null || typeof themeData != "object") {
		return null
	}
	return JSON.parse(JSON.stringify(themeData))
}

function hasStoredThemePayload(themePayload) {
	return (typeof themePayload == "string" && themePayload.length > 0)
		|| (themePayload != null && typeof themePayload == "object")
}

function hasPersistedTheme(themeData) {
	if (themeData == null || typeof themeData != "object" || !themeData.hasOwnProperty('theme')) {
		return false
	}
	return normalizeThemeData(themeData.theme) != null
}

function setThemeActionState(state) {
	var saveButton = document.getElementById('saveTheme')
	var actionStatus = document.getElementById('themeActionStatus')
	var actionWrap = document.getElementsByClassName('ropro-theme-action-wrap')[0]
	if (saveButton == null || actionStatus == null || actionWrap == null) {
		return
	}
	var isHidden = state == "hidden"
	actionWrap.style.display = isHidden ? "none" : "flex"
	if (isHidden) {
		return
	}
	var saveState = state == "save"
	saveButton.textContent = saveState ? "Save Changes" : chrome.i18n.getMessage("RemoveTheme")
	saveButton.classList.toggle('ropro-theme-action-btn-save', saveState)
	saveButton.classList.toggle('ropro-theme-action-btn-remove', !saveState)
	actionStatus.classList.toggle('ropro-theme-action-status-save', saveState)
	actionStatus.classList.toggle('ropro-theme-action-status-remove', !saveState)
	actionStatus.textContent = saveState ? "Preview only until you click Save Changes." : "Click Remove Theme to clear your current theme."
}

function normalizeThemeVisibilitySelection(selection) {
	return {
		globalThemes: selection != null && selection.globalThemes === true,
		profileThemeVisible: selection == null || selection.profileThemeVisible !== false
	}
}

function hasAnyThemeVisibilityEnabled(selection) {
	var normalized = normalizeThemeVisibilitySelection(selection)
	return normalized.globalThemes || normalized.profileThemeVisible
}

function hasThemeVisibilityValidationTarget() {
	return selectedThemeData != null
}

function setThemeVisibilityValidationState(isInvalid) {
	var visibilityRow = document.getElementsByClassName('ropro-theme-visibility-row')[0]
	var validationElement = document.getElementById('themeVisibilityValidation')
	if (visibilityRow == null || validationElement == null) {
		return
	}
	var showValidation = isInvalid === true
	visibilityRow.classList.toggle('ropro-theme-visibility-row-invalid', showValidation)
	validationElement.style.display = showValidation ? "block" : "none"
	validationElement.innerText = showValidation ? "You must select at least one visibility option." : ""
}

function hasThemeVisibilitySelectionChanges() {
	return themeVisibilitySelection.globalThemes !== initialThemeVisibilitySelection.globalThemes
		|| themeVisibilitySelection.profileThemeVisible !== initialThemeVisibilitySelection.profileThemeVisible
}

function getDefaultThemeActionState() {
	return hasPersistedOrGlobalTheme ? "remove" : "hidden"
}

function syncThemeActionState() {
	if (hasThemeDraftChanges || hasThemeVisibilitySelectionChanges()) {
		setThemeActionState("save")
		return
	}
	setThemeActionState(getDefaultThemeActionState())
}

function markThemeDraftChanges() {
	hasThemeDraftChanges = true
	syncThemeActionState()
}

function setThemeVisibilityMode(selection) {
	var profileVisibilityButton = document.getElementById('theme-visibility-profile')
	var globalVisibilityButton = document.getElementById('theme-visibility-global')
	if (profileVisibilityButton == null || globalVisibilityButton == null) {
		return
	}
	var normalized = normalizeThemeVisibilitySelection(selection)
	profileVisibilityButton.classList.toggle('ropro-theme-visibility-btn-active', normalized.profileThemeVisible)
	globalVisibilityButton.classList.toggle('ropro-theme-visibility-btn-active', normalized.globalThemes)
	profileVisibilityButton.setAttribute('aria-pressed', normalized.profileThemeVisible.toString())
	globalVisibilityButton.setAttribute('aria-pressed', normalized.globalThemes.toString())
	setThemeVisibilityValidationState(!hasAnyThemeVisibilityEnabled(normalized) && hasThemeVisibilityValidationTarget())
}

async function persistThemeVisibilitySelection(selection) {
	var normalized = normalizeThemeVisibilitySelection(selection)
	var settings = await getStorage("rpSettings")
	if (typeof settings != "object" || settings == null) {
		settings = {}
	}
	if (typeof settings.profileThemeVisible == "undefined") {
		settings.profileThemeVisible = true
	}
	settings["globalThemes"] = normalized.globalThemes
	settings["profileThemeVisible"] = normalized.profileThemeVisible
	await setStorage("rpSettings", settings)
	themeVisibilitySelection = normalizeThemeVisibilitySelection(normalized)
	initialThemeVisibilitySelection = normalizeThemeVisibilitySelection(normalized)
	setThemeVisibilityMode(themeVisibilitySelection)
}

function getPersistedThemeObject() {
	if (!hasPersistedTheme(persistedThemeData)) {
		return null
	}
	return normalizeThemeData(persistedThemeData.theme)
}

function getSelectedThemeForStorage() {
	var selectedTheme = cloneThemeData(selectedThemeData)
	if (selectedTheme == null) {
		return null
	}
	if (selectedTheme.hasOwnProperty('version') && selectedTheme['version'] == 2) {
		if (typeof selectedTheme['name'] == "string") {
			var themeName = resolveVideoThemeVariantName(selectedTheme['name'], document.getElementById('video-theme-toggle'))
			selectedTheme['name'] = stripTags(themeName)
		}
		selectedTheme['h'] = parseInt(colorAdjustments['h'])
		selectedTheme['s'] = parseFloat(colorAdjustments['s'])
		selectedTheme['l'] = parseFloat(colorAdjustments['l'])
	}
	return selectedTheme
}

function getThemeForGlobalStorage() {
	var selectedTheme = getSelectedThemeForStorage()
	if (selectedTheme != null) {
		return selectedTheme
	}
	var persistedTheme = getPersistedThemeObject()
	if (persistedTheme != null) {
		return persistedTheme
	}
	if (storedGlobalThemeData != null && typeof storedGlobalThemeData == "object") {
		return cloneThemeData(storedGlobalThemeData)
	}
	return null
}

function parseThemePayload(themePayload) {
	if (!hasStoredThemePayload(themePayload)) {
		return null
	}
	return normalizeThemeData(themePayload)
}

function normalizeThemeData(themePayload) {
	if (themePayload == null) {
		return null
	}
	if (typeof themePayload == "object") {
		var parsedObject = cloneThemeData(themePayload)
		if (parsedObject == null) {
			return null
		}
		if (typeof parsedObject.name == "string") {
			parsedObject.name = stripTags(parsedObject.name).trim()
			if (parsedObject.name.length == 0) {
				return null
			}
			if (!parsedObject.hasOwnProperty('version')) {
				parsedObject.version = 2
			}
			return parsedObject
		}
		if (typeof parsedObject.theme == "string") {
			return normalizeThemeData(parsedObject.theme)
		}
		return null
	}
	if (typeof themePayload != "string") {
		return null
	}
	var trimmedThemePayload = themePayload.trim()
	if (trimmedThemePayload.length == 0) {
		return null
	}
	try {
		var parsedThemePayload = JSON.parse(trimmedThemePayload)
		var normalizedParsedPayload = normalizeThemeData(parsedThemePayload)
		if (normalizedParsedPayload != null) {
			return normalizedParsedPayload
		}
	} catch (_) {}
	var sanitizedThemeName = stripTags(trimmedThemePayload).trim()
	if (sanitizedThemeName.length == 0) {
		return null
	}
	return {
		name: sanitizedThemeName,
		version: 2
	}
}

function normalizeThemeNameForComparison(themeName) {
	if (typeof themeName != "string") {
		return ""
	}
	var normalized = stripTags(themeName).trim().toLowerCase()
	if (normalized.endsWith("_hd.mp4") || normalized.endsWith("_4k.mp4")) {
		normalized = normalized.substring(0, normalized.length - 7)
	} else if (normalized.endsWith(".mp4")) {
		normalized = normalized.substring(0, normalized.length - 4)
	}
	return normalized
}

function getThemeSectionForName(themeName) {
	if (typeof themeName != "string") {
		return "default"
	}
	return themeName.toLowerCase().includes(".mp4") ? "video" : "default"
}

function getCurrentThemePreviewData() {
	if (selectedThemeData != null) {
		return cloneThemeData(selectedThemeData)
	}
	var persistedTheme = getPersistedThemeObject()
	if (persistedTheme != null) {
		return cloneThemeData(persistedTheme)
	}
	if (themeVisibilitySelection.globalThemes === true && storedGlobalThemeData != null && typeof storedGlobalThemeData == "object") {
		return cloneThemeData(storedGlobalThemeData)
	}
	return null
}

function getNormalizedThemeColorAdjustments(themeData) {
	var normalizedAdjustments = {h: 0, s: 1, l: 1}
	if (themeData == null || typeof themeData != "object") {
		return normalizedAdjustments
	}
	var themeHue = parseInt(themeData['h'], 10)
	var themeSaturation = parseFloat(themeData['s'])
	var themeLightness = parseFloat(themeData['l'])
	if (Number.isFinite(themeHue)) {
		normalizedAdjustments.h = themeHue
	}
	if (Number.isFinite(themeSaturation)) {
		normalizedAdjustments.s = themeSaturation
	}
	if (Number.isFinite(themeLightness)) {
		normalizedAdjustments.l = themeLightness
	}
	return normalizedAdjustments
}

function applyThemeColorAdjustmentsFromTheme(themeData) {
	colorAdjustments = getNormalizedThemeColorAdjustments(themeData)
}

function setVideoThemeToggleState(toggleNode, use4k) {
	if (toggleNode == null) {
		return
	}
	toggleNode.setAttribute('class', use4k ? 'ropro-video-toggle btn-toggle on' : 'ropro-video-toggle btn-toggle')
}

function resolveVideoThemeVariantName(themeName, videoThemeToggle) {
	var normalizedThemeName = typeof themeName == "string" ? stripTags(themeName).trim() : ""
	if (normalizedThemeName.length == 0) {
		return ""
	}
	if (!normalizedThemeName.toLowerCase().endsWith('.mp4')) {
		return normalizedThemeName
	}
	var explicit4k = /_4k\.mp4$/i.test(normalizedThemeName)
	var explicitHd = /_hd\.mp4$/i.test(normalizedThemeName)
	var use4k = false
	if (videoThemeToggle != null) {
		if (explicit4k || explicitHd) {
			use4k = explicit4k
			setVideoThemeToggleState(videoThemeToggle, use4k)
		} else {
			use4k = videoThemeToggle.classList.contains('on')
		}
	} else if (explicit4k) {
		use4k = true
	}
	var baseThemeName = normalizedThemeName.replace(/_4k\.mp4$/i, ".mp4").replace(/_hd\.mp4$/i, ".mp4")
	return baseThemeName.replace(/\.mp4$/i, use4k ? "_4K.mp4" : "_HD.mp4")
}

function getCurrentThemeSelectionDescriptor() {
	if (hasThemeSelectionCleared) {
		return null
	}
	var currentTheme = getCurrentThemePreviewData()
	if (currentTheme == null || typeof currentTheme.name != "string") {
		return null
	}
	return {
		section: getThemeSectionForName(currentTheme.name),
		key: normalizeThemeNameForComparison(currentTheme.name)
	}
}

function isThemeCardSelected(section, themeName) {
	var descriptor = getCurrentThemeSelectionDescriptor()
	if (descriptor == null || descriptor.section != section) {
		return false
	}
	return descriptor.key == normalizeThemeNameForComparison(themeName)
}

function refreshThemeCardSelectionUI() {
	var descriptor = getCurrentThemeSelectionDescriptor()
	var cards = document.querySelectorAll('.ropro-theme-card')
	for (var i = 0; i < cards.length; i++) {
		var card = cards[i]
		var section = card.getAttribute('data-theme-kind')
		var key = card.getAttribute('data-theme-key')
		var isSelected = descriptor != null && section == descriptor.section && key == descriptor.key
		card.classList.toggle('ropro-theme-card-selected', isSelected)
		card.setAttribute('aria-pressed', isSelected ? "true" : "false")
		card.title = isSelected ? "Selected. Click again to deselect." : "Click to select this theme."
	}
}

function moveSelectedThemeToFront(themeList, section) {
	if (!Array.isArray(themeList) || themeList.length <= 1) {
		return
	}
	var descriptor = getCurrentThemeSelectionDescriptor()
	if (descriptor == null || descriptor.section != section) {
		return
	}
	var selectedIndex = -1
	for (var i = 0; i < themeList.length; i++) {
		var theme = themeList[i]
		if (theme != null && normalizeThemeNameForComparison(theme.theme) == descriptor.key) {
			selectedIndex = i
			break
		}
	}
	if (selectedIndex > 0) {
		var selectedTheme = themeList.splice(selectedIndex, 1)[0]
		themeList.unshift(selectedTheme)
	}
}

function clearThemeSelectionPreview() {
	selectedThemeData = null
	myTheme = null
	profileThemeName = null
	hasThemeSelectionCleared = true
	removeThemeCardPreviewVideos()
	var mainContainer = document.getElementById('container-main')
	if (mainContainer != null) {
		mainContainer.style.backgroundImage = ""
		mainContainer.style.backgroundColor = ""
		mainContainer.style.backgroundRepeat = ""
		mainContainer.style.backgroundSize = ""
		mainContainer.style.backgroundPosition = ""
	}
	if (document.getElementById('roproThemeFrame') != null) {
		document.getElementById('roproThemeFrame').remove()
	}
	setThemeVisibilityMode(themeVisibilitySelection)
	refreshThemeCardSelectionUI()
	markThemeDraftChanges()
}

function isThemesPath() {
	return /\/themes\/?$/i.test(window.location.pathname)
}

function isRobloxThemes404Overlay(node) {
	if (node == null || node.nodeType !== 1) {
		return false
	}
	if (!isThemesPath()) {
		return false
	}
	var text = (node.textContent || "").toLowerCase()
	return text.includes("404") && text.includes("page not found")
}

var themes404PrehideStyleId = "ropro-themes-404-prehide-style"
var themes404Observer = null

function installThemes404Prehide() {
	if (!isThemesPath()) {
		return
	}
	if (document.getElementById(themes404PrehideStyleId) != null) {
		return
	}
	var prehideStyle = document.createElement("style")
	prehideStyle.id = themes404PrehideStyleId
	prehideStyle.textContent = ".request-error-page-content,.default-error-page{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}"
	var styleHost = document.head || document.documentElement
	if (styleHost != null) {
		styleHost.appendChild(prehideStyle)
	}
}

function removeThemes404Prehide() {
	var prehideStyle = document.getElementById(themes404PrehideStyleId)
	if (prehideStyle != null) {
		prehideStyle.remove()
	}
}

var roproThemeFallbackImage = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
var safeThemeDataImageRegex = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i

function removeElementById(elementId) {
	if (typeof elementId != "string" || elementId.trim().length == 0) {
		return
	}
	var element = document.getElementById(elementId)
	while (element != null) {
		if (element != null && element.parentNode != null) {
			element.parentNode.removeChild(element)
		}
		element = document.getElementById(elementId)
	}
}

function removeThemeLoaders() {
	removeElementById("profileThemesLoader")
	removeElementById("videoThemesLoader")
	removeElementById("customThemeLoader")
}

function removeSectionLoader(sectionLoaderId) {
	removeElementById(sectionLoaderId)
}

function sanitizeThemeImageSource(rawUrl) {
	var normalizedUrl = typeof rawUrl == "string" ? rawUrl.trim() : ""
	if (normalizedUrl.length == 0) {
		return ""
	}
	var strippedUrl = stripTags(normalizedUrl)
	if (safeThemeDataImageRegex.test(strippedUrl)) {
		return strippedUrl
	}
	var base64Value = strippedUrl.replace(/\s+/g, "")
	if (/^[A-Za-z0-9+/=]{24,}$/.test(base64Value)) {
		return "data:image/jpeg;charset=utf-8;base64," + base64Value
	}
	if (typeof roproApiAdapter.getSafeImageUrl == "function") {
		var safeUrl = roproApiAdapter.getSafeImageUrl(strippedUrl)
		return safeUrl == null ? "" : safeUrl
	}
	return ""
}

function sanitizeThemeAssetPathSegment(fileName) {
	var normalized = typeof fileName == "string" ? stripTags(fileName) : ""
	normalized = (normalized == null ? "" : normalized.trim())
	if (normalized.length == 0) {
		return ""
	}
	normalized = normalized.split("?")[0].split("#")[0]
	normalized = normalized.split(/[\\\/]/).pop()
	normalized = normalized.replace(/[\x00-\x1f\x7f]/g, "")
	if (normalized.length == 0) {
		return ""
	}
	if (normalized.length > 255) {
		normalized = normalized.slice(0, 255)
	}
	return encodeURIComponent(normalized.replace(/\.\./g, ""))
}

function toSafeNumber(value, fallback) {
	var parsed = parseFloat(value)
	if (isNaN(parsed)) {
		return fallback
	}
	return parsed
}

function parsePxValue(pxValue) {
	var parsed = parseInt(String(pxValue == null ? "" : pxValue), 10)
	if (isNaN(parsed)) {
		return 0
	}
	return parsed
}

function sanitizeCssBackgroundImage(imageUrl, fallback) {
	var safeUrl = sanitizeThemeImageSource(imageUrl)
	if (safeUrl.length > 0) {
		return "url(" + safeUrl + ")"
	}
	return fallback == null || fallback.length == 0 ? "" : fallback
}

function sanitizeThemePayload(theme) {
	if (theme == null || typeof theme != "object") {
		return null
	}
	var normalizedThemeName = typeof theme['theme'] == "string" ? stripTags(theme['theme']).trim() : ""
	if (normalizedThemeName.length == 0) {
		return null
	}
	var hasThemeFlag = false
	if (theme != null && typeof theme == "object") {
		hasThemeFlag = Object.prototype.hasOwnProperty.call(theme, 'flag')
	}
	return {
		theme: normalizedThemeName,
		thumbnail: typeof theme['thumbnail'] == "string" ? stripTags(theme['thumbnail']).trim() : "",
		flag: hasThemeFlag
	}
}

function sanitizeThemeCdnThumbnailUrl(fileName) {
	var safeFileName = sanitizeThemeAssetPathSegment(fileName)
	if (safeFileName.length == 0) {
		return ""
	}
	var rawUrl = "https://cdn.ropro.io/assets/thumbnails/" + safeFileName
	try {
		var parsedUrl = new URL(rawUrl)
		if (parsedUrl.protocol !== "https:") {
			return ""
		}
		if (parsedUrl.hostname !== "cdn.ropro.io") {
			return ""
		}
		if (parsedUrl.pathname.indexOf("/assets/thumbnails/") !== 0) {
			return ""
		}
		return parsedUrl.href
	} catch(_) {
		return ""
	}
}

function sanitizeCssLengthValue(value, fallback) {
	var normalized = typeof value == "string" ? stripTags(value).trim().toLowerCase() : ""
	if (/^\d+(?:\.\d+)?%(\s+\d+(?:\.\d+)?%)?$/.test(normalized)) {
		return normalized
	}
	if (normalized === "cover" || normalized === "contain") {
		return normalized
	}
	return fallback == null ? "100%" : fallback
}

function sanitizeCssBackgroundRepeatValue(value, fallback) {
	var normalized = typeof value == "string" ? stripTags(value).trim().toLowerCase() : ""
	if (normalized == "repeat" || normalized == "no-repeat" || normalized == "repeat-x" || normalized == "repeat-y" || normalized == "space" || normalized == "round") {
		return normalized
	}
	return fallback == null ? "repeat" : fallback
}

function dismissRobloxThemes404Overlay() {
	var overlayNode = document.querySelector('.request-error-page-content')
	if (overlayNode == null) {
		return
	}
	if (!isRobloxThemes404Overlay(overlayNode)) {
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

function startThemes404Suppression() {
	if (!isThemesPath()) {
		return
	}
	installThemes404Prehide()
	dismissRobloxThemes404Overlay()
	if (themes404Observer != null) {
		return
	}
	themes404Observer = new MutationObserver(function() {
		dismissRobloxThemes404Overlay()
	})
	if (document.documentElement != null) {
		themes404Observer.observe(document.documentElement, {childList: true, subtree: true})
	}
}

function stopThemes404Suppression() {
	if (themes404Observer != null) {
		themes404Observer.disconnect()
		themes404Observer = null
	}
	removeThemes404Prehide()
}

function fetchThemesV2() {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_themes_v2", {},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchVideoThemesV2() {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_video_themes_v2", {},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchTheme(userID) {
	if (!isPositiveInteger(userID)) {
		return Promise.resolve(null)
	}
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_get_profile_theme", {userId: parseInt(userID)},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

async function fetchThemeVisualGate(gateKey) {
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

function isThemeVisualGateAllowed(gateInfo) {
	if (
		typeof roproApiAdapter !== "undefined" &&
		roproApiAdapter != null &&
		typeof roproApiAdapter.isVisualGateAllowed === "function"
	) {
		return roproApiAdapter.isVisualGateAllowed(gateInfo)
	}
	return gateInfo != null && typeof gateInfo == "object" && gateInfo.allowed === true
}

function isThemeVisualGateUpsellEligible(gateInfo) {
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

function updateGlobalTheme() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "UpdateGlobalTheme"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function saveTheme(userID, themeName, version = 1) {
	var safeThemeName = typeof themeName == "string" ? stripTags(themeName).trim() : ""
	var safeUserId = isPositiveInteger(userID) ? parseInt(userID) : null
	var safeVersion = parseInt(version)
	if (safeVersion != 1 && safeVersion != 2) {
		safeVersion = 1
	}
	if (safeUserId == null || safeThemeName.length == 0) {
		return Promise.resolve("ERROR: INVALID THEME")
	}
	var colorAdjusted = colorAdjustments['h'] != 0 || colorAdjustments['s'] != 1 || colorAdjustments['l'] != 1
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_save_profile_theme", {
			userId: safeUserId,
			themeName: safeThemeName,
			version: safeVersion,
			h: colorAdjusted ? parseInt(colorAdjustments['h']) : null,
			s: colorAdjusted ? toSafeNumber(colorAdjustments['s'], null) : null,
			l: colorAdjusted ? toSafeNumber(colorAdjustments['l'], null) : null
		},
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

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

function checkVerification() {
  return roproApiAdapter.checkVerification();
}

function stripTags(s) {
	return roproApiAdapter.stripTags(s);
}

function getSafeThemesUpgradeUrl(rawUrl, fallbackUrl) {
	var safeUrl = null;
	if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeUpgradeUrl === "function") {
		safeUrl = roproApiAdapter.getSafeUpgradeUrl(rawUrl || "");
		if (safeUrl == null && typeof fallbackUrl === "string") {
			safeUrl = roproApiAdapter.getSafeUpgradeUrl(fallbackUrl);
		}
	}
	return safeUrl;
}

function openTrustedUrl(rawUrl, fallbackUrl) {
	var safeUrl = getSafeThemesUpgradeUrl(rawUrl, fallbackUrl);
	if (safeUrl == null) {
		return;
	}
	if (typeof roproApiAdapter.openSafeUrl === "function") {
		roproApiAdapter.openSafeUrl(safeUrl, "_blank", "noopener,noreferrer");
	}
}

function openThemesUpgradeModal(options) {
	var modalOptions = options != null && typeof options == "object" ? options : {}
	var featureLabel = modalOptions.featureLabel != null ? stripTags(String(modalOptions.featureLabel)) : "Animated themes"
	if (featureLabel.trim().length == 0) {
		featureLabel = "Animated themes"
	}
	var subtitleText = modalOptions.subtitleText != null ? stripTags(String(modalOptions.subtitleText)) : ""
	var ctaHref = typeof modalOptions.ctaHref === "string" ? modalOptions.ctaHref : "";
	var safeCtaHref = getSafeThemesUpgradeUrl(ctaHref, "https://ropro.io#plus");
	if (safeCtaHref == null) {
		ctaHref = "https://ropro.io#plus"
	} else {
		ctaHref = safeCtaHref;
	}
	if (window.RoProUpgradeModal == null || typeof window.RoProUpgradeModal.open !== "function") {
		openTrustedUrl(ctaHref, "https://ropro.io#plus")
		return
	}
	var modalConfig = {
		tier: "plus",
		contextLabel: "RoPro Themes",
		featureLabel: featureLabel,
		benefits: [
			"Officially licensed animated profile themes",
			"4K and HD playback options with live preview",
			"Theme color adjustments for your RoPro profile theme",
			"Additional RoPro premium profile customization tools"
		],
		ctaLabel: "Upgrade",
		ctaHref: ctaHref,
		footerText: "Find a full list in RoPro settings."
	}
	if (subtitleText.trim().length > 0) {
		modalConfig.subtitleText = subtitleText
	}
	window.RoProUpgradeModal.open(modalConfig)
}

function bindThemesUpgradeModalCtas() {
	var modalLinkConfigs = [
		{
			id: "videoUpgradeLink",
			featureLabel: "Animated themes",
			subtitleText: "Animated themes are available on RoPro Plus and RoPro Rex.",
			ctaHref: "https://ropro.io/upgrade?ref=video"
		},
		{
			id: "upgrade-now-button",
			featureLabel: "Custom profile themes",
			subtitleText: "Custom profile themes are available on RoPro Plus and RoPro Rex.",
			ctaHref: "https://ropro.io/?upgrade"
		},
		{
			id: "hslUpgradeLink",
			featureLabel: "Theme color adjustments",
			subtitleText: "Theme color adjustments are available on RoPro Plus and RoPro Rex.",
			ctaHref: "https://ropro.io/upgrade?ref=hsl"
		}
	]
	for (var i = 0; i < modalLinkConfigs.length; i++) {
		var linkConfig = modalLinkConfigs[i]
		var link = document.getElementById(linkConfig.id)
		if (link == null || link.getAttribute("ropro-upgrade-bound") == "true") {
			continue
		}
		link.setAttribute("ropro-upgrade-bound", "true")
		link.addEventListener("click", function(event) {
			event.preventDefault()
			var feature = this.getAttribute("ropro-feature-label")
			var subtitle = this.getAttribute("ropro-subtitle-text")
			var href = this.getAttribute("ropro-upgrade-href")
			openThemesUpgradeModal({
				featureLabel: feature,
				subtitleText: subtitle,
				ctaHref: href
			})
		})
		link.setAttribute("ropro-feature-label", linkConfig.featureLabel)
		link.setAttribute("ropro-subtitle-text", linkConfig.subtitleText)
		link.setAttribute("ropro-upgrade-href", linkConfig.ctaHref)
	}
}

function isThemeRemoveSuccessResponse(response) {
	return response == "SUCCESSFULLY_REMOVED" || response == "SUCCESSFULLY REMOVED"
}

async function doThemeResponse(response){
	var responseElement = document.getElementById('themeResponseText')
	if (responseElement == null) {
		return
	}
	response = typeof response == "string" ? response : ""
	responseElement.style.marginBottom = "10px"
	if (response == "ERROR: NOT SUBSCRIBED") {
		responseElement.innerText = "Error: Animated themes are available on RoPro Plus and RoPro Rex."
		var upgradeButton = document.createElement("button")
		upgradeButton.setAttribute("type", "button")
		upgradeButton.setAttribute("class", "btn-primary-md ng-binding")
		upgradeButton.style.display = "inline-block"
		upgradeButton.style.marginLeft = "6px"
		upgradeButton.innerText = "Upgrade"
		upgradeButton.addEventListener("click", function() {
			openThemesUpgradeModal()
		})
		responseElement.appendChild(document.createTextNode(" "))
		responseElement.appendChild(upgradeButton)
	} else if(isThemeRemoveSuccessResponse(response)) {
		responseElement.innerText = 'Changes Saved'
		await setStorage("globalTheme", "")
	} else if(response == "SUCCESS") {
		responseElement.innerText = 'Changes Saved'
		var myId = await getStorage('rpUserID')
		if (typeof myId != "undefined" && await fetchSetting('globalThemes')) {
			var data = await fetchTheme(parseInt(myId))
			if (data.theme != null) {
				var normalizedTheme = parseThemePayload(data.theme)
				if (normalizedTheme != null) {
					await setStorage("globalTheme", JSON.stringify(normalizedTheme))
				} else {
					await setStorage("globalTheme", "")
				}
			}
		}
	} else if(response.startsWith("ERROR_INFO: ")) {
		var responseText = response.replace("ERROR_INFO: ", "")
		responseElement.innerText = stripTags(responseText)
	} else {
		responseElement.innerText = 'Error: Unknown error, please try again later.'
	}
}

async function addThemeBox() {
	var content = document.getElementsByClassName('content')[0]
	content.innerHTML += profileThemeBoxHTML
	bindThemesUpgradeModalCtas()
	hasThemeDraftChanges = false
	hasThemeSelectionCleared = false
	selectedThemeData = null
	persistedThemeData = null
	storedGlobalThemeData = null
	hasPersistedOrGlobalTheme = false
	var userID = await getStorage("rpUserID")
	if (!isPositiveInteger(userID)) {
		userID = await getUserId()
	}
	if (isPositiveInteger(userID)) {
		persistedThemeData = await fetchTheme(parseInt(userID))
	}
	themeVisibilitySelection = normalizeThemeVisibilitySelection({
		globalThemes: await fetchSetting('globalThemes') === true,
		profileThemeVisible: await fetchSetting('profileThemeVisible') !== false
	})
	initialThemeVisibilitySelection = normalizeThemeVisibilitySelection(themeVisibilitySelection)
	setThemeVisibilityMode(themeVisibilitySelection)
	var storedGlobalTheme = await getStorage("globalTheme")
	storedGlobalThemeData = parseThemePayload(storedGlobalTheme)
	hasPersistedOrGlobalTheme = hasPersistedTheme(persistedThemeData)
		|| (themeVisibilitySelection.globalThemes && storedGlobalThemeData != null)
	syncThemeActionState()
	refreshThemeCardSelectionUI()
	var initialPreviewTheme = getCurrentThemePreviewData()
	if (document.getElementById('themeResponseText') != null) {
		document.getElementById('themeResponseText').textContent = ""
	}
	colorAdjustments = {h: 0, s: 1, l: 1}
	var existingThemeFrame = document.getElementById('roproThemeFrame')
	if (existingThemeFrame != null) {
		var frameHue = parseInt(existingThemeFrame.getAttribute('h'), 10)
		var frameSaturation = parseFloat(existingThemeFrame.getAttribute('s'))
		var frameLightness = parseFloat(existingThemeFrame.getAttribute('l'))
		if (Number.isFinite(frameHue)) {
			colorAdjustments['h'] = frameHue
		}
		if (Number.isFinite(frameSaturation)) {
			colorAdjustments['s'] = frameSaturation
		}
		if (Number.isFinite(frameLightness)) {
			colorAdjustments['l'] = frameLightness
		}
	} else if (initialPreviewTheme != null) {
		applyThemeColorAdjustmentsFromTheme(initialPreviewTheme)
	}
	if (existingThemeFrame == null && initialPreviewTheme != null) {
		addTheme(initialPreviewTheme, {markDraft: false, updateSelection: false})
	}
	var animatedThemesGate = await fetchThemeVisualGate("animatedProfileThemes")
	if (isThemeVisualGateAllowed(animatedThemesGate)) {
		document.getElementById('video-upgrade-button').style = "float:right;border:none;border-radius:10px;"
		document.getElementById('video-upgrade-button').innerHTML = `<div style="float:right;margin-left:5px;font-size:20px;margin-top:-7px;margin-right:35px;font-weight:bold;">4K</div><button style="float:right;transform:scale(1.2);margin-right:5px;margin-top:-5px;border-radius:7px;" id="video-theme-toggle" class="ropro-video-toggle btn-toggle">
		<span class="toggle-flip" style="border-radius:7px;"></span>
		<span id="toggle-on" class="toggle-on"></span>
		<span id="toggle-off" class="toggle-off"></span>
		</button><div style="float:right;margin-right:10px;font-size:20px;margin-top:-7px;font-weight:bold;">HD</div><br><p style="float:right;font-size:10px;margin-right:0px;text-align:center;"> 4K will cause lag on some devices,<br>HD video themes are recommended;<br>other users will see your theme in HD</p>`
		var themeFrameNode = document.getElementById('roproThemeFrame')
		var themeFrameSrc = themeFrameNode == null ? "" : themeFrameNode.getAttribute('src')
		setVideoThemeToggleState(document.getElementById('video-theme-toggle'), themeFrameSrc != null && themeFrameSrc.includes('_4K.mp4'))
		$('.ropro-video-toggle').click(function() {
			var currentThemeFrame = document.getElementById('roproThemeFrame')
			var currentThemeFrameSrc = currentThemeFrame == null ? null : currentThemeFrame.getAttribute('src')
			if (currentThemeFrameSrc == null) {
				return
			}
			if (currentThemeFrameSrc.includes('_4K.mp4')) {
				setTimeout(function() {
					setVideoThemeToggleState(document.getElementById('video-theme-toggle'), false)
				}, 100)
				currentThemeFrame.setAttribute('src', currentThemeFrameSrc.replace('_4K.mp4', '_HD.mp4'))
				markThemeDraftChanges()
			} else if (currentThemeFrameSrc.includes('_HD.mp4')) {
				setTimeout(function() {
					setVideoThemeToggleState(document.getElementById('video-theme-toggle'), true)
				}, 100)
				currentThemeFrame.setAttribute('src', currentThemeFrameSrc.replace('_HD.mp4', '_4K.mp4'))
				markThemeDraftChanges()
			}
		})
	} else if (!isThemeVisualGateUpsellEligible(animatedThemesGate)) {
		var videoUpgradeButton = document.getElementById('video-upgrade-button')
		if (videoUpgradeButton != null) {
			videoUpgradeButton.style.display = "none"
		}
	}
	document.getElementById('saveTheme').addEventListener("click", async function(){
			if (!(await checkVerification())) {
				alert("You must verify your user with RoPro at roblox.com/home before updating your theme.")
				return
			}
			var userID = await getStorage("rpUserID")
			if (!this.classList.contains('ropro-theme-action-btn-save')) {
				var removeResponse = await saveTheme(userID, "remove")
				await doThemeResponse(removeResponse)
				document.getElementById('container-main').style.backgroundImage = ""
				document.getElementById('container-main').style.backgroundColor = ""
				if (document.getElementById('roproThemeFrame') != null) {
					document.getElementById('roproThemeFrame').remove()
				}
				await setStorage("globalTheme", "")
				await persistThemeVisibilitySelection({globalThemes: false, profileThemeVisible: false})
				persistedThemeData = {theme: null}
				storedGlobalThemeData = null
				selectedThemeData = null
				hasThemeDraftChanges = false
				hasThemeSelectionCleared = false
				hasPersistedOrGlobalTheme = false
				refreshThemeCardSelectionUI()
				syncThemeActionState()
				return
			}

		document.getElementById('themeResponseText').textContent = ""
		var visibilitySelection = normalizeThemeVisibilitySelection(themeVisibilitySelection)
		if (!hasAnyThemeVisibilityEnabled(visibilitySelection) && hasThemeVisibilityValidationTarget()) {
			setThemeVisibilityValidationState(true)
			return
		}
			var enablingProfileVisibility = visibilitySelection.profileThemeVisible
				&& !initialThemeVisibilitySelection.profileThemeVisible
			var enablingGlobalVisibility = visibilitySelection.globalThemes
				&& !initialThemeVisibilitySelection.globalThemes
			var selectedThemeForStorage = getSelectedThemeForStorage()
			var preSaveThemeForGlobalStorage = getThemeForGlobalStorage()
			var persistedThemeExists = hasPersistedTheme(persistedThemeData)
			var profileOperationPerformed = false
			var response = null
			if (visibilitySelection.globalThemes
				&& !hasThemeSelectionCleared
				&& selectedThemeForStorage == null
				&& preSaveThemeForGlobalStorage == null) {
				var refreshedPersistedThemeData = await fetchTheme(parseInt(userID))
				if (refreshedPersistedThemeData != null && typeof refreshedPersistedThemeData == "object") {
					persistedThemeData = refreshedPersistedThemeData
					persistedThemeExists = hasPersistedTheme(persistedThemeData)
					if (persistedThemeExists) {
						preSaveThemeForGlobalStorage = getThemeForGlobalStorage()
					}
				}
			}

		if (visibilitySelection.profileThemeVisible) {
			if (selectedThemeForStorage != null) {
				var themeName = typeof selectedThemeForStorage['name'] == "string" ? selectedThemeForStorage['name'] : profileThemeName
				if (typeof themeName != "string" || themeName.length == 0) {
					document.getElementById('themeResponseText').innerText = "Select a theme before saving."
					return
				}
				response = await saveTheme(userID, themeName, 2)
				profileOperationPerformed = true
				await doThemeResponse(response)
				if (response != "SUCCESS") {
					return
				}
				persistedThemeData = await fetchTheme(parseInt(userID))
				persistedThemeExists = hasPersistedTheme(persistedThemeData)
			} else if (hasThemeSelectionCleared && persistedThemeExists) {
				response = await saveTheme(userID, "remove")
				profileOperationPerformed = true
				await doThemeResponse(response)
				if (!isThemeRemoveSuccessResponse(response)) {
					return
				}
				persistedThemeData = {theme: null}
				persistedThemeExists = false
			} else if (enablingProfileVisibility && !hasThemeSelectionCleared && !persistedThemeExists) {
				var profileFallbackTheme = preSaveThemeForGlobalStorage
				var fallbackThemeName = profileFallbackTheme != null && typeof profileFallbackTheme.name == "string"
					? stripTags(profileFallbackTheme.name)
					: ""
				if (fallbackThemeName.length > 0) {
					var fallbackThemeVersion = 2
					if (profileFallbackTheme != null && profileFallbackTheme.hasOwnProperty('version')) {
						var parsedFallbackVersion = parseInt(profileFallbackTheme.version)
						fallbackThemeVersion = parsedFallbackVersion == 1 ? 1 : 2
					}
					response = await saveTheme(userID, fallbackThemeName, fallbackThemeVersion)
					profileOperationPerformed = true
					await doThemeResponse(response)
					if (response != "SUCCESS") {
						return
					}
					persistedThemeData = await fetchTheme(parseInt(userID))
					persistedThemeExists = hasPersistedTheme(persistedThemeData)
				}
			}
		} else if (persistedThemeExists) {
			response = await saveTheme(userID, "remove")
			profileOperationPerformed = true
			await doThemeResponse(response)
			if (!isThemeRemoveSuccessResponse(response)) {
				return
			}
			persistedThemeData = {theme: null}
			persistedThemeExists = false
		}

		var themeForGlobalStorage = null
		if (visibilitySelection.globalThemes) {
			if (selectedThemeForStorage != null) {
				themeForGlobalStorage = selectedThemeForStorage
			} else if (!hasThemeSelectionCleared) {
				themeForGlobalStorage = preSaveThemeForGlobalStorage
			}
		}
		if (!visibilitySelection.profileThemeVisible) {
			if (visibilitySelection.globalThemes && themeForGlobalStorage != null) {
				await setStorage("globalTheme", JSON.stringify(themeForGlobalStorage))
				storedGlobalThemeData = cloneThemeData(themeForGlobalStorage)
			} else {
				await setStorage("globalTheme", "")
				storedGlobalThemeData = null
			}
			} else if (visibilitySelection.globalThemes && (profileOperationPerformed || persistedThemeExists || enablingGlobalVisibility)) {
				await updateGlobalTheme()
				var refreshedGlobalThemePayload = await getStorage("globalTheme")
				var refreshedGlobalThemeData = parseThemePayload(refreshedGlobalThemePayload)
				if (refreshedGlobalThemeData != null) {
					await setStorage("globalTheme", JSON.stringify(refreshedGlobalThemeData))
					storedGlobalThemeData = cloneThemeData(refreshedGlobalThemeData)
				} else if (themeForGlobalStorage != null) {
					await setStorage("globalTheme", JSON.stringify(themeForGlobalStorage))
					storedGlobalThemeData = cloneThemeData(themeForGlobalStorage)
				}
			}

		await persistThemeVisibilitySelection(visibilitySelection)
		if (!profileOperationPerformed) {
			document.getElementById('themeResponseText').innerText = "Changes Saved"
		}

		var foregroundOpacityInput = document.getElementById('foregroundOpacitySlider')
		var backdropBlurInput = document.getElementById('backdropBlurSlider')
		var rawOpacity = foregroundOpacityInput == null ? NaN : parseFloat(foregroundOpacityInput.value)
		var normalizedOpacity = normalizeThemeForegroundOpacity(rawOpacity)
		var rawBlur = backdropBlurInput == null ? NaN : parseInt(backdropBlurInput.value)
		if (!isFinite(rawBlur)) {
			rawBlur = 0
		}
		if (rawBlur < 0) {
			rawBlur = 0
		}
		if (rawBlur > 15) {
			rawBlur = 15
		}
		await setStorage("foregroundOpacity", normalizedOpacity)
		await setStorage("backdropBlur", rawBlur)
		await setStorage("colorAdjustments", colorAdjustments)
		hasThemeDraftChanges = false
		hasThemeSelectionCleared = false
		selectedThemeData = null
		var savedGlobalThemePayload = await getStorage("globalTheme")
		var savedGlobalThemeData = parseThemePayload(savedGlobalThemePayload)
		if (savedGlobalThemeData != null) {
			storedGlobalThemeData = savedGlobalThemeData
		} else if (visibilitySelection.globalThemes !== true) {
			storedGlobalThemeData = null
		}
		hasPersistedOrGlobalTheme = hasPersistedTheme(persistedThemeData)
			|| (visibilitySelection.globalThemes && storedGlobalThemeData != null)
		refreshThemeCardSelectionUI()
		syncThemeActionState()
		})
	if (await fetchSetting('themeColorAdjustments')) {
		addColorAdjustments()
	}
	var profileVisibilityButton = document.getElementById('theme-visibility-profile')
	var globalVisibilityButton = document.getElementById('theme-visibility-global')
	if (profileVisibilityButton != null && globalVisibilityButton != null) {
		globalVisibilityButton.addEventListener('click', function() {
			themeVisibilitySelection.globalThemes = !themeVisibilitySelection.globalThemes
			setThemeVisibilityMode(themeVisibilitySelection)
			syncThemeActionState()
		})
		profileVisibilityButton.addEventListener('click', function() {
			themeVisibilitySelection.profileThemeVisible = !themeVisibilitySelection.profileThemeVisible
			setThemeVisibilityMode(themeVisibilitySelection)
			syncThemeActionState()
		})
	}
	document.getElementById('foregroundOpacitySlider').addEventListener('input', function() {
		var opacity = parseInt(this.value) / 100
		setForegroundOpacity(opacity)
		setSliderValueLabel(this, "%", this.value)
		markThemeDraftChanges()
	})
	var foregroundOpacity = await getStorage('foregroundOpacity')
	var normalizedOpacity = normalizeThemeForegroundOpacity(foregroundOpacity)
	var opacityValue = parseInt(normalizedOpacity * 100)
	document.getElementById('foregroundOpacitySlider').value = opacityValue
	setSliderValueLabel(document.getElementById('foregroundOpacitySlider'), "%", opacityValue)
	setForegroundOpacity(normalizedOpacity)
	document.getElementById('backdropBlurSlider').addEventListener('input', function() {
		var pixels = parseInt(this.value)
		setBackdropBlur(pixels)
		setSliderValueLabel(this, " px", pixels)
		markThemeDraftChanges()
	})
	var backdropBlur = await getStorage('backdropBlur')
	if (typeof backdropBlur != 'undefined') {
		var blurValue = parseInt(backdropBlur)
		document.getElementById('backdropBlurSlider').value = blurValue
		setSliderValueLabel(document.getElementById('backdropBlurSlider'), " px", blurValue)
		setBackdropBlur(parseInt(backdropBlur))
	}
}

function addTheme(theme, options) {
	if (theme == null || typeof theme != "object") {
		return
	}
	var normalizedTheme = cloneThemeData(theme)
	if (normalizedTheme == null) {
		return
	}
	var themeName = typeof normalizedTheme['name'] == "string" ? stripTags(normalizedTheme['name']) : ""
	if (themeName.length == 0) {
		return
	}
	var normalizedOptions = options != null && typeof options == "object" ? options : {}
	var shouldUpdateSelection = normalizedOptions.updateSelection !== false
	var shouldMarkDraft = normalizedOptions.markDraft !== false
	if (shouldUpdateSelection) {
		selectedThemeData = cloneThemeData(normalizedTheme)
		hasThemeSelectionCleared = false
	}
	var mainContainer = document.getElementById('container-main')
	if (mainContainer == null) {
		return
	}
	removeThemeCardPreviewVideos()
	var profileContainer = document.getElementsByClassName('content')[0]
	var contentContainer = document.getElementsByClassName('content')[0]

	if (normalizedTheme.hasOwnProperty('version') && normalizedTheme['version'] == 2) {
		myTheme = normalizedTheme
		profileThemeName = themeName
		var cleanedThemeName = themeName
		var isVideoTheme = cleanedThemeName.toLowerCase().endsWith('.mp4')
		var resolvedThemeName = cleanedThemeName
		if (isVideoTheme) {
			resolvedThemeName = resolveVideoThemeVariantName(cleanedThemeName, document.getElementById('video-theme-toggle'))
		}
		var frameOptions = {video: isVideoTheme, hardCache: isVideoTheme}
		var themeHue = parseInt(normalizedTheme['h'], 10)
		var themeSaturation = parseFloat(normalizedTheme['s'])
		var themeLightness = parseFloat(normalizedTheme['l'])
		if (Number.isFinite(themeHue)) {
			frameOptions.h = themeHue
		}
		if (Number.isFinite(themeSaturation)) {
			frameOptions.s = themeSaturation
		}
		if (Number.isFinite(themeLightness)) {
			frameOptions.l = themeLightness
		}
		var frameUrl = roproApiAdapter.buildThemeFrameUrl(resolvedThemeName, frameOptions)
		var safeFrameUrl = typeof roproApiAdapter.getSafeThemeFrameUrl == "function" ? roproApiAdapter.getSafeThemeFrameUrl(frameUrl) : frameUrl
		if (safeFrameUrl == null) {
			return
		}
		if (document.getElementById('roproThemeFrame') == null) {
			var frame = document.createElement("iframe")
			frame.id = "roproThemeFrame"
			frame.setAttribute("frameborder", "0")
			frame.setAttribute("style", "top:0;left:0;position:absolute;border:0;width:100%;height:100%;z-index:-1;")
			frame.src = safeFrameUrl
			mainContainer.appendChild(frame)
		} else {
			document.getElementById('roproThemeFrame').src = safeFrameUrl
		}
		if (profileContainer != null) {
			profileContainer.style.padding = "20px"
			profileContainer.style.paddingTop = "10px"
		}
		mainContainer.style.borderRadius = "20px"
		mainContainer.style.padding = "20px"
		if (document.getElementById('accoutrements-slider') != null) {
			document.getElementById('accoutrements-slider').setAttribute('style', 'width:470px;transform:scale(0.95);margin-left:-7px;')
		}
		if (contentContainer != null) {
			contentContainer.style.borderRadius = "10px"
		}
	} else {
		myTheme = null
		profileThemeName = themeName
		var repeat = sanitizeCssBackgroundRepeatValue(normalizedTheme['repeat'], "repeat")
		var width = sanitizeCssLengthValue(normalizedTheme['width'], "100%")
		var color = isHex(normalizedTheme['color']) ? "#" + String(normalizedTheme['color']).replace("#", "").substring(0, 6) : ""
		var themeImageString = typeof normalizedTheme['images'] == "string" ? normalizedTheme['images'] : ""
		var themeImages = themeImageString.length > 0 ? themeImageString.split(",") : []
		if (profileContainer != null) {
			profileContainer.style.padding = "20px"
			profileContainer.style.paddingTop = "10px"
		}
		if (themeImages.length == 1) {
			mainContainer.style.backgroundImage = sanitizeCssBackgroundImage(themeImages[0], "")
			mainContainer.style.backgroundSize = width
		} else if (themeImages.length > 1) {
			var firstThemeImage = sanitizeThemeImageSource(themeImages[0])
			var secondThemeImage = sanitizeThemeImageSource(themeImages[1])
			mainContainer.style.backgroundImage = sanitizeCssBackgroundImage(firstThemeImage) + ", " + sanitizeCssBackgroundImage(secondThemeImage)
			mainContainer.style.backgroundPosition = "left top, right top"
			if (width == "100% 100%") {
				mainContainer.style.backgroundSize = "50% 100%"
			} else {
				mainContainer.style.backgroundSize = "50%"
			}
			if (repeat == "repeat") {
				repeat = "repeat-y"
			}
		}
		mainContainer.style.backgroundColor = color
		mainContainer.style.backgroundRepeat = repeat
		mainContainer.style.borderRadius = "20px"
		mainContainer.style.padding = "20px"
		if (document.getElementById('accoutrements-slider') != null) {
			document.getElementById('accoutrements-slider').setAttribute('style', 'width:470px;transform:scale(0.95);margin-left:-7px;')
		}
		if (contentContainer != null) {
			contentContainer.style.borderRadius = "10px"
		}
	}
	setThemeVisibilityMode(themeVisibilitySelection)
	refreshThemeCardSelectionUI()
	if (shouldMarkDraft) {
		markThemeDraftChanges()
	} else {
		syncThemeActionState()
	}
}

function isPositiveInteger(n) {
	if (n == null) {
		return false
	}
	var normalized = String(n)
	return /^\d+$/.test(normalized) && parseInt(normalized, 10) > 0
}

function isHex(hex) {
	if (typeof hex != "string") {
		return false
	}
	hex = hex.replace("#", "")
	return typeof hex === 'string'
	&& hex.length === 6
	&& !isNaN(Number('0x' + hex))
}

function detachThemeCardPreviewVideo(previewVideo) {
	if (previewVideo == null) {
		return
	}
	try {
		if (typeof previewVideo.pause == "function") {
			previewVideo.pause()
		}
	} catch (_) {}
	if (previewVideo.parentNode != null) {
		previewVideo.parentNode.removeChild(previewVideo)
	}
}

function removeThemeCardPreviewVideos() {
	var previewVideos = document.querySelectorAll('#videoThemeCardBox video')
	for (var i = 0; i < previewVideos.length; i++) {
		detachThemeCardPreviewVideo(previewVideos[i])
	}
}

function isCurrentDraftThemeName(themeName) {
	if (selectedThemeData == null || typeof selectedThemeData['name'] != "string" || typeof themeName != "string") {
		return false
	}
	var currentDraftThemeName = stripTags(selectedThemeData['name']).trim().toLowerCase()
	var candidateThemeName = stripTags(themeName).trim().toLowerCase()
	if (currentDraftThemeName.length == 0 || candidateThemeName.length == 0) {
		return false
	}
	return currentDraftThemeName == candidateThemeName
}

function shuffle(array) {
	let index = array.length,  rand;
	while (index != 0) {
		rand = Math.floor(Math.random() * index);
		index--;
		[array[index], array[rand]] = [
		array[rand], array[index]];
	}
	return array;
}

function insertAfter(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function isTrustedRoProThemeFrameHost(frameHost) {
	if (typeof frameHost != "string" || frameHost.length == 0) {
		return false
	}
	var normalizedHost = frameHost.toLowerCase()
	return normalizedHost == "ropro.io"
		|| normalizedHost == "www.ropro.io"
		|| normalizedHost == "api.ropro.io"
		|| normalizedHost.indexOf(".ropro.io") > 0
}

function resolveThemeFrameOrigin(frameSrc) {
	if (typeof frameSrc != "string") {
		return null
	}
	var normalizedFrameSrc = frameSrc.trim()
	if (normalizedFrameSrc.length == 0) {
		return null
	}
	if (typeof roproApiAdapter != "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeThemeFrameUrl == "function") {
		var safeFrameSrc = roproApiAdapter.getSafeThemeFrameUrl(normalizedFrameSrc)
		if (safeFrameSrc == null) {
			return null
		}
		normalizedFrameSrc = safeFrameSrc
	}
	try {
		var normalizedFrameUrl = new URL(normalizedFrameSrc, window.location.href)
		if (normalizedFrameUrl.protocol != "https:") {
			return null
		}
		if (!isTrustedRoProThemeFrameHost(normalizedFrameUrl.hostname)) {
			return null
		}
		return normalizedFrameUrl.origin
	} catch (_) {
		return null
	}
}

function doColorAdjustment(colorAdjustments) {
	var themeFrame = document.getElementById('roproThemeFrame')
	if (themeFrame == null || themeFrame.contentWindow == null) {
		return
	}
	var frameSrc = themeFrame.getAttribute('src') || themeFrame.src
	var frameOrigin = resolveThemeFrameOrigin(frameSrc)
	if (frameOrigin == null) {
		return
	}
	var hueValue = parseInt(colorAdjustments == null ? 0 : colorAdjustments.h, 10)
	var saturationValue = parseFloat(colorAdjustments == null ? 1 : colorAdjustments.s)
	var lightnessValue = parseFloat(colorAdjustments == null ? 1 : colorAdjustments.l)
	if (!Number.isFinite(hueValue)) {
		hueValue = 0
	}
	if (!Number.isFinite(saturationValue)) {
		saturationValue = 1
	}
	if (!Number.isFinite(lightnessValue)) {
		lightnessValue = 1
	}
	themeFrame.setAttribute('h', String(hueValue))
	themeFrame.setAttribute('s', String(saturationValue))
	themeFrame.setAttribute('l', String(lightnessValue))
	themeFrame.contentWindow.postMessage({
		'type': 'color-adjustment',
		'h': hueValue,
		's': saturationValue,
		'l': lightnessValue
		}, frameOrigin);
}

function setSliderValueLabel(sliderNode, suffix, value) {
	var normalizedValue = parseInt(value, 10)
	if (!Number.isFinite(normalizedValue) || sliderNode == null || sliderNode.parentNode == null) {
		return
	}
	var labelNode = sliderNode.parentNode.children[1]
	if (labelNode == null) {
		return
	}
	var normalizedSuffix = typeof suffix === "string" ? suffix : ""
	labelNode.innerText = normalizedValue + normalizedSuffix
}

async function addColorAdjustments() {
	document.getElementById('hslUpsell').remove()
	var div = document.createElement('div')
	div.innerHTML = `<div class="content theme-color" style="width: 31.5%; float: left; margin-top: 20px; height: auto; margin-bottom: 0px; padding: 20px 20px 20px; border-radius: 10px;"><h3 style="margin-bottom:-10px;">Rotate Hue</h3><div style="height:70px;margin:auto;width:100%;text-align:center;margin-bottom:15px;"><input id="rotateHueSlider" type="range" step="1" min="0" max="360" value="0" style="margin-top:20px;margin-left:10px;margin-right:20px;display:block;width:calc(100% - 140px);display:inline-block;float:left;"><div style="font-weight:500;font-size:20px;background-color:#191B1D;padding:10px;border-radius:10px;display:block;width:100px;margin-top:17px;display:inline-block;float:left;color:white;">0°</div></div>
	</div>
	
	<div class="content theme-color" style="width: 31.5%; float: left; margin-top: 20px; height: auto; margin-bottom: 0px; padding: 20px 20px 20px; border-radius: 10px; margin-left: 2.5%;"><h3 style="margin-bottom:-10px;">Adjust Saturation</h3><div style="height:70px;margin:auto;width:100%;text-align:center;margin-bottom:15px;"><input id="adjustSaturationSlider" type="range" step="5" min="0" max="200" value="100" style="margin-top:20px;margin-left:10px;margin-right:20px;display:block;width:calc(100% - 140px);display:inline-block;float:left;"><div style="font-weight:500;font-size:20px;background-color:#191B1D;padding:10px;border-radius:10px;display:block;width:100px;margin-top:17px;display:inline-block;float:left;color:white;">100%</div></div>
	</div>
	
	<div class="content theme-color" style="width: 31.5%; float: left; margin-top: 20px; height: auto; margin-bottom: 0px; padding: 20px 20px 20px; border-radius: 10px; margin-left: 2.5%;"><h3 style="margin-bottom:-10px;">Adjust Lightness</h3><div style="height:70px;margin:auto;width:100%;text-align:center;margin-bottom:15px;"><input id="adjustLightnessSlider" type="range" step="5" min="0" max="200" value="100" style="margin-top:20px;margin-left:10px;margin-right:20px;display:block;width:calc(100% - 140px);display:inline-block;float:left;"><div style="font-weight:500;font-size:20px;background-color:#191B1D;padding:10px;border-radius:10px;display:block;width:100px;margin-top:17px;display:inline-block;float:left;color:white;">100%</div></div>
	</div>`
	insertAfter(div, document.getElementById('backdropBlurSection'))
	setSliderValueLabel(document.getElementById('rotateHueSlider'), "°", parseInt(colorAdjustments['h']))
	document.getElementById('rotateHueSlider').value = parseInt(colorAdjustments['h'])
	var saturationNode = document.getElementById('adjustSaturationSlider')
	var lightnessNode = document.getElementById('adjustLightnessSlider')
	var hueValue = parseInt(colorAdjustments['h'], 10)
	var saturationValue = parseInt(parseFloat(colorAdjustments['s']) * 100, 10)
	var lightnessValue = parseInt(parseFloat(colorAdjustments['l']) * 100, 10)
	if (!Number.isFinite(hueValue)) {
		hueValue = 0
	}
	if (!Number.isFinite(saturationValue)) {
		saturationValue = 100
	}
	if (!Number.isFinite(lightnessValue)) {
		lightnessValue = 100
	}
	document.getElementById('rotateHueSlider').value = hueValue
	if (saturationNode != null) {
		saturationNode.value = saturationValue
	}
	if (lightnessNode != null) {
		lightnessNode.value = lightnessValue
	}
	setSliderValueLabel(document.getElementById('rotateHueSlider'), "°", hueValue)
	setSliderValueLabel(saturationNode, "%", saturationValue)
	setSliderValueLabel(lightnessNode, "%", lightnessValue)
	document.getElementById('rotateHueSlider').addEventListener('input', function() {
		setSliderValueLabel(this, "°", this.value)
		colorAdjustments['h'] = parseInt(this.value)
		doColorAdjustment(colorAdjustments)
		markThemeDraftChanges()
	})
	document.getElementById('adjustSaturationSlider').addEventListener('input', function() {
		var saturationValue = parseInt(this.value)
		setSliderValueLabel(this, "%", saturationValue)
		colorAdjustments['s'] = saturationValue / 100
		doColorAdjustment(colorAdjustments)
		markThemeDraftChanges()
	})
	document.getElementById('adjustLightnessSlider').addEventListener('input', function() {
		var lightnessValue = parseInt(this.value)
		setSliderValueLabel(this, "%", lightnessValue)
		colorAdjustments['l'] = lightnessValue / 100
		doColorAdjustment(colorAdjustments)
		markThemeDraftChanges()
	})
}

function resetColorAdjustmentControls() {
	colorAdjustments = {h: 0, s: 1, l: 1}
	if (document.getElementById('rotateHueSlider') != null) {
		document.getElementById('rotateHueSlider').value = 0
		document.getElementById('rotateHueSlider').parentNode.childNodes[1].innerText = '0°'
	}
	if (document.getElementById('adjustSaturationSlider') != null) {
		document.getElementById('adjustSaturationSlider').value = 100
		document.getElementById('adjustSaturationSlider').parentNode.childNodes[1].innerText = '100%'
	}
	if (document.getElementById('adjustLightnessSlider') != null) {
		document.getElementById('adjustLightnessSlider').value = 100
		document.getElementById('adjustLightnessSlider').parentNode.childNodes[1].innerText = '100%'
	}
}

function addThemeCard(theme) {
	var safeTheme = sanitizeThemePayload(theme)
	if (safeTheme == null) {
		return
	}
	var rawThemeName = safeTheme['theme']
	var selectedClass = isThemeCardSelected("default", rawThemeName) ? " ropro-theme-card-selected" : ""
	var themeKey = normalizeThemeNameForComparison(rawThemeName)
	var safeThumbnail = sanitizeThemeImageSource(safeTheme['thumbnail']) || roproThemeFallbackImage
	var div = document.createElement('li')
	div.setAttribute('ropro-theme', rawThemeName)
	div.setAttribute('data-theme-kind', 'default')
	div.setAttribute('data-theme-key', themeKey)
	div.setAttribute('class', 'ropro-theme-element ropro-theme-card' + selectedClass)
	div.style.cssText = "display:inline-block;cursor:pointer;width:150px;height:200px;background-color:#2f3338;border-radius:20px;padding:0px;margin-left:10px;margin-right:10px;"
	var link = document.createElement('a')
	link.style.position = "relative"
	link.style.display = "block"
	link.style.width = "100%"
	link.style.height = "100%"
	var thumbnail = document.createElement('img')
	thumbnail.setAttribute('src', safeThumbnail)
	thumbnail.style.display = "block"
	thumbnail.style.width = "100%"
	thumbnail.style.height = "100%"
	thumbnail.style.borderRadius = "10px"
	thumbnail.style.objectFit = "cover"
	var checkmark = document.createElement('img')
	checkmark.setAttribute('src', chrome.runtime.getURL('/images/empty.png'))
	checkmark.setAttribute('class', 'background-checkmark-image active')
	checkmark.style.pointerEvents = "none"
	checkmark.style.transform = "scale(0.4)"
	checkmark.style.overflow = "visible"
	checkmark.style.width = "164px"
	checkmark.style.height = "126px"
	checkmark.style.position = "absolute"
	checkmark.style.right = "-57px"
	checkmark.style.top = "-52px"
	var selection = document.createElement('div')
	selection.setAttribute('class', 'ropro-theme-card-selection')
	selection.textContent = "selected"
	link.appendChild(thumbnail)
	link.appendChild(checkmark)
	div.appendChild(link)
	div.appendChild(selection)
	var profileThemeCardBox = document.getElementById('profileThemeCardBox')
	if (profileThemeCardBox == null) {
		return
	}
	var card = div
	profileThemeCardBox.appendChild(card)
	var cardTheme = {'name': rawThemeName, 'version': 2}
	$(card).click(function() {
		if (isCurrentDraftThemeName(cardTheme['name'])) {
			clearThemeSelectionPreview()
			return
		}
		addTheme(cardTheme)
		resetColorAdjustmentControls()
	})
}

function addVideoThemeCard(theme) {
	var safeTheme = sanitizeThemePayload(theme)
	if (safeTheme == null) {
		return
	}
	var rawThemeName = safeTheme['theme']
	var selectedClass = isThemeCardSelected("video", rawThemeName + ".mp4") ? " ropro-theme-card-selected" : ""
	var themeKey = normalizeThemeNameForComparison(rawThemeName + ".mp4")
	var safeThumbnail = sanitizeThemeImageSource(safeTheme['thumbnail']) || roproThemeFallbackImage
	var div = document.createElement('li')
	div.setAttribute('ropro-theme', rawThemeName)
	div.setAttribute('data-theme-kind', 'video')
	div.setAttribute('data-theme-key', themeKey)
	div.setAttribute('class', 'ropro-theme-element ropro-theme-card' + selectedClass)
	div.style.cssText = "position:relative;display:inline-block;cursor:pointer;width:150px;height:266.666px;background-color:#2f3338;border-radius:20px;padding:0px;margin-left:10px;margin-right:10px;"
	var thumbnail = document.createElement('img')
	thumbnail.setAttribute('src', safeThumbnail)
	thumbnail.style.display = "block"
	thumbnail.style.width = "100%"
	thumbnail.style.height = "100%"
	thumbnail.style.borderRadius = "10px"
	thumbnail.style.objectFit = "cover"
	var selection = document.createElement('div')
	selection.setAttribute('class', 'ropro-theme-card-selection')
	selection.textContent = "selected"
	div.appendChild(thumbnail)
	div.appendChild(selection)
	var videoThemeCardBox = document.getElementById('videoThemeCardBox')
	if (videoThemeCardBox == null) {
		return
	}
	var card = div
	videoThemeCardBox.appendChild(card)
	var cardTheme = {'name': rawThemeName + ".mp4", 'version': 2}
	$(card).click(async function() {
		var animatedThemesGate = await fetchThemeVisualGate("animatedProfileThemes")
		if (!isThemeVisualGateAllowed(animatedThemesGate)) {
			if (isThemeVisualGateUpsellEligible(animatedThemesGate)) {
				openThemesUpgradeModal({
					featureLabel: "Animated themes",
					subtitleText: "Animated themes are available on RoPro Plus and RoPro Rex.",
					ctaHref: "https://ropro.io/upgrade?ref=videoclick"
				})
			}
			return
		}
		if (isCurrentDraftThemeName(cardTheme['name'])) {
			clearThemeSelectionPreview()
			return
		}
		addTheme(cardTheme)
		resetColorAdjustmentControls()
	})
	$(card).mouseenter(function() {
		if (card.getElementsByTagName('video').length > 0) {
			return
		}
		removeThemeCardPreviewVideos()
		var safePreviewUrl = sanitizeThemeCdnThumbnailUrl(cardTheme['name'])
		if (safePreviewUrl.length == 0) {
			return
		}
		var previewVideo = document.createElement("video")
		previewVideo.setAttribute("src", safePreviewUrl)
		previewVideo.setAttribute("autoplay", "")
		previewVideo.setAttribute("muted", "")
		previewVideo.setAttribute("loop", "")
		previewVideo.setAttribute("playsinline", "")
		previewVideo.setAttribute("preload", "none")
		previewVideo.style.height = "100%"
		previewVideo.style.borderRadius = "10px"
		previewVideo.style.position = "absolute"
		previewVideo.style.top = "0"
		previewVideo.style.left = "0"
		previewVideo.style.pointerEvents = "none"
		card.appendChild(previewVideo)
	})
	$(card).mouseleave(function() {
		var previewVideos = card.getElementsByTagName('video')
		for (var i = previewVideos.length - 1; i >= 0; i--) {
			detachThemeCardPreviewVideo(previewVideos[i])
		}
	})
}
   
async function loadThemesV2() {
	var themeLoaderId = "profileThemesLoader"
	try {
		var themesPayload = await fetchThemesV2()
		var safeThemes = Array.isArray(themesPayload) ? themesPayload : (themesPayload != null && Array.isArray(themesPayload.themes) ? themesPayload.themes : [])
		var normalizedThemes = []
		for (var t = 0; t < safeThemes.length; t++) {
			var normalizedTheme = sanitizeThemePayload(safeThemes[t])
			if (normalizedTheme != null) {
				normalizedThemes.push(normalizedTheme)
			}
		}
		if (document.getElementsByName('user-data').length > 0 && document.getElementsByName('user-data')[0].getAttribute('data-isunder13') == "true") {
			var filteredThemes = []
			for (var i = 0; i < normalizedThemes.length; i++) {
				if (!normalizedThemes[i].hasOwnProperty('flag')) {
					filteredThemes.push(normalizedThemes[i])
				}
			}
			normalizedThemes = filteredThemes
		}
		shuffle(normalizedThemes)
		moveSelectedThemeToFront(normalizedThemes, "default")
		var profileThemeCardBox = document.getElementById('profileThemeCardBox')
		var profileRightArrow = document.getElementById('themesRightArrow')
		var profileLeftArrow = document.getElementById('themesLeftArrow')
		if (profileThemeCardBox == null) {
			return
		}
		profileThemeCardBox.innerHTML = ""
		for(var i = 0; i < normalizedThemes.length; i++) {
			addThemeCard(normalizedThemes[i])
		}
		refreshThemeCardSelectionUI()
		profileThemeCardBox.style.left = "0px"
		var themeWidth = 170;
		var themeContainer = document.getElementById('roproThemeContainer')
		var themeStep = Math.floor(((themeContainer != null ? themeContainer.offsetWidth : 0) - 100) / themeWidth);
		if (themeStep < 1) {
			themeStep = 1
		}
		if (profileThemeCardBox.parentNode != null) {
			profileThemeCardBox.parentNode.style.width = "calc(" + parseInt(themeWidth) + "px * " + themeStep + ")"
		}
		if (profileRightArrow != null) {
			profileRightArrow.onclick = function() {
				if (parsePxValue(profileThemeCardBox.style.left) < -1 * normalizedThemes.length * themeWidth + themeStep * themeWidth * 2) {
					profileThemeCardBox.style.left = "0px"
				} else {
					profileThemeCardBox.style.left = (parsePxValue(profileThemeCardBox.style.left) - themeStep * themeWidth) + "px"
				}
			}
		}
		if (profileLeftArrow != null) {
			profileLeftArrow.onclick = function() {
				if (parsePxValue(profileThemeCardBox.style.left) >= 0) {
					profileThemeCardBox.style.left = (-1 * normalizedThemes.length * themeWidth + themeStep * themeWidth) + "px"
				} else {
					profileThemeCardBox.style.left = (parsePxValue(profileThemeCardBox.style.left) + themeStep * themeWidth) + "px"
				}
			}
		}
	} finally {
		removeSectionLoader(themeLoaderId)
	}
}

async function loadVideoThemesV2() {
	var videoThemeLoaderId = "videoThemesLoader"
	try {
		var themesPayload = await fetchVideoThemesV2()
		var safeThemes = Array.isArray(themesPayload) ? themesPayload : (themesPayload != null && Array.isArray(themesPayload.themes) ? themesPayload.themes : [])
		var normalizedThemes = []
		for (var i = 0; i < safeThemes.length; i++) {
			var normalizedTheme = sanitizeThemePayload(safeThemes[i])
			if (normalizedTheme != null) {
				normalizedThemes.push(normalizedTheme)
			}
		}
		shuffle(normalizedThemes)
		moveSelectedThemeToFront(normalizedThemes, "video")
		var videoThemeCardBox = document.getElementById('videoThemeCardBox')
		var videoRightArrow = document.getElementById('videoThemesRightArrow')
		var videoLeftArrow = document.getElementById('videoThemesLeftArrow')
		if (videoThemeCardBox == null) {
			return
		}
		videoThemeCardBox.innerHTML = ""
		for (var i = 0; i < normalizedThemes.length; i++) {
			addVideoThemeCard(normalizedThemes[i])
		}
		refreshThemeCardSelectionUI()
		videoThemeCardBox.style.left = "0px"
		var themeWidth = 170;
		var videoContainer = document.getElementById('roproVideoThemeContainer')
		var themeStep = Math.floor(((videoContainer != null ? videoContainer.offsetWidth : 0) - 100) / themeWidth);
		if (themeStep < 1) {
			themeStep = 1
		}
		if (videoThemeCardBox.parentNode != null) {
			videoThemeCardBox.parentNode.style.width = "calc(" + parseInt(themeWidth) + "px * " + themeStep + ")"
		}
		if (videoRightArrow != null) {
			videoRightArrow.onclick = function() {
				if (parsePxValue(videoThemeCardBox.style.left) < -1 * normalizedThemes.length * themeWidth + themeStep * themeWidth * 2) {
					videoThemeCardBox.style.left = "0px"
				} else {
					videoThemeCardBox.style.left = (parsePxValue(videoThemeCardBox.style.left) - themeStep * themeWidth) + "px"
				}
			}
		}
		if (videoLeftArrow != null) {
			videoLeftArrow.onclick = function() {
				if (parsePxValue(videoThemeCardBox.style.left) >= 0) {
					videoThemeCardBox.style.left = (-1 * normalizedThemes.length * themeWidth + themeStep * themeWidth) + "px"
				} else {
					videoThemeCardBox.style.left = (parsePxValue(videoThemeCardBox.style.left) + themeStep * themeWidth) + "px"
				}
			}
		}
	} finally {
		removeSectionLoader(videoThemeLoaderId)
	}
}

async function doMain() {
	startThemes404Suppression()
	var containerInterval
	var contentInterval
	contentInterval = setInterval(async function() {
		clearInterval(contentInterval)
		try{
			var contentContainer = document.getElementsByClassName('content')[0]
			if (contentContainer != null) {
				contentContainer.style.height = "initial"
			}
			var shellReady = await ensureThemesUi()
			if (!shellReady) {
				throw new Error("Theme page shell not ready")
			}
			await loadThemesV2()
			await loadVideoThemesV2()
			dismissRobloxThemes404Overlay()
			document.title = 'RoPro Themes'
		}catch{
			setTimeout(function(){ doMain() }, 750)
		} finally {
			if (containerInterval != null) {
				clearInterval(containerInterval)
				containerInterval = null
			}
			stopThemes404Suppression()
			removeThemeLoaders()
		}
	}, 500)
	containerInterval = setInterval(function() {
		if (document.getElementById('container-main') != null) {
			clearInterval(containerInterval)
		}
	}, 100)
}

var themesUiInitialized = false

function isThemesUiReady() {
	return document.getElementById('profileThemeCardBox') != null
		&& document.getElementById('videoThemeCardBox') != null
		&& document.getElementById('roproThemeContainer') != null
}

async function ensureThemesUi() {
	if (themesUiInitialized && isThemesUiReady()) {
		return true
	}
	if (themesUiInitialized && !isThemesUiReady()) {
		themesUiInitialized = false
	}
	var contentNode = document.getElementsByClassName('content')[0]
	if (contentNode == null) {
		return false
	}
	try {
		await addThemeBox()
		themesUiInitialized = isThemesUiReady()
	} catch (_) {}
	return themesUiInitialized
}

doMain()
