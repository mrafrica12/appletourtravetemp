/* ============================================================
   APPLE TOURS & SAFARIS — Admin Portal JS
   ============================================================ */

const layout   = document.getElementById('adminLayout');
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebarOverlay');
const toggleBtn= document.getElementById('sidebarToggle');
const mobileBtn= document.getElementById('mobileSidebarToggle');

// Sidebar collapse (desktop)
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth > 992) {
      layout.classList.toggle('sidebar-collapsed');
      localStorage.setItem('atSidebarCollapsed', layout.classList.contains('sidebar-collapsed'));
    }
  });
}
// Restore on load
if (localStorage.getItem('atSidebarCollapsed') === 'true' && window.innerWidth > 992) {
  layout?.classList.add('sidebar-collapsed');
}

// Mobile sidebar
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => layout.classList.toggle('sidebar-open'));
}
overlay?.addEventListener('click', () => layout.classList.remove('sidebar-open'));

// Close sidebar on resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 992) layout?.classList.remove('sidebar-open');
});

/* ===== CHART DEFAULTS ===== */
function setChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#6B7280';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = '#111827';
  Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: '600' };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  Chart.defaults.plugins.tooltip.caretSize = 5;
}

/* ===== BOOKING TREND (dashboard) ===== */
function initBookingTrend() {
  const ctx = document.getElementById('bookingTrendChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
      datasets: [{
        data: [18,24,32,27,21,16,13,22,38,44,52,47],
        borderColor: '#1E3A2A',
        backgroundColor: 'rgba(30,58,42,.07)',
        borderWidth: 2,
        fill: true,
        tension: .42,
        pointBackgroundColor: '#1E3A2A',
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBorderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { callbacks: { label: c => `  ${c.parsed.y} bookings` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#F3F4F6' }, border: { display: false, dash: [3,3] }, ticks: { font: { size: 11 }, stepSize: 10 } }
      }
    }
  });
}

/* ===== SERVICE BREAKDOWN (dashboard) ===== */
function initServiceChart() {
  const ctx = document.getElementById('serviceChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Zanzibar Excursions','Safari Packages','Airport Transfers','Hotels','Visa Services','Custom Trips'],
      datasets: [{
        data: [38,24,17,11,6,4],
        backgroundColor: ['#1E3A2A','#C9A84C','#0369A1','#059669','#7C3AED','#D97706'],
        borderWidth: 0, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: { tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}%` } } }
    }
  });
}

/* ===== REVENUE CHART (analytics) ===== */
function initRevenueChart() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [
        {
          label: '2025',
          data: [11400,12800,19600,24200,28800,26400,21600,27800,35400,0,0,0],
          backgroundColor: 'rgba(201,168,76,.18)',
          borderColor: '#C9A84C', borderWidth: 1.5, borderRadius: 5,
        },
        {
          label: '2024',
          data: [8200,9100,14500,18200,22400,19800,16200,21400,28600,31400,24800,17600],
          backgroundColor: 'rgba(30,58,42,.1)',
          borderColor: '#1E3A2A', borderWidth: 1.5, borderRadius: 5,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 9, padding: 14, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` $${c.parsed.y.toLocaleString()}` } }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { grid: { color: '#F3F4F6' }, border: { display: false }, ticks: { callback: v => `$${(v/1000).toFixed(0)}k` } }
      }
    }
  });
}

/* ===== SOURCE CHART (analytics) ===== */
function initSourceChart() {
  const ctx = document.getElementById('sourceChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['WhatsApp','Website Form','Walk-in','Email','Referral','Social Media'],
      datasets: [{ data:[52,22,11,8,5,2], backgroundColor:['#25D366','#1E3A2A','#C9A84C','#0369A1','#7C3AED','#D97706'], borderWidth:0, hoverOffset:5 }]
    },
    options: { responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ tooltip:{ callbacks:{ label: c => ` ${c.label}: ${c.parsed}%` } } } }
  });
}

/* ===== SUBSCRIBER GROWTH (subscribers) ===== */
function initSubscriberChart() {
  const ctx = document.getElementById('subscriberChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
      datasets: [{
        data: [420,580,720,890,1040,1180,1310,1490,1642],
        borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,.08)',
        borderWidth: 2, fill: true, tension: .4,
        pointBackgroundColor: '#C9A84C', pointRadius: 3, pointHoverRadius: 6
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{ tooltip:{ callbacks:{ label: c => `  ${c.parsed.y.toLocaleString()} subscribers` } } },
      scales: {
        x: { grid:{ display:false }, border:{ display:false } },
        y: { grid:{ color:'#F3F4F6' }, border:{ display:false }, ticks:{ font:{ size:11 } } }
      }
    }
  });
}

/* ===== STATUS TABS ===== */
document.querySelectorAll('.status-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    tab.closest('.status-tabs')?.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;
    if (filter) {
      document.querySelectorAll('[data-status]').forEach(row => {
        row.style.display = (filter === 'all' || row.dataset.status === filter) ? '' : 'none';
      });
    }
  });
});

/* ===== CHART TABS ===== */
document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    tab.closest('.chart-period-tabs')?.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

/* ===== MODALS ===== */
window.openModal  = id => { document.getElementById(id)?.classList.add('open'); document.body.style.overflow = 'hidden'; };
window.closeModal = id => { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow = ''; };
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) { o.classList.remove('open'); document.body.style.overflow = ''; } });
});

/* ===== DETAIL PANELS ===== */
window.openPanel  = id => document.getElementById(id)?.classList.add('open');
window.closePanel = id => document.getElementById(id)?.classList.remove('open');

/* ===== TOAST ===== */
window.toast = (msg, type = 'success') => {
  const el = document.createElement('div');
  el.className = 'toast';
  const icon = type === 'success'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
  el.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${type==='success'?'#10B981':'#EF4444'}" stroke-width="2.5">${icon}</svg><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
};

/* ===== SETTINGS TOGGLES ===== */
document.querySelectorAll('.toggle').forEach(t => {
  t.addEventListener('click', () => t.classList.toggle('on'));
});

/* ===== SETTINGS NAV ===== */
document.querySelectorAll('.settings-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ===== SEARCH ===== */
document.querySelectorAll('.search-box input').forEach(input => {
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('[data-search]').forEach(row => {
      row.style.display = (!q || row.dataset.search.toLowerCase().includes(q)) ? '' : 'none';
    });
  });
});

/* ===== LOGIN ===== */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = loginForm.querySelector('.login-btn');
    btn.classList.add('loading');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1600);
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  setChartDefaults();
  initBookingTrend();
  initServiceChart();
  initRevenueChart();
  initSourceChart();
  initSubscriberChart();
});
