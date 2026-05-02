import json
import csv
import math
import unicodedata

def normalize(s):
    if not s: return ""
    s = str(s).lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = s.replace('-', ' ').replace("'", ' ').strip()
    return s

def distance(lat1, lon1, lat2, lon2):
    # simple euclidean distance for quick comparison
    return math.hypot(lat1 - lat2, lon1 - lon2)

with open('data/dza_admin2.geojson', 'r', encoding='utf-8') as f:
    geo = json.load(f)

geo_features = geo['features']
geo_dict = {}
for i, f in enumerate(geo_features):
    p = f['properties']
    name = p.get('adm2_name', '')
    geo_dict[normalize(name)] = name
    geo_dict[normalize(p.get('adm2_name1', ''))] = name
    geo_dict[normalize(p.get('adm2_name2', ''))] = name

csv_communes = {}
with open('data/Final_dataset.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_communes[row['Commune']] = {
            'lat': float(row['Lat_Commune']) if row.get('Lat_Commune') else 0,
            'lon': float(row['Lon_Commune']) if row.get('Lon_Commune') else 0,
        }

mapping = {}
unmatched = []

for csv_name, data in csv_communes.items():
    norm_csv = normalize(csv_name)
    if norm_csv in geo_dict:
        mapping[csv_name] = geo_dict[norm_csv]
        continue
    
    # Try distance-based matching
    best_dist = float('inf')
    best_geo = None
    for f in geo_features:
        p = f['properties']
        # if geojson has center_lat/lon
        glat = p.get('center_lat')
        glon = p.get('center_lon')
        if glat is not None and glon is not None:
            dist = distance(data['lat'], data['lon'], float(glat), float(glon))
            if dist < best_dist:
                best_dist = dist
                best_geo = p['adm2_name']
        else:
            # try to estimate from bbox or first coord
            coords = f['geometry']['coordinates']
            if f['geometry']['type'] == 'Polygon':
                c = coords[0][0]
                dist = distance(data['lat'], data['lon'], c[1], c[0])
                if dist < best_dist:
                    best_dist = dist
                    best_geo = p['adm2_name']
            elif f['geometry']['type'] == 'MultiPolygon':
                c = coords[0][0][0]
                dist = distance(data['lat'], data['lon'], c[1], c[0])
                if dist < best_dist:
                    best_dist = dist
                    best_geo = p['adm2_name']

    if best_dist < 0.2: # ~20km roughly
        mapping[csv_name] = best_geo
    else:
        unmatched.append(csv_name)

print(f"Matched: {len(mapping)} / {len(csv_communes)}")
print(f"Unmatched: {len(unmatched)}")

with open('data/commune_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print("Saved mapping to data/commune_mapping.json")
