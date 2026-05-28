/**
 * Apple Tours & Safaris CRM Web App
 *
 * Deploy as a Google Apps Script web app:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Script properties:
 * - SPREADSHEET_ID: target CRM spreadsheet ID
 * - PUBLIC_FORM_TOKEN: same value as js/config.js publicFormToken
 * - ADMIN_TOKEN: private token for admin updates/exports
 */

const CRM_TABS = [
  'Dashboard',
  'Quick Inquiries',
  'Tour Bookings',
  'Safari Leads',
  'Transfer Bookings',
  'Hotel Requests',
  'Custom Trips',
  'Contact Messages',
  'Customers',
  'Payments',
  'Admin Notes',
  'Logs',
];

const REQUIRED_HEADERS = [
  'Booking ID',
  'Timestamp',
  'Form Type',
  'Customer Name',
  'WhatsApp',
  'Email',
  'Travel Dates',
  'Status',
  'Notes',
  'Assigned Staff',
  'Source Page',
  'Payment Status',
  'Service',
  'Raw JSON',
];

const FORM_TO_TAB = {
  quick_inquiry: 'Quick Inquiries',
  tour_booking: 'Tour Bookings',
  safari_lead: 'Safari Leads',
  transfer_booking: 'Transfer Bookings',
  hotel_request: 'Hotel Requests',
  custom_trip: 'Custom Trips',
  contact_message: 'Contact Messages',
};

const VALID_STATUSES = ['New', 'Contacted', 'Pending', 'Confirmed', 'Paid', 'Completed', 'Cancelled'];

function doPost(e) {
  try {
    const request = parseRequest_(e);
    if (!request.action) throw new Error('Missing action.');

    if (request.action === 'createSubmission') {
      authorizePublic_(request.token);
      return json_(createSubmission_(request.payload || {}));
    }

    authorizeAdmin_(request.adminToken);

    if (request.action === 'updateStatus') return json_(updateStatus_(request.bookingId, request.status));
    if (request.action === 'addNote') return json_(addAdminNote_(request));
    if (request.action === 'exportCsv') return json_(exportCsv_(request.tabName));

    throw new Error('Unsupported action.');
  } catch (err) {
    log_('ERROR', err.message, e && e.postData ? e.postData.contents : '');
    return json_({ ok: false, error: err.message });
  }
}

