# Loading States & Toast Notifications - Verwendungsbeispiele

## Loading-Komponenten

### 1. LoadingSpinner (Standardisiert)

```tsx
import { LoadingSpinner } from '@/components/ui/loading';

// Kleiner Spinner
<LoadingSpinner size="sm" text="Lade Daten..." />

// Großer Spinner
<LoadingSpinner size="xl" text="Bitte warten..." />
```

### 2. LoadingOverlay (Fullscreen)

```tsx
import { LoadingOverlay } from '@/components/ui/loading';

<LoadingOverlay 
  isLoading={isLoading} 
  text="Daten werden geladen..." 
  backdrop={true}
/>
```

### 3. InlineLoading (für Buttons)

```tsx
import { InlineLoading } from '@/components/ui/loading';

<Button disabled={isLoading}>
  <InlineLoading isLoading={isLoading}>
    Speichern
  </InlineLoading>
</Button>
```

### 4. Skeleton-Loader

```tsx
import { TableSkeleton, CardSkeleton, ListSkeleton, FormSkeleton } from '@/components/ui/loading';

// Tabellen-Skeleton
{isLoading ? <TableSkeleton rows={5} columns={4} /> : <Table data={data} />}

// Card-Skeleton
{isLoading ? <CardSkeleton count={3} /> : <Cards data={data} />}

// Listen-Skeleton
{isLoading ? <ListSkeleton items={5} /> : <List items={items} />}

// Formular-Skeleton
{isLoading ? <FormSkeleton /> : <Form />}
```

### 5. ProgressBar

```tsx
import { ProgressBar } from '@/components/ui/loading';

<ProgressBar 
  progress={uploadProgress} 
  label="Upload Fortschritt" 
  showPercentage={true}
/>
```

## Toast-Notifications

### 1. Standard Toast

```tsx
import { useToast } from '@/hooks/use-toast';

const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();

// Erfolgsmeldung
toastSuccess({
  title: 'Erfolgreich gespeichert',
  description: 'Die Änderungen wurden erfolgreich gespeichert.',
});

// Fehlermeldung
toastError({
  title: 'Fehler',
  description: 'Ein Fehler ist aufgetreten.',
});

// Warnung
toastWarning({
  title: 'Warnung',
  description: 'Bitte überprüfen Sie die Eingaben.',
});

// Info
toastInfo({
  title: 'Information',
  description: 'Neue Funktionen verfügbar.',
});
```

### 2. Erfolgsmeldung mit Rückgängig-Option

```tsx
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast } from '@/components/ui/toast-helpers';

const { toastSuccess } = useToast();

// Beispiel: Aufgabe löschen
const handleDeleteTask = async (taskId: string) => {
  // Aufgabe löschen
  await deleteTask(taskId);
  
  // Erfolgsmeldung mit Rückgängig
  showSuccessToast(
    {
      title: 'Aufgabe gelöscht',
      description: 'Die Aufgabe wurde erfolgreich gelöscht.',
      onUndo: async () => {
        // Aufgabe wiederherstellen
        await restoreTask(taskId);
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
```

### 3. Progress Toast für lange Operationen

```tsx
import { useToast } from '@/hooks/use-toast';
import { showProgressToast } from '@/components/ui/toast-helpers';

const { toast } = useToast();

// Beispiel: Datei-Upload
const handleUpload = async (file: File) => {
  const progressToast = showProgressToast(
    {
      title: 'Datei wird hochgeladen',
      description: file.name,
      progress: 0,
      onCancel: () => {
        // Upload abbrechen
        cancelUpload();
      },
    },
    toast
  );

  // Upload mit Progress-Updates
  uploadFile(file, (progress) => {
    progressToast.update({
      description: `${file.name} - ${Math.round(progress)}%`,
    });
    // Progress-Bar wird automatisch aktualisiert
  });
};
```

### 4. Visuelle Bestätigung (Inline)

```tsx
import { ConfirmationBadge } from '@/components/ui/toast-helpers';
import { useState } from 'react';

const MyComponent = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSave = async () => {
    await saveData();
    setShowConfirmation(true);
  };

  return (
    <div>
      <Button onClick={handleSave}>Speichern</Button>
      {showConfirmation && (
        <ConfirmationBadge 
          message="Gespeichert!" 
          duration={2000}
        />
      )}
    </div>
  );
};
```

## Best Practices

1. **Loading States:**
   - Verwenden Sie `LoadingSpinner` für kleine Bereiche
   - Verwenden Sie `LoadingOverlay` für Fullscreen-Loading
   - Verwenden Sie Skeleton-Loader für Listen/Tabellen (bessere UX)

2. **Toast Notifications:**
   - Verwenden Sie `toastSuccess` für erfolgreiche Aktionen
   - Verwenden Sie `toastError` für Fehler
   - Verwenden Sie `showSuccessToast` mit `onUndo` für wichtige Aktionen (Löschen, etc.)
   - Verwenden Sie `showProgressToast` für lange Operationen

3. **Rückgängig-Funktionalität:**
   - Nur bei wichtigen, irreversiblen Aktionen verwenden
   - Längere Anzeigedauer (8 Sekunden) wenn Rückgängig verfügbar
   - Klare Beschreibung der Aktion

4. **Visuelle Bestätigungen:**
   - Verwenden Sie `ConfirmationBadge` für kurze, lokale Bestätigungen
   - Verwenden Sie Toasts für globale Benachrichtigungen







