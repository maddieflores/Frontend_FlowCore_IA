import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AIService } from '../../services/ai/ai.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme/theme.service';
import { Politica } from '../../models/models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/analytics" [navItems]="navItems" />
      <main class="main-content">

        <div class="page-header">
          <div>
            <h1 class="page-title">📊 Analytics & IA</h1>
            <p class="page-sub">Detección de cuellos de botella y eficiencia de funcionarios</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <select class="form-input" style="width:220px" [(ngModel)]="politicaSeleccionada" (change)="analizarPolitica()">
              <option value="">Seleccionar política...</option>
              @for (p of politicas; track p.id) {
                <option [value]="p.id">{{ p.nombre }}</option>
              }
            </select>
            <button class="btn-primary" (click)="analizarPolitica()" [disabled]="!politicaSeleccionada || loadingAnalisis">
              {{ loadingAnalisis ? '⏳ Analizando...' : '🤖 Analizar con IA' }}
            </button>
            <button class="theme-btn-header" (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ themeService.isDark() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        <!-- KPIs Globales -->
        @if (kpis) {
          <div class="kpis-grid" style="margin-bottom:20px">
            <div class="kpi-card">
              <p class="kpi-label">TOTAL TRÁMITES</p>
              <p class="kpi-value" style="color:var(--primary)">{{ kpis.totalTramites }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">TASA COMPLETADO</p>
              <p class="kpi-value" style="color:var(--success)">{{ kpis.tasaCompletadoPct }}%</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">ACTIVOS AHORA</p>
              <p class="kpi-value" style="color:var(--warning)">{{ kpis.tramitesActivos }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">DURACIÓN PROM.</p>
              <p class="kpi-value">{{ kpis.duracionPromedioMinutos }} min</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">TAREAS PENDIENTES</p>
              <p class="kpi-value" style="color:var(--danger)">{{ kpis.tareasPendientes }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">RECHAZADOS</p>
              <p class="kpi-value" style="color:var(--danger)">{{ kpis.tramitesRechazados }}</p>
            </div>
          </div>
        }

        <!-- Promedios por departamento -->
        <div class="glass-card" style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:15px;font-weight:600;margin:0">⏱️ Promedio por Departamento</h3>
            <button class="btn-outline" style="font-size:12px" (click)="cargarPromediosDept()">Actualizar</button>
          </div>
          @if (loadingDept) {
            <div class="loading-state" style="padding:30px"><div class="spinner"></div></div>
          } @else if (promediosDept && objectKeys(promediosDept).length > 0) {
            <div class="dept-grid">
              @for (key of objectKeys(promediosDept); track key) {
                <div class="dept-card">
                  <div class="dept-name">{{ key }}</div>
                  <div class="dept-value">{{ promediosDept[key] | number:'1.0-0' }} min</div>
                  <div class="dept-bar">
                    <div class="dept-bar-fill" [style.width]="getBarWidth(promediosDept[key]) + '%'"
                      [style.background]="getBarColor(promediosDept[key])"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">No hay datos de tareas completadas aún</div>
          }
        </div>

        <!-- Análisis IA de cuellos de botella -->
        @if (analisisIA) {
          <div class="glass-card" style="margin-bottom:20px">
            <h3 style="font-size:15px;font-weight:600;margin:0 0 16px">🤖 Análisis de Cuellos de Botella</h3>

            <div class="analisis-stats">
              <div class="analisis-stat">
                <p class="stat-label">TAREAS ANALIZADAS</p>
                <p class="stat-value" style="color:var(--primary)">{{ analisisIA.totalTareasAnalizadas || 0 }}</p>
              </div>
              <div class="analisis-stat">
                <p class="stat-label">PROMEDIO GENERAL</p>
                <p class="stat-value">{{ analisisIA.promedioGeneralMinutos || 0 }} min</p>
              </div>
              <div class="analisis-stat">
                <p class="stat-label">CUELLOS DETECTADOS</p>
                <p class="stat-value" [style.color]="(analisisIA.cuellosDetectados?.length || 0) > 0 ? 'var(--danger)' : 'var(--success)'">
                  {{ analisisIA.cuellosDetectados?.length || 0 }}
                </p>
              </div>
            </div>

            @for (c of analisisIA.cuellosDetectados || []; track c.nodoId) {
              <div class="alerta-cuello">
                ⚠️ Paso/Nodo <strong>{{ c.nombreNodo || c.nodoId }}</strong> está
                <strong>{{ c.excesoPorcentaje }}% por encima</strong>
                del límite establecido ({{ c.promedioMinutos | number:'1.0-0' }} min vs {{ c.promedioGeneral | number:'1.0-0' }} min de límite)
              </div>
            }

            @if (analisisIA.analisisIA) {
              <div class="ia-insight">
                <p class="insight-label">💡 Recomendaciones de IA</p>
                <p class="insight-texto">{{ analisisIA.analisisIA }}</p>
              </div>
            }
          </div>
        }



        <!-- Eficiencia de funcionarios -->
        @if (politicaSeleccionada) {
          <div class="glass-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h3 style="font-size:15px;font-weight:600;margin:0">👥 Eficiencia por Funcionario</h3>
              <select class="form-input" style="width:200px" [(ngModel)]="deptSeleccionado" (change)="cargarEficiencia()">
                <option value="">Seleccionar departamento...</option>
                @for (key of objectKeys(promediosDept); track key) {
                  <option [value]="key">{{ key }}</option>
                }
              </select>
            </div>
            @if (eficiencia.length > 0) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>FUNCIONARIO</th>
                      <th>PROMEDIO (min)</th>
                      <th>EFICIENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of eficiencia; track f.funcionarioId; let i = $index) {
                      <tr>
                        <td class="mono">{{ i + 1 }}</td>
                        <td>{{ f.nombreFuncionario || f.funcionarioId }}</td>
                        <td class="mono">{{ f.promedioDuracion | number:'1.0-0' }}</td>
                        <td>
                          <span class="badge" [class.badge-completado]="i === 0"
                            [class.badge-proceso]="i === 1"
                            [class.badge-nuevo]="i >= 2">
                            {{ i === 0 ? '🏆 Más rápido' : i === eficiencia.length - 1 ? '🐢 Más lento' : '⚡ Normal' }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state">Selecciona un departamento para ver la eficiencia</div>
            }
          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .kpis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .kpi-card {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 16px; text-align: center;
    }
    .kpi-label { font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; margin: 0 0 6px; }
    .kpi-value { font-size: 26px; font-weight: 700; margin: 0; color: var(--text); }
    .dept-card {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px;
    }
    .dept-name { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
    .dept-value { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
    .dept-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .dept-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
    .analisis-stats { display: flex; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
    .analisis-stat { flex: 1; min-width: 100px; }
    .stat-label { font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; margin: 0 0 4px; }
    .stat-value { font-size: 28px; font-weight: 700; margin: 0; color: var(--text); }
    .alerta-cuello {
      padding: 10px 14px; margin-bottom: 8px;
      background: hsl(355,80%,55%,0.08); border: 1px solid hsl(355,80%,55%,0.25);
      border-radius: 8px; font-size: 13px;
    }
    .ia-insight {
      background: hsl(282,69%,45%,0.08); border: 1px solid hsl(282,69%,45%,0.25);
      border-radius: 8px; padding: 14px; margin-top: 12px;
    }
    .insight-label { font-size: 11px; font-weight: 700; color: var(--purple); margin: 0 0 6px; }
    .insight-texto { font-size: 13px; color: var(--text); margin: 0; line-height: 1.6; }
    .table-wrap { overflow-x: auto; }
    .theme-btn-header {
      width: 40px; height: 40px;
      background: var(--card); border: 1px solid var(--border-2);
      border-radius: 10px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn-header:hover { background: var(--border-2, rgba(255,255,255,0.05)); }
    .insight-aclaracion {
      background: hsl(45,100%,48%,0.08); border: 1px solid hsl(45,100%,48%,0.25);
      border-radius: 8px; padding: 14px; margin-top: 12px;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  navItems: NavItem[] = [
    { icon: '📊', label: 'Panel Principal', route: '/admin' },
    { icon: '✏️', label: 'Editor de Políticas', route: '/editor' },
    { icon: '📈', label: 'Analytics', route: '/analytics' },
    { icon: '🤖', label: 'Reportes IA', route: '/reportes' },
    { icon: '👥', label: 'Usuarios', route: '/users' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  politicas: Politica[] = [];
  politicaSeleccionada = '';
  deptSeleccionado = '';
  analisisIA: any = null;
  promediosDept: any = {};
  eficiencia: any[] = [];
  kpis: any = null;
  loadingAnalisis = false;
  loadingDept = false;



  objectKeys = Object.keys;

  constructor(
    private aiService: AIService,
    private politicaService: PoliticaService,
    private http: HttpClient,
    public themeService: ThemeService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.politicaService.getAll().pipe(catchError(() => of([]))).subscribe(p => {
      this.politicas = p;
    });
    this.cargarPromediosDept();
    this.cargarKpis();
  }

  cargarKpis(): void {
    this.http.get<any>(`${environment.apiUrl}/analytics/kpis`)
      .pipe(catchError(() => of(null)))
      .subscribe(data => { this.kpis = data; });
  }

  analizarPolitica(): void {
    if (!this.politicaSeleccionada) return;
    this.loadingAnalisis = true;
    this.aiService.detectarCuellosBottella(this.politicaSeleccionada)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        this.analisisIA = data;
        this.loadingAnalisis = false;
      });
  }

  cargarPromediosDept(): void {
    this.loadingDept = true;
    this.http.get<any>(`${environment.apiUrl}/analytics/departamentos`)
      .pipe(catchError(() => of({})))
      .subscribe(data => {
        this.promediosDept = data;
        this.loadingDept = false;
      });
  }

  cargarEficiencia(): void {
    if (!this.deptSeleccionado) return;
    this.http.get<any[]>(`${environment.apiUrl}/analytics/funcionarios/${encodeURIComponent(this.deptSeleccionado)}`)
      .pipe(catchError(() => of([])))
      .subscribe(data => { this.eficiencia = data; });
  }

  getBarWidth(val: number): number {
    const max = Math.max(...Object.values(this.promediosDept) as number[]);
    return max > 0 ? (val / max) * 100 : 0;
  }

  getBarColor(val: number): string {
    const max = Math.max(...Object.values(this.promediosDept) as number[]);
    const pct = max > 0 ? val / max : 0;
    if (pct > 0.7) return 'var(--danger)';
    if (pct > 0.4) return 'var(--warning)';
    return 'var(--success)';
  }


}
