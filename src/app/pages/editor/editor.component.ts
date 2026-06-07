declare const go: any;

// Intercept Canvas rendering context to omit the GoJS evaluation watermark text
try {
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    if (typeof text === 'string' && (
      text.indexOf('GoJS') >= 0 ||
      text.indexOf('Northwoods') >= 0 ||
      text.indexOf('gojs.net') >= 0 ||
      text.indexOf('evaluation') >= 0 ||
      text.indexOf('distribution') >= 0 ||
      text.indexOf('production') >= 0
    )) {
      return;
    }
    return originalFillText.apply(this, arguments as any);
  };

  const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
  CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
    if (typeof text === 'string' && (
      text.indexOf('GoJS') >= 0 ||
      text.indexOf('Northwoods') >= 0 ||
      text.indexOf('gojs.net') >= 0 ||
      text.indexOf('evaluation') >= 0 ||
      text.indexOf('distribution') >= 0 ||
      text.indexOf('production') >= 0
    )) {
      return;
    }
    return originalStrokeText.apply(this, arguments as any);
  };
} catch (e) {
  console.warn('Could not override CanvasRenderingContext2D prototypes', e);
}

import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PoliticaService } from '../../services/politica/politica.service';
import { AIService } from '../../services/ai/ai.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { ThemeService } from '../../services/theme/theme.service';
import { Politica, Nodo, CampoFormulario } from '../../models/models';
import { Subscription } from 'rxjs';

interface ChatMessage { role: 'user' | 'ai'; text: string; }
interface NodeData {
  key: any; text: string; category: string; group?: any;
  departamento?: string; descripcion?: string;
  tiempoLimiteHoras?: number; camposFormulario?: CampoFormulario[]; loc?: string;
}
interface LaneData { key: any; text: string; isGroup: boolean; category: string; }

const MINLENGTH = 900;
const MINBREADTH = 180;

function computeMinPoolSize(pool: any): any {
  let len = MINLENGTH;
  pool.memberParts.each((lane: any) => {
    if (!(lane instanceof go.Group)) return;
    const holder = lane.placeholder;
    if (holder !== null) {
      len = Math.max(len, holder.actualBounds.width);
    }
  });
  return new go.Size(len, NaN);
}

function computeLaneSize(lane: any): any {
  const sz = computeMinLaneSize(lane);
  if (lane.isSubGraphExpanded) {
    const holder = lane.placeholder;
    if (holder !== null) {
      sz.height = Math.ceil(Math.max(sz.height, holder.actualBounds.height));
    }
  }
  const hdr = lane.findObject('HEADER');
  if (hdr !== null) sz.height = Math.ceil(Math.max(sz.height, hdr.actualBounds.height));
  return sz;
}

function computeMinLaneSize(lane: any): any {
  if (!lane.isSubGraphExpanded) return new go.Size(MINLENGTH, 1);
  return new go.Size(MINLENGTH, MINBREADTH);
}

class PoolLayout extends go.GridLayout {
  constructor(init?: any) {
    super();
    console.log('PoolLayout constructor called', init);
    this['cellSize'] = new go.Size(1, 1);
    this['wrappingColumn'] = 1;
    this['wrappingWidth'] = Infinity;
    this['isRealtime'] = false;
    this['alignment'] = go.GridAlignment.Position;
    this['comparer'] = (a: any, b: any) => {
      const ay = a.location.y;
      const by = b.location.y;
      if (isNaN(ay) || isNaN(by)) return 0;
      if (ay < by) return -1;
      if (ay > by) return 1;
      return 0;
    };
    this['boundsComputation'] = (part: any, layout: any, rect: any) => {
      part.getDocumentBounds(rect);
      rect.inflate(-1, -1);
      return rect;
    };
    if (init) Object.assign(this, init);
  }

