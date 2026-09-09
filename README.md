# GPS Track Viewer

A tiny static web app: give it a GPS tracker/dashcam log `.txt` file and it
draws the route on a map, color-coded by speed, with per-point popups and
trip stats (distance, duration, max/avg speed).

No backend, no build step, no install. Everything runs in your browser.

## Usage

Just open [index.html](index.html) in a browser — or serve the folder with
any static file server, e.g.:

```bash
npx serve .
```

Then drag a `.txt` log onto the drop zone (or click it to pick a file, or
paste raw log text). Try [sample-data/sample-track.txt](sample-data/sample-track.txt)
to see it in action.

## Log format

```
<index>\t<timestamp>,<flagB>,<flagA>,<speed>km/h,<lat>,<lon>,<eventFlag>,<videoFile>
```

See [AGENTS.md](AGENTS.md) for the full format notes and project conventions.

## Development

This repo is set up for agentic AI development. [AGENTS.md](AGENTS.md) is
the source of truth for project conventions and is imported by
[CLAUDE.md](CLAUDE.md) for Claude Code.
