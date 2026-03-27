import { Injectable } from '@angular/core';
import { Material } from '../models/material.model';

@Injectable({ providedIn: 'root' })
export class MaterialService {

  private mockData: Material[] = [
    { id: 'm1', date: '2026-03-20', billNo: 'BN-2026-0445', itemName: 'OPC Cement — 53 Grade', quantity: '50 bags', rate: 420, amount: 21000, siteId: 's1', siteName: 'Velachery Site', shopName: 'Sri Vinayaga Building Materials', notes: '' },
    { id: 'm2', date: '2026-03-18', billNo: 'BN-2026-0440', itemName: 'River Sand — Fine', quantity: '2 loads', rate: 15000, amount: 30000, siteId: 's2', siteName: 'Adyar Site', shopName: 'Kaveri Sand Suppliers', notes: '' },
    { id: 'm3', date: '2026-03-15', billNo: 'BN-2026-0435', itemName: 'TMT Steel 10mm', quantity: '2 tons', rate: 58000, amount: 116000, siteId: 's1', siteName: 'Velachery Site', shopName: 'Sri Lakshmi Steel Traders', notes: 'Delivered directly' },
    { id: 'm4', date: '2026-03-12', billNo: 'BN-2026-0430', itemName: 'Bricks — Red Clay', quantity: '5000 nos', rate: 8, amount: 40000, siteId: 's3', siteName: 'T. Nagar Site', shopName: 'KVR Bricks', notes: '' },
  ];

  getAll(): Material[] { return this.mockData; }

  create(mat: Partial<Material>): Material {
    const newMat = { ...mat, id: 'm' + Date.now() } as Material;
    this.mockData.unshift(newMat);
    return newMat;
  }

  update(id: string, mat: Partial<Material>): Material | undefined {
    const idx = this.mockData.findIndex(m => m.id === id);
    if (idx > -1) { this.mockData[idx] = { ...this.mockData[idx], ...mat }; return this.mockData[idx]; }
    return undefined;
  }

  delete(id: string): boolean {
    const idx = this.mockData.findIndex(m => m.id === id);
    if (idx > -1) { this.mockData.splice(idx, 1); return true; }
    return false;
  }
}
