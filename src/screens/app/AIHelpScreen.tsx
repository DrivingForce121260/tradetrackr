/**
 * AI Help Screen
 * AI-powered problem solver for field technicians
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import ChatBubble from '../../components/ChatBubble';
import Chip from '../../components/Chip';
import { useAuthStore } from '../../store/authStore';
import { sendAIMessage } from '../../services/aiClient';
import { addNote } from '../../services/api';
import { featureFlags } from '../../config/featureFlags';
import { AIMessage } from '../../types';
import { ProjectStackParamList } from '../../navigation/types';

type AIHelpRouteProp = RouteProp<ProjectStackParamList, 'AIHelp'>;

const QUICK_PROMPTS = [
  'Arbeitsauftrag erklären',
  'Schritte vorschlagen',
  'Anleitung zusammenfassen',
  'Material prüfen',
  'Notiz für Baustelle',
];

export default function AIHelpScreen() {
  const route = useRoute<AIHelpRouteProp>();
  const { projectId, taskId } = route.params;

  const session = useAuthStore((state) => state.session);

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // Check if AI feature is enabled
  if (!featureFlags.aiHelp) {
    return (
      <View style={styles.container}>
        <View style={styles.contextBar}>
          <Text style={styles.contextText}>KI-Assistent nicht verfügbar</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 17, color: '#8E8E93', textAlign: 'center' }}>
            Die KI-Assistenz-Funktion ist derzeit deaktiviert.
          </Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    // Add initial system message
    if (session) {
      const systemMsg: AIMessage = {
        id: 'system-welcome',
        concernID: session.concernID,
        userId: 'system',
        role: 'system',
        content: `Willkommen beim KI-Assistenten! ${projectId ? `Projekt: ${projectId}` : 'Kein Projekt ausgewählt'}${taskId ? ` | Aufgabe: ${taskId}` : ''}`,
        context: { projectId, taskId },
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };
      setMessages([systemMsg]);
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !session) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      concernID: session.concernID,
      userId: session.userId,
      role: 'user',
      content: text.trim(),
      context: { projectId, taskId },
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const response = await sendAIMessage({
        concernID: session.concernID,
        userId: session.userId,
        projectId,
        taskId,
        message: text.trim(),
      });

      setMessages((prev) => [...prev, response]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      // Error already logged in aiClient.ts
      Alert.alert(
        'KI-Anfrage fehlgeschlagen',
        error.message || 'Bitte erneut versuchen oder später wiederholen.',
        [{ text: 'OK' }]
      );
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleInsertAsNote = async (message: AIMessage) => {
    if (!session || !projectId) {
      Alert.alert('Fehler', 'Kein Projekt ausgewählt');
      return;
    }

    Alert.alert(
      'Als Notiz speichern',
      'Diese Antwort als Notiz zum Projekt hinzufügen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Speichern',
          onPress: async () => {
            try {
              await addNote({
                concernID: session.concernID,
                userId: session.userId,
                projectId,
                taskId,
                text: message.content,
                source: 'ai_suggestion',
              });
              Alert.alert('Erfolg', 'Notiz gespeichert');
            } catch (error) {
              console.error('Failed to save note:', error);
              Alert.alert('Fehler', 'Notiz konnte nicht gespeichert werden');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.contextBar}>
        <Text style={styles.contextText}>
          {projectId ? `Projekt: ${projectId.substring(0, 12)}...` : 'Kein Projekt'}
          {taskId && ` | Aufgabe: ${taskId.substring(0, 8)}...`}
        </Text>
      </View>

      <View style={styles.quickPromptsContainer}>
        <FlatList
          horizontal
          data={QUICK_PROMPTS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip label={item} onPress={() => handleQuickPrompt(item)} />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsList}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <ChatBubble message={item} />
            {item.role === 'assistant' && projectId && (
              <View style={styles.messageActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleInsertAsNote(item)}
                >
                  <Text style={styles.actionButtonText}>📝 Als Notiz speichern</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nachricht eingeben..."
          placeholderTextColor="#C7C7CC"
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '...' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contextBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9EB',
  },
  contextText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  quickPromptsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9EB',
  },
  quickPromptsList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messagesList: {
    paddingVertical: 12,
  },
  messageActions: {
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#E9E9EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9E9EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});

