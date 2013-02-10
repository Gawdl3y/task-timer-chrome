var app, version, lang, background, load, autosaves = 0,  dragging = false, preview_sound = false, now = new Date(); // General variables
var alarm_open = false, task_open = false, tools_open = false, dialog_open = false; // Menu state variables
var js_error_shown = false, no_local_files_alerted = false; // Alert state variables
var current_plot = false, total_plot = false; // Plot variables
var save_timer, timer, timer_step = 0; // Timer variables

// Set error event (most important event)
window.onerror = function(msg, url, line) { js_error(msg, url, line); };

// Document finished loading
$(function() {
    try {
        // Set some variables
        app = chrome.app.getDetails();
        version = app.version;
        lang = window.navigator.language;
        background = chrome.extension.getBackgroundPage();
        load = $('#loading');

        // Localise ALL the things!
        localisePage();

        // Show translations text
        if(lang != 'en' && lang != 'en-CA' && lang != 'en-GB' && lang != 'en-US') $('#translations-accuracy').show();

        // Check to see if the app is already opened
        if(background.opened) throw 'open';

        // Tell the background page that the app is open
        background.opened = true;

        // Load settings
        LoadSettings();

        // If coming from a version older than 3.6, convert the stop-timer setting to no-overtime
        if(parseFloat(localStorage['old-version']) < 3.6) {
            if(!Setting('stop-timer', true, true)) {
                Setting('no-overtime', false);
                Setting('stop-timer', true);
            }
        }

        // Check the version, and show the changelog if necessary
        if(typeof localStorage['old-version'] != 'undefined') {
            if(version != localStorage['old-version']) {
                dialog(locale('confUpdated', version), function(status) {
                    if(status) window.open('about.html#changelog');
                }, {}, 'question', false, true);
            }
        } else {
            background.opened = false;
            window.location = 'installed.html';
        }

        // Set old-version to the current version
        localStorage['old-version'] = version;

        // Add to the launch count
        var launches = Setting('launches', Setting('launches', 0, true) + 1);

        // Show a rating reminder if at a multiple of 6 launches
        if(launches % 6 == 0 && typeof localStorage['rated'] == 'undefined') {
            dialog(locale('confRating'), function(status) {
                if(status) {
                    localStorage['rated'] = 'true';
                    window.open('https://chrome.google.com/webstore/detail/task-timer/aomfjmibjhhfdenfkpaodhnlhkolngif/reviews');
                }
            }, {}, 'question');
        }




        // Retrieve tasks from localStorage
        if(localStorage['tasks']) {
            tasks = JSON.parse(localStorage['tasks']);
            task_count = tasks.length;

            for(var i = 0; i < task_count; i++) {
                // Convert from the old method of storing times to the new one
                if(typeof tasks[i].current_hours == 'undefined') {
                    tasks[i].current_hours = Math.floor(tasks[i].current);
                    tasks[i].current_mins = Math.floor((tasks[i].current - tasks[i].current_hours) * 60);
                    tasks[i].current_secs = Math.round((tasks[i].current - tasks[i].current_hours - (tasks[i].current_mins / 60)) * 3600);

                    tasks[i].goal_hours = Math.floor(tasks[i].goal);
                    tasks[i].goal_mins = Math.round((tasks[i].goal - tasks[i].goal_hours) * 60);
                }

                // Add the notified property to a task if it doesn't exist
                if(typeof tasks[i].notified == 'undefined') {
                    if(tasks[i].current_hours >= tasks[i].goal_hours && tasks[i].current_mins >= tasks[i].goal_mins) {
                        tasks[i].notified = true;
                    } else {
                        tasks[i].notified = false;
                    }
                }

                // Add the indefinite property to a task if it doesn't exist
                if(typeof tasks[i].indefinite == 'undefined') tasks[i].indefinite = false;

                // Add the description property to a task if it doesn't exist
                if(typeof tasks[i].description == 'undefined') tasks[i].description = '';

                // Add the settings property to a task if it doesn't exist
                if(typeof tasks[i].settings == 'undefined') tasks[i].settings = task_settings_checkboxes;
                LoadTaskSettings(i);

                // Make sure goal times aren't null
                if(tasks[i].goal_hours == null) tasks[i].goal_hours = 0;
                if(tasks[i].goal_mins == null) tasks[i].goal_mins = 0;

                list_task(i, 0);
                task_running[i] = false;
            }
        }

        // Retrieve tasks from Chrome's storage
        RetrieveTasks();

        // Start the timers
        timer = setTimeout(update_time, Setting('update-time') * 1000);
        save_timer = setTimeout(function() { SaveTasks(true) }, 60000);




        // Enable the add task fields
        $('#new-task input, #new-task button').removeAttr('disabled');

        // Check the auto-start box if enabled, and fill in the new task fields if enabled
        if(Setting('autostart-default')) $('#new-start').attr('checked', 'checked');
        if(Setting('save-fields')) {
            $('#new-txt').val(Setting('field-name', '', true));
            $('#new-goal-hours').val(Setting('field-hours', '4', true));
            $('#new-goal-mins').val(Setting('field-mins', '0', true));

            if(Setting('field-start', false, true)) $('#new-start').attr('checked', 'checked');
            if(Setting('field-indef', false, true)) {
                $('#new-goal-indef').attr('checked', 'checked');
                $('#new-goal-hours').attr('disabled', 'disabled');
                $('#new-goal-mins').attr('disabled', 'disabled');
            }
        }

        // Set focus on the new task name field
        setTimeout(function() { $('#new-txt').focus(); }, 100);

        // Make the table rows draggable
        $('table#task-list').tableDnD({
            dragHandle: 'drag',

            /*onDragStart: function(table, row) {
                alert($(row).html());
                var id = parseInt($(row).attr('id').replace('task-', ''));
                dragging = tasks[id];
            },*/

            onDrop: function(table, row) {
                var old_id = parseInt($(row).attr('id').replace('task-', ''));
                var id = $('table#task-list tbody tr').index(row);
                var tmp = tasks[old_id], tmp2 = task_running[old_id];

                if(typeof tasks[old_id] != 'undefined' /*&& tasks[old_id] === dragging*/) {
                    tasks.splice(old_id, 1);
                    tasks.splice(id, 0, tmp);
                    task_running.splice(old_id, 1);
                    task_running.splice(id, 0, tmp2);
                }

                rebuild_list();
            }
        });

        // Add the history date picker
        $('#date-picker').datepicker({
            firstDay: 1,
            dateFormat: 'yy-mm-dd',

            onSelect: function(dateText, inst) {
                date = dateText.split('-');
                show_history(parseInt(date[0]), parseInt(date[1]), parseInt(date[2]));
            }
        });

        // Show and update everything
        $('div#tasks').show();
        tools_pulsate();
        rebuild_totals();
        rebuild_charts();
        check_width();
    } catch(e) {
        js_error(e);
    }
});

