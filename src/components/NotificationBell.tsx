import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, AlertCircle, Info, X, Settings, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationSettingsDialog from './NotificationSettingsDialog';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const uid = (user as any)?.uid;
  const [open, setOpen] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Use real-time listener instead of polling - saves ~1,200 reads/hour
  useEffect(() => {
    if (!uid) {
      console.warn('⚠️ NotificationBell: No uid available');
      return;
    }
    console.log('🔵 NotificationBell: Setting up listener for uid:', uid);

    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('✅ NotificationBell: Snapshot received', snapshot.docs.length);
        const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(notifications);
      },
      (error) => {
        console.error('❌ NotificationBell listener error:', error);
        console.error('Query details:', { uid, collection: 'notifications' });
        setItems([]);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const unread = items.filter(i => !(i.readBy || []).includes(uid)).length;

  // Calculate position when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const headerHeight = 80; // Approximate header height
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAllRead = async () => {
    if (!uid) return;
    const unreadIds = items.filter(i => !(i.readBy || []).includes(uid)).map(i => i.id);
    await Promise.all(
      unreadIds.map(id => 
        updateDoc(doc(db, 'notifications', id), {
          readBy: arrayUnion(uid)
        })
      )
    );
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'Gerade eben';
      if (minutes < 60) return `vor ${minutes} Min`;
      if (hours < 24) return `vor ${hours} Std`;
      if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
      return date.toLocaleDateString('de-DE');
    } catch {
      return '';
    }
  };

  const notificationDropdown = open ? (
    <div
      id="notification-dropdown"
      className="fixed w-96 bg-white border-2 border-blue-200 rounded-xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        maxHeight: 'calc(100vh - 6rem)'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-bold text-lg">Benachrichtigungen</h3>
          {unread > 0 && (
            <Badge className="bg-red-500 text-white border-0">
              {unread} neu
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setShowSettingsDialog(true);
            }}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            aria-label="Einstellungen"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[500px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Keine Benachrichtigungen</p>
            <p className="text-sm text-gray-400 mt-1">Sie sind auf dem neuesten Stand!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((n) => {
              const isRead = (n.readBy || []).includes(uid);
              return (
                <div
                  key={n.id}
                  className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer ${
                    !isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={async () => {
                    if (!isRead && uid) {
                      await updateDoc(doc(db, 'notifications', n.id), {
                        readBy: arrayUnion(uid)
                      });
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </h4>
                        {!isRead && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.body}</p>
                      {n.createdAt && (
                        <p className="text-xs text-gray-400 mt-2">{formatTime(n.createdAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && unread > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="w-full bg-white hover:bg-blue-50 border-blue-200 text-blue-700 font-semibold"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Alle als gelesen markieren
          </Button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          className="relative p-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:scale-110"
          onClick={() => setOpen(!open)}
          aria-label="Benachrichtigungen"
        >
          <Bell className="w-5 h-5 text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
      {typeof window !== 'undefined' && createPortal(notificationDropdown, document.body)}
      <NotificationSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog} 
      />
    </>
  );
};

export default NotificationBell;


