#!/bin/bash

# Target UUID and folder
UUID="utodo@abhay.projects"
TARGET_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "==========================================="
echo " Installing uTodo GNOME Shell Extension..."
echo "==========================================="

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy source files to target path
cp -v metadata.json extension.js stylesheet.css "$TARGET_DIR/"

echo "-------------------------------------------"
echo "Files successfully copied to GNOME extensions directory."
echo "Directory: $TARGET_DIR"
echo "-------------------------------------------"
echo ""
echo "To activate the extension, please follow these steps:"
echo "1. Reload GNOME Shell to let it recognize the new files:"
echo "   - If you are running X11: Press Alt+F2, type 'r', and press Enter."
echo "   - If you are running Wayland: Log out and log back in (recommended), or restart your PC."
echo ""
echo "2. Enable the extension using the terminal:"
echo "   gnome-extensions enable $UUID"
echo "   (Alternatively, you can open the 'Extensions' or 'Extension Manager' application and toggle it on)"
echo ""
echo "==========================================="
