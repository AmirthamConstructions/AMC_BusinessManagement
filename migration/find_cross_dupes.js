const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_DIR = path.resolve(__dirname, '..', 'CSV');

function readCsv(filename) {
  const filePath = path.join(CSV_DIR, filename);
  return parse(fs.readFileSync(filePath, 'utf-8'), {
    columns: true, skip_empty_lines: true, relax_column_count: true, trim: true, bom: true
  });
}

const tx = readCsv('Amirtham Constructions-DEV - Transactions.csv');
const gst = readCsv('Amirtham Constructions-DEV - GST Expenses.csv');

const txIds = new Set(tx.map(r => (r['Transaction ID'] || '').trim()).filter(Boolean));
const gstIds = gst.map(r => (r['Transaction ID'] || '').trim()).filter(Boolean);

console.log('=== Cross-file duplicates (GST Expenses IDs found in Transactions) ===');
const overlap = gstIds.filter(id => txIds.has(id));
if (overlap.length === 0) {
  console.log('  None found');
} else {
  overlap.forEach(id => {
    const txRow = tx.find(r => r['Transaction ID'] === id);
    const gstRow = gst.find(r => r['Transaction ID'] === id);
    console.log(`  DUP ID: ${id}`);
    console.log(`    In Transactions: Date=${txRow['Date']}, Site=${txRow['Site Name']}, Desc=${txRow['Description']}, Amt=${txRow['Amount']}`);
    console.log(`    In GST Expenses: Date=${gstRow['Date']}, Site=${gstRow['Site Name']}, Desc=${gstRow['Description']}, Amt=${gstRow['Amount']}`);
  });
}

// Also check for duplicates within GST Expenses itself
const gstIdSet = {};
const gstDupes = [];
for (const row of gst) {
  const id = (row['Transaction ID'] || '').trim();
  if (!id) continue;
  if (gstIdSet[id]) gstDupes.push(id);
  else gstIdSet[id] = true;
}
console.log('\n=== Duplicates within GST Expenses ===');
console.log(gstDupes.length === 0 ? '  None found' : gstDupes.join(', '));

console.log('\n=== All GST Expense Transaction IDs ===');
gst.forEach(r => console.log(`  ${r['Transaction ID']} | ${r['Date']} | ${r['Site Name']} | ${r['Description']} | ${r['Amount']}`));
