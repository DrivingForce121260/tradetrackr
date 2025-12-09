/**
 * Project Badge Component
 * Displays project type and name with color coding
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase, Shield, Users, Wallet, GraduationCap, Server } from 'lucide-react';

interface ProjectBadgeProps {
  projectName: string;
  projectType?: 'external' | 'internal';
  internalCategory?: string;
}

export function ProjectBadge({ projectName, projectType, internalCategory }: ProjectBadgeProps) {
  // Internal project badges with category icons
  if (projectType === 'internal') {
    const categoryConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      personnel: {
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: <Users className="w-3 h-3" />,
        label: 'Personal'
      },
      finance: {
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: <Wallet className="w-3 h-3" />,
        label: 'Finanzen'
      },
      admin: {
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <Shield className="w-3 h-3" />,
        label: 'Admin'
      },
      compliance: {
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        icon: <Shield className="w-3 h-3" />,
        label: 'Compliance'
      },
      training: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: <GraduationCap className="w-3 h-3" />,
        label: 'Schulung'
      },
      it: {
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: <Server className="w-3 h-3" />,
        label: 'IT'
      }
    };

    const config = categoryConfig[internalCategory || 'admin'] || categoryConfig.admin;

    return (
      <Badge className={`${config.color} border flex items-center space-x-1 font-semibold`}>
        {config.icon}
        <span className="text-xs">{config.label}</span>
      </Badge>
    );
  }

  // External project badge
  return (
    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 border flex items-center space-x-1 font-semibold">
      <Briefcase className="w-3 h-3" />
      <span className="text-xs truncate max-w-[150px]">{projectName}</span>
    </Badge>
  );
}

export default ProjectBadge;








