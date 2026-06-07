import { Component, OnInit } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AIService } from '../../services/ai/ai.service';
import { DepartamentoService, Departamento } from '../../services/departamento/departamento.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, UpperCasePipe],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/reportes" [navItems]="navItems" />
      <main class="main-content">

        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h1 class="page-title">🤖 Generador de Reportes con IA</h1>
            <p class="page-sub">Generación conversacional de reportes ejecutivos usando procesamiento NLP</p>
          </div>
          <button class="theme-btn-header" (click)="themeService.toggle()"
            [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
            {{ themeService.isDark() ? '☀️' : '🌙' }}
          </button>
        </div>

        <div class="reportes-grid">
          <!-- PANEL DE CONTROL -->
          <div class="glass-card main-panel">
            <h3 class="panel-section-title">✍️ Solicitar Reporte Ejecutivo</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px; line-height: 1.5;">
              La IA analizará tu solicitud y validará que especifiques tres variables obligatorias:
              <strong style="color: var(--primary)">Departamento/Proceso</strong>,
              <strong style="color: var(--warning)">Período de Evaluación</strong> y
              <strong style="color: var(--success)">Formato de Salida</strong>.
            </p>

            <div class="search-box">
              <input type="text" class="form-input prompt-input"
                     placeholder="Ej: Genera un reporte de Finanzas de los últimos 3 meses en formato Markdown..."
                     [(ngModel)]="promptReporte" (keyup.enter)="generarReporte()" [disabled]="loadingReporte">
              <button class="btn-icon" (click)="toggleVoice()" [class.recording]="isRecording" title="Dictado por voz">
                {{ isRecording ? '🛑' : '🎙️' }}
              </button>
              <button class="btn-primary" (click)="generarReporte()" [disabled]="!promptReporte.trim() || loadingReporte">
                {{ loadingReporte ? '⏳ Procesando...' : '½ Generar' }}
              </button>
            </div>

            <!-- INTERFAZ CONVERSACIONAL DE ACLARACIÓN -->
            @if (resultadoReporte && resultadoReporte.falta_informacion) {
              <div class="clarification-card">
                <div class="clarification-header">
                  <span class="clarification-icon">💬</span>
                  <div>
                    <h4 class="clarification-title">Aclaración Requerida por la IA</h4>
                    <p class="clarification-msg">{{ resultadoReporte.mensaje }}</p>
                  </div>
                </div>

                <div class="clarification-fields">
                  <!-- Departamento -->
                  @if (isVariableFaltante('departamento')) {
                    <div class="clarification-field-group">
                      <label class="form-label">🏢 Seleccionar Departamento/Proceso:</label>
                      <div class="quick-options">
                        @for (dept of departamentosList; track dept) {
                          <button class="btn-quick" (click)="setVariable('departamento', dept)"
                                  [class.selected]="tempVars.departamento === dept">
                            {{ dept }}
                          </button>
                        }
                        <input type="text" class="form-input form-input-sm inline-input"
                               placeholder="Otro..." [(ngModel)]="tempVars.departamento">
                      </div>
                    </div>
                  }

                  <!-- Período / Rango de tiempo -->
                  @if (isVariableFaltante('rango_tiempo')) {
                    <div class="clarification-field-group">
                      <label class="form-label">⏱️ Rango de Tiempo / Período:</label>
                      <div class="quick-options">
                        @for (period of periodosList; track period) {
                          <button class="btn-quick" (click)="setVariable('rango_tiempo', period)"
                                  [class.selected]="tempVars.rango_tiempo === period">
                            {{ period }}
                          </button>
                        }
                        <input type="text" class="form-input form-input-sm inline-input"
                               placeholder="Otro..." [(ngModel)]="tempVars.rango_tiempo">
                      </div>
                    </div>
                  }

                  <!-- Formato -->
                  @if (isVariableFaltante('formato')) {
                    <div class="clarification-field-group">
                      <label class="form-label">📄 Formato de Salida:</label>
                      <div class="quick-options">
                        @for (fmt of formatosList; track fmt) {
                          <button class="btn-quick" (click)="setVariable('formato', fmt)"
                                  [class.selected]="tempVars.formato === fmt">
                            {{ fmt }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="clarification-actions">
                  <button class="btn-outline" (click)="cancelarReporte()">Reiniciar</button>
                  <button class="btn-primary" (click)="completarReporte()"
                          [disabled]="!isClarificacionValida() || loadingReporte">
                    🚀 Completar y Generar Reporte
                  </button>
                </div>
              </div>
            }

            @if (resultadoReporte && resultadoReporte.error) {
              <div class="error-card">
                ❌ {{ resultadoReporte.error }}
              </div>
            }
          </div>

          <!-- VISUALIZACIÓN DEL REPORTE GENERADO -->
          @if (resultadoReporte && !resultadoReporte.falta_informacion && !resultadoReporte.error) {
            <div class="glass-card report-result-card animate-fade-in">
              <div class="report-header">
                <div>
                  <span class="report-badge">{{ resultadoReporte.formato | uppercase }}</span>
                  <h2 class="report-title">📄 {{ resultadoReporte.titulo }}</h2>
                  <p class="report-intro">{{ resultadoReporte.introduccion }}</p>
                </div>
                <div class="report-actions">
                  <button class="btn-outline btn-copy" (click)="copiarMarkdown()" [disabled]="copiado">
                    {{ copiado ? '✓ Copiado' : '📋 Copiar' }}
                  </button>
                </div>
              </div>

              <!-- Contenido principal en markdown -->
              <div class="report-content">
                <pre class="markdown-preview">{{ resultadoReporte.contenido_markdown }}</pre>
              </div>

              <!-- Metodología -->
              <div class="report-footer-meta">
                <strong>🔍 METODOLOGÍA:</strong> {{ resultadoReporte.metodologia }}
              </div>

              <!-- Conclusiones y Sugerencias -->
              <div class="report-analysis-row">
                <div class="analysis-box conclusions-box">
                  <h4>🎯 Conclusiones del Análisis</h4>
                  <ul>
                    @for (c of resultadoReporte.conclusiones; track c) {
                      <li>{{ c }}</li>
                    }
                  </ul>
                </div>
                <div class="analysis-box suggestions-box">
                  <h4>⚡ Sugerencias de Optimización</h4>
                  <ul>
                    @for (s of resultadoReporte.sugerencias_optimizacion; track s) {
                      <li>{{ s }}</li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          }
        </div>

      </main>
    </div>
  `,
  styles: [`
    .reportes-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 30px;
    }

    .main-panel {
      padding: 24px;
    }

    .panel-section-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 10px;
      color: var(--text);
    }

    .search-box {
      display: flex;
      gap: 12px;
    }

    .prompt-input {
      flex: 1;
      height: 46px;
      font-size: 14px;
      padding: 0 16px;
    }

    /* CLARIFICATION CARD */
    .clarification-card {
      margin-top: 20px;
      background: rgba(234, 179, 8, 0.05);
      border: 1px solid rgba(234, 179, 8, 0.2);
      border-radius: 12px;
      padding: 20px;
      animation: slideDown 0.25s ease;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .clarification-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .clarification-icon {
      font-size: 24px;
    }

    .clarification-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--warning);
      margin: 0 0 4px;
    }

    .clarification-msg {
      font-size: 13px;
      color: var(--text);
      margin: 0;
      line-height: 1.5;
    }

    .clarification-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .clarification-field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quick-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .btn-quick {
      padding: 6px 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .btn-quick:hover {
      background: var(--border);
      color: var(--text);
    }

    .btn-quick.selected {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    .inline-input {
      width: 140px;
      height: 30px;
      font-size: 12px;
      padding: 0 8px;
    }

    .clarification-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* ERROR CARD */
    .error-card {
      margin-top: 20px;
      background: rgba(220, 53, 69, 0.08);
      border: 1px solid rgba(220, 53, 69, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #ef4444;
    }

    /* REPORT RESULT CARD */
    .report-result-card {
      padding: 24px;
      background: var(--card);
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .report-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary);
      margin: 8px 0 6px;
    }

    .report-intro {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    .report-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .report-content {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
      max-height: 500px;
      overflow-y: auto;
    }

    .markdown-preview {
      white-space: pre-wrap;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      color: var(--text);
    }

    .report-footer-meta {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    .report-analysis-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .analysis-box {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }

    .analysis-box h4 {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 10px;
    }

    .conclusions-box h4 {
      color: var(--success);
    }

    .suggestions-box h4 {
      color: var(--primary);
    }

    .analysis-box ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-muted);
    }

    .analysis-box li {
      margin-bottom: 6px;
    }

    .analysis-box li:last-child {
      margin-bottom: 0;
    }

    .theme-btn-header {
      width: 40px;
      height: 40px;
      background: var(--card);
      border: 1px solid var(--border-2);
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }

    .btn-icon {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      font-size: 15px;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      height: 46px;
      width: 46px;
    }
    .btn-icon:hover {
      background: var(--border);
    }
    .btn-icon.recording {
      background: rgba(220, 53, 69, 0.15);
      border-color: #dc3545;
      color: #dc3545;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 900px) {
      .report-analysis-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportesComponent implements OnInit {
  navItems: NavItem[] = [
    { icon: '📊', label: 'Panel Principal', route: '/admin' },
    { icon: '✏️', label: 'Editor de Políticas', route: '/editor' },
    { icon: '📈', label: 'Analytics', route: '/analytics' },
    { icon: '🤖', label: 'Reportes IA', route: '/reportes' },
    { icon: '👥', label: 'Usuarios', route: '/users' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  // Listas de ayuda para la aclaración interactiva
  departamentosList: string[] = ['Todos', 'Finanzas', 'Legal', 'Operaciones', 'Sistemas', 'Atención al Cliente'];
  periodosList: string[] = ['último mes', 'últimos 3 meses', 'últimos 6 meses', 'este año'];
  formatosList: string[] = ['Markdown', 'PDF', 'HTML', 'CSV'];

  promptReporte = '';
  loadingReporte = false;
  resultadoReporte: any = null;
  copiado = false;
  isRecording = false;
  private recognition: any = null;

  // Variables temporales para completar la aclaración
  tempVars: { departamento: string; rango_tiempo: string; formato: string } = {
    departamento: '',
    rango_tiempo: '',
    formato: ''
  };

  constructor(
    private aiService: AIService,
    private deptService: DepartamentoService,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    // Intentamos jalar los departamentos dinámicos del sistema para actualizar la lista de ayuda
    this.deptService.getAll().pipe(catchError(() => of([]))).subscribe(depts => {
      if (depts && depts.length > 0) {
        const nombres = depts.map(d => d.nombre);
        // Mezclamos 'Todos' al inicio
        this.departamentosList = ['Todos', ...nombres];
      }
    });
  }

  generarReporte(): void {
    if (!this.promptReporte.trim()) return;
    this.loadingReporte = true;
    this.resultadoReporte = null;
    this.copiado = false;

    this.aiService.generarReporte(this.promptReporte)
      .pipe(catchError((err) => {
        console.error(err);
        return of({ error: 'No se pudo conectar con el servicio de reportes de IA.' });
      }))
      .subscribe(data => {
        this.resultadoReporte = data;
        this.loadingReporte = false;

        if (data && data.falta_informacion) {
          // Inicializamos las variables que la IA sí logró extraer
          this.tempVars.departamento = data.departamento || '';
          this.tempVars.rango_tiempo = data.rango_tiempo || '';
          this.tempVars.formato = data.formato || '';
        } else if (data && !data.error) {
          // Si no falta información, limpiamos la entrada original
          this.promptReporte = '';
        }
      });
  }

  isVariableFaltante(nombre: string): boolean {
    return this.resultadoReporte?.variables_faltantes?.includes(nombre) || false;
  }

  setVariable(variableName: 'departamento' | 'rango_tiempo' | 'formato', value: string): void {
    this.tempVars[variableName] = value;
  }

  isClarificacionValida(): boolean {
    if (!this.resultadoReporte) return false;

    // Verificamos si las variables que la IA indicó que faltaban ya han sido llenadas
    const faltantes = this.resultadoReporte.variables_faltantes || [];
    for (const v of faltantes) {
      if (v === 'departamento' && !this.tempVars.departamento.trim()) return false;
      if (v === 'rango_tiempo' && !this.tempVars.rango_tiempo.trim()) return false;
      if (v === 'formato' && !this.tempVars.formato.trim()) return false;
    }
    return true;
  }

  completarReporte(): void {
    if (!this.isClarificacionValida()) return;

    // Construimos una solicitud completa uniendo las variables
    const promptCompleto = `Generar un reporte del departamento/proceso "${this.tempVars.departamento}" para el período "${this.tempVars.rango_tiempo}" en formato "${this.tempVars.formato}"`;
    this.promptReporte = promptCompleto;
    this.generarReporte();
  }

  cancelarReporte(): void {
    this.resultadoReporte = null;
    this.promptReporte = '';
    this.tempVars = { departamento: '', rango_tiempo: '', formato: '' };
  }

  copiarMarkdown(): void {
    if (!this.resultadoReporte?.contenido_markdown) return;
    navigator.clipboard.writeText(this.resultadoReporte.contenido_markdown).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 2500);
    });
  }

  toggleVoice(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    if (this.isRecording) {
      this.recognition?.stop();
      this.isRecording = false;
      return;
    }
    this.recognition = new SR();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      this.promptReporte = event.results[0][0].transcript;
      this.isRecording = false;
      this.generarReporte();
    };
    this.recognition.onerror = () => {
      this.isRecording = false;
    };
    this.recognition.onend = () => {
      this.isRecording = false;
    };
    try {
      this.recognition.start();
      this.isRecording = true;
    } catch (err: any) {
      console.error(err);
      this.isRecording = false;
    }
  }
}
