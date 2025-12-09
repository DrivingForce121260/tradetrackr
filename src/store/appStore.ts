/**
 * Application Store (Zustand)
 * Manages timer state, active project/task, sync status
 */

import { create } from 'zustand';
import { ProjectId, TaskId, TimeEntry, Timestamp } from '../types';

interface TimerState {
  running: boolean;
  projectId?: ProjectId;
  taskId?: TaskId;
  startTime?: number; // ms timestamp
}

interface AppState {
  activeProjectId?: ProjectId;
  activeTaskId?: TaskId;
  timer: TimerState;
  lastSync?: number; // ms timestamp

  // Actions
  setActiveProject: (projectId?: ProjectId) => void;
  setActiveTask: (taskId?: TaskId) => void;
  startTimer: (projectId: ProjectId, taskId?: TaskId) => void;
  pauseTimer: () => void;
  stopTimer: () => Partial<TimeEntry> | null;
  setLastSync: (timestampMs: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeProjectId: undefined,
  activeTaskId: undefined,
  timer: {
    running: false,
  },
  lastSync: undefined,

  setActiveProject: (projectId) => {
    set({ activeProjectId: projectId });
  },

  setActiveTask: (taskId) => {
    set({ activeTaskId: taskId });
  },

  startTimer: (projectId, taskId) => {
    set({
      timer: {
        running: true,
        projectId,
        taskId,
        startTime: Date.now(),
      },
      activeProjectId: projectId,
      activeTaskId: taskId,
    });
  },

  pauseTimer: () => {
    // TODO: For a real pause/resume, we'd need to track elapsed time separately
    set((state) => ({
      timer: {
        ...state.timer,
        running: false,
      },
    }));
  },

  stopTimer: () => {
    const { timer } = get();
    
    if (!timer.startTime || !timer.projectId) {
      return null;
    }

    const now = Date.now();
    const startTimestamp: Timestamp = {
      seconds: Math.floor(timer.startTime / 1000),
      nanoseconds: (timer.startTime % 1000) * 1000000,
    };
    const endTimestamp: Timestamp = {
      seconds: Math.floor(now / 1000),
      nanoseconds: (now % 1000) * 1000000,
    };

    // Return a TimeEntry-like object (will need tenantId, userId from authStore)
    const timeEntryData: Partial<TimeEntry> = {
      projectId: timer.projectId,
      taskId: timer.taskId,
      start: startTimestamp,
      end: endTimestamp,
      source: 'timer',
      confirmed: false,
    };

    // Reset timer
    set({
      timer: {
        running: false,
      },
    });

    return timeEntryData;
  },

  setLastSync: (timestampMs) => {
    set({ lastSync: timestampMs });
  },
}));








