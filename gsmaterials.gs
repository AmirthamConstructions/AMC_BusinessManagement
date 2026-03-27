/**
 * gsmaterials.gs
 * Server-side helpers for the Materials module.
 * Function names prefixed with 'sup_' to avoid collisions.
 */

const MAT_SHEET_NAME = "Materials";

function sup_getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name || MAT_SHEET_NAME);
}

/**
 * Fetches all materials and formats them as objects matching headers
 */
function sup_getMaterials() {
  var sheet = sup_getSheet_();
  if (!sheet) return { status: 'error', message: 'Sheet not found' };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'ok', data: [] };

  var headers = data[0].map(h => String(h || '').trim());
  var rows = data.slice(1);

  var formattedData = rows.map((row, index) => {
    var obj = { rowIndex: index + 2 }; // Actual sheet row
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd-MMM-yyyy");
      }
      obj[h] = val;
    });
    return obj;
  });

  return { status: 'ok', data: formattedData };
}

/**
 * Get Site list from 'Sites' sheet for dropdown
 */
function sup_getSiteList() {
  var sheet = sup_getSheet_("Sites");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIdx = headers.indexOf("Site Name");
  if (colIdx === -1) return [];
  
  return data.slice(1)
    .map(r => r[colIdx])
    .filter(v => v !== "" && v != null);
}

/**
 * Saves a new material
 */
function sup_addMaterial(obj) {
  var sheet = sup_getSheet_();
  var lastRow = sheet.getLastRow();
  
  // Calculate S.No
  var nextSNo = 1;
  if (lastRow > 1) {
    var sNos = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    nextSNo = Math.max(...sNos.flat().filter(Number)) + 1;
  }

  // Map object to row array based on your required columns
  var row = [
    nextSNo,
    obj.Date,
    obj["Bill No"],
    obj["Item Name"],
    obj.Quantity,
    obj.Rate,
    obj.Amount,
    obj.Site,
    obj["Shop Name"],
    obj.Notes
  ];

  sheet.appendRow(row);
  return { status: 'ok', message: 'New Material Added' };
}

/**
 * Updates existing row
 */
function sup_updateMaterial(rowIndex, obj) {
  var sheet = sup_getSheet_();
  // Columns B to J (Index 2 to 10)
  var range = sheet.getRange(rowIndex, 2, 1, 9);
  var vals = [[
    obj.Date, obj["Bill No"], obj["Item Name"], 
    obj.Quantity, obj.Rate, obj.Amount, 
    obj.Site, obj["Shop Name"], obj.Notes
  ]];
  range.setValues(vals);
  return { status: 'ok', message: 'Material Details Updated' };
}

/**
 * Deletes a row
 */
function sup_deleteMaterial(rowIndex) {
  var sheet = sup_getSheet_();
  sheet.deleteRow(rowIndex);
  return { status: 'ok', message: 'Record Deleted' };
}