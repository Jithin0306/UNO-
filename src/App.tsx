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
  SyncedTableState,
} from './utils/multiplayerManager';
import { PoolTableStage } from './components/PoolTableStage';
import { CenterTableArea } from './components/CenterTableArea';
import { OpponentSeat } from './components/OpponentSeat';
import { PlayerHand } from './components/PlayerHand';
import { CardFlightLayer } from './components/CardFlightLayer';
import { GameHUD } from './components/GameHUD';

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
    name: 'YOU',
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

/**
 * Maps an absolute seat index (0..3) to a relative screen seat ('bottom' | 'left' | 'top' | 'right')
 * from the perspective of `viewerSeatIndex` so every online player sees their own hand at the bottom.
 */
function getRelativeSeat(
  targetSeatIndex: number,
  viewerSeatIndex: number
): SeatPosition {
  const offset = (((targetSeatIndex - viewerSeatIndex) % 4) + 4) % 4;
  return SEAT_ORDER[offset];
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

  // Multiplayer state
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

  // Latest flight/effect refs for syncing to peers
  const latestFlightRef = useRef<CardFlight | null>(null);
  const latestEffectRef = useRef<TableSpecialEffect | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  const triggerTableEffect = useCallback(
    (effect: Omit<TableSpecialEffect, 'id'>) => {
      const id = `fx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullFx: TableSpecialEffect = { ...effect, id };
      latestEffectRef.current = fullFx;
      setEffects((prev) => [...prev, fullFx]);
      window.setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== id));
      }, 1150);
    },
    []
  );

  const spawnCardFlight = useCallback(
    (
      card: UnoCardData,
      fromSeat: SeatPosition | 'draw_pile',
      toSeat: SeatPosition | 'discard_pile',
      faceUp: boolean,
      delayMs = 0
    ) => {
      const id = `flight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const flight: CardFlight = {
        id,
        card,
        fromSeat,
        toSeat,
        faceUp,
        delayMs,
      };
      latestFlightRef.current = flight;
      setFlights((prev) => [...prev, flight]);
      window.setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== id));
      }, 480 + delayMs);
    },
    []
  );

  const startNewMatch = useCallback(
    (targetMode: GameMode = mode) => {
      if (aiTimerRef.current) {
        window.clearTimeout(aiTimerRef.current);
      }
      const deal = dealInitialHands(targetMode);
      setPlayers((prevPlayers) =>
        INITIAL_PLAYERS_META.map((meta, idx) => {
          const existing = prevPlayers[idx];
          return {
            ...meta,
            name: existing ? existing.name : meta.name,
            title: existing ? existing.title : meta.title,
            isAI: existing ? existing.isAI : meta.isAI,
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
    [mode]
  );

  useEffect(() => {
    startNewMatch(mode);

    // Check if URL has ?room=XXXXX to auto-join a friend's room
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom && inviteRoom.trim()) {
      mpManager
        .joinRoom(inviteRoom.trim(), 'Friend')
        .then(() => {
          setMpRole('client');
          setRoomCode(inviteRoom.trim().toUpperCase());
        })
        .catch(() => {});
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

  const getNextPlayerIndex = useCallback(
    (currentIndex: number, dir: 1 | -1, steps = 1) => {
      const total = 4;
      return (((currentIndex + dir * steps) % total) + total) % total;
    },
    []
  );

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

  // Core card play resolution (authoritative on Host / Offline)
  const commitCardPlay = useCallback(
    (
      playerIdx: number,
      card: UnoCardData,
      chosenWildColor?: ActiveColor
    ) => {
      const actingPlayer = players[playerIdx];
      if (!actingPlayer) return;

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

      const relativeFromSeat = getRelativeSeat(playerIdx, mySeatIndex);
      spawnCardFlight(
        playedCardWithMeta,
        relativeFromSeat,
        'discard_pile',
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
        triggerTableEffect({
          type: 'reverse',
          color: nextColor,
          label: '⇄ DIRECTION REVERSED',
        });
      }

      if (card.value === 'skip') {
        stepAdvance = 2;
        const skippedIdx = getNextPlayerIndex(playerIdx, nextDir, 1);
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
        const targetIdx = getNextPlayerIndex(playerIdx, nextDir, 1);
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
          const donorIdx = getNextPlayerIndex(idx, (nextDir * -1) as 1 | -1, 1);
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
          setPlayers(nextPlayers);
          setAwaitingSevenSwapForSeat(playerIdx);
          return;
        } else {
          let bestTargetIdx = 0;
          let minCount = 999;
          nextPlayers.forEach((p, idx) => {
            if (idx !== playerIdx && p.hand.length < minCount) {
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
      const nextTurn = getNextPlayerIndex(playerIdx, nextDir, stepAdvance);
      setTurnIndex(nextTurn);
    },
    [
      players,
      direction,
      pendingPenalty,
      sevenZeroRule,
      mySeatIndex,
      spawnCardFlight,
      triggerTableEffect,
      getNextPlayerIndex,
    ]
  );

  // Draw Card(s) for any player
  const executePlayerDraw = useCallback(
    (playerIdx: number) => {
      const targetPlayer = players[playerIdx];
      if (!targetPlayer) return;

      const drawCount = pendingPenalty > 0 ? pendingPenalty : 1;
      const { drawn, nextDeck } = pullCardsFromDeck(drawCount, drawPile);

      soundFX.playCardDraw();

      const relTargetSeat = getRelativeSeat(playerIdx, mySeatIndex);
      drawn.slice(0, 6).forEach((c, i) => {
        spawnCardFlight(
          c,
          'draw_pile',
          relTargetSeat,
          playerIdx === mySeatIndex,
          i * 90
        );
      });

      if (pendingPenalty > 0) {
        soundFX.playSpecialEffect('penalty');
        triggerTableEffect({
          type: 'draw_penalty',
          color: activeColor,
          targetSeat: relTargetSeat,
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
      setTurnIndex(getNextPlayerIndex(playerIdx, direction, 1));
    },
    [
      players,
      pendingPenalty,
      drawPile,
      activeColor,
      direction,
      mySeatIndex,
      pullCardsFromDeck,
      spawnCardFlight,
      triggerTableEffect,
      getNextPlayerIndex,
    ]
  );

  // Execute a 7-Swap chosen by any human seat
  const executeSevenSwapForSeat = useCallback(
    (sourceSeatIdx: number, targetPlayerId: string) => {
      const targetIdx = players.findIndex((p) => p.id === targetPlayerId);
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
      setTurnIndex(getNextPlayerIndex(sourceSeatIdx, direction, 1));
    },
    [players, activeColor, direction, triggerTableEffect, getNextPlayerIndex]
  );

  // Configure PeerJS callbacks so Host processes Client actions and Clients apply Host state
  useEffect(() => {
    mpManager.onStatusChange = (txt) => setMpStatusText(txt);

    mpManager.onClientJoined = (seatIdx, friendName) => {
      setConnectedFriendsCount(mpManager.getConnectedPeerCount());
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === seatIdx
            ? { ...p, name: friendName, title: 'ONLINE FRIEND', isAI: false }
            : p
        )
      );
    };

    mpManager.onClientLeft = (seatIdx) => {
      setConnectedFriendsCount(mpManager.getConnectedPeerCount());
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === seatIdx
            ? {
                ...p,
                name: INITIAL_PLAYERS_META[seatIdx].name,
                title: INITIAL_PLAYERS_META[seatIdx].title,
                isAI: true,
              }
            : p
        )
      );
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
      }
    };

    mpManager.onStateReceived = (state, assignedSeat) => {
      if (typeof assignedSeat === 'number') {
        setMySeatIndex(assignedSeat);
      }
      setMode(state.mode);
      setSevenZeroRule(state.sevenZeroRule);
      setPlayers(
        state.players.map((p) => ({
          ...p,
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
    };
  }, [
    players,
    turnIndex,
    awaitingSevenSwapForSeat,
    commitCardPlay,
    executePlayerDraw,
    executeSevenSwapForSeat,
  ]);

  const isMyTurn = turnIndex === mySeatIndex;
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

  // AI Turn Controller (runs only when offline or Host, and only for seats where isAI === true)
  useEffect(() => {
    if (
      mpRole === 'client' ||
      players.length === 0 ||
      winner ||
      awaitingSevenSwapForSeat !== null ||
      pendingWildCard
    ) {
      return;
    }

    const activeSeatPlayer = players[turnIndex];
    if (!activeSeatPlayer || !activeSeatPlayer.isAI) return;

    aiTimerRef.current = window.setTimeout(() => {
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
    }, 1050);

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, [
    mpRole,
    turnIndex,
    players,
    discardPile,
    activeColor,
    pendingPenalty,
    winner,
    awaitingSevenSwapForSeat,
    pendingWildCard,
    commitCardPlay,
    executePlayerDraw,
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

  const activePlayer = players[turnIndex];
  const topDiscard = discardPile[discardPile.length - 1];

  return (
    <div className="uno-billiards-app-root">
      <PoolTableStage activeColor={activeColor}>
        {/* TOP OPPONENT */}
        <OpponentSeat
          player={topOpponent}
          isActiveTurn={turnIndex === topPlayerIdx}
          isSkipped={skippedPlayerId === topOpponent.id}
          selectableForSwap={awaitingMySevenSwap}
          onSelectForSwap={handleSelectSwapOpponent}
        />

        {/* LEFT OPPONENT */}
        <OpponentSeat
          player={leftOpponent}
          isActiveTurn={turnIndex === leftPlayerIdx}
          isSkipped={skippedPlayerId === leftOpponent.id}
          selectableForSwap={awaitingMySevenSwap}
          onSelectForSwap={handleSelectSwapOpponent}
        />

        {/* RIGHT OPPONENT */}
        <OpponentSeat
          player={rightOpponent}
          isActiveTurn={turnIndex === rightPlayerIdx}
          isSkipped={skippedPlayerId === rightOpponent.id}
          selectableForSwap={awaitingMySevenSwap}
          onSelectForSwap={handleSelectSwapOpponent}
        />

        {/* CENTER GAMEPLAY FOCAL AREA: DRAW PILE, DISCARD PILE & PULSING COLOR ORB */}
        <CenterTableArea
          drawPileCount={drawPile.length}
          discardPile={discardPile}
          activeColor={activeColor}
          direction={direction}
          isPlayerTurn={isMyTurn && !pendingWildCard && !awaitingMySevenSwap}
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

      {/* FOREGROUND PLAYER HAND — AUTOMATICALLY ORGANIZED INTO COLOR GROUPS */}
      <PlayerHand
        cards={myPlayer.hand}
        topCard={topDiscard}
        activeColor={activeColor}
        isPlayerTurn={isMyTurn && !pendingWildCard && !awaitingMySevenSwap}
        pendingPenalty={pendingPenalty}
        onPlayCard={handlePlayerPlayCard}
      />

      {/* MINIMAL COMPETITIVE GAMING HUD WITH ONLINE ROOM SUPPORT */}
      <GameHUD
        mode={mode}
        sevenZeroRule={sevenZeroRule}
        activePlayer={activePlayer}
        playerCardCount={myPlayer.hand.length}
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
        connectedFriendsCount={connectedFriendsCount}
        mpStatusText={mpStatusText}
        onHostOnlineRoom={async (hostName) => {
          const code = await mpManager.startHosting(hostName);
          setMpRole('host');
          setRoomCode(code);
          setMySeatIndex(0);
          setPlayers((prev) =>
            prev.map((p, idx) =>
              idx === 0 ? { ...p, name: hostName, title: 'ROOM HOST' } : p
            )
          );
          return code;
        }}
        onJoinOnlineRoom={async (codeToJoin, guestName) => {
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
          startNewMatch(mode);
        }}
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
        onNewMatch={() => startNewMatch(mode)}
      />
    </div>
  );
}
export default App;