function doGet(e) {
  try {
    const params = e.parameter || {};
    if (params.action === 'health') return json_({ ok: true, tabs: CRM_TABS });
    authorizeAdmin_(params.adminToken);
    if (params.action === 'list') return json_(listRows_(params.tabName || 'Tour Bookings', Number(params.limit || 100)));
    return json_({ ok: true, message: 'Apple Tours CRM endpoint is running.' });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function setupCrmWorkbook() {
  const ss = getSpreadsheet_();
  CRM_TABS.forEach((tabName) => ensureSheet_(ss, tabName));

  CRM_TABS.forEach((tabName) => {
    const sheet = ss.getSheetByName(tabName);
    if (tabName === 'Dashboard') setupDashboard_(sheet);
    else if (tabName === 'Logs') setHeaders_(sheet, ['Timestamp', 'Level', 'Message', 'Context']);
    else if (tabName === 'Customers') setHeaders_(sheet, ['Customer ID', 'Customer Name', 'WhatsApp', 'Email', 'First Seen', 'Last Seen', 'Source Page', 'Notes']);
    else if (tabName === 'Payments') setHeaders_(sheet, ['Booking ID', 'Timestamp', 'Customer Name', 'Amount', 'Currency', 'Payment Status', 'Method', 'Reference', 'Notes']);
    else if (tabName === 'Admin Notes') setHeaders_(sheet, ['Timestamp', 'Booking ID', 'Staff', 'Note']);
    else setHeaders_(sheet, REQUIRED_HEADERS);
  });

  return { ok: true, spreadsheetUrl: ss.getUrl() };
}

function createSubmission_(payload) {
  const clean = normalizePayload_(payload);
  validatePayload_(clean);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet_();
    setupCrmWorkbook();
    if (isDuplicate_(ss, clean)) {
      log_('INFO', 'Duplicate submission skipped', clean.bookingId);
      return { ok: true, duplicate: true, bookingId: clean.bookingId };
    }

    const row = toRow_(clean);
    const targetTab = FORM_TO_TAB[clean.formType] || 'Contact Messages';
    ss.getSheetByName(targetTab).appendRow(row);
    upsertCustomer_(ss, clean);
    log_('INFO', 'Submission created', `${clean.bookingId} -> ${targetTab}`);
    return { ok: true, bookingId: clean.bookingId, tab: targetTab };
  } finally {
    lock.releaseLock();
  }
}

function updateStatus_(bookingId, status) {
  if (!bookingId) throw new Error('Missing booking ID.');
  if (VALID_STATUSES.indexOf(status) === -1) throw new Error('Invalid status.');
  const ss = getSpreadsheet_();
  let updated = false;

  Object.keys(FORM_TO_TAB).forEach((key) => {
    const sheet = ss.getSheetByName(FORM_TO_TAB[key]);
    const row = findRowByBookingId_(sheet, bookingId);
    if (row > 1) {
      sheet.getRange(row, 8).setValue(status);
      updated = true;
    }
  });

  if (!updated) throw new Error('Booking ID not found.');
  log_('INFO', 'Status updated', `${bookingId}: ${status}`);
  return { ok: true, bookingId, status };
}

function addAdminNote_(request) {
  if (!request.bookingId || !request.note) throw new Error('Booking ID and note are required.');
  const sheet = getSpreadsheet_().getSheetByName('Admin Notes');
  sheet.appendRow([new Date().toISOString(), safe_(request.bookingId), safe_(request.staff || 'Admin'), safe_(request.note, 2000)]);
  return { ok: true };
}

function exportCsv_(tabName) {
  const rows = listRows_(tabName, 5000).rows;
  const csv = rows.map((row) => row.map(csvCell_).join(',')).join('\n');
  return { ok: true, tabName, csv };
}

function listRows_(tabName, limit) {
  const sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Unknown tab.');
  const values = sheet.getDataRange().getValues();
  const header = values.shift() || [];
  return { ok: true, header, rows: values.slice(-limit).reverse() };
}

function normalizePayload_(payload) {
  return {
    bookingId: safe_(payload.bookingId || makeBookingId_(), 40),
    timestamp: safe_(payload.timestamp || new Date().toISOString(), 40),
    formType: safe_(payload.formType || 'contact_message', 60),
    customerName: safe_(payload.customerName, 160),
    whatsApp: safe_(payload.whatsApp, 60).replace(/[^\d+]/g, ''),
    email: safe_(payload.email, 160).toLowerCase(),
    travelDates: safe_(payload.travelDates, 160),
    status: VALID_STATUSES.indexOf(payload.status) >= 0 ? payload.status : 'New',
    notes: safe_(payload.notes, 2000),
    assignedStaff: safe_(payload.assignedStaff, 120),
    sourcePage: safe_(payload.sourcePage, 240),
    paymentStatus: safe_(payload.paymentStatus || 'Unpaid', 80),
    service: safe_(payload.service, 180),
    raw: payload.raw || {},
  };
}

function validatePayload_(payload) {
  if (!payload.customerName) throw new Error('Customer name is required.');
  if (!payload.whatsApp) throw new Error('WhatsApp is required.');
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error('Invalid email.');
  if (!FORM_TO_TAB[payload.formType]) throw new Error('Unknown form type.');
}

function isDuplicate_(ss, payload) {
  const targetTab = FORM_TO_TAB[payload.formType] || 'Contact Messages';
  const sheet = ss.getSheetByName(targetTab);
  if (findRowByBookingId_(sheet, payload.bookingId) > 1) return true;

  const values = sheet.getDataRange().getValues();
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const signature = [payload.formType, payload.customerName.toLowerCase(), payload.whatsApp, payload.email, payload.travelDates, payload.service.toLowerCase()].join('|');
  return values.slice(1).some((row) => {
    const rowTime = new Date(row[1]).getTime();
    const rowSig = [row[2], String(row[3]).toLowerCase(), row[4], row[5], row[6], String(row[12]).toLowerCase()].join('|');
    return rowTime > cutoff && rowSig === signature;
  });
}

function upsertCustomer_(ss, payload) {
  const sheet = ss.getSheetByName('Customers');
  const values = sheet.getDataRange().getValues();
  const key = payload.email || payload.whatsApp;
  let rowIndex = -1;
  values.slice(1).forEach((row, idx) => {
    if (String(row[2]) === payload.whatsApp || String(row[3]).toLowerCase() === payload.email) rowIndex = idx + 2;
  });

  if (rowIndex > 1) {
    sheet.getRange(rowIndex, 2, 1, 7).setValues([[
      payload.customerName,
      payload.whatsApp,
      payload.email,
      values[rowIndex - 1][4],
      payload.timestamp,
      payload.sourcePage,
      payload.notes,
    ]]);
  } else {
    sheet.appendRow([`CUST-${Utilities.getUuid().slice(0, 8).toUpperCase()}`, payload.customerName, payload.whatsApp, payload.email, payload.timestamp, payload.timestamp, payload.sourcePage, payload.notes]);
  }
}

function toRow_(payload) {
  return [
    payload.bookingId,
    payload.timestamp,
    payload.formType,
    payload.customerName,
    payload.whatsApp,
    payload.email,
    payload.travelDates,
    payload.status,
    payload.notes,
    payload.assignedStaff,
    payload.sourcePage,
    payload.paymentStatus,
    payload.service,
    JSON.stringify(payload.raw || {}),
  ];
}

function findRowByBookingId_(sheet, bookingId) {
  const values = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]) === String(bookingId)) return i + 1;
  }
  return -1;
}

