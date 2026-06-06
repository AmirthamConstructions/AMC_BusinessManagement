import { Injectable, signal, effect } from '@angular/core';

export type CompanyFilter = 'All' | 'Main' | 'GST';

@Injectable({ providedIn: 'root' })
export class CompanyFilterService {

  private readonly STORAGE_KEY = 'amc_company_filter';

  /** Reactive signal holding the current company filter */
  selectedCompany = signal<CompanyFilter>(this.loadFromStorage());

  constructor() {
    // Persist to localStorage whenever the signal changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, this.selectedCompany());
    });
  }

  setCompany(company: CompanyFilter): void {
    this.selectedCompany.set(company);
  }

  /** Returns the company string to pass to backend, or undefined for 'All' */
  getCompanyParam(): string | undefined {
    const c = this.selectedCompany();
    return c === 'All' ? undefined : c;
  }

  private loadFromStorage(): CompanyFilter {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'Main' || stored === 'GST') return stored;
    return 'All';
  }
}
