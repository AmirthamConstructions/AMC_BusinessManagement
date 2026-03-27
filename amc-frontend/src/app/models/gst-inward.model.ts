export interface GstInward {
  id: string;
  purchaseBillNo: string;
  invoiceDate: string;
  companyName: string;
  companyGSTIN: string;
  description: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  purchaseBillValue: number;
  inputCreditEligible: string;
  remarks: string;
}
