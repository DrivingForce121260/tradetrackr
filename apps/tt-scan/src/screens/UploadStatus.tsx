import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type NavigationProp = NativeStackNavigationProp<any>;
type UploadStatusRouteProp = RouteProp<
  {
    UploadStatus: {
      success: boolean;
      docId?: string;
      fileName?: string;
    };
  },
  'UploadStatus'
>;

interface UploadStatusProps {
  navigation: NavigationProp;
  route: UploadStatusRouteProp;
}

export default function UploadStatus({
  navigation,
  route,
}: UploadStatusProps) {
  const { success, docId, fileName } = route.params;

  const handleNewScan = () => {
    navigation.navigate('Scan');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {success ? (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.title}>Erfolgreich hochgeladen!</Text>
            <Text style={styles.message}>
              Ihr Dokument wurde erfolgreich hochgeladen und wird automatisch
              verarbeitet.
            </Text>
            {fileName && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailLabel}>Dateiname:</Text>
                <Text style={styles.detailValue}>{fileName}</Text>
              </View>
            )}
            {docId && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailLabel}>Dokument-ID:</Text>
                <Text style={styles.detailValueSmall}>{docId}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={[styles.iconContainer, styles.errorIconContainer]}>
              <Text style={styles.errorIcon}>✕</Text>
            </View>
            <Text style={styles.title}>Upload fehlgeschlagen</Text>
            <Text style={styles.message}>
              Das Dokument konnte nicht hochgeladen werden. Bitte versuchen Sie
              es erneut.
            </Text>
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleNewScan}>
          <Text style={styles.buttonText}>Neuen Scan starten</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIconContainer: {
    backgroundColor: '#FF3B30',
  },
  successIcon: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  detailValueSmall: {
    fontSize: 12,
    color: '#1a1a1a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 24,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});











