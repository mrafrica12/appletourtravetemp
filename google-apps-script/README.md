# Apple Tours & Safaris CRM Apps Script

This folder contains the single Google Apps Script endpoint for all public website forms and admin CRM actions.

## Spreadsheet Tabs

Run `setupCrmWorkbook()` once after setting `SPREADSHEET_ID`. It creates:

- Dashboard
- Quick Inquiries
- Tour Bookings
- Safari Leads
- Transfer Bookings
- Hotel Requests
- Custom Trips
- Contact Messages
- Customers
- Payments
- Admin Notes
- Logs

## Script Properties

Set these in Apps Script project settings:

- `SPREADSHEET_ID`: Google Sheet ID for the CRM workbook.
- `PUBLIC_FORM_TOKEN`: must match `publicFormToken` in `/js/config.js`.
- `ADMIN_TOKEN`: private token for admin update/export calls.

## Deployment

1. Create or open the CRM Google Sheet.
2. Create an Apps Script project attached to it or standalone.
3. Add `Code.gs` and `appsscript.json`.
4. Set script properties.
5. Run `setupCrmWorkbook()` manually and approve permissions.
6. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone
7. Put the Web App URL into `/js/config.js` as `appsScriptEndpoint`.

The public site uses a single endpoint and sends JSON. The script handles validation, routing, duplicate prevention, customer upserts, status updates, exports, and logging.
