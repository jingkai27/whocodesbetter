'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { ChatMessage } from '@codeduel/shared';
import { useAuth } from '@/hooks/useAuth';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  title?: string;
  placeholder?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ChatBox({
  messages,
  onSendMessage,
  title = 'Chat',
  placeholder = 'Type a message...',
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}: ChatBoxProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [messages, isCollapsed, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (collapsible && isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={`flex items-center gap-2 rounded-lg bg-[#161b22] border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-[#1c2128] transition-colors ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
        <span>{title}</span>
        {messages.length > 0 && (
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-lg border border-gray-700 bg-[#0d1117] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">{title}</span>
        </div>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '300px', minHeight: '150px' }}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No messages yet
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.type === 'system'
                  ? 'text-center text-xs text-gray-500 italic'
                  : ''
              }`}
            >
              {message.type === 'system' ? (
                <span>{message.content}</span>
              ) : (
                <div className="group">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-medium ${
                        message.userId === user?.id
                          ? 'text-blue-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {message.username}
                    </span>
                    <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 break-words">
                    {message.content}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            maxLength={500}
            className="flex-1 rounded-lg border border-gray-600 bg-[#161b22] px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
