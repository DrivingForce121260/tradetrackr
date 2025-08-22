/**
 * Utility functions for cleaning up demo data for authenticated users
 */

export const cleanupDemoData = () => {
  console.log('🧹 Cleaning up demo data for authenticated user...');
  
  // Clear demo projects
  const savedProjects = localStorage.getItem('projects');
  if (savedProjects) {
    try {
      const parsedProjects = JSON.parse(savedProjects);
      const hasDemoProjects = parsedProjects.some((p: any) => 
        p.id === 'proj1' || p.id === 'proj2' || p.id === 'proj3' || 
        p.id === 'demo-project-1' || p.projectNumber === 'PRJ-2024-DEMO'
      );
      if (hasDemoProjects) {
        console.log('🗑️ Removing demo projects from localStorage');
        localStorage.removeItem('projects');
      }
    } catch (e) {
      console.error('Error parsing projects from localStorage:', e);
    }
  }

  // Clear demo tasks
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    try {
      const parsedTasks = JSON.parse(savedTasks);
      const hasDemoTasks = parsedTasks.some((t: any) => 
        t.id.startsWith('demo-task-') || 
        t.customer === 'Demo Kunde' || 
        t.workLocation === 'Demo Standort'
      );
      if (hasDemoTasks) {
        console.log('🗑️ Removing demo tasks from localStorage');
        localStorage.removeItem('tasks');
      }
    } catch (e) {
      console.error('Error parsing tasks from localStorage:', e);
    }
  }

  // Clear demo materials
  const savedMaterials = localStorage.getItem('materials');
  if (savedMaterials) {
    try {
      const parsedMaterials = JSON.parse(savedMaterials);
      const hasDemoMaterials = parsedMaterials.some((m: any) => 
        m.id === '1' || m.id === '2' || m.id === '3' || m.id === '4' || m.id === '5'
      );
      if (hasDemoMaterials) {
        console.log('🗑️ Removing demo materials from localStorage');
        localStorage.removeItem('materials');
      }
    } catch (e) {
      console.error('Error parsing materials from localStorage:', e);
    }
  }

  // Clear demo reports
  const savedReports = localStorage.getItem('reports');
  if (savedReports) {
    try {
      const parsedReports = JSON.parse(savedReports);
      const hasDemoReports = parsedReports.some((r: any) => 
        r.id === '1' || r.id === '2' || r.id === '3'
      );
      if (hasDemoReports) {
        console.log('🗑️ Removing demo reports from localStorage');
        localStorage.removeItem('reports');
      }
    } catch (e) {
      console.error('Error parsing reports from localStorage:', e);
    }
  }

  console.log('✅ Demo data cleanup completed');
};

export const isDemoData = (data: any): boolean => {
  if (!data) return false;
  
  // Check for demo projects
  if (data.id === 'proj1' || data.id === 'proj2' || data.id === 'proj3' || 
      data.id === 'demo-project-1' || data.projectNumber === 'PRJ-2024-DEMO') {
    return true;
  }
  
  // Check for demo tasks
  if (data.id?.startsWith('demo-task-') || 
      data.customer === 'Demo Kunde' || 
      data.workLocation === 'Demo Standort') {
    return true;
  }
  
  // Check for demo materials
  if (data.id === '1' || data.id === '2' || data.id === '3' || 
      data.id === '4' || data.id === '5') {
    return true;
  }
  
  // Check for demo reports
  if (data.id === '1' || data.id === '2' || data.id === '3') {
    return true;
  }
  
  return false;
};


