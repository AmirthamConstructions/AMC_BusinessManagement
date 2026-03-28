/**
 * AMC Business Management — CSV → MongoDB Migration Script
 * 
 * Reads all CSV exports from the Google Sheets app and inserts them
 * into the MongoDB Atlas database used by the Spring Boot backend.
 *
 * Usage:  cd migration && node migrate.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { MongoClient } = require('mongodb');

// ─── Config ────────────────────────────────────────────────────────────────────
const MONGO_URI = 'mongodb+srv://amirtham_db_user:faDXYJMLOTx2IOrS@cluster0.aszzz.mongodb.net/?appName=Cluster0';
const DB_NAME   = 'amc_business';
const CSV_DIR   = path.resolve(__dirname, '..', 'CSV');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Strip commas and parse a number.  Returns null when blank/unparseable. */
function parseNum(val) {
  if (val === null || val === undefined || String(val).trim() === '') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/** Parse a percentage string like "9%" → 9.0 */
function parsePercent(val) {
  if (val === null || val === undefined || String(val).trim() === '') return null;
  const cleaned = String(val).replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Parse dates in multiple formats found in the CSV exports:
 *   - "25-Jun-2025"   (d-MMM-yyyy)
 *   - "16-Aug-25"     (d-MMM-yy)
 *   - "29/09/2025"    (dd/MM/yyyy)
 *   - "03/01/2026"    (dd/MM/yyyy)
 * Returns a JS Date or null.
 */
function parseDate(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === '0') return null;

  // dd/MM/yyyy
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // d-MMM-yyyy  or  d-MMM-yy
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const dashMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (dashMatch) {
    let year = Number(dashMatch[3]);
    if (year < 100) year += 2000;
    const mon = months[dashMatch[2].charAt(0).toUpperCase() + dashMatch[2].slice(1).toLowerCase()];
    if (mon !== undefined) {
      const d = new Date(year, mon, Number(dashMatch[1]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback: native Date parser
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

/** Trim a string value; return null if empty. */
function str(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/** Read & parse a CSV file.  Returns array of objects keyed by header. */
function readCsv(filename) {
  const filePath = path.join(CSV_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠  File not found: ${filename}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  // csv-parse handles multi-line quoted fields automatically
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,   // Some CSVs have extra trailing columns
    trim: true,
    bom: true
  });
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapTransaction(row) {
  const txnId = str(row['Transaction ID']);
  if (!txnId) return null;                     // skip rows without a TXN ID
  const amount = parseNum(row['Amount']);
  if (amount === null || amount === 0) return null;

  return {
    transactionId:  txnId,
    date:           parseDate(row['Date']),
    company:        str(row['Company']) || 'Main',
    siteId:         null,                       // will be back-filled from Sites lookup
    siteName:       str(row['Site Name']),
    type:           str(row['Type (D/C)']),
    nature:         str(row['Nature (Head)']),
    description:    str(row['Description']),
    amount:         amount,
    party:          str(row['Party (To/From)']),
    invoiceNo:      str(row['Invoice No']),
    gstNo:          str(row['GST No']),
    companyAccount: str(row['Company Account']),
    modeOfPayment:  str(row['Mode of Payment']),
    notes:          str(row['Notes']),
    createdAt:      new Date(),
    updatedAt:      new Date()
  };
}

function mapSite(row) {
  const siteId = str(row['Site ID']);
  if (!siteId) return null;

  return {
    siteId:           siteId,
    name:             str(row['Site Name']),
    clientName:       str(row['Client Name']),
    contactNumber:    str(row['Contact Number']),
    address:          str(row['Address']),
    company:          'Main',
    quotationAmount:  parseNum(row['Quotation Amount']),
    dateOfStart:      parseDate(row['Date of Start']),
    dueDate:          parseDate(row['Due Date']),
    profit:           parseNum(row['Profit']),
    profitDate:       parseDate(row['On Date']),
    expenseHead:      null,
    incomeHead:       null,
    paymentMode:      null,
    companyAccount:   null,
    isActive:         true,
    createdAt:        new Date(),
    updatedAt:        new Date()
  };
}

function mapMaterial(row) {
  const itemName = str(row['Item Name']);
  if (!itemName) return null;

  return {
    date:       parseDate(row['Date']),
    billNo:     str(row['Bill No']),
    itemName:   itemName,
    quantity:   str(row['Quantity']),   // keep as string — can be "1 bag"
    rate:       parseNum(row['Rate']),
    amount:     parseNum(row['Amount']),
    siteId:     null,
    siteName:   str(row['Site']),
    shopName:   str(row['Shop Name']),
    notes:      str(row['Notes']),
    notes2:     str(row['Notes 2']),
    createdAt:  new Date(),
    updatedAt:  new Date()
  };
}

function mapGstOutward(row) {
  // Skip NIL / header-only rows
  const invoiceDate = parseDate(row['Invoice Date']);
  if (!invoiceDate) return null;

  return {
    year:                str(row['Year']),
    invoiceMonth:        str(row['Invoice Month']),
    filingMonth:         str(row['Filing Month']),
    invoiceNo:           str(row['Invoice No']) || '',
    invoiceDate:         invoiceDate,
    customerName:        str(row['Customer Name']),
    customerGSTIN:       str(row['Customer GSTIN']),
    description:         str(row['Description of Goods / Services']),
    taxableValue:        parseNum(row['Taxable Value (₹)\n(A)'] || row['Taxable Value (â‚¹)\n(A)']),
    cgstPercent:         parsePercent(row['CGST %']),
    cgstAmount:          parseNum(row['CGST Amt (₹)\n(B)'] || row['CGST Amt (â‚¹)\n(B)']),
    sgstPercent:         parsePercent(row['SGST %']),
    sgstAmount:          parseNum(row['SGST Amt (₹)\n(C)'] || row['SGST Amt (â‚¹)\n(C)']),
    invoiceValue:        parseNum(row['Invoice Value (A+B+C)']),
    placeOfSupply:       str(row['Place of Supply']),
    inputCreditEligible: str(row['Input Credit Eligible (Yes/No)']),
    remarks:             str(row['Remarks']),
    createdAt:           new Date(),
    updatedAt:           new Date()
  };
}

function mapGstInward(row) {
  const invoiceDate = parseDate(row['Invoice Date']);
  if (!invoiceDate) return null;

  return {
    year:                str(row['Year']),
    invoiceMonth:        str(row['Invoice Month']),
    purchaseBillNo:      str(row['Purchase Bill No']),
    invoiceDate:         invoiceDate,
    companyName:         str(row['Company Name']),
    companyGSTIN:        str(row['Company GSTIN']),
    description:         str(row['Description of Goods / Services']),
    taxableValue:        parseNum(row['Taxable Value (₹)\n(A)'] || row['Taxable Value (â‚¹)\n(A)']),
    cgstPercent:         parsePercent(row['CGST %']),
    cgstAmount:          parseNum(row['CGST Amt (₹)\n(B)'] || row['CGST Amt (â‚¹)\n(B)']),
    sgstPercent:         parsePercent(row['SGST %']),
    sgstAmount:          parseNum(row['SGST Amt (₹)\n(C)'] || row['SGST Amt (â‚¹)\n(C)']),
    purchaseBillValue:   parseNum(row['Purchase Bill Value (A+B+C)']),
    placeOfPurchase:     str(row['Place of Purchase']),
    inputCreditEligible: str(row['Input Credit Eligible (Yes/No)']),
    remarks:             str(row['Remarks']),
    createdAt:           new Date(),
    updatedAt:           new Date()
  };
}

function mapBalanceRow(row, company) {
  const liability = str(row['Liability (Credit)']);
  const asset     = str(row['Asset (Debit)']);
  if (!liability && !asset) return null;

  return {
    sNo:              parseNum(row['S.No']),
    liability:        liability,
    liabilityAmount:  parseNum(row['Liability Amount']),
    asset:            asset,
    assetAmount:      parseNum(row['Asset Amount']),
    company:          company,
    financialYear:    '2025-2026',
    createdAt:        new Date(),
    updatedAt:        new Date()
  };
}

function mapPnlEntry(row, company) {
  // The P&L CSVs have many extra columns (pivot tables); we only need the first 5
  const date = parseDate(row['Date']);
  const income = str(row['Income']);
  const incomeAmt = parseNum(row['Income Amount']);
  const expense = str(row['Expense']);
  const expenseAmt = parseNum(row['Expense Amount']);

  // Must have a date and at least one non-empty value
  if (!date) return null;
  if (!income && incomeAmt === null && !expense && expenseAmt === null) return null;

  return {
    date:           date,
    income:         income,
    incomeAmount:   incomeAmt,
    expense:        expense,
    expenseAmount:  expenseAmt,
    company:        company,
    financialYear:  '2025-2026',
    createdAt:      new Date(),
    updatedAt:      new Date()
  };
}

/**
 * Transpose the Dimensions CSV.
 * Each column becomes one Dimension document: { name, values[] }.
 */
function buildDimensions(rows) {
  if (!rows || rows.length === 0) return [];

  // Get all column headers
  const headers = Object.keys(rows[0]);
  const dims = [];

  for (const header of headers) {
    const colName = header.trim();
    if (!colName) continue;

    // Collect unique non-empty values for this column
    const vals = [];
    for (const row of rows) {
      const v = String(row[header] || '').trim();
      if (v !== '' && !vals.includes(v)) {
        vals.push(v);
      }
    }
    if (vals.length === 0) continue;

    dims.push({
      name:      colName,
      values:    vals,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return dims;
}

// ─── Back-fill siteId on transactions using the Sites lookup ───────────────────

function backfillSiteIds(transactions, sites) {
  // Build a siteName → siteId map
  const nameToId = {};
  for (const s of sites) {
    if (s.name && s.siteId) {
      nameToId[s.name.toLowerCase().trim()] = s.siteId;
    }
  }
  let filled = 0;
  for (const tx of transactions) {
    if (tx.siteName) {
      const key = tx.siteName.toLowerCase().trim();
      if (nameToId[key]) {
        tx.siteId = nameToId[key];
        filled++;
      }
    }
  }
  console.log(`  ✔ Back-filled siteId on ${filled}/${transactions.length} transactions`);
}

// ─── Back-fill siteId on materials using the Sites lookup ──────────────────────

function backfillMaterialSiteIds(materials, sites) {
  const nameToId = {};
  for (const s of sites) {
    if (s.name && s.siteId) {
      nameToId[s.name.toLowerCase().trim()] = s.siteId;
    }
  }
  let filled = 0;
  for (const m of materials) {
    if (m.siteName) {
      const key = m.siteName.toLowerCase().trim();
      if (nameToId[key]) {
        m.siteId = nameToId[key];
        filled++;
      }
    }
  }
  console.log(`  ✔ Back-filled siteId on ${filled}/${materials.length} materials`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AMC Business Management — CSV → MongoDB Migration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 1. Read all CSVs ─────────────────────────────────────────────────────

  console.log('📂 Reading CSV files from', CSV_DIR, '\n');

  const rawTransactions   = readCsv('Amirtham Constructions-DEV - Transactions.csv');
  const rawGstExpenses    = readCsv('Amirtham Constructions-DEV - GST Expenses.csv');
  const rawSites          = readCsv('Amirtham Constructions-DEV - Sites.csv');
  const rawMaterials      = readCsv('Amirtham Constructions-DEV - Materials.csv');
  const rawGstOutward     = readCsv('Amirtham Constructions-DEV - GST-1 Outward.csv');
  const rawGstInward      = readCsv('Amirtham Constructions-DEV - GST-2B Inward.csv');
  const rawBalanceSheet   = readCsv('Amirtham Constructions-DEV - Balance Sheet.csv');
  const rawGstBalance     = readCsv('Amirtham Constructions-DEV - GST Balance Sheet.csv');
  const rawPnl            = readCsv('Amirtham Constructions-DEV - Profit and Loss.csv');
  const rawGstPnl         = readCsv('Amirtham Constructions-DEV - GST Profit and Loss.csv');
  const rawDimensions     = readCsv('Amirtham Constructions-DEV - Dimensions.csv');

  // Log the first row's keys so we can debug header matching
  if (rawGstOutward.length > 0) {
    console.log('  GST Outward headers:', Object.keys(rawGstOutward[0]).join(' | '));
  }
  if (rawGstInward.length > 0) {
    console.log('  GST Inward headers:', Object.keys(rawGstInward[0]).join(' | '));
  }

  // ── 2. Map to MongoDB documents ──────────────────────────────────────────

  console.log('\n🔄 Mapping CSV rows to MongoDB documents...\n');

  // Transactions → transactions collection
  // NOTE: GST Expenses CSV is a filtered view of Transactions where Company=GST.
  //       All GST Expense rows already exist in the main Transactions CSV, so we
  //       skip it to avoid duplicate transactionId errors.
  const transactions = rawTransactions.map(mapTransaction).filter(Boolean);
  const allTransactions = transactions;
  console.log(`  transactions:    ${allTransactions.length}  (includes GST company transactions from main CSV)`);

  const sites = rawSites.map(mapSite).filter(Boolean);
  console.log(`  sites:           ${sites.length}`);

  const materials = rawMaterials.map(mapMaterial).filter(Boolean);
  console.log(`  materials:       ${materials.length}`);

  const gstOutward = rawGstOutward.map(mapGstOutward).filter(Boolean);
  console.log(`  gst_outward:     ${gstOutward.length}`);

  const gstInward = rawGstInward.map(mapGstInward).filter(Boolean);
  console.log(`  gst_inward:      ${gstInward.length}`);

  const balanceRows = rawBalanceSheet.map(r => mapBalanceRow(r, 'Main')).filter(Boolean)
    .concat(rawGstBalance.map(r => mapBalanceRow(r, 'GST')).filter(Boolean));
  console.log(`  balance_sheet:   ${balanceRows.length}`);

  const pnlEntries = rawPnl.map(r => mapPnlEntry(r, 'Main')).filter(Boolean)
    .concat(rawGstPnl.map(r => mapPnlEntry(r, 'GST')).filter(Boolean));
  console.log(`  profit_and_loss: ${pnlEntries.length}`);

  const dimensions = buildDimensions(rawDimensions);
  console.log(`  dimensions:      ${dimensions.length}`);

  // ── 3. Back-fill siteIds ─────────────────────────────────────────────────

  console.log('\n🔗 Back-filling siteId references...');
  backfillSiteIds(allTransactions, sites);
  backfillMaterialSiteIds(materials, sites);

  // ── 4. Connect to MongoDB & insert ───────────────────────────────────────

  console.log('\n🌐 Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log('  ✔ Connected to database:', DB_NAME);

  // Helper: drop collection silently, then insert
  async function importCollection(name, docs) {
    if (docs.length === 0) {
      console.log(`  ⏭  ${name}: 0 documents — skipping`);
      return;
    }
    try { await db.collection(name).drop(); } catch (e) { /* doesn't exist yet */ }
    const result = await db.collection(name).insertMany(docs);
    console.log(`  ✔ ${name}: inserted ${result.insertedCount} documents`);
  }

  console.log('\n📥 Importing into MongoDB...\n');

  await importCollection('transactions',    allTransactions);
  await importCollection('sites',           sites);
  await importCollection('materials',       materials);
  await importCollection('gst_outward',     gstOutward);
  await importCollection('gst_inward',      gstInward);
  await importCollection('balance_sheet',   balanceRows);
  await importCollection('profit_and_loss', pnlEntries);
  await importCollection('dimensions',      dimensions);

  // ── 5. Create indexes ────────────────────────────────────────────────────

  console.log('\n📇 Creating indexes...');

  await db.collection('transactions').createIndex({ transactionId: 1 }, { unique: true });
  await db.collection('transactions').createIndex({ company: 1 });
  await db.collection('transactions').createIndex({ date: -1 });
  await db.collection('transactions').createIndex({ siteName: 1 });
  await db.collection('transactions').createIndex({ siteId: 1 });

  await db.collection('sites').createIndex({ siteId: 1 }, { unique: true });
  await db.collection('sites').createIndex({ company: 1 });

  await db.collection('materials').createIndex({ date: -1 });
  await db.collection('materials').createIndex({ siteName: 1 });
  await db.collection('materials').createIndex({ siteId: 1 });

  await db.collection('gst_outward').createIndex({ year: 1, invoiceMonth: 1 });
  await db.collection('gst_outward').createIndex({ invoiceDate: -1 });

  await db.collection('gst_inward').createIndex({ year: 1, invoiceMonth: 1 });
  await db.collection('gst_inward').createIndex({ invoiceDate: -1 });

  await db.collection('balance_sheet').createIndex({ company: 1 });
  await db.collection('profit_and_loss').createIndex({ date: -1 });
  await db.collection('profit_and_loss').createIndex({ company: 1 });

  await db.collection('dimensions').createIndex({ name: 1 }, { unique: true });

  console.log('  ✔ Indexes created');

  // ── 6. Validation summary ────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ Migration Complete — Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const collections = ['transactions','sites','materials','gst_outward','gst_inward','balance_sheet','profit_and_loss','dimensions'];
  for (const col of collections) {
    const count = await db.collection(col).countDocuments();
    console.log(`  ${col.padEnd(20)} ${count} documents`);
  }

  // Quick KPI validation against Dashboard.csv expected values
  console.log('\n📊 Dashboard KPI Validation (from transactions):');
  const pipeline = [
    { $match: { company: 'Main' } },
    { $group: {
      _id: '$type',
      total: { $sum: '$amount' }
    }}
  ];
  const kpiResults = await db.collection('transactions').aggregate(pipeline).toArray();
  const creditTotal = (kpiResults.find(r => r._id === 'Credit') || {}).total || 0;
  const debitTotal  = (kpiResults.find(r => r._id === 'Debit') || {}).total || 0;
  console.log(`  Main Credit (Revenue):     ₹${creditTotal.toLocaleString('en-IN')}`);
  console.log(`  Main Debit  (Expenditure): ₹${debitTotal.toLocaleString('en-IN')}`);
  console.log(`  Main Profit:               ₹${(creditTotal - debitTotal).toLocaleString('en-IN')}`);

  // Company expenses (transactions where siteName = "Company Expenses")
  const compExpPipeline = [
    { $match: { company: 'Main', siteName: 'Company Expenses', type: 'Debit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ];
  const compExpResult = await db.collection('transactions').aggregate(compExpPipeline).toArray();
  const compExpenses = compExpResult.length > 0 ? compExpResult[0].total : 0;
  console.log(`  Company Expenses:          ₹${compExpenses.toLocaleString('en-IN')}`);
  console.log(`  Net Profit:                ₹${(creditTotal - debitTotal - compExpenses).toLocaleString('en-IN')}`);

  await client.close();
  console.log('\n🔌 MongoDB connection closed. Done!\n');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
