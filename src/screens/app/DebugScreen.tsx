/**
 * Debug Screen (DEV/Admin Only)
 * 
 * System diagnostics and manual testing utilities.
 * 
 * CRITICAL: This screen should NEVER be accessible in production builds.
 * Access is gated by:
 * 1. __DEV__ flag (React Native development mode)
 * 2. EXPO_PUBLIC_ENV !== 'production'
 * 3. Feature flag: debugScreen
 * 
 * If this screen is somehow rendered in production, it will show an error.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { checkClientHealth, getHealthSummary, HealthCheckResult } from '../../services/health';
import { sendAIMessage } from '../../services/aiClient';
import { flushQueue, getPendingCount } from '../../services/offlineQueue';
import { getAssignedProjects } from '../../services/api';
import { getAllFeatureFlags } from '../../config/featureFlags';
import { env } from '../../config/env';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';

export default function DebugScreen() {
  const session = useAuthStore((state) => state.session);

  // CRITICAL: Block access in production
  // This is a safety net - the screen should not be navigable in production
  if (env.isProduction || env.env === 'production') {
    return (
      <Layout>
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedTitle}>⛔ Zugriff verweigert</Text>
          <Text style={styles.blockedText}>
            Der Debug-Screen ist in Production-Builds nicht verfügbar.
          </Text>
          <Text style={styles.blockedSubtext}>
            Environment: {env.env}
          </Text>
        </View>
      </Layout>
    );
  }

  // Additional check: Verify we're in development mode
  if (!__DEV__) {
    return (
      <Layout>
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedTitle}>⚠️ Development Only</Text>
          <Text style={styles.blockedText}>
            Dieser Screen ist nur für Entwicklungs-Builds verfügbar.
          </Text>
        </View>
      </Layout>
    );
  }
  
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<string | null>(null);

  /**
   * Run health check
   */
  const runHealthCheck = async () => {
    setLoading('health');
    try {
      const result = await checkClientHealth();
      setHealth(result);
      Alert.alert('Health Check', getHealthSummary(result));
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setLoading(null);
    }
  };

  /**
   * Test Firestore read
   */
  const testFirestoreRead = async () => {
    if (!session) {
      Alert.alert('Fehler', 'Nicht angemeldet');
      return;
    }

    setLoading('firestore');
    try {
      const projects = await getAssignedProjects(session.concernID, session.userId);
      setTestResults((prev) => ({
        ...prev,
        firestore: `✅ Erfolg: ${projects.length} Projekte geladen`,
      }));
      Alert.alert('Firestore Test', `Erfolgreich: ${projects.length} Projekte geladen`);
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        firestore: `❌ Fehler: ${error.message}`,
      }));
      Alert.alert('Firestore Test', `Fehler: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  /**
   * Test AI endpoint
   */
  const testAIEndpoint = async () => {
    if (!session) {
      Alert.alert('Fehler', 'Nicht angemeldet');
      return;
    }

    setLoading('ai');
    try {
      const response = await sendAIMessage({
        concernID: session.concernID,
        userId: session.userId,
        message: 'Test-Nachricht vom Debug-Screen',
      });
      
      setTestResults((prev) => ({
        ...prev,
        ai: `✅ Erfolg: ${response.content.substring(0, 50)}...`,
      }));
      Alert.alert('AI Test', 'Erfolgreich! Antwort erhalten.');
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        ai: `❌ Fehler: ${error.message}`,
      }));
      Alert.alert('AI Test', `Fehler: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  /**
   * Test offline queue flush
   */
  const testQueueFlush = async () => {
    setLoading('queue');
    try {
      const pendingCount = await getPendingCount();
      const result = await flushQueue();
      
      setTestResults((prev) => ({
        ...prev,
        queue: `✅ Erfolg: ${result.success} erfolgreich, ${result.failed} fehlgeschlagen (${pendingCount} ausstehend)`,
      }));
      Alert.alert(
        'Queue Flush',
        `Erfolgreich: ${result.success}\nFehlgeschlagen: ${result.failed}\nAusstehend: ${pendingCount}`
      );
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        queue: `❌ Fehler: ${error.message}`,
      }));
      Alert.alert('Queue Flush', `Fehler: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const featureFlags = getAllFeatureFlags();

  return (
    <Layout scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Debug & Diagnostics</Text>
        <Text style={styles.subtitle}>Nur für Entwicklung und Admins</Text>
      </View>

      {/* Environment Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Umgebung</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Mode:</Text>
          <Text style={styles.value}>{env.isDevelopment ? 'Development' : 'Production'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Firebase Project:</Text>
          <Text style={styles.value}>{env.firebase.projectId || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>AI Endpoint:</Text>
          <Text style={styles.value}>{env.aiEndpoint || 'Not configured'}</Text>
        </View>
        {session && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tenant ID:</Text>
              <Text style={styles.value}>{session.concernID}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{session.userId.substring(0, 12)}...</Text>
            </View>
          </>
        )}
      </View>

      {/* Feature Flags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags</Text>
        {Object.entries(featureFlags).map(([key, value]) => (
          <View key={key} style={styles.infoRow}>
            <Text style={styles.label}>{key}:</Text>
            <Text style={[styles.value, value ? styles.enabled : styles.disabled]}>
              {value ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        ))}
      </View>

      {/* Health Check */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <PrimaryButton
          title="Run Health Check"
          onPress={runHealthCheck}
          loading={loading === 'health'}
          style={styles.button}
        />
        {health && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>
              {health.ok ? '✅ Alle Checks bestanden' : `⚠️ ${health.issues.length} Probleme`}
            </Text>
            {health.issues.length > 0 && (
              <Text style={styles.issuesText}>{health.issues.join('\n')}</Text>
            )}
          </View>
        )}
      </View>

      {/* Manual Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manuelle Tests</Text>
        
        <PrimaryButton
          title="Test Firestore Read"
          onPress={testFirestoreRead}
          loading={loading === 'firestore'}
          disabled={!session}
          variant="secondary"
          style={styles.button}
        />
        {testResults.firestore && (
          <Text style={styles.resultText}>{testResults.firestore}</Text>
        )}

        <PrimaryButton
          title="Test AI Endpoint"
          onPress={testAIEndpoint}
          loading={loading === 'ai'}
          disabled={!session}
          variant="secondary"
          style={styles.button}
        />
        {testResults.ai && (
          <Text style={styles.resultText}>{testResults.ai}</Text>
        )}

        <PrimaryButton
          title="Test Queue Flush"
          onPress={testQueueFlush}
          loading={loading === 'queue'}
          variant="secondary"
          style={styles.button}
        />
        {testResults.queue && (
          <Text style={styles.resultText}>{testResults.queue}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dieser Screen ist nur für Entwicklung und Debugging.
        </Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  enabled: {
    color: '#34C759',
  },
  disabled: {
    color: '#FF3B30',
  },
  button: {
    marginBottom: 12,
  },
  resultBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#000000',
    marginTop: 8,
  },
  issuesText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 17,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  blockedSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

