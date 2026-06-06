import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { BalanceSheetService } from '../../services/balance-sheet.service';
import { BalanceRow } from '../../models/balance-sheet.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './balance-sheet.component.html',
  styleUrl: './balance-sheet.component.scss'
})
export class BalanceSheetComponent implements OnInit {
  selectedTab = 'main';
  rows: BalanceRow[] = [];
  totals = { totalLiability: 0, totalAsset: 0 };
  displayedColumns = ['sNo', 'liability', 'liabilityAmount', 'asset', 'assetAmount', 'actions'];
  loading = false;

  // Combined view totals (R7.4)
  combinedTotals = {
    mainLiability: 0, mainAsset: 0,
    gstLiability: 0, gstAsset: 0,
    totalLiability: 0, totalAsset: 0
  };

  constructor(private bsService: BalanceSheetService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    if (this.selectedTab === 'combined') {
      this.loadCombined();
    } else {
      this.bsService.getByCompanyType(this.selectedTab).subscribe({
        next: (data) => {
          this.rows = data;
          this.totals = {
            totalLiability: data.reduce((sum, r) => sum + (r.liabilityAmount || 0), 0),
            totalAsset: data.reduce((sum, r) => sum + (r.assetAmount || 0), 0)
          };
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('Failed to load balance sheet', 'OK', { duration: 3000 });
          this.loading = false;
        }
      });
    }
  }

  loadCombined(): void {
    forkJoin({
      main: this.bsService.getByCompanyType('main'),
      gst: this.bsService.getByCompanyType('gst')
    }).subscribe({
      next: ({ main, gst }) => {
        this.rows = [...main, ...gst];

        const mainLiability = main.reduce((s, r) => s + (r.liabilityAmount || 0), 0);
        const mainAsset = main.reduce((s, r) => s + (r.assetAmount || 0), 0);
        const gstLiability = gst.reduce((s, r) => s + (r.liabilityAmount || 0), 0);
        const gstAsset = gst.reduce((s, r) => s + (r.assetAmount || 0), 0);

        this.combinedTotals = {
          mainLiability, mainAsset,
          gstLiability, gstAsset,
          totalLiability: mainLiability + gstLiability,
          totalAsset: mainAsset + gstAsset
        };

        this.totals = {
          totalLiability: this.combinedTotals.totalLiability,
          totalAsset: this.combinedTotals.totalAsset
        };
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load combined balance sheet', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onTabChange(tab: string): void {
    this.selectedTab = tab;
    this.loadData();
  }

  deleteRow(id: string): void {
    if (confirm('Delete this row?')) {
      this.bsService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Row deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete row', 'OK', { duration: 3000 })
      });
    }
  }

  formatCurrency(val: number): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
