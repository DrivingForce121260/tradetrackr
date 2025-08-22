import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageCircle, Send, Users, Search, Phone, Video, MoreVertical, Paperclip, Smile, X, Minimize2, Maximize2, Trash2, Image as ImageIcon, FileText, Download } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface MessagingProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}

const Messaging: React.FC<MessagingProps> = ({ isMinimized, onToggleMinimize, onClose }) => {
  const { user } = useAuth();
  const { 
    chats, 
    messages, 
    selectedChat,
    sendMessage, 
    markChatAsRead, 
    deleteMessage,
    selectChat,
    unreadCount,
    uploadFile,
    trackEmojiUsage
  } = useMessaging();
  
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Position and size state for draggable/resizable messaging box
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Debug logging für Chats
  useEffect(() => {




    
    // Detaillierte Chat-Analyse
    chats.forEach((chat, index) => {
      console.log(`ðŸ” [Messaging] Chat ${index}:`, {
        id: chat.id,
        name: chat.name,
        type: chat.type,
        participants: chat.participants,
        unreadCount: chat.unreadCount
      });
    });

    // Bereinige veraltete Chats aus dem localStorage
    if (chats.length > 0) {
      const validChats = chats.filter(chat => {
        if (!chat || !chat.id || chat.id.length < 5) return false;
        if (!chat.name || chat.name.trim() === '') return false;
        if (chat.id.match(/^[A-Za-z0-9]{8,}$/) && chat.name.includes('Chat mit')) return false;
        if (chat.id.startsWith('info_') || chat.id.startsWith('debug_')) return false;
        return true;
      });

      if (validChats.length !== chats.length) {
        console.log('ðŸ§¹ [Messaging] Cleaning up invalid chats:', {
          total: chats.length,
          valid: validChats.length,
          removed: chats.length - validChats.length
        });
        
        // Hier kö¶nnten wir die ungültigen Chats aus dem localStorage entfernen
        // Das müsste im MessagingContext implementiert werden
      }
    }
  }, [chats, user?.concernID, selectedChat, searchTerm]);

  // Filtere nur gültige Chats (keine veralteten oder ungültigen Eintrö¤ge)
  const validChats = chats.filter(chat => {
    // Entferne Chats mit ungültigen IDs (z.B. "WCnVqHuA...")
    if (!chat || !chat.id || chat.id.length < 5) return false;
    
    // Entferne Chats mit ungültigen Namen
    if (!chat.name || chat.name.trim() === '') return false;
    
    // Entferne Chats, die wie veraltete IDs aussehen
    if (chat.id.match(/^[A-Za-z0-9]{8,}$/) && chat.name.includes('Chat mit')) return false;
    
    // Entferne Debug- oder Info-Chats, die keine echten Benutzer sind
    if (chat.id.startsWith('info_') || chat.id.startsWith('debug_')) return false;
    
    return true;
  });

  const filteredChats = validChats
    .filter(chat =>
      chat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
  
  const handleSendMessage = async () => {
    if (!messageText.trim() && selectedFiles.length === 0) return;
    if (!selectedChat) return;

    try {
      setIsUploading(true);
      
      // Dateien hochladen und Nachrichten senden
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const fileUpload = await uploadFile(
              file, 
              selectedChat, 
              (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  [file.name]: progress
                }));
              }
            );
            
            if (fileUpload.status === 'success' && fileUpload.downloadUrl) {
              // Nachricht mit Datei senden
              const media = {
                type: file.type.startsWith('image/') ? 'image' : 'document',
                url: fileUpload.downloadUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                thumbnailUrl: fileUpload.thumbnailUrl
              };
              
              await sendMessage(selectedChat, messageText || `ðŸ“Ž ${file.name}`, media);

            } else {

            }
          } catch (error) {

          }
        }
      } else if (messageText.trim()) {
        // Nur Text-Nachricht senden
        await sendMessage(selectedChat, messageText);
      }

      // State zurücksetzen
      setMessageText('');
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {

    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Datei-Validierung
      if (file.size > 50 * 1024 * 1024) { // 50MB Limit
        alert(`Datei ${file.name} ist zu groöŸ. Maximale Grö¶öŸe: 50MB`);
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`Dateityp ${file.type} wird nicht unterstützt`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleEmojiSelect = async (emoji: string) => {
    setMessageText(prev => prev + emoji);
    
    // Emoji-Nutzung tracken
    try {
      await trackEmojiUsage(emoji);
    } catch (error) {

    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`Datei ${file.name} ist zu groöŸ. Maximale Grö¶öŸe: 50MB`);
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`Dateityp ${file.type} wird nicht unterstützt`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleChatSelect = (chatId: string) => {
    try {

      selectChat(chatId);
      markChatAsRead(chatId);
    } catch (error) {

    }
  };

  const formatTime = (date: Date | string | number) => {
    try {
      let dateObj: Date;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'Invalid date';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return dateObj.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {

      return 'Invalid time';
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChat]);

  // Blink effect for urgent controlling messages
  useEffect(() => {
    const urgentCount = chats.reduce((total, chat) => {
      if (chat.controllingMembers && chat.controllingMembers.length > 0) {
        return total + 1;
      }
      return total;
    }, 0);
    
    if (urgentCount > 0) {
      const blinkInterval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 1000);
      
      return () => clearInterval(blinkInterval);
    } else {
      setIsBlinking(false);
    }
  }, [messages, chats]);

  // Mouse event handlers for dragging and resizing
  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    } else {
      setIsResizing(true);
      setResizeStart({ 
        x: e.clientX, 
        y: e.clientY, 
        width: size.width, 
        height: size.height 
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        // Neue Grö¶öŸe berechnen
        const newWidth = Math.max(400, resizeStart.width + deltaX);
        const newHeight = Math.max(500, resizeStart.height + deltaY);
        
        // Maximale Grö¶öŸe begrenzen (80% des Bildschirms)
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.8;
        
        setSize({
          width: Math.min(newWidth, maxWidth),
          height: Math.min(newHeight, maxHeight)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart]);

  if (isMinimized) {
    return (
      <Card 
        className="h-12 cursor-pointer shadow-xl border-2 border-gray-200 z-50"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '256px',
          zIndex: 9999
        }}
        onClick={onToggleMinimize}
      >
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-[#058bc0]" />
            <span className="font-medium">Nachrichten</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-xl border-2 border-gray-200 z-50"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999
      }}
    >
      <CardHeader 
        className="p-3 cursor-move border-b"
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-[#058bc0]" />
            <span className="font-medium">Nachrichten</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex relative overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
        {/* Chat List */}
        <div className={`${selectedChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-64 border-r flex-shrink-0 h-full`}>
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100% - 60px)' }}>
            {filteredChats.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-400 mb-2">
                  <MessageCircle className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {validChats.length === 0 
                    ? 'Keine gültigen Chat-Partner verfügbar'
                    : 'Keine Chats entsprechen Ihrer Suche.'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {validChats.length === 0 
                    ? 'Es wurden noch keine gültigen Benutzer in Ihrer Concern gefunden.'
                    : 'Versuchen Sie einen anderen Suchbegriff.'
                  }
                </p>
                {chats.length > validChats.length && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    ðŸ§¹ {chats.length - validChats.length} veraltete Chat-Eintrö¤ge wurden ausgeblendet
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Debug info */}
                <div className="p-2 text-xs text-gray-500 bg-gray-100 rounded mb-2">
                  Debug: {filteredChats.length} chats found, {chats.length} total chats
                </div>
                {filteredChats.map((chat) => {
                  if (!chat || !chat.id) {

                    return null;
                  }
                  
                  // Validiere und korrigiere Chat-Namen
                  let chatName = chat.name;
                  if (!chatName || chatName.trim() === '') {
                    if (chat.id.startsWith('direct_')) {
                      chatName = 'Direkter Chat';
                    } else if (chat.type === 'group') {
                      chatName = 'Gruppenchat';
                    } else if (chat.type === 'controlling') {
                      chatName = 'Controlling Chat';
                    } else {
                      chatName = 'Unbenannter Chat';
                    }
                  }
                  
                  // Spezielle Behandlung für Info-Chats
                  if (chat.id === 'info_no_users' || chat.id === 'info_permission_error') {
                    return (
                      <div
                        key={chat.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          chat.id === 'info_permission_error' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            chat.id === 'info_permission_error' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}>
                            {chat.id === 'info_permission_error' ? 'âš ï¸' : 'â„¹ï¸'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            chat.id === 'info_permission_error' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {chatName}
                          </p>
                          <p className={`text-xs ${
                            chat.id === 'info_permission_error' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {chat.id === 'info_permission_error' 
                              ? 'Berechtigungsfehler beim Laden der Benutzer'
                              : 'Warten Sie auf weitere Benutzer in Ihrer Concern'
                            }
                          </p>
                        </div>
                      </div>
                    );
                  }
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={`flex items-center space-x-3 p-3 cursor-pointer rounded-lg transition-colors ${
                      selectedChat === chat.id
                        ? 'bg-blue-100 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {chat.type === 'group' ? (
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {chat.name.charAt(0)}
                        </div>
                      ) : chat.type === 'controlling' ? (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          chat.controllingMembers && chat.controllingMembers.length > 0 && isBlinking
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-yellow-500'
                        }`}>
                          ðŸŽ¯
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold">
                          ðŸ‘¤
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {chatName}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-xs text-gray-500 truncate">
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        {selectedChat && (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectChat(null)}
                    className="md:hidden"
                  >
                    â†
                  </Button>
                  <span className="font-medium">
                    {chats.find(c => c.id === selectedChat)?.name || 'Chat'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              {selectedChat === 'info_no_users' ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <div className="text-gray-400 mb-4">
                      <MessageCircle className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Keine anderen Benutzer verfügbar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Es wurden noch keine anderen Benutzer in Ihrer Concern gefunden.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Was kö¶nnen Sie tun?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>â€¢ Warten Sie, bis weitere Benutzer zur Concern hinzugefügt werden</li>
                        <li>â€¢ Kontaktieren Sie Ihren Administrator</li>
                        <li>â€¢ öberprüfen Sie, ob weitere Benutzer registriert sind</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages[selectedChat]?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        message.senderId === user?.uid
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {/* Text-Nachricht */}
                      {message.text && (
                        <div className="text-sm">{message.text}</div>
                      )}
                      
                      {/* Datei-Anzeige */}
                      {message.media && (
                        <div className="mt-2">
                          {message.media.type === 'image' ? (
                            <div className="space-y-2">
                              {message.media.thumbnailUrl && (
                                <img 
                                  src={message.media.thumbnailUrl} 
                                  alt={message.media.fileName || 'Bild'}
                                  className="max-w-full h-auto rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(message.media.url, '_blank')}
                                />
                              )}
                              <div className="text-xs opacity-80">
                                ðŸ“· {message.media.fileName}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {message.media.fileName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(message.media.fileSize / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(message.media.url, '_blank')}
                                className="h-8 w-8 p-0 hover:bg-gray-200"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={`text-xs mt-1 ${
                        message.senderId === user?.uid ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
                )}
            </ScrollArea>

            {/* Message Input */}
            {selectedChat !== 'info_no_users' && (
              <div 
                className="p-3 border-t relative"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
              {/* Drag & Drop Overlay */}
              <div 
                className={`absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center transition-opacity duration-200 ${
                  isFileDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center text-blue-600">
                  <Paperclip className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Dateien hier ablegen</p>
                  <p className="text-sm">Unterstützte Formate: Bilder, PDF, Dokumente</p>
                </div>
              </div>


              {/* File Upload Area */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">Ausgewö¤hlte Dateien:</div>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center space-x-2">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        
                        {/* Upload Progress */}
                        {uploadProgress[file.name] !== undefined && (
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${uploadProgress[file.name]}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {uploadProgress[file.name]}%
                            </span>
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={openFileSelector}
                  disabled={isUploading}
                  className="hover:bg-blue-50 hover:text-blue-600"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                
                <Input
                  placeholder="Nachricht eingeben..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                  disabled={isUploading}
                />
                
                <Button 
                  onClick={handleSendMessage} 
                  disabled={(!messageText.trim() && selectedFiles.length === 0) || isUploading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              />
            </div>
            )}
          </div>
        )}

      </CardContent>
      
      {/* Resize Handle - Bottom Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-gray-300 hover:bg-gray-400 rounded-tl-md z-10"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      >
        <div className="w-full h-full flex items-end justify-end p-1">
          <div className="w-3 h-3 border-r-2 border-b-2 border-gray-600 rounded-br-sm"></div>
        </div>
      </div>
      
      {/* Resize Handle - Bottom Edge */}
      <div
        className="absolute bottom-0 left-0 right-6 h-2 cursor-s-resize z-10"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      />
      
      {/* Resize Handle - Right Edge */}
      <div
        className="absolute top-0 right-0 bottom-6 w-2 cursor-e-resize z-10"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      />
    </Card>
  );
};

export default Messaging;
