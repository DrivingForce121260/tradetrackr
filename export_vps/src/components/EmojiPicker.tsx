import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Search, Heart, Star, ThumbsUp, Clock, TrendingUp, X, Maximize2, Minimize2 } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
}

// Emoji-Kategorien mit häufig verwendeten Emojis
const emojiCategories = {
  'häufig': {
    icon: <Clock className="h-4 w-4" />,
    emojis: ['👍', '❤️', '😊', '😂', '🎉', '🔥', '💯', '👏', '🙏', '✨', '💪', '🎯', '🚀', '💡', '📌', '✅', '❌', '⚠️', 'ℹ️', '🔍', '💬', '📞', '📧', '📱', '💻', '🖥️', '📊', '📈', '📉', '💰', '💎']
  },
  'Gesichter': {
    icon: <Smile className="h-4 w-4" />,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓']
  },
  'Gesten': {
    icon: <ThumbsUp className="h-4 w-4" />,
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃']
  },
  'Symbole': {
    icon: <Heart className="h-4 w-4" />,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️']
  },
  'Aktivitäten': {
    icon: <Star className="h-4 w-4" />,
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏊', '🏊‍♂️', '🏊‍♀️', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎟️', '🎫', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻']
  },
  'Objekte': {
    icon: <TrendingUp className="h-4 w-4" />,
    emojis: ['💎', '🔪', '⚔️', '🗡️', '🛡️', '🔫', '🏹', '🪃', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧰', '🧲', '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🩻', '🩼', '🩽', '🩾', '🩿', '🪀', '🪜', '📌', '📍', '✂️', '🖇️', '📎', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '📏', '📐', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '🗒️', '📄', '📃', '📑', '📊', '📈', '📉', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚']
  }
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, trigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('häufig');
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: 150 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMaximized, setIsMaximized] = useState(false);

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
    // Don't close on select - keep open for multiple selections
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    } else {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height
      });
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setSize({ width: 400, height: 500 });
      setPosition({ x: window.innerWidth - 450, y: 150 });
    } else {
      setSize({ width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 });
      setPosition({ x: window.innerWidth * 0.1, y: window.innerHeight * 0.1 });
    }
    setIsMaximized(!isMaximized);
  };

  // Mouse move handlers for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(350, resizeStart.width + deltaX);
        const newHeight = Math.max(400, resizeStart.height + deltaY);
        
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;
        
        setSize({
          width: Math.min(newWidth, maxWidth),
          height: Math.min(newHeight, maxHeight)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart]);

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

  if (!isOpen) {
    return trigger || (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="hover:bg-blue-100 hover:text-blue-600 border-2 border-gray-300 hover:border-blue-400 transition-all hover:scale-110 shadow-sm"
        title="Emoji auswählen"
      >
        <Smile className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {trigger && <div onClick={() => setIsOpen(true)}>{trigger}</div>}
      <Card
        className="shadow-2xl border-4 border-[#058bc0] z-50 overflow-hidden"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: 10000
        }}
      >
        <CardHeader 
          className="p-4 cursor-move bg-gradient-to-r from-[#058bc0] to-[#0470a0] border-b-2 border-[#046a90]"
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Smile className="h-5 w-5 text-white" />
              </div>
              😊 Emoji Picker
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleMaximize}
                className="hover:bg-white/20 text-white border border-white/30 hover:border-white/60 transition-all hover:scale-110 shadow-md"
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="hover:bg-red-500/80 text-white border border-white/30 hover:border-red-200 transition-all hover:scale-110 shadow-md"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col" style={{ height: 'calc(100% - 68px)' }}>
        {/* Search Bar */}
        <div className="p-3 bg-gradient-to-r from-[#058bc0] to-[#0470a0] border-b-2 border-[#046a90]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="🔎 Emoji suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-2 border-white/30 focus:border-white focus:ring-2 focus:ring-white/50 bg-white/90"
            />
          </div>
        </div>

        {/* Kategorien */}
        {!searchTerm && (
          <div className="flex border-b-2 border-gray-200 overflow-x-auto bg-gradient-to-r from-blue-50 to-cyan-50">
            {Object.entries(emojiCategories).map(([category, { icon }]) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-4 transition-all font-semibold ${
                  selectedCategory === category
                    ? 'border-[#058bc0] text-[#058bc0] bg-white shadow-md'
                    : 'border-transparent text-gray-600 hover:text-[#058bc0] hover:bg-white/50'
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
          <div className="px-4 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 border-b-2 border-blue-200">
            <h3 className="text-sm font-bold text-gray-800 capitalize flex items-center gap-2">
              <span className="text-lg">📂</span>
              {selectedCategory}
            </h3>
          </div>
        )}

        {/* Emoji-Grid */}
        <ScrollArea className="flex-1" style={{ height: 'calc(100% - 120px)' }}>
          <div className="p-4 bg-gradient-to-br from-white to-blue-50">
            <div className="grid grid-cols-8 gap-2">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-10 h-10 text-2xl hover:bg-gradient-to-br hover:from-blue-100 hover:to-cyan-100 rounded-lg transition-all hover:scale-125 flex items-center justify-center border-2 border-transparent hover:border-[#058bc0] shadow-sm hover:shadow-md"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {filteredEmojis.length === 0 && (
              <div className="text-center py-12">
                <Smile className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Keine Emojis gefunden</p>
                <p className="text-gray-400 text-sm mt-1">Versuchen Sie einen anderen Suchbegriff</p>
              </div>
            )}
          </div>
        </ScrollArea>
        </CardContent>

        {/* Resize Handle - Bottom Right Corner */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-[#058bc0] hover:bg-[#0470a0] rounded-tl-md z-10"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        >
          <div className="w-full h-full flex items-end justify-end p-1">
            <div className="w-3 h-3 border-r-2 border-b-2 border-white rounded-br-sm"></div>
          </div>
        </div>
        
        {/* Resize Handle - Bottom Edge */}
        <div
          className="absolute bottom-0 left-0 right-6 h-2 cursor-s-resize z-10"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        />
        
        {/* Resize Handle - Right Edge */}
        <div
          className="absolute top-0 right-0 bottom-6 w-2 cursor-e-resize z-10"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        />
      </Card>
    </>
  );
};

export default EmojiPicker;
