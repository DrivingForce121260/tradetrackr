import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import PrimaryButton from './PrimaryButton';
import { getLookupFamily, getLookupOptions, LookupFamily, LookupOption } from '../services/api';
import { ConcernId } from '../types';

interface CascadingPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: Record<string, string>) => void;
  familyId: string;
  concernID: ConcernId;
  initialSelection?: Record<string, string>;
  label?: string;
}

export default function CascadingPicker({
  visible,
  onClose,
  onSelect,
  familyId,
  concernID,
  initialSelection = {},
  label,
}: CascadingPickerProps) {
  const [family, setFamily] = useState<LookupFamily | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Record<string, string>>(initialSelection);
  const [optionsByLevel, setOptionsByLevel] = useState<Record<number, LookupOption[]>>({});
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);

  useEffect(() => {
    if (visible && familyId && concernID) {
      loadFamily();
    }
  }, [visible, familyId, concernID]);

  useEffect(() => {
    if (visible) {
      setSelection(initialSelection);
    }
  }, [visible, initialSelection]);

  const loadFamily = async () => {
    setLoading(true);
    try {
      const fetchedFamily = await getLookupFamily(familyId, concernID);
      if (!fetchedFamily) {
        Alert.alert('Fehler', `Family "${familyId}" nicht gefunden`);
        setLoading(false);
        return;
      }

      setFamily(fetchedFamily);
      
      // Load options for first level
      if (fetchedFamily.levels.length > 0) {
        await loadOptionsForLevel(0);
      }
    } catch (error) {
      console.error('Failed to load family:', error);
      Alert.alert('Fehler', 'Family konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadOptionsForLevel = async (levelIndex: number) => {
    if (!family || levelIndex >= family.levels.length) {
      return;
    }

    setLoadingLevel(levelIndex);
    try {
      const options = await getLookupOptions(
        family.familyId,
        levelIndex,
        family.levels,
        selection,
        concernID
      );

      setOptionsByLevel(prev => ({
        ...prev,
        [levelIndex]: options,
      }));
    } catch (error) {
      console.error(`Failed to load options for level ${levelIndex}:`, error);
      setOptionsByLevel(prev => ({
        ...prev,
        [levelIndex]: [],
      }));
    } finally {
      setLoadingLevel(null);
    }
  };

  const handleLevelChange = async (levelIndex: number, value: string) => {
    if (!family) return;

    const levelKey = family.levels[levelIndex];
    const newSelection = { ...selection, [levelKey]: value };

    // Clear selections for deeper levels
    for (let i = levelIndex + 1; i < family.levels.length; i++) {
      delete newSelection[family.levels[i]];
      delete optionsByLevel[i];
    }

    setSelection(newSelection);

    // Load options for next level if exists
    const nextLevel = levelIndex + 1;
    if (nextLevel < family.levels.length) {
      await loadOptionsForLevel(nextLevel);
    }
  };

  const handleSelect = () => {
    // Validate that all levels are selected
    if (!family) return;

    const allSelected = family.levels.every(levelKey => selection[levelKey]);
    if (!allSelected) {
      Alert.alert('Hinweis', 'Bitte wählen Sie alle Ebenen aus');
      return;
    }

    onSelect(selection);
    onClose();
  };

  const formatLevelLabel = (key: string): string => {
    // Convert camelCase to Title Case
    // e.g., cableType → Cable Type
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {label || family?.name || 'Auswahl'}
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Lade Daten...</Text>
            </View>
          ) : !family ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Family nicht gefunden</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView}>
              {family.levels.map((levelKey, levelIndex) => {
                const isEnabled = levelIndex === 0 || selection[family.levels[levelIndex - 1]];
                const options = optionsByLevel[levelIndex] || [];
                const selectedValue = selection[levelKey];
                const isLoading = loadingLevel === levelIndex;

                return (
                  <View key={levelIndex} style={styles.levelContainer}>
                    <Text style={styles.levelLabel}>
                      {formatLevelLabel(levelKey)}
                      {levelIndex === 0 && ' *'}
                    </Text>
                    
                    {isLoading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.loadingTextSmall}>Lade Optionen...</Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.optionsScrollView}
                      >
                        {options.length === 0 ? (
                          <Text style={styles.emptyText}>
                            {isEnabled ? 'Keine Optionen verfügbar' : 'Wählen Sie zuerst die vorherige Ebene'}
                          </Text>
                        ) : (
                          options.map((option) => {
                            const isSelected = selectedValue === option.value;
                            return (
                              <TouchableOpacity
                                key={option.id}
                                style={[
                                  styles.optionButton,
                                  isSelected && styles.optionButtonSelected,
                                  !isEnabled && styles.optionButtonDisabled,
                                ]}
                                onPress={() => {
                                  if (isEnabled) {
                                    handleLevelChange(levelIndex, option.value);
                                  }
                                }}
                                disabled={!isEnabled}
                              >
                                <Text
                                  style={[
                                    styles.optionText,
                                    isSelected && styles.optionTextSelected,
                                    !isEnabled && styles.optionTextDisabled,
                                  ]}
                                >
                                  {option.value}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </ScrollView>
                    )}
                  </View>
                );
              })}

              {/* Display current selection summary */}
              {Object.keys(selection).length > 0 && (
                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionSummaryLabel}>Auswahl:</Text>
                  <Text style={styles.selectionSummaryText}>
                    {family.levels
                      .filter(key => selection[key])
                      .map(key => `${formatLevelLabel(key)}: ${selection[key]}`)
                      .join(' | ')}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <PrimaryButton
              title="Abbrechen"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            {family && (
              <PrimaryButton
                title="Auswählen"
                onPress={handleSelect}
                style={styles.modalButton}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#000000',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  scrollView: {
    maxHeight: 400,
  },
  levelContainer: {
    marginBottom: 20,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingTextSmall: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  optionsScrollView: {
    marginHorizontal: -4,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 4,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    minWidth: 80,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E5E5EA',
    opacity: 0.5,
  },
  optionText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: '#8E8E93',
  },
  selectionSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectionSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  selectionSummaryText: {
    fontSize: 14,
    color: '#000000',
  },
  modalActions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});






