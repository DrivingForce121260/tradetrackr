/**
 * Dashboard Screen
 * Main overview for field technician
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import TimerBar from '../../components/TimerBar';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { createTimeEntry, getUserFirstName } from '../../services/api';
import { queueMutation } from '../../services/offlineQueue';
import { AppTabParamList } from '../../navigation/types';

type DashboardNavigationProp = NativeStackNavigationProp<AppTabParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  
  const [firstName, setFirstName] = useState<string | null>(null);
  
  const timer = useAppStore((state) => state.timer);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const lastSync = useAppStore((state) => state.lastSync);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);

  // Load user's first name from Firestore
  useEffect(() => {
    const loadFirstName = async () => {
      if (session?.userId) {
        try {
          const name = await getUserFirstName(session.userId);
          setFirstName(name);
        } catch (error) {
          console.error('Failed to load first name:', error);
        }
      }
    };

    loadFirstName();
  }, [session?.userId]);

  const handleStartWork = () => {
    if (activeProjectId) {
      startTimer(activeProjectId);
    } else {
      // Navigate to project selection
      navigation.navigate('Projects', { screen: 'ProjectList' });
    }
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleStop = async () => {
    const timeEntry = stopTimer();
    if (timeEntry && session) {
      const fullEntry = {
        ...timeEntry,
        concernID: session.concernID,
        userId: session.userId,
      };

      try {
        // Try to save immediately
        await createTimeEntry(fullEntry);
        Alert.alert('Erfolg', 'Arbeitszeit erfasst');
      } catch (error) {
        console.error('Failed to create time entry, queuing:', error);
        // If offline or failed, queue for later
        await queueMutation({
          type: 'create_time_entry',
          payload: fullEntry,
        });
        Alert.alert('Gespeichert', 'Arbeitszeit wird synchronisiert, sobald Sie online sind');
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Noch nie';
    const diff = Date.now() - lastSync;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    return `vor ${hours} Std`;
  };

  // Get display name: firstName if available, otherwise email
  const displayName = firstName || session?.email || 'Benutzer';

  // Calculate button width based on longest text (including Abmelden button)
  const buttonTitles = [
    activeProjectId ? 'Arbeit starten' : 'Projekt wählen',
    'Pause',
    'Stop & Speichern',
    'Foto hinzufügen',
    'Mein Tag',
    'Neuen Bericht erstellen',
    'Meine Berichte',
    'KI-Assistent',
    'Abmelden', // Include Abmelden in size calculation
  ];
  const longestTitle = buttonTitles.reduce((a, b) => (a.length > b.length ? a : b), '');
  
  // Measure text width (approximate: 8px per character + padding)
  const buttonWidth = Math.max(200, longestTitle.length * 8 + 32);

  return (
    <Layout scrollable>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hallo,</Text>
        <Text style={styles.userName}>{displayName}</Text>
      </View>

      <TimerBar />

      {activeProjectId && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Aktuelles Projekt</Text>
          <Text style={styles.infoValue}>Projekt-ID: {activeProjectId}</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Letzte Synchronisation</Text>
        <Text style={styles.infoValue}>{formatLastSync()}</Text>
      </View>

      <View style={styles.actions}>
        {!timer.running ? (
          <PrimaryButton
            title={activeProjectId ? 'Arbeit starten' : 'Projekt wählen'}
            onPress={handleStartWork}
            style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
          />
        ) : (
          <>
            <PrimaryButton
              title="Pause"
              onPress={handlePause}
              variant="secondary"
              style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
            />
            <PrimaryButton
              title="Stop & Speichern"
              onPress={handleStop}
              variant="danger"
              style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
            />
          </>
        )}

        <PrimaryButton
          title="Foto hinzufügen"
          onPress={() => navigation.navigate('Photos')}
          variant="secondary"
          style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />

        <PrimaryButton
          title="Mein Tag"
          onPress={() => navigation.navigate('MyDay')}
          variant="secondary"
          style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />

        <PrimaryButton
          title="Neuen Bericht erstellen"
          onPress={() => navigation.navigate('Projects', { screen: 'CreateReport' })}
          variant="secondary"
          style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />

        <PrimaryButton
          title="Meine Berichte"
          onPress={() => navigation.navigate('Projects', { screen: 'ReportsList' })}
          variant="secondary"
          style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />

        <PrimaryButton
          title="KI-Assistent"
          onPress={() => navigation.navigate('Projects', { 
            screen: 'AIHelp',
            params: { projectId: activeProjectId }
          })}
          variant="secondary"
          style={[styles.button, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Abmelden"
          onPress={handleSignOut}
          variant="danger"
          style={[styles.signOutButton, { width: buttonWidth, alignSelf: 'flex-start' }]}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    color: '#8E8E93',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  actions: {
    marginTop: 12,
  },
  button: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 32,
  },
  signOutButton: {
    marginBottom: 24,
  },
});

