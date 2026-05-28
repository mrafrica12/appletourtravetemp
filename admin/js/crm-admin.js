/* ================================================================
   Apple Tours & Safaris - Admin CRM enhancements
   Reads local CRM mirror and prepares hooks for Apps Script admin API.
   ================================================================ */

(function () {
  const STORAGE_KEY = 'ats_crm_submissions';
  const STATUSES = ['New', 'Contacted', 'Pending', 'Confirmed', 'Paid', 'Completed', 'Cancelled'];

  function submissions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function initials(name) {
    return String(name || 'AT').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  function money(value) {
    const match = String(value || '').match(/\$[\d,]+|\b\d{2,}\b/);
    return match ? match[0] : '-';
  }

  function serviceFilter(formType) {
    return ({
      quick_inquiry: 'custom',
      tour_booking: 'excursion',
      safari_lead: 'safari',
      transfer_booking: 'transfer',
      hotel_request: 'hotel',
      custom_trip: 'custom',
      contact_message: 'custom',
    })[formType] || 'custom';
  }

  function statusClass(status) {
    return `badge-${String(status || 'new').toLowerCase().replace(/\s+/g, '-')}`;
  }

  function renderBookingRow(item, index) {
    const service = item.service || item.formCategory || 'Travel Request';
    const waText = encodeURIComponent(`Hello ${item.customerName}, thank you for contacting Apple Tours & Safaris. Your booking ID is ${item.bookingId}.`);
    return `
      <tr data-status="${String(item.status || 'New').toLowerCase()}" data-filter="${serviceFilter(item.formType)}" data-search="${[item.bookingId, item.customerName, item.email, item.whatsApp, service].join(' ').toLowerCase()}">
        <td style="font-family:monospace;font-size:.78rem;color:var(--gray-500)">${item.bookingId}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar av-${(index % 8) + 1}" style="width:28px;height:28px;font-size:.65rem">${initials(item.customerName)}</div><span style="font-size:.85rem;font-weight:500">${item.customerName || '-'}</span></div></td>
        <td><div style="font-size:.83rem;font-weight:500;color:var(--charcoal)">${service}</div><div style="font-size:.72rem;color:var(--gray-500)">${item.formCategory || item.formType}</div></td>
        <td style="font-size:.82rem;color:var(--gray-600)">${item.travelDates || '-'}</td>
        <td style="font-size:.83rem;text-align:center">-</td>
        <td style="font-weight:600;color:var(--forest)">${money(item.notes)}</td>
        <td><span class="badge" style="background:#FEF3C7;color:#92400E">${item.paymentStatus || 'Unpaid'}</span></td>
        <td>
          <select class="crm-status-select" data-booking-id="${item.bookingId}" aria-label="Update status for ${item.bookingId}">
            ${STATUSES.map((status) => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
        </td>
        <td style="display:flex;gap:6px;justify-content:flex-end">
          <a class="btn-icon" href="https://wa.me/${String(item.whatsApp || '').replace(/\D/g, '')}?text=${waText}" target="_blank" rel="noopener" title="WhatsApp quick reply">WA</a>
          <button class="btn-icon" type="button" data-crm-detail="${item.bookingId}" title="View details">View</button>
        </td>
      </tr>`;
  }

  function enhanceBookingsTable() {
    const table = document.querySelector('#tableView .data-table tbody');
    if (!table) return;
    const items = submissions();
    if (!items.length) return;

    table.insertAdjacentHTML('afterbegin', items.slice(0, 50).map(renderBookingRow).join(''));
    updatePageCounts(items);
  }

  function updatePageCounts(items) {
    const pending = items.filter((item) => ['New', 'Pending'].includes(item.status)).length;
    const confirmed = items.filter((item) => ['Confirmed', 'Paid'].includes(item.status)).length;
    const header = document.querySelector('.page-sub, .page-subtitle');
    if (header && document.title.includes('Bookings')) {
      header.textContent = `${items.length} local CRM submissions · ${pending} pending action · ${confirmed} confirmed/paid`;
    }
  }

  function enhanceDashboard() {
    const items = submissions();
    if (!items.length || !document.title.includes('Dashboard')) return;
    const values = document.querySelectorAll('.metric-card-value');
    if (values[0]) values[0].textContent = String(items.length);
    if (values[1]) values[1].textContent = String(items.filter((item) => item.status === 'New').length);
    if (values[3]) values[3].textContent = String(items.filter((item) => ['New', 'Pending'].includes(item.status)).length);

    const activity = document.querySelector('.bottom-grid .card .card-body');
    if (activity) {
      activity.innerHTML = items.slice(0, 5).map((item) => `
        <div class="activity-item">
          <div class="activity-dot dot-new"></div>
          <div class="activity-text"><strong>${item.customerName}</strong> submitted ${item.formCategory || item.formType} · ${item.service || 'Travel request'}</div>
          <div class="activity-time">${new Date(item.timestamp).toLocaleDateString()}</div>
        </div>
      `).join('');
    }
  }

  function addCsvExport() {
    const actions = document.querySelector('.page-header-actions');
    if (!actions || document.querySelector('[data-crm-export]')) return;
    const button = document.createElement('button');
    button.className = 'btn btn-outline';
    button.type = 'button';
    button.dataset.crmExport = 'true';
    button.textContent = 'Export CSV';
    button.addEventListener('click', exportCsv);
    actions.prepend(button);
  }

  function exportCsv() {
    const rows = submissions();
    const header = ['Booking ID', 'Timestamp', 'Form Type', 'Customer Name', 'WhatsApp', 'Email', 'Travel Dates', 'Status', 'Notes', 'Assigned Staff', 'Source Page', 'Payment Status', 'Service'];
    const csv = [header].concat(rows.map((item) => [
      item.bookingId,
      item.timestamp,
      item.formType,
      item.customerName,
      item.whatsApp,
      item.email,
      item.travelDates,
      item.status,
      item.notes,
      item.assignedStaff,
      item.sourcePage,
      item.paymentStatus,
      item.service,
    ])).map((row) => row.map(csvCell).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apple-safaris-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function bindStatusUpdates() {
    document.addEventListener('change', (event) => {
      const select = event.target.closest('.crm-status-select');
      if (!select) return;
      const items = submissions();
      const item = items.find((entry) => entry.bookingId === select.dataset.bookingId);
      if (item) {
        item.status = select.value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
      if (window.toast) window.toast(`Status updated to ${select.value}`, 'success');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceBookingsTable();
    enhanceDashboard();
    addCsvExport();
    bindStatusUpdates();
  });
})();
