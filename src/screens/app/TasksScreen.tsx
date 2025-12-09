/**
 * Tasks Screen
 * List and manage tasks for a project
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import TaskItem from '../../components/TaskItem';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { getProjectTasks, updateTaskStatus, addNote } from '../../services/api';
import { Task } from '../../types';
import { ProjectStackParamList } from '../../navigation/types';

type TasksRouteProp = RouteProp<ProjectStackParamList, 'Tasks'>;

export default function TasksScreen() {
  const route = useRoute<TasksRouteProp>();
  const { projectId } = route.params;

  const session = useAuthStore((state) => state.session);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const data = await getProjectTasks(session.concernID, projectId, session.userId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskPress = (task: Task) => {
    // Cycle through statuses: open -> in_progress -> done -> open
    const nextStatus =
      task.status === 'open'
        ? 'in_progress'
        : task.status === 'in_progress'
        ? 'done'
        : 'open';

    Alert.alert(
      'Status ändern',
      `Aufgabe "${task.title}" auf "${getStatusLabel(nextStatus)}" setzen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ändern',
          onPress: async () => {
            if (!session) return;
            try {
              await updateTaskStatus(session.concernID, projectId, task.id, nextStatus);
              // Update local state
              setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
              );
            } catch (error) {
              console.error('Failed to update task:', error);
              Alert.alert('Fehler', 'Status konnte nicht aktualisiert werden');
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Offen';
      case 'in_progress':
        return 'In Arbeit';
      case 'done':
        return 'Fertig';
      default:
        return status;
    }
  };

  const handleAddNote = async () => {
    if (!session || !selectedTask || !noteText.trim()) {
      Alert.alert('Fehler', 'Bitte eine Notiz eingeben');
      return;
    }

    setAddingNote(true);
    try {
      await addNote({
        concernID: session.concernID,
        userId: session.userId,
        projectId,
        taskId: selectedTask.id,
        text: noteText.trim(),
        source: 'manual',
      });
      Alert.alert('Erfolg', 'Notiz hinzugefügt');
      setNoteText('');
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to add note:', error);
      Alert.alert('Fehler', 'Notiz konnte nicht hinzugefügt werden');
    } finally {
      setAddingNote(false);
    }
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
      {tasks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Keine Aufgaben vorhanden</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskItem task={item} onPress={() => handleTaskPress(item)} />
            )}
            contentContainerStyle={styles.listContent}
          />

          {selectedTask && (
            <View style={styles.noteSection}>
              <Text style={styles.noteLabel}>Notiz zu: {selectedTask.title}</Text>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Notiz eingeben..."
                multiline
                numberOfLines={3}
              />
              <View style={styles.noteActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => {
                    setSelectedTask(null);
                    setNoteText('');
                  }}
                  variant="secondary"
                  style={styles.noteButton}
                />
                <PrimaryButton
                  title="Speichern"
                  onPress={handleAddNote}
                  loading={addingNote}
                  disabled={addingNote}
                  style={styles.noteButton}
                />
              </View>
            </View>
          )}

          {!selectedTask && (
            <PrimaryButton
              title="📝 Notiz zu Aufgabe hinzufügen"
              onPress={() => {
                if (tasks.length > 0) {
                  setSelectedTask(tasks[0]);
                }
              }}
              variant="secondary"
            />
          )}
        </>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  listContent: {
    paddingBottom: 16,
  },
  noteSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F2F2F7',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  noteButton: {
    flex: 1,
  },
});








