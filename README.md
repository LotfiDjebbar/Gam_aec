# GAM Assurance — Dashboard Expansion Commerciale 🚀

Bienvenue dans le dépôt du **Dashboard Stratégique d'Expansion Commerciale pour GAM Assurance**. 
Ce projet est une application web interactive conçue pour analyser et planifier l'expansion territoriale du réseau d'agences GAM à travers l'Algérie, en s'appuyant sur l'intelligence artificielle et l'analyse de données (démographie, concurrence, activité économique, risque sismique).

## 🌟 Fonctionnalités Principales

Le tableau de bord est divisé en 5 sections clés pour couvrir l'intégralité du cycle de décision :

1. 🗺️ **Carte Stratégique (Vue Globale)**
   - **Cartographie Choroplèthe Dynamique** : Visualisation des frontières réelles des communes algériennes.
   - **Couches multiples** : Bascule instantanée entre le Score IA, la population, le CA Potentiel, la concurrence, le marché sismique, etc.
   - **Filtres interactifs** : Tri par Wilaya, score minimum, présence ou absence de zones industrielles, etc.

2. 📋 **Classement & Données**
   - Tableau interactif classant les communes avec le plus fort potentiel.
   - Recherche, filtres avancés, pagination et export CSV.

3. 📊 **Scorecard (Analyse Détaillée)**
   - Fiche d'identité complète par commune.
   - Graphiques radars d'analyse multi-critères.
   - Évolution démographique sur 30 ans avec prédictions (1998, 2008, 2026).
   - Recommandation d'implantation automatisée.

4. 📈 **Analytiques (Tableau de Bord)**
   - Vue consolidée du marché national de l'assurance.
   - Visualisation FinTech haut de gamme (gradients, cartes neumorphiques).
   - Analyse de la concurrence (Parts de marché, Déficit d'agences).

5. 💡 **Planificateur & Simulation**
   - Ajoutez des communes cibles à votre plan d'expansion.
   - L'algorithme calcule l'impact en temps réel : CA sécurisé, population couverte et nouvelles agences.

6. 🤖 **Assistant IA (Chatbot)**
   - Bot interactif intégré au Dashboard.
   - Traitement du langage naturel pour interroger le jeu de données en direct.

## 📂 Architecture du Projet

Le projet suit une structure claire, sans frameworks lourds (HTML/CSS/JS natif) :

```text
Gam-Dashboard/
├── index.html              ← Interface principale
├── README.md               ← Documentation
├── package.json            ← Dépendances (optionnelles)
├── css/
│   ├── style.css           ← Design System & Core Styles
│   ├── chat.css            ← Styles du Chatbot
│   └── news.css            ← Styles pour le flux d'actualités
├── js/
│   ├── app.js              ← Orchestrateur, Routage des onglets
│   ├── data.js             ← Chargement asynchrone des données
│   ├── map.js              ← Moteur Leaflet (Cartographie GeoJSON)
│   ├── table.js            ← Tableau de classement
│   ├── scorecard.js        ← Fiche commune & Graphiques (Radar, Courbe)
│   ├── charts.js           ← Analytics globaux (Tab 4)
│   ├── planner.js          ← Simulateur d'expansion (Tab 5)
│   ├── chatbot.js          ← Assistant IA
│   └── geocode.js          ← Outils de géocodage
├── data/
│   ├── Final_dataset.csv       ← La base de données maîtresse de l'étude
│   ├── dza_admin2.geojson      ← Frontières des communes
│   └── commune_mapping.json    ← Dictionnaire de correspondance CSV ↔ GeoJSON
├── scripts/                ← Scripts Python de nettoyage des données
└── images/                 ← Logos et icônes
```

## 🚀 Installation & Exécution

Puisque le Dashboard utilise `fetch()` pour lire les données locales (CSV, GeoJSON), il **doit être lancé via un serveur local** (sinon le navigateur bloquera par sécurité - erreur CORS).

### Option 1 : VS Code Live Server (Recommandé)
1. Ouvrez ce dossier dans **VS Code**.
2. Installez l'extension **Live Server**.
3. Cliquez sur `Go Live` en bas à droite de votre éditeur.

### Option 2 : Python
Si vous avez Python installé :
```bash
python -m http.server 8080
```
Puis accédez à `http://localhost:8080` dans votre navigateur.

### Option 3 : Node.js (Serve)
```bash
npx serve .
```

## 🛠️ Technologies Utilisées
- **HTML5 / CSS3 (Vanilla)** : Structure et design FinTech premium.
- **Vanilla JavaScript (ES6)** : Logique modulaire performante.
- **Leaflet.js** : Moteur cartographique open-source (GeoJSON).
- **Chart.js** : Datavisualisation (radars, barres, donuts).
- **PapaParse** : Lecture ultra-rapide des données CSV côté client.
- **Fuse.js** : Moteur de recherche floue (fuzzy search) pour l'assistant IA et la barre de recherche.

## 👥 Auteur
Projet développé pour GAM Assurance (Hackathon / Expansion AEC).
Dépôt GitHub : [https://github.com/LotfiDjebbar/Gam_aec.git](https://github.com/LotfiDjebbar/Gam_aec.git)
