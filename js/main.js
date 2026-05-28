/* ====================================================
   Apple Tours & Safaris — Main JavaScript
   ==================================================== */

const WHATSAPP_NUMBER = '255742000000'; // Replace with real number

/* ---- Utility Helpers ---- */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function formatCurrency(amount, currency = 'USD') {
  return `$${Number(amount).toLocaleString()}`;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function openWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
}

/* ---- Toast Notifications ---- */
function showToast(message, type = 'success') {
  let toast = $('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

/* ---- Navigation ---- */
function initNav() {
  const nav = $('.nav');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
      nav.classList.remove('transparent');
    } else {
      nav.classList.remove('scrolled');
      if (nav.dataset.transparent === 'true') nav.classList.add('transparent');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile toggle
  const toggle = $('.nav-toggle');
  const menu = $('.mobile-menu');
  if (toggle && menu) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/* ---- Hero Slideshow ---- */
function initHeroSlider() {
  const slides = $$('.hero-slide');
  const dots = $$('.hero-dot');
  if (!slides.length) return;

  let current = 0;
  let interval;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(index) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function startAuto() {
    if (reduceMotion || document.hidden) return;
    interval = setInterval(() => goTo(current + 1), 5500);
  }

  function stopAuto() { clearInterval(interval); }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); });
  });

  goTo(0);
  startAuto();
  document.addEventListener('visibilitychange', () => {
    stopAuto();
    if (!document.hidden) startAuto();
  });
}

/* ---- Scroll Reveal ---- */
function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  els.forEach(el => observer.observe(el));
}

/* ---- FAQ Accordion ---- */
function initFaq() {
  $$('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ---- Testimonials Carousel ---- */
function initTestimonials() {
  const track = $('.testimonials-track');
  const cards = $$('.testimonial-card');
  if (!track || !cards.length) return;

  let current = 0;
  const perView = window.innerWidth < 640 ? 1 : window.innerWidth < 900 ? 1 : 3;
  const max = Math.max(0, cards.length - perView);

  function goTo(index) {
    current = Math.max(0, Math.min(index, max));
    const offset = current * (100 / perView);
    track.style.transform = `translateX(-${offset}%)`;
  }

  $('.testimonial-prev')?.addEventListener('click', () => goTo(current - 1));
  $('.testimonial-next')?.addEventListener('click', () => goTo(current + 1));

  // Auto-advance
  setInterval(() => goTo(current < max ? current + 1 : 0), 6000);
}

/* ---- Search Filter ---- */
function initSearchForm() {
  const form = $('.search-form-el');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const params = new URLSearchParams(
      Object.entries(data).filter(([,v]) => v)
    );
    window.location.href = `pages/tours.html?${params}`;
  });
}

/* ---- Tours Grid (dynamic from JSON) ---- */
async function loadTours() {
  const container = $('.tours-grid[data-source]');
  if (!container) return;

  const source = container.dataset.source;
  const category = container.dataset.category || null;
  const limit = parseInt(container.dataset.limit || '99');
  const featured = container.dataset.featured === 'true';

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();

    let tours = data.tours;
    if (category) tours = tours.filter(t => t.category === category);
    if (featured) tours = tours.filter(t => t.featured);
    tours = tours.slice(0, limit);

    container.innerHTML = tours.map(renderTourCard).join('');
    initWishlist();
  } catch (err) {
    container.innerHTML = `<p style="color:var(--gray);padding:20px">Unable to load tours at this time.</p>`;
  }
}

function renderTourCard(tour) {
  const styleClass = `badge-${escapeHTML(tour.travelStyle.toLowerCase())}`;
  const highlights = (tour.highlights || []).slice(0, 3).map(h =>
    `<div class="tour-highlight-item">${escapeHTML(h)}</div>`
  ).join('');

  const whatsappMsg = encodeURIComponent(tour.whatsappMessage || `Hello Apple Tours! I'm interested in the "${tour.title}". Please send me details.`);
  const title = escapeHTML(tour.title);

  return `
  <article class="tour-card reveal">
    <a href="${getTourDetailUrl(tour.slug)}" class="tour-card-image" aria-label="${title}">
      <img src="${escapeHTML(tour.image)}" alt="${title}" loading="lazy" decoding="async">
      <span class="tour-card-badge ${styleClass}">${escapeHTML(tour.travelStyle)}</span>
      <button class="tour-card-wishlist" data-id="${tour.id}" aria-label="Save to wishlist">♡</button>
    </a>
    <div class="tour-card-body">
      <div class="tour-meta">
        <span class="tour-location">📍 ${escapeHTML(tour.destination)}</span>
        <span class="tour-duration">🕐 ${escapeHTML(tour.duration)}</span>
      </div>
      <h3 class="tour-card-title">${title}</h3>
      <p class="tour-card-desc">${escapeHTML(tour.shortDescription)}</p>
      <div class="tour-highlights">${highlights}</div>
    </div>
    <div class="tour-card-footer">
      <div class="tour-price">
        <span class="from">From</span>
        <span class="amount">${formatCurrency(tour.startingPrice)}</span>
        <span class="per">per person</span>
      </div>
      <div class="tour-card-actions">
        <a href="${getTourDetailUrl(tour.slug)}" class="btn btn-outline-dark btn-sm">Details</a>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          WhatsApp
        </a>
      </div>
    </div>
  </article>`;
}

