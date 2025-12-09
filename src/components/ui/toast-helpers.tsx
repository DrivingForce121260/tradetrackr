import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './button';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { ProgressBar } from './loading';

// ============================================================================
// HELPER-FUNKTIONEN FÜR ERFOLGSMELDUNGEN MIT RÜCKGÄNGIG-OPTION
// ============================================================================

interface SuccessToastOptions {
  title: string;
  description?: string;
  duration?: number;
  onUndo?: () => void | Promise<void>;
  undoLabel?: string;
}

/**
 * Zeigt eine Erfolgsmeldung mit optionaler Rückgängig-Option
 */
export const showSuccessToast = (
  { title, description, duration = 5000, onUndo, undoLabel = 'Rückgängig' }: SuccessToastOptions,
  toastFn: ReturnType<typeof useToast>['toastSuccess']
) => {
  const toastId = toastFn({
    title: (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span>{title}</span>
      </div>
    ),
    description,
    type: 'success',
    duration: onUndo ? 8000 : duration, // Längere Anzeigedauer wenn Rückgängig verfügbar
    action: onUndo ? (
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await onUndo();
          toastFn({ id: toastId.id, open: false });
        }}
        className="border-green-300 text-green-700 hover:bg-green-100"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        {undoLabel}
      </Button>
    ) : undefined,
  });

  return toastId;
};

// ============================================================================
// TOAST MIT PROGRESS BAR
// ============================================================================

interface ProgressToastOptions {
  title: string;
  description?: string;
  progress: number; // 0-100
  onCancel?: () => void;
}

/**
 * Zeigt einen Toast mit Progress-Bar für lange Operationen
 */
export const showProgressToast = (
  { title, description, progress, onCancel }: ProgressToastOptions,
  toastFn: ReturnType<typeof useToast>['toast']
) => {
  const toastId = toastFn({
    title,
    description: (
      <div className="space-y-2 w-full">
        {description && <p>{description}</p>}
        <ProgressBar progress={progress} showPercentage={true} />
      </div>
    ),
    type: 'info',
    persistent: true,
    progress: true,
    action: onCancel ? (
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        className="border-red-300 text-red-700 hover:bg-red-100"
      >
        Abbrechen
      </Button>
    ) : undefined,
  });

  return toastId;
};

// ============================================================================
// VISUELLE BESTÄTIGUNG (Inline)
// ============================================================================

interface ConfirmationBadgeProps {
  message: string;
  duration?: number;
  className?: string;
}

/**
 * Zeigt eine kurze visuelle Bestätigung (z.B. nach Klick auf Button)
 */
export const ConfirmationBadge: React.FC<ConfirmationBadgeProps> = ({
  message,
  duration = 2000,
  className,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-semibold border-2 border-green-300 shadow-md animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <CheckCircle2 className="h-4 w-4" />
      {message}
    </div>
  );
};







