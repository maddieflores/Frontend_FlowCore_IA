import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';

import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth/auth.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { TramiteService } from '../../services/tramite/tramite.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Politica, Tramite, Notificacion } from '../../models/models';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-cliente-portal',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [activeRoute]="'/cliente'" [navItems]="navItems" />

      <main class="main-content">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Portal del Cliente</h1>
            <p class="page-sub">Bienvenido, {{ user?.nombre }}</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <!-- Notification Bell -->
            <div class="notif-wrapper">
              <button class="notif-btn" (click)="toggleNotifPanel()">
                🔔
                @if (unreadCount > 0) {
                  <span class="notif-badge">{{ unreadCount }}</span>
                }
              </button>
              @if (showNotifPanel) {
                <div class="notif-panel">
                  <div class="notif-panel-header">
                    <span>Notificaciones</span>
                    @if (unreadCount > 0) {
                      <button class="btn-link" (click)="marcarTodasLeidas()">Marcar todas leídas</button>
                    }
                  </div>
                  @if (notificaciones.length === 0) {
                    <p class="notif-empty">Sin notificaciones nuevas</p>
                  }
                  @for (n of notificaciones; track n.id) {
                    <div class="notif-item" [class.unread]="!n.leida" (click)="marcarLeida(n)">
                      <p class="notif-msg">{{ n.mensaje }}</p>
                      <span class="notif-date">{{ n.fechaCreacion | date:'dd/MM HH:mm' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn" [class.active]="activeTab === 'disponibles'"
            (click)="activeTab = 'disponibles'">
            📋 Trámites Disponibles
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'mis-tramites'"
            (click)="activeTab = 'mis-tramites'">
            📁 Mis Trámites
            @if (misTramites.length > 0) {
              <span class="tab-count">{{ misTramites.length }}</span>
            }
          </button>
        </div>

        <!-- Tab: Trámites Disponibles -->
        @if (activeTab === 'disponibles') {
          @if (loadingPoliticas) {
            <div class="loading-state">⏳ Cargando trámites disponibles...</div>
          } @else if (politicas.length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>No hay trámites disponibles en este momento.</p>
            </div>
          } @else {
            <div class="cards-grid">
              @for (p of politicas; track p.id) {
                <div class="politica-card">
                  @if (p.categoria) {
                    <span class="card-category">{{ p.categoria }}</span>
                  }
                  <h3 class="card-title">{{ p.nombre }}</h3>
                  <p class="card-desc">{{ p.descripcion }}</p>
                  <div class="card-meta">
                    @if (p.tiempoEstimadoDias) {
                      <span class="meta-item">🕐 {{ p.tiempoEstimadoDias }} días est.</span>
                    }
                    @if (p.organizacion) {
                      <span class="meta-item">🏢 {{ p.organizacion }}</span>
                    }
                  </div>
                  <button class="btn-primary btn-full" (click)="abrirModal(p)">
                    ✉️ Solicitar
                  </button>
                </div>
              }
            </div>
          }
        }

        <!-- Tab: Mis Trámites -->
        @if (activeTab === 'mis-tramites') {
          @if (loadingTramites) {
            <div class="loading-state">⏳ Cargando tus trámites...</div>
          } @else if (misTramites.length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📂</span>
              <p>Aún no has iniciado ningún trámite.</p>
            </div>
          } @else {
            <div class="tramites-list">
              @for (t of misTramites; track t.id) {
                <div class="tramite-row">
                  <div class="tramite-info">
                    <div class="tramite-ref">{{ t.numeroReferencia || t.id.slice(0,8).toUpperCase() }}</div>
                    <div class="tramite-nombre">{{ t.nombrePolitica }}</div>
                    @if (t.nombreNodoActual) {
                      <div class="tramite-nodo">📍 {{ t.nombreNodoActual }}</div>
                    }
                    <div class="tramite-fecha">{{ t.fechaInicio | date:'dd/MM/yyyy' }}</div>
                  </div>
                  <div class="tramite-actions">
                    <span class="status-badge" [ngClass]="estadoClass(t.estado)">
                      {{ estadoLabel(t.estado) }}
                    </span>
                    <button class="btn-outline btn-sm" (click)="verDetalle(t.id)">
                      👁 Ver detalle
                    </button>
                    @if (t.estado === 'COMPLETADO') {
                      <button class="btn-pdf btn-sm" (click)="descargarPdf(t)"
                        [disabled]="descargando === t.id">
                        {{ descargando === t.id ? '⏳' : '📄' }} Descargar PDF
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </main>
    </div>

    <!-- Modal Solicitar -->
    @if (showModal && politicaSeleccionada) {
      <div class="modal-overlay" (click)="cerrarModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Solicitar Trámite</h2>
          <p class="modal-subtitle">{{ politicaSeleccionada.nombre }}</p>
          <div class="form-group">
            <label class="form-label">Descripción / Motivo (opcional)</label>
            <textarea class="form-input" rows="4" [(ngModel)]="modalDescripcion"
              placeholder="Describe brevemente el motivo de tu solicitud..."></textarea>
          </div>
          @if (modalError) {
            <div class="alert-error">❌ {{ modalError }}</div>
          }
          <div class="modal-footer">
            <button class="btn-outline" (click)="cerrarModal()" [disabled]="enviando">Cancelar</button>
            <button class="btn-primary" (click)="confirmarSolicitud()" [disabled]="enviando">
              {{ enviando ? '⏳ Enviando...' : '✅ Confirmar solicitud' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Toast -->
    @if (toast) {
      <div class="toast" [class.toast-success]="toast.type === 'success'"
        [class.toast-error]="toast.type === 'error'">
        {{ toast.message }}
      </div>
    }
  `,
  styles: [`
    /* Layout */
    .app-layout { display: flex; height: 100vh; background: #f8fafc; overflow: hidden; }
    .main-content {
      flex: 1; overflow-y: auto; padding: 28px 32px;
      background: #f8fafc; font-family: 'Space Grotesk', sans-serif;
    }

    /* Header */
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px;
    }
    .page-title { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Notification Bell */
    .notif-wrapper { position: relative; }
    .notif-btn {
      position: relative; background: white; border: 1px solid #e2e8f0;
      border-radius: 10px; width: 42px; height: 42px; font-size: 18px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.2s;
    }
    .theme-btn-header {
      background: white; border: 1px solid #e2e8f0;
      border-radius: 10px; width: 42px; height: 42px; font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.2s;
    }
    .theme-btn-header:hover { border-color: #3b82f6; }
    .notif-btn:hover { border-color: #3b82f6; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #ef4444; color: white; border-radius: 10px;
      font-size: 10px; font-weight: 700; padding: 1px 5px; min-width: 16px;
      text-align: center;
    }
    .notif-panel {
      position: absolute; top: 50px; right: 0; width: 320px;
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; overflow: hidden;
    }
    .notif-panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-bottom: 1px solid #f1f5f9;
      font-size: 13px; font-weight: 600; color: #1e293b;
    }
    .btn-link {
      background: none; border: none; color: #3b82f6; font-size: 12px;
      cursor: pointer; padding: 0; font-family: inherit;
    }
    .btn-link:hover { text-decoration: underline; }
    .notif-empty { padding: 20px 16px; text-align: center; color: #94a3b8; font-size: 13px; margin: 0; }
    .notif-item {
      padding: 12px 16px; border-bottom: 1px solid #f8fafc; cursor: pointer;
      transition: background 0.15s;
    }
    .notif-item:hover { background: #f8fafc; }
    .notif-item.unread { background: #eff6ff; }
    .notif-msg { font-size: 13px; color: #334155; margin: 0 0 4px; }
    .notif-date { font-size: 11px; color: #94a3b8; }

    /* Tabs */
    .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: white;
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 4px; width: fit-content; }
    .tab-btn {
      padding: 8px 18px; border-radius: 8px; border: none; background: none;
      font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer;
      transition: all 0.2s; display: flex; align-items: center; gap: 6px;
      font-family: 'Space Grotesk', sans-serif;
    }
    .tab-btn.active { background: #3b82f6; color: white; }
    .tab-btn:not(.active):hover { background: #f1f5f9; color: #1e293b; }
    .tab-count {
      background: #e2e8f0; color: #475569; border-radius: 10px;
      font-size: 11px; font-weight: 700; padding: 1px 6px;
    }
    .tab-btn.active .tab-count { background: rgba(255,255,255,0.25); color: white; }

    /* States */
    .loading-state, .empty-state {
      text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 14px;
    }
    .empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }

    /* Politica Cards */
    .cards-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;
    }
    .politica-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 20px; display: flex; flex-direction: column; gap: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05); transition: box-shadow 0.2s, transform 0.2s;
    }
    .politica-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .card-category {
      font-size: 11px; font-weight: 600; color: #3b82f6;
      background: #eff6ff; border-radius: 6px; padding: 2px 8px;
      width: fit-content; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .card-title { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
    .card-desc { font-size: 13px; color: #64748b; margin: 0; flex: 1; line-height: 1.5; }
    .card-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .meta-item { font-size: 12px; color: #94a3b8; }
    .btn-full { width: 100%; margin-top: 4px; }

    /* Tramites List */
    .tramites-list { display: flex; flex-direction: column; gap: 10px; }
    .tramite-row {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px 20px; display: flex; align-items: center;
      justify-content: space-between; gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: box-shadow 0.2s;
    }
    .tramite-row:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.08); }
    .tramite-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .tramite-ref { font-size: 11px; font-weight: 700; color: #3b82f6; letter-spacing: 0.05em; }
    .tramite-nombre { font-size: 14px; font-weight: 600; color: #1e293b; }
    .tramite-nodo { font-size: 12px; color: #64748b; }
    .tramite-fecha { font-size: 11px; color: #94a3b8; }
    .tramite-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    /* Status Badges */
    .status-badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .badge-nuevo { background: #eff6ff; color: #2563eb; }
    .badge-en-proceso { background: #fef9c3; color: #ca8a04; }
    .badge-completado { background: #dcfce7; color: #16a34a; }
    .badge-rechazado { background: #fee2e2; color: #dc2626; }

    /* Buttons */
    .btn-primary {
      padding: 9px 18px; background: #3b82f6; color: white; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: 'Space Grotesk', sans-serif; transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline {
      padding: 9px 18px; background: white; color: #475569;
      border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;
      font-weight: 500; cursor: pointer; font-family: 'Space Grotesk', sans-serif;
      transition: all 0.2s;
    }
    .btn-outline:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-pdf {
      padding: 9px 18px; background: #f0fdf4; color: #16a34a;
      border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; font-family: 'Space Grotesk', sans-serif;
      transition: all 0.2s;
    }
    .btn-pdf:hover:not(:disabled) { background: #dcfce7; }
    .btn-pdf:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center; z-index: 200;
    }
    .modal-box {
      background: white; border-radius: 16px; padding: 28px;
      width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .modal-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
    .modal-subtitle { font-size: 13px; color: #64748b; margin: 0 0 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-input {
      padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 13px; font-family: 'Space Grotesk', sans-serif; color: #1e293b;
      outline: none; resize: vertical; transition: border-color 0.2s;
    }
    .form-input:focus { border-color: #3b82f6; }
    .alert-error {
      background: #fee2e2; color: #dc2626; border-radius: 8px;
      padding: 10px 14px; font-size: 13px; margin-top: 12px;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 300;
      padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;
      font-family: 'Space Grotesk', sans-serif;
    }
    .toast-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .toast-error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 768px) {
      .main-content { padding: 16px; }
      .tramite-row { flex-direction: column; align-items: flex-start; }
      .tramite-actions { flex-wrap: wrap; }
    }
  `]
})
export class ClientePortalComponent implements OnInit, OnDestroy {
  user: any;
  navItems: NavItem[] = [
    { icon: '🏠', label: 'Trámites', route: '/cliente' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' }
  ];

  activeTab: 'disponibles' | 'mis-tramites' = 'disponibles';

  politicas: Politica[] = [];
  misTramites: Tramite[] = [];
  notificaciones: Notificacion[] = [];
  unreadCount = 0;

  loadingPoliticas = false;
  loadingTramites = false;
  showNotifPanel = false;

  // Modal
  showModal = false;
  politicaSeleccionada: Politica | null = null;
  modalDescripcion = '';
  modalError = '';
  enviando = false;

  // PDF download
  descargando: string | null = null;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  private wsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private politicaService: PoliticaService,
    private tramiteService: TramiteService,
    private notificacionService: NotificacionService,
    private wsService: WebSocketService,
    public themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.cargarPoliticas();
    this.cargarTramites();
    this.cargarNotificaciones();
    this.conectarWS();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.desconectar();
  }

  // ── Data loading ──────────────────────────────────────────────

  cargarPoliticas(): void {
    this.loadingPoliticas = true;
    this.politicaService.getActivas().pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudieron cargar los trámites disponibles: ' + msg, 'error');
        this.loadingPoliticas = false;
        return of([]);
      })
    ).subscribe(data => {
      this.politicas = data;
      this.loadingPoliticas = false;
    });
  }

  cargarTramites(): void {
    if (!this.user?.id) return;
    this.loadingTramites = true;
    this.tramiteService.getByCliente(this.user.id).pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudieron cargar tus trámites: ' + msg, 'error');
        this.loadingTramites = false;
        return of([]);
      })
    ).subscribe(data => {
      this.misTramites = data;
      this.loadingTramites = false;
    });
  }

  cargarNotificaciones(): void {
    if (!this.user?.id) return;
    this.notificacionService.getNoLeidas(this.user.id).pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      this.notificaciones = data;
      this.unreadCount = data.filter(n => !n.leida).length;
    });
  }

  // ── WebSocket ─────────────────────────────────────────────────

  conectarWS(): void {
    if (!this.user?.id) return;
    this.wsService.conectar(this.user.id, this.user.rol);
    this.wsSub = this.wsService.notificaciones$.subscribe(msg => {
      this.cargarTramites();
      this.cargarNotificaciones();
      this.showToast(msg.mensaje || 'Nueva notificación recibida', 'success');
    });
  }

  // ── Notifications ─────────────────────────────────────────────

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) return;
    this.notificacionService.marcarLeida(n.id).pipe(catchError(() => of(null))).subscribe(() => {
      n.leida = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  marcarTodasLeidas(): void {
    if (!this.user?.id) return;
    this.notificacionService.marcarTodasLeidas(this.user.id).pipe(catchError(() => of(null))).subscribe(() => {
      this.notificaciones.forEach(n => n.leida = true);
      this.unreadCount = 0;
    });
  }

  // ── Modal ─────────────────────────────────────────────────────

  abrirModal(politica: Politica): void {
    this.politicaSeleccionada = politica;
    this.modalDescripcion = '';
    this.modalError = '';
    this.enviando = false;
    this.showModal = true;
  }

  cerrarModal(): void {
    if (this.enviando) return;
    this.showModal = false;
    this.politicaSeleccionada = null;
  }

  confirmarSolicitud(): void {
    if (!this.politicaSeleccionada || !this.user?.id) return;
    this.enviando = true;
    this.modalError = '';
    this.tramiteService.iniciar(this.politicaSeleccionada.id, this.user.id, this.modalDescripcion).pipe(
      catchError(err => {
        this.modalError = err?.error?.error || 'Error al iniciar el trámite. Intenta de nuevo.';
        this.enviando = false;
        return of(null);
      })
    ).subscribe(tramite => {
      if (!tramite) return;
      this.enviando = false;
      this.showModal = false;
      this.politicaSeleccionada = null;
      this.showToast('Trámite iniciado correctamente', 'success');
      this.cargarTramites();
      this.activeTab = 'mis-tramites';
    });
  }

  // ── Tramite actions ───────────────────────────────────────────

  verDetalle(id: string): void {
    this.router.navigate(['/tramite', id]);
  }

  descargarPdf(tramite: Tramite): void {
    this.descargando = tramite.id;
    this.tramiteService.descargarPdf(tramite.id).pipe(
      catchError(() => {
        this.showToast('Error al descargar el PDF', 'error');
        this.descargando = null;
        return of(null);
      })
    ).subscribe(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tramite-${tramite.numeroReferencia || tramite.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.descargando = null;
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      NUEVO: 'badge-nuevo',
      EN_PROCESO: 'badge-en-proceso',
      COMPLETADO: 'badge-completado',
      RECHAZADO: 'badge-rechazado'
    };
    return `status-badge ${map[estado] || 'badge-rechazado'}`;
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      NUEVO: '🔵 Nuevo',
      EN_PROCESO: '🟡 En Proceso',
      COMPLETADO: '🟢 Completado',
      RECHAZADO: '🔴 Rechazado'
    };
    return map[estado] || estado;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }
}
