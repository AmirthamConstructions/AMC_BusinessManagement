/**
 * gspnl.gs
 */
function sup_pnl_getData1() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var range = ss.getRangeByName("RANGEPROFITLOSS");
    
    if (!range) return { status: 'error', message: 'Named Range "RANGEPROFITLOSS" not found.' };

    var data = range.getValues();
    if (data.length <= 1) return { status: 'ok', rows: [] };

    var headers = data[0].map(function(h) { return String(h || '').trim(); });
    var rows = [];
    var tz = Session.getScriptTimeZone();

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row.some(function(cell) { return cell !== ""; })) continue; 

      var obj = {};
      headers.forEach(function(h, c) {
        var val = row[c];
        
        // FIX #2: If Amount is 0 or empty, store it as empty string for the UI
        if (h === "Income Amount" || h === "Expense Amount") {
          obj[h] = (val === "" || val === null || val === 0) ? "" : val;
        } 
        else if (val instanceof Date) {
          obj[h] = Utilities.formatDate(val, tz, 'dd-MMM-yyyy');
          obj[h + '_raw'] = val.getTime(); // We save a hidden number for date math
        } else {
          obj[h] = val;
        }
      });
      rows.push(obj);
    }
    return { status: 'ok', rows: rows };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function sup_pnl_exportPdf1(rows, meta) {
  if (!rows || rows.length === 0) return null;
  var headers = ['Date', 'Income', 'Income Amount', 'Expense', 'Expense Amount'];
  
  var html = '<html><head><style>' +
    'body { font-family: Arial, sans-serif; font-size: 11px; }' +
    'h2 { text-align: center; }' +
    'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
    'th, td { border: 1px solid #444; padding: 5px; text-align: left; }' +
    'th { background: #f0f0f0; }' +
    '.num { text-align: right; }' +
    '</style></head><body>' +
    '<h2>Profit / Loss Report</h2>' +
    '<p style="text-align:center;">Period: ' + meta.dateRange + '</p>' +
    '<div style="margin-bottom:15px; border:1px solid #ccc; padding:10px;">' +
    'Total Income: <b>' + meta.totalIncome + '</b> | ' +
    'Total Expense: <b>' + meta.totalExpense + '</b> | ' +
    'Net Profit: <b>' + meta.totalProfit + '</b>' +
    '</div>' +
    '<table><thead><tr>' + headers.map(function(h){ return '<th>'+h+'</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function(r){
      return '<tr>' +
        '<td>'+(r['Date']||'')+'</td>' +
        '<td>'+(r['Income']||'')+'</td>' +
        '<td class="num">'+(r['Income Amount']||'0.00')+'</td>' +
        '<td>'+(r['Expense']||'')+'</td>' +
        '<td class="num">'+(r['Expense Amount']||'0.00')+'</td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></body></html>';

  var blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf');
  var file = DriveApp.createFile(blob).setName('PnL_Report.pdf');
  return file.getUrl();
}