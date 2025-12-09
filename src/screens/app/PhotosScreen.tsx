/**
 * Photos Screen
 * Capture and view project photos
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../services/firebase';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { listProjectPhotos, createPhoto } from '../../services/api';
import { featureFlags } from '../../config/featureFlags';
import { Photo } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

export default function PhotosScreen() {
  const session = useAuthStore((state) => state.session);
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, [activeProjectId]);

  const loadPhotos = async () => {
    if (!session) return;

    setLoading(true);
    try {
      if (activeProjectId) {
        const data = await listProjectPhotos(session.concernID, activeProjectId);
        setPhotos(data);
      } else {
        // TODO: Load all accessible photos for user
        setPhotos([]);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!session || !activeProjectId) {
      Alert.alert('Fehler', 'Kein Projekt ausgewählt');
      return;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Kamera-Berechtigung wird benötigt, um Fotos aufzunehmen.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: true, // Get GPS data if available
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      
      // Get GPS coordinates if available
      let gps: { latitude: number; longitude: number } | undefined;
      if (asset.exif && asset.exif.GPSLatitude && asset.exif.GPSLongitude) {
        gps = {
          latitude: asset.exif.GPSLatitude,
          longitude: asset.exif.GPSLongitude,
        };
      }

      setLoading(true);

      try {
        // Generate unique photo ID
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate storage path for photo
        const storagePath = `photos/${session.concernID}/${activeProjectId}/${photoId}`;

        // Upload to Firebase Storage
        const blob = await fetch(asset.uri).then((r) => r.blob());
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        // Create Photo record in Firestore
        const photo: Omit<Photo, 'id' | 'createdAt'> = {
          concernID: session.concernID,
          userId: session.userId,
          projectId: activeProjectId,
          storagePath,
          takenAt: {
            seconds: Date.now() / 1000,
            nanoseconds: 0,
          },
          gps,
        };

        await createPhoto(photo);

        // Reload photos
        await loadPhotos();
        
        Alert.alert('Erfolg', 'Foto wurde hochgeladen');
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        
        // If offline or upload fails, queue for later
        // TODO: Store local file and queue upload
        Alert.alert('Fehler', 'Foto konnte nicht hochgeladen werden. Bitte später erneut versuchen.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Fehler', 'Kamera konnte nicht geöffnet werden');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <View style={styles.header}>
        {!activeProjectId && (
          <Text style={styles.warningText}>
            ⚠️ Kein Projekt ausgewählt. Wähle ein Projekt, um Fotos zuzuordnen.
          </Text>
        )}
        
        {featureFlags.photoCapture ? (
          <PrimaryButton
            title="📷 Foto aufnehmen"
            onPress={handleCapturePhoto}
            disabled={!activeProjectId}
          />
        ) : (
          <Text style={styles.warningText}>
            📷 Foto-Funktion ist derzeit deaktiviert
          </Text>
        )}
      </View>

      {photos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {activeProjectId ? 'Noch keine Fotos für dieses Projekt' : 'Kein Projekt ausgewählt'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.photoCard}>
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
                {/* TODO: Load actual image from Firebase Storage */}
                {/* <Image source={{ uri: item.downloadUrl }} style={styles.photoImage} /> */}
              </View>
              <Text style={styles.photoDate} numberOfLines={1}>
                {formatDate(item.takenAt)}
              </Text>
              {item.gps && (
                <Text style={styles.photoGps} numberOfLines={1}>
                  📍 GPS
                </Text>
              )}
            </View>
          )}
          contentContainerStyle={styles.gridContent}
        />
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
  },
  gridContent: {
    paddingBottom: 16,
  },
  photoCard: {
    width: PHOTO_SIZE,
    marginRight: 8,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: '#E9E9EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  photoGps: {
    fontSize: 11,
    color: '#34C759',
  },
});

