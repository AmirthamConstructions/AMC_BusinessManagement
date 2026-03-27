import { Component, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  displayedColumns = ['date', 'transactionId', 'siteName', 'type', 'nature', 'amount', 'party', 'modeOfPayment', 'actions'];
  dataSource = new MatTableDataSource<Transaction>();
  searchText = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private txnService: TransactionService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.dataSource.data = this.txnService.getAll();
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }

  deleteRow(id: string): void {
    if (confirm('Delete this transaction?')) {
      this.txnService.delete(id);
      this.loadData();
      this.snackBar.open('Transaction deleted', 'OK', { duration: 2000 });
    }
  }

  // Color chip based on type
  getTypeClass(type: string): string {
    return type === 'Credit' ? 'chip-credit' : 'chip-debit';
  }
}
