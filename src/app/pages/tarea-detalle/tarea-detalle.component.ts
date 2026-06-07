import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Tarea, Tramite } from '../../models/models';
import { TareaService } from '../../services/tarea/tarea.service';
import { TramiteService } from '../../services/tramite/tramite.service';
import { AIService } from '../../services/ai/ai.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth/auth.service';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-tarea-detalle',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/dashboard" [navItems]="navItems" />
      <main class="main-content">

        <div class="page-header">
          <div>
            <button class="btn-back" (click)="router.navigate(['/dashboard'])">← Volver al Dashboard</button>
            <h1 class="page-title" style="margin-top:8px">{{ tarea?.nombreNodo || 'Detalle de Tarea' }}</h1>
            <p class="page-sub">
              Trámite: <strong>{{ tarea?.numeroReferenciaTramite }}</strong>
              · {{ tarea?.nombrePolitica }}
              · Departamento: <strong>{{ tarea?.departamento }}</strong>
            </p>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <span class="badge"
              [class.badge-nuevo]="tarea?.estado === 'PENDIENTE'"
              [class.badge-proceso]="tarea?.estado === 'EN_PROCESO'"
              [class.badge-completado]="tarea?.estado === 'COMPLETADO'"
              [class.badge-rechazado]="tarea?.estado === 'RECHAZADO'">
              {{ tarea?.estado }}
            </span>
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        @if (loading) {
          <div class="loading-state"><div class="spinner"></div><p>Cargando tarea...</p></div>
        }

        @if (!loading && tarea) {
          <div class="tarea-layout">

            <!-- Panel izquierdo: info + formulario -->
            <div class="tarea-main">

              <!-- Info card -->
              <div class="glass-card" style="margin-bottom:16px">
                <h3 class="section-title">📋 Información de la Tarea</h3>
                <div class="info-grid-2">
                  <div class="info-item">
                    <span class="info-label">Asignado a</span>
                    <span class="info-value">{{ tarea.nombreFuncionario || 'Sin asignar' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Prioridad</span>
                    <span class="badge"
                      [class.badge-nuevo]="tarea.prioridad === 'ALTA'"
                      [class.badge-proceso]="tarea.prioridad === 'MEDIA'"
                      [class.badge-completado]="tarea.prioridad === 'BAJA'">
                      {{ tarea.prioridad }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Fecha asignación</span>
                    <span class="info-value mono">{{ tarea.fechaAsignacion | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  @if (tarea.fechaCompletado) {
                    <div class="info-item">
                      <span class="info-label">Fecha completado</span>
                      <span class="info-value mono">{{ tarea.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  }
                </div>
                @if (tarea.instrucciones) {
                  <div class="instrucciones">
                    <p class="info-label">Instrucciones</p>
                    <p class="instrucciones-texto">{{ tarea.instrucciones }}</p>
                  </div>
                }
              </div>

              <!-- Formulario dinámico -->
              <div class="glass-card" style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                  <h3 class="section-title" style="margin:0">📝 Formulario de la Tarea</h3>
                  @if (tarea.estado !== 'COMPLETADO') {
                    <button class="btn-outline" style="font-size:12px" (click)="toggleAI()">
                      🤖 {{ showAI ? 'Ocultar IA' : 'Asistente IA' }}
                    </button>
                  }
                </div>

                <!-- AI assistant panel -->
                @if (showAI && tarea.estado !== 'COMPLETADO') {
                  <div class="ai-panel">
                    <p class="ai-panel-title">🤖 Asistente IA — Extracción de datos</p>
                    <p class="ai-panel-sub">Pega un informe o texto y la IA extraerá los datos del formulario</p>
                    <textarea class="form-input" [(ngModel)]="textoDocumento" rows="4"
                      placeholder="Pega aquí el texto del informe o documento..."></textarea>
                    <button class="btn-primary" style="margin-top:8px;font-size:12px"
                      (click)="extraerDatosIA()" [disabled]="loadingIA || !textoDocumento.trim()">
                      {{ loadingIA ? '⏳ Extrayendo...' : '✨ Extraer datos con IA' }}
                    </button>
                    @if (iaError) {
                      <p style="color:var(--danger);font-size:12px;margin-top:6px">{{ iaError }}</p>
                    }
                  </div>
                }

                <!-- Campos del formulario -->
                @if (camposFormulario.length > 0) {
                  @for (campo of camposFormulario; track campo.nombre) {
                    <div class="form-group" style="margin-bottom:14px">
                      <label class="form-label">
                        {{ campo.etiqueta || campo.nombre }}
                        @if (campo.requerido) { <span style="color:var(--danger)">*</span> }
                      </label>

                      @if (campo.tipo === 'textarea') {
                        <textarea class="form-input" [(ngModel)]="formularioDatos[campo.nombre]"
                          [placeholder]="'Ingresa ' + (campo.etiqueta || campo.nombre)"
                          rows="3" [disabled]="tarea.estado === 'COMPLETADO'"></textarea>
                      } @else if (campo.tipo === 'boolean') {
                        <div class="bool-group">
                          <label class="bool-option" [class.selected]="formularioDatos[campo.nombre] === 'true'">
                            <input type="radio" [name]="campo.nombre" value="true"
                              [(ngModel)]="formularioDatos[campo.nombre]"
                              [disabled]="tarea.estado === 'COMPLETADO'" />
                            ✅ Sí / Aprobado
                          </label>
                          <label class="bool-option" [class.selected]="formularioDatos[campo.nombre] === 'false'">
                            <input type="radio" [name]="campo.nombre" value="false"
                              [(ngModel)]="formularioDatos[campo.nombre]"
                              [disabled]="tarea.estado === 'COMPLETADO'" />
                            ❌ No / Rechazado
                          </label>
                        </div>
                      } @else if (campo.tipo === 'number') {
                        <input type="number" class="form-input" [(ngModel)]="formularioDatos[campo.nombre]"
                          [placeholder]="'Ingresa ' + (campo.etiqueta || campo.nombre)"
                          [disabled]="tarea.estado === 'COMPLETADO'" />
                      } @else if (campo.tipo === 'grid') {
                        <!-- Grid/Tabla dinámica -->
                        <div class="grid-field">
                          <div class="grid-table-wrap">
                            <table class="grid-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Descripción</th>
                                  <th>Valor</th>
                                  @if (tarea.estado !== 'COMPLETADO') { <th></th> }
                                </tr>
                              </thead>
                              <tbody>
                                @for (row of getGridRows(campo.nombre); track $index; let i = $index) {
                                  <tr>
                                    <td class="grid-idx">{{ i + 1 }}</td>
                                    <td><input class="form-input grid-input" [(ngModel)]="row.descripcion" placeholder="Descripción" [disabled]="tarea.estado === 'COMPLETADO'" /></td>
                                    <td><input class="form-input grid-input" [(ngModel)]="row.valor" placeholder="Valor" [disabled]="tarea.estado === 'COMPLETADO'" /></td>
                                    @if (tarea.estado !== 'COMPLETADO') {
                                      <td><button class="btn-grid-del" (click)="removeGridRow(campo.nombre, i)">✕</button></td>
                                    }
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                          @if (tarea.estado !== 'COMPLETADO') {
                            <button class="btn-grid-add" (click)="addGridRow(campo.nombre)">+ Agregar fila</button>
                          }
                        </div>
                      } @else {
                        <input type="text" class="form-input" [(ngModel)]="formularioDatos[campo.nombre]"
                          [placeholder]="'Ingresa ' + (campo.etiqueta || campo.nombre)"
                          [disabled]="tarea.estado === 'COMPLETADO'" />
                      }
                    </div>
                  }
                } @else {
                  <div class="empty-state" style="padding:20px">
                    <p>Este nodo no tiene campos de formulario definidos</p>
                  </div>
                }

                <!-- Observación -->
                @if (tarea.estado !== 'COMPLETADO') {
                  <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">Observaciones (opcional)</label>
                    <textarea class="form-input" [(ngModel)]="formularioDatos['observacion']"
                      rows="2" placeholder="Notas adicionales..."></textarea>
                  </div>
                }

                @if (formError) {
                  <div class="toast toast-error" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">
                    ❌ {{ formError }}
                  </div>
                }
                @if (formExito) {
                  <div class="toast toast-success" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">
                    ✅ {{ formExito }}
                  </div>
                }

                <!-- Acciones -->
                @if (tarea.estado !== 'COMPLETADO' && tarea.estado !== 'RECHAZADO') {
                  <div class="acciones">
                    @if (tarea.estado === 'PENDIENTE') {
                      <button class="btn-outline" (click)="cambiarEstado('EN_PROCESO')" [disabled]="guardando">
                        ▶️ Iniciar tarea
                      </button>
                    }
                    <button class="btn-danger" (click)="cambiarEstado('RECHAZADO')" [disabled]="guardando">
                      ❌ Rechazar
                    </button>
                    <button class="btn-primary" (click)="completarTarea()" [disabled]="guardando">
                      {{ guardando ? '⏳ Procesando...' : '✅ Completar y avanzar' }}
                    </button>
                  </div>
                }

                @if (tarea.estado === 'COMPLETADO') {
                  <div class="completado-banner">
                    ✅ Esta tarea fue completada el {{ tarea.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}
                    @if (tarea.duracionMinutos) { · Duración: {{ tarea.duracionMinutos }} min }
                  </div>
                }
              </div>
            </div>

            <!-- Panel derecho: trámite info -->
            <div class="tarea-side">
              @if (tramite) {
                <div class="glass-card">
                  <h3 class="section-title">🔗 Trámite Relacionado</h3>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">Referencia</span>
                      <span class="info-value mono">{{ tramite.numeroReferencia }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Cliente</span>
                      <span class="info-value">{{ tramite.nombreCliente }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Estado trámite</span>
                      <span class="badge"
                        [class.badge-nuevo]="tramite.estado === 'NUEVO'"
                        [class.badge-proceso]="tramite.estado === 'EN_PROCESO'"
                        [class.badge-completado]="tramite.estado === 'COMPLETADO'">
                        {{ tramite.estado }}
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Nodo actual</span>
                      <span class="info-value">{{ tramite.nombreNodoActual }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Departamento</span>
                      <span class="info-value">{{ tramite.departamentoActual }}</span>
                    </div>
                  </div>

                  <button class="btn-outline" style="width:100%;margin-top:12px;font-size:12px"
                    (click)="router.navigate(['/tramite', tramite.id])">
                    Ver trámite completo →
                  </button>
                </div>

                <!-- Historial del trámite -->
                @if (tramite.historial.length > 0) {
                  <div class="glass-card" style="margin-top:16px">
                    <h3 class="section-title">📜 Historial</h3>
                    <div class="historial-mini">
                      @for (h of tramite.historial; track h.nodoId) {
                        <div class="hist-item">
                          <div class="hist-dot"></div>
                          <div>
                            <p class="hist-nodo">{{ h.nombreNodo }}</p>
                            <p class="hist-meta">{{ h.departamento }} · {{ h.fecha | date:'dd/MM HH:mm' }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              }
            </div>

          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    .btn-back {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 13px; font-family: inherit; padding: 0;
    }
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }
    .btn-back:hover { color: var(--primary); }

    .tarea-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
    .tarea-main {}
    .tarea-side {}

    .section-title { font-size: 14px; font-weight: 600; margin: 0 0 14px; }

    .info-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 3px; }
    .info-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.03em; }
    .info-value { font-size: 13px; color: var(--text); }
    .info-list { display: flex; flex-direction: column; gap: 10px; }

    .instrucciones { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
    .instrucciones-texto { font-size: 13px; color: var(--text); line-height: 1.6; margin: 6px 0 0; }

    .ai-panel {
      background: hsl(282,69%,45%,0.06); border: 1px solid hsl(282,69%,45%,0.2);
      border-radius: 10px; padding: 14px; margin-bottom: 16px;
    }
    .ai-panel-title { font-size: 13px; font-weight: 600; color: var(--purple); margin: 0 0 4px; }
    .ai-panel-sub { font-size: 11px; color: var(--text-muted); margin: 0 0 10px; }

    .bool-group { display: flex; gap: 10px; }
    .bool-option {
      flex: 1; padding: 10px; border: 1px solid var(--border-2);
      border-radius: 8px; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; gap: 8px;
      transition: all 0.2s;
    }
    .bool-option input { display: none; }
    .bool-option:hover { border-color: var(--primary); }
    .bool-option.selected { border-color: var(--primary); background: hsl(216,85%,50%,0.08); }

    /* Grid field */
    .grid-field { display: flex; flex-direction: column; gap: 8px; }
    .grid-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; }
    .grid-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .grid-table th {
      padding: 6px 10px; background: var(--bg-2); color: var(--text-muted);
      font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border); text-align: left;
    }
    .grid-table td { padding: 4px 6px; border-bottom: 1px solid var(--border); }
    .grid-table tr:last-child td { border-bottom: none; }
    .grid-idx { font-size: 11px; color: var(--text-faint); width: 28px; text-align: center; }
    .grid-input { padding: 4px 8px !important; font-size: 12px !important; }
    .btn-grid-del {
      background: none; border: none; color: var(--danger); cursor: pointer;
      font-size: 12px; padding: 2px 6px; border-radius: 4px;
    }
    .btn-grid-del:hover { background: hsl(355,80%,55%,0.1); }
    .btn-grid-add {
      background: hsl(216,85%,50%,0.08); border: 1px dashed var(--primary);
      color: var(--primary); border-radius: 6px; padding: 5px 12px;
      font-size: 12px; cursor: pointer; font-family: inherit; width: 100%;
    }
    .btn-grid-add:hover { background: hsl(216,85%,50%,0.15); }

    .acciones { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

    .completado-banner {
      background: hsl(142,60%,38%,0.1); border: 1px solid hsl(142,60%,38%,0.3);
      border-radius: 8px; padding: 12px; font-size: 13px; color: var(--success);
      text-align: center;
    }

    .historial-mini { display: flex; flex-direction: column; gap: 10px; }
    .hist-item { display: flex; gap: 10px; align-items: flex-start; }
    .hist-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--success); flex-shrink: 0; margin-top: 4px;
    }
    .hist-nodo { font-size: 12px; font-weight: 600; margin: 0 0 2px; }
    .hist-meta { font-size: 10px; color: var(--text-muted); margin: 0; }

    @media (max-width: 900px) {
      .tarea-layout { grid-template-columns: 1fr; }
      .info-grid-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class TareaDetalleComponent implements OnInit {
  tarea: Tarea | null = null;
  tramite: Tramite | null = null;
  loading = true;
  guardando = false;
  formError = '';
  formExito = '';
  formularioDatos: { [key: string]: any } = {};
  camposFormulario: any[] = [];
  showAI = false;
  textoDocumento = '';
  loadingIA = false;
  iaError = '';

  navItems: NavItem[] = [
    { icon: '📋', label: 'Mis Tareas', route: '/dashboard' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  constructor(
    private route: ActivatedRoute,
    private tareaService: TareaService,
    private tramiteService: TramiteService,
    private aiService: AIService,
    private authService: AuthService,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tareaService.getById(id).pipe(catchError(() => of(null))).subscribe(t => {
      this.tarea = t;
      if (t) {
        this.formularioDatos = { ...t.formularioDatos };
        this.cargarCamposFormulario(t);
        this.tramiteService.getById(t.tramiteId).pipe(catchError(() => of(null))).subscribe(tr => {
          this.tramite = tr;
        });
      }
      this.loading = false;
    });
  }

  cargarCamposFormulario(tarea: Tarea): void {
    // Los camposFormulario se copian del nodo al crear la tarea en el backend
    // Si la tarea los tiene, usarlos directamente
    if (tarea.camposFormulario && tarea.camposFormulario.length > 0) {
      this.camposFormulario = tarea.camposFormulario;
    } else {
      // Fallback: campos básicos si el nodo no tenía formulario definido
      this.camposFormulario = [
        { nombre: 'observacion', tipo: 'textarea', etiqueta: 'Observaciones', requerido: true },
        { nombre: 'aprobado', tipo: 'boolean', etiqueta: '¿Aprobado?', requerido: true }
      ];
    }
  }

  toggleAI(): void { this.showAI = !this.showAI; }

  // ── Grid field helpers ────────────────────────────────────────────────────
  getGridRows(campo: string): { descripcion: string; valor: string }[] {
    if (!this.formularioDatos[campo]) {
      this.formularioDatos[campo] = [];
    }
    return this.formularioDatos[campo] as { descripcion: string; valor: string }[];
  }

  addGridRow(campo: string): void {
    if (!this.formularioDatos[campo]) this.formularioDatos[campo] = [];
    (this.formularioDatos[campo] as any[]).push({ descripcion: '', valor: '' });
  }

  removeGridRow(campo: string, idx: number): void {
    if (!this.formularioDatos[campo]) return;
    (this.formularioDatos[campo] as any[]).splice(idx, 1);
  }

  extraerDatosIA(): void {
    if (!this.textoDocumento.trim() || !this.tarea) return;
    this.loadingIA = true;
    this.iaError = '';
    this.aiService.extraerDatosDocumento(this.textoDocumento, this.tarea.nombreNodo || '')
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.loadingIA = false;
        if (!res) { this.iaError = 'Error al conectar con la IA'; return; }
        try {
          const datos = JSON.parse(res);
          Object.keys(datos).forEach(k => {
            if (datos[k] !== null && datos[k] !== undefined) {
              this.formularioDatos[k] = String(datos[k]);
            }
          });
          this.showAI = false;
        } catch {
          this.iaError = 'La IA no pudo extraer datos estructurados';
        }
      });
  }

  cambiarEstado(estado: string): void {
    if (!this.tarea) return;
    this.guardando = true;
    this.tareaService.actualizarEstado(this.tarea.id, estado).subscribe({
      next: (t) => {
        this.tarea = t;
        this.guardando = false;
        this.formExito = `Estado actualizado a ${estado}`;
        setTimeout(() => this.formExito = '', 3000);
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al actualizar estado';
        this.guardando = false;
      }
    });
  }

  completarTarea(): void {
    if (!this.tarea) return;
    // Validate required fields
    for (const campo of this.camposFormulario) {
      if (campo.requerido && !this.formularioDatos[campo.nombre]) {
        this.formError = `El campo "${campo.etiqueta || campo.nombre}" es requerido`;
        return;
      }
    }
    this.guardando = true;
    this.formError = '';
    this.tareaService.completar(this.tarea.id, this.formularioDatos).subscribe({
      next: () => {
        this.formExito = '✅ Tarea completada. El trámite avanzó automáticamente.';
        this.guardando = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al completar la tarea';
        this.guardando = false;
      }
    });
  }
}
