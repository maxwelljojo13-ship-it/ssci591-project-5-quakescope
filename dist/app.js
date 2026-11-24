import { filterEvents, sortEvents, depthGroup, csvFor } from './logic.js';

const $ = id => document.getElementById(id);
const colors = { shallow: '#f29a65', intermediate: '#6dc9c3', deep: '#bf9fe8' };
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const state = { features: [], filtered: [], shown: 20, selected: null, markers: new Map() };
const map = L.map('map', { zoomControl: false, scrollWheelZoom: false, minZoom: 0, zoomSnap: 0.25, zoomDelta: 0.5, maxZoom: 6, maxBounds: [[-85, -205], [85, 205]], maxBoundsViscosity: 0.8 });
L.control.zoom({ position: 'topright' }).addTo(map);
map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>');
map.attributionControl.addAttribution('USGS · Natural Earth');
const base = L.layerGroup().addTo(map), points = L.layerGroup().addTo(map);

function worldView() { map.fitBounds([[-57, -179], [75, 179]], { padding: [14, 14], animate: false }); }
worldView();
// Refit the full extent when the viewport changes; fractional zoom keeps the
// complete world visible on a phone instead of clipping the eastern hemisphere.
const resizeObserver = new ResizeObserver(() => { map.invalidateSize(); worldView(); });
resizeObserver.observe($('map'));

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function officialLink(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'earthquake.usgs.gov' ? u.href : null; } catch { return null; }
}
function popup(f) {
  const p = f.properties, [lon, lat, z] = f.geometry.coordinates;
  const box = el('div');
  box.append(el('div', `M ${p.mag.toFixed(1)}`, 'popup-mag'), el('strong', p.place, 'popup-title'));
  const grid = el('div', undefined, 'popup-grid');
  for (const [label, value] of [['Depth', `${z.toFixed(1)} km`], ['Type', depthGroup(z)], ['Latitude', `${lat.toFixed(3)}°`], ['Longitude', `${lon.toFixed(3)}°`]]) {
    const item = el('div', label); item.append(el('b', value)); grid.append(item);
  }
  box.append(grid, el('p', `${fmt.format(p.time)}, 2024 UTC`, 'popup-date'));
  const safeURL = officialLink(p.url);
  if (safeURL) { const a = el('a', 'View the USGS event', 'popup-source'); a.href = safeURL; a.target = '_blank'; a.rel = 'noopener noreferrer'; box.append(a); }
  return box;
}
function choose(f, move = true) {
  state.selected = f.id;
  const marker = state.markers.get(f.id);
  if (!marker) return;
  if (move) { map.setView(marker.getLatLng(), Math.max(map.getZoom(), 4), { animate: false }); $('map').scrollIntoView({ behavior: 'auto', block: 'center' }); }
  marker.openPopup();
  document.querySelectorAll('.event').forEach(node => node.classList.toggle('selected', node.dataset.event === f.id));
}
function renderList() {
  const list = $('event-list'); list.replaceChildren();
  if (!state.filtered.length) list.append(el('p', 'No events match these filters. Lower the magnitude or reset your filters.', 'empty'));
  state.filtered.slice(0, state.shown).forEach(f => {
    const p = f.properties, z = f.geometry.coordinates[2];
    const btn = el('button', undefined, 'event'); btn.type = 'button'; btn.dataset.event = f.id;
    btn.setAttribute('aria-label', `Show magnitude ${p.mag.toFixed(1)}, ${p.place}, ${fmt.format(p.time)} UTC on the map`);
    btn.classList.toggle('selected', state.selected === f.id);
    btn.append(el('span', p.mag.toFixed(1), `mag-badge ${depthGroup(z)}`));
    const info = el('span', undefined, 'event-info');
    info.append(el('strong', p.place), el('small', `${fmt.format(p.time)} UTC · ${z.toFixed(1)} km deep`));
    btn.append(info); btn.addEventListener('click', () => choose(f)); list.append(btn);
  });
  $('show-more').hidden = state.filtered.length <= state.shown;
  $('list-count').textContent = `${Math.min(state.shown, state.filtered.length)} of ${state.filtered.length} events shown`;
}
function render() {
  state.filtered = sortEvents(filterEvents(state.features, { magnitude: $('magnitude').value, depth: $('depth').value, period: $('period').value, search: $('search').value }), $('sort').value);
  if (!state.filtered.some(f => f.id === state.selected)) state.selected = null;
  points.clearLayers(); state.markers.clear();
  [...state.filtered].reverse().forEach(f => {
    const [lon, lat, z] = f.geometry.coordinates;
    const marker = L.circleMarker([lat, lon], { radius: 3 + (f.properties.mag - 4) * 3, weight: 1, color: colors[depthGroup(z)], fillColor: colors[depthGroup(z)], fillOpacity: 0.7 });
    marker.bindPopup(() => popup(f), { maxWidth: 280, autoPanPadding: [22, 22] });
    marker.on('click', () => choose(f, false)); marker.addTo(points); state.markers.set(f.id, marker);
  });
  $('event-count').textContent = state.filtered.length.toLocaleString('en-US');
  $('max-mag').textContent = state.filtered.length ? `M ${Math.max(...state.filtered.map(f => f.properties.mag)).toFixed(1)}` : '—';
  $('fit-results').disabled = !state.filtered.length; $('download').disabled = !state.filtered.length;
  renderList();
}
async function load() {
  $('retry').hidden = true; $('load-status').classList.remove('error'); $('load-status').textContent = 'Loading the USGS archive…';
  try {
    const responses = await Promise.all([fetch('data/earthquakes.geojson'), fetch('data/countries.geojson')]);
    if (responses.some(r => !r.ok)) throw new Error('Data request failed');
    const [events, countries] = await Promise.all(responses.map(r => r.json()));
    if (events.type !== 'FeatureCollection' || !Array.isArray(events.features)) throw new Error('Invalid earthquake data');
    base.clearLayers();
    for (let lon = -180; lon <= 180; lon += 30) L.polyline([[-80, lon], [80, lon]], { color: '#365063', weight: 0.6, opacity: 0.6, interactive: false }).addTo(base);
    for (let lat = -60; lat <= 60; lat += 30) L.polyline([[lat, -180], [lat, 180]], { color: '#365063', weight: 0.6, opacity: 0.6, interactive: false }).addTo(base);
    L.geoJSON(countries, { style: { fillColor: '#385165', fillOpacity: 1, color: '#587183', weight: 0.55 }, onEachFeature: (f, layer) => layer.bindTooltip(f.properties.name, { sticky: true }) }).addTo(base);
    state.features = events.features; render();
    $('load-status').textContent = `${events.features.length.toLocaleString('en-US')} archived USGS events · All dates are UTC`;
  } catch (error) {
    $('load-status').textContent = 'The archive could not load. Check your connection and retry.';
    $('load-status').classList.add('error'); $('retry').hidden = false;
    console.error('Unable to load the local earthquake archive:', error);
  }
}
$('filter-form').addEventListener('input', () => { state.shown = 20; render(); });
$('filter-form').addEventListener('submit', event => event.preventDefault());
$('filter-form').addEventListener('reset', () => { requestAnimationFrame(() => { state.shown = 20; state.selected = null; render(); worldView(); }); });
$('sort').addEventListener('change', () => { state.shown = 20; render(); });
$('show-more').addEventListener('click', () => { state.shown += 20; renderList(); });
$('fit-results').addEventListener('click', () => { if (state.filtered.length) map.fitBounds(L.latLngBounds(state.filtered.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]])), { padding: [65, 75], maxZoom: 5, animate: false }); });
$('world-view').addEventListener('click', worldView);
$('retry').addEventListener('click', load);
$('download').addEventListener('click', () => { const a = el('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csvFor(state.filtered)], { type: 'text/csv;charset=utf-8' })); a.download = 'quakescope-january-2024-filtered.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
$('about-button').addEventListener('click', () => $('about-dialog').showModal());
$('close-about').addEventListener('click', () => $('about-dialog').close());
load();
