# 📊 04 — Balance Sheet

## Overview

Tracks assets (debit) and liabilities (credit) for both **Main** and **GST** company entities in a single collection, differentiated by `companyType`. Supports CRUD, search, date filtering, and PDF export.

**Source**: `gsbalance_sheet.gs` (Main — `RANGEBALANCESHEET`) + `gsgstbalance_sheet.gs` (GST — `RANGEGSTBALANCESHEET`)

---

## MongoDB Collection: `balance_rows`

```json
{
  "_id": "ObjectId",
  "companyType": "main",
  "sNo": 1,
  "liability": "Bank Loan — SBI",
  "liabilityAmount": 500000.00,
  "asset": "Land — Velachery Plot",
  "assetAmount": 1200000.00,
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-01-15T08:30:00.000Z",
  "updatedAt": "2026-03-28T10:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `companyType` | `String` | ✅ | Enum: `main`, `gst` | Distinguishes the two entities |
| `sNo` | `Number` | — | Auto-incremented per companyType | Display serial number |
| `liability` | `String` | — | Max 300 chars | Liability (Credit) category name |
| `liabilityAmount` | `Decimal128` | — | ≥ 0 | Liability amount in ₹ |
| `asset` | `String` | — | Max 300 chars | Asset (Debit) category name |
| `assetAmount` | `Decimal128` | — | ≥ 0 | Asset amount in ₹ |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.balance_rows.createIndex({ "companyType": 1 });
db.balance_rows.createIndex({ "companyType": 1, "createdAt": -1 });
```

---

## API Endpoints

All endpoints accept `companyType` as a path segment:

```
/balance-sheet/main/...
/balance-sheet/gst/...
```

### `GET /balance-sheet/:companyType`

Fetch all balance sheet rows for the given entity.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `String` | — | Search in `liability` or `asset` |
| `searchField` | `String` | `all` | `all`, `liability`, `asset` |
| `page` | `Number` | `1` | Page |
| `perPage` | `Number` | `25` | Per page |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "664d1a...",
      "sNo": 1,
      "liability": "Bank Loan — SBI",
      "liabilityAmount": 500000.00,
      "asset": "Land — Velachery Plot",
      "assetAmount": 1200000.00
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "perPage": 25,
    "totalPages": 1,
    "totalLiability": 2350000.00,
    "totalAsset": 3800000.00
  }
}
```

> Note: `totalLiability` and `totalAsset` are computed over **all matching rows** (not just the current page), mirroring the current summary bar.

---

### `POST /balance-sheet/:companyType`

Add a new asset/liability row.

**Request Body**
```json
{
  "asset": "Office Equipment",
  "assetAmount": 75000.00
}
```

Or a liability:
```json
{
  "liability": "Vendor Credit — Steel",
  "liabilityAmount": 150000.00
}
```

Or both on the same row:
```json
{
  "liability": "Mortgage",
  "liabilityAmount": 1000000.00,
  "asset": "Building — T. Nagar",
  "assetAmount": 2500000.00
}
```

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": {
    "id": "664e2b...",
    "message": "Balance sheet entry added."
  }
}
```

---

### `PATCH /balance-sheet/:companyType/:id`

Update a balance sheet row (typically asset fields; liabilities are read-only in the current UI but the API supports both).

**Request Body** (partial)
```json
{
  "asset": "Office Equipment — Updated",
  "assetAmount": 82000.00
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664e2b...",
    "message": "Balance sheet entry updated."
  }
}
```

---

### `DELETE /balance-sheet/:companyType/:id`

Delete a balance sheet row.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Balance sheet entry deleted." }
}
```

---

### `POST /balance-sheet/:companyType/export/pdf`

Export filtered balance sheet to PDF.

**Request Body**
```json
{
  "filters": {
    "search": "",
    "searchField": "all"
  },
  "meta": {
    "dateRange": "As on 28-Mar-2026"
  }
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/.../BalanceSheet_20260328.pdf",
    "filename": "BalanceSheet_20260328_1430.pdf"
  }
}
```

### PDF Columns

| # | Column |
|---|--------|
| 1 | S.No |
| 2 | Liability (Credit) |
| 3 | Liability Amount |
| 4 | Asset (Debit) |
| 5 | Asset Amount |

---

## Migration Notes

- **Dual entity**: Previously two separate `.gs` files and named ranges. Now unified into one collection with `companyType` discriminator.
- **`__row` property**: No longer needed — MongoDB `_id` replaces the absolute sheet row reference.
- **`S.No`**: Was ArrayFormula-generated. Now auto-calculated: either auto-increment on insert, or generated on response based on sort order.
- **Summary totals**: Computed via aggregation pipeline (`$match` + `$group`) for the filtered set — returned in the response `meta`.
