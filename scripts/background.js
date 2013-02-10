var opened = false, version = chrome.app.getDetails().version;

// Open the app if it was updated
if(typeof localStorage['old-version'] != 'undefined' &&  localStorage['old-version'] != version && (typeof localStorage['update-alert'] == 'undefined' || localStorage['update-alert'] == 'true')) {
    setTimeout(function() {
    	if(!opened) window.open('main.html');
    }, 5000);
}