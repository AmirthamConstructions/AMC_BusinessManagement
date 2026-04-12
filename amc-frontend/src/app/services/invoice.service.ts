import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invoice } from '../models/invoice.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {

  private url = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 50, sortBy = 'invoiceDate', direction = 'desc'): Observable<{ data: Invoice[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<Invoice[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getById(id: string): Observable<Invoice> {
    return this.http.get<ApiResponse<Invoice>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  getNextNumber(): Observable<string> {
    return this.http.get<ApiResponse<{ invoiceNo: string }>>(`${this.url}/next-number`)
      .pipe(map(res => res.data.invoiceNo));
  }

  searchByCustomer(name: string): Observable<Invoice[]> {
    const params = new HttpParams().set('customerName', name);
    return this.http.get<ApiResponse<Invoice[]>>(`${this.url}/search`, { params })
      .pipe(map(res => res.data));
  }

  create(invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.post<ApiResponse<Invoice>>(this.url, invoice)
      .pipe(map(res => res.data));
  }

  update(id: string, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<ApiResponse<Invoice>>(`${this.url}/${id}`, invoice)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
