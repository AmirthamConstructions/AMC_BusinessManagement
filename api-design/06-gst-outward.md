# 📤 06 — GST-1R Outward (Sales Invoices)

## Overview

Records outward supply invoices for GST filing (GSTR-1). Contains 17 fields per invoice. Supports CRUD, date filtering, search, and PDF export.

**Source**: `gsgst1r_outward` → `sup_gst1r_getData`, `sup_gst1r_addInvoice`, `sup_gst1r_updateRow`, `sup_gst1r_deleteRow`, `sup_gst1r_exportPdf`

---

## MongoDB Collection: `gst_outward`

```json
{
  "_id": "ObjectId",
  "year": "2025-26",
  "invoiceMonth": "March",
  "filingMonth": "April",
  "invoiceNo": "GST/OUT/2026/0134",
  "invoiceDate": "2026-03-15T00:00:00.000Z",
  "customerName": "Rajesh Builders Pvt Ltd",
  "customerGSTIN": "33AABCR1234F1ZP",
  "description": "Construction services — Velachery site",
  "taxableValue": 500000.00,
  "cgstPercent": 9,
  "cgstAmount": 45000.00,
  "sgstPercent": 9,
  "sgstAmount": 45000.00,
  "invoiceValue": 590000.00,
  "placeOfSupply": "Tamil Nadu (33)",
  "inputCreditEligible": "Yes",
  "remarks": "",
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-03-15T10:30:00.000Z",
  "updatedAt": "2026-03-15T10:30:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `year` | `String` | — | e.g. `2025-26` | Financial year |
| `invoiceMonth` | `String` | — | Month name | Month of invoice |
| `filingMonth` | `String` | — | Month name | GST filing month |
| `invoiceNo` | `String` | ✅ | Unique per year | Invoice number |
| `invoiceDate` | `Date` | ✅ | Valid date | Invoice date |
| `customerName` | `String` | ✅ | Max 300 chars | Customer name |
| `customerGSTIN` | `String` | — | 15-char GSTIN format | Customer's GSTIN |
| `description` | `String` | — | Max 500 chars | Goods / Services description |
| `taxableValue` | `Decimal128` | ✅ | ≥ 0 | Taxable value (A) |
| `cgstPercent` | `Number` | — | 0–50 | CGST percentage |
| `cgstAmount` | `Decimal128` | — | ≥ 0 | CGST amount (B) |
| `sgstPercent` | `Number` | — | 0–50 | SGST percentage |
| `sgstAmount` | `Decimal128` | — | ≥ 0 | SGST amount (C) |
| `invoiceValue` | `Decimal128` | — | ≥ 0 | Total invoice value (A+B+C) |
| `placeOfSupply` | `String` | — | — | State + code |
| `inputCreditEligible` | `String` | — | Enum: `Yes`, `No` | ITC eligibility |
| `remarks` | `String` | — | Max 500 chars | Notes |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.gst_outward.createIndex({ "invoiceDate": -1 });
db.gst_outward.createIndex({ "invoiceNo": 1 });
db.gst_outward.createIndex({ "customerName": 1 });
db.gst_outward.createIndex({ "year": 1, "invoiceMonth": 1 });
```

---

## API Endpoints

### `GET /gst/outward`

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `String` | — | Search in `customerName`, `invoiceNo` |
| `searchField` | `String` | `all` | `all`, `customerName`, `invoiceNo` |
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
      "id": "665a1b...",
      "invoiceNo": "GST/OUT/2026/0134",
      "invoiceDate": "2026-03-15",
      "customerName": "Rajesh Builders Pvt Ltd",
      "customerGSTIN": "33AABCR1234F1ZP",
      "description": "Construction services",
      "taxableValue": 500000.00,
      "cgstPercent": 9,
      "cgstAmount": 45000.00,
      "sgstPercent": 9,
      "sgstAmount": 45000.00,
      "invoiceValue": 590000.00,
      "placeOfSupply": "Tamil Nadu (33)",
      "inputCreditEligible": "Yes",
      "remarks": ""
    }
  ],
  "meta": {
    "total": 67,
    "page": 1,
    "perPage": 25,
    "totalPages": 3,
    "totals": {
      "taxableValue": 12500000.00,
      "cgstAmount": 1125000.00,
      "sgstAmount": 1125000.00,
      "invoiceValue": 14750000.00
    }
  }
}
```

---

### `POST /gst/outward`

**Request Body**
```json
{
  "year": "2025-26",
  "invoiceMonth": "March",
  "filingMonth": "April",
  "invoiceNo": "GST/OUT/2026/0135",
  "invoiceDate": "2026-03-20",
  "customerName": "Sri Constructions",
  "customerGSTIN": "33BBBCS5678G2ZQ",
  "description": "Sand supply",
  "taxableValue": 120000.00,
  "cgstPercent": 9,
  "cgstAmount": 10800.00,
  "sgstPercent": 9,
  "sgstAmount": 10800.00,
  "invoiceValue": 141600.00,
  "placeOfSupply": "Tamil Nadu (33)",
  "inputCreditEligible": "Yes",
  "remarks": ""
}
```

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": { "id": "665b2c...", "message": "Invoice added successfully." }
}
```

---

### `PATCH /gst/outward/:id`

**Request Body** (partial — only editable fields)
```json
{
  "description": "Sand supply — corrected",
  "placeOfSupply": "Tamil Nadu (33)",
  "inputCreditEligible": "No",
  "remarks": "Revised"
}
```

> **Note**: In the original system, only specific columns were editable to protect ArrayFormulas (Invoice No, Date, Customer, Description, Taxable Value, Place of Supply, Input Credit, Remarks). The API can enforce this with an allow-list of editable fields, or allow full updates since computed columns are now handled server-side.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "id": "665b2c...", "message": "Invoice updated." }
}
```

---

### `DELETE /gst/outward/:id`

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Invoice deleted." }
}
```

---

### `POST /gst/outward/export/pdf`

**Request Body**
```json
{
  "filters": { "datePreset": "6m" },
  "meta": {
    "dateRange": "01-Oct-2025 to 31-Mar-2026",
    "totals": {
      "taxable": "₹1,25,00,000",
      "cgst": "₹11,25,000",
      "sgst": "₹11,25,000",
      "invoice": "₹1,47,50,000"
    }
  }
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/.../GST1_Outward_Report.pdf",
    "filename": "GST1_Outward_Report.pdf"
  }
}
```

### PDF Columns

| # | Column |
|---|--------|
| 1 | Invoice No |
| 2 | Invoice Date |
| 3 | Customer Name |
| 4 | Description of Goods / Services |
| 5 | Taxable Value (₹)(A) |
| 6 | CGST Amt (₹)(B) |
| 7 | SGST Amt (₹)(C) |
| 8 | Invoice Value (A+B+C) |

---

## Migration Notes

- **Fuzzy header matching**: The original `_normKey()` function with NFKC normalization and partial token matching was needed because Sheets had special characters (₹, %, non-breaking spaces) in headers. With MongoDB, fields have clean, predictable names — this complexity is eliminated.
- **Computed columns** (CGST Amt, SGST Amt, Invoice Value): Were ArrayFormula-generated in Sheets. In the new system, either compute on write (backend calculates and stores) or compute on read. Recommendation: compute on write for consistency.
- **`_row` property**: Replaced by MongoDB `_id`.
