/**
 * charts.js
 * Builds all Chart.js instances for the Analytics tab.
 * Called once when the user first opens Tab 4.
 */

function buildCharts() {
  // Destroy existing charts to allow rebuild
  ['ch-wilayas','ch-top20','ch-hist','ch-pie','ch-deficit','ch-indus','ch-seismic','ch-revenue'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    }
  });

  // ── Premium chart options ──────────────────────────────
  const cOpts = (extra = {}) => {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: {
            color: '#4a6655',
            font: { family: "'Plus Jakarta Sans'", size: 11, weight: '600' },
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26, 46, 31, 0.92)',
          titleFont: { size: 13, family: "'Plus Jakarta Sans'", weight: '800' },
          bodyFont: { size: 12, family: "'Plus Jakarta Sans'", weight: '500' },
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7a9985', font: { size: 10, family: "'Plus Jakarta Sans'", weight: '600' } },
          border: { display: false }
        },
        y: {
          grid: { color: 'rgba(46,125,79, 0.07)', borderDash: [4, 4] },
          border: { display: false },
          ticks: { color: '#7a9985', font: { size: 10, family: "'Plus Jakarta Sans'", weight: '600' } }
        }
      }
    };

    // Merge extra plugins
    if (extra.plugins) {
      Object.assign(base.plugins, extra.plugins);
    }
    // Merge extra scaleX
    if (extra.scaleX) {
      Object.assign(base.scales.x, extra.scaleX);
    }
    // Merge extra scaleY
    if (extra.scaleY) {
      Object.assign(base.scales.y, extra.scaleY);
    }
    // Copy other extra keys
    for (const k of Object.keys(extra)) {
      if (!['plugins','scaleX','scaleY'].includes(k)) {
        base[k] = extra[k];
      }
    }
    return base;
  };

  // ── Gradient helper ────────────────────────────────────
  const mkGrad = (canvasId, c1, c2, vertical = true) => {
    const el = document.getElementById(canvasId);
    if (!el) return c1;
    const ctx = el.getContext('2d');
    const g = vertical
      ? ctx.createLinearGradient(0, 0, 0, 260)
      : ctx.createLinearGradient(0, 0, 400, 0);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  };

  // ── Top 15 wilayas by avg score ──────────────────────
  const byW = {};
  DATA.forEach(d => {
    if (!byW[d.Wilaya]) byW[d.Wilaya] = { s: 0, n: 0 };
    byW[d.Wilaya].s += d.Score_IA_Predictif;
    byW[d.Wilaya].n++;
  });
  const top15w = Object.entries(byW)
    .map(([w, v]) => ({ w, avg: v.s / v.n }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 15);

  new Chart(document.getElementById('ch-wilayas'), {
    type: 'bar',
    data: {
      labels: top15w.map(x => x.w),
      datasets: [{
        data: top15w.map(x => +x.avg.toFixed(1)),
        backgroundColor: mkGrad('ch-wilayas', '#4caf50', '#1a5c35', false),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      ...cOpts({ indexAxis: 'y', plugins: { legend: { display: false } } }),
      onClick: (e, els) => {
        if (els[0]) {
          document.getElementById('tbl-wilaya').value = top15w[els[0].index].w;
          filterTable();
          showTab(2);
        }
      }
    }
  });

  // ── Top 20 communes ───────────────────────────────────
  const t20 = DATA.slice().sort((a, b) => b.Score_IA_Predictif - a.Score_IA_Predictif).slice(0, 20);
  new Chart(document.getElementById('ch-top20'), {
    type: 'bar',
    data: {
      labels: t20.map(d => d.Commune),
      datasets: [{
        data: t20.map(d => d.Score_IA_Predictif),
        backgroundColor: mkGrad('ch-top20', '#66bb6a', '#1a5c35'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleX: { ticks: { maxRotation: 45, font: { size: 9 } } }
    })
  });

  // ── Score histogram ───────────────────────────────────
  const bins = Array(10).fill(0);
  DATA.forEach(d => { const b = Math.min(Math.floor(d.Score_IA_Predictif / 10), 9); bins[b]++; });
  new Chart(document.getElementById('ch-hist'), {
    type: 'bar',
    data: {
      labels: ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'],
      datasets: [{
        data: bins,
        backgroundColor: mkGrad('ch-hist', '#a5d6a7', '#1a5c35'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: cOpts({ plugins: { legend: { display: false } } })
  });

  // ── Parts de marché GAM + Concurrents ──────────────
  const ct = { GAM: 0, SAA: 0, ALLIANCE: 0, AXA: 0, CAAR: 0, CAAT: 0, CASH: 0, CIAR: 0, TRUST: 0 };
  DATA.forEach(d => {
    ct.GAM      += (d.Nb_Agences_GAM || 0);
    ct.SAA      += (d.Nb_Agences_SAA || 0);
    ct.ALLIANCE += (d.Nb_Agences_ALLIANCE || 0);
    ct.AXA      += (d.Nb_Agences_AXA || 0);
    ct.CAAR     += (d.Nb_Agences_CAAR || 0);
    ct.CAAT     += (d.Nb_Agences_CAAT || 0);
    ct.CASH     += (d.Nb_Agences_CASH || 0);
    ct.CIAR     += (d.Nb_Agences_CIAR || 0);
    ct.TRUST    += (d.Nb_Agences_TRUST || 0);
  });

  // Toujours inclure GAM même s'il est à 0 pour qu'il soit mentionné
  const ctFiltered = Object.fromEntries(Object.entries(ct).filter(([k, v]) => v > 0 || k === 'GAM'));
  const pieColors = {
    GAM:'#4caf50', SAA:'#ef5350', ALLIANCE:'#42a5f5', AXA:'#ff7043',
    CAAR:'#ab47bc', CAAT:'#26c6da', CASH:'#fdd835', CIAR:'#9ccc65', TRUST:'#8d6e63'
  };
  const pieTotal = Object.values(ctFiltered).reduce((s, v) => s + v, 0) || 1;

  new Chart(document.getElementById('ch-pie'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(ctFiltered).map(k => k + ' (' + (ctFiltered[k]/pieTotal*100).toFixed(1) + '%)'),
      datasets: [{
        data: Object.values(ctFiltered),
        backgroundColor: Object.keys(ctFiltered).map(k => pieColors[k] || '#999'),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: { duration: 1400, easing: 'easeOutQuart', animateRotate: true },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#4a6655',
            font: { size: 11, family: "'Plus Jakarta Sans'", weight: '600' },
            padding: 14,
            boxWidth: 14,
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26, 46, 31, 0.92)',
          titleFont: { size: 13, family: "'Plus Jakarta Sans'", weight: '800' },
          bodyFont: { size: 12, family: "'Plus Jakarta Sans'", weight: '500' },
          padding: 12,
          cornerRadius: 10,
          callbacks: { label: ctx => ' ' + ctx.label + ' : ' + ctx.parsed + ' agences' }
        }
      }
    }
  });

  // ── Deficit by wilaya ─────────────────────────────────
  const defW = {};
  DATA.forEach(d => { if (!defW[d.Wilaya]) defW[d.Wilaya] = 0; defW[d.Wilaya] += d.Deficit_Agences; });
  const t15def = Object.entries(defW).sort((a, b) => b[1] - a[1]).slice(0, 15);
  new Chart(document.getElementById('ch-deficit'), {
    type: 'bar',
    data: {
      labels: t15def.map(x => x[0]),
      datasets: [{
        label: 'Déficit total',
        data: t15def.map(x => x[1]),
        backgroundColor: mkGrad('ch-deficit', '#fdd835', '#f9a825'),
        borderRadius: 6,
        borderSkipped: false,
        borderWidth: 0
      }]
    },
    options: cOpts({ plugins: { legend: { display: false } } })
  });

  // ── Industrial zones ──────────────────────────────────
  const t15i = DATA.slice()
    .sort((a, b) => (b.Nb_Zones_Industrielles + b.Nb_Zones_Activite) - (a.Nb_Zones_Industrielles + a.Nb_Zones_Activite))
    .slice(0, 15);
  new Chart(document.getElementById('ch-indus'), {
    type: 'bar',
    data: {
      labels: t15i.map(d => d.Commune),
      datasets: [
        {
          label: 'Zones ind.',
          data: t15i.map(d => d.Nb_Zones_Industrielles),
          backgroundColor: mkGrad('ch-indus', '#ff9800', '#e65100'),
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Zones act.',
          data: t15i.map(d => d.Nb_Zones_Activite),
          backgroundColor: mkGrad('ch-indus', '#66bb6a', '#1a5c35'),
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: cOpts({
      scaleX: { stacked: true, ticks: { maxRotation: 45, font: { size: 9 } } },
      scaleY: { stacked: true }
    })
  });

  // ── Seismic market by wilaya ──────────────────────────
  const seisW = {};
  DATA.forEach(d => { if (!seisW[d.Wilaya]) seisW[d.Wilaya] = 0; seisW[d.Wilaya] += d.Nombre_Total_Polices_assurances_seismes; });
  const t12s = Object.entries(seisW).sort((a, b) => b[1] - a[1]).slice(0, 12);
  new Chart(document.getElementById('ch-seismic'), {
    type: 'bar',
    data: {
      labels: t12s.map(x => x[0]),
      datasets: [{
        label: 'Polices sismiques',
        data: t12s.map(x => x[1]),
        backgroundColor: mkGrad('ch-seismic', '#ef5350', '#b71c1c'),
        borderRadius: 6,
        borderSkipped: false,
        borderWidth: 0
      }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleX: { ticks: { maxRotation: 45, font: { size: 9 } } }
    })
  });

  // ── Revenue by wilaya ─────────────────────────────────
  const revW = {};
  DATA.forEach(d => { if (!revW[d.Wilaya]) revW[d.Wilaya] = 0; revW[d.Wilaya] += d.Chiffre_Affaires_Potentiel_DA; });
  const t15r = Object.entries(revW).sort((a, b) => b[1] - a[1]).slice(0, 15);
  new Chart(document.getElementById('ch-revenue'), {
    type: 'bar',
    data: {
      labels: t15r.map(x => x[0]),
      datasets: [{
        data: t15r.map(x => x[1]),
        backgroundColor: t15r.map((_, i) => i < 3 ? '#f5c518' : '#4caf50'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleY: { ticks: { callback: v => fmtDA(v) } }
    })
  });
}

window.buildCharts = buildCharts;
