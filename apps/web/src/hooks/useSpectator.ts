'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, joinSpectator, leaveSpectator, getActiveMatches } from '@/lib/socket';
import { MatchWithDetails, ActiveMatchSummary } from '@codeduel/shared';

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

  const [spectatorState, setSpectatorState] = useState<SpectatorState>({
    match: null,
    player1Code: '',
    player2Code: '',
  });
  const [activeMatches, setActiveMatches] = useState<ActiveMatchSummary[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || hasSetupListeners.current) return;

    hasSetupListeners.current = true;

    const handleSpectatorState = (data: {
      match: MatchWithDetails;
      player1Code: string;
      player2Code: string;
    }) => {
      setSpectatorState(data);
      setIsLoading(false);
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
  }, [matchId]);

  // Join spectator when matchId is provided
  useEffect(() => {
    if (matchId) {
      setIsLoading(true);
      joinSpectator(matchId);
    }

    return () => {
      if (matchId) {
        leaveSpectator(matchId);
      }
    };
  }, [matchId]);

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
  };
}
