# AMC Business Management System

## 📋 Overview

**AMC Business Management** is a full-featured, web-based accounting and business management system built for **Amirtham Constructions (AC)**. It is implemented entirely on the **Google Apps Script** platform, using **Google Sheets** as the backend database and **Google Apps Script HTML Service** as the frontend framework.

The application provides a complete suite of financial management tools including transaction tracking, balance sheets, profit & loss reporting, GST compliance (GST-1R Outward & GST-2B Inward), site/project management, and materials inventory — all accessible through a responsive, single-page-application-style web interface deployed as a Google Web App.

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, jQuery, Select2, ApexCharts |
| **Backend** | Google Apps Script (server-side `.gs` files) |
| **Database** | Google Sheets (with Named Ranges) |
| **Deployment** | Google Apps Script Web App (`doGet()`) |
| **PDF Generation** | `HtmlService` → Blob → Google Drive |
| **Fonts** | Google Fonts (Poppins, Roboto, Montserrat) |
| **Icons** | Font Awesome 6.x |

### Design Pattern

The application follows a **client-server architecture** within the Google Apps Script ecosystem:

```
┌──────────────────────────────────────────────────────────────────┐
│                         Web Browser                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  template.html (Shell / Layout)                            │  │
│  │  ┌──────────┐  ┌───────────────────────────────────────┐   │  │
│  │  │ Sidebar  │  │  Content Area (SPA-style page load)   │   │  │
│  │  │ Nav Menu │  │  ┌─────────────────────────────────┐  │   │  │
│  │  │          │  │  │ index.html / transactions.html  │  │   │  │
│  │  │          │  │  │ balance_sheet.html / pnl.html   │  │   │  │
│  │  │          │  │  │ sites.html / materials.html     │  │   │  │
│  │  │          │  │  │ gst_*.html                      │  │   │  │
│  │  │          │  │  └─────────────────────────────────┘  │   │  │
│  │  └──────────┘  └───────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                   google.script.run.*()                           │
│                              │                                   │
├──────────────────────────────┼───────────────────────────────────┤
│              Google Apps Script Server                            │
│  ┌─────────────┐ ┌──────────────────┐ ┌──────────────────────┐  │
│  │ gstemplate   │ │ gstransactions   │ │ gsdashboard          │  │
│  │ gsbalance_*  │ │ gssites          │ │ gsmaterials          │  │
│  │ gspnl        │ │ gsgst2b          │ │ gsgst1r_outward      │  │
│  │ gsgstbalance │ │ gsgstnl          │ │ gssample             │  │
│  └──────┬──────┘ └────────┬─────────┘ └──────────┬───────────┘  │
│         │                 │                       │              │
│         └─────────────────┼───────────────────────┘              │
│                           │                                      │
│                   SpreadsheetApp API                              │
│                           │                                      │
│              ┌────────────┴────────────┐                         │
│              │   Google Sheets (DB)     │                         │
│              │   Named Ranges           │                         │
│              └─────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

### Routing & Page Loading

The `doGet(e)` function in `gstemplate.gs` serves as the **router**. It reads the `?page=` query parameter and dynamically includes the corresponding HTML template inside the `template.html` shell layout using `HtmlService.createTemplateFromFile()` and the `include()` helper:

```
URL: ?page=dashboard     → includes index.html
URL: ?page=transactions  → includes transactions.html
URL: ?page=balance_sheet → includes balance_sheet.html
URL: ?page=profit_loss   → includes pnl.html
URL: ?page=sites         → includes sites.html
URL: ?page=materials     → includes materials.html
URL: ?page=gst_balancesheet → includes gst_balancesheet.html
URL: ?page=gst_profit_loss  → includes gst_profit_loss.html
URL: ?page=gst1r_outward    → includes gst1r_outward.html
URL: ?page=gst_2b           → includes gst_2b.html
```

---

## 📁 File Structure & Detailed Descriptions

### Core Infrastructure Files

#### `gstemplate.gs` — Application Router & Entry Point
- **`doGet(e)`**: Main entry point for the Google Web App. Reads the `page` query parameter and maps it to the corresponding HTML template file. Defaults to `'dashboard'` (index.html).
- **`include(filename)`**: Helper function that enables server-side HTML includes via `HtmlService.createHtmlOutputFromFile()`.
- **`getScriptUrl()`**: Returns the deployed script URL using `ScriptApp.getService().getUrl()`, used for generating navigation links.

#### `template.html` — Master Layout / Shell
- The outer HTML shell that wraps all pages.
- Contains the **sidebar navigation** with links to all 10 modules (Dashboard, Transactions, Balance Sheet, Profit/Loss, Sites, GST Balance Sheet, GST Profit/Loss, GST-1R Outward, GST-2B, Materials).
- Uses **Google Apps Script templating** (`<?= ?>` and `<?!= ?>`) to dynamically inject the content page and highlight the active navigation item.
- Implements a **responsive hamburger menu** for mobile screens (< 992px).
- **CSS Variables**: `--sidebar-width: 260px`, `--teal: #dca612`, `--aqua: #f0d795`, `--dark: #23272b`.
- Sidebar brand: **"Amirtham Constructions – Accounts System"** with logo abbreviation "AC".

