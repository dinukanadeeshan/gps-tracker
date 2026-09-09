(function () {
  const map = L.map('map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.setView([6.9271, 79.8612], 12); // default: Colombo, Sri Lanka

  let trackLayer = L.layerGroup().addTo(map);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const pasteArea = document.getElementById('pasteArea');
  const parsePasteBtn = document.getElementById('parsePasteBtn');
  const errorMsg = document.getElementById('errorMsg');
  const fileNameEl = document.getElementById('fileName');
  const statsPanel = document.getElementById('statsPanel');
  const legend = document.getElementById('legend');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) loadFile(file);
  });
  parsePasteBtn.addEventListener('click', () => {
    const text = pasteArea.value;
    if (!text.trim()) {
      showError('Paste some log text first.');
      return;
    }
    fileNameEl.hidden = true;
    processText(text);
  });

  function loadFile(file) {
    fileNameEl.textContent = `Loaded: ${file.name}`;
    fileNameEl.hidden = false;
    const reader = new FileReader();
    reader.onload = () => processText(reader.result);
    reader.onerror = () => showError('Could not read the file.');
    reader.readAsText(file);
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
  }
  function clearError() {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
  }

  function processText(text) {
    clearError();
    const { points, skipped } = parseGPSLog(text);

    if (points.length === 0) {
      showError('No valid GPS points found in this file. Check the format and try again.');
      statsPanel.hidden = true;
      legend.hidden = true;
      return;
    }
    if (skipped > 0) {
      showError(`Loaded ${points.length} points (${skipped} line(s) skipped as invalid).`);
    }

    renderTrack(points);
  }

  function renderTrack(points) {
    trackLayer.clearLayers();

    const maxSpeed = Math.max(...points.map((p) => p.speedKmh), 1);
    const latlngs = points.map((p) => [p.lat, p.lon]);

    // Speed-colored polyline segments
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const color = speedToColor(a.speedKmh, maxSpeed);
      L.polyline(
        [
          [a.lat, a.lon],
          [b.lat, b.lon],
        ],
        { color, weight: 4, opacity: 0.85 }
      ).addTo(trackLayer);
    }

    // Sparse point markers with popups (every point but small, to avoid overload use circleMarkers)
    const step = Math.max(1, Math.floor(points.length / 500)); // cap markers for very long tracks
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      L.circleMarker([p.lat, p.lon], {
        radius: 3,
        color: speedToColor(p.speedKmh, maxSpeed),
        fillOpacity: 0.9,
        weight: 1,
      })
        .bindPopup(pointPopupHtml(p))
        .addTo(trackLayer);
    }

    // Start / end markers
    const start = points[0];
    const end = points[points.length - 1];
    L.marker([start.lat, start.lon], { title: 'Start' })
      .bindPopup(`<strong>Start</strong><br>${pointPopupHtml(start)}`)
      .addTo(trackLayer);
    L.marker([end.lat, end.lon], { title: 'End' })
      .bindPopup(`<strong>End</strong><br>${pointPopupHtml(end)}`)
      .addTo(trackLayer);

    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });

    updateStats(points);
    updateLegend(maxSpeed);
  }

  function pointPopupHtml(p) {
    const time = p.timestampRaw || '-';
    const video = p.video ? `<br>Video: ${escapeHtml(p.video)}` : '';
    return `Time: ${escapeHtml(time)}<br>Speed: ${p.speedKmh} km/h<br>Lat/Lon: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}${video}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // green (slow) -> yellow -> red (fast)
  function speedToColor(speed, maxSpeed) {
    const ratio = maxSpeed > 0 ? Math.min(speed / maxSpeed, 1) : 0;
    const hue = (1 - ratio) * 120; // 120=green, 0=red
    return `hsl(${hue}, 85%, 45%)`;
  }

  function haversineMeters(a, b) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function updateStats(points) {
    let totalMeters = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalMeters += haversineMeters(points[i], points[i + 1]);
    }

    const speeds = points.map((p) => p.speedKmh);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    const validTimes = points.map((p) => p.timestamp).filter(Boolean);
    const startTime = validTimes[0];
    const endTime = validTimes[validTimes.length - 1];
    const durationSec = startTime && endTime ? (endTime - startTime) / 1000 : null;

    document.getElementById('statPoints').textContent = points.length.toLocaleString();
    document.getElementById('statDistance').textContent = formatDistance(totalMeters);
    document.getElementById('statDuration').textContent = durationSec != null ? formatDuration(durationSec) : '-';
    document.getElementById('statMaxSpeed').textContent = `${maxSpeed.toFixed(1)} km/h`;
    document.getElementById('statAvgSpeed').textContent = `${avgSpeed.toFixed(1)} km/h`;
    document.getElementById('statStart').textContent = startTime ? startTime.toLocaleString() : '-';
    document.getElementById('statEnd').textContent = endTime ? endTime.toLocaleString() : '-';

    statsPanel.hidden = false;
  }

  function updateLegend(maxSpeed) {
    document.getElementById('legendMin').textContent = '0 km/h';
    document.getElementById('legendMax').textContent = `${maxSpeed.toFixed(0)} km/h`;
    legend.hidden = false;
  }

  function formatDistance(meters) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }
})();
