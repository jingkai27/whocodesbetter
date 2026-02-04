'use client';

import { UserPublic } from '@codeduel/shared';
import { MatchTimer } from './MatchTimer';
import { Flag, Swords } from 'lucide-react';

interface MatchHeaderProps {
  player1: UserPublic;
  player2: UserPublic;
  currentUserId: string;
  endTime: Date | null;
  onForfeit: () => void;
  onTimeUp?: () => void;
  isMatchEnded: boolean;
}

export function MatchHeader({
  player1,
  player2,
  currentUserId,
  endTime,
  onForfeit,
  onTimeUp,
  isMatchEnded,
}: MatchHeaderProps) {
  const isPlayer1 = currentUserId === player1.id;
  const currentPlayer = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;

  return (
    <header className="flex items-center justify-between border-b border-gray-700 bg-[#0d1117] px-4 py-2">
      {/* Left side - Current player */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {currentPlayer.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {currentPlayer.username}
              <span className="ml-1 text-xs text-gray-400">(You)</span>
            </div>
            <div className="text-xs text-gray-500">
              ELO: {currentPlayer.eloRating}
            </div>
          </div>
        </div>
      </div>

      {/* Center - VS and Timer */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Swords className="h-5 w-5 text-yellow-500" />
          <MatchTimer endTime={endTime} onTimeUp={onTimeUp} />
        </div>
      </div>

      {/* Right side - Opponent */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-semibold text-white">
              {opponent.username}
            </div>
            <div className="text-xs text-gray-500">
              ELO: {opponent.eloRating}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white">
            {opponent.username.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Forfeit button */}
        {!isMatchEnded && (
          <button
            onClick={onForfeit}
            className="ml-4 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Flag className="h-4 w-4" />
            Forfeit
          </button>
        )}
      </div>
    </header>
  );
}
