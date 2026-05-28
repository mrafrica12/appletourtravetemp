/* ================================================================
   APPLE TOURS & SAFARIS — BOOKING FORMS ENGINE
   Multi-step wizard · Specialized forms · WhatsApp bridge
   ================================================================ */

const WA = '255742000000';
const STORAGE_KEY = 'ats_wiz_v2';

/* ----------------------------------------------------------------
   UTILITIES
   ---------------------------------------------------------------- */

function wa(msg) {
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
}

function $id(id) { return document.getElementById(id); }
function $q(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function saveLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function loadLocal(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function showToast(msg, type = 'success') {
  let t = $q('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast ${type}`;
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3500);
}

async function submitToCRM(formOrData, formType, extra = {}) {
  if (!window.AppleSafarisCRM) return { ok: true };
  const result = await window.AppleSafarisCRM.submitForm(formOrData, formType, extra);
  if (!result.ok) showToast(result.message || 'Please check the form and try again.', 'error');
  return result;
}

/* ----------------------------------------------------------------
   OPTION CARDS — click to select
   ---------------------------------------------------------------- */

function initOptionCards() {
  $all('.bk-opt').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.group;
      if (group) {
        $all(`.bk-opt[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      }
      card.classList.toggle('selected');
      if (card.dataset.hidden) {
        const hidden = $id(card.dataset.hidden);
        if (hidden) hidden.value = card.dataset.value || card.querySelector('.bk-opt-title')?.textContent || '';
      }
    });
  });
}

/* ----------------------------------------------------------------
   TAG CHIPS — multi-select toggles
   ---------------------------------------------------------------- */

function initTags() {
  $all('.bk-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
      const group = tag.dataset.group;
      if (group) {
        const hidden = $id(group);
        if (hidden) {
          const vals = $all(`.bk-tag[data-group="${group}"].selected`).map(t => t.textContent.trim());
          hidden.value = vals.join(', ');
        }
      }
    });
  });
}

/* ----------------------------------------------------------------
   STEPPER — quantity selector
   ---------------------------------------------------------------- */

function initSteppers() {
  $all('.bk-stepper').forEach(stepper => {
    const minus = $q('.bk-stepper-btn.minus', stepper);
    const plus  = $q('.bk-stepper-btn.plus', stepper);
    const val   = $q('.bk-stepper-val', stepper);
    const hidden = $q('input[type=hidden]', stepper) || $id(stepper.dataset.target);
    const min = parseInt(stepper.dataset.min ?? '0');
    const max = parseInt(stepper.dataset.max ?? '99');

    let current = parseInt(stepper.dataset.value ?? min);
    function update(n) {
      current = Math.max(min, Math.min(max, n));
      val.textContent = current;
      if (hidden) hidden.value = current;
      if (minus) minus.disabled = current <= min;
      if (plus)  plus.disabled  = current >= max;
    }
    update(current);
    minus?.addEventListener('click', () => update(current - 1));
    plus?.addEventListener('click',  () => update(current + 1));
  });
}

/* ----------------------------------------------------------------
   TOGGLE SWITCHES
   ---------------------------------------------------------------- */

function initToggles() {
  $all('.bk-toggle-row').forEach(row => {
    row.addEventListener('click', () => {
      row.classList.toggle('on');
      const hidden = $id(row.dataset.target);
      if (hidden) hidden.value = row.classList.contains('on') ? 'Yes' : 'No';
    });
  });
}

/* ----------------------------------------------------------------
   VEHICLE CARDS (transfers page)
   ---------------------------------------------------------------- */

function initVehicleCards() {
  $all('.vehicle-card').forEach(card => {
    card.addEventListener('click', () => {
      $all('.vehicle-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const hidden = $id('vehicleType');
      if (hidden) hidden.value = card.dataset.vehicle || card.querySelector('.vehicle-card-name')?.textContent || '';
    });
  });
}

/* ----------------------------------------------------------------
   6-STEP BOOKING WIZARD
   ---------------------------------------------------------------- */

(function initWizard() {
  const wrap = $q('.wizard-wrap');
  if (!wrap) return;

  const panels  = $all('.wizard-panel', wrap);
  const dots    = $all('.wz-step',      wrap);
  const lines   = $all('.wz-line',      wrap);
  const bar     = $q('.wizard-bar',     wrap);
  const success = $q('.wizard-success', wrap);
  const TOTAL   = panels.length;

  let current = 0;
  const data  = loadLocal(STORAGE_KEY);

  // Restore saved values
  Object.entries(data).forEach(([k, v]) => {
    const el = wrap.querySelector(`[name="${k}"]`);
    if (el) el.value = v;
  });

  function setStep(n) {
    panels.forEach((p, i) => p.classList.toggle('active', i === n));
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === n);
      d.classList.toggle('done',   i < n);
      if (i < n) d.querySelector('.wz-step-num').textContent = '✓';
      else        d.querySelector('.wz-step-num').textContent = i + 1;
    });
    lines.forEach((l, i) => l.classList.toggle('done', i < n));
    if (bar) bar.style.width = `${(n / (TOTAL - 1)) * 100}%`;
    current = n;
    window.scrollTo({ top: wrap.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
  }

  function collectStep() {
    const panel = panels[current];
    const inputs = $all('input, select, textarea', panel);
    inputs.forEach(inp => { if (inp.name) data[inp.name] = inp.value; });
    saveLocal(STORAGE_KEY, data);
  }

  function validateStep() {
    const panel = panels[current];
    let ok = true;
    $all('[required]', panel).forEach(inp => {
      if (!inp.value.trim()) {
        inp.classList.add('error');
        ok = false;
        inp.addEventListener('input', () => inp.classList.remove('error'), { once: true });
      }
    });
    if (!ok) showToast('Please fill in the required fields', 'error');
    return ok;
  }

  // Next / Back button wire-up
  $all('.wz-next', wrap).forEach(btn => {
    btn.addEventListener('click', () => {
      if (!validateStep()) return;
      collectStep();
      if (current < TOTAL - 1) {
        if (current === TOTAL - 2) buildReview();
        setStep(current + 1);
      } else {
        submitWizard();
      }
    });
  });

  $all('.wz-back', wrap).forEach(btn => {
    btn.addEventListener('click', () => {
      if (current > 0) { collectStep(); setStep(current - 1); }
    });
  });

  function buildReview() {
    const card = $id('wizReview');
    if (!card) return;
    collectStep();

    const fields = [
      ['Name',          data.name],
      ['Email',         data.email],
      ['WhatsApp',      data.phone],
      ['Nationality',   data.nationality],
      ['Service',       data.service],
      ['Arrival',       data.arrivalDate],
      ['Departure',     data.departureDate],
      ['Adults',        data.adults],
      ['Children',      data.children],
      ['Budget',        data.budget],
      ['Luxury Level',  data.luxuryLevel],
      ['Accommodation', data.accommodation],
      ['Activities',    data.activities],
      ['Notes',         data.notes],
    ].filter(([, v]) => v && v.trim());

    card.innerHTML = fields.map(([k, v]) => `
      <div class="review-row">
        <span class="review-key">${k}</span>
        <span class="review-val">${v}</span>
      </div>`).join('');
  }

  async function submitWizard() {
    const btn = $q('.wz-submit', wrap);
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    collectStep();

    const msg = buildWizardWA(data);
    const result = await submitToCRM(data, 'custom_trip', { service: data.service || 'Universal Booking Wizard' });
    if (!result.ok) {
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
      return;
    }

    const storedMsg = result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg;
    $q('.wizard-panels', wrap).style.display = 'none';
    $q('.wizard-track', wrap).style.display  = 'none';
    $q('.wizard-bar-wrap', wrap).style.display = 'none';
    if (success) success.classList.add('show');
    localStorage.removeItem(STORAGE_KEY);
    wa(storedMsg);
  }

  function buildWizardWA(d) {
    return `🌿 *New Booking — Apple Tours & Safaris*

👤 *Name:* ${d.name || '—'}
📧 *Email:* ${d.email || '—'}
📱 *WhatsApp:* ${d.phone || '—'}
🌍 *Nationality:* ${d.nationality || '—'}

✈️ *Service:* ${d.service || '—'}
📅 *Arrival:* ${d.arrivalDate || '—'}
📅 *Departure:* ${d.departureDate || '—'}
👥 *Adults:* ${d.adults || '1'}  |  *Children:* ${d.children || '0'}

💰 *Budget:* ${d.budget || '—'}
⭐ *Luxury Level:* ${d.luxuryLevel || '—'}
🏕️ *Accommodation:* ${d.accommodation || '—'}
🎯 *Activities:* ${d.activities || '—'}

📝 *Notes:* ${d.notes || 'None'}

_Sent via applesafaris.com booking form_`;
  }

  setStep(0);
})();

/* ----------------------------------------------------------------
   QUICK INQUIRY FORM (homepage)
   ---------------------------------------------------------------- */

(function initQuickInquiry() {
  const form = $q('.quick-inquiry-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'service'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill in all required fields', 'error'); return; }

    const msg = `🌿 *Quick Inquiry — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📱 *WhatsApp:* ${d.phone}
✈️ *Interested In:* ${d.service}
📅 *Travel Date:* ${d.travelDate || 'Flexible'}

💬 *Message:* ${d.message || 'No additional message.'}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'quick_inquiry', { service: d.service });
    if (!result.ok) return;
    showToast(result.offline ? 'Inquiry saved locally — opening WhatsApp…' : 'Inquiry saved — opening WhatsApp…');
    setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 400);
    form.reset();
  });
})();

