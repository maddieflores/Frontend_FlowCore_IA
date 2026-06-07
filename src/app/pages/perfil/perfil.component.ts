import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [activeRoute]="'/perfil'" [navItems]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">Mi Perfil</h1>
            <p class="page-sub">Gestiona tu información personal</p>
          </div>
          <button class="theme-btn-header" (click)="themeService.toggle()"
            [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
            {{ themeService.isDark() ? '☀️' : '🌙' }}
          </button>
        </div>

        <div class="perfil-layout">
          <!-- Avatar card -->
          <div class="glass-card avatar-card">
            <div class="avatar-circle">{{ user?.nombre?.charAt(0)?.toUpperCase() || '?' }}</div>
            <h2 class="avatar-name">{{ user?.nombre }}</h2>
            <span class="badge" [class.badge-activa]="user?.rol === 'ADMIN'"
              [class.badge-proceso]="user?.rol === 'FUNCIONARIO'"
              [class.badge-completado]="user?.rol === 'CLIENTE'">
              {{ user?.rol }}
            </span>
            <p class="avatar-dept">{{ user?.departamento || 'Sin departamento' }}</p>
            <p class="avatar-email">{{ user?.email }}</p>
          </div>

          <!-- Edit form -->
          <div class="glass-card form-card">
            <h3 class="form-section-title">Editar Información</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombre completo</label>
                <input type="text" class="form-input" [(ngModel)]="form.nombre" placeholder="Tu nombre" />
              </div>
              <div class="form-group">
                <label class="form-label">Correo electrónico</label>
                <input type="email" class="form-input" [value]="user?.email" disabled
                  style="opacity:0.6;cursor:not-allowed" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Departamento</label>
                <input type="text" class="form-input" [(ngModel)]="form.departamento"
                  placeholder="Tu departamento" [disabled]="user?.rol !== 'ADMIN'" />
              </div>
            </div>

            @if (exito) {
              <div class="toast toast-success" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">
                ✅ {{ exito }}
              </div>
            }
            @if (error) {
              <div class="toast toast-error" style="position:relative;bottom:auto;right:auto;margin-bottom:12px">
                ❌ {{ error }}
              </div>
            }

            <div style="display:flex;gap:10px;justify-content:flex-end">
              <button class="btn-outline" (click)="cancelar()">Cancelar</button>
              <button class="btn-primary" (click)="guardar()" [disabled]="guardando">
                {{ guardando ? '⏳ Guardando...' : '💾 Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .perfil-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
    .avatar-card { text-align: center; }
    .avatar-circle {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--purple));
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700; color: white;
      margin: 0 auto 16px;
    }
    .avatar-name { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
    .avatar-dept { font-size: 13px; color: var(--text-muted); margin: 8px 0 4px; }
    .avatar-email { font-size: 12px; color: var(--text-faint); margin: 0; }
    .form-card {}
    .form-section-title { font-size: 15px; font-weight: 600; margin: 0 0 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; }
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }
    @media (max-width: 900px) {
      .perfil-layout { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class PerfilComponent implements OnInit {
  user: any;
  form = { nombre: '', departamento: '' };
  guardando = false;
  exito = '';
  error = '';

  navItems: NavItem[] = [];

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.form.nombre = this.user?.nombre || '';
    this.form.departamento = this.user?.departamento || '';

    const rol = this.user?.rol;
    if (rol === 'ADMIN') {
      this.navItems = [
        { icon: '📊', label: 'Panel Principal', route: '/admin' },
        { icon: '✏️', label: 'Editor de Políticas', route: '/editor' },
        { icon: '📈', label: 'Analytics', route: '/analytics' },
        { icon: '🤖', label: 'Reportes IA', route: '/reportes' },
        { icon: '👥', label: 'Usuarios', route: '/users' },
        { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
      ];
    } else if (rol === 'FUNCIONARIO') {
      this.navItems = [
        { icon: '📋', label: 'Mis Tareas', route: '/dashboard' },
        { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
      ];
    } else {
      this.navItems = [
        { icon: '🏠', label: 'Portal', route: '/cliente' },
        { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
      ];
    }
  }

  guardar(): void {
    if (!this.user?.id) return;
    this.guardando = true;
    this.error = '';
    this.exito = '';
    this.usuarioService.update(this.user.id, this.form).subscribe({
      next: (updated) => {
        const stored = { ...this.user, nombre: updated.nombre, departamento: updated.departamento };
        localStorage.setItem('user', JSON.stringify(stored));
        this.user = stored;
        this.exito = 'Perfil actualizado correctamente';
        this.guardando = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al actualizar el perfil';
        this.guardando = false;
      }
    });
  }

  cancelar(): void {
    this.form.nombre = this.user?.nombre || '';
    this.form.departamento = this.user?.departamento || '';
  }
}
