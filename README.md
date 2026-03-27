# AMC Business Management — Migration Guide & Considerations

🚀 **Goal**: Migrate the existing Google Apps Script + Google Sheets application into an Angular Single Page Application (SPA) backed by REST APIs (Spring Boot or Node.js) and MongoDB Atlas.

This README summarizes the migration considerations, challenges, recommended architecture, data model guidance, API ideas, migration plan, and next actionable steps. It’s written to be both technical and actionable while remaining readable.

---

## 🧭 Quick Summary

- Current system: Google Apps Script (.gs) + Google Sheets (Named Ranges) + HTML Service frontend.
- Target: Angular SPA frontend + REST API backend (Spring Boot or Node.js/TypeScript) + MongoDB Atlas (free tier for dev).
- Key migrations: server-side logic → REST endpoints, Sheets → MongoDB (or Sheets via Sheets API), client rewrite to Angular, PDF generation migration, auth redesign.

---

## ⚠️ Major Challenges to Expect

- google.script.run → REST: convert every server call (reads, writes, exports) into REST endpoints.
- Spreadsheet-specific logic: named-range semantics, array-formulas, fuzzy header mapping (GST modules), and implicit sheet behavior must be ported carefully.
- Data model: Google Sheets is a semi-structured datastore. Moving to MongoDB requires designing stable schemas and deciding which data to embed vs reference.
- Concurrency & quotas: Sheets has concurrency quirks and Apps Script quotas; a backend + DB solves some problems but introduces transaction/consistency considerations.
- Auth & security: implement OAuth2 (Google Sign-In), JWT, role-based access control, secure service account usage for Drive/Sheets if required.
- PDF generation: move from HtmlService → PDF (Apps Script) to server-side PDF tooling (Puppeteer, wkhtmltopdf, or a managed microservice).
- UI rewrite: move from server-templated HTML + jQuery/Select2 to Angular components, Reactive Forms, Angular-friendly select widgets.

---

## ✅ Key Technical Recommendations

- Backend choice:
  - Use **Node.js + TypeScript (NestJS/Express)** for faster iteration and unified language across stack.
  - Use **Spring Boot** if your team prefers Java and needs stricter typing and enterprise features.
- Database:
  - Start with **MongoDB Atlas** free tier for flexibility. Design normalized collections and indexes up front.
  - Plan for migration to a paid tier or alternate DB (Postgres) if you need stronger relational integrity or heavy aggregation.
- Authentication:
  - Use **Google Sign-In (OIDC)** to authenticate users, then exchange idToken for your own short-lived **JWT** with RBAC claims.
- PDF generation:
  - Use **Puppeteer** (Node) or a microservice for HTML → PDF conversion and store files in Cloud Storage or Google Drive (service account).
- Frontend:
  - Angular CLI (v15+) + TypeScript, router-based pages, separate feature modules per domain (transactions, dashboard, gst, sites, materials).
  - Replace jQuery/Select2 with Angular-native controls (ngx-select, Angular Material select, or ng-select).
  - Use **ng-apexcharts** to preserve existing dashboard charts.
- Observability & CI/CD:
  - GitHub Actions → Cloud Run/Cloud Build, Cloud Logging/Prometheus for monitoring, Secret Manager for secrets.

---

## 🗄️ Suggested MongoDB Collections (Core)

Design collections to map domain objects and preserve audit trails. Examples below are concise — add indexes and validations as needed.

- users
  - { _id, email, name, roles: ["admin","accountant","viewer"], createdAt, lastLogin }

- sites
  - { _id, siteId: "ACxxxxx", name, client, address, contact, companyAccount, expenseHead, incomeHead, createdAt, isActive }

- transactions
  - { _id, transactionId, date (ISO), company, siteId, type: "Credit"|"Debit", nature, description, amount, party, invoiceNo, gstNo, companyAccount, mode, notes, createdBy, createdAt, updatedAt }

- materials
  - { _id, sNo, date, billNo, itemName, quantity, rate, amount, siteId, shopName, notes, createdAt }

- balance_rows
  - { _id, companyType: "main"|"gst", sNo, liability, liabilityAmount, asset, assetAmount, createdAt }

- pnl_entries
  - { _id, date, income, incomeAmount, expense, expenseAmount, createdAt }

- gst_outward / gst_inward
  - { _id, invoiceNo, invoiceDate, customerName, customerGSTIN, taxableValue, cgstAmt, sgstAmt, invoiceValue, placeOfSupply, inputCreditEligible, rawSheetHeaders: {...}, createdAt }

- dimensions (dropdowns)
  - { _id, name: "Income Head"|"Expense Head"|"Site Name", values: [{value, createdAt}] }

