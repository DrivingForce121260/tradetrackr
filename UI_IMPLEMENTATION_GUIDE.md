# Document Management UI Implementation Guide

## ✅ What's Been Done

### Backend (Complete)
- ✅ 6 Internal projects created for organization `DE689E0F2D`
- ✅ Cloud Functions deployed
- ✅ Project linking logic implemented
- ✅ Upload service updated with automatic project assignment
- ✅ Firestore rules deployed (temporarily relaxed for migration)

### Current Status
- **Internal Projects Created:** ✅ 
  - DE689E0F2D-internal-personnel
  - DE689E0F2D-internal-finance
  - DE689E0F2D-internal-admin
  - DE689E0F2D-internal-compliance
  - DE689E0F2D-internal-training
  - DE689E0F2D-internal-it

---

## 📋 UI Implementation Steps

Since the existing `DocumentManagement.tsx` is 1100+ lines and uses a different document structure (`project_documents` collection vs `documents` collection), here's how to add project-linking features:

### Option 1: Add to Existing Document Management

If your current Document Management uses the old `project_documents` collection, the new project-linking system will work with the new `documents` collection uploaded via the new upload service.

### Option 2: Create New "Document Registry" Component

Create a new component for the global documents registry with full project-linking features.

---

## 🎨 Key UI Components to Add

### 1. Project Column Component

Add this component to show project info in document lists:

```typescript
// src/components/documents/ProjectBadge.tsx
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase } from 'lucide-react';

interface ProjectBadgeProps {
  projectName: string;
  projectType: 'external' | 'internal';
  internalCategory?: string;
}

export function ProjectBadge({ projectName, projectType, internalCategory }: ProjectBadgeProps) {
  if (projectType === 'internal') {
    const categoryColors: Record<string, string> = {
      personnel: 'bg-blue-100 text-blue-700 border-blue-300',
      finance: 'bg-green-100 text-green-700 border-green-300',
      admin: 'bg-gray-100 text-gray-700 border-gray-300',
      compliance: 'bg-purple-100 text-purple-700 border-purple-300',
      training: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      it: 'bg-red-100 text-red-700 border-red-300'
    };

    const colorClass = categoryColors[internalCategory || 'admin'];

    return (
      <Badge className={`${colorClass} border flex items-center space-x-1`}>
        <Building2 className="w-3 h-3" />
        <span>{projectName}</span>
      </Badge>
    );
  }

  return (
    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 border flex items-center space-x-1">
      <Briefcase className="w-3 h-3" />
      <span>{projectName}</span>
    </Badge>
  );
}
```

### 2. Project Assignment Dialog

```typescript
// src/components/documents/ProjectAssignmentDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface ProjectAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    filename: string;
    routeDecision?: {
      candidates?: Array<{projectId: string; projectName: string; confidence: number}>;
    };
  };
  externalProjects: Array<{id: string; projectName: string}>;
  internalProjects: Array<{id: string; projectName: string; internalCategory: string}>;
  onAssigned: () => void;
}

export function ProjectAssignmentDialog({
  open,
  onOpenChange,
  document,
  externalProjects,
  internalProjects,
  onAssigned
}: ProjectAssignmentDialogProps) {
  const [assigning, setAssigning] = useState(false);

  const assignProject = async (projectId: string) => {
    setAssigning(true);
    try {
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        projectId,
        status: 'stored',
        routeDecision: {
          ruleId: 'manual-assignment',
          reason: 'Manually assigned by user',
          timestamp: new Date().toISOString()
        }
      });
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning project:', error);
      alert('Failed to assign project');
    } finally {
      setAssigning(false);
    }
  };

  const candidates = document.routeDecision?.candidates || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Assign Document to Project</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-gray-700">Document:</p>
            <p className="text-sm text-gray-600">{document.filename}</p>
          </div>

          {candidates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Suggested Projects:</Label>
              <div className="space-y-2">
                {candidates.map(candidate => (
                  <Button
                    key={candidate.projectId}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => assignProject(candidate.projectId)}
                    disabled={assigning}
                  >
                    <span className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{candidate.projectName}</span>
                    </span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {Math.round(candidate.confidence * 100)}% match
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Or Select Manually:</Label>
            <Select onValueChange={assignProject} disabled={assigning}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>External (Customer) Projects</SelectLabel>
                  {externalProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectName}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Internal Projects</SelectLabel>
                  {internalProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectName} ({p.internalCategory})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Service Hook for Projects

```typescript
// src/hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { getExternalProjects, getInternalProjects } from '@/services/projectLinkingService';

