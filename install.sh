#!/bin/bash
# claude-code-statusline installer (macOS / Linux)
# Usage: bash install.sh

set -e

SETTINGS_DIR="$HOME/.claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.json"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_DEST="$SETTINGS_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org/"
  exit 1
fi

echo "Node.js $(node -v) detected."

# Ask where to install the script
echo ""
echo "Where should statusline.js be installed?"
read -p "Path [$DEFAULT_DEST]: " DEST_DIR
DEST_DIR="${DEST_DIR:-$DEFAULT_DEST}"

# Expand ~ if present
DEST_DIR="${DEST_DIR/#\~/$HOME}"

# Create destination dir if needed
mkdir -p "$DEST_DIR"

# Copy script
cp "$SOURCE_DIR/statusline.js" "$DEST_DIR/statusline.js"
SCRIPT_PATH="$DEST_DIR/statusline.js"
echo "Installed statusline.js to $SCRIPT_PATH"

# Create .claude dir if needed
mkdir -p "$SETTINGS_DIR"

# Backup existing settings
if [ -f "$SETTINGS_FILE" ]; then
  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  echo "Backed up existing settings to $SETTINGS_FILE.bak"
fi

# Check if settings.json exists and has content
if [ -f "$SETTINGS_FILE" ] && [ -s "$SETTINGS_FILE" ]; then
  # Check if statusLine already configured
  if grep -q '"statusLine"' "$SETTINGS_FILE" 2>/dev/null; then
    echo ""
    echo "Warning: statusLine is already configured in $SETTINGS_FILE"
    echo "Current config:"
    node -e "const s=require('$SETTINGS_FILE'); console.log(JSON.stringify(s.statusLine, null, 2))"
    echo ""
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted. No changes made."
      exit 0
    fi
  fi

  # Update settings with statusLine
  node -e "
    const fs = require('fs');
    const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    settings.statusLine = {
      type: 'command',
      command: 'node $SCRIPT_PATH',
      padding: 0
    };
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2) + '\n');
  "
else
  # Create new settings file
  cat > "$SETTINGS_FILE" << EOF
{
  "statusLine": {
    "type": "command",
    "command": "node $SCRIPT_PATH",
    "padding": 0
  }
}
EOF
fi

echo ""
echo "Done! statusLine configured in $SETTINGS_FILE"
echo "Script: $SCRIPT_PATH"
echo ""
echo "Restart Claude Code to see the statusline."
