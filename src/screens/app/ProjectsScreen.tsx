/**
 * Projects Screen
 * Shows list of all projects for the concern (excluding internal)
 * with Sync button and detail view
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { getAllProjects } from '../../services/api';
import { Project } from '../../types';
import { AppTabParamList } from '../../navigation/types';

type ProjectsNavigationProp = NativeStackNavigationProp<AppTabParamList, 'Projects'>;

export default function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigationProp>();
  const session = useAuthStore((state) => state.session);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load projects from local storage on mount
  useEffect(() => {
    loadProjectsFromStorage();
  }, []);

  const loadProjectsFromStorage = async () => {
    // TODO: Implement local storage/AsyncStorage
    // For now, just trigger sync
    if (projects.length === 0) {
      syncProjects();
    }
  };

  const syncProjects = async () => {
    if (!session) {
      Alert.alert('Fehler', 'Keine aktive Sitzung');
      return;
    }

    setSyncing(true);
    try {
      console.log('Syncing projects for concernID:', session.concernID);
      const allProjects = await getAllProjects(session.concernID);
      
      console.log(`Loaded ${allProjects.length} projects`);
      setProjects(allProjects);
      setLastSyncTime(new Date());
      
      // TODO: Save to local storage for offline access
      // await AsyncStorage.setItem('projects', JSON.stringify(allProjects));
      
      Alert.alert(
        'Synchronisiert', 
        `${allProjects.length} Projekte wurden synchronisiert`
      );
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Fehler', error.message || 'Projekte konnten nicht synchronisiert werden');
    } finally {
      setSyncing(false);
    }
  };

  const handleProjectPress = (project: Project) => {
    // Navigate to project detail screen
    navigation.navigate('ProjectDetail', { projectId: project.id });
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Noch nie';
    const diff = Date.now() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    return `vor ${hours} Std`;
  };

  const renderProjectItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => handleProjectPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.projectHeader}>
        <Text style={styles.projectNumber}>{item.projectNumber || 'Keine Nr.'}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'active' && styles.statusActive,
          item.status === 'completed' && styles.statusCompleted,
          item.status === 'paused' && styles.statusPaused,
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Aktiv' : 
             item.status === 'completed' ? 'Abgeschlossen' :
             item.status === 'paused' ? 'Pausiert' : item.status}
          </Text>
        </View>
      </View>
      
      <Text style={styles.projectName}>{item.name}</Text>
      
      {item.customerName && (
        <Text style={styles.projectCustomer}>Kunde: {item.customerName}</Text>
      )}
      
      <View style={styles.projectFooter}>
        <Text style={styles.projectMeta}>
          {item.workCity || 'Kein Ort'} • {item.category || 'Keine Kategorie'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Keine Projekte vorhanden</Text>
      <Text style={styles.emptySubtext}>
        Tippen Sie auf "Projekte synchronisieren", um Projekte zu laden
      </Text>
    </View>
  );

  return (
    <Layout>
      <View style={styles.header}>
        <Text style={styles.title}>Projekte</Text>
        <Text style={styles.subtitle}>
          {projects.length} Projekt{projects.length !== 1 ? 'e' : ''} • Letzter Sync: {formatLastSync()}
        </Text>
        <PrimaryButton
          title="Neuen Bericht erstellen"
          onPress={() => navigation.navigate('CreateReport')}
          style={styles.createReportButton}
        />
      </View>

      <View style={styles.syncButtonContainer}>
        <PrimaryButton
          title={syncing ? 'Synchronisiere...' : 'Projekte synchronisieren'}
          onPress={syncProjects}
          disabled={syncing}
          loading={syncing}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Projekte...</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProjectItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={syncing}
              onRefresh={syncProjects}
              tintColor="#007AFF"
            />
          }
        />
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  syncButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
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
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  projectCustomer: {
    fontSize: 14,
    color: '#3A3A3C',
    marginBottom: 8,
  },
  projectFooter: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  projectMeta: {
    fontSize: 13,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  createReportButton: {
    marginTop: 16,
  },
});
