import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {

  private mockData: Transaction[] = [
    { id: '1', transactionId: 'TXN260328143022', date: '2026-03-28', company: 'Main', siteId: 's1', siteName: 'Velachery Site', type: 'Debit', nature: 'Cement Purchase', description: '50 bags OPC cement', amount: 25000, party: 'ACC Dealers Pvt Ltd', invoiceNo: 'INV-2026-0451', gstNo: '33AABCU9603R1ZM', companyAccount: 'HDFC Current A/C', modeOfPayment: 'NEFT', notes: '' },
    { id: '2', transactionId: 'TXN260327091500', date: '2026-03-27', company: 'Main', siteId: 's1', siteName: 'Velachery Site', type: 'Credit', nature: 'Site Payment', description: 'Client advance', amount: 500000, party: 'Rajesh Kumar', invoiceNo: '', gstNo: '', companyAccount: 'HDFC Current A/C', modeOfPayment: 'NEFT', notes: 'Advance for March' },
    { id: '3', transactionId: 'TXN260326120000', date: '2026-03-26', company: 'GST', siteId: 's2', siteName: 'Adyar Site', type: 'Debit', nature: 'Steel Purchase', description: 'TMT bars 10mm - 2 tons', amount: 120000, party: 'Sri Lakshmi Steel', invoiceNo: 'INV-2026-0320', gstNo: '33AADCS7890H1ZR', companyAccount: 'SBI Savings A/C', modeOfPayment: 'RTGS', notes: '' },
    { id: '4', transactionId: 'TXN260325080000', date: '2026-03-25', company: 'Main', siteId: 's3', siteName: 'T. Nagar Site', type: 'Debit', nature: 'Labour Wages', description: 'Weekly wages - 15 workers', amount: 75000, party: 'Murugan Contractor', invoiceNo: '', gstNo: '', companyAccount: 'HDFC Current A/C', modeOfPayment: 'Cash', notes: '' },
    { id: '5', transactionId: 'TXN260324150000', date: '2026-03-24', company: 'Main', siteId: 's2', siteName: 'Adyar Site', type: 'Credit', nature: 'Project Revenue', description: 'Second installment', amount: 350000, party: 'Suresh Babu', invoiceNo: 'REC-2026-0089', gstNo: '', companyAccount: 'HDFC Current A/C', modeOfPayment: 'Cheque', notes: '' },
    { id: '6', transactionId: 'TXN260323110000', date: '2026-03-23', company: 'GST', siteId: 's1', siteName: 'Velachery Site', type: 'Debit', nature: 'Sand', description: 'River sand 3 loads', amount: 45000, party: 'Kaveri Sand Suppliers', invoiceNo: 'INV-2026-0290', gstNo: '33BBBCS5678G2ZQ', companyAccount: 'SBI Savings A/C', modeOfPayment: 'UPI', notes: '' },
  ];

  getAll(): Transaction[] {
    return this.mockData;
  }

  getById(id: string): Transaction | undefined {
    return this.mockData.find(t => t.id === id);
  }

  create(txn: Partial<Transaction>): Transaction {
    const newTxn = { ...txn, id: Date.now().toString(), transactionId: 'TXN' + Date.now() } as Transaction;
    this.mockData.unshift(newTxn);
    return newTxn;
  }

  update(id: string, txn: Partial<Transaction>): Transaction | undefined {
    const idx = this.mockData.findIndex(t => t.id === id);
    if (idx > -1) { this.mockData[idx] = { ...this.mockData[idx], ...txn }; return this.mockData[idx]; }
    return undefined;
  }

  delete(id: string): boolean {
    const idx = this.mockData.findIndex(t => t.id === id);
    if (idx > -1) { this.mockData.splice(idx, 1); return true; }
    return false;
  }
}
