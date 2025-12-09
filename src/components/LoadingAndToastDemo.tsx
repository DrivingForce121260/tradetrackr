import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AppHeader from './AppHeader';
import {
  LoadingSpinner,
  LoadingOverlay,
  InlineLoading,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  FormSkeleton,
  ProgressBar,
} from '@/components/ui/loading';
import {
  showSuccessToast,
  showProgressToast,
  ConfirmationBadge,
} from '@/components/ui/toast-helpers';

const LoadingAndToastDemo: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Demo: Loading Spinner
  const handleLoadingSpinner = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  // Demo: Loading Overlay
  const handleLoadingOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 3000);
  };

  // Demo: Progress Bar
  const handleProgressBar = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // Demo: Success Toast
  const handleSuccessToast = () => {
    toastSuccess({
      title: 'Erfolgreich gespeichert',
      description: 'Die Änderungen wurden erfolgreich gespeichert.',
    });
  };

  // Demo: Success Toast mit Rückgängig
  const handleSuccessToastWithUndo = () => {
    showSuccessToast(
      {
        title: 'Aufgabe gelöscht',
        description: 'Die Aufgabe wurde erfolgreich gelöscht.',
        onUndo: async () => {
          toastSuccess({
            title: 'Wiederhergestellt',
            description: 'Die Aufgabe wurde wiederhergestellt.',
          });
        },
        undoLabel: 'Rückgängig',
      },
      toastSuccess
    );
  };

  // Demo: Error Toast
  const handleErrorToast = () => {
    toastError({
      title: 'Fehler',
      description: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    });
  };

  // Demo: Warning Toast
  const handleWarningToast = () => {
    toastWarning({
      title: 'Warnung',
      description: 'Bitte überprüfen Sie Ihre Eingaben.',
    });
  };

  // Demo: Info Toast
  const handleInfoToast = () => {
    toastInfo({
      title: 'Information',
      description: 'Neue Funktionen sind verfügbar.',
    });
  };

  // Demo: Progress Toast
  const handleProgressToast = () => {
    const progressToast = showProgressToast(
      {
        title: 'Datei wird hochgeladen',
        description: 'demo-file.pdf',
        progress: 0,
        onCancel: () => {
          toastInfo({ title: 'Abgebrochen', description: 'Upload wurde abgebrochen.' });
        },
      },
      toastInfo
    );

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      progressToast.update({
        description: `demo-file.pdf - ${currentProgress}%`,
      });
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          progressToast.dismiss();
          toastSuccess({
            title: 'Upload abgeschlossen',
            description: 'Die Datei wurde erfolgreich hochgeladen.',
          });
        }, 500);
      }
    }, 500);
  };

  // Demo: Confirmation Badge
  const handleConfirmationBadge = () => {
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        title="Loading & Toast Demo"
        showBackButton={!!onBack}
        onBack={onBack}
      />
      
      <LoadingOverlay isLoading={showOverlay} text="Lade Daten..." />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Loading Components */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">🔄 Loading-Komponenten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Loading Spinner */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loading Spinner</h3>
                <div className="flex gap-4 items-center">
                  <LoadingSpinner size="sm" text="Klein" />
                  <LoadingSpinner size="md" text="Mittel" />
                  <LoadingSpinner size="lg" text="Groß" />
                  <LoadingSpinner size="xl" text="Extra Groß" />
                </div>
                <Button onClick={handleLoadingSpinner} disabled={isLoading}>
                  <InlineLoading isLoading={isLoading}>
                    Spinner Demo starten
                  </InlineLoading>
                </Button>
              </div>

              {/* Loading Overlay */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loading Overlay</h3>
                <Button onClick={handleLoadingOverlay}>
                  Overlay Demo starten (3 Sekunden)
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Progress Bar</h3>
                <ProgressBar progress={progress} label="Upload Fortschritt" showPercentage={true} />
                <Button onClick={handleProgressBar}>
                  Progress Bar Demo starten
                </Button>
              </div>

              {/* Skeleton Loaders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Skeleton Loaders</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Tabellen-Skeleton</h4>
                    <TableSkeleton rows={3} columns={4} />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Card-Skeleton</h4>
                    <CardSkeleton count={3} />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Listen-Skeleton</h4>
                    <ListSkeleton items={3} />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Formular-Skeleton</h4>
                    <FormSkeleton />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toast Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">🔔 Toast-Benachrichtigungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleSuccessToast} className="bg-green-600 hover:bg-green-700">
                  ✅ Erfolgs-Toast
                </Button>
                <Button onClick={handleSuccessToastWithUndo} className="bg-green-600 hover:bg-green-700">
                  ✅ Erfolgs-Toast mit Rückgängig
                </Button>
                <Button onClick={handleErrorToast} className="bg-red-600 hover:bg-red-700">
                  ❌ Fehler-Toast
                </Button>
                <Button onClick={handleWarningToast} className="bg-yellow-600 hover:bg-yellow-700">
                  ⚠️ Warnung-Toast
                </Button>
                <Button onClick={handleInfoToast} className="bg-blue-600 hover:bg-blue-700">
                  ℹ️ Info-Toast
                </Button>
                <Button onClick={handleProgressToast} className="bg-purple-600 hover:bg-purple-700">
                  📊 Progress-Toast
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Visuelle Bestätigungen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">✓ Visuelle Bestätigungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleConfirmationBadge}>
                Confirmation Badge anzeigen
              </Button>
              {showConfirmation && (
                <ConfirmationBadge message="Gespeichert!" duration={2000} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoadingAndToastDemo;







