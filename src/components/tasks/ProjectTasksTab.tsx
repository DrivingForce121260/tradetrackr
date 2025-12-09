import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TaskBoard from '@/components/tasks/TaskBoard';
import { TaskService } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { TaskItem } from '@/types/tasks';

export const ProjectTasksTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [mode, setMode] = useState<'board'|'list'>('board');
  const [svc, setSvc] = useState<TaskService | null>(null);
  useEffect(()=>{ if (user?.concernID && user.uid) setSvc(new TaskService(user.concernID, user.uid)); }, [user]);
  const load = async () => { if (!svc) return; setTasks(await svc.list({ projectId })); };
  useEffect(()=>{ load(); }, [svc, projectId]);

  if (mode === 'board') {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-gray-600">Projekt: {projectId}</div>
          <Button variant="outline" size="sm" onClick={()=>setMode('list')}>Listenansicht</Button>
        </div>
        <TaskBoard onBack={undefined} onOpenMessaging={undefined} />
      </div>
    );
  }
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Aufgaben (Liste)</CardTitle>
        <Button variant="outline" size="sm" onClick={()=>setMode('board')}>Kanban</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="p-3 bg-white border rounded flex justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">{t.description}</div>
              </div>
              <div className="text-xs text-gray-600">{t.status} · {t.priority}</div>
            </div>
          ))}
          {tasks.length===0 && <div className="text-sm text-gray-500">Keine Aufgaben im Projekt.</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectTasksTab;