function setupDashboard_(sheet) {
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['Metric', 'Formula']]).setFontWeight('bold');
  sheet.getRange(2, 1, 8, 2).setValues([
    ['Quick Inquiries', '=COUNTA(\'Quick Inquiries\'!A2:A)'],
    ['Tour Bookings', '=COUNTA(\'Tour Bookings\'!A2:A)'],
    ['Safari Leads', '=COUNTA(\'Safari Leads\'!A2:A)'],
    ['Transfer Bookings', '=COUNTA(\'Transfer Bookings\'!A2:A)'],
    ['Hotel Requests', '=COUNTA(\'Hotel Requests\'!A2:A)'],
    ['Custom Trips', '=COUNTA(\'Custom Trips\'!A2:A)'],
    ['Contact Messages', '=COUNTA(\'Contact Messages\'!A2:A)'],
    ['Customers', '=COUNTA(Customers!A2:A)'],
  ]);
  sheet.autoResizeColumns(1, 2);
}

function ensureSheet_(ss, tabName) {
  return ss.getSheetByName(tabName) || ss.insertSheet(tabName);
}

function setHeaders_(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (current.join('|') !== headers.join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Missing SPREADSHEET_ID script property.');
  return SpreadsheetApp.openById(id);
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function authorizePublic_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('PUBLIC_FORM_TOKEN');
  if (expected && token !== expected) throw new Error('Unauthorized public request.');
}

function authorizeAdmin_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!expected || token !== expected) throw new Error('Unauthorized admin request.');
}

function log_(level, message, context) {
  try {
    const sheet = getSpreadsheet_().getSheetByName('Logs');
    if (sheet) sheet.appendRow([new Date().toISOString(), level, message, safe_(context, 2000)]);
  } catch {}
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function safe_(value, max) {
  const limit = max || 1200;
  if (value == null) return '';
  return String(value).replace(/<[^>]*>/g, ' ').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function makeBookingId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  return `ATS-${stamp}-${Utilities.getUuid().slice(0, 5).toUpperCase()}`;
}

function csvCell_(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
