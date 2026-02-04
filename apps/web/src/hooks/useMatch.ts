'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchStore } from '@/stores/matchStore';
import { useAuth } from './useAuth';
import {
  getSocket,
  joinMatch as socketJoinMatch,
  submitCode as socketSubmitCode,
  runCode as socketRunCode,
  updateCode as socketUpdateCode,
  forfeitMatch as socketForfeitMatch,
  TypedSocket,
} from '@/lib/socket';
import { MatchWithDetails, ExecutionResult } from '@codeduel/shared';

interface UseMatchOptions {
  matchId?: string;
  autoJoin?: boolean;
}

export function useMatch(options: UseMatchOptions = {}) {
  const { matchId, autoJoin = true } = options;
  const router = useRouter();
  const { user } = useAuth();
  const hasSetupListeners = useRef(false);
  const codeUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    match,
    myCode,
    opponentCode,
    selectedLanguage,
    isSubmitting,
    isRunning,
    lastResult,
    endTime,
    isMatchEnded,
    winnerId,
    endReason,
    setMatch,
    setMyCode,
    setOpponentCode,
    setSelectedLanguage,
    setIsSubmitting,
    setIsRunning,
    setLastResult,
    setEndTime,
    endMatch,
    reset,
  } = useMatchStore();

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || hasSetupListeners.current) return;

    hasSetupListeners.current = true;

    const handleMatchFound = (matchData: MatchWithDetails) => {
      console.log('Match found:', matchData.id);
      setMatch(matchData);
      // Calculate end time (15 minutes from match start)
      if (matchData.startedAt) {
        const endTime = new Date(new Date(matchData.startedAt).getTime() + 15 * 60 * 1000);
        setEndTime(endTime);
      }
      router.push(`/match/${matchData.id}`);
    };

    const handleMatchStarted = (matchData: MatchWithDetails) => {
      console.log('Match started:', matchData.id);
      setMatch(matchData);
      if (matchData.startedAt) {
        const endTime = new Date(new Date(matchData.startedAt).getTime() + 15 * 60 * 1000);
        setEndTime(endTime);
      }
    };

    const handleOpponentCodeUpdate = (data: { code: string }) => {
      setOpponentCode(data.code);
    };

    const handleSubmissionResult = (result: ExecutionResult) => {
      console.log('Submission result:', result);
      setLastResult(result);
      setIsSubmitting(false);
    };

    const handleRunResult = (result: ExecutionResult) => {
      console.log('Run result:', result);
      setLastResult(result);
      setIsRunning(false);
    };

    const handleMatchEnded = (data: { winnerId: string; reason: string }) => {
      console.log('Match ended:', data);
      endMatch(data.winnerId, data.reason);
    };

    const handleError = (message: string) => {
      console.error('Socket error:', message);
      setIsSubmitting(false);
    };

    socket.on('match_found', handleMatchFound);
    socket.on('match_started', handleMatchStarted);
    socket.on('opponent_code_update', handleOpponentCodeUpdate);
    socket.on('submission_result', handleSubmissionResult);
    socket.on('run_result', handleRunResult);
    socket.on('match_ended', handleMatchEnded);
    socket.on('error', handleError);

    return () => {
      socket.off('match_found', handleMatchFound);
      socket.off('match_started', handleMatchStarted);
      socket.off('opponent_code_update', handleOpponentCodeUpdate);
      socket.off('submission_result', handleSubmissionResult);
      socket.off('run_result', handleRunResult);
      socket.off('match_ended', handleMatchEnded);
      socket.off('error', handleError);
      hasSetupListeners.current = false;
    };
  }, [router, setMatch, setOpponentCode, setLastResult, setIsSubmitting, setIsRunning, endMatch, setEndTime]);

  // Auto-join match if matchId is provided
  useEffect(() => {
    if (matchId && autoJoin) {
      socketJoinMatch(matchId);
    }
  }, [matchId, autoJoin]);

  // Debounced code update to opponent
  const sendCodeUpdate = useCallback(
    (code: string) => {
      if (!match?.id) return;

      // Clear existing timeout
      if (codeUpdateTimeout.current) {
        clearTimeout(codeUpdateTimeout.current);
      }

      // Debounce code updates (200ms)
      codeUpdateTimeout.current = setTimeout(() => {
        socketUpdateCode(match.id, code);
      }, 200);
    },
    [match?.id]
  );

  // Update local code and send to opponent
  const updateMyCode = useCallback(
    (code: string) => {
      setMyCode(code);
      sendCodeUpdate(code);
    },
    [setMyCode, sendCodeUpdate]
  );

  // Submit code for execution (all tests, can end match)
  const submitCode = useCallback(() => {
    if (!match?.id || isSubmitting || isRunning) return;

    setIsSubmitting(true);
    socketSubmitCode({
      matchId: match.id,
      code: myCode,
      language: selectedLanguage,
    });
  }, [match?.id, myCode, selectedLanguage, isSubmitting, isRunning, setIsSubmitting]);

  // Run code against visible tests only (doesn't end match)
  const runCode = useCallback(() => {
    if (!match?.id || isRunning || isSubmitting) return;

    setIsRunning(true);
    socketRunCode({
      matchId: match.id,
      code: myCode,
      language: selectedLanguage,
    });
  }, [match?.id, myCode, selectedLanguage, isRunning, isSubmitting, setIsRunning]);

  // Forfeit the current match
  const forfeit = useCallback(() => {
    if (!match?.id) return;
    socketForfeitMatch(match.id);
  }, [match?.id]);

  // Check if current user is the winner
  const isWinner = winnerId === user?.id;

  // Get opponent info
  const opponent = match
    ? match.player1.id === user?.id
      ? match.player2
      : match.player1
    : null;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (codeUpdateTimeout.current) {
        clearTimeout(codeUpdateTimeout.current);
      }
    };
  }, []);

  return {
    // State
    match,
    myCode,
    opponentCode,
    selectedLanguage,
    isSubmitting,
    isRunning,
    lastResult,
    endTime,
    isMatchEnded,
    winnerId,
    endReason,
    isWinner,
    opponent,

    // Actions
    updateMyCode,
    setSelectedLanguage,
    submitCode,
    runCode,
    forfeit,
    reset,
  };
}
