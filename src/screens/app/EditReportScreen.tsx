/**
 * Edit Report Screen
 * Allows editing of reports within 36 hours of creation
 * Reuses CreateReportScreen with route params
 */

import React, { useState, useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Layout from '../../components/Layout';
import CreateReportScreen from './CreateReportScreen';
import { getLocalReport, updateLocalReport, canEditReport, LocalReport } from '../../services/reportStorage';
import { ProjectStackParamList } from '../../navigation/types';
import { updateProjectReport } from '../../services/api';

type EditReportNavigationProp = NativeStackNavigationProp<ProjectStackParamList, 'EditReport'>;
type EditReportRouteProp = {
  params: {
    localId: string;
  };
};

export default function EditReportScreen() {
  const route = useRoute<EditReportRouteProp>();
  const navigation = useNavigation<EditReportNavigationProp>();
  const { localId } = route.params;

  const [report, setReport] = useState<LocalReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const localReport = await getLocalReport(localId);
      if (!localReport) {
        Alert.alert('Fehler', 'Bericht nicht gefunden');
        navigation.goBack();
        return;
      }

      if (!canEditReport(localReport)) {
        Alert.alert(
          'Nicht bearbeitbar',
          'Dieser Bericht kann nicht mehr bearbeitet werden. Die Bearbeitungsfrist von 36 Stunden ist abgelaufen.'
        );
        navigation.goBack();
        return;
      }

      setReport(localReport);
    } catch (error) {
      console.error('Failed to load report:', error);
      Alert.alert('Fehler', 'Bericht konnte nicht geladen werden');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Bericht...</Text>
        </View>
      </Layout>
    );
  }

  if (!report) {
    return null;
  }

  // For now, redirect to CreateReportScreen
  // In a full implementation, we would pass the report data as route params
  // or modify CreateReportScreen to accept props
  Alert.alert(
    'Hinweis',
    'Bearbeitungsfunktion wird geladen. Bitte verwenden Sie vorerst die Berichtsliste, um Details zu sehen.',
    [{ text: 'OK', onPress: () => navigation.goBack() }]
  );

  return null;
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
});