function getTourDetailUrl(slug) {
  const isRoot = !window.location.pathname.includes('/pages/');
  return isRoot ? `pages/tour-detail.html?tour=${slug}` : `tour-detail.html?tour=${slug}`;
}

/* ---- Wishlist ---- */
function initWishlist() {
  const saved = JSON.parse(localStorage.getItem('ats_wishlist') || '[]');

  $$('.tour-card-wishlist').forEach(btn => {
    const id = btn.dataset.id;
    if (saved.includes(id)) {
      btn.textContent = '♥';
      btn.classList.add('active');
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const list = JSON.parse(localStorage.getItem('ats_wishlist') || '[]');
      const idx = list.indexOf(id);
      if (idx >= 0) {
        list.splice(idx, 1);
        btn.textContent = '♡';
        btn.classList.remove('active');
        showToast('Removed from saved trips');
      } else {
        list.push(id);
        btn.textContent = '♥';
        btn.classList.add('active');
        showToast('Saved to your wishlist ♥');
      }
      localStorage.setItem('ats_wishlist', JSON.stringify(list));
    });
  });
}

/* ---- Hotel Cards ---- */
async function loadHotels() {
  const container = $('.hotels-grid[data-source]');
  if (!container) return;

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();
    container.innerHTML = data.hotels.map(renderHotelCard).join('');
  } catch {}
}

function renderHotelCard(hotel) {
  const stars = '★'.repeat(hotel.stars) + '☆'.repeat(5 - hotel.stars);
  const name = escapeHTML(hotel.name);
  return `
  <article class="tour-card reveal">
    <div class="tour-card-image">
      <img src="${escapeHTML(hotel.image)}" alt="${name}" loading="lazy" decoding="async">
      <span class="tour-card-badge badge-comfort">${escapeHTML(hotel.category)}</span>
    </div>
    <div class="tour-card-body">
      <div class="tour-meta">
        <span class="tour-location">📍 ${escapeHTML(hotel.location)}</span>
        <span style="color:#F5A623;font-size:.8rem">${stars}</span>
      </div>
      <h3 class="tour-card-title">${name}</h3>
      <p class="tour-card-desc">${escapeHTML(hotel.description)}</p>
      <div class="tour-highlights">
        ${(hotel.amenities || []).slice(0,3).map(a => `<div class="tour-highlight-item">${escapeHTML(a)}</div>`).join('')}
      </div>
    </div>
    <div class="tour-card-footer">
      <div class="tour-price">
        <span class="from">From</span>
        <span class="amount">${formatCurrency(hotel.startingPrice)}</span>
        <span class="per">/ night</span>
      </div>
      <div class="tour-card-actions">
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Apple Tours! I'm interested in booking ${hotel.name}. Please send me availability and rates.`)}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
          Book via WhatsApp
        </a>
      </div>
    </div>
  </article>`;
}

/* ---- Testimonials (dynamic) ---- */
async function loadTestimonials() {
  const container = $('.testimonials-track');
  if (!container || container.dataset.source !== 'json') return;

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();
    container.innerHTML = data.testimonials.map(renderTestimonial).join('');
    initTestimonials();
  } catch {}
}

function renderTestimonial(t) {
  const initials = t.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  return `
  <div class="testimonial-card">
    <div class="testimonial-inner">
      <div class="testimonial-stars">${'★'.repeat(t.rating)}</div>
      <p class="testimonial-quote">${escapeHTML(t.quote)}</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${initials}</div>
        <div>
          <div class="testimonial-name">${escapeHTML(t.name)} ${escapeHTML(t.flag)}</div>
          <div class="testimonial-detail">${escapeHTML(t.country)}</div>
          <span class="testimonial-tour">${escapeHTML(t.tour)}</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---- Blog Cards ---- */
async function loadBlogPosts() {
  const container = $('.blog-grid[data-source]');
  if (!container) return;

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();
    const posts = data.blogPosts.slice(0, parseInt(container.dataset.limit || '99'));
    container.innerHTML = posts.map(renderBlogCard).join('');
  } catch {}
}

