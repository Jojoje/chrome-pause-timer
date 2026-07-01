# Release Notes - 1.0.1

Release date: 2026-07-01

## Highlights

This release improves real-world browsing workflows with better timing accuracy across windows, better overlay behavior across tabs, and cleaner rule management UX.

## What Changed

### 1) Multi-window time tracking

Mindful Site Timer now tracks active tabs in multiple visible normal windows concurrently.

Example:

- Window A: YouTube active tab
- Window B: Reddit active tab

Both tracked rules now accrue time in parallel.

### 2) Focus-gated pause countdown

The pause countdown now only progresses while the blocked tab is focused and visible.

If the user switches away, the pause timer resets and must be completed while focused.

### 3) Cross-tab unblock sync

When a user grants extension time in one blocked tab, overlays for the same rule are dismissed across other tabs.

This prevents repeated extension prompts while switching tabs.

### 4) Slower breathing animation

The breathing ring animation speed has been slowed to a calmer rhythm for a more natural breathing pace.

### 5) Better site list UX

- Removed technical day-key line.
- Simplified default rule card to URL + used time.
- Added inline edit flow with Save and Cancel.
- Improved visual separation and readability of rule cards.

## Upgrade Notes

- No migration action is required.
- Existing rules and local usage data remain intact.

## Privacy

This release keeps the same privacy model:

- Local-only storage
- No ads
- No analytics
- No remote code execution
