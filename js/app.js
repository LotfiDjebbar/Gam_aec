/**
 * app.js
 * ------
 * Main orchestrator. Runs after all scripts are loaded.
 * Order: loadData() → fillKPIs() → initMapModule() → initTable() → show UI
 *
 * To add a new tab:
 *   1. Add the button + page HTML in index.html
 *   2. Create js/yourmodule.js
 *   3. Add <script src="js/yourmodule.js"> in index.html
 *   4. Call your init function in the boot sequence below
 */

var chartsBuilt       = false;
var plannerMapInited  = false;

/* ── Tab switching ───────────────────────────────────── */
function showTab(n) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab' + n).classList.add('active');
  document.getElementById('tabBtn' + n).classList.add('active');

  if (n === 1 && window.mapInstance) {
    setTimeout(function() { mapInstance.invalidateSize(); }, 100);
  }
  if (n === 4) {
    // Always rebuild charts to reflect latest/simulated data
    buildCharts();
    chartsBuilt = true;
  }
  if (n === 5) {
    if (!plannerMapInited) {
      if (typeof initPlannerMap === 'function') initPlannerMap();
      plannerMapInited = true;
    }
    if (window.plannerMap) {
      setTimeout(function() { window.plannerMap.invalidateSize(); }, 100);
    }
  }
}
window.showTab = showTab;

/* ── KPI bar ─────────────────────────────────────────── */
function fillKPIs(dataset) {
  var data = dataset || DATA;
  var total    = data.length;
  var noGam    = data.filter(function(d) { return !d.Has_GAM; }).length;
  var totalRev = data.reduce(function(s, d) { return s + d.Chiffre_Affaires_Potentiel_DA; }, 0);
  var avgScore = total > 0 ? data.reduce(function(s, d) { return s + d.Score_IA_Predictif; }, 0) / total : 0;
  var avgProb  = total > 0 ? data.reduce(function(s, d) { return s + d['Probabilite_Succes_%']; }, 0) / total : 0;
  var top      = data.length > 0 ? data.slice().sort(function(a, b) { return b.Score_IA_Predictif - a.Score_IA_Predictif; })[0] : null;

  document.getElementById('k-total').textContent = total.toLocaleString('fr');
  document.getElementById('k-nogam').textContent = noGam.toLocaleString('fr');
  document.getElementById('k-top').textContent   = top ? top.Commune + ' · ' + top.Wilaya : '—';
  document.getElementById('k-rev').textContent   = fmtDA(totalRev);
  document.getElementById('k-score').textContent = avgScore.toFixed(1) + ' / 100';
  document.getElementById('k-prob').textContent  = avgProb.toFixed(1) + '%';
}

