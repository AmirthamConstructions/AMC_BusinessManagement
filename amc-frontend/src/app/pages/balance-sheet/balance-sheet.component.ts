import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { BalanceSheetService } from '../../services/balance-sheet.service';
import { BalanceRow } from '../../models/balance-sheet.model';

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

  constructor(private bsService: BalanceSheetService) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.rows = this.bsService.getByCompanyType(this.selectedTab);
    this.totals = this.bsService.getTotals(this.selectedTab);
  }

  onTabChange(tab: string): void {
    this.selectedTab = tab;
    this.loadData();
  }

  deleteRow(id: string): void {
    this.bsService.delete(this.selectedTab, id);
    this.loadData();
  }
}
