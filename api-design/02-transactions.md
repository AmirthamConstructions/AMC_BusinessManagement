# 💰 02 — Transactions

## Overview

The Transactions module is the core of the application. It records all financial movements (credits and debits) across sites and companies. It supports full CRUD, server-side pagination with filtering, search, date-range queries, and PDF export.

**Source**: `gstransactions.gs` → `sup_addTransaction`, `sup_updateTransactionById`, `sup_deleteTransactionById`, `sup_getTransactionsPaginated`, `sup_exportTransactionsPdf`

---

## MongoDB Collection: `transactions`

```json
{
  "_id": "ObjectId",
  "transactionId": "TXN260328143022",
  "date": "2026-03-28T00:00:00.000Z",
  "company": "Main",
  "siteId": "ObjectId (ref → sites)",
  "siteName": "Velachery Site",
  "type": "Debit",
  "nature": "Cement Purchase",
  "description": "50 bags OPC cement from ACC dealer",
  "amount": 25000.00,
  "party": "ACC Dealers Pvt Ltd",
  "invoiceNo": "INV-2026-0451",
  "gstNo": "33AABCU9603R1ZM",
  "companyAccount": "HDFC Current A/C",
  "modeOfPayment": "NEFT",
  "notes": "Delivered on-site",
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-03-28T14:30:22.000Z",
  "updatedAt": "2026-03-28T14:30:22.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `transactionId` | `String` | ✅ | Unique, auto-generated | Format: `TXN` + `yyMMddHHmmss` |
| `date` | `Date` | ✅ | Must be valid date | Transaction date |
| `company` | `String` | ✅ | Enum: `Main`, `GST` | Which company entity |
| `siteId` | `ObjectId` | ✅ | Must exist in `sites` | Reference to site |
| `siteName` | `String` | ✅ | — | Denormalized for fast queries/display |
| `type` | `String` | ✅ | Enum: `Credit`, `Debit` | Credit = income, Debit = expense |
| `nature` | `String` | ✅ | Must exist in `dimensions` | Income Head or Expense Head |
| `description` | `String` | — | Max 500 chars | Free-text description |
| `amount` | `Decimal128` | ✅ | Must be > 0 | Transaction amount in ₹ |
| `party` | `String` | — | Max 200 chars | Party (To/From) |
| `invoiceNo` | `String` | — | Max 100 chars | Invoice reference |
| `gstNo` | `String` | — | GSTIN format (15 chars) | GST identification number |
| `companyAccount` | `String` | — | — | Bank account used |
| `modeOfPayment` | `String` | — | — | Cash, NEFT, UPI, Cheque, etc. |
| `notes` | `String` | — | Max 500 chars | Additional notes |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | Who created this record |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.transactions.createIndex({ "transactionId": 1 }, { unique: true });
db.transactions.createIndex({ "date": -1 });
db.transactions.createIndex({ "siteId": 1, "date": -1 });
db.transactions.createIndex({ "company": 1, "date": -1 });
db.transactions.createIndex({ "type": 1 });
db.transactions.createIndex({ "nature": 1 });
// Text index for global search
db.transactions.createIndex({
  "transactionId": "text",
  "siteName": "text",
  "nature": "text",
  "description": "text",
  "party": "text",
  "invoiceNo": "text"
});
```

---

## API Endpoints

### `GET /transactions`

Fetch paginated, filtered transactions.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `Number` | `1` | Page number (or `"last"` for last page) |
| `perPage` | `Number` | `25` | Rows per page (max 100) |
| `sort` | `String` | `date` | Sort field |
| `order` | `String` | `desc` | `asc` or `desc` |
| `search` | `String` | — | Global text search |
| `searchField` | `String` | `all` | `all`, `siteName`, `nature`, `type` |
| `datePreset` | `String` | `all` | `all`, `1m`, `6m`, `1y`, `custom` |
| `fromDate` | `String` | — | ISO date `YYYY-MM-DD` (when `datePreset=custom`) |
| `toDate` | `String` | — | ISO date `YYYY-MM-DD` (when `datePreset=custom`) |
| `company` | `String` | — | Filter by `Main` or `GST` |
| `siteId` | `String` | — | Filter by site ObjectId |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "664b2e...",
      "transactionId": "TXN260328143022",
      "date": "2026-03-28",
      "company": "Main",
      "siteName": "Velachery Site",
      "type": "Debit",
      "nature": "Cement Purchase",
      "description": "50 bags OPC cement",
      "amount": 25000.00,
      "party": "ACC Dealers Pvt Ltd",
      "invoiceNo": "INV-2026-0451",
      "gstNo": "33AABCU9603R1ZM",
      "companyAccount": "HDFC Current A/C",
      "modeOfPayment": "NEFT",
      "notes": "Delivered on-site"
    }
  ],
  "meta": {
    "total": 1543,
    "page": 1,
    "perPage": 25,
    "totalPages": 62
  }
}
```

---

### `GET /transactions/:id`

Fetch a single transaction by MongoDB `_id`.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664b2e...",
    "transactionId": "TXN260328143022",
    "date": "2026-03-28",
    "company": "Main",
    "siteName": "Velachery Site",
    "type": "Debit",
    "nature": "Cement Purchase",
    "description": "50 bags OPC cement",
    "amount": 25000.00,
    "party": "ACC Dealers Pvt Ltd",
    "invoiceNo": "INV-2026-0451",
    "gstNo": "33AABCU9603R1ZM",
    "companyAccount": "HDFC Current A/C",
    "modeOfPayment": "NEFT",
    "notes": "Delivered on-site",
    "createdBy": { "id": "...", "name": "Manimaran" },
    "createdAt": "2026-03-28T14:30:22.000Z",
    "updatedAt": "2026-03-28T14:30:22.000Z"
  }
}
```

