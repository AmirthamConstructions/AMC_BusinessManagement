/**
 * gsgst2b.gs
 * Server-side Apps Script for GST-2B Inward module
 * Names & functions prefixed with sup_gst2b_ to avoid collisions
 */

/**
 * Read named range RANGEGSTR2B from sheet "GST-2B Inward" and return rows as JSON.
 * Each row object will include a _row property (sheet row number) and Invoice Date_raw for date filtering.
 */
function sup_gst2b_getData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var range = ss.getRangeByName("RANGEGSTR2B");
    if (!range) return { status: 'error', message: 'Named Range "RANGEGSTR2B" not found.' };

    var values = range.getValues();
    var displays = range.getDisplayValues();
    if (values.length <= 1) return { status: 'ok', rows: [] };

    // raw headers from sheet (preserve original)
    var rawHeaders = values[0].map(function(h){ return String(h||''); });

    // helper: normalized string for matching (lowercase, strip punctuation, collapse spaces)
    function _normKey(s) {
      if (s === null || typeof s === 'undefined') return '';
      // normalize unicode, replace NBSP with normal space, remove control/zero-width, collapse spaces, remove punctuation
      var t = String(s).normalize('NFKC').replace(/\u00A0/g,' ').replace(/[\u200B-\u200F]/g,'');
      t = t.replace(/[^0-9a-zA-Z\s]/g, ''); // drop punctuation like (),₹,% etc.
      t = t.replace(/\s+/g,' ').trim().toLowerCase();
      return t;
    }

    // canonical keys that the client expects (exact strings used in the HTML/JS)
    var canonicalKeys = [
      'Taxable Value (₹)(A)',
      'CGST Amt (₹)(B)',
      'SGST Amt (₹)(C)',
      'Purchase Bill Value (A+B+C)',
      'Invoice Date',
      'Purchase Bill No',
      'Company Name',
      'Description of Goods / Services'
    ];

    // build normalized map of sheet header -> index
    var headerIndex = {};
    for (var i = 0; i < rawHeaders.length; i++) {
      headerIndex[rawHeaders[i]] = i;
    }

    // create mapping canonicalKey -> sheetHeader (if similar)
    var canonicalToSheetHeader = {};
    var normToSheet = {};
    for (var i = 0; i < rawHeaders.length; i++) {
      var raw = rawHeaders[i];
      normToSheet[_normKey(raw)] = raw;
    }

    // for each canonical key, try to find a best match in the sheet headers
    canonicalKeys.forEach(function(cKey) {
      var n = _normKey(cKey);
      // direct exact normalized match
      if (normToSheet[n]) {
        canonicalToSheetHeader[cKey] = normToSheet[n];
        return;
      }
      // fallback: try partial matches by keywords
      // check each sheet header normalized; if it contains main words from canonical, accept
      var parts = n.split(' ');
      for (var nh in normToSheet) {
        var score = 0;
        for (var pi = 0; pi < parts.length; pi++) {
          if (parts[pi].length < 3) continue;
          if (nh.indexOf(parts[pi]) !== -1) score++;
        }
        if (score >= Math.max(1, Math.floor(parts.length/3))) {
          canonicalToSheetHeader[cKey] = normToSheet[nh];
          break;
        }
      }
      // as last resort, leave undefined (we'll still include original sheet header values)
    });

    var rows = [];
    var tz = Session.getScriptTimeZone();
    var startRow = range.getRow();

    for (var r = 1; r < values.length; r++) {
      var rowVals = values[r];
      var displayVals = displays[r];

      // consider row empty only if all display cells are empty
      var isEmpty = true;
      for (var c = 0; c < displayVals.length; c++) {
        if (String(displayVals[c]).trim() !== "") { isEmpty = false; break; }
      }
      if (isEmpty) continue;

      var obj = {};
      // fill object with original sheet header keys first
      for (var c = 0; c < rawHeaders.length; c++) {
        var h = rawHeaders[c];
        var raw = rowVals[c];
        var shown = displayVals[c];
        if (raw instanceof Date) {
          obj[h] = Utilities.formatDate(raw, tz, 'dd-MMM-yyyy');
          obj[h + '_raw'] = raw.getTime();
        } else if (typeof raw === 'number') {
          obj[h] = raw;
        } else if (String(shown).trim() !== '') {
          obj[h] = shown;
        } else {
          obj[h] = raw === null ? '' : raw;
        }
      }

      // now also set canonical keys (so client code using exact canonical strings will find them)
      canonicalKeys.forEach(function(cKey) {
        var sheetH = canonicalToSheetHeader[cKey];
        if (sheetH && (typeof obj[sheetH] !== 'undefined')) {
          obj[cKey] = obj[sheetH];
          // if sheet value is a date raw, also set canonical raw date field name if applicable
          if (sheetH + '_raw' in obj) obj[cKey + '_raw'] = obj[sheetH + '_raw'];
        } else {
          // if no mapped sheet header, try to find close match among original headers by normalized contain
          // (this is a second-chance check)
          for (var j = 0; j < rawHeaders.length; j++) {
            if (_normKey(rawHeaders[j]).indexOf(_normKey(cKey).split(' ')[0]) !== -1) {
              obj[cKey] = obj[rawHeaders[j]];
              if (rawHeaders[j] + '_raw' in obj) obj[cKey + '_raw'] = obj[rawHeaders[j] + '_raw'];
              break;
            }
          }
        }
      });

      // include sheet row number for updates/deletes
      obj._row = startRow + r;
      rows.push(obj);
    }

    return { status: 'ok', rows: rows };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}




