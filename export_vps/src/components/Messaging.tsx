import React, { useState, useRef, useEffect } from 'react';
import LazyImage from './ui/LazyImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageCircle, Send, Users, Search, Phone, Video, MoreVertical, Paperclip, Smile, X, Minimize2, Maximize2, Trash2, Image as ImageIcon, FileText, Download, RefreshCw, Bell, CheckCircle } from 'lucide-react';
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
    trackEmojiUsage,
    refreshChats
  } = useMessaging();
  
  const [messageText, setMessageText] = useState('');
  const [loadedDraftForChat, setLoadedDraftForChat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Position and size state for draggable/resizable messaging box
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Debug logging f�r Chats
  useEffect(() => {




    
    // Detaillierte Chat-Analyse
    chats.forEach((chat, index) => {
      console.log(`🔍 [Messaging] Chat ${index}:`, {
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
    // Entferne Chats mit ungültigen IDs (z.B. "WCnVqHuA...")
    if (!chat || !chat.id || chat.id.length < 5) {
      console.log('🚫 Filtered chat (invalid ID):', chat);
      return false;
    }
    
    // Entferne Chats mit ungültigen Namen
    if (!chat.name || chat.name.trim() === '') {
      console.log('🚫 Filtered chat (no name):', chat);
      return false;
    }
    
    // COMMENT OUT: This filter might be too aggressive
    // if (chat.id.match(/^[A-Za-z0-9]{8,}$/) && chat.name.includes('Chat mit')) {
    //   console.log('🚫 Filtered chat (old format):', chat);
    //   return false;
    // }
    
    // Entferne Debug- oder Info-Chats, die keine echten Benutzer sind
    if (chat.id.startsWith('info_') || chat.id.startsWith('debug_')) {
      console.log('🚫 Filtered chat (info/debug):', chat);
      return false;
    }
    
    console.log('✅ Valid chat:', chat.name, 'ID:', chat.id, 'photoURL:', chat.photoURL);
    return true;
  });

      if (validChats.length !== chats.length) {
        console.log('🧹 [Messaging] Cleaning up invalid chats:', {
          total: chats.length,
          valid: validChats.length,
          removed: chats.length - validChats.length
        });
        
        // Hier k�nnten wir die ung�ltigen Chats aus dem localStorage entfernen
        // Das m�sste im MessagingContext implementiert werden
      }
    }
  }, [chats, user?.concernID, selectedChat, searchTerm]);

  // Filtere nur g�ltige Chats (keine veralteten oder ung�ltigen Eintr�ge)
  const validChats = chats.filter(chat => {
    // Entferne Chats mit ung�ltigen IDs (z.B. "WCnVqHuA...")
    if (!chat || !chat.id || chat.id.length < 5) return false;
    
    // Entferne Chats mit ung�ltigen Namen
    if (!chat.name || chat.name.trim() === '') return false;
    
    // DISABLED: Too aggressive - allow all chat formats for now
    // if (chat.id.match(/^[A-Za-z0-9]{8,}$/) && chat.name.includes('Chat mit')) return false;
    
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

    // Slash-Commands (clientseitig)
    if (messageText.trim().startsWith('/')) {
      const parts = messageText.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();

      switch (cmd) {
        case '/help':
          alert('Befehle: /help, /clear, /me <text>');
          break;
        case '/clear':
          setMessageText('');
          try { localStorage.removeItem(`draft:${selectedChat}`); } catch {}
          break;
        case '/me':
          if (parts.length > 1) {
            await sendMessage(selectedChat, `*${parts.slice(1).join(' ')}*`);
            setMessageText('');
          }
          break;
        default:
          alert(`Unbekannter Befehl: ${cmd}`);
      }
      return;
    }

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
              
              await sendMessage(selectedChat, messageText || `📎 ${file.name}`, media);

            } else {

            }
          } catch (error) {

          }
        }
      } else if (messageText.trim()) {
        // Nur Text-Nachricht senden
        await sendMessage(selectedChat, messageText);
      }

      // State zur�cksetzen
      setMessageText('');
      try { localStorage.removeItem(`draft:${selectedChat}`); } catch {}
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {

    } finally {
      setIsUploading(false);
    }
  };

  // Drafts: beim Chatwechsel laden
  useEffect(() => {
    if (!selectedChat) return;
    if (loadedDraftForChat === selectedChat) return;
    try {
      const key = `draft:${selectedChat}`;
      const draft = localStorage.getItem(key);
      if (draft != null) {
        setMessageText(draft);
      } else {
        setMessageText('');
      }
      setLoadedDraftForChat(selectedChat);
    } catch {}
  }, [selectedChat, loadedDraftForChat]);

  // Drafts: beim Tippen speichern (debounced leicht �ber effect)
  useEffect(() => {
    if (!selectedChat) return;
    const key = `draft:${selectedChat}`;
    const t = setTimeout(() => {
      try { localStorage.setItem(key, messageText); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [selectedChat, messageText]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Datei-Validierung
      if (file.size > 50 * 1024 * 1024) { // 50MB Limit
        alert(`Datei ${file.name} ist zu gro�. Maximale Gr��e: 50MB`);
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`Dateityp ${file.type} wird nicht unterst�tzt`);
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
        alert(`Datei ${file.name} ist zu gro�. Maximale Gr��e: 50MB`);
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`Dateityp ${file.type} wird nicht unterst�tzt`);
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

  const handlePhoneCall = () => {
    const currentChat = chats.find(c => c.id === selectedChat);
    if (!currentChat) return;
    
    alert(`Telefon-Integration noch nicht implementiert.\n\nChat: ${currentChat.name}\n\nDiese Funktion wird in einer zukünftigen Version verfügbar sein.`);
  };

  const handleVideoCall = () => {
    const currentChat = chats.find(c => c.id === selectedChat);
    if (!currentChat) return;
    
    alert(`Video-Integration noch nicht implementiert.\n\nChat: ${currentChat.name}\n\nDiese Funktion wird in einer zukünftigen Version verfügbar sein.`);
  };

  const handleChatMenu = () => {
    console.log('📋 handleChatMenu called, toggling from:', showChatMenu, 'to:', !showChatMenu);
    setShowChatMenu(prev => !prev);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      
      // Import Firestore functions
      const { doc: firestoreDoc, getDoc, deleteDoc, collection, getDocs, writeBatch } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      // Try to delete from different collections
      const collections = ['chats', 'chats_v2', 'direct_chats'];
      
      for (const collectionName of collections) {
        try {
          const chatDocRef = firestoreDoc(db, collectionName, chatId);
          const chatDoc = await getDoc(chatDocRef);
          
          if (chatDoc.exists()) {
            console.log(`✅ Found chat in ${collectionName}, deleting...`);
            console.log(`   Chat data:`, chatDoc.data());
            
            // Try to delete messages subcollection
            try {
              const messagesRef = collection(chatDocRef, 'messages');
              const messagesSnapshot = await getDocs(messagesRef);
              
              if (!messagesSnapshot.empty) {
                console.log(`   Deleting ${messagesSnapshot.size} messages...`);
                const batch = writeBatch(db);
                messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`   ✅ Deleted ${messagesSnapshot.size} messages`);
              }
            } catch (msgError) {
              console.warn('   No messages subcollection or error accessing it');
            }
            
            // Delete the chat document
            await deleteDoc(chatDocRef);
            console.log(`🗑️ Deleted chat document from ${collectionName}`);
            
            // Refresh chats
            if (refreshChats) {
              setTimeout(() => refreshChats(), 500);
            }
            
            alert(`Chat wurde erfolgreich gelöscht aus ${collectionName}`);
            return;
          }
        } catch (err: any) {
          console.warn(`⚠️ Collection ${collectionName} error:`, err.message);
        }
      }
      
      alert('Chat konnte nicht gefunden werden. Möglicherweise wurde er bereits gelöscht oder Sie haben keine Berechtigung.');
    } catch (error: any) {
      console.error('❌ Error deleting chat:', error);
      alert(`Fehler beim Löschen des Chats: ${error.message}`);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChat]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the menu
      if (showChatMenu && !target.closest('.chat-menu-container')) {
        setShowChatMenu(false);
      }
    };

    if (showChatMenu) {
      // Delay to prevent immediate closure
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChatMenu]);

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
        
        // Neue Gr��e berechnen
        const newWidth = Math.max(400, resizeStart.width + deltaX);
        const newHeight = Math.max(500, resizeStart.height + deltaY);
        
        // Maximale Gr��e begrenzen (80% des Bildschirms)
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Messaging schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-2xl border-4 border-[#058bc0] z-50 overflow-hidden"
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
        className="p-4 cursor-move bg-gradient-to-r from-[#058bc0] to-[#0470a0] border-b-2 border-[#046a90]"
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg flex items-center gap-2">
              Nachrichten
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white h-6 w-6 p-0 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white animate-pulse">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshChats}
              title="Chats aktualisieren"
              className="hover:bg-white/20 text-white border border-white/30 hover:border-white/60 transition-all hover:scale-110 shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleMinimize}
              className="hover:bg-white/20 text-white border border-white/30 hover:border-white/60 transition-all hover:scale-110 shadow-md"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="hover:bg-red-500/80 text-white border border-white/30 hover:border-red-200 transition-all hover:scale-110 shadow-md"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex relative overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
        {/* Chat List */}
        <div className={`${selectedChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-64 border-r-2 border-gray-200 flex-shrink-0 h-full bg-gradient-to-br from-gray-50 to-white`}>
          <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 border-b-2 border-blue-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm border-2 border-blue-200 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white shadow-sm font-medium"
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
                    ? 'Keine g�ltigen Chat-Partner verf�gbar'
                    : 'Keine Chats entsprechen Ihrer Suche.'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {validChats.length === 0 
                    ? 'Es wurden noch keine g�ltigen Benutzer in Ihrer Concern gefunden.'
                    : 'Versuchen Sie einen anderen Suchbegriff.'
                  }
                </p>
                {chats.length > validChats.length && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    🧹 {chats.length - validChats.length} veraltete Chat-Eintr�ge wurden ausgeblendet
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Debug info */}
                <div className="p-3 text-xs bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-200 rounded-lg mb-2 shadow-sm">
                  <div className="font-semibold text-gray-800 mb-1">🔍 Debug-Info:</div>
                  <div className="space-y-1 text-gray-700">
                    <div>✅ Angezeigte Chats: <span className="font-bold text-[#058bc0]">{filteredChats.length}</span></div>
                    <div>📊 Gültige Chats: <span className="font-bold text-green-600">{validChats.length}</span></div>
                    <div>📋 Gesamt-Chats: <span className="font-bold text-blue-600">{chats.length}</span></div>
                    <div>🚫 Herausgefiltert: <span className="font-bold text-red-600">{chats.length - validChats.length}</span></div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200 text-gray-600">
                    💡 Tipp: Öffnen Sie die Browser-Konsole für Details zu gefilterten Chats
                  </div>
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
                  
                  // Spezielle Behandlung f�r Info-Chats
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
                            {chat.id === 'info_permission_error' ? '⚠️' : 'ℹ️'}
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
                    className={`group flex items-center space-x-3 p-3 mx-2 my-1 cursor-pointer rounded-lg transition-all shadow-sm ${
                      selectedChat === chat.id
                        ? 'bg-gradient-to-r from-[#058bc0] to-[#0470a0] border-2 border-[#046a90] text-white shadow-lg scale-105'
                        : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {chat.type === 'group' ? (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-blue-300">
                          {chat.name.charAt(0)}
                        </div>
                      ) : chat.type === 'controlling' ? (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md border-2 ${
                          chat.controllingMembers && chat.controllingMembers.length > 0 && isBlinking
                            ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse border-red-300'
                            : 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-300'
                        }`}>
                          🎯
                        </div>
                      ) : chat.photoURL ? (
                        <img 
                          src={chat.photoURL} 
                          alt={chat.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md border-2 border-gray-300">
                          {chat.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          selectedChat === chat.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {chatName}
                        </p>
                        <div className="flex items-center gap-1">
                          {chat.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                          {/* Delete button for invalid/old chats (admin only) */}
                          {(user?.role === 'admin' && (chat.name.includes('Benutzer') || chat.id.length === 20)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Chat "${chat.name}" löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                                  handleDeleteChat(chat.id);
                                }
                              }}
                              className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 rounded shadow-sm hover:shadow-md transition-all hover:scale-110"
                              title="Ungültigen Chat löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 border-b-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectChat(null)}
                    className="md:hidden hover:bg-white/50 border border-blue-200 hover:border-blue-400"
                  >
                    Zurück
                  </Button>
                  
                  {/* Chat Partner Photo/Icon */}
                  {(() => {
                    const currentChat = chats.find(c => c.id === selectedChat);
                    if (!currentChat) return null;
                    
                    if (currentChat.photoURL) {
                      return (
                        <img 
                          src={currentChat.photoURL} 
                          alt={currentChat.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#058bc0] shadow-md"
                        />
                      );
                    } else {
                      return (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#058bc0] to-[#0470a0] rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-[#046a90]">
                          {currentChat.name.charAt(0).toUpperCase()}
                        </div>
                      );
                    }
                  })()}
                  
                  <span className="font-bold text-gray-800 text-lg">
                    {chats.find(c => c.id === selectedChat)?.name || 'Chat'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 relative">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handlePhoneCall}
                    className="hover:bg-white/50 border border-blue-200 hover:border-blue-400 transition-all hover:scale-110"
                    title="Anrufen"
                  >
                    <Phone className="h-4 w-4 text-gray-700" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleVideoCall}
                    className="hover:bg-white/50 border border-blue-200 hover:border-blue-400 transition-all hover:scale-110"
                    title="Videoanruf"
                  >
                    <Video className="h-4 w-4 text-gray-700" />
                  </Button>
                  <div className="relative chat-menu-container">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('📋 Mehr-Button clicked, current state:', showChatMenu);
                        handleChatMenu();
                      }}
                      className="hover:bg-white/50 border border-blue-200 hover:border-blue-400 transition-all hover:scale-110"
                      title="Mehr Optionen"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-700" />
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {showChatMenu && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-56 bg-white border-2 border-[#058bc0] rounded-lg shadow-2xl z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              const chat = chats.find(c => c.id === selectedChat);
                              alert(`Chat-Informationen:\n\nName: ${chat?.name}\nTyp: ${chat?.type}\nTeilnehmer: ${chat?.participants.length}\nUngelesen: ${chat?.unreadCount}`);
                              setShowChatMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat-Informationen
                          </button>
                          <button
                            onClick={() => {
                              if (selectedChat) {
                                markChatAsRead(selectedChat);
                                setShowChatMenu(false);
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Als gelesen markieren
                          </button>
                          <button
                            onClick={() => {
                              alert('Stummschalten-Funktion kommt bald');
                              setShowChatMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Bell className="h-4 w-4" />
                            Stummschalten
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          {user?.role === 'admin' && selectedChat && (
                            <button
                              onClick={() => {
                                setShowChatMenu(false);
                                if (confirm(`Chat wirklich löschen?`)) {
                                  handleDeleteChat(selectedChat);
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                            >
                              <Trash2 className="h-4 w-4" />
                              Chat löschen
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                      Keine anderen Benutzer verf�gbar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Es wurden noch keine anderen Benutzer in Ihrer Concern gefunden.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Was können Sie tun?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>� Warten Sie, bis weitere Benutzer zur Concern hinzugef�gt werden</li>
                        <li>� Kontaktieren Sie Ihren Administrator</li>
                        <li>� �berpr�fen Sie, ob weitere Benutzer registriert sind</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages[selectedChat]?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md transition-all hover:shadow-lg ${
                        message.senderId === user?.uid
                          ? 'bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white rounded-br-sm'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 rounded-bl-sm border-2 border-gray-300'
                      }`}
                    >
                      {/* Absender-Name (nur bei Nachrichten von anderen) */}
                      {message.senderId !== user?.uid && message.senderName && (
                        <div className={`text-xs font-semibold mb-1 ${
                          message.senderId === user?.uid ? 'text-blue-100' : 'text-gray-700'
                        }`}>
                          {message.senderName}
                        </div>
                      )}
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
                                <LazyImage 
                                  src={message.media.thumbnailUrl} 
                                  alt={message.media.fileName || 'Bild'}
                                  className="max-w-full h-auto rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(message.media.url, '_blank')}
                                />
                              )}
                              <div className="text-xs opacity-80">
                                📷 {message.media.fileName}
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
                className="p-4 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-300 relative"
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
                  <p className="text-sm">Unterst�tzte Formate: Bilder, PDF, Dokumente</p>
                </div>
              </div>


              {/* File Upload Area */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">Ausgew�hlte Dateien:</div>
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
                  className="hover:bg-blue-100 hover:text-blue-600 border-2 border-gray-300 hover:border-blue-400 transition-all hover:scale-110 shadow-sm"
                  title="Datei anh�ngen"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <div className="hover:scale-110 transition-transform">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </div>
                
                <Input
                  placeholder="Nachricht eingeben..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm font-medium"
                  disabled={isUploading}
                />
                
                <Button 
                  onClick={handleSendMessage} 
                  disabled={(!messageText.trim() && selectedFiles.length === 0) || isUploading}
                  className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 border-2 border-[#046a90] font-semibold"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                    </>
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
