import { Injectable } from '@angular/core';
import { GstOutward } from '../models/gst-outward.model';

@Injectable({ providedIn: 'root' })
export class GstOutwardService {

  private mockData: GstOutward[] = [
    { id: 'go1', year: '2025-26', invoiceMonth: 'March', filingMonth: 'April', invoiceNo: 'GST/OUT/2026/0134', invoiceDate: '2026-03-15', customerName: 'Rajesh Builders Pvt Ltd', customerGSTIN: '33AABCR1234F1ZP', description: 'Construction services — Velachery', taxableValue: 500000, cgstPercent: 9, cgstAmount: 45000, sgstPercent: 9, sgstAmount: 45000, invoiceValue: 590000, placeOfSupply: 'Tamil Nadu (33)', inputCreditEligible: 'Yes', remarks: '' },
    { id: 'go2', year: '2025-26', invoiceMonth: 'March', filingMonth: 'April', invoiceNo: 'GST/OUT/2026/0135', invoiceDate: '2026-03-20', customerName: 'Sri Constructions', customerGSTIN: '33BBBCS5678G2ZQ', description: 'Sand supply', taxableValue: 120000, cgstPercent: 9, cgstAmount: 10800, sgstPercent: 9, sgstAmount: 10800, invoiceValue: 141600, placeOfSupply: 'Tamil Nadu (33)', inputCreditEligible: 'Yes', remarks: '' },
    { id: 'go3', year: '2025-26', invoiceMonth: 'February', filingMonth: 'March', invoiceNo: 'GST/OUT/2026/0120', invoiceDate: '2026-02-18', customerName: 'AK Enterprises', customerGSTIN: '33CCCAK9012J3ZR', description: 'Interior works — T. Nagar', taxableValue: 300000, cgstPercent: 9, cgstAmount: 27000, sgstPercent: 9, sgstAmount: 27000, invoiceValue: 354000, placeOfSupply: 'Tamil Nadu (33)', inputCreditEligible: 'No', remarks: 'Partial billing' },
  ];

  getAll(): GstOutward[] { return this.mockData; }

  create(item: Partial<GstOutward>): GstOutward {
    const newItem = { ...item, id: 'go' + Date.now() } as GstOutward;
    this.mockData.unshift(newItem);
    return newItem;
  }

  update(id: string, item: Partial<GstOutward>): GstOutward | undefined {
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
