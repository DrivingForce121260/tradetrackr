// ============================================================================
// TASK INTERFACES AND TYPES
// ============================================================================

import { BackNavigationProps, ManagementProps, NavigationProps } from './common';

export interface Task {
  id: string;
  projectId?: string;
  taskNumber: string;
  projectNumber: string;
  projectName?: string;
  title: string;
  description: string;
  assignedTo?: string;
  employee: string;
  customer: string;
  workLocation: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt?: string;
}

// Task Status and Priority Types
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

// Task Props Interfaces
export interface TasksDashboardProps extends BackNavigationProps {}

export interface TaskManagementProps extends NavigationProps {}
