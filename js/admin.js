/* ====================================================
   Apple Tours & Safaris — Admin Portal JavaScript
   ==================================================== */

const ADMIN_PASS = 'applesafaris2024'; // Change this
const WHATSAPP_NUMBER = '255742000000';

/* ---- Utility ---- */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function showToast(msg, type = 'success') {
  let toast = $('.admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:var(--forest);color:#fff;padding:12px 18px;
      border-radius:8px;font-size:.875rem;font-weight:500;
      box-shadow:0 8px 30px rgba(0,0,0,.2);
      transform:translateX(120%);transition:transform .3s ease;
      max-width:300px;display:flex;align-items:center;gap:8px;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'error' ? 'var(--red)' : 'var(--forest)';
  requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
  setTimeout(() => { toast.style.transform = 'translateX(120%)'; }, 3000);
}

/* ---- Auth ---- */
function checkAuth() {
  const authed = sessionStorage.getItem('ats_admin_auth');
  const login = $('#login-screen');
  const app = $('#admin-app');
  if (!login || !app) return;

  if (authed === '1') {
    login.style.display = 'none';
    app.style.display = 'flex';
    initApp();
  } else {
    login.style.display = 'flex';
    app.style.display = 'none';
  }
}

function initLoginForm() {
  const form = $('#login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = $('#admin-password').value;
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem('ats_admin_auth', '1');
      checkAuth();
    } else {
      const err = $('.login-error');
      if (err) { err.style.display = 'block'; err.textContent = 'Incorrect password. Please try again.'; }
    }
  });
}

function logout() {
  sessionStorage.removeItem('ats_admin_auth');
  checkAuth();
}

/* ---- Data Layer (localStorage) ---- */
function getData(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(`ats_${key}`)) || fallback; }
  catch { return fallback; }
}

function setData(key, value) {
  localStorage.setItem(`ats_${key}`, JSON.stringify(value));
}

// Seed from tours.json if empty
async function seedData() {
  try {
    const res = await fetch('../data/tours.json');
    const data = await res.json();

    if (!getData('tours').length) setData('tours', data.tours);
    if (!getData('hotels').length) setData('hotels', data.hotels);
    if (!getData('testimonials').length) setData('testimonials', data.testimonials);
    if (!getData('blog_posts').length) setData('blog_posts', data.blogPosts);

    // Seed sample inquiries
    if (!getData('inquiries').length) {
      setData('inquiries', [
        { id: genId(), name: 'Emma Wilson', email: 'emma@example.com', phone: '+447911123456', tour: 'Zanzibar Honeymoon Escape', dates: '2024-05-10 – 2024-05-18', travelers: '2', budget: '$2000–$3000', message: 'We are celebrating our first anniversary and would love a romantic package.', status: 'New', submittedAt: new Date(Date.now() - 3600000).toISOString(), notes: '' },
        { id: genId(), name: 'Carlos Mendez', email: 'carlos@example.com', phone: '+12125550199', tour: 'Serengeti Great Migration Safari', dates: '2024-07-15', travelers: '4', budget: '$5000+', message: 'Family of 4 including 2 children aged 10 and 13. Very excited!', status: 'Contacted', submittedAt: new Date(Date.now() - 86400000).toISOString(), notes: 'Called back on 15th, interested in 7-day combo.' },
        { id: genId(), name: 'Yuki Tanaka', email: 'yuki@example.com', phone: '+81901234567', tour: 'Stone Town Heritage City Tour', dates: '2024-04-20', travelers: '2', budget: '$200–$500', message: 'Just need a half-day Stone Town tour. Japanese speaking guide preferred if available.', status: 'Quoted', submittedAt: new Date(Date.now() - 172800000).toISOString(), notes: 'Sent price quote. Awaiting confirmation.' },
        { id: genId(), name: 'David & Sarah Chen', email: 'dchen@example.com', phone: '+6591234567', tour: 'Kilimanjaro Machame Route', dates: '2024-08-01', travelers: '2', budget: '$3000–$4000', message: 'Both are experienced hikers. Completed Everest Base Camp last year.', status: 'Confirmed', submittedAt: new Date(Date.now() - 259200000).toISOString(), notes: 'Deposit received. Flights booked.' },
      ]);
    }
  } catch (err) {
    console.warn('Could not seed data:', err);
  }
}

