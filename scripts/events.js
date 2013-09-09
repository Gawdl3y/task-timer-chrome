$(function() {
    /**************************************************
     ******     G E N E R A L   E V E N T S      ******
     **************************************************/
    // Window gained focus
    $(window).focus(function() {
        background = false;
    });

    // Window lost focus
    $(window).blur(function() {
        background = true;

    });

    // User clicked away from the goal fields
    $('#new-goal-hours, #new-goal-mins').blur(function() {
        if($(this).val() === '' || parseInt($(this).val(), 10) < 0) $(this).val('0');
    });

    // User hovered over the pie chart
    $('#current-pie-chart').bind('plothover', function(event, pos, obj) {
        if (!obj) {
            $('#current-pie-hover').text('');
            return;
        }

        percent = Math.round(parseFloat(obj.series.percent));
        $('#current-pie-hover').text(obj.series.label + ' - ' + percent + '%');
    });

    // User resized window
    $(window).resize(function() {
        $('#error, #saved, #alarm-menu, #modal-dialog').center();
        if(task_open) $('#task-menu').css({left: ((($(window).width() - $('#task-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'});
        if(tools_open) $('#tools-menu').css({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'});

        check_width();
    });

    // User is leaving the page... Save the data.
    $(window).unload(function() {
        SaveTasks();
        Setting('opened', false);
    });

    // Preview sound is ready
    $('#preview').bind('canplay', function() {
        if(preview_sound) {
            preview_sound = false;
            this.play();
            $('#preview-sound').text(locale('optBtnPreview')).removeAttr('disabled');
        }
    });

    // Preview sound invalid
    $('#preview').error(function() {
        if(preview_sound) {
            preview_sound = false;
            $('#preview-sound').text(locale('errGeneric'));
            setTimeout(function() { $('#preview-sound').text(locale('optBtnPreview')).removeAttr('disabled'); }, 2000);
        }
    });


    /**************************************************
     *******     B U T T O N   E V E N T S      *******
     **************************************************/
    // User clicked the Add Task button
    $('#new-btn').click(function() {
        // Validate time
        fix_time('#new-goal-hours', '#new-goal-mins');
        var hours = parseInt($('#new-goal-hours').val(), 10), mins = parseInt($('#new-goal-mins').val(), 10), indef = $('#new-goal-indef').is(':checked');

        if($('#new-txt').val() !== '' && (hours > 0 || mins > 0 || indef)) {
            // Add the task to the array
            cancel_edit();
            add_task({
                'text': $('#new-txt').val(),
                'description': '',
                'current_hours': 0,
                'current_mins': 0,
                'current_secs': 0,
                'goal_hours': hours,
                'goal_mins': mins,
                'indefinite': indef,
                'notified': false,
                'running': false,
                'last_tick': null,
                'settings': task_settings_checkboxes,
            });

            // Start the task if the start checkbox is checked and save the tasks
            if($('#new-start').is(':checked')) toggle_task(task_count - 1);
            SaveTasks();

            // Update table, text fields, etc.
            $('#new-txt').val('');
            $('table#task-list').tableDnDUpdate();
            if(Setting('autostart-default')) $('#new-start').attr('checked', 'checked');
            rebuild_charts();
        } else {
            error('errTask');
        }
    });



    // User clicked one of the clear data buttons
    $('.clear-data').click(function() {
        if(confirm(locale('confResetData'))) {
            $(window).unbind();
            clearTimeout(save_timer);
            clearTimeout(timer);
            localStorage.clear();
            location.reload();
        }
    });

    // User clicked one of the reload app buttons
    $('.reload-app').click(function() {
        Setting('opened', false);
        chrome.runtime.reload();
    });



    // User clicked the close button in one of the menus
    $('.close-menus').click(function() {
        LoadSettings();
        tools_open = false;
        task_open = false;
        displaying_task = -1;

        if(!alarm_open && !task_open && !tools_open && !dialog_open) $('#modal').fadeOut(600);
        $('#task-menu, #tools-menu').animate({left: '100%'}, 600);
    });

    // User clicked the close alarm button
    $('#close-alarm').click(function() {
        alarm_open = false;

        // Stop the sound
        if(Setting('play-sound')) {
            document.getElementById('sound').pause();
            document.getElementById('sound').currentTime = 0;
        }

        // Hide the popup
        $('#alarm-menu').fadeOut(600);
        if(!task_open && !tools_open && !dialog_open) $('#modal').fadeOut(600);
    });

    // User clicked the close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        Setting('hide-notice', true);
    });

    // User clicked the close button in the translate notice
    $('#close-translate').click(function() {
        $('#translate-notice').fadeOut(600);
        Setting('translate-hidden', true);
    });



    // User clicked the reset all button
    $('.reset-all').click(function() {
        dialog(locale('confResetAll'), function(status) {
            if(status) {
                for(var t = 0; t < task_count; t++) {
                    reset_task(t, true);
                }
            }
        }, {}, 'question');
    });

    // User clicked the delete all button
    $('.delete-all').click(function() {
        dialog(locale('confDeleteAll'), function(status) {
            if(status) {
                for(var t = task_count - 1; t >= 0; t--) {
                    delete_task(t, true);
                }
            }
        }, {}, 'question');
    });



    // User clicked the save description button in the task info menu
    $('#save-description').click(function() {
        tasks[parseInt($(this).attr('name'), 10)].description = $('#info-description textarea').val();
        success('sucSavedDesc');
    });

    // User clicked the toggle button in the task info menu
    $('#task-toggle').click(function() {
        toggle_task(parseInt($(this).attr('name'), 10), true);
    });

    // User clicked the reset button in the task info menu
    $('#task-reset').click(function() {
        reset_task(parseInt($(this).attr('name'), 10));
    });

    // User clicked the delete button in the task info menu
    $('#task-delete').click(function() {
        cancel_edit();
        delete_task(parseInt($(this).attr('name'), 10));
        $('.close-menus').click();
    });

    // User clicked the clear history button in the task info menu
    $('#task-clear-history').click(function() {
        clear_history(parseInt($(this).attr('name'), 10));
    });



    // User clicked the tools button
    $('#tools-button').click(function() {
        LoadSettings();
        tools_open = true;
        Setting('new-tools', false);

        $('#modal').fadeIn(600, function() { $('#tools-pulsate').stop(true, true).fadeOut(400); });
        $('#tools-menu').animate({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'}, 600);
    });

    // User clicked the CSV export button in the tools menu
    $('#csv-export').click(function() {
        // Build the CSV file
        var csv = '"'+ locale('lblTask').replace('"', '""') +'","'+ locale('lblTimeSpent').replace('"', '""') +'","'+ locale('lblGoal').replace('"', '""') +'","'+ locale('lblProgress').replace('"', '""') +'","'+ locale('lblDescription').replace('"', '""') +'"';
        for(var i in tasks) {
            csv += '\n"'+ tasks[i].text.replace('"', '""') +'"';
            csv += ',"'+ format_time(tasks[i].current_hours, tasks[i].current_mins, tasks[i].current_secs) +'"';
            csv += ',"'+ format_time(tasks[i].goal_hours, tasks[i].goal_mins, 0, tasks[i].indefinite) +'"';
            csv += ',"'+ (tasks[i].indefinite ? '-' : task_progress(i)) +'%"';
            csv += ',"'+ tasks[i].description.replace('"', '""') +'"';
        }

        // Open CSV file
        var link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(new Blob([csv], {type: 'text/csv'})));
        link.setAttribute('download', 'Task Timer ' + new Date().toLocaleString() + '.csv');
        link.click();
    });

    // User clicked the clear all history button in the tools menu
    $('#clear-all-history').click(function() {
        dialog(locale('confClearAllHistory'), function(status) {
            if(status) {
                for(var t = 0; t < task_count; t++) {
                    tasks[t].history = {};
                }
            }
        }, {}, 'question');
    });

    // User clicked the preview button for the notification sound
    $('#preview-sound').click(function() {
        // Verify that the custom sound URL is valid
        if(!verify_custom_sound(true)) {
            error('errSoundURL');
            $('#custom-sound').focus();
            return false;
        }

        // Play preview sound
        if($('#sound-type').val() == 1 || $('#custom-sound').val() !== '') {
            preview_sound = true;
            $('#preview').attr('src', $('#sound-type').val() == 1 ? 'Deneb.ogg' : $('#custom-sound').val());
            $(this).text(locale('txtLoading')).attr('disabled', 'disabled');
        }
    });

    // User clicked the save button in the tools menu
    $('#save-settings').click(function() {
        SaveSettings();
    });

    // User clicked the reset settings button in the tools menu
    $('#reset-settings').click(function() {
        dialog(locale('confResetSettings'), function(status) {
            if(status) {
                // Reset checkbox settings
                for(var i in settings_checkboxes) {
                    Setting(i, settings_checkboxes[i]);
                }

                // Reset other settings
                for(i in settings_other) {
                    Setting(i, settings_other[i]);
                }

                // Reload settings
                LoadSettings(true, true);
            }
        }, {}, 'question');
    });



    // User clicked the totals help button
    $('.totals-help').click(function() {
        dialog(locale('infoTotals'));
    });


    // User clicked the set localStorage button (debug)
    $('#debug-set').click(function() {
        // Assign localStorage
        var tmp = JSON.parse($('#debug-json').val());
        for(var i in tmp) {
            localStorage[i] = tmp[i];
        }

        // Reload
        Setting('opened', false);
        $(window).unbind('unload');
        window.location = window.location;
    });


    /**************************************************
     ********     I N P U T   E V E N T S      ********
     **************************************************/
    // User toggled the new task indefinite checkbox
    $('#new-goal-indef').change(function() {
        if($(this).is(':checked')) {
            $('#new-goal-hours, #new-goal-mins').attr('disabled', 'disabled');
        } else {
            $('#new-goal-hours, #new-goal-mins').removeAttr('disabled');
        }
    });

    // User toggled the refreshed checkbox
    $('#refreshed').change(function() {
        if($('#refreshed').is(':checked')) {
            $('.clear-data').first().removeAttr('disabled');
        } else {
            $('.clear-data').first().attr('disabled', 'disabled');
        }
    });

    // User toggled a task setting checkbox
    $('.task-setting').change(function() {
        TaskSetting(this.id.replace('task-', ''), displaying_task, $(this).is(':checked'));
        rebuild_list();
    });

    // User toggled the no overtime checkbox
    $('#no-overtime').change(function() {
        if($('#no-overtime').is(':checked')) {
            $('#stop-timer').attr('disabled', 'disabled');
        } else {
            $('#stop-timer').removeAttr('disabled');
        }
    });

    // User toggled the play sound checkbox
    $('#play-sound').change(function() {
        if($('#play-sound').is(':checked')) {
            $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
            if($('#sound-type').val() == '2') $('#custom-sound').removeAttr('disabled');
        } else {
            $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
        }
    });

    // User toggled the loop sound checkbox
    $('#loop-sound').change(function() {
        if($('#loop-sound').is(':checked')) {
            $('#show-popup').attr('disabled', 'disabled');
        } else {
            $('#show-popup').removeAttr('disabled');
        }
    });

    // User changed the sound type dropdown
    $('#sound-type').change(function() {
        if($('#sound-type').val() == '2') {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }

        verify_custom_sound();
    });

    // User changed the custom sound URL field
    $('#custom-sound').keyup(function() {
        verify_custom_sound();
    });

    // User pressed enter in one of the new task fields
    $('#new-task input').keypress(function (e) {
        if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
            $('#new-btn').click();
        }
    });

    // User clicked away from the new task goal minutes field
    $('#new-goal-mins').blur(function() {
        fix_time('#new-goal-hours', '#new-goal-mins');
    });
});