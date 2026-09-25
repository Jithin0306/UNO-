import Peer, { DataConnection } from 'peerjs';
import {
  ActiveColor,
  EliminationEvent,
  GameMode,
  Player,
  TableSpecialEffect,
  UnoCardData,
} from '../types/uno';
import {
  sanitizePlayerName,
  sanitizeAvatarDataUrl,
  checkRateLimit,
  logSecurityEvent,
} from './securityValidation';
import { DEFAULT_HUMAN_AVATAR } from './avatarImage';

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
  drawPile?: UnoCardData[];
  drawPileCount: number;
  discardPile: UnoCardData[];
  activeColor: ActiveColor;
  turnIndex: number;
  direction: 1 | -1;
  pendingPenalty: number;
  skippedPlayerId: string | null;
  awaitingSevenSwapForSeat: number | null;
  winner: Player | null;
  turnSecondsLeft?: number;
  inLobby?: boolean;
  hostSeatIndex?: number;
  latestFlight?: NetworkFlightEvent | null;
  latestEffect?: TableSpecialEffect | null;
  latestElimination?: EliminationEvent | null;
}

export type ClientActionMessage =
  | {
      type: 'JOIN_HELLO';
      playerName: string;
      avatarUrl?: string;
      preferredSeatIndex?: number;
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
    }
  | {
      type: 'UPDATE_NAME';
      seatIndex: number;
      playerName: string;
      avatarUrl?: string;
    }
  | {
      type: 'REQUEST_REMATCH';
      seatIndex: number;
    };

export type HostBroadcastMessage =
  | {
      type: 'STATE_SYNC';
      assignedSeatIndex: number;
      roomCode: string;
      state: SyncedTableState;
    }
  | {
      type: 'HOST_MIGRATE';
      newHostSeatIndex: number;
      formerHostSeatIndex: number;
      roomCode: string;
      state: SyncedTableState;
    };

const PEER_PREFIX = 'uno-billiards-royale-';

export class MultiplayerRoomManager {
  private peer: Peer | null = null;
  private secondaryPeer: Peer | null = null;
  private connections: Map<number, DataConnection> = new Map();
  private hostConn: DataConnection | null = null;
  private lastBroadcastState: SyncedTableState | null = null;
  private lastReceivedState: SyncedTableState | null = null;
  private isMigrating: boolean = false;
  private localPlayerName: string = 'Player';
  private localAvatarUrl?: string;

  public role: 'offline' | 'host' | 'client' = 'offline';
  public roomCode: string = '';
  public mySeatIndex: number = 0;

  public onClientJoined?: (
    seatIndex: number,
    playerName: string,
    avatarUrl?: string
  ) => void;
  public onClientLeft?: (seatIndex: number) => void;
  public onClientAction?: (msg: ClientActionMessage) => void;
  public onStateReceived?: (
    state: SyncedTableState,
    assignedSeatIndex: number
  ) => void;
  public onStatusChange?: (statusText: string) => void;

  // Triggered when the Host leaves and THIS player is automatically promoted to the new Host
  public onPromotedToHost?: (
    newHostSeatIndex: number,
    formerHostSeatIndex: number,
    migratedState: SyncedTableState
  ) => void;

