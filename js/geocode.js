/**
 * geocode.js
 * Background geocoding using Nominatim (OpenStreetMap).
 * Fixes communes with missing or out-of-bounds coordinates.
 * Runs silently after app loads, then refreshes the map.
 */

// Algeria bounding box
const ALGERIA_BOUNDS = { latMin: 18.9, latMax: 37.2, lonMin: -8.7, lonMax: 12.0 };

function isInAlgeria(lat, lon) {
  return lat >= ALGERIA_BOUNDS.latMin && lat <= ALGERIA_BOUNDS.latMax &&
         lon >= ALGERIA_BOUNDS.lonMin && lon <= ALGERIA_BOUNDS.lonMax;
}

async function nominatimGeocode(commune, wilaya) {
  const q = encodeURIComponent(`${commune}, ${wilaya}, Algérie`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=dz`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    // Silently fail - network or rate limit
  }
  return null;
}

// Rate-limited geocoding queue
async function geocodeFixCommunes() {
  if (!window.DATA) return;

  // Find communes that need fixing (coords missing or outside Algeria)
  const toFix = window.DATA.filter(d =>
    !isInAlgeria(d.Lat_Commune, d.Lon_Commune)
  );

  if (toFix.length === 0) return;

  console.log(`[Geocode] Fixing ${toFix.length} communes with bad/missing coordinates...`);

  // Process in batches with delay to respect Nominatim rate limit (1 req/sec)
  for (let i = 0; i < toFix.length; i++) {
    const d = toFix[i];
    await new Promise(r => setTimeout(r, 1100)); // 1.1 sec between requests

    const result = await nominatimGeocode(d.Commune, d.Wilaya);
    if (result && isInAlgeria(result.lat, result.lon)) {
      // Update in-memory data
      d.Lat_Commune = result.lat;
      d.Lon_Commune = result.lon;

      // Also update in ORIGINAL_DATA backup
      if (window.ORIGINAL_DATA) {
        const orig = JSON.parse(window.ORIGINAL_DATA);
        const origEntry = orig.find(o => o.Commune === d.Commune);
        if (origEntry) {
          origEntry.Lat_Commune = result.lat;
          origEntry.Lon_Commune = result.lon;
          window.ORIGINAL_DATA = JSON.stringify(orig);
        }
      }

      console.log(`[Geocode] Fixed: ${d.Commune} → ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);

      // Refresh map every 10 fixes
      if ((i + 1) % 10 === 0 && typeof applyFilters === 'function') {
        applyFilters();
      }
    }
  }

  // Final map refresh
  console.log(`[Geocode] Done. Refreshing map...`);
  if (typeof applyFilters === 'function') applyFilters();
}
