import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void> | void;
  storageKey: string;
  debounceMs?: number;
  enabled?: boolean;
  onBeforeUnload?: () => boolean; // Return true to show warning
}

interface UseAutoSaveReturn {
  hasUnsavedChanges: boolean;
  saveDraft: () => Promise<void>;
  clearDraft: () => void;
  loadDraft: () => T | null;
  isSaving: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  storageKey,
  debounceMs = 2000,
  enabled = true,
  onBeforeUnload,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dataRef = useRef(data);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Save draft to localStorage
  const saveDraftToStorage = useCallback((dataToSave: T) => {
    try {
      const draft = {
        data: dataToSave,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`draft_${storageKey}`, JSON.stringify(draft));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [storageKey]);

  // Load draft from localStorage
  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`draft_${storageKey}`);
      if (saved) {
        const draft = JSON.parse(saved);
        return draft.data;
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
    return null;
  }, [storageKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`draft_${storageKey}`);
      setHasUnsavedChanges(false);
      lastSavedRef.current = '';
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [storageKey]);

  // Save function
  const saveDraft = useCallback(async () => {
    if (isSavingRef.current) return;
    
    try {
      isSavingRef.current = true;
      setIsSaving(true);
      
      const currentData = dataRef.current;
      const dataString = JSON.stringify(currentData);
      
      // Only save if data has changed
      if (dataString !== lastSavedRef.current) {
        await onSave(currentData);
        lastSavedRef.current = dataString;
        saveDraftToStorage(currentData);
        
        toast({
          title: 'Entwurf gespeichert',
          description: 'Ihre Änderungen wurden automatisch gespeichert.',
          variant: 'default',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Der Entwurf konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [onSave, saveDraftToStorage, toast]);

  // Auto-save with debounce
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, saveDraft]);

  // Before unload warning
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (onBeforeUnload && onBeforeUnload()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      
      // Default: show warning if there are unsaved changes
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Sie haben nicht gespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, hasUnsavedChanges, onBeforeUnload]);

  return {
    hasUnsavedChanges,
    saveDraft,
    clearDraft,
    loadDraft,
    isSaving,
  };
}