  // Triggered when the Host leaves and ANOTHER connected player becomes the new Host
  public onHostMigratedToOther?: (
    newHostSeatIndex: number,
    formerHostSeatIndex: number,
    migratedState: SyncedTableState
  ) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      // Automatically migrate Host if the Host closes or refreshes their browser tab mid-game
      window.addEventListener('beforeunload', () => {
        if (this.role === 'host' && this.connections.size > 0 && this.lastBroadcastState) {
          this.leaveWithHostMigration(this.lastBroadcastState);
        }
      });
    }
  }

  public generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  private attachHostConnectionHandler(targetPeer: Peer) {
    targetPeer.on('connection', (conn) => {
      let assignedSeat = -1;

      conn.on('data', (raw) => {
        if (!raw || typeof raw !== 'object') {
          logSecurityEvent(
            'MALFORMED_PAYLOAD_BLOCKED',
            'Rejected non-object WebRTC message payload'
          );
          return;
        }
        const msg = raw as ClientActionMessage;
        if (msg.type === 'JOIN_HELLO') {
          if (!checkRateLimit(`join_${conn.peer}`, 4, 15000)) {
            return;
          }
          // If this is a migrating client with a preferredSeatIndex, preserve their exact seat!
          if (
            typeof msg.preferredSeatIndex === 'number' &&
            msg.preferredSeatIndex >= 0 &&
            msg.preferredSeatIndex < 4 &&
            msg.preferredSeatIndex !== this.mySeatIndex
          ) {
            assignedSeat = msg.preferredSeatIndex;
          } else if (assignedSeat === -1) {
            for (const candidate of [0, 1, 2, 3]) {
              if (
                candidate !== this.mySeatIndex &&
                !this.connections.has(candidate)
              ) {
                assignedSeat = candidate;
                break;
              }
            }
          }

          if (assignedSeat === -1) {
            conn.close();
            return;
          }

          this.connections.set(assignedSeat, conn);

          const cleanName = sanitizePlayerName(
            msg.playerName || `Player ${assignedSeat + 1}`
          );
          const cleanAvatar = sanitizeAvatarDataUrl(
            msg.avatarUrl,
            DEFAULT_HUMAN_AVATAR
          );

          this.onClientJoined?.(assignedSeat, cleanName, cleanAvatar);

          if (this.lastBroadcastState) {
            conn.send({
              type: 'STATE_SYNC',
              assignedSeatIndex: assignedSeat,
              roomCode: this.roomCode,
              state: this.lastBroadcastState,
            } satisfies HostBroadcastMessage);
          }
        } else {
          // Determine seat from active connection map if needed
          let verifiedSeat = assignedSeat;
          if (verifiedSeat === -1) {
            this.connections.forEach((c, idx) => {
              if (c === conn) verifiedSeat = idx;
            });
          }
          if (verifiedSeat !== -1) {
            // Sliding-window rate limit per connected seat (max 10 actions per 3 seconds)
            if (!checkRateLimit(`action_seat_${verifiedSeat}`, 10, 3000)) {
              return;
            }
            this.onClientAction?.({
              ...msg,
              seatIndex: verifiedSeat,
            } as ClientActionMessage);
          }
        }
      });

      conn.on('close', () => {
        if (assignedSeat !== -1 && this.connections.get(assignedSeat) === conn) {
          this.connections.delete(assignedSeat);
          this.onClientLeft?.(assignedSeat);
        }
      });
    });
  }

  public startHosting(
    hostName: string,
    customCode?: string
  ): Promise<string> {
    this.disconnect();
    this.localPlayerName = hostName;
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

      this.attachHostConnectionHandler(peer);

      peer.on('error', (err) => {
        this.onStatusChange?.(`Network Error: ${err.type}`);
        reject(err);
      });
    });
  }

  public joinRoom(
    roomCode: string,
    playerName: string,
    avatarUrl?: string
  ): Promise<void> {
    this.disconnect();
    this.localPlayerName = playerName.trim() || 'Friend';
    this.localAvatarUrl = avatarUrl;
    const cleanCode = roomCode.trim().toUpperCase().replace(/^#/, '');
    this.roomCode = cleanCode;
    this.role = 'client';
    this.isMigrating = false;

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
            playerName: this.localPlayerName,
            avatarUrl: this.localAvatarUrl,
          } satisfies ClientActionMessage);
          resolve();
        });

        this.bindClientConnectionEvents(conn);

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

  private bindClientConnectionEvents(conn: DataConnection) {
    conn.on('data', (raw) => {
      const msg = raw as HostBroadcastMessage;
      if (!msg) return;

      if (msg.type === 'STATE_SYNC') {
        this.mySeatIndex = msg.assignedSeatIndex;
        this.lastReceivedState = msg.state;
        this.onStateReceived?.(msg.state, msg.assignedSeatIndex);
      } else if (msg.type === 'HOST_MIGRATE') {
        this.lastReceivedState = msg.state;
        this.handleHostDeparture(
          msg.formerHostSeatIndex,
          msg.newHostSeatIndex,
          msg.state
        );
      }
    });

    conn.on('close', () => {
      // If the Host disconnected unexpectedly without sending HOST_MIGRATE, automatically elect the next human player as Host!
      if (this.role === 'client' && !this.isMigrating && this.lastReceivedState) {
        const formerHostIdx =
          typeof this.lastReceivedState.hostSeatIndex === 'number'
            ? this.lastReceivedState.hostSeatIndex
            : 0;
        const electedSeat = this.electNextHostSeat(
          this.lastReceivedState,
          formerHostIdx
        );
        this.handleHostDeparture(
          formerHostIdx,
          electedSeat,
          this.lastReceivedState
        );
      }
    });
  }

  private electNextHostSeat(
    state: SyncedTableState,
    formerHostSeatIndex: number
  ): number {
    // Deterministically pick the lowest seat index occupied by an active human player (excluding formerHostSeatIndex)
    for (let idx = 0; idx < state.players.length; idx++) {
      if (idx === formerHostSeatIndex) continue;
      const p = state.players[idx];
      if (p && p.isActive && !p.isAI) {
        return idx;
      }
    }
    return this.mySeatIndex;
  }

  private handleHostDeparture(
    formerHostSeatIndex: number,
    newHostSeatIndex: number,
    snapshotState: SyncedTableState
  ) {
    if (this.isMigrating) return;
    this.isMigrating = true;

    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch {}
      this.hostConn = null;
    }

    if (this.mySeatIndex === newHostSeatIndex) {
      // THIS PLAYER BECOMES THE NEW ROOM HOST!
      this.promoteSelfToHost(
        this.roomCode,
        newHostSeatIndex,
        formerHostSeatIndex,
        snapshotState
      );
    } else {
      // ANOTHER PLAYER BECAME THE NEW HOST — RECONNECT TO THEM AUTOMATICALLY!
      this.reconnectToNewHost(
        this.roomCode,
        newHostSeatIndex,
        formerHostSeatIndex,
        snapshotState
      );
    }
  }

  private promoteSelfToHost(
    code: string,
    myHostSeatIdx: number,
    formerHostSeatIdx: number,
    snapshotState: SyncedTableState
  ) {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.connections.clear();
    this.role = 'host';
    this.mySeatIndex = myHostSeatIdx;

    // Open guaranteed migration Peer ID (`...-H{seatIdx}`) immediately so remaining peers reconnect in <400ms
    const migrationPeerId = `${PEER_PREFIX}${code}-H${myHostSeatIdx}`;
    const hostPeer = new Peer(migrationPeerId);
    this.peer = hostPeer;

    hostPeer.on('open', () => {
      this.onStatusChange?.(`HOSTING ROOM #${code} (MIGRATED)`);
    });
    this.attachHostConnectionHandler(hostPeer);

    // Also claim the primary room code Peer ID (`uno-billiards-royale-XXXXX`) so any new friends can still join via #code
    window.setTimeout(() => {
      if (this.role !== 'host') return;
      try {
        const primaryPeer = new Peer(`${PEER_PREFIX}${code}`);
        this.secondaryPeer = primaryPeer;
        this.attachHostConnectionHandler(primaryPeer);
        primaryPeer.on('error', () => {
          // Ignore if old broker socket hasn't timed out yet
        });
      } catch {}
    }, 600);

    this.isMigrating = false;
    this.onPromotedToHost?.(myHostSeatIdx, formerHostSeatIdx, snapshotState);
  }

  private reconnectToNewHost(
    code: string,
    newHostSeatIdx: number,
    formerHostSeatIdx: number,
    snapshotState: SyncedTableState
  ) {
    this.onHostMigratedToOther?.(
      newHostSeatIdx,
      formerHostSeatIdx,
      snapshotState
    );
    this.onStatusChange?.(`TRANSFERRING HOST TO SEAT ${newHostSeatIdx + 1}...`);

    const targetPeerId = `${PEER_PREFIX}${code}-H${newHostSeatIdx}`;
    let attempts = 0;

    const tryConnect = () => {
      attempts++;
      if (!this.peer || this.peer.destroyed) {
        this.peer = new Peer();
      }

      const connectNow = () => {
        if (!this.peer) return;
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          this.isMigrating = false;
          this.onStatusChange?.(`CONNECTED TO #${code}`);
          conn.send({
            type: 'JOIN_HELLO',
            playerName: this.localPlayerName,
            avatarUrl: this.localAvatarUrl,
            preferredSeatIndex: this.mySeatIndex,
          } satisfies ClientActionMessage);
        });

        this.bindClientConnectionEvents(conn);

        conn.on('error', () => {
          if (attempts < 5) {
            window.setTimeout(tryConnect, 500);
          }
        });
      };

      if (this.peer.open) {
        connectNow();
      } else {
        this.peer.once('open', connectNow);
      }
    };

    window.setTimeout(tryConnect, 350);
  }

  /**
   * Called when the current Host leaves the game (e.g. clicks [ EXIT ] or Leave Room).
   * Broadcasts HOST_MIGRATE to all connected players so the next player immediately becomes Host
   * and the match continues without stopping!
   */
  public leaveWithHostMigration(currentState?: SyncedTableState) {
    const stateToMigrate = currentState || this.lastBroadcastState;
    if (
      this.role === 'host' &&
      this.connections.size > 0 &&
      stateToMigrate
    ) {
      const connectedSeats = Array.from(this.connections.keys()).sort(
        (a, b) => a - b
      );
      const newHostSeatIndex = connectedSeats[0];

      this.connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send({
              type: 'HOST_MIGRATE',
              newHostSeatIndex,
              formerHostSeatIndex: this.mySeatIndex,
              roomCode: this.roomCode,
              state: stateToMigrate,
            } satisfies HostBroadcastMessage);
          } catch {}
        }
      });
    }

    this.disconnect();
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
    if (this.secondaryPeer) {
      this.secondaryPeer.destroy();
      this.secondaryPeer = null;
    }
    this.role = 'offline';
    this.roomCode = '';
    this.mySeatIndex = 0;
    this.isMigrating = false;
  }
}

export const mpManager = new MultiplayerRoomManager();
