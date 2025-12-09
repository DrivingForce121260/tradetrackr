import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { imagesToPdf } from '../lib/pdf';
import { sha256FromFile } from '../lib/hash';
import { uploadPdf } from '../lib/upload';
import { auth } from '../lib/firebase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<any>;
type ReviewRouteProp = RouteProp<{ Review: { pages: CapturedPage[] } }, 'Review'>;

interface ReviewProps {
  navigation: NavigationProp;
  route: ReviewRouteProp;
}

interface CapturedPage {
  uri: string;
  width: number;
  height: number;
}

export default function Review({ navigation, route }: ReviewProps) {
  const [pages, setPages] = useState<CapturedPage[]>(route.params.pages);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleRotate = async (index: number) => {
    const page = pages[index];
    try {
      const rotated = await ImageManipulator.manipulateAsync(
        page.uri,
        [{ rotate: 90 }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      const newPages = [...pages];
      newPages[index] = {
        uri: rotated.uri,
        width: rotated.width,
        height: rotated.height,
      };
      setPages(newPages);
    } catch (error) {
      console.error('Rotate failed:', error);
      Alert.alert('Fehler', 'Bild konnte nicht gedreht werden');
    }
  };

  const handleUpload = async () => {
    if (!auth.currentUser) {
      Alert.alert('Fehler', 'Nicht angemeldet');
      return;
    }

    setUploading(true);

    try {
      // Create PDF
      const imageUris = pages.map((p) => p.uri);
      const { path, bytes } = await imagesToPdf(imageUris);

      // Calculate hash
      const hash = await sha256FromFile(path);

      // Upload
      const result = await uploadPdf(
        auth.currentUser.uid,
        path,
        bytes,
        hash
      );

      // Navigate to success screen
      navigation.replace('UploadStatus', {
        success: true,
        docId: result.docId,
        fileName: result.fileName,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert(
        'Upload fehlgeschlagen',
        'Das Dokument konnte nicht hochgeladen werden. Bitte erneut versuchen.',
        [
          {
            text: 'OK',
            onPress: () => setUploading(false),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vorschau ({pages.length})</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {pages.map((page, index) => (
          <TouchableOpacity
            key={index}
            style={styles.gridItem}
            onPress={() => setSelectedPage(index)}
          >
            <Image source={{ uri: page.uri }} style={styles.gridImage} />
            <Text style={styles.pageNumber}>{index + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.uploadButtonText}>Als PDF hochladen</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={selectedPage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPage(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedPage !== null && (
            <>
              <Image
                source={{ uri: pages[selectedPage].uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.rotateButton}
                onPress={() => handleRotate(selectedPage)}
              >
                <Text style={styles.rotateButtonText}>↻ Drehen</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: (width - 48) / 2,
    aspectRatio: 0.7,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalImage: {
    width: width - 32,
    height: '80%',
  },
  rotateButton: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rotateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});