---

### Module Files (Backend `.gs` + Frontend `.html` Pairs)

---

### 1. Dashboard Module

#### `gsdashboard.gs` — Dashboard Data Aggregation
- **`dashGetNamedRangeData(rangeName)`**: Generic helper that reads a Named Range from the spreadsheet, extracts headers from the first row, and returns an array of objects keyed by header names.
- **`dashGetDashboardData()`**: Main function that aggregates all dashboard data into a single JSON response:
  - **KPIs** (from `Dashboard` sheet, cells I3–I7): Revenue, Expenditure, Total Profit, Company Expenses, Net Profit.
  - **Chart 1 – Company Profit Growth**: Reads Named Range `DASHCUMPROFIT`, parses dates and cumulative profit values, sorts chronologically, returns ISO date strings + values.
  - **Chart 2 – Profit Percentage by Site**: Reads Named Range `DASHSITEWISE`, extracts site names and profit percentages (with automatic decimal-to-percentage conversion).
  - **Chart 3 – Headwise Expenditure**: Reads Named Range `DASHHEADWISE`, extracts expenditure heads and amounts (filters out zero/empty amounts).

#### `index.html` — Dashboard UI
- **KPI Cards**: 7-column grid layout displaying 5 KPI values (Revenue, Expenditure, Total Profit, Company Expenses, Net Profit) with 2 empty placeholder cards.
- **Chart 1** (ApexCharts Area Chart): Smooth area chart with green fill showing cumulative profit growth over time with datetime x-axis.
- **Chart 2** (ApexCharts Bar Chart): Distributed vertical bar chart showing profit percentage per site. Dynamically calculates chart width based on number of sites (70px per bar, minimum 600px). Includes data labels.
- **Chart 3** (ApexCharts Horizontal Bar Chart): Horizontal bar chart showing head-wise expenditure breakdown. Height scales dynamically (45px per category, minimum 400px). External data labels offset 10px right.
- **Layout**: 60/40 column split — Column 1 has Chart 1 + Chart 2, Column 2 has Chart 3.
- **Responsive**: Stacks columns vertically on mobile, minimum chart width of 600px with horizontal scroll.

---

### 2. Transactions Module

#### `gstransactions.gs` — Transaction CRUD & Server-Side Pagination
- **Dimension Helpers**:
  - `sup_getDimensions()`: Reads the `Dimensions` sheet to get dropdown values (Site Names, Income Heads, Expense Heads, etc.) organized by column.
  - `sup_addDimensionValue(colName, value)`: Appends a new dimension value to a specific column.
  - `sup_generateUniqueSiteId()`: Generates unique Site IDs in format `AC` + 5 random digits.
  - `sup_addSite(siteObj)`: Adds a new site to the Dimensions sheet.
- **Transaction CRUD**:
  - `sup_addTransaction(txObj)`: Adds a new transaction with server-generated Transaction ID (format: `TXN` + `yyMMddHHmmss`). Finds the next empty row by scanning Column A.
  - `sup_updateTransactionById(transactionId, updatedObj)`: Updates a transaction row identified by Transaction ID. Preserves Column A (S.No) and updates from Column B onwards.
  - `sup_deleteTransactionById(transactionId)`: Deletes a transaction row by Transaction ID.
- **Server-Side Filtering & Pagination**:
  - `sup_getFilteredData_(params)`: Internal helper that reads all transactions, applies date filters (preset: 1m/6m/1y or custom range) and search filters (by specific column or all columns).
  - `sup_getTransactionsPaginated(params)`: Wraps filtering with pagination logic (configurable `perPage`, defaults to 25). Returns `{ rows, total, pages, page }`.
