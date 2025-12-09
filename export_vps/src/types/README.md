# TypeScript Types and Interfaces

## Overview
This directory contains all TypeScript type definitions and interfaces for the TradeTrackr application. The types are organized by domain and use shared interfaces to reduce duplication and improve maintainability.

## Shared Interfaces (common.ts)

### Navigation Props
- **`BackNavigationProps`**: Basic back navigation functionality
  ```typescript
  interface BackNavigationProps {
    onBack: () => void;
  }
  ```

- **`NavigationProps`**: Full navigation with back and forward
  ```typescript
  interface NavigationProps {
    onBack: () => void;
    onNavigate?: (page: string) => void;
  }
  ```

### Component Props
- **`ManagementProps`**: For management components that only need back navigation
  ```typescript
  interface ManagementProps extends BackNavigationProps {}
  ```

- **`ManagementWithNavigationProps`**: For management components that need both back and forward navigation
  ```typescript
  interface ManagementWithNavigationProps extends NavigationProps {}
  ```

- **`DashboardProps`**: For dashboard components that navigate to other pages
  ```typescript
  interface DashboardProps {
    onNavigate: (page: string) => void;
  }
  ```

- **`FormProps<T>`**: For form components with submit functionality
  ```typescript
  interface FormProps<T = any> {
    onSubmit: (data: T) => void;
    initialData?: T | null;
  }
  ```

- **`ListProps<T>`**: For list components with data and actions
  ```typescript
  interface ListProps<T = any> {
    data: T[];
    onEdit?: (item: T) => void;
    onDelete?: (id: string) => void;
    onView?: (item: T) => void;
  }
  ```

- **`CrudProps<T>`**: For CRUD operation components
  ```typescript
  interface CrudProps<T = any> extends BackNavigationProps {
    onEdit?: (item: T) => void;
    onDelete?: (id: string) => void;
    onView?: (item: T) => void;
    onNavigate?: (page: string) => void;
  }
  ```

## Usage Examples

### Before (Duplicated Interfaces)
```typescript
// In task.ts
export interface TaskManagementProps {
  onBack: () => void;
}

// In project.ts
export interface ProjectManagementProps {
  onBack: () => void;
}

// In user.ts
export interface UserManagementProps {
  onBack: () => void;
}
```

### After (Shared Interfaces)
```typescript
// In common.ts
export interface ManagementProps extends BackNavigationProps {}

// In task.ts
export interface TaskManagementProps extends ManagementProps {}

// In project.ts
export interface ProjectManagementProps extends ManagementProps {}

// In user.ts
export interface UserManagementProps extends ManagementProps {}
```

## Benefits

1. **Reduced Duplication**: No more repeating `onBack: () => void` in every component
2. **Consistent API**: All management components have the same prop structure
3. **Easy Maintenance**: Changes to navigation behavior only need to be made in one place
4. **Type Safety**: TypeScript ensures all components implement the required props
5. **Better Documentation**: Clear interface hierarchy shows component relationships

## Migration Guide

When creating new components:

1. **Check existing shared interfaces** in `common.ts` first
2. **Extend the appropriate interface** instead of creating new ones
3. **Use generics** for data-specific interfaces (e.g., `FormProps<Project>`)
4. **Import from common.ts** in your type file

## File Structure

```
src/types/
├── common.ts          # Shared interfaces and types
├── auth.ts           # Authentication types
├── user.ts           # User management types
├── project.ts        # Project management types
├── task.ts           # Task management types
├── report.ts         # Report management types
├── customer.ts       # Customer management types
├── material.ts       # Material management types
├── category.ts       # Category management types
├── messaging.ts      # Messaging types
└── index.ts          # Re-exports for easy importing
```
