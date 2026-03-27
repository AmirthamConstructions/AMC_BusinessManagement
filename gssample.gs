// gsmaterials.gs
// Server-side functions for Materials module.
// Prefixes use 'sup_mat_' to avoid collisions with other modules.

/* Helper: get sheet by name */
function sup_mat_getSheetByName_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

/* Helper: get header row (row 1) */
function sup_mat_getHeaders_(sheetName) {
  var sheet = sup_mat_getSheetByName_(sheetName);
  if (!sheet) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(function(h){ return String(h || '').trim(); });
}

/* Fetch all materials
   Returns { status: 'ok', headers: [...], rows: [...] }
   Rows are objects keyed by header names. Dates are formatted 'dd-MMM-yyyy'.
*/
function sup_mat_getMaterials() {
  var sheet = sup_mat_getSheetByName_('Materials');
  if (!sheet) return { status:'error', message:'Materials sheet not found' };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status:'ok', headers: [], rows: [] };

  var headers = data[0].map(function(h){ return String(h || '').trim(); });
  var tz = Session.getScriptTimeZone();
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // skip completely empty rows
    var hasData = row.some(function(c){ return c !== '' && c !== null && c !== undefined; });
    if (!hasData) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      var val = row[c];
      if (val instanceof Date) {
        obj[h] = Utilities.formatDate(val, tz, 'dd-MMM-yyyy');
      } else {
        obj[h] = val;
      }
    }
    rows.push(obj);
  }

  return { status: 'ok', headers: headers, rows: rows };
}

/* Add new material
   siteObj: object with keys matching headers (e.g., 'Date','Bill No','Item Name',...)
   Returns {status:'ok'|'error', message:...}
*/
function sup_mat_addMaterial(siteObj) {
  var sheet = sup_mat_getSheetByName_('Materials');
  if (!sheet) return { status:'error', message:'Materials sheet not found' };

  var headers = sup_mat_getHeaders_('Materials');
  if (!headers || headers.length === 0) return { status:'error', message:'Materials headers not found' };

  // Find next empty row inside table area:
  // We'll inspect a data column that normally holds values (e.g., 'Item Name' or header index 2).
  var checkColName = 'Item Name';
  var checkColIdx = headers.indexOf(checkColName);
  if (checkColIdx === -1) { // fallback, use second column if available
    checkColIdx = Math.max(1, Math.min(headers.length - 1, 1));
  }
  var colRange = sheet.getRange(2, checkColIdx + 1, sheet.getMaxRows() - 1, 1).getValues();
  var nextRow = null;
  for (var i = 0; i < colRange.length; i++) {
    if (colRange[i][0] === '' || colRange[i][0] === null) {
      nextRow = i + 2; // +2 because array starts at row 2
      break;
    }
  }
  if (!nextRow) nextRow = sheet.getLastRow() + 1;

  // Map headers to row values
  var rowData = headers.map(function(h) {
    // Do not attempt to write serial number column if it's handled by ArrayFormula
    if (h === 'S.No') return '';
    // If incoming has a Date string in ISO (yyyy-mm-dd), convert to Date object so the sheet stores as date
    var v = siteObj[h];
    if (v === undefined || v === null) return '';
    // try to set date if looks like YYYY-MM-DD
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      try { return new Date(v); } catch(e) {}
    }
    return v;
  });

  // Write the row
  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  return { status: 'ok', message: 'New Material Added' };
}

/* Update material by S.No
   originalSNo: value in S.No column that identifies the row
   updatedObj: object of fields to update (keys are header names)
*/
function sup_mat_updateMaterial(originalSNo, updatedObj) {
  var sheet = sup_mat_getSheetByName_('Materials');
  if (!sheet) return { status:'error', message:'Materials sheet not found' };

  var headers = sup_mat_getHeaders_('Materials');
  var data = sheet.getDataRange().getValues();
  var snoIdx = headers.indexOf('S.No');
  if (snoIdx === -1) return { status:'error', message:'S.No column not found' };

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][snoIdx]) === String(originalSNo)) {
      var rowIndex = r + 1;
      var currentRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

      // Update provided fields
      headers.forEach(function(h, colIdx) {
        if (updatedObj[h] !== undefined) {
          var val = updatedObj[h];
          // convert yyyy-mm-dd to Date if appropriate
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            val = new Date(val);
          }
          currentRow[colIdx] = val;
        }
      });

      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([currentRow]);
      return { status:'ok', message:'Material Details Updated' };
    }
  }
  return { status:'error', message:'Material not found' };
}

/* Delete material by S.No */
function sup_mat_deleteMaterial(sno) {
  var sheet = sup_mat_getSheetByName_('Materials');
  if (!sheet) return { status:'error', message:'Materials sheet not found' };
  var headers = sup_mat_getHeaders_('Materials');
  var data = sheet.getDataRange().getValues();
  var snoIdx = headers.indexOf('S.No');
  if (snoIdx === -1) return { status:'error', message:'S.No column not found' };

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][snoIdx]) === String(sno)) {
      sheet.deleteRow(r + 1);
      return { status:'ok', message:'Deleted' };
    }
  }
  return { status:'error', message:'Material not found' };
}
function sup_mat_export(rows, type){
  var folder = DriveApp.getRootFolder();
  var fileName = 'Materials_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
  var headers = Object.keys(rows[0]);

  var sheetData = [headers];
  rows.forEach(r=>{
    sheetData.push(headers.map(h => r[h] || ''));
  });

  if (type === 'csv'){
    var csv = sheetData.map(r => r.join(',')).join('\n');
    var f = folder.createFile(fileName + '.csv', csv, MimeType.CSV);
    return {status:'ok',url:f.getDownloadUrl()};
  } else {
    var ss = SpreadsheetApp.create(fileName);
    ss.getSheets()[0].getRange(1,1,sheetData.length,headers.length).setValues(sheetData);
    return {status:'ok',url:ss.getUrl()};
  }
}
