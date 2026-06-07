import { Injectable, NgZone } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WsMessage {
  tipo: string;
  mensaje: string;
  referenciaId?: string;
  tipoReferencia?: string;
  tareaId?: string;
  tramiteId?: string;
  estado?: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {

  private client!: Client;
  public notificaciones$ = new Subject<WsMessage>();
  public connected$ = new BehaviorSubject<boolean>(false);
  private connected = false;

  constructor(private zone: NgZone) { }

  conectar(usuarioId: string, rol: string, departamento?: string): void {
    if (this.connected) return;

    try {
      let socketUrl = environment.wsUrl || '';
      if (socketUrl.startsWith('ws://')) {
        socketUrl = socketUrl.replace('ws://', 'http://');
      } else if (socketUrl.startsWith('wss://')) {
        socketUrl = socketUrl.replace('wss://', 'https://');
      }

      // Crear y activar el cliente fuera de la zona de Angular para que el
      // handshake de SockJS (polling HTTP) no interfiera con la detección de
      // cambios ni bloquee las respuestas de los servicios REST.
      this.zone.runOutsideAngular(() => {
        this.client = new Client({
          webSocketFactory: () => new SockJS(socketUrl),
          reconnectDelay: 5000,
          onConnect: () => {
            // Volver a la zona solo para actualizar estado y suscribir topics
            this.zone.run(() => {
              this.connected = true;
              this.connected$.next(true);
            });

            // Suscripción por usuario específico
            this.client.subscribe(
              `/topic/funcionario/${usuarioId}`,
              (msg: Message) => this.zone.run(() => this.emitir(msg.body))
            );
            this.client.subscribe(
              `/topic/cliente/${usuarioId}`,
              (msg: Message) => this.zone.run(() => this.emitir(msg.body))
            );

            // Admin recibe todo
            if (rol === 'ADMIN') {
              this.client.subscribe(
                `/topic/admin`,
                (msg: Message) => this.zone.run(() => this.emitir(msg.body))
              );
            }

            // Funcionario recibe notificaciones de su departamento
            if (departamento && rol === 'FUNCIONARIO') {
              this.client.subscribe(
                `/topic/departamento/${encodeURIComponent(departamento)}`,
                (msg: Message) => this.zone.run(() => this.emitir(msg.body))
              );
            }
          },
          onDisconnect: () => {
            this.zone.run(() => {
              this.connected = false;
              this.connected$.next(false);
            });
          }
        });
        this.client.activate();
      });
    } catch (err) {
      console.error('Error al conectar con WebSocket:', err);
    }
  }

  suscribirPolitica(politicaId: string, callback: (msg: any) => void): any {
    if (!this.client?.connected) return null;
    return this.client.subscribe(
      `/topic/politica/${politicaId}`,
      (msg: Message) => this.zone.run(() => callback(JSON.parse(msg.body)))
    );
  }

  enviarCambioDiagrama(politicaId: string, cambio: any): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: `/app/politica/${politicaId}/editar`,
      body: JSON.stringify(cambio)
    });
  }

  private emitir(body: string): void {
    try {
      const parsed = JSON.parse(body);
      this.notificaciones$.next(parsed);
    } catch {
      this.notificaciones$.next({ tipo: 'SISTEMA', mensaje: body });
    }
  }

  desconectar(): void {
    if (this.client) {
      this.zone.runOutsideAngular(() => this.client.deactivate());
      this.connected = false;
      this.connected$.next(false);
    }
  }
}
