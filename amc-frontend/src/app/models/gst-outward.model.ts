export interface GstOutward {
  id: string;
  year: string;
  invoiceMonth: string;
  filingMonth: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGSTIN: string;
  description: string;
  taxableValue: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  invoiceValue: number;
  placeOfSupply: string;
  inputCreditEligible: string;
  remarks: string;
}
