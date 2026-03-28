const fs = require('fs');
const path = require('path');

// ============== ANALYZE ALL CSVs FOR DUPLICATES ==============

// Simple CSV line parser that handles quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function analyzeFile(filePath, idColumnName) {
  const name = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    console.log(`\n=== ${name} === FILE NOT FOUND`);
    return [];
  }
  const csv = fs.readFileSync(filePath, 'utf8');
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    console.log(`\n=== ${name} === EMPTY`);
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  const idIdx = headers.indexOf(idColumnName);
  if (idIdx === -1) {
    console.log(`\n=== ${name} === Column "${idColumnName}" not found. Headers: ${headers.join(', ')}`);
    return [];
  }

  const ids = {};
  const dupes = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const id = (cols[idIdx] || '').trim();
    if (!id) continue;
    if (ids[id]) {
      dupes.push({ line: i + 1, id: id, firstLine: ids[id] });
    } else {
      ids[id] = i + 1;
    }
  }

  console.log(`\n=== ${name} ===`);
  console.log(`  Data rows: ${lines.length - 1}, Unique "${idColumnName}": ${Object.keys(ids).length}, Duplicates: ${dupes.length}`);
  dupes.forEach(d => console.log(`  DUP: "${d.id}" at lines ${d.firstLine} and ${d.line}`));
  return dupes;
}

const csvDir = path.join(__dirname, 'CSV');

// Check Transactions
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - Transactions.csv'), 'Transaction ID');

// Check GST Expenses (same schema as Transactions)
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - GST Expenses.csv'), 'Transaction ID');

// Check Sites
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - Sites.csv'), 'Site ID');

// Check GST-1 Outward
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - GST-1 Outward.csv'), 'Invoice No');

// Check GST-2B Inward
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - GST-2B Inward.csv'), 'Purchase Bill No');

// Check Materials (S.No as unique key)
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - Materials.csv'), 'S.No');

// Check Balance Sheet (S.No)
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - Balance Sheet.csv'), 'S.No');

// Check GST Balance Sheet (S.No)
analyzeFile(path.join(csvDir, 'Amirtham Constructions-DEV - GST Balance Sheet.csv'), 'S.No');