- **PDF Export**:
  - `sup_exportTransactionsPdf(params, meta)`: Generates a filtered PDF report with 15 columns, saves to Google Drive, returns a shareable view URL.

#### `transactions.html` — Transactions UI
- **Features**: Full CRUD with inline editing, server-side pagination (25 per page), search (by All, Site Name, Nature/Head, Type D/C), date filtering (1m/6m/1y/custom), PDF export.
- **"New Transaction" Modal**: 15-field form with Select2 dropdowns for Site Name and Nature (Head). Nature options dynamically change based on Type (Credit → Income Heads, Debit → Expense Heads).
- **Bulk Entry Workflow**: After saving, the modal stays open with Amount and Nature cleared for rapid entry.
- **Income/Expense Head Modals**: Quick-add modals for creating new dimension values.
- **Table**: Scrollable table (min-width 1600px) with inline edit and delete actions per row.

---

### 3. Balance Sheet Module

#### `gsbalance_sheet.gs` — Balance Sheet CRUD (Main Company)
- **Named Range**: `RANGEBALANCESHEET`
- **`sup_getRangeValsByName(name)`**: Reusable helper returning range metadata (range object, values, sheet reference, row, column).
- **`sup_getBalanceSheet1()`**: Returns balance sheet rows as objects with `__row` property (absolute sheet row number for updates/deletes). Formats dates as `dd-MMM-yyyy`.
- **`sup_addBalanceAsset1(obj)`**: Appends a new asset row mapped to sheet headers.
- **`sup_updateBalanceByRow1(sheetRow, updatedObj)`**: Updates a specific row by absolute sheet row number. Validates row falls within named range.
- **`sup_deleteBalanceByRow1(sheetRow)`**: Deletes a row by absolute sheet row number.
- **`sup_exportBalancePdf1(rows, meta)`**: Generates PDF with columns: S.No, Liability (Credit), Liability Amount, Asset (Debit), Asset Amount. Saves to Drive and returns URL.

#### `balance_sheet.html` — Balance Sheet UI (Main Company)
- **Summary Bar**: Displays "Balance Sheet As on [date]" with Total Liability and Total Asset KPIs.
- **Table**: 6-column table (S.No, Liability Credit, Liability Amount, Asset Debit, Asset Amount, Action).
- **New Asset Modal**: Add new asset category with amount.
- **Inline Editing**: Edit Asset (Debit) and Asset Amount columns inline. Liability columns are read-only.
- **Delete Confirmation Modal**: Two-step delete with confirmation dialog.
- **Client-Side Filtering**: Search by All, Liability, or Asset. Date presets (1m/6m/1y/custom).
- **PDF Export**: Exports filtered data to PDF via server.

---

### 4. GST Balance Sheet Module

#### `gsgstbalance_sheet.gs` — Balance Sheet CRUD (GST Company)
- **Named Range**: `RANGEGSTBALANCESHEET`
- Identical structure to `gsbalance_sheet.gs` but operates on the GST company's data.
- Functions: `sup_getBalanceSheet()`, `sup_addBalanceAsset()`, `sup_updateBalanceByRow()`, `sup_deleteBalanceByRow()`, `sup_exportBalancePdf()`.

#### `gst_balancesheet.html` — GST Balance Sheet UI
- Identical layout and functionality to `balance_sheet.html` but calls the GST-specific server functions.

---

### 5. Profit & Loss Module

#### `gspnl.gs` — P&L Data Reader (Main Company)
- **Named Range**: `RANGEPROFITLOSS`
- **`sup_pnl_getData1()`**: Reads P&L data, formats dates, handles zero/empty amounts by converting them to empty strings for clean UI display.
- **`sup_pnl_exportPdf1(rows, meta)`**: Generates PDF with columns: Date, Income, Income Amount, Expense, Expense Amount. Includes summary totals header.

#### `pnl.html` — Profit & Loss UI (Main Company)
- **Summary Card**: Shows period label, Total Income, Total Expense, and Net Profit.
- **Table**: 5-column layout (Date, Income, Income Amount, Expense, Expense Amount).
- **Filters**: Search by All/Income/Expense, date presets (All/1m/6m/Custom).
- **PDF Export**: Exports filtered view with summary totals.

---

### 6. GST Profit & Loss Module

