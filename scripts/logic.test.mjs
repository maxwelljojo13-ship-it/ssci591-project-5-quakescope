import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterEvents, sortEvents, depthGroup, csvFor, START, END } from '../dist/logic.js';
const data = JSON.parse(readFileSync(new URL('../dist/data/earthquakes.geojson', import.meta.url)));
test('archive is genuine, complete for its stated interval, and geographically valid', () => {
  assert.ok(data.features.length > 100);
  assert.equal(data.metadata.count, data.features.length);
  assert.equal(new Set(data.features.map(f => f.id)).size, data.features.length);
  for (const f of data.features) {
    assert.equal(f.geometry.type, 'Point');
    const [lon, lat, depth] = f.geometry.coordinates;
    assert.ok(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90 && Number.isFinite(depth));
    assert.ok(f.properties.time >= START && f.properties.time < END && f.properties.mag >= 4.5);
    assert.equal(new URL(f.properties.url).hostname, 'earthquake.usgs.gov');
  }
});
test('weekly filters partition January without dropping late hours of the last day', () => {
  const groups = ['1:7','8:14','15:21','22:31'].map(period => filterEvents(data.features, {period}));
  assert.equal(groups.reduce((a,g) => a + g.length,0), data.features.length);
  const late = {properties:{mag:5,time:Date.UTC(2024,0,7,23,59,59),place:'Test'},geometry:{coordinates:[0,0,10]}};
  assert.equal(filterEvents([late],{period:'1:7'}).length,1);
  assert.equal(filterEvents([late],{period:'8:14'}).length,0);
});
test('depth classes include exact boundaries once', () => {
  assert.equal(depthGroup(69.999),'shallow'); assert.equal(depthGroup(70),'intermediate');
  assert.equal(depthGroup(300),'intermediate'); assert.equal(depthGroup(300.001),'deep');
  assert.equal(['shallow','intermediate','deep'].reduce((n,depth)=>n+filterEvents(data.features,{depth}).length,0),data.features.length);
});
test('combined filters, search and magnitude sort operate on actual records', () => {
  const selected = filterEvents(data.features,{magnitude:5,search:'  JAPAN ',depth:'shallow'});
  assert.ok(selected.length > 0); assert.ok(selected.every(f=>f.properties.mag>=5&&f.properties.place.toLowerCase().includes('japan')&&f.geometry.coordinates[2]<70));
  const sorted = sortEvents(selected); assert.ok(sorted.every((f,i)=>i===0||sorted[i-1].properties.mag>=f.properties.mag));
  assert.equal(filterEvents(data.features,{search:'no-such-location-xyz'}).length,0);
});
test('CSV correctly escapes places and contains UTC timestamps', () => {
  const f = structuredClone(data.features[0]); f.properties.place = 'A, "B"';
  const text = csvFor([f]); assert.ok(text.includes('"A, ""B"""')); assert.ok(text.includes('2024-01-')); assert.ok(text.includes('Z"'));
});