/* ----------------------------------------------------------------
   ZANZIBAR / TOUR DETAIL BOOKING FORM
   ---------------------------------------------------------------- */

(function initTourForm() {
  const form = $q('.tour-booking-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'tour', 'date'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill Name, WhatsApp, Tour & Date', 'error'); return; }

    const msg = `🌴 *Zanzibar Excursion Booking*

👤 *Name:* ${d.name}
📱 *WhatsApp:* ${d.phone}
🗺️ *Tour:* ${d.tour}
📅 *Date:* ${d.date}
👥 *Adults:* ${d.adults || '1'}  |  *Children:* ${d.children || '0'}
🏨 *Pickup Hotel:* ${d.hotel || 'TBD'}
👥 *Type:* ${d.tourType || 'Group'}

📝 *Notes:* ${d.notes || 'None'}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'tour_booking', { service: d.tour });
    if (!result.ok) return;
    showToast('Booking saved — opening WhatsApp…');
    setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 400);
  });
})();

/* ----------------------------------------------------------------
   SAFARI PACKAGE FORM
   ---------------------------------------------------------------- */

(function initSafariForm() {
  const form = $q('.safari-booking-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'email', 'package'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill in required fields', 'error'); return; }

    const btn = $q('[type=submit]', form);
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    const msg = `🦁 *Safari Package Inquiry — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📧 *Email:* ${d.email}
📱 *WhatsApp:* ${d.phone}
🌍 *Nationality:* ${d.nationality || '—'}

🗺️ *Package:* ${d.package}
📅 *Travel Dates:* ${d.travelDates || 'Flexible'}
👥 *Travelers:* ${d.travelers || '2'}
💰 *Budget:* ${d.budget || 'To discuss'}
⭐ *Luxury Level:* ${d.luxuryLevel || '—'}
🏕️ *Accommodation:* ${d.accommodation || '—'}
✈️ *Internal Flights:* ${d.internalFlights || 'No'}
🏝️ *Zanzibar Add-on:* ${d.zanzibarAddon || 'No'}

📝 *Notes:* ${d.notes || 'None'}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'safari_lead', { service: d.package });
    if (result.ok) {
      showToast('Safari lead saved — opening WhatsApp…');
      setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 600);
    }
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
  });
})();