export function useProjects(concernId: string) {
  const [externalProjects, setExternalProjects] = useState<any[]>([]);
  const [internalProjects, setInternalProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!concernId) return;

    const loadProjects = async () => {
      setLoading(true);
      try {
        const [external, internal] = await Promise.all([
          getExternalProjects(concernId),
          getInternalProjects(concernId)
        ]);
        setExternalProjects(external);
        setInternalProjects(internal);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [concernId]);

  return { externalProjects, internalProjects, loading };
}
```

---

## 🔧 Integration into Existing Document Management

### Add to DocumentManagement.tsx

#### 1. Import new components and services

```typescript
// Add to imports at top
import { ProjectBadge } from './documents/ProjectBadge';
import { ProjectAssignmentDialog } from './documents/ProjectAssignmentDialog';
import { useProjects } from '@/hooks/useProjects';
import { AlertTriangle, Briefcase } from 'lucide-react';
```

#### 2. Add project state

```typescript
// Add to state declarations
const { externalProjects, internalProjects, loading: projectsLoading } = useProjects(user?.concernID || '');
const [showProjectAssignment, setShowProjectAssignment] = useState(false);
const [selectedDocForAssignment, setSelectedDocForAssignment] = useState<any>(null);
```

#### 3. Add Project Filter

```typescript
// Add to filter section
<div className="space-y-2">
  <Label>Project</Label>
  <Select
    value={filters.projectId || 'all'}
    onValueChange={(value) => setFilters({...filters, projectId: value === 'all' ? undefined : value})}
  >
    <SelectTrigger>
      <SelectValue placeholder="All Projects" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Projects</SelectItem>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>External Projects</SelectLabel>
        {externalProjects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
        ))}
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Internal Projects</SelectLabel>
        {internalProjects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
</div>
```

#### 4. Add Project Column to Table

```typescript
<TableHeader>
  <TableRow>
    <TableHead>Filename</TableHead>
    <TableHead>Type</TableHead>
    <TableHead>Project</TableHead>  {/* NEW */}
    <TableHead>Status</TableHead>
    <TableHead>Date</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>

<TableBody>
  {documents.map(doc => (
    <TableRow key={doc.id}>
      {/* ... other cells ... */}
      <TableCell>
        {doc.projectName ? (
          <ProjectBadge
            projectName={doc.projectName}
            projectType={doc.projectType || 'external'}
            internalCategory={doc.internalCategory}
          />
        ) : (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>No Project</span>
          </Badge>
        )}
      </TableCell>
      {/* ... other cells ... */}
    </TableRow>
  ))}
</TableBody>
```

#### 5. Add Assignment Action for Needs Review Docs

```typescript
// In document actions
{doc.status === 'needs_review' && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      setSelectedDocForAssignment(doc);
      setShowProjectAssignment(true);
    }}
  >
    <AlertTriangle className="w-3 h-3 mr-1" />
    Assign Project
  </Button>
)}
```

#### 6. Add Dialog at bottom of component

```typescript
{showProjectAssignment && selectedDocForAssignment && (
  <ProjectAssignmentDialog
    open={showProjectAssignment}
    onOpenChange={setShowProjectAssignment}
    document={selectedDocForAssignment}
    externalProjects={externalProjects}
    internalProjects={internalProjects}
    onAssigned={() => {
      loadDocuments(); // Reload documents after assignment
      toast({
        title: 'Project Assigned',
        description: 'Document has been assigned to a project'
      });
    }}
  />
)}
```

---

## 🎯 Testing the Implementation

### 1. Upload a New Document

```typescript
// The upload service will automatically assign a project
// Check the console logs to see which project was assigned and why
```

### 2. Check Internal Projects

Navigate to Projects list and verify you see the 6 internal projects created.

### 3. Filter by Project

Use the new project filter to view documents by project.

### 4. Manual Assignment

For any document with `status: 'needs_review'`, test the manual assignment dialog.

---

## 📝 Next Steps

1. **Create the new UI components** (`ProjectBadge`, `ProjectAssignmentDialog`, `useProjects`)
2. **Add imports** to DocumentManagement.tsx
3. **Add project column** to document table
4. **Add project filter** to filters section
5. **Add assignment action** for needs_review documents
6. **Test with new uploads** to see automatic assignment

---

## 🔄 Reverting to Strict Rules

After migration is complete, revert the Firestore rules:

```javascript
match /documents/{docId} {
  // Read: Must have access to the linked project
  allow read: if request.auth != null && 
    (sameConcern(resource.data.concernId) || sameConcern(resource.data.orgId)) &&
    canAccessDocumentViaProject(resource.data.projectId);
  
  // Create: Must provide valid projectId
  allow create: if request.auth != null && 
    request.resource.data.projectId != null &&
    (request.resource.data.concernId != null || request.resource.data.orgId != null);
  
  // Update: Check project access on changes
  allow update: if request.auth != null && 
    (sameConcern(resource.data.concernId) || sameConcern(resource.data.orgId)) &&
    (request.resource.data.createdBy == resource.data.createdBy || isAdmin()) &&
    (request.resource.data.projectId == resource.data.projectId || 
     (canAccessDocumentViaProject(resource.data.projectId) && 
      canAccessDocumentViaProject(request.resource.data.projectId)));
  
  // Delete: admin only
  allow delete: if isAuthenticated() && isAdmin() && 
    (sameConcern(resource.data.concernId) || sameConcern(resource.data.orgId));
}
```

Then redeploy:
```bash
firebase deploy --only firestore:rules
```

---

## ✅ Summary of Achievements

### ✅ Completed
1. Extended Project model with `type` and `internalCategory`
2. Created 6 internal projects for organization
3. Deployed Cloud Functions for project management
4. Implemented deterministic linking logic
5. Added AI fallback with Gemini
6. Updated upload service with automatic project assignment
7. Deployed Firestore rules (temporarily relaxed)
8. Created comprehensive implementation guide

### 📋 Ready for Implementation
- UI components for project display
- Project assignment dialog
- Project filters
- Manual assignment for needs_review documents

### 🚀 Automatic Features
- New documents uploaded via `documentManagementService` will automatically get assigned to appropriate projects
- Internal project routing works immediately
- AI fallback available for unclear cases

---

## 💡 Key Points

1. **All new uploads automatically assign projects** - No user action needed in most cases
2. **6 internal projects created** - Ready to receive non-customer documents
3. **Manual assignment available** - For edge cases and needs_review status
4. **Permissions system ready** - Role-based access via project categories
5. **Deterministic first, AI second** - Fast, predictable routing with AI fallback

The backend is fully functional. UI implementation will expose these features to users!








