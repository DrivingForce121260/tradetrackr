import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  helperText?: string;
  tooltip?: string;
  showValidationIcon?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      touched,
      isValid,
      helperText,
      tooltip,
      showValidationIcon = true,
      maxLength,
      showCharCount,
      className,
      id,
      value,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = touched && error;
    const showValidIcon = touched && isValid && showValidationIcon && !hasError;
    const currentLength = typeof value === 'string' ? value.length : 0;
    
    // Destructure and remove value, onChange, onBlur from props to prevent conflicts
    const { value: propsValue, onChange: propsOnChange, onBlur: propsOnBlur, ...restProps } = props as any;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={inputId} className={cn(hasError && 'text-red-600')}>
              {label}
            </Label>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            className={cn(
              'pr-10',
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              showValidIcon && 'border-green-500 focus:border-green-500 focus:ring-green-500',
              className
            )}
            maxLength={maxLength}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : tooltip
                ? `${inputId}-tooltip`
                : undefined
            }
            {...restProps}
            value={value ?? ''}
            onChange={onChange}
            onBlur={onBlur}
          />
          {showValidIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {(showCharCount || maxLength) && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            {helperText && !hasError && <span id={`${inputId}-helper`}>{helperText}</span>}
            <span className={cn('ml-auto', currentLength > (maxLength || 0) * 0.9 && 'text-orange-500')}>
              {currentLength}
              {maxLength && ` / ${maxLength}`}
            </span>
          </div>
        )}
        {hasError && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {helperText && !hasError && !showCharCount && (
          <p id={`${inputId}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  helperText?: string;
  tooltip?: string;
  showValidationIcon?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      touched,
      isValid,
      helperText,
      tooltip,
      showValidationIcon = true,
      maxLength,
      showCharCount,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = touched && error;
    const showValidIcon = touched && isValid && showValidationIcon && !hasError;
    const currentLength = typeof props.value === 'string' ? props.value.length : 0;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={textareaId} className={cn(hasError && 'text-red-600')}>
              {label}
            </Label>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        <div className="relative">
          <Textarea
            ref={ref}
            id={textareaId}
            className={cn(
              'pr-10',
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              showValidIcon && 'border-green-500 focus:border-green-500 focus:ring-green-500',
              className
            )}
            maxLength={maxLength}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${textareaId}-error`
                : helperText
                ? `${textareaId}-helper`
                : tooltip
                ? `${textareaId}-tooltip`
                : undefined
            }
            {...props}
          />
          {showValidIcon && (
            <div className="absolute right-3 top-3 pointer-events-none">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
          {hasError && (
            <div className="absolute right-3 top-3 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {(showCharCount || maxLength) && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            {helperText && !hasError && <span id={`${textareaId}-helper`}>{helperText}</span>}
            <span className={cn('ml-auto', currentLength > (maxLength || 0) * 0.9 && 'text-orange-500')}>
              {currentLength}
              {maxLength && ` / ${maxLength}`}
            </span>
          </div>
        )}
        {hasError && (
          <p id={`${textareaId}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {helperText && !hasError && !showCharCount && (
          <p id={`${textareaId}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

export interface FormSelectProps extends React.ComponentPropsWithoutRef<typeof SelectTrigger> {
  label?: string;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  helperText?: string;
  tooltip?: string;
  showValidationIcon?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const FormSelect = React.forwardRef<React.ElementRef<typeof SelectTrigger>, FormSelectProps>(
  (
    {
      label,
      error,
      touched,
      isValid,
      helperText,
      tooltip,
      showValidationIcon = true,
      options,
      placeholder,
      value,
      onValueChange,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = touched && error;
    const showValidIcon = touched && isValid && showValidationIcon && !hasError;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={selectId} className={cn(hasError && 'text-red-600')}>
              {label}
            </Label>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        <div className="relative">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger
              ref={ref}
              id={selectId}
              className={cn(
                'pr-10',
                hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                showValidIcon && 'border-green-500 focus:border-green-500 focus:ring-green-500',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={
                hasError
                  ? `${selectId}-error`
                  : helperText
                  ? `${selectId}-helper`
                  : tooltip
                  ? `${selectId}-tooltip`
                  : undefined
              }
              {...props}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showValidIcon && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
          {hasError && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {hasError && (
          <p id={`${selectId}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={`${selectId}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';







