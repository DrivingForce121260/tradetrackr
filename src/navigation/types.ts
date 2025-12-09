/**
 * Navigation type definitions
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
};

// App Bottom Tabs
export type AppTabParamList = {
  Dashboard: undefined;
  Projects: NavigatorScreenParams<ProjectStackParamList>;
  TimeTracking: undefined;
  Photos: undefined;
  MyDay: undefined;
  Debug?: undefined; // Optional, only in DEV
};

// Projects Stack
export type ProjectStackParamList = {
  ProjectList: undefined;
  ProjectDetail: { projectId: string };
  Tasks: { projectId: string };
  AIHelp: { projectId?: string; taskId?: string };
  CreateReport: undefined;
  ReportsList: undefined;
  EditReport: { localId: string };
};

