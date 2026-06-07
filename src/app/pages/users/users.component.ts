import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Usuario } from '../../models/models';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { DepartamentoService, Departamento } from '../../services/departamento/departamento.service';
import { AuthService } from '../../services/auth/auth.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/users" [navItems]="navItems" />
      <main class="main-content">

        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">👥 Gestión de Usuarios</h1>
            <p class="page-sub">Administra usuarios, roles y departamentos</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn-outline" (click)="activeTab = 'departamentos'">🏢 Departamentos</button>
            <button class="btn-primary" (click)="abrirModalCrear()">+ Nuevo Usuario</button>
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" [class.active]="activeTab === 'usuarios'" (click)="activeTab = 'usuarios'">
            👤 Usuarios ({{ usuarios.length }})
          </button>
          <button class="tab" [class.active]="activeTab === 'departamentos'" (click)="activeTab = 'departamentos'">
            🏢 Departamentos ({{ departamentos.length }})
          </button>
        </div>

        <!-- USUARIOS TAB -->
        @if (activeTab === 'usuarios') {
          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-pill">
              <span class="stat-num">{{ usuarios.length }}</span>
              <span class="stat-lbl">Total</span>
            </div>
            <div class="stat-pill green">
              <span class="stat-num">{{ getCount('ADMIN') }}</span>
              <span class="stat-lbl">Admins</span>
            </div>
            <div class="stat-pill blue">
              <span class="stat-num">{{ getCount('FUNCIONARIO') }}</span>
              <span class="stat-lbl">Funcionarios</span>
            </div>
            <div class="stat-pill cyan">
              <span class="stat-num">{{ getCount('CLIENTE') }}</span>
              <span class="stat-lbl">Clientes</span>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-row">
            <input class="form-input" type="text" placeholder="🔍 Buscar por nombre o email..."
              [(ngModel)]="searchQuery" (input)="applyFilters()" style="flex:1;min-width:200px" />
            <select class="form-input" [(ngModel)]="selectedRol" (change)="applyFilters()" style="width:160px">
              <option value="">Todos los roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FUNCIONARIO">FUNCIONARIO</option>
              <option value="CLIENTE">CLIENTE</option>
            </select>
          </div>

          @if (loading) {
            <div class="loading-state"><div class="spinner"></div><p>Cargando usuarios...</p></div>
          } @else {
            <div class="glass-card">
              @if (filteredUsuarios.length === 0) {
                <div class="empty-state">No se encontraron usuarios</div>
              } @else {
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>USUARIO</th>
                        <th>ROL</th>
                        <th>DEPARTAMENTO</th>
                        <th>ESTADO</th>
                        <th>REGISTRO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (u of filteredUsuarios; track u.id) {
                        <tr>
                          <td>
                            <div style="display:flex;align-items:center;gap:10px">
                              <div class="avatar-sm" [style.background]="getAvatarColor(u.rol)">
                                {{ u.nombre.charAt(0).toUpperCase() }}
                              </div>
                              <div>
                                <p style="font-size:13px;font-weight:500;margin:0 0 2px">{{ u.nombre }}</p>
                                <p style="font-size:11px;color:var(--text-muted);margin:0">{{ u.email }}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span class="badge" [ngClass]="getRolClass(u.rol)">{{ u.rol }}</span>
                          </td>
                          <td style="color:var(--text-muted);font-size:12px">{{ u.departamento || '—' }}</td>
                          <td>
                            <span class="badge" [class.badge-completado]="u.activo" [class.badge-rechazado]="!u.activo">
                              {{ u.activo ? '● Activo' : '○ Inactivo' }}
                            </span>
                          </td>
                          <td class="mono" style="font-size:11px;color:var(--text-muted)">
                            {{ u.fechaCreacion ? (u.fechaCreacion | date:'dd/MM/yyyy') : '—' }}
                          </td>
                          <td>
                            <div style="display:flex;gap:6px">
                              <button class="btn-icon" title="Editar" (click)="abrirModalEditar(u)">✏️</button>
                              <button class="btn-icon danger" title="Eliminar" (click)="eliminarUsuario(u)">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        }

        <!-- DEPARTAMENTOS TAB -->
        @if (activeTab === 'departamentos') {
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn-primary" (click)="abrirModalDept()">+ Nuevo Departamento</button>
          </div>

          @if (loadingDept) {
            <div class="loading-state"><div class="spinner"></div></div>
          } @else {
            <div class="dept-grid">
              @for (d of departamentos; track d.id) {
                <div class="glass-card dept-card">
                  <div class="dept-header">
                    <div class="dept-icon">🏢</div>
                    <div>
                      <h3 class="dept-nombre">{{ d.nombre }}</h3>
                      <p class="dept-desc">{{ d.descripcion || 'Sin descripción' }}</p>
                    </div>
                  </div>
                  <div class="dept-stats">
                    <span class="dept-stat">
                      {{ getFuncionariosDept(d.nombre) }} funcionarios
                    </span>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:12px">
                    <button class="btn-outline" style="flex:1;font-size:12px" (click)="abrirModalEditarDept(d)">✏️ Editar</button>
                    <button class="btn-danger" style="font-size:12px" (click)="eliminarDept(d)">🗑️</button>
                  </div>
                </div>
              }
              @if (departamentos.length === 0) {
                <div class="empty-state" style="grid-column:1/-1">No hay departamentos registrados</div>
              }
            </div>
          }
        }

      </main>
    </div>

    <!-- Modal Usuario -->
    @if (showModalUsuario) {
      <div class="modal-overlay" (click)="cerrarModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ editandoUsuario ? '✏️ Editar Usuario' : '+ Nuevo Usuario' }}</h3>
          <p class="modal-sub">{{ editandoUsuario ? 'Modifica los datos del usuario' : 'Crea un nuevo usuario en el sistema' }}</p>

          <div class="form-row-2">
            <div>
              <label class="form-label">Nombre completo *</label>
              <input type="text" class="form-input" [(ngModel)]="formUsuario.nombre" placeholder="Nombre completo" />
            </div>
            <div>
              <label class="form-label">Correo electrónico *</label>
              <input type="email" class="form-input" [(ngModel)]="formUsuario.email"
                placeholder="correo@empresa.com" [disabled]="!!editandoUsuario" />
            </div>
          </div>

          @if (!editandoUsuario) {
            <div style="margin-bottom:14px">
              <label class="form-label">Contraseña *</label>
              <input type="password" class="form-input" [(ngModel)]="formUsuario.password" placeholder="••••••••" />
            </div>
          }

          <div class="form-row-2">
            <div>
              <label class="form-label">Rol *</label>
              <select class="form-input" [(ngModel)]="formUsuario.rol">
                <option value="ADMIN">ADMIN</option>
                <option value="FUNCIONARIO">FUNCIONARIO</option>
                <option value="CLIENTE">CLIENTE</option>
              </select>
            </div>
            <div>
              <label class="form-label">Departamento</label>
              <select class="form-input" [(ngModel)]="formUsuario.departamento">
                <option value="">Sin departamento</option>
                @for (d of departamentos; track d.id) {
                  <option [value]="d.nombre">{{ d.nombre }}</option>
                }
              </select>
            </div>
          </div>

          @if (modalError) {
            <div class="toast toast-error" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">❌ {{ modalError }}</div>
          }
          @if (modalExito) {
            <div class="toast toast-success" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">✅ {{ modalExito }}</div>
          }

          <div class="modal-actions">
            <button class="btn-outline" (click)="cerrarModal()">Cancelar</button>
            <button class="btn-primary" (click)="guardarUsuario()" [disabled]="guardando">
              {{ guardando ? '⏳...' : (editandoUsuario ? 'Guardar cambios' : 'Crear usuario') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Departamento -->
    @if (showModalDept) {
      <div class="modal-overlay" (click)="cerrarModalDept()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ editandoDept ? '✏️ Editar Departamento' : '+ Nuevo Departamento' }}</h3>
          <div style="margin-bottom:14px">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" [(ngModel)]="formDept.nombre" placeholder="Ej: Dept. Técnico" />
          </div>
          <div style="margin-bottom:14px">
            <label class="form-label">Descripción</label>
            <textarea class="form-input" [(ngModel)]="formDept.descripcion" rows="2"
              placeholder="Descripción del departamento"></textarea>
          </div>
          @if (deptError) {
            <div class="toast toast-error" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">❌ {{ deptError }}</div>
          }
          <div class="modal-actions">
            <button class="btn-outline" (click)="cerrarModalDept()">Cancelar</button>
            <button class="btn-primary" (click)="guardarDept()" [disabled]="guardandoDept">
              {{ guardandoDept ? '⏳...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .tab {
      padding: 10px 18px; background: none; border: none;
      color: var(--text-muted); cursor: pointer; font-size: 13px;
      font-family: inherit; border-bottom: 2px solid transparent;
      transition: all 0.2s; margin-bottom: -1px;
    }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

    .stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-pill {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; background: var(--card);
      border: 1px solid var(--border); border-radius: 20px;
    }
    .stat-pill.green { border-color: hsl(282,69%,45%,0.3); }
    .stat-pill.blue  { border-color: hsl(216,85%,50%,0.3); }
    .stat-pill.cyan  { border-color: hsl(193,88%,38%,0.3); }
    .stat-num { font-size: 18px; font-weight: 700; color: var(--text); }
    .stat-lbl { font-size: 11px; color: var(--text-muted); }

    .filters-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

    .avatar-sm {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: 13px; color: white;
    }

    .badge-admin       { background: hsl(282,69%,45%,0.12); color: var(--purple); }
    .badge-funcionario { background: hsl(216,85%,50%,0.12); color: var(--primary); }
    .badge-cliente     { background: hsl(193,88%,38%,0.12); color: var(--accent); }

    .btn-icon {
      width: 28px; height: 28px; border-radius: 6px;
      background: var(--bg-2); border: 1px solid var(--border-2);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13px; transition: all 0.15s;
    }
    .btn-icon:hover { background: var(--card-hover); }
    .btn-icon.danger:hover { background: hsl(355,80%,55%,0.12); border-color: var(--danger); }

    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .dept-card {}
    .dept-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .dept-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: hsl(216,85%,50%,0.12); display: flex;
      align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
    }
    .dept-nombre { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    .dept-desc { font-size: 12px; color: var(--text-muted); margin: 0; }
    .dept-stats { font-size: 11px; color: var(--text-faint); }
    .dept-stat { background: var(--bg-2); padding: 3px 8px; border-radius: 6px; }

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .table-wrap { overflow-x: auto; }
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }

    @media (max-width: 700px) { .form-row-2 { grid-template-columns: 1fr; } }
  `]
})
export class UsersComponent implements OnInit {
  navItems: NavItem[] = [
    { icon: '📊', label: 'Panel Principal', route: '/admin' },
    { icon: '✏️', label: 'Editor de Políticas', route: '/editor' },
    { icon: '📈', label: 'Analytics', route: '/analytics' },
    { icon: '🤖', label: 'Reportes IA', route: '/reportes' },
    { icon: '👥', label: 'Usuarios', route: '/users' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  activeTab = 'usuarios';
  usuarios: Usuario[] = [];
  filteredUsuarios: Usuario[] = [];
  departamentos: Departamento[] = [];
  loading = true;
  loadingDept = true;
  searchQuery = '';
  selectedRol = '';

  // Modal usuario
  showModalUsuario = false;
  editandoUsuario: Usuario | null = null;
  formUsuario: any = { nombre: '', email: '', password: '', rol: 'FUNCIONARIO', departamento: '' };
  guardando = false;
  modalError = '';
  modalExito = '';

  // Modal departamento
  showModalDept = false;
  editandoDept: Departamento | null = null;
  formDept: any = { nombre: '', descripcion: '' };
  guardandoDept = false;
  deptError = '';

  constructor(
    private usuarioService: UsuarioService,
    private deptService: DepartamentoService,
    private authService: AuthService,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarDepartamentos();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.usuarioService.getAll().pipe(catchError(() => of([]))).subscribe(data => {
      this.usuarios = data;
      this.applyFilters();
      this.loading = false;
    });
  }

  cargarDepartamentos(): void {
    this.loadingDept = true;
    this.deptService.getAll().pipe(catchError(() => of([]))).subscribe(data => {
      this.departamentos = data;
      this.loadingDept = false;
    });
  }

  applyFilters(): void {
    let r = [...this.usuarios];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      r = r.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (this.selectedRol) r = r.filter(u => u.rol === this.selectedRol);
    this.filteredUsuarios = r;
  }

  getCount(rol: string): number { return this.usuarios.filter(u => u.rol === rol).length; }
  getFuncionariosDept(nombre: string): number { return this.usuarios.filter(u => u.departamento === nombre).length; }

  getAvatarColor(rol: string): string {
    const m: Record<string, string> = {
      ADMIN: 'linear-gradient(135deg,hsl(282,69%,45%),hsl(216,85%,50%))',
      FUNCIONARIO: 'linear-gradient(135deg,hsl(216,85%,50%),hsl(193,88%,38%))',
      CLIENTE: 'linear-gradient(135deg,hsl(193,88%,38%),hsl(142,60%,38%))',
    };
    return m[rol] || 'linear-gradient(135deg,#666,#888)';
  }

  getRolClass(rol: string): string {
    return { ADMIN: 'badge-admin', FUNCIONARIO: 'badge-funcionario', CLIENTE: 'badge-cliente' }[rol] || '';
  }

  // ── Modal Usuario ──────────────────────────────────────
  abrirModalCrear(): void {
    this.editandoUsuario = null;
    this.formUsuario = { nombre: '', email: '', password: '123456', rol: 'FUNCIONARIO', departamento: '' };
    this.modalError = ''; this.modalExito = '';
    this.showModalUsuario = true;
  }

  abrirModalEditar(u: Usuario): void {
    this.editandoUsuario = u;
    this.formUsuario = { nombre: u.nombre, email: u.email, rol: u.rol, departamento: u.departamento || '' };
    this.modalError = ''; this.modalExito = '';
    this.showModalUsuario = true;
  }

  cerrarModal(): void { this.showModalUsuario = false; }

  guardarUsuario(): void {
    if (!this.formUsuario.nombre || !this.formUsuario.email) {
      this.modalError = 'Nombre y email son requeridos'; return;
    }
    this.guardando = true; this.modalError = '';
    if (this.editandoUsuario) {
      this.usuarioService.update(this.editandoUsuario.id, this.formUsuario).subscribe({
        next: () => {
          this.modalExito = 'Usuario actualizado';
          this.guardando = false;
          this.cargarUsuarios();
          setTimeout(() => this.cerrarModal(), 1500);
        },
        error: (e) => { this.modalError = e.error?.error || 'Error al actualizar'; this.guardando = false; }
      });
    } else {
      this.usuarioService.register(this.formUsuario).subscribe({
        next: () => {
          this.modalExito = 'Usuario creado exitosamente';
          this.guardando = false;
          this.cargarUsuarios();
          setTimeout(() => this.cerrarModal(), 1500);
        },
        error: (e) => { this.modalError = e.error?.error || 'Error al crear usuario'; this.guardando = false; }
      });
    }
  }

  eliminarUsuario(u: Usuario): void {
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
    this.usuarioService.delete(u.id).subscribe({
      next: () => this.cargarUsuarios(),
      error: (e) => alert(e.error?.error || 'Error al eliminar')
    });
  }

  // ── Modal Departamento ─────────────────────────────────
  abrirModalDept(): void {
    this.editandoDept = null;
    this.formDept = { nombre: '', descripcion: '' };
    this.deptError = '';
    this.showModalDept = true;
  }

  abrirModalEditarDept(d: Departamento): void {
    this.editandoDept = d;
    this.formDept = { nombre: d.nombre, descripcion: d.descripcion || '' };
    this.deptError = '';
    this.showModalDept = true;
  }

  cerrarModalDept(): void { this.showModalDept = false; }

  guardarDept(): void {
    if (!this.formDept.nombre) { this.deptError = 'El nombre es requerido'; return; }
    this.guardandoDept = true; this.deptError = '';
    const obs = this.editandoDept
      ? this.deptService.update(this.editandoDept.id, this.formDept)
      : this.deptService.create(this.formDept);
    obs.subscribe({
      next: () => {
        this.guardandoDept = false;
        this.cargarDepartamentos();
        this.cerrarModalDept();
      },
      error: (e) => { this.deptError = e.error?.error || 'Error al guardar'; this.guardandoDept = false; }
    });
  }

  eliminarDept(d: Departamento): void {
    if (!confirm(`¿Eliminar departamento "${d.nombre}"?`)) return;
    this.deptService.delete(d.id).subscribe({
      next: () => this.cargarDepartamentos(),
      error: (e) => alert(e.error?.error || 'Error al eliminar')
    });
  }
}
