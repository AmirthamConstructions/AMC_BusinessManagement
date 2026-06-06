import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PnlService } from '../../services/pnl.service';
import { PnlEntry } from '../../models/pnl.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

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

  // Combined view totals (R7.4)
  combinedTotals = {
    mainIncome: 0, mainExpense: 0, mainNet: 0,
    gstIncome: 0, gstExpense: 0, gstNet: 0,
    totalIncome: 0, totalExpense: 0, totalNet: 0
  };

  constructor(private pnlService: PnlService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    if (this.selectedTab === 'combined') {
      this.loadCombined();
    } else {
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
  }

  loadCombined(): void {
    forkJoin({
      main: this.pnlService.getByCompanyType('main'),
      gst: this.pnlService.getByCompanyType('gst')
    }).subscribe({
      next: ({ main, gst }) => {
        // Merge rows — show all entries from both
        this.rows = [...main, ...gst].sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
        });

        const mainIncome = main.reduce((s, r) => s + (r.incomeAmount || 0), 0);
        const mainExpense = main.reduce((s, r) => s + (r.expenseAmount || 0), 0);
        const gstIncome = gst.reduce((s, r) => s + (r.incomeAmount || 0), 0);
        const gstExpense = gst.reduce((s, r) => s + (r.expenseAmount || 0), 0);

        this.combinedTotals = {
          mainIncome, mainExpense, mainNet: mainIncome - mainExpense,
          gstIncome, gstExpense, gstNet: gstIncome - gstExpense,
          totalIncome: mainIncome + gstIncome,
          totalExpense: mainExpense + gstExpense,
          totalNet: (mainIncome + gstIncome) - (mainExpense + gstExpense)
        };

        this.totals = {
          totalIncome: this.combinedTotals.totalIncome,
          totalExpense: this.combinedTotals.totalExpense,
          netProfit: this.combinedTotals.totalNet
        };
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load combined P&L data', 'OK', { duration: 3000 });
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

  formatCurrency(val: number): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
