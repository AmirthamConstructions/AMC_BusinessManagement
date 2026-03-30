import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PnlService } from '../../services/pnl.service';
import { PnlEntry } from '../../models/pnl.model';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  loading = false;

  constructor(private pnlService: PnlService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.pnlService.getByCompanyType(this.selectedTab).subscribe({
      next: (data) => {
        this.rows = data;
        const totalIncome = data.reduce((sum, r) => sum + (r.incomeAmount || 0), 0);
        const totalExpense = data.reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
        this.totals = { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load P&L data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onTabChange(tab: string): void {
    this.selectedTab = tab;
    this.loadData();
  }

  deleteRow(id: string): void {
    if (confirm('Delete this entry?')) {
      this.pnlService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Entry deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete entry', 'OK', { duration: 3000 })
      });
    }
  }
}
