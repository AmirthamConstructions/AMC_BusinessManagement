# 📊 09 — Dashboard

## Overview

The Dashboard is a **read-only** module that aggregates data from other collections to display KPIs and charts. It has no collection of its own — all data is computed via MongoDB aggregation pipelines.

**Source**: `gsdashboard.gs` → `dashGetDashboardData`

---

## Data Sources

| KPI / Chart | Source Collection | Aggregation |
|-------------|-------------------|-------------|
| Total Revenue | `transactions` | Sum of `amount` where `type = "Credit"` |
| Total Expenditure | `transactions` | Sum of `amount` where `type = "Debit"` |
| Total Profit | Derived | Revenue − Expenditure |
| Company Expenses | `transactions` | Sum of `amount` where `type = "Debit"` and specific nature heads |
| Net Profit | Derived | Total Profit − Company Expenses |
| Chart 1 — Profit Growth | `transactions` | Cumulative sum of profit over time |
| Chart 2 — Site Profit % | `transactions` | Per-site revenue vs expenditure ratio |
| Chart 3 — Head-wise Expenditure | `transactions` | Group by `nature`, sum `amount` where `type = "Debit"` |

> **Note**: The current implementation reads KPIs from hardcoded cells (`I3`–`I7`) in a Dashboard sheet, and chart data from named ranges (`DASHCUMPROFIT`, `DASHSITEWISE`, `DASHHEADWISE`). In the new system, these are all computed live from the `transactions` collection.

---

## API Endpoints

### `GET /dashboard`

Returns all KPIs and chart data in a single payload (mirrors the current `dashGetDashboardData()` which returns everything at once).

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `company` | `String` | — | Filter by `Main` or `GST` (optional) |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "kpis": {
      "revenue": 4500000,
      "expenditure": 2800000,
      "totalProfit": 1700000,
      "companyExpenses": 350000,
      "netProfit": 1350000
    },
    "chart1": {
      "title": "Company Profit Growth",
      "dates": [
        "2025-04-01T00:00:00.000Z",
        "2025-05-01T00:00:00.000Z",
        "2025-06-01T00:00:00.000Z"
      ],
      "values": [120000, 285000, 410000]
    },
    "chart2": {
      "title": "Profit Percentage by Site",
      "categories": ["Velachery Site", "Adyar Site", "T. Nagar Site"],
      "values": [38, 25, 42]
    },
    "chart3": {
      "title": "Head-wise Expenditure",
      "categories": ["Cement", "Steel", "Labour", "Transport", "Sand"],
      "values": [450000, 680000, 920000, 180000, 310000]
    }
  }
}
```

---

### Alternative: Split Endpoints

For better caching and partial loading, the dashboard can be split:

| Endpoint | Returns |
|----------|---------|
| `GET /dashboard/kpis` | Just the 5 KPI values |
| `GET /dashboard/profit-growth` | Chart 1 data (dates + cumulative profit) |
| `GET /dashboard/site-profit` | Chart 2 data (site names + profit percentages) |
| `GET /dashboard/expenditure-heads` | Chart 3 data (head names + amounts) |

---

## Aggregation Pipelines

### KPIs

```javascript
// Revenue
db.transactions.aggregate([
  { $match: { type: "Credit" } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
]);

// Expenditure
db.transactions.aggregate([
  { $match: { type: "Debit" } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
]);
```

### Chart 1 — Cumulative Profit Growth

```javascript
db.transactions.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
      income: {
        $sum: { $cond: [{ $eq: ["$type", "Credit"] }, "$amount", 0] }
      },
      expense: {
        $sum: { $cond: [{ $eq: ["$type", "Debit"] }, "$amount", 0] }
      }
    }
  },
  { $sort: { "_id": 1 } },
  {
    $project: {
      month: "$_id",
      profit: { $subtract: ["$income", "$expense"] }
    }
  }
]);
// Then compute running cumulative sum in application code
```

### Chart 2 — Site-wise Profit Percentage

```javascript
db.transactions.aggregate([
  {
    $group: {
      _id: "$siteName",
      income: {
        $sum: { $cond: [{ $eq: ["$type", "Credit"] }, "$amount", 0] }
      },
      expense: {
        $sum: { $cond: [{ $eq: ["$type", "Debit"] }, "$amount", 0] }
      }
    }
  },
  {
    $project: {
      siteName: "$_id",
      profitPercent: {
        $cond: [
          { $eq: ["$income", 0] },
          0,
          {
            $multiply: [
              { $divide: [{ $subtract: ["$income", "$expense"] }, "$income"] },
              100
            ]
          }
        ]
      }
    }
  },
  { $sort: { "siteName": 1 } }
]);
```

### Chart 3 — Head-wise Expenditure

```javascript
db.transactions.aggregate([
  { $match: { type: "Debit", amount: { $gt: 0 } } },
  {
    $group: {
      _id: "$nature",
      totalAmount: { $sum: "$amount" }
    }
  },
  { $sort: { "totalAmount": -1 } },
  {
    $project: {
      head: "$_id",
      amount: "$totalAmount"
    }
  }
]);
```

---

## Performance Considerations

- **Caching**: Dashboard aggregations can be expensive on large datasets. Consider:
  - In-memory cache with TTL (e.g., 5 minutes) using Node.js cache or Redis.
  - Pre-computed materialized views updated on a schedule or on transaction writes.
- **Indexes**: The `transactions` indexes on `type`, `date`, `siteId`, and `nature` directly support these aggregation queries.
- **Decimal precision**: Use `$toDecimal` or `NumberDecimal` for financial sums to avoid floating-point errors.

---

## Migration Notes

- **Hardcoded cell references** (`I3`–`I7`): Replaced by live aggregation queries.
- **Named ranges** (`DASHCUMPROFIT`, `DASHSITEWISE`, `DASHHEADWISE`): Replaced by aggregation pipelines.
- **Profit percentage conversion**: The original code had logic to detect if a value was a decimal (0.75) and multiply by 100 to get 75%. In the new system, the aggregation pipeline outputs the correct percentage directly.
- **Chart library**: Angular frontend will use `ng-apexcharts` (ApexCharts Angular wrapper) — same chart types (area, bar, horizontal bar).
