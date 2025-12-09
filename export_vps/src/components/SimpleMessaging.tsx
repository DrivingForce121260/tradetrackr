import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Users, X, Minimize2 } from 'lucide-react';

import { SimpleMessage, SimpleMessagingProps } from '@/types';

interface SimpleChat {
  id: string;
  name: string;
  messages: SimpleMessage[];
  unreadCount: number;
}

const SimpleMessaging: React.FC<SimpleMessagingProps> = ({ isButton = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState('1');
  const [messageText, setMessageText] = useState('');
  
  // Chats State - war vergessen!
  const [chats, setChats] = useState<SimpleChat[]>([
    {
      id: '1',
      name: 'Anna Schmidt',
      unreadCount: 2,
      messages: [
        {
          id: '1',
          text: 'Hallo! Wie läuft das Projekt?',
          sender: 'Anna Schmidt',
          timestamp: new Date(Date.now() - 300000),
          isOwn: false
        },
        {
          id: '2',
          text: 'Können wir heute noch kurz telefonieren?',
          sender: 'Anna Schmidt',
          timestamp: new Date(Date.now() - 180000),
          isOwn: false
        }
      ]
    },
    {
      id: '2',
      name: 'Max Mustermann',
      unreadCount: 0,
      messages: [
        {
          id: '3',
          text: 'Die Dokumentation ist fertig',
          sender: 'Du',
          timestamp: new Date(Date.now() - 120000),
          isOwn: true
        }
      ]
    },
    {
      id: '3',
      name: 'Team Chat',
      unreadCount: 1,
      messages: [
        {
          id: '4',
          text: 'Meeting morgen um 10:00 Uhr',
          sender: 'Sarah',
          timestamp: new Date(Date.now() - 60000),
          isOwn: false
        }
      ]
    }
  ]);
  
  // Position direkt unter dem Header für bessere Sichtbarkeit
  const [position, setPosition] = useState(() => {
    return {
      x: 20,  // Links mit Margin
      y: 80   // Direkt unter dem Header (etwa 60-70px Header + Margin)
    };
  });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Force re-render state
  const [forceRender, setForceRender] = useState(0);
  
  // Resize tooltip state
  const [showResizeTooltip, setShowResizeTooltip] = useState(false);
  const [tooltipFading, setTooltipFading] = useState(false);
  
     // Keine Position-Korrektur nötig - verwende feste Position unter Header
  
  // Einfacher Event Listener
  React.useEffect(() => {
    const handleMessagingToggle = (event: CustomEvent) => {
      setIsOpen(event.detail.isOpen);
      setIsMinimized(event.detail.isMinimized || false);
      setForceRender(prev => prev + 1); // Force re-render
    };

    window.addEventListener('messagingToggle', handleMessagingToggle as EventListener);
    return () => window.removeEventListener('messagingToggle', handleMessagingToggle as EventListener);
  }, [isButton]);

  const updateIsOpen = (value: boolean) => {
    const event = new CustomEvent('messagingToggle', {
      detail: { isOpen: value, isMinimized: false }
    });
    window.dispatchEvent(event);
  };

  const updateIsMinimized = (value: boolean) => {
    const event = new CustomEvent('messagingToggle', {
      detail: { isOpen: true, isMinimized: value }
    });
    window.dispatchEvent(event);
  };

  // Drag & Drop Funktionen
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y));
      setPosition({ x: newX, y: newY });
    }
    
    if (isResizing) {
      const newWidth = Math.max(300, e.clientX - position.x);
      const newHeight = Math.max(200, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, position, size]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Show resize tooltip when messaging window first opens
  React.useEffect(() => {
    if (isOpen && !isMinimized && !isButton) {
      // Check if this is the first time showing (using localStorage)
      // Temporarily always show tooltip for testing
      localStorage.removeItem('hasSeenResizeTooltip'); // Remove for testing
      const hasSeenTooltip = localStorage.getItem('hasSeenResizeTooltip');
      if (!hasSeenTooltip) {

        setShowResizeTooltip(true);
        localStorage.setItem('hasSeenResizeTooltip', 'true');
        
        // Hide after 3 seconds, then fade for 4 seconds
        const hideTimer = setTimeout(() => {

          setTooltipFading(true);
          const fadeTimer = setTimeout(() => {

            setShowResizeTooltip(false);
            setTooltipFading(false);
          }, 4000); // 4 seconds fade
          return () => clearTimeout(fadeTimer);
        }, 3000); // Show for 3 seconds
        
        return () => clearTimeout(hideTimer);
      } else {

      }
    }
  }, [isOpen, isMinimized, isButton]);



  const selectedChat = chats.find(c => c.id === selectedChatId);
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'Du',
      timestamp: new Date(),
      isOwn: true
    };

    // Füge die Nachricht zum aktuellen Chat hinzu
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === selectedChatId 
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      )
    );
    
    setMessageText('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // If this is just the button component, render only the button
  if (isButton) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateIsOpen(true)}
        className="relative hover:bg-[#058bc0]/10 hover:text-[#058bc0] transition-all duration-200"
      >
        <MessageCircle className="h-5 w-5" />
        {totalUnread > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
        <span className="hidden sm:inline ml-2">Nachrichten</span>
      </Button>
    );
  }

  // If messaging is not open, don't render anything (for the window component)
  if (!isOpen) {
    return null;
  }

  // Minimized state
  if (isMinimized) {
    return (
      <Card 
        className="h-12 cursor-pointer select-none bg-white" 
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '256px',
          zIndex: 9999,
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 15px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(229, 231, 235, 0.8)',
          borderRadius: '8px'
        }}
        onMouseDown={handleMouseDown}
        onClick={() => updateIsMinimized(false)}>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-[#058bc0]" />
            <span className="font-medium">Nachrichten</span>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); updateIsOpen(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Full messaging interface
  return (
    <Card 
      className="absolute z-[9999] flex flex-col select-none bg-white"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999,
        boxShadow: '0 35px 60px -12px rgba(0, 0, 0, 0.4), 0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(229, 231, 235, 0.8)',
        borderRadius: '12px'
      }}>
      <CardHeader 
        className="p-3 pb-2 cursor-move bg-gray-50 border-b"
        onMouseDown={handleMouseDown}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-[#058bc0]" />
            <span>Nachrichten</span>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => updateIsMinimized(true)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => updateIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex">
        {/* Chat List */}
        <div className="flex flex-col w-40 border-r">
          <ScrollArea className="flex-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedChatId === chat.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                  {chat.unreadCount > 0 && (
                    <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-medium truncate">{chat.name}</div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Messages */}
        {selectedChat && (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b">
              <div className="font-medium text-sm">{selectedChat.name}</div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              {selectedChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-3 flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-2 ${
                      message.isOwn
                        ? 'bg-[#058bc0] text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {!message.isOwn && (
                      <div className="text-xs font-medium mb-1">{message.sender}</div>
                    )}
                    <div className="text-sm">{message.text}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Nachricht eingeben..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                  className="flex-1 h-8"
                />
                <Button 
                  size="sm" 
                  onClick={sendMessage}
                  className="bg-[#058bc0] hover:bg-[#047aa0]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-gray-200 hover:bg-gray-400 transition-colors border-l border-t border-gray-300"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, #666 30%, #666 35%, transparent 35%, transparent 65%, #666 65%, #666 70%, transparent 70%)'
        }}
                 title="Größe ändern"
      />

      {/* Resize Tooltip */}
      {showResizeTooltip && (
        <div 
          className={`absolute bottom-10 right-1 bg-black text-white px-3 py-2 rounded-lg text-sm pointer-events-none ${
            tooltipFading ? 'opacity-0' : 'opacity-90'
          }`}
          style={{
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'opacity 4s ease-out'
          }}
        >
          <div className="flex items-center space-x-2">
            <span>Resize</span>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path 
                d="M10 2L14 6L10 10M14 6H2M6 14L2 10L6 6M2 10H14" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* Arrow pointing to resize handle - positioned very close to the right edge */}
          <div 
            className="absolute"
            style={{
              top: '100%',
              right: '6px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid black'
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default SimpleMessaging;
