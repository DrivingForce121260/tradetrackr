import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { CameraFrame } from '../components/CameraFrame';
import { PageThumb } from '../components/PageThumb';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<any>;

interface ScanProps {
  navigation: NavigationProp;
}

interface CapturedPage {
  uri: string;
  width: number;
  height: number;
}

export default function Scan({ navigation }: ScanProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const cameraRef = useRef<any>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
      });

      // Auto-rotate and slight crop
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            resize: {
              width: photo.width > 2000 ? 2000 : photo.width,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setPages((prev) => [
        ...prev,
        {
          uri: manipResult.uri,
          width: manipResult.width,
          height: manipResult.height,
        },
      ]);
    } catch (error) {
      console.error('Capture failed:', error);
      Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden');
    }
  };

  const handleDelete = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDone = () => {
    if (pages.length === 0) {
      Alert.alert('Keine Seiten', 'Bitte mindestens eine Seite scannen');
      return;
    }

    navigation.navigate('Review', { pages });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Lade Kamera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Kamera-Zugriff erforderlich</Text>
        <Text style={styles.permissionText}>
          TradeTrackr Scan benötigt Zugriff auf die Kamera, um Dokumente zu
          scannen.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Zugriff erlauben</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={openSettings}
        >
          <Text style={styles.secondaryButtonText}>Einstellungen öffnen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing="back"
      >
        <CameraFrame />
      </CameraView>

      {pages.length > 0 && (
        <View style={styles.thumbnailContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailScroll}
          >
            {pages.map((page, index) => (
              <PageThumb
                key={index}
                uri={page.uri}
                index={index}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogout}
        >
          <Text style={styles.secondaryButtonText}>Abmelden</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            pages.length === 0 && styles.buttonDisabled,
          ]}
          onPress={handleDone}
          disabled={pages.length === 0}
        >
          <Text style={styles.buttonText}>
            Fertig ({pages.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  camera: {
    flex: 1,
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#000',
  },
});











