import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import AppHeader from './AppHeader';

interface HeaderProps {
  onCreateProject: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateProject, searchTerm, onSearchChange }) => {
  return (
    <AppHeader title="Projektmanagement">
      <div className="flex items-center space-x-4 justify-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Projekte suchen..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <Button
          onClick={onCreateProject}
          className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Projekt
        </Button>
      </div>
    </AppHeader>
  );
};

export default Header;
