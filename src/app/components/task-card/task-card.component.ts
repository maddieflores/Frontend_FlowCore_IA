import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Tarea } from '../../models/models';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="task-card"
         [class.card-pendiente]="tarea.estado === 'PENDIENTE'"
         [class.card-proceso]="tarea.estado === 'EN_PROCESO'"
         [class.card-completado]="tarea.estado === 'COMPLETADO'">

      <div class="card-top">
        <span class="ref-badge mono">{{ tarea.numeroReferenciaTramite || (tarea.tramiteId | slice:0:8) }}</span>
        <div class="top-right">
          @if (tarea.prioridad === 'ALTA') {
            <span class="priority-tag alta">ALTA</span>
          }
          <span class="priority-dot"
            [class.dot-red]="tarea.estado === 'PENDIENTE'"
            [class.dot-yellow]="tarea.estado === 'EN_PROCESO'"
            [class.dot-green]="tarea.estado === 'COMPLETADO'">
          </span>
        </div>
      </div>

      <!-- Nombre del nodo (legible) -->
      <p class="task-nodo">{{ tarea.nombreNodo || tarea.nodoId }}</p>

      <!-- Política -->
      @if (tarea.nombrePolitica) {
        <p class="task-politica">{{ tarea.nombrePolitica }}</p>
      }

      <!-- Instrucciones breves -->
      @if (tarea.instrucciones) {
        <p class="task-instrucciones">{{ tarea.instrucciones | slice:0:60 }}{{ tarea.instrucciones.length > 60 ? '...' : '' }}</p>
      }

      <div class="task-meta">
        <span class="meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ tarea.fechaAsignacion | date:'dd/MM HH:mm' }}
        </span>
        @if (tarea.departamento) {
          <span class="meta-dept">{{ tarea.departamento }}</span>
        }
      </div>

      <button class="btn-abrir" (click)="onAbrir.emit(tarea)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        {{ tarea.estado === 'COMPLETADO' ? 'Ver detalle' : 'Atender tarea' }}
      </button>
    </div>
  `,
  styles: [`
    .task-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 14px;
      margin-bottom: 10px; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      border-left: 3px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .card-pendiente  { border-left-color: #ef4444; }
    .card-proceso    { border-left-color: #f97316; }
    .card-completado { border-left-color: #22c55e; }

    .card-top {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 8px;
    }
    .ref-badge {
      font-size: 10px; color: #0369a1;
      background: #e0f2fe;
      padding: 2px 7px; border-radius: 6px;
    }
    .top-right { display: flex; align-items: center; gap: 6px; }
    .priority-tag {
      font-size: 9px; font-weight: 700; padding: 1px 6px;
      border-radius: 4px; letter-spacing: 0.05em;
    }
    .alta { background: hsl(355,88%,64%,0.15); color: var(--danger); }

    .priority-dot { width: 7px; height: 7px; border-radius: 50%; }
    .dot-red    { background: var(--danger); box-shadow: 0 0 6px hsl(355,88%,64%,0.5); }
    .dot-yellow { background: var(--warning);  box-shadow: 0 0 6px hsl(20,89%,57%,0.5); }
    .dot-green  { background: var(--success); box-shadow: 0 0 6px hsl(142,71%,45%,0.5); }

    .task-nodo {
      font-size: 13px; font-weight: 600;
      color: var(--text); margin: 0 0 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .task-politica {
      font-size: 10px; color: hsl(282,69%,65%);
      margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .task-instrucciones {
      font-size: 11px; color: var(--text-muted);
      margin: 0 0 10px; line-height: 1.4;
    }
    .task-meta {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 12px;
    }
    .meta-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 10px; color: var(--text-muted);
    }
    .meta-dept {
      font-size: 10px; color: hsl(216,85%,65%);
      background: hsl(216,85%,57%,0.1);
      padding: 1px 7px; border-radius: 5px;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }

    .btn-abrir {
      width: 100%; padding: 7px;
      background: linear-gradient(135deg, var(--primary), var(--purple));
      color: white; border: none; border-radius: 8px;
      cursor: pointer; font-size: 12px; font-weight: 600;
      font-family: inherit;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: opacity 0.2s;
    }
    .btn-abrir:hover { opacity: 0.85; }
  `]
})
export class TaskCardComponent {
  @Input() tarea!: Tarea;
  @Output() onAbrir = new EventEmitter<Tarea>();
}
