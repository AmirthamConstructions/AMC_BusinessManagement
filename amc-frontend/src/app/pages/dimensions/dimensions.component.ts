import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DimensionService } from '../../services/dimension.service';
import { Dimension } from '../../models/dimension.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dimensions',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dimensions.component.html',
  styleUrl: './dimensions.component.scss'
})
export class DimensionsComponent implements OnInit {
  dimensions: Dimension[] = [];
  newValues: Record<string, string> = {};

  constructor(private dimService: DimensionService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.dimensions = this.dimService.getAll();
    this.dimensions.forEach(d => this.newValues[d.name] = '');
  }

  addValue(name: string): void {
    const val = this.newValues[name]?.trim();
    if (!val) return;
    const success = this.dimService.addValue(name, val);
    if (success) {
      this.newValues[name] = '';
      this.loadData();
      this.snackBar.open(`Added "${val}" to ${name}`, 'OK', { duration: 2000 });
    } else {
      this.snackBar.open('Value already exists', 'OK', { duration: 2000 });
    }
  }

  removeValue(name: string, value: string): void {
    this.dimService.removeValue(name, value);
    this.loadData();
    this.snackBar.open(`Removed "${value}"`, 'OK', { duration: 2000 });
  }
}
