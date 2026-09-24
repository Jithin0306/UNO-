import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveColor,
  CardFlight,
  EliminationEvent,
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
import {
  BOT_AVATAR_JAX,
  BOT_AVATAR_KAIRO,
  BOT_AVATAR_NYX,
  DEFAULT_HUMAN_AVATAR,
} from './utils/avatarImage';

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
    avatarUrl: DEFAULT_HUMAN_AVATAR,
    accentColor: '#f59e0b',
    isAI: false,
  },
  {
    id: 'player-1',
    name: 'Kairo',
    title: 'CYBER BOT',
    seat: 'left',
    avatarUrl: BOT_AVATAR_KAIRO,
    accentColor: '#3b82f6',
    isAI: true,
  },
  {
    id: 'player-2',
    name: 'Nyx',
    title: 'MECHA BOT',
    seat: 'top',
    avatarUrl: BOT_AVATAR_NYX,
    accentColor: '#a855f7',
    isAI: true,
  },
  {
    id: 'player-3',
    name: 'Jax',
    title: 'SYNTH BOT',
    seat: 'right',
    avatarUrl: BOT_AVATAR_JAX,
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
  const [turnTick, setTurnTick] = useState<number>(0);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(60);
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
  const [myAvatarUrl, setMyAvatarUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('uno_player_avatar') ||
        INITIAL_PLAYERS_META[0].avatarUrl
      );
    } catch {
      return INITIAL_PLAYERS_META[0].avatarUrl;
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

  // Choreographed flight, table special effects & full-stage elimination animation
  const [flights, setFlights] = useState<CardFlight[]>([]);
  const [effects, setEffects] = useState<TableSpecialEffect[]>([]);
  const [activeElimination, setActiveElimination] =
    useState<EliminationEvent | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);

  const latestFlightRef = useRef<NetworkFlightEvent | null>(null);
  const latestEffectRef = useRef<TableSpecialEffect | null>(null);
  const latestEliminationRef = useRef<EliminationEvent | null>(null);
  const seenFlightIdRef = useRef<string>('');
  const seenEffectIdRef = useRef<string>('');
  const seenEliminationIdRef = useRef<string>('');
  const aiTimerRef = useRef<number | null>(null);
  const elimTimerRef = useRef<number | null>(null);

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

  const triggerEliminationBanner = useCallback(
    (elim: Omit<EliminationEvent, 'id'>) => {
      const id = `elim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullElim: EliminationEvent = { ...elim, id };
      latestEliminationRef.current = fullElim;
      seenEliminationIdRef.current = id;
      soundFX.playSpecialEffect('elimination');
      setActiveElimination(fullElim);
      if (elimTimerRef.current) {
        window.clearTimeout(elimTimerRef.current);
      }
      elimTimerRef.current = window.setTimeout(() => {
        setActiveElimination((prev) => (prev?.id === id ? null : prev));
      }, 3900);
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
          const isSeatAI = existing ? existing.isAI : meta.isAI;
          const isActive = customActiveMask
            ? customActiveMask[idx]
            : existing
            ? existing.isActive || Boolean(existing.isEliminated)
            : true;
          return {
            ...meta,
            name:
              idx === 0
                ? myPlayerName
                : existing && !isSeatAI
                ? existing.name
                : meta.name,
            avatarUrl:
              idx === 0
                ? myAvatarUrl
                : isSeatAI
                ? meta.avatarUrl
                : existing?.avatarUrl || meta.avatarUrl,
            title:
              existing && !isSeatAI
                ? existing.isEliminated
                  ? 'ONLINE FRIEND'
                  : existing.title
                : meta.title,
            isAI: isSeatAI,
            isActive: idx === 0 ? true : isActive,
            isEliminated: false,
            afkCount: 0,
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
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);
      setDirection(1);
      setPendingPenalty(0);
      setPendingWildCard(null);
      setAwaitingSevenSwapForSeat(null);
      setSkippedPlayerId(null);
      setActiveElimination(null);
      setWinner(null);
    },
    [mode, myPlayerName, myAvatarUrl]
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
      if (elimTimerRef.current) window.clearTimeout(elimTimerRef.current);
    };
  }, []);

  // Broadcast authoritative state from Host whenever core state updates
  useEffect(() => {
    if (mpRole === 'host' && players.length === 4 && discardPile.length > 0) {
      const statePayload: SyncedTableState = {
        mode,
        sevenZeroRule,
        players,
        drawPile,
        drawPileCount: drawPile.length,
        discardPile,
        activeColor,
        turnIndex,
        direction,
        pendingPenalty,
        skippedPlayerId,
        awaitingSevenSwapForSeat,
        winner,
        turnSecondsLeft,
        inLobby: showHomeScreen,
        hostSeatIndex: mySeatIndex,
        latestFlight: latestFlightRef.current,
        latestEffect: latestEffectRef.current,
        latestElimination: latestEliminationRef.current,
      };
      mpManager.broadcastState(statePayload);
    }
  }, [
    mpRole,
    mySeatIndex,
    showHomeScreen,
    mode,
    sevenZeroRule,
    players,
    drawPile.length,
    discardPile,
    activeColor,
    turnIndex,
    turnSecondsLeft,
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
                avatarUrl: INITIAL_PLAYERS_META[seatIdx].avatarUrl,
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
      setWinner(null);
      setPendingPenalty(0);
      setPendingWildCard(null);
      setAwaitingSevenSwapForSeat(null);

      setPlayers((prev) => {
        const hasOnlineFriends = prev.some(
          (p, i) => i > 0 && !p.isAI && p.isActive
        );
        const deal = dealInitialHands(mode);

        const updated = prev.map((p, idx) => {
          if (idx === 0) {
            return {
              ...p,
              isActive: true,
              isEliminated: false,
              title: 'CHALLENGER',
              hand: deal.playerHand,
              calledUno: false,
            };
          }
          // Never kick a connected human friend
          if (!p.isAI && p.isActive) {
            return {
              ...p,
              isEliminated: false,
              hand:
                deal.opponentHands[(idx - 1) as 0 | 1 | 2] ??
                sortHandCards(createDeck(mode).slice(0, 7)),
              calledUno: false,
            };
          }

          if (preset === 'no_bots') {
            return {
              ...p,
              isAI: true,
              isActive: false,
              isEliminated: false,
              hand: [],
            };
          }
          if (preset === '1v1') {
            const shouldActivateBot = !hasOnlineFriends && idx === 2;
            return {
              ...p,
              name: INITIAL_PLAYERS_META[idx].name,
              title: INITIAL_PLAYERS_META[idx].title,
              isAI: true,
              isActive: shouldActivateBot,
              isEliminated: false,
              hand: deal.opponentHands[(idx - 1) as 0 | 1 | 2],
              calledUno: false,
            };
          }
          // '1v3': activate all 3 seats
          return {
            ...p,
            name: INITIAL_PLAYERS_META[idx].name,
            title: INITIAL_PLAYERS_META[idx].title,
            isAI: true,
            isActive: true,
            isEliminated: false,
            hand: deal.opponentHands[(idx - 1) as 0 | 1 | 2],
            calledUno: false,
          };
        });

        setDrawPile(deal.drawPile);
        setDiscardPile(deal.discardPile);
        setActiveColor(deal.initialColor);
        setTurnIndex(0);
        setDirection(1);
        return updated;
      });
    },
    [mode]
  );

  // Official Mattel UNO Show 'Em No Mercy™ — 25-Card Elimination Helper
  const evaluateMercyRule = useCallback(
    (
      candidatePlayers: Player[],
      currentDeck: UnoCardData[]
    ): {
      survivorsUpdated: Player[];
      reshuffledDeck: UnoCardData[];
      eliminatedNames: string[];
      mercyWinner: Player | null;
    } => {
      if (mode !== 'no_mercy') {
        return {
          survivorsUpdated: candidatePlayers,
          reshuffledDeck: currentDeck,
          eliminatedNames: [],
          mercyWinner: null,
        };
      }

      let deckPool = [...currentDeck];
      const eliminatedNames: string[] = [];
      const eliminatedRecords: Array<{ player: Player; cardCount: number }> = [];

      const survivorsUpdated = candidatePlayers.map((p) => {
        if (p.isActive && !p.isEliminated && p.hand.length >= 25) {
          const heldCount = p.hand.length;
          eliminatedNames.push(`${p.name} (${heldCount} cards)`);
          eliminatedRecords.push({ player: p, cardCount: heldCount });
          // Official Rulebook: "Set aside their hand of cards until the deck runs out and needs to be reshuffled."
          deckPool = [...deckPool, ...p.hand];
          return {
            ...p,
            isActive: false,
            isEliminated: true,
            title: `MERCY KO (${heldCount} CARDS)`,
            hand: [],
            calledUno: false,
          };
        }
        return p;
      });

      const remainingActive = survivorsUpdated.filter(
        (p) => p.isActive && !p.isEliminated
      );

      if (eliminatedRecords.length > 0) {
        const lastElim = eliminatedRecords[eliminatedRecords.length - 1];
        triggerEliminationBanner({
          playerId: lastElim.player.id,
          playerName: lastElim.player.name,
          avatarUrl: lastElim.player.avatarUrl,
          reason: 'mercy_25_cards',
          cardCount: lastElim.cardCount,
          survivorsLeft: remainingActive.length,
        });
      }

      let mercyWinner: Player | null = null;
      if (eliminatedNames.length > 0 && remainingActive.length === 1) {
        mercyWinner = remainingActive[0];
      }

      return {
        survivorsUpdated,
        reshuffledDeck: deckPool,
        eliminatedNames,
        mercyWinner,
      };
    },
    [mode, triggerEliminationBanner]
  );

  // Continuous safety guard: if any active player ever holds >= 25 cards in No Mercy mode, immediately eliminate them
  useEffect(() => {
    if (mode !== 'no_mercy' || winner) return;
    const hasOverLimit = players.some(
      (p) => p.isActive && !p.isEliminated && p.hand.length >= 25
    );
    if (!hasOverLimit) return;

    const {
      survivorsUpdated,
      reshuffledDeck,
      eliminatedNames,
      mercyWinner,
    } = evaluateMercyRule(players, drawPile);

    if (eliminatedNames.length > 0) {
      soundFX.playSpecialEffect('penalty');
      triggerTableEffect({
        type: 'mercy_ko',
        color: 'red',
        label: `💀 MERCY RULE (25+ CARDS)! ${eliminatedNames
          .join(', ')
          .toUpperCase()} KNOCKED OUT!`,
      });
      setDrawPile(reshuffledDeck);
      setPlayers(survivorsUpdated);
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);
      if (mercyWinner) {
        setWinner(mercyWinner);
        soundFX.playSpecialEffect('win');
      } else {
        setTurnIndex((prevTurn) =>
          getNextActivePlayerIndex(prevTurn, direction, 1, survivorsUpdated)
        );
      }
    }
  }, [
    mode,
    players,
    winner,
    drawPile,
    direction,
    evaluateMercyRule,
    triggerTableEffect,
  ]);

  // Core card play resolution (authoritative on Host / Offline)
  const commitCardPlay = useCallback(
    (
      playerIdx: number,
      card: UnoCardData,
      chosenWildColor?: ActiveColor,
      overrideAfkCount?: number
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

      let nextDeckPool = [...drawPile];

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
          afkCount:
            overrideAfkCount !== undefined ? overrideAfkCount : p.afkCount ?? 0,
        };
      });

      setDiscardPile((prev) => [...prev.slice(-14), playedCardWithMeta]);
      setActiveColor(nextColor);
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);

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

        // Official Mattel Rulebook:
        // - With 2 players, Reverse skips the other player so you take another turn (stepAdvance = 2).
        // - With 2 players, Wild Reverse Draw 4 skips the other player and targets YOU with +4 (unless you stack it back!).
        if (activePlayersCount === 2) {
          stepAdvance = 2;
        }

        triggerTableEffect({
          type: 'reverse',
          color: nextColor,
          label:
            activePlayersCount === 2 && card.value === 'wild_reverse_draw4'
              ? '⇄ WILD REVERSE +4 (2P: STACK OR DRAW 4!)'
              : activePlayersCount === 2 && card.value === 'reverse'
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

      // Official Wild Color Roulette Rule (Page 2 of Rulebook):
      // Next player reveals cards one at a time from Draw Pile until they get a card of `nextColor` (Wilds do NOT count),
      // adds all revealed cards to their hand, and loses their turn!
      if (card.value === 'wild_color_roulette') {
        const rouletteVictimIdx = getNextActivePlayerIndex(
          playerIdx,
          nextDir,
          1,
          nextPlayers
        );
        const revealedCards: UnoCardData[] = [];
        let pool = [...nextDeckPool];
        if (pool.length < 30) {
          pool = [...pool, ...createDeck(mode)];
        }
        while (pool.length > 0) {
          const pulled = pool.shift()!;
          revealedCards.push(pulled);
          // Stop if revealed card matches `nextColor` (Wild cards do NOT count) OR victim hits 25-card Mercy limit
          if (
            pulled.color === nextColor ||
            nextPlayers[rouletteVictimIdx].hand.length + revealedCards.length >= 25
          ) {
            break;
          }
        }
        nextDeckPool = pool;
        nextPlayers = nextPlayers.map((p, idx) =>
          idx === rouletteVictimIdx
            ? {
                ...p,
                hand: sortHandCards([...p.hand, ...revealedCards]),
                calledUno: false,
              }
            : p
        );
        stepAdvance = 2; // Victim loses their turn
        soundFX.playSpecialEffect('penalty');
        triggerTableEffect({
          type: 'color_roulette',
          color: nextColor,
          targetSeat: getRelativeSeat(rouletteVictimIdx, mySeatIndex),
          penaltyAmount: revealedCards.length,
          label: `🎡 ROULETTE! ${nextPlayers[
            rouletteVictimIdx
          ].name.toUpperCase()} DREW +${
            revealedCards.length
          } UNTIL ${nextColor.toUpperCase()}`,
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
          stepAdvance,
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

      if ((sevenZeroRule || mode === 'no_mercy') && card.value === '0') {
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
          label: "0'S PASS • ALL HANDS PASSED IN DIRECTION OF PLAY!",
        });
      }

      if ((sevenZeroRule || mode === 'no_mercy') && card.value === '7') {
        if (!actingPlayer.isAI && overrideAfkCount === undefined) {
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
              label: `7'S SWAP • SWAPPED HANDS WITH ${nextPlayers[
                otherIdx
              ].name.toUpperCase()}`,
            });
          } else {
            setDrawPile(nextDeckPool);
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
            label: `7'S SWAP • ${actingPlayer.name.toUpperCase()} SWAPPED WITH ${nextPlayers[
              bestTargetIdx
            ].name.toUpperCase()}`,
          });
        }
      }

      // Check 25-Card Mercy Rule after any card play / Roulette / 7-0 hand swap
      const {
        survivorsUpdated,
        reshuffledDeck,
        eliminatedNames,
        mercyWinner,
      } = evaluateMercyRule(nextPlayers, nextDeckPool);

      if (eliminatedNames.length > 0) {
        triggerTableEffect({
          type: 'mercy_ko',
          color: 'red',
          label: `💀 MERCY RULE (25+ CARDS)! ${eliminatedNames
            .join(', ')
            .toUpperCase()} KNOCKED OUT!`,
        });
      }

      setDrawPile(reshuffledDeck);
      setPlayers(survivorsUpdated);

      if (mercyWinner) {
        setWinner(mercyWinner);
        soundFX.playSpecialEffect('win');
        return;
      }

      const nextTurn = getNextActivePlayerIndex(
        playerIdx,
        nextDir,
        stepAdvance,
        survivorsUpdated
      );
      setTurnIndex(nextTurn);
    },
    [
      players,
      drawPile,
      mode,
      direction,
      pendingPenalty,
      sevenZeroRule,
      mySeatIndex,
      evaluateMercyRule,
      spawnNetworkFlight,
      triggerTableEffect,
    ]
  );

  // Draw Card(s) for any active player — Enforces Official "Draw Until Playable" & "25-Card Mercy Rule"
  const executePlayerDraw = useCallback(
    (playerIdx: number, overrideAfkCount?: number) => {
      const targetPlayer = players[playerIdx];
      if (!targetPlayer || !targetPlayer.isActive) return;

      const topCard =
        discardPile[discardPile.length - 1] ?? {
          id: 'fallback',
          color: activeColor,
          value: '0',
          category: 'number',
        };

      let pool = [...drawPile];
      if (pool.length < 35) {
        pool = [...pool, ...createDeck(mode)];
      }

      let drawn: UnoCardData[] = [];

      if (pendingPenalty > 0) {
        // Taking a stacked penalty (+2, +4, +6, +10, etc.)
        drawn = pool.splice(0, pendingPenalty);
      } else if (mode === 'no_mercy') {
        // Official Mattel Rulebook (Page 1):
        // "If you DO NOT HAVE a matching card, you MUST draw cards from the Draw Pile UNTIL YOU DRAW A CARD YOU CAN PLAY."
        // (If player already had a matching card and chose to draw 1, draw 1; otherwise draw until playable or until hitting 25 cards!)
        const alreadyHasPlayable = targetPlayer.hand.some((c) =>
          canPlayCard(c, topCard, activeColor, 0)
        );
        if (alreadyHasPlayable) {
          drawn = pool.splice(0, 1);
        } else {
          while (pool.length > 0) {
            const card = pool.shift()!;
            drawn.push(card);
            const reachedMercyLimit =
              targetPlayer.hand.length + drawn.length >= 25;
            const isMatch = canPlayCard(card, topCard, activeColor, 0);
            if (isMatch || reachedMercyLimit) {
              break;
            }
          }
        }
      } else {
        drawn = pool.splice(0, 1);
      }

      soundFX.playCardDraw();

      drawn.slice(0, 6).forEach((c, i) => {
        spawnNetworkFlight(
          c,
          'draw_pile',
          playerIdx,
          mySeatIndex,
          playerIdx === mySeatIndex,
          i * 85
        );
      });

      if (pendingPenalty > 0 || drawn.length > 1) {
        soundFX.playSpecialEffect('penalty');
        triggerTableEffect({
          type: 'draw_penalty',
          color: activeColor,
          targetSeat: getRelativeSeat(playerIdx, mySeatIndex),
          penaltyAmount: drawn.length,
          label:
            pendingPenalty > 0
              ? `${targetPlayer.name.toUpperCase()} DREW PENALTY +${drawn.length}`
              : `${targetPlayer.name.toUpperCase()} DREW ${drawn.length} UNTIL PLAYABLE`,
        });
      }

      const candidatePlayers = players.map((p, idx) => {
        if (idx !== playerIdx) return p;
        return {
          ...p,
          hand: sortHandCards([...p.hand, ...drawn]),
          calledUno: false,
          afkCount:
            overrideAfkCount !== undefined ? overrideAfkCount : p.afkCount ?? 0,
        };
      });

      // Immediately enforce the 25-Card Mercy Rule!
      const {
        survivorsUpdated,
        reshuffledDeck,
        eliminatedNames,
        mercyWinner,
      } = evaluateMercyRule(candidatePlayers, pool);

      if (eliminatedNames.length > 0) {
        soundFX.playSpecialEffect('penalty');
        triggerTableEffect({
          type: 'mercy_ko',
          color: 'red',
          targetSeat: getRelativeSeat(playerIdx, mySeatIndex),
          label: `💀 MERCY RULE (25+ CARDS)! ${eliminatedNames
            .join(', ')
            .toUpperCase()} KNOCKED OUT!`,
        });
      }

      setDrawPile(reshuffledDeck);
      setPlayers(survivorsUpdated);
      setPendingPenalty(0);
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);

      if (mercyWinner) {
        setWinner(mercyWinner);
        soundFX.playSpecialEffect('win');
        return;
      }

      // If player took a penalty OR was knocked out OR timed out on AFK OR has no playable card, advance turn.
      const lastDrawnCard = drawn[drawn.length - 1];
      const canPlayLastDrawn =
        overrideAfkCount === undefined &&
        pendingPenalty === 0 &&
        survivorsUpdated[playerIdx]?.isActive &&
        lastDrawnCard &&
        canPlayCard(lastDrawnCard, topCard, activeColor, 0);

      if (canPlayLastDrawn && !survivorsUpdated[playerIdx].isAI) {
        // Keep turn on the human player so they can immediately play the card they drew (per Official Rulebook!)
        return;
      }

      setTurnIndex(
        getNextActivePlayerIndex(playerIdx, direction, 1, survivorsUpdated)
      );
    },
    [
      players,
      discardPile,
      pendingPenalty,
      drawPile,
      mode,
      activeColor,
      direction,
      mySeatIndex,
      evaluateMercyRule,
      spawnNetworkFlight,
      triggerTableEffect,
    ]
  );

  // Execute a 7-Swap chosen by any human seat
  const executeSevenSwapForSeat = useCallback(
    (sourceSeatIdx: number, targetPlayerId: string, overrideAfkCount?: number) => {
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
        afkCount:
          overrideAfkCount !== undefined
            ? overrideAfkCount
            : updated[sourceSeatIdx].afkCount ?? 0,
      };
      updated[targetIdx] = {
        ...updated[targetIdx],
        hand: sortHandCards(sourceHand),
      };

      soundFX.playSpecialEffect('reverse');
      triggerTableEffect({
        type: 'seven_swap',
        color: activeColor,
        label: `7'S SWAP • ${updated[sourceSeatIdx].name.toUpperCase()} SWAPPED WITH ${updated[
          targetIdx
        ].name.toUpperCase()}`,
      });

      const {
        survivorsUpdated,
        reshuffledDeck,
        mercyWinner,
      } = evaluateMercyRule(updated, drawPile);

      setDrawPile(reshuffledDeck);
      setPlayers(survivorsUpdated);
      setAwaitingSevenSwapForSeat(null);
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);

      if (mercyWinner) {
        setWinner(mercyWinner);
        soundFX.playSpecialEffect('win');
        return;
      }

      setTurnIndex(
        getNextActivePlayerIndex(sourceSeatIdx, direction, 1, survivorsUpdated)
      );
    },
    [players, drawPile, activeColor, direction, evaluateMercyRule, triggerTableEffect]
  );

  // Configure PeerJS callbacks so Host processes Client actions and Clients apply Host state
  useEffect(() => {
    mpManager.onStatusChange = (txt) => setMpStatusText(txt);

    mpManager.onClientJoined = (seatIdx, friendName, friendAvatarUrl) => {
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
                avatarUrl: friendAvatarUrl || p.avatarUrl,
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
        const updated = prev.map((p, idx) => {
          if (idx !== seatIdx) return p;
          const keepPlayingAsBot = !showHomeScreen && p.isActive && !p.isEliminated;
          const cleanBaseName = p.name.replace(/ \(Bot\)$/i, '');
          return {
            ...p,
            name: keepPlayingAsBot
              ? `${cleanBaseName} (Bot)`
              : INITIAL_PLAYERS_META[seatIdx].name,
            avatarUrl: INITIAL_PLAYERS_META[seatIdx].avatarUrl,
            title: keepPlayingAsBot
              ? 'AI TAKEOVER'
              : INITIAL_PLAYERS_META[seatIdx].title,
            isAI: true,
            isActive: keepPlayingAsBot,
          };
        });
        return updated;
      });
      if (awaitingSevenSwapForSeat === seatIdx) {
        setAwaitingSevenSwapForSeat(null);
      }
      setTurnTick((t) => t + 1);
    };

    mpManager.onPromotedToHost = (
      newHostSeatIdx,
      formerHostSeatIdx,
      migratedState
    ) => {
      setMpRole('host');
      setMySeatIndex(newHostSeatIdx);
      setConnectedFriendsCount(mpManager.getConnectedPeerCount());
      if (migratedState.drawPile && migratedState.drawPile.length > 0) {
        setDrawPile(migratedState.drawPile);
      }
      setDiscardPile(migratedState.discardPile);
      setActiveColor(migratedState.activeColor);
      setTurnIndex(migratedState.turnIndex);
      setDirection(migratedState.direction);
      setPendingPenalty(migratedState.pendingPenalty);
      setSkippedPlayerId(migratedState.skippedPlayerId);
      setAwaitingSevenSwapForSeat(
        migratedState.awaitingSevenSwapForSeat === formerHostSeatIdx
          ? null
          : migratedState.awaitingSevenSwapForSeat
      );
      setWinner(migratedState.winner);

      const wasInLobby = Boolean(migratedState.inLobby);
      setPlayers(
        migratedState.players.map((p, idx) => {
          if (idx === newHostSeatIdx) {
            return {
              ...p,
              title: 'ROOM HOST',
              isAI: false,
              isActive: true,
              hand: sortHandCards(p.hand),
            };
          }
          if (idx === formerHostSeatIdx) {
            const keepPlayingAsBot = !wasInLobby && p.isActive && !p.isEliminated;
            const cleanBaseName = p.name.replace(/ \(Bot\)$/i, '');
            return {
              ...p,
              name: keepPlayingAsBot
                ? `${cleanBaseName} (Bot)`
                : INITIAL_PLAYERS_META[idx].name,
              avatarUrl: INITIAL_PLAYERS_META[idx].avatarUrl,
              title: keepPlayingAsBot
                ? 'AI TAKEOVER'
                : INITIAL_PLAYERS_META[idx].title,
              isAI: true,
              isActive: keepPlayingAsBot,
              hand: sortHandCards(p.hand),
            };
          }
          return {
            ...p,
            hand: sortHandCards(p.hand),
          };
        })
      );

      setTurnTick((t) => t + 1);
      const promotedName =
        migratedState.players[newHostSeatIdx]?.name || 'YOU';
      triggerTableEffect({
        type: 'wild_shift',
        color: migratedState.activeColor,
        label: `👑 HOST TRANSFERRED TO ${promotedName.toUpperCase()}!`,
      });
    };

    mpManager.onHostMigratedToOther = (
      newHostSeatIdx,
      formerHostSeatIdx,
      migratedState
    ) => {
      const wasInLobby = Boolean(migratedState.inLobby);
      setPlayers((prev) =>
        prev.map((p, idx) => {
          if (idx === newHostSeatIdx) {
            return { ...p, title: 'ROOM HOST' };
          }
          if (idx === formerHostSeatIdx) {
            const keepPlayingAsBot = !wasInLobby && p.isActive && !p.isEliminated;
            const cleanBaseName = p.name.replace(/ \(Bot\)$/i, '');
            return {
              ...p,
              name: keepPlayingAsBot
                ? `${cleanBaseName} (Bot)`
                : INITIAL_PLAYERS_META[idx].name,
              avatarUrl: INITIAL_PLAYERS_META[idx].avatarUrl,
              title: keepPlayingAsBot
                ? 'AI TAKEOVER'
                : INITIAL_PLAYERS_META[idx].title,
              isAI: true,
              isActive: keepPlayingAsBot,
            };
          }
          return p;
        })
      );

      const newHostName =
        migratedState.players[newHostSeatIdx]?.name || `Seat ${newHostSeatIdx + 1}`;
      triggerTableEffect({
        type: 'wild_shift',
        color: migratedState.activeColor,
        label: `👑 HOST TRANSFERRED TO ${newHostName.toUpperCase()}!`,
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
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === msg.seatIndex
              ? {
                  ...p,
                  name: cleanName || p.name,
                  avatarUrl:
                    msg.avatarUrl !== undefined ? msg.avatarUrl : p.avatarUrl,
                }
              : p
          )
        );
      } else if (msg.type === 'REQUEST_REMATCH') {
        startNewMatch(mode);
      }
    };

    mpManager.onStateReceived = (state, assignedSeat) => {
      setMySeatIndex(assignedSeat);
      setMode(state.mode);
      setSevenZeroRule(state.sevenZeroRule);
      if (state.drawPile && state.drawPile.length > 0) {
        setDrawPile(state.drawPile);
      }
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
      if (typeof state.turnSecondsLeft === 'number') {
        setTurnSecondsLeft(state.turnSecondsLeft);
      }
      if (state.inLobby === false) {
        setShowHomeScreen(false);
      }

      if (
        state.latestElimination &&
        state.latestElimination.id !== seenEliminationIdRef.current
      ) {
        seenEliminationIdRef.current = state.latestElimination.id;
        soundFX.playSpecialEffect('elimination');
        setActiveElimination(state.latestElimination);
        if (elimTimerRef.current) {
          window.clearTimeout(elimTimerRef.current);
        }
        const elimId = state.latestElimination.id;
        elimTimerRef.current = window.setTimeout(() => {
          setActiveElimination((prev) => (prev?.id === elimId ? null : prev));
        }, 3900);
      }

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

  // Keep latest AI execution logic in a ref so the timer is never reset by unrelated renders
  const runAiTurnRef = useRef<() => void>(() => {});
  runAiTurnRef.current = () => {
    const activeSeatPlayer = players[turnIndex];
    if (!activeSeatPlayer || !activeSeatPlayer.isAI || !activeSeatPlayer.isActive) {
      return;
    }

    // Safety: if awaitingSevenSwapForSeat was ever stuck on an AI seat, clear it immediately
    if (awaitingSevenSwapForSeat === turnIndex) {
      setAwaitingSevenSwapForSeat(null);
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

  // 1-Minute (60s) Turn Timeout & 3-Round AFK Elimination Handler
  const handleTurnTimeoutRef = useRef<() => void>(() => {});
  handleTurnTimeoutRef.current = () => {
    if (showHomeScreen || mpRole === 'client' || winner || activeTotalPlayers < 2) {
      return;
    }

    const actingIdx =
      awaitingSevenSwapForSeat !== null ? awaitingSevenSwapForSeat : turnIndex;
    const actingPlayer = players[actingIdx];
    if (!actingPlayer || !actingPlayer.isActive) {
      setTurnIndex(getNextActivePlayerIndex(turnIndex, direction, 1, players));
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);
      return;
    }

    // If an AI seat ever hit the timer, immediately force AI turn execution
    if (actingPlayer.isAI) {
      runAiTurnRef.current();
      return;
    }

    const nextAfkStrikes = (actingPlayer.afkCount ?? 0) + 1;
    setPendingWildCard(null);

    // 3 ROUNDS OF INACTIVITY => ELIMINATE PLAYER FROM THE GAME!
    if (nextAfkStrikes >= 3) {
      const recycledPool = [...drawPile, ...actingPlayer.hand];
      const updatedPlayers = players.map((p, idx) =>
        idx === actingIdx
          ? {
              ...p,
              isActive: false,
              isEliminated: true,
              afkCount: 3,
              title: 'ELIMINATED (3 AFK)',
              hand: [],
              calledUno: false,
            }
          : p
      );

      const remainingActive = updatedPlayers.filter(
        (p) => p.isActive && !p.isEliminated
      );

      setDrawPile(recycledPool);
      setPlayers(updatedPlayers);
      setAwaitingSevenSwapForSeat(null);
      setTurnTick((t) => t + 1);
      setTurnSecondsLeft(60);

      triggerEliminationBanner({
        playerId: actingPlayer.id,
        playerName: actingPlayer.name,
        avatarUrl: actingPlayer.avatarUrl,
        reason: 'afk_3_rounds',
        cardCount: actingPlayer.hand.length,
        survivorsLeft: remainingActive.length,
      });

      triggerTableEffect({
        type: 'mercy_ko',
        color: 'red',
        targetSeat: getRelativeSeat(actingIdx, mySeatIndex),
        label: `⏱️ ${actingPlayer.name.toUpperCase()} ELIMINATED (3 AFK ROUNDS)!`,
      });

      if (remainingActive.length === 1) {
        setWinner(remainingActive[0]);
        soundFX.playSpecialEffect('win');
      } else {
        setTurnIndex(
          getNextActivePlayerIndex(actingIdx, direction, 1, updatedPlayers)
        );
      }
      return;
    }

    // AFK Strike 1/3 or 2/3 => Automatically throw a random playable card or draw from the deck!
    if (awaitingSevenSwapForSeat === actingIdx) {
      const otherOpponents = players.filter(
        (p, idx) => p.isActive && idx !== actingIdx
      );
      if (otherOpponents.length > 0) {
        const randomTarget =
          otherOpponents[Math.floor(Math.random() * otherOpponents.length)];
        triggerTableEffect({
          type: 'seven_swap',
          color: activeColor,
          label: `⏱️ 1-MIN TIMEOUT! AUTO-SWAPPED FOR ${actingPlayer.name.toUpperCase()} (AFK ${nextAfkStrikes}/3)`,
        });
        executeSevenSwapForSeat(actingIdx, randomTarget.id, nextAfkStrikes);
        return;
      }
    }

    const topCard = discardPile[discardPile.length - 1];
    const playableCards = actingPlayer.hand.filter((c) =>
      canPlayCard(c, topCard, activeColor, pendingPenalty)
    );

    triggerTableEffect({
      type: 'wild_shift',
      color: activeColor,
      label: `⏱️ 1-MIN TIMEOUT! AUTO-MOVE FOR ${actingPlayer.name.toUpperCase()} (AFK ${nextAfkStrikes}/3)`,
    });

    if (playableCards.length > 0) {
      const randomCard =
        playableCards[Math.floor(Math.random() * playableCards.length)];
      const randomColors: ActiveColor[] = ['red', 'blue', 'green', 'yellow'];
      const chosenColor =
        randomCard.color === 'wild'
          ? randomColors[Math.floor(Math.random() * randomColors.length)]
          : undefined;
      commitCardPlay(actingIdx, randomCard, chosenColor, nextAfkStrikes);
    } else {
      executePlayerDraw(actingIdx, nextAfkStrikes);
    }
  };

  // Live 1-Minute (60-Second) Turn Countdown Interval
  useEffect(() => {
    if (
      showHomeScreen ||
      mpRole === 'client' ||
      players.length === 0 ||
      activeTotalPlayers < 2 ||
      winner
    ) {
      return;
    }

    setTurnSecondsLeft(60);

    const countdownInterval = window.setInterval(() => {
      setTurnSecondsLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            handleTurnTimeoutRef.current();
          }, 0);
          return 60;
        }
        const nextVal = prev - 1;
        if (nextVal <= 10) {
          soundFX.playTimerTick(nextVal <= 5);
        }
        return nextVal;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [
    showHomeScreen,
    mpRole,
    turnIndex,
    turnTick,
    activeTotalPlayers,
    winner,
  ]);

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
          avatarUrl: myAvatarUrl,
        });
      } else {
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === mySeatIndex ? { ...p, name: clean } : p
          )
        );
      }
    },
    [mpRole, mySeatIndex, myAvatarUrl]
  );

  const handleSaveMyAvatar = useCallback(
    (newAvatarUrl: string) => {
      const targetAvatar =
        newAvatarUrl && newAvatarUrl.trim()
          ? newAvatarUrl.trim()
          : INITIAL_PLAYERS_META[0].avatarUrl;
      setMyAvatarUrl(targetAvatar);
      try {
        if (targetAvatar === INITIAL_PLAYERS_META[0].avatarUrl) {
          localStorage.removeItem('uno_player_avatar');
        } else {
          localStorage.setItem('uno_player_avatar', targetAvatar);
        }
      } catch {}
      if (mpRole === 'client') {
        mpManager.sendActionToHost({
          type: 'UPDATE_NAME',
          seatIndex: mySeatIndex,
          playerName: myPlayerName,
          avatarUrl: targetAvatar,
        });
      } else {
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === mySeatIndex ? { ...p, avatarUrl: targetAvatar } : p
          )
        );
      }
    },
    [mpRole, mySeatIndex, myPlayerName]
  );

  // AI Turn Controller: bots respond at a natural human pace (1.2s - 2.2s per turn)
  // Includes `turnTick`, `topDiscardId`, and a backup watchdog interval so AI bots NEVER stop playing!
  const activeSeatIsAI =
    Boolean(players[turnIndex]?.isAI) && Boolean(players[turnIndex]?.isActive);
  const topDiscardId = discardPile[discardPile.length - 1]?.id ?? '';

  useEffect(() => {
    if (
      showHomeScreen ||
      mpRole === 'client' ||
      players.length === 0 ||
      activeTotalPlayers < 2 ||
      !activeSeatIsAI ||
      winner ||
      pendingWildCard
    ) {
      return;
    }

    const botThinkDelayMs = 1200 + Math.floor(Math.random() * 1000);

    aiTimerRef.current = window.setTimeout(() => {
      runAiTurnRef.current();
    }, botThinkDelayMs);

    // Backup watchdog: if for any reason the bot is still active on this turn after 2.6s, immediately execute!
    const watchdogInterval = window.setInterval(() => {
      runAiTurnRef.current();
    }, 2600);

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
      window.clearInterval(watchdogInterval);
    };
  }, [
    showHomeScreen,
    mpRole,
    turnIndex,
    turnTick,
    topDiscardId,
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
  // Lock bot management during a match so neither Host nor player can add/remove bots in between a game
  const canManageBots = false;

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
            myAvatarUrl={myPlayer.avatarUrl || myAvatarUrl}
            myAfkCount={myPlayer.afkCount ?? 0}
            turnSecondsLeft={turnSecondsLeft}
            activeElimination={activeElimination}
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
            onUpdateMyAvatar={handleSaveMyAvatar}
            onDismissElimination={() => setActiveElimination(null)}
            onHostOnlineRoom={async (hostName) => {
              handleSaveMyName(hostName);
              const code = await mpManager.startHosting(hostName);
              setMpRole('host');
              setRoomCode(code);
              setMySeatIndex(0);
              setPlayers((prev) =>
                prev.map((p, idx) =>
                  idx === 0
                    ? {
                        ...p,
                        name: hostName,
                        avatarUrl: myAvatarUrl,
                        title: 'ROOM HOST',
                        isActive: true,
                      }
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
              await mpManager.joinRoom(codeToJoin, guestName, myAvatarUrl);
              setMpRole('client');
              setRoomCode(codeToJoin.toUpperCase());
            }}
            onLeaveOnlineRoom={() => {
              mpManager.leaveWithHostMigration();
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
            onRematch={() => {
              if (mpRole === 'client') {
                mpManager.sendActionToHost({
                  type: 'REQUEST_REMATCH',
                  seatIndex: mySeatIndex,
                });
              } else {
                startNewMatch(mode);
              }
            }}
            onNewMatch={() => {
              if (mpRole !== 'offline') {
                mpManager.leaveWithHostMigration();
                setMpRole('offline');
                setRoomCode('');
                setMySeatIndex(0);
                setConnectedFriendsCount(0);
                startNewMatch(mode, [true, false, true, false]);
              }
              setShowHomeScreen(true);
            }}
          />
        </>
      )}

      {/* CINEMATIC BILLIARDS HOME SCREEN OVERLAY */}
      {showHomeScreen && (
        <HomeScreen
          savedName={myPlayer.name || myPlayerName}
          savedAvatarUrl={myPlayer.avatarUrl || myAvatarUrl}
          players={players}
          mySeatIndex={mySeatIndex}
          mode={mode}
          sevenZeroRule={sevenZeroRule}
          initialInviteCode={initialInviteCode}
          mpRole={mpRole}
          roomCode={roomCode}
          connectedFriendsCount={connectedFriendsCount}
          mpStatusText={mpStatusText}
          onSavePlayerName={handleSaveMyName}
          onSavePlayerAvatar={handleSaveMyAvatar}
          onAddBotToSeat={handleAddBotToSeat}
          onRemoveBotFromSeat={handleRemoveBotFromSeat}
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
                  ? {
                      ...p,
                      name: hostName,
                      avatarUrl: myAvatarUrl,
                      title: 'ROOM HOST',
                      isActive: true,
                    }
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
            await mpManager.joinRoom(codeToJoin, guestName, myAvatarUrl);
            setMpRole('client');
            setRoomCode(codeToJoin.toUpperCase());
          }}
          onEnterOnlineTable={() => {
            if (mpRole === 'host') {
              startNewMatch(mode);
            }
            setShowHomeScreen(false);
          }}
        />
      )}
    </div>
  );
}
export default App;
