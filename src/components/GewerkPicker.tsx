import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getAllGewerk } from '../services/api';
import { ConcernId } from '../types';

interface GewerkPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gewerk: string) => void;
  projectNumber: string | null;
  concernID: ConcernId;
  selectedGewerk?: string;
}

export default function GewerkPicker({
  visible,
  onClose,
  onSelect,
  projectNumber,
  concernID,
  selectedGewerk,
}: GewerkPickerProps) {
  const [gewerke, setGewerke] = useState<string[]>([]);
  const [filteredGewerke, setFilteredGewerke] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadGewerke();
    } else {
      // Reset search when modal closes
      setSearchText('');
    }
  }, [visible, projectNumber, concernID]);

  useEffect(() => {
    // Filter Gewerke based on search text
    if (searchText.trim() === '') {
      setFilteredGewerke(gewerke);
    } else {
      const filtered = gewerke.filter(gewerk =>
        gewerk.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredGewerke(filtered);
    }
  }, [searchText, gewerke]);

  const loadGewerke = async () => {
    if (!concernID) {
      Alert.alert('Fehler', 'ConcernID fehlt');
      return;
    }

    setLoading(true);
    try {
      const allGewerke = await getAllGewerk(projectNumber, concernID);
      setGewerke(allGewerke);
      setFilteredGewerke(allGewerke);
    } catch (error) {
      console.error('Failed to load Gewerk:', error);
      Alert.alert('Fehler', 'Gewerke konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (gewerk: string) => {
    onSelect(gewerk);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gewerk auswählen</Text>
          
          {projectNumber && (
            <Text style={styles.modalSubtitle}>
              Projektbezogene Gewerke werden zuerst angezeigt
            </Text>
          )}

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Gewerk suchen..."
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Lade Gewerke...</Text>
            </View>
          ) : (
            <>
              {/* Gewerk List */}
              {filteredGewerke.length > 0 ? (
                <FlatList
                  data={filteredGewerke}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  style={styles.list}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedGewerk;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.gewerkItem,
                          isSelected && styles.gewerkItemSelected,
                        ]}
                        onPress={() => handleSelect(item)}
                      >
                        <Text
                          style={[
                            styles.gewerkText,
                            isSelected && styles.gewerkTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchText
                      ? 'Keine Gewerke gefunden'
                      : 'Keine Gewerke verfügbar'}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  list: {
    maxHeight: 300,
    marginBottom: 16,
  },
  gewerkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  gewerkItemSelected: {
    backgroundColor: '#007AFF',
  },
  gewerkText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  gewerkTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F9F9F9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});






