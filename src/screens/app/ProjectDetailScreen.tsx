/**
 * Project Detail Screen
 * Shows all project information in a form layout
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { getProject } from '../../services/api';
import { Project } from '../../types';
import { AppTabParamList } from '../../navigation/types';

type ProjectDetailRouteProp = RouteProp<AppTabParamList, 'ProjectDetail'>;
type ProjectDetailNavigationProp = NativeStackNavigationProp<AppTabParamList, 'ProjectDetail'>;

export default function ProjectDetailScreen() {
  const navigation = useNavigation<ProjectDetailNavigationProp>();
  const route = useRoute<ProjectDetailRouteProp>();
  const session = useAuthStore((state) => state.session);

  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!session) {
      Alert.alert('Fehler', 'Keine aktive Sitzung');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const projectData = await getProject(session.concernID, projectId);
      if (projectData) {
        setProject(projectData);
      } else {
        Alert.alert('Fehler', 'Projekt nicht gefunden');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Load project error:', error);
      Alert.alert('Fehler', error.message || 'Projekt konnte nicht geladen werden');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCallCustomer = () => {
    if (project?.customerPhone) {
      Linking.openURL(`tel:${project.customerPhone}`);
    }
  };

  const handleCallContact = () => {
    if (project?.contactTel) {
      Linking.openURL(`tel:${project.contactTel}`);
    }
  };

  const handleNavigateToWork = () => {
    if (project?.workAddress && project?.workCity) {
      const address = encodeURIComponent(`${project.workAddress}, ${project.workPostalCode || ''} ${project.workCity}`);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Nicht gesetzt';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Projektdetails...</Text>
        </View>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Projekt nicht gefunden</Text>
          <PrimaryButton title="Zurück" onPress={() => navigation.goBack()} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout scrollable>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.projectNumber}>{project.projectNumber || 'Keine Nr.'}</Text>
          <View style={[
            styles.statusBadge,
            project.status === 'active' && styles.statusActive,
            project.status === 'completed' && styles.statusCompleted,
            project.status === 'paused' && styles.statusPaused,
          ]}>
            <Text style={styles.statusText}>
              {project.status === 'active' ? 'Aktiv' : 
               project.status === 'completed' ? 'Abgeschlossen' :
               project.status === 'paused' ? 'Pausiert' : project.status}
            </Text>
          </View>
        </View>
        <Text style={styles.projectName}>{project.name}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Project Information - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projekt-Information</Text>
          
          <View style={styles.compactRow}>
            <CompactField label="Kategorie" value={project.category} />
            <CompactField label="Manager" value={project.assignedManager} />
          </View>
        </View>

        {/* Customer Information - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kunde</Text>
          
          <CompactField label="Name" value={project.customerName} />
          
          <View style={styles.compactRow}>
            {project.customerPhone && (
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Telefon</Text>
                <TouchableOpacity 
                  style={styles.compactPhoneButton} 
                  onPress={handleCallCustomer}
                >
                  <Text style={styles.compactPhoneText}>📞 {project.customerPhone}</Text>
                </TouchableOpacity>
              </View>
            )}
            {project.customerReference && (
              <CompactField label="Referenz" value={project.customerReference} />
            )}
          </View>
        </View>

        {/* Work Location - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arbeitsort</Text>
          
          <View style={styles.compactField}>
            <Text style={styles.compactLabel}>Adresse</Text>
            <View style={styles.compactValue}>
              <Text style={[styles.compactValueText, !project.workAddress && styles.compactValueEmpty]}>
                {project.workAddress || 'Nicht angegeben'}
              </Text>
              <Text style={[styles.compactValueText, (!project.workPostalCode && !project.workCity) && styles.compactValueEmpty]}>
                {project.workPostalCode && project.workCity 
                  ? `${project.workPostalCode} ${project.workCity}`
                  : project.workCity || project.workPostalCode || 'Nicht angegeben'}
              </Text>
            </View>
          </View>
          
          {(project.workAddressLocation || project.workLocationNotes) && (
            <View style={styles.compactRow}>
              {project.workAddressLocation && (
                <CompactField label="Standort" value={project.workAddressLocation} />
              )}
              {project.workLocationNotes && (
                <CompactField label="Notizen" value={project.workLocationNotes} />
              )}
            </View>
          )}
          
          {(project.workAddress || project.workCity) && (
            <TouchableOpacity 
              style={styles.compactActionButton} 
              onPress={handleNavigateToWork}
            >
              <Text style={styles.compactActionText}>🗺️ Navigation</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact & Dates - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt & Termine</Text>
          
          <View style={styles.compactRow}>
            {project.contactTel && (
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Kontakt vor Ort</Text>
                <TouchableOpacity 
                  style={styles.compactPhoneButton} 
                  onPress={handleCallContact}
                >
                  <Text style={styles.compactPhoneText}>📞 {project.contactTel}</Text>
                </TouchableOpacity>
              </View>
            )}
            <CompactField label="Geplantes Ende" value={formatDate(project.plannedEndDate)} />
            {project.startDate && (
              <CompactField label="Start" value={formatDate(project.startDate)} />
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <PrimaryButton 
            title="Zu Aufgaben" 
            onPress={() => {
              // TODO: Navigate to tasks for this project
              Alert.alert('Info', 'Aufgaben-Ansicht wird implementiert');
            }} 
          />
          
          <View style={styles.buttonSpacing} />
          
          <PrimaryButton 
            title="Zu Fotos" 
            onPress={() => {
              // TODO: Navigate to photos for this project
              Alert.alert('Info', 'Fotos-Ansicht wird implementiert');
            }} 
          />
        </View>
      </ScrollView>
    </Layout>
  );
}

// Form Field Component
const FormField: React.FC<{
  label: string;
  value?: string | null;
  multiline?: boolean;
}> = ({ label, value, multiline }) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <View style={[styles.formValue, multiline && styles.formValueMultiline]}>
      <Text style={[styles.formValueText, !value && styles.formValueEmpty]}>
        {value || 'Nicht angegeben'}
      </Text>
    </View>
  </View>
);

// Compact Field Component
const CompactField: React.FC<{
  label: string;
  value?: string | null;
}> = ({ label, value }) => (
  <View style={styles.compactField}>
    <Text style={styles.compactLabel}>{label}</Text>
    <Text style={[styles.compactValueText, !value && styles.compactValueEmpty]}>
      {value || 'Nicht angegeben'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  projectNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusCompleted: {
    backgroundColor: '#E3F2FD',
  },
  statusPaused: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  formValue: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  formValueMultiline: {
    minHeight: 70,
  },
  formValueText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  formValueEmpty: {
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  inlineField: {
    flex: 1,
  },
  // Compact styles
  compactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  compactField: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactValue: {
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    padding: 6,
    paddingHorizontal: 8,
  },
  compactValueText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 16,
  },
  compactValueEmpty: {
    color: '#8E8E93',
    fontStyle: 'italic',
    fontSize: 12,
  },
  compactPhoneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  compactPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  compactActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  phoneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  phoneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionsSection: {
    marginTop: 4,
    marginBottom: 24,
  },
  buttonSpacing: {
    height: 10,
  },
});
