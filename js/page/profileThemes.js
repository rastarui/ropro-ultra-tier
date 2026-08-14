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

function getStorage(key) {
	return roproApiAdapter.getStorage(key);
}

function fetchSetting(setting) {
	return roproApiAdapter.getSetting(setting);
}

function normalizeRoProBoolean(value, fallbackValue) {
	if (typeof value == "boolean") {
		return value
	}
	if (typeof value == "string") {
		var normalizedValue = value.trim().toLowerCase()
		if (normalizedValue == "true" || normalizedValue == "1") {
			return true
		}
		if (normalizedValue == "false" || normalizedValue == "0" || normalizedValue.length == 0) {
			return false
		}
	}
	if (typeof value == "number") {
		if (value == 1) {
			return true
		}
		if (value == 0) {
			return false
		}
	}
	return fallbackValue === true
}

function addThemesButton() {
	if (document.getElementById("editThemes") != null) {
		return true
	}

	var editProfileButton = document.getElementById("user-profile-header-EditProfile")
	if (editProfileButton != null && editProfileButton.parentNode != null) {
		var editThemeButton = editProfileButton.cloneNode(true)
		editThemeButton.id = "editThemes"
		editThemeButton.classList.add("profile-themes-button")
		editThemeButton.style.width = "100%"
		editThemeButton.removeAttribute("aria-controls")
		editThemeButton.removeAttribute("aria-expanded")
		editThemeButton.removeAttribute("aria-haspopup")

		var labelNode = editThemeButton.querySelector(".text-truncate-end, .text-no-wrap")
		if (labelNode != null) {
			labelNode.classList.remove("text-truncate-end")
			labelNode.textContent = "Edit Theme"
		}

		if (editThemeButton.tagName == "A") {
			editThemeButton.href = "/themes"
			editThemeButton.removeAttribute("aria-disabled")
		} else {
			editThemeButton.addEventListener("click", function() {
				window.location.assign("/themes")
			})
		}

		editProfileButton.parentNode.insertBefore(editThemeButton, editProfileButton)
		return true
	}

	var detailsAction = document.querySelector(".details-actions.desktop-action")
	if (detailsAction == null) {
		var headerButtons = document.getElementsByClassName("profile-header-buttons")
		if (headerButtons.length == 0) {
			return false
		}
		detailsAction = document.createElement("ul")
		detailsAction.className = "details-actions desktop-action"
		headerButtons[0].insertBefore(detailsAction, headerButtons[0].firstChild || null)
	}

	var listItem = document.createElement("li")
	var link = document.createElement("a")
	link.href = "/themes"
	var button = document.createElement("button")
	button.id = "editThemes"
	button.type = "button"
	button.className = "btn-control-md profile-themes-button"
	button.textContent = "Edit Theme"
	link.appendChild(button)
	listItem.appendChild(link)
	detailsAction.insertBefore(listItem, detailsAction.firstChild || null)
	return true
}

function getIdFromURL(url) {
	var match = String(url || "").match(/\/users\/(\d+)/i)
	if (match == null) {
		return 0
	}
	return parseInt(match[1], 10)
}

function mountThemesButtonWithRetry() {
	if (addThemesButton()) {
		return
	}
	var attempts = 0
	var mountInterval = setInterval(function() {
		attempts++
		if (addThemesButton() || attempts >= 20) {
			clearInterval(mountInterval)
		}
	}, 250)
}

async function themesMain(){
	var myUserID = parseInt(await getStorage("rpUserID"), 10)
	var pageID = getIdFromURL(location.href)
	var profileThemesEnabled = normalizeRoProBoolean(await fetchSetting('profileThemes'), true)
	if (myUserID == pageID && profileThemesEnabled) {
		mountThemesButtonWithRetry()
	}
}

themesMain()
