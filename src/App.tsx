import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveColor,
  CardFlight,
  GameMode,
  Player,
  SeatPosition,
  TableSpecialEffect,
  UnoCardData,
} from './types/uno';
import {
  canPlayCard,
  createDeck,
  dealInitialHands,
  getPenaltyValue,
} from './utils/deckBuilder';
import { sortHandCards } from './utils/handSorting';
import { soundFX } from './utils/soundEffects';
import {
  ClientActionMessage,
  mpManager,
  NetworkFlightEvent,
  SyncedTableState,
} from './utils/multiplayerManager';
import { PoolTableStage } from './components/PoolTableStage';
import { CenterTableArea } from './components/CenterTableArea';
import { OpponentSeat } from './components/OpponentSeat';
import { PlayerHand } from './components/PlayerHand';
import { CardFlightLayer } from './components/CardFlightLayer';
import { GameHUD } from './components/GameHUD';
import { HomeScreen } from './components/HomeScreen';

const INITIAL_PLAYERS_META: Array<{
  id: string;
  name: string;
  title: string;
  seat: SeatPosition;
  avatarUrl: string;
  accentColor: string;
  isAI: boolean;
}> = [
  {
    id: 'player-0',
    name: 'Host',
    title: 'CHALLENGER',
    seat: 'bottom',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    accentColor: '#f59e0b',
    isAI: false,
  },
  {
    id: 'player-1',
    name: 'Kairo',
    title: 'HIGH ROLLER',
    seat: 'left',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    accentColor: '#3b82f6',
    isAI: true,
  },
  {
    id: 'player-2',
    name: 'Nyx',
    title: 'GRANDMASTER',
    seat: 'top',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80',
    accentColor: '#a855f7',
    isAI: true,
  },
  {
    id: 'player-3',
    name: 'Jax',
    title: 'TACTICIAN',
    seat: 'right',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
    accentColor: '#22c55e',
    isAI: true,
  },
];

const SEAT_ORDER: SeatPosition[] = ['bottom', 'left', 'top', 'right'];

function getRelativeSeat(
  targetSeatIndex: number,
  viewerSeatIndex: number
): SeatPosition {
  const offset = (((targetSeatIndex - viewerSeatIndex) % 4) + 4) % 4;
  return SEAT_ORDER[offset];
}

/**
 * Steps through ONLY active seats (`p.isActive === true`) in direction `dir` (`1` or `-1`).
 */
function getNextActivePlayerIndex(
  currentIndex: number,
  dir: 1 | -1,
  steps: number,
  playerList: Player[]
): number {
  const activeIndices: number[] = [];
  playerList.forEach((p, idx) => {
    if (p.isActive) activeIndices.push(idx);
  });

  if (activeIndices.length <= 1) {
    return activeIndices[0] ?? 0;
  }

  let posInActive = activeIndices.indexOf(currentIndex);
  if (posInActive === -1) {
    posInActive = 0;
  }

  const totalActive = activeIndices.length;
  const nextPos =
    (((posInActive + dir * steps) % totalActive) + totalActive) % totalActive;
  return activeIndices[nextPos];
}

