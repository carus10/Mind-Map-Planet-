const https = require('https')
const fs = require('fs')
const path = require('path')

// Natural Earth 10m admin-1 states/provinces - simplified version (smaller file)
const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

const outDir = path.join(__dirname, '..', 'src', 'renderer', 'src', 'assets')
const outFile = path.join(outDir, 'ne_10m_admin_1.json')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

console.log('Downloading Natural Earth 10m admin-1 states/provinces...')
console.log('URL:', url)

function download(targetUrl, redirectCount = 0) {
  if (redirectCount > 5) { console.error('Too many redirects'); process.exit(1) }
  
  https.get(targetUrl, { headers: { 'User-Agent': 'node' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirect to:', res.headers.location)
      download(res.headers.location, redirectCount + 1)
      return
    }
    if (res.statusCode !== 200) {
      console.error('HTTP', res.statusCode)
      process.exit(1)
    }

    const chunks = []
    let size = 0
    res.on('data', (chunk) => { chunks.push(chunk); size += chunk.length; process.stdout.write(`\rDownloaded: ${(size / 1024 / 1024).toFixed(1)} MB`) })
    res.on('end', () => {
      console.log('\nParsing...')
      const raw = Buffer.concat(chunks).toString('utf8')
      const geojson = JSON.parse(raw)
      
      console.log(`Total features: ${geojson.features.length}`)
      
      // Strip unnecessary properties to reduce file size - keep only what we need
      const slim = {
        type: 'FeatureCollection',
        features: geojson.features.map(f => ({
          type: 'Feature',
          properties: {
            name: f.properties.name,
            adm0_a3: f.properties.adm0_a3,
            iso_a2: f.properties.iso_a2,
            admin: f.properties.admin,
            type_en: f.properties.type_en
          },
          geometry: f.geometry
        }))
      }
      
      const out = JSON.stringify(slim)
      fs.writeFileSync(outFile, out)
      console.log(`Saved: ${outFile}`)
      console.log(`Size: ${(out.length / 1024 / 1024).toFixed(1)} MB`)
      
      // Show sample countries
      const countries = [...new Set(slim.features.map(f => f.properties.adm0_a3))].sort()
      console.log(`Countries with admin-1 data: ${countries.length}`)
      console.log('Sample:', countries.slice(0, 20).join(', '))
    })
  }).on('error', (e) => { console.error('Error:', e.message); process.exit(1) })
}

download(url)
