/**
 * Wünsch-dir-was Button Component
 * Reusable button that opens the feature request modal
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { WuenschDirWasModal } from './WuenschDirWasModal';
import { useAuth } from '@/hooks/useAuth';

export interface WuenschDirWasButtonProps {
  /** Optional module name (e.g., "projects", "reports") */
  module?: string;
  /** Optional entity ID (e.g., projectId, reportId) */
  entityId?: string;
  /** Optional custom className */
  className?: string;
}

export const WuenschDirWasButton: React.FC<WuenschDirWasButtonProps> = ({
  module,
  entityId,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variant="outline"
        className={`${className} relative overflow-hidden group transition-all duration-300`}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Sparkle icon with animation */}
        <Sparkles 
          className={`mr-2 h-4 w-4 relative z-10 transition-transform duration-300 ${
            isHovered ? 'animate-pulse scale-110' : ''
          }`} 
        />
        
        {/* Button text */}
        <span className="relative z-10 font-semibold">Wünsch-dir-was</span>
        
        {/* Shimmer effect on hover */}
        {isHovered && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        )}
      </Button>

      <WuenschDirWasModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        route={location.pathname}
        module={module}
        entityId={entityId}
      />
    </>
  );
};

