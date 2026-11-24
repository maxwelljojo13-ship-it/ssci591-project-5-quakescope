export const START = Date.UTC(2024, 0, 1);
export const END = Date.UTC(2024, 1, 1);
export function depthGroup(depth) {
  return depth < 70 ? 'shallow' : depth <= 300 ? 'intermediate' : 'deep';
}
export function filterEvents(features, { magnitude = 4.5, depth = 'all', period = 'all', search = '' } = {}) {
  let start = START, end = END;
  if (period !== 'all') {
    const [a, b] = period.split(':').map(Number);
    start = Date.UTC(2024, 0, a);
    end = Date.UTC(2024, 0, b + 1);
  }
  const query = search.trim().toLocaleLowerCase('en');
  return features.filter(f => {
    const p = f.properties, z = f.geometry?.coordinates?.[2];
    return typeof p.mag === 'number' && Number.isFinite(p.mag) && p.mag >= Number(magnitude)
      && p.time >= start && p.time < end && Number.isFinite(z)
      && (depth === 'all' || depthGroup(z) === depth)
      && (p.place || '').toLocaleLowerCase('en').includes(query);
  });
}
export function sortEvents(features, order = 'magnitude') {
  return [...features].sort(order === 'latest'
    ? (a, b) => b.properties.time - a.properties.time
    : (a, b) => b.properties.mag - a.properties.mag || b.properties.time - a.properties.time);
}
export function csvFor(features) {
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  const rows = [['id', 'time_utc', 'magnitude', 'depth_km', 'latitude', 'longitude', 'place', 'usgs_url']];
  features.forEach(f => {
    const p = f.properties, [lon, lat, z] = f.geometry.coordinates;
    rows.push([f.id, new Date(p.time).toISOString(), p.mag, z, lat, lon, p.place, p.url]);
  });
  return rows.map(row => row.map(quote).join(',')).join('\r\n');
}