  doLayout(coll: any): void {
    const diagram = this['diagram'];
    if (diagram === null) return;
    console.log('PoolLayout doLayout called', this['group'] ? this['group'].category : 'diagram');
    diagram.startTransaction('PoolLayout');
    const pool = this['group'];
    if (pool !== null && pool.category === 'Pool') {
      const minsize = computeMinPoolSize(pool);
      pool.memberParts.each((lane: any) => {
        if (!(lane instanceof go.Group)) return;
        if (lane.category !== 'Pool') {
          const shape = lane.resizeObject;
          if (shape !== null) {
            const sz = computeLaneSize(lane);
            shape.width = isNaN(shape.width)
              ? minsize.width
              : Math.max(shape.width, minsize.width);
            shape.height = !isNaN(shape.height) ? Math.max(shape.height, sz.height) : sz.height;
            const cell = lane.resizeCellSize;
            if (!isNaN(shape.width) && !isNaN(cell.width) && cell.width > 0) {
              shape.width = Math.ceil(shape.width / cell.width) * cell.width;
            }
            if (!isNaN(shape.height) && !isNaN(cell.height) && cell.height > 0) {
              shape.height = Math.ceil(shape.height / cell.height) * cell.height;
            }
          }
        }
      });
    }
    super['doLayout'](coll);
    diagram.commitTransaction('PoolLayout');
  }
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="editor-root">
  <div class="toolbar">
    <button class="btn-icon" (click)="goBack()">&#8592; Volver</button>
    <div class="tsep"></div>
    <input class="tinput" [(ngModel)]="politicaNombre" placeholder="Nombre de la política" />
    <input class="tinput sm" [(ngModel)]="politicaCategoria" placeholder="Categoría" />
    <div class="tsep"></div>
    <span class="tbadge">{{ laneCount }} calles | {{ nodeCount }} nodos | {{ linkCount }} enlaces</span>
    <div class="spacer"></div>
    <button class="btn-lane" (click)="addLane()">+ Calle</button>
    <button class="btn-icon" (click)="zoomFit()" title="Ajustar zoom">&#8862;</button>
    <button class="btn-icon" (click)="zoomIn()" title="Acercar">+</button>
    <button class="btn-icon" (click)="zoomOut()" title="Alejar">-</button>
    <button class="btn-icon" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Modo claro' : 'Modo oscuro'">
      {{ themeService.isDark() ? '☀️' : '🌙' }}
    </button>
    <div class="tsep"></div>
    <button class="btn-sec" (click)="save()" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
    @if (politicaEstado === 'ACTIVA') {
      <button class="btn-danger-toolbar" (click)="deactivate()" [disabled]="saving">Desactivar</button>
    } @else {
      <button class="btn-pri" (click)="activate()" [disabled]="saving">Activar</button>
    }
    <button class="btn-uml" (click)="exportarUML()" [disabled]="!politicaId || exportandoUML">{{ exportandoUML ? 'Generando...' : 'UML' }}</button>
    @if (editoresActivos > 0) { <span class="tbadge green">{{ editoresActivos }} editor(es) activo(s)</span> }
  </div>
  <div class="main-area">
    <div class="left-panel">
      <div class="ptitle">Paleta de Elementos</div>
      <div #paletteDiv class="palette-div"></div>
      @if (selectedNode) {
        <div class="props-panel">
          <div class="ptitle">Propiedades del Nodo</div>
          <label class="plabel">Nombre del Nodo</label>
          <input class="pinput" [(ngModel)]="selectedNode.text" (ngModelChange)="applyNodeProps()" />
          @if (selectedNode.category !== 'Start' && selectedNode.category !== 'End') {
            <label class="plabel">Departamento / Calle</label>
            <select class="pinput" [(ngModel)]="selectedNode.departamento" (ngModelChange)="moveNodeToLane($event)">
              @for (lane of lanes; track lane.key) {
                <option [value]="lane.text">{{ lane.text }}</option>
              }
            </select>
            <label class="plabel">Descripción / Instrucciones</label>
            <textarea class="pinput" [(ngModel)]="selectedNode.descripcion" (ngModelChange)="applyNodeProps()" rows="2"></textarea>
            @if (selectedNode.category === '' || selectedNode.category === 'Task') {
              <label class="plabel">Tiempo Límite (horas)</label>
              <input type="number" class="pinput" [(ngModel)]="selectedNode.tiempoLimiteHoras" (ngModelChange)="applyNodeProps()" min="0" />
              <div class="campos-hdr">
                <span class="plabel" style="margin:0">Campos del Formulario</span>
                <button class="btn-xs" (click)="addCampo()">+ Campo</button>
              </div>
              @for (campo of selectedNode.camposFormulario || []; track $index; let i = $index) {
                <div class="campo-row">
                  <input [(ngModel)]="campo.etiqueta" placeholder="Etiqueta" class="cinput" (ngModelChange)="applyNodeProps()" />
                  <select [(ngModel)]="campo.tipo" class="csel" (ngModelChange)="applyNodeProps()">
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="boolean">Sí/No</option>
                    <option value="select">Lista</option>
                    <option value="file">Archivo</option>
                  </select>
                  <label class="req-chk" title="Requerido"><input type="checkbox" [(ngModel)]="campo.requerido" (ngModelChange)="applyNodeProps()" /><span>*</span></label>
                  <button class="btn-xs danger" (click)="removeCampo(i)">x</button>
                </div>
              }
            }
          }
        </div>
      } @else {
        <div class="hint-panel">
          <p class="hint">Haz clic en un nodo para configurar sus detalles y variables.</p>
          <p class="hint">Arrastra elementos desde la paleta hasta el lienzo.</p>
          <p class="hint">Arrastra desde el borde de un nodo para crear conexiones de flujo.</p>
          <p class="hint">Usa "+ Calle" para definir departamentos responsables.</p>
        </div>
      }
    </div>
    <div class="center-panel">
      <div #diagramDiv class="diagram-div"></div>
    </div>
    <div class="right-panel">
      <div class="ptitle">Asistente Copilot IA</div>
      <div class="chat-msgs" #chatContainer>
        @for (msg of chatMessages; track $index) {
          <div [class]="'cmsg ' + msg.role"><span class="cbubble">{{ msg.text }}</span></div>
        }
        @if (aiLoading) { <div class="cmsg ai"><span class="cbubble loading">Pensando...</span></div> }
      </div>
      <div class="quick-prompts">
        <button class="btn-q" (click)="sendQuickPrompt('Agrega una calle para Legal')">+ Calle Legal</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega una tarea llamada Verificación de Datos')">+ Tarea</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega una decisión llamada ¿Es elegible?')">+ Decisión</button>
        <button class="btn-q" (click)="sendQuickPrompt('Conecta todos los nodos en secuencia')">Secuenciar</button>
      </div>
      <div class="chat-input-row">
        <input class="chat-input" [(ngModel)]="chatInput" placeholder="Pídele a la IA diseñar tu flujo..." (keydown.enter)="sendChat()" />
        <button class="btn-icon" (click)="toggleVoice()" [class.recording]="isRecording" title="Dictado por voz">🎙️</button>
        <button class="btn-send" (click)="sendChat()">&#9658;</button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .editor-root { display: flex; flex-direction: column; height: 100vh; font-family: 'Space Grotesk', sans-serif; background: var(--bg); color: var(--text); }
    .toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--card); border-bottom: 1px solid var(--border); flex-shrink: 0; box-shadow: var(--shadow); }
    .tinput { border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; font-size: 13px; outline: none; background: var(--bg-2); color: var(--text); font-family: inherit; transition: border-color 0.2s; }
    .tinput:focus { border-color: var(--primary); }
    .tinput.sm { width: 120px; }
    .tsep { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }
    .tbadge { background: hsl(216, 85%, 50%, 0.1); color: var(--primary); border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .tbadge.green { background: hsl(142, 60%, 38%, 0.1); color: var(--success); }
    .spacer { flex: 1; }
    .btn-icon { background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; color: var(--text); transition: all 0.2s; flex-shrink: 0; }
    .btn-icon:hover { background: var(--card-hover); border-color: var(--border-2); }
    .btn-icon.recording { background: hsl(355, 80%, 55%, 0.15); border-color: var(--danger); color: var(--danger); animation: pulse 1.5s infinite; }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    .btn-lane { background: hsl(142, 60%, 38%, 0.1); color: var(--success); border: 1px solid hsl(142, 60%, 38%, 0.2); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
    .btn-lane:hover { background: hsl(142, 60%, 38%, 0.2); }
    .btn-pri { background: linear-gradient(135deg, var(--primary), var(--purple)); color: #fff; border: none; border-radius: 8px; padding: 7px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: opacity 0.2s, transform 0.1s; }
    .btn-pri:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger-toolbar { background: hsl(355, 80%, 55%, 0.1); color: var(--danger); border: 1px solid hsl(355, 80%, 55%, 0.2); border-radius: 8px; padding: 7px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
    .btn-danger-toolbar:hover:not(:disabled) { background: hsl(355, 80%, 55%, 0.2); }
    .btn-danger-toolbar:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sec { background: var(--card); color: var(--text); border: 1px solid var(--border-2); border-radius: 8px; padding: 7px 16px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; transition: all 0.2s; }
    .btn-sec:hover:not(:disabled) { background: var(--card-hover); border-color: var(--primary); color: var(--primary); }
    .btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-uml { background: hsl(282, 69%, 45%, 0.1); color: var(--purple); border: 1px solid hsl(282, 69%, 45%, 0.2); border-radius: 8px; padding: 7px 14px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
    .btn-uml:hover:not(:disabled) { background: hsl(282, 69%, 45%, 0.2); }
    .btn-uml:disabled { opacity: 0.5; cursor: not-allowed; }
    .main-area { display: flex; flex: 1; overflow: hidden; }
    .left-panel { width: 230px; flex-shrink: 0; background: var(--card); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow-y: auto; box-shadow: 2px 0 8px rgba(0,0,0,0.02); }
    .ptitle { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); padding: 12px 16px; letter-spacing: 0.08em; border-bottom: 1px solid var(--border); }
    .palette-div { height: 280px; border-bottom: 1px solid var(--border); background: var(--card); }
    .props-panel { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
    .plabel { font-size: 10px; color: var(--text-muted); font-weight: 600; margin-top: 4px; display: block; text-transform: uppercase; letter-spacing: 0.03em; }
    .pinput { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box; background: var(--bg-2); color: var(--text); font-family: inherit; transition: border-color 0.2s; }
    .pinput:focus { border-color: var(--primary); }
    .campos-hdr { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }
    .campo-row { display: flex; gap: 4px; align-items: center; margin-top: 4px; }
    .cinput { flex: 1; min-width: 0; border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px; font-size: 11px; outline: none; background: var(--bg-2); color: var(--text); }
    .csel { width: 72px; border: 1px solid var(--border); border-radius: 6px; padding: 5px 4px; font-size: 11px; outline: none; background: var(--bg-2); color: var(--text); }
    .req-chk { display: flex; align-items: center; gap: 2px; cursor: pointer; font-size: 11px; color: var(--danger); font-weight: 700; }
    .req-chk input { width: 13px; height: 13px; }
    .btn-xs { background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 10px; color: var(--text); transition: all 0.2s; }
    .btn-xs:hover { background: var(--card-hover); }
    .btn-xs.danger { background: hsl(355, 80%, 55%, 0.1); border-color: var(--danger); color: var(--danger); }
    .btn-xs.danger:hover { background: hsl(355, 80%, 55%, 0.2); }
    .hint-panel { padding: 16px; }
    .hint { font-size: 11px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.5; display: flex; align-items: flex-start; gap: 6px; }
    .hint::before { content: "•"; color: var(--primary); font-weight: bold; }
    .center-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-2); position: relative; }
    .diagram-div { flex: 1; width: 100%; height: 100%; }
    .right-panel { width: 260px; flex-shrink: 0; background: var(--card); border-left: 1px solid var(--border); display: flex; flex-direction: column; box-shadow: -2px 0 8px rgba(0,0,0,0.02); }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .cmsg { display: flex; }
    .cmsg.user { justify-content: flex-end; }
    .cmsg.ai { justify-content: flex-start; }
    .cbubble { max-width: 90%; padding: 8px 12px; border-radius: 12px; font-size: 12px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
    .cmsg.user .cbubble { background: linear-gradient(135deg, var(--primary), var(--purple)); color: #fff; border-bottom-right-radius: 2px; }
    .cmsg.ai .cbubble { background: var(--bg-2); color: var(--text); border: 1px solid var(--border); border-bottom-left-radius: 2px; }
    .cbubble.loading { color: var(--text-muted); font-style: italic; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 12px; border-top: 1px solid var(--border); background: var(--bg-2); }
    .btn-q { background: var(--card); border: 1px solid var(--border); color: var(--text-muted); border-radius: 20px; padding: 4px 10px; font-size: 10px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .btn-q:hover { background: var(--card-hover); border-color: var(--primary); color: var(--primary); }
    .chat-input-row { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--border); background: var(--card); align-items: center; }
    .chat-input { flex: 1; min-width: 0; border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; font-size: 12px; outline: none; background: var(--bg-2); color: var(--text); font-family: inherit; transition: border-color 0.2s; }
    .chat-input:focus { border-color: var(--primary); }
    .btn-send { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .btn-send:hover { background: var(--purple); }
  `]
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagramDiv') diagramDiv!: ElementRef;
  @ViewChild('paletteDiv') paletteDiv!: ElementRef;

  diagram: any; palette: any;
  politicaId: string | null = null;
  politicaNombre = 'Nueva Politica';
  politicaCategoria = '';
  politicaEstado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA' = 'BORRADOR';
  nodeCount = 0; linkCount = 0; laneCount = 0;
  saving = false; exportandoUML = false; editoresActivos = 0;
  selectedNode: NodeData | null = null;
  lanes: LaneData[] = [];
  chatMessages: ChatMessage[] = [{ role: 'ai', text: 'Hola! Describe los cambios que quieres hacer al diagrama. Puedo agregar nodos, calles, conexiones y mas.' }];
  chatInput = ''; aiLoading = false; isRecording = false;
  private recognition: any = null;
  private changeTimer: any = null;
  private wsConnectedSub!: Subscription;
  private stompSub: any = null;
  userId = '';
  private isRemoteChange = false;

  constructor(
    private route: ActivatedRoute, private router: Router,
    private politicaService: PoliticaService, private aiService: AIService,
    private wsService: WebSocketService, private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService
  ) {
    // Dynamic theme reactivity via Angular effects
    effect(() => {
      const dark = this.themeService.isDark();
      if (this.diagram) {
        this.applyThemeToDiagram(dark);
      }
    });
  }

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');

    const user = this.authService.getUser();
    if (user) {
      this.userId = user.id;
      this.wsService.conectar(user.id, user.rol, user.departamento);
    }

    if (this.politicaId) {
      this.politicaService.getById(this.politicaId).subscribe({
        next: (p) => this.loadPolitica(p),
        error: () => this.addAiMsg('No se pudo cargar la politica.')
      });

      this.wsConnectedSub = this.wsService.connected$.subscribe((connected) => {
        if (connected && this.politicaId) {
          if (this.stompSub) {
            try { this.stompSub.unsubscribe(); } catch { }
          }
          this.stompSub = this.wsService.suscribirPolitica(this.politicaId, (c: any) => this.applyRemoteChange(c));
        }
      });
    }
  }

  ngAfterViewInit(): void {
    try {
      this.initDiagram();
      this.initPalette();
    } catch (e: any) {
      console.error(e);
      this.addAiMsg('Error en AfterViewInit: ' + e.message + '\n' + e.stack);
    }
  }

  ngOnDestroy(): void {
    if (this.diagram) this.diagram.div = null;
    if (this.palette) this.palette.div = null;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    if (this.recognition) this.recognition.stop();
    if (this.wsConnectedSub) this.wsConnectedSub.unsubscribe();
    if (this.stompSub) {
      try { this.stompSub.unsubscribe(); } catch { }
    }
    this.wsService.desconectar();
  }

  // ── GoJS Swimlane & Visual Theme Init ──────────────────────────────────────
  applyThemeToDiagram(dark: boolean): void {
    if (!this.diagram) return;
    try {
      this.diagram.startTransaction('theme change');

      if (this.diagram.div) {
        this.diagram.div.style.backgroundColor = dark ? '#0b0f19' : '#f8fafc';
      }

      const grid = this.diagram.grid;
      if (grid) {
        const lineH = grid.findObject('GRID_H');
        const lineV = grid.findObject('GRID_V');
        if (lineH) lineH.stroke = dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';
        if (lineV) lineV.stroke = dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';
      }

      this.defineTemplates(dark);

      this.diagram.commitTransaction('theme change');
      this.diagram.rebuildParts();

      if (this.palette) {
        this.palette.startTransaction('palette theme');
        if (this.palette.div) {
          this.palette.div.style.backgroundColor = dark ? '#1e293b' : '#ffffff';
        }
        this.palette.nodeTemplateMap = this.diagram.nodeTemplateMap;
        this.palette.commitTransaction('palette theme');
        this.palette.rebuildParts();
      }
    } catch (e: any) {
      console.error(e);
      this.addAiMsg('Error en applyThemeToDiagram: ' + e.message + '\n' + e.stack);
    }
  }

  private defineTemplates(dark: boolean): void {
    const $ = go.GraphObject.make;

    const bgCard = dark ? '#131926' : '#ffffff';
    const borderCard = dark ? '#334155' : '#e2e8f0';
    const textTitle = dark ? '#f1f5f9' : '#1e293b';
    const textMuted = dark ? '#94a3b8' : '#64748b';
    const accentSelected = dark ? '#38bdf8' : '#3b82f6';

    const makeSelectionAdornment = () => $(go.Adornment, 'Auto',
      $(go.Shape, 'RoundedRectangle', { fill: null, stroke: accentSelected, strokeWidth: 2, strokeDashArray: [4, 2], parameter1: 8 }),
      $(go.Placeholder)
    );

    // ── POOL TEMPLATE ──
    this.diagram.groupTemplateMap.add('Pool',
      $(go.Group, 'Auto',
        {
          avoidable: false,
          layout: new PoolLayout({ spacing: new go.Size(0, 0) }),
          isSubGraphExpanded: true,
          computesBoundsAfterDrag: true,
          computesBoundsIncludingLinks: false,
          handlesDragDropForMembers: true,
          mouseDrop: (e: any, grp: any) => this.finishDrop(e, grp),
        },
        $(go.Shape, 'Rectangle', { fill: dark ? '#0f172a' : '#f8fafc', stroke: borderCard, strokeWidth: 1.5 }),
        $(go.Panel, 'Table', { defaultRowSeparatorStroke: borderCard },
          $(go.Panel, 'Horizontal',
            { row: 0, stretch: go.GraphObject.Horizontal, background: dark ? '#1e293b' : '#0f172a', defaultAlignment: go.Spot.Left },
            $(go.TextBlock, {
              font: 'bold 13px Space Grotesk, sans-serif', stroke: '#f1f5f9',
              margin: new go.Margin(10, 16), editable: true,
            }, new go.Binding('text').makeTwoWay())
          ),
          $(go.Placeholder, { row: 1, padding: new go.Margin(8, 8) })
        )
      )
    );

    // ── LANE TEMPLATE ──
    this.diagram.groupTemplateMap.add('Lane',
      $(go.Group, 'Horizontal',
        {
          avoidable: false,
          selectionObjectName: 'SHAPE',
          resizable: true,
          resizeObjectName: 'SHAPE',
          layout: $(go.LayeredDigraphLayout, {
            direction: 0,
            layerSpacing: 90,
            columnSpacing: 35,
            setsPortSpots: false,
          }),
          computesBoundsAfterDrag: true,
          computesBoundsIncludingLinks: false,
          handlesDragDropForMembers: true,
          mouseDrop: (e: any, grp: any) => this.finishDrop(e, grp),
          memberAdded: () => this.onDiagramChanged(),
          memberRemoved: () => this.onDiagramChanged(),
        },
        // Header on the left
        $(go.Panel, 'Auto',
          { name: 'HEADER', angle: 270, stretch: go.GraphObject.Vertical },
          $(go.Shape, 'Rectangle', { fill: dark ? '#1e293b' : '#0f172a', stroke: borderCard }),
          $(go.TextBlock, {
            font: 'bold 11px Space Grotesk, sans-serif',
            stroke: '#f1f5f9',
            editable: true,
            margin: new go.Margin(8, 12),
            alignment: go.Spot.Center
          }, new go.Binding('text').makeTwoWay())
        ),
        // Body of the lane containing the nodes
        $(go.Panel, 'Auto',
          { name: 'SHAPE', minSize: new go.Size(900, 180) },
          new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify),
          $(go.Shape, 'Rectangle', {
            fill: 'transparent', stroke: borderCard, strokeWidth: 1,
            stretch: go.GraphObject.Fill,
          }),
          $(go.Placeholder, { padding: new go.Margin(25, 20) })
        )
      )
    );

    // ── NODO START ──
    this.diagram.nodeTemplateMap.add('Start',
      $(go.Node, 'Horizontal',
        {
          selectionAdorned: true,
          selectionAdornmentTemplate: makeSelectionAdornment(),
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup),
          locationObjectName: 'SHAPE'
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Circle', {
          name: 'SHAPE',
          fill: dark ? '#f1f5f9' : '#0f172a', stroke: null,
          width: 20, height: 20,
          portId: '', fromLinkable: true, toLinkable: true,
          fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, {
          font: 'bold 11px Space Grotesk, sans-serif',
          stroke: textTitle,
          margin: new go.Margin(0, 0, 0, 8),
          editable: true
        }, new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO END ──
    this.diagram.nodeTemplateMap.add('End',
      $(go.Node, 'Horizontal',
        {
          selectionAdorned: true,
          selectionAdornmentTemplate: makeSelectionAdornment(),
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup),
          locationObjectName: 'SHAPE'
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Panel, 'Spot',
          { name: 'SHAPE' },
          $(go.Shape, 'Circle', {
            fill: bgCard, stroke: dark ? '#f43f5e' : '#e11d48', strokeWidth: 2,
            width: 20, height: 20,
            portId: '', fromLinkable: true, toLinkable: true,
            fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
          }),
          $(go.Shape, 'Circle', {
            fill: dark ? '#f43f5e' : '#e11d48', stroke: null,
            width: 10, height: 10
          })
        ),
        $(go.TextBlock, {
          font: 'bold 11px Space Grotesk, sans-serif',
          stroke: textTitle,
          margin: new go.Margin(0, 0, 0, 8),
          editable: true
        }, new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO TASK (default) ──
    this.diagram.nodeTemplateMap.add('',
      $(go.Node, 'Auto',
        {
          selectionAdorned: true,
          selectionAdornmentTemplate: makeSelectionAdornment(),
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup),
          isShadowed: true,
          shadowOffset: new go.Point(0, 3),
          shadowColor: 'rgba(15, 23, 42, 0.08)'
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'RoundedRectangle', {
          fill: bgCard, stroke: borderCard, strokeWidth: 1.2,
          portId: '', fromLinkable: true, toLinkable: true,
          fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides,
          parameter1: 8, minSize: new go.Size(125, 48)
        }),
        $(go.Panel, 'Table', { defaultAlignment: go.Spot.Left },
          $(go.Shape, 'Rectangle', {
            column: 0, row: 0, rowSpan: 2,
            fill: '#6366f1', stroke: null,
            width: 4, stretch: go.GraphObject.Vertical
          }),
          $(go.Panel, 'Vertical', { column: 1, row: 0, margin: new go.Margin(6, 14, 6, 12) },
            $(go.TextBlock, {
              font: 'bold 12px Space Grotesk, sans-serif',
              stroke: textTitle,
              editable: true,
              maxLines: 2, overflow: go.TextBlock.OverflowEllipsis, width: 110
            }, new go.Binding('text').makeTwoWay()),
            $(go.TextBlock, {
              font: '9px Space Grotesk, sans-serif',
              stroke: textMuted,
              maxLines: 1, overflow: go.TextBlock.OverflowEllipsis, width: 110,
              margin: new go.Margin(2, 0, 0, 0)
            }, new go.Binding('text', 'departamento', (d: string) => d ? d.toUpperCase() : ''))
          )
        )
      )
    );

    // ── NODO DECISION ──
    this.diagram.nodeTemplateMap.add('Decision',
      $(go.Node, 'Horizontal',
        {
          selectionAdorned: true,
          selectionAdornmentTemplate: makeSelectionAdornment(),
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup),
          locationObjectName: 'SHAPE'
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Diamond', {
          name: 'SHAPE',
          fill: bgCard,
          stroke: dark ? '#f59e0b' : '#d97706',
          strokeWidth: 1.5,
          portId: '', fromLinkable: true, toLinkable: true,
          fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides,
          width: 24, height: 24
        }),
        $(go.TextBlock, {
          font: 'bold 11px Space Grotesk, sans-serif',
          stroke: textTitle,
          margin: new go.Margin(0, 0, 0, 8),
          editable: true
        }, new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO PARALLEL ──
    this.diagram.nodeTemplateMap.add('Parallel',
      $(go.Node, 'Horizontal',
        {
          selectionAdorned: true,
          selectionAdornmentTemplate: makeSelectionAdornment(),
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup),
          locationObjectName: 'SHAPE'
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Rectangle', {
          name: 'SHAPE',
          fill: dark ? '#f1f5f9' : '#0f172a', stroke: null,
          width: 8, height: 24,
          portId: '', fromLinkable: true, toLinkable: true,
          fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, {
          font: 'bold 11px Space Grotesk, sans-serif',
          stroke: textTitle,
          margin: new go.Margin(0, 0, 0, 8),
          editable: true
        }, new go.Binding('text').makeTwoWay())
      )
    );

    // ── LINK TEMPLATE ──
    this.diagram.linkTemplate = $(go.Link,
      { routing: go.Routing.AvoidsNodes, corner: 12, reshapable: true, relinkableFrom: true, relinkableTo: true, toShortLength: 4 },
      $(go.Shape, { strokeWidth: 2, stroke: dark ? '#475569' : '#94a3b8' }),
      $(go.Shape, { toArrow: 'Standard', fill: dark ? '#475569' : '#94a3b8', stroke: null, scale: 1.2 }),
      $(go.Panel, 'Auto',
        $(go.Shape, 'RoundedRectangle', {
          fill: dark ? '#1e293b' : '#ffffff',
          stroke: dark ? '#334155' : '#e2e8f0',
          strokeWidth: 1, parameter1: 4
        }),
        $(go.TextBlock, {
          margin: new go.Margin(2, 6),
          font: '10px Space Grotesk, sans-serif',
          stroke: dark ? '#94a3b8' : '#475569',
          editable: true
        }, new go.Binding('text').makeTwoWay())
      )
    );
  }

  private initDiagram(): void {
    const $ = go.GraphObject.make;

    this.diagram = $(go.Diagram, this.diagramDiv.nativeElement, {
      'undoManager.isEnabled': true,
      'animationManager.isEnabled': false,
      layout: new PoolLayout(),
      'draggingTool.dragsTree': false,
      'draggingTool.isGridSnapEnabled': true,
      'draggingTool.gridSnapCellSize': new go.Size(10, 10),
    });

    this.diagram.grid = $(go.Panel, 'Grid',
      { gridCellSize: new go.Size(20, 20) },
      $(go.Shape, 'LineH', { name: 'GRID_H', strokeWidth: 0.5 }),
      $(go.Shape, 'LineV', { name: 'GRID_V', strokeWidth: 0.5 })
    );

    this.applyThemeToDiagram(this.themeService.isDark());

    // ── Selection listener ──
    this.diagram.addDiagramListener('ChangedSelection', () => {
      const sel = this.diagram.selection.first();
      if (sel instanceof go.Node && sel.data.category !== 'Lane' && sel.data.category !== 'Pool') {
        const d = sel.data;
        this.selectedNode = {
          key: d.key, text: d.text || '', category: d.category || '',
          group: d.group, departamento: d.departamento || '',
          descripcion: d.descripcion || '', tiempoLimiteHoras: d.tiempoLimiteHoras,
          camposFormulario: d.camposFormulario ? JSON.parse(JSON.stringify(d.camposFormulario)) : [],
        };
      } else {
        this.selectedNode = null;
      }
      this.syncLanes();
      this.cdr.detectChanges();
    });

    // ── Change listener ──
    this.diagram.addDiagramListener('Modified', () => this.onDiagramChanged());

    // ── TextEdited listener to format Decision link guards automatically ──
    this.diagram.addDiagramListener('TextEdited', (e: any) => {
      const tb = e.subject;
      if (tb) {
        const part = tb.part;
        if (part instanceof go.Link) {
          const fromNode = part.fromNode;
          if (fromNode && fromNode.data && fromNode.data.category === 'Decision') {
            let text = tb.text || '';
            if (text) {
              let s = text.trim();
              if (s && !s.startsWith('[')) {
                s = '[' + s + ']';
                this.diagram.model.setDataProperty(part.data, 'text', s);
              }
            }
          }
        }
      }
    });

    // ── Initial model with 2 swimlanes ──
    this.buildInitialModel();
  }

  private buildInitialModel(): void {
    const nodeDataArray: any[] = [
      { key: 'pool1', text: 'Proceso', isGroup: true, category: 'Pool' },
      { key: 'lane1', text: 'Departamento A', isGroup: true, category: 'Lane', group: 'pool1', size: '900 180' },
      { key: 'lane2', text: 'Departamento B', isGroup: true, category: 'Lane', group: 'pool1', size: '900 180' },
      { key: 1, text: 'Inicio', category: 'Start', group: 'lane1', loc: '80 60' },
      { key: 2, text: 'Tarea 1', category: '', group: 'lane1', loc: '240 60', departamento: 'Departamento A' },
      { key: 3, text: 'Tarea 2', category: '', group: 'lane2', loc: '400 60', departamento: 'Departamento B' },
      { key: 4, text: 'Fin', category: 'End', group: 'lane2', loc: '560 60' },
    ];
    const linkDataArray: any[] = [
      { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    ];
    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.diagram.model.nodeGroupKeyProperty = 'group';
    this.syncLanes();
    this.updateCounts();
  }

  private initPalette(): void {
    const $ = go.GraphObject.make;
    this.palette = $(go.Palette, this.paletteDiv.nativeElement, {
      nodeTemplateMap: this.diagram.nodeTemplateMap,
      layout: $(go.GridLayout, { wrappingColumn: 1, spacing: new go.Size(8, 8) }),
    });

    // Apply styling to palette background based on theme
    if (this.palette.div) {
      this.palette.div.style.backgroundColor = this.themeService.isDark() ? '#1e293b' : '#ffffff';
    }

    this.palette.model = new go.GraphLinksModel([
      { key: 'ps', text: 'Inicio', category: 'Start' },
      { key: 'pe', text: 'Fin', category: 'End' },
      { key: 'pt', text: 'Tarea', category: '' },
      { key: 'pd', text: 'Decision', category: 'Decision' },
      { key: 'pp', text: 'Paralelo', category: 'Parallel' },
    ]);
  }

  // ── Drop handler: move node into the lane it was dropped on ──
  private finishDrop(e: any, grp: any): void {
    const ok = grp !== null
      ? grp.addMembers(grp.diagram.selection, true)
      : e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true);
    if (!ok) e.diagram.currentTool.doCancel();
    else {
      // Sync departamento property with lane name
      e.diagram.selection.each((part: any) => {
        if (part instanceof go.Node && grp && grp.data.category === 'Lane') {
          e.diagram.model.setDataProperty(part.data, 'departamento', grp.data.text);
        }
      });
      this.syncLanes();
      this.updateCounts();
      this.cdr.detectChanges();
    }
  }

  // ── Add a new swimlane ──
  addLane(): void {
    const name = prompt('Nombre del departamento / calle:');
    if (!name || !name.trim()) return;
    const poolKey = this.getPoolKey();
    if (!poolKey) return;
    const laneKey = 'lane_' + Date.now();
    this.diagram.startTransaction('add lane');
    (this.diagram.model as any).addNodeData({
      key: laneKey, text: name.trim(), isGroup: true,
      category: 'Lane', group: poolKey, size: '900 180',
    });
    this.diagram.commitTransaction('add lane');
    this.syncLanes();
    this.updateCounts();
    this.cdr.detectChanges();
  }

  private getPoolKey(): any {
    let poolKey: any = null;
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Pool') poolKey = n.data.key;
    });
    return poolKey;
  }

  // ── Move selected node to a different lane ──
  moveNodeToLane(laneName: string): void {
    if (!this.selectedNode) return;
    let targetLane: any = null;
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Lane' && n.data.text === laneName) targetLane = n;
    });
    if (!targetLane) return;
    const node = this.diagram.findNodeForKey(this.selectedNode.key);
    if (!node) return;
    this.diagram.startTransaction('move to lane');
    this.diagram.model.setDataProperty(node.data, 'group', targetLane.data.key);
    this.diagram.model.setDataProperty(node.data, 'departamento', laneName);
    this.diagram.commitTransaction('move to lane');
    if (this.selectedNode) this.selectedNode.departamento = laneName;
    this.cdr.detectChanges();
  }

  private syncLanes(): void {
    this.lanes = [];
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Lane') {
        this.lanes.push({ key: n.data.key, text: n.data.text, isGroup: true, category: 'Lane' });
      }
    });
    this.laneCount = this.lanes.length;
  }

  private onDiagramChanged(): void {
    this.updateCounts();
    if (this.isRemoteChange) return;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      if (this.politicaId) {
        this.wsService.enviarCambioDiagrama(this.politicaId, {
          modelo: this.diagram.model.toJson(),
          editorId: this.userId
        });
      }
    }, 800);
  }

  private updateCounts(): void {
    if (!this.diagram) return;
    let nodes = 0, links = 0;
    this.diagram.nodes.each((n: any) => { if (n.data.category !== 'Lane' && n.data.category !== 'Pool') nodes++; });
    this.diagram.links.each(() => links++);
    this.nodeCount = nodes;
    this.linkCount = links;
    this.cdr.detectChanges();
  }

  applyNodeProps(): void {
    if (!this.selectedNode || !this.diagram) return;
    this.diagram.startTransaction('update props');
    const node = this.diagram.findNodeForKey(this.selectedNode.key);
    if (node) {
      this.diagram.model.setDataProperty(node.data, 'text', this.selectedNode.text);
      this.diagram.model.setDataProperty(node.data, 'departamento', this.selectedNode.departamento);
      this.diagram.model.setDataProperty(node.data, 'descripcion', this.selectedNode.descripcion);
      this.diagram.model.setDataProperty(node.data, 'tiempoLimiteHoras', this.selectedNode.tiempoLimiteHoras);
      this.diagram.model.setDataProperty(node.data, 'camposFormulario', this.selectedNode.camposFormulario);
    }
    this.diagram.commitTransaction('update props');
  }

  addCampo(): void {
    if (!this.selectedNode) return;
    if (!this.selectedNode.camposFormulario) this.selectedNode.camposFormulario = [];
    this.selectedNode.camposFormulario.push({ nombre: 'campo_' + Date.now(), tipo: 'text', etiqueta: 'Nuevo campo', requerido: false });
    this.applyNodeProps();
  }

  removeCampo(i: number): void {
    if (!this.selectedNode?.camposFormulario) return;
    this.selectedNode.camposFormulario.splice(i, 1);
    this.applyNodeProps();
  }

  zoomIn(): void { if (this.diagram) this.diagram.commandHandler.increaseZoom(); }
  zoomOut(): void { if (this.diagram) this.diagram.commandHandler.decreaseZoom(); }
  zoomFit(): void { if (this.diagram) this.diagram.zoomToFit(); }
  goBack(): void { this.router.navigate(['/admin']); }

  // ── Load / Save ───────────────────────────────────────────────────────────
  private loadPolitica(p: Politica): void {
    this.politicaNombre = p.nombre;
    this.politicaCategoria = p.categoria || '';
    this.politicaEstado = p.estado;
    if (p.nodos && p.nodos.length > 0) {
      this.loadNodosIntoDiagram(p.nodos);
    }
    this.addAiMsg('Politica "' + p.nombre + '" cargada. ' + p.nodos.length + ' nodos, estado: ' + p.estado);
  }

  private loadNodosIntoDiagram(nodos: Nodo[]): void {
    // Collect unique departments, filtering out empty values and "General" (case-insensitive) if other departments exist
    let depts = [...new Set(nodos.map(n => n.departamento?.trim()).filter(Boolean))] as string[];
    if (depts.length > 1) {
      depts = depts.filter(d => d.toLowerCase() !== 'general');
    }
    if (depts.length === 0) {
      depts = ['General'];
    }

    const poolKey = 'pool1';
    const nodeDataArray: any[] = [
      { key: poolKey, text: this.politicaNombre, isGroup: true, category: 'Pool' },
    ];
    // Create lanes for each department
    const laneMap: Record<string, string> = {};
    depts.forEach((dept, i) => {
      const lk = 'lane_' + i;
      laneMap[dept] = lk;
      nodeDataArray.push({ key: lk, text: dept, isGroup: true, category: 'Lane', group: poolKey, size: '900 180' });
    });

    const defaultLaneKey = 'lane_0'; // Default to the first lane in depts

    // Add nodes
    nodos.forEach(n => {
      const dept = n.departamento?.trim();
      let laneKey = defaultLaneKey;
      let nodeDept = depts[0];

      if (dept && laneMap[dept]) {
        laneKey = laneMap[dept];
        nodeDept = dept;
      } else if (dept && depts.includes(dept)) {
        laneKey = laneMap[dept];
        nodeDept = dept;
      }

      nodeDataArray.push({
        key: n.id, text: n.nombre, category: this.tipoToCategory(n.tipo),
        group: laneKey, loc: n.posX + ' ' + n.posY,
        departamento: nodeDept,
        descripcion: n.descripcion || '',
        tiempoLimiteHoras: n.tiempoLimiteHoras,
        camposFormulario: n.camposFormulario || [],
      });
    });
    // Build links
    const linkDataArray: any[] = [];
    nodos.forEach(n => {
      (n.conexiones || []).forEach(targetId => {
        let label = '';
        if (n.tipo === 'DECISION' && n.condiciones) {
          const condKey = Object.keys(n.condiciones).find(k => n.condiciones[k] === targetId);
          if (condKey) {
            label = condKey.trim();
            if (!label.startsWith('[')) {
              label = '[' + label + ']';
            }
          }
        }
        linkDataArray.push({ from: n.id, to: targetId, text: label });
      });
    });
    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.diagram.model.nodeGroupKeyProperty = 'group';
    this.syncLanes();
    this.updateCounts();
    setTimeout(() => this.diagram.zoomToFit(), 100);
  }

  save(): void {
    const nodos = this.extractNodos();
    const payload: Partial<Politica> = {
      nombre: this.politicaNombre,
      descripcion: '',
      categoria: this.politicaCategoria,
      nodos,
      estado: this.politicaEstado,
      creadoPorId: this.authService.getUser()?.id || '',
    };
    this.saving = true;
    if (this.politicaId) {
      this.politicaService.update(this.politicaId, payload).subscribe({
        next: () => { this.saving = false; this.addAiMsg('Politica guardada correctamente.'); this.cdr.detectChanges(); },
        error: (e: any) => { this.saving = false; this.addAiMsg('Error al guardar: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
      });
    } else {
      this.politicaService.create(payload).subscribe({
        next: (p) => { this.saving = false; this.politicaId = p.id; this.addAiMsg('Politica creada con ID: ' + p.id); this.cdr.detectChanges(); },
        error: (e: any) => { this.saving = false; this.addAiMsg('Error al crear: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
      });
    }
  }

  activate(): void {
    if (!this.politicaId) { this.save(); return; }
    this.politicaService.activar(this.politicaId).subscribe({
      next: (p) => { this.politicaEstado = p.estado; this.addAiMsg('Politica activada correctamente.'); this.cdr.detectChanges(); },
      error: (e: any) => { this.addAiMsg('Error al activar: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
    });
  }

  deactivate(): void {
    if (!this.politicaId) return;
    this.politicaService.desactivar(this.politicaId).subscribe({
      next: (p) => { this.politicaEstado = p.estado; this.addAiMsg('Politica desactivada correctamente.'); this.cdr.detectChanges(); },
      error: (e: any) => { this.addAiMsg('Error al desactivar: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
    });
  }

  exportarUML(): void {
    if (!this.politicaId) return;
    this.exportandoUML = true;
    this.addAiMsg('Generando diagrama UML con IA...');
    this.aiService.generarPlantUML(this.politicaId).subscribe({
      next: (resp) => {
        this.exportandoUML = false;
        const blob = new Blob([resp.plantuml], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = this.politicaNombre.replace(/\s+/g, '_') + '_UML.puml'; a.click();
        URL.revokeObjectURL(url);
        this.addAiMsg('UML exportado. Abre el .puml en https://www.plantuml.com/plantuml/uml/');
        this.cdr.detectChanges();
      },
      error: () => { this.exportandoUML = false; this.addAiMsg('Error al generar UML.'); this.cdr.detectChanges(); }
    });
  }

  private extractNodos(): Nodo[] {
    const nodos: Nodo[] = [];
    this.diagram.nodes.each((node: any) => {
      const d = node.data;
      if (d.category === 'Lane' || d.category === 'Pool') return;
      const loc = go.Point.parse(d.loc || '0 0');
      nodos.push({
        id: String(d.key), nombre: d.text || '',
        descripcion: d.descripcion || '',
        tipo: this.categoryToTipo(d.category || ''),
        departamento: d.departamento || '',
        responsableId: '', tiempoLimiteHoras: d.tiempoLimiteHoras,
        posX: loc.x, posY: loc.y,
        conexiones: [], condiciones: {},
        camposFormulario: d.camposFormulario || [],
      });
    });
    this.diagram.links.each((link: any) => {
      const fromKey = String(link.data.from);
      const toKey = String(link.data.to);
      const nodo = nodos.find(n => n.id === fromKey);
      if (nodo) {
        if (!nodo.conexiones.includes(toKey)) {
          nodo.conexiones.push(toKey);
        }
        if (nodo.tipo === 'DECISION') {
          let linkText = link.data.text || '';
          if (linkText) {
            let cond = linkText.trim();
            if (cond.startsWith('[') && cond.endsWith(']')) {
              cond = cond.substring(1, cond.length - 1).trim();
            }
            if (cond) {
              nodo.condiciones[cond] = toKey;
            }
          }
        }
      }
    });
    return nodos;
  }

  private tipoToCategory(tipo: string): string {
    return ({ START: 'Start', END: 'End', TASK: '', DECISION: 'Decision', PARALLEL: 'Parallel' } as any)[tipo] ?? '';
  }

  private categoryToTipo(cat: string): Nodo['tipo'] {
    return ({ Start: 'START', End: 'END', '': 'TASK', Decision: 'DECISION', Parallel: 'PARALLEL' } as any)[cat] ?? 'TASK';
  }

  private applyRemoteChange(cambio: any): void {
    if (cambio.editoresActivos !== undefined) { this.editoresActivos = cambio.editoresActivos; this.cdr.detectChanges(); }
    if (cambio.modelo && this.diagram) {
      if (cambio.editorId === this.userId) return;
      try {
        this.isRemoteChange = true;
        this.diagram.model = go.Model.fromJson(cambio.modelo);
        this.syncLanes();
        this.updateCounts();
      } catch (e) {
        console.error("Error al aplicar cambios remotos del diagrama: ", e);
      } finally {
        this.isRemoteChange = false;
      }
    }
  }

  // ── AI Chat ───────────────────────────────────────────────────────────────
  sendChat(): void {
    const prompt = this.chatInput.trim();
    if (!prompt) return;
    this.chatMessages.push({ role: 'user', text: prompt });
    this.chatInput = '';

    // Intercept clear command locally for instant response
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt === 'limpia el diagrama' ||
      lowerPrompt === 'limpiar el diagrama' ||
      lowerPrompt === 'limpiar diagrama' ||
      lowerPrompt === 'limpia diagrama' ||
      lowerPrompt === 'borrar todo' ||
      lowerPrompt === 'eliminar todo') {
      this.diagram.model = new go.GraphLinksModel([], []);
      this.syncLanes();
      this.updateCounts();
      this.addAiMsg('Entendido, he limpiado todo el diagrama.');
      this.cdr.detectChanges();
      return;
    }

    this.aiLoading = true;
    this.cdr.detectChanges();
    this.aiService.procesarPromptDiagrama(prompt).subscribe({
      next: (resp) => { this.aiLoading = false; this.applyAiResponse(resp); this.cdr.detectChanges(); },
      error: () => { this.aiLoading = false; this.addAiMsg('Error al contactar la IA.'); this.cdr.detectChanges(); },
    });
  }

  sendQuickPrompt(prompt: string): void { this.chatInput = prompt; this.sendChat(); }

  private applyAiResponse(resp: string): void {
    const cleaned = resp.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      const js = cleaned.indexOf('{'); const je = cleaned.lastIndexOf('}');
      if (js === -1 || je === -1) { this.addAiMsg(resp); return; }
      const parsed = JSON.parse(cleaned.substring(js, je + 1));
      const nodos: any[] = parsed.nodos || parsed.nodes || [];
      const links: any[] = parsed.links || parsed.enlaces || [];
      const mensaje: string = parsed.mensaje || parsed.message || '';
      const accion: string = parsed.accion || parsed.action || '';

      const isClearAction = accion === 'ELIMINAR_TODO' ||
        accion === 'LIMPIAR' ||
        mensaje.toLowerCase().includes('limpiado') ||
        mensaje.toLowerCase().includes('limpio') ||
        mensaje.toLowerCase().includes('eliminad');

      if (isClearAction) {
        this.diagram.model = new go.GraphLinksModel([], []);
        this.syncLanes();
        this.updateCounts();
        this.addAiMsg(mensaje || 'Se han eliminado todos los elementos.');
        return;
      }

      if (accion === 'ELIMINAR_NODO' && nodos.length > 0) {
        this.diagram.startTransaction('remove node');
        nodos.forEach((n: any) => {
          const key = n.key ?? n.id;
          const node = this.diagram.findNodeForKey(key);
          if (node) this.diagram.remove(node);
        });
        this.diagram.commitTransaction('remove node');
        this.syncLanes();
        this.updateCounts();
        this.addAiMsg(mensaje || 'Elemento eliminado.');
        return;
      }

      if (nodos.length > 0 || links.length > 0) {
        this.diagram.startTransaction('ai update');
        let poolKey = this.getPoolKey();
        if (!poolKey) {
          poolKey = 'pool1';
          (this.diagram.model as any).addNodeData({ key: poolKey, text: this.politicaNombre, isGroup: true, category: 'Pool' });
        }

        const model = this.diagram.model as any;

        // 1. Gather all unique departments suggested by AI, excluding "General" if other departments exist
        let aiDepts = [...new Set(nodos.map((n: any) => n.departamento?.trim()).filter(Boolean))] as string[];
        if (aiDepts.length > 1) {
          aiDepts = aiDepts.filter(d => d.toLowerCase() !== 'general');
        }

        // 2. Ensure all these lanes exist in the model (case-insensitive check)
        aiDepts.forEach((dept: string) => {
          const exists = model.nodeDataArray.some((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() === dept.toLowerCase());
          if (!exists) {
            const newLaneKey = 'lane_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            model.addNodeData({ key: newLaneKey, text: dept, isGroup: true, category: 'Lane', group: poolKey, size: '900 180' });
          }
        });

        // 3. Find if we have a "General" lane and other lanes now
        const hasGeneralLane = model.nodeDataArray.some((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() === 'general');
        const hasOtherLanes = model.nodeDataArray.some((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() !== 'general');

        if (hasGeneralLane && hasOtherLanes) {
          // Migrate nodes out of "General" lane to the first non-General lane and remove "General"
          const generalLane = model.nodeDataArray.find((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() === 'general');
          const nonGeneralLane = model.nodeDataArray.find((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() !== 'general');
          if (generalLane && nonGeneralLane) {
            model.nodeDataArray.forEach((d: any) => {
              if (d.group === generalLane.key) {
                model.setDataProperty(d, 'group', nonGeneralLane.key);
                model.setDataProperty(d, 'departamento', nonGeneralLane.text);
              }
            });
            model.removeNodeData(generalLane);
          }
        }

        // Determine default lane text directly from AI response if available, or from model
        let defaultLaneText = 'General';
        if (aiDepts.length > 0) {
          defaultLaneText = aiDepts[0];
        } else {
          const firstLane = model.nodeDataArray.find((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() !== 'general');
          if (firstLane) {
            defaultLaneText = firstLane.text;
          }
        }

        // 4. Add/Update nodes
        nodos.forEach((n: any) => {
          const key = n.key ?? n.id;
          const existing = this.diagram.findNodeForKey(key);

          let dept = n.departamento?.trim();
          if (dept && dept.toLowerCase() === 'general') {
            const hasOthers = model.nodeDataArray.some((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() !== 'general');
            if (hasOthers) {
              dept = '';
            }
          }

          if (!dept) {
            dept = defaultLaneText;
          }

          // Ensure the lane exists for this dept (case-insensitive check)
          let targetLane = model.nodeDataArray.find((d: any) => d.category === 'Lane' && d.text.trim().toLowerCase() === dept.toLowerCase());
          if (!targetLane) {
            const newLaneKey = 'lane_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            model.addNodeData({ key: newLaneKey, text: dept, isGroup: true, category: 'Lane', group: poolKey, size: '900 180' });
            targetLane = { key: newLaneKey, text: dept };
          }

          if (existing) {
            model.setDataProperty(existing.data, 'text', n.text || n.nombre || existing.data.text);
            model.setDataProperty(existing.data, 'departamento', dept);
            model.setDataProperty(existing.data, 'group', targetLane.key);
          } else {
            const newKey = key ?? (Date.now() + Math.floor(Math.random() * 1000));
            model.addNodeData({
              key: newKey, text: n.text || n.nombre || 'Nodo',
              category: n.category ?? this.tipoToCategory(n.tipo || 'TASK'),
              group: targetLane.key, departamento: dept,
            });
          }
        });

        links.forEach((l: any) => {
          const from = l.from ?? l.desde; const to = l.to ?? l.hasta;
          if (from !== undefined && to !== undefined) {
            let label = l.text || l.etiqueta || '';
            const fromNode = this.diagram.findNodeForKey(from);
            if (fromNode && fromNode.data && fromNode.data.category === 'Decision') {
              if (label && !label.startsWith('[')) {
                label = '[' + label + ']';
              }
            }
            (this.diagram.model as any).addLinkData({ from, to, text: label });
          }
        });

        this.diagram.commitTransaction('ai update');
        this.diagram.layoutDiagram(true);
        this.syncLanes();
        this.updateCounts();
        this.addAiMsg(mensaje || 'Cambios aplicados: ' + nodos.length + ' nodo(s), ' + links.length + ' enlace(s).');
      } else if (mensaje) {
        this.addAiMsg(mensaje);
      } else {
        this.addAiMsg(resp.length > 400 ? resp.substring(0, 400) + '...' : resp);
      }
    } catch {
      this.addAiMsg(resp.length > 400 ? resp.substring(0, 400) + '...' : resp);
    }
  }

  private addAiMsg(text: string): void {
    this.chatMessages.push({ role: 'ai', text });
    this.cdr.detectChanges();
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  toggleVoice(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.addAiMsg('Tu navegador no soporta reconocimiento de voz.'); return; }
    if (this.isRecording) { this.recognition?.stop(); this.isRecording = false; return; }
    this.recognition = new SR();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      this.chatInput = event.results[0][0].transcript;
      this.isRecording = false; this.cdr.detectChanges(); this.sendChat();
    };
    this.recognition.onerror = () => {
      this.isRecording = false;
      this.cdr.detectChanges();
    };
    this.recognition.onend = () => {
      this.isRecording = false;
      this.cdr.detectChanges();
    };
    try {
      this.recognition.start();
      this.isRecording = true;
    } catch (err: any) {
      this.addAiMsg('No se pudo iniciar dictado: ' + err.message);
      this.isRecording = false;
    }
  }
}
