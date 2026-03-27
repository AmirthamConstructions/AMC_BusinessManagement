function doGet(e) {
  const page = (e && e.parameter && e.parameter.page)
    ? e.parameter.page
    : 'dashboard';

  // Map pages to template files
  const pageTemplates = {
    'dashboard': 'index',
    'transactions': 'transactions',
    'balance_sheet': 'balance_sheet',
    'profit_loss': 'pnl',
    'sites': 'sites',
    'gst_balancesheet': 'gst_balancesheet',
    'gst_profit_loss': 'gst_profit_loss',
    'gst1r_outward': 'gst1r_outward',
    'gst_2b': 'gst_2b',
    'materials': 'materials'
  };

  // Resolve template
  const contentTemplate = pageTemplates[page] || 'index';

  // Create base template
  const template = HtmlService.createTemplateFromFile('template');

  // Pass variables to HTML
  template.contentTemplate = contentTemplate;
  template.currentPage = page;
  template.getScriptUrl = getScriptUrl;

  // Return evaluated HTML
  return template.evaluate()
    .setTitle('Amirtham Construction – Accounts')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include helper
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Script URL helper
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
