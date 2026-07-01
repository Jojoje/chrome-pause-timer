# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-07-01

### Added

- Concurrent multi-window tracking of active tabs in visible normal windows.
- Rule editing support from the site list (inline edit with save/cancel).
- Cross-tab overlay dismissal when time is extended on one tab for the same rule.

### Changed

- Pause countdown now requires tab focus and visibility.
- Pause countdown resets if the tab loses focus before completion.
- Breathing animation speed adjusted to a slower rhythm.
- Site list cards simplified to show URL and used time by default.
- Site list visual hierarchy improved for better readability.
- Extension version bumped to 1.0.1.

### Fixed

- Time usage now increments for tracked sites in separate visible windows instead of only the focused window.
- Overlay state now stays consistent across multiple tabs under the same rule when extension time is granted.

## [1.0.0] - 2026-06-30

### Added

- Initial public release.
- Per-site and path-based daily limits.
- Optional subdomain matching per rule.
- Immediate block mode when no daily allowance is set.
- Mindful pause overlay with extension-time choices.
- Local-only storage model with no remote services.
- Chrome Web Store submission docs and privacy text assets.
