// ============================================================================
// BUSINESS ICONS
// ============================================================================
// Specialized business icons with consistent styling and behavior

import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  FileText,
  File,
  Image,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Database,
  Scale,
  Building,
  User,
  Users,
  Truck,
  Box,
  Hash,
  Settings,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  Wrench,
} from 'lucide-react';

// Business icon components with consistent styling
export const BusinessIcons = {
  // Time and scheduling
  calendar: Calendar,
  clock: Clock,
  
  // Location and mapping
  location: MapPin,
  building: Building,
  
  // Financial
  money: DollarSign,
  scale: Scale,
  
  // Inventory and packages
  package: Package,
  truck: Truck,
  box: Box,
  
  // Documents and files
  document: FileText,
  file: File,
  image: Image,
  checklist: CheckSquare,
  
  // Analytics and trends
  chart: BarChart3,
  trend: TrendingUp,
  database: Database,
  hash: Hash,
  
  // People and communication
  user: User,
  users: Users,
  phone: Phone,
  mail: Mail,
  message: MessageCircle,
  
  // Tools and settings
  wrench: Wrench,
  shield: Shield,
  settings: Settings,
  globe: Globe,
} as const;

// Business metric icon component
export const BusinessMetricIcon: React.FC<{
  metric: keyof typeof BusinessIcons;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}> = ({ metric, size = 'md', color = 'primary', className = '' }) => {
  const IconComponent = BusinessIcons[metric];
  
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
};

// Dashboard metric card component
export const MetricCard: React.FC<{
  icon: keyof typeof BusinessIcons;
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}> = ({ icon, title, value, change, className = '' }) => {
  const IconComponent = BusinessIcons[icon];
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <IconComponent className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`text-sm font-medium ${
            change.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.isPositive ? '+' : ''}{change.value}%
          </div>
        )}
      </div>
    </div>
  );
};

// Status indicator component
export const StatusIndicator: React.FC<{
  status: 'active' | 'inactive' | 'pending' | 'completed';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}> = ({ status, size = 'md', showLabel = false, className = '' }) => {
  const statusConfig = {
    active: {
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Aktiv',
    },
    inactive: {
      icon: X,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: 'Inaktiv',
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Ausstehend',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      label: 'Abgeschlossen',
    },
  };
  
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <IconComponent className={`${sizeClasses[size]} ${config.color}`} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      )}
    </div>
  );
};

// Import missing icons
import { X, CheckCircle } from 'lucide-react';
