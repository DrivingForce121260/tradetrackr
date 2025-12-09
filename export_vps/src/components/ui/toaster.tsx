import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { ProgressBar } from "./loading"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, progress, persistent, type, ...props }) {
        const icon = getIcon(type)
        const showProgress = progress && persistent

        return (
          <Toast 
            key={id} 
            variant={
              type === 'error' || type === 'destructive' 
                ? 'destructive' 
                : type === 'success' 
                ? 'success' 
                : type === 'warning'
                ? 'warning'
                : type === 'info'
                ? 'info'
                : 'default'
            } 
            {...props}
          >
            <div className="flex gap-3 w-full">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div className="grid gap-1 flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
                {showProgress && (
                  <div className="mt-2">
                    <ProgressBar progress={0} showPercentage={false} />
                  </div>
                )}
              </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
