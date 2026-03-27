import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PnlService } from '../../services/pnl.service';
import { PnlEntry } from '../../models/pnl.model';

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './profit-loss.component.html',
  styleUrl: './profit-loss.component.scss'
})
export class ProfitLossComponent implements OnInit {
  selectedTab = 'main';
  rows: PnlEntry[] = [];
  totals = { totalIncome: 0, totalExpense: 0, netProfit: 0 };
  displayedColumns = ['date', 'income', 'incomeAmount', 'expense', 'expenseAmount', 'actions'];

  constructor(private pnlService: PnlService) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.rows = this.pnlService.getByCompanyType(this.selectedTab);
    this.totals = this.pnlService.getTotals(this.selectedTab);
  }

  onTabChange(tab: string): void {
    this.selectedTab = tab;
    this.loadData();
  }

  deleteRow(id: string): void {
    this.pnlService.delete(this.selectedTab, id);
    this.loadData();
  }
}
