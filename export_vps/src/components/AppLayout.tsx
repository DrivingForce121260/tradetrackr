import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

import { toast } from '@/components/ui/use-toast';
import Header from './Header';
import Dashboard from './Dashboard';
import ProjectForm from './ProjectForm';
import ProjectList from './ProjectList';
import Categories from './Categories';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Project } from '@/types';

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setProjects(prev => [newProject, ...prev]);
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Project created successfully!",
    });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowCreateDialog(true);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingProject(null);
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Project updated successfully!",
    });
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Success",
      description: "Project deleted successfully!",
    });
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onCreateProject={() => {
          setEditingProject(null);
          setShowCreateDialog(true);
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
                              <TabsTrigger value="categories">{t('dashboard.categories')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard projects={filteredProjects} />
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-6">
            <ProjectList
              projects={filteredProjects}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-6">
            <Categories showHeader={false} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
            initialData={editingProject}
            onNavigate={(route) => {
              setShowCreateDialog(false);
              // Handle navigation based on route
              if (route === 'new-customer') {
                // Navigate to customer creation
                window.location.href = '/#/customers';
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppLayout;