- files (PDF metadata)
  - { _id, type, url, filename, createdBy, createdAt, meta }


> Tip: Use MongoDB validations and indexes for fields used in filters and sorting — e.g., date, siteId, transactionId, nature.

---

## 🛠️ API Design — Resource-Oriented (Examples)

Use consistent JSON responses and support pagination, filtering, and sorting.

- Authentication
  - POST /api/auth/google-login  — accept Google idToken, return app JWT
  - GET /api/auth/me

- Transactions
  - GET /api/transactions?site=&from=&to=&page=&perPage=
  - POST /api/transactions
  - GET /api/transactions/:id
  - PATCH /api/transactions/:id
  - DELETE /api/transactions/:id
  - POST /api/transactions/export/pdf

- Sites
  - GET /api/sites
  - POST /api/sites
  - PATCH /api/sites/:id
  - DELETE /api/sites/:id  (backend must block deletion if transactions exist)

- Materials, Balance, PnL, GST modules follow the same CRUD + export patterns.

Standard response shape:

```json
// success
{ "status": "ok", "data": ..., "meta": { "total": 100, "page": 1, "perPage": 25 } }

// error
{ "status": "error", "code": "INVALID_PAYLOAD", "message": "Amount must be > 0" }
```

---

## 🔒 Auth, Security & Operational Items

- Validate Google idTokens server-side and issue short-lived JWTs for API calls.
- Use service accounts and managed secret stores for Drive/Sheets access if needed.
- Implement RBAC: admin / accountant / viewer.
- Enforce HTTPS, enable rate-limiting, and audit all write operations.
- Backups: rely on MongoDB Atlas snapshots; maintain export strategy for long-term archival.
- Logging/Monitoring: Cloud Logging, structured logs, error reporting, and alerts.

---

## 📦 PDF Generation & Storage

- Use **Puppeteer** for faithful HTML → PDF rendering (best with Node backend).
- Store PDFs in cloud storage (e.g., GCS, S3) or Google Drive via service account. Store metadata in `files` collection and return signed URLs for downloads.
- For heavy use, offload PDF generation to an async job queue (RabbitMQ, Cloud Tasks, or managed pub/sub) to avoid blocking web requests.

---

## 📈 Indexing & Performance

- Add indexes for frequently filtered fields (date, siteId, transactionId, nature).
- Use aggregation pipelines for dashboard metrics; if expensive, pre-compute and cache results.
- Use cursor-based pagination for large datasets to avoid skip/limit performance issues.

---

## 🧩 Migration Plan (Phased & Low-Risk)

1. **Audit** — Extract current Sheets (named ranges, formulas, headers). Export sample datasets.
2. **Design** — Finalize DB schema, API contracts, and canonical header normalization logic.
3. **Prototype** — Build backend read endpoints for one module (Transactions) + an Angular POC page to fetch and render data. Validate parity with Sheets.
4. **Writes & Concurrency** — Implement create/update/delete endpoints, enforce ID generation server-side, and add server-side validations and delete-protection.
5. **ETL & Reconciliation** — Migrate historical data from Sheets to Mongo via ETL scripts. Run reconciliation checks (totals, counts) for a rolling period.
6. **Port UIs** — Incrementally rewrite pages to Angular (one module at a time). Keep the same payload shapes initially.
7. **Exports** — Move PDF exports to Puppeteer/worker service and store generated files in cloud storage.
8. **Cutover** — Make backend the single writer. Keep Sheets read-only (optional) during validation period.
9. **Decommission / Archive** — Archive old Sheets or keep as read-only archive.

---

## 💰 Costs & Free-Tier Notes

- MongoDB Atlas free tier is great for development but limited (storage, connections, backups). Plan to upgrade as data grows.
- Puppeteer and server-side rendering incur CPU/memory costs—consider serverless (Cloud Run) or dedicated worker instances.
- Monitor database I/O and set alerts to upgrade early if load increases.

---

## ✅ Next Actionable Steps I Can Help With

Pick one and I’ll produce a focused deliverable:

- 📄 Full REST API contract (endpoints, request/response examples, validation rules)
- 🧱 Canonical MongoDB collection schemas (JSON + indexes)
- ⚙️ Backend scaffold (Node.js + NestJS or Spring Boot starter)
- 🛠️ ETL script to extract Sheets → JSON → Mongo (with normalization)
- 🧭 Angular project scaffold (routes, modules, example Transactions page)

Which deliverable would you like first? Reply with the letter (e.g., `A`) or describe a custom next step.

---

*Generated on 2026-03-27 — tailored migration guidance for AMC Business Management*
