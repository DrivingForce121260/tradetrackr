/**
 * Beispiel-Komponente für die Verwendung der neuen Form-Validierung
 * Diese Komponente zeigt, wie man useFormValidation und FormInput verwendet
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-input';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation, validationRules } from '@/hooks/use-form-validation';

interface ExampleFormData {
  title: string;
  description: string;
  email: string;
  priority: string;
}

export const FormValidationExample: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const {
    values,
    errors,
    touched,
    isValid,
    allErrors,
    getFieldProps,
    handleSubmit,
    reset,
  } = useFormValidation<ExampleFormData>({
    initialValues: {
      title: '',
      description: '',
      email: '',
      priority: '',
    },
    validationRules: {
      title: [
        validationRules.required('Der Titel ist erforderlich'),
        validationRules.minLength(3, 'Der Titel muss mindestens 3 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Titel darf maximal 100 Zeichen lang sein'),
      ],
      description: [
        validationRules.required('Die Beschreibung ist erforderlich'),
        validationRules.minLength(10, 'Die Beschreibung muss mindestens 10 Zeichen lang sein'),
        validationRules.maxLength(500, 'Die Beschreibung darf maximal 500 Zeichen lang sein'),
      ],
      email: [
        validationRules.required('Die E-Mail-Adresse ist erforderlich'),
        validationRules.email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
      ],
      priority: [
        validationRules.required('Bitte wählen Sie eine Priorität'),
      ],
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Formular erfolgreich gesendet!');
      reset();
      onClose();
    },
    validateOnBlur: true,
    validateOnChange: false,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl"
        onEscape={onClose}
        trapFocus={true}
      >
        <DialogHeader>
          <DialogTitle>Formular-Validierung Beispiel</DialogTitle>
          <DialogDescription>
            Diese Komponente zeigt die neue Form-Validierung mit Echtzeit-Validierung und visuellen Indikatoren.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Summary */}
          {allErrors.length > 0 && (
            <FormErrorSummary
              errors={allErrors}
              onDismiss={() => {}}
            />
          )}

          {/* Title Field */}
          <FormInput
            {...getFieldProps('title')}
            label="Titel"
            placeholder="z.B. Neue Aufgabe"
            tooltip="Geben Sie einen aussagekräftigen Titel für die Aufgabe ein. Der Titel sollte zwischen 3 und 100 Zeichen lang sein."
            maxLength={100}
            showCharCount={true}
            helperText="Ein aussagekräftiger Titel hilft bei der Identifikation der Aufgabe"
          />

          {/* Description Field */}
          <FormTextarea
            {...getFieldProps('description')}
            label="Beschreibung"
            placeholder="Beschreiben Sie die Aufgabe im Detail..."
            tooltip="Geben Sie eine detaillierte Beschreibung der Aufgabe ein. Die Beschreibung sollte zwischen 10 und 500 Zeichen lang sein."
            maxLength={500}
            showCharCount={true}
            rows={5}
            helperText="Eine detaillierte Beschreibung hilft bei der Umsetzung der Aufgabe"
          />

          {/* Email Field */}
          <FormInput
            {...getFieldProps('email')}
            label="E-Mail-Adresse"
            type="email"
            placeholder="beispiel@email.com"
            tooltip="Geben Sie eine gültige E-Mail-Adresse ein. Beispiel: max.mustermann@example.com"
            helperText="Diese E-Mail-Adresse wird für Benachrichtigungen verwendet"
          />

          {/* Priority Field */}
          <FormSelect
            {...getFieldProps('priority')}
            label="Priorität"
            placeholder="Priorität auswählen"
            tooltip="Wählen Sie die Priorität der Aufgabe. Hohe Priorität bedeutet, dass die Aufgabe dringend erledigt werden muss."
            options={[
              { value: 'low', label: 'Niedrig' },
              { value: 'medium', label: 'Mittel' },
              { value: 'high', label: 'Hoch' },
            ]}
            helperText="Die Priorität bestimmt die Wichtigkeit der Aufgabe"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!isValid}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};







