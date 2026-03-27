# 🧱 08 — Materials

## Overview

Tracks construction materials purchased for sites — item details, quantities, rates, suppliers. Supports full CRUD, search, pagination, and CSV/Excel export.

**Source**: `gsmaterials.gs` + `gssample.gs` → `sup_getMaterials`, `sup_addMaterial`, `sup_updateMaterial`, `sup_deleteMaterial`, `sup_mat_export`

---

## MongoDB Collection: `materials`

```json
{
  "_id": "ObjectId",
  "date": "2026-03-20T00:00:00.000Z",
  "billNo": "BN-2026-0445",
  "itemName": "OPC Cement — 53 Grade",
  "quantity": "50 bags",
  "rate": 420.00,
  "amount": 21000.00,
  "siteId": "ObjectId (ref → sites)",
  "siteName": "Velachery Site",
  "shopName": "Sri Vinayaga Building Materials",
  "notes": "Delivered to site directly",
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-03-20T09:00:00.000Z",
  "updatedAt": "2026-03-20T09:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `date` | `Date` | ✅ | Valid date | Purchase date |
| `billNo` | `String` | — | Max 100 chars | Bill / invoice number |
| `itemName` | `String` | ✅ | Min 1, Max 300 chars | Material name |
| `quantity` | `String` | ✅ | Max 100 chars | Quantity with unit (e.g., `50 bags`, `2 tons`) |
| `rate` | `Decimal128` | ✅ | ≥ 0 | Rate per unit |
| `amount` | `Decimal128` | ✅ | ≥ 0 | Total amount |
| `siteId` | `ObjectId` | ✅ | Ref → `sites` | Which site this material is for |
| `siteName` | `String` | ✅ | — | Denormalized for display |
| `shopName` | `String` | — | Max 300 chars | Supplier / shop name |
| `notes` | `String` | — | Max 500 chars | Additional notes |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.materials.createIndex({ "date": -1 });
db.materials.createIndex({ "itemName": 1 });
db.materials.createIndex({ "siteId": 1 });
db.materials.createIndex({ "shopName": 1 });
```

---

## API Endpoints

### `GET /materials`

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `String` | — | Search text |
| `searchField` | `String` | `all` | `all`, `itemName`, `siteName`, `shopName` |
| `page` | `Number` | `1` | — |
| `perPage` | `Number` | `25` | — |
| `sort` | `String` | `date` | Sort field |
| `order` | `String` | `desc` | `asc` or `desc` |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "665e5f...",
      "date": "2026-03-20",
      "billNo": "BN-2026-0445",
      "itemName": "OPC Cement — 53 Grade",
      "quantity": "50 bags",
      "rate": 420.00,
      "amount": 21000.00,
      "siteName": "Velachery Site",
      "shopName": "Sri Vinayaga Building Materials",
      "notes": "Delivered to site directly"
    }
  ],
  "meta": {
    "total": 234,
    "page": 1,
    "perPage": 25,
    "totalPages": 10
  }
}
```

---

### `POST /materials`

**Request Body**
```json
{
  "date": "2026-03-25",
  "billNo": "BN-2026-0446",
  "itemName": "River Sand — Fine",
  "quantity": "2 loads",
  "rate": 15000.00,
  "amount": 30000.00,
  "siteId": "664a1f...",
  "shopName": "Kaveri Sand Suppliers",
  "notes": ""
}
```

**Validation Rules**
- `date` — required
- `itemName` — required
- `quantity` — required
- `rate` — required, ≥ 0
- `amount` — required, ≥ 0
- `siteId` — required, must exist in `sites`

**Backend Logic**
1. Validate fields.
2. Look up site, set `siteName`.
3. Insert into `materials`.

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": { "id": "665f6a...", "message": "Material added successfully." }
}
```

---

### `PATCH /materials/:id`

**Request Body** (partial)
```json
{
  "quantity": "55 bags",
  "amount": 23100.00,
  "notes": "5 extra bags added"
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "id": "665e5f...", "message": "Material updated." }
}
```

---

### `DELETE /materials/:id`

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Material deleted." }
}
```

---

### `POST /materials/export`

Export materials data to CSV or Excel.

**Request Body**
```json
{
  "format": "csv",
  "filters": {
    "search": "",
    "searchField": "all"
  }
}
```

**Backend Logic**
1. Query all matching materials.
2. Generate CSV string or create an Excel workbook (using a library like `exceljs` or `json2csv`).
3. Store file or stream it.
4. Return download URL.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "url": "https://storage.googleapis.com/.../Materials_20260328_1430.csv",
    "filename": "Materials_20260328_1430.csv"
  }
}
```

---

## Migration Notes

- **`S.No` column**: Was auto-generated via ArrayFormula in Sheets. In MongoDB, omit from storage. Generate sequentially in API responses or let the client calculate from pagination offset.
- **`quantity` as String**: The original stores quantities like `"50 bags"` or `"2 loads"` — a text field with unit. Keep as `String` in MongoDB (not a pure number).
- **`rowIndex` / `S.No` lookup**: The original used sheet row index or S.No for updates/deletes. Replaced by MongoDB `_id`.
- **Site dropdown**: The original `sup_getSiteList()` fetched site names from the Sites sheet. Now use `GET /sites?active=true` and extract names for the dropdown.
