'use client';

import { useEffect, useState, useRef } from 'react';
import { Code, FileText, Clock, User } from 'lucide-react';

interface OpponentActivityProps {
  username: string;
  code: string;
  isMatchEnded?: boolean;
}

export function OpponentActivity({ username, code, isMatchEnded }: OpponentActivityProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<Date | null>(null);
  const [timeSinceActivity, setTimeSinceActivity] = useState<string>('');
  const previousCodeRef = useRef(code);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate code statistics
  const lines = code ? code.split('\n').length : 0;
  const characters = code ? code.length : 0;

  // Detect typing activity
  useEffect(() => {
    if (code !== previousCodeRef.current) {
      previousCodeRef.current = code;
      setIsTyping(true);
      setLastActivityTime(new Date());

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator after 1.5 seconds of no changes
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1500);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [code]);

  // Update time since last activity
  useEffect(() => {
    const updateTimeSince = () => {
      if (!lastActivityTime) {
        setTimeSinceActivity('No activity yet');
        return;
      }

      const seconds = Math.floor((Date.now() - lastActivityTime.getTime()) / 1000);

      if (seconds < 5) {
        setTimeSinceActivity('Just now');
      } else if (seconds < 60) {
        setTimeSinceActivity(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceActivity(`${minutes}m ago`);
      } else {
        setTimeSinceActivity('Over an hour ago');
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    return () => clearInterval(interval);
  }, [lastActivityTime]);

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="border-b border-gray-700 bg-[#161b22] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{username}</span>
              {isTyping && !isMatchEnded && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  typing
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">Opponent</span>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="flex-1 p-4">
        <div className="space-y-4">
          {/* Lines of Code */}
          <div className="rounded-lg bg-[#161b22] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{lines}</div>
                <div className="text-xs text-gray-500">Lines of code</div>
              </div>
            </div>
          </div>

          {/* Character Count */}
          <div className="rounded-lg bg-[#161b22] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Code className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{characters.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Characters</div>
              </div>
            </div>
          </div>

          {/* Last Activity */}
          <div className="rounded-lg bg-[#161b22] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-lg font-medium text-white">{timeSinceActivity}</div>
                <div className="text-xs text-gray-500">Last edit</div>
              </div>
            </div>
          </div>

          {/* Activity Indicator */}
          <div className="rounded-lg border border-gray-700 bg-[#161b22] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isTyping && !isMatchEnded
                      ? 'bg-green-500'
                      : lastActivityTime
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                />
                <span className="text-sm text-gray-300">
                  {isMatchEnded
                    ? 'Match ended'
                    : isTyping
                    ? 'Actively coding'
                    : lastActivityTime
                    ? 'Idle'
                    : 'Waiting...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Code Preview Hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Opponent&apos;s code is hidden until the match ends
          </p>
        </div>
      </div>
    </div>
  );
}
