// The app has received a message
function onMessage(message, sender, sendResponse) {
	alert(message + '\n' + sender + '\n' + sendResponse);
}

// An alarm went off!
function onAlarm(alarm) {
	alert('zomg an alarm');
}

// The app was installed/updated, or Chrome was updated
function onUpdate(details) {
	if(details.reason == "update") {
		// Open the app if it isn't already open, we're on a new version, and update alerting is enabled
		if(typeof localStorage['opened'] == 'undefined' || localStorage['opened'] == 'false') {
			if(typeof localStorage['old-version'] != 'undefined' &&  localStorage['old-version'] != version) {
				if(typeof localStorage['update-alert'] == 'undefined' || localStorage['update-alert'] == 'true') {
					window.open('main.html');
				}
			}
		}
	} else if(details.reason == "install") {
		// Open the app installed page
		window.open('installed.html');
	}
}


// Register listeners
chrome.runtime.onMessage.addListener(onMessage);
chrome.runtime.onMessageExternal.addListener(onMessage);
chrome.runtime.onAlarm.addListener(onAlarm);
chrome.runtime.onInstalled.addListener(onUpdate);