function renderBlogCard(post) {
  const date = new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
  <article class="blog-card reveal">
    <div class="blog-card-image">
      <img src="${escapeHTML(post.image)}" alt="${escapeHTML(post.title)}" loading="lazy" decoding="async">
    </div>
    <div class="blog-card-body">
      <div class="blog-cat">${escapeHTML(post.category)}</div>
      <h3 class="blog-card-title">${escapeHTML(post.title)}</h3>
      <p class="blog-card-excerpt">${escapeHTML(post.excerpt)}</p>
      <div class="blog-meta">
        <span>${date}</span>
        <span>${post.readTime}</span>
      </div>
    </div>
  </article>`;
}

/* ---- Stats Counter ---- */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const isDecimal = target % 1 !== 0;
      const duration = 2000;
      const start = performance.now();

      function update(time) {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        el.textContent = isDecimal ? current.toFixed(1) : Math.round(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}

/* ---- WhatsApp Buttons ---- */
function initWhatsAppButtons() {
  $$('[data-wa]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const msg = btn.dataset.wa || 'Hello Apple Tours & Safaris! I\'d like to plan a trip.';
      openWhatsApp(msg);
    });
  });
}

/* ---- Inquiry Form (main site) ---- */
function initInquiryForm() {
  const form = $('.inquiry-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('[type=submit]');
    const original = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    const data = Object.fromEntries(new FormData(form));

    // Validate required fields
    const required = ['name', 'email', 'phone', 'tour'];
    const missing = required.filter(f => !data[f]?.trim());
    if (missing.length) {
      showToast('Please fill in all required fields', 'error');
      btn.textContent = original;
      btn.disabled = false;
      return;
    }

    // Save to localStorage (replace with API call when backend is connected)
    const inquiries = JSON.parse(localStorage.getItem('ats_inquiries') || '[]');
    const inquiry = {
      id: Date.now().toString(),
      ...data,
      status: 'New',
      submittedAt: new Date().toISOString(),
    };
    inquiries.unshift(inquiry);
    localStorage.setItem('ats_inquiries', JSON.stringify(inquiries));

    // Build WhatsApp message
    const waMsg = `Hello Apple Tours & Safaris!

My name is ${data.name}
📧 Email: ${data.email}
📱 Phone: ${data.phone}
🌍 Tour/Package: ${data.tour}
📅 Travel Dates: ${data.dates || 'Flexible'}
👥 Number of Travelers: ${data.travelers || 'TBD'}
💰 Budget: ${data.budget || 'To discuss'}

Message: ${data.message || 'No additional message.'}

Sent via applesafaris.com inquiry form.`;

    showToast('Inquiry sent! Opening WhatsApp...');
    setTimeout(() => openWhatsApp(waMsg), 800);

    form.reset();
    btn.textContent = original;
    btn.disabled = false;
  });
}

/* ---- Tour Detail Page ---- */
async function initTourDetail() {
  const container = $('#tour-detail-content');
  if (!container) return;

  const slug = new URLSearchParams(window.location.search).get('tour');
  if (!slug) return;

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();
    const tour = data.tours.find(t => t.slug === slug || t.id === slug);

    if (!tour) {
      container.innerHTML = '<p>Tour not found.</p>';
      return;
    }

    renderTourDetail(tour);
  } catch (err) {
    container.innerHTML = '<p>Unable to load tour details.</p>';
  }
}

function renderTourDetail(tour) {
  document.title = `${tour.title} | Apple Tours & Safaris`;

  const hero = $('#tour-detail-hero');
  if (hero) {
    hero.style.backgroundImage = `url('${tour.image}')`;
    hero.querySelector('.tour-detail-title').textContent = tour.title;
    hero.querySelector('.tour-detail-dest').textContent = tour.destination;
    hero.querySelector('.tour-detail-duration').textContent = tour.duration;
  }

  const content = $('#tour-detail-content');
  if (!content) return;

  const itinerary = (tour.itinerary || []).map((day, i) => `
    <div class="itinerary-day">
      <div class="itinerary-day-num">${i + 1}</div>
      <div class="itinerary-day-content">
        <h4>${day.title}</h4>
        <p>${day.description}</p>
      </div>
    </div>`).join('');

  const included = (tour.included || []).map(i => `
    <div class="inc-item"><span class="check">✓</span> ${i}</div>`).join('');

  const notIncluded = (tour.notIncluded || []).map(i => `
    <div class="inc-item"><span class="cross">✗</span> ${i}</div>`).join('');

  const reviews = (tour.reviews || []).map(r => `
    <div class="testimonial-inner" style="margin-bottom:16px">
      <div class="testimonial-stars">${'★'.repeat(r.rating)}</div>
      <p class="testimonial-quote">${r.comment}</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${r.name[0]}</div>
        <div>
          <div class="testimonial-name">${r.name}</div>
          <div class="testimonial-detail">${r.country}</div>
        </div>
      </div>
    </div>`).join('');

  const faqs = (tour.faqs || []).map(f => `
    <div class="faq-item">
      <button class="faq-question">${f.q} <span class="faq-icon">+</span></button>
      <div class="faq-answer"><div class="faq-answer-inner">${f.a}</div></div>
    </div>`).join('');

  content.innerHTML = `
    <div class="detail-section">
      <h3>Overview</h3>
      <p>${tour.overview}</p>
    </div>

    ${tour.itinerary?.length ? `
    <div class="detail-section">
      <h3>Itinerary</h3>
      <div class="itinerary-list">${itinerary}</div>
    </div>` : ''}

    <div class="detail-section">
      <h3>What's Included / Not Included</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <h4 style="font-size:.875rem;color:var(--forest);margin-bottom:12px">✓ Included</h4>
          <div class="inc-list">${included}</div>
        </div>
        <div>
          <h4 style="font-size:.875rem;color:#E53E3E;margin-bottom:12px">✗ Not Included</h4>
          <div class="inc-list">${notIncluded}</div>
        </div>
      </div>
    </div>

    ${tour.pickup ? `
    <div class="detail-section">
      <h3>Pickup & Meeting Point</h3>
      <p>${tour.pickup}</p>
    </div>` : ''}

    ${tour.reviews?.length ? `
    <div class="detail-section">
      <h3>Traveller Reviews</h3>
      ${reviews}
    </div>` : ''}

    ${tour.faqs?.length ? `
    <div class="detail-section">
      <h3>Frequently Asked Questions</h3>
      <div class="faq-list">${faqs}</div>
    </div>` : ''}
  `;

  // Booking sidebar
  const sidebar = $('#tour-booking-sidebar');
  if (sidebar) {
    sidebar.querySelector('.price-amount').textContent = formatCurrency(tour.startingPrice);
    sidebar.querySelector('.booking-tour-name').textContent = tour.title;

    const waBtn = sidebar.querySelector('.booking-wa-btn');
    if (waBtn) {
      waBtn.addEventListener('click', () => openWhatsApp(tour.whatsappMessage));
    }
  }

  // Prefill inquiry form
  const tourField = $('#booking-tour-field');
  if (tourField) tourField.value = tour.title;

  initFaq();
}

/* ---- Tours Filter Page ---- */
function initToursFilter() {
  const filterBtns = $$('.filter-btn[data-filter]');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const cards = $$('.tour-card');
      let visible = 0;

      cards.forEach(card => {
        const cat = card.dataset.category || '';
        const show = filter === 'all' || cat === filter;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      const count = $('.filter-count');
      if (count) count.textContent = `${visible} tours`;
    });
  });
}

/* ---- Stats (from JSON) ---- */
async function loadStats() {
  const els = $$('[data-stat]');
  if (!els.length) return;

  try {
    const base = document.documentElement.dataset.base || '';
    const res = await fetch(`${base}data/tours.json`);
    const data = await res.json();
    els.forEach(el => {
      const key = el.dataset.stat;
      if (data.stats[key] !== undefined) {
        el.dataset.count = data.stats[key];
      }
    });
    initCounters();
  } catch {
    initCounters();
  }
}

/* ---- Smooth Scroll ---- */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ---- Lazy Load Images ---- */
function initLazyLoad() {
  if ('loading' in HTMLImageElement.prototype) return; // native lazy load supported

  const imgs = $$('img[loading="lazy"]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.src = e.target.dataset.src || e.target.src;
        observer.unobserve(e.target);
      }
    });
  });
  imgs.forEach(img => observer.observe(img));
}

/* ---- Gallery Lightbox ---- */
function initGallery() {
  $$('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;

      const lightbox = document.createElement('div');
      lightbox.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99999;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        padding:20px;
      `;
      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.style.cssText = 'max-width:90%;max-height:90vh;object-fit:contain;border-radius:8px';
      lightbox.appendChild(imgEl);
      lightbox.addEventListener('click', () => lightbox.remove());
      document.body.appendChild(lightbox);
    });
  });
}

/* ---- Page-specific URL param handling ---- */
function initFromParams() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const destination = params.get('destination');

  if (category) {
    const btn = $(`.filter-btn[data-filter="${category}"]`);
    if (btn) { btn.click(); }
  }

  const destSelect = $('select[name="destination"]');
  if (destSelect && destination) destSelect.value = destination;
}

/* ---- Init on DOMContentLoaded ---- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroSlider();
  initReveal();
  initFaq();
  initSearchForm();
  initWhatsAppButtons();
  initInquiryForm();
  initSmoothScroll();
  initLazyLoad();
  initGallery();
  initFromParams();

  // Page-specific loaders
  loadTours();
  loadHotels();
  loadBlogPosts();
  loadStats();
  loadTestimonials();
  initTourDetail();
  initToursFilter();
});
