var synced = false;

// Retrieve task data from Chrome's storage
function RetrieveTasks() {
    if(Setting('enable-sync', false, true)) {
        chrome.storage.sync.get(function(content) {
            if(chrome.runtime.lastError) {
                error(chrome.runtime.lastError);
            } else {
                // Only do stuff if the object isn't empty
                if(typeof content[0] != 'undefined') {
                    for(var index in content) {
                        var i = parseInt(index, 10);
                        if(!isNaN(i)) {
                            tasks[i] = content[i];
                        }
                    }

                    rebuild_list();
                }

                success('sucSyncReceived');
            }
        });
    }
}

// Send the task data to Chrome's storage
function SendTasks() {
    if(Setting('enable-sync', false, true)) {
        // Build the object to save in Chrome's storage
        var sync_object = {}, index;
        for(var i in tasks) {
            sync_object[i] = tasks[i];
        }

        // Save the object
        chrome.storage.sync.set(sync_object, function() {
            if(chrome.runtime.lastError) {
                error(chrome.runtime.lastError);
            } else {
                success('sucSyncSent');
            }
        });
    }
}