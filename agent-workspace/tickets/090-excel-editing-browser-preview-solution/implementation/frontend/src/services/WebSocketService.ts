/**
 * WebSocket Service - Real-time communication
 * Handles WebSocket connection for file change notifications
 */

import { io, Socket } from 'socket.io-client';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export class WebSocketService {
  private socket: WebSocket | null = null;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds

  // Event handlers
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onFileChange: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.socket = new WebSocket(`${WS_BASE_URL}/ws/${this.sessionId}`);\n
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleError();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;

    if (this.onConnect) {
      this.onConnect();
    }

    // Send initial ping
    this.sendMessage({ type: 'ping' });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'pong':
          // Connection alive
          break;

        case 'file_changed':
          console.log('File changed:', message.path);
          if (this.onFileChange) {
            this.onFileChange();
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);

    if (this.onDisconnect) {
      this.onDisconnect();
    }

    // Attempt to reconnect if it wasn't a manual disconnect
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleError(): void {
    console.error('WebSocket error occurred');

    if (this.onError) {
      this.onError('Connection error occurred');
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
  }

  private sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Send keep-alive ping
  public sendPing(): void {
    this.sendMessage({ type: 'ping' });
  }
}