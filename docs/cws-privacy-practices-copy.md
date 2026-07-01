# Chrome Web Store Submission Copy

Use the text below directly in the Chrome Web Store dashboard fields.

## Single Purpose Description

Mindful Site Timer helps users limit time spent on user-selected distracting websites by tracking active-tab time locally, showing a short mindful pause screen when a daily limit is reached, and allowing optional short same-day extensions.

## Permission Justifications

### storage justification

The extension uses storage to save user-configured site rules, daily limits, reset-time settings, and local usage totals required to enforce limits.

### alarms justification

The extension uses alarms to run a periodic background tick that updates active-site usage timing and daily usage housekeeping.

### tabs justification

The extension uses tabs to identify which tab is currently active so only active browsing time on tracked sites is counted.

### scripting justification

The extension uses scripting to register and run a content script on user-approved sites in order to display the pause overlay when a limit is reached.

### remote code use justification

The extension does not use remote executable code. All executable code is packaged in the extension bundle at publish time. No JavaScript, WASM, or other executable logic is fetched and executed from external servers.

## Data Usage / Compliance Certification Statement

The extension's data usage is limited to its single user-facing purpose (site time limiting). Data is stored locally, is not sold, is not shared with advertisers or data brokers, and is not used for personalized advertising.

## Contact Email Guidance

Use a monitored publisher email address that you can verify and keep active long term.

Recommended format:

- publisher@yourdomain.com
- or a dedicated mailbox tied to your Google publisher account

## Category Recommendation

Recommended category: Productivity

Alternative category: Accessibility (only if you position the product primarily as attention support)

## Dashboard Checklist

- [ ] Set category to Productivity
- [ ] Fill Single purpose description
- [ ] Add storage justification
- [ ] Add alarms justification
- [ ] Add tabs justification
- [ ] Add scripting justification
- [ ] Add remote code use justification
- [ ] Certify policy compliance on Privacy practices tab
- [ ] Add publisher contact email on Settings page
- [ ] Verify publisher contact email on Settings page
