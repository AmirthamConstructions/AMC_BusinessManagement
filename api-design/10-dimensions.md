# 📋 10 — Dimensions (Master Data / Dropdowns)

## Overview

The Dimensions module stores master/lookup data used to populate dropdowns throughout the application — Income Heads, Expense Heads, Payment Modes, Company Accounts, etc. This replaces the `Dimensions` sheet that had multiple columns of varying lengths.

**Source**: `gstransactions.gs` → `sup_getDimensions`, `sup_addDimensionValue`

---

## MongoDB Collection: `dimensions`

Each document represents one category of dropdown values.

```json
{
  "_id": "ObjectId",
  "name": "Expense Head",
  "values": [
    { "value": "Cement Purchase", "createdAt": "2026-01-15T08:30:00.000Z" },
    { "value": "Labour Wages", "createdAt": "2026-01-15T08:30:00.000Z" },
    { "value": "Steel Purchase", "createdAt": "2026-02-10T09:00:00.000Z" },
    { "value": "Transport", "createdAt": "2026-03-01T10:00:00.000Z" }
  ],
  "createdAt": "2026-01-15T08:30:00.000Z",
  "updatedAt": "2026-03-28T10:00:00.000Z"
}
```

### Expected Dimension Categories

These mirror the columns in the original `Dimensions` sheet:

| Document `name` | Used In | Description |
|------------------|---------|-------------|
| `Income Head` | Transactions (Credit type) | Nature heads for income |
| `Expense Head` | Transactions (Debit type) | Nature heads for expenses |
| `Payment Mode` | Transactions | Cash, NEFT, UPI, Cheque, etc. |
| `Company Account` | Transactions | Bank accounts |

### Indexes

```javascript
db.dimensions.createIndex({ "name": 1 }, { unique: true });
```

---

## API Endpoints

### `GET /dimensions`

Fetch all dimension categories and their values.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "666a1b...",
      "name": "Income Head",
      "values": ["Project Revenue", "Site Payment", "Advance Received"]
    },
    {
      "id": "666a2c...",
      "name": "Expense Head",
      "values": ["Cement Purchase", "Labour Wages", "Steel Purchase", "Transport"]
    },
    {
      "id": "666a3d...",
      "name": "Payment Mode",
      "values": ["Cash", "NEFT", "UPI", "Cheque", "RTGS"]
    },
    {
      "id": "666a4e...",
      "name": "Company Account",
      "values": ["HDFC Current A/C", "SBI Savings A/C", "ICICI Current A/C"]
    }
  ]
}
```

---

### `GET /dimensions/:name`

Fetch values for a specific dimension category.

**Example**: `GET /dimensions/Expense Head`

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "666a2c...",
    "name": "Expense Head",
    "values": ["Cement Purchase", "Labour Wages", "Steel Purchase", "Transport"]
  }
}
```

---

### `POST /dimensions/:name/values`

Add a new value to an existing dimension category.

**Request Body**
```json
{
  "value": "Plumbing Materials"
}
```

**Validation Rules**
- `value` — required, non-empty, must not already exist in the array (case-insensitive check)

**Backend Logic**
1. Find dimension document by `name`.
2. Check for duplicate (case-insensitive).
3. Push new value with `createdAt` timestamp.
4. Update `updatedAt`.

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": {
    "message": "Value 'Plumbing Materials' added to Expense Head."
  }
}
```

**Response — 409 Conflict** (duplicate)
```json
{
  "status": "error",
  "error": {
    "code": "DUPLICATE_VALUE",
    "message": "Value 'Plumbing Materials' already exists in Expense Head."
  }
}
```

---

### `DELETE /dimensions/:name/values/:value`

Remove a value from a dimension category.

> **Caution**: Before deleting, the backend should check if the value is used in any `transactions.nature` (or other referencing fields). If in use, return a warning or block deletion.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Value removed." }
}
```

**Response — 409 Conflict** (in use)
```json
{
  "status": "error",
  "error": {
    "code": "VALUE_IN_USE",
    "message": "Cannot delete 'Cement Purchase' — it is used in 47 transactions."
  }
}
```

---

## Seed Data

On initial setup, seed the `dimensions` collection with the categories and migrate existing values from the Sheets `Dimensions` tab:

```javascript
db.dimensions.insertMany([
  {
    name: "Income Head",
    values: [
      { value: "Project Revenue", createdAt: new Date() },
      { value: "Site Payment", createdAt: new Date() },
      { value: "Advance Received", createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Expense Head",
    values: [
      { value: "Cement Purchase", createdAt: new Date() },
      { value: "Labour Wages", createdAt: new Date() },
      { value: "Steel Purchase", createdAt: new Date() },
      { value: "Transport", createdAt: new Date() },
      { value: "Sand", createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Payment Mode",
    values: [
      { value: "Cash", createdAt: new Date() },
      { value: "NEFT", createdAt: new Date() },
      { value: "UPI", createdAt: new Date() },
      { value: "Cheque", createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Company Account",
    values: [
      { value: "HDFC Current A/C", createdAt: new Date() },
      { value: "SBI Savings A/C", createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
```

---

## Migration Notes

- **Multi-column sheet → Array documents**: The original Dimensions sheet had one column per category, each with varying row lengths. In MongoDB, each category is a document with a `values` array — cleaner and easier to query.
- **Dynamic nature dropdown**: The Transactions UI dynamically populates the Nature dropdown based on Type (Credit → Income Heads, Debit → Expense Heads). The Angular frontend will call `GET /dimensions/Income Head` or `GET /dimensions/Expense Head` based on the selected type.
- **Site list**: Site names for dropdowns now come from `GET /sites?active=true` instead of the Dimensions collection. The `Site Name`, `Site ID`, `Client Name`, `Address`, `Contact Number` columns from Dimensions are fully migrated to the `sites` collection.
