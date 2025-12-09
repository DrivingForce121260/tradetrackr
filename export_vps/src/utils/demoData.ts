import { 
  Concern, 
  User, 
  Project, 
  Task, 
  Customer, 
  Material, 
  Category, 
  Report 
} from '@/services/firestoreService';

// Utility function to check if demo data should be shown
export const shouldShowDemoData = (user: User | null): boolean => {
  if (!user) return false;
  return user.email === 'demo@tradetrackr.com';
};

// Utility function to clean up demo data for real users
export const cleanupDemoData = (): void => {
  try {
    // Alle Demo-Daten aus localStorage entfernen
    const demoKeys = [
      'reports',
      'projects', 
      'tasks',
      'materials',
      'customers',
      'categories',
      'users',
      'reportApprovals'
    ];
    
    demoKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🧹 Removed demo data: ${key}`);
      }
    });
    
    console.log('✅ Demo data cleanup completed');
  } catch (error) {
    console.error('❌ Error during demo data cleanup:', error);
  }
};

// Utility function to check if user should see empty state
export const shouldShowEmptyState = (user: User | null): boolean => {
  return !shouldShowDemoData(user);
};

// Demo Concern (Unternehmen)
export const demoConcern: Omit<Concern, 'uid'> = {
  dateCreated: new Date(),
  concernName: 'TradeTrackr Demo GmbH',
  concernAddress: 'Musterstraße 123, 12345 Musterstadt',
  concernTel: '+49 123 456789',
  concernEmail: 'info@tradetrackr-demo.de',
  updateTime: new Date(),
  members: 15
};

// Demo Categories
export const demoCategories: Omit<Category, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    lastModified: new Date(),
    name: 'Elektroinstallation',
    description: 'Elektrische Installationen und Wartungen',
    type: 'material',
    color: '#3B82F6',
    icon: 'zap',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    name: 'Sanitär',
    description: 'Sanitäre Anlagen und Rohrleitungen',
    type: 'material',
    color: '#10B981',
    icon: 'droplets',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    name: 'Heizung',
    description: 'Heizungsanlagen und Klimatisierung',
    type: 'material',
    color: '#F59E0B',
    icon: 'flame',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    name: 'Projekt',
    description: 'Projektkategorien',
    type: 'project',
    color: '#8B5CF6',
    icon: 'folder',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    name: 'Aufgabe',
    description: 'Aufgabenkategorien',
    type: 'task',
    color: '#EF4444',
    icon: 'check-square',
    isActive: true
  }
];

// Demo Users
export const demoUsers: Omit<User, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    email: 'admin@tradetrackr-demo.de',
    displayName: 'Demo Administrator',
    photoUrl: '',
    tel: '+49 123 456789',
    passpin: 1234,
    vorname: 'Demo',
    mitarbeiterID: 1001,
    lastSync: new Date(),
    nachname: 'Administrator',
    generatedProjects: 25,
    rechte: 5,
    startDate: new Date('2023-01-01'),
    dateOfBirth: new Date('1985-06-15'),
    role: 'admin',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    email: 'manager@tradetrackr-demo.de',
    displayName: 'Demo Manager',
    photoUrl: '',
    tel: '+49 123 456790',
    passpin: 5678,
    vorname: 'Demo',
    mitarbeiterID: 1002,
    lastSync: new Date(),
    nachname: 'Manager',
    generatedProjects: 15,
    rechte: 4,
    startDate: new Date('2023-02-01'),
    dateOfBirth: new Date('1990-03-22'),
    role: 'manager',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    email: 'employee@tradetrackr-demo.de',
    displayName: 'Demo Mitarbeiter',
    photoUrl: '',
    tel: '+49 123 456791',
    passpin: 9012,
    vorname: 'Demo',
    mitarbeiterID: 1003,
    lastSync: new Date(),
    nachname: 'Mitarbeiter',
    generatedProjects: 8,
    rechte: 2,
    startDate: new Date('2023-03-01'),
    dateOfBirth: new Date('1995-11-08'),
    role: 'employee',
    isActive: true
  }
];

// Demo Customers
export const demoCustomers: Omit<Customer, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    cusContact: 'Max Mustermann',
    cusName: 'München Immobilien GmbH',
    cusAddress: 'Maximilianstraße 1, 80539 München',
    cusTel: '+49 89 12345678',
    cusEmail: 'info@muenchen-immobilien.de',
    status: 'active',
    industry: 'Immobilien',
    notes: 'Premium-Kunde, bevorzugt Elektroinstallationen'
  },
  {
    concernID: '',
    dateCreated: new Date(),
    cusContact: 'Anna Schmidt',
    cusName: 'Hamburg Wohnbau AG',
    cusAddress: 'Altonaer Straße 15, 20357 Hamburg',
    cusTel: '+49 40 87654321',
    cusEmail: 'kontakt@hamburg-wohnbau.de',
    status: 'active',
    industry: 'Wohnungsbau',
    notes: 'Fokus auf nachhaltige Lösungen'
  },
  {
    concernID: '',
    dateCreated: new Date(),
    cusContact: 'Tom Weber',
    cusName: 'Berlin Shopping Center GmbH',
    cusAddress: 'Unter den Linden 77, 10117 Berlin',
    cusTel: '+49 30 11223344',
    cusEmail: 'info@berlin-shopping.de',
    status: 'active',
    industry: 'Einzelhandel',
    notes: 'Großprojekte, bevorzugt Heizungsanlagen'
  }
];

// Demo Projects
export const demoProjects: Omit<Project, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    lastModified: new Date(),
    projectNumber: 2024001,
    projectAddendum: 1,
    projectName: 'Solaranlage Installation München',
    projectDes: 'Komplette Solaranlage für Wohngebäude mit Batteriespeicher',
    projectAddr: 'Maximilianstraße 1, 80539 München',
    projectContact: 'Max Mustermann',
    projectStatus: 'active',
    projectCategory: 1,
    projectCustomer: '', // Wird beim Erstellen gesetzt
    mitarbeiterID: '', // Wird beim Erstellen gesetzt
    projectCity: 'München',
    postCode: '80539',
    projectTel: '+49 89 12345678',
    projectEmail: 'projekt@muenchen-immobilien.de',
    projectElementLoaded: true,
    projectAufmassGen: false,
    priority: 'high',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30'),
    budget: 45000,
    progress: 35
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    projectNumber: 2024002,
    projectAddendum: 1,
    projectName: 'Heizungsanlage Wartung Hamburg',
    projectDes: 'Jährliche Wartung und Optimierung der Heizungsanlage',
    projectAddr: 'Altonaer Straße 15, 20357 Hamburg',
    projectContact: 'Anna Schmidt',
    projectStatus: 'planned',
    projectCategory: 3,
    projectCustomer: '',
    mitarbeiterID: '',
    projectCity: 'Hamburg',
    postCode: '20357',
    projectTel: '+49 40 87654321',
    projectEmail: 'wartung@hamburg-wohnbau.de',
    projectElementLoaded: false,
    projectAufmassGen: false,
    priority: 'medium',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    budget: 8000,
    progress: 0
  }
];

// Demo Tasks
export const demoTasks: Omit<Task, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    lastModified: new Date(),
    taskNumber: 'TASK-001',
    title: 'Solarpanels installieren',
    description: 'Installation der Solarpanels auf dem Dach',
    projectNumber: '2024001',
    assignedTo: '', // Wird beim Erstellen gesetzt
    customer: '', // Wird beim Erstellen gesetzt
    workLocation: 'Dach, Maximilianstraße 1, München',
    dueDate: new Date('2024-02-28'),
    priority: 'high',
    status: 'in-progress',
    hours: 16,
    actualHours: 8,
    category: 'Elektroinstallation',
    tags: ['Solar', 'Dach', 'Installation']
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    taskNumber: 'TASK-002',
    title: 'Batteriespeicher einrichten',
    description: 'Einrichtung und Konfiguration des Batteriespeichers',
    projectNumber: '2024001',
    assignedTo: '',
    customer: '',
    workLocation: 'Keller, Maximilianstraße 1, München',
    dueDate: new Date('2024-03-15'),
    priority: 'medium',
    status: 'pending',
    hours: 12,
    actualHours: 0,
    category: 'Elektroinstallation',
    tags: ['Batterie', 'Keller', 'Konfiguration']
  }
];

// Demo Materials
export const demoMaterials: Omit<Material, 'uid'>[] = [
  {
    concernID: '', // Wird beim Erstellen gesetzt
    dateCreated: new Date(),
    lastModified: new Date(),
    materialNumber: 'MAT-001',
    name: 'Solarpanel 400W',
    description: 'Hochleistungs-Solarpanel mit 400W Nennleistung',
    category: '', // Wird beim Erstellen gesetzt
    unit: 'Stück',
    price: 250.00,
    stock: 50,
    minStock: 10,
    supplier: 'SolarTech GmbH',
    projectNumber: '2024001',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    materialNumber: 'MAT-002',
    name: 'Batteriespeicher 10kWh',
    description: 'Lithium-Ionen Batteriespeicher für Solaranlagen',
    category: '',
    unit: 'Stück',
    price: 3500.00,
    stock: 8,
    minStock: 2,
    supplier: 'BatteryPower AG',
    projectNumber: '2024001',
    isActive: true
  },
  {
    concernID: '',
    dateCreated: new Date(),
    lastModified: new Date(),
    materialNumber: 'MAT-003',
    name: 'Heizungspumpe',
    description: 'Hocheffiziente Heizungspumpe für Wohngebäude',
    category: '',
    unit: 'Stück',
    price: 450.00,
    stock: 15,
    minStock: 5,
    supplier: 'HeizTech GmbH',
    projectNumber: '2024002',
    isActive: true
  }
];

// Demo Reports
export const demoReports: Omit<Report, 'uid'>[] = [
  {
    id: 'REP-DEMO-001',
    reportNumber: 'REP-001',
    employee: 'Demo Mitarbeiter',
    customer: 'München Immobilien GmbH',
    projectNumber: '2024001',
    workLocation: 'München',
    workDate: new Date().toISOString().split('T')[0],
    totalHours: 8,
    workDescription: 'Installation der ersten 10 Solarpanels',
    status: 'pending',
    mitarbeiterID: '1001',
    projectReportNumber: 'PR-001',
    reportData: '...',
    reportDate: new Date().toISOString().split('T')[0],
    signatureReference: 'SIG-001',
    stadt: 'München',
    concernID: '',
    activeprojectName: 'Solaranlage Installation München',
    location: 'Dach, Maximilianstraße 1, München',
    workLines: []
  }
];

// Hilfsfunktion zum Erstellen von Demo-Daten
export const createDemoData = async (
  concernID: string,
  userIds: string[],
  customerIds: string[],
  categoryIds: string[]
) => {
  try {
    // Categories mit concernID aktualisieren
    const categoriesWithConcernID = demoCategories.map(cat => ({
      ...cat,
      concernID
    }));

    // Users mit concernID aktualisieren
    const usersWithConcernID = demoUsers.map(user => ({
      ...user,
      concernID
    }));

    // Customers mit concernID aktualisieren
    const customersWithConcernID = demoCustomers.map(customer => ({
      ...customer,
      concernID
    }));

    // Projects mit concernID und Referenzen aktualisieren
    const projectsWithConcernID = demoProjects.map((project, index) => ({
      ...project,
      concernID,
      projectCustomer: customerIds[index % customerIds.length],
      mitarbeiterID: userIds[index % userIds.length]
    }));

    // Tasks mit concernID und Referenzen aktualisieren
    const tasksWithConcernID = demoTasks.map((task, index) => ({
      ...task,
      concernID,
      assignedTo: userIds[index % userIds.length],
      customer: customerIds[index % customerIds.length]
    }));

    // Materials mit concernID und Referenzen aktualisieren
    const materialsWithConcernID = demoMaterials.map((material, index) => ({
      ...material,
      concernID,
      category: categoryIds[index % categoryIds.length]
    }));

    // Reports mit concernID und Referenzen aktualisieren
    const reportsWithConcernID = demoReports.map((report, index) => ({
      ...report,
      concernID,
      mitarbeiterID: userIds[index % userIds.length]
    }));

    return {
      categories: categoriesWithConcernID,
      users: usersWithConcernID,
      customers: customersWithConcernID,
      projects: projectsWithConcernID,
      tasks: tasksWithConcernID,
      materials: materialsWithConcernID,
      reports: reportsWithConcernID
    };
  } catch (error) {
    console.error('Fehler beim Erstellen der Demo-Daten:', error);
    throw error;
  }
};
