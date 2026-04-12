export interface GstReconciliation {
  outwardInvoiceCount: number;
  outwardTaxableValue: number;
  outwardCgst: number;
  outwardSgst: number;
  outwardTotalTax: number;
  outwardInvoiceValue: number;

  inwardInvoiceCount: number;
  inwardTaxableValue: number;
  inwardCgst: number;
  inwardSgst: number;
  inwardTotalTax: number;
  inwardPurchaseValue: number;

  outputTax: number;
  inputTaxCredit: number;
  netGstPayable: number;

  year: string;
  month: string;

  outwardDetails: OutwardSummaryRow[];
  inwardDetails: InwardSummaryRow[];
}

export interface OutwardSummaryRow {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGSTIN: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  invoiceValue: number;
}

export interface InwardSummaryRow {
  purchaseBillNo: string;
  invoiceDate: string;
  companyName: string;
  companyGSTIN: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  purchaseBillValue: number;
}

export interface Gst2bUploadResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  skippedReasons: string[];
  errorMessages: string[];
}
