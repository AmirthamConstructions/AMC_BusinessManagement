/**
 * gstransactions.gs
 * Server-side helpers for the Suppliers / Transactions module.
 * Function names prefixed with 'sup' to avoid collisions.
 */

/* Generic helpers */
function sup_getSheetByName_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function sup_getHeaders_(sheetName) {
  var sheet = sup_getSheetByName_(sheetName);
  if (!sheet) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(function(h){ return String(h || '').trim(); });
}

/* --- DIMENSIONS helpers --- */
function sup_getDimensions() {
  var sheet = sup_getSheetByName_('Dimensions');
  if (!sheet) return { status:'error', message:'Dimensions sheet not found' };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status:'ok', headers: [], rows: [], byCol: {} };
  var headers = data[0].map(function(h){ return String(h || '').trim(); });
  var rows = data.slice(1);
  var byCol = {};
  headers.forEach(function(h, idx){
    byCol[h] = rows.map(function(r){ return r[idx]; }).filter(function(v){ return (v !== '' && v !== null && v !== undefined); });
  });
  return { status:'ok', headers: headers, rows: rows, byCol: byCol };
}

function sup_addDimensionValue(colName, value) {
  var sheet = sup_getSheetByName_('Dimensions');
  if (!sheet) return { status:'error', message:'Dimensions sheet not found' };

  var headers = sup_getHeaders_('Dimensions');
  var colIdx = headers.indexOf(colName);
  if (colIdx === -1) return { status:'error', message:'Column not found: ' + colName };
  // Find next available row for this column
  var colRange = sheet.getRange(2, colIdx+1, sheet.getMaxRows()-1, 1).getValues().map(function(r){ return r[0]; });
  var nextRowOffset = 0;
  while (nextRowOffset < colRange.length && (colRange[nextRowOffset] !== '' && colRange[nextRowOffset] !== null && colRange[nextRowOffset] !== undefined)) {
    nextRowOffset++;
  }
  var writeRow = 2 + nextRowOffset;
  sheet.getRange(writeRow, colIdx+1).setValue(value);
  return { status:'ok', message: 'Saved', row: writeRow };
}

// These functions kept for backend stability, though UI button removed
function sup_generateUniqueSiteId() {
  var dims = sup_getDimensions();
  if (dims.status !== 'ok') return { status:'error', message:'Dimensions missing' };
  var existing = (dims.byCol['Site ID'] || []).map(String);

  var maxAttempts = 2000;
  for (var i=0; i<maxAttempts; i++) {
    var num = Math.floor(Math.random() * 90000) + 10000;
    var id = 'AC' + String(num);
    if (existing.indexOf(id) === -1) {
      return { status:'ok', siteId: id };
    }
  }
  return { status:'error', message:'Failed to generate unique Site ID' };
}

function sup_addSite(siteObj) {
  var sheet = sup_getSheetByName_('Dimensions');
  if (!sheet) return { status:'error', message:'Dimensions sheet not found' };
  var headers = sup_getHeaders_('Dimensions');
  var row = headers.map(function(){ return ''; });
  ['Site ID','Site Name','Client Name','Address','Contact Number','Company','Expense Head','Income Head','Payment Mode','Company Account'].forEach(function(k){
    var idx = headers.indexOf(k);
    if (idx !== -1 && siteObj[k] !== undefined) {
      row[idx] = siteObj[k];
    }
  });
  sheet.appendRow(row);
  return { status:'ok', message:'Site added' };
}

/* --- Transactions Helpers --- */


function sup_addTransaction(txObj) {
  var sheet = sup_getSheetByName_('Transactions');
  if (!sheet) return { status:'error', message:'Transactions sheet not found' };
  var headers = sup_getHeaders_('Transactions');
  
  // MODIFIED: Generate Transaction ID server-side
  var now = new Date();
  var id = "TXN" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyMMddHHmmss");
  txObj['Transaction ID'] = id; // Inject the generated ID into the object

  // 1. Find the REAL next empty row within the Table (checking Column A)
  var colAValues = sheet.getRange("A:A").getValues();
  var nextRow = 1;

  for (var i = 0; i < colAValues.length; i++) {
    if (colAValues[i][0] === "" || colAValues[i][0] === null) {
      nextRow = i + 1;
      break;
    }
    if (i === colAValues.length - 1) {
      nextRow = colAValues.length + 1;
    }
  }

  // 2. Map the data
  var rowData = headers.map(function(h) {
    return txObj[h] !== undefined ? txObj[h] : '';
  });
  
  // 3. Place the data
  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
  return { status:'ok', message:'New Transaction Added' };
}

