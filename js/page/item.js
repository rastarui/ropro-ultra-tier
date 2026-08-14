function fetchItem(itemID) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_backend", {ids: [itemID]}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

async function getJSON(userID) {
	var response = await fetchItem(userID)
	return response
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function parseDemandRating(json) {
	if (json[17] == null) {
		return null
	}
	var demand = parseInt(json[17])
	if (isNaN(demand)) {
		return null
	}
	return demand + 1
}

function demandLabel(demand) {
	var demandEquivalence = {"1":"Terrible", "2":"Low", "3":"Normal", "4":"High", "5":"Amazing"}
	if (demand == null) {
		return "Not Assigned"
	}
	return demandEquivalence[demand.toString()] || "Not Assigned"
}

function getIdFromURL(url) {
	var match = String(url || "").match(/\/catalog\/(\d+)/i)
	if (match == null) {
		return null
	}
	var id = parseInt(match[1], 10)
	if (!Number.isFinite(id) || id <= 0) {
		return null
	}
	return id
}

function addLink(itemID) {
	var header = document.querySelector('.border-bottom.item-name-container h1, .border-bottom.item-name-container h2, [data-testid="item-name"]')
	if (header != undefined && header != null && document.getElementById('roliLink') == null) {
		var a = document.createElement('a')
		var roliLink = document.createElementNS("http://www.w3.org/2000/svg", "svg")
		roliLink.setAttribute("id", "roliLink")
		roliLink.setAttribute("aria-hidden", "true")
		roliLink.setAttribute("width", "1em")
		roliLink.setAttribute("height", "1em")
		roliLink.setAttribute("style", "vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);")
		roliLink.setAttribute("preserveAspectRatio", "xMidYMid meet")
		roliLink.setAttribute("viewBox", "0 0 24 24")
		var roliPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
		roliPath.setAttribute("d", "M10.586 13.414a1 1 0 0 1-1.414 1.414 5 5 0 0 1 0-7.07l3.535-3.536a5 5 0 0 1 7.071 7.071l-1.485 1.486a7.017 7.017 0 0 0-.405-2.424l.476-.476a3 3 0 1 0-4.243-4.243l-3.535 3.536a3 3 0 0 0 0 4.242zm2.828-4.242a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.07l-3.535 3.536a5 5 0 0 1-7.071-7.07l1.485-1.486c-.008.82.127 1.641.405 2.423l-.476.476a3 3 0 1 0 4.243 4.243l3.535-3.536a3 3 0 0 0 0-4.242 1 1 0 0 1 0-1.414z")
		roliPath.setAttribute("fill", "#fff")
		roliLink.appendChild(roliPath)
		a.appendChild(roliLink)
		a.setAttribute('style', 'margin-left:5px;margin-top:5px;')
		a.setAttribute('target', '_blank')
		a.setAttribute('href', 'https://www.rolimons.com/item/' + parseInt(itemID))
		header.appendChild(a)
	}
}

function getItemDetailsContainer() {
  return document.getElementById('item-details') || document.getElementsByClassName('item-details')[0] || document.getElementById('item-details-section') || null
}

function isLegacyItemDetailsLayout(details) {
  if (details == null) {
    return false
  }
  return (
    details.classList.contains('item-details') &&
    details.getElementsByClassName('item-info-row-container').length === 0
  )
}

function getDirectChildrenByClass(parent, className) {
  if (parent == null || parent.children == null) {
    return []
  }
  var children = []
  for (var i = 0; i < parent.children.length; i++) {
    var child = parent.children[i]
    if (child != null && child.classList != null && child.classList.contains(className)) {
      children.push(child)
    }
  }
  return children
}

function getItemPayloadValue(itemResponse, itemID) {
  if (itemResponse == null || typeof itemResponse !== "object") {
    return null
  }
  var normalizedItemID = parseInt(itemID, 10)
  if (!Number.isFinite(normalizedItemID) || normalizedItemID <= 0) {
    return null
  }
  var key = String(normalizedItemID)
  var rawPayload = itemResponse[key]
  return rawPayload == null ? null : rawPayload
}

function createRolimonsItemPageLink(itemID, ariaLabel, titleLabel) {
  var normalizedId = parseInt(itemID, 10)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null
  }
  var link = document.createElement('a')
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.href = "https://www.rolimons.com/item/" + normalizedId
  link.setAttribute("aria-label", ariaLabel || "Open Rolimon's item page")
  link.title = titleLabel || "Open Rolimon's item page"
  link.setAttribute('style', 'display:inline-flex;align-items:center;text-decoration:none;')
  var logo = document.createElement('img')
  logo.src = chrome.runtime.getURL('/images/rolimons_logo_icon_blue.png')
  logo.setAttribute('width', '15')
  logo.setAttribute('height', '15')
  logo.setAttribute('style', 'margin-right:4px;display:block;')
  logo.alt = 'Rolimons'
  logo.setAttribute('aria-hidden', 'true')
  link.appendChild(logo)
  return link
}

