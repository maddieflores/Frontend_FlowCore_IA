import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private apiUrl = `${environment.apiUrl}/documentos`;

  constructor(private http: HttpClient) { }

  getUploadUrl(data: {
    nombre: string;
    contentType: string;
    tamanoBytes: number;
    tramiteId: string;
    tareaId?: string;
    subidoPorId?: string;
    subidoPorNombre?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/upload-url`, data);
  }

  registerDocument(data: {
    nombre: string;
    s3Key: string;
    contentType: string;
    tamanoBytes: number;
    tramiteId: string;
    tareaId?: string;
    subidoPorId?: string;
    subidoPorNombre?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data);
  }

  getByTramite(tramiteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tramite/${tramiteId}`);
  }

  getDownloadUrl(documentId: string): Observable<{ downloadUrl: string }> {
    return this.http.get<{ downloadUrl: string }>(`${this.apiUrl}/${documentId}/download-url`);
  }

  delete(documentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${documentId}`);
  }

  uploadToStorage(uploadUrl: string, file: File): Observable<any> {
    return this.http.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    });
  }
}
