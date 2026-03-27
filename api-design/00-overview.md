# 📐 API & Database Schema Design — Overview

> **Project**: AMC Business Management  
> **Stack**: Angular SPA → REST API (Node.js or Spring Boot) → MongoDB Atlas  
> **Version**: 1.0 — Initial Migration Design  
> **Date**: March 2026

---

## 📂 Document Index

| # | File | Module | Contents |
|---|------|--------|----------|
| 01 | `01-authentication.md` | Auth & Users | Google OAuth, JWT, RBAC, user schema |
| 02 | `02-transactions.md` | Transactions | Full CRUD, server-side pagination, filtering, PDF export |
| 03 | `03-sites.md` | Sites | Site management, delete-protection, site transactions drill-down |
| 04 | `04-balance-sheet.md` | Balance Sheet | Main + GST dual-entity balance sheets |
| 05 | `05-profit-loss.md` | Profit & Loss | Main + GST dual-entity P&L statements |
| 06 | `06-gst-outward.md` | GST-1R Outward | Outward supply invoices |
| 07 | `07-gst-inward.md` | GST-2B Inward | Inward supply / purchase bills |
| 08 | `08-materials.md` | Materials | Material inventory, CSV/Excel export |
| 09 | `09-dashboard.md` | Dashboard | KPIs, charts, aggregation pipelines |
| 10 | `10-dimensions.md` | Dimensions | Dropdown master data (heads, modes, accounts) |
| 11 | `11-common-conventions.md` | Shared | Response format, error codes, pagination, date handling |

---

## 🔑 Design Principles

1. **Resource-Oriented REST** — One base URL per resource, HTTP verbs for actions.
2. **Consistent Response Envelope** — Every response uses `{ status, data, meta, error }`.
3. **Server-Side Pagination** — All list endpoints accept `page`, `perPage`, `sort`, `order`.
4. **Server-Side Filtering** — Date ranges, search text, and column-specific filters are query parameters processed on the backend.
5. **Dual-Entity Support** — Balance Sheet and P&L exist for both `main` and `gst` companies, differentiated by a `companyType` field in a single collection.
6. **Audit Trail** — All documents carry `createdBy`, `createdAt`, `updatedAt`.
7. **Soft Delete** (optional) — Consider `isDeleted` flag for financial records instead of hard delete.

---

## 🏗️ Base URL

```
Production : https://api.amirtham.app/api/v1
Development: http://localhost:3000/api/v1
```

All endpoints below are relative to this base.

---

## 🔐 Authentication Header

All protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

See `01-authentication.md` for login flow.

---

## 📊 MongoDB Database

**Database Name**: `amc_business`

**Collections**: `users`, `transactions`, `sites`, `materials`, `balance_rows`, `pnl_entries`, `gst_outward`, `gst_inward`, `dimensions`, `files`

See individual documents for schemas and indexes.
