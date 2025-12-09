import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, User, DollarSign, Plus, Building2 } from 'lucide-react';
import { customerService } from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

import { Project, ProjectFormProps } from '@/types';

// Define the form data structure
interface ProjectFormData {
  title: string;
  description: string;
  clientId?: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: string;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  // Extended customer fields
  customerName: string;
  customerReference: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  city: string;
  postalCode: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, initialData }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    clientId: undefined,
    client: '',
    location: '',
    startDate: '',
    endDate: '',
    budget: '',
    priority: 'medium',
    status: 'planning',
    // Extended customer fields
    customerName: '',
    customerReference: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    city: '',
    postalCode: ''
  });

  // Load customers for dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      if (user?.concernID) {
        try {

          
          // First try to load from customers collection
          let customersData = await customerService.getAll(user.concernID);

          
          // Also try to load ALL customers without concernID filter to debug
          try {
            const allCustomersRef = collection(db, 'customers');
            const allCustomersSnapshot = await getDocs(allCustomersRef);
            const allCustomers = allCustomersSnapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id
            }));
            console.log('ðŸ” [ProjectForm] ALL customers in collection (no filter):', allCustomers);
          } catch (debugError) {

          }
          
          // If no customers in collection, extract from projects
          if (!customersData || customersData.length === 0) {

            
            // Load projects and extract unique customers
            const projectsResponse = await fetch(`/api/projects?concernID=${user.concernID}`);
            if (projectsResponse.ok) {
              const projects = await projectsResponse.json();
              
              // Extract unique customers from projects
              const uniqueCustomers = new Map();
              projects.forEach((project: any) => {
                if (project.customerName && project.customerName.trim()) {
                  const customerKey = project.customerName.toLowerCase().trim();
                  if (!uniqueCustomers.has(customerKey)) {
                    uniqueCustomers.set(customerKey, {
                      id: `project_customer_${Date.now()}_${Math.random()}`,
                      name: project.customerName.trim(),
                      company: project.customerName.trim(),
                      email: project.customerEmail || '',
                      phone: project.customerPhone || '',
                      address: project.customerAddress || '',
                      city: project.city || '',
                      postalCode: project.postalCode || '',
                      reference: project.projectNumber || '',
                      source: 'project'
                    });
                  }
                }
              });
              
              customersData = Array.from(uniqueCustomers.values());

            }
          }
          
          setCustomers(customersData || []);
        } catch (error) {

          
          // Fallback: try to get from localStorage projects
          try {
            const savedProjects = localStorage.getItem('projects');
            if (savedProjects) {
              const projects = JSON.parse(savedProjects);
              const uniqueCustomers = new Map();
              
              projects.forEach((project: any) => {
                if (project.customerName && project.customerName.trim()) {
                  const customerKey = project.customerName.toLowerCase().trim();
                  if (!uniqueCustomers.has(customerKey)) {
                    uniqueCustomers.set(customerKey, {
                      id: `local_customer_${Date.now()}_${Math.random()}`,
                      name: project.customerName.trim(),
                      company: project.customerName.trim(),
                      email: project.customerEmail || '',
                      phone: project.customerPhone || '',
                      address: project.customerAddress || '',
                      city: project.city || '',
                      postalCode: project.postalCode || '',
                      reference: project.projectNumber || '',
                      source: 'local'
                    });
                  }
                }
              });
              
              const localCustomers = Array.from(uniqueCustomers.values());

              setCustomers(localCustomers);
            }
          } catch (localError) {

            setCustomers([]);
          }
        }
      }
    };
    loadCustomers();
  }, [user?.concernID]);

  useEffect(() => {
    if (initialData) {
      // Check if it's a Project or ExtendedProject
      if ('title' in initialData) {
        // It's a Project
        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          client: initialData.client || '',
          location: initialData.location || '',
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          budget: initialData.budget || '',
          priority: initialData.priority || 'medium',
          status: initialData.status === 'planned' ? 'planning' : 
                  initialData.status === 'active' ? 'in-progress' : 
                  initialData.status === 'completed' ? 'completed' : 
                  initialData.status === 'archived' ? 'on-hold' : 'planning',
          // Extended customer fields
          customerName: '',
          customerReference: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          city: '',
          postalCode: ''
        });
      } else {
        // It's an ExtendedProject
        setFormData({
          title: initialData.name || '',
          description: initialData.description || '',
          client: '',
          location: '',
          startDate: initialData.projectStartDate || '',
          endDate: initialData.plannedEndDate || '',
          budget: '',
          priority: 'medium',
          status: initialData.status === 'planned' ? 'planning' : 
                  initialData.status === 'active' ? 'in-progress' : 
                  initialData.status === 'completed' ? 'completed' : 
                  initialData.status === 'archived' ? 'on-hold' : 'planning',
          // Extended customer fields
          customerName: initialData.customerName || '',
          customerReference: initialData.customerReference || '',
          customerPhone: initialData.customerPhone || '',
          customerEmail: initialData.customerEmail || '',
          customerAddress: initialData.customerAddress || '',
          city: initialData.city || '',
          postalCode: initialData.postalCode || ''
        });
      }
    }
  }, [initialData]);

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customerId: string) => {

    const selectedCustomer = customers.find(c => c.id === customerId);

    
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedCustomer.id,
        customerName: selectedCustomer.name || '',
        customerReference: selectedCustomer.reference || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: selectedCustomer.email || '',
        customerAddress: selectedCustomer.address || '',
        city: selectedCustomer.city || '',
        postalCode: selectedCustomer.postalCode || ''
      }));

      
      // Also update the client field if it's empty
      if (!formData.client && selectedCustomer.name) {
        setFormData(prev => ({ ...prev, client: selectedCustomer.name }));
      }
    }
  };

  // Navigate to add new customer and return
  const handleAddNewCustomer = () => {
    // Store current form data in localStorage to restore when returning
    localStorage.setItem('projectFormData', JSON.stringify(formData));
    localStorage.setItem('returnToProjectForm', 'true');
    
    // For now, just show a message since we don't have onNavigate
    alert('Bitte gehen Sie zur Kundenverwaltung, um einen neuen Kunden zu erstellen. Kehren Sie dann hierher zurück.');
  };

  // Restore form data when returning from customer creation
  useEffect(() => {
    const returnToProjectForm = localStorage.getItem('returnToProjectForm');
    const savedFormData = localStorage.getItem('projectFormData');
    
    if (returnToProjectForm === 'true' && savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(prev => ({ ...prev, ...parsedData }));
        localStorage.removeItem('returnToProjectForm');
        localStorage.removeItem('projectFormData');

      } catch (error) {

      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a project object from form data
    const projectData: Project = {
      id: initialData?.id || Date.now().toString(),
      name: formData.title, // BaseProject requires 'name'
      title: formData.title,
      clientId: formData.clientId,
      description: formData.description,
      client: formData.client,
      location: formData.location,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: formData.budget,
      priority: formData.priority,
      status: formData.status === 'planning' ? 'planned' : 
              formData.status === 'in-progress' ? 'active' : 
              formData.status === 'completed' ? 'completed' : 
              formData.status === 'on-hold' ? 'archived' : 'planned',
      createdAt: initialData?.createdAt || new Date().toISOString()
    };
    
    onSubmit(projectData);
    
    if (!initialData) {
      setFormData({
        title: '',
        description: '',
        client: '',
        location: '',
        startDate: '',
        endDate: '',
        budget: '',
        priority: 'medium',
        status: 'planning',
        customerName: '',
        customerReference: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        city: '',
        postalCode: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Project Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Projektinformationen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Projekttitel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              required
            />
          </div>
          <div>
            <Label htmlFor="client">Kunde</Label>
            <Input
              id="client"
              value={formData.client}
              onChange={(e) => setFormData(prev => ({...prev, client: e.target.value}))}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Standort
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="budget" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Budget
            </Label>
            <Input
              id="budget"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({...prev, budget: e.target.value}))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="startDate" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Startdatum
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Enddatum</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="priority">Priorität</Label>
            <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({...prev, priority: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: 'planning' | 'in-progress' | 'completed' | 'on-hold') => setFormData(prev => ({...prev, status: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planung</SelectItem>
                <SelectItem value="in-progress">In Bearbeitung</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
                <SelectItem value="on-hold">Pausiert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Customer Information Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Kundeninformationen
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNewCustomer}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neuen Kunden
          </Button>
        </div>

        {/* Customer Dropdown */}
        <div>
          <Label htmlFor="customerSelect">Kunde auswö¤hlen *</Label>
          <Select onValueChange={handleCustomerSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Kunde aus der Liste auswö¤hlen..." />
            </SelectTrigger>
            <SelectContent>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} {customer.company ? `(${customer.company})` : ''}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  Keine Kunden verfügbar
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {customers.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Keine Kunden in der Datenbank gefunden. Erstellen Sie zuerst einen Kunden.
            </p>
          )}
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Kundenname</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="customerReference">Kundenreferenz</Label>
            <Input
              id="customerReference"
              value={formData.customerReference}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="customerPhone">Telefon</Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="customerEmail">E-Mail</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="customerAddress">Adresse</Label>
            <Input
              id="customerAddress"
              value={formData.customerAddress}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              value={formData.city}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">PLZ</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
        {initialData ? 'Projekt aktualisieren' : 'Projekt erstellen'}
      </Button>
    </form>
  );
};

export default ProjectForm;
