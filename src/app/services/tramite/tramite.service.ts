import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Tramite } from '../../models/models';
import { environment } from '../../../environments/environment';
import { OfflineManagerService } from '../offline-manager.service';

@Injectable({ providedIn: 'root' })
export class TramiteService {

  private apiUrl = `${environment.apiUrl}/tramites`;

  constructor(
    private http: HttpClient,
    private offlineManager: OfflineManagerService
  ) { }

  getAll(): Observable<Tramite[]> {
    const cacheKey = `tramites_all`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tramite[]>(cacheKey);
      if (cached) {
        console.log(`[TramiteService] Retornando trámites desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tramite[]>(this.apiUrl).pipe(
      tap(tramites => this.offlineManager.setCache(cacheKey, tramites))
    );
  }

  getById(id: string): Observable<Tramite> {
    const cacheKey = `tramite_${id}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tramite>(cacheKey);
      if (cached) {
        console.log(`[TramiteService] Retornando trámite desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tramite>(`${this.apiUrl}/${id}`).pipe(
      tap(tramite => this.offlineManager.setCache(cacheKey, tramite))
    );
  }

  getByCliente(clienteId: string): Observable<Tramite[]> {
    const cacheKey = `tramites_cliente_${clienteId}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tramite[]>(cacheKey);
      if (cached) {
        console.log(`[TramiteService] Retornando trámites de cliente desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tramite[]>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
      tap(tramites => this.offlineManager.setCache(cacheKey, tramites))
    );
  }

  getProgreso(id: string): Observable<any> {
    const cacheKey = `tramite_progreso_${id}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<any>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }
    return this.http.get<any>(`${this.apiUrl}/${id}/progreso`).pipe(
      tap(progreso => this.offlineManager.setCache(cacheKey, progreso))
    );
  }

  getByReferencia(ref: string): Observable<Tramite> {
    const cacheKey = `tramite_ref_${ref}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tramite>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }
    return this.http.get<Tramite>(`${this.apiUrl}/referencia/${ref}`).pipe(
      tap(tramite => this.offlineManager.setCache(cacheKey, tramite))
    );
  }

  iniciar(politicaId: string, clienteId: string, descripcion = ''): Observable<Tramite> {
    const url = `${this.apiUrl}/iniciar?politicaId=${politicaId}&clienteId=${clienteId}&descripcion=${encodeURIComponent(descripcion)}`;
    if (!this.offlineManager.isOnline) {
      return this.offlineManager.queueRequest(url, 'POST', {});
    }
    return this.http.post<Tramite>(url, {});
  }

  iniciarPorEmail(politicaId: string, clienteEmail: string, descripcion = ''): Observable<Tramite> {
    const url = `${this.apiUrl}/iniciar-por-email?politicaId=${politicaId}&clienteEmail=${encodeURIComponent(clienteEmail)}&descripcion=${encodeURIComponent(descripcion)}`;
    if (!this.offlineManager.isOnline) {
      return this.offlineManager.queueRequest(url, 'POST', {});
    }
    return this.http.post<Tramite>(url, {});
  }

  iniciarPorAdmin(tramiteId: string): Observable<Tramite> {
    const url = `${this.apiUrl}/${tramiteId}/iniciar`;
    if (!this.offlineManager.isOnline) {
      return this.offlineManager.queueRequest(url, 'PUT', {});
    }
    return this.http.put<Tramite>(url, {});
  }

  descargarPdf(tramiteId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/pdf/tramite/${tramiteId}`, {
      responseType: 'blob'
    });
  }
}

