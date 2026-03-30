import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { BalanceRow } from '../models/balance-sheet.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BalanceSheetService {

  private url = `${environment.apiUrl}/balance-sheet`;

  constructor(private http: HttpClient) {}

  getAll(company?: string, financialYear?: string): Observable<BalanceRow[]> {
    let params = new HttpParams();
    if (company) params = params.set('company', company);
    if (financialYear) params = params.set('financialYear', financialYear);
    return this.http.get<ApiResponse<BalanceRow[]>>(this.url, { params })
      .pipe(map(res => res.data));
  }

  getByCompanyType(companyType: string): Observable<BalanceRow[]> {
    const company = companyType === 'main' ? 'Main' : 'GST';
    return this.getAll(company);
  }

  create(row: Partial<BalanceRow>): Observable<BalanceRow> {
    return this.http.post<ApiResponse<BalanceRow>>(this.url, row)
      .pipe(map(res => res.data));
  }

  update(id: string, row: Partial<BalanceRow>): Observable<BalanceRow> {
    return this.http.put<ApiResponse<BalanceRow>>(`${this.url}/${id}`, row)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
