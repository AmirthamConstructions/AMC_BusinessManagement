import { Injectable } from '@angular/core';
import { GstInward } from '../models/gst-inward.model';

@Injectable({ providedIn: 'root' })
export class GstInwardService {

  private mockData: GstInward[] = [
    { id: 'gi1', purchaseBillNo: 'PB/2026/0087', invoiceDate: '2026-03-10', companyName: 'Sri Lakshmi Steel Traders', companyGSTIN: '33AADCS7890H1ZR', description: 'TMT Steel bars — 10mm', taxableValue: 280000, cgstAmount: 25200, sgstAmount: 25200, purchaseBillValue: 330400, inputCreditEligible: 'Yes', remarks: '' },
    { id: 'gi2', purchaseBillNo: 'PB/2026/0088', invoiceDate: '2026-03-22', companyName: 'Ambika Cement Works', companyGSTIN: '33AADCA1234B1ZS', description: 'OPC Cement — 53 Grade', taxableValue: 95000, cgstAmount: 8550, sgstAmount: 8550, purchaseBillValue: 112100, inputCreditEligible: 'Yes', remarks: '' },
    { id: 'gi3', purchaseBillNo: 'PB/2026/0075', invoiceDate: '2026-02-28', companyName: 'Modern Electricals', companyGSTIN: '33BBDME4567C1ZT', description: 'Wiring and switches', taxableValue: 65000, cgstAmount: 5850, sgstAmount: 5850, purchaseBillValue: 76700, inputCreditEligible: 'No', remarks: 'Non-GST item included' },
  ];

  getAll(): GstInward[] { return this.mockData; }

  create(item: Partial<GstInward>): GstInward {
    const newItem = { ...item, id: 'gi' + Date.now() } as GstInward;
    this.mockData.unshift(newItem);
    return newItem;
  }

  update(id: string, item: Partial<GstInward>): GstInward | undefined {
    const idx = this.mockData.findIndex(i => i.id === id);
    if (idx > -1) { this.mockData[idx] = { ...this.mockData[idx], ...item }; return this.mockData[idx]; }
    return undefined;
  }

  delete(id: string): boolean {
    const idx = this.mockData.findIndex(i => i.id === id);
    if (idx > -1) { this.mockData.splice(idx, 1); return true; }
    return false;
  }
}