**Response — 404 Not Found**
```json
{
  "status": "error",
  "error": { "code": "NOT_FOUND", "message": "Transaction not found." }
}
```

---

### `POST /transactions`

Create a new transaction. `transactionId` is generated server-side.

**Request Body**
```json
{
  "date": "2026-03-28",
  "company": "Main",
  "siteId": "664a1f...",
  "type": "Debit",
  "nature": "Cement Purchase",
  "description": "50 bags OPC cement",
  "amount": 25000.00,
  "party": "ACC Dealers Pvt Ltd",
  "invoiceNo": "INV-2026-0451",
  "gstNo": "33AABCU9603R1ZM",
  "companyAccount": "HDFC Current A/C",
  "modeOfPayment": "NEFT",
  "notes": "Delivered on-site"
}
```

**Validation Rules**
- `date` — required, valid ISO date
- `company` — required, must be `Main` or `GST`
- `siteId` — required, must reference an existing active site
- `type` — required, must be `Credit` or `Debit`
- `nature` — required, must exist in dimensions for the given type
- `amount` — required, must be > 0

**Backend Logic**
1. Validate all fields.
2. Look up site by `siteId`, set `siteName` (denormalize).
3. Generate `transactionId`: `"TXN" + moment().format("YYMMDDHHmmss")`.
4. Set `createdBy` from JWT user.
5. Insert into `transactions` collection.

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": {
    "id": "664b2e...",
    "transactionId": "TXN260328143022",
    "message": "Transaction added successfully."
  }
}
```

**Response — 422 Validation Error**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      { "field": "amount", "message": "Amount must be greater than 0." },
      { "field": "siteId", "message": "Site not found." }
    ]
  }
}
```

---

### `PATCH /transactions/:id`

Update an existing transaction.

**Request Body** (partial — only fields to update)
```json
{
  "description": "50 bags OPC cement — corrected",
  "amount": 24500.00,
  "notes": "Discount applied"
}
```

**Backend Logic**
1. Find transaction by `_id`.
2. If `siteId` is being changed, validate it exists and update `siteName`.
3. Update provided fields + set `updatedAt`.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664b2e...",
    "transactionId": "TXN260328143022",
    "message": "Transaction updated successfully."
  }
}
```

---

### `DELETE /transactions/:id`

Delete a transaction permanently.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "message": "Transaction deleted."
  }
}
```

---

### `POST /transactions/export/pdf`

Generate a PDF report from filtered transactions and return a download URL.

**Request Body**
```json
{
  "filters": {
    "datePreset": "custom",
    "fromDate": "2026-01-01",
    "toDate": "2026-03-31",
    "search": "",
    "searchField": "all",
    "company": "Main"
  },
  "meta": {
    "company": "Amirtham Constructions",
    "dateRange": "01-Jan-2026 to 31-Mar-2026"
  }
}
```

**Backend Logic**
1. Query `transactions` with the provided filters (same logic as `GET /transactions` but without pagination — fetch all matching).
2. Render HTML template with the rows + meta.
3. Convert HTML → PDF (Puppeteer / PDF library).
4. Store PDF in cloud storage or serve as binary.
5. Return download URL.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/amc-exports/Transactions_20260328_1430.pdf",
    "filename": "Transactions_20260328_1430.pdf"
  }
}
```

---

## PDF Report Columns

These match the columns from the current `sup_exportTransactionsPdf`:

| # | Column |
|---|--------|
| 1 | S.No (sequential in PDF) |
| 2 | Transaction ID |
| 3 | Date |
| 4 | Company |
| 5 | Site Name |
| 6 | Type (D/C) |
| 7 | Nature (Head) |
| 8 | Description |
| 9 | Amount |
| 10 | Party (To/From) |
| 11 | Invoice No |
| 12 | GST No |
| 13 | Company Account |
| 14 | Mode of Payment |
| 15 | Notes |

---

## Migration Notes

- **Transaction ID generation**: Currently `TXN` + `yyMMddHHmmss` in Apps Script. Preserve this format server-side. For sub-second collision safety, append a 3-digit random suffix or use a counter.
- **Denormalized `siteName`**: Stored alongside `siteId` to avoid joins on every list query. Must be kept in sync if site name is ever updated (update all transactions referencing that site).
- **Date handling**: Store as UTC `Date` in MongoDB. Format to `dd-MMM-yyyy` on API response or let Angular format client-side.
- **`_rawDate` pattern**: No longer needed — MongoDB date queries replace the client-side timestamp filtering.
