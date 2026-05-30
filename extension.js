import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

// Custom interactive task item widget
const TodoTaskItem = GObject.registerClass({
    GTypeName: 'TodoTaskItem'
}, class TodoTaskItem extends PopupMenu.PopupBaseMenuItem {
    _init(task, onToggle, onDelete, onEdit, onMoveUp, onMoveDown, isFirst, isLast, showOrganizer) {
        super._init({
            reactive: true,
            can_focus: true,
            style_class: 'utodo-task-item'
        });

        this.task = task;
        this._onToggle = onToggle;
        this._onEdit = onEdit;
        this._editing = false;

        // Checkbox status button
        this.checkboxBtn = new St.Button({
            style_class: 'utodo-checkbox-btn',
            reactive: true,
            can_focus: true
        });
        this.checkboxIcon = new St.Icon({
            icon_name: this.task.completed ? 'checkbox-checked-symbolic' : 'checkbox-symbolic',
            style_class: this.task.completed ? 'utodo-checkbox-icon-checked' : 'utodo-checkbox-icon'
        });
        this.checkboxBtn.set_child(this.checkboxIcon);
        
        this.checkboxBtn.connect('clicked', () => {
            this._onToggle(this.task.id);
            return true;
        });
        this.add_child(this.checkboxBtn);

        // Task label
        this.label = new St.Label({
            text: this.task.text,
            style_class: this.task.completed ? 'utodo-task-label utodo-task-label-completed' : 'utodo-task-label',
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true
        });
        this.add_child(this.label);

        // Reorder Up button
        this.upBtn = new St.Button({
            style_class: 'utodo-reorder-btn',
            reactive: showOrganizer && !isFirst,
            can_focus: showOrganizer && !isFirst,
            visible: showOrganizer && !isFirst
        });
        this.upIcon = new St.Icon({
            icon_name: 'go-up-symbolic',
            style_class: 'utodo-reorder-icon'
        });
        this.upBtn.set_child(this.upIcon);
        this.upBtn.connect('clicked', () => {
            onMoveUp(this.task.id);
            return true;
        });
        this.add_child(this.upBtn);

        // Reorder Down button
        this.downBtn = new St.Button({
            style_class: 'utodo-reorder-btn',
            reactive: showOrganizer && !isLast,
            can_focus: showOrganizer && !isLast,
            visible: showOrganizer && !isLast
        });
        this.downIcon = new St.Icon({
            icon_name: 'go-down-symbolic',
            style_class: 'utodo-reorder-icon'
        });
        this.downBtn.set_child(this.downIcon);
        this.downBtn.connect('clicked', () => {
            onMoveDown(this.task.id);
            return true;
        });
        this.add_child(this.downBtn);

        // Edit button
        this.editBtn = new St.Button({
            style_class: 'utodo-edit-btn',
            reactive: !showOrganizer,
            can_focus: !showOrganizer,
            visible: !showOrganizer
        });
        this.editIcon = new St.Icon({
            icon_name: 'document-edit-symbolic',
            style_class: 'utodo-edit-icon'
        });
        this.editBtn.set_child(this.editIcon);
        this.editBtn.connect('clicked', () => {
            this.startEditing();
            return true;
        });
        this.add_child(this.editBtn);

        // Delete button
        this.deleteBtn = new St.Button({
            style_class: 'utodo-delete-btn',
            reactive: showOrganizer,
            can_focus: showOrganizer,
            visible: showOrganizer
        });
        this.deleteIcon = new St.Icon({
            icon_name: 'user-trash-symbolic',
            style_class: 'utodo-delete-icon'
        });
        this.deleteBtn.set_child(this.deleteIcon);
        this.deleteBtn.connect('clicked', () => {
            onDelete(this.task.id);
            return true;
        });
        this.add_child(this.deleteBtn);
    }

    startEditing() {
        if (this._editing) return;
        this._editing = true;

        this.label.hide();
        this.upBtn.hide();
        this.downBtn.hide();
        this.editBtn.hide();
        this.deleteBtn.hide();

        this.editEntry = new St.Entry({
            text: this.task.text,
            style_class: 'utodo-edit-entry',
            can_focus: true
        });

        // Insert after checkboxBtn (index 1)
        this.insert_child_at_index(this.editEntry, 1);

        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.editEntry.grab_key_focus();
            return GLib.SOURCE_REMOVE;
        });

        this.editEntry.clutter_text.connect('key-press-event', (widget, event) => {
            let symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
                let text = widget.get_text().trim();
                if (text.length > 0) {
                    this._onEdit(this.task.id, text);
                } else {
                    this.cancelEditing();
                }
                return Clutter.EVENT_STOP;
            } else if (symbol === Clutter.KEY_Escape) {
                this.cancelEditing();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.editEntry.clutter_text.connect('focus-out-event', () => {
            if (this._editing) {
                let text = this.editEntry.get_text().trim();
                if (text.length > 0 && text !== this.task.text) {
                    this._onEdit(this.task.id, text);
                } else {
                    this.cancelEditing();
                }
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    cancelEditing() {
        if (!this._editing) return;
        this._editing = false;

        this.editEntry.destroy();
        this.label.show();
        this.upBtn.show();
        this.downBtn.show();
        this.editBtn.show();
        this.deleteBtn.show();
    }

    // Override activate method to do nothing when clicking the task item itself
    activate(event) {
        // Do nothing - task completion should only happen via the checkbox
    }
});

// Panel Indicator class
const uTodoIndicator = GObject.registerClass({
    GTypeName: 'uTodoIndicator'
}, class uTodoIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'uTodo');

        this.extension = extension;
        this.tasksFile = GLib.get_user_config_dir() + '/utodo/tasks.json';
        this.tasks = [];

        // Set style class on the panel button itself
        this.add_style_class_name('utodo-panel-button');

        // Panel Box container
        this.panelBox = new St.BoxLayout({
            style_class: 'utodo-panel-box',
            y_align: Clutter.ActorAlign.CENTER
        });

        // Panel Icon
        this.panelIcon = new St.Icon({
            icon_name: 'checkbox-checked-symbolic',
            style_class: 'utodo-panel-icon'
        });
        this.panelBox.add_child(this.panelIcon);

        // Panel Badge for active tasks count
        this.panelBadge = new St.Label({
            text: '',
            style_class: 'utodo-panel-badge',
            y_align: Clutter.ActorAlign.CENTER
        });
        this.panelBox.add_child(this.panelBadge);
        this.panelBadge.hide(); // Hide initially by default

        this.add_child(this.panelBox);

        // Main dropdown container
        this.mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'utodo-menu-container'
        });
        this.menu.box.add_child(this.mainBox);

        // Header section (Title & Completed Stats)
        let headerBox = new St.BoxLayout({
            vertical: false,
            style_class: 'utodo-header'
        });

        let titleLabel = new St.Label({
            text: 'uTodo',
            style_class: 'utodo-title',
            y_align: Clutter.ActorAlign.CENTER
        });
        headerBox.add_child(titleLabel);

        this.statsLabel = new St.Label({
            text: 'No tasks',
            style_class: 'utodo-stats',
            y_align: Clutter.ActorAlign.CENTER
        });
        headerBox.add_child(this.statsLabel);

        this.mainBox.add_child(headerBox);

        // Pomodoro Timer State
        this.pomoDuration = 25 * 60; // 25 minutes default
        this.pomoTimeLeft = this.pomoDuration;
        this.pomoState = 'idle'; // 'idle', 'running', 'paused'
        this.pomoIntervalId = null;

        // Pomodoro Container
        this.pomoBox = new St.BoxLayout({
            vertical: true,
            style_class: 'utodo-pomo-container'
        });

        // Large MM:SS label
        this.pomoTimeLabel = new St.Label({
            text: '25:00',
            style_class: 'utodo-pomo-time',
            x_align: Clutter.ActorAlign.CENTER
        });
        this.pomoBox.add_child(this.pomoTimeLabel);

        // Presets container
        this.pomoPresetsBox = new St.BoxLayout({
            vertical: false,
            style_class: 'utodo-pomo-presets',
            x_align: Clutter.ActorAlign.CENTER
        });

        let preset20 = new St.Button({
            label: '20 Min',
            style_class: 'utodo-pomo-preset-btn',
            reactive: true,
            can_focus: true
        });
        preset20.connect('clicked', () => {
            this.setPomoPreset(20);
        });

        let preset30 = new St.Button({
            label: '30 Min',
            style_class: 'utodo-pomo-preset-btn',
            reactive: true,
            can_focus: true
        });
        preset30.connect('clicked', () => {
            this.setPomoPreset(30);
        });

        let preset40 = new St.Button({
            label: '40 Min',
            style_class: 'utodo-pomo-preset-btn',
            reactive: true,
            can_focus: true
        });
        preset40.connect('clicked', () => {
            this.setPomoPreset(40);
        });

        this.pomoPresetsBox.add_child(preset20);
        this.pomoPresetsBox.add_child(preset30);
        this.pomoPresetsBox.add_child(preset40);
        this.pomoBox.add_child(this.pomoPresetsBox);

        // Controls container
        this.pomoControlsBox = new St.BoxLayout({
            vertical: false,
            style_class: 'utodo-pomo-controls',
            x_align: Clutter.ActorAlign.CENTER
        });

        this.pomoStartPauseBtn = new St.Button({
            label: 'Start',
            style_class: 'utodo-pomo-control-btn utodo-pomo-start',
            reactive: true,
            can_focus: true
        });
        this.pomoStartPauseBtn.connect('clicked', () => {
            this.togglePomo();
        });

        this.pomoResetBtn = new St.Button({
            label: 'Reset',
            style_class: 'utodo-pomo-control-btn utodo-pomo-reset',
            reactive: true,
            can_focus: true
        });
        this.pomoResetBtn.connect('clicked', () => {
            this.resetPomo();
        });

        this.pomoControlsBox.add_child(this.pomoStartPauseBtn);
        this.pomoControlsBox.add_child(this.pomoResetBtn);
        this.pomoBox.add_child(this.pomoControlsBox);

        this.mainBox.add_child(this.pomoBox);

        this.connect('destroy', () => {
            if (this.pomoIntervalId) {
                GLib.Source.remove(this.pomoIntervalId);
                this.pomoIntervalId = null;
            }
        });


        // Input entry box container (Horizontal layout with settings button on the right)
        let entryContainer = new St.BoxLayout({
            vertical: false,
            style_class: 'utodo-entry-container',
            y_align: Clutter.ActorAlign.CENTER
        });

        this.entry = new St.Entry({
            hint_text: 'Add a new task...',
            style_class: 'utodo-entry',
            can_focus: true,
            track_hover: true,
            x_expand: true
        });

        // Connect 'key-press-event' on clutter_text to handle Enter key (activation)
        this.entry.clutter_text.connect('key-press-event', (widget, event) => {
            let symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
                let text = widget.get_text().trim();
                if (text.length > 0) {
                    this.addTask(text);
                    widget.set_text('');
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        entryContainer.add_child(this.entry);

        // Settings toggle button to switch between Edit and Organizer modes
        this.showOrganizerButtons = false;
        this.settingsBtn = new St.Button({
            style_class: 'utodo-settings-btn',
            toggle_mode: true,
            checked: this.showOrganizerButtons,
            reactive: true,
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.settingsIcon = new St.Icon({
            icon_name: 'preferences-system-symbolic',
            style_class: 'utodo-settings-icon'
        });
        this.settingsBtn.set_child(this.settingsIcon);
        this.settingsBtn.connect('clicked', () => {
            this.showOrganizerButtons = this.settingsBtn.checked;
            this.refreshMenu();
        });
        entryContainer.add_child(this.settingsBtn);

        this.mainBox.add_child(entryContainer);

        // Scrollview container for task list (keeps menu size bounded)
        this.scrollView = new St.ScrollView({
            style_class: 'utodo-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });

        this.taskList = new St.BoxLayout({
            vertical: true,
            style_class: 'utodo-task-list'
        });

        this.scrollView.set_child(this.taskList);
        this.mainBox.add_child(this.scrollView);

        // Footer clear completed button
        this.footerBox = new St.BoxLayout({
            vertical: false,
            style_class: 'utodo-footer',
            x_align: Clutter.ActorAlign.FILL
        });

        this.clearCompletedBtn = new St.Button({
            style_class: 'utodo-clear-btn',
            label: 'Clear Completed Tasks',
            x_expand: true,
            reactive: true,
            can_focus: true
        });

        this.clearCompletedBtn.connect('clicked', () => {
            this.clearCompleted();
        });

        this.footerBox.add_child(this.clearCompletedBtn);
        this.mainBox.add_child(this.footerBox);

        // Automatically focus the input box when the menu is opened
        this.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this.entry.grab_key_focus();
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        // Initial tasks loading and UI setup
        this.loadTasks();
        this.refreshMenu();
    }

    setPomoPreset(minutes) {
        if (this.pomoState !== 'idle') return;
        this.pomoDuration = minutes * 60;
        this.pomoTimeLeft = this.pomoDuration;
        this.updatePomoUI();
    }

    togglePomo() {
        if (this.pomoState === 'running') {
            this.pomoState = 'paused';
            if (this.pomoIntervalId) {
                GLib.Source.remove(this.pomoIntervalId);
                this.pomoIntervalId = null;
            }
        } else {
            this.pomoState = 'running';
            this.startPomoInterval();
        }
        this.updatePomoUI();
    }

    startPomoInterval() {
        if (this.pomoIntervalId) {
            GLib.Source.remove(this.pomoIntervalId);
        }
        this.pomoIntervalId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            if (this.pomoState !== 'running') {
                this.pomoIntervalId = null;
                return GLib.SOURCE_REMOVE;
            }
            if (this.pomoTimeLeft > 0) {
                this.pomoTimeLeft--;
                this.updatePomoUI();
                return GLib.SOURCE_CONTINUE;
            } else {
                this.pomoState = 'idle';
                this.pomoTimeLeft = this.pomoDuration;
                this.updatePomoUI();
                Main.notify('uTodo Pomodoro', 'Time is up! Take a break.');
                this.pomoIntervalId = null;
                return GLib.SOURCE_REMOVE;
            }
        });
    }

    resetPomo() {
        this.pomoState = 'idle';
        this.pomoTimeLeft = this.pomoDuration;
        if (this.pomoIntervalId) {
            GLib.Source.remove(this.pomoIntervalId);
            this.pomoIntervalId = null;
        }
        this.updatePomoUI();
    }

    updatePomoUI() {
        let minutes = Math.floor(this.pomoTimeLeft / 60);
        let seconds = this.pomoTimeLeft % 60;
        let mm = minutes.toString().padStart(2, '0');
        let ss = seconds.toString().padStart(2, '0');
        this.pomoTimeLabel.set_text(`${mm}:${ss}`);

        if (this.pomoState === 'idle') {
            this.pomoPresetsBox.show();
            this.pomoStartPauseBtn.set_label('Start');
        } else if (this.pomoState === 'running') {
            this.pomoPresetsBox.hide();
            this.pomoStartPauseBtn.set_label('Pause');
        } else if (this.pomoState === 'paused') {
            this.pomoPresetsBox.hide();
            this.pomoStartPauseBtn.set_label('Resume');
        }
    }

    loadTasks() {
        let file = Gio.File.new_for_path(this.tasksFile);
        if (!file.query_exists(null)) {
            this.tasks = [];
            return;
        }
        try {
            let [success, contents] = file.load_contents(null);
            if (success) {
                let decoder = new TextDecoder('utf-8');
                let jsonStr = decoder.decode(contents);
                this.tasks = JSON.parse(jsonStr);
                if (!Array.isArray(this.tasks)) {
                    this.tasks = [];
                }
            }
        } catch (e) {
            console.error(`uTodo: Error loading tasks: ${e.message}`);
            this.tasks = [];
        }
    }

    saveTasks() {
        let file = Gio.File.new_for_path(this.tasksFile);
        let parent = file.get_parent();
        if (!parent.query_exists(null)) {
            try {
                parent.make_directory_with_parents(null);
            } catch (e) {
                console.error(`uTodo: Error creating directory: ${e.message}`);
            }
        }
        try {
            let encoder = new TextEncoder();
            let bytes = encoder.encode(JSON.stringify(this.tasks, null, 2));
            file.replace_contents(
                bytes,
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
        } catch (e) {
            console.error(`uTodo: Error saving tasks: ${e.message}`);
        }
    }

    refreshMenu() {
        // Clear previous list
        this.taskList.destroy_all_children();

        let pending = this.tasks.filter(t => !t.completed);
        let completed = this.tasks.filter(t => t.completed);

        // Update top status bar statistics
        if (this.tasks.length === 0) {
            this.statsLabel.set_text('No tasks');
        } else {
            this.statsLabel.set_text(`${completed.length} / ${this.tasks.length} completed`);
        }

        // Update Panel badge count (only show badge when active tasks exist)
        if (pending.length > 0) {
            this.panelBadge.set_text(`${pending.length}`);
            this.panelBadge.show();
        } else {
            this.panelBadge.hide();
        }

        // Render caught-up placeholder if completely empty
        if (this.tasks.length === 0) {
            let emptyLabel = new St.Label({
                text: 'All caught up! Add a task above.',
                style_class: 'utodo-empty-label',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.taskList.add_child(emptyLabel);
            this.footerBox.hide();
            return;
        }

        // 1. Render Active (Pending) Tasks
        pending.forEach((task, idx) => {
            let item = new TodoTaskItem(
                task,
                (id) => this.toggleTask(id),
                (id) => this.deleteTask(id),
                (id, text) => this.editTask(id, text),
                (id) => this.moveTaskUp(id),
                (id) => this.moveTaskDown(id),
                idx === 0,
                idx === pending.length - 1,
                this.showOrganizerButtons
            );
            this.taskList.add_child(item);
        });

        // 2. Render Completed Tasks (with separator section)
        if (completed.length > 0) {
            let completedHeader = new St.BoxLayout({
                style_class: 'utodo-completed-header',
                vertical: false
            });
            let completedTitle = new St.Label({
                text: 'Completed Tasks',
                style_class: 'utodo-completed-title',
                y_align: Clutter.ActorAlign.CENTER
            });
            completedHeader.add_child(completedTitle);
            this.taskList.add_child(completedHeader);

            completed.forEach((task, idx) => {
                let item = new TodoTaskItem(
                    task,
                    (id) => this.toggleTask(id),
                    (id) => this.deleteTask(id),
                    (id, text) => this.editTask(id, text),
                    (id) => this.moveTaskUp(id),
                    (id) => this.moveTaskDown(id),
                    idx === 0,
                    idx === completed.length - 1,
                    this.showOrganizerButtons
                );
                this.taskList.add_child(item);
            });

            this.footerBox.show();
        } else {
            this.footerBox.hide();
        }
    }

    addTask(text) {
        let newTask = {
            id: Date.now(),
            text: text,
            completed: false
        };
        this.tasks.unshift(newTask);
        this.saveTasks();
        this.refreshMenu();
    }

    toggleTask(id) {
        let task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.refreshMenu();

            if (task.completed) {
                Main.notify('uTodo', `Task "${task.text}" marked as completed!`);
            }
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.refreshMenu();
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.refreshMenu();
    }

    editTask(id, text) {
        let task = this.tasks.find(t => t.id === id);
        if (task && text.length > 0) {
            task.text = text;
            this.saveTasks();
            this.refreshMenu();
        }
    }

    moveTaskUp(id) {
        let task = this.tasks.find(t => t.id === id);
        if (!task) return;

        let list = task.completed ? this.tasks.filter(t => t.completed) : this.tasks.filter(t => !t.completed);
        let index = list.findIndex(t => t.id === id);
        if (index > 0) {
            let temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;

            let pending = task.completed ? this.tasks.filter(t => !t.completed) : list;
            let completed = task.completed ? list : this.tasks.filter(t => t.completed);
            this.tasks = [...pending, ...completed];

            this.saveTasks();
            this.refreshMenu();
        }
    }

    moveTaskDown(id) {
        let task = this.tasks.find(t => t.id === id);
        if (!task) return;

        let list = task.completed ? this.tasks.filter(t => t.completed) : this.tasks.filter(t => !t.completed);
        let index = list.findIndex(t => t.id === id);
        if (index !== -1 && index < list.length - 1) {
            let temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;

            let pending = task.completed ? this.tasks.filter(t => !t.completed) : list;
            let completed = task.completed ? list : this.tasks.filter(t => t.completed);
            this.tasks = [...pending, ...completed];

            this.saveTasks();
            this.refreshMenu();
        }
    }
});

// Entrypoint definition for Extension
export default class uTodoExtension extends Extension {
    enable() {
        this._indicator = new uTodoIndicator(this);
        Main.panel.addToStatusArea('utodo-indicator', this._indicator);

        // Register global keyboard shortcut <Super>u to toggle dropdown window
        this._grabbedAction = global.display.grab_accelerator('<Super>u', Meta.KeyBindingFlags.NONE);
        if (this._grabbedAction !== Meta.KeyBindingAction.NONE) {
            let name = Meta.external_binding_name_for_action(this._grabbedAction);
            Main.wm.allowKeybinding(name, Shell.ActionMode.ALL);
        }

        this._acceleratorActivatedId = global.display.connect('accelerator-activated', (display, action) => {
            if (action === this._grabbedAction) {
                if (this._indicator) {
                    this._indicator.menu.toggle();
                }
            }
        });
    }

    disable() {
        if (this._acceleratorActivatedId) {
            global.display.disconnect(this._acceleratorActivatedId);
            this._acceleratorActivatedId = null;
        }

        if (this._grabbedAction && this._grabbedAction !== Meta.KeyBindingAction.NONE) {
            global.display.ungrab_accelerator(this._grabbedAction);
            this._grabbedAction = null;
        }

        this._indicator.destroy();
        this._indicator = null;
    }
}
