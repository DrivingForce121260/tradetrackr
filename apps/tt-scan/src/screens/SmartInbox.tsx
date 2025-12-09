/**
 * Smart Inbox Screen - Mobile
 * Displays email summaries with filtering capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<any>;

interface SmartInboxProps {
  navigation: NavigationProp;
}

interface EmailSummary {
  id: string;
  emailId: string;
  category: string;
  summaryBullets: string[];
  priority: string;
  status: string;
  assignedTo?: string | null;
  createdAt: Date;
}

export default function SmartInbox({ navigation }: SmartInboxProps) {
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch email summaries
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Get orgId from user (assuming it's stored in custom claims or somewhere)
    // For now, we'll use a placeholder
    const orgId = 'YOUR_ORG_ID'; // TODO: Get from user profile

    const constraints = [
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    ];

    const q = query(collection(db, 'emailSummaries'), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: EmailSummary[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          emailId: d.emailId,
          category: d.category,
          summaryBullets: d.summaryBullets || [],
          priority: d.priority,
          status: d.status,
          assignedTo: d.assignedTo,
          createdAt: d.createdAt?.toDate() || new Date(),
        };
      });
      setSummaries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      INVOICE: '#ef4444',
      ORDER: '#3b82f6',
      SHIPPING: '#10b981',
      CLAIM: '#f97316',
      COMPLAINT: '#a855f7',
      KYC: '#eab308',
      GENERAL: '#6b7280',
      SPAM: '#dc2626',
    };
    return colors[category] || colors.GENERAL;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      INVOICE: 'Rechnung',
      ORDER: 'Bestellung',
      SHIPPING: 'Versand',
      CLAIM: 'Reklamation',
      COMPLAINT: 'Beschwerde',
      KYC: 'Dokumente',
      GENERAL: 'Allgemein',
      SPAM: 'Spam',
    };
    return labels[category] || labels.GENERAL;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      done: 'Erledigt',
    };
    return labels[status] || status;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'normal':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const filteredSummaries = summaries.filter((summary) => {
    if (categoryFilter && summary.category !== categoryFilter) return false;
    if (statusFilter && summary.status !== statusFilter) return false;
    return true;
  });

  const renderEmailItem = ({ item }: { item: EmailSummary }) => (
    <TouchableOpacity
      style={styles.emailCard}
      onPress={() => navigation.navigate('EmailDetail', { emailId: item.emailId })}
    >
      <View style={styles.emailHeader}>
        <View style={styles.badges}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) },
            ]}
          >
            <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
          </View>
          <Text style={styles.priorityIcon}>{getPriorityIcon(item.priority)}</Text>
        </View>
        <Text style={styles.timestamp}>
          {item.createdAt.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.summaryContainer}>
        {item.summaryBullets.map((bullet, index) => (
          <View key={index} style={styles.bulletItem}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        {item.assignedTo && (
          <View style={styles.assignedBadge}>
            <Text style={styles.assignedText}>Zugewiesen</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#058bc0" />
        <Text style={styles.loadingText}>Lade E-Mails...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Smart Inbox</Text>
        <Text style={styles.subtitle}>
          {filteredSummaries.length} E-Mail{filteredSummaries.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !categoryFilter && styles.filterChipActive]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text
              style={[styles.filterText, !categoryFilter && styles.filterTextActive]}
            >
              Alle
            </Text>
          </TouchableOpacity>
          {['INVOICE', 'ORDER', 'SHIPPING', 'GENERAL'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                categoryFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.filterText,
                  categoryFilter === cat && styles.filterTextActive,
                ]}
              >
                {getCategoryLabel(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Email List */}
      <FlatList
        data={filteredSummaries}
        renderItem={renderEmailItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Keine E-Mails gefunden</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#058bc0',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  emailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  priorityIcon: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  summaryContainer: {
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bulletDot: {
    color: '#058bc0',
    marginRight: 8,
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  assignedBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  assignedText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});









