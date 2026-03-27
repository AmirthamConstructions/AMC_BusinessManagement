import { Injectable } from '@angular/core';
import { Dimension } from '../models/dimension.model';

@Injectable({ providedIn: 'root' })
export class DimensionService {

  private mockData: Dimension[] = [
    { id: 'd1', name: 'Income Head', values: ['Project Revenue', 'Site Payment', 'Advance Received'] },
    { id: 'd2', name: 'Expense Head', values: ['Cement Purchase', 'Labour Wages', 'Steel Purchase', 'Transport', 'Sand', 'Plumbing Materials', 'Electrical'] },
    { id: 'd3', name: 'Payment Mode', values: ['Cash', 'NEFT', 'UPI', 'Cheque', 'RTGS'] },
    { id: 'd4', name: 'Company Account', values: ['HDFC Current A/C', 'SBI Savings A/C', 'ICICI Current A/C'] },
  ];

  getAll(): Dimension[] { return this.mockData; }

  getByName(name: string): Dimension | undefined {
    return this.mockData.find(d => d.name === name);
  }

  addValue(name: string, value: string): boolean {
    const dim = this.mockData.find(d => d.name === name);
    if (dim && !dim.values.includes(value)) { dim.values.push(value); return true; }
    return false;
  }

  removeValue(name: string, value: string): boolean {
    const dim = this.mockData.find(d => d.name === name);
    if (dim) { dim.values = dim.values.filter(v => v !== value); return true; }
    return false;
  }
}