function buildItemInfoRow(label, value, itemID, isLegacyLayout) {
  var row = document.createElement('div')
  row.className = isLegacyLayout ? 'clearfix item-field-container ropro-item-page-value-demand-row' : 'clearfix item-info-row-container ropro-item-page-value-demand-row'
  var labelClass = isLegacyLayout ? 'font-header-1 text-subheader text-label text-overflow field-label' : 'font-header-1 text-subheader text-label text-overflow row-label'
  var contentClass = isLegacyLayout ? 'field-content' : 'row-content'
  var labelNode = document.createElement('div')
  labelNode.className = labelClass
  var labelLink = createRolimonsItemPageLink(itemID, label + ' from Rolimons')
  if (labelLink != null) {
    labelNode.appendChild(labelLink)
  }
  var labelText = document.createElement('span')
  labelText.textContent = ' ' + String(label)
  labelNode.appendChild(labelText)

  var valueNode = document.createElement('div')
  valueNode.className = contentClass
  var valueLink = document.createElement('a')
  valueLink.className = 'text-name item-genre wait-for-i18n-format-render'
  valueLink.target = '_blank'
  valueLink.rel = 'noopener noreferrer'
  valueLink.href = "https://www.rolimons.com/item/" + parseInt(itemID)
  valueLink.textContent = value
  valueNode.appendChild(valueLink)
  if (isLegacyLayout) {
    var spacer = document.createElement('span')
    spacer.className = 'wait-for-i18n-format-render'
    valueNode.appendChild(spacer)
  }
  row.appendChild(labelNode)
  row.appendChild(valueNode)
  return row
}

function waitForItemDetailsContainer() {
  return new Promise(function(resolve) {
    var details = getItemDetailsContainer()
    if (details != null) {
      resolve(details)
      return
    }
    var attempts = 0
    var maxAttempts = 80
    var interval = setInterval(function() {
      attempts += 1
      details = getItemDetailsContainer()
      if (details != null || attempts >= maxAttempts) {
        clearInterval(interval)
        resolve(details || null)
      }
    }, 250)
  })
}

function getProjectedBadgeHost() {
	var selectors = [
		"#item-thumbnail-container-frontend .thumbnail-holder",
		"#item-thumbnail-container-frontend",
		"[data-testid='item-thumbnail-container']",
		".item-thumbnail-container",
		"thumbnail-2d .thumbnail-2d-container"
	]
	var candidateHosts = []
	var seenHosts = new Set()
	for (var i = 0; i < selectors.length; i++) {
		var elements = document.querySelectorAll(selectors[i])
		for (var j = 0; j < elements.length; j++) {
			var candidate = elements[j]
			if (candidate == null || seenHosts.has(candidate)) {
				continue
			}
			seenHosts.add(candidate)
			if (candidate.querySelector('img, picture, canvas') == null) {
				continue
			}
			var rect = candidate.getBoundingClientRect()
			var width = rect.width || candidate.offsetWidth || 0
			var height = rect.height || candidate.offsetHeight || 0
			if (width < 120 || height < 120) {
				continue
			}
			var score = width * height
			if (candidate.closest("#item-thumbnail-container-frontend") != null) {
				score += 1000000
			}
			if (candidate.getAttribute("data-testid") == "item-thumbnail-container") {
				score += 1000000
			}
			candidateHosts.push({node: candidate, score: score})
		}
	}
	if (candidateHosts.length == 0) {
		return null
	}
	candidateHosts.sort(function(a, b) {
		return b.score - a.score
	})
	return candidateHosts[0].node
}

