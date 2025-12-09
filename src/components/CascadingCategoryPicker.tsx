// ============================================================================
// CASCADING CATEGORY PICKER - Mobile App
// ============================================================================
// Cascading picker for hierarchical category selection in React Native
// Uses the unified category model from /categories collection
// Sequential navigation pattern: Screen 1 → Screen 2 → Screen 3

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
  Platform,
} from 'react-native';
import PrimaryButton from './PrimaryButton';
import { CategoryPickerValue, CascadingCategoryPickerProps } from '../types/categoryPicker';
import { Category } from '../types/category';
import { getChildren, getCategoryPath, findCategoryById } from '../lib/categories/categoryHelpers';
import { useCategories } from '../hooks/useCategories';
import { ConcernId } from '../types';

interface CascadingCategoryPickerMobileProps extends CascadingCategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  concernID: ConcernId;  // Mobile uses concernID instead of orgId
}

export default function CascadingCategoryPicker({
  visible,
  onClose,
  orgId,
  concernID,
  value,
  onChange,
  disabled = false,
  allowInactiveSelection = false,
  placeholder = 'Kategorie auswählen...',
  label,
  required = false,
  maxDepth
}: CascadingCategoryPickerMobileProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string[]>([]); // Array of categoryIds
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]); // Array of names for display

  // Use concernID if orgId not provided (mobile compatibility)
  const effectiveOrgId = orgId || concernID;

  // Use central categories hook
  const { categories, isLoading: loading, error: categoriesError, isStale } = useCategories(effectiveOrgId || null);

  // Initialize from value.categoryId
  useEffect(() => {
    if (visible && value.categoryId && categories.length > 0) {
      const category = findCategoryById(categories, value.categoryId);
      if (category) {
        const path = getCategoryPath(categories, value.categoryId);
        const pathIds: string[] = [];
        let current: Category | null = category;
        
        while (current) {
          pathIds.unshift(current.categoryId);
          if (current.parentId) {
            current = findCategoryById(categories, current.parentId);
          } else {
            current = null;
          }
        }
        
        setSelectedPath(pathIds);
        setSelectedCategoryNames(path);
        setCurrentLevel(pathIds.length - 1);
      }
    } else if (visible) {
      // Reset when opening
      setSelectedPath([]);
      setSelectedCategoryNames([]);
      setCurrentLevel(0);
    }
  }, [visible, value.categoryId, categories]);

  // Get options for current level
  const getCurrentLevelOptions = (): Category[] => {
    if (currentLevel === 0) {
      return getChildren(categories, null);
    }
    
    const parentId = selectedPath[currentLevel - 1] || null;
    return getChildren(categories, parentId);
  };

  // Handle category selection at current level
  const handleCategorySelect = (category: Category) => {
    if (disabled) return;

    const newPath = [...selectedPath.slice(0, currentLevel), category.categoryId];
    const newNames = [...selectedCategoryNames.slice(0, currentLevel), category.name];
    
    setSelectedPath(newPath);
    setSelectedCategoryNames(newNames);

    // Check if category has children
    const children = getChildren(categories, category.categoryId);
    
    if (children.length > 0 && (maxDepth === undefined || newPath.length < maxDepth)) {
      // Go to next level
      setCurrentLevel(currentLevel + 1);
    } else {
      // This is a leaf category - confirm selection
      handleConfirm(newPath, newNames);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1);
      // Clear deeper selections
      setSelectedPath(selectedPath.slice(0, currentLevel - 1));
      setSelectedCategoryNames(selectedCategoryNames.slice(0, currentLevel - 1));
    } else {
      // Close modal
      onClose();
    }
  };

  // Handle confirm (final selection)
  const handleConfirm = (path?: string[], names?: string[]) => {
    const finalPath = path || selectedPath;
    const finalNames = names || selectedCategoryNames;
    
    if (finalPath.length === 0) {
      if (required) {
        Alert.alert('Hinweis', 'Bitte wählen Sie eine Kategorie aus');
        return;
      }
      onChange({ categoryId: null, path: [] });
      onClose();
      return;
    }

    const finalCategoryId = finalPath[finalPath.length - 1];
    onChange({
      categoryId: finalCategoryId,
      path: finalNames
    });
    
    onClose();
  };

  // Handle clear selection
  const handleClear = () => {
    if (required) {
      Alert.alert('Hinweis', 'Eine Kategorie ist erforderlich');
      return;
    }
    
    setSelectedPath([]);
    setSelectedCategoryNames([]);
    setCurrentLevel(0);
    onChange({ categoryId: null, path: [] });
    onClose();
  };

  const currentOptions = getCurrentLevelOptions();
  const hasSelection = selectedPath.length > 0;
  const canGoBack = currentLevel > 0;
  const isLeafCategory = currentOptions.length === 0 && hasSelection;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={canGoBack ? handleBack : onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>{canGoBack ? '← Zurück' : '✕'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {label || 'Kategorie auswählen'}
            </Text>
            {!required && hasSelection && (
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Löschen</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Breadcrumb */}
          {selectedCategoryNames.length > 0 && (
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>
                {selectedCategoryNames.join(' > ')}
              </Text>
            </View>
          )}

          {/* Loading */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#058bc0" />
              <Text style={styles.loadingText}>Lade Kategorien...</Text>
            </View>
          ) : categoriesError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Kategorien konnten nicht geladen werden.
              </Text>
              {isStale && (
                <Text style={styles.staleText}>
                  Offline-Modus: Verwendet letzte bekannte Kategorien.
                </Text>
              )}
            </View>
          ) : currentOptions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {hasSelection 
                  ? 'Diese Kategorie hat keine Unterkategorien'
                  : 'Keine Kategorien verfügbar'}
              </Text>
              {hasSelection && (
                <PrimaryButton
                  title="Diese Kategorie auswählen"
                  onPress={() => handleConfirm()}
                  style={styles.confirmButton}
                />
              )}
            </View>
          ) : (
            <>
              {/* Level indicator */}
              <View style={styles.levelIndicator}>
                <Text style={styles.levelIndicatorText}>
                  {currentLevel === 0 
                    ? 'Hauptkategorie'
                    : `Unterkategorie ${currentLevel}`}
                </Text>
              </View>

              {/* Options list */}
              <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
                {currentOptions.map((category) => {
                  const children = getChildren(categories, category.categoryId);
                  const hasChildren = children.length > 0 && (maxDepth === undefined || selectedPath.length < maxDepth);
                  
                  return (
                    <TouchableOpacity
                      key={category.categoryId}
                      style={[
                        styles.optionButton,
                        selectedPath[currentLevel] === category.categoryId && styles.optionButtonSelected,
                        disabled && styles.optionButtonDisabled,
                      ]}
                      onPress={() => handleCategorySelect(category)}
                      disabled={disabled}
                    >
                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionText,
                            selectedPath[currentLevel] === category.categoryId && styles.optionTextSelected,
                            !category.active && styles.optionTextInactive,
                          ]}
                        >
                          {category.name}
                        </Text>
                        {!category.active && (
                          <Text style={styles.inactiveBadge}>(inaktiv)</Text>
                        )}
                        {hasChildren && (
                          <Text style={styles.arrowText}>→</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Actions */}
              {hasSelection && (
                <View style={styles.modalActions}>
                  <PrimaryButton
                    title="Auswählen"
                    onPress={() => handleConfirm()}
                    style={styles.confirmButton}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#058bc0',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  breadcrumb: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  levelIndicator: {
    marginBottom: 12,
  },
  levelIndicatorText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  optionButton: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#058bc0',
    borderWidth: 2,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  optionTextSelected: {
    color: '#058bc0',
    fontWeight: '600',
  },
  optionTextInactive: {
    color: '#8E8E93',
  },
  inactiveBadge: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 18,
    color: '#058bc0',
    marginLeft: 8,
    fontWeight: '600',
  },
  modalActions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  confirmButton: {
    marginTop: 8,
  },
});

