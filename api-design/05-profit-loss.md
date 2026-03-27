# 📈 05 — Profit & Loss

## Overview

Records income and expense line items for both **Main** and **GST** entities in a single collection. Supports listing with date filtering, search, summary totals, and PDF export.

**Source**: `gspnl.gs` (Main — `RANGEPROFITLOSS`) + `gsgstnl.gs` (GST — `RANGEGSTPROFITLOSS`)

---

## MongoDB Collection: `pnl_entries`

```json
{
  "_id": "ObjectId",
  "companyType": "main",
  "date": "2026-03-15T00:00:00.000Z",
  "income": "Site Revenue — Velachery",
  "incomeAmount": 350000.00,
  "expense": "Labour Wages",
  "expenseAmount": 120000.00,
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-03-15T09:00:00.000Z",
  "updatedAt": "2026-03-15T09:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `companyType` | `String` | ✅ | Enum: `main`, `gst` | Entity discriminator |
| `date` | `Date` | ✅ | Valid date | Entry date |
| `income` | `String` | — | Max 300 chars | Income description / category |
| `incomeAmount` | `Decimal128` | — | ≥ 0; `null` if no income on this row | Income amount in ₹ |
| `expense` | `String` | — | Max 300 chars | Expense description / category |
| `expenseAmount` | `Decimal128` | — | ≥ 0; `null` if no expense on this row | Expense amount in ₹ |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

> **Note**: A single row may have only income, only expense, or both — matching the current paired-column structure in the Sheets.

### Indexes

```javascript
db.pnl_entries.createIndex({ "companyType": 1, "date": -1 });
db.pnl_entries.createIndex({ "companyType": 1 });
```

---

## API Endpoints

All endpoints scoped by entity:

```
/pnl/main/...
/pnl/gst/...
```

### `GET /pnl/:companyType`

Fetch P&L entries with optional filters.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `String` | — | Search in `income`, `expense` |
| `searchField` | `String` | `all` | `all`, `income`, `expense` |
| `datePreset` | `String` | `all` | `all`, `1m`, `6m`, `custom` |
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
      "id": "664f1a...",
      "date": "2026-03-15",
      "income": "Site Revenue — Velachery",
      "incomeAmount": 350000.00,
      "expense": "Labour Wages",
      "expenseAmount": 120000.00
    }
  ],
  "meta": {
    "total": 85,
    "page": 1,
    "perPage": 25,
    "totalPages": 4,
    "totalIncome": 4500000.00,
    "totalExpense": 2800000.00,
    "netProfit": 1700000.00,
    "periodLabel": "01-Jan-2026 to 28-Mar-2026"
  }
}
```

> Summary totals (`totalIncome`, `totalExpense`, `netProfit`) are computed over the **entire filtered set**, not just the current page.

---

### `POST /pnl/:companyType/export/pdf`

Export P&L report to PDF.

**Request Body**
```json
{
  "filters": {
    "datePreset": "6m",
    "search": ""
  },
  "meta": {
    "dateRange": "01-Oct-2025 to 28-Mar-2026",
    "totalIncome": "₹45,00,000",
    "totalExpense": "₹28,00,000",
    "totalProfit": "₹17,00,000"
  }
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/.../PnL_Report.pdf",
    "filename": "PnL_Report.pdf"
  }
}
```

### PDF Columns

| # | Column |
|---|--------|
| 1 | Date |
| 2 | Income |
| 3 | Income Amount |
| 4 | Expense |
| 5 | Expense Amount |

Plus header summary: Total Income, Total Expense, Net Profit.

---

## Aggregation Pipeline (Summary Totals)

Used by the API to compute `meta` totals for any filtered query:

```javascript
db.pnl_entries.aggregate([
  { $match: { companyType: "main", date: { $gte: fromDate, $lte: toDate } } },
  {
    $group: {
      _id: null,
      totalIncome: { $sum: { $ifNull: ["$incomeAmount", 0] } },
      totalExpense: { $sum: { $ifNull: ["$expenseAmount", 0] } },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      totalIncome: 1,
      totalExpense: 1,
      netProfit: { $subtract: ["$totalIncome", "$totalExpense"] },
      count: 1
    }
  }
]);
```

---

## Migration Notes

- **Dual entity**: Previously `gspnl.gs` (suffix `1`) for Main and `gsgstnl.gs` for GST. Now unified with `companyType` field.
- **Zero/empty amounts**: The original code converted `0` → `""` for UI display. In MongoDB, store as `null` or `0`. Let the Angular frontend handle display formatting.
- **`_raw` date fields**: No longer needed — MongoDB date queries replace client-side timestamp filtering.
