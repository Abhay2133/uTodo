# uTodo 🗒️🍅

A simple, modern, and beautiful todo list manager and Pomodoro productivity timer right in your GNOME Shell top bar. 

---

## ✨ Features

- **Top Bar Todo Manager**: Access, add, edit, and complete tasks instantly from the GNOME status area.
- **🍅 Integrated Pomodoro Timer**:
  - Center-aligned large time display (`MM:SS`).
  - **Quick Presets**: 20 Min, 30 Min, and 40 Min timers.
  - **Dynamic Controls**: Start, Pause, Resume, and Reset capabilities.
  - **Clean UX**: Preset selectors hide automatically when active to avoid clutter.
  - **Background Persistence**: Ticks down reliably even when the dropdown is closed.
  - **GNOME Notifications**: Generates standard system notifications when your focus session ends.
- **⌨️ Global Keyboard Shortcut**:
  - Press **`Super + U`** (Windows Key + U) from anywhere in GNOME to instantly open and close the uTodo window.
- **♿ Outstanding Keyboard Accessibility**:
  - Custom glowing focus rings and high-contrast styling for every interactive element.
  - Action buttons (reorder, edit, delete) dynamically transition into view when keyboard-focused.
- **💾 Persistent JSON Storage**:
  - Save status across GNOME restarts. Stored directly in `~/.config/utodo/tasks.json`.

---

## 🛠️ Installation

Installing uTodo is fully automated using the included installation script.

### 1. Clone & Copy Files
```bash
git clone https://github.com/Abhay2133/uTodo.git
cd uTodo
./install.sh
```

### 2. Reload GNOME Shell
To let GNOME recognize the new extension files, you need to reload the shell:
- **On X11**: Press `Alt + F2`, type `r`, and press `Enter`.
- **On Wayland**: Log out of your desktop session and log back in, or restart your machine.

### 3. Enable the Extension
Enable the extension via command line:
```bash
gnome-extensions enable utodo@abhay.projects
```
*(Alternatively, open the **Extensions** or **Extension Manager** application and toggle **uTodo** on).*

---

## 🚀 Usage & Shortcuts

- **`Super + U`**: Toggle the uTodo extension dropdown.
- **`Tab` / `Arrow Keys`**: Navigate through presets, timer controls, tasks, and system preferences.
- **`Enter`**: Complete checked buttons or enter text fields.
- **`Esc`**: Close inputs / cancel editing.

---

## 📂 Project Structure

- `extension.js`: Core extension logic, GObject registrations, state machinery, global shortcuts, and Pomodoro timer.
- `stylesheet.css`: Sleek CSS stylings with glassmorphic cards, typography, transitions, and high-visibility focus states.
- `metadata.json`: GNOME extension metadata and shell compatibility.
- `install.sh`: Standard automated installation helper script.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
