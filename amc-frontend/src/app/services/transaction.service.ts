import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Transaction } from '../models/transaction.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {

  private url = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 50, sortBy = 'date', direction = 'desc'): Observable<{ data: Transaction[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<Transaction[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getById(id: string): Observable<Transaction> {
    return this.http.get<ApiResponse<Transaction>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  getByCompany(company: string, page = 0, size = 50): Observable<{ data: Transaction[]; meta?: PaginationMeta }> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<Transaction[]>>(`${this.url}/company/${company}`, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getBySiteId(siteId: string, page = 0, size = 50): Observable<{ data: Transaction[]; meta?: PaginationMeta }> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<Transaction[]>>(`${this.url}/site/${siteId}`, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getByDateRange(startDate: string, endDate: string): Observable<Transaction[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<ApiResponse<Transaction[]>>(`${this.url}/date-range`, { params })
      .pipe(map(res => res.data));
  }

  create(txn: Partial<Transaction>): Observable<Transaction> {
    return this.http.post<ApiResponse<Transaction>>(this.url, txn)
      .pipe(map(res => res.data));
  }

  update(id: string, txn: Partial<Transaction>): Observable<Transaction> {
    return this.http.put<ApiResponse<Transaction>>(`${this.url}/${id}`, txn)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
