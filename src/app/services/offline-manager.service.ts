import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { tap, catchError, concatMap } from 'rxjs/operators';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineManagerService {
  private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  private queueKey = 'offline_request_queue';

  constructor(private http: HttpClient) {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  get isOnline(): boolean {
    return this.isOnline$.value;
  }

  getOnlineStatusObservable(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  private updateOnlineStatus(status: boolean) {
    this.isOnline$.next(status);
    if (status) {
      this.syncQueue().subscribe();
    }
  }

  // Guardar en caché
  setCache(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Leer desde caché
  getCache<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Encolar petición de escritura offline
  queueRequest(url: string, method: 'POST' | 'PUT' | 'DELETE', body: any): Observable<any> {
    const queue = this.getQueue();
    const newRequest: QueuedRequest = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      method,
      body,
      timestamp: Date.now()
    };
    queue.push(newRequest);
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    console.log(`[OfflineManager] Petición encolada localmente (${method} a ${url})`);

    // Devolver un observable ficticio exitoso para no romper el flujo del UI
    return of({ offline: true, ...body });
  }

  private getQueue(): QueuedRequest[] {
    const data = localStorage.getItem(this.queueKey);
    return data ? JSON.parse(data) : [];
  }

  private syncQueue(): Observable<any> {
    const queue = this.getQueue();
    if (queue.length === 0) return of(null);

    console.log(`[OfflineManager] Sincronizando ${queue.length} peticiones encoladas offline...`);

    // Procesar las peticiones secuencialmente para mantener el orden correcto de las acciones
    return from(queue).pipe(
      concatMap(req => {
        let obs: Observable<any>;
        if (req.method === 'POST') {
          obs = this.http.post(req.url, req.body);
        } else if (req.method === 'PUT') {
          obs = this.http.put(req.url, req.body);
        } else {
          obs = this.http.delete(req.url);
        }

        return obs.pipe(
          tap(() => {
            console.log(`[OfflineManager] Petición sincronizada con éxito: ${req.method} a ${req.url}`);
            // Quitar de la cola
            const currentQueue = this.getQueue().filter(q => q.id !== req.id);
            localStorage.setItem(this.queueKey, JSON.stringify(currentQueue));
          }),
          catchError(err => {
            console.error('[OfflineManager] Error sincronizando petición', req, err);
            // Si es un error de cliente (ej. 400 Bad Request, 409 Conflict), lo removemos
            // Si es un error de servidor o conexión (ej. 500 o 0), lo dejamos en la cola para reintentar después
            if (err.status >= 400 && err.status < 500) {
              const currentQueue = this.getQueue().filter(q => q.id !== req.id);
              localStorage.setItem(this.queueKey, JSON.stringify(currentQueue));
            }
            return of(null);
          })
        );
      })
    );
  }
}