export function App() {
  const [mode, setMode] = useState<GameMode>('no_mercy');
  const [sevenZeroRule, setSevenZeroRule] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [drawPile, setDrawPile] = useState<UnoCardData[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCardData[]>([]);
  const [activeColor, setActiveColor] = useState<ActiveColor>('green');
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pendingPenalty, setPendingPenalty] = useState<number>(0);
  const [skippedPlayerId, setSkippedPlayerId] = useState<string | null>(null);

  // Home Screen & Player Identity state
  const [showHomeScreen, setShowHomeScreen] = useState<boolean>(true);
  const [myPlayerName, setMyPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('uno_player_name') || 'Commander';
    } catch {
      return 'Commander';
    }
  });
  const [initialInviteCode, setInitialInviteCode] = useState<string>('');
  const [mpRole, setMpRole] = useState<'offline' | 'host' | 'client'>('offline');
  const [roomCode, setRoomCode] = useState<string>('');
  const [mySeatIndex, setMySeatIndex] = useState<number>(0);
  const [connectedFriendsCount, setConnectedFriendsCount] = useState<number>(0);
  const [mpStatusText, setMpStatusText] = useState<string>('LOCAL TABLE');

  // Interactive prompts for Wild color selection or 7-0 hand swap target
  const [pendingWildCard, setPendingWildCard] = useState<UnoCardData | null>(
    null
  );
  const [awaitingSevenSwapForSeat, setAwaitingSevenSwapForSeat] = useState<
    number | null
  >(null);

  // Choreographed flight & table special effects
  const [flights, setFlights] = useState<CardFlight[]>([]);
  const [effects, setEffects] = useState<TableSpecialEffect[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const latestFlightRef = useRef<NetworkFlightEvent | null>(null);
  const latestEffectRef = useRef<TableSpecialEffect | null>(null);
  const seenFlightIdRef = useRef<string>('');
  const seenEffectIdRef = useRef<string>('');
  const aiTimerRef = useRef<number | null>(null);

  const triggerTableEffect = useCallback(
    (effect: Omit<TableSpecialEffect, 'id'>) => {
      const id = `fx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullFx: TableSpecialEffect = { ...effect, id };
      latestEffectRef.current = fullFx;
      seenEffectIdRef.current = id;
      setEffects((prev) => [...prev, fullFx]);
      window.setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== id));
      }, 1150);
    },
    []
  );

  const spawnNetworkFlight = useCallback(
    (
      card: UnoCardData,
      fromSeatIndex: number | 'draw_pile',
      toSeatIndex: number | 'discard_pile',
      viewerSeatIndex: number,
      faceUp: boolean,
      delayMs = 0
    ) => {
      const id = `flight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const netEvent: NetworkFlightEvent = {
        id,
        card,
        fromSeatIndex,
        toSeatIndex,
        faceUp,
        delayMs,
      };
      latestFlightRef.current = netEvent;
      seenFlightIdRef.current = id;

      const localFlight: CardFlight = {
        id,
        card,
        fromSeat:
          fromSeatIndex === 'draw_pile'
            ? 'draw_pile'
            : getRelativeSeat(fromSeatIndex, viewerSeatIndex),
        toSeat:
          toSeatIndex === 'discard_pile'
            ? 'discard_pile'
            : getRelativeSeat(toSeatIndex, viewerSeatIndex),
        faceUp,
        delayMs,
      };

      setFlights((prev) => [...prev, localFlight]);
      window.setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== id));
      }, 480 + delayMs);
    },
    []
  );

  const startNewMatch = useCallback(
    (targetMode: GameMode = mode, customActiveMask?: boolean[]) => {
      if (aiTimerRef.current) {
        window.clearTimeout(aiTimerRef.current);
      }
      const deal = dealInitialHands(targetMode);
      setPlayers((prevPlayers) =>
        INITIAL_PLAYERS_META.map((meta, idx) => {
          const existing = prevPlayers[idx];
          const isActive = customActiveMask
            ? customActiveMask[idx]
            : existing
            ? existing.isActive
            : true;
          return {
            ...meta,
            name:
              idx === 0
                ? myPlayerName
                : existing
                ? existing.name
                : meta.name,
            title: existing ? existing.title : meta.title,
            isAI: existing ? existing.isAI : meta.isAI,
            isActive: idx === 0 ? true : isActive,
            hand:
              idx === 0
                ? deal.playerHand
                : deal.opponentHands[(idx - 1) as 0 | 1 | 2],
            calledUno: false,
          };
        })
      );

      setDrawPile(deal.drawPile);
      setDiscardPile(deal.discardPile);
      setActiveColor(deal.initialColor);
      setTurnIndex(0);
      setDirection(1);
      setPendingPenalty(0);
      setPendingWildCard(null);
      setAwaitingSevenSwapForSeat(null);
      setSkippedPlayerId(null);
      setWinner(null);
    },
    [mode, myPlayerName]
  );

  useEffect(() => {
    startNewMatch(mode, [true, false, true, false]);

    // If URL has ?room=XXXXX, pre-fill the room code on the HomeScreen so the friend can type/save their name and click JOIN TABLE
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom && inviteRoom.trim()) {
      setInitialInviteCode(inviteRoom.trim().toUpperCase());
      setShowHomeScreen(true);
    }

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Broadcast authoritative state from Host whenever core state updates
  useEffect(() => {
    if (mpRole === 'host' && players.length === 4 && discardPile.length > 0) {
      const statePayload: SyncedTableState = {
        mode,
        sevenZeroRule,
        players,
        drawPileCount: drawPile.length,
        discardPile,
        activeColor,
        turnIndex,
        direction,
        pendingPenalty,
        skippedPlayerId,
        awaitingSevenSwapForSeat,
        winner,
        latestFlight: latestFlightRef.current,
        latestEffect: latestEffectRef.current,
      };
      mpManager.broadcastState(statePayload);
    }
  }, [
    mpRole,
    mode,
    sevenZeroRule,
    players,
    drawPile.length,
    discardPile,
    activeColor,
    turnIndex,
    direction,
    pendingPenalty,
    skippedPlayerId,
    awaitingSevenSwapForSeat,
    winner,
  ]);

  const pullCardsFromDeck = useCallback(
    (
      count: number,
      currentDeck: UnoCardData[]
    ): { drawn: UnoCardData[]; nextDeck: UnoCardData[] } => {
      let pool = [...currentDeck];
      if (pool.length < count + 4) {
        pool = [...pool, ...createDeck(mode)];
      }
      const drawn = pool.splice(0, count);
      return { drawn, nextDeck: pool };
    },
    [mode]
  );

  // Manual Bot Controls: Add Bot to a specific seat (1, 2, or 3)
  const handleAddBotToSeat = useCallback(
    (seatIdx: number) => {
      if (seatIdx <= 0 || seatIdx > 3) return;
      const { drawn, nextDeck } = pullCardsFromDeck(7, drawPile);
      setDrawPile(nextDeck);
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === seatIdx
            ? {
                ...p,
                name: INITIAL_PLAYERS_META[seatIdx].name,
                title: INITIAL_PLAYERS_META[seatIdx].title,
                isAI: true,
                isActive: true,
                hand: sortHandCards(drawn),
                calledUno: false,
              }
            : p
        )
      );
    },
    [drawPile, pullCardsFromDeck]
  );

  // Manual Bot Controls: Remove Bot from a specific seat (1, 2, or 3)
  const handleRemoveBotFromSeat = useCallback(
    (seatIdx: number) => {
      if (seatIdx <= 0 || seatIdx > 3) return;
      setPlayers((prev) => {
        const updated = prev.map((p, idx) =>
          idx === seatIdx && p.isAI ? { ...p, isActive: false } : p
        );
        if (turnIndex === seatIdx) {
          if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
          setTurnIndex(getNextActivePlayerIndex(seatIdx, direction, 1, updated));
        }
        return updated;
      });
    },
    [turnIndex, direction]
  );

  // Quick Presets: '1v1' | '1v3' | 'no_bots'
  const handleSetBotPreset = useCallback(
    (preset: '1v1' | '1v3' | 'no_bots') => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
      setPlayers((prev) => {
        const hasOnlineFriends = prev.some((p, i) => i > 0 && !p.isAI && p.isActive);
        const updated = prev.map((p, idx) => {
          if (idx === 0) return { ...p, isActive: true };
          // Never kick a connected human friend
          if (!p.isAI && p.isActive) return p;

          if (preset === 'no_bots') {
            return { ...p, isAI: true, isActive: false };
          }
          if (preset === '1v1') {
            // If an online friend is already in the room, 1v1 needs 0 bots; otherwise activate Top seat (idx === 2)
            const shouldActivateBot = !hasOnlineFriends && idx === 2;
            return {
              ...p,
              name: INITIAL_PLAYERS_META[idx].name,
              title: INITIAL_PLAYERS_META[idx].title,
              isAI: true,
              isActive: shouldActivateBot,
              hand:
                p.hand.length > 0
                  ? p.hand
                  : sortHandCards(createDeck(mode).slice(0, 7)),
            };
          }
          // '1v3': activate all 3 seats
          return {
            ...p,
            name: INITIAL_PLAYERS_META[idx].name,
            title: INITIAL_PLAYERS_META[idx].title,
            isAI: true,
            isActive: true,
            hand:
              p.hand.length > 0
                ? p.hand
                : sortHandCards(createDeck(mode).slice(0, 7)),
          };
        });

        setTurnIndex(0);
        return updated;
      });
    },
    [mode]
  );

  // Core card play resolution (authoritative on Host / Offline)
  const commitCardPlay = useCallback(
    (
      playerIdx: number,
      card: UnoCardData,
      chosenWildColor?: ActiveColor
    ) => {
      const actingPlayer = players[playerIdx];
      if (!actingPlayer || !actingPlayer.isActive) return;

      const activePlayersCount = players.filter((p) => p.isActive).length;
      if (activePlayersCount < 2) return;

      soundFX.playCardPlay();

      const nextColor: ActiveColor =
        card.color === 'wild'
          ? chosenWildColor ?? 'red'
          : (card.color as ActiveColor);

      const playedCardWithMeta: UnoCardData = {
        ...card,
        chosenColor: card.color === 'wild' ? nextColor : undefined,
        discardRotation: (Math.random() - 0.5) * 15,
        discardOffsetX: (Math.random() - 0.5) * 11,
        discardOffsetY: (Math.random() - 0.5) * 9,
      };

      spawnNetworkFlight(
        playedCardWithMeta,
        playerIdx,
        'discard_pile',
        mySeatIndex,
        true
      );

      let nextPlayers = players.map((p, idx) => {
        if (idx !== playerIdx) return p;
        let remaining = p.hand.filter((c) => c.id !== card.id);
        if (card.value === 'discard_all') {
          remaining = remaining.filter((c) => c.color !== card.color);
        }
        return {
          ...p,
          hand: sortHandCards(remaining),
          calledUno: remaining.length === 1 ? p.calledUno : false,
        };
      });

      setDiscardPile((prev) => [...prev.slice(-14), playedCardWithMeta]);
      setActiveColor(nextColor);

      if (nextPlayers[playerIdx].hand.length === 0) {
        setPlayers(nextPlayers);
        setWinner(nextPlayers[playerIdx]);
        soundFX.playSpecialEffect('win');
        return;
      }

      let nextDir = direction;
      let stepAdvance = 1;
      let nextPenalty = pendingPenalty;

      if (card.color === 'wild') {
        triggerTableEffect({
          type: 'wild_shift',
          color: nextColor,
          label: `COLOR → ${nextColor.toUpperCase()}`,
        });
      }

      if (
        card.value === 'reverse' ||
        card.value === 'wild_reverse_draw4'
      ) {
        nextDir = (direction * -1) as 1 | -1;
        setDirection(nextDir);
        soundFX.playSpecialEffect('reverse');

        // In 1v1 (2 active players), Reverse acts like Skip so the player plays again!
        if (activePlayersCount === 2 && card.value === 'reverse') {
          stepAdvance = 2;
        }

        triggerTableEffect({
          type: 'reverse',
          color: nextColor,
          label:
            activePlayersCount === 2 && card.value === 'reverse'
              ? '⇄ REVERSE (1v1 SKIP)'
              : '⇄ DIRECTION REVERSED',
        });
      }

      if (card.value === 'skip') {
        stepAdvance = 2;
        const skippedIdx = getNextActivePlayerIndex(
          playerIdx,
          nextDir,
          1,
          nextPlayers
        );
        const skippedSeat = nextPlayers[skippedIdx];
        setSkippedPlayerId(skippedSeat.id);
        window.setTimeout(() => setSkippedPlayerId(null), 1100);
        triggerTableEffect({
          type: 'skip',
          color: nextColor,
          targetSeat: getRelativeSeat(skippedIdx, mySeatIndex),
          label: `${skippedSeat.name.toUpperCase()} SKIPPED`,
        });
      } else if (card.value === 'skip_all') {
        stepAdvance = 0;
        triggerTableEffect({
          type: 'skip',
          color: nextColor,
          label: '⊘ SKIP EVERYONE • PLAY AGAIN!',
        });
      }

      if (card.value === 'discard_all') {
        triggerTableEffect({
          type: 'discard_all',
          color: nextColor,
          label: `❖ DISCARDED ALL ${nextColor.toUpperCase()} CARDS`,
        });
      }

      const addedPenalty = getPenaltyValue(card.value);
      if (addedPenalty > 0) {
        nextPenalty += addedPenalty;
        setPendingPenalty(nextPenalty);
        soundFX.playSpecialEffect('penalty');
        const targetIdx = getNextActivePlayerIndex(
          playerIdx,
          nextDir,
          1,
          nextPlayers
        );
        triggerTableEffect({
          type: 'draw_penalty',
          color: nextColor,
          targetSeat: getRelativeSeat(targetIdx, mySeatIndex),
          penaltyAmount: nextPenalty,
          label: `STACK +${nextPenalty}`,
        });
      }

      if (sevenZeroRule && card.value === '0') {
        const snapshotHands = nextPlayers.map((p) => p.hand);
        nextPlayers = nextPlayers.map((p, idx) => {
          if (!p.isActive) return p;
          const donorIdx = getNextActivePlayerIndex(
            idx,
            (nextDir * -1) as 1 | -1,
            1,
            nextPlayers
          );
          return {
            ...p,
            hand: sortHandCards(snapshotHands[donorIdx]),
          };
        });
        soundFX.playSpecialEffect('reverse');
        triggerTableEffect({
          type: 'zero_rotate',
          color: nextColor,
          label: '0 RULE • ALL HANDS ROTATED!',
        });
      }

      if (sevenZeroRule && card.value === '7') {
        if (!actingPlayer.isAI) {
          // If 1v1 (only 1 active opponent), swap immediately with that opponent without needing an extra click!
          const otherActive = nextPlayers.filter(
            (p, i) => p.isActive && i !== playerIdx
          );
          if (otherActive.length === 1) {
            const otherIdx = nextPlayers.findIndex(
              (p) => p.id === otherActive[0].id
            );
            const myHand = nextPlayers[playerIdx].hand;
            nextPlayers[playerIdx] = {
              ...nextPlayers[playerIdx],
              hand: sortHandCards(nextPlayers[otherIdx].hand),
            };
            nextPlayers[otherIdx] = {
              ...nextPlayers[otherIdx],
              hand: sortHandCards(myHand),
            };
            triggerTableEffect({
              type: 'seven_swap',
              color: nextColor,
              label: `7 RULE • SWAPPED HANDS WITH ${nextPlayers[
                otherIdx
              ].name.toUpperCase()}`,
            });
          } else {
            setPlayers(nextPlayers);
            setAwaitingSevenSwapForSeat(playerIdx);
            return;
          }
        } else {
          let bestTargetIdx = 0;
          let minCount = 999;
          nextPlayers.forEach((p, idx) => {
            if (p.isActive && idx !== playerIdx && p.hand.length < minCount) {
              minCount = p.hand.length;
              bestTargetIdx = idx;
            }
          });
          const tempHand = nextPlayers[playerIdx].hand;
          nextPlayers[playerIdx] = {
            ...nextPlayers[playerIdx],
            hand: sortHandCards(nextPlayers[bestTargetIdx].hand),
          };
          nextPlayers[bestTargetIdx] = {
            ...nextPlayers[bestTargetIdx],
            hand: sortHandCards(tempHand),
          };
          triggerTableEffect({
            type: 'seven_swap',
            color: nextColor,
            label: `7 RULE • ${actingPlayer.name.toUpperCase()} SWAPPED WITH ${nextPlayers[
              bestTargetIdx
            ].name.toUpperCase()}`,
          });
        }
      }

      setPlayers(nextPlayers);
      const nextTurn = getNextActivePlayerIndex(
        playerIdx,
        nextDir,
        stepAdvance,
        nextPlayers
      );
      setTurnIndex(nextTurn);
    },
    [
      players,
      direction,
      pendingPenalty,
      sevenZeroRule,
      mySeatIndex,
      spawnNetworkFlight,
      triggerTableEffect,
    ]
  );

  // Draw Card(s) for any active player
  const executePlayerDraw = useCallback(
    (playerIdx: number) => {
      const targetPlayer = players[playerIdx];
      if (!targetPlayer || !targetPlayer.isActive) return;

      const drawCount = pendingPenalty > 0 ? pendingPenalty : 1;
      const { drawn, nextDeck } = pullCardsFromDeck(drawCount, drawPile);

      soundFX.playCardDraw();

      drawn.slice(0, 6).forEach((c, i) => {
        spawnNetworkFlight(
          c,
          'draw_pile',
          playerIdx,
          mySeatIndex,
          playerIdx === mySeatIndex,
          i * 90
        );
      });

      if (pendingPenalty > 0) {
        soundFX.playSpecialEffect('penalty');
        triggerTableEffect({
          type: 'draw_penalty',
          color: activeColor,
          targetSeat: getRelativeSeat(playerIdx, mySeatIndex),
          penaltyAmount: drawCount,
          label: `${targetPlayer.name.toUpperCase()} DREW +${drawCount}`,
        });
      }

      const nextPlayers = players.map((p, idx) => {
        if (idx !== playerIdx) return p;
        return {
          ...p,
          hand: sortHandCards([...p.hand, ...drawn]),
          calledUno: false,
        };
      });

      setDrawPile(nextDeck);
      setPlayers(nextPlayers);
      setPendingPenalty(0);
      setTurnIndex(
        getNextActivePlayerIndex(playerIdx, direction, 1, nextPlayers)
      );
    },
    [
      players,
      pendingPenalty,
      drawPile,
      activeColor,
      direction,
      mySeatIndex,
      pullCardsFromDeck,
      spawnNetworkFlight,
      triggerTableEffect,
    ]
  );

  // Execute a 7-Swap chosen by any human seat
  const executeSevenSwapForSeat = useCallback(
    (sourceSeatIdx: number, targetPlayerId: string) => {
      const targetIdx = players.findIndex(
        (p) => p.id === targetPlayerId && p.isActive
      );
      if (targetIdx === -1) return;

      const updated = [...players];
      const sourceHand = updated[sourceSeatIdx].hand;
      const targetHand = updated[targetIdx].hand;

      updated[sourceSeatIdx] = {
        ...updated[sourceSeatIdx],
        hand: sortHandCards(targetHand),
      };
      updated[targetIdx] = {
        ...updated[targetIdx],
        hand: sortHandCards(sourceHand),
      };

      soundFX.playSpecialEffect('reverse');
      triggerTableEffect({
        type: 'seven_swap',
        color: activeColor,
        label: `7 RULE • ${updated[sourceSeatIdx].name.toUpperCase()} SWAPPED WITH ${updated[
          targetIdx
        ].name.toUpperCase()}`,
      });

      setPlayers(updated);
      setAwaitingSevenSwapForSeat(null);
      setTurnIndex(
        getNextActivePlayerIndex(sourceSeatIdx, direction, 1, updated)
      );
    },
    [players, activeColor, direction, triggerTableEffect]
  );

  // Configure PeerJS callbacks so Host processes Client actions and Clients apply Host state
  useEffect(() => {
    mpManager.onStatusChange = (txt) => setMpStatusText(txt);

    mpManager.onClientJoined = (seatIdx, friendName) => {
      if (aiTimerRef.current && turnIndex === seatIdx) {
        window.clearTimeout(aiTimerRef.current);
      }
      setConnectedFriendsCount(mpManager.getConnectedPeerCount());
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === seatIdx
            ? {
                ...p,
                name: friendName,
                title: 'ONLINE FRIEND',
                isAI: false,
                isActive: true,
                hand:
                  p.hand.length > 0
                    ? p.hand
                    : sortHandCards(createDeck(mode).slice(0, 7)),
              }
            : p
        )
      );
    };

    mpManager.onClientLeft = (seatIdx) => {
      setConnectedFriendsCount(mpManager.getConnectedPeerCount());
      setPlayers((prev) => {
        const updated = prev.map((p, idx) =>
          idx === seatIdx
            ? {
                ...p,
                name: INITIAL_PLAYERS_META[seatIdx].name,
                title: INITIAL_PLAYERS_META[seatIdx].title,
                isAI: true,
                isActive: false, // Leave seat empty when friend disconnects unless a bot is manually added
              }
            : p
        );
        if (turnIndex === seatIdx) {
          setTurnIndex(getNextActivePlayerIndex(seatIdx, direction, 1, updated));
        }
        return updated;
      });
    };

    mpManager.onClientAction = (msg: ClientActionMessage) => {
      if (msg.type === 'PLAY_CARD') {
        const seatPlayer = players[msg.seatIndex];
        const card = seatPlayer?.hand.find((c) => c.id === msg.cardId);
        if (card && turnIndex === msg.seatIndex) {
          commitCardPlay(msg.seatIndex, card, msg.chosenWildColor);
        }
      } else if (msg.type === 'DRAW_CARD') {
        if (turnIndex === msg.seatIndex) {
          executePlayerDraw(msg.seatIndex);
        }
      } else if (msg.type === 'CALL_UNO') {
        soundFX.playSpecialEffect('uno');
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === msg.seatIndex ? { ...p, calledUno: true } : p
          )
        );
      } else if (msg.type === 'SWAP_SEVEN') {
        if (awaitingSevenSwapForSeat === msg.seatIndex) {
          executeSevenSwapForSeat(msg.seatIndex, msg.targetPlayerId);
        }
      } else if (msg.type === 'UPDATE_NAME') {
        const cleanName = msg.playerName.trim();
        if (cleanName) {
          setPlayers((prev) =>
            prev.map((p, idx) =>
              idx === msg.seatIndex ? { ...p, name: cleanName } : p
            )
          );
        }
      }
    };

    mpManager.onStateReceived = (state, assignedSeat) => {
      setMySeatIndex(assignedSeat);
      setMode(state.mode);
      setSevenZeroRule(state.sevenZeroRule);
      setPlayers(
        state.players.map((p) => ({
          ...p,
          isActive: p.isActive ?? true,
          hand: sortHandCards(p.hand),
        }))
      );
      setDiscardPile(state.discardPile);
      setActiveColor(state.activeColor);
      setTurnIndex(state.turnIndex);
      setDirection(state.direction);
      setPendingPenalty(state.pendingPenalty);
      setSkippedPlayerId(state.skippedPlayerId);
      setAwaitingSevenSwapForSeat(state.awaitingSevenSwapForSeat);
      setWinner(state.winner);

      if (
        state.latestFlight &&
        state.latestFlight.id !== seenFlightIdRef.current
      ) {
        seenFlightIdRef.current = state.latestFlight.id;
        const nf = state.latestFlight;
        const localFlight: CardFlight = {
          id: nf.id,
          card: nf.card,
          fromSeat:
            nf.fromSeatIndex === 'draw_pile'
              ? 'draw_pile'
              : getRelativeSeat(nf.fromSeatIndex, assignedSeat),
          toSeat:
            nf.toSeatIndex === 'discard_pile'
              ? 'discard_pile'
              : getRelativeSeat(nf.toSeatIndex, assignedSeat),
          faceUp:
            nf.toSeatIndex === 'discard_pile' ||
            nf.toSeatIndex === assignedSeat,
          delayMs: nf.delayMs,
        };
        soundFX.playCardPlay();
        setFlights((prev) => [...prev, localFlight]);
        window.setTimeout(() => {
          setFlights((prev) => prev.filter((f) => f.id !== localFlight.id));
        }, 520);
      }

      if (
        state.latestEffect &&
        state.latestEffect.id !== seenEffectIdRef.current
      ) {
        seenEffectIdRef.current = state.latestEffect.id;
        const fx = state.latestEffect;
        setEffects((prev) => [...prev, fx]);
        window.setTimeout(() => {
          setEffects((prev) => prev.filter((e) => e.id !== fx.id));
        }, 1100);
      }
    };
  }, [
    mode,
    players,
    turnIndex,
    direction,
    awaitingSevenSwapForSeat,
    commitCardPlay,
    executePlayerDraw,
    executeSevenSwapForSeat,
  ]);

  const activeTotalPlayers = players.filter((p) => p.isActive).length;
  const activeBotCount = players.filter((p) => p.isActive && p.isAI).length;
  const isMyTurn = turnIndex === mySeatIndex && activeTotalPlayers >= 2;
  const awaitingMySevenSwap = awaitingSevenSwapForSeat === mySeatIndex;

  const handlePlayerPlayCard = (card: UnoCardData) => {
    if (!isMyTurn || pendingWildCard || awaitingMySevenSwap || winner) {
      return;
    }
    const topCard = discardPile[discardPile.length - 1];
    if (!canPlayCard(card, topCard, activeColor, pendingPenalty)) {
      return;
    }

    if (card.color === 'wild') {
      setPendingWildCard(card);
      return;
    }

    if (mpRole === 'client') {
      mpManager.sendActionToHost({
        type: 'PLAY_CARD',
        seatIndex: mySeatIndex,
        cardId: card.id,
      });
    } else {
      commitCardPlay(mySeatIndex, card);
    }
  };

  const handleSelectWildColor = (chosenColor: ActiveColor) => {
    if (!pendingWildCard) return;
    const cardToPlay = pendingWildCard;
    setPendingWildCard(null);
    if (mpRole === 'client') {
      mpManager.sendActionToHost({
        type: 'PLAY_CARD',
        seatIndex: mySeatIndex,
        cardId: cardToPlay.id,
        chosenWildColor: chosenColor,
      });
    } else {
      commitCardPlay(mySeatIndex, cardToPlay, chosenColor);
    }
  };

  const handleSelectSwapOpponent = (targetPlayerId: string) => {
    if (!awaitingMySevenSwap) return;
    if (mpRole === 'client') {
      mpManager.sendActionToHost({
        type: 'SWAP_SEVEN',
        seatIndex: mySeatIndex,
        targetPlayerId,
      });
    } else {
      executeSevenSwapForSeat(mySeatIndex, targetPlayerId);
    }
  };

  // Keep latest AI execution logic in a ref so the 5-10s timer is never reset by unrelated renders
  const runAiTurnRef = useRef<() => void>(() => {});
  runAiTurnRef.current = () => {
    const activeSeatPlayer = players[turnIndex];
    if (!activeSeatPlayer || !activeSeatPlayer.isAI || !activeSeatPlayer.isActive) {
      return;
    }

    const topCard = discardPile[discardPile.length - 1];
    const playableCards = activeSeatPlayer.hand.filter((c) =>
      canPlayCard(c, topCard, activeColor, pendingPenalty)
    );

    if (playableCards.length > 0) {
      const nonWilds = playableCards.filter((c) => c.color !== 'wild');
      const chosenCard =
        nonWilds.length > 0 ? nonWilds[0] : playableCards[0];

      let preferredColor: ActiveColor = 'red';
      if (chosenCard.color === 'wild') {
        const counts: Record<ActiveColor, number> = {
          red: 0,
          blue: 0,
          green: 0,
          yellow: 0,
        };
        activeSeatPlayer.hand.forEach((c) => {
          if (c.color !== 'wild') {
            counts[c.color as ActiveColor]++;
          }
        });
        preferredColor = (Object.keys(counts) as ActiveColor[]).reduce(
          (a, b) => (counts[a] >= counts[b] ? a : b),
          'red' as ActiveColor
        );
      }

      commitCardPlay(turnIndex, chosenCard, preferredColor);
    } else {
      executePlayerDraw(turnIndex);
    }
  };

  const handleSaveMyName = useCallback(
    (newName: string) => {
      const clean = newName.trim();
      if (!clean) return;
      setMyPlayerName(clean);
      try {
        localStorage.setItem('uno_player_name', clean);
      } catch {}
      if (mpRole === 'client') {
        mpManager.sendActionToHost({
          type: 'UPDATE_NAME',
          seatIndex: mySeatIndex,
          playerName: clean,
        });
      } else {
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === mySeatIndex ? { ...p, name: clean } : p
          )
        );
      }
    },
    [mpRole, mySeatIndex]
  );

  // AI Turn Controller: bots take 5 to 10 seconds (5000ms - 10000ms) per turn
  const activeSeatIsAI =
    Boolean(players[turnIndex]?.isAI) && Boolean(players[turnIndex]?.isActive);

  useEffect(() => {
    if (
      showHomeScreen ||
      mpRole === 'client' ||
      players.length === 0 ||
      activeTotalPlayers < 2 ||
      !activeSeatIsAI ||
      winner ||
      awaitingSevenSwapForSeat !== null ||
      pendingWildCard
    ) {
      return;
    }

    const botThinkDelayMs = 5000 + Math.floor(Math.random() * 5001);

    aiTimerRef.current = window.setTimeout(() => {
      runAiTurnRef.current();
    }, botThinkDelayMs);

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, [
    showHomeScreen,
    mpRole,
    turnIndex,
    activeSeatIsAI,
    activeTotalPlayers,
    discardPile.length,
    drawPile.length,
    winner,
    awaitingSevenSwapForSeat,
    pendingWildCard,
  ]);

  if (players.length < 4 || discardPile.length === 0) {
    return null;
  }

  // Rotate player seats relative to `mySeatIndex` so the local player is ALWAYS at `bottom`
  const myPlayer = players[mySeatIndex];
  const leftPlayerIdx = (mySeatIndex + 1) % 4;
  const topPlayerIdx = (mySeatIndex + 2) % 4;
  const rightPlayerIdx = (mySeatIndex + 3) % 4;

  const leftOpponent: Player = { ...players[leftPlayerIdx], seat: 'left' };
  const topOpponent: Player = { ...players[topPlayerIdx], seat: 'top' };
  const rightOpponent: Player = { ...players[rightPlayerIdx], seat: 'right' };

  const activePlayer = players[turnIndex] ?? myPlayer;
  const topDiscard = discardPile[discardPile.length - 1];
  const canManageBots = mpRole !== 'client';

  return (
    <div className="uno-billiards-app-root">
      <PoolTableStage activeColor={activeColor}>
        {/* TOP OPPONENT */}
        <OpponentSeat
          player={topOpponent}
          seatIndex={topPlayerIdx}
          isActiveTurn={turnIndex === topPlayerIdx && topOpponent.isActive}
          isSkipped={skippedPlayerId === topOpponent.id}
          selectableForSwap={awaitingMySevenSwap && topOpponent.isActive}
          canManageBots={canManageBots}
          onSelectForSwap={handleSelectSwapOpponent}
          onAddBotToSeat={handleAddBotToSeat}
          onRemoveBotFromSeat={handleRemoveBotFromSeat}
        />

        {/* LEFT OPPONENT */}
        <OpponentSeat
          player={leftOpponent}
          seatIndex={leftPlayerIdx}
          isActiveTurn={turnIndex === leftPlayerIdx && leftOpponent.isActive}
          isSkipped={skippedPlayerId === leftOpponent.id}
          selectableForSwap={awaitingMySevenSwap && leftOpponent.isActive}
          canManageBots={canManageBots}
          onSelectForSwap={handleSelectSwapOpponent}
          onAddBotToSeat={handleAddBotToSeat}
          onRemoveBotFromSeat={handleRemoveBotFromSeat}
        />

        {/* RIGHT OPPONENT */}
        <OpponentSeat
          player={rightOpponent}
          seatIndex={rightPlayerIdx}
          isActiveTurn={turnIndex === rightPlayerIdx && rightOpponent.isActive}
          isSkipped={skippedPlayerId === rightOpponent.id}
          selectableForSwap={awaitingMySevenSwap && rightOpponent.isActive}
          canManageBots={canManageBots}
          onSelectForSwap={handleSelectSwapOpponent}
          onAddBotToSeat={handleAddBotToSeat}
          onRemoveBotFromSeat={handleRemoveBotFromSeat}
        />

        {/* CENTER GAMEPLAY FOCAL AREA: DRAW PILE, DISCARD PILE & PULSING COLOR ORB */}
        <CenterTableArea
          drawPileCount={drawPile.length}
          discardPile={discardPile}
          activeColor={activeColor}
          direction={direction}
          isPlayerTurn={
            !showHomeScreen &&
            isMyTurn &&
            !pendingWildCard &&
            !awaitingMySevenSwap
          }
          pendingPenalty={pendingPenalty}
          onDrawCard={() => {
            if (mpRole === 'client') {
              mpManager.sendActionToHost({
                type: 'DRAW_CARD',
                seatIndex: mySeatIndex,
              });
            } else {
              executePlayerDraw(mySeatIndex);
            }
          }}
        />

        {/* CHOREOGRAPHED BEZIER CARD FLIGHTS & TABLE EFFECTS */}
        <CardFlightLayer flights={flights} effects={effects} />
      </PoolTableStage>

      {!showHomeScreen && (
        <>
          {/* FOREGROUND PLAYER HAND — AUTOMATICALLY ORGANIZED INTO COLOR GROUPS */}
          <PlayerHand
            cards={myPlayer.hand}
            topCard={topDiscard}
            activeColor={activeColor}
            isPlayerTurn={isMyTurn && !pendingWildCard && !awaitingMySevenSwap}
            pendingPenalty={pendingPenalty}
            onPlayCard={handlePlayerPlayCard}
          />

          {/* MINIMAL COMPETITIVE GAMING HUD WITH 1v1 / 1v3 / MANUAL BOT CONTROLS */}
          <GameHUD
            mode={mode}
            sevenZeroRule={sevenZeroRule}
            myPlayerName={myPlayer.name || myPlayerName}
            activePlayer={activePlayer}
            playerCardCount={myPlayer.hand.length}
            activeBotCount={activeBotCount}
            activeTotalPlayers={activeTotalPlayers}
            isPlayerTurn={isMyTurn}
            hasCalledUno={myPlayer.calledUno}
            muted={muted}
            awaitingWildColor={Boolean(pendingWildCard)}
            awaitingSevenSwap={awaitingMySevenSwap}
            winner={
              winner
                ? {
                    ...winner,
                    seat: getRelativeSeat(
                      players.findIndex((p) => p.id === winner.id),
                      mySeatIndex
                    ),
                  }
                : null
            }
            mpRole={mpRole}
            roomCode={roomCode}
            initialInviteCode={initialInviteCode}
            connectedFriendsCount={connectedFriendsCount}
            mpStatusText={mpStatusText}
            onUpdateMyName={handleSaveMyName}
            onHostOnlineRoom={async (hostName) => {
              handleSaveMyName(hostName);
              const code = await mpManager.startHosting(hostName);
              setMpRole('host');
              setRoomCode(code);
              setMySeatIndex(0);
              setPlayers((prev) =>
                prev.map((p, idx) =>
                  idx === 0
                    ? { ...p, name: hostName, title: 'ROOM HOST', isActive: true }
                    : p.isAI
                    ? { ...p, isActive: false }
                    : p
                )
              );
              setTurnIndex(0);
              return code;
            }}
            onJoinOnlineRoom={async (codeToJoin, guestName) => {
              handleSaveMyName(guestName);
              await mpManager.joinRoom(codeToJoin, guestName);
              setMpRole('client');
              setRoomCode(codeToJoin.toUpperCase());
            }}
            onLeaveOnlineRoom={() => {
              mpManager.disconnect();
              setMpRole('offline');
              setRoomCode('');
              setMySeatIndex(0);
              setConnectedFriendsCount(0);
              startNewMatch(mode, [true, false, true, false]);
              setShowHomeScreen(true);
            }}
            onSetBotPreset={handleSetBotPreset}
            onToggleMode={() => {
              const nextMode: GameMode =
                mode === 'no_mercy' ? 'classic' : 'no_mercy';
              setMode(nextMode);
              startNewMatch(nextMode);
            }}
            onToggleSevenZero={() => setSevenZeroRule((prev) => !prev)}
            onToggleMute={() => {
              soundFX.muted = !muted;
              setMuted(!muted);
            }}
            onCallUno={() => {
              soundFX.playSpecialEffect('uno');
              if (mpRole === 'client') {
                mpManager.sendActionToHost({
                  type: 'CALL_UNO',
                  seatIndex: mySeatIndex,
                });
              } else {
                setPlayers((prev) =>
                  prev.map((p, idx) =>
                    idx === mySeatIndex ? { ...p, calledUno: true } : p
                  )
                );
                triggerTableEffect({
                  type: 'wild_shift',
                  color: activeColor,
                  label: 'UNO CALLED!',
                });
              }
            }}
            onDrawCard={() => {
              if (isMyTurn && !pendingWildCard && !awaitingMySevenSwap) {
                if (mpRole === 'client') {
                  mpManager.sendActionToHost({
                    type: 'DRAW_CARD',
                    seatIndex: mySeatIndex,
                  });
                } else {
                  executePlayerDraw(mySeatIndex);
                }
              }
            }}
            onSelectWildColor={handleSelectWildColor}
            onNewMatch={() => {
              setShowHomeScreen(true);
            }}
          />
        </>
      )}

      {/* CINEMATIC BILLIARDS HOME SCREEN OVERLAY */}
      {showHomeScreen && (
        <HomeScreen
          savedName={myPlayer.name || myPlayerName}
          mode={mode}
          sevenZeroRule={sevenZeroRule}
          initialInviteCode={initialInviteCode}
          mpRole={mpRole}
          roomCode={roomCode}
          connectedFriendsCount={connectedFriendsCount}
          mpStatusText={mpStatusText}
          onSavePlayerName={handleSaveMyName}
          onStartQuickPlay={(preset) => {
            handleSetBotPreset(preset);
            setShowHomeScreen(false);
          }}
          onToggleMode={() => {
            const nextMode: GameMode =
              mode === 'no_mercy' ? 'classic' : 'no_mercy';
            setMode(nextMode);
            startNewMatch(nextMode);
          }}
          onToggleSevenZero={() => setSevenZeroRule((prev) => !prev)}
          onHostOnlineRoom={async (hostName) => {
            handleSaveMyName(hostName);
            const code = await mpManager.startHosting(hostName);
            setMpRole('host');
            setRoomCode(code);
            setMySeatIndex(0);
            setPlayers((prev) =>
              prev.map((p, idx) =>
                idx === 0
                  ? { ...p, name: hostName, title: 'ROOM HOST', isActive: true }
                  : p.isAI
                  ? { ...p, isActive: false }
                  : p
              )
            );
            setTurnIndex(0);
            return code;
          }}
          onJoinOnlineRoom={async (codeToJoin, guestName) => {
            handleSaveMyName(guestName);
            await mpManager.joinRoom(codeToJoin, guestName);
            setMpRole('client');
            setRoomCode(codeToJoin.toUpperCase());
          }}
          onEnterOnlineTable={() => {
            setShowHomeScreen(false);
          }}
        />
      )}
    </div>
  );
}
export default App;
