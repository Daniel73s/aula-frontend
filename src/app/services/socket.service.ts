import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connected = signal(false);

  connect(): void {
    if (this.socket?.connected) return;
    if (this.socket) {
      this.socket.connect();
      return;
    }
    this.socket = io(environment.socketUrl || '/', {
      transports: ['websocket', 'polling'],
    });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  emit<T = any>(event: string, data?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket no conectado'));
        return;
      }
      this.socket.emit(event, data, (response: any) => {
        if (response?.success === false) {
          reject(new Error(response.error ?? 'Error desconocido'));
        } else {
          resolve(response as T);
        }
      });
    });
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}
