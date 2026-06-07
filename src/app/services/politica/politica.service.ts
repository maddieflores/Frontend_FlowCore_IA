import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Politica } from '../../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PoliticaService {

  private apiUrl = `${environment.apiUrl}/politicas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Politica[]> {
    return this.http.get<Politica[]>(this.apiUrl);
  }

  getActivas(): Observable<Politica[]> {
    return this.http.get<Politica[]>(`${this.apiUrl}/activas`);
  }

  getById(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.apiUrl}/${id}`);
  }

  create(politica: Partial<Politica>): Observable<Politica> {
    return this.http.post<Politica>(this.apiUrl, politica);
  }

  update(id: string, politica: Partial<Politica>): Observable<Politica> {
    return this.http.put<Politica>(`${this.apiUrl}/${id}`, politica);
  }

  activar(id: string): Observable<Politica> {
    return this.http.put<Politica>(`${this.apiUrl}/${id}/activar`, {});
  }

  desactivar(id: string): Observable<Politica> {
    return this.http.put<Politica>(`${this.apiUrl}/${id}/desactivar`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
