/**
 * Email Detail Screen - Mobile
 * Displays full email details with actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<any>;

interface EmailDetailProps {
  navigation: NavigationProp;
  route: {
    params: {
      emailId: string;
    };
  };
}

interface Email {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  receivedAt: Date;
  category?: string;
  hasAttachments: boolean;
}

interface Attachment {
  fileName: string;
  mimeType: string;
  docType?: string;
}

export default function EmailDetail({ navigation, route }: EmailDetailProps) {
  const { emailId } = route.params;
  const [email, setEmail] = useState<Email | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadEmailDetails();
  }, [emailId]);

  const loadEmailDetails = async () => {
    try {
      // Fetch email
      const emailQuery = query(
        collection(db, 'incomingEmails'),
        where('__name__', '==', emailId)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const emailData = emailSnapshot.docs[0].data();
        setEmail({
          from: emailData.from,
          to: emailData.to || [],
          cc: emailData.cc || [],
          subject: emailData.subject,
          bodyText: emailData.bodyText,
          receivedAt: emailData.receivedAt?.toDate() || new Date(),
          category: emailData.category,
          hasAttachments: emailData.hasAttachments || false,
        });

        // Fetch attachments
        if (emailData.hasAttachments) {
          const attachQuery = query(
            collection(db, 'emailAttachments'),
            where('emailId', '==', emailId)
          );
          const attachSnapshot = await getDocs(attachQuery);
          const attachData: Attachment[] = attachSnapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              fileName: d.fileName,
              mimeType: d.mimeType,
              docType: d.docType,
            };
          });
          setAttachments(attachData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading email:', error);
      Alert.alert('Fehler', 'E-Mail konnte nicht geladen werden');
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const summaryRef = doc(db, 'emailSummaries', emailId);
      await updateDoc(summaryRef, { status });
      Alert.alert('Erfolg', `Status auf "${status}" gesetzt`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Fehler', 'Status konnte nicht aktualisiert werden');
    } finally {
      setUpdating(false);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#058bc0" />
        <Text style={styles.loadingText}>Lade E-Mail...</Text>
      </View>
    );
  }

  if (!email) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>E-Mail nicht gefunden</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Mail Details</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Category Badge */}
        {email.category && (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>
              {getCategoryLabel(email.category)}
            </Text>
          </View>
        )}

        {/* Subject */}
        <Text style={styles.subject}>{email.subject}</Text>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Von:</Text>
            <Text style={styles.metaValue}>{email.from}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>An:</Text>
            <Text style={styles.metaValue}>{email.to.join(', ')}</Text>
          </View>
          {email.cc.length > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>CC:</Text>
              <Text style={styles.metaValue}>{email.cc.join(', ')}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Empfangen:</Text>
            <Text style={styles.metaValue}>
              {email.receivedAt.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Attachments */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.sectionTitle}>
              Anhänge ({attachments.length})
            </Text>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Text style={styles.attachmentName}>{attachment.fileName}</Text>
                <Text style={styles.attachmentMeta}>
                  {attachment.mimeType}
                  {attachment.docType && ` • ${attachment.docType}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Email Body */}
        <View style={styles.bodyContainer}>
          <Text style={styles.sectionTitle}>Nachricht:</Text>
          <Text style={styles.bodyText}>{email.bodyText}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Aktionen:</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.openButton]}
            onPress={() => updateStatus('open')}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Offen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.progressButton]}
            onPress={() => updateStatus('in_progress')}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>In Bearbeitung</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.doneButton]}
            onPress={() => updateStatus('done')}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Erledigt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 24,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    fontSize: 16,
    color: '#058bc0',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  subject: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  metaContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  attachmentsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  attachmentItem: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  attachmentMeta: {
    fontSize: 12,
    color: '#666',
  },
  bodyContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  actionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#fbbf24',
  },
  progressButton: {
    backgroundColor: '#3b82f6',
  },
  doneButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  button: {
    backgroundColor: '#058bc0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});









