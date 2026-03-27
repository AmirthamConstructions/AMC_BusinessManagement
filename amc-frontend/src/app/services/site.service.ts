import { Injectable } from '@angular/core';
import { Site } from '../models/site.model';

@Injectable({ providedIn: 'root' })
export class SiteService {

  private mockData: Site[] = [
    { id: 's1', siteId: 'AC56978', name: 'Velachery Site', clientName: 'Rajesh Kumar', address: 'No. 12, 3rd Cross St, Velachery, Chennai', contactNumber: '9876543210', company: 'Main', expenseHead: 'Construction', incomeHead: 'Project Revenue', paymentMode: 'NEFT', companyAccount: 'HDFC Current A/C', isActive: true },
    { id: 's2', siteId: 'AC82341', name: 'Adyar Site', clientName: 'Suresh Babu', address: '45, Gandhi Nagar, Adyar, Chennai', contactNumber: '9123456789', company: 'Main', expenseHead: 'Construction', incomeHead: 'Project Revenue', paymentMode: 'NEFT', companyAccount: 'HDFC Current A/C', isActive: true },
    { id: 's3', siteId: 'AC34521', name: 'T. Nagar Site', clientName: 'Anand Krishnan', address: '78, South Usman Road, T. Nagar, Chennai', contactNumber: '9988776655', company: 'GST', expenseHead: 'Construction', incomeHead: 'Project Revenue', paymentMode: 'RTGS', companyAccount: 'SBI Savings A/C', isActive: true },
    { id: 's4', siteId: 'AC90012', name: 'Tambaram Site', clientName: 'Priya Raman', address: '12, West Tambaram, Chennai', contactNumber: '9111222333', company: 'Main', expenseHead: 'Construction', incomeHead: 'Project Revenue', paymentMode: 'Cash', companyAccount: 'HDFC Current A/C', isActive: false },
  ];

  getAll(): Site[] {
    return this.mockData;
  }

  getById(id: string): Site | undefined {
    return this.mockData.find(s => s.id === id);
  }

  create(site: Partial<Site>): Site {
    const newSite = { ...site, id: 's' + Date.now(), siteId: 'AC' + Math.floor(10000 + Math.random() * 90000) } as Site;
    this.mockData.unshift(newSite);
    return newSite;
  }

  update(id: string, site: Partial<Site>): Site | undefined {
    const idx = this.mockData.findIndex(s => s.id === id);
    if (idx > -1) { this.mockData[idx] = { ...this.mockData[idx], ...site }; return this.mockData[idx]; }
    return undefined;
  }

  delete(id: string): boolean {
    const idx = this.mockData.findIndex(s => s.id === id);
    if (idx > -1) { this.mockData.splice(idx, 1); return true; }
    return false;
  }
}
