/**
 * Reports List Screen
 * Shows all locally stored reports with edit capability (within 36 hours)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import {
  getAllLocalReports,
  LocalReport,
  canEditReport,
  getRemainingEditHours,
} from '../../services/reportStorage';
import { ProjectStackParamList } from '../../navigation/types';

type ReportsListNavigationProp = NativeStackNavigationProp<ProjectStackParamList, 'ReportsList'>;

export default function ReportsListScreen() {
  const navigation = useNavigation<ReportsListNavigationProp>();
  const session = useAuthStore((state) => state.session);

  const [reports, setReports] = useState<LocalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const allReports = await getAllLocalReports(session.concernID);
      setReports(allReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      Alert.alert('Fehler', 'Berichte konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleEditReport = (report: LocalReport) => {
    if (!canEditReport(report)) {
      Alert.alert(
        'Nicht bearbeitbar',
        'Dieser Bericht kann nicht mehr bearbeitet werden. Die Bearbeitungsfrist von 36 Stunden ist abgelaufen.'
      );
      return;
    }

    // Navigate to edit screen (we'll reuse CreateReportScreen with edit mode)
    navigation.navigate('EditReport', { localId: report.localId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Berichte...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Meine Berichte</Text>
        <Text style={styles.subtitle}>
          {reports.length} Bericht{reports.length !== 1 ? 'e' : ''} gespeichert
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Keine Berichte gefunden</Text>
            <Text style={styles.emptySubtext}>
              Erstellen Sie einen neuen Bericht, um ihn hier zu sehen
            </Text>
          </View>
        ) : (
          reports.map((report) => {
            const canEdit = canEditReport(report);
            const remainingHours = getRemainingEditHours(report);

            return (
              <TouchableOpacity
                key={report.localId}
                style={styles.reportCard}
                onPress={() => canEdit && handleEditReport(report)}
                disabled={!canEdit}
              >
                <View style={styles.reportHeader}>
                  <View style={styles.reportHeaderLeft}>
                    <Text style={styles.reportNumber}>{report.reportNumber}</Text>
                    <Text style={styles.reportProject}>{report.activeprojectName}</Text>
                  </View>
                  <View style={styles.reportHeaderRight}>
                    {report.synced ? (
                      <View style={styles.syncedBadge}>
                        <Text style={styles.syncedText}>✓ Sync</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>⏳ Offline</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.reportDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Datum:</Text>
                    <Text style={styles.detailValue}>{formatDate(report.workDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kunde:</Text>
                    <Text style={styles.detailValue}>{report.customer || 'Nicht angegeben'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Arbeitsort:</Text>
                    <Text style={styles.detailValue}>{report.workLocation || 'Nicht angegeben'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stunden:</Text>
                    <Text style={styles.detailValue}>{report.totalHours.toFixed(2)} h</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Zeilen:</Text>
                    <Text style={styles.detailValue}>{report.workLines.length}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Erstellt:</Text>
                    <Text style={styles.detailValue}>{formatDateTime(report.createdAt)}</Text>
                  </View>
                </View>

                {canEdit ? (
                  <View style={styles.editInfo}>
                    <Text style={styles.editInfoText}>
                      Bearbeitbar für noch {remainingHours} Stunde{remainingHours !== 1 ? 'n' : ''}
                    </Text>
                    <PrimaryButton
                      title="Bearbeiten"
                      onPress={() => handleEditReport(report)}
                      variant="secondary"
                      style={styles.editButton}
                    />
                  </View>
                ) : (
                  <View style={styles.editInfo}>
                    <Text style={styles.editInfoTextDisabled}>
                      Bearbeitungsfrist abgelaufen (36 Stunden)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportHeaderLeft: {
    flex: 1,
  },
  reportHeaderRight: {
    marginLeft: 12,
  },
  reportNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  reportProject: {
    fontSize: 14,
    color: '#8E8E93',
  },
  syncedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncedText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
  },
  reportDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  editInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editInfoText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  editInfoTextDisabled: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  editButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});






