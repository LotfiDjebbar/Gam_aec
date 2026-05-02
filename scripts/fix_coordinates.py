"""
fix_coordinates.py
Geocodes all Algerian communes with missing/bad coordinates using Nominatim.
Saves corrected data back to Final_dataset.csv.
Rate-limited to 1 req/sec as per Nominatim terms.
"""

import pandas as pd
import requests
import time
import sys

ALGERIA_BOUNDS = {
    'lat_min': 18.9, 'lat_max': 37.2,
    'lon_min': -8.7, 'lon_max': 12.0
}

def in_algeria(lat, lon):
    try:
        return (ALGERIA_BOUNDS['lat_min'] <= float(lat) <= ALGERIA_BOUNDS['lat_max'] and
                ALGERIA_BOUNDS['lon_min'] <= float(lon) <= ALGERIA_BOUNDS['lon_max'])
    except:
        return False

def geocode(commune, wilaya):
    """Call Nominatim to get lat/lon for a commune in Algeria."""
    clean_wilaya = str(wilaya).replace('[Algiers]', '').replace('[Alger]', '').strip()
    queries = [
        f"{commune}, {clean_wilaya}, Algeria",
        f"{commune}, Algeria",
    ]
    for q in queries:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': q,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'dz',
                'accept-language': 'fr'
            }
            headers = {'User-Agent': 'GAM-Dashboard-Geocoder/1.0'}
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            data = resp.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                if in_algeria(lat, lon):
                    return lat, lon
        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)
    return None, None

def main():
    CSV_PATH = 'data/Final_dataset.csv'
    df = pd.read_csv(CSV_PATH, encoding='utf-8-sig')

    # Detect bad rows
    def is_bad(row):
        try:
            lat = float(row['Lat_Commune'])
            lon = float(row['Lon_Commune'])
            return not in_algeria(lat, lon)
        except:
            return True

    bad_mask = df.apply(is_bad, axis=1)
    bad_df = df[bad_mask]
    print(f"Found {len(bad_df)} communes with bad/missing coordinates out of {len(df)} total.")

    fixed = 0
    failed = 0

    for idx, row in bad_df.iterrows():
        commune = row['Commune']
        wilaya  = row['Wilaya']
        print(f"[{fixed+failed+1}/{len(bad_df)}] Geocoding: {commune} ({wilaya})...", end=' ', flush=True)

        lat, lon = geocode(commune, wilaya)
        time.sleep(1.1)  # Rate limit: 1 req/sec

        if lat is not None:
            df.at[idx, 'Lat_Commune'] = round(lat, 6)
            df.at[idx, 'Lon_Commune'] = round(lon, 6)
            print(f"OK -> {lat:.4f}, {lon:.4f}")
            fixed += 1
        else:
            print(f"FAILED (no valid result)")
            failed += 1

        # Save every 20 fixes to avoid losing progress
        if (fixed + failed) % 20 == 0:
            df.to_csv(CSV_PATH, index=False, encoding='utf-8-sig')
            print(f"  [Checkpoint saved] {fixed} fixed, {failed} failed so far.")

    # Final save
    df.to_csv(CSV_PATH, index=False, encoding='utf-8-sig')
    print(f"\nDONE. {fixed} communes fixed, {failed} could not be geocoded.")
    print(f"Saved to {CSV_PATH}")

if __name__ == '__main__':
    main()
