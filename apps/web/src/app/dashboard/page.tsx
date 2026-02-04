'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Swords, Trophy, Play, LogOut, Loader2, Users, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMatch } from '@/hooks/useMatch';
import { useChat } from '@/hooks/useChat';
import { useSpectator } from '@/hooks/useSpectator';
import { getSocket, joinLobby, leaveLobby } from '@/lib/socket';
import { ChatBox } from '@/components/chat';
import { MatchWithDetails } from '@codeduel/shared';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated, logout, checkAuth } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);

  // Initialize hooks
  useMatch({ autoJoin: false });
  const { lobbyMessages, sendToLobby } = useChat();
  const { activeMatches, fetchActiveMatches, spectateMatch, isLoading: spectatorLoading } = useSpectator();

  // Fetch active matches on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchActiveMatches();
    }
  }, [isAuthenticated, fetchActiveMatches]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-queue if URL has queue=true
  useEffect(() => {
    if (searchParams.get('queue') === 'true' && !isSearching && isAuthenticated) {
      joinLobby();
      setIsSearching(true);
      // Remove the query param
      router.replace('/dashboard');
    }
  }, [searchParams, isSearching, isAuthenticated, router]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLobbyJoined = (data: { position: number; estimatedWait: number }) => {
      setQueuePosition(data.position);
      setEstimatedWait(data.estimatedWait);
    };

    const handleLobbyLeft = () => {
      setIsSearching(false);
      setQueuePosition(null);
      setEstimatedWait(null);
    };

    const handleMatchFound = (match: MatchWithDetails) => {
      setIsSearching(false);
      setQueuePosition(null);
      setEstimatedWait(null);
      // Navigation is handled by useMatch hook
    };

    socket.on('lobby_joined', handleLobbyJoined);
    socket.on('lobby_left', handleLobbyLeft);
    socket.on('match_found', handleMatchFound);

    return () => {
      socket.off('lobby_joined', handleLobbyJoined);
      socket.off('lobby_left', handleLobbyLeft);
      socket.off('match_found', handleMatchFound);
    };
  }, []);

  const handleFindMatch = () => {
    if (isSearching) {
      leaveLobby();
      setIsSearching(false);
    } else {
      joinLobby();
      setIsSearching(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">CodeDuel</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">{user.eloRating}</span>
            </div>
            <span className="text-muted">|</span>
            <span className="font-medium">{user.username}</span>
            <button onClick={handleLogout} className="btn-ghost p-2">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Actions */}
          <div className="lg:col-span-2">
            <div className="text-center mb-8">
              <h1 className="mb-2 text-3xl font-bold">
                Welcome back, {user.username}!
              </h1>
              <p className="mb-8 text-muted">Ready to test your coding skills?</p>

              {/* Find Match Button */}
              <button
                onClick={handleFindMatch}
                className={`mb-6 inline-flex items-center gap-3 rounded-xl px-12 py-6 text-xl font-semibold transition-all ${
                  isSearching
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Cancel Search
                  </>
                ) : (
                  <>
                    <Play className="h-6 w-6" />
                    Find Match
                  </>
                )}
              </button>

              {isSearching && (
                <div className="mb-6 rounded-lg border border-primary-500/30 bg-primary-500/10 px-6 py-4">
                  <div className="flex items-center justify-center gap-3 text-primary-400">
                    <div className="relative">
                      <div className="h-3 w-3 rounded-full bg-primary-500" />
                      <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-primary-500" />
                    </div>
                    <span className="font-medium">Searching for opponent...</span>
                  </div>
                  {queuePosition !== null && (
                    <div className="mt-2 flex items-center justify-center gap-4 text-sm text-muted">
                      <span>
                        <Users className="mr-1 inline h-4 w-4" />
                        Position: {queuePosition}
                      </span>
                      {estimatedWait !== null && (
                        <span>Est. wait: ~{estimatedWait}s</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="card">
                <h3 className="mb-1 text-sm text-muted">Current Rating</h3>
                <p className="text-2xl font-bold text-yellow-500">{user.eloRating}</p>
              </div>
              <div className="card">
                <h3 className="mb-1 text-sm text-muted">Matches Played</h3>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="card">
                <h3 className="mb-1 text-sm text-muted">Win Rate</h3>
                <p className="text-2xl font-bold">--%</p>
              </div>
            </div>

            {/* Active Matches - Spectate */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-400" />
                  Live Matches
                </h2>
                <button
                  onClick={fetchActiveMatches}
                  disabled={spectatorLoading}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${spectatorLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {activeMatches.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active matches to spectate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#161b22] p-4 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{match.player1.username}</span>
                          <span className="text-xs text-gray-500">({match.player1.eloRating})</span>
                        </div>
                        <span className="text-gray-500">vs</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{match.player2.username}</span>
                          <span className="text-xs text-gray-500">({match.player2.eloRating})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Eye className="h-4 w-4" />
                          <span>{match.spectatorCount}</span>
                        </div>
                        <button
                          onClick={() => spectateMatch(match.id)}
                          className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-600/30 transition-colors"
                        >
                          Watch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Lobby Chat */}
          <div className="lg:col-span-1">
            <ChatBox
              messages={lobbyMessages}
              onSendMessage={sendToLobby}
              title="Global Chat"
              placeholder="Say hi to other players..."
              className="h-[500px]"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