function sup_updateTransactionById(transactionId, updatedObj) {
  var sheet = sup_getSheetByName_('Transactions');
  if (!sheet) return { status:'error', message:'Transactions sheet not found' };

  var headers = sup_getHeaders_('Transactions');
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status:'error', message:'No data' };

  var txCol = headers.indexOf('Transaction ID');
  if (txCol === -1) return { status:'error', message:'Transaction ID column not found' };
  
  for (var r=1; r<data.length; r++) {
    if (String(data[r][txCol]) === String(transactionId)) {
      var rowIndex = r+1;
      // Get only the values from Column B onwards (index 2)
      var rangeToUpdate = sheet.getRange(rowIndex, 2, 1, headers.length - 1);
      var current = rangeToUpdate.getValues()[0];
      
      // Update values starting from index 1 of headers (Column B)
      headers.forEach(function(h, cidx){
        if (cidx === 0) return; // Skip S.No column
        if (updatedObj[h] !== undefined) {
          // Adjust index because 'current' now starts from Column B
          current[cidx - 1] = updatedObj[h];
        }
      });
      
      rangeToUpdate.setValues([current]);
      return { status:'ok', message:'Transaction Details Updated', row: rowIndex };
    }
  }
  return { status:'error', message:'Transaction not found' };
}

function sup_deleteTransactionById(transactionId) {
  var sheet = sup_getSheetByName_('Transactions');
  if (!sheet) return { status:'error', message:'Transactions sheet not found' };

  var headers = sup_getHeaders_('Transactions');
  var data = sheet.getDataRange().getValues();
  if (data.length <=1) return { status:'error', message:'No data' };

  var txCol = headers.indexOf('Transaction ID');
  if (txCol === -1) return { status:'error', message:'Transaction ID column not found' };
  for (var r=1; r<data.length; r++) {
    if (String(data[r][txCol]) === String(transactionId)) {
      sheet.deleteRow(r+1);
      return { status:'ok', message:'Deleted' };
    }
  }
  return { status:'error', message:'Transaction not found' };
}

/* small helpers */
function sup_formatDateToDDMMMYYYY(dateObj) {
  if (!dateObj) return '';
  var d = new Date(dateObj);
  if (isNaN(d)) return String(dateObj);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd-MMM-yyyy');
}

function sup_safeValue(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}

/* --- Server-Side Filter & Pagination Logic --- */

