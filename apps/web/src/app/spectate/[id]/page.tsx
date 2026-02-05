'use client';

import { useParams, useRouter } from 'next/navigation';
import { Eye, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSpectator } from '@/hooks/useSpectator';
import { useChat } from '@/hooks/useChat';
import { CodeEditor, ProblemPanel } from '@/components/match';
import { ChatBox } from '@/components/chat';

export default function SpectatePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    match,
    player1Code,
    player2Code,
    spectatorCount,
    isLoading,
    error,
  } = useSpectator({ matchId });

  const { matchMessages, sendToMatch } = useChat({ matchId });

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Authentication Required
          </h1>
          <p className="text-gray-400">Please log in to spectate matches.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <Eye className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Connection Failed
          </h1>
          <p className="mb-6 max-w-md text-gray-400">
            {error}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Match Not Found
          </h1>
          <p className="mb-4 text-gray-400">
            This match may have ended or does not exist.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 bg-[#0d1117] px-4 py-2">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Spectating indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-purple-400">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Spectating</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            <span>{spectatorCount}</span>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
              {match.player1.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">
                {match.player1.username}
              </div>
              <div className="text-xs text-gray-500">
                ELO: {match.player1.eloRating}
              </div>
            </div>
          </div>

          <span className="text-gray-500">vs</span>

          <div className="flex items-center gap-2">
            <div className="text-left">
              <div className="text-sm font-semibold text-white">
                {match.player2.username}
              </div>
              <div className="text-xs text-gray-500">
                ELO: {match.player2.eloRating}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white">
              {match.player2.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-[350px] flex-shrink-0 border-r border-gray-700">
          <ProblemPanel problem={match.problem} />
        </div>

        {/* Center - Both Players' Code */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1">
            {/* Player 1 Code */}
            <div className="flex-1 flex flex-col border-r border-gray-700">
              <div className="border-b border-gray-700 bg-[#161b22] px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-gray-200">
                    {match.player1.username}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <CodeEditor
                  value={player1Code || '// Waiting for code...'}
                  onChange={() => {}}
                  language="javascript"
                  readOnly
                />
              </div>
            </div>

            {/* Player 2 Code */}
            <div className="flex-1 flex flex-col">
              <div className="border-b border-gray-700 bg-[#161b22] px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-200">
                    {match.player2.username}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <CodeEditor
                  value={player2Code || '// Waiting for code...'}
                  onChange={() => {}}
                  language="javascript"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Spectator Chat */}
        <div className="w-[300px] flex-shrink-0 border-l border-gray-700">
          <ChatBox
            messages={matchMessages}
            onSendMessage={sendToMatch}
            title="Spectator Chat"
            placeholder="Say something..."
            className="h-full rounded-none border-0"
          />
        </div>
      </div>
    </div>
  );
}