/**
 * Update ONLY Column G (Description) and Column P (Input Credit) 
 * to protect ArrayFormulas in other columns.
 [cite: 35, 42, 43] */
function sup_gst2b_updateRow(sheetRowNumber, updates) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var range = ss.getRangeByName("RANGEGSTR2B"); 
    var sheet = range.getSheet(); 
    
    // Column G (Description) = 7
    // Column P (Input Credit Eligible) = 16
    var colMap = {
      'Description of Goods / Services': 7,
      'Input Credit Eligible (Yes/No)': 16
    };

    for (var key in updates) {
      if (colMap[key]) {
        // Update individual cells only
        sheet.getRange(sheetRowNumber, colMap[key]).setValue(updates[key]);
      }
    }
    return { status: 'ok' }; 
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Delete a row from the sheet given the absolute sheet row number.
 */
function sup_gst2b_deleteRow(sheetRowNumber) {
  try {
    if (!sheetRowNumber) return { status: 'error', message: 'Invalid row number.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var range = ss.getRangeByName("RANGEGSTR2B");
    if (!range) return { status: 'error', message: 'Named Range "RANGEGSTR2B" not found.' };

    var sheet = range.getSheet();
    var startRow = range.getRow();
    var endRow = startRow + range.getNumRows() - 1;

    if (sheetRowNumber < startRow || sheetRowNumber > endRow) {
      return { status: 'error', message: 'Row is outside the named range bounds.' };
    }

    sheet.deleteRow(sheetRowNumber);
    return { status: 'ok' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Export filtered rows to a PDF. Rows and meta are passed from client.
 * Creates a PDF in Drive and returns URL.
 */
function sup_gst2b_exportPdf(rows, meta) {
  try {
    if (!rows || rows.length === 0) return null;

    var headers = [
      'Purchase Bill No','Invoice Date','Company Name','Description of Goods / Services',
      'Taxable Value (₹)(A)','CGST Amt (₹)(B)','SGST Amt (₹)(C)','Purchase Bill Value (A+B+C)'
    ];

    var html = '<html><head><meta charset="utf-8"><style>' +
      'body{font-family:Arial, sans-serif; font-size:12px;} ' +
      'h2{margin:0 0 6px 0;} .meta{margin-bottom:8px;color:#555;} ' +
      'table{width:100%;border-collapse:collapse;margin-top:8px;} ' +
      'th,td{border:1px solid #777;padding:6px;text-align:left;font-size:11px;} th{background:#f0f0f0;} ' +
      '.num{text-align:right;}' +
      '</style></head><body>' +
      '<h2>GST-2B Inward</h2>' +
      '<div class="meta"><b>Period:</b> ' + (meta.dateRange||'') + '</div>' +
      '<div style="margin-bottom:8px;"><b>Totals: </b> ' +
      'Taxable: ' + (meta.totals && meta.totals.taxable ? meta.totals.taxable : '') + ' | ' +
      'CGST: ' + (meta.totals && meta.totals.cgst ? meta.totals.cgst : '') + ' | ' +
      'SGST: ' + (meta.totals && meta.totals.sgst ? meta.totals.sgst : '') + ' | ' +
      'Purchase: ' + (meta.totals && meta.totals.purchase ? meta.totals.purchase : '') +
      '</div>' +
      '<table><thead><tr>' + headers.map(function(h){ return '<th>'+h+'</th>'; }).join('') + '</tr></thead><tbody>';

    rows.forEach(function(r){
      html += '<tr>' +
        '<td>'+(r['Purchase Bill No']||'')+'</td>' +
        '<td>'+(r['Invoice Date']||'')+'</td>' +
        '<td>'+(r['Company Name']||'')+'</td>' +
        '<td>'+(r['Description of Goods / Services']||'')+'</td>' +
        '<td class="num">'+(r['Taxable Value (₹)(A)']||'')+'</td>' +
        '<td class="num">'+(r['CGST Amt (₹)(B)']||'')+'</td>' +
        '<td class="num">'+(r['SGST Amt (₹)(C)']||'')+'</td>' +
        '<td class="num">'+(r['Purchase Bill Value (A+B+C)']||'')+'</td>' +
        '</tr>';
    });

    html += '</tbody></table></body></html>';

    var blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf').setName('GST2B_Report.pdf');
    var file = DriveApp.createFile(blob);
    return file.getUrl();
  } catch (e) {
    return null;
  }
}
