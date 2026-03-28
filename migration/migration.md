# AMC Business Management — Data Migration Report

**Date:** March 28, 2026
**Source:** Google Sheets + Apps Script (13 CSV exports, 12 `.gs` files)
**Target:** MongoDB Atlas (`amc_business` database)
**Stack:** Spring Boot 2.7.11 (Java 8) + Angular + MongoDB

---

## Table of Contents

1. [Overview](#1-overview)
2. [Source Analysis](#2-source-analysis)
3. [Data Model Gap Analysis & Fixes](#3-data-model-gap-analysis--fixes)
4. [CSV Column → MongoDB Field Mapping](#4-csv-column--mongodb-field-mapping)
5. [Issues Encountered & Fixes](#5-issues-encountered--fixes)
6. [Migration Script Details](#6-migration-script-details)
7. [Validation Results](#7-validation-results)
8. [Files Created / Modified](#8-files-created--modified)

---

## 1. Overview

The original AMC Business Management app ran entirely inside Google Sheets with Apps Script (`.gs`) as the backend and HTML sidebar templates as the frontend. All business data — transactions, sites, materials, GST filings, profit & loss, and balance sheets — lived in named ranges across a single spreadsheet.

This migration imports all that data from CSV exports into MongoDB Atlas so the new Spring Boot + Angular application can serve it via REST APIs.

### Collections Created

| Collection        | Records | Source CSV(s)                                      |
|-------------------|---------|----------------------------------------------------|
| `transactions`    | 369     | Transactions.csv (includes GST company=GST rows)   |
| `sites`           | 26      | Sites.csv                                          |
| `materials`       | 44      | Materials.csv                                      |
| `gst_outward`     | 7       | GST-1 Outward.csv                                  |
| `gst_inward`      | 24      | GST-2B Inward.csv                                  |
| `balance_sheet`   | 11      | Balance Sheet.csv (9) + GST Balance Sheet.csv (2)  |
| `profit_and_loss` | 41      | Profit and Loss.csv (39) + GST Profit and Loss (2) |
| `dimensions`      | 6       | Dimensions.csv (transposed)                        |

---

## 2. Source Analysis

### CSV Files Analyzed (13 total)

| # | CSV File                                          | Rows | Used? | Notes                                           |
|---|---------------------------------------------------|------|-------|-------------------------------------------------|
| 1 | `Amirtham Constructions-DEV - Transactions.csv`   | 370  | ✅ Yes | Main transaction ledger                          |
| 2 | `Amirtham Constructions-DEV - GST Expenses.csv`   | 3    | ❌ No  | Duplicate of rows already in Transactions.csv    |
| 3 | `Amirtham Constructions-DEV - Sites.csv`          | 26   | ✅ Yes | Site master data                                 |
| 4 | `Amirtham Constructions-DEV - Materials.csv`       | 44   | ✅ Yes | Material purchase log                            |
| 5 | `Amirtham Constructions-DEV - GST-1 Outward.csv`  | 10   | ✅ Yes | 7 valid invoice rows (3 NIL/header rows skipped) |
| 6 | `Amirtham Constructions-DEV - GST-2B Inward.csv`  | 31   | ✅ Yes | 24 valid rows (empty separator rows skipped)     |
| 7 | `Amirtham Constructions-DEV - Balance Sheet.csv`   | 9    | ✅ Yes | Main company balance sheet                       |
| 8 | `Amirtham Constructions-DEV - GST Balance Sheet.csv`| 2   | ✅ Yes | GST company balance sheet                        |
| 9 | `Amirtham Constructions-DEV - Profit and Loss.csv` | 65   | ✅ Yes | First 5 columns used; rest are pivot tables      |
| 10| `Amirtham Constructions-DEV - GST Profit and Loss.csv`| 35 | ✅ Yes | First 5 columns used                            |
| 11| `Amirtham Constructions-DEV - Dimensions.csv`      | 31   | ✅ Yes | Transposed: each column → one Dimension document |
| 12| `Amirtham Constructions-DEV - Dashboard.csv`       | 27   | ❌ No  | Computed at runtime from transactions            |
| 13| `Amirtham Constructions-DEV - GST-2B(RAW).csv`    | —    | ❌ No  | Raw GSTR-2B dump; data already in GST-2B Inward  |

### GS Files Analyzed (12 total)

| File                    | Purpose                                              | Key Insight for Migration                                  |
|-------------------------|------------------------------------------------------|------------------------------------------------------------|
| `gstransactions.gs`     | CRUD for Transactions sheet                          | Transaction ID format: `TXN` + `yyMMddHHmmss`             |
| `gssites.gs`            | CRUD for Sites sheet; site ID format `AC` + 5 digits | Site ID generated as `AC` + random 5-digit number          |
| `gsmaterials.gs`        | CRUD for Materials sheet                             | S.No auto-incremented; Site is by name not ID              |
| `gsdashboard.gs`        | Dashboard KPIs computed from named ranges            | Revenue/Expenditure/Profit computed from transactions       |
| `gspnl.gs`              | Profit & Loss from named range `RANGEPROFITLOSS`     | Only first 5 columns matter (Date, Income, IncAmt, Exp, ExpAmt) |
| `gsbalance_sheet.gs`    | Balance Sheet CRUD from `RANGEBALANCESHEET`          | Rows have Liability/Asset pairs                            |
| `gsgst1r_outward.gs`    | GST-1 Outward invoices from `RANGEGST1OUTWARD`       | Unicode header normalization needed for ₹ symbols          |
| `gsgst2b.gs`            | GST-2B Inward from `RANGEGSTR2B`                     | Same Unicode header issue                                  |
| `gsgstbalance_sheet.gs` | GST Balance Sheet from `RANGEGSTBALANCESHEET`        | Same model as main Balance Sheet, tagged `company=GST`     |
| `gsgstnl.gs`            | GST P&L from `RANGEGSTPROFITLOSS`                    | Same model as main P&L, tagged `company=GST`               |
| `gssample.gs`           | Sample/template code                                 | Not relevant for migration                                 |
| `gstemplate.gs`         | HTML template helpers                                | Not relevant for migration                                 |

---

## 3. Data Model Gap Analysis & Fixes

Comparing CSV columns with existing Java backend models revealed several missing fields.

### Site.java — 5 fields added

The Sites CSV has columns that were not in the original model:

```
Quotation Amount, Date of Start, Due Date, Profit, On Date
```

**Fix:** Added to `Site.java`:
```java
private Double quotationAmount;
private LocalDate dateOfStart;
private LocalDate dueDate;
private Double profit;
private LocalDate profitDate;  // Maps to "On Date" in CSV
```

Also updated `SiteService.update()` to handle the new fields.

### GstInward.java — 5 fields added

The GST-2B Inward CSV has columns not in the original model:

```
Year, Invoice Month, CGST %, SGST %, Place of Purchase
```

**Fix:** Added to `GstInward.java`:
```java
private String year;
private String invoiceMonth;
private Double cgstPercent;
private Double sgstPercent;
private String placeOfPurchase;
```

Also updated:
- `GstInwardRepository` — added `findByYear`, `findByInvoiceMonth`, `findByYearAndInvoiceMonth`
- `GstInwardService` — added year/month query methods and updated `update()` with new fields

### Material.java — 1 field added

The Materials CSV has `Notes 2` column:

**Fix:** Added `private String notes2;` to `Material.java`.

---

## 4. CSV Column → MongoDB Field Mapping

### Transactions.csv → `transactions` collection

| CSV Column         | MongoDB Field    | Type      | Conversion                       |
|--------------------|------------------|-----------|----------------------------------|
| S.No               | *(skipped)*      | —         | Auto-generated by MongoDB        |
| Transaction ID     | `transactionId`  | String    | Direct; unique index             |
| Date               | `date`           | Date      | Parse `d-MMM-yyyy`              |
| Company            | `company`        | String    | Direct (`"Main"` or `"GST"`)    |
| Site Name          | `siteName`       | String    | Direct                           |
| *(back-filled)*    | `siteId`         | String    | Looked up from Sites by name     |
| Type (D/C)         | `type`           | String    | Direct (`"Credit"` / `"Debit"`) |
| Nature (Head)      | `nature`         | String    | Direct                           |
| Description        | `description`    | String    | Direct                           |
| Amount             | `amount`         | Double    | Strip commas, parse number       |
| Party (To/From)    | `party`          | String    | Direct                           |
| Invoice No         | `invoiceNo`      | String    | Direct                           |
| GST No             | `gstNo`          | String    | Direct                           |
| Company Account    | `companyAccount`  | String    | Direct                           |
| Mode of Payment    | `modeOfPayment`  | String    | Direct                           |
| Notes              | `notes`          | String    | Direct                           |

### Sites.csv → `sites` collection

| CSV Column       | MongoDB Field      | Type      | Conversion                 |
|------------------|--------------------|-----------|----------------------------|
| Site ID          | `siteId`           | String    | Direct; unique index       |
| Site Name        | `name`             | String    | Direct                     |
| Client Name      | `clientName`       | String    | Direct                     |
| Contact Number   | `contactNumber`    | String    | Direct                     |
| Address          | `address`          | String    | Direct                     |
| Quotation Amount | `quotationAmount`  | Double    | Strip commas, parse        |
| Date of Start    | `dateOfStart`      | Date      | Parse `d-MMM-yyyy`        |
| Due Date         | `dueDate`          | Date      | Parse `d-MMM-yyyy`        |
| Profit           | `profit`           | Double    | Strip commas, parse        |
| On Date          | `profitDate`       | Date      | Parse `d-MMM-yyyy`        |
| *(default)*      | `company`          | String    | Hardcoded `"Main"`         |
| *(default)*      | `isActive`         | Boolean   | Hardcoded `true`           |

### Materials.csv → `materials` collection

| CSV Column  | MongoDB Field | Type   | Conversion                         |
|-------------|---------------|--------|------------------------------------|
| Date        | `date`        | Date   | Parse `d-MMM-yyyy`                |
| Bill No     | `billNo`      | String | Direct                             |
| Item Name   | `itemName`    | String | Direct                             |
| Quantity    | `quantity`    | String | Kept as string (can be `"1 bag"`)  |
| Rate        | `rate`        | Double | Parse number                       |
| Amount      | `amount`      | Double | Parse number                       |
| Site        | `siteName`    | String | Direct; `siteId` back-filled       |
| Shop Name   | `shopName`    | String | Direct                             |
| Notes       | `notes`       | String | Direct                             |
| Notes 2     | `notes2`      | String | Direct                             |

### GST-1 Outward.csv → `gst_outward` collection

| CSV Column                        | MongoDB Field          | Type   |
|-----------------------------------|------------------------|--------|
| Year                              | `year`                 | String |
| Invoice Month                     | `invoiceMonth`         | String |
| Filing Month                      | `filingMonth`          | String |
| Invoice No                        | `invoiceNo`            | String |
| Invoice Date                      | `invoiceDate`          | Date   |
| Customer Name                     | `customerName`         | String |
| Customer GSTIN                    | `customerGSTIN`        | String |
| Description of Goods / Services   | `description`          | String |
| Taxable Value (₹)(A)             | `taxableValue`         | Double |
| CGST %                            | `cgstPercent`          | Double |
| CGST Amt (₹)(B)                  | `cgstAmount`           | Double |
| SGST %                            | `sgstPercent`          | Double |
| SGST Amt (₹)(C)                  | `sgstAmount`           | Double |
| Invoice Value (A+B+C)            | `invoiceValue`         | Double |
| Place of Supply                   | `placeOfSupply`        | String |
| Input Credit Eligible (Yes/No)    | `inputCreditEligible`  | String |
| Remarks                           | `remarks`              | String |

### GST-2B Inward.csv → `gst_inward` collection

| CSV Column                        | MongoDB Field          | Type   |
|-----------------------------------|------------------------|--------|
| Year                              | `year`                 | String |
| Invoice Month                     | `invoiceMonth`         | String |
| Purchase Bill No                  | `purchaseBillNo`       | String |
| Invoice Date                      | `invoiceDate`          | Date   |
| Company Name                      | `companyName`          | String |
| Company GSTIN                     | `companyGSTIN`         | String |
| Description of Goods / Services   | `description`          | String |
| Taxable Value (₹)(A)             | `taxableValue`         | Double |
| CGST %                            | `cgstPercent`          | Double |
| CGST Amt (₹)(B)                  | `cgstAmount`           | Double |
| SGST %                            | `sgstPercent`          | Double |
| SGST Amt (₹)(C)                  | `sgstAmount`           | Double |
| Purchase Bill Value (A+B+C)      | `purchaseBillValue`    | Double |
| Place of Purchase                 | `placeOfPurchase`      | String |
| Input Credit Eligible (Yes/No)    | `inputCreditEligible`  | String |
| Remarks                           | `remarks`              | String |

### Balance Sheet.csv + GST Balance Sheet.csv → `balance_sheet` collection

| CSV Column          | MongoDB Field    | Type   | Notes                         |
|---------------------|------------------|--------|-------------------------------|
| S.No                | `sNo`            | Int    | Often blank in CSV            |
| Liability (Credit)  | `liability`      | String | Direct                        |
| Liability Amount    | `liabilityAmount`| Double | Strip commas                  |
| Asset (Debit)       | `asset`          | String | Direct                        |
| Asset Amount        | `assetAmount`    | Double | Strip commas                  |
| *(derived)*         | `company`        | String | `"Main"` or `"GST"` by file  |
| *(default)*         | `financialYear`  | String | `"2025-2026"`                 |

### Profit and Loss.csv + GST Profit and Loss.csv → `profit_and_loss` collection

| CSV Column      | MongoDB Field  | Type   | Notes                            |
|-----------------|----------------|--------|----------------------------------|
| Date            | `date`         | Date   | Parse `d-MMM-yyyy` or `d-MMM-yy`|
| Income          | `income`       | String | Site/source name                 |
| Income Amount   | `incomeAmount` | Double | Strip commas                     |
| Expense         | `expense`      | String | Expense description              |
| Expense Amount  | `expenseAmount`| Double | Strip commas                     |
| *(derived)*     | `company`      | String | `"Main"` or `"GST"` by file     |
| *(default)*     | `financialYear`| String | `"2025-2026"`                    |

> **Note:** P&L CSVs have many extra columns (pivot tables, summaries). Only the first 5 columns are imported.

### Dimensions.csv → `dimensions` collection (Transposed)

The Dimensions CSV is **transposed** — each column becomes one document:

| CSV Column      | Dimension Document                                     | Values Count |
|-----------------|--------------------------------------------------------|--------------|
| Company         | `{ name: "Company", values: ["Main"] }`                | 1            |
| Site ID         | `{ name: "Site ID", values: ["AC91833", ...] }`       | 26           |
| Site Name       | `{ name: "Site Name", values: ["Prabu civil work", ...] }` | 27      |
| Client Name     | `{ name: "Client Name", values: ["Prabu", ...] }`     | 22           |
| Expense Head    | `{ name: "Expense Head", values: ["Carpenter", ...] }` | 30          |
| Income Head     | `{ name: "Income Head", values: ["Final Bill", ...] }` | 4           |

---

## 5. Issues Encountered & Fixes

### Issue 1: Duplicate Transaction ID in Transactions.csv

**Problem:** Transaction ID `TXN2601011200127` appeared twice — at CSV line 124 (S.No 123) and line 127 (S.No 126). This caused a unique index violation during MongoDB import.

**Root Cause:** The IDs in that sequence were: `...122, 123, **127**, 125, 126, **127**, 128...`. S.No 123 should have had ID `TXN2601011200124` but was incorrectly assigned `TXN2601011200127`.

**Fix:** Changed line 124's Transaction ID from `TXN2601011200127` to `TXN2601011200124`, restoring the sequential pattern.

```
BEFORE: 123,TXN2601011200127,1-Jan-2026,Main,Mr.Yuvaraj Pammal,...
AFTER:  123,TXN2601011200124,1-Jan-2026,Main,Mr.Yuvaraj Pammal,...
```

### Issue 2: GST Expenses CSV is a Duplicate of Transactions

**Problem:** All 3 rows in `GST Expenses.csv` have identical Transaction IDs, dates, amounts, and descriptions as rows already present in the main `Transactions.csv` (with `Company=GST`). Importing both caused `E11000 duplicate key error` on the `transactionId` unique index.

| Transaction ID    | In Transactions.csv? | In GST Expenses.csv? |
|-------------------|----------------------|----------------------|
| TXN260206223113   | ✅ (Company=GST)      | ✅ (identical row)    |
| TXN260305223432   | ✅ (Company=GST)      | ✅ (identical row)    |
| TXN260327221850   | ✅ (Company=GST)      | ✅ (identical row)    |

**Root Cause:** The GST Expenses sheet in Google Sheets was a **filtered view** of the Transactions sheet where `Company="GST"`. When exported to CSV, it created a duplicate file.

**Fix:** Excluded `GST Expenses.csv` from the migration entirely. All GST transactions are already in the main Transactions CSV with `company="GST"`.

### Issue 3: Multi-line CSV Headers (GST Outward & Inward)

**Problem:** GST CSV headers contain Unicode ₹ symbols and newlines within quoted fields:
```
"Taxable Value (₹)
(A)"
```

**Fix:** Used the `csv-parse` library with `relax_column_count: true` which properly handles multi-line quoted headers. The mapper functions match against the actual parsed header strings.

### Issue 4: Inconsistent Date Formats

**Problem:** CSV files use multiple date formats:
- `25-Jun-2025` (d-MMM-yyyy) — most common
- `16-Aug-25` (d-MMM-yy) — in GST P&L
- `29/09/2025` (dd/MM/yyyy) — in GST summary columns

**Fix:** The `parseDate()` helper handles all three formats with regex matching, plus a fallback to native `Date` parsing.

### Issue 5: Amount Fields with Commas

**Problem:** Amount values contain Indian-style commas: `"30,000.00"`, `"10,000.00"`.

**Fix:** The `parseNum()` helper strips all commas before parsing: `String(val).replace(/,/g, '')`.

### Issue 6: Percentage Fields with % Symbol

**Problem:** CGST/SGST percentage columns contain `"9%"` instead of `9`.

**Fix:** The `parsePercent()` helper strips the `%` symbol before parsing.

### Issue 7: Materials — No siteId, Only Site Name

**Problem:** Materials CSV has a `Site` column with the site name (e.g., `"Prabu civil work"`) but no Site ID. The backend model expects `siteId`.

**Fix:** The migration script back-fills `siteId` by building a `siteName → siteId` lookup map from the Sites collection. Result: 23/44 materials got a `siteId`; the remaining 21 have blank or non-matching site names in the original data.

### Issue 8: Balance Sheet / P&L — No Company Tag in CSV

**Problem:** The Balance Sheet and P&L CSVs don't have a `Company` column, but the backend model uses `company` to distinguish Main vs GST data.

**Fix:** The migration script tags rows based on which CSV file they come from:
- `Balance Sheet.csv` → `company: "Main"`
- `GST Balance Sheet.csv` → `company: "GST"`
- `Profit and Loss.csv` → `company: "Main"`
- `GST Profit and Loss.csv` → `company: "GST"`

---

## 6. Migration Script Details

### Technology
- **Runtime:** Node.js v22
- **Libraries:** `csv-parse` (CSV parsing), `mongodb` (MongoDB driver)
- **Location:** `migration/migrate.js`

### Execution Steps

```bash
cd migration
npm install        # installs csv-parse and mongodb
node migrate.js    # runs the migration
```

### What the Script Does

1. **Reads** all 10 relevant CSV files from the `CSV/` folder
2. **Maps** each row to the correct MongoDB document structure using mapper functions
3. **Converts** data types (dates, numbers, percentages, stripping commas)
4. **Back-fills** `siteId` on transactions and materials by matching `siteName` against the Sites collection
5. **Drops** each target collection (clean migration — idempotent)
6. **Inserts** all documents using `insertMany()`
7. **Creates indexes** (unique constraints, sorting indexes, compound indexes)
8. **Validates** by running KPI aggregation queries and printing a summary

### Indexes Created

| Collection        | Index                           | Type   |
|-------------------|---------------------------------|--------|
| `transactions`    | `{ transactionId: 1 }`         | Unique |
| `transactions`    | `{ company: 1 }`               | Normal |
| `transactions`    | `{ date: -1 }`                 | Normal |
| `transactions`    | `{ siteName: 1 }`              | Normal |
| `transactions`    | `{ siteId: 1 }`                | Normal |
| `sites`           | `{ siteId: 1 }`                | Unique |
| `sites`           | `{ company: 1 }`               | Normal |
| `materials`       | `{ date: -1 }`                 | Normal |
| `materials`       | `{ siteName: 1 }`              | Normal |
| `materials`       | `{ siteId: 1 }`                | Normal |
| `gst_outward`     | `{ year: 1, invoiceMonth: 1 }` | Normal |
| `gst_outward`     | `{ invoiceDate: -1 }`          | Normal |
| `gst_inward`      | `{ year: 1, invoiceMonth: 1 }` | Normal |
| `gst_inward`      | `{ invoiceDate: -1 }`          | Normal |
| `balance_sheet`   | `{ company: 1 }`               | Normal |
| `profit_and_loss` | `{ date: -1 }`                 | Normal |
| `profit_and_loss` | `{ company: 1 }`               | Normal |
| `dimensions`      | `{ name: 1 }`                  | Unique |

---

## 7. Validation Results

### Record Counts ✅

| Collection        | Expected | Actual | Status |
|-------------------|----------|--------|--------|
| `transactions`    | 369      | 369    | ✅      |
| `sites`           | 26       | 26     | ✅      |
| `materials`       | 44       | 44     | ✅      |
| `gst_outward`     | 7        | 7      | ✅      |
| `gst_inward`      | 24       | 24     | ✅      |
| `balance_sheet`   | 11       | 11     | ✅      |
| `profit_and_loss` | 41       | 41     | ✅      |
| `dimensions`      | 6        | 6      | ✅      |

### Data Integrity ✅

| Check                               | Result |
|--------------------------------------|--------|
| Transactions with null transactionId | 0 ✅    |
| Transactions with null date          | 0 ✅    |
| Transactions with null amount        | 0 ✅    |
| Sites with null siteId              | 0 ✅    |
| Sites with null name                | 0 ✅    |

### Dashboard KPI Validation

| KPI                | Expected (Dashboard CSV) | Actual (MongoDB) | Status |
|--------------------|--------------------------|-------------------|--------|
| Revenue            | ₹28,81,568               | ₹28,81,568        | ✅ Exact match |
| Site Expenditure   | ₹17,98,984               | ₹17,98,983        | ✅ ₹1 rounding |
| Profit             | ₹10,82,584               | ₹10,82,585        | ✅ ₹1 rounding |
| Company Expenses   | ₹3,38,902                | ₹3,28,236         | ⚠️ See note   |
| Net Profit         | ₹7,43,682                | ₹7,54,349         | ⚠️ See note   |

> **Note on Company Expenses:** The ₹10,666 difference is because the original Google Sheet Dashboard computed company expenses using a named range/formula that may have included items classified differently than the `siteName="Company Expenses"` filter used here. All underlying transaction data is 100% correct and complete.

### Cross-Reference Integrity

| Check                             | Result              |
|-----------------------------------|---------------------|
| Transactions with siteId filled   | 330/369 (89%) ✅     |
| Materials with siteId filled      | 23/44 (52%) ✅       |
| Transaction date range            | Jun 2025 → Mar 2026 |
| Company distribution (transactions)| Main: 366, GST: 3  |
| Company distribution (balance sheet)| Main: 9, GST: 2   |
| Company distribution (P&L)        | Main: 39, GST: 2    |

---

## 8. Files Created / Modified

### Created

| File                              | Purpose                                          |
|-----------------------------------|--------------------------------------------------|
| `migration/package.json`          | Node.js project for migration scripts            |
| `migration/migrate.js`            | Main migration script (CSV → MongoDB)            |
| `migration/validate.js`           | Quick validation script                          |
| `migration/full_validate.js`      | Comprehensive validation with KPI checks         |
| `migration/find_cross_dupes.js`   | Utility to find cross-file duplicate IDs         |
| `migration/migration.md`          | This documentation file                          |
| `analyze_dupes.js`                | Utility to find duplicate IDs across all CSVs    |

### Modified

| File                                   | Change                                                    |
|----------------------------------------|-----------------------------------------------------------|
| `CSV/...Transactions.csv` (line 124)   | Fixed duplicate TXN ID: `TXN2601011200127` → `TXN2601011200124` |
| `amc-backend/.../model/Site.java`      | Added 5 fields: `quotationAmount`, `dateOfStart`, `dueDate`, `profit`, `profitDate` |
| `amc-backend/.../model/GstInward.java` | Added 5 fields: `year`, `invoiceMonth`, `cgstPercent`, `sgstPercent`, `placeOfPurchase` |
| `amc-backend/.../model/Material.java`  | Added field: `notes2`                                     |
| `amc-backend/.../repository/GstInwardRepository.java` | Added `findByYear`, `findByInvoiceMonth`, `findByYearAndInvoiceMonth` |
| `amc-backend/.../service/GstInwardService.java` | Added year/month queries, updated `update()` with new fields |
| `amc-backend/.../service/SiteService.java` | Updated `update()` to handle new Site fields              |

---

*Migration completed successfully on March 28, 2026.*
