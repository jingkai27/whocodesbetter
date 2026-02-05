'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, joinSpectator, leaveSpectator, getActiveMatches, onConnectionChange } from '@/lib/socket';
import { MatchWithDetails, ActiveMatchSummary } from '@codeduel/shared';

const SPECTATOR_TIMEOUT_MS = 10000; // 10 second timeout

interface SpectatorState {
  match: MatchWithDetails | null;
  player1Code: string;
  player2Code: string;
}

interface UseSpectatorOptions {
  matchId?: string;
}

export function useSpectator(options: UseSpectatorOptions = {}) {
  const { matchId } = options;
  const router = useRouter();
  const hasSetupListeners = useRef(false);
  const hasJoinedSpectator = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [spectatorState, setSpectatorState] = useState<SpectatorState>({
    match: null,
    player1Code: '',
    player2Code: '',
  });
  const [activeMatches, setActiveMatches] = useState<ActiveMatchSummary[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Track socket connection state
  useEffect(() => {
    const unsubscribe = onConnectionChange((connected) => {
      setSocketConnected(connected);
      if (!connected) {
        // Reset listeners flag when disconnected so they get re-setup on reconnect
        hasSetupListeners.current = false;
        hasJoinedSpectator.current = false;
      }
    });
    return unsubscribe;
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socketConnected) return;

    const socket = getSocket();
    if (!socket || hasSetupListeners.current) return;

    hasSetupListeners.current = true;

    const handleSpectatorState = (data: {
      match: MatchWithDetails;
      player1Code: string;
      player2Code: string;
    }) => {
      // Clear timeout since we received state
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setSpectatorState(data);
      setIsLoading(false);
      setError(null);
    };

    const handlePlayerCodeUpdate = (data: { playerId: string; code: string }) => {
      setSpectatorState((prev) => {
        if (!prev.match) return prev;
        if (data.playerId === prev.match.player1.id) {
          return { ...prev, player1Code: data.code };
        } else if (data.playerId === prev.match.player2.id) {
          return { ...prev, player2Code: data.code };
        }
        return prev;
      });
    };

    const handleSpectatorJoined = (data: { matchId: string; spectatorCount: number }) => {
      if (data.matchId === matchId) {
        setSpectatorCount(data.spectatorCount);
      }
    };

    const handleMatchEnded = (data: { winnerId: string; reason: string }) => {
      // Match ended, could show a modal or redirect
      console.log('Match ended while spectating:', data);
    };

    const handleActiveMatches = (matches: ActiveMatchSummary[]) => {
      setActiveMatches(matches);
      setIsLoading(false);
    };

    socket.on('spectator_state', handleSpectatorState);
    socket.on('player_code_update', handlePlayerCodeUpdate);
    socket.on('spectator_joined', handleSpectatorJoined);
    socket.on('match_ended', handleMatchEnded);
    socket.on('active_matches', handleActiveMatches);

    return () => {
      socket.off('spectator_state', handleSpectatorState);
      socket.off('player_code_update', handlePlayerCodeUpdate);
      socket.off('spectator_joined', handleSpectatorJoined);
      socket.off('match_ended', handleMatchEnded);
      socket.off('active_matches', handleActiveMatches);
      hasSetupListeners.current = false;
    };
  }, [socketConnected, matchId]);

  // Join spectator when matchId is provided and socket is connected with listeners ready
  useEffect(() => {
    if (matchId && socketConnected && hasSetupListeners.current && !hasJoinedSpectator.current) {
      hasJoinedSpectator.current = true;
      setIsLoading(true);
      setError(null);
      joinSpectator(matchId);

      // Set timeout for connection failure
      timeoutRef.current = setTimeout(() => {
        if (isLoading && !spectatorState.match) {
          setError('Failed to connect to match. The match may have ended or does not exist.');
          setIsLoading(false);
        }
      }, SPECTATOR_TIMEOUT_MS);
    }

    return () => {
      if (matchId) {
        leaveSpectator(matchId);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [matchId, socketConnected, isLoading, spectatorState.match]);

  const fetchActiveMatches = useCallback(() => {
    setIsLoading(true);
    getActiveMatches();
  }, []);

  const spectateMatch = useCallback(
    (id: string) => {
      router.push(`/spectate/${id}`);
    },
    [router]
  );

  return {
    // Spectating a specific match
    match: spectatorState.match,
    player1Code: spectatorState.player1Code,
    player2Code: spectatorState.player2Code,
    spectatorCount,

    // Browsing active matches
    activeMatches,
    fetchActiveMatches,
    spectateMatch,

    isLoading,
    error,
  };
}
