import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Departamento {
  id: string;
  nombre: string;
  descripcion?: string;
  responsableId?: string;
  fechaCreacion?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private apiUrl = `${environment.apiUrl}/departamentos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(this.apiUrl);
  }

  create(data: Partial<Departamento>): Observable<Departamento> {
    return this.http.post<Departamento>(this.apiUrl, data);
  }

  update(id: string, data: Partial<Departamento>): Observable<Departamento> {
    return this.http.put<Departamento>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
