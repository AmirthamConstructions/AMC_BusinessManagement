import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'transactions', loadComponent: () => import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent) },
      { path: 'sites', loadComponent: () => import('./pages/sites/sites.component').then(m => m.SitesComponent) },
      { path: 'balance-sheet', loadComponent: () => import('./pages/balance-sheet/balance-sheet.component').then(m => m.BalanceSheetComponent) },
      { path: 'profit-loss', loadComponent: () => import('./pages/profit-loss/profit-loss.component').then(m => m.ProfitLossComponent) },
      { path: 'gst-outward', loadComponent: () => import('./pages/gst-outward/gst-outward.component').then(m => m.GstOutwardComponent) },
      { path: 'gst-inward', loadComponent: () => import('./pages/gst-inward/gst-inward.component').then(m => m.GstInwardComponent) },
      { path: 'materials', loadComponent: () => import('./pages/materials/materials.component').then(m => m.MaterialsComponent) },
      { path: 'dimensions', loadComponent: () => import('./pages/dimensions/dimensions.component').then(m => m.DimensionsComponent) },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
