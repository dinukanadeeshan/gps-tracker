/**
 * Parser for the GPS tracker log format, e.g.:
 * 1\t2026-05-23 11:02:24,B,A,000km/h,6.722485,79.907490,1,20260523-190154-068420.MP4
 *
 * Columns after the tab-separated index:
 *   0 timestamp        "YYYY-MM-DD HH:MM:SS"
 *   1 flagB            constant-ish field ("B")
 *   2 flagA            constant-ish field ("A")
 *   3 speed            "000km/h"
 *   4 latitude
 *   5 longitude
 *   6 eventFlag        0/1
 *   7 videoFile        associated video filename (optional)
 */
function parseGPSLog(rawText) {
  const lines = rawText.split(/\r\n|\r|\n/);
  const points = [];
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tabIdx = trimmed.indexOf('\t');
    const csvPart = tabIdx >= 0 ? trimmed.slice(tabIdx + 1) : trimmed;
    const fields = csvPart.split(',');

    if (fields.length < 6) {
      skipped++;
      continue;
    }

    const [timestampRaw, , , speedRaw, latRaw, lonRaw, flagRaw, videoRaw] = fields;

    const lat = parseFloat(latRaw);
    const lon = parseFloat(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
      skipped++;
      continue;
    }

    const speedMatch = (speedRaw || '').match(/-?\d+(\.\d+)?/);
    const speedKmh = speedMatch ? parseFloat(speedMatch[0]) : 0;

    const timestamp = parseTimestamp(timestampRaw);

    points.push({
      timestamp,
      timestampRaw: (timestampRaw || '').trim(),
      speedKmh,
      lat,
      lon,
      eventFlag: (flagRaw || '').trim(),
      video: (videoRaw || '').trim(),
    });
  }

  return { points, skipped };
}

function parseTimestamp(raw) {
  if (!raw) return null;
  const iso = raw.trim().replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
