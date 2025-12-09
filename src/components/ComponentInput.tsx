import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import ComponentPicker from './ComponentPicker';
import CascadingPicker from './CascadingPicker';
import { getAllLookupFamilies, LookupFamily } from '../services/api';
import { ConcernId } from '../types';

interface ComponentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  concernID: ConcernId;
  projectNumber: string | null;
  gewerk: string;
  availableFamilies: LookupFamily[];
  onFamilySelect?: (familyId: string) => void;
  placeholder?: string;
  style?: any;
  required?: boolean;
}

export default function ComponentInput({
  value,
  onChangeText,
  concernID,
  projectNumber,
  gewerk,
  availableFamilies,
  onFamilySelect,
  placeholder = 'Komponente eingeben oder auswählen...',
  style,
  required = false,
}: ComponentInputProps) {
  const [showComponentPicker, setShowComponentPicker] = useState(false);
  const [showCascadingPicker, setShowCascadingPicker] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [cascadingSelection, setCascadingSelection] = useState<Record<string, string>>({});
  const inputRef = useRef<TextInput>(null);

  const handleSpeechToText = async () => {
    // Check if Speech-to-Text is available
    if (Platform.OS === 'web') {
      Alert.alert('Hinweis', 'Speech-to-Text ist auf Web-Plattformen nicht verfügbar');
      return;
    }

    try {
      // For now, show an alert with instructions
      // TODO: Integrate @react-native-voice/voice or expo-speech for full Speech-to-Text support
      Alert.alert(
        'Spracheingabe',
        'Die vollständige Speech-to-Text Integration wird in einer zukünftigen Version verfügbar sein. Bitte geben Sie die Komponente manuell ein.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => {
              // Focus the input field for manual entry
              inputRef.current?.focus();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Speech-to-Text error:', error);
      Alert.alert('Fehler', 'Spracheingabe konnte nicht gestartet werden');
    }
  };

  const handleOCR = async () => {
    // Check if OCR is available
    if (Platform.OS === 'web') {
      Alert.alert('Hinweis', 'OCR ist auf Web-Plattformen nicht verfügbar');
      return;
    }

    try {
      // For now, show an alert with instructions
      // TODO: Integrate react-native-vision-camera or expo-camera with OCR library
      Alert.alert(
        'Label scannen',
        'Die OCR-Funktion zum Scannen von Labels wird in einer zukünftigen Version verfügbar sein. Bitte geben Sie die Komponente manuell ein oder wählen Sie aus der Liste.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => {
              // Focus the input field for manual entry
              inputRef.current?.focus();
            },
          },
        ]
      );
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('Fehler', 'OCR konnte nicht gestartet werden');
    }
  };

  const handleDropdownSelect = () => {
    if (!projectNumber) {
      Alert.alert('Hinweis', 'Bitte wählen Sie zuerst ein Projekt aus');
      return;
    }
    if (!gewerk) {
      Alert.alert('Hinweis', 'Bitte wählen Sie zuerst ein Gewerk aus');
      return;
    }
    setShowComponentPicker(true);
  };

  const handleCascadingSelect = (familyId: string) => {
    if (!gewerk) {
      Alert.alert('Hinweis', 'Bitte wählen Sie zuerst ein Gewerk aus');
      return;
    }
    setSelectedFamilyId(familyId);
    setShowCascadingPicker(true);
    setCascadingSelection({});
    if (onFamilySelect) {
      onFamilySelect(familyId);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, style]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          multiline={false}
        />
        
        {/* Action buttons inside input */}
        <View style={styles.actionButtons}>
          {/* Speech-to-Text Button */}
          <TouchableOpacity
            onPress={handleSpeechToText}
            style={styles.iconButton}
            accessibilityLabel="Spracheingabe"
          >
            <Text style={styles.iconButtonText}>🎤</Text>
          </TouchableOpacity>

          {/* OCR Button */}
          <TouchableOpacity
            onPress={handleOCR}
            style={styles.iconButton}
            accessibilityLabel="Label scannen"
          >
            <Text style={styles.iconButtonText}>📷</Text>
          </TouchableOpacity>

          {/* Cascading Picker Buttons (if families available) */}
          {availableFamilies.length > 0 && (
            <>
              {availableFamilies.map((family) => (
                <TouchableOpacity
                  key={family.id}
                  onPress={() => handleCascadingSelect(family.familyId)}
                  style={styles.familyButton}
                  disabled={!gewerk}
                  accessibilityLabel={`${family.name} auswählen`}
                >
                  <Text style={[styles.familyButtonText, !gewerk && styles.familyButtonTextDisabled]}>
                    {family.name.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Traditional Dropdown Button */}
          <TouchableOpacity
            onPress={handleDropdownSelect}
            style={styles.iconButton}
            disabled={!projectNumber || !gewerk}
            accessibilityLabel="Aus Liste auswählen"
          >
            <Text style={[styles.iconButtonText, (!projectNumber || !gewerk) && styles.iconButtonTextDisabled]}>
              ▼
            </Text>
          </TouchableOpacity>

          {/* Clear Button */}
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeText('')}
              style={styles.iconButton}
              accessibilityLabel="Löschen"
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Component Picker Modal */}
      <ComponentPicker
        visible={showComponentPicker}
        onClose={() => setShowComponentPicker(false)}
        onSelect={(component) => {
          if (typeof component === 'string') {
            onChangeText(component);
          } else {
            onChangeText(component.projectElement);
          }
          setShowComponentPicker(false);
        }}
        projectNumber={projectNumber}
        concernID={concernID}
        selectedComponent={value}
        gewerk={gewerk}
      />

      {/* Cascading Picker Modal */}
      {selectedFamilyId && (
        <CascadingPicker
          visible={showCascadingPicker}
          onClose={() => {
            setShowCascadingPicker(false);
            if (Object.keys(cascadingSelection).length === 0) {
              setSelectedFamilyId(null);
            }
          }}
          onSelect={(selection) => {
            const componentString = Object.values(selection).join(' - ');
            onChangeText(componentString);
            setCascadingSelection(selection);
            setShowCascadingPicker(false);
          }}
          familyId={selectedFamilyId}
          concernID={concernID}
          initialSelection={cascadingSelection}
          label={availableFamilies.find(f => f.familyId === selectedFamilyId)?.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#D1D1D6',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    paddingVertical: 10,
    paddingRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  iconButtonText: {
    fontSize: 20,
  },
  iconButtonTextDisabled: {
    opacity: 0.3,
  },
  familyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginLeft: 4,
  },
  familyButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  familyButtonTextDisabled: {
    opacity: 0.3,
    color: '#8E8E93',
  },
  clearButton: {
    padding: 8,
    marginLeft: 5,
  },
  clearButtonText: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '600',
  },
});






