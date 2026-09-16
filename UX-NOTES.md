# Courtside UX refresh

The dev branch preserves the existing Dexie schema and normalized shot coordinates.

## Problems addressed

- The start screen offered no next step or recent activity. Added a clear new-match action, roster counts, recent matches, and a useful empty state.
- Creating teams and matches required disconnected browser prompts. Replaced these with labeled, keyboard-accessible dialogs, validation, sensible opposing-team defaults, and direct entry into tracking.
- Player selection appeared after the court. Moved the roster before the court on phones and beside it on larger screens. Added step guidance and explicit selected shot-type states.
- Unfinished shots could carry across players or matches. Reset drafts on context changes and prevent changes while saving.
- Shot-type filters changed the plotted shots but not summary statistics. Both use the same filters now; match selection visibly updates too.
- Long filters and ten competing statistics buried the court. Collapsed match selection, emphasized four primary statistics, and summarized shot-type breakdowns.
- Statistics canvases could accept tracking clicks. Statistics and screenshot reports are read-only.
- Fixed-width canvas rendering did not follow orientation changes. Canvas sizing now observes its container.
- Root-relative PWA paths failed under the GitHub Pages project path. Assets, manifest launch URL, and service worker are relative; preview caches are scoped separately.

## Screenshot export

Select a player in tracking or open player statistics, then choose **Export**. The report includes the current player, team/match, active filter scope, shot map, and totals. It fills the browser viewport in portrait and landscape. **Full screen** uses the browser fullscreen API where supported. **Hide controls** gives a clean screenshot; tapping the report restores controls. **Save PNG** downloads the report at the device pixel ratio. Exit or Escape returns to the original view without changing data or filters.

Mobile Safari may keep browser chrome visible because fullscreen support varies. The viewport report and PNG download work without that API. Physical-device Safari testing remains advisable.

## Testing and deployment

Run locally with `python3 -m http.server 4173`. The browser regression script in `tests/ux-smoke.cjs` expects Playwright (set `PLAYWRIGHT_MODULE` if installed outside this project) and supports `CHROME_PATH` for an installed Chrome binary. It creates data only in a fresh, isolated browser context.

Commit on `dev`, push it, then run `scripts/deploy-preview.sh`. It publishes the exact current `origin/main` at the existing root and the committed dev app at `/dev/`, on a generated `gh-pages` branch. GitHub Pages uses that branch. Rerun the script after changes to either branch; publication is manual. Production code remains on `main`.

The preview uses `ShotTrackerDB-dev`, separate from production's `ShotTrackerDB`, so it starts empty and test shots do not alter production data. Existing browser/device-local data does not sync to another device.
