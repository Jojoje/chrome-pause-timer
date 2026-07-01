# Chrome Web Store Publishing Guide (Step by Step)

This guide walks you from local extension to a published Chrome Web Store listing.

## 1. Final Preflight Checks

1. Confirm extension loads and works from `Load unpacked`.
2. Confirm `manifest.json` version is correct (currently `1.0.0`).
3. Confirm release files exist:
   - `README.md`
   - `LICENSE`
4. Confirm there is no remote code loading and no analytics/tracking endpoints.
5. Confirm permissions are minimal and justified:
   - `storage`, `alarms`, `tabs`, `scripting`
   - `optional_host_permissions` only requested at runtime

## 2. Create/Prepare Chrome Web Store Developer Account

1. Go to the Chrome Web Store Developer Dashboard:
   - https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to publish under.
3. Complete developer registration requirements (including any current one-time fee if prompted).
4. Complete identity/trader verification fields if requested by the dashboard.

## 3. Prepare Store Assets

Create these before uploading:

1. Extension icon set (if you add them to manifest later):
   - Recommended: 16, 32, 48, 128 px
2. Store screenshots (required):
   - Show settings page
   - Show pause overlay
   - Show rule list with daily usage
3. Promotional images (optional but recommended):
   - Small tile / marquee assets if requested in UI
4. Store text drafts:
   - Short description
   - Full description
   - Privacy statement summary

## 4. Prepare Privacy Policy Page

Because this extension uses browsing activity to provide a user-facing feature, prepare a clear privacy policy page and public URL.

Your policy should explicitly state:

1. What data is used:
   - User-defined site rules
   - Time spent on tracked sites
2. Where data is stored:
   - Locally in browser extension storage
3. What is not done:
   - No ads
   - No analytics
   - No sale/sharing of data
   - No remote transmission of usage data
4. User control:
   - Removing rules
   - Clearing extension data by uninstall/reset workflows

Tip: Host this policy on GitHub Pages, your website, or another stable public URL.

## 5. Package the Extension

From the project root, create a ZIP of the extension source (exclude `.git` and unrelated local files).

Suggested package contents:

1. `manifest.json`
2. `service-worker.js`
3. `background/` folder
4. `content-script.js`
5. `options.html`, `options.css`, `options.js`
6. `popup.html`, `popup.js`
7. Any icons referenced by manifest
8. `LICENSE`

Do not include build artifacts or secrets.

## 6. Upload Draft to Chrome Web Store

1. In Developer Dashboard, click `New Item`.
2. Upload your ZIP file.
3. Wait for initial validation.
4. Fix any manifest or policy warnings shown by the dashboard.

## 7. Fill Listing Metadata Carefully

In the listing form:

1. Name: `Mindful Site Timer`
2. Category: choose a productivity/self-control relevant category.
3. Language: set primary language.
4. Description: accurately describe behavior, especially:
   - Tracks time on user-selected sites
   - Shows pause screen after limits
   - Local-only storage
5. Add screenshots that match real functionality.

Important: avoid claiming functionality not currently implemented.

## 8. Complete Privacy and Data Disclosures

In the privacy/data section:

1. Link your privacy policy URL.
2. Declare browsing-related usage only as needed for extension core feature.
3. Confirm no selling/sharing for advertising.
4. Ensure disclosures in listing match actual code behavior.

If any mismatch exists, update code or disclosures before submit.

## 9. Set Permissions Justification

When prompted for permission justifications, provide direct, minimal explanations:

1. `storage`: store rules/settings/usage locally.
2. `alarms`: periodic tick for usage time updates.
3. `tabs`: identify active tab for time tracking.
4. `scripting`: register content script on user-approved hosts.
5. Optional host permissions: only requested when user adds a site.

## 10. Submit for Review

1. Save all listing sections until no required fields remain.
2. Click `Submit for Review`.
3. Monitor status in dashboard.

Review time can vary from days to weeks depending on queue and risk signals.

## 11. Handle Review Feedback (If Rejected)

If rejected:

1. Read rejection reason exactly.
2. Map reason to concrete code/listing change.
3. Update extension and bump version in `manifest.json` (for example `1.0.1`).
4. Repackage ZIP and resubmit.
5. In appeal/notes, explain what was fixed clearly and briefly.

## 12. Post-Publish Maintenance

After approval:

1. Smoke test installed store version.
2. Tag release in GitHub.
3. Keep changelog notes for each update.
4. For each new release:
   - bump version
   - update listing notes
   - resubmit

## Practical Release Checklist

- [ ] Extension works end-to-end in unpacked mode
- [ ] ZIP is clean and complete
- [ ] Privacy policy URL is live
- [ ] Listing text matches real behavior
- [ ] Screenshots are current
- [ ] Permissions are justified and minimal
- [ ] Submit for review completed

---

If you want, the next step is I can draft the exact Chrome Web Store listing copy for this extension (short description, full description, and privacy disclosure text) so you can paste it directly.
