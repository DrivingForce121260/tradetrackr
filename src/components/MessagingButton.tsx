import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { useMessaging } from '@/hooks/useMessaging';

const MessagingButton: React.FC = () => {
  try {
    const { unreadCount, openMessaging, getUrgentControllingCount } = useMessaging();
    const [isBlinking, setIsBlinking] = React.useState(false);

    // Blink effect for urgent controlling messages (0.5Hz = 2 seconds per cycle)
    React.useEffect(() => {
      const urgentCount = getUrgentControllingCount();
      
      if (urgentCount > 0) {
        const blinkInterval = setInterval(() => {
          setIsBlinking(prev => !prev);
        }, 1000); // 1 second for 0.5Hz (2 seconds per cycle)
        
        return () => clearInterval(blinkInterval);
      } else {
        setIsBlinking(false);
      }
    }, [getUrgentControllingCount]);

    const handleClick = () => {
      openMessaging();
    };

    const urgentCount = getUrgentControllingCount();

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`relative hover:bg-[#058bc0]/10 hover:text-[#058bc0] transition-all duration-200 ${
          urgentCount > 0 && isBlinking ? 'bg-red-100 text-red-600 border-red-300' : ''
        }`}
      >
        <MessageCircle className={`h-5 w-5 ${urgentCount > 0 && isBlinking ? 'text-red-600' : ''}`} />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {urgentCount > 0 && (
          <Badge 
            variant="destructive" 
            className={`absolute -top-1 -right-8 h-5 w-5 p-0 flex items-center justify-center text-xs ${
              isBlinking ? 'bg-red-600 animate-pulse' : 'bg-red-500'
            }`}
            title={`${urgentCount} dringende Controlling-Nachricht${urgentCount > 1 ? 'en' : ''} ohne Verantwortung`}
          >
            âš ï¸
          </Badge>
        )}
        <span className="hidden sm:inline ml-2">Nachrichten</span>
      </Button>
    );
  } catch (error) {

    return (
      <Button variant="ghost" size="sm" disabled>
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline ml-2">Nachrichten (Error)</span>
      </Button>
    );
  }
};

export default MessagingButton;
