/**
 * gssites.gs
 * Server-side helpers for the Sites module.
 * Prefixed with 'sup_site_' to avoid collisions with other modules.
 */

// --- SHARED HELPER (Mock of the one in transactions if not available globally) ---
function sup_site_getSheetByName_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function sup_site_getHeaders_(sheetName) {
  var sheet = sup_site_getSheetByName_(sheetName);
  if (!sheet) return [];
  // Assumes headers are in row 1
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(function(h){ return String(h || '').trim(); });
}

/* FETCH ALL SITES 
  Returns: { status, headers, rows }
*/
function sup_site_getSites() {
  var sheet = sup_site_getSheetByName_('Sites'); // Sheet name per requirement
  if (!sheet) return { status:'error', message:'Sites sheet not found' };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status:'ok', headers: [], rows: [] };

  var headers = data[0].map(function(h){ return String(h || '').trim(); });
  var rows = [];
  
  // Start from row 2 (index 1)
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // Skip empty rows
    var hasData = row.some(function(c){ return c !== '' && c !== null && c !== undefined; });
    if (!hasData) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      var val = row[c];
      // Format dates for display
      if (val instanceof Date) {
        obj[h] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd-MMM-yyyy');
      } else {
        obj[h] = val;
      }
    }
    // "On Date" is mentioned as a calculated query column in requirements. 
    // We pass it as is from the sheet data.
    rows.push(obj);
  }

  return { status: 'ok', headers: headers, rows: rows };
}

/* GENERATE UNIQUE SITE ID 
  Format: AC + 5 random numbers (e.g., AC56978)
*/
function sup_site_generateUniqueId() {
  var sheet = sup_site_getSheetByName_('Sites');
  var existingIds = [];
  
  if (sheet && sheet.getLastRow() > 1) {
    var headers = sup_site_getHeaders_('Sites');
    var idColIdx = headers.indexOf('Site ID');
    if (idColIdx !== -1) {
      existingIds = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat().map(String);
    }
  }

  var maxAttempts = 2000;
  for (var i = 0; i < maxAttempts; i++) {
    var num = Math.floor(Math.random() * 90000) + 10000; // 10000..99999
    var id = 'AC' + String(num);
    if (existingIds.indexOf(id) === -1) {
      return { status: 'ok', siteId: id };
    }
  }
  return { status: 'error', message: 'Failed to generate unique Site ID' };
}

/* ADD NEW SITE 
*/
function sup_site_addSite(siteObj) {
  var sheet = sup_site_getSheetByName_('Sites');
  if (!sheet) return { status:'error', message:'Sites sheet not found' };

  var headers = sup_site_getHeaders_('Sites');
  
  // 1. Find the REAL next empty row within the Table
  // We check Column B (Site Name) because Column A has an ArrayFormula
  var colBValues = sheet.getRange("B:B").getValues();
  var nextRow = 1;
  
  // Loop through Column B to find the first truly empty cell
  for (var i = 0; i < colBValues.length; i++) {
    if (colBValues[i][0] === "" || colBValues[i][0] === null) {
      nextRow = i + 1;
      break;
    }
    // If we reach the end of the loop without finding an empty cell,
    // it means we need to add a brand new row at the very bottom
    if (i === colBValues.length - 1) {
      nextRow = colBValues.length + 1;
    }
  }

  // 2. Map the data
  var rowData = headers.map(function(h) {
    if (h === 'S.No') return null; // Let the ArrayFormula in Column A handle this
    return siteObj[h] !== undefined ? siteObj[h] : '';
  });

  // 3. Place the data in the row we found
  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  return { status:'ok', message:'New Site Added' };
}

/* UPDATE SITE 
  Identifies row by Site ID or strict row matching if ID isn't unique (assuming ID is unique)
*/
function sup_site_updateSite(originalId, updatedObj) {
  var sheet = sup_site_getSheetByName_('Sites');
  if (!sheet) return { status:'error', message:'Sites sheet not found' };

  var headers = sup_site_getHeaders_('Sites');
  var data = sheet.getDataRange().getValues();
  var idIdx = headers.indexOf('Site ID');

  if (idIdx === -1) return { status:'error', message:'Site ID column not found' };

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idIdx]) === String(originalId)) {
      var rowIndex = r + 1;
      var currentRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      
      // Update fields
      headers.forEach(function(h, colIdx) {
        if (updatedObj[h] !== undefined) {
          currentRow[colIdx] = updatedObj[h];
        }
      });
      
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([currentRow]);
      return { status:'ok', message:'Site Details Updated' };
    }
  }
  return { status:'error', message:'Site not found' };
}

/* DELETE SITE 
  Validates against Transactions sheet first
*/
function sup_site_deleteSite(siteId, siteName) {
  // 1. Check Transactions
  var txSheet = sup_site_getSheetByName_('Transactions');
  if (txSheet) {
    var txData = txSheet.getDataRange().getValues();
    if (txData.length > 1) {
      var txHeaders = txData[0].map(function(h){ return String(h).trim(); });
      var siteColIdx = txHeaders.indexOf('Site Name');
      
      if (siteColIdx !== -1) {
        for (var i = 1; i < txData.length; i++) {
          if (String(txData[i][siteColIdx]).trim() === String(siteName).trim()) {
            return { status:'error', message:'There are Transactions in this site' };
          }
        }
      }
    }
  }

  // 2. Delete from Sites
  var sheet = sup_site_getSheetByName_('Sites');
  if (!sheet) return { status:'error', message:'Sites sheet not found' };
  
  var headers = sup_site_getHeaders_('Sites');
  var data = sheet.getDataRange().getValues();
  var idIdx = headers.indexOf('Site ID');
  
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idIdx]) === String(siteId)) {
      sheet.deleteRow(r + 1);
      return { status:'ok', message:'Deleted' };
    }
  }
  
  return { status:'error', message:'Site not found' };
}

/* GET TRANSACTIONS FOR A SPECIFIC SITE (For Popup)
*/
function sup_site_getTransactionsForSite(siteName) {
  var sheet = sup_site_getSheetByName_('Transactions');
  if (!sheet) return { status:'ok', rows:[] };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status:'ok', rows:[] };

  var headers = data[0].map(function(h){ return String(h || '').trim(); });
  var siteIdx = headers.indexOf('Site Name');
  
  if (siteIdx === -1) return { status:'ok', rows:[] };

  var rows = [];
  var tz = Session.getScriptTimeZone();

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // Check match
    if (String(row[siteIdx]).trim() === String(siteName).trim()) {
      var obj = {};
      headers.forEach(function(h, i){
        var val = row[i];
        if (val instanceof Date) {
          obj[h] = Utilities.formatDate(val, tz, 'dd-MMM-yyyy');
        } else {
          obj[h] = val;
        }
      });
      rows.push(obj);
    }
  }
  return { status:'ok', rows: rows, headers: headers };
}
