/**
 * Projects Navigator - Stack
 * Handles project-related screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProjectStackParamList } from '../types';
import ProjectsScreen from '../../screens/app/ProjectsScreen';
import ProjectDetailScreen from '../../screens/app/ProjectDetailScreen';
import TasksScreen from '../../screens/app/TasksScreen';
import AIHelpScreen from '../../screens/app/AIHelpScreen';
import CreateReportScreen from '../../screens/app/CreateReportScreen';
import ReportsListScreen from '../../screens/app/ReportsListScreen';
import EditReportScreen from '../../screens/app/EditReportScreen';

const Stack = createNativeStackNavigator<ProjectStackParamList>();

export default function ProjectsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Zurück',
      }}
    >
      <Stack.Screen
        name="ProjectList"
        component={ProjectsScreen}
        options={{ title: 'Projekte' }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ title: 'Projekt-Details' }}
      />
      <Stack.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: 'Aufgaben' }}
      />
      <Stack.Screen
        name="AIHelp"
        component={AIHelpScreen}
        options={{ title: 'KI-Assistent' }}
      />
      <Stack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{ title: 'Bericht erstellen' }}
      />
      <Stack.Screen
        name="ReportsList"
        component={ReportsListScreen}
        options={{ title: 'Meine Berichte' }}
      />
      <Stack.Screen
        name="EditReport"
        component={EditReportScreen}
        options={{ title: 'Bericht bearbeiten' }}
      />
    </Stack.Navigator>
  );
}



