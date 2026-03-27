export interface Transaction {
  id: string;
  transactionId: string;
  date: string;
  company: 'Main' | 'GST';
  siteId: string;
  siteName: string;
  type: 'Credit' | 'Debit';
  nature: string;
  description: string;
  amount: number;
  party: string;
  invoiceNo: string;
  gstNo: string;
  companyAccount: string;
  modeOfPayment: string;
  notes: string;
}
