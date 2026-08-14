function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
}
 
function shallowEqual(object1, object2) {
	const keys1 = Object.keys(object1);
	const keys2 = Object.keys(object2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (let key of keys1) {
		if (object1[key] !== object2[key]) {
		return false;
		}
	}

	return true;
}

$('.menu .item').tab();

var localFeaturePreviewImages = {
	last_online: "https://ropro.io/feature_previews/last_online_info.png",
	quick_decline: "https://ropro.io/feature_previews/inbound_quick_decline.png",
	quick_cancel: "https://ropro.io/feature_previews/outbound_quick_cancel.png",
	trade_panel: "https://ropro.io/feature_previews/trade_panel.png",
	more_trade_panel: "https://ropro.io/feature_previews/trade_panel.png"
}

function getTitleBasedFeaturePreviewImage(prefix) {
	if (typeof prefix != "string") {
		return null
	}

	var modal = document.getElementsByClassName(prefix + "_modal")[0]
	if (modal == null) {
		return null
	}

	var modalImage = modal.getElementsByTagName('img')[0]
	if (modalImage == null) {
		return null
	}

	var imageTitle = stripTags(modalImage.getAttribute("title") || "")
	if (imageTitle.length === 0 || !/^[a-zA-Z0-9._-]+$/.test(imageTitle)) {
		return null
	}

	return "https://ropro.io/feature_previews/" + imageTitle
}

$('.featurePreview').click(function(){
	var prefix = this.getAttribute("modal")
	var modal = "." + prefix + "_modal"
	var previewSrc = "https://ropro.io/feature_previews/" + stripTags(this.getAttribute("modal")) + ".gif"
	var titleBasedPreviewSrc = getTitleBasedFeaturePreviewImage(prefix)
	if (titleBasedPreviewSrc != null) {
		previewSrc = titleBasedPreviewSrc
	}
	if (Object.prototype.hasOwnProperty.call(localFeaturePreviewImages, prefix)) {
		previewSrc = localFeaturePreviewImages[prefix]
	}
	document.getElementsByClassName(prefix + "_modal")[0].getElementsByTagName('img')[0].setAttribute("src", previewSrc)
	$(modal).modal('show')
})

$('.tradeNotifierSetupGuideButton').click(function(){
	$('.trade_notifier_setup_guide_modal').modal('show')
})

$('.suspectedBotBadgesPreviewButton').click(function(){
	$('.suspected_bot_badges_modal').modal('show')
})

function addModalCloseButtons() {
	const modals = document.querySelectorAll('.ui.inverted.modal')
	for (let i = 0; i < modals.length; i++) {
		const modal = modals[i]
		if (modal.getElementsByClassName('ropro-modal-close').length > 0) {
			continue
		}
		const closeButton = document.createElement('button')
		closeButton.type = 'button'
		closeButton.className = 'ropro-modal-close'
		closeButton.setAttribute('aria-label', 'Close modal')
		closeButton.textContent = 'X'
		closeButton.addEventListener('click', function() {
			$(modal).modal('hide')
		})
		modal.appendChild(closeButton)
	}
}

addModalCloseButtons()

var supportFormLimits = {
	bugDescription: 600,
	bugSteps: 900,
	featureIdea: 600,
	featureReason: 900,
	minContentLength: 6
}

function normalizeSupportFormInput(value, maxLength, options) {
	var normalized = typeof value === "string" ? value : ""
	normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
	normalized = normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
	normalized = normalized.replace(/<[^>]*>/g, "")
	if (options != null && options.multiline === true) {
		normalized = normalized.replace(/[^\S\n]+/g, " ")
		normalized = normalized.replace(/\n{3,}/g, "\n\n")
	} else {
		normalized = normalized.replace(/\s+/g, " ")
	}
	normalized = normalized.trim()
	if (Number.isFinite(maxLength) && maxLength > 0 && normalized.length > maxLength) {
		normalized = normalized.slice(0, maxLength)
	}
	return normalized
}

function updateSupportCounter(inputId, counterId, maxLength) {
	var input = document.getElementById(inputId)
	var counter = document.getElementById(counterId)
	if (input == null || counter == null) {
		return
	}
	if (input.value.length > maxLength) {
		input.value = input.value.slice(0, maxLength)
	}
	counter.textContent = input.value.length + "/" + maxLength
}

function setSupportStatus(statusId, message, type) {
	var status = document.getElementById(statusId)
	if (status == null) {
		return
	}
	status.textContent = typeof message === "string" ? message : ""
	status.classList.remove("ropro-support-status-error")
	status.classList.remove("ropro-support-status-success")
	status.classList.remove("ropro-support-status-info")
	if (type === "error") {
		status.classList.add("ropro-support-status-error")
	} else if (type === "success") {
		status.classList.add("ropro-support-status-success")
	} else if (type === "info") {
		status.classList.add("ropro-support-status-info")
	}
}

function setSupportSubmitState(buttonId, isSubmitting, pendingLabel) {
	var button = document.getElementById(buttonId)
	if (button == null) {
		return
	}
	if (!button.hasAttribute("data-default-label")) {
		button.setAttribute("data-default-label", button.textContent)
	}
	button.disabled = isSubmitting === true
	button.textContent = isSubmitting === true ? pendingLabel : button.getAttribute("data-default-label")
}

function bindSupportCounter(inputId, counterId, maxLength) {
	var input = document.getElementById(inputId)
	if (input == null) {
		return
	}
	input.addEventListener("input", function() {
		updateSupportCounter(inputId, counterId, maxLength)
	})
	updateSupportCounter(inputId, counterId, maxLength)
}

function resetBugReportForm() {
	var description = document.getElementById("bugReportDescription")
	var steps = document.getElementById("bugReportSteps")
	var feature = document.getElementById("bugReportFeature")
	if (description != null) {
		description.value = ""
	}
	if (steps != null) {
		steps.value = ""
	}
	if (feature != null) {
		feature.value = "general"
	}
	updateSupportCounter("bugReportDescription", "bugReportDescriptionCounter", supportFormLimits.bugDescription)
	updateSupportCounter("bugReportSteps", "bugReportStepsCounter", supportFormLimits.bugSteps)
}

function resetFeatureRequestForm() {
	var idea = document.getElementById("featureRequestIdea")
	var reason = document.getElementById("featureRequestReason")
	if (idea != null) {
		idea.value = ""
	}
	if (reason != null) {
		reason.value = ""
	}
	updateSupportCounter("featureRequestIdea", "featureRequestIdeaCounter", supportFormLimits.featureIdea)
	updateSupportCounter("featureRequestReason", "featureRequestReasonCounter", supportFormLimits.featureReason)
}

function initializeSupportFeedbackForms() {
	var bugButton = document.getElementById("bugReportButton")
	var featureButton = document.getElementById("featureRequestButton")
	var bugSubmit = document.getElementById("submitBugReport")
	var featureSubmit = document.getElementById("submitFeatureRequest")
	if (bugButton == null || featureButton == null || bugSubmit == null || featureSubmit == null) {
		return
	}

	bindSupportCounter("bugReportDescription", "bugReportDescriptionCounter", supportFormLimits.bugDescription)
	bindSupportCounter("bugReportSteps", "bugReportStepsCounter", supportFormLimits.bugSteps)
	bindSupportCounter("featureRequestIdea", "featureRequestIdeaCounter", supportFormLimits.featureIdea)
	bindSupportCounter("featureRequestReason", "featureRequestReasonCounter", supportFormLimits.featureReason)

	bugButton.addEventListener("click", function() {
		setSupportStatus("bugReportStatus", "", "")
		$(".bug_report_modal").modal("show")
	})

	featureButton.addEventListener("click", function() {
		setSupportStatus("featureRequestStatus", "", "")
		$(".feature_request_modal").modal("show")
	})

	bugSubmit.addEventListener("click", function() {
		var relatedFeature = document.getElementById("bugReportFeature").value
		var description = normalizeSupportFormInput(
			document.getElementById("bugReportDescription").value,
			supportFormLimits.bugDescription,
			{multiline: true}
		)
		var stepsToReproduce = normalizeSupportFormInput(
			document.getElementById("bugReportSteps").value,
			supportFormLimits.bugSteps,
			{multiline: true}
		)

		if (
			description.length < supportFormLimits.minContentLength ||
			stepsToReproduce.length < supportFormLimits.minContentLength
		) {
			setSupportStatus("bugReportStatus", "Please include what went wrong and how to reproduce it.", "error")
			return
		}

		setSupportSubmitState("submitBugReport", true, "Sending...")
		setSupportStatus("bugReportStatus", "Submitting report...", "info")
		roproApiAdapter.request("ropro_submit_bug_report",
			{
				relatedFeature: relatedFeature,
				description: description,
				stepsToReproduce: stepsToReproduce
			},
			function(data) {
				setSupportSubmitState("submitBugReport", false, "Sending...")
				if (data == "SUCCESS") {
					setSupportStatus("bugReportStatus", "Thanks. Your bug report was sent.", "success")
					resetBugReportForm()
				} else if (data == "ERROR FORMATTING") {
					setSupportStatus("bugReportStatus", "Please check each field and try again.", "error")
				} else if (data == "ERROR AUTH") {
					setSupportStatus("bugReportStatus", "Please reload RoPro and sign in again before submitting.", "error")
				} else if (data == "ERROR STORAGE") {
					setSupportStatus("bugReportStatus", "Bug report storage is not ready yet on this environment.", "error")
				} else if (data == "ERROR RATE LIMIT") {
					setSupportStatus("bugReportStatus", "Please wait a minute before sending another report.", "info")
				} else {
					var errorCode = typeof data === "string" && data.length > 0 ? " (" + data + ")" : ""
					setSupportStatus("bugReportStatus", "Unable to send bug report right now. Please try again later." + errorCode, "error")
				}
			}
		)
	})

	featureSubmit.addEventListener("click", function() {
		var requestedFeature = normalizeSupportFormInput(
			document.getElementById("featureRequestIdea").value,
			supportFormLimits.featureIdea,
			{multiline: true}
		)
		var reason = normalizeSupportFormInput(
			document.getElementById("featureRequestReason").value,
			supportFormLimits.featureReason,
			{multiline: true}
		)

		if (
			requestedFeature.length < supportFormLimits.minContentLength ||
			reason.length < supportFormLimits.minContentLength
		) {
			setSupportStatus("featureRequestStatus", "Please include both the idea and why it helps.", "error")
			return
		}

		setSupportSubmitState("submitFeatureRequest", true, "Sending...")
		setSupportStatus("featureRequestStatus", "Submitting request...", "info")
		roproApiAdapter.request("ropro_submit_feature_request",
			{
				requestedFeature: requestedFeature,
				reason: reason
			},
			function(data) {
				setSupportSubmitState("submitFeatureRequest", false, "Sending...")
				if (data == "SUCCESS") {
					setSupportStatus("featureRequestStatus", "Thanks. Your feature request was sent.", "success")
					resetFeatureRequestForm()
				} else if (data == "ERROR FORMATTING") {
					setSupportStatus("featureRequestStatus", "Please check each field and try again.", "error")
				} else if (data == "ERROR AUTH") {
					setSupportStatus("featureRequestStatus", "Please reload RoPro and sign in again before submitting.", "error")
				} else if (data == "ERROR STORAGE") {
					setSupportStatus("featureRequestStatus", "Feature request storage is not ready yet on this environment.", "error")
				} else if (data == "ERROR RATE LIMIT") {
					setSupportStatus("featureRequestStatus", "Please wait a minute before sending another request.", "info")
				} else {
					var featureErrorCode = typeof data === "string" && data.length > 0 ? " (" + data + ")" : ""
					setSupportStatus("featureRequestStatus", "Unable to send feature request right now. Please try again later." + featureErrorCode, "error")
				}
			}
		)
	})
}

initializeSupportFeedbackForms()

var settings = {}
var doneLoading = false
var hydratingSettings = false
var userTouchedSettings = new Set()
var settingsPersistPromise = Promise.resolve()
var settingsPersistQueued = false

function updateGlobalTheme() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "UpdateGlobalTheme"}, 
			function(data) {
				resolve(data)
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

function fetchSettingValidity(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSettingValidity", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSettingValidityInfo(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSettingValidityInfo", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
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

function fetchFreeTrialTime() {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_free_trial_time", {}, function(data){
			resolve(data);
		})
	})
}

