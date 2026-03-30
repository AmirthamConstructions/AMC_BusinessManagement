export interface Site {
  id: string;
  siteId: string;
  name: string;
  clientName: string;
  address: string;
  contactNumber: string;
  company: 'Main' | 'GST';
  quotationAmount: number;
  dateOfStart: string;
  dueDate: string;
  profit: number;
  profitDate: string;
  expenseHead: string;
  incomeHead: string;
  paymentMode: string;
  companyAccount: string;
  isActive: boolean;
}