/* ----------------------------------------------------------------
   AIRPORT TRANSFER FORM
   ---------------------------------------------------------------- */

(function initTransferForm() {
  const form = $q('.transfer-booking-form');
  if (!form) return;

  // Direction toggle: arrival / departure
  $all('.direction-opt', form).forEach(opt => {
    opt.addEventListener('click', () => {
      $all('.direction-opt', form).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const hidden = $id('transferDirection');
      if (hidden) hidden.value = opt.dataset.value;

      const isArrival = opt.dataset.value === 'arrival';
      const pickupRow = $id('pickupRow');
      const dropoffRow = $id('dropoffRow');
      if (pickupRow) pickupRow.querySelector('label').textContent = isArrival ? 'Airport' : 'Pickup Location';
      if (dropoffRow) dropoffRow.querySelector('label').textContent = isArrival ? 'Hotel / Drop-off' : 'Airport';
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'date', 'time', 'vehicle'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill all required fields', 'error'); return; }

    const btn = $q('[type=submit]', form);
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    const msg = `🚗 *Airport Transfer — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📱 *WhatsApp:* ${d.phone}

📍 *Direction:* ${d.direction || 'Arrival'}
✈️ *Airport:* ${d.airport || '—'}
🛫 *Flight Number:* ${d.flightNumber || '—'}
📅 *Date:* ${d.date}  |  🕐 *Time:* ${d.time}

🏨 *Pickup:* ${d.pickup || '—'}
🏁 *Drop-off:* ${d.dropoff || '—'}

👥 *Passengers:* ${d.passengers || '1-2'}
🧳 *Bags:* ${d.bags || '—'}
🚘 *Vehicle:* ${d.vehicle}
🪑 *Child Seat:* ${d.childSeat || 'No'}

📝 *Notes:* ${d.notes || 'None'}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'transfer_booking', { service: d.vehicle || 'Airport Transfer' });
    if (result.ok) {
      showToast('Transfer saved — opening WhatsApp…');
      setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 600);
    }
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
  });
})();

/* ----------------------------------------------------------------
   HOTEL REQUEST FORM
   ---------------------------------------------------------------- */

(function initHotelForm() {
  const form = $q('.hotel-request-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'checkin', 'checkout'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill in required fields', 'error'); return; }

    const msg = `🏨 *Hotel Request — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📱 *WhatsApp:* ${d.phone}

📅 *Check-in:* ${d.checkin}
📅 *Check-out:* ${d.checkout}
👥 *Guests:* ${d.guests || '2'}  |  🛏️ *Rooms:* ${d.rooms || '1'}
⭐ *Category:* ${d.hotelCategory || '—'}
💰 *Budget / night:* ${d.budgetNight || 'Flexible'}

🚗 *Airport Transfer:* ${d.airportTransfer || 'No'}
🍽️ *Meals:* ${d.meals || '—'}

📝 *Notes:* ${d.notes || 'None'}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'hotel_request', { service: 'Hotel Request' });
    if (!result.ok) return;
    showToast('Hotel request saved — opening WhatsApp!');
    setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 400);
  });
})();

