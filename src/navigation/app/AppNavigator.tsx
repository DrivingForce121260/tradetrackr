/**
 * App Navigator - Bottom Tabs
 * Main navigation for authenticated users
 */

import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../types';
import { useAuthStore } from '../../store/authStore';
import { assertFieldAccess } from '../../utils/guards';
import { featureFlags } from '../../config/featureFlags';
import DashboardScreen from '../../screens/app/DashboardScreen';
import ProjectsNavigator from './ProjectsNavigator';
import TimeTrackingScreen from '../../screens/app/TimeTrackingScreen';
import PhotosScreen from '../../screens/app/PhotosScreen';
import MyDayReportScreen from '../../screens/app/MyDayReportScreen';
import DebugScreen from '../../screens/app/DebugScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppNavigator() {
  const session = useAuthStore((state) => state.session);

  // Validate field access on mount
  useEffect(() => {
    try {
      assertFieldAccess(session);
    } catch (error) {
      console.warn('Field access validation:', error);
      // Note: We don't block access, just warn
      // Backend Security Rules will enforce actual permissions
    }
  }, [session]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Übersicht',
          tabBarLabel: 'Start',
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={{
          title: 'Projekte',
          tabBarLabel: 'Projekte',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="TimeTracking"
        component={TimeTrackingScreen}
        options={{
          title: 'Zeiterfassung',
          tabBarLabel: 'Zeit',
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotosScreen}
        options={{
          title: 'Fotos',
          tabBarLabel: 'Fotos',
        }}
      />
      <Tab.Screen
        name="MyDay"
        component={MyDayReportScreen}
        options={{
          title: 'Mein Tag',
          tabBarLabel: 'Mein Tag',
        }}
      />
      
      {featureFlags.debugScreen && (
        <Tab.Screen
          name="Debug"
          component={DebugScreen}
          options={{
            title: 'Debug',
            tabBarLabel: 'Debug',
          }}
        />
      )}
    </Tab.Navigator>
  );
}

