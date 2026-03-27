# 📥 07 — GST-2B Inward (Purchase Bills)

## Overview

Records inward supply / purchase bills for GST-2B reconciliation. Similar structure to GST Outward but with purchase-specific fields. Supports CRUD with restricted editable fields, date filtering, and PDF export.

**Source**: `gsgst2b.gs` → `sup_gst2b_getData`, `sup_gst2b_updateRow`, `sup_gst2b_deleteRow`, `sup_gst2b_exportPdf`

---

## MongoDB Collection: `gst_inward`

```json
{
  "_id": "ObjectId",
  "purchaseBillNo": "PB/2026/0087",
  "invoiceDate": "2026-03-10T00:00:00.000Z",
  "companyName": "Sri Lakshmi Steel Traders",
  "companyGSTIN": "33AADCS7890H1ZR",
  "description": "TMT Steel bars — 10mm",
  "taxableValue": 280000.00,
  "cgstAmount": 25200.00,
  "sgstAmount": 25200.00,
  "purchaseBillValue": 330400.00,
  "inputCreditEligible": "Yes",
  "remarks": "",
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-03-10T11:00:00.000Z",
  "updatedAt": "2026-03-10T11:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `purchaseBillNo` | `String` | ✅ | Max 100 chars | Purchase bill number |
| `invoiceDate` | `Date` | ✅ | Valid date | Bill date |
| `companyName` | `String` | ✅ | Max 300 chars | Supplier / vendor name |
| `companyGSTIN` | `String` | — | 15-char GSTIN format | Supplier's GSTIN |
| `description` | `String` | — | Max 500 chars | Goods / Services description |
| `taxableValue` | `Decimal128` | ✅ | ≥ 0 | Taxable value (A) |
| `cgstAmount` | `Decimal128` | — | ≥ 0 | CGST amount (B) |
| `sgstAmount` | `Decimal128` | — | ≥ 0 | SGST amount (C) |
| `purchaseBillValue` | `Decimal128` | — | ≥ 0 | Total (A+B+C) |
| `inputCreditEligible` | `String` | — | Enum: `Yes`, `No` | ITC eligibility |
| `remarks` | `String` | — | Max 500 chars | Notes |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.gst_inward.createIndex({ "invoiceDate": -1 });
db.gst_inward.createIndex({ "companyName": 1 });
db.gst_inward.createIndex({ "purchaseBillNo": 1 });
```

---

## API Endpoints

### `GET /gst/inward`

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `String` | — | Search in `companyName`, `purchaseBillNo` |
| `searchField` | `String` | `all` | `all`, `companyName` |
| `datePreset` | `String` | `all` | `all`, `1m`, `6m`, `1y`, `custom` |
| `fromDate` | `String` | — | ISO date |
| `toDate` | `String` | — | ISO date |
| `page` | `Number` | `1` | — |
| `perPage` | `Number` | `25` | — |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "665c3d...",
      "purchaseBillNo": "PB/2026/0087",
      "invoiceDate": "2026-03-10",
      "companyName": "Sri Lakshmi Steel Traders",
      "description": "TMT Steel bars — 10mm",
      "taxableValue": 280000.00,
      "cgstAmount": 25200.00,
      "sgstAmount": 25200.00,
      "purchaseBillValue": 330400.00,
      "inputCreditEligible": "Yes"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 25,
    "totalPages": 2,
    "totals": {
      "taxableValue": 8500000.00,
      "cgstAmount": 765000.00,
      "sgstAmount": 765000.00,
      "purchaseBillValue": 10030000.00
    }
  }
}
```

---

### `POST /gst/inward`

**Request Body**
```json
{
  "purchaseBillNo": "PB/2026/0088",
  "invoiceDate": "2026-03-22",
  "companyName": "Ambika Cement Works",
  "companyGSTIN": "33AADCA1234B1ZS",
  "description": "OPC Cement — 53 Grade",
  "taxableValue": 95000.00,
  "cgstAmount": 8550.00,
  "sgstAmount": 8550.00,
  "purchaseBillValue": 112100.00,
  "inputCreditEligible": "Yes"
}
```

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": { "id": "665d4e...", "message": "Purchase bill added." }
}
```

---

### `PATCH /gst/inward/:id`

In the original system, only **Description** and **Input Credit Eligible** were editable (to protect ArrayFormula columns). The API can enforce an allow-list or permit full edits.

**Request Body** (partial)
```json
{
  "description": "OPC Cement — 53 Grade (corrected)",
  "inputCreditEligible": "No"
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "id": "665d4e...", "message": "Purchase bill updated." }
}
```

---

### `DELETE /gst/inward/:id`

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Purchase bill deleted." }
}
```

---

### `POST /gst/inward/export/pdf`

**Request Body**
```json
{
  "filters": { "datePreset": "1y" },
  "meta": {
    "dateRange": "01-Apr-2025 to 31-Mar-2026",
    "totals": {
      "taxable": "₹85,00,000",
      "cgst": "₹7,65,000",
      "sgst": "₹7,65,000",
      "purchase": "₹1,00,30,000"
    }
  }
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/.../GST2B_Report.pdf",
    "filename": "GST2B_Report.pdf"
  }
}
```

### PDF Columns

| # | Column |
|---|--------|
| 1 | Purchase Bill No |
| 2 | Invoice Date |
| 3 | Company Name |
| 4 | Description of Goods / Services |
| 5 | Taxable Value (₹)(A) |
| 6 | CGST Amt (₹)(B) |
| 7 | SGST Amt (₹)(C) |
| 8 | Purchase Bill Value (A+B+C) |

---

## Migration Notes

- **Fuzzy header matching**: Same as GST Outward — eliminated by using clean MongoDB field names.
- **Restricted edits**: The original code only allowed editing Column G (Description) and Column P (Input Credit) to protect ArrayFormulas. Since computed columns are now handled server-side, the API can either allow full edits or enforce the same restrictions via an allow-list middleware.
- **`purchaseBillValue` computation**: Consider computing on write: `purchaseBillValue = taxableValue + cgstAmount + sgstAmount`.