#### `gsgstnl.gs` — P&L Data Reader (GST Company)
- **Named Range**: `RANGEGSTPROFITLOSS`
- Functions: `sup_pnl_getData()`, `sup_pnl_exportPdf()`.
- Identical logic to `gspnl.gs` but reads from the GST company's named range.

#### `gst_profit_loss.html` — GST P&L UI
- Identical layout and functionality to `pnl.html` but calls GST-specific server functions.

---

### 7. Sites Module

#### `gssites.gs` — Sites CRUD & Transaction Integration
- **`sup_site_getSites()`**: Reads all sites from the `Sites` sheet, returns headers + rows with formatted dates.
- **`sup_site_generateUniqueId()`**: Generates unique Site IDs (`AC` + 5 random digits), checks for collisions against existing IDs (up to 2000 attempts).
- **`sup_site_addSite(siteObj)`**: Adds a new site. Finds the next empty row by scanning Column B (to avoid ArrayFormula conflicts in Column A).
- **`sup_site_updateSite(originalId, updatedObj)`**: Updates a site row identified by Site ID.
- **`sup_site_deleteSite(siteId, siteName)`**: Validates against Transactions sheet before deletion — **prevents deletion if transactions exist for the site**. Returns error message "There are Transactions in this site" if blocked.
- **`sup_site_getTransactionsForSite(siteName)`**: Fetches all transactions for a specific site (for drill-down popup).

#### `sites.html` — Sites UI
- **Features**: Site table with CRUD, search, pagination, and a site detail drill-down modal showing related transactions.
- **Site Links**: Site names are clickable, opening a detail modal with filtered transactions for that site.
- **Delete Protection**: Cannot delete a site that has existing transactions.

---

### 8. Materials Module

#### `gsmaterials.gs` — Materials CRUD (Simple)
- **`sup_getMaterials()`**: Reads all materials from `Materials` sheet using `getDataRange()`.
- **`sup_getSiteList()`**: Reads site names from `Sites` sheet for the site dropdown.
- **`sup_addMaterial(obj)`**: Appends new material row with auto-incremented S.No.
- **`sup_updateMaterial(rowIndex, obj)`**: Updates columns B–J for a given row.
- **`sup_deleteMaterial(rowIndex)`**: Deletes a material row by sheet index.

#### `gssample.gs` — Materials CRUD (Advanced/Alternative)
- More robust version with additional features:
- **`sup_mat_getMaterials()`**: Returns `{ headers, rows }` with full header information.
- **`sup_mat_addMaterial(siteObj)`**: Finds next empty row by scanning a data column. Skips `S.No` column (handled by ArrayFormula). Converts `YYYY-MM-DD` date strings to Date objects.
- **`sup_mat_updateMaterial(originalSNo, updatedObj)`**: Updates by S.No lookup.
- **`sup_mat_deleteMaterial(sno)`**: Deletes by S.No lookup.
- **`sup_mat_export(rows, type)`**: Exports materials to **CSV** (as Drive file) or **Excel** (creates a new Google Spreadsheet).

#### `materials.html` — Materials UI
- **Features**: Material table with CRUD, search (by Item Name, Site, Shop Name), inline editing, pagination.
- **New Material Modal**: 9-field form (Date, Bill No, Item Name, Quantity, Rate, Amount, Site, Shop Name, Notes) with site datalist.
- **Export**: CSV and Excel export buttons.

---

### 9. GST-1R Outward Module

#### `gsgst1r_outward` — GST-1R Outward CRUD
- **Named Range**: `RANGEGST1OUTWARD`
- **`sup_gst1r_getData()`**: Advanced data reader with:
  - **Unicode normalization** (`NFKC`) for header matching.
  - **Canonical key mapping**: Maps 17 expected canonical keys (Year, Invoice Month, Filing Month, Invoice No, Invoice Date, Customer Name, Customer GSTIN, Description, Taxable Value, CGST %, CGST Amt, SGST %, SGST Amt, Invoice Value, Place of Supply, Input Credit Eligible, Remarks) to actual sheet headers using normalized string matching.
  - **Fallback partial matching**: Uses keyword scoring for fuzzy header matching.
  - Both `getValues()` and `getDisplayValues()` are used for robust data extraction.
- **`sup_gst1r_addInvoice(payload)`**: Appends new invoice row with canonical-to-sheet-header mapping. Detects last non-empty row via Invoice No column (Column D).
- **`sup_gst1r_updateRow(sheetRowNumber, updates)`**: Updates specific cells by column map (D=4 through Q=17) to protect ArrayFormulas.
- **`sup_gst1r_deleteRow(sheetRowNumber)`**: Deletes row with bounds checking.
- **`sup_gst1r_exportPdf(rows, meta)`**: Generates GST-1 Outward PDF report with 8 key columns.