/* ----------------------------------------------------------------
   CUSTOM TRIP PLANNER
   ---------------------------------------------------------------- */

(function initCustomTrip() {
  const form = $q('.custom-trip-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please enter your name and WhatsApp', 'error'); return; }

    const btn = $q('[type=submit]', form);
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    // Collect checkbox destinations and interests (legacy form), fall back to hidden inputs (bk-tag version)
    const destChecked = $all('input[name^="dest_"]:checked', form).map(cb => cb.value).join(', ');
    const intChecked  = $all('input[name^="int_"]:checked', form).map(cb => cb.value).join(', ');
    const destinations = destChecked || d.destinations || '—';
    const interests    = intChecked  || d.interests    || '—';

    const msg = `✨ *Custom Trip Request — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📧 *Email:* ${d.email || '—'}
📱 *WhatsApp:* ${d.phone}
🌍 *Nationality:* ${d.nationality || '—'}

🗺️ *Destinations:* ${destinations}
📆 *Duration:* ${d.duration || d.days || '—'}
👥 *Travelers:* ${d.travelers || '—'}
📅 *Dates:* ${d.dates || 'Flexible'}
💰 *Budget:* ${d.budget || 'Flexible'}
⭐ *Travel Style:* ${d.travelStyle || d.style || '—'}
🎯 *Interests:* ${interests}
🎉 *Celebration:* ${d.celebration || 'None'}

📝 *Notes:* ${d.notes || d.message || 'None'}

_Sent via applesafaris.com custom trip planner_`;

    const result = await submitToCRM(form, 'custom_trip', { service: 'Custom Trip Planner' });
    if (result.ok) {
      showToast('Custom trip saved — opening WhatsApp…');
      setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 700);
    }
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
  });
})();

/* ----------------------------------------------------------------
   CONTACT FORM
   ---------------------------------------------------------------- */

(function initContactForm() {
  const form = $q('.contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone', 'message'].filter(k => !d[k]?.trim());
    if (missing.length) { showToast('Please fill in Name, WhatsApp & Message', 'error'); return; }

    const msg = `💬 *Message — Apple Tours & Safaris*

👤 *Name:* ${d.name}
📧 *Email:* ${d.email || '—'}
📱 *WhatsApp:* ${d.phone}
📌 *Subject:* ${d.subject || '—'}

💬 *Message:*
${d.message}

_Sent via applesafaris.com_`;

    const result = await submitToCRM(form, 'contact_message', { service: d.subject || 'Contact Message' });
    if (!result.ok) return;
    showToast('Message saved — opening WhatsApp…');
    setTimeout(() => wa(result.bookingId ? `${msg}\n\nBooking ID: ${result.bookingId}` : msg), 400);
    form.reset();
  });
})();

/* ----------------------------------------------------------------
   SET MIN DATE (today) on all date inputs
   ---------------------------------------------------------------- */

(function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  $all('input[type="date"]').forEach(inp => { if (!inp.min) inp.min = today; });
})();

/* ----------------------------------------------------------------
   MOBILE STICKY BOOKING CTA
   ---------------------------------------------------------------- */

(function initMobileStickyCTA() {
  const cta = $q('.mobile-book-cta');
  if (!cta) return;
  const footer = $q('.footer');
  if (!footer) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { cta.style.display = e.isIntersecting ? 'none' : ''; });
  }, { threshold: 0 });
  observer.observe(footer);
})();

/* ----------------------------------------------------------------
   INITIALISE everything on DOM ready
   ---------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  initOptionCards();
  initTags();
  initSteppers();
  initToggles();
  initVehicleCards();
});
