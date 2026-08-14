var url_matches = [
	"/trades*",
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');

var cursor = ""
var tradeType = "inbound"
var loaded = false
var currentlyLoading = false
var tradeValues = {}
var tradeBarHeight = 0
var tradesArray = []
var myUsername = ""
var numLoaded = 0

function fetchTradeRows() {
	document.dispatchEvent(new CustomEvent('fetchTradeRows', {detail: {tradeTimeDisplay: true}}));
}

function fetchUsername() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetUsername"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function getLocalStorage(key) {
  return roproApiAdapter.getLocalStorage(key);
}

function setLocalStorage(key, value) {
  return roproApiAdapter.setLocalStorage(key, value);
}

function fetchTrade(tradeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "DoCacheTrade", tradeId: parseInt(tradeId)}, function(data) {
			if (Array.isArray(data) && data.length === 2 && data[0] != null && typeof data[0] === "object") {
				resolve(data[0])
				return
			}
			resolve(null)
		})
	})
}

function fetchCachedTrade(tradeId, cachedTrades) {
	return new Promise(resolve => {
		resolve(cachedTrades[tradeId])
	})
}

function fetchValues(trades) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_trade_preview_backend", {trades: trades, form: false}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function getValueHTML(theirValue, ourValue) {
	if (theirValue > ourValue) {
		color = "rgba(31, 255, 0, 0.2)"
	} else if (theirValue == ourValue) {
		color = "rgba(255, 255, 0, 0.2)"
	} else {
		color = "rgba(255, 0, 0, 0.2)"
	}
	ourValue = stripTags(addCommas(ourValue))
	theirValue = stripTags(addCommas(theirValue))
	valueHTML = `<span style="margin-top:25px;background-color:${color};padding-left:5px;padding-right:5px;font-size:18px;line-height:20px;" class="font-caption-body text-date-hint text trade-sent-date ng-binding" ng-bind="trade.created | date:'shortDate'"><img src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;position:relative;left:-3px;margin-right:3px;background:transparent;border:0;box-shadow:none;">${ourValue}<hr style="padding:0px;margin:0px"><img src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;position:relative;left:-3px;margin-right:3px;background:transparent;border:0;box-shadow:none;">${theirValue}</span>`
	return valueHTML
}

async function getTrades() {
	if (!tradePreviews || currentlyLoading) {
		return
	}
	tradeRows = $(".trade-row.trade-id:not(.loaded)")
	if (tradeRows.length == 0) {
		return
	}
	currentlyLoading = true
	try {
		trades = []
		cachedTradesTemp = await getLocalStorage("cachedTrades") || {}
		cachedTrades = await getLocalStorage("inboundsCache") || {}
		if (typeof cachedTrades == "undefined") {
			cachedTrades = {}
		}
		for (tradeId in cachedTradesTemp) {
			cachedTrades[tradeId] = cachedTradesTemp[tradeId]
		}
		for (var i = 0; i < tradeRows.length; i++) {
			tradeRow = tradeRows[i]
			tradeRow.classList.add("loaded")
			if (tradeRow.hasAttribute("tradeid")) {
				if (parseInt(tradeRow.getAttribute("tradeid")) in cachedTrades) {
					trade = fetchCachedTrade(parseInt(tradeRow.getAttribute("tradeid")), cachedTrades)
					numLoaded++
				} else {
					//if (numLoaded < 10) {
						trade = fetchTrade(tradeRow.getAttribute("tradeid"))
						numLoaded++
					//}
				}
				trades.push(trade)
			}
		}
		var values = await Promise.all(trades)
		for (var i = 0; i < values.length; i++) {
			if (values[i] != null && !(values[i].id in cachedTrades)) {
				cachedTradesTemp[values[i].id] = values[i]
			}
		}
		if (values.length > 0) {
			await setLocalStorage("cachedTrades", cachedTradesTemp)
		}
		trades = {data:[]}
		trades.data = values
		tradeValues = await fetchValues(trades)
		for (var key in tradeValues) {
			tradeRow = document.getElementsByClassName(key.toString())[0]
			if (typeof tradeRow != 'undefined') {
				trade = tradeValues[key]
				console.log(trade)
				if (Object.keys(trade[0])[0].toLowerCase() != myUsername.toLowerCase()) {
					value0 = trade[0][Object.keys(trade[0])[0]]
					value1 = trade[0][Object.keys(trade[0])[1]]
				} else {
					value0 = trade[0][Object.keys(trade[0])[1]]
					value1 = trade[0][Object.keys(trade[0])[0]]
				}
				if (typeof trade != 'undefined') {
					valueDiv = document.createElement("div")
					valueDiv.innerHTML += getValueHTML(value0, value1)
					tradeRow.getElementsByClassName('trade-row-details')[0].getElementsByTagName('div')[0].appendChild(valueDiv)
				}
			}
		}
	} finally {
		currentlyLoading = false
	}
}

function addListeners() {
	document.getElementById('tab-Inbound').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "inbound"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Outbound').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "outbound"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Completed').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "completed"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Inactive').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "inactive"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});
}

var tradePreviews = false
var tradeAge = false

async function doMain() {
	tradePreviews = await fetchSetting("tradePreviews")
	tradeAge = await fetchSetting("tradeAge")
	if (tradePreviews || tradeAge) {
		unloaded = false
		addListeners()
		setTimeout(function() {
			tradeBarHeight = document.getElementsByClassName('simplebar-content')[1].scrollHeight
			tradeTypeOld = tradeType
			setInterval(async function() {
				if (typeof document.getElementsByClassName('simplebar-content')[1] != "undefined") {
					fetchTradeRows()
					if (tradePreviews) {
						getTrades()
					}
					tradeBarHeight = document.getElementsByClassName('simplebar-content')[1].scrollHeight
					tradeTypeOld = tradeType
					if (unloaded == true) {
						addListeners()
						unloaded = false
					}
				} else {
					tradesArray = []
					tradeValues = {}
					cursor = ""
					unloaded = true
				}
			}, 200)
		}, 100)
		myUsername = await fetchUsername()
	}
}
doMain()
