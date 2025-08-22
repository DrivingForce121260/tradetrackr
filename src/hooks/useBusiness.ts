// ============================================================================
// OPTIMIZED BUSINESS HOOKS
// ============================================================================
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Project, Task, Customer } from '@/types';

// Project management hook
export interface ProjectFilters {
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: Date;
  category?: string;
}

export function useProject(initialProjects: Project[] = []) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (Object.keys(filters).length === 0) return projects;

    return projects.filter(project => {
      if (filters.status && project.status !== filters.status) return false;
      if (filters.priority && project.priority !== filters.priority) return false;
      if (filters.assignee && project.assignee !== filters.assignee) return false;
      if (filters.category && project.category !== filters.category) return false;
      if (filters.dueDate && project.dueDate && new Date(project.dueDate) > filters.dueDate) return false;
      return true;
    });
  }, [projects, filters]);

  // Project statistics
  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const overdue = projects.filter(p => {
      if (!p.dueDate || p.status === 'completed') return false;
      return new Date(p.dueDate) < new Date();
    }).length;

    return { total, active, completed, overdue };
  }, [projects]);

  // Add project
  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(), // Simple ID generation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  // Update project
  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === id 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ));
  }, []);

  // Delete project
  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
    }
  }, [selectedProject]);

  // Set filters
  const setProjectFilters = useCallback((newFilters: Partial<ProjectFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    projects: filteredProjects,
    allProjects: projects,
    selectedProject,
    filters,
    projectStats,
    addProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    setProjectFilters,
    clearFilters,
  };
}

// Task management hook
export interface TaskFilters {
  status?: string;
  priority?: string;
  assignee?: string;
  projectId?: string;
  dueDate?: Date;
}

export function useTask(initialTasks: Task[] = []) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (Object.keys(filters).length === 0) return tasks;

    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignee && task.assignee !== filters.assignee) return false;
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.dueDate && task.dueDate && new Date(task.dueDate) > filters.dueDate) return false;
      return true;
    });
  }, [tasks, filters]);

  // Task statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, pending, inProgress, completed, overdue };
  }, [tasks]);

  // Add task
  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  // Update task
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => 
      t.id === id 
        ? { ...t, ...updates, updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  // Delete task
  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }
  }, [selectedTask]);

  // Set filters
  const setTaskFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearTaskFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    selectedTask,
    filters,
    taskStats,
    addTask,
    updateTask,
    deleteTask,
    setSelectedTask,
    setTaskFilters,
    clearTaskFilters,
  };
}

// Customer management hook
export interface CustomerFilters {
  status?: string;
  category?: string;
  region?: string;
  searchTerm?: string;
}

export function useCustomer(initialCustomers: Customer[] = []) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (Object.keys(filters).length === 0) return customers;

    return customers.filter(customer => {
      if (filters.status && customer.status !== filters.status) return false;
      if (filters.category && customer.category !== filters.category) return false;
      if (filters.region && customer.region !== filters.region) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [customers, filters]);

  // Customer statistics
  const customerStats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    const newThisMonth = customers.filter(c => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return { total, active, inactive, newThisMonth };
  }, [customers]);

  // Add customer
  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  // Update customer
  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => 
      c.id === id 
        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
        : c
    ));
  }, []);

  // Delete customer
  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (selectedCustomer?.id === id) {
      setSelectedCustomer(null);
    }
  }, [selectedCustomer]);

  // Set filters
  const setCustomerFilters = useCallback((newFilters: Partial<CustomerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearCustomerFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    customers: filteredCustomers,
    allCustomers: customers,
    selectedCustomer,
    filters,
    customerStats,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setSelectedCustomer,
    setCustomerFilters,
    clearCustomerFilters,
  };
}
