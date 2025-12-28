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
import { MessageCircle, Send, Users, Search, Phone, Video, MoreVertical, Paperclip, Smile, X, Minimize2, Maximize2, Image as ImageIcon, FileText, Download, RefreshCw, Bell, CheckCircle, Forward, UserPlus, Plus, Trash2, Edit2 } from 'lucide-react';
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
    isLoadingMessages,
    sendMessage,
    markChatAsRead,
    deleteMessage,
    selectChat,
    unreadCount,
    uploadFile,
    trackEmojiUsage,
    refreshChats,
    createGroupChat
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
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editedText, setEditedText] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [concernMembers, setConcernMembers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Position and size state for draggable/resizable messaging box
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  // Show a short hint animation for the resize handle when the messaging window opens
  const [showResizeHint, setShowResizeHint] = useState(false);

  // Load concern members for group creation
  useEffect(() => {
    const loadConcernMembers = async () => {
      if (!user?.concernID) return;
      
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('concernID', '==', user.concernID));
        const snapshot = await getDocs(q);
        
        const members = snapshot.docs
          .map(doc => ({
            uid: doc.id,
            ...doc.data()
          }))
          .filter((member: any) => member.uid !== user.uid); // Exclude current user
        
        setConcernMembers(members);
        console.log('👥 [Messaging] Loaded concern members:', members.length);
      } catch (error) {
        console.error('❌ [Messaging] Error loading concern members:', error);
      }
    };
    
    loadConcernMembers();
  }, [user?.concernID, user?.uid]);

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

    // Entferne kaputte Fallback-Chats aus der UI (sollten nie als "Person" auftauchen)
    if (chat.name === 'Fallback Chat') return false;
    if (chat.type === 'direct' && (chat.participants || []).length < 2) return false;
    
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
      console.log('📤 [Messaging] Starting message send. Files:', selectedFiles.length, 'Text:', messageText);
      
      // Dateien hochladen und Nachrichten senden
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            console.log('📎 [Messaging] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            const fileUpload = await uploadFile(
              file, 
              selectedChat, 
              (progress) => {
                console.log(`📊 [Messaging] Upload progress for ${file.name}: ${progress}%`);
                setUploadProgress(prev => ({
                  ...prev,
                  [file.name]: progress
                }));
              }
            );
            
            console.log('✅ [Messaging] File upload result:', fileUpload);
            
            if (fileUpload.status === 'success' && fileUpload.downloadUrl) {
              // Nachricht mit Datei senden
              const media: any = {
                type: file.type.startsWith('image/') ? 'image' : 'document',
                url: fileUpload.downloadUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type
              };
              
              // Only add thumbnailUrl if it exists (Firestore doesn't allow undefined values)
              if (fileUpload.thumbnailUrl) {
                media.thumbnailUrl = fileUpload.thumbnailUrl;
              }
              
              console.log('💬 [Messaging] Sending message with media:', media);
              await sendMessage(selectedChat, messageText || `📎 ${file.name}`, media);
              console.log('✅ [Messaging] Message sent successfully');
            } else {
              console.error('❌ [Messaging] File upload failed:', fileUpload);
              alert(`Fehler beim Hochladen von ${file.name}: ${fileUpload.errorMessage || 'Unbekannter Fehler'}`);
            }
          } catch (error: any) {
            console.error('❌ [Messaging] Error uploading file:', file.name, error);
            alert(`Fehler beim Hochladen von ${file.name}: ${error.message || 'Unbekannter Fehler'}`);
          }
        }
      } else if (messageText.trim()) {
        // Nur Text-Nachricht senden
        console.log('💬 [Messaging] Sending text-only message');
        await sendMessage(selectedChat, messageText);
        console.log('✅ [Messaging] Text message sent successfully');
      }

      // State zurücksetzen
      setMessageText('');
      try { localStorage.removeItem(`draft:${selectedChat}`); } catch {}
      setSelectedFiles([]);
      setUploadProgress({});
      console.log('✅ [Messaging] Message send complete, state reset');
    } catch (error: any) {
      console.error('❌ [Messaging] Error in handleSendMessage:', error);
      alert(`Fehler beim Senden: ${error.message || 'Unbekannter Fehler'}`);
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

  const handleForwardMessage = (message: any) => {
    console.log('📤 [Messaging] Forwarding message:', message.id);
    setForwardingMessage(message);
    setShowForwardModal(true);
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!forwardingMessage) return;
    
    try {
      console.log('📤 [Messaging] Forwarding message to chat:', targetChatId);
      
      // Create forwarded message text
      let forwardedText = `➡️ Weitergeleitet von ${forwardingMessage.senderName}:\n${forwardingMessage.text}`;
      
      // Send the message with media if present
      await sendMessage(targetChatId, forwardedText, forwardingMessage.media);
      
      console.log('✅ [Messaging] Message forwarded successfully');
      alert('Nachricht erfolgreich weitergeleitet!');
      
      // Close modal
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch (error: any) {
      console.error('❌ [Messaging] Error forwarding message:', error);
      alert(`Fehler beim Weiterleiten: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Bitte geben Sie einen Gruppennamen ein.');
      return;
    }
    
    if (selectedMembers.length === 0) {
      alert('Bitte wählen Sie mindestens ein Mitglied aus.');
      return;
    }
    
    try {
      console.log('👥 [Messaging] Creating group:', groupName, 'Members:', selectedMembers);
      
      const groupChatId = await createGroupChat(groupName, selectedMembers);
      
      console.log('✅ [Messaging] Group created successfully:', groupChatId);
      alert(`Gruppe "${groupName}" erfolgreich erstellt!`);
      
      // Reset and close modal
      setShowCreateGroupModal(false);
      setGroupName('');
      setSelectedMembers([]);
      
      // Select the new group chat
      if (refreshChats) {
        await refreshChats();
      }
      selectChat(groupChatId);
    } catch (error: any) {
      console.error('❌ [Messaging] Error creating group:', error);
      alert(`Fehler beim Erstellen der Gruppe: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedChat) return;
    if (selectedMembers.length === 0) {
      alert('Bitte wählen Sie mindestens ein Mitglied aus.');
      return;
    }
    
    try {
      console.log('👥 [Messaging] Adding members to group:', selectedChat, 'Members:', selectedMembers);
      
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const chatRef = doc(db, 'chats', selectedChat);
      await updateDoc(chatRef, {
        participants: arrayUnion(...selectedMembers)
      });
      
      console.log('✅ [Messaging] Members added successfully');
      alert('Mitglieder erfolgreich hinzugefügt!');
      
      // Reset and close modal
      setShowAddMembersModal(false);
      setSelectedMembers([]);
      
      // Refresh chats
      if (refreshChats) {
        await refreshChats();
      }
    } catch (error: any) {
      console.error('❌ [Messaging] Error adding members:', error);
      alert(`Fehler beim Hinzufügen von Mitgliedern: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleDeleteMessage = async (messageId: string, message: any) => {
    // Check if message can be deleted (only if sender and not read by others)
    const isOwnMessage = message.senderId === user?.uid;
    if (!isOwnMessage) {
      alert('Sie können nur Ihre eigenen Nachrichten löschen.');
      return;
    }

    // Check if message has been read by others
    const readByOthers = message.readBy?.filter((id: string) => id !== user?.uid) || [];
    if (readByOthers.length > 0) {
      alert('Diese Nachricht wurde bereits gelesen und kann nicht mehr gelöscht werden.');
      return;
    }

    if (!confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      return;
    }

    try {
      console.log('🗑️ [Messaging] Deleting message:', messageId);
      await deleteMessage(selectedChat!, messageId);
      console.log('✅ [Messaging] Message deleted successfully');
    } catch (error: any) {
      console.error('❌ [Messaging] Error deleting message:', error);
      alert(`Fehler beim Löschen: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleEditMessage = (message: any) => {
    // Check if message can be edited (only if sender and within 5 minutes)
    const isOwnMessage = message.senderId === user?.uid;
    if (!isOwnMessage) {
      alert('Sie können nur Ihre eigenen Nachrichten bearbeiten.');
      return;
    }

    const messageTime = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
    const timeDiff = Date.now() - messageTime.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      alert('Nachrichten können nur innerhalb von 5 Minuten nach dem Senden bearbeitet werden.');
      return;
    }

    setEditingMessage(message);
    setEditedText(message.text);
    setShowEditMessageModal(true);
  };

  const handleSaveEditedMessage = async () => {
    if (!editingMessage || !editedText.trim()) {
      alert('Bitte geben Sie einen Nachrichtentext ein.');
      return;
    }

    if (editedText.trim() === editingMessage.text) {
      // No changes made
      setShowEditMessageModal(false);
      setEditingMessage(null);
      setEditedText('');
      return;
    }

    try {
      console.log('✏️ [Messaging] Editing message:', editingMessage.id);
      
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      // Check if message was read by others
      const readByOthers = editingMessage.readBy?.filter((id: string) => id !== user?.uid) || [];
      const wasRead = readByOthers.length > 0;
      
      const messageRef = doc(db, 'messages', editingMessage.id);
      
      // If message was read, store original text for strikethrough display
      const updateData: any = {
        text: editedText.trim(),
        editedAt: serverTimestamp(),
        isEdited: true
      };
      
      if (wasRead && !editingMessage.originalText) {
        // First edit after being read - store original text
        updateData.originalText = editingMessage.text;
      }
      
      await updateDoc(messageRef, updateData);
      
      console.log('✅ [Messaging] Message edited successfully');
      alert('Nachricht erfolgreich bearbeitet!');
      
      setShowEditMessageModal(false);
      setEditingMessage(null);
      setEditedText('');
    } catch (error: any) {
      console.error('❌ [Messaging] Error editing message:', error);
      alert(`Fehler beim Bearbeiten: ${error.message || 'Unbekannter Fehler'}`);
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

  // Trigger the resize hint for 5 seconds when the messaging component mounts (i.e. window opened)
  useEffect(() => {
    setShowResizeHint(true);
    const t = setTimeout(() => setShowResizeHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

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
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm border-2 border-blue-200 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white shadow-sm font-medium"
              />
            </div>
            <Button
              onClick={() => setShowCreateGroupModal(true)}
              className="w-full bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white shadow-md hover:shadow-lg transition-all text-sm h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Gruppe erstellen
            </Button>
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
                          {/* Add Members button for group chats */}
                          {(() => {
                            const currentChat = chats.find(c => c.id === selectedChat);
                            return currentChat?.type === 'group' && (
                              <>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => {
                                    setShowChatMenu(false);
                                    setShowGroupMembersModal(true);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                  <Users className="h-4 w-4" />
                                  Gruppenmitglieder anzeigen
                                </button>
                                <button
                                  onClick={() => {
                                    setShowChatMenu(false);
                                    setShowAddMembersModal(true);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-semibold"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Mitglieder hinzufügen
                                </button>
                              </>
                            );
                          })()}
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
                      Keine anderen Benutzer verfügbar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Es wurden noch keine anderen Benutzer in Ihrer Concern gefunden.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Was können Sie tun?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Warten Sie, bis weitere Benutzer zur Concern hinzugefügt werden</li>
                        <li>• Kontaktieren Sie Ihren Administrator</li>
                        <li>• Überprüfen Sie, ob weitere Benutzer registriert sind</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoadingMessages && (
                    <div className="text-center text-sm text-gray-500 py-6">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Nachrichten werden geladen...
                      </div>
                    </div>
                  )}
                  {!isLoadingMessages && (!messages[selectedChat] || messages[selectedChat].length === 0) && (
                    <div className="text-center text-sm text-gray-500 py-6">
                      Keine Nachrichten vorhanden.
                    </div>
                  )}
                  {messages[selectedChat]?.map((message) => {
                    const media = message.media;
                    const mediaSizeMb = media?.fileSize ? (media.fileSize / 1024 / 1024).toFixed(2) : null;
                    return (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'} group mb-3`}
                  >
                    <div className="relative">
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
                          <div className="text-sm whitespace-pre-wrap">
                            {/* Show strikethrough for original text if edited after being read */}
                            {message.isEdited && message.originalText && (
                              <div className="mb-2">
                                <span className="line-through text-red-400 opacity-75">
                                  {message.originalText}
                                </span>
                              </div>
                            )}
                            {/* Show current text */}
                            <div>
                              {message.text}
                              {message.isEdited && (
                                <span className="text-xs opacity-70 ml-2">(bearbeitet)</span>
                              )}
                            </div>
                          </div>
                        )}
                      
                      {/* Datei-Anzeige */}
                      {media && (
                        <div className="mt-2">
                          {media.type === 'image' ? (
                            <div className="space-y-2">
                              {media.thumbnailUrl && (
                                <LazyImage 
                                  src={media.thumbnailUrl} 
                                  alt={media.fileName || 'Bild'}
                                  className="max-w-full h-auto rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(media.url, '_blank')}
                                />
                              )}
                              <div className="text-xs opacity-80">
                                📷 {media.fileName}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {media.fileName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {mediaSizeMb ? `${mediaSizeMb} MB` : '—'}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(media.url, '_blank')}
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
                    
                    {/* Action Buttons - appear on hover */}
                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit Button - only for own messages within 5 minutes */}
                      {message.senderId === user?.uid && (
                        (() => {
                          const messageTime = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
                          const timeDiff = Date.now() - messageTime.getTime();
                          const fiveMinutes = 5 * 60 * 1000;
                          const canEdit = timeDiff <= fiveMinutes;
                          
                          return canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMessage(message)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
                              title="Nachricht bearbeiten (nur innerhalb von 5 Minuten)"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                          );
                        })()
                      )}
                      
                      {/* Delete Button - only for own unread messages */}
                      {message.senderId === user?.uid && (
                        (() => {
                          const readByOthers = message.readBy?.filter((id: string) => id !== user?.uid) || [];
                          const canDelete = readByOthers.length === 0;
                          
                          return canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMessage(message.id, message)}
                              className="h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                              title="Nachricht löschen (nur möglich wenn noch nicht gelesen)"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          );
                        })()
                      )}
                      
                      {/* Forward Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleForwardMessage(message)}
                        className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full"
                        title="Nachricht weiterleiten"
                      >
                        <Forward className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>
                    </div>
                  </div>
                );
                  })}
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
                
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                
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
      
      {/* Forward Modal */}
      {showForwardModal && forwardingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-2xl w-96 max-h-[600px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-[#058bc0] to-[#0470a0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Nachricht weiterleiten</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardingMessage(null);
                  }}
                  className="hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 border-b bg-gray-50">
              <div className="text-sm text-gray-700 mb-2 font-semibold">Nachricht:</div>
              <div className="bg-white p-3 rounded border text-sm max-h-32 overflow-y-auto">
                {forwardingMessage.text}
                {forwardingMessage.media && (
                  <div className="mt-2 text-xs text-gray-500">
                    📎 {forwardingMessage.media.fileName}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-sm text-gray-700 mb-3 font-semibold">An wen weiterleiten?</div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredChats
                    .filter(chat => chat.id !== selectedChat) // Don't show current chat
                    .map((chat) => {
                      const chatName = chat.type === 'direct' 
                        ? chat.name || 'Unbenannter Chat'
                        : chat.name;
                      
                      return (
                        <button
                          key={chat.id}
                          onClick={() => handleForwardToChat(chat.id)}
                          className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border-2 border-transparent hover:border-[#058bc0] transition-all flex items-center space-x-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#058bc0] to-[#0470a0] flex items-center justify-center text-white font-bold">
                            {chatName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {chatName}
                            </div>
                            {chat.type === 'group' && (
                              <div className="text-xs text-gray-500">
                                Gruppe · {chat.participants?.length || 0} Mitglieder
                              </div>
                            )}
                          </div>
                          <Forward className="h-4 w-4 text-gray-400" />
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[700px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-[#058bc0] to-[#0470a0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Neue Gruppe erstellen
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setGroupName('');
                    setSelectedMembers([]);
                  }}
                  className="hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 border-b bg-gray-50">
              <div className="text-sm text-gray-700 mb-2 font-semibold">Gruppenname:</div>
              <Input
                placeholder="z.B. Projektteam, Familie, Freunde..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="border-2 border-gray-300 focus:border-[#058bc0]"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-sm text-gray-700 mb-3 font-semibold">
                Mitglieder auswählen ({selectedMembers.length} ausgewählt):
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {concernMembers.map((member: any) => {
                    const isSelected = selectedMembers.includes(member.uid);
                    const memberName = `${member.vorname || ''} ${member.nachname || ''}`.trim() || member.displayName || member.email;
                    
                    return (
                      <button
                        key={member.uid}
                        onClick={() => toggleMemberSelection(member.uid)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-blue-50 border-[#058bc0]'
                            : 'bg-white border-gray-200 hover:border-[#058bc0]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isSelected ? 'bg-[#058bc0]' : 'bg-gray-400'
                        }`}>
                          {memberName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {memberName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {member.email}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-[#058bc0]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setGroupName('');
                  setSelectedMembers([]);
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                Gruppe erstellen
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[700px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-[#058bc0] to-[#0470a0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Mitglieder hinzufügen
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddMembersModal(false);
                    setSelectedMembers([]);
                  }}
                  className="hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-sm text-gray-700 mb-3 font-semibold">
                Mitglieder auswählen ({selectedMembers.length} ausgewählt):
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {concernMembers
                    .filter((member: any) => {
                      const currentChat = chats.find(c => c.id === selectedChat);
                      return !currentChat?.participants.includes(member.uid);
                    })
                    .map((member: any) => {
                      const isSelected = selectedMembers.includes(member.uid);
                      const memberName = `${member.vorname || ''} ${member.nachname || ''}`.trim() || member.displayName || member.email;
                      
                      return (
                        <button
                          key={member.uid}
                          onClick={() => toggleMemberSelection(member.uid)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                            isSelected
                              ? 'bg-blue-50 border-[#058bc0]'
                              : 'bg-white border-gray-200 hover:border-[#058bc0]'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            isSelected ? 'bg-[#058bc0]' : 'bg-gray-400'
                          }`}>
                            {memberName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {memberName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {member.email}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-[#058bc0]" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedMembers([]);
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddMembersToGroup}
                disabled={selectedMembers.length === 0}
                className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* View Group Members Modal */}
      {showGroupMembersModal && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[700px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-[#058bc0] to-[#0470a0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gruppenmitglieder
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGroupMembersModal(false)}
                  className="hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 border-b bg-gray-50">
              {(() => {
                const currentChat = chats.find(c => c.id === selectedChat);
                return (
                  <div>
                    <div className="text-sm text-gray-700 font-semibold mb-1">
                      Gruppe: {currentChat?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentChat?.participants.length || 0} Mitglieder
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {(() => {
                    const currentChat = chats.find(c => c.id === selectedChat);
                    const groupParticipants = currentChat?.participants || [];
                    
                    return groupParticipants.map((participantId: string) => {
                      const member = concernMembers.find((m: any) => m.uid === participantId);
                      const isCurrentUser = participantId === user?.uid;
                      
                      let memberName = 'Unbekannter Benutzer';
                      let memberEmail = '';
                      
                      if (isCurrentUser) {
                        memberName = 'Sie';
                        memberEmail = user?.email || '';
                      } else if (member) {
                        memberName = `${member.vorname || ''} ${member.nachname || ''}`.trim() || member.displayName || member.email;
                        memberEmail = member.email;
                      }
                      
                      return (
                        <div
                          key={participantId}
                          className="p-3 rounded-lg border-2 border-gray-200 bg-white flex items-center space-x-3"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            isCurrentUser ? 'bg-[#058bc0]' : 'bg-gray-400'
                          }`}>
                            {memberName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                              {memberName}
                              {isCurrentUser && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-semibold">
                                  Sie
                                </span>
                              )}
                            </div>
                            {memberEmail && (
                              <div className="text-xs text-gray-500 truncate">
                                {memberEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button
                onClick={() => setShowGroupMembersModal(false)}
                className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Message Modal */}
      {showEditMessageModal && editingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-[#058bc0] to-[#0470a0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  Nachricht bearbeiten
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditMessageModal(false);
                    setEditingMessage(null);
                    setEditedText('');
                  }}
                  className="hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="text-sm text-gray-700 mb-2 font-semibold">
                Nachricht bearbeiten:
              </div>
              {(() => {
                const readByOthers = editingMessage.readBy?.filter((id: string) => id !== user?.uid) || [];
                const wasRead = readByOthers.length > 0;
                
                return wasRead && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="font-semibold text-yellow-800 mb-1">⚠️ Hinweis:</div>
                    <div className="text-yellow-700">
                      Diese Nachricht wurde bereits gelesen. Änderungen werden mit einer roten Durchstreichung des ursprünglichen Textes angezeigt.
                    </div>
                  </div>
                );
              })()}
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 min-h-[120px] resize-none"
                placeholder="Nachricht eingeben..."
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-1">
                Nachrichten können nur innerhalb von 5 Minuten nach dem Senden bearbeitet werden.
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditMessageModal(false);
                  setEditingMessage(null);
                  setEditedText('');
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveEditedMessage}
                disabled={!editedText.trim() || editedText.trim() === editingMessage.text}
                className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Removed bottom-right resize hint icon to reduce UI clutter */}
      
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

      {/* Resize Handle - Corner (bottom-right) for diagonal resizing */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        title="Größe durch Ziehen an der Ecke ändern"
        aria-label="Eck-Griff zum Ändern der Größe"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <polyline points="0,14 14,0" stroke="#333" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </Card>
  );
};

export default Messaging;
