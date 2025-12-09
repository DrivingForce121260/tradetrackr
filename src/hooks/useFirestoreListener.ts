/**
 * TradeTrackr - Firestore Real-time Listener Hook
 * Custom hook for real-time Firestore updates
 */

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface UseFirestoreListenerOptions {
  collectionPath: string;
  constraints?: QueryConstraint[];
  enabled?: boolean;
}

export function useFirestoreListener<T = DocumentData>(
  options: UseFirestoreListenerOptions
) {
  const { collectionPath, constraints = [], enabled = true } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];

        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore listener error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionPath, enabled, JSON.stringify(constraints)]);

  return { data, loading, error };
}
















