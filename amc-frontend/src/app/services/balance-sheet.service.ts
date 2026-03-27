import { Injectable } from '@angular/core';
import { BalanceRow } from '../models/balance-sheet.model';

@Injectable({ providedIn: 'root' })
export class BalanceSheetService {

  private mockData: Record<string, BalanceRow[]> = {
    main: [
      { id: 'b1', sNo: 1, liability: 'Bank Loan — SBI', liabilityAmount: 500000, asset: 'Land — Velachery Plot', assetAmount: 1200000 },
      { id: 'b2', sNo: 2, liability: 'Vendor Credit — Steel', liabilityAmount: 150000, asset: 'Office Equipment', assetAmount: 75000 },
      { id: 'b3', sNo: 3, liability: 'Mortgage', liabilityAmount: 1000000, asset: 'Building — T. Nagar', assetAmount: 2500000 },
    ],
    gst: [
      { id: 'b4', sNo: 1, liability: 'GST Payable', liabilityAmount: 225000, asset: 'Input Tax Credit', assetAmount: 180000 },
      { id: 'b5', sNo: 2, liability: 'TDS Payable', liabilityAmount: 45000, asset: 'Advance Tax', assetAmount: 60000 },
    ]
  };

  getByCompanyType(companyType: string): BalanceRow[] {
    return this.mockData[companyType] || [];
  }

  // Returns totals for the given entity
  getTotals(companyType: string): { totalLiability: number; totalAsset: number } {
    const rows = this.getByCompanyType(companyType);
    return {
      totalLiability: rows.reduce((s, r) => s + (r.liabilityAmount || 0), 0),
      totalAsset: rows.reduce((s, r) => s + (r.assetAmount || 0), 0)
    };
  }

  create(companyType: string, row: Partial<BalanceRow>): BalanceRow {
    const list = this.mockData[companyType] || [];
    const newRow = { ...row, id: 'b' + Date.now(), sNo: list.length + 1 } as BalanceRow;
    list.push(newRow);
    this.mockData[companyType] = list;
    return newRow;
  }

  delete(companyType: string, id: string): boolean {
    const list = this.mockData[companyType] || [];
    const idx = list.findIndex(r => r.id === id);
    if (idx > -1) { list.splice(idx, 1); return true; }
    return false;
  }
}
