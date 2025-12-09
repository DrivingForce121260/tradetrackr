import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { getStandardLeistungNames } from '../services/api';
import { ConcernId } from '../types';

interface LeistungInputProps {
  value: string;
  onChangeText: (text: string) => void;
  concernID: ConcernId;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: any;
}

export default function LeistungInput({
  value,
  onChangeText,
  concernID,
  placeholder = 'Beschreibung der Leistung',
  multiline = false,
  numberOfLines = 2,
  style,
}: LeistungInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (concernID) {
      loadSuggestions();
    }
  }, [concernID]);

  useEffect(() => {
    // Filter suggestions based on current input
    if (value.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    } else {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && value.length > 0);
    }
  }, [value, suggestions]);

  const loadSuggestions = async () => {
    if (!concernID) return;
    
    setLoading(true);
    try {
      const leistungen = await getStandardLeistungNames(concernID);
      setSuggestions(leistungen);
    } catch (error) {
      console.error('Failed to load Leistung suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChangeText(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSpeechToText = async () => {
    // Check if Speech-to-Text is available
    if (Platform.OS === 'web') {
      Alert.alert('Hinweis', 'Speech-to-Text ist auf Web-Plattformen nicht verfügbar');
      return;
    }

    try {
      // For now, show an alert with instructions
      // In production, you would integrate @react-native-voice/voice or expo-speech
      // TODO: Install @react-native-voice/voice package for full Speech-to-Text support
      Alert.alert(
        'Spracheingabe',
        'Die vollständige Speech-to-Text Integration wird in einer zukünftigen Version verfügbar sein. Bitte geben Sie die Leistung manuell ein.',
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

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, style, multiline && styles.multilineInput]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor="#C7C7CC"
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              onChangeText('');
              setShowSuggestions(false);
            }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPress={handleSpeechToText}
        >
          <Text style={styles.micButtonText}>🎤</Text>
        </TouchableOpacity>
      </View>

      {/* AutoComplete Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredSuggestions.slice(0, 5)} // Limit to 5 suggestions
            keyExtractor={(item, index) => `${item}-${index}`}
            style={styles.suggestionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Leistungsverzeichnis Button */}
      <TouchableOpacity
        style={styles.lvButton}
        onPress={() => {
          Alert.alert(
            'Leistungsverzeichnis',
            'Das Leistungsverzeichnis wird in einer zukünftigen Version verfügbar sein.',
            [{ text: 'OK' }]
          );
        }}
      >
        <Text style={styles.lvButtonText}>📋 Leistungsverzeichnis</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  micButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  micButtonRecording: {
    backgroundColor: '#FF3B30',
  },
  micButtonText: {
    fontSize: 18,
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#000000',
  },
  lvButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    alignItems: 'center',
  },
  lvButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

