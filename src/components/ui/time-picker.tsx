import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className = '' }) => {
  const [hour, setHour] = useState(value.split(':')[0] || '08');
  const [minute, setMinute] = useState(value.split(':')[1] || '00');
  const [open, setOpen] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const handleSelect = (h: string, m: string) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
  };

  const handleQuickSelect = (h: string, m: string) => {
    handleSelect(h, m);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      {/* Text Input */}
      <input
        type="time"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const [h, m] = e.target.value.split(':');
          setHour(h);
          setMinute(m);
        }}
        className={`flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${className}`}
      />
      
      {/* Clock Picker Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="px-3 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <Clock className="h-5 w-5 text-gray-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 border-2 border-green-500 shadow-xl" align="end">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-t-md">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{hour}:{minute}</div>
              <div className="text-xs opacity-90">Stunden : Minuten</div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-gray-50 p-3 border-b-2 border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-2">⚡ Schnellwahl:</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '🌅 08:00', h: '08', m: '00' },
                { label: '🕐 12:00', h: '12', m: '00' },
                { label: '🕔 17:00', h: '17', m: '00' },
                { label: '🌙 18:00', h: '18', m: '00' }
              ].map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickSelect(preset.h, preset.m)}
                  className="text-xs border-2 border-gray-300 hover:border-green-500 hover:bg-green-50"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Selectors */}
          <div className="p-4 grid grid-cols-2 gap-4">
            {/* Hours */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2 text-center">Stunden</div>
              <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-md bg-white scrollbar-thin scrollbar-thumb-green-400 scrollbar-track-gray-200">
                {hours.map((h) => (
                  <button
                    key={h}
                    onClick={() => handleSelect(h, minute)}
                    className={`w-full px-3 py-2 text-sm font-medium transition-all hover:bg-green-100 ${
                      h === hour 
                        ? 'bg-green-500 text-white font-bold' 
                        : 'text-gray-700 hover:text-green-700'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2 text-center">Minuten</div>
              <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-md bg-white scrollbar-thin scrollbar-thumb-green-400 scrollbar-track-gray-200">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelect(hour, m)}
                    className={`w-full px-3 py-2 text-sm font-medium transition-all hover:bg-green-100 ${
                      m === minute 
                        ? 'bg-green-500 text-white font-bold' 
                        : 'text-gray-700 hover:text-green-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t-2 border-gray-200 flex justify-end gap-2 rounded-b-md">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50"
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              ✓ OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};













