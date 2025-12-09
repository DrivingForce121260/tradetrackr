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
import { getProjectComponents, ProjectComponent } from '../services/api';
import { ConcernId } from '../types';

interface ComponentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (component: ProjectComponent | string) => void;
  projectNumber: string | null;
  concernID: ConcernId;
  selectedComponent?: string;
  gewerk?: string; // Optional filter by Gewerk
}

export default function ComponentPicker({
  visible,
  onClose,
  onSelect,
  projectNumber,
  concernID,
  selectedComponent,
  gewerk,
}: ComponentPickerProps) {
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [filteredComponents, setFilteredComponents] = useState<ProjectComponent[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && projectNumber) {
      loadComponents();
    } else {
      // Reset search when modal closes
      setSearchText('');
    }
  }, [visible, projectNumber, concernID, gewerk]);

  useEffect(() => {
    // Filter components based on search text
    if (searchText.trim() === '') {
      setFilteredComponents(components);
    } else {
      const filtered = components.filter(comp =>
        comp.projectElement.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredComponents(filtered);
    }
  }, [searchText, components]);

  const loadComponents = async () => {
    if (!projectNumber || !concernID) {
      Alert.alert('Fehler', 'Projektnummer oder ConcernID fehlt');
      return;
    }

    setLoading(true);
    try {
      const projectComponents = await getProjectComponents(
        projectNumber,
        concernID,
        gewerk
      );
      setComponents(projectComponents);
      setFilteredComponents(projectComponents);
    } catch (error) {
      console.error('Failed to load components:', error);
      Alert.alert('Fehler', 'Komponenten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (component: ProjectComponent) => {
    // Return the full component object, but display name + quantity
    onSelect(component);
    onClose();
  };

  const formatComponentDisplay = (comp: ProjectComponent): string => {
    if (comp.quantity > 1) {
      return `${comp.projectElement} (${comp.quantity}x)`;
    }
    return comp.projectElement;
  };

  const isSelected = (comp: ProjectComponent): boolean => {
    return comp.projectElement === selectedComponent || comp.id === selectedComponent;
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
          <Text style={styles.modalTitle}>Komponente auswählen</Text>
          
          {gewerk && (
            <Text style={styles.modalSubtitle}>
              Gefiltert nach Gewerk: {gewerk}
            </Text>
          )}

          {!gewerk && (
            <Text style={styles.modalSubtitle}>
              Projektbezogene Komponenten
            </Text>
          )}

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Komponente suchen..."
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
              <Text style={styles.loadingText}>Lade Komponenten...</Text>
            </View>
          ) : (
            <>
              {/* Component List */}
              {filteredComponents.length > 0 ? (
                <FlatList
                  data={filteredComponents}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  renderItem={({ item }) => {
                    const selected = isSelected(item);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.componentItem,
                          selected && styles.componentItemSelected,
                        ]}
                        onPress={() => handleSelect(item)}
                      >
                        <View style={styles.componentInfo}>
                          <Text
                            style={[
                              styles.componentText,
                              selected && styles.componentTextSelected,
                            ]}
                          >
                            {formatComponentDisplay(item)}
                          </Text>
                          {item.componentLN && (
                            <Text
                              style={[
                                styles.componentLN,
                                selected && styles.componentLNSelected,
                              ]}
                            >
                              LN: {item.componentLN}
                            </Text>
                          )}
                        </View>
                        {selected && (
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
                      ? 'Keine Komponenten gefunden'
                      : projectNumber
                      ? 'Keine Komponenten für dieses Projekt verfügbar'
                      : 'Bitte wählen Sie zuerst ein Projekt aus'}
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
  componentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  componentItemSelected: {
    backgroundColor: '#007AFF',
  },
  componentInfo: {
    flex: 1,
  },
  componentText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  componentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  componentLN: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  componentLNSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
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
    textAlign: 'center',
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






