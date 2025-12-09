/**
 * Task Item Component
 * Displays a task in a list with status toggle
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
}

export default function TaskItem({ task, onPress }: TaskItemProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'in_progress':
        return '🔄';
      default:
        return '⭕';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
        return 'Fertig';
      case 'in_progress':
        return 'In Arbeit';
      default:
        return 'Offen';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#34C759';
      case 'in_progress':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getStatusIcon(task.status)}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        
        <View style={styles.footer}>
          <Text style={[styles.status, { color: getStatusColor(task.status) }]}>
            {getStatusLabel(task.status)}
          </Text>
          {task.dueDate && (
            <Text style={styles.dueDate}>
              Fällig: {formatDate(task.dueDate)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
});








