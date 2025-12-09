import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode | ((props: { formData: Record<string, any>; updateFormData: (data: Record<string, any>) => void; [key: string]: any }) => React.ReactNode);
  validation?: () => boolean | Promise<boolean>;
  optional?: boolean;
}

interface MultiStepFormProps {
  steps: FormStep[];
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: Record<string, any>;
  showProgress?: boolean;
  showStepNumbers?: boolean;
  className?: string;
  submitLabel?: string;
  cancelLabel?: string;
  summaryComponent?: React.ReactNode;
}

const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  onSubmit,
  onCancel,
  initialData = {},
  showProgress = true,
  showStepNumbers = true,
  className,
  submitLabel = 'Absenden',
  cancelLabel = 'Abbrechen',
  summaryComponent,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepData = steps[currentStep];

  // Update form data - use useCallback to ensure stable reference
  const updateFormData = React.useCallback((data: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Validate current step
  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const step = steps[stepIndex];
    
    if (step.optional) {
      return true;
    }

    if (step.validation) {
      try {
        const isValid = await step.validation();
        if (!isValid) {
          setStepErrors((prev) => ({
            ...prev,
            [stepIndex]: 'Bitte füllen Sie alle erforderlichen Felder aus.',
          }));
          return false;
        }
      } catch (error) {
        setStepErrors((prev) => ({
          ...prev,
          [stepIndex]: error instanceof Error ? error.message : 'Validierungsfehler',
        }));
        return false;
      }
    }

    // Clear error if validation passes
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[stepIndex];
      return newErrors;
    });

    return true;
  };

  // Navigate to next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    
    if (!isValid) {
      return;
    }

    if (isLastStep) {
      return;
    }

    setCurrentStep((prev) => {
      const nextStep = prev + 1;
      setVisitedSteps((visited) => new Set([...visited, nextStep]));
      return nextStep;
    });
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (isFirstStep) {
      return;
    }

    setCurrentStep((prev) => {
      const nextStep = prev - 1;
      setVisitedSteps((visited) => new Set([...visited, nextStep]));
      return nextStep;
    });
  };

  // Navigate to specific step
  const goToStep = async (stepIndex: number) => {
    // Validate all steps up to the target step
    for (let i = 0; i < stepIndex; i++) {
      const isValid = await validateStep(i);
      if (!isValid && !steps[i].optional) {
        return; // Don't allow skipping invalid required steps
      }
    }

    setCurrentStep(stepIndex);
    setVisitedSteps((visited) => new Set([...visited, stepIndex]));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all steps before submitting
    for (let i = 0; i < steps.length; i++) {
      const isValid = await validateStep(i);
      if (!isValid && !steps[i].optional) {
        // Go to first invalid step
        setCurrentStep(i);
        setVisitedSteps((visited) => new Set([...visited, i]));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clone step component with form data and update function
  const renderStepComponent = () => {
    // If component is a function, call it with props
    if (typeof currentStepData.component === 'function') {
      return (currentStepData.component as any)({
        formData,
        updateFormData,
        setFormData,
      });
    }
    
    // Otherwise, clone the element
    if (React.isValidElement(currentStepData.component)) {
      // Get existing props from the component
      const existingProps = (currentStepData.component as React.ReactElement<any>).props || {};
      // Clone with all existing props preserved, plus formData and updateFormData
      // This ensures closures are preserved for state setters passed via props
      return React.cloneElement(currentStepData.component as React.ReactElement<any>, {
        ...existingProps, // Preserve ALL existing props (including setNewCustomerData, etc.) - this preserves closures
        formData,
        updateFormData,
        setFormData,
      });
    }
    return currentStepData.component;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Bar */}
      {showProgress && (
        <Card className="border-2 border-[#058bc0]/20 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Progress Steps */}
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isVisited = visitedSteps.has(index);
                  const hasError = stepErrors[index];

                  return (
                    <div
                      key={step.id}
                      className="flex flex-col items-center flex-1 relative"
                    >
                      {/* Step Connector Line */}
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            'absolute top-5 left-[60%] w-full h-0.5 -z-10',
                            isCompleted
                              ? 'bg-[#058bc0]'
                              : isVisited
                              ? 'bg-gray-300'
                              : 'bg-gray-200'
                          )}
                        />
                      )}

                      {/* Step Circle */}
                      <button
                        type="button"
                        onClick={() => goToStep(index)}
                        disabled={!isVisited && !isActive}
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200',
                          'border-2',
                          isActive
                            ? 'bg-[#058bc0] text-white border-[#058bc0] scale-110 shadow-lg'
                            : isCompleted
                            ? 'bg-green-500 text-white border-green-500'
                            : hasError
                            ? 'bg-red-500 text-white border-red-500'
                            : isVisited
                            ? 'bg-gray-300 text-gray-700 border-gray-300'
                            : 'bg-white text-gray-400 border-gray-300',
                          isVisited || isActive
                            ? 'cursor-pointer hover:scale-105'
                            : 'cursor-not-allowed opacity-50'
                        )}
                        aria-label={`Schritt ${index + 1}: ${step.title}`}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : hasError ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : showStepNumbers ? (
                          index + 1
                        ) : (
                          <Check className="h-5 w-5 opacity-0" />
                        )}
                      </button>

                      {/* Step Label */}
                      <div className="mt-2 text-center max-w-[120px]">
                        <p
                          className={cn(
                            'text-xs font-semibold',
                            isActive
                              ? 'text-[#058bc0]'
                              : isCompleted
                              ? 'text-green-600'
                              : hasError
                              ? 'text-red-600'
                              : 'text-gray-500'
                          )}
                        >
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Fortschritt</span>
                  <span className="font-semibold">
                    {currentStep + 1} von {steps.length}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Step Content */}
      <Card className="border-2 border-[#058bc0]/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#058bc0]/10 to-transparent border-b-2 border-[#058bc0]/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-[#058bc0] flex items-center gap-2">
                {showStepNumbers && (
                  <span className="bg-[#058bc0] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {currentStep + 1}
                  </span>
                )}
                {currentStepData.title}
              </CardTitle>
              {currentStepData.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {currentStepData.description}
                </p>
              )}
            </div>
            {currentStepData.optional && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Optional
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Step Error Message */}
          {stepErrors[currentStep] && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{stepErrors[currentStep]}</p>
            </div>
          )}

          {/* Step Component */}
          <div className="min-h-[300px]">{renderStepComponent()}</div>
        </CardContent>
      </Card>

      {/* Summary Step */}
      {isLastStep && summaryComponent && (
        <Card className="border-2 border-green-300 shadow-lg bg-gradient-to-br from-green-50/30 to-white">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent border-b-2 border-green-300">
            <CardTitle className="text-xl font-bold text-green-700 flex items-center gap-2">
              <Check className="h-6 w-6" />
              Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {React.isValidElement(summaryComponent) && React.cloneElement(summaryComponent as React.ReactElement<any>, {
              formData,
            })}
            {!React.isValidElement(summaryComponent) && summaryComponent}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-2"
            >
              {cancelLabel}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="border-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          )}

          {!isLastStep ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {submitLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;







