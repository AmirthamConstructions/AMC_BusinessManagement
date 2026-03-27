import { Injectable } from '@angular/core';
import { PnlEntry } from '../models/pnl.model';

@Injectable({ providedIn: 'root' })
export class PnlService {

  private mockData: Record<string, PnlEntry[]> = {
    main: [
      { id: 'p1', date: '2026-03-15', income: 'Site Revenue — Velachery', incomeAmount: 350000, expense: 'Labour Wages', expenseAmount: 120000 },
      { id: 'p2', date: '2026-03-10', income: 'Site Payment — Adyar', incomeAmount: 200000, expense: 'Cement Purchase', expenseAmount: 85000 },
      { id: 'p3', date: '2026-03-05', income: '', incomeAmount: 0, expense: 'Steel Purchase', expenseAmount: 220000 },
      { id: 'p4', date: '2026-02-28', income: 'Advance Received', incomeAmount: 500000, expense: 'Transport', expenseAmount: 35000 },
    ],
    gst: [
      { id: 'p5', date: '2026-03-20', income: 'GST Project Revenue', incomeAmount: 590000, expense: 'GST Material Cost', expenseAmount: 330400 },
      { id: 'p6', date: '2026-03-12', income: 'GST Service Income', incomeAmount: 141600, expense: 'GST Labour Cost', expenseAmount: 95000 },
    ]
  };

  getByCompanyType(companyType: string): PnlEntry[] {
    return this.mockData[companyType] || [];
  }

  getTotals(companyType: string): { totalIncome: number; totalExpense: number; netProfit: number } {
    const rows = this.getByCompanyType(companyType);
    const totalIncome = rows.reduce((s, r) => s + (r.incomeAmount || 0), 0);
    const totalExpense = rows.reduce((s, r) => s + (r.expenseAmount || 0), 0);
    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }

  create(companyType: string, entry: Partial<PnlEntry>): PnlEntry {
    const list = this.mockData[companyType] || [];
    const newEntry = { ...entry, id: 'p' + Date.now() } as PnlEntry;
    list.unshift(newEntry);
    this.mockData[companyType] = list;
    return newEntry;
  }

  delete(companyType: string, id: string): boolean {
    const list = this.mockData[companyType] || [];
    const idx = list.findIndex(r => r.id === id);
    if (idx > -1) { list.splice(idx, 1); return true; }
    return false;
  }
}
