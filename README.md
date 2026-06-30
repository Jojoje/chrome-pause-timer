# Mindful Site Timer

Mindful Site Timer is a Chrome extension that helps you avoid doom-scrolling by applying daily time limits to selected sites and showing a short reflective pause before you continue.

## Features

- Add rules for specific sites or specific paths, such as https://www.youtube.com/shorts
- Choose whether each rule includes subdomains
- Set a daily allowance in minutes, or leave empty for immediate block mode
- Track active-tab usage in the background
- Show a full-screen pause overlay when the allowance is reached
- Offer quick extension choices for today only (1, 2, 5, 10 minutes)
- Reset usage at local midnight or a custom reset time
- Store everything locally in Chrome storage

## Privacy

- No ads
- No analytics
- No remote servers
- No external tracking
- No data export by default

All extension state is stored on-device using Chrome local extension storage.

## Installation (Developer Mode)

1. Open Chrome and go to chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select this project folder

## Usage

1. Open extension Settings
2. Add a URL you want to control
3. Optionally enable Include subdomains
4. Set allowed minutes per day, or leave empty for immediate block mode
5. Browse as usual
6. When limit is reached, complete the pause countdown and pick extra time if needed

## Rule Behavior

- Host-only rules: example.com applies only to that host by default
- Subdomain rules: enable Include subdomains to include m.example.com, old.example.com, and more
- Path rules: https://www.youtube.com/shorts applies to /shorts and child paths under /shorts

## Project Structure

- service-worker.js: background event coordinator
- background/common.js: shared constants and utility helpers
- background/rules-service.js: rule/settings/state operations
- background/usage-tracker.js: active-tab time tracking and cleanup
- content-script.js: blocking overlay and media pause handling
- options.html, options.css, options.js: settings UI
- popup.html, popup.js: quick launcher UI

## Development Notes

- Manifest Version: MV3
- Background Worker Type: module
- Target Browser: Chrome

## License

This project is released under The Unlicense. You can use, modify, distribute, and sell it without restriction.
