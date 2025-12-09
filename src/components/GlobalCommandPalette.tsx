import React, { useEffect } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: string) => void;
  onOpenMessaging: () => void;
}

const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({ isOpen, onOpenChange, onNavigate, onOpenMessaging }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onOpenChange]);

  const go = (page: string) => {
    onNavigate(page);
    onOpenChange(false);
  };

  const openMessaging = () => {
    onOpenMessaging();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Suchen oder Befehl eingeben..." />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go('dashboard')}>Dashboard<CommandShortcut>Home</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go('projects')}>Projekte</CommandItem>
          <CommandItem onSelect={() => go('tasks')}>Aufgaben</CommandItem>
          <CommandItem onSelect={() => go('crm')}>CRM</CommandItem>
          <CommandItem onSelect={() => go('reports')}>Reports</CommandItem>
          <CommandItem onSelect={() => go('customers')}>Kunden</CommandItem>
          <CommandItem onSelect={() => go('materials')}>Material</CommandItem>
          <CommandItem onSelect={() => go('users')}>Benutzer</CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Aktionen">
          <CommandItem onSelect={() => go('new-project')}>Neues Projekt</CommandItem>
          <CommandItem onSelect={() => go('new-task')}>Neue Aufgabe</CommandItem>
          <CommandItem onSelect={() => go('new-customer')}>Neuer Kunde</CommandItem>
          <CommandItem onSelect={() => go('new-report')}>Neuer Report</CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Messaging">
          <CommandItem onSelect={openMessaging}>Messaging öffnen<CommandShortcut>Ctrl/Cmd+M</CommandShortcut></CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalCommandPalette;















