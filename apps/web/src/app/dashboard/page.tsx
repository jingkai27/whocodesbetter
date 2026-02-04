'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Swords, Trophy, Play, LogOut, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getSocket, joinLobby, leaveLobby } from '@/lib/socket';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, checkAuth } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLobbyJoined = (data: { position: number; estimatedWait: number }) => {
      setQueuePosition(data.position);
    };

    const handleLobbyLeft = () => {
      setIsSearching(false);
      setQueuePosition(null);
    };

    const handleMatchFound = () => {
      setIsSearching(false);
      setQueuePosition(null);
      // TODO: Navigate to match page
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
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-2 text-3xl font-bold">
            Welcome back, {user.username}!
          </h1>
          <p className="mb-8 text-muted">Ready to test your coding skills?</p>

          {/* Find Match Button */}
          <button
            onClick={handleFindMatch}
            className={`mb-8 inline-flex items-center gap-3 rounded-xl px-12 py-6 text-xl font-semibold transition-all ${
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

          {isSearching && queuePosition !== null && (
            <p className="mb-8 text-muted">
              <Users className="mr-2 inline h-4 w-4" />
              Queue position: {queuePosition}
            </p>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
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
        </div>
      </main>
    </div>
  );
}
