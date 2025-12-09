import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'outline',
  size = 'sm',
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'hover:scale-110 hover:shadow-lg',
        className
      )}
      aria-label={theme === 'dark' ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      title={theme === 'dark' ? 'Hell' : 'Dunkel'}
    >
      <div className="relative flex items-center justify-center">
        <Sun
          className={cn(
            'h-4 w-4 transition-all duration-500 absolute',
            theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
        <Moon
          className={cn(
            'h-4 w-4 transition-all duration-500 absolute',
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          )}
        />
      </div>
      <span className="ml-2 hidden lg:inline">
        {theme === 'dark' ? 'Hell' : 'Dunkel'}
      </span>
    </Button>
  );
};

export default ThemeToggle;







