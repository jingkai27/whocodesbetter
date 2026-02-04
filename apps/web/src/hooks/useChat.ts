'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { getSocket, sendLobbyMessage, sendMatchMessage } from '@/lib/socket';
import { ChatMessage } from '@codeduel/shared';

interface UseChatOptions {
  matchId?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const { matchId } = options;
  const hasSetupListeners = useRef(false);

  const {
    lobbyMessages,
    matchMessages,
    addLobbyMessage,
    addMatchMessage,
    setMatchMessages,
  } = useChatStore();

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || hasSetupListeners.current) return;

    hasSetupListeners.current = true;

    const handleLobbyMessage = (message: ChatMessage) => {
      addLobbyMessage(message);
    };

    const handleMatchMessage = (message: ChatMessage) => {
      if (matchId) {
        addMatchMessage(matchId, message);
      }
    };

    const handleChatHistory = (messages: ChatMessage[]) => {
      if (matchId) {
        setMatchMessages(matchId, messages);
      }
    };

    socket.on('lobby_message', handleLobbyMessage);
    socket.on('match_message', handleMatchMessage);
    socket.on('chat_history', handleChatHistory);

    return () => {
      socket.off('lobby_message', handleLobbyMessage);
      socket.off('match_message', handleMatchMessage);
      socket.off('chat_history', handleChatHistory);
      hasSetupListeners.current = false;
    };
  }, [matchId, addLobbyMessage, addMatchMessage, setMatchMessages]);

  const sendToLobby = useCallback((content: string) => {
    sendLobbyMessage(content);
  }, []);

  const sendToMatch = useCallback(
    (content: string) => {
      if (matchId) {
        sendMatchMessage(matchId, content);
      }
    },
    [matchId]
  );

  const currentMatchMessages = matchId ? matchMessages[matchId] || [] : [];

  return {
    lobbyMessages,
    matchMessages: currentMatchMessages,
    sendToLobby,
    sendToMatch,
  };
}
