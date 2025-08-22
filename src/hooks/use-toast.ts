// ============================================================================
// OPTIMIZED TOAST HOOKS
// ============================================================================
import * as React from "react";
import { useCallback, useMemo, useRef, useEffect } from "react";
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast";

// Enhanced configuration
const TOAST_CONFIG = {
  LIMIT: 5, // Increased from 1 for better UX
  REMOVE_DELAY: 5000, // Reduced from 1000000 for better UX
  STACK_OFFSET: 8, // Pixels between stacked toasts
  ANIMATION_DURATION: 300, // Animation duration in ms
  AUTO_DISMISS: true, // Auto-dismiss toasts
  POSITION: 'top-right' as const, // Toast position
} as const;

type ToastPosition = typeof TOAST_CONFIG.POSITION | 'top-left' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: ToastPosition;
  persistent?: boolean; // Won't auto-dismiss
  progress?: boolean; // Show progress bar
  onDismiss?: () => void;
  onAction?: () => void;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  CLEAR_ALL: "CLEAR_ALL",
  UPDATE_POSITION: "UPDATE_POSITION",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["CLEAR_ALL"];
    }
  | {
      type: ActionType["UPDATE_POSITION"];
      position: ToastPosition;
    };

interface State {
  toasts: ToasterToast[];
  position: ToastPosition;
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const toastProgress = new Map<string, { start: number; duration: number; interval?: NodeJS.Timeout }>();

const addToRemoveQueue = (toastId: string, duration?: number) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeoutDuration = duration ?? TOAST_CONFIG.REMOVE_DELAY;
  
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    toastProgress.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, timeoutDuration);

  toastTimeouts.set(toastId, timeout);

  // Start progress tracking if enabled
  const toast = memoryState.toasts.find(t => t.id === toastId);
  if (toast?.progress) {
    const start = Date.now();
    toastProgress.set(toastId, { start, duration: timeoutDuration });
  }
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_CONFIG.LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          if (!toast.persistent) {
            addToRemoveQueue(toast.id, toast.duration);
          }
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    case "CLEAR_ALL":
      // Clear all timeouts
      toastTimeouts.forEach(timeout => clearTimeout(timeout));
      toastTimeouts.clear();
      toastProgress.clear();
      return {
        ...state,
        toasts: [],
      }

    case "UPDATE_POSITION":
      return {
        ...state,
        position: action.position,
      }

    default:
      return state;
  }
}

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { 
  toasts: [], 
  position: TOAST_CONFIG.POSITION 
};

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

// Enhanced toast function with better defaults
function toast({ 
  type = 'default',
  duration,
  position,
  persistent = false,
  progress = false,
  onDismiss,
  onAction,
  ...props 
}: Toast) {
  const id = genId();
  const toastDuration = duration ?? (persistent ? undefined : TOAST_CONFIG.REMOVE_DELAY);

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });

  const dismiss = () => {
    onDismiss?.();
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  const action = props.action ? {
    ...props.action,
    onClick: () => {
      onAction?.();
      props.action?.onClick?.();
    }
  } : undefined;

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      type,
      duration: toastDuration,
      position,
      persistent,
      progress,
      open: true,
      action,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss if not persistent and duration is set
  if (!persistent && toastDuration && TOAST_CONFIG.AUTO_DISMISS) {
    addToRemoveQueue(id, toastDuration);
  }

  return {
    id,
    dismiss,
    update,
  };
}

// Convenience functions for different toast types
const toastSuccess = (props: Omit<Toast, 'type'>) => toast({ ...props, type: 'success' });
const toastError = (props: Omit<Toast, 'type'>) => toast({ ...props, type: 'error' });
const toastWarning = (props: Omit<Toast, 'type'>) => toast({ ...props, type: 'warning' });
const toastInfo = (props: Omit<Toast, 'type'>) => toast({ ...props, type: 'info' });

// Enhanced useToast hook
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  // Enhanced dismiss function
  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      dispatch({ type: "DISMISS_TOAST", toastId });
    } else {
      dispatch({ type: "DISMISS_TOAST" });
    }
  }, []);

  // Clear all toasts
  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  // Update toast position
  const updatePosition = useCallback((position: ToastPosition) => {
    dispatch({ type: "UPDATE_POSITION", position });
  }, []);

  // Get toast statistics
  const stats = useMemo(() => ({
    total: state.toasts.length,
    byType: {
      default: state.toasts.filter(t => t.type === 'default').length,
      success: state.toasts.filter(t => t.type === 'success').length,
      error: state.toasts.filter(t => t.type === 'error').length,
      warning: state.toasts.filter(t => t.type === 'warning').length,
      info: state.toasts.filter(t => t.type === 'info').length,
    },
    unread: state.toasts.filter(t => t.open).length,
    position: state.position,
  }), [state.toasts, state.position]);

  // Get toasts by type
  const getToastsByType = useCallback((type: ToasterToast['type']) => {
    return state.toasts.filter(t => t.type === type);
  }, [state.toasts]);

  // Get toasts by position
  const getToastsByPosition = useCallback((position: ToastPosition) => {
    return state.toasts.filter(t => t.position === position);
  }, [state.toasts]);

  return {
    ...state,
    toast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    dismiss,
    clearAll,
    updatePosition,
    stats,
    getToastsByType,
    getToastsByPosition,
  };
}

// Export enhanced functionality
export { 
  useToast, 
  toast, 
  toastSuccess, 
  toastError, 
  toastWarning, 
  toastInfo,
  TOAST_CONFIG 
};
