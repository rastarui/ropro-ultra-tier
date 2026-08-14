div = document.createElement('div')
div.classList.add('ropro-valid')
document.body.appendChild(div)

function activateKey(key) {
	return new Promise(resolve => {
		roproApiAdapter.request("ropro_activate_key", {key: key},
			function(data) {
				resolve(data)
			}
		)
	})
}

function getStorage(key) {
  return roproApiAdapter.getStorage(key);
}

function setStorage(key, value) {
  return roproApiAdapter.setStorage(key, value);
}

$(document).ready(async function(){
	var checkSuccess = setInterval(async function() {
		if (document.getElementsByClassName('login-success').length > 0) {
			clearInterval(checkSuccess)
			key = document.getElementById('roProKey').value
			data = await activateKey(key)
			if (data == "success") {
				setStorage("subscriptionKey", key)
				location.reload()
			} else {
				location.reload()
			}
		}
	}, 500)
});
