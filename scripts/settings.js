// Settings checkboxes (ID: Default value)
var settings_checkboxes = {
    'confirm-reset': true,
    'confirm-delete': true,
    'autostart-default': false,
    'save-fields': true,
    'use-icons': false,
    '12-hour': false,
    'custom-dialogs': true,
    'update-alert': true,

    'enable-sync': false,
    'track-history': true,
    'stop-timer': true,
    'no-overtime': true,
    'only-one': false,
    'background-running': true,

    'show-popup': true,
    'notify': false,
    'play-sound': true,
    'loop-sound': false,

    'enable-charts': true,
    'chart-show-percent': true,
    'chart-combine': false
};

// Other settings (ID: Default value)
var settings_other = {
    'sound-type': 1,
    'custom-sound': '',

    'update-time': 1,
    'chart-update-time': 3
};

// Load the settings
function LoadSettings(reset_timer, from_save) {
    $('#sound-type').val(Setting('sound-type'));
    $('#custom-sound').val(Setting('custom-sound', '', true));
    $('#update-time').val(Setting('update-time', 1, true));
    $('#chart-update-time').val(Setting('chart-update-time', 3, true));

    // Check/uncheck checkboxes
    $.each(settings_checkboxes, function(i, v) {
        if(Setting(i, v, true)) {
            $('#'+ i).attr('checked', 'checked');
        } else {
            $('#'+ i).removeAttr('checked');
        }
    });

    // Display/hide the notice
    if(Setting('hide-notice', false, true)) $('#notice').hide(); else $('#notice').show();

    // Display the translation notice
    if(!Setting('translate-hidden', false, true)) $('#translate-notice').show();

    // Switch to/from icons
    if(Setting('use-icons')) {
        $('.button-btns').hide();
        $('.img-btns').show();
    } else {
        $('.button-btns').show();
        $('.img-btns').hide();
    }

    // Show the history disabled message if necessary
    if(Setting('track-history')) {
        $('#history-disabled').hide();
        $('#history-group').show();
    } else {
        $('#history-disabled').show();
        $('#history-group').hide();
    }

    // Enable/disable stop timer checkbox
    if(Setting('no-overtime')) {
        $('#stop-timer').attr('disabled', 'disabled');
    } else {
        $('#stop-timer').removeAttr('disabled');
    }

    // Do stuff for the notification sound
    if(Setting('play-sound', true, true)) {
        $('#play-sound').attr('checked', 'checked');
        $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
        if($('#sound-type').val() == 2) {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    } else {
        $('#play-sound').removeAttr('checked');
        $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
    }

    // Set the audio to loop if looping is enabled
    if(Setting('loop-sound', false, true) && Setting('play-sound')) {
        $('#sound').attr('loop', 'loop');
        $('#close-alarm').text(locale('btnStopAlarm'));
        $('#show-popup').attr('disabled', 'disabled');
    } else {
        $('#sound').removeAttr('loop');
        $('#close-alarm').text(locale('btnClose'));
        $('#show-popup').removeAttr('disabled');
    }

    // Set the notification audio to the proper src
    if(Setting('sound-type', 1, true) == 2) {
        $('#sound').attr('src', Setting('custom-sound'));
    } else {
        $('#sound').attr('src', 'Deneb.ogg');
    }

    // Verify custom sound URL
    verify_custom_sound();

    // Reset timer
    if(reset_timer) {
        clearTimeout(timer);
        timer = setTimeout(update_time, Setting('update-time') * 1000);
    }
}

function SaveSettings() {
    var old_use_icons = Setting('use-icons');

    // Verify that the custom sound URL is valid
    if(!verify_custom_sound(true)) {
        error(locale('errSoundURL'));
        $('#custom-sound').focus();
        return false;
    }

    // Sync if the setting was changed
    if(Setting('enable-sync') != $('#enable-sync').is(':checked') && $('#enable-sync').is(':checked')) {
        RetrieveTasks();
    }

    // Save the state of the checkboxes
    for(var i in settings_checkboxes) {
        Setting(i, $('#'+ i).is(':checked'));
    }

    // Save the sound type and custom sound URL
    Setting('sound-type', $('#sound-type').val());
    Setting('custom-sound', $('#custom-sound').val());

    // Save the update times
    if(parseInt($('#update-time').val(), 10) > 0 && parseInt($('#update-time').val(), 10) <= 60) {
        Setting('update-time', $('#update-time').val());
    }
    if(parseInt($('#chart-update-time').val(), 10) > 0 && parseInt($('#chart-update-time').val(), 10) <= 60) {
        Setting('chart-update-time', parseInt($('#chart-update-time').val(), 10));
    }

    // Check for notification permissions
    if(Setting('notify')) {
        webkitNotifications.requestPermission(function() {
            webkitNotifications.createNotification('/style/images/icon-64.png', locale('noteNotifsWork'), locale('noteNotifsWorkBody')).show();
        });
    }

    // Reset the small window alerted state
    if(old_use_icons != Setting('use-icons') && !Setting('use-icons')) Setting('small-window-alerted', false);

    // Reload settings and stuff
    LoadSettings(true, true);
    rebuild_list();
    success('sucSavedSettings');
}

// Return or set the value of a setting
function Setting(id, value, only_not_exists) {
    if(typeof only_not_exists == 'undefined') only_not_exists = false;

    // Check if the setting exists
    var exists = false;
    if(typeof localStorage[id] != 'undefined') exists = true;

    if(typeof value != 'undefined' && ((exists && !only_not_exists) || (!exists && only_not_exists))) {
        // Set the setting
        if(typeof value.toString() != 'undefined') {
            localStorage[id] = value.toString();
        } else {
            localStorage[id] = value;
        }

        return value;
    } else {
        // Return the value
        value = localStorage[id];
        if(value == 'true') return true;
        if(value == 'false') return false;
        if(!isNaN(parseInt(value, 10))) return parseInt(value, 10);
        return value;
    }
}