import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { Tarea, Notificacion } from '../../models/models';
import { TareaService } from '../../services/tarea/tarea.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/dashboard" [navItems]="navItems" />

      <main class="main-content">

        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Bienvenido, {{ user?.nombre }}</h1>
            <p class="page-sub">{{ user?.departamento || 'Departamento' }} — Monitor de Actividades</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <!-- Notificaciones -->
            <div class="notif-wrap" (click)="toggleNotifs()">
              <button class="notif-btn">
                🔔
                @if (notificaciones.length > 0) {
                  <span class="notif-badge">{{ notificaciones.length }}</span>
                }
              </button>
              @if (showNotifs) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  <div class="notif-header">
                    <p class="notif-title">Notificaciones</p>
                    @if (notificaciones.length > 0) {
                      <button class="notif-clear" (click)="marcarTodasLeidas()">Marcar leídas</button>
                    }
                  </div>
                  @for (n of notificaciones; track n.id) {
                    <div class="notif-item" (click)="onNotifClick(n)">
                      <span class="notif-dot dot-tarea"></span>
                      <span class="notif-msg">{{ n.mensaje }}</span>
                    </div>
                  }
                  @if (notificaciones.length === 0) {
                    <p class="notif-empty">✅ Sin notificaciones</p>
                  }
                </div>
              }
            </div>
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
            <button class="btn-outline" style="font-size:12px" (click)="cargarTareas()">↺ Actualizar</button>
          </div>
        </div>

        <!-- Stats semáforo -->
        <div class="stats-grid">
          <div class="stat-card stat-azul">
            <div class="stat-semaforo">🔵</div>
            <div>
              <p class="stat-label">NUEVAS / URGENTES</p>
              <p class="stat-value">{{ pendientes.length }}</p>
              <p class="stat-trend">Requieren atención</p>
            </div>
          </div>
          <div class="stat-card stat-amarillo">
            <div class="stat-semaforo">🟡</div>
            <div>
              <p class="stat-label">EN PROGRESO</p>
              <p class="stat-value">{{ enProceso.length }}</p>
              <p class="stat-trend">En ejecución</p>
            </div>
          </div>
          <div class="stat-card stat-verde">
            <div class="stat-semaforo">🟢</div>
            <div>
              <p class="stat-label">COMPLETADAS</p>
              <p class="stat-value">{{ completadas.length }}</p>
              <p class="stat-trend">Finalizadas</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-semaforo">📊</div>
            <div>
              <p class="stat-label">TOTAL</p>
              <p class="stat-value">{{ tareas.length }}</p>
              <p class="stat-trend">Asignadas</p>
            </div>
          </div>
        </div>

        <!-- Kanban board -->
        @if (loading) {
          <div class="loading-state"><div class="spinner"></div><p>Cargando tareas...</p></div>
        }

        @if (!loading) {
          <div class="kanban-board">

             <!-- Columna: NUEVAS (PENDIENTE) -->
            <div class="kanban-col"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, 'PENDIENTE')">
              <div class="col-header col-azul">
                <div class="col-indicator azul"></div>
                <h3 class="col-title">🔵 NUEVAS</h3>
                <span class="col-count">{{ pendientes.length }}</span>
              </div>
              @for (t of pendientes; track t.id) {
                <div class="task-card card-azul"
                  draggable="true"
                  (dragstart)="onDragStart($event, t)"
                  (click)="abrirTarea(t)">
                  <div class="task-header">
                    <span class="task-ref mono">{{ t.numeroReferenciaTramite }}</span>
                    <span class="task-prioridad" [class.alta]="t.prioridad === 'ALTA'"
                      [class.media]="t.prioridad === 'MEDIA'" [class.baja]="t.prioridad === 'BAJA'">
                      {{ t.prioridad }}
                    </span>
                  </div>
                  <p class="task-nombre">{{ t.nombreNodo }}</p>
                  <p class="task-politica">{{ t.nombrePolitica }}</p>
                  <div class="task-footer">
                    <span class="task-dept">{{ t.departamento }}</span>
                    <span class="task-fecha">{{ t.fechaAsignacion | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <div class="task-actions">
                    <button class="task-btn" (click)="$event.stopPropagation(); cambiarEstado(t, 'EN_PROCESO')">
                      ▶️ Iniciar
                    </button>
                    <button class="task-btn task-btn-primary" (click)="$event.stopPropagation(); abrirTarea(t)">
                      Ver →
                    </button>
                  </div>
                </div>
              }
              @if (pendientes.length === 0) {
                <div class="col-empty">Sin tareas nuevas</div>
              }
            </div>

            <!-- Columna: EN PROGRESO -->
            <div class="kanban-col"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, 'EN_PROCESO')">
              <div class="col-header col-amarillo">
                <div class="col-indicator amarillo"></div>
                <h3 class="col-title">🟡 EN PROGRESO</h3>
                <span class="col-count">{{ enProceso.length }}</span>
              </div>
              @for (t of enProceso; track t.id) {
                <div class="task-card card-amarillo"
                  draggable="true"
                  (dragstart)="onDragStart($event, t)"
                  (click)="abrirTarea(t)">
                  <div class="task-header">
                    <span class="task-ref mono">{{ t.numeroReferenciaTramite }}</span>
                    <span class="task-prioridad" [class.alta]="t.prioridad === 'ALTA'"
                      [class.media]="t.prioridad === 'MEDIA'" [class.baja]="t.prioridad === 'BAJA'">
                      {{ t.prioridad }}
                    </span>
                  </div>
                  <p class="task-nombre">{{ t.nombreNodo }}</p>
                  <p class="task-politica">{{ t.nombrePolitica }}</p>
                  <div class="task-footer">
                    <span class="task-dept">{{ t.departamento }}</span>
                    <span class="task-fecha">{{ t.fechaAsignacion | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <div class="task-actions">
                    <button class="task-btn task-btn-primary" (click)="$event.stopPropagation(); abrirTarea(t)">
                      📝 Completar
                    </button>
                  </div>
                </div>
              }
              @if (enProceso.length === 0) {
                <div class="col-empty">Sin tareas en progreso</div>
              }
            </div>

            <!-- Columna: COMPLETADAS -->
            <div class="kanban-col"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, 'COMPLETADO')">
              <div class="col-header col-verde">
                <div class="col-indicator verde"></div>
                <h3 class="col-title">🟢 COMPLETADAS</h3>
                <span class="col-count">{{ completadas.length }}</span>
              </div>
              @for (t of completadas; track t.id) {
                <div class="task-card card-verde"
                  draggable="true"
                  (dragstart)="onDragStart($event, t)"
                  (click)="abrirTarea(t)">
                  <div class="task-header">
                    <span class="task-ref mono">{{ t.numeroReferenciaTramite }}</span>
                    @if (t.duracionMinutos) {
                      <span class="task-duracion">{{ t.duracionMinutos }}min</span>
                    }
                  </div>
                  <p class="task-nombre">{{ t.nombreNodo }}</p>
                  <p class="task-politica">{{ t.nombrePolitica }}</p>
                  <div class="task-footer">
                    <span class="task-dept">{{ t.departamento }}</span>
                    <span class="task-fecha">{{ t.fechaCompletado | date:'dd/MM HH:mm' }}</span>
                  </div>
                </div>
              }
              @if (completadas.length === 0) {
                <div class="col-empty">Sin tareas completadas</div>
              }
            </div>

          </div>
        }

        <!-- Toast -->
        @if (toast) {
          <div class="toast-fixed" [class.toast-success]="toastType === 'success'" [class.toast-error]="toastType === 'error'">
            @if (toastType === 'success') { ✅ }
            @if (toastType === 'error') { ❌ }
            {{ toast }}
          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px;
      display: flex; align-items: center; gap: 14px;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-azul    { border-left: 3px solid var(--primary); }
    .stat-amarillo{ border-left: 3px solid var(--warning); }
    .stat-verde   { border-left: 3px solid var(--success); }
    .stat-semaforo { font-size: 28px; flex-shrink: 0; }
    .stat-label { font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; margin: 0 0 2px; }
    .stat-value { font-size: 28px; font-weight: 700; margin: 0 0 2px; color: var(--text); }
    .stat-trend { font-size: 10px; color: var(--text-faint); margin: 0; }

    /* Kanban */
    .kanban-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .kanban-col {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: 14px; padding: 14px; min-height: 400px;
      transition: background 0.2s;
    }
    .kanban-col.drag-over { background: hsl(216,85%,50%,0.05); border-color: var(--primary); }

    .col-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 14px; padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .col-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .azul    { background: var(--primary); }
    .amarillo{ background: var(--warning); }
    .verde   { background: var(--success); }
    .col-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-muted); margin: 0; flex: 1; }
    .col-count {
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; padding: 2px 8px; font-size: 11px; font-weight: 700;
    }
    .col-empty { text-align: center; color: var(--text-faint); font-size: 12px; margin-top: 30px; }

    /* Task cards */
    .task-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 10px; padding: 12px; margin-bottom: 10px;
      cursor: grab; transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    .task-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .task-card:active { cursor: grabbing; }
    .card-azul    { border-left-color: var(--primary); }
    .card-amarillo{ border-left-color: var(--warning); }
    .card-verde   { border-left-color: var(--success); }

    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .task-ref { font-size: 11px; color: var(--primary); }
    .task-prioridad {
      font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
    }
    .alta  { background: hsl(355,80%,55%,0.12); color: var(--danger); }
    .media { background: hsl(20,89%,48%,0.12);  color: var(--warning); }
    .baja  { background: hsl(142,60%,38%,0.12); color: var(--success); }
    .task-duracion { font-size: 10px; color: var(--text-faint); }

    .task-nombre { font-size: 13px; font-weight: 600; margin: 0 0 3px; color: var(--text); }
    .task-politica { font-size: 11px; color: var(--text-muted); margin: 0 0 8px; }
    .task-footer { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .task-dept { font-size: 10px; color: var(--text-faint); }
    .task-fecha { font-size: 10px; color: var(--text-faint); }

    .task-actions { display: flex; gap: 6px; }
    .task-btn {
      flex: 1; padding: 5px 8px; background: var(--bg-2);
      border: 1px solid var(--border-2); border-radius: 6px;
      cursor: pointer; font-size: 11px; font-family: inherit;
      color: var(--text-muted); transition: all 0.15s;
    }
    .task-btn:hover { border-color: var(--primary); color: var(--primary); }
    .task-btn-primary {
      background: hsl(216,85%,50%,0.1);
      border-color: var(--primary); color: var(--primary);
    }

    /* Notificaciones */
    .notif-wrap { position: relative; }
    .notif-btn {
      position: relative; width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: var(--danger); color: white; border-radius: 50%;
      width: 16px; height: 16px; font-size: 9px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
    }
    .notif-panel {
      position: absolute; right: 0; top: 48px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 12px; padding: 14px; width: 300px;
      box-shadow: var(--shadow-lg); z-index: 100;
    }
    .notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .notif-title { font-size: 11px; font-weight: 600; color: var(--text-muted); margin: 0; }
    .notif-clear { font-size: 10px; color: var(--accent); background: none; border: none; cursor: pointer; font-family: inherit; }
    .notif-item {
      padding: 8px 0; border-bottom: 1px solid var(--border);
      font-size: 12px; color: var(--text);
      display: flex; align-items: flex-start; gap: 8px; cursor: pointer;
    }
    .notif-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .dot-tarea { background: var(--primary); }
    .notif-msg { flex: 1; line-height: 1.4; }
    .notif-empty { font-size: 12px; color: var(--text-muted); margin: 0; }

    @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) {
      .kanban-board { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }

    /* Toast fixed */
    .toast-fixed {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      padding: 12px 20px; border-radius: 10px;
      font-size: 13px; font-weight: 500;
      display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease; max-width: 360px;
    }
    .toast-success { background: #14532d; border: 1px solid #16a34a; color: #bbf7d0; }
    .toast-error   { background: #450a0a; border: 1px solid #dc2626; color: #fecaca; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: any;
  tareas: Tarea[] = [];
  notificaciones: Notificacion[] = [];
  showNotifs = false;
  loading = true;
  toast = '';
  toastType = 'success';

  private draggingTarea: Tarea | null = null;
  private wsSub!: Subscription;

  navItems: NavItem[] = [
    { icon: '📋', label: 'Mis Tareas', route: '/dashboard' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  get pendientes() { return this.tareas.filter(t => t.estado === 'PENDIENTE'); }
  get enProceso() { return this.tareas.filter(t => t.estado === 'EN_PROCESO'); }
  get completadas() { return this.tareas.filter(t => t.estado === 'COMPLETADO'); }

  constructor(
    private tareaService: TareaService,
    private authService: AuthService,
    private wsService: WebSocketService,
    private notifService: NotificacionService,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.cargarTareas();
    this.cargarNotificaciones();
    this.conectarWebSocket();
  }

  cargarTareas(): void {
    if (!this.user?.id) { this.loading = false; return; }
    this.loading = true;
    const dept = this.user.departamento;
    if (dept) {
      this.tareaService.getByDepartamento(dept).pipe(
        catchError(err => {
          const msg = err.error?.error || err.message || 'Error desconocido';
          this.showToast('No se pudieron cargar las tareas: ' + msg, 'error');
          return of([]);
        })
      ).subscribe(t => {
        this.tareas = t;
        this.loading = false;
      });
    } else {
      this.tareaService.getByFuncionario(this.user.id).pipe(
        catchError(err => {
          const msg = err.error?.error || err.message || 'Error desconocido';
          this.showToast('No se pudieron cargar las tareas: ' + msg, 'error');
          return of([]);
        })
      ).subscribe(t => {
        this.tareas = t;
        this.loading = false;
      });
    }
  }

  cargarNotificaciones(): void {
    if (!this.user?.id) return;
    this.notifService.getNoLeidas(this.user.id).pipe(catchError(() => of([]))).subscribe(n => {
      this.notificaciones = n;
    });
  }

  conectarWebSocket(): void {
    if (!this.user?.id) return;
    this.wsService.conectar(this.user.id, this.user.rol, this.user.departamento);
    this.wsSub = this.wsService.notificaciones$.subscribe(() => {
      this.cargarTareas();
      this.cargarNotificaciones();
    });
  }

  // Drag & Drop
  onDragStart(event: DragEvent, tarea: Tarea): void {
    this.draggingTarea = tarea;
    event.dataTransfer?.setData('tareaId', tarea.id);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDrop(event: DragEvent, nuevoEstado: string): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (!this.draggingTarea) return;
    const tarea = this.draggingTarea;
    this.draggingTarea = null;

    // Only allow moving within own department
    if (tarea.departamento !== this.user?.departamento && this.user?.rol !== 'ADMIN') {
      this.showToast('Solo puedes mover tareas de tu departamento', 'error');
      return;
    }

    if (tarea.estado === nuevoEstado) return;

    if (nuevoEstado === 'COMPLETADO') {
      this.router.navigate(['/tarea', tarea.id]);
      return;
    }

    this.cambiarEstado(tarea, nuevoEstado);
  }

  cambiarEstado(tarea: Tarea, estado: string): void {
    this.tareaService.actualizarEstado(tarea.id, estado).pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudo cambiar el estado: ' + msg, 'error');
        return of(null);
      })
    ).subscribe(t => {
      if (t) {
        const idx = this.tareas.findIndex(x => x.id === tarea.id);
        if (idx >= 0) this.tareas[idx] = t;
        this.showToast(`Tarea movida a ${estado} correctamente`, 'success');
      }
    });
  }

  abrirTarea(tarea: Tarea): void {
    this.router.navigate(['/tarea', tarea.id]);
  }

  toggleNotifs(): void { this.showNotifs = !this.showNotifs; }

  marcarTodasLeidas(): void {
    if (!this.user?.id) return;
    this.notifService.marcarTodasLeidas(this.user.id).subscribe(() => {
      this.notificaciones = [];
    });
  }

  onNotifClick(n: Notificacion): void {
    this.notifService.marcarLeida(n.id).subscribe();
    this.notificaciones = this.notificaciones.filter(x => x.id !== n.id);
    this.showNotifs = false;
  }

  showToast(msg: string, type: string): void {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
    this.wsService.desconectar();
  }
}
