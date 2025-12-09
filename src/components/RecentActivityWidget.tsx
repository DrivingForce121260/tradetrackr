import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

function timeAgo(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `${Math.floor(diff/60)} min`;
  if (diff < 86400) return `${Math.floor(diff/3600)} h`;
  return `${Math.floor(diff/86400)} d`;
}

const RecentActivityWidget: React.FC = () => {
  const { user } = useAuth();
  const uid = (user as any)?.uid;
  const [items, setItems] = useState<any[]>([]);

  // Use real-time listener instead of polling - saves ~700 reads/hour
  useEffect(() => {
    if (!uid) {
      console.warn('⚠️ RecentActivityWidget: No uid available');
      return;
    }
    console.log('🔵 RecentActivityWidget: Setting up listener for uid:', uid);

    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('✅ RecentActivityWidget: Snapshot received', snapshot.docs.length);
        const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(notifications);
      },
      (error) => {
        console.error('❌ RecentActivityWidget listener error:', error);
        console.error('Query details:', { uid, collection: 'notifications' });
        // Fallback to empty on error
        setItems([]);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivität</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.slice(0, 10).map(n => {
            const ts = (n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date()));
            return (
              <div key={n.id} className="text-sm">
                <div className="font-medium truncate">{n.title}</div>
                <div className="text-gray-600 truncate">{n.body}</div>
                <div className="text-xs text-gray-500">{timeAgo(ts)}</div>
              </div>
            );
          })}
          {items.length===0 && <div className="text-sm text-gray-500">Keine Aktivitäten</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityWidget;