/* ---- Navigation / Sections ---- */
function initSidebarNav() {
  $$('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.dataset.section;
      navigateTo(section);
    });
  });

  // Mobile sidebar toggle
  const toggleBtn = $('.sidebar-toggle-btn');
  const sidebar = $('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  $('.sidebar-logout')?.addEventListener('click', logout);
}

function navigateTo(section) {
  $$('.admin-section').forEach(s => s.style.display = 'none');
  const target = $(`#section-${section}`);
  if (target) target.style.display = 'block';

  $$('.sidebar-link').forEach(l => l.classList.remove('active'));
  $(`.sidebar-link[data-section="${section}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    tours: 'Tour Management',
    packages: 'Package Management',
    inquiries: 'Bookings & Inquiries',
    content: 'Content Management',
    gallery: 'Media & Files',
    settings: 'Settings',
  };

  const titleEl = $('.topbar-title');
  if (titleEl) titleEl.textContent = titles[section] || section;

  if (section === 'dashboard') renderDashboard();
  if (section === 'tours') renderToursTable();
  if (section === 'inquiries') renderInquiries();
  if (section === 'content') renderContent();
}

/* ---- Dashboard ---- */
function renderDashboard() {
  const inquiries = getData('inquiries');
  const tours = getData('tours');

  const newCount = inquiries.filter(i => i.status === 'New').length;
  const confirmedCount = inquiries.filter(i => ['Confirmed','Paid'].includes(i.status)).length;
  const totalCount = inquiries.length;

  setStatCard('stat-inquiries', totalCount, '+3 this week', 'up');
  setStatCard('stat-bookings', confirmedCount, '+1 today', 'up');
  setStatCard('stat-new-leads', newCount, 'Needs follow-up', newCount > 0 ? 'up' : '');
  setStatCard('stat-tours', tours.length, 'Active listings', '');

  renderActivityFeed();
  renderPopularTours();
  renderUpcomingTrips();
}

function setStatCard(id, value, change, dir) {
  const card = $(`#${id}`);
  if (!card) return;
  const valEl = card.querySelector('.stat-value');
  const chgEl = card.querySelector('.stat-change');
  if (valEl) valEl.textContent = value;
  if (chgEl) {
    chgEl.textContent = change;
    chgEl.className = `stat-change ${dir}`;
  }
}

function renderActivityFeed() {
  const list = $('#activity-feed');
  if (!list) return;
  const inquiries = getData('inquiries').slice(0, 6);
  list.innerHTML = inquiries.map(i => `
    <div class="activity-item">
      <div class="activity-dot ${statusDotColor(i.status)}"></div>
      <div class="activity-text">
        <strong>${i.name}</strong>
        <p>Inquired about "${i.tour}" — Status: ${i.status}</p>
      </div>
      <span class="activity-time">${timeAgo(i.submittedAt)}</span>
    </div>
  `).join('') || '<p style="color:var(--gray);font-size:.875rem">No recent activity.</p>';
}

function renderPopularTours() {
  const list = $('#popular-tours');
  if (!list) return;
  const tours = getData('tours').slice(0, 5);
  list.innerHTML = tours.map((t, i) => `
    <div class="popular-tour-item">
      <img class="popular-thumb" src="${t.image}" alt="${t.title}" onerror="this.style.background='var(--gray-light)'">
      <div class="popular-info">
        <div class="popular-name">${t.title}</div>
        <div class="popular-views">${t.destination} · ${t.duration}</div>
      </div>
      <div class="popular-bookings">${formatCurrency(t.startingPrice)}</div>
    </div>
  `).join('');
}

function renderUpcomingTrips() {
  const list = $('#upcoming-trips');
  if (!list) return;
  const trips = getData('inquiries').filter(i => ['Confirmed','Paid'].includes(i.status)).slice(0,5);
  list.innerHTML = trips.map(t => `
    <div class="activity-item">
      <div class="activity-dot dot-green"></div>
      <div class="activity-text">
        <strong>${t.name}</strong>
        <p>${t.tour} · ${t.dates || 'TBD'}</p>
      </div>
      <span class="status-badge status-confirmed">${t.status}</span>
    </div>
  `).join('') || '<p style="color:var(--gray);font-size:.875rem">No confirmed trips yet.</p>';
}

/* ---- Tours Table ---- */
function renderToursTable() {
  const tbody = $('#tours-tbody');
  if (!tbody) return;
  const tours = getData('tours');

  tbody.innerHTML = tours.map(t => `
    <tr data-id="${t.id}">
      <td>
        <div class="table-tour-info">
          <img class="table-tour-thumb" src="${t.image}" alt="" onerror="this.style.background='var(--gray-light)'">
          <div>
            <div class="table-tour-name">${t.title}</div>
            <div class="table-tour-cat">${t.destination}</div>
          </div>
        </div>
      </td>
      <td><span style="text-transform:capitalize">${t.category.replace(/-/g,' ')}</span></td>
      <td>${t.duration}</td>
      <td>${formatCurrency(t.startingPrice)}</td>
      <td><span class="tour-card-badge badge-${t.travelStyle.toLowerCase()}" style="position:static">${t.travelStyle}</span></td>
      <td><span class="status-badge ${t.featured ? 'status-active' : 'status-draft'}">${t.featured ? 'Featured' : 'Standard'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openTourModal('${t.id}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteTour('${t.id}')" title="Delete">🗑️</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleFeatured('${t.id}')" title="Toggle featured">⭐</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:32px">No tours yet. Add your first tour.</td></tr>';

  const count = $('#tours-count');
  if (count) count.textContent = `${tours.length} tours`;
}

function openTourModal(id = null) {
  const modal = $('#tour-modal');
  if (!modal) return;

  const tours = getData('tours');
  const tour = id ? tours.find(t => t.id === id) : null;

  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = tour ? 'Edit Tour' : 'Add New Tour';

  const form = $('#tour-form');
  if (!form) return;

  form.dataset.editId = id || '';

  if (tour) {
    form.querySelector('[name="title"]').value = tour.title || '';
    form.querySelector('[name="destination"]').value = tour.destination || '';
    form.querySelector('[name="category"]').value = tour.category || '';
    form.querySelector('[name="duration"]').value = tour.duration || '';
    form.querySelector('[name="startingPrice"]').value = tour.startingPrice || '';
    form.querySelector('[name="travelStyle"]').value = tour.travelStyle || '';
    form.querySelector('[name="shortDescription"]').value = tour.shortDescription || '';
    form.querySelector('[name="overview"]').value = tour.overview || '';
    const feat = form.querySelector('[name="featured"]');
    if (feat) feat.checked = !!tour.featured;
  } else {
    form.reset();
  }

  // Render itinerary builder
  renderItineraryBuilder(tour?.itinerary || []);
  renderIncludedBuilder(tour?.included || [], '#included-builder', 'included');
  renderIncludedBuilder(tour?.notIncluded || [], '#notincluded-builder', 'notIncluded');

  modal.classList.add('open');
}

function closeTourModal() {
  $('#tour-modal')?.classList.remove('open');
}

function renderItineraryBuilder(itinerary) {
  const container = $('#itinerary-builder');
  if (!container) return;

  container.innerHTML = itinerary.map((day, i) => `
    <div class="itinerary-day-builder" data-index="${i}">
      <div class="itinerary-day-header">
        <span class="day-num-badge">Day ${i + 1}</span>
        <button class="btn btn-danger btn-sm" type="button" onclick="removeItineraryDay(${i})">Remove</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input class="form-control" placeholder="Day title (e.g. Arrival in Zanzibar)" value="${day.title || ''}" data-day="${i}" data-field="title">
        <textarea class="form-control" rows="2" placeholder="Day description..." data-day="${i}" data-field="description">${day.description || ''}</textarea>
      </div>
    </div>
  `).join('');
}

function addItineraryDay() {
  const container = $('#itinerary-builder');
  if (!container) return;
  const days = container.querySelectorAll('.itinerary-day-builder');
  const i = days.length;
  const div = document.createElement('div');
  div.className = 'itinerary-day-builder';
  div.dataset.index = i;
  div.innerHTML = `
    <div class="itinerary-day-header">
      <span class="day-num-badge">Day ${i + 1}</span>
      <button class="btn btn-danger btn-sm" type="button" onclick="removeItineraryDay(${i})">Remove</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <input class="form-control" placeholder="Day title" data-day="${i}" data-field="title">
      <textarea class="form-control" rows="2" placeholder="Day description..." data-day="${i}" data-field="description"></textarea>
    </div>
  `;
  container.appendChild(div);
}

function removeItineraryDay(index) {
  const container = $('#itinerary-builder');
  if (!container) return;
  const day = container.querySelector(`[data-index="${index}"]`);
  if (day) day.remove();
  // Renumber
  container.querySelectorAll('.itinerary-day-builder').forEach((d, i) => {
    d.dataset.index = i;
    const badge = d.querySelector('.day-num-badge');
    if (badge) badge.textContent = `Day ${i + 1}`;
  });
}

function renderIncludedBuilder(items, selector, fieldName) {
  const container = $(selector);
  if (!container) return;
  container.innerHTML = items.map((item, i) => `
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <input class="form-control" value="${item}" data-list="${fieldName}" data-idx="${i}" placeholder="Add item...">
      <button class="btn btn-danger btn-sm" type="button" onclick="this.parentElement.remove()">×</button>
    </div>
  `).join('');
}

function addIncludedItem(selector, fieldName) {
  const container = $(selector);
  if (!container) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px';
  div.innerHTML = `
    <input class="form-control" data-list="${fieldName}" placeholder="Add item...">
    <button class="btn btn-danger btn-sm" type="button" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(div);
}

function saveTour() {
  const form = $('#tour-form');
  if (!form) return;

  const fd = new FormData(form);
  const editId = form.dataset.editId;

  // Gather itinerary
  const itinerary = [];
  $$('[data-day][data-field="title"]', form).forEach(input => {
    const i = parseInt(input.dataset.day);
    if (!itinerary[i]) itinerary[i] = {};
    itinerary[i].title = input.value;
    itinerary[i].day = i + 1;
  });
  $$('[data-day][data-field="description"]', form).forEach(input => {
    const i = parseInt(input.dataset.day);
    if (!itinerary[i]) itinerary[i] = {};
    itinerary[i].description = input.value;
  });

  // Gather included/not-included
  const included = $$('[data-list="included"]', form).map(i => i.value).filter(Boolean);
  const notIncluded = $$('[data-list="notIncluded"]', form).map(i => i.value).filter(Boolean);

  const tourData = {
    id: editId || genId(),
    title: fd.get('title'),
    destination: fd.get('destination'),
    category: fd.get('category'),
    duration: fd.get('duration'),
    startingPrice: parseFloat(fd.get('startingPrice')) || 0,
    travelStyle: fd.get('travelStyle'),
    shortDescription: fd.get('shortDescription'),
    overview: fd.get('overview'),
    featured: form.querySelector('[name="featured"]')?.checked || false,
    itinerary: itinerary.filter(Boolean),
    included,
    notIncluded,
    image: fd.get('imageUrl') || '../assets/heroimages/safarihero1.png',
    slug: fd.get('title')?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || genId(),
    whatsappMessage: `Hello Apple Tours! I'm interested in the "${fd.get('title')}". Please send me details and availability.`,
    currency: 'USD',
  };

  const tours = getData('tours');
  if (editId) {
    const idx = tours.findIndex(t => t.id === editId);
    if (idx >= 0) tours[idx] = { ...tours[idx], ...tourData };
  } else {
    tours.unshift(tourData);
  }

  setData('tours', tours);
  showToast(editId ? 'Tour updated successfully' : 'New tour added');
  closeTourModal();
  renderToursTable();
}

function deleteTour(id) {
  if (!confirm('Delete this tour? This cannot be undone.')) return;
  const tours = getData('tours').filter(t => t.id !== id);
  setData('tours', tours);
  showToast('Tour deleted');
  renderToursTable();
}

function toggleFeatured(id) {
  const tours = getData('tours');
  const tour = tours.find(t => t.id === id);
  if (tour) { tour.featured = !tour.featured; setData('tours', tours); renderToursTable(); showToast(tour.featured ? 'Marked as featured' : 'Removed from featured'); }
}

/* ---- Tours Search ---- */
function initTourSearch() {
  const input = $('#tour-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    $$('#tours-tbody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

/* ---- Inquiries ---- */
function renderInquiries(filterStatus = 'all') {
  const container = $('#inquiries-list');
  if (!container) return;

  let inquiries = getData('inquiries');
  if (filterStatus !== 'all') inquiries = inquiries.filter(i => i.status === filterStatus);
  inquiries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  container.innerHTML = inquiries.map(renderInquiryCard).join('') ||
    `<div style="text-align:center;padding:48px;color:var(--gray)">
       <div style="font-size:2rem;margin-bottom:8px">📬</div>
       <p>No inquiries found.</p>
     </div>`;

  const count = $('#inquiry-count');
  if (count) count.textContent = `${inquiries.length} inquiries`;
}

function renderInquiryCard(inq) {
  const waMsg = encodeURIComponent(`Hello ${inq.name}! Thank you for your inquiry about "${inq.tour}". We'd love to help plan your trip. Could we discuss your travel dates and preferences?`);
  return `
  <div class="inquiry-card" id="inq-${inq.id}">
    <div class="inquiry-top">
      <div>
        <div class="inquiry-name">${inq.name}</div>
        <div class="inquiry-contact">${inq.email} · ${inq.phone}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="status-badge status-${inq.status.toLowerCase()}">${inq.status}</span>
        <span style="font-size:.75rem;color:var(--gray)">${timeAgo(inq.submittedAt)}</span>
      </div>
    </div>
    <div class="inquiry-meta">
      <span class="inquiry-meta-item"><span class="icon">🌍</span> ${inq.tour}</span>
      ${inq.dates ? `<span class="inquiry-meta-item"><span class="icon">📅</span> ${inq.dates}</span>` : ''}
      ${inq.travelers ? `<span class="inquiry-meta-item"><span class="icon">👥</span> ${inq.travelers} travelers</span>` : ''}
      ${inq.budget ? `<span class="inquiry-meta-item"><span class="icon">💰</span> ${inq.budget}</span>` : ''}
    </div>
    ${inq.message ? `<div class="inquiry-message">"${inq.message}"</div>` : ''}
    ${inq.notes ? `<div style="font-size:.82rem;color:var(--forest);background:rgba(30,58,42,.06);padding:8px 12px;border-radius:6px;margin-bottom:12px"><strong>Notes:</strong> ${inq.notes}</div>` : ''}
    <div class="inquiry-actions">
      <select class="inquiry-status-select" onchange="updateInquiryStatus('${inq.id}', this.value)">
        ${['New','Contacted','Quoted','Confirmed','Paid','Completed','Cancelled'].map(s =>
          `<option value="${s}" ${s === inq.status ? 'selected' : ''}>${s}</option>`
        ).join('')}
      </select>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
        📱 WhatsApp
      </a>
      <a href="mailto:${inq.email}" class="btn btn-outline btn-sm">📧 Email</a>
      <button class="btn btn-ghost btn-sm" onclick="openNotesModal('${inq.id}')">📝 Notes</button>
      <button class="btn btn-danger btn-sm" onclick="deleteInquiry('${inq.id}')">🗑️</button>
    </div>
  </div>`;
}

function updateInquiryStatus(id, status) {
  const inquiries = getData('inquiries');
  const inq = inquiries.find(i => i.id === id);
  if (inq) { inq.status = status; setData('inquiries', inquiries); showToast(`Status updated to ${status}`); }
}

function deleteInquiry(id) {
  if (!confirm('Delete this inquiry permanently?')) return;
  const inquiries = getData('inquiries').filter(i => i.id !== id);
  setData('inquiries', inquiries);
  document.getElementById(`inq-${id}`)?.remove();
  showToast('Inquiry deleted');
}

function openNotesModal(id) {
  const modal = $('#notes-modal');
  if (!modal) return;
  const inq = getData('inquiries').find(i => i.id === id);
  const textarea = modal.querySelector('.notes-textarea');
  if (textarea) textarea.value = inq?.notes || '';
  modal.querySelector('.save-notes-btn').dataset.id = id;
  modal.classList.add('open');
}

function saveNotes(id) {
  const textarea = $('#notes-modal .notes-textarea');
  const notes = textarea?.value || '';
  const inquiries = getData('inquiries');
  const inq = inquiries.find(i => i.id === id);
  if (inq) { inq.notes = notes; setData('inquiries', inquiries); showToast('Notes saved'); }
  $('#notes-modal')?.classList.remove('open');
  renderInquiries();
}

function initInquiryFilters() {
  $$('.inquiry-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.inquiry-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderInquiries(btn.dataset.filter || 'all');
    });
  });

  const searchInput = $('#inquiry-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      $$('.inquiry-card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

/* ---- Content Management ---- */
function renderContent() {
  // Hero content
  const heroTitle = localStorage.getItem('ats_hero_title') || 'Explore Zanzibar & Tanzania With Local Experts';
  const heroSub = localStorage.getItem('ats_hero_sub') || 'Award-winning tours and safaris crafted by local experts. Small groups, authentic experiences, lifelong memories.';

  const heroTitleEl = $('#content-hero-title');
  const heroSubEl = $('#content-hero-subtitle');
  if (heroTitleEl) heroTitleEl.value = heroTitle;
  if (heroSubEl) heroSubEl.value = heroSub;
}

function saveHeroContent() {
  const title = $('#content-hero-title')?.value;
  const sub = $('#content-hero-subtitle')?.value;
  if (title) localStorage.setItem('ats_hero_title', title);
  if (sub) localStorage.setItem('ats_hero_sub', sub);
  showToast('Homepage content updated');
}

/* ---- Testimonials Management ---- */
function renderTestimonialsAdmin() {
  const container = $('#testimonials-admin-list');
  if (!container) return;
  const testimonials = getData('testimonials');
  container.innerHTML = testimonials.map((t, i) => `
    <div class="admin-card" style="margin-bottom:12px;padding:0">
      <div style="padding:16px 20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <strong style="font-size:.9rem">${t.name} ${t.flag || ''}</strong>
            <div style="font-size:.78rem;color:var(--gray)">${t.country} · ${t.tour}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editTestimonial(${i})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTestimonial(${i})">Delete</button>
          </div>
        </div>
        <p style="font-size:.85rem;color:var(--gray-dark);line-height:1.6;font-style:italic">"${t.quote}"</p>
      </div>
    </div>
  `).join('');
}

function deleteTestimonial(index) {
  if (!confirm('Delete this testimonial?')) return;
  const t = getData('testimonials');
  t.splice(index, 1);
  setData('testimonials', t);
  renderTestimonialsAdmin();
  showToast('Testimonial deleted');
}

/* ---- Blog Admin ---- */
function renderBlogAdmin() {
  const tbody = $('#blog-tbody');
  if (!tbody) return;
  const posts = getData('blog_posts');
  tbody.innerHTML = posts.map((p, i) => `
    <tr>
      <td><strong>${p.title}</strong></td>
      <td>${p.category}</td>
      <td>${p.readTime}</td>
      <td>${new Date(p.date).toLocaleDateString()}</td>
      <td><span class="status-badge ${p.featured ? 'status-active' : 'status-draft'}">${p.featured ? 'Featured' : 'Standard'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="editBlogPost(${i})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBlogPost(${i})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--gray)">No posts yet.</td></tr>';
}

function deleteBlogPost(index) {
  if (!confirm('Delete this blog post?')) return;
  const posts = getData('blog_posts');
  posts.splice(index, 1);
  setData('blog_posts', posts);
  renderBlogAdmin();
  showToast('Post deleted');
}

/* ---- Gallery / File Upload ---- */
function initUploadZone() {
  $$('.upload-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--forest)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      handleFiles(e.dataTransfer.files, zone);
    });
    zone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.multiple = true;
      input.onchange = (e) => handleFiles(e.target.files, zone);
      input.click();
    });
  });
}

function handleFiles(files, zone) {
  const preview = zone.parentElement.querySelector('.image-preview-grid');
  [...files].forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="">
          <button class="image-preview-remove" onclick="this.parentElement.remove()">×</button>
        `;
        preview.appendChild(div);
      }
      showToast(`${file.name} uploaded`);
    };
    reader.readAsDataURL(file);
  });
}

