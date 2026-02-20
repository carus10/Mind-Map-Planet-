const fs = require('fs')
const path = require('path')

const inFile = path.join(__dirname, '..', 'src', 'renderer', 'src', 'assets', 'ne_10m_admin_1.json')
const outFile = inFile

console.log('Loading...')
const data = JSON.parse(fs.readFileSync(inFile, 'utf8'))
console.log(`Features: ${data.features.length}`)

// Reduce coordinate precision to 3 decimal places (~111m accuracy - good enough for map display)
function roundCoords(coords) {
  if (typeof coords[0] === 'number') {
    return [Math.round(coords[0] * 1000) / 1000, Math.round(coords[1] * 1000) / 1000]
  }
  return coords.map(roundCoords)
}

// Simplify geometry by removing every Nth point for large polygons
function simplifyRing(ring, maxPoints) {
  if (ring.length <= maxPoints) return ring
  const step = Math.ceil(ring.length / maxPoints)
  const result = []
  for (let i = 0; i < ring.length; i += step) {
    result.push(ring[i])
  }
  // Always include last point to close the ring
  if (result[result.length - 1] !== ring[ring.length - 1]) {
    result.push(ring[ring.length - 1])
  }
  return result
}

function simplifyGeometry(geom) {
  if (!geom) return geom
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => simplifyRing(roundCoords(ring), 200))
    }
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map(poly => poly.map(ring => simplifyRing(roundCoords(ring), 200)))
    }
  }
  return geom
}

const slim = {
  type: 'FeatureCollection',
  features: data.features.map(f => ({
    type: 'Feature',
    properties: f.properties,
    geometry: simplifyGeometry(f.geometry)
  }))
}

const out = JSON.stringify(slim)
fs.writeFileSync(outFile, out)
console.log(`Saved: ${(out.length / 1024 / 1024).toFixed(1)} MB`)
