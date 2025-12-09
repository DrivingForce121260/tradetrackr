/**
 * My Day Report Screen
 * Summary and confirmation of daily work
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { getTodayTimeEntries, createDayReport, countCompletedTasksToday, countPhotosTakenToday } from '../../services/api';
import { queueMutation } from '../../services/offlineQueue';
import { TimeEntry } from '../../types';

export default function MyDayReportScreen() {
  const session = useAuthStore((state) => state.session);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const [timeEntries, completedTasks, photos] = await Promise.all([
        getTodayTimeEntries(session.concernID, session.userId),
        countCompletedTasksToday(session.concernID, session.userId),
        countPhotosTakenToday(session.concernID, session.userId),
      ]);
      
      setEntries(timeEntries);
      setTasksCompleted(completedTasks);
      setPhotosCount(photos);
    } catch (error) {
      console.error('Failed to load day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalHours = () => {
    const total = entries.reduce((sum, entry) => {
      if (!entry.end) return sum;
      return sum + (entry.end.seconds - entry.start.seconds);
    }, 0);
    return (total / 3600).toFixed(2);
  };

  const getProjectBreakdown = () => {
    const breakdown: Record<string, number> = {};
    
    entries.forEach((entry) => {
      if (!entry.end) return;
      const duration = entry.end.seconds - entry.start.seconds;
      breakdown[entry.projectId] = (breakdown[entry.projectId] || 0) + duration;
    });

    return Object.entries(breakdown).map(([projectId, seconds]) => ({
      projectId,
      hours: parseFloat((seconds / 3600).toFixed(2)),
    }));
  };

  const handleConfirmDay = async () => {
    if (!session) return;

    Alert.alert(
      'Tag bestätigen',
      'Möchten Sie Ihren Arbeitstag bestätigen? Dies kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Bestätigen',
          style: 'default',
          onPress: async () => {
            setConfirming(true);
            try {
              const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              const breakdown = getProjectBreakdown();

              const report = {
                concernID: session.concernID,
                userId: session.userId,
                date: today,
                totalHours: parseFloat(getTotalHours()),
                projectBreakdown: breakdown,
                tasksCompleted,
                photosCount,
                confirmedAt: {
                  seconds: Date.now() / 1000,
                  nanoseconds: 0,
                },
              };

              try {
                await createDayReport(report);
                setConfirmed(true);
                Alert.alert('Erfolg', 'Arbeitstag erfolgreich bestätigt!');
              } catch (error) {
                console.error('Failed to create report, queuing:', error);
                // Queue for offline sync
                await queueMutation({
                  type: 'create_report',
                  payload: report,
                });
                setConfirmed(true);
                Alert.alert('Gespeichert', 'Bericht wird synchronisiert, sobald Sie online sind');
              }
            } catch (error) {
              console.error('Failed to confirm day:', error);
              Alert.alert('Fehler', 'Bestätigung fehlgeschlagen');
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
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

  const projectBreakdown = getProjectBreakdown();

  return (
    <Layout scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Mein Tag</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('de-DE', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Gesamt-Arbeitszeit</Text>
        <Text style={styles.summaryValue}>{getTotalHours()} h</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Zeiterfassungen</Text>
        <Text style={styles.cardValue}>{entries.length} Einträge</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Projekt-Aufschlüsselung</Text>
        {projectBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>Keine Daten</Text>
        ) : (
          projectBreakdown.map((item, index) => (
            <View key={index} style={styles.breakdownRow}>
              <Text style={styles.breakdownProject} numberOfLines={1}>
                {item.projectId}
              </Text>
              <Text style={styles.breakdownHours}>{item.hours} h</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aufgaben</Text>
        <Text style={styles.cardValue}>{tasksCompleted} abgeschlossen</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fotos</Text>
        <Text style={styles.cardValue}>{photosCount} aufgenommen</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={confirmed ? '✅ Tag bestätigt' : 'Tag bestätigen'}
          onPress={handleConfirmDay}
          loading={confirming}
          disabled={confirming || confirmed || entries.length === 0}
          variant={confirmed ? 'secondary' : 'primary'}
        />
      </View>

      {entries.length === 0 && (
        <Text style={styles.warningText}>
          Keine Zeiteinträge für heute. Erfassen Sie zuerst Ihre Arbeitszeit.
        </Text>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  date: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  breakdownProject: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  breakdownHours: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  actions: {
    marginTop: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
});

