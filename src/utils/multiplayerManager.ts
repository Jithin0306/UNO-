import Peer, { DataConnection } from 'peerjs';
import {
  ActiveColor,
  CardFlight,
  GameMode,
  Player,
  TableSpecialEffect,
  UnoCardData,
} from '../types/uno';

export interface NetworkFlightEvent {
  id: string;
  card: UnoCardData;
  fromSeatIndex: number | 'draw_pile';
  toSeatIndex: number | 'discard_pile';
  faceUp: boolean;
  delayMs?: number;
}

export interface SyncedTableState {
  mode: GameMode;
  sevenZeroRule: boolean;
  players: Player[];
  drawPileCount: number;
  discardPile: UnoCardData[];
  activeColor: ActiveColor;
  turnIndex: number;
  direction: 1 | -1;
  pendingPenalty: number;
  skippedPlayerId: string | null;
  awaitingSevenSwapForSeat: number | null;
  winner: Player | null;
  latestFlight?: NetworkFlightEvent | null;
  latestEffect?: TableSpecialEffect | null;
}

export type ClientActionMessage =
  | {
      type: 'JOIN_HELLO';
      playerName: string;
    }
  | {
      type: 'PLAY_CARD';
      seatIndex: number;
      cardId: string;
      chosenWildColor?: ActiveColor;
    }
  | {
      type: 'DRAW_CARD';
      seatIndex: number;
    }
  | {
      type: 'CALL_UNO';
      seatIndex: number;
    }
  | {
      type: 'SWAP_SEVEN';
      seatIndex: number;
      targetPlayerId: string;
    };

export interface HostBroadcastMessage {
  type: 'STATE_SYNC';
  assignedSeatIndex: number;
  roomCode: string;
  state: SyncedTableState;
}

const PEER_PREFIX = 'uno-billiards-royale-';

export class MultiplayerRoomManager {
  private peer: Peer | null = null;
  private connections: Map<number, DataConnection> = new Map();
  private hostConn: DataConnection | null = null;
  private lastBroadcastState: SyncedTableState | null = null;

  public role: 'offline' | 'host' | 'client' = 'offline';
  public roomCode: string = '';
  public mySeatIndex: number = 0;

  public onClientJoined?: (seatIndex: number, playerName: string) => void;
  public onClientLeft?: (seatIndex: number) => void;
  public onClientAction?: (msg: ClientActionMessage) => void;
  public onStateReceived?: (
    state: SyncedTableState,
    assignedSeatIndex: number
  ) => void;
  public onStatusChange?: (statusText: string) => void;

  public generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  public startHosting(
    hostName: string,
    customCode?: string
  ): Promise<string> {
    this.disconnect();
    const code = (customCode || this.generateCode()).toUpperCase();
    this.roomCode = code;
    this.role = 'host';
    this.mySeatIndex = 0;

    return new Promise((resolve, reject) => {
      const peer = new Peer(`${PEER_PREFIX}${code}`);
      this.peer = peer;

      peer.on('open', () => {
        this.onStatusChange?.(`HOSTING ROOM #${code}`);
        resolve(code);
      });

      peer.on('connection', (conn) => {
        // Assign an available seat (1, 2, or 3) immediately upon connection
        let assignedSeat = -1;
        for (const candidate of [1, 2, 3]) {
          if (!this.connections.has(candidate)) {
            assignedSeat = candidate;
            break;
          }
        }

        if (assignedSeat === -1) {
          conn.close();
          return;
        }

        this.connections.set(assignedSeat, conn);

        conn.on('open', () => {
          // Immediately send the current state with their assigned seat index (1, 2, or 3)
          if (this.lastBroadcastState) {
            conn.send({
              type: 'STATE_SYNC',
              assignedSeatIndex: assignedSeat,
              roomCode: this.roomCode,
              state: this.lastBroadcastState,
            } satisfies HostBroadcastMessage);
          }
        });

        conn.on('data', (raw) => {
          const msg = raw as ClientActionMessage;
          if (msg.type === 'JOIN_HELLO') {
            this.onClientJoined?.(
              assignedSeat,
              msg.playerName || `Player ${assignedSeat + 1}`
            );
          } else {
            // Ensure action always uses the verified assignedSeat for this connection
            this.onClientAction?.({
              ...msg,
              seatIndex: assignedSeat,
            } as ClientActionMessage);
          }
        });

        conn.on('close', () => {
          this.connections.delete(assignedSeat);
          this.onClientLeft?.(assignedSeat);
        });
      });

      peer.on('error', (err) => {
        this.onStatusChange?.(`Network Error: ${err.type}`);
        reject(err);
      });
    });
  }

  public joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.disconnect();
    const cleanCode = roomCode.trim().toUpperCase().replace(/^#/, '');
    this.roomCode = cleanCode;
    this.role = 'client';

    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      peer.on('open', () => {
        const conn = peer.connect(`${PEER_PREFIX}${cleanCode}`, {
          reliable: true,
        });
        this.hostConn = conn;

        conn.on('open', () => {
          this.onStatusChange?.(`CONNECTED TO #${cleanCode}`);
          conn.send({
            type: 'JOIN_HELLO',
            playerName: playerName.trim() || 'Friend',
          } satisfies ClientActionMessage);
          resolve();
        });

        conn.on('data', (raw) => {
          const msg = raw as HostBroadcastMessage;
          if (msg && msg.type === 'STATE_SYNC') {
            this.mySeatIndex = msg.assignedSeatIndex;
            this.onStateReceived?.(msg.state, msg.assignedSeatIndex);
          }
        });

        conn.on('close', () => {
          this.onStatusChange?.('HOST DISCONNECTED');
          this.role = 'offline';
        });

        conn.on('error', (e) => {
          reject(e);
        });
      });

      peer.on('error', (err) => {
        this.onStatusChange?.(`Join Failed: ${err.type}`);
        reject(err);
      });
    });
  }

  public broadcastState(state: SyncedTableState) {
    this.lastBroadcastState = state;
    if (this.role !== 'host') return;

    this.connections.forEach((conn, seatIdx) => {
      if (!conn.open) return;
      conn.send({
        type: 'STATE_SYNC',
        assignedSeatIndex: seatIdx,
        roomCode: this.roomCode,
        state,
      } satisfies HostBroadcastMessage);
    });
  }

  public sendActionToHost(action: ClientActionMessage) {
    if (this.role === 'client' && this.hostConn && this.hostConn.open) {
      this.hostConn.send(action);
    }
  }

  public getConnectedPeerCount(): number {
    return this.connections.size;
  }

  public disconnect() {
    this.connections.forEach((c) => c.close());
    this.connections.clear();
    if (this.hostConn) {
      this.hostConn.close();
      this.hostConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.role = 'offline';
    this.roomCode = '';
    this.mySeatIndex = 0;
  }
}

export const mpManager = new MultiplayerRoomManager();
