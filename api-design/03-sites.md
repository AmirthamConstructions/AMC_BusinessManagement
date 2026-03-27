# 🏗️ 03 — Sites

## Overview

Sites represent construction projects/locations. Each site has a unique ID (`ACxxxxx`), client info, and is linked to transactions. A site **cannot be deleted if transactions exist** for it.

**Source**: `gssites.gs` → `sup_site_getSites`, `sup_site_addSite`, `sup_site_updateSite`, `sup_site_deleteSite`, `sup_site_getTransactionsForSite`, `sup_site_generateUniqueId`

---

## MongoDB Collection: `sites`

```json
{
  "_id": "ObjectId",
  "siteId": "AC56978",
  "name": "Velachery Site",
  "clientName": "Rajesh Kumar",
  "address": "No. 12, 3rd Cross St, Velachery, Chennai - 600042",
  "contactNumber": "9876543210",
  "company": "Main",
  "expenseHead": "Construction",
  "incomeHead": "Project Revenue",
  "paymentMode": "NEFT",
  "companyAccount": "HDFC Current A/C",
  "isActive": true,
  "createdBy": "ObjectId (ref → users)",
  "createdAt": "2026-01-15T08:30:00.000Z",
  "updatedAt": "2026-03-28T10:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `siteId` | `String` | ✅ | Unique, format `AC` + 5 digits | Auto-generated on creation |
| `name` | `String` | ✅ | Min 2, Max 200 chars | Site / project name |
| `clientName` | `String` | — | Max 200 chars | Client who owns the project |
| `address` | `String` | — | Max 500 chars | Physical address |
| `contactNumber` | `String` | — | Max 15 chars | Client contact number |
| `company` | `String` | — | Enum: `Main`, `GST` | Associated company entity |
| `expenseHead` | `String` | — | — | Default expense head for site |
| `incomeHead` | `String` | — | — | Default income head for site |
| `paymentMode` | `String` | — | — | Default payment mode |
| `companyAccount` | `String` | — | — | Default bank account |
| `isActive` | `Boolean` | ✅ | Default `true` | Soft deactivation |
| `createdBy` | `ObjectId` | ✅ | Ref → `users` | — |
| `createdAt` | `Date` | ✅ | Auto | — |
| `updatedAt` | `Date` | ✅ | Auto | — |

### Indexes

```javascript
db.sites.createIndex({ "siteId": 1 }, { unique: true });
db.sites.createIndex({ "name": 1 });
db.sites.createIndex({ "isActive": 1 });
```

---

## API Endpoints

### `GET /sites`

Fetch all sites (lightweight list for tables and dropdowns).

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `active` | `Boolean` | — | Filter by active status |
| `search` | `String` | — | Search in `name`, `clientName`, `siteId` |

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "664a1f...",
      "siteId": "AC56978",
      "name": "Velachery Site",
      "clientName": "Rajesh Kumar",
      "address": "No. 12, 3rd Cross St, Velachery",
      "contactNumber": "9876543210",
      "company": "Main",
      "isActive": true
    }
  ],
  "meta": { "total": 12 }
}
```

---

### `GET /sites/:id`

Fetch a single site with full details.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664a1f...",
    "siteId": "AC56978",
    "name": "Velachery Site",
    "clientName": "Rajesh Kumar",
    "address": "No. 12, 3rd Cross St, Velachery, Chennai - 600042",
    "contactNumber": "9876543210",
    "company": "Main",
    "expenseHead": "Construction",
    "incomeHead": "Project Revenue",
    "paymentMode": "NEFT",
    "companyAccount": "HDFC Current A/C",
    "isActive": true,
    "createdAt": "2026-01-15T08:30:00.000Z",
    "updatedAt": "2026-03-28T10:00:00.000Z"
  }
}
```

---

### `GET /sites/:id/transactions`

Fetch all transactions for a specific site (drill-down / popup).

**Query Parameters**: Same pagination and filter params as `GET /transactions`.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "664b2e...",
      "transactionId": "TXN260328143022",
      "date": "2026-03-28",
      "type": "Debit",
      "nature": "Cement Purchase",
      "description": "50 bags OPC cement",
      "amount": 25000.00,
      "party": "ACC Dealers Pvt Ltd"
    }
  ],
  "meta": { "total": 48, "page": 1, "perPage": 25, "totalPages": 2 }
}
```

---

### `POST /sites`

Create a new site. `siteId` is generated server-side.

**Request Body**
```json
{
  "name": "Adyar Site",
  "clientName": "Suresh Babu",
  "address": "45, Gandhi Nagar, Adyar, Chennai",
  "contactNumber": "9123456789",
  "company": "Main",
  "expenseHead": "Construction",
  "incomeHead": "Project Revenue",
  "paymentMode": "NEFT",
  "companyAccount": "HDFC Current A/C"
}
```

**Validation Rules**
- `name` — required, min 2 chars

**Backend Logic**
1. Validate fields.
2. Generate unique `siteId`: `"AC"` + random 5-digit number. Check uniqueness in DB (retry up to 2000 times).
3. Set `createdBy` from JWT user.
4. Insert into `sites` collection.

**Response — 201 Created**
```json
{
  "status": "ok",
  "data": {
    "id": "664c3f...",
    "siteId": "AC82341",
    "message": "Site added successfully."
  }
}
```

---

### `PATCH /sites/:id`

Update site details.

**Request Body** (partial)
```json
{
  "clientName": "Suresh Babu K",
  "address": "45, Gandhi Nagar Main Road, Adyar, Chennai"
}
```

**Backend Logic**
1. Find site by `_id`.
2. If `name` is being changed, also update `siteName` in all linked transactions (denormalization sync).
3. Update fields + set `updatedAt`.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664c3f...",
    "siteId": "AC82341",
    "message": "Site updated successfully."
  }
}
```

---

### `DELETE /sites/:id`

Delete a site. **Blocked if transactions exist for this site.**

**Backend Logic**
1. Count documents in `transactions` where `siteId` matches.
2. If count > 0, return 409 Conflict.
3. Otherwise, delete the site document.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": { "message": "Site deleted." }
}
```

**Response — 409 Conflict**
```json
{
  "status": "error",
  "error": {
    "code": "HAS_DEPENDENCIES",
    "message": "Cannot delete site. There are transactions linked to this site."
  }
}
```

---

## Migration Notes

- **Site ID format**: Preserved as `AC` + 5-digit random number. Use a DB-level unique index and retry loop on collision.
- **`S.No` column**: Was ArrayFormula-generated in Sheets. In MongoDB, omit it — generate sequential numbers in the API response or client-side if needed for display.
- **Delete protection**: Was checked by scanning the Transactions sheet. Now a simple `db.transactions.countDocuments({ siteId })` query.
- **Site name denormalization**: `siteName` is stored in `transactions` for fast reads. When a site name is updated, run a batch update: `db.transactions.updateMany({ siteId }, { $set: { siteName: newName } })`.
