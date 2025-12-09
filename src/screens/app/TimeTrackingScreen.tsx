/**
 * Time Tracking Screen
 * View and manage time entries
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import Layout from '../../components/Layout';
import TimerBar from '../../components/TimerBar';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getTodayTimeEntries } from '../../services/api';
import { TimeEntry } from '../../types';

export default function TimeTrackingScreen() {
  const session = useAuthStore((state) => state.session);
  const timer = useAppStore((state) => state.timer);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const data = await getTodayTimeEntries(session.concernID, session.userId);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (entry: TimeEntry) => {
    if (!entry.end) return '...';
    const duration = entry.end.seconds - entry.start.seconds;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getTotalHours = () => {
    const total = entries.reduce((sum, entry) => {
      if (!entry.end) return sum;
      return sum + (entry.end.seconds - entry.start.seconds);
    }, 0);
    const hours = (total / 3600).toFixed(1);
    return hours;
  };

  const handleAddManualEntry = () => {
    // TODO: Open modal/form for manual time entry
    console.log('Add manual entry not yet implemented');
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <TimerBar />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Heute gesamt</Text>
        <Text style={styles.summaryValue}>{getTotalHours()} Stunden</Text>
      </View>

      <View style={styles.controls}>
        {!timer.running ? (
        <PrimaryButton
          title="Timer starten"
          onPress={() => {
            Alert.alert(
              'Projekt auswählen',
              'Bitte wählen Sie zuerst ein Projekt im Projekte-Tab aus'
            );
          }}
          style={styles.button}
        />
        ) : (
          <>
            <PrimaryButton
              title="Pause"
              onPress={pauseTimer}
              variant="secondary"
              style={styles.button}
            />
            <PrimaryButton
              title="Stop"
              onPress={() => {
                stopTimer();
                loadEntries();
              }}
              variant="danger"
              style={styles.button}
            />
          </>
        )}

        <PrimaryButton
          title="➕ Manuelle Erfassung"
          onPress={handleAddManualEntry}
          variant="secondary"
          style={styles.button}
        />
      </View>

      <Text style={styles.sectionTitle}>Heutige Einträge</Text>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Noch keine Zeiteinträge heute</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryProject}>Projekt: {item.projectId}</Text>
                <Text style={styles.entryDuration}>{calculateDuration(item)}</Text>
              </View>
              <Text style={styles.entryTime}>
                {formatTime(item.start)} - {item.end ? formatTime(item.end) : 'läuft...'}
              </Text>
              <Text style={styles.entrySource}>
                {item.source === 'timer' ? '⏱ Timer' : '✍️ Manuell'}
                {item.confirmed && ' · ✅ Bestätigt'}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controls: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  listContent: {
    paddingBottom: 16,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryProject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  entryTime: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
  },
  entrySource: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

