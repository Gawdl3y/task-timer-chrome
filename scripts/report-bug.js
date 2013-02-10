$(document).ready(function() {
	localisePage();

	// Print debug info
	$('#debug-info')
		.html('<strong>App Version:</strong> '+ chrome.app.getDetails().version +'<br />')
		.append('<strong>localStorage:</strong><br />'+ JSON.stringify(localStorage))
	;

	// Resolution debug info - http://code.google.com/p/chromium/issues/detail?id=35980
	setTimeout(function() {
		$('#debug-info')
			.append('<br /><strong>Outer Resolution:</strong> '+ window.outerWidth +'x'+ window.outerHeight +'<br />')
			.append('<strong>Inner Resolution:</strong> '+ window.innerWidth +'x'+ window.innerHeight)
		;
	}, 50);
});