// Rebuild the task list
function rebuild_list() {
    var scroll = $(window).scrollTop();
    editing_task = -1;
    $('table#task-list tbody').empty().removeClass('editing-name editing-current editing-goal');

    for(var i = 0; i < task_count; i++) {
        list_task(i, 0);
    }

    $(window).scrollTop(scroll);
    $('table#task-list').tableDnDUpdate();
    rebuild_totals();
    rebuild_charts();
}

// Rebuild the totals row
function rebuild_totals() {
    if(task_count > 0) {
        var current_hours = 0, current_mins = 0, current_secs = 0, goal_hours = 0, goal_mins = 0, dec_current = 0, dec_this_current, dec_this_goal, progress, i;

        // Get the total hours, minutes, and seconds
        for(var t = 0; t < task_count; t++) {
            if(!TaskSetting('exclude-totals', t)) {
                current_hours += tasks[t].current_hours;
                current_mins += tasks[t].current_mins;
                current_secs += tasks[t].current_secs;

                if(!tasks[t].indefinite) {
                    goal_hours += tasks[t].goal_hours;
                    goal_mins += tasks[t].goal_mins;

                    // Don't add excess time spent
                    dec_this_current = tasks[t].current_hours + (tasks[t].current_mins / 60) + (tasks[t].current_secs / 3600);
                    dec_this_goal = tasks[t].goal_hours + (tasks[t].goal_mins / 60);
                    dec_current += dec_this_current > dec_this_goal ? dec_this_goal : dec_this_current;
                }
            }
        }

        // Fix things like 12:72:142
        if(current_secs > 59) {
            current_mins += Math.floor(current_secs / 60);
            current_secs %= 60;
        }
        if(current_mins > 59) {
            current_hours += Math.floor(current_mins / 60);
            current_mins %= 60;
        }
        if(goal_mins > 59) {
            goal_hours += Math.floor(goal_mins / 60);
            goal_mins %= 60;
        }

        // Get the total progress done
        progress = Math.floor(dec_current / (goal_hours + (goal_mins / 60)) * 100);
        if(isNaN(progress)) progress = 0;

        // Display
        $('table#task-list tfoot td.current').text(format_time(current_hours, current_mins, current_secs));
        $('table#task-list tfoot td.goal').text(format_time(goal_hours, goal_mins, 0));
        $('table#task-list tfoot progress').text(progress.toString() + '%').val(progress);

        if(task_count >= 2) $('table#task-list tfoot').fadeIn(); else $('table#task-list tfoot').fadeOut();
    }
}

