import { Injectable } from '@angular/core';
import { DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  getData(): DashboardData {
    return {
      kpis: {
        revenue: 4500000,
        expenditure: 2800000,
        totalProfit: 1700000,
        companyExpenses: 350000,
        netProfit: 1350000
      },
      chart1: {
        title: 'Company Profit Growth',
        dates: ['Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'],
        values: [120000, 285000, 410000, 580000, 720000, 850000, 960000, 1050000, 1150000, 1250000, 1350000, 1700000]
      },
      chart2: {
        title: 'Profit % by Site',
        categories: ['Velachery Site', 'Adyar Site', 'T. Nagar Site', 'Tambaram Site'],
        values: [38, 25, 42, 15]
      },
      chart3: {
        title: 'Head-wise Expenditure',
        categories: ['Cement', 'Steel', 'Labour', 'Transport', 'Sand', 'Electrical', 'Others'],
        values: [450000, 680000, 920000, 180000, 310000, 145000, 115000]
      }
    };
  }
}
