import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Search, Heart, Star, ThumbsUp, Clock, TrendingUp } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
}

// Emoji-Kategorien mit hö¤ufig verwendeten Emojis
const emojiCategories = {
  'hö¤ufig': {
    icon: <Clock className="h-4 w-4" />,
    emojis: ['ðŸ‘', 'â¤ï¸', 'ðŸ˜Š', 'ðŸ˜‚', 'ðŸŽ‰', 'ðŸ”¥', 'ðŸ’¯', 'ðŸ‘', 'ðŸ™', 'âœ¨', 'ðŸ’ª', 'ðŸŽ¯', 'ðŸš€', 'ðŸ’¡', 'ðŸ“', 'âœ…', 'âŒ', 'âš ï¸', 'â„¹ï¸', 'ðŸ”', 'ðŸ’¬', 'ðŸ“ž', 'ðŸ“§', 'ðŸ“±', 'ðŸ’»', 'ðŸ–¥ï¸', 'ðŸ“Š', 'ðŸ“ˆ', 'ðŸ“‰', 'ðŸ’°', 'ðŸ’Ž']
  },
  'Gesichter': {
    icon: <Smile className="h-4 w-4" />,
    emojis: ['ðŸ˜€', 'ðŸ˜ƒ', 'ðŸ˜„', 'ðŸ˜', 'ðŸ˜†', 'ðŸ˜…', 'ðŸ˜‚', 'ðŸ¤£', 'ðŸ˜Š', 'ðŸ˜‡', 'ðŸ™‚', 'ðŸ™ƒ', 'ðŸ˜‰', 'ðŸ˜Œ', 'ðŸ˜', 'ðŸ¥°', 'ðŸ˜˜', 'ðŸ˜—', 'ðŸ˜™', 'ðŸ˜š', 'ðŸ˜‹', 'ðŸ˜›', 'ðŸ˜', 'ðŸ˜œ', 'ðŸ¤ª', 'ðŸ¤¨', 'ðŸ§', 'ðŸ¤“', 'ðŸ˜Ž', 'ðŸ¤©', 'ðŸ¥³', 'ðŸ˜', 'ðŸ˜’', 'ðŸ˜ž', 'ðŸ˜”', 'ðŸ˜Ÿ', 'ðŸ˜•', 'ðŸ™', 'â˜¹ï¸', 'ðŸ˜£', 'ðŸ˜–', 'ðŸ˜«', 'ðŸ˜©', 'ðŸ¥º', 'ðŸ˜¢', 'ðŸ˜­', 'ðŸ˜¤', 'ðŸ˜ ', 'ðŸ˜¡', 'ðŸ¤¬', 'ðŸ¤¯', 'ðŸ˜³', 'ðŸ¥µ', 'ðŸ¥¶', 'ðŸ˜±', 'ðŸ˜¨', 'ðŸ˜°', 'ðŸ˜¥', 'ðŸ˜“', 'ðŸ¤—', 'ðŸ¤”', 'ðŸ¤­', 'ðŸ¤«', 'ðŸ¤¥', 'ðŸ˜¶', 'ðŸ˜', 'ðŸ˜‘', 'ðŸ˜¯', 'ðŸ˜¦', 'ðŸ˜§', 'ðŸ˜®', 'ðŸ˜²', 'ðŸ˜´', 'ðŸ¤¤', 'ðŸ˜ª', 'ðŸ˜µ', 'ðŸ¤', 'ðŸ¥´', 'ðŸ¤¢', 'ðŸ¤®', 'ðŸ¤§', 'ðŸ˜·', 'ðŸ¤’', 'ðŸ¤•', 'ðŸ¤‘', 'ðŸ¤ ', 'ðŸ’©', 'ðŸ‘»', 'ðŸ‘½', 'ðŸ‘¾', 'ðŸ¤–', 'ðŸ˜ˆ', 'ðŸ‘¿', 'ðŸ‘¹', 'ðŸ‘º', 'ðŸ’€', 'â˜ ï¸', 'ðŸ‘»', 'ðŸ‘½', 'ðŸ‘¾', 'ðŸ¤–', 'ðŸ˜º', 'ðŸ˜¸', 'ðŸ˜¹', 'ðŸ˜»', 'ðŸ˜¼', 'ðŸ˜½', 'ðŸ™€', 'ðŸ˜¿', 'ðŸ˜¾', 'ðŸ™ˆ', 'ðŸ™‰', 'ðŸ™Š', 'ðŸ’Œ', 'ðŸ’˜', 'ðŸ’', 'ðŸ’–', 'ðŸ’—', 'ðŸ’“', 'ðŸ’ž', 'ðŸ’•', 'ðŸ’Ÿ', 'â£ï¸', 'ðŸ’”', 'â¤ï¸', 'ðŸ§¡', 'ðŸ’›', 'ðŸ’š', 'ðŸ’™', 'ðŸ’œ', 'ðŸ–¤', 'ðŸ’¯', 'ðŸ’¢', 'ðŸ’¥', 'ðŸ’«', 'ðŸ’¦', 'ðŸ’¨', 'ðŸ•³ï¸', 'ðŸ’¬', 'ðŸ—¨ï¸', 'ðŸ—¯ï¸', 'ðŸ’­', 'ðŸ’¤']
  },
  'Gesten': {
    icon: <ThumbsUp className="h-4 w-4" />,
    emojis: ['ðŸ‘‹', 'ðŸ¤š', 'ðŸ–ï¸', 'âœ‹', 'ðŸ––', 'ðŸ‘Œ', 'ðŸ¤Œ', 'ðŸ¤', 'âœŒï¸', 'ðŸ¤ž', 'ðŸ¤Ÿ', 'ðŸ¤˜', 'ðŸ¤™', 'ðŸ‘ˆ', 'ðŸ‘‰', 'ðŸ‘†', 'ðŸ–•', 'ðŸ‘‡', 'â˜ï¸', 'ðŸ‘', 'ðŸ‘Ž', 'âœŠ', 'ðŸ‘Š', 'ðŸ¤›', 'ðŸ¤œ', 'ðŸ‘', 'ðŸ™Œ', 'ðŸ‘', 'ðŸ¤²', 'ðŸ¤', 'ðŸ™', 'âœï¸', 'ðŸ’ª', 'ðŸ¦¾', 'ðŸ¦¿', 'ðŸ¦µ', 'ðŸ¦¶', 'ðŸ‘‚', 'ðŸ¦»', 'ðŸ‘ƒ', 'ðŸ§ ', 'ðŸ«€', 'ðŸ«', 'ðŸ¦·', 'ðŸ¦´', 'ðŸ‘€', 'ðŸ‘ï¸', 'ðŸ‘…', 'ðŸ‘„', 'ðŸ’‹', 'ðŸ©¸', 'ðŸ«¦', 'ðŸ«‚', 'ðŸ’€', 'ðŸ¦µ', 'ðŸ¦¶', 'ðŸ‘‚', 'ðŸ¦»', 'ðŸ‘ƒ', 'ðŸ§ ', 'ðŸ«€', 'ðŸ«', 'ðŸ¦·', 'ðŸ¦´', 'ðŸ‘€', 'ðŸ‘ï¸', 'ðŸ‘…', 'ðŸ‘„', 'ðŸ’‹', 'ðŸ©¸', 'ðŸ«¦', 'ðŸ«‚']
  },
  'Natur': {
    icon: <Heart className="h-4 w-4" />,
    emojis: ['ðŸŒ±', 'ðŸŒ²', 'ðŸŒ³', 'ðŸŒ´', 'ðŸŒµ', 'ðŸŒ¾', 'ðŸŒ¿', 'â˜˜ï¸', 'ðŸ€', 'ðŸ', 'ðŸ‚', 'ðŸƒ', 'ðŸŒº', 'ðŸŒ¸', 'ðŸŒ¼', 'ðŸŒ»', 'ðŸŒž', 'ðŸŒ', 'ðŸŒ›', 'ðŸŒœ', 'ðŸŒš', 'ðŸŒ•', 'ðŸŒ–', 'ðŸŒ—', 'ðŸŒ˜', 'ðŸŒ‘', 'ðŸŒ’', 'ðŸŒ“', 'ðŸŒ”', 'ðŸŒ™', 'ðŸŒŽ', 'ðŸŒ', 'ðŸŒ', 'ðŸ’«', 'â­', 'ðŸŒŸ', 'âœ¨', 'âš¡', 'â˜„ï¸', 'ðŸ’¥', 'ðŸ”¥', 'ðŸŒªï¸', 'ðŸŒˆ', 'â˜€ï¸', 'ðŸŒ¤ï¸', 'â›…', 'ðŸŒ¥ï¸', 'â˜ï¸', 'ðŸŒ¦ï¸', 'ðŸŒ§ï¸', 'â›ˆï¸', 'ðŸŒ©ï¸', 'ðŸŒ¨ï¸', 'â˜ƒï¸', 'â›„', 'ðŸŒ¬ï¸', 'ðŸ’¨', 'ðŸ’§', 'ðŸ’¦', 'â˜”', 'â˜‚ï¸', 'ðŸŒŠ', 'ðŸŒ«ï¸', 'ðŸ', 'ðŸŽ', 'ðŸ', 'ðŸŠ', 'ðŸ‹', 'ðŸŒ', 'ðŸ‰', 'ðŸ‡', 'ðŸ“', 'ðŸ«', 'ðŸˆ', 'ðŸ’', 'ðŸ‘', 'ðŸ¥­', 'ðŸ', 'ðŸ¥¥', 'ðŸ¥', 'ðŸ…', 'ðŸ†', 'ðŸ¥‘', 'ðŸ¥¦', 'ðŸ¥¬', 'ðŸ¥’', 'ðŸŒ¶ï¸', 'ðŸ«‘', 'ðŸŒ½', 'ðŸ¥•', 'ðŸ«’', 'ðŸ§„', 'ðŸ§…', 'ðŸ¥”', 'ðŸ ', 'ðŸ¥', 'ðŸ¥¯', 'ðŸž', 'ðŸ¥–', 'ðŸ¥¨', 'ðŸ§€', 'ðŸ¥š', 'ðŸ³', 'ðŸ§ˆ', 'ðŸ¥ž', 'ðŸ§‡', 'ðŸ¥“', 'ðŸ¥©', 'ðŸ—', 'ðŸ–', 'ðŸ¦´', 'ðŸŒ­', 'ðŸ”', 'ðŸŸ', 'ðŸ•', 'ðŸ¥ª', 'ðŸ¥™', 'ðŸ§†', 'ðŸŒ®', 'ðŸŒ¯', 'ðŸ«”', 'ðŸ¥—', 'ðŸ¥˜', 'ðŸ«•', 'ðŸ¥«', 'ðŸ', 'ðŸœ', 'ðŸ²', 'ðŸ›', 'ðŸ£', 'ðŸ±', 'ðŸ¥Ÿ', 'ðŸ¦ª', 'ðŸ¤', 'ðŸ™', 'ðŸš', 'ðŸ˜', 'ðŸ¥', 'ðŸ¥ ', 'ðŸ¥®', 'ðŸ¢', 'ðŸ¡', 'ðŸ§', 'ðŸ¨', 'ðŸ¦', 'ðŸ¥§', 'ðŸ§', 'ðŸ°', 'ðŸŽ‚', 'ðŸ®', 'ðŸ­', 'ðŸ¬', 'ðŸ«', 'ðŸ¿', 'ðŸ©', 'ðŸª', 'ðŸŒ°', 'ðŸ¥œ', 'ðŸ¯', 'ðŸ¥›', 'ðŸ¼', 'ðŸ«–', 'â˜•', 'ðŸµ', 'ðŸ§ƒ', 'ðŸ¥¤', 'ðŸ§‹', 'ðŸ¶', 'ðŸº', 'ðŸ·', 'ðŸ¥‚', 'ðŸ¥ƒ', 'ðŸ¸', 'ðŸ¹', 'ðŸ§‰', 'ðŸ¾', 'ðŸ§Š', 'ðŸ¥„', 'ðŸ´', 'ðŸ½ï¸', 'ðŸ¥¡', 'ðŸ¥¢', 'ðŸ§‚', 'ðŸ¥£', 'ðŸ¥¡', 'ðŸ¥¢', 'ðŸ§‚', 'ðŸ¥£', 'ðŸ¥¡', 'ðŸ¥¢', 'ðŸ§‚', 'ðŸ¥£']
  },
  'Aktivitö¤ten': {
    icon: <Star className="h-4 w-4" />,
    emojis: ['âš½', 'ðŸ€', 'ðŸˆ', 'âš¾', 'ðŸ¥Ž', 'ðŸŽ¾', 'ðŸ', 'ðŸ‰', 'ðŸ¥', 'ðŸŽ±', 'ðŸª€', 'ðŸ“', 'ðŸ¸', 'ðŸ’', 'ðŸ‘', 'ðŸ¥', 'ðŸ', 'ðŸ¥…', 'â›³', 'ðŸª', 'ðŸ¹', 'ðŸŽ£', 'ðŸ¤¿', 'ðŸ¥Š', 'ðŸ¥‹', 'ðŸŽ½', 'ðŸ›¹', 'ðŸ›·ï¸', 'â›¸ï¸', 'ðŸ¥Œ', 'ðŸŽ¿', 'â›·ï¸', 'ðŸ‚', 'ðŸª‚', 'ðŸ‹ï¸', 'ðŸ¤¼', 'ðŸ¤¸', 'â›¹ï¸', 'ðŸ¤º', 'ðŸ¤¾', 'ðŸŠ', 'ðŸŠâ€â™‚ï¸', 'ðŸŠâ€â™€ï¸', 'ðŸ¤½', 'ðŸ¤½â€â™‚ï¸', 'ðŸ¤½â€â™€ï¸', 'ðŸš£', 'ðŸš£â€â™‚ï¸', 'ðŸš£â€â™€ï¸', 'ðŸ§—', 'ðŸ§—â€â™‚ï¸', 'ðŸ§—â€â™€ï¸', 'ðŸšµ', 'ðŸšµâ€â™‚ï¸', 'ðŸšµâ€â™€ï¸', 'ðŸš´', 'ðŸš´â€â™‚ï¸', 'ðŸš´â€â™€ï¸', 'ðŸ†', 'ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰', 'ðŸ…', 'ðŸŽ–ï¸', 'ðŸµï¸', 'ðŸŽ—ï¸', 'ðŸŽŸï¸', 'ðŸŽ«', 'ðŸŽ­', 'ðŸŽ¨', 'ðŸŽ¬', 'ðŸŽ¤', 'ðŸŽ§', 'ðŸŽ¼', 'ðŸŽ¹', 'ðŸ¥', 'ðŸª˜', 'ðŸŽ·', 'ðŸŽº', 'ðŸª—', 'ðŸŽ¸', 'ðŸª•', 'ðŸŽ»', 'ðŸŽ²', 'â™Ÿï¸', 'ðŸŽ¯', 'ðŸŽ³', 'ðŸŽ®', 'ðŸŽ°', 'ðŸ§©', 'ðŸŽ¨', 'ðŸ“±', 'ðŸ“²', 'ðŸ’»', 'âŒ¨ï¸', 'ðŸ–¥ï¸', 'ðŸ–¨ï¸', 'ðŸ–±ï¸', 'ðŸ–²ï¸', 'ðŸ•¹ï¸', 'ðŸŽ®', 'ðŸŽ°', 'ðŸŽ²', 'â™Ÿï¸', 'ðŸŽ¯', 'ðŸŽ³', 'ðŸŽ®', 'ðŸŽ°', 'ðŸ§©', 'ðŸŽ¨', 'ðŸ“±', 'ðŸ“²', 'ðŸ’»', 'âŒ¨ï¸', 'ðŸ–¥ï¸', 'ðŸ–¨ï¸', 'ðŸ–±ï¸', 'ðŸ–²ï¸', 'ðŸ•¹ï¸']
  },
  'Objekte': {
    icon: <TrendingUp className="h-4 w-4" />,
    emojis: ['ðŸ’Ž', 'ðŸ”ª', 'âš”ï¸', 'ðŸ—¡ï¸', 'ðŸ›¡ï¸', 'ðŸ”«', 'ðŸ¹', 'ðŸªƒ', 'ðŸ”§', 'ðŸ”¨', 'âš’ï¸', 'ðŸ› ï¸', 'â›ï¸', 'ðŸ”©', 'âš™ï¸', 'ðŸ§°', 'ðŸ§²', 'âš—ï¸', 'ðŸ§ª', 'ðŸ§«', 'ðŸ§¬', 'ðŸ”¬', 'ðŸ”­', 'ðŸ“¡', 'ðŸ’‰', 'ðŸ©¸', 'ðŸ’Š', 'ðŸ©¹', 'ðŸ©º', 'ðŸ©»', 'ðŸ©¼', 'ðŸ©½', 'ðŸ©¾', 'ðŸ©¿', 'ðŸª', 'ðŸªœ', 'ðŸ§°', 'ðŸ§²', 'âš—ï¸', 'ðŸ§ª', 'ðŸ§«', 'ðŸ§¬', 'ðŸ”¬', 'ðŸ”­', 'ðŸ“¡', 'ðŸ’‰', 'ðŸ©¸', 'ðŸ’Š', 'ðŸ©¹', 'ðŸ©º', 'ðŸ©»', 'ðŸ©¼', 'ðŸ©½', 'ðŸ©¾', 'ðŸ©¿', 'ðŸª', 'ðŸªœ', 'ðŸ§°', 'ðŸ§²', 'âš—ï¸', 'ðŸ§ª', 'ðŸ§«', 'ðŸ§¬', 'ðŸ”¬', 'ðŸ”­', 'ðŸ“¡', 'ðŸ’‰', 'ðŸ©¸', 'ðŸ’Š', 'ðŸ©¹', 'ðŸ©º', 'ðŸ©»', 'ðŸ©¼', 'ðŸ©½', 'ðŸ©¾', 'ðŸ©¿', 'ðŸª', 'ðŸªœ', 'ðŸ§°', 'ðŸ§²', 'âš—ï¸', 'ðŸ§ª', 'ðŸ§«', 'ðŸ§¬', 'ðŸ”¬', 'ðŸ”­', 'ðŸ“¡', 'ðŸ’‰', 'ðŸ©¸', 'ðŸ’Š', 'ðŸ©¹', 'ðŸ©º', 'ðŸ©»', 'ðŸ©¼', 'ðŸ©½', 'ðŸ©¾', 'ðŸ©¿', 'ðŸª', 'ðŸªœ']
  }
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, trigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('hö¤ufig');
  const [isOpen, setIsOpen] = useState(false);

  // Alle Emojis für die Suche sammeln
  const allEmojis = Object.values(emojiCategories).flatMap(category => category.emojis);
  
  // Gefilterte Emojis basierend auf Suchbegriff
  const filteredEmojis = searchTerm 
    ? allEmojis.filter(emoji => {
        // Einfache Text-Suche (kann erweitert werden)
        return emoji.includes(searchTerm);
      })
    : emojiCategories[selectedCategory as keyof typeof emojiCategories]?.emojis || [];

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
  };

  // Keyboard-Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Tab':
          // Tab-Navigation innerhalb des Picker
          e.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <Input
            placeholder="Emoji suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
            startIcon={<Search className="h-3 w-3" />}
          />
        </div>

        {/* Kategorien */}
        {!searchTerm && (
          <div className="flex border-b overflow-x-auto">
            {Object.entries(emojiCategories).map(([category, { icon }]) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  selectedCategory === category
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {icon}
                <span className="capitalize">{category}</span>
              </button>
            ))}
          </div>
        )}

        {/* Kategorie-Titel */}
        {!searchTerm && (
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-sm font-medium text-gray-700 capitalize">
              {selectedCategory}
            </h3>
          </div>
        )}

        {/* Emoji-Grid */}
        <ScrollArea className="h-64">
          <div className="p-3">
            <div className="grid grid-cols-8 gap-2">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {filteredEmojis.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Smile className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keine Emojis gefunden</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