// Update the pie charts
function rebuild_charts() {
    if(Setting('enable-charts') && typeof tasks[0] != 'undefined') {
        var plot_data = [], total_time = 0, t, i;

        // Get the total of all times
        for(var t = 0; t < task_count; t++) {
            if(!TaskSetting('exclude-charts', t)) total_time += (tasks[t].current_hours) + (tasks[t].current_mins / 60) + (tasks[t].current_secs / 3600);
        }

        // Display charts container
        if(total_time > 0) $('#charts').fadeIn(); else $('#charts').fadeOut();

        // Build the time spent chart
        var i = 0;
        for(var t = 0; t < task_count; t++) {
            if(!TaskSetting('exclude-charts', t)) {
                plot_data[i] = {
                    label: tasks[t].text,
                    data: ((tasks[t].current_hours) + (tasks[t].current_mins / 60) + (tasks[t].current_secs / 3600)) / total_time * 100
                };

                i++;
            }
        }


        // Display the time spent chart
        if(current_plot) {
            /*current_plot.setData(plot_data);
            current_plot.setupGrid();
            current_plot.draw();*/
            current_plot = $.plot($('#current-pie-chart'), plot_data, {
                series: {
                    pie: {
                        show: true
                    }
                },

                legend: {
                    show: false
                }
            });
        } else {
            current_plot = $.plot($('#current-pie-chart'), plot_data, {
                series: {
                    pie: {
                        show: true
                    }
                },

                legend: {
                    show: false
                }
            });
        }
    } else {
        $('#charts').fadeOut();
    }
}

// Verify the format of the custom sound URL
function verify_custom_sound(from_btn) {
    if($('#play-sound').attr('checked') && $('#sound-type').val() == 2) {
        var url = $('#custom-sound').val();

        if(url.match(/^(((ht|f)tp(s?))\:\/\/).+$/i)) {
            // URLs! Interwebs!
            $('#custom-sound').removeClass('invalid');
            return true;
        } else if(url.match(/^(file\:\/\/)?(([a-z]\:(\\|\/))|\/).+$/i) && (!no_local_files_alerted || from_btn)) {
            // Local files can't be used
            alert(locale('noteNoLocalFiles'));
            no_local_files_alerted = true;
        } else {
            // No format recognised
            $('#custom-sound').addClass('invalid');
        }

        return false;
    } else {
        $('#custom-sound').removeClass('invalid');
        return true;
    }
}

// Check window width - if it's small, ask if they want to use icons
function check_width() {
    if($(window).width() < 1440) {
        if(!Setting('small-window-alerted', false, true) && !Setting('use-icons') && confirm(locale('confSmallWindow'))) {
            Setting('use-icons', true);
            LoadSettings();
        }

        Setting('small-window-alerted', true);
    }
}

// The little pulsate effect on the tools button
function tools_pulsate() {
    if(Setting('new-tools', true, true)) {
        $('#tools-pulsate').animate({width: '150px', height: '150px'}, 800).animate({width: '75px', height: '75px'}, 800);
        setTimeout(tools_pulsate, 1600);
    }
}

// Save the task data in localStorage
function SaveTasks(timeout) {
    if(timeout) load.show();
    $('button.delete, #new-btn').attr('disabled', 'disabled');

    // Save task data
    localStorage['tasks'] = JSON.stringify(tasks);

    // Save current new task field contents
    if(Setting('save-fields')) {
        Setting('field-name', $('#new-txt').val());
        Setting('field-hours', $('#new-goal-hours').val());
        Setting('field-mins', $('#new-goal-mins').val());
        Setting('field-indef', $('#new-goal-indef').is(':checked'));
        Setting('field-start', $('#new-start').is(':checked'));
    }

    // Increment the autosave counter
    if(timeout) { autosaves++; }

    // Sync every 10 autosaves
    if(!timeout || autosaves % 10 == 0 || !synced) {
        SendTasks();
        synced = true;
    }

    // Timeout
    clearTimeout(save_timer);
    save_timer = setTimeout(function() { SaveTasks(true) }, 60000);

    $('button.delete, #new-btn').removeAttr('disabled');
    if(timeout) load.hide();
}