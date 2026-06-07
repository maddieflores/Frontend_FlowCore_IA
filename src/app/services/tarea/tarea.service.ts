import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Tarea } from '../../models/models';
import { environment } from '../../../environments/environment';
import { OfflineManagerService } from '../offline-manager.service';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private apiUrl = `${environment.apiUrl}/tareas`;

  constructor(
    private http: HttpClient,
    private offlineManager: OfflineManagerService
  ) { }

  getByFuncionario(funcionarioId: string): Observable<Tarea[]> {
    const cacheKey = `tareas_func_${funcionarioId}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tarea[]>(cacheKey);
      if (cached) {
        console.log(`[TareaService] Retornando tareas de funcionario desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tarea[]>(`${this.apiUrl}/funcionario/${funcionarioId}`).pipe(
      tap(tareas => this.offlineManager.setCache(cacheKey, tareas))
    );
  }

  getByDepartamento(departamento: string): Observable<Tarea[]> {
    const cacheKey = `tareas_dept_${departamento}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tarea[]>(cacheKey);
      if (cached) {
        console.log(`[TareaService] Retornando tareas de departamento desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tarea[]>(`${this.apiUrl}/departamento/${encodeURIComponent(departamento)}`).pipe(
      tap(tareas => this.offlineManager.setCache(cacheKey, tareas))
    );
  }

  getById(id: string): Observable<Tarea> {
    const cacheKey = `tarea_${id}`;
    if (!this.offlineManager.isOnline) {
      const cached = this.offlineManager.getCache<Tarea>(cacheKey);
      if (cached) {
        console.log(`[TareaService] Retornando detalle de tarea desde caché local.`);
        return of(cached);
      }
    }
    return this.http.get<Tarea>(`${this.apiUrl}/${id}`).pipe(
      tap(tarea => this.offlineManager.setCache(cacheKey, tarea))
    );
  }

  actualizarEstado(id: string, estado: string): Observable<Tarea> {
    const url = `${this.apiUrl}/${id}/estado`;
    if (!this.offlineManager.isOnline) {
      return this.offlineManager.queueRequest(url, 'PUT', { estado });
    }
    return this.http.put<Tarea>(url, { estado });
  }

  completar(id: string, formularioDatos: any): Observable<void> {
    const url = `${this.apiUrl}/${id}/completar`;
    if (!this.offlineManager.isOnline) {
      return this.offlineManager.queueRequest(url, 'PUT', formularioDatos);
    }
    return this.http.put<void>(url, formularioDatos);
  }
}

