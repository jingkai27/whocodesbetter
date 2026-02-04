'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMatch } from '@/hooks/useMatch';
import { useChat } from '@/hooks/useChat';
import {
  CodeEditor,
  ProblemPanel,
  TestResults,
  LanguageSelector,
  MatchHeader,
  MatchEndModal,
} from '@/components/match';
import { ChatBox } from '@/components/chat';
import { Play, Send, MessageCircle } from 'lucide-react';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showEndModal, setShowEndModal] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { matchMessages, sendToMatch } = useChat({ matchId });

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
    isWinner,
    opponent,
    updateMyCode,
    setSelectedLanguage,
    submitCode,
    runCode,
    forfeit,
    reset,
  } = useMatch({ matchId });

  // Show end modal when match ends
  useEffect(() => {
    if (isMatchEnded) {
      setShowEndModal(true);
    }
  }, [isMatchEnded]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Authentication Required
          </h1>
          <p className="text-gray-400">Please log in to join a match.</p>
        </div>
      </div>
    );
  }

  // Waiting for match data
  if (!match) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-400">Connecting to match...</p>
        </div>
      </div>
    );
  }

  const handleForfeit = () => {
    if (confirmForfeit) {
      forfeit();
      setConfirmForfeit(false);
    } else {
      setConfirmForfeit(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmForfeit(false), 3000);
    }
  };

  const winnerName = winnerId
    ? winnerId === match.player1.id
      ? match.player1.username
      : match.player2.username
    : '';

  return (
    <div className="flex h-screen flex-col bg-[#0d1117]">
      {/* Header */}
      <MatchHeader
        player1={match.player1}
        player2={match.player2}
        currentUserId={user.id}
        endTime={endTime}
        onForfeit={handleForfeit}
        onTimeUp={() => console.log('Time up - waiting for server')}
        isMatchEnded={isMatchEnded}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-[400px] flex-shrink-0 border-r border-gray-700">
          <ProblemPanel problem={match.problem} />
        </div>

        {/* Center Panel - Code Editor */}
        <div className="flex flex-1 flex-col">
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-700 bg-[#161b22] px-4 py-2">
            <div className="flex items-center gap-4">
              <LanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                disabled={isMatchEnded}
              />
              <span className="text-xs text-gray-500">Your Code</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Run Button - gray, tests visible cases only */}
              <button
                onClick={runCode}
                disabled={isRunning || isSubmitting || isMatchEnded}
                className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run
                  </>
                )}
              </button>

              {/* Submit Button - green, tests ALL cases, can end match */}
              <button
                onClick={submitCode}
                disabled={isSubmitting || isRunning || isMatchEnded}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <CodeEditor
              value={myCode}
              onChange={updateMyCode}
              language={selectedLanguage}
              readOnly={isMatchEnded}
            />
          </div>

          {/* Test Results */}
          <div className="h-48 border-t border-gray-700">
            <TestResults result={lastResult} isSubmitting={isSubmitting} />
          </div>
        </div>

        {/* Right Panel - Opponent's Code (Blurred) */}
        <div className="w-[350px] flex-shrink-0 border-l border-gray-700">
          <div className="border-b border-gray-700 bg-[#161b22] px-4 py-2">
            <span className="text-xs text-gray-500">
              {opponent?.username}&apos;s Code
            </span>
          </div>
          <div className="h-[calc(100%-40px)]">
            <CodeEditor
              value={opponentCode || '// Waiting for opponent...'}
              onChange={() => {}}
              language={selectedLanguage}
              readOnly
              blur={!isMatchEnded}
            />
          </div>
        </div>
      </div>

      {/* Forfeit Confirmation Toast */}
      {confirmForfeit && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg">
          Click forfeit again to confirm
        </div>
      )}

      {/* Chat Toggle Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageCircle className="h-5 w-5" />
        {matchMessages.length > 0 && !showChat && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
            {matchMessages.length > 9 ? '9+' : matchMessages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-20 right-4 z-30 w-80">
          <ChatBox
            messages={matchMessages}
            onSendMessage={sendToMatch}
            title="Match Chat"
            placeholder="Message your opponent..."
            className="shadow-2xl"
          />
        </div>
      )}

      {/* Match End Modal */}
      {showEndModal && (
        <MatchEndModal
          isWinner={isWinner}
          winnerName={winnerName}
          reason={endReason || 'UNKNOWN'}
          onClose={() => setShowEndModal(false)}
        />
      )}
    </div>
  );
}
