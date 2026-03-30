export interface GstInward {
  id: string;
  year: string;
  invoiceMonth: string;
  purchaseBillNo: string;
  invoiceDate: string;
  companyName: string;
  companyGSTIN: string;
  description: string;
  taxableValue: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  purchaseBillValue: number;
  placeOfPurchase: string;
  inputCreditEligible: string;
  remarks: string;
}
