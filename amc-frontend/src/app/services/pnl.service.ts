import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PnlEntry } from '../models/pnl.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PnlService {

  private url = `${environment.apiUrl}/profit-loss`;

  constructor(private http: HttpClient) {}

  getAll(company?: string, financialYear?: string): Observable<PnlEntry[]> {
    let params = new HttpParams();
    if (company) params = params.set('company', company);
    if (financialYear) params = params.set('financialYear', financialYear);
    return this.http.get<ApiResponse<PnlEntry[]>>(this.url, { params })
      .pipe(map(res => res.data));
  }

  getByCompanyType(companyType: string): Observable<PnlEntry[]> {
    const company = companyType === 'main' ? 'Main' : 'GST';
    return this.getAll(company);
  }

  create(entry: Partial<PnlEntry>): Observable<PnlEntry> {
    return this.http.post<ApiResponse<PnlEntry>>(this.url, entry)
      .pipe(map(res => res.data));
  }

  update(id: string, entry: Partial<PnlEntry>): Observable<PnlEntry> {
    return this.http.put<ApiResponse<PnlEntry>>(`${this.url}/${id}`, entry)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
