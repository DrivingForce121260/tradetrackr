import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface FormErrorSummaryProps {
  errors: Array<{ field: string; error: string }>;
  onDismiss?: () => void;
  className?: string;
  title?: string;
  scrollToError?: boolean;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  onDismiss,
  className,
  title = 'Bitte korrigieren Sie die folgenden Fehler:',
  scrollToError = true,
}) => {
  if (errors.length === 0) return null;

  const handleErrorClick = (field: string) => {
    if (scrollToError) {
      const element = document.getElementById(`input-${field.toLowerCase().replace(/\s+/g, '-')}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-red-500 bg-red-50 p-4 space-y-2',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-2">{title}</h3>
            <ul className="space-y-1">
              {errors.map(({ field, error }, index) => (
                <li key={index} className="text-sm text-red-800">
                  <button
                    type="button"
                    onClick={() => handleErrorClick(field)}
                    className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                  >
                    <span className="font-medium">{field}:</span> {error}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            aria-label="Fehlerzusammenfassung schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};







