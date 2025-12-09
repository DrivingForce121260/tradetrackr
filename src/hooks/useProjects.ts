/**
 * useProjects Hook
 * Loads and manages project lists (external and internal)
 */

import { useState, useEffect } from 'react';
import { getExternalProjects, getInternalProjects } from '@/services/projectLinkingService';

interface Project {
  id: string;
  projectName: string;
  type?: 'external' | 'internal';
  internalCategory?: string;
  [key: string]: any;
}

export function useProjects(concernId: string) {
  const [externalProjects, setExternalProjects] = useState<Project[]>([]);
  const [internalProjects, setInternalProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!concernId) {
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [external, internal] = await Promise.all([
          getExternalProjects(concernId),
          getInternalProjects(concernId)
        ]);
        
        setExternalProjects(external);
        setInternalProjects(internal);
        setAllProjects([...external, ...internal]);
      } catch (err: any) {
        console.error('Error loading projects:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [concernId]);

  /**
   * Get project by ID from loaded projects
   */
  const getProjectById = (projectId: string): Project | undefined => {
    return allProjects.find(p => p.id === projectId);
  };

  /**
   * Get project name by ID
   */
  const getProjectName = (projectId: string): string => {
    const project = getProjectById(projectId);
    return project?.projectName || 'Unknown Project';
  };

  return { 
    externalProjects, 
    internalProjects, 
    allProjects,
    loading, 
    error,
    getProjectById,
    getProjectName
  };
}

export default useProjects;