#### `gst1r_outward.html` — GST-1R Outward UI
- **Summary Card**: Displays period and totals (Taxable Value, CGST, SGST, Invoice Value).
- **Table**: Scrollable table with all 17 GST fields, inline edit, and delete.
- **Filters**: Search, date presets (1m/6m/1y/custom), PDF export.

---

### 10. GST-2B Inward Module

#### `gsgst2b.gs` — GST-2B Inward CRUD
- **Named Range**: `RANGEGSTR2B`
- **`sup_gst2b_getData()`**: Same robust canonical key mapping as GST-1R module. Maps 8 canonical keys (Taxable Value, CGST Amt, SGST Amt, Purchase Bill Value, Invoice Date, Purchase Bill No, Company Name, Description).
- **`sup_gst2b_updateRow(sheetRowNumber, updates)`**: Updates only Column G (Description) and Column P (Input Credit Eligible) to protect ArrayFormulas in other columns.
- **`sup_gst2b_deleteRow(sheetRowNumber)`**: Deletes row with bounds validation.
- **`sup_gst2b_exportPdf(rows, meta)`**: Generates GST-2B PDF report with 8 columns and summary totals.

#### `gst_2b.html` — GST-2B Inward UI
- **Summary Card**: Period, Taxable Value, CGST, SGST, Purchase Bill Value totals.
- **Table**: Full GST-2B data table with inline editing (restricted to Description and Input Credit fields), delete.
- **Tabs**: Tab-based view switching.
- **Filters**: Search (by Company Name or All), date presets, PDF export.

---

## 📊 Google Sheets Structure (Named Ranges)

The application relies heavily on **Named Ranges** in the Google Sheet for data access:

| Named Range | Used By | Description |
|---|---|---|
| `DASHCUMPROFIT` | Dashboard | Cumulative profit data (Date, Cumulative Profit) |
| `DASHSITEWISE` | Dashboard | Site-wise profit percentages (Site Name, Profit Percentage) |
| `DASHHEADWISE` | Dashboard | Head-wise expenditure (Nature/Head, SUM of Amount) |
| `RANGEBALANCESHEET` | Balance Sheet (Main) | Balance sheet data (S.No, Liability, Liability Amount, Asset, Asset Amount) |
| `RANGEGSTBALANCESHEET` | Balance Sheet (GST) | GST balance sheet data |
| `RANGEPROFITLOSS` | P&L (Main) | Profit/Loss data (Date, Income, Income Amount, Expense, Expense Amount) |
| `RANGEGSTPROFITLOSS` | P&L (GST) | GST Profit/Loss data |
| `RANGEGST1OUTWARD` | GST-1R Outward | Outward supply invoices (17 columns) |
| `RANGEGSTR2B` | GST-2B Inward | Inward supply data (purchase bills) |

### Sheet Names

| Sheet Name | Purpose |
|---|---|
| `Dashboard` | KPI values in cells I3–I7 |
| `Transactions` | All financial transactions |
| `Dimensions` | Dropdown values (Site ID, Site Name, Income Head, Expense Head, etc.) |
| `Sites` | Site/project master data |
| `Materials` | Materials inventory records |
| `GST-2B Inward` | GST-2B inward supply sheet |

---

## 🎨 UI/UX Design

### Design System
- **Primary Color**: `#dca612` (Gold/Teal — used for buttons, active states, accents)
- **Secondary Color**: `#f0d795` / `#fae5aa` (Light aqua — hover states, stat backgrounds)
- **Dark Text**: `#23272b` / `#021640` (Dashboard)
- **Muted Text**: `#8a8f98`
- **Background**: `#f7fafb` / `#f5f7fa`
- **Cards**: White with `box-shadow: 0 2px 6px rgba(0,0,0,0.1)` or `0 6px 18px rgba(8,14,18,0.04)`

### Common UI Components
All modules share a consistent design language:
- **Processing Overlay**: Full-screen spinner overlay during server calls
- **Modal Dialogs**: Centered modals with backdrop overlay for forms and confirmations
- **Inline Editing**: Table rows switch to edit mode with input fields; save/cancel buttons replace action icons
- **Pagination**: Top and bottom pagination with Prev/Next buttons and page indicators
- **Search**: Criteria dropdown + search input + Search/Clear buttons
- **Date Filters**: Preset selector (All/1m/6m/1y/Custom) with optional date range inputs
- **Export PDF**: Server-side PDF generation saved to Google Drive

