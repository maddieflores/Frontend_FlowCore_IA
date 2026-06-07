import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { Tramite } from '../../models/models';
import { TramiteService } from '../../services/tramite/tramite.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';
import { DocumentoService } from '../../services/documento/documento.service';

@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  imports: [CommonModule, DatePipe, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [activeRoute]="'/cliente'" [navItems]="navItems" />
      <main class="main-content">

        <div class="page-header">
          <div>
            <button class="btn-back" (click)="volver()">← Volver</button>
            <h1 class="page-title" style="margin-top:8px">
              Trámite {{ tramite?.numeroReferencia || '...' }}
            </h1>
            <p class="page-sub">{{ tramite?.nombrePolitica }}</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            @if (tramite?.estado === 'COMPLETADO') {
              <button class="btn-primary" (click)="descargarPdf()">
                📄 Descargar PDF
              </button>
            }
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        @if (loading) {
          <div class="loading-state"><div class="spinner"></div><p>Cargando trámite...</p></div>
        }

        @if (!loading && tramite) {
          <!-- Estado actual -->
          <div class="glass-card estado-card">
            <div class="estado-header">
              <div class="estado-icon" [class.icon-nuevo]="tramite.estado === 'NUEVO'"
                [class.icon-proceso]="tramite.estado === 'EN_PROCESO'"
                [class.icon-completado]="tramite.estado === 'COMPLETADO'"
                [class.icon-rechazado]="tramite.estado === 'RECHAZADO'">
                {{ getEstadoIcon(tramite.estado) }}
              </div>
              <div>
                <h2 class="estado-titulo">{{ getEstadoLabel(tramite.estado) }}</h2>
                <p class="estado-sub">
                  @if (tramite.estado === 'EN_PROCESO') {
                    Actualmente en: <strong>{{ tramite.nombreNodoActual }}</strong>
                    — Departamento: <strong>{{ tramite.departamentoActual }}</strong>
                  } @else if (tramite.estado === 'COMPLETADO') {
                    Trámite finalizado el {{ tramite.fechaFin | date:'dd/MM/yyyy HH:mm' }}
                  } @else if (tramite.estado === 'NUEVO') {
                    Solicitud recibida, pendiente de revisión por el administrador
                  } @else {
                    Trámite rechazado
                  }
                </p>
              </div>
              <span class="badge ms-auto"
                [class.badge-nuevo]="tramite.estado === 'NUEVO'"
                [class.badge-proceso]="tramite.estado === 'EN_PROCESO'"
                [class.badge-completado]="tramite.estado === 'COMPLETADO'"
                [class.badge-rechazado]="tramite.estado === 'RECHAZADO'">
                {{ tramite.estado }}
              </span>
            </div>
          </div>

          <!-- Progreso visual -->
          <div class="glass-card" style="margin-bottom:20px">
            <h3 class="section-title">📍 Progreso del Trámite</h3>
            <div class="progreso-steps">
              @for (paso of pasos; track paso.nodoId; let i = $index) {
                <div class="paso" [class.paso-completado]="paso.completado"
                  [class.paso-actual]="paso.actual" [class.paso-pendiente]="!paso.completado && !paso.actual">
                  <div class="paso-circle">
                    @if (paso.completado) { ✓ }
                    @else if (paso.actual) { ● }
                    @else { {{ i + 1 }} }
                  </div>
                  <div class="paso-info">
                    <p class="paso-nombre">{{ paso.nombre }}</p>
                    <p class="paso-dept">{{ paso.departamento }}</p>
                    @if (paso.fecha) {
                      <p class="paso-fecha">{{ paso.fecha | date:'dd/MM HH:mm' }}</p>
                    }
                  </div>
                  @if (i < pasos.length - 1) {
                    <div class="paso-linea" [class.linea-completada]="paso.completado"></div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Info general -->
          <div class="info-grid">
            <div class="glass-card">
              <h3 class="section-title">📋 Información General</h3>
              <div class="info-list">
                <div class="info-row">
                  <span class="info-label">Referencia</span>
                  <span class="info-value mono">{{ tramite.numeroReferencia }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Política</span>
                  <span class="info-value">{{ tramite.nombrePolitica }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Descripción</span>
                  <span class="info-value">{{ tramite.descripcion || '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prioridad</span>
                  <span class="info-value">
                    <span class="badge"
                      [class.badge-nuevo]="tramite.prioridad === 'ALTA'"
                      [class.badge-proceso]="tramite.prioridad === 'MEDIA'"
                      [class.badge-completado]="tramite.prioridad === 'BAJA'">
                      {{ tramite.prioridad }}
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha inicio</span>
                  <span class="info-value mono">{{ tramite.fechaInicio | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                @if (tramite.fechaFin) {
                  <div class="info-row">
                    <span class="info-label">Fecha fin</span>
                    <span class="info-value mono">{{ tramite.fechaFin | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Duración total</span>
                    <span class="info-value">{{ formatDuracion(tramite.duracionMinutos) }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Historial -->
            <div class="glass-card">
              <h3 class="section-title">📜 Historial de Pasos</h3>
              @if (tramite.historial.length === 0) {
                <div class="empty-state">El trámite aún no ha iniciado</div>
              } @else {
                <div class="historial-list">
                  @for (h of tramite.historial; track h.nodoId) {
                    <div class="historial-item">
                      <div class="historial-dot" [class.dot-completado]="h.accion === 'COMPLETADO'"
                        [class.dot-rechazado]="h.accion === 'RECHAZADO'"></div>
                      <div class="historial-content">
                        <p class="historial-nodo">{{ h.nombreNodo }}</p>
                        <p class="historial-meta">
                          {{ h.departamento }} · {{ h.nombreFuncionario || 'Sistema' }}
                          @if (h.duracionMinutos) { · {{ h.duracionMinutos }} min }
                        </p>
                        @if (h.observacion) {
                          <p class="historial-obs">{{ h.observacion }}</p>
                        }
                        @if (h.resultadoDecision) {
                          <span class="badge" [class.badge-completado]="h.resultadoDecision === 'APROBADO'"
                            [class.badge-nuevo]="h.resultadoDecision === 'RECHAZADO'">
                            {{ h.resultadoDecision }}
                          </span>
                        }
                        <p class="historial-fecha">{{ h.fecha | date:'dd/MM/yyyy HH:mm' }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Gestión Documental -->
          <div class="glass-card" style="margin-bottom:20px">
            <h3 class="section-title">📁 Documentos y Requisitos</h3>
            
            @if (documentos.length === 0) {
              <p class="empty-docs-msg">No se han adjuntado documentos todavía.</p>
            } @else {
              <div class="docs-list">
                @for (doc of documentos; track doc.id) {
                  <div class="doc-item">
                    <div class="doc-icon-wrapper">{{ getFileIcon(doc.contentType) }}</div>
                    <div class="doc-details">
                      <p class="doc-name">{{ doc.nombre }}</p>
                      <p class="doc-meta">
                        {{ formatSize(doc.tamanoBytes) }} • Por {{ doc.subidoPorNombre || 'Usuario' }}
                      </p>
                    </div>
                    <div class="doc-actions">
                      <button class="btn-icon" (click)="abrirDocumento(doc)" title="Ver / Descargar">👁️</button>
                      <button class="btn-icon btn-icon-danger" (click)="eliminarDocumento(doc.id, doc.nombre)" title="Eliminar">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="uploader-container" style="margin-top:20px">
              @if (subiendo) {
                <div class="upload-progress-card">
                  <div class="upload-spinner-row">
                    <div class="spinner-small"></div>
                    <span>{{ mensajeSubida }} ({{ porcentajeSubida }}%)</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" [style.width.%]="porcentajeSubida"></div>
                  </div>
                </div>
              } @else {
                <label class="btn-upload-label">
                  <input type="file" (change)="onFileSelected($event)" style="display:none" />
                  📤 Subir Requisito Digital
                </label>
              }
            </div>
          </div>

          <!-- Datos formulario (si completado) -->
          @if (tramite.estado === 'COMPLETADO' && tramite.datosFormulario && objectKeys(tramite.datosFormulario).length > 0) {
            <div class="glass-card" style="margin-top:20px">
              <h3 class="section-title">📝 Datos Recopilados</h3>
              <div class="datos-grid">
                @for (key of objectKeys(tramite.datosFormulario); track key) {
                  <div class="dato-item">
                    <span class="dato-key">{{ key }}</span>
                    <span class="dato-val">{{ tramite.datosFormulario![key] }}</span>
                  </div>
                }
              </div>
            </div>
          }
        }

      </main>
    </div>
  `,
  styles: [`
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }
    .btn-back {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 13px; font-family: inherit;
      padding: 0; margin-bottom: 4px;
    }
    .btn-back:hover { color: var(--primary); }
    .ms-auto { margin-left: auto; }

    .estado-card { margin-bottom: 20px; }
    .estado-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .estado-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
    }
    .icon-nuevo      { background: hsl(216,85%,50%,0.12); }
    .icon-proceso    { background: hsl(20,89%,48%,0.12); }
    .icon-completado { background: hsl(142,60%,38%,0.12); }
    .icon-rechazado  { background: hsl(355,80%,55%,0.12); }
    .estado-titulo { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    .estado-sub { font-size: 13px; color: var(--text-muted); margin: 0; }

    .section-title { font-size: 14px; font-weight: 600; margin: 0 0 16px; }

    /* Progreso */
    .progreso-steps {
      display: flex; align-items: flex-start; gap: 0;
      overflow-x: auto; padding-bottom: 8px;
    }
    .paso {
      display: flex; flex-direction: column; align-items: center;
      min-width: 120px; position: relative; flex: 1;
    }
    .paso-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; border: 2px solid var(--border-2);
      background: var(--bg-2); color: var(--text-muted); z-index: 1;
      transition: all 0.3s;
    }
    .paso-completado .paso-circle {
      background: var(--success); border-color: var(--success); color: white;
    }
    .paso-actual .paso-circle {
      background: var(--primary); border-color: var(--primary); color: white;
      box-shadow: 0 0 0 4px hsl(216,85%,50%,0.2);
    }
    .paso-info { text-align: center; margin-top: 8px; }
    .paso-nombre { font-size: 11px; font-weight: 600; margin: 0 0 2px; }
    .paso-dept { font-size: 10px; color: var(--text-muted); margin: 0; }
    .paso-fecha { font-size: 10px; color: var(--text-faint); margin: 2px 0 0; }
    .paso-linea {
      position: absolute; top: 18px; left: 50%; width: 100%;
      height: 2px; background: var(--border-2); z-index: 0;
    }
    .linea-completada { background: var(--success); }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .info-list { display: flex; flex-direction: column; gap: 10px; }
    .info-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .info-label { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
    .info-value { font-size: 13px; color: var(--text); text-align: right; }

    /* Historial */
    .historial-list { display: flex; flex-direction: column; gap: 12px; }
    .historial-item { display: flex; gap: 12px; }
    .historial-dot {
      width: 10px; height: 10px; border-radius: 50%;
      flex-shrink: 0; margin-top: 4px;
    }
    .dot-completado { background: var(--success); }
    .dot-rechazado  { background: var(--danger); }
    .historial-content { flex: 1; }
    .historial-nodo { font-size: 13px; font-weight: 600; margin: 0 0 2px; }
    .historial-meta { font-size: 11px; color: var(--text-muted); margin: 0 0 4px; }
    .historial-obs { font-size: 12px; color: var(--text); margin: 0 0 4px; font-style: italic; }
    .historial-fecha { font-size: 10px; color: var(--text-faint); margin: 4px 0 0; }

    /* Datos */
    .datos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .dato-item {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px;
    }
    .dato-key { display: block; font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
    .dato-val { font-size: 13px; font-weight: 500; color: var(--text); }

    /* Documentos */
    .empty-docs-msg { font-size: 13px; color: var(--text-muted); margin: 0; }
    .docs-list { display: flex; flex-direction: column; gap: 10px; }
    .doc-item {
      display: flex; align-items: center; gap: 12px;
      background: var(--bg-2, rgba(255,255,255,0.02));
      border: 1px solid var(--border-2, rgba(255,255,255,0.05));
      border-radius: 12px; padding: 12px;
    }
    .doc-icon-wrapper {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(37,99,235,0.08); display: flex;
      align-items: center; justify-content: center; font-size: 20px;
    }
    .doc-details { flex: 1; }
    .doc-name { font-size: 13px; font-weight: 600; margin: 0 0 2px; color: var(--text); }
    .doc-meta { font-size: 11px; color: var(--text-muted); margin: 0; }
    .doc-actions { display: flex; gap: 8px; }
    .btn-icon {
      background: var(--bg-2); border: 1px solid var(--border-2);
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 12px;
      transition: all 0.2s;
    }
    .btn-icon:hover { background: var(--border-2); }
    .btn-icon-danger { color: #ef4444; border-color: rgba(239,68,68,0.2); }
    .btn-icon-danger:hover { background: rgba(239,68,68,0.05); }

    .btn-upload-label {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--primary, #2563eb); color: white; padding: 12px 20px;
      border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
      transition: all 0.2s; border: none; width: 100%; box-sizing: border-box;
    }
    .btn-upload-label:hover { background: #1d4ed8; transform: translateY(-1px); }
    
    .upload-progress-card {
      background: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.1);
      border-radius: 12px; padding: 12px 16px;
    }
    .upload-spinner-row { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
    .spinner-small {
      width: 16px; height: 16px; border: 2px solid rgba(37,99,235,0.2);
      border-top-color: var(--primary, #2563eb); border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .progress-bar-bg { width: 100%; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: var(--primary, #2563eb); transition: width 0.3s; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 900px) { .info-grid { grid-template-columns: 1fr; } }
  `]
})
export class TramiteDetalleComponent implements OnInit, OnDestroy {
  tramite: Tramite | null = null;
  loading = true;
  pasos: any[] = [];
  objectKeys = Object.keys;

  documentos: any[] = [];
  subiendo = false;
  porcentajeSubida = 0;
  mensajeSubida = '';

  navItems: NavItem[] = [];

  private wsSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private tramiteService: TramiteService,
    private wsService: WebSocketService,
    private authService: AuthService,
    public themeService: ThemeService,
    private documentoService: DocumentoService,
    public router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargarTramite(id);
    const user = this.authService.getUser();
    if (user) {
      this.wsService.conectar(user.id, user.rol, user.departamento);
      this.wsSub = this.wsService.notificaciones$.subscribe(() => this.cargarTramite(id));

      if (user.rol === 'ADMIN') {
        this.navItems = [
          { icon: '📊', label: 'Panel Principal', route: '/admin' },
          { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
        ];
      } else {
        this.navItems = [
          { icon: '🏠', label: 'Portal', route: '/cliente' },
          { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
        ];
      }
    }
  }

  volver(): void {
    const user = this.authService.getUser();
    if (user?.rol === 'ADMIN') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/cliente']);
    }
  }

  cargarTramite(id: string): void {
    this.tramiteService.getById(id).pipe(catchError(() => of(null))).subscribe(t => {
      this.tramite = t;
      if (t) {
        this.construirPasos(t);
        this.cargarDocumentos(t.id);
      }
      this.loading = false;
    });
  }

  cargarDocumentos(tramiteId: string): void {
    this.documentoService.getByTramite(tramiteId).subscribe({
      next: (docs) => this.documentos = docs,
      error: () => console.error('Error al cargar documentos')
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file || !this.tramite) return;

    const user = this.authService.getUser();
    this.subiendo = true;
    this.porcentajeSubida = 10;
    this.mensajeSubida = 'Obteniendo URL de almacenamiento...';

    // 1. Obtener URL de subida
    this.documentoService.getUploadUrl({
      nombre: file.name,
      contentType: file.type || 'application/octet-stream',
      tamanoBytes: file.size,
      tramiteId: this.tramite.id,
      subidoPorId: user?.id,
      subidoPorNombre: user?.nombre || 'Usuario'
    }).subscribe({
      next: (uploadInfo) => {
        this.porcentajeSubida = 40;
        this.mensajeSubida = 'Subiendo archivo...';

        // 2. Subir al almacenamiento
        this.documentoService.uploadToStorage(uploadInfo.uploadUrl, file).subscribe({
          next: () => {
            this.porcentajeSubida = 80;
            this.mensajeSubida = 'Registrando documento...';

            // 3. Registrar en base de datos
            this.documentoService.registerDocument({
              nombre: file.name,
              s3Key: uploadInfo.s3Key,
              contentType: file.type || 'application/octet-stream',
              tamanoBytes: file.size,
              tramiteId: this.tramite!.id,
              subidoPorId: user?.id,
              subidoPorNombre: user?.nombre || 'Usuario'
            }).subscribe({
              next: () => {
                this.subiendo = false;
                this.porcentajeSubida = 0;
                this.mensajeSubida = '';
                alert(`Archivo "${file.name}" subido con éxito.`);
                this.cargarDocumentos(this.tramite!.id);
              },
              error: (err: any) => {
                this.subiendo = false;
                alert('Error al registrar documento: ' + (err.error?.message || err.message));
              }
            });
          },
          error: (err: any) => {
            this.subiendo = false;
            alert('Error al cargar archivo en el almacenamiento.');
          }
        });
      },
      error: (err: any) => {
        this.subiendo = false;
        alert('Error al obtener la URL de subida.');
      }
    });
  }

  abrirDocumento(doc: any): void {
    this.documentoService.getDownloadUrl(doc.id).subscribe({
      next: (res) => {
        window.open(res.downloadUrl, '_blank');
      },
      error: () => alert('Error al obtener la URL de descarga')
    });
  }

  eliminarDocumento(docId: string, nombre: string): void {
    if (!confirm(`¿Está seguro de que desea eliminar el documento "${nombre}"?`)) return;
    this.documentoService.delete(docId).subscribe({
      next: () => {
        alert('Documento eliminado correctamente.');
        if (this.tramite) this.cargarDocumentos(this.tramite.id);
      },
      error: () => alert('Error al eliminar el documento')
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(contentType: string): string {
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('image')) return '🖼️';
    if (contentType.includes('video')) return '🎥';
    if (contentType.includes('word') || contentType.includes('doc')) return '📝';
    if (contentType.includes('excel') || contentType.includes('sheet')) return '📊';
    return '📁';
  }

  construirPasos(t: Tramite): void {
    const completados = t.historial.map(h => ({
      nodoId: h.nodoId,
      nombre: h.nombreNodo,
      departamento: h.departamento || '',
      completado: true,
      actual: false,
      fecha: h.fecha
    }));

    const actual = t.estado === 'EN_PROCESO' ? [{
      nodoId: t.nodoActualId,
      nombre: t.nombreNodoActual || 'En proceso',
      departamento: t.departamentoActual || '',
      completado: false,
      actual: true,
      fecha: null
    }] : [];

    this.pasos = [...completados, ...actual];
  }

  descargarPdf(): void {
    if (!this.tramite) return;
    this.tramiteService.descargarPdf(this.tramite.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tramite-${this.tramite!.numeroReferencia}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Error al descargar el PDF')
    });
  }

  getEstadoIcon(estado: string): string {
    return { NUEVO: '🔵', EN_PROCESO: '🟡', COMPLETADO: '🟢', RECHAZADO: '🔴' }[estado] ?? '⚪';
  }

  getEstadoLabel(estado: string): string {
    return { NUEVO: 'Solicitud Recibida', EN_PROCESO: 'En Proceso', COMPLETADO: 'Completado', RECHAZADO: 'Rechazado' }[estado] ?? estado;
  }

  formatDuracion(min?: number | null): string {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
  }
}
