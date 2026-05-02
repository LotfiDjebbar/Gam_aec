/**
 * planner.js -> NOW SIMULATOR CART
 * Manages the list of simulated agencies and their global impact.
 */

window.SIMULATED_COMMUNES_LIST = [];

window.updateSimulationCart = function(communeName) {
  if (communeName && !window.SIMULATED_COMMUNES_LIST.includes(communeName)) {
    window.SIMULATED_COMMUNES_LIST.push(communeName);
  }
  
  // If reset was called, communeName is undefined, list is emptied.
  if (!communeName && window.SIMULATED_AGENCIES === 0) {
      window.SIMULATED_COMMUNES_LIST = [];
  }

  renderSimulationCart();
  renderSimulationKPIs();
  
  if (!window.plannerMapInited) {
    if (typeof initPlannerMap === 'function') initPlannerMap();
    window.plannerMapInited = true;
  }
  
  // Render markers on the small map
  const simulatedData = window.DATA.filter(d => window.SIMULATED_COMMUNES_LIST.includes(d.Commune));
  if (typeof renderPlanMarkers === 'function') renderPlanMarkers(simulatedData);

  document.getElementById('plan-kpis').style.display = 'grid';
  document.getElementById('plan-export-btn').style.display = 'block';
};

function renderSimulationCart() {
  const list = document.getElementById('planner-list');
  
  if (!window.SIMULATED_COMMUNES_LIST.length) {
    list.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-text" style="font-size:14px">Aucune agence simulée.<br><br>Allez sur l'onglet <b>Carte</b>, cliquez sur une commune et choisissez "Simuler l'Ouverture".</div></div>`;
    document.getElementById('plan-kpis').style.display = 'none';
    document.getElementById('plan-export-btn').style.display = 'none';
    return;
  }

  const simulatedData = window.DATA.filter(d => window.SIMULATED_COMMUNES_LIST.includes(d.Commune));

  list.innerHTML = simulatedData.map((d, i) => `
    <div class="plan-item" style="border-left: 4px solid var(--green);">
      <div class="plan-info">
        <div class="plan-name">${d.Commune}</div>
        <div class="plan-meta">${d.Wilaya} · Population: ${fmtNum(d.Pop_2026)} hab.</div>
        <div class="plan-meta" style="color:var(--green); font-weight:bold; margin-top:4px;">
          CA Sécurisé: +${fmtDA(d.Chiffre_Affaires_Potentiel_DA)}
        </div>
      </div>
      <div class="plan-score" style="display:flex; flex-direction:column; align-items:flex-end;">
        <span style="font-size:10px; opacity:0.7">Nouveau Score IA</span>
        <span>${fmtScore(d.Score_IA_Predictif)}</span>
      </div>
    </div>`).join('');
}

function renderSimulationKPIs() {
  const simulatedData = window.DATA.filter(d => window.SIMULATED_COMMUNES_LIST.includes(d.Commune));
  
  document.getElementById('pk-n').textContent = simulatedData.length;
  document.getElementById('pk-rev').textContent = fmtDA(simulatedData.reduce((s, d) => s + d.Chiffre_Affaires_Potentiel_DA, 0));
  document.getElementById('pk-pop').textContent = fmtNum(simulatedData.reduce((s, d) => s + d.Pop_2026, 0));
}

window.exportSimulation = function() {
  const simulatedData = window.DATA.filter(d => window.SIMULATED_COMMUNES_LIST.includes(d.Commune));
  if (!simulatedData.length) return;

  const headers = ['Commune','Wilaya','Nouveau_Score_IA','Prob_%','CA_Securise_DA','Pop_2026'];
  const rows = simulatedData.map(d => [
    d.Commune, d.Wilaya,
    fmtScore(d.Score_IA_Predictif), fmtScore(d['Probabilite_Succes_%']),
    d.Chiffre_Affaires_Potentiel_DA, d.Pop_2026
  ].join(','));

  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'GAM_Simulation_Report.csv';
  a.click();
};

// Initialize empty cart view
setTimeout(() => {
  if (document.getElementById('planner-list')) {
    renderSimulationCart();
  }
}, 1000);

// --- Map Logic for Simulator ---
window.plannerMap = null;
window.plannerMarkers = [];

window.initPlannerMap = function() {
  if (window.plannerMap) return;
  window.plannerMap = L.map('planner-map').setView([28.0, 3.0], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(window.plannerMap);
}

window.renderPlanMarkers = function(items) {
  if (!window.plannerMap) return;
  window.plannerMarkers.forEach(m => window.plannerMap.removeLayer(m));
  window.plannerMarkers = [];

  const bounds = [];
  items.forEach(d => {
    if (!d.Lat_Commune || !d.Lon_Commune) return;
    // Only show markers within Algeria's geographic bounds
    if (d.Lat_Commune < 18.9 || d.Lat_Commune > 37.2) return;
    if (d.Lon_Commune < -8.7 || d.Lon_Commune > 12.0) return;
    const m = L.circleMarker([d.Lat_Commune, d.Lon_Commune], {
      radius: 8,
      fillColor: '#1a5c35',
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(window.plannerMap);
    m.bindPopup('<b>' + d.Commune + '</b><br>Score IA: ' + d.Score_IA_Predictif.toFixed(1));
    window.plannerMarkers.push(m);
    bounds.push([d.Lat_Commune, d.Lon_Commune]);
  });

  if (bounds.length > 0) {
    window.plannerMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  } else {
    window.plannerMap.setView([28.0, 3.0], 5);
  }
}


// --- Search & Add from Simulator Tab ---
window.addSimulationFromInput = function() {
  const input = document.getElementById('sim-commune-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  // Find commune by exact or case-insensitive match
  const d = window.DATA.find(c =>
    c.Commune.toLowerCase() === val.toLowerCase() ||
    c.Commune.toLowerCase().includes(val.toLowerCase())
  );

  if (!d) {
    input.style.border = '1.5px solid #e53935';
    input.placeholder = 'Commune non trouvee. Verifiez le nom.';
    setTimeout(() => {
      input.style.border = '1px solid #dde3de';
      input.placeholder = 'Ex: Draria, Oran, Tizi Ouzou...';
    }, 2000);
    return;
  }

  if (window.SIMULATED_COMMUNES_LIST && window.SIMULATED_COMMUNES_LIST.includes(d.Commune)) {
    input.value = '';
    return; // Already simulated
  }

  // Run the simulation
  if (typeof simulateAgency === 'function') {
    simulateAgency(d.Commune);
  }

  input.value = '';
  input.focus();
};

// Populate datalist with all commune names for autocomplete
window.initSimulatorSearch = function() {
  if (!window.DATA) return;
  const dl = document.getElementById('sim-communes-datalist');
  if (!dl) return;
  dl.innerHTML = '';
  window.DATA.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.Commune;
    dl.appendChild(opt);
  });
};
