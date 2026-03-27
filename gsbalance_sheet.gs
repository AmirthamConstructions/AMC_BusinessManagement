// gsbalance_sheet.gs

/* Helper: get named range values with metadata (same pattern as other modules) */
function sup_getRangeValsByName(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var rg = ss.getRangeByName(name);
    if(!rg) return null;
    return { range: rg, values: rg.getValues(), sheet: rg.getSheet(), row: rg.getRow(), col: rg.getColumn() };
  } catch(e){
    return null;
  }
}

/* Return Balance Sheet rows as array of objects keyed by header names.
   Each object includes __row property = sheet row number (useful for update/delete).
*/
function sup_getBalanceSheet1(){
  var rr = sup_getRangeValsByName('RANGEBALANCESHEET');
  if(!rr) return [];
  var vals = rr.values;
  if(!vals || vals.length < 1) return [];
  var headers = vals[0].map(function(h){ return String(h||'').trim(); });
  var out = [];
  for(var r = 1; r < vals.length; r++){
    var row = vals[r];
    // skip empty rows
    var nonEmpty = row.some(function(c){ return c !== '' && c !== null && c !== undefined; });
    if(!nonEmpty) continue;
    var obj = {};
    for(var c=0;c<headers.length;c++){
      var h = headers[c];
      var v = row[c];
      if(v instanceof Date){
        obj[h] = Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd-MMM-yyyy');
      } else {
        obj[h] = v;
      }
    }
    // compute actual sheet row index: rr.range.getRow() + r
    obj.__row = rr.range.getRow() + r;
    out.push(obj);
  }
  return out;
}

/* Add new Asset row: append using headers from named range.
   Assumption: Write Asset category to "Asset (Debit)" and amount to "Asset Amount".
*/
function sup_addBalanceAsset1(obj){
  var rr = sup_getRangeValsByName('RANGEBALANCESHEET');
  if(!rr) return { status:'error', message:'RANGEBALANCESHEET not found' };
  var headers = rr.values[0].map(function(h){ return String(h||'').trim(); });

  // prepare empty row array
  var rowToAppend = headers.map(function(){ return ''; });

  // populate based on keys present in obj
  for(var i=0;i<headers.length;i++){
    var key = headers[i];
    if(obj[key] !== undefined){
      rowToAppend[i] = obj[key];
    }
  }

  // append row to the sheet (appendRow adds to the bottom)
  var sh = rr.sheet;
  sh.appendRow(rowToAppend);
  return { status:'ok', message:'Saved' };
}

/* Update a row by absolute sheet row number (sheetRow) - updatedObj keys are header names */
function sup_updateBalanceByRow1(sheetRow, updatedObj){
  var rr = sup_getRangeValsByName('RANGEBALANCESHEET');
  if(!rr) return { status:'error', message:'RANGEBALANCESHEET not found' };
  var headers = rr.values[0].map(function(h){ return String(h||'').trim(); });
  var sheet = rr.sheet;
  try {
    var data = sheet.getRange(rr.range.getRow(), rr.range.getColumn(), rr.range.getNumRows(), rr.range.getNumColumns()).getValues();
    // find relative row index
    var relIndex = sheetRow - rr.range.getRow(); // 0-based -> 1st data row is index 1 (since data includes header)
    if(relIndex < 1 || relIndex >= data.length) {
      return { status:'error', message:'Row not in named range' };
    }
    var current = data[relIndex]; // array
    // update matching headers
    for(var c=0;c<headers.length;c++){
      var h = headers[c];
      if(updatedObj[h] !== undefined){
        current[c] = updatedObj[h];
      }
    }
    // write back
    var writeRow = rr.range.getRow() + relIndex;
    sheet.getRange(writeRow, rr.range.getColumn(), 1, headers.length).setValues([current]);
    return { status:'ok', message:'Updated' };
  } catch(e){
    return { status:'error', message: e.toString() };
  }
}

/* Delete a row by absolute sheet row number */
function sup_deleteBalanceByRow1(sheetRow){
  var rr = sup_getRangeValsByName('RANGEBALANCESHEET');
  if(!rr) return { status:'error', message:'RANGEBALANCESHEET not found' };
  var sheet = rr.sheet;
  try {
    sheet.deleteRow(sheetRow);
    return { status:'ok', message:'Deleted' };
  } catch(e){
    return { status:'error', message: e.toString() };
  }
}

/* Export PDF for balance rows provided (rows array from client). Returns Drive URL */
function sup_exportBalancePdf1(rows, meta){
  if(!rows || rows.length === 0) return null;
  var headers = ['S.No','Liability (Credit)','Liability Amount','Asset (Debit)','Asset Amount'];
  var html = '<html><head><style>'+
    'body{font-family:Arial, sans-serif; font-size:11px} h2{text-align:center} table{width:100%;border-collapse:collapse} th,td{border:1px solid #444;padding:6px} th{background:#f0f0f0}' +
    '.num{text-align:right}' +
    '</style></head><body>';
  html += '<h2>Balance Sheet</h2>';
  html += '<div style="text-align:center; margin-bottom:8px;">' + (meta && meta.dateRange ? meta.dateRange : '') + '</div>';
  html += '<table><thead><tr>' + headers.map(function(h){ return '<th>'+h+'</th>'; }).join('') + '</tr></thead><tbody>';
  rows.forEach(function(r){
    html += '<tr>';
    html += '<td>' + (r['S.No'] || '') + '</td>';
    html += '<td>' + (r['Liability (Credit)'] || '') + '</td>';
    html += '<td class="num">' + (r['Liability Amount'] !== undefined && r['Liability Amount']!=='' ? Number(r['Liability Amount']).toFixed(2) : '') + '</td>';
    html += '<td>' + (r['Asset (Debit)'] || '') + '</td>';
    html += '<td class="num">' + (r['Asset Amount'] !== undefined && r['Asset Amount']!=='' ? Number(r['Asset Amount']).toFixed(2) : '') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></body></html>';

  var blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf');
  var file = DriveApp.createFile(blob).setName('BalanceSheet_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm'));
  return file.getUrl();
}
