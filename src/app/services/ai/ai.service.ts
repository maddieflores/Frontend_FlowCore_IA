import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AIService {

  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) { }

  procesarPromptDiagrama(prompt: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/diagrama`,
      { prompt },
      { responseType: 'text' }
    );
  }

  extraerDatosDocumento(texto: string, nombreNodo: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/extraer-datos`,
      { texto, nombreNodo },
      { responseType: 'text' }
    );
  }

  detectarCuellosBottella(politicaId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cuellos-botella/${politicaId}`);
  }

  asistente(pregunta: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/asistente`,
      { pregunta },
      { responseType: 'text' }
    );
  }

  generarPlantUML(politicaId: string): Observable<{ plantuml: string }> {
    return this.http.get<{ plantuml: string }>(`${this.apiUrl}/plantuml/${politicaId}`);
  }

  generarReporte(prompt: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate-report`, { prompt });
  }
}                  