// Helper to get and filter all data on the server
function sup_getFilteredData_(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Transactions");
  if (!sh) return { headers: [], rows: [] }; 
  
  var data = sh.getDataRange().getValues();
  if (!data || data.length <= 1) return { headers: (data && data[0]) || [], rows: [] };
  
  var headers = data[0].map(function(h){ return String(h || '').trim(); }); 
  var tz = Session.getScriptTimeZone(); 
  var allRows = [];
  
  // 1. Parse non-empty rows correctly (Stops processing empty trailing rows)
  var txIdx = headers.indexOf('Transaction ID'); 
  for (var r = 1; r < data.length; r++) { 
    var row = data[r];
    // Skip row if Transaction ID is empty
    if (txIdx !== -1 && (!row[txIdx] || String(row[txIdx]).trim() === '')) continue; 
    
    var obj = {}; 
    for (var c = 0; c < headers.length; c++) { 
      var h = headers[c];
      var val = row[c]; 
      if (val instanceof Date) { 
        obj[h] = Utilities.formatDate(val, tz, 'dd-MMM-yyyy'); 
        obj['_rawDate'] = val.getTime(); // Hidden timestamp for accurate filtering
      } else { 
        obj[h] = val;
      } 
    } 
    allRows.push(obj); 
  }
  
  // 2. Apply Filters Server-Side
  var filtered = allRows;
  
  // A. Date Filter
  if (params.datePreset && params.datePreset !== 'all') {
    var now = new Date();
    var fromDate = null;
    var toDate = null;

    if (params.datePreset !== 'custom') {
      toDate = now.getTime();
      var d = new Date(now);
      if (params.datePreset === '1m') d.setMonth(now.getMonth() - 1);
      if (params.datePreset === '6m') d.setMonth(now.getMonth() - 6);
      if (params.datePreset === '1y') d.setFullYear(now.getFullYear() - 1);
      fromDate = d.getTime();
    } else {
      if (params.fromDate) fromDate = new Date(params.fromDate).getTime();
      if (params.toDate) {
        var td = new Date(params.toDate);
        td.setHours(23, 59, 59, 999); // Include entire end day
        toDate = td.getTime();
      }
    }

    filtered = filtered.filter(function (r) {
      var t = r['_rawDate'];
      if (!t && r['Date']) t = new Date(r['Date']).getTime(); // Fallback parsing
      if (!t) return false;
      if (fromDate && t < fromDate) return false;
      if (toDate && t > toDate) return false;
      return true;
    });
  }
  
  // B. Search Filter
  if (params.searchQuery) {
    var q = String(params.searchQuery).toLowerCase().trim();
    var crit = params.searchCrit;
    if (crit === 'Nature(Head)') crit = 'Nature (Head)';

    filtered = filtered.filter(function(row){
      if (!crit || crit === 'All') {
        return Object.keys(row).some(function(k){
          if (k === '_rawDate') return false; // Don't search the hidden timestamp
          var v = row[k];
          return (v !== undefined && String(v || '').toLowerCase().indexOf(q) !== -1);
        });
      } else {
        var cell = (row[crit] || '') + '';
        return (cell.toLowerCase().indexOf(q) !== -1);
      }
    });
  }
  
  return { headers: headers, rows: filtered };
}

// Replaces the old sup_getTransactions
function sup_getTransactionsPaginated(params) {
  var dataObj = sup_getFilteredData_(params);
  var filtered = dataObj.rows;
  
  // Pagination Calculations
  var total = filtered.length;
  var perPage = parseInt(params.perPage) || 25;
  var pages = Math.ceil(total / perPage) || 1;
  
  var currentPage = params.page;
  if (currentPage === 'last') {
    currentPage = pages; // Always default to the last page
  } else {
    currentPage = parseInt(currentPage) || 1;
    if (currentPage > pages) currentPage = pages;
    if (currentPage < 1) currentPage = 1;
  }
  
  // Slice array for current page
  var start = (currentPage - 1) * perPage;
  var end = start + perPage;
  var pageRows = filtered.slice(start, end);
  
  // Clean up hidden timestamps before sending to client
  pageRows.forEach(function(r) { delete r['_rawDate']; });
  
  return { 
    status: 'ok', 
    headers: dataObj.headers, 
    rows: pageRows, 
    total: total, 
    pages: pages, 
    page: currentPage 
  };
}

// Replaces the old sup_exportTransactionsPdf to fetch filtered data server-side
function sup_exportTransactionsPdf(params, meta) {
  var dataObj = sup_getFilteredData_(params);
  var rows = dataObj.rows;
  if (!rows || rows.length === 0) return null;
  
  var headers = [
    'S.No', 'Transaction ID', 'Date', 'Company', 'Site Name', 'Type (D/C)',
    'Nature (Head)', 'Description', 'Amount', 'Party (To/From)',
    'Invoice No', 'GST No', 'Company Account', 'Mode of Payment', 'Notes'
  ];

  var html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #444; padding: 4px; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
          <h2>${meta?.company || ''}</h2>
          <div style="text-align:center; font-size:12px; margin-bottom:6px;">
            Transactions Report<br>
            <strong>${meta?.dateRange || 'All Dates'}</strong>
          </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r, index) => {
              // We calculate S.No sequentially for the PDF
              var sNo = index + 1;
              return `<tr>${headers.map(h => `<td>${h === 'S.No' ? sNo : (r[h] !== undefined ? r[h] : '')}</td>`).join('')}</tr>`;
            }).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  var htmlOutput = HtmlService.createHtmlOutput(html);
  var blob = htmlOutput.getBlob().getAs('application/pdf');

  var file = DriveApp.createFile(blob)
    .setName('Transactions_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm'));
  
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
  var viewUrl = "https://drive.google.com/file/d/" + file.getId() + "/view";
  return viewUrl;
}