function syncSettings(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "SyncSettings"}, 
			function(data) {
				resolve(data);
			}
		)
	})
}

function setStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: value}, function(){
			resolve()
		})
	})
}

function setLocalStorage(key, value) {
	return new Promise((resolve) => {
	  chrome.storage.local.set({ [key]: value }, function () {
		resolve();
	  });
	});
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

var roproVerificationModalBound = false

function roproVerificationModal() {
	if (!roproVerificationModalBound) {
		roproVerificationModalBound = true
		$('.ropro-verification-modal-ingame-button').on('click', function(){
			$('.ropro-verification-modal-start').hide()
			$('.ropro_verification_modal').css('width', '500px')
			$('.ropro-verification-modal').css('height', '340px')
			$('.ropro-verification-modal-ingame').show()
			window.open('roblox://experiences/start?placeId=16699976687', '_self')
		});
		$('.ropro-code-entry').on('input', handleVerificationInput);
		$('.ropro-code-entry').on('keydown', handleVerificationKeystroke);
	}
	$('.ropro-ingame-verification-message').text('')
	$('.ropro-code-entry').val('')
	$('.ropro_verification_modal').css('width', '350px')
	$('.ropro-verification-modal').css('height', '220px')
	$('.ropro-verification-modal-start').show()
	$('.ropro-verification-modal-ingame').hide()
	$('.ropro_verification_modal').modal('show')
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

function getSubscription(userID) {
	return new Promise(resolve => {
		async function doGet(resolve) {
			roproApiAdapter.request("ropro_get_subscription_with_key", {key: await getStorage("subscriptionKey")}, function(data){
				setLocalStorage('rpSubscription', data)
				resolve(data);
			})
		}
		doGet(resolve)
	})
}

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function markSettingTouched(setting) {
	if (typeof setting !== "string" || setting.length === 0) {
		return
	}
	userTouchedSettings.add(setting)
}

function shouldSkipHydrationForSetting(setting) {
	return userTouchedSettings.has(setting)
}

function persistSettingsFromInteraction(setting) {
	markSettingTouched(setting)
	if (doneLoading && !hydratingSettings) {
		getSettings()
	}
}

function bindSettingsPersistenceListeners() {
	$('.ui.fitted.toggle.checkbox').on('click', function() {
		this.classList.toggle('checked')
		persistSettingsFromInteraction(this.id)
	})
	var immediatePersistSelectIds = ['declineThreshold', 'cancelThreshold']
	for (var i = 0; i < immediatePersistSelectIds.length; i++) {
		var selectElement = document.getElementById(immediatePersistSelectIds[i])
		if (selectElement == null) {
			continue
		}
		selectElement.addEventListener('change', function(e) {
			if (e != null && e.target != null) {
				persistSettingsFromInteraction(e.target.id)
			}
		})
	}
}

bindSettingsPersistenceListeners()

document.getElementById('saveDiscord').addEventListener('click', async function(){
	userID = await getStorage('rpUserID')
	if (await checkVerification()) {
		var discordValue = document.getElementById('discordValue').value
		roproApiAdapter.request("ropro_save_discord", {userId: userID, discord: discordValue}, function(data) {
			if (data == "SUCCESS" && discordValue == "") {
				alert("Cleared your Discord.")
			} else if (data == "SUCCESS") {
				alert("Updated your Discord. To remove your Discord, click save when the input box is empty.")
			} else if (data == "ERROR FORMATTING") {
				alert("Discord username format is invalid. Use your Discord username (2-32 characters, lowercase letters/numbers, '.' or '_', no '#').")
			} else {
				alert("Unable to update your Discord. This feature requires a verified 13+ Roblox account.")
			}
		})
	} else {
		alert("You must verify your user with RoPro at roblox.com/home before updating your Discord.")
	}
})

document.getElementById('activateSubscription').addEventListener('click', async function(){
	var subscriptionKey = prompt("Please enter the subscription key we emailed you with your purchase:")
	if (subscriptionKey != null && subscriptionKey.length > 0) {
		roproApiAdapter.request("ropro_activate_key", {key: subscriptionKey}, function(data){
			if (data == "success") {
				alert("Successfully activated subscription.")
				setTimeout(function(){
					setStorage("subscriptionKey", subscriptionKey);
					location.reload()
				})
			} else if (data == "already_activated") {
				alert("Error: This key has already been linked to another user. If you would like to change the Roblox account associated with your subscription please click the Manage Subscription button.")
			} else if (data == "invalid_key") {
				alert("Error: This key is invalid. Please double check the key or contact support at https://ropro.io/support")
			} else if (data == "expired_key") {
				alert("Error: This subscription has expired.")
			} else if (data == "unknown_error") {
				alert("Error: Unknown error. Please relaunch the extension to resolve this error.")
			} else if (data == "not_logged_in") {
				alert("Error: You are not currently logged in to Roblox. Please log in to allow RoPro to link the subscription key to your Roblox account.")
			}
		})
	}
})

function check(setting) {
	if (document.getElementById(setting) != null) {
		return document.getElementById(setting).classList.contains('checked')
	} else {
		return false
	}
}

function clearSettingValidityNotes(settingElement) {
	if (settingElement == null || settingElement.parentNode == null) {
		return
	}
	var labelNode = settingElement.parentNode.getElementsByTagName('p')[0]
	if (labelNode == null) {
		return
	}
	var notes = labelNode.getElementsByClassName('ropro-setting-validity-note')
	for (var i = notes.length - 1; i >= 0; i--) {
		notes[i].remove()
	}
}

function clearPremiumRequiredSettingToggleBlocker(settingElement) {
	if (settingElement == null) {
		return
	}
	if (typeof settingElement.__roproPremiumRequiredToggleBlocker === "function") {
		settingElement.removeEventListener('click', settingElement.__roproPremiumRequiredToggleBlocker, true)
		delete settingElement.__roproPremiumRequiredToggleBlocker
	}
	settingElement.removeAttribute('data-ropro-premium-toggle-blocked')
}

function bindPremiumRequiredSettingToggleBlocker(settingElement) {
	if (settingElement == null) {
		return
	}
	clearPremiumRequiredSettingToggleBlocker(settingElement)
	var handler = function(e) {
		if (e != null && typeof e.preventDefault === "function") {
			e.preventDefault()
		}
		if (e != null && typeof e.stopPropagation === "function") {
			e.stopPropagation()
		}
		if (e != null && typeof e.stopImmediatePropagation === "function") {
			e.stopImmediatePropagation()
		}
		settingElement.classList.remove("checked")
		var settingInput = settingElement.getElementsByTagName("input")[0]
		if (settingInput != null) {
			settingInput.removeAttribute("checked")
		}
	}
	settingElement.__roproPremiumRequiredToggleBlocker = handler
	settingElement.setAttribute('data-ropro-premium-toggle-blocked', '1')
	settingElement.addEventListener('click', handler, true)
}

function appendSettingValidityNote(settingElement, text) {
	if (settingElement == null || settingElement.parentNode == null || typeof text !== 'string' || text.length === 0) {
		return
	}
	var labelNode = settingElement.parentNode.getElementsByTagName('p')[0]
	if (labelNode == null) {
		return
	}
	var note = document.createElement('div')
	note.className = 'ropro-setting-validity-note'
	note.style.position = 'absolute'
	note.style.fontSize = '8.5px'
	note.style.width = '500px'
	note.style.textAlign = 'left'
	note.style.top = '15px'
	note.style.fontStyle = 'italic'
	note.textContent = text
	labelNode.appendChild(note)
}

function persistSettingsPayload() {
	settingsPersistQueued = true
	settingsPersistPromise = settingsPersistPromise.then(async function() {
		while (settingsPersistQueued) {
			settingsPersistQueued = false
			var latestSettings = await getStorage("rpSettings")
			if (latestSettings == null || typeof latestSettings !== "object") {
				latestSettings = {}
			}
			var mergedSettings = Object.assign({}, latestSettings, settings)
			await setStorage("rpSettings", mergedSettings)
		}
	}).catch(function(error) {
		console.error("Failed to persist options settings:", error)
	})
}

function getSettings() {
	newSettings = {
		"sandbox": check("sandbox"),
		"profileThemes": typeof settings['profileThemes'] == "boolean" ? settings['profileThemes'] : true,
		"globalThemes": typeof settings['globalThemes'] == "boolean" ? settings['globalThemes'] : true,
		"profileThemeVisible": typeof settings['profileThemeVisible'] == "boolean" ? settings['profileThemeVisible'] : true,
		"lastOnlinePrivacy": check("lastOnlinePrivacy"),
		"genreFilters": check("genreFilters"),
		"randomGame": check("randomGame"),
		"popularToday": check("popularToday"),
		"reputation": check("reputation"),
		"linkedDiscord": check("linkedDiscord"),
		"profileValue": check("profileValue"),
		"tradeOffersPage": check("tradeOffersPage"),
		"tradeOffersPost": check("tradeOffersPost"),
		"tradeOffersWishlist": check("tradeOffersWishlist"),
		"itemInfoCard": check("itemInfoCard"),
		"mostRecentServer": check("mostRecentServer"),
		"tradeAge": check("tradeAge"),
		"projectedWarningItemPage": check("projectedWarningItemPage"),
		"quickTradeResellers": check("quickTradeResellers"),
		"hideSerials": check("hideSerials"),
		"groupRank": check("groupRank"),
		"groupDiscord": check("groupDiscord"),
		"featuredToys": check("featuredToys"),
		"moreGameFilters": check("moreGameFilters"),
		"moreServerFilters": check("moreServerFilters"),
		"additionalServerInfo": check("additionalServerInfo"),
		"gameLikeRatioFilter": check("gameLikeRatioFilter"),
		"liveLikeDislikeFavoriteCounters": check("liveLikeDislikeFavoriteCounters"),
		"sandboxOutfits": check("sandboxOutfits"),
		"moreTradePanel": check("moreTradePanel"),
		"tradeValueCalculator": check("tradeValueCalculator"),
		"tradeDemandRatingCalculator": check("tradeDemandRatingCalculator"),
		"tradeItemValue": check("tradeItemValue"),
		"tradeItemDemand": check("tradeItemDemand"),
		"itemPageValueDemand": check("itemPageValueDemand"),
		"tradePageProjectedWarning": check("tradePageProjectedWarning"),
		"embeddedRolimonsItemLink": check("embeddedRolimonsItemLink"),
		"embeddedRolimonsUserLink": check("embeddedRolimonsUserLink"),
		"tradeOffersValueCalculator": check("tradeOffersValueCalculator"),
		"tradeProtection": check("tradeProtection"),
		"liveVisits": check("liveVisits"),
		"livePlayers": check("livePlayers"),
		"tradePreviews": check("tradePreviews"),
		"quickItemSearch": check("quickItemSearch"),
		"tradeNotifier": check("tradeNotifier"),
		"autoDecline": check("autoDecline"),
		"declineThreshold": parseInt(document.getElementById('declineThreshold').value),
		"cancelThreshold": parseInt(document.getElementById('cancelThreshold').value),
		"roproIcon": check("roproIcon"),
			"hideDeclinedNotifications": check("hideDeclinedNotifications"),
			"hideOutboundNotifications": check("hideOutboundNotifications"),
			"quickDecline": check("quickDecline"),
			"quickCancel": check("quickCancel"),
			"hideTradeBots": check("hideTradeBots"),
			"autoDeclineTradeBots": check("autoDeclineTradeBots"),
			"suspectedBotBadges": check("suspectedBotBadges"),
			"tradePanel": check("tradePanel"),
			"underOverRAP": check("underOverRAP"),
			"winLossDisplay": check("winLossDisplay"),
		"mostPlayedGames": check("mostPlayedGames"),
		"allExperiences": check("allExperiences"),
		"roproShuffle": check("roproShuffle"),
		"avatarEditorChanges": check("avatarEditorChanges"),
		"playtimeTracking": check("playtimeTracking"),
		"activeServerCount": check("activeServerCount"),
		"morePlaytimeSorts": check("morePlaytimeSorts"),
		"roproBadge": check("roproBadge"),
		"mutualFriends": check("mutualFriends"),
		"moreMutuals": check("moreMutuals"),
		"serverInviteLinks": check("serverInviteLinks"),
		"serverFilters": check("serverFilters"),
		"randomServer": check("randomServer"),
		"experienceQuickSearch": check("experienceQuickSearch"),
		"experienceQuickPlay": check("experienceQuickPlay"),
		"animatedProfileThemes": check("animatedProfileThemes"),
		"roproVoiceServers": check("roproVoiceServers"),
		"premiumVoiceServers": check("premiumVoiceServers"),
		"cloudPlay": check("cloudPlay"),
		"hidePrivateServers": check("hidePrivateServers"),
		"roproWishlist": check("roproWishlist"),
		"themeColorAdjustments": check("themeColorAdjustments"),
		"tradeSearch": check("tradeSearch"),
		"advancedTradeSearch": check("advancedTradeSearch")
	}
	changed = typeof settings == 'undefined' || !shallowEqual(settings, newSettings)
	if (changed) {
		console.log(newSettings)
		oldSettings = settings
		settings = newSettings
		persistSettingsPayload()
		var oldLastOnlinePrivacy = oldSettings != null ? oldSettings['lastOnlinePrivacy'] : undefined
		var oldGlobalThemes = oldSettings != null ? oldSettings['globalThemes'] : undefined
		if (oldLastOnlinePrivacy != newSettings['lastOnlinePrivacy']) {
			chrome.runtime.sendMessage({greeting: "SyncLastOnlinePresence"}, function() {})
		}
		if (newSettings['globalThemes'] == true && oldGlobalThemes != newSettings['globalThemes']) {
			console.log("Updating global theme.")
			updateGlobalTheme()
		}
	}
}
async function main() {
	restrict = await getStorage("restrictSettings")
	if (restrict == true) {
		document.getElementById('discordButton').style.display = "none";
		document.getElementById('supportButton').style.width = "204px";
		document.getElementById('discordInput').classList.add("disabled");
		restrictedElements = document.getElementsByClassName("restricted")
		for (i = 0; i < restrictedElements.length; i++) {
			restrictedElement = restrictedElements[i]
			restrictedElement.style.display = "none";
		}
	}
	if (!(await checkVerification())) {
		roproVerificationModal()
	}
	await syncSettings()
	settings = await getStorage("rpSettings")
	if (settings == null || typeof settings !== "object") {
		settings = {}
	}
	hydratingSettings = true
	for(let setting of Object.keys(settings)) {
		settingElement = document.getElementById(setting)
		if (settingElement != null) {
			if (settingElement.tagName == "DIV") {
				var validity = await fetchSettingValidityInfo(setting)
				clearSettingValidityNotes(settingElement)
				clearPremiumRequiredSettingToggleBlocker(settingElement)
				settingElement.removeAttribute("title")
				if (validity[0]) {
					settingElement.classList.remove("disabled")
					settingElement.style.pointerEvents = ""
					if (!shouldSkipHydrationForSetting(setting)) {
						var toggleSettingValue = await fetchSetting(setting)
						if (toggleSettingValue) {
							if (!settingElement.classList.contains("checked")) {
								settingElement.classList.add("checked")
							}
							if (!settingElement.getElementsByTagName('input')[0].hasAttribute('checked')) {
								settingElement.getElementsByTagName('input')[0].setAttribute('checked', true)
							}
						} else {
							if (settingElement.classList.contains("checked")) {
								settingElement.classList.remove("checked")
							}
							if (settingElement.getElementsByTagName('input')[0].hasAttribute('checked')) {
								settingElement.getElementsByTagName('input')[0].removeAttribute('checked')
							}
						}
					}
					} else {
						settingElement.classList.add("disabled")
						settingElement.style.pointerEvents = "none"
						if (settingElement.classList.contains("checked")) {
							settingElement.classList.remove("checked")
						}
						settingElement.getElementsByTagName("input")[0].removeAttribute("checked")
						if (validity[1]) {
							appendSettingValidityNote(settingElement, 'Feature currently disabled for maintenance.')
						} else if (validity.length > 2 && validity[2] === "roblox_premium_required") {
							settingElement.style.pointerEvents = "auto"
							settingElement.setAttribute("title", "You can only use this setting if your Roblox account has Premium.")
							bindPremiumRequiredSettingToggleBlocker(settingElement)
					}
					}
			} else if (settingElement.tagName == "SELECT") {
				if (!shouldSkipHydrationForSetting(setting)) {
					settingElement.value = await fetchSetting(setting)
				}
				if (!await fetchSettingValidity(setting)) {
					settingElement.classList.add("disabled")
					settingElement.style.pointerEvents = "none"
				}
			} else {
				if (!shouldSkipHydrationForSetting(setting)) {
					var numericSettingValue = await fetchSetting(setting)
					if (numericSettingValue > 0) {
						settingElement.value = numericSettingValue
					}
				}
				if (!await fetchSettingValidity(setting)) {
					settingElement.parentNode.classList.add("disabled")
					settingElement.style.pointerEvents = "none"
				}
			}
		}
	}
	hydratingSettings = false
	doneLoading = true
	if (userTouchedSettings.size > 0) {
		getSettings()
	}
	userID = await getStorage("rpUserID")
	username = await getStorage("rpUsername")
	subscription = await getSubscription(userID)
	if (subscription == "free_tier" || subscription == "free" || subscription == "") {
		document.getElementById("subscriptionIcon").src = "./images/ultra_icon.png"
		document.getElementById("subscriptionTier").textContent = "RoPro Ultra"
		document.getElementById("standardTierUpgrade").style.display = "block";
		document.getElementById("proTierUpgrade").style.display = "block";
	} else if (subscription == "standard_tier" || subscription == "plus") {
		document.getElementById("subscriptionIcon").src = "./images/plus_icon.png"
		document.getElementById("subscriptionTier").textContent = "RoPro Plus"
		document.getElementById("proTierUpgrade").style.display = "block";
	} else if (subscription == "pro_tier" || subscription == "rex" || subscription == "ultra_tier" || subscription == "ultra") {
		document.getElementById("subscriptionIcon").src = "./images/rex_icon.png"
		document.getElementById("subscriptionTier").textContent = "RoPro Rex"
		freeTrialTime = await fetchFreeTrialTime();
		if (freeTrialTime >= 0) {
			hours = freeTrialTime
			document.getElementById("freeTrialBar").textContent = "RoPro Rex Free Trial Active - " + parseInt(hours) + " hrs " + parseInt((hours - parseInt(hours)) * 60) + " mins left"
			document.getElementById("freeTrialBar").style.display = "block";
			document.getElementById("freeTrialInfo").style.display = "block";
			document.getElementById("upgradeTrialBar").style.display = "inline-block";
		}
	} else {
		document.getElementById("subscriptionIcon").src = "./images/ultra_icon.png"
		document.getElementById("subscriptionTier").textContent = "RoPro Ultra"
	}
	if (typeof userID == 'undefined') {
		userID = -1
		username = "Not logged in"
	}
	document.getElementById('userIcon').classList.add('ropro-player-thumbnail-' + parseInt(userID))
	loadPlayerThumbnails([parseInt(userID)])
	document.getElementById('userIcon').style.backgroundColor = "#D4D4D4"
	document.getElementById('userIcon').style.borderRadius = "8px"
	document.getElementById('usernameText').textContent = stripTags(username)
	if (userID !== -1) {
		roproApiAdapter.request("ropro_get_user_info_test", {userId: userID, myId: userID}, function(data) {
			if (data != null && typeof data === 'object' && typeof data.discord === 'string' && data.discord.length > 0) {
				var discordInput = document.getElementById('discordValue')
				if (discordInput != null && discordInput.value === '') {
					discordInput.value = stripTags(data.discord)
				}
			}
		})
	}
	document.getElementById('reloadExtension').addEventListener('click', async function(){
		await setLocalStorage("rpSubscriptionFreshness", 0);
		chrome.runtime.reload()
	})
	$.get('https://apis.roblox.com/universal-app-configuration/v1/behaviors/account-settings-ui/content', function(data) {
		if (!data.hasOwnProperty('displayVoiceChatSettings') || !data.displayVoiceChatSettings) {
			document.getElementById('roproVoiceServers').style.display = "none"
			document.getElementById('premiumVoiceServers').style.display = "none"
		}
	})
	if (await fetchSetting('cloudPlayHidden')) {
		document.getElementById('cloudPlay').parentNode.style.display = "none"
	}
}
main()

// Clear Extension Cache — standalone handlers outside main() so they bind
// regardless of any errors in main()'s async flow.
console.log('[RoPro] Binding clear cache handlers')
$(document).on('click', '#clearExtensionCache', function(){
	console.log('[RoPro] Clear cache button clicked, showing modal')
	$('.clear_cache_modal').modal('show')
})
$(document).on('click', '#clearCacheCancel', function(){
	$('.clear_cache_modal').modal('hide')
})
$(document).on('click', '#clearCacheConfirm', async function(){
	var btn = this
	btn.disabled = true
	btn.textContent = 'Clearing...'
	btn.style.background = '#c62828'
	btn.style.color = '#fff'
	console.log('[RoPro] Clear cache: sending ClearExtensionCache message to background')
	try {
		var response = await chrome.runtime.sendMessage({greeting: "ClearExtensionCache"})
		console.log('[RoPro] Clear cache: background responded', response)
	} catch (e) {
		console.error('[RoPro] Clear cache: sendMessage error', e)
	}
	btn.textContent = 'Cache cleared! Reloading...'
	console.log('[RoPro] Clear cache: reloading extension in 1.5s')
	setTimeout(function(){ chrome.runtime.reload() }, 1500)
})

function internationalize() {
	document.getElementById('settingsText').innerText = chrome.i18n.getMessage("settings");
	document.getElementById('manageSubscription').innerText = chrome.i18n.getMessage("manageSubscription");
	document.getElementById('activateSubscription').innerText = chrome.i18n.getMessage("activateSubscription");
	document.getElementById('supportButton').innerText = chrome.i18n.getMessage("support");
	document.getElementById('termsOfService').innerText = chrome.i18n.getMessage("termsOfService");
	document.getElementById('privacyPolicy').innerText = chrome.i18n.getMessage("privacyPolicy");
	document.getElementById('help').innerText = chrome.i18n.getMessage("help");
	document.getElementById('subscription').innerText = chrome.i18n.getMessage("subscription");
	document.getElementById('disclaimer1').innerText = chrome.i18n.getMessage("disclaimer1");
	document.getElementById('disclaimer2').innerText = chrome.i18n.getMessage("disclaimer2");
	var disclaimer3 = chrome.i18n.getMessage("disclaimer3");
	if (!disclaimer3) {
		disclaimer3 = "Because Roblox frequently updates its platform, RoPro feature availability may change over time.";
	}
	document.getElementById('disclaimer3').innerText = disclaimer3;
	$('.generalFeatures').text(chrome.i18n.getMessage("generalFeatures"));
	$('.tradingFeatures').text(chrome.i18n.getMessage("tradingFeatures"));
	$('.groupFeatures').text(chrome.i18n.getMessage("groupFeatures"));
	$('.accountSecurityFeatures').text(chrome.i18n.getMessage("accountSecurityFeatures"));
}

window.addEventListener('load', internationalize);
