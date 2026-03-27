import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardData } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data!: DashboardData;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.data = this.dashboardService.getData();
  }

  // Format number as Indian currency string
  formatCurrency(val: number): string {
    return '₹' + val.toLocaleString('en-IN');
  }
}
