# 📐 11 — Common Conventions

## Standard Response Envelope

Every API response uses a consistent JSON structure.

### Success Response

```json
{
  "status": "ok",
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 25,
    "totalPages": 4
  }
}
```

- `data` — The payload. Array for lists, object for single items.
- `meta` — Pagination and aggregate info (only on list endpoints).

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description.",
    "details": [
      { "field": "amount", "message": "Must be greater than 0." }
    ]
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful POST (new resource) |
| `400` | Bad Request | Malformed JSON, missing required fields |
| `401` | Unauthorized | Missing or invalid JWT |
| `403` | Forbidden | Insufficient role / inactive user |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate value, dependency exists (e.g., delete site with transactions) |
| `422` | Unprocessable Entity | Validation errors (valid JSON but invalid values) |
| `500` | Internal Server Error | Unexpected server failure |

---

## Standard Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | JWT or Google token validation failed |
| `USER_INACTIVE` | User account deactivated |
| `UNAUTHORIZED` | Missing authorization header |
| `FORBIDDEN` | Role insufficient for this action |
| `NOT_FOUND` | Resource does not exist |
| `VALIDATION_ERROR` | One or more field validations failed |
| `DUPLICATE_VALUE` | Unique constraint violation |
| `HAS_DEPENDENCIES` | Cannot delete — linked records exist |
| `VALUE_IN_USE` | Dimension value is referenced by existing records |
| `EXPORT_FAILED` | PDF/CSV generation failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Pagination

All list endpoints support:

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | `Number` | `1` | — | Page number (1-indexed) |
| `perPage` | `Number` | `25` | `100` | Results per page |
| `sort` | `String` | varies | — | Field to sort by |
| `order` | `String` | `desc` | — | `asc` or `desc` |

Special value: `page=last` → returns the last page (matches existing behaviour where new entries appear on the last page).

The response `meta` always includes:

```json
{
  "total": 1543,
  "page": 1,
  "perPage": 25,
  "totalPages": 62
}
```

---

## Date Handling

### Storage
- All dates stored as **UTC `Date`** objects in MongoDB.

### API Input
- Accept dates as **ISO 8601 strings**: `"2026-03-28"` or `"2026-03-28T00:00:00.000Z"`.

### API Output
- Return dates as **ISO 8601 strings**: `"2026-03-28"` (date-only) or full ISO.
- The Angular frontend handles display formatting (e.g., `dd-MMM-yyyy`).

### Date Preset Filtering
- `datePreset=all` → No date filter
- `datePreset=1m` → Last 1 month from today
- `datePreset=6m` → Last 6 months
- `datePreset=1y` → Last 1 year
- `datePreset=custom` → Use `fromDate` and `toDate` query params

When `toDate` is specified, the backend includes the entire end day (set time to `23:59:59.999`).

---

## Search Behaviour

| Param | Behaviour |
|-------|-----------|
| `search=cement` | Case-insensitive substring match |
| `searchField=all` | Searches across all text fields |
| `searchField=siteName` | Searches only the specified field |

Implementation: Use MongoDB regex for simple searches, or text indexes for full-text.

```javascript
// Simple regex approach
{ siteName: { $regex: "cement", $options: "i" } }

// Or text search (requires text index)
{ $text: { $search: "cement" } }
```

---

## Monetary Values

- **Storage**: Use MongoDB `Decimal128` type for all financial amounts to avoid floating-point precision issues.
- **JSON serialization**: Serialize as `Number` (JavaScript) in API responses. For values requiring exact precision, consider returning as string with 2 decimal places.
- **Currency**: All amounts are in **₹ (Indian Rupees)**. No multi-currency support needed.
- **Formatting**: The frontend handles Indian number formatting (e.g., `₹25,00,000`).

---

## Audit Fields

Every collection document includes:

| Field | Type | Description |
|-------|------|-------------|
| `createdBy` | `ObjectId` | User who created the record (from JWT) |
| `createdAt` | `Date` | Auto-set on creation |
| `updatedAt` | `Date` | Auto-set on every update |

For delete operations, consider logging to a separate `audit_log` collection if a full audit trail is needed.

---

## ID Conventions

| Entity | ID Format | Generation |
|--------|-----------|------------|
| MongoDB primary key | `ObjectId` | Auto by MongoDB |
| Transaction ID | `TXN260328143022` | `TXN` + `yyMMddHHmmss` + optional random suffix |
| Site ID | `AC56978` | `AC` + 5-digit random number (unique) |

- `_id` (ObjectId) is the internal primary key for all DB operations.
- Business IDs (`transactionId`, `siteId`) are for display and human reference.
- API responses expose `id` (string representation of `_id`) as the primary identifier for clients.

---

## CORS Configuration

The Angular frontend will run on a different origin than the API server.

```
Allowed Origins: https://amirtham.app, http://localhost:4200
Allowed Methods: GET, POST, PATCH, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization
Max Age: 86400
```

---

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global | 1000 requests | 15 minutes |
| Per user (authenticated) | 300 requests | 15 minutes |
| Export endpoints | 10 requests | 15 minutes |

---

## File Naming (Exports)

| Export Type | Filename Pattern |
|-------------|-----------------|
| Transaction PDF | `Transactions_yyyyMMdd_HHmm.pdf` |
| Balance Sheet PDF | `BalanceSheet_yyyyMMdd_HHmm.pdf` |
| P&L PDF | `PnL_Report.pdf` |
| GST-1 Outward PDF | `GST1_Outward_Report.pdf` |
| GST-2B Inward PDF | `GST2B_Report.pdf` |
| Materials CSV | `Materials_yyyyMMdd_HHmm.csv` |
| Materials Excel | `Materials_yyyyMMdd_HHmm.xlsx` |