/* ---- Export Data ---- */
function exportData() {
  const data = {
    tours: getData('tours'),
    hotels: getData('hotels'),
    testimonials: getData('testimonials'),
    blog_posts: getData('blog_posts'),
    inquiries: getData('inquiries'),
    exported: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `applesafaris-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.tours) setData('tours', data.tours);
      if (data.inquiries) setData('inquiries', data.inquiries);
      if (data.testimonials) setData('testimonials', data.testimonials);
      if (data.blog_posts) setData('blog_posts', data.blog_posts);
      showToast('Data imported successfully. Refreshing...');
      setTimeout(() => location.reload(), 1200);
    } catch {
      showToast('Invalid file format', 'error');
    }
  };
  reader.readAsText(file);
}

/* ---- Tabs ---- */
function initTabs() {
  $$('.tabs').forEach(tabGroup => {
    const tabs = $$('.tab', tabGroup);
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const parent = tab.closest('[data-tab-container]') || document;
        $$('.tab-panel', parent).forEach(p => p.classList.remove('active'));
        $(`#tab-${target}`, parent)?.classList.add('active');
      });
    });
  });
}

/* ---- Modals ---- */
function initModals() {
  $$('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-backdrop')?.classList.remove('open');
    });
  });
}

/* ---- Helpers ---- */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString()}`;
}

function statusDotColor(status) {
  const map = { New: 'dot-blue', Contacted: 'dot-gold', Quoted: 'dot-gold', Confirmed: 'dot-green', Paid: 'dot-green', Completed: 'dot-green', Cancelled: 'dot-red' };
  return map[status] || 'dot-blue';
}

/* ---- Badge counts ---- */
function updateBadgeCounts() {
  const newInqs = getData('inquiries').filter(i => i.status === 'New').length;
  const badge = $('.sidebar-link[data-section="inquiries"] .sidebar-badge');
  if (badge) { badge.textContent = newInqs; badge.style.display = newInqs ? '' : 'none'; }
  const topBadge = $('.topbar-badge');
  if (topBadge) topBadge.textContent = newInqs;
}

/* ---- Init App ---- */
async function initApp() {
  await seedData();
  initSidebarNav();
  initModals();
  initTabs();
  initTourSearch();
  initInquiryFilters();
  initUploadZone();
  updateBadgeCounts();
  navigateTo('dashboard');

  // Global button handlers
  $('#add-tour-btn')?.addEventListener('click', () => openTourModal());
  $('#save-tour-btn')?.addEventListener('click', saveTour);
  $('#close-tour-modal')?.addEventListener('click', closeTourModal);
  $('#add-day-btn')?.addEventListener('click', addItineraryDay);
  $('#add-included-btn')?.addEventListener('click', () => addIncludedItem('#included-builder', 'included'));
  $('#add-notincluded-btn')?.addEventListener('click', () => addIncludedItem('#notincluded-builder', 'notIncluded'));
  $('#save-hero-btn')?.addEventListener('click', saveHeroContent);
  $('#export-btn')?.addEventListener('click', exportData);
  $('#import-input')?.addEventListener('change', importData);
  $('.save-notes-btn')?.addEventListener('click', function() { saveNotes(this.dataset.id); });

  // View site link
  $('.topbar-view-site')?.addEventListener('click', () => window.open('../index.html', '_blank'));
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  checkAuth();
});
