import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notificacion } from '../../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificacionService {

  private apiUrl = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  getByUsuario(usuarioId: string): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  getNoLeidas(usuarioId: string): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(`${this.apiUrl}/usuario/${usuarioId}/no-leidas`);
  }

  getConteo(usuarioId: string): Observable<{ noLeidas: number }> {
    return this.http.get<{ noLeidas: number }>(`${this.apiUrl}/usuario/${usuarioId}/conteo`);
  }

  marcarLeida(id: string): Observable<Notificacion> {
    return this.http.put<Notificacion>(`${this.apiUrl}/${id}/leer`, {});
  }

  marcarTodasLeidas(usuarioId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuario/${usuarioId}/leer-todas`, {});
  }
}
