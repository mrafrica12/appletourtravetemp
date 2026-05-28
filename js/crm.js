/* ================================================================
   Apple Tours & Safaris - Unified CRM client
   One browser-side submission API for every public form.
   ================================================================ */

(function () {
  const DEFAULT_WHATSAPP = '255742000000';
  const CONFIG = window.APPLE_SAFARIS_CONFIG || {};
  const ENDPOINT = CONFIG.appsScriptEndpoint || '';
  const STORAGE_KEY = 'ats_crm_submissions';
  const FINGERPRINT_KEY = 'ats_crm_fingerprints';
  const RATE_KEY = 'ats_crm_rate';

  const FORM_CATEGORIES = {
    quick_inquiry: 'Quick Inquiries',
    tour_booking: 'Tour Bookings',
    safari_lead: 'Safari Leads',
    transfer_booking: 'Transfer Bookings',
    hotel_request: 'Hotel Requests',
    custom_trip: 'Custom Trips',
    contact_message: 'Contact Messages',
  };

  const STATUS = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PAID: 'Paid',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  const REQUIRED = {
    quick_inquiry: ['customerName', 'whatsApp'],
    tour_booking: ['customerName', 'whatsApp', 'travelDates'],
    safari_lead: ['customerName', 'whatsApp', 'email'],
    transfer_booking: ['customerName', 'whatsApp', 'travelDates'],
    hotel_request: ['customerName', 'whatsApp', 'travelDates'],
    custom_trip: ['customerName', 'whatsApp'],
    contact_message: ['customerName', 'whatsApp', 'notes'],
  };

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function sanitize(value, max = 1200) {
    if (value == null) return '';
    return String(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function normalizePhone(value) {
    return sanitize(value, 40).replace(/[^\d+]/g, '');
  }

  function normalizeEmail(value) {
    return sanitize(value, 160).toLowerCase();
  }

  function isValidEmail(value) {
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function compactDateRange(start, end, fallback) {
    const a = sanitize(start, 80);
    const b = sanitize(end, 80);
    if (a && b) return `${a} to ${b}`;
    return a || b || sanitize(fallback, 160);
  }

  function bookingId() {
    const d = new Date();
    const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `ATS-${stamp}-${rand}`;
  }

  function sourcePage() {
    return sanitize(window.location.pathname.replace(/\/$/, '') || '/', 240);
  }

  function detectFormType(form, explicit) {
    if (explicit) return explicit;
    if (form?.dataset?.formType) return form.dataset.formType;
    const classes = form?.className || '';
    if (classes.includes('quick-inquiry-form')) return 'quick_inquiry';
    if (classes.includes('tour-booking-form')) return 'tour_booking';
    if (classes.includes('safari-booking-form')) return 'safari_lead';
    if (classes.includes('transfer-booking-form')) return 'transfer_booking';
    if (classes.includes('hotel-request-form')) return 'hotel_request';
    if (classes.includes('custom-trip-form')) return 'custom_trip';
    if (classes.includes('contact-form')) return 'contact_message';
    if (classes.includes('wizard-wrap')) return 'custom_trip';
    return 'contact_message';
  }

  function mapSubmission(data, formType, extra = {}) {
    const customerName = data.name || data.customerName || data.fullName;
    const whatsApp = data.phone || data.whatsApp || data.whatsapp || data.mobile;
    const travelDates = compactDateRange(
      data.arrivalDate || data.checkin || data.date,
      data.departureDate || data.checkout,
      data.travelDates || data.travelDate || data.dates
    );

    const service = data.service || data.tour || data.package || data.vehicle || data.subject || extra.service || '';
    const pax = data.travelers || data.passengers || [data.adults, data.children].filter(Boolean).join(' adults/children');
    const notes = [
      data.message,
      data.notes,
      data.hotel,
      data.pickup,
      data.dropoff,
      data.flightNumber ? `Flight: ${data.flightNumber}` : '',
      pax ? `Travelers: ${pax}` : '',
      data.budget || data.budgetNight ? `Budget: ${data.budget || data.budgetNight}` : '',
      data.activities || data.interests ? `Interests: ${data.activities || data.interests}` : '',
      extra.notes || '',
    ].filter(Boolean).join(' | ');

    const formCategory = FORM_CATEGORIES[formType] || FORM_CATEGORIES.contact_message;
    return {
      bookingId: extra.bookingId || bookingId(),
      timestamp: new Date().toISOString(),
      formType,
      formCategory,
      customerName: sanitize(customerName, 160),
      whatsApp: normalizePhone(whatsApp),
      email: normalizeEmail(data.email),
      travelDates,
      status: STATUS.NEW,
      notes: sanitize(notes),
      assignedStaff: sanitize(data.assignedStaff || extra.assignedStaff || ''),
      sourcePage: sourcePage(),
      paymentStatus: sanitize(data.paymentStatus || 'Unpaid', 80),
      service: sanitize(service, 180),
      raw: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sanitize(value)])),
    };
  }

  function validate(payload) {
    const missing = (REQUIRED[payload.formType] || []).filter((key) => !payload[key]);
    if (missing.length) return { ok: false, message: `Missing required fields: ${missing.join(', ')}` };
    if (!isValidEmail(payload.email)) return { ok: false, message: 'Please enter a valid email address.' };
    if (payload.whatsApp && payload.whatsApp.replace(/\D/g, '').length < 7) {
      return { ok: false, message: 'Please enter a valid WhatsApp number.' };
    }
    return { ok: true };
  }

  function rateLimit() {
    const now = Date.now();
    const recent = readJson(RATE_KEY, []).filter((time) => now - time < 15 * 60 * 1000);
    if (recent.length >= 5) return false;
    recent.push(now);
    writeJson(RATE_KEY, recent);
    return true;
  }

  function fingerprint(payload) {
    return [
      payload.formType,
      payload.customerName.toLowerCase(),
      payload.whatsApp,
      payload.email,
      payload.travelDates,
      payload.service.toLowerCase(),
    ].join('|');
  }

  function isDuplicate(payload) {
    const now = Date.now();
    const key = fingerprint(payload);
    const seen = readJson(FINGERPRINT_KEY, {}).valueOf();
    Object.keys(seen).forEach((fp) => {
      if (now - seen[fp] > 12 * 60 * 60 * 1000) delete seen[fp];
    });
    if (seen[key]) {
      writeJson(FINGERPRINT_KEY, seen);
      return true;
    }
    seen[key] = now;
    writeJson(FINGERPRINT_KEY, seen);
    return false;
  }

  function mirrorLocally(payload) {
    const submissions = readJson(STORAGE_KEY, []);
    submissions.unshift(payload);
    writeJson(STORAGE_KEY, submissions.slice(0, 300));
  }

  async function postToAppsScript(payload) {
    if (!ENDPOINT || ENDPOINT.includes('PASTE_YOUR')) {
      return { ok: true, offline: true, bookingId: payload.bookingId };
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'createSubmission',
        token: CONFIG.publicFormToken || '',
        payload,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'CRM submission failed.');
    }
    return json;
  }

  function buildWhatsAppUrl(message, number = CONFIG.whatsAppNumber || DEFAULT_WHATSAPP) {
    const cleanNumber = String(number).replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  }

  function serviceTemplate(payload) {
    const label = payload.formCategory || 'Travel Inquiry';
    return [
      `Hello Apple Tours & Safaris, I submitted a ${label}.`,
      `Booking ID: ${payload.bookingId}`,
      `Name: ${payload.customerName}`,
      payload.service ? `Service: ${payload.service}` : '',
      payload.travelDates ? `Travel dates: ${payload.travelDates}` : '',
      payload.notes ? `Notes: ${payload.notes}` : '',
    ].filter(Boolean).join('\n');
  }

  async function submitForm(form, formType, extra = {}) {
    const formData = form instanceof HTMLFormElement ? Object.fromEntries(new FormData(form)) : { ...(form || {}) };
    if (formData.website || formData.companyUrl || formData.url) {
      return { ok: false, spam: true, message: 'Submission blocked.' };
    }
    if (!rateLimit()) return { ok: false, message: 'Too many attempts. Please try again in a few minutes.' };

    const resolvedType = detectFormType(form instanceof HTMLFormElement ? form : null, formType);
    const payload = mapSubmission(formData, resolvedType, extra);
    const valid = validate(payload);
    if (!valid.ok) return valid;
    if (isDuplicate(payload)) return { ok: true, duplicate: true, bookingId: payload.bookingId, payload };

    mirrorLocally(payload);
    const result = await postToAppsScript(payload);
    return { ok: true, ...result, bookingId: result.bookingId || payload.bookingId, payload };
  }

  window.AppleSafarisCRM = {
    FORM_CATEGORIES,
    STATUS,
    buildWhatsAppUrl,
    detectFormType,
    getLocalSubmissions: () => readJson(STORAGE_KEY, []),
    serviceTemplate,
    submitForm,
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form').forEach((form) => {
      if (form.querySelector('[name="website"]')) return;
      const field = document.createElement('input');
      field.type = 'text';
      field.name = 'website';
      field.tabIndex = -1;
      field.autocomplete = 'off';
      field.setAttribute('aria-hidden', 'true');
      field.style.cssText = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden';
      form.appendChild(field);
    });
  });
})();