/* ── Logo: click or drag-and-drop ────────────────────── */
function initLogoDrop() {
  var box = document.getElementById('logo-drop');
  if (!box) return;

  box.title = 'Cliquez pour ajouter le logo GAM';

  box.addEventListener('dragover', function(e) {
    e.preventDefault();
    box.style.opacity = '.7';
  });
  box.addEventListener('dragleave', function() { box.style.opacity = '1'; });
  box.addEventListener('drop', function(e) {
    e.preventDefault();
    box.style.opacity = '1';
    var file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      box.innerHTML = '<img src="' + ev.target.result + '" alt="GAM Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px">';
    };
    reader.readAsDataURL(file);
  });

  box.addEventListener('click', function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        box.innerHTML = '<img src="' + ev.target.result + '" alt="GAM Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px">';
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/* ── Boot sequence ───────────────────────────────────── */
window.addEventListener('load', function() {

  // Safety: if PapaParse didn't load, show a clear error
  if (typeof Papa === 'undefined') {
    document.getElementById('loading-sub').textContent = 'Erreur: PapaParse non chargé. Vérifiez votre connexion internet.';
    document.getElementById('loading-sub').style.color = '#e53935';
    return;
  }

  loadData()
    .then(function() {
      try {
        setLoadingProgress(92, 'Calcul des indicateurs...');
        fillKPIs();

        setLoadingProgress(95, 'Initialisation de la carte...');
        initMapModule();

        setLoadingProgress(98, 'Préparation du tableau...');
        initTable();

        initLogoDrop();

        // Save Original Data for Simulation Reset
        window.ORIGINAL_DATA = JSON.stringify(window.DATA);
        window.SIMULATED_AGENCIES = 0;

        // Init simulator search autocomplete
        if (typeof initSimulatorSearch === 'function') initSimulatorSearch();

        setLoadingProgress(100, 'Prêt !');

        // Background: re-geocode communes with missing/bad coords using Nominatim
        geocodeFixCommunes();

        // Small delay so user sees 100% before hiding
        setTimeout(function() {
          var screen = document.getElementById('loading-screen');
          var pages  = document.getElementById('pages');
          if (screen) {
            screen.style.transition = 'opacity .4s';
            screen.style.opacity = '0';
            setTimeout(function() { screen.style.display = 'none'; }, 420);
          }
          if (pages) pages.style.display = '';
        }, 400);
      } catch (e) {
        console.error('Initialization failed:', e);
        setLoadingError('Erreur lors de l\'initialisation: ' + e.message);
      }
    })
    .catch(function(err) {
      console.error('Boot failed:', err);
      setLoadingError('Erreur fatale: ' + err.message);
    });
});

// --- Simulation Logic ---------------------------------
function getPercentile(data, key, percentile) {
  const values = data.map(d => d[key]).sort((a, b) => a - b);
  const index = (percentile / 100) * (values.length - 1);
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;
  if (upper >= values.length) return values[lower];
  return values[lower] * (1 - weight) + values[upper] * weight;
}

window.simulateAgency = function(communeName) {
  const d = window.DATA.find(c => c.Commune === communeName);
  if (!d) return;

  // Compute p95 globals if not computed yet
  if (!window.P95) {
    window.P95 = {
      deficit: Math.max(1, getPercentile(window.DATA, 'Deficit_Agences', 95)),
      indus: Math.max(1, getPercentile(window.DATA, 'Nb_Zones_Industrielles', 95)),
      pop: Math.max(1, getPercentile(window.DATA, 'Pop_Active_Est_2026', 95))
    };
  }

  // 1. Add Agency
  d.Has_GAM = 1;
  d.Nb_Agences_GAM = (d.Nb_Agences_GAM || 0) + 1;
  
  // 2. Exact Python Math: Deficit
  // Capacite_Agences_Theorique is roughly Pop_2026 / 15000
  const capaciteTheorique = Math.floor(d.Pop_2026 / 15000);
  d.Deficit_Agences = Math.max(0, capaciteTheorique - d.Nb_Agences_Concurrents_Total - d.Nb_Agences_GAM);
  
  // 3. Exact Python Math: Target Probability
  let rawScore = (
    0.50 * (Math.min(d.Deficit_Agences, window.P95.deficit) / window.P95.deficit) +
    0.30 * (Math.min(d.Nb_Zones_Industrielles, window.P95.indus) / window.P95.indus) +
    0.20 * (Math.min(d.Pop_Active_Est_2026, window.P95.pop) / window.P95.pop)
  ) * 100;

  // 4. Cannibalization Penalty
  if (d.Nb_Agences_GAM > 0) {
    rawScore = rawScore * 0.2;
  }
  
  d.Score_IA_Predictif = rawScore;
  d['Probabilite_Succes_%'] = rawScore;
  
  window.SIMULATED_AGENCIES++;
  document.getElementById('simulation-badge').style.display = 'flex';
  document.getElementById('sim-count').textContent = window.SIMULATED_AGENCIES;

  // Update Simulation Cart if available
  if (typeof updateSimulationCart === 'function') {
    updateSimulationCart(communeName);
  }
  
  // Global Re-render
  if (typeof applyFilters === 'function') applyFilters();
  if (typeof initTable === 'function') initTable();
  if (typeof initCharts === 'function') initCharts();
  
  if (window.mapInstance) window.mapInstance.closePopup();
};

window.resetSimulation = function() {
  if (!window.ORIGINAL_DATA) return;
  
  window.DATA = JSON.parse(window.ORIGINAL_DATA);
  window.SIMULATED_AGENCIES = 0;
  window.SIMULATED_COMMUNES_LIST = [];
  
  document.getElementById('simulation-badge').style.display = 'none';
  
  if (typeof updateSimulationCart === 'function') {
    updateSimulationCart();
  }
  
  if (typeof applyFilters === 'function') applyFilters();
  if (typeof initTable === 'function') initTable();
  if (typeof initCharts === 'function') initCharts();
};

