import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SiteService } from '../../services/site.service';
import { Site } from '../../models/site.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss'
})
export class SitesComponent implements OnInit, AfterViewInit {
  displayedColumns = ['siteId', 'name', 'clientName', 'company', 'contactNumber', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<Site>();
  searchText = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private siteService: SiteService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  loadData(): void {
    this.loading = true;
    this.siteService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load sites', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(): void { this.dataSource.filter = this.searchText.trim().toLowerCase(); }

  deleteRow(id: string): void {
    if (confirm('Delete this site?')) {
      this.siteService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Site deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete site', 'OK', { duration: 3000 })
      });
    }
  }
}