### Responsive Design
- **Breakpoint**: 992px (sidebar), 768px and 600px (content)
- **Mobile**: Sidebar collapses into hamburger menu; tables get horizontal scroll; form grids collapse to single column; stat rows stack vertically

---

## 🔧 Function Naming Conventions

| Prefix | Scope | Example |
|---|---|---|
| `sup_` | Generic server-side helper | `sup_getSheetByName_()` |
| `sup_site_` | Sites module server functions | `sup_site_getSites()` |
| `sup_mat_` | Materials module (advanced) | `sup_mat_getMaterials()` |
| `sup_pnl_` | P&L module | `sup_pnl_getData()` |
| `sup_gst1r_` | GST-1R Outward module | `sup_gst1r_getData()` |
| `sup_gst2b_` | GST-2B Inward module | `sup_gst2b_getData()` |
| `dash` / `dashFmt*` | Dashboard client-side | `dashGetDashboardData()`, `dashFmtCurrency()` |
| `supShow*` / `supHide*` | Client-side UI helpers | `supShowProcessing()`, `supHideModal()` |

---

## 🔄 Data Flow (Typical CRUD Operation)

```
1. User clicks "New Transaction" → supOpenNewTx() → Modal opens
2. User fills form → clicks "Save" → supSaveTransaction()
3. Client validates fields → Constructs txObj
4. google.script.run.sup_addTransaction(txObj) → Server call
5. Server generates Transaction ID (TXNyyMMddHHmmss)
6. Server finds next empty row in Transactions sheet
7. Server writes row → returns { status: 'ok' }
8. Client shows success alert → Resets Amount/Nature fields (bulk entry mode)
9. On modal close → supLoadTransactions() → Server-side filter & paginate
10. Client renders updated table
```

---

## 🔐 Security & Deployment Notes

- Deployed as a Google Apps Script Web App
- Access control managed through Google Apps Script deployment settings (Execute as: owner/user, Access: specific users/anyone)
- Uses `HtmlService.XFrameOptionsMode.ALLOWALL` for iframe embedding
- No external backend or database — all data lives in Google Sheets
- PDF exports are saved to the script owner's Google Drive

---

## 📦 External Dependencies (CDN)

| Library | Version | Purpose |
|---|---|---|
| [jQuery](https://jquery.com/) | 3.7.1 | DOM manipulation, Select2 dependency |
| [Select2](https://select2.org/) | 4.0.13 | Enhanced dropdown/searchable select boxes |
| [ApexCharts](https://apexcharts.com/) | Latest | Dashboard charts (Area, Bar, Horizontal Bar) |
| [Font Awesome](https://fontawesome.com/) | 6.x | Icons throughout the application |
| [Google Fonts](https://fonts.google.com/) | — | Poppins, Roboto, Montserrat typefaces |

---

## 🚀 Deployment Instructions

1. **Create a Google Sheet** with the required sheet names and named ranges listed above.
2. **Open Apps Script** from the Google Sheet (Extensions → Apps Script).
3. **Create all `.gs` files** in the Apps Script editor with the corresponding code.
4. **Create all `.html` files** in the Apps Script editor.
5. **Deploy as Web App**:
   - Click Deploy → New Deployment
   - Select "Web app"
   - Set "Execute as" to your account
   - Set "Who has access" as needed
   - Click Deploy
6. **Access the app** via the generated Web App URL.

---

## 📝 Notes

- The application uses **two parallel sets** of Balance Sheet and P&L modules — one for the **Main** company and one for the **GST** company, allowing dual-entity accounting.
- `gssample.gs` and `gsmaterials.gs` are two implementations of the materials module (advanced and simple respectively). The active one depends on which functions the HTML calls.
- The GST modules (1R Outward and 2B Inward) include sophisticated **Unicode normalization** and **fuzzy header matching** to handle special characters (₹, %, non-breaking spaces) in sheet headers.
- Transaction IDs are generated server-side (`TXN` + timestamp) to prevent client-side collisions.
- The delete protection in the Sites module checks the Transactions sheet before allowing site deletion.

---

## 📄 License

This is a proprietary internal application built for Amirtham Constructions. All rights reserved.
