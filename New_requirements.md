# AMC Business Management — New Feature Requirements (Detailed)

> **Prepared:** 12-Apr-2026  
> **Based on:** Vague inputs from stakeholder, analysed against existing codebase

---

## Table of Contents

| # | Requirement | Priority |
|---|-------------|----------|
| R1 | [Invoice Generation (Enhancement)](#r1--invoice-generation-enhancement-to-existing-invoices-module) | 🔴 High |
| R2 | [GST 2B Upload, Download & Send](#r2--gst-2b-upload-download--send) | 🟡 Medium |
| R3 | [Inventory Management (New Module)](#r3--inventory-management-new-module) | 🟡 Medium |
| R4 | [Material Analytics (Enhancement)](#r4--material-analytics-enhancement-to-existing-materials-module) | 🟡 Medium |
| R5 | [Site-wise Analytics & Export](#r5--site-wise-analytics--export) | 🔴 High |
| R6 | [Full Data Backup, Send & Save to Drive](#r6--full-data-backup-send--save-to-drive) | 🟢 Low |
| R7 | [Main vs GST Company Split & Unified View](#r7--main-vs-gst-company-split--unified-view) | 🔴 High |

---

## R1 — Invoice Generation (Enhancement to existing Invoices module)

### Current State

- Invoice model exists (`Invoice.java`, collection: `invoices`)
- CRUD API exists (`InvoiceController.java`)
- Frontend page exists (`pages/invoices/`) with form, preview, PDF download
- Fields: `invoiceNo`, `invoiceDate`, `customerName`, `customerGSTIN`, `lineItems`, `subTotal`, `CGST`, `SGST`, `grandTotal`, `amountInWords`, `status`

### Enhancements Needed

#### R1.1 — Invoice Numbering Fix

- **Current:** `generateNextInvoiceNo()` counts ALL invoices in DB, not per FY
- **Fix:** Count only invoices where `invoiceNo` starts with current FY prefix
- Add `InvoiceRepository` method: `countByInvoiceNoStartingWith(String prefix)`
- **Edge case:** If invoices are deleted, find MAX existing number + 1, not count + 1

#### R1.2 — Invoice Status Workflow

- Add status transitions: `DRAFT → SENT → PAID`, or `DRAFT → CANCELLED`
- **Backend:** Add `PATCH /api/invoices/{id}/status` endpoint
- **Frontend:** Status change dropdown/buttons on preview page
- Add **"Duplicate Invoice"** action to create copy with new number

#### R1.3 — Invoice Email / Share

- Generate PDF server-side or allow **"Send via email"** button
- For now: Download PDF (already exists) + **"Copy shareable link"** button
- *Future: Email integration (out of scope for v1)*

#### R1.4 — Recurring Invoice Templates

- Allow saving an invoice as a **"template"** for repeat customers
- New fields: `isTemplate` (Boolean), `templateName` (String)
- **"Create from Template"** button on invoice list page

#### R1.5 — Invoice Dashboard KPIs

- Total invoices this month / this FY
- Total amount billed / collected / outstanding
- Show on main dashboard or as sub-section in invoices page

---

## R2 — GST 2B Upload, Download & Send

### Current State

- `GstInward` model exists (`gst_inward` collection) — manual entry of purchase bills
- `GstOutward` model exists (`gst_outward` collection) — manual entry of sales invoices
- No file upload/download, no GST portal integration, no email sending

### Requirements

#### R2.1 — GST 2B File Upload (Inward/Purchase)

- New page section or dialog: **"Upload GST 2B"**
- Accept Excel (`.xlsx`) or CSV file from GST portal download
- Parse columns: `GSTIN`, `Invoice No`, `Invoice Date`, `Taxable Value`, `CGST`, `SGST`, `Total`, `Place of Supply`, etc.
- Map parsed rows to `GstInward` model fields
- Show **preview table** before saving (user can review, edit, deselect rows)
- **Backend:** `POST /api/gst-inward/upload` (multipart/form-data)
- Use **Apache POI** (add to `pom.xml`) or parse CSV server-side
- **Validate:** No duplicate `purchaseBillNo` for same `invoiceDate`
- Show import summary: `X rows imported, Y skipped (duplicates), Z errors`

#### R2.2 — GST 2B Download / Export

- **"Download as Excel"** button on GST Inward page
- **Backend:** `GET /api/gst-inward/export?year=25-26&month=Apr` → returns Excel (`.xlsx`) file
- Use **Apache POI** to generate Excel with proper headers matching GST portal format
- **Columns:**

  | Column |
  |--------|
  | GSTIN of Supplier |
  | Trade Name |
  | Invoice No |
  | Invoice Date |
  | Invoice Type |
  | Taxable Value |
  | CGST |
  | SGST |
  | Total |
  | Place of Supply |
  | ITC Eligible |

- Same export for GST Outward: `GET /api/gst-outward/export`

#### R2.3 — GST 2B Send (Email)

- **"Send Report"** button → opens dialog with email field, date range
- **Backend:** `POST /api/gst-inward/send-report` → generates Excel, sends as email attachment
- Use **Spring Boot Mail** (`spring-boot-starter-mail`) with SMTP config
- **Recipient:** configurable (default: `amirthamconstructions@yahoo.com`)
- **Subject:** `AMC GST 2B Report — [Month] [Year]`
- **Body:** Summary — total invoices, total taxable value, total CGST+SGST

#### R2.4 — GST Reconciliation View

- Compare GST Outward (sales) vs GST Inward (purchases) for a given period
- Show:
  - **Total Output Tax** (CGST+SGST from outward)
  - **Input Tax Credit** (from inward)
  - **Net GST Payable** = Output Tax − Input Tax Credit
- Table + summary cards on a new page or tab within GST pages

---

## R3 — Inventory Management (NEW MODULE)

### Current State

- No inventory module exists
- `Material` model tracks purchases (`billNo`, `itemName`, `qty`, `rate`, `amount`, `siteName`)
- No stock tracking, no categories, no storage location tracking

### Requirements

#### R3.1 — Inventory Model (New Entity)

**Backend:** New model `InventoryItem.java` → collection: `inventory`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated |
| `itemCode` | String | Unique, auto-generated (e.g., `INV-ELEC-001`, `INV-PLMB-001`) |
| `itemName` | String | Required |
| `category` | String | Required — one of: `Electrical`, `Plumbing`, `Civil`, `M-Sand`, `Cement`, `Painting`, `Tiles` |
| `unit` | String | `Nos`, `Kg`, `Bags`, `Sqft`, `Litre`, `Bundle`, `Truck`, `CFT` |
| `currentStock` | Double | Auto-calculated from stock movements |
| `minimumStock` | Double | Reorder alert threshold |
| `storageLocation` | String | Site name or `"Main Store"`, `"Godown"` |
| `siteName` | String | Which site the stock is currently at |
| `lastPurchaseRate` | Double | |
| `averageRate` | Double | Weighted average of all purchases |
| `isActive` | Boolean | Default `true` |
| `createdAt` | LocalDateTime | |
| `updatedAt` | LocalDateTime | |

#### R3.2 — Stock Movement Model (New Entity)

**Backend:** New model `StockMovement.java` → collection: `stock_movements`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated |
| `movementId` | String | Unique, auto-generated (e.g., `SM-20260412-001`) |
| `inventoryItemId` | String | Reference to `InventoryItem` |
| `itemName` | String | Denormalized |
| `type` | String | `IN` (purchase/return), `OUT` (issued to site), `TRANSFER` |
| `quantity` | Double | |
| `rate` | Double | Purchase rate (for IN type) |
| `amount` | Double | `quantity × rate` |
| `fromLocation` | String | Source (for transfers) |
| `toLocation` | String | Destination site |
| `siteName` | String | Related site |
| `referenceNo` | String | Bill no / material entry reference |
| `date` | LocalDate | |
| `notes` | String | |
| `createdBy` | String | |
| `createdAt` | LocalDateTime | |
| `updatedAt` | LocalDateTime | |

#### R3.3 — Inventory CRUD + API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inventory` | GET | List all items, filter by category, siteName, storageLocation |
| `/api/inventory/category/{category}` | GET | Filter by category |
| `/api/inventory/low-stock` | GET | Items where `currentStock < minimumStock` |
| `/api/inventory/{id}/movements` | GET | Stock movement history for an item |
| `/api/inventory/stock-in` | POST | Record purchase (creates StockMovement + updates currentStock) |
| `/api/inventory/stock-out` | POST | Record issue to site (creates StockMovement + updates currentStock) |
| `/api/inventory/transfer` | POST | Transfer between locations |

#### R3.4 — Inventory Frontend Page

- **New page:** `pages/inventory/`
- **Tabs:** `All Items` | `Electrical` | `Plumbing` | `Civil` | `M-Sand` | `Cement` | `Painting` | `Tiles`
- **Table columns:** Item Code, Item Name, Category, Current Stock, Unit, Location, Last Rate, Status, Actions
- **Color-coded:** 🔴 Red for low stock (below minimum), 🟢 Green for healthy
- **Quick-action buttons** per item: "Add Stock In" / "Issue to Site"
- Stock movement history dialog/panel per item
- **Route:** `/inventory` | **Nav icon:** `inventory`

#### R3.5 — Link Material Purchases to Inventory

- When a `Material` entry is created (existing model), **auto-update inventory:**
  1. Find matching `InventoryItem` by `itemName` (or create new)
  2. Create `StockMovement` (type=`IN`) with quantity, rate, siteName
  3. Update `currentStock` and `averageRate`
- This links the existing materials table to the new inventory system

---

## R4 — Material Analytics (Enhancement to existing Materials module)

### Current State

- `Material` model has: `date`, `billNo`, `itemName`, `quantity`, `rate`, `amount`, `siteName`, `shopName`
- Materials page shows flat table with search/filter
- No analytics, no rate tracking, no ROI calculation

### Requirements

#### R4.1 — Material Rate Tracking

- New page section or tab: **"Rate Analysis"**
- For each `itemName`: show rate history over time (📈 line chart)
- **Table:**

  | Item Name | Min Rate | Max Rate | Avg Rate | Last Rate | Trend |
  |-----------|----------|----------|----------|-----------|-------|
  | Cement    | ₹340     | ₹420     | ₹378     | ₹400      | ↑     |

- **Backend:** `GET /api/materials/rate-analysis` → aggregation: group by `itemName`, compute min/max/avg/latest rate

#### R4.2 — Material Usage Report

- Per site: total material cost breakdown by `itemName`
- **Backend:** `GET /api/materials/usage?siteId=xxx` → group by `itemName`, sum `amount`, sum `quantity`
- **Frontend:** bar chart + table per site

#### R4.3 — ROI & Breakeven Analysis

- Per site: compare `quotationAmount` (from `Site` model) vs total material cost
- **Breakeven:** quotation amount = material cost + labour cost (from transactions)
- **ROI** = `(quotation − total cost) / total cost × 100`
- **Backend:** `GET /api/materials/roi?siteId=xxx` → returns:
  ```json
  {
    "quotation": 1000000,
    "materialCost": 450000,
    "labourCost": 300000,
    "totalCost": 750000,
    "profit": 250000,
    "roi": 33.33
  }
  ```
- **Frontend:** summary cards + comparison chart

#### R4.4 — Price List / Master Rate Card

- Maintain a **master price list** per item (expected rate range)
- **New model:** `PriceListItem` → collection: `price_list`

  | Field | Type |
  |-------|------|
  | `itemName` | String |
  | `category` | String |
  | `expectedRate` | Double |
  | `minRate` | Double |
  | `maxRate` | Double |
  | `unit` | String |
  | `supplier` | String |
  | `updatedAt` | LocalDateTime |

- **Page:** "Price List" tab in materials page
- ⚠️ Highlight when actual purchase rate exceeds expected rate (**overpayment alert**)

#### R4.5 — All Inventory List View

- Combined view: all items across all categories
- **Columns:** Item Name, Category, Total Qty Purchased, Total Amount Spent, Avg Rate, No. of Sites Used, Last Purchase Date
- **Export as Excel:** `GET /api/materials/export`

---

## R5 — Site-wise Analytics & Export

### Current State

- `Site` model has: `siteId`, `name`, `clientName`, `company`, `quotationAmount`, `isActive`
- Dashboard shows site-wise expenses as a simple bar chart
- No detailed site drill-down, no export, no labour tracking

### Requirements

#### R5.1 — Site Detail Page

- **New page:** `pages/site-detail/` (route: `/sites/:siteId`)
- **Sections:**

  | Section | Content |
  |---------|---------|
  | **a) Site Info Card** | Name, client, quotation, dates, status |
  | **b) Financial Summary Cards** | Total Credits, Total Debits, Material Cost, Labour Cost, Profit = Credits − Debits |
  | **c) Transaction History** | Table filtered by `siteId` |
  | **d) Material Purchases** | Table filtered by `siteName` |
  | **e) Charts** | Monthly expense trend (line), Expense breakdown: Material vs Labour vs Other (pie/donut) |

#### R5.2 — Site-wise Graph Dashboard

- New section in Dashboard or separate page: **"Site Analytics"**
- **Charts:**
  - All sites: bar chart comparing total expenses
  - All sites: bar chart comparing quotation vs actual cost
  - Top 5 most profitable sites
  - Top 5 most expensive sites
- **Filters:** date range, company (Main/GST), active/inactive

#### R5.3 — Labour Tracking per Site

- Use existing `Transaction` model — filter by `nature` containing `"Labour"` or `"Labor"`
- **Backend:** `GET /api/transactions/site/{siteId}/labour`
- **Show:** date, description, party (labourer name), amount
- **Summary:** total labour cost, average daily cost, labour count

#### R5.4 — Site-wise Export with Column Selection

- **"Export"** button on site detail page and sites list page
- **Dialog** — user selects which columns to include:
  - ☑ Site Name ☑ Client ☑ Quotation ☑ Total Credits ☑ Total Debits
  - ☑ Material Cost ☑ Labour Cost ☑ Profit ☑ Status
- **Backend:** `POST /api/sites/export` (body: `{ siteIds: [...], columns: [...], format: "xlsx" }`) → returns Excel file with only selected columns
- Also allow **CSV** format option
- **Per-site export:** All transactions + materials for one site in one Excel with multiple sheets:
  - Sheet 1: Site Info
  - Sheet 2: Transactions
  - Sheet 3: Materials

#### R5.5 — All Charges View per Site

- Combined view: every charge (transaction debit) + material purchase for a site
- **Single sortable table:**

  | Date | Type | Description | Amount |
  |------|------|-------------|--------|
  | 2026-03-15 | Transaction | Labour — Raj | ₹25,000 |
  | 2026-03-18 | Material | Cement × 50 bags | ₹18,500 |

- Total at bottom
- Filter by date range and charge type

---

## R6 — Full Data Backup, Send & Save to Drive

### Current State

- Data lives in MongoDB Atlas (cloud)
- No backup/export/email functionality exists
- No Google Drive integration

### Requirements

#### R6.1 — Database Export (All Collections)

- **New page:** `pages/backup/` (route: `/backup`, admin-only via `roleGuard`)
- **"Export Full Backup"** button
- **Backend:** `GET /api/backup/export`
  - Exports ALL collections as a single JSON file (or ZIP with per-collection JSONs)
  - Collections: `transactions`, `sites`, `materials`, `gst_outward`, `gst_inward`, `balance_sheet`, `profit_loss`, `invoices`, `inventory`, `stock_movements`, `dimensions`, `users`
- Response: downloadable `.json` or `.zip` file
- Include metadata: `exportDate`, `recordCounts` per collection, `version`

#### R6.2 — Scheduled Auto-Backup

- Spring Boot `@Scheduled` task — runs weekly (configurable via `application.properties`)
- Exports all collections to JSON
- Stores locally in `/backups/` directory with timestamp filename
- Config: `app.backup.schedule=0 0 2 ? * SUN` (every Sunday at 2 AM)
- Keep last N backups (configurable, default: 12)

#### R6.3 — Email Backup

- **"Send Backup via Email"** button on backup page
- **Backend:** `POST /api/backup/send-email`
  - Generates ZIP of all collections, emails as attachment
- **Recipient:** configurable (default: `amirthamconstructions@yahoo.com`)
- **Subject:** `AMC Business Backup — [Date]`
- **Attachment:** `amc_backup_2026-04-12.zip`
- ⚠️ Email attachment size limit ~25MB; if backup exceeds, split or use link

#### R6.4 — Google Drive Integration

- **"Save to Google Drive"** button
- Use **Google Drive API v3** (OAuth2 service account or user consent flow)
- **Backend:** `POST /api/backup/save-to-drive`
- Upload the backup ZIP to a specific Google Drive folder
- **Config in `application.properties`:**
  ```properties
  app.google.drive.folder-id=<FOLDER_ID>
  app.google.credentials-path=<PATH_TO_SERVICE_ACCOUNT_JSON>
  ```
- Show last backup date and Drive link on backup page
- ⚠️ Requires Google Cloud project setup, service account, and Drive API enabled. Document setup steps separately.

#### R6.5 — Data Import / Restore

- **"Import Backup"** button (admin-only)
- Upload a previously exported JSON/ZIP
- **Preview:** show record counts per collection before importing
- **Options:** `"Merge with existing"` or `"Replace all (destructive)"`
- **Backend:** `POST /api/backup/import` (multipart/form-data)

---

## R7 — Main vs GST Company Split & Unified View

### Current State

- `Transaction` model has `company` field: `"Main"` or `"GST"`
- `Site` model has `company` field: `"Main"` or `"GST"`
- Balance Sheet and P&L have company-based tabs (Main / GST)
- Dashboard aggregates ALL transactions without company split
- No unified "whole company" view that shows combined + split

### Requirements

#### R7.1 — Company Toggle (Global Filter)

- Add a **global company selector** in the toolbar/layout: `[All] [Main] [GST]`
- Selecting a company filters **ALL pages** (dashboard, transactions, sites, etc.)
- Store selection in `localStorage` or a service signal
- **Backend:** All list endpoints already support `?company=Main` or `?company=GST`
- **Frontend:** Pass selected company to every `service.getAll()` call
- `"All"` shows combined data (no filter)

#### R7.2 — Dashboard Company Split

- Dashboard KPI cards: show combined values by default
- Below each KPI card, show mini split: `Main: ₹X | GST: ₹Y`
- Or toggle: click KPI card to see Main vs GST breakdown
- **Charts:** add company as series — two bars per month (Main 🔵, GST 🟠)

#### R7.3 — Transactions Split View

- Add tabs or toggle at top of transactions page: `[All] [Main] [GST]`
- **Summary cards above table:**
  ```
  Main: Credits ₹X  |  Debits ₹Y  |  Net ₹Z
  GST:  Credits ₹X  |  Debits ₹Y  |  Net ₹Z
  ```
- Already supported by backend: `GET /api/transactions/company/{company}`

#### R7.4 — P&L and Balance Sheet — Combined View

- **Currently:** separate tabs (Main / GST)
- Add **third tab:** `"Combined"` — merges both datasets
- **P&L Combined:** total income = Main income + GST income, same for expense
- **Balance Sheet Combined:** merge rows, sum amounts

#### R7.5 — Company-wise Reports

- New page or section: **"Company Reports"**
- Side-by-side comparison:

  | Metric | Main | GST | Combined |
  |--------|------|-----|----------|
  | Total Revenue | ₹X | ₹Y | ₹X+Y |
  | Total Expense | ₹X | ₹Y | ₹X+Y |
  | Net Profit | ₹X | ₹Y | ₹X+Y |
  | Sites Count | N | M | N+M |
  | Active Sites | N | M | N+M |

- **Backend:** `GET /api/dashboard/company-comparison`
- Exportable as PDF/Excel

---

## Implementation Priority

| Priority | Requirements | Reason |
|----------|-------------|--------|
| 🔴 **High — Core Business** | R1 Invoice Enhancements, R7 Main vs GST Split, R5 Site Analytics | Critical for daily operations and reporting |
| 🟡 **Medium — Operations** | R3 Inventory Management, R4 Material Analytics, R2 GST 2B | Improves efficiency and compliance |
| 🟢 **Low — Admin/Infra** | R6 Full Data Backup & Drive | Important but not blocking daily work |

---

## Dependencies to Add

### Backend (`pom.xml`)

```xml
<!-- Apache POI — Excel read/write for GST upload/export -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.3</version>
</dependency>

<!-- Spring Mail — for email sending -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Google Drive API — for backup to Drive (R6.4) -->
<dependency>
    <groupId>com.google.api-client</groupId>
    <artifactId>google-api-client</artifactId>
    <version>2.2.0</version>
</dependency>
<dependency>
    <groupId>com.google.apis</groupId>
    <artifactId>google-api-services-drive</artifactId>
    <version>v3-rev20230822-2.0.0</version>
</dependency>
```

### Frontend (`npm`)

| Package | Purpose |
|---------|---------|
| `xlsx` | Excel parsing for GST 2B upload (client-side preview) |
| `file-saver` | Blob download helper for exports |
| `chart.js` | Charts for site analytics, rate trends, dashboards |
| `ng2-charts` | Angular wrapper for chart.js |

---

## New Collections (MongoDB)

| Collection | Requirement | Model |
|------------|-------------|-------|
| `inventory` | R3.1 | `InventoryItem` |
| `stock_movements` | R3.2 | `StockMovement` |
| `price_list` | R4.4 | `PriceListItem` |
| `backups_log` | R6.2 | Backup metadata/history |

---

## New Pages (Frontend Routes)

| Route | Requirement | Description |
|-------|-------------|-------------|
| `/inventory` | R3.4 | Inventory Management |
| `/sites/:siteId` | R5.1 | Site Detail Page |
| `/site-analytics` | R5.2 | Site-wise Graph Dashboard |
| `/backup` | R6.1 | Backup & Restore (admin-only) |
| `/company-reports` | R7.5 | Company-wise Reports |
