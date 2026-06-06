export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerAddress: string;
  customerState: string;
  customerPincode: string;
  customerGSTIN: string;
  nameOfWork: string;
  lineItems: InvoiceLineItem[];
  subTotal: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  notes: string;
  // R1.4: Template support
  isTemplate?: boolean;
  templateName?: string;
}

export interface InvoiceLineItem {
  sNo: number;
  description: string;
  amount: number;
}

/** R1.5: Invoice KPIs */
export interface InvoiceKpi {
  invoicesThisMonth: number;
  billedThisMonth: number;
  invoicesThisFY: number;
  billedThisFY: number;
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalCancelled: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
}

// Company info constants (from invoice_requirements.txt)
export const COMPANY_INFO = {
  name: 'AMIRTHAM CONSTRUCTIONS',
  address: '1A, Subramani Nagar, Keelkattalai, Chennai 600117',
  phone: '+91 9092 212121',
  email: 'amirthamconstructions@yahoo.com',
  gstin: '33ACKFA9096N1ZO',
  logo: 'assets/logo.jpg',
  bank: {
    accountName: 'Amirtham Constructions',
    bankName: 'STATE BANK OF INDIA',
    accountNo: '44427007958',
    ifsc: 'SBIN0016545',
    branch: 'KILKATTALAI'
  },
  authorizedSignatory: 'Tharun'
};
