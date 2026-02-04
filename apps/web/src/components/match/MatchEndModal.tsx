'use client';

import { useRouter } from 'next/navigation';
import { Trophy, Frown, Clock, Flag } from 'lucide-react';

interface MatchEndModalProps {
  isWinner: boolean;
  winnerName: string;
  reason: string;
  onClose: () => void;
}

const REASON_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  SOLVED: { label: 'Problem Solved', icon: <Trophy className="h-6 w-6" /> },
  FORFEIT: { label: 'Opponent Forfeited', icon: <Flag className="h-6 w-6" /> },
  TIMEOUT: { label: 'Time Expired', icon: <Clock className="h-6 w-6" /> },
};

export function MatchEndModal({
  isWinner,
  winnerName,
  reason,
  onClose,
}: MatchEndModalProps) {
  const router = useRouter();

  const reasonInfo = REASON_LABELS[reason] || {
    label: reason,
    icon: null,
  };

  const handleBackToDashboard = () => {
    onClose();
    router.push('/dashboard');
  };

  const handlePlayAgain = () => {
    onClose();
    router.push('/dashboard?queue=true');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#161b22] p-8 shadow-2xl">
        {/* Result Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              isWinner
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
                : 'bg-gradient-to-br from-gray-500 to-gray-700 text-gray-300'
            }`}
          >
            {isWinner ? (
              <Trophy className="h-10 w-10" />
            ) : (
              <Frown className="h-10 w-10" />
            )}
          </div>
        </div>

        {/* Result Text */}
        <div className="mb-6 text-center">
          <h2
            className={`mb-2 text-3xl font-bold ${
              isWinner ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            {isWinner ? 'Victory!' : 'Defeat'}
          </h2>
          <p className="text-gray-400">
            {isWinner ? 'Congratulations!' : `${winnerName} won the match`}
          </p>
        </div>

        {/* Reason */}
        <div className="mb-8 flex items-center justify-center gap-2 rounded-lg bg-[#0d1117] px-4 py-3">
          <span className="text-gray-500">{reasonInfo.icon}</span>
          <span className="text-sm text-gray-400">{reasonInfo.label}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleBackToDashboard}
            className="flex-1 rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Dashboard
          </button>
          <button
            onClick={handlePlayAgain}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
