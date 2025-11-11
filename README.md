# Twig SASS Skeleton

Generate a SASS skeleton from your HTML/Twig markup with a live preview in a sidebar.  
The extension nests selectors, respects common BEM patterns, and ignores Bootstrap utility classes to keep the output focused on your own components.

## Features

- Live sidebar preview that updates as you type
- One-click “Copy to Clipboard”
- BEM-aware nesting: `&__element` and `&--modifier` shorthands when applicable
- Filters out Bootstrap utility/layout classes (e.g., spacing, grid, display) from the skeleton
- Works with HTML, Twig, PHP, and Blade files
- Lightweight, read-only parsing (uses Cheerio)

## Requirements

- VS Code >= 1.105.0 or Cursor >= 2.0.0

## Commands

- Show SASS Skeleton Sidebar  
  - Command ID: `twig-sass-skeleton.showSidebar`  
  - Default keybinding: `Cmd+Shift+S` (macOS)

Note: `Cmd+Shift+S` conflicts with “Save As…” on macOS. If desired, change the keybinding via Keyboard Shortcuts and search for “Show SASS Skeleton Sidebar”.

## Usage

1. Open an `.html`, `.twig`, `.php`, or `.blade` file.
2. Run “Show SASS Skeleton Sidebar” (or press the keybinding).
3. The panel shows the generated SASS and updates live as you edit.
4. Click “Copy to Clipboard” to copy the skeleton.

## How it works

- Parses the current editor content using Cheerio (HTML-like parsing).
- Builds nested SASS blocks from element class names.
- Applies BEM shorthands when a child class shares the same block base:
  - `block__element` → `&__element`
  - `block--modifier` → `&--modifier`
  - `block-suffix` → `&-suffix`
- Ignores many Bootstrap classes (grid, spacing, text/bg helpers, etc.) so your component structure is the focus.
- Debounced live updates (≈400ms) while you type.

## Extension Settings

No settings yet.

## Known limitations

- Only class-based selectors are generated; IDs/attributes are not reflected.
- The default keybinding may conflict with macOS “Save As…”.

## Development

- Prereqs: Node.js 18+
- Install: `npm install`
- Run (watch): `npm run watch`
- Launch: Press F5 in VS Code to “Run Extension”
- Lint: `npm run lint`
- Test: `npm test`
- Package build: `npm run package`

## Release Notes

### 0.0.1
- Initial release: live SASS skeleton preview with BEM support and Bootstrap filtering.

See `CHANGELOG.md` for future updates.