function projectedDisplay() {
	var assetThumbnail = getProjectedBadgeHost()
	if (assetThumbnail == null) {
		return false
	}
	if (assetThumbnail.getElementsByClassName('ropro-projected-badge').length > 0) {
		return true
	}
	if (window.getComputedStyle(assetThumbnail).position == "static") {
		assetThumbnail.style.position = "relative"
	}
	var badge = document.createElement('span')
	badge.setAttribute('style', 'position:absolute;background:intial;background-color:initial;top:-2px;right:-2px;left:initial;bottom:initial;pointer-events:none;z-index:6;')
	badge.setAttribute('class', 'limited-icon-container ng-isolate-scope ropro-projected-badge')
	badge.setAttribute('title', 'Projected Item')
	badge.setAttribute('data-original-title', 'Projected Item')
	badge.setAttribute('tooltip-placement', 'top')
	var image = document.createElement('img')
	image.setAttribute('width', '250')
	image.setAttribute('src', chrome.runtime.getURL('/images/projected_icon.png'))
	badge.appendChild(image)
	assetThumbnail.appendChild(badge)
	return true
}

function queueProjectedDisplay() {
	if (projectedDisplay()) {
		return
	}
	var attempts = 0
	var maxAttempts = 20
	var interval = setInterval(function() {
		attempts += 1
		if (projectedDisplay() || attempts >= maxAttempts) {
			clearInterval(interval)
		}
	}, 250)
}

function addValue(itemValue, itemDemand, itemID) {
	var details = getItemDetailsContainer()
	if (details == null) {
		return
	}
	if (
		details.querySelector('.ropro-item-page-value-row') != null ||
		details.querySelector('.ropro-item-page-demand-row') != null
	) {
		return
	}
	var normalizedItemID = parseInt(itemID)
	if (!Number.isFinite(normalizedItemID) || normalizedItemID <= 0) {
		return
	}
	var isLegacyLayout = isLegacyItemDetailsLayout(details)
	var normalizedValue = addCommas(parseInt(itemValue))
	var demandValue = stripTags(itemDemand)
	var valueRow = buildItemInfoRow("Value", normalizedValue, normalizedItemID, isLegacyLayout)
	var demandRow = buildItemInfoRow("Demand", demandValue, normalizedItemID, isLegacyLayout)
  valueRow.className = valueRow.className + " ropro-item-page-value-row"
  demandRow.className = demandRow.className + " ropro-item-page-demand-row"

  var insertionPoint = null
  var infoRows = getDirectChildrenByClass(details, 'item-info-row-container')
  if (infoRows.length > 0) {
    insertionPoint = infoRows[0]
  }
  if (insertionPoint == null && isLegacyLayout) {
    var itemTypeFieldContainers = getDirectChildrenByClass(details, 'item-type-field-container')
    var itemTypeField = itemTypeFieldContainers.length > 0 ? itemTypeFieldContainers[0] : null
    if (itemTypeField != null && itemTypeField.nextSibling != null) {
      insertionPoint = itemTypeField.nextSibling
    }
  }
  if (insertionPoint == null) {
    details.appendChild(valueRow)
    details.appendChild(demandRow)
		return
	}
	details.insertBefore(valueRow, insertionPoint)
	details.insertBefore(demandRow, valueRow.nextSibling)
}

async function mainItem() {
	if (location.href.includes("/catalog/")) {
		var itemID = getIdFromURL(location.href)
		if (!Number.isFinite(itemID) || itemID <= 0) {
			return
		}
		var settings = await Promise.all([
			fetchSetting("itemPageValueDemand"),
			fetchSetting("projectedWarningItemPage"),
			fetchSetting("embeddedRolimonsItemLink")
		])
		var itemPageValueDemand = settings[0] === true
		var projectedWarningItemPage = settings[1] === true
		var embeddedRolimonsItemLink = settings[2] === true

		if (itemPageValueDemand || projectedWarningItemPage) {
			await waitForItemDetailsContainer()
			var itemResponse = await getJSON(itemID)
			var rawItemPayload = getItemPayloadValue(itemResponse, itemID)
			if (rawItemPayload != null) {
				var parsedJson = null
				try {
					parsedJson = typeof rawItemPayload === 'string' ? JSON.parse(rawItemPayload) : rawItemPayload
				} catch (error) {
					parsedJson = null
				}
				if (parsedJson != null && typeof parsedJson === "object") {
					if (projectedWarningItemPage && parsedJson[19] == 1) {
						queueProjectedDisplay()
					}
					if (itemPageValueDemand) {
						var itemValue = parsedJson[16]
						if (parsedJson[16] == null) {
							itemValue = parsedJson[8]
						}
						var demand = parseDemandRating(parsedJson)
						addValue(itemValue, stripTags(demandLabel(demand)), itemID)
					}
				}
			}
		}
		if (embeddedRolimonsItemLink) {
			addLink(itemID)
		}
	}
}

mainItem()
