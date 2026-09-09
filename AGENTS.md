# AGENTS.md

Instructions for any AI coding agent (Claude Code, or otherwise) working in this repository.

## Project

GPS Track Viewer — a static, client-side web app. The user provides a GPS
tracker/dashcam log `.txt` file (drag-drop, file picker, or pasted text) and
the app plots the route on an OpenStreetMap/Leaflet map, color-coded by
speed, with point popups and summary stats (distance, duration, max/avg
speed).

No backend, no build step, no dependencies to install. Everything runs in
the browser; Leaflet is loaded from a CDN.

## Files

- [index.html](index.html) — page structure (dropzone, paste panel, stats panel, legend, map container).
- [style.css](style.css) — all styling. Dark theme by default; keep it self-contained (no external CSS frameworks).
- [parser.js](parser.js) — pure parsing logic: `parseGPSLog(rawText) -> { points, skipped }`. No DOM access. Keep it testable in isolation.
- [app.js](app.js) — DOM wiring, Leaflet rendering, stats computation, and date/date-range filtering. Depends on `parser.js` and the global `L` (Leaflet) loaded in `index.html`. Keeps the full parsed log in `allPoints`; the date dropdown and From/To range inputs filter down to a subset and re-render from it — `renderTrack()` never mutates `allPoints`, so Reset always has the original data to go back to.
- [sample-data/](sample-data/) — a small real-world sample log for manual testing.

## Log format

One comma-separated record per line:

```
<timestamp>,<flagB>,<flagA>,<speed>km/h,<lat>,<lon>,<eventFlag>,<videoFile>
```

Example:

```
2026-05-23 11:02:24,B,A,000km/h,6.722485,79.907490,1,20260523-190154-068420.MP4
```

Some exports prepend a `<row index>\t` before the record (a per-row counter
added by whatever viewer wrote it out, not part of the GPS payload itself).
The parser tolerates an optional leading `\t`-separated index and strips it
before splitting on commas, so both forms work.

- `timestamp`: `YYYY-MM-DD HH:MM:SS`, parsed as local time.
- `flagB` / `flagA`: near-constant fields of unknown meaning in observed samples; currently ignored by the parser but kept in mind — do not assume they're always literally `"B"`/`"A"`.
- `speed`: digits followed by `km/h` (e.g. `023km/h`).
- `lat` / `lon`: decimal degrees.
- `eventFlag`: 0/1, likely marks an event/incident frame. Not currently used in the UI beyond being available on each point — a reasonable future feature is highlighting event points distinctly.
- `videoFile`: associated dashcam video filename, shown in point popups.

The parser must tolerate malformed/short lines by skipping them (and reporting a skipped count) rather than throwing, since real-world logs can have partial trailing writes.

## Conventions

- Keep this app dependency-free beyond the Leaflet CDN include. Don't introduce a bundler, framework, or npm install step unless the user explicitly asks for one — the whole point is "open `index.html` and it works."
- `parser.js` stays framework/DOM-free so parsing logic can be reasoned about and tested independently of rendering.
- No inline `<script>` blocks in `index.html` — all JS lives in `parser.js` / `app.js`.
- Match the existing dark theme (CSS custom properties in `style.css`) rather than hardcoding new colors.
- Prefer small, focused edits over rewrites. This is a simple app; resist the urge to over-engineer it (no state management libraries, no routing, no backend) unless requirements genuinely grow to need them — ask the user first.

## Testing changes

There's no automated test suite. To verify changes:

1. Open `index.html` directly in a browser (or serve the folder with any static file server).
2. Load `sample-data/sample-track.txt` via the drop zone and confirm the route renders, coloring looks sane, stats populate, and point popups show timestamp/speed/coordinates.
3. Try the paste-text path with a few lines pasted into the textarea.
4. Try an invalid/empty input and confirm the error message shows instead of a crash.
