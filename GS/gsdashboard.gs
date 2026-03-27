/**
 * Helper function to get data from a named range with headers
 */
function dashGetNamedRangeData(rangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName(rangeName);
  
  // Safety: If range doesn't exist, log it and return empty
  if (!range) {
    console.error(`Named Range "${rangeName}" not found.`);
    return [];
  }
  
  const values = range.getValues();
  const headers = values[0];
  const data = values.slice(1);
  
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Ensure header is a string to prevent crashes
      let safeHeader = (header || "").toString().trim();
      if (safeHeader) obj[safeHeader] = row[index];
    });
    return obj;
  });
}

/**
 * Main function to fetch all dashboard data
 */
function dashGetDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dashboard");
    
    if (!sheet) throw new Error('Sheet "Dashboard" not found. Please rename your sheet exactly.');

    // --- Fetch KPIs ---
    const kpis = {
      revenue: sheet.getRange("I3").getValue(),
      expenditure: sheet.getRange("I4").getValue(),
      totalProfit: sheet.getRange("I5").getValue(),
      compExpenses: sheet.getRange("I6").getValue(),
      netProfit: sheet.getRange("I7").getValue()
    };

    // --- Chart 1: Company Profit Growth ---
    const rawChart1 = dashGetNamedRangeData("DASHCUMPROFIT");
    const cleanedChart1 = rawChart1.map(row => {
      let d = row["Date"];
      // Handle JS Date or String Date
      let dateObj = (d instanceof Date) ? d : new Date(d);
      return {
        date: dateObj,
        profit: parseFloat(row["Cumulative Profit"] || 0)
      };
    })
    .filter(item => !isNaN(item.date.getTime())) // Remove invalid dates
    .sort((a, b) => a.date - b.date); // Sort chronological

    const chart1Data = {
      dates: cleanedChart1.map(item => item.date.toISOString()),
      values: cleanedChart1.map(item => item.profit)
    };

    // --- Chart 2: Profit Percentage ---
    const rawChart2 = dashGetNamedRangeData("DASHSITEWISE");
    const chart2Data = { categories: [], values: [] };
    
    rawChart2.forEach(row => {
      let name = row["Site Name"];
      let val = row["Profit Percentage"];

      // Stop processing if name is missing (optimizes speed)
      if (name && name.toString().trim() !== "") {
        chart2Data.categories.push(name.toString());
        
        let numVal = parseFloat(val || 0);
        // Logic: if value is 0.75 (75%), make it 75. If it's 75, keep 75.
        if (numVal > -2 && numVal < 5) { // Assuming profit never exceeds 500%
            numVal = numVal * 100;
        }
        chart2Data.values.push(Math.round(numVal * 100) / 100);
      }
    });

    // --- Chart 3: Headwise Expenditure ---
    const rawChart3 = dashGetNamedRangeData("DASHHEADWISE");
    const chart3Data = { categories: [], values: [] };

    rawChart3.forEach(row => {
      let head = row["Nature (Head)"];
      let amt = parseFloat(row["SUM of Amount"] || 0);

      // Filter: Must have a name AND amount > 0
      if (head && head.toString().trim() !== "" && amt > 0) {
        chart3Data.categories.push(head.toString());
        chart3Data.values.push(amt);
      }
    });

    return { 
      success: true,
      kpis: kpis, 
      chart1: chart1Data, 
      chart2: chart2Data, 
      chart3: chart3Data 
    };

  } catch (e) {
    // Pass error back to HTML side for debugging
    return { success: false, error: e.message };
  }
}