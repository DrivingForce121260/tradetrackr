import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CommentBoxProps {
  comments: { id: string; userId: string; text: string; createdAt: string }[];
  onAdd: (text: string) => Promise<void>;
}

export const CommentBox: React.FC<CommentBoxProps> = ({ comments, onAdd }) => {
  const [text, setText] = useState('');
  const add = async () => {
    if (!text.trim()) return;
    await onAdd(text.trim());
    setText('');
  };
  const mentionHint = useMemo(() => text.includes('@'), [text]);
  return (
    <div className="space-y-2">
      <div className="max-h-40 overflow-auto space-y-1">
        {comments.map(c => (
          <div key={c.id} className="text-sm bg-gray-50 p-2 rounded border">
            <div className="text-gray-500 text-xs">{c.userId} · {new Date(c.createdAt).toLocaleString('de-DE')}</div>
            <div className="whitespace-pre-wrap">{c.text}</div>
          </div>
        ))}
        {comments.length === 0 && <div className="text-sm text-gray-500">Noch keine Kommentare.</div>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Kommentar schreiben… (@mention)" value={text} onChange={e=>setText(e.target.value)} />
        <Button onClick={add}>Senden</Button>
      </div>
      {mentionHint && <div className="text-xs text-gray-500">Hinweis: @mention löst später Benachrichtigungen aus (Platzhalter).</div>}
    </div>
  );
};

export default CommentBox;















