import { Component, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SharedModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile = false;

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Transactions', icon: 'receipt_long', route: '/transactions' },
    { label: 'Sites', icon: 'location_city', route: '/sites' },
    { label: 'Balance Sheet', icon: 'account_balance', route: '/balance-sheet' },
    { label: 'Profit & Loss', icon: 'trending_up', route: '/profit-loss' },
    { label: 'GST Outward', icon: 'call_made', route: '/gst-outward' },
    { label: 'GST Inward', icon: 'call_received', route: '/gst-inward' },
    { label: 'Materials', icon: 'inventory_2', route: '/materials' },
    { label: 'Dimensions', icon: 'tune', route: '/dimensions' },
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    public auth: AuthService
  ) {
    // Auto-login for dev
    this.auth.autoLogin();

    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });
  }

  // Close sidenav on mobile after clicking a link
  onNavClick(): void {
    if (this.isMobile && this.sidenav) {
      this.sidenav.close();
    }
  }
}
