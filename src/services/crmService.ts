// ============================================================================
// CRM SERVICE - FIRESTORE OPERATIONS
// ============================================================================

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  CRMAccount,
  CRMContact,
  CRMOpportunity,
  CRMQuote,
  CRMActivity,
  CRMLead,
  CRMPricebookItem,
  CRMPipeline,
  CRMAccountFormData,
  CRMContactFormData,
  CRMOpportunityFormData,
  CRMQuoteFormData,
  CRMStats
} from '@/types/crm';

const COLLECTIONS = {
  ACCOUNTS: 'crm_accounts',
  CONTACTS: 'crm_contacts',
  OPPORTUNITIES: 'crm_opportunities',
  QUOTES: 'crm_quotes',
  ACTIVITIES: 'crm_activities',
  LEADS: 'crm_leads',
  PRICEBOOK: 'crm_pricebook',
  PIPELINES: 'crm_pipelines',
  FILES: 'crm_files'
};

export class CRMService {
  private currentUser: any;
  private concernID: string;

  constructor(user: any, concernID: string) {
    this.currentUser = user;
    this.concernID = concernID;
  }

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  async createAccount(accountData: CRMAccountFormData): Promise<string> {
    try {
      // Dedupe by VAT or billing email
      if (accountData.vatId) {
        const vatQ = query(collection(db, COLLECTIONS.ACCOUNTS), where('vatId', '==', accountData.vatId));
        const vatSnap = await getDocs(vatQ);
        if (!vatSnap.empty) {
          const match = vatSnap.docs[0];
          await updateDoc(match.ref, {
            name: accountData.name || match.data().name,
            legalForm: accountData.legalForm || match.data().legalForm,
            addresses: (accountData.addresses && accountData.addresses.length) ? accountData.addresses : match.data().addresses,
            billingEmail: accountData.billingEmail || match.data().billingEmail,
            tags: (accountData.tags && accountData.tags.length) ? accountData.tags : match.data().tags,
            updatedAt: serverTimestamp(),
          });
          return match.id;
        }
      }
      if (accountData.billingEmail) {
        const mailQ = query(collection(db, COLLECTIONS.ACCOUNTS), where('billingEmail', '==', accountData.billingEmail));
        const mailSnap = await getDocs(mailQ);
        if (!mailSnap.empty) {
          const match = mailSnap.docs[0];
          await updateDoc(match.ref, {
            name: accountData.name || match.data().name,
            legalForm: accountData.legalForm || match.data().legalForm,
            addresses: (accountData.addresses && accountData.addresses.length) ? accountData.addresses : match.data().addresses,
            tags: (accountData.tags && accountData.tags.length) ? accountData.tags : match.data().tags,
            updatedAt: serverTimestamp(),
          });
          return match.id;
        }
      }

      const account: Omit<CRMAccount, 'id' | 'createdAt' | 'updatedAt'> = {
        ...accountData,
        addresses: accountData.addresses || [],
        tags: accountData.tags || [],
        ownerUserId: this.currentUser.uid,
        stats: {
          totalProjects: 0,
          lifetimeValue: 0
        }
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.ACCOUNTS), {
        ...account,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating CRM account:', error);
      throw error;
    }
  }

  async upsertAccountsFromCSV(rows: Array<Record<string, string>>): Promise<{ inserted: number; updated: number }> {
    let inserted = 0, updated = 0;
    for (const row of rows) {
      const form: CRMAccountFormData = {
        name: row.name || row.company || '',
        legalForm: row.legalForm || '',
        vatId: row.vatId || row.vat || '',
        addresses: row.address ? [{ street: row.address }] : [],
        billingEmail: row.email || '',
        tags: row.tags ? row.tags.split(',').map(s => s.trim()) : [],
        source: 'import'
      } as any;
      const idBefore = await this.createAccount(form);
      if ((row.vatId || row.vat || row.email)) updated++; else inserted++;
    }
    return { inserted, updated };
  }

  async getAccounts(): Promise<CRMAccount[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ACCOUNTS),
        where('ownerUserId', '==', this.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CRMAccount[];
    } catch (error) {
      console.error('Error fetching CRM accounts:', error);
      // Fallback: Fetch all and filter client-side while indexes are building
      try {
        const allSnapshot = await getDocs(collection(db, COLLECTIONS.ACCOUNTS));
        const filtered = allSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }))
          .filter((account: any) => account.ownerUserId === this.currentUser.uid)
          .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return filtered as CRMAccount[];
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  async getAccount(accountId: string): Promise<CRMAccount | null> {
    try {
      const docRef = doc(db, COLLECTIONS.ACCOUNTS, accountId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as CRMAccount;
      }
      return null;
    } catch (error) {
      console.error('Error fetching CRM account:', error);
      throw error;
    }
  }

  async updateAccount(accountId: string, updates: Partial<CRMAccount>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.ACCOUNTS, accountId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating CRM account:', error);
      throw error;
    }
  }

  async deleteAccount(accountId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.ACCOUNTS, accountId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting CRM account:', error);
      throw error;
    }
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  async createContact(contactData: CRMContactFormData): Promise<string> {
    try {
      // Dedupe by primary email
      const primaryEmail = (contactData.emails && contactData.emails[0]) || '';
      if (primaryEmail) {
        const mailQ = query(collection(db, COLLECTIONS.CONTACTS), where('emails', 'array-contains', primaryEmail));
        const mailSnap = await getDocs(mailQ);
        if (!mailSnap.empty) {
          const match = mailSnap.docs[0];
          await updateDoc(match.ref, {
            accountId: contactData.accountId || match.data().accountId,
            firstName: contactData.firstName || match.data().firstName,
            lastName: contactData.lastName || match.data().lastName,
            role: contactData.role || match.data().role,
            phones: (contactData.phones && contactData.phones.length) ? contactData.phones : match.data().phones,
            emails: (contactData.emails && contactData.emails.length) ? contactData.emails : match.data().emails,
            updatedAt: serverTimestamp(),
          });
          return match.id;
        }
      }

      const contact: Omit<CRMContact, 'id' | 'createdAt' | 'updatedAt'> = {
        ...contactData,
        phones: contactData.phones || [],
        emails: contactData.emails || [],
        ownerUserId: this.currentUser.uid,
        gdprConsent: {
          marketing: false,
          date: new Date()
        }
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.CONTACTS), {
        ...contact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating CRM contact:', error);
      throw error;
    }
  }

  async getContacts(accountId?: string): Promise<CRMContact[]> {
    try {
      let q;
      if (accountId) {
        q = query(
          collection(db, COLLECTIONS.CONTACTS),
          where('accountId', '==', accountId),
          where('ownerUserId', '==', this.currentUser.uid),
          orderBy('updatedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.CONTACTS),
          where('ownerUserId', '==', this.currentUser.uid),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CRMContact[];
    } catch (error) {
      console.error('Error fetching CRM contacts:', error);
      // Fallback: Fetch all and filter client-side while indexes are building
      try {
        const allSnapshot = await getDocs(collection(db, COLLECTIONS.CONTACTS));
        const filtered = allSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }))
          .filter((contact: any) => {
            if (accountId) {
              return contact.accountId === accountId && contact.ownerUserId === this.currentUser.uid;
            }
            return contact.ownerUserId === this.currentUser.uid;
          })
          .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return filtered as CRMContact[];
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  // ============================================================================
  // OPPORTUNITIES
  // ============================================================================

  async createOpportunity(opportunityData: CRMOpportunityFormData): Promise<string> {
    try {
      const opportunity: Omit<CRMOpportunity, 'id' | 'createdAt' | 'updatedAt'> = {
        ...opportunityData,
        notes: [],
        links: {},
        nextAction: {
          type: 'Follow up',
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          assigneeId: this.currentUser.uid
        },
        ownerUserId: this.currentUser.uid
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.OPPORTUNITIES), {
        ...opportunity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating CRM opportunity:', error);
      throw error;
    }
  }

  async getOpportunities(): Promise<CRMOpportunity[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.OPPORTUNITIES),
        where('ownerUserId', '==', this.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        expectedCloseDate: doc.data().expectedCloseDate?.toDate() || new Date()
      })) as CRMOpportunity[];
    } catch (error) {
      console.error('Error fetching CRM opportunities:', error);
      // Fallback: Fetch all and filter client-side while indexes are building
      try {
        const allSnapshot = await getDocs(collection(db, COLLECTIONS.OPPORTUNITIES));
        const filtered = allSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            expectedCloseDate: doc.data().expectedCloseDate?.toDate() || new Date()
          }))
          .filter((opp: any) => opp.ownerUserId === this.currentUser.uid)
          .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return filtered as CRMOpportunity[];
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  async updateOpportunityStage(opportunityId: string, newStage: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.OPPORTUNITIES, opportunityId);
      
      // Auto-set next action based on stage
      let nextAction = {
        type: 'Follow up',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assigneeId: this.currentUser.uid
      };

      switch (newStage) {
        case 'site-visit':
          nextAction = {
            type: 'Send quote',
            dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
            assigneeId: this.currentUser.uid
          };
          break;
        case 'quotation-sent':
          nextAction = {
            type: 'Follow up on quote',
            dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
            assigneeId: this.currentUser.uid
          };
          break;
        case 'negotiation':
          nextAction = {
            type: 'Close deal',
            dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            assigneeId: this.currentUser.uid
          };
          break;
      }

      await updateDoc(docRef, {
        stage: newStage,
        nextAction,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      throw error;
    }
  }

  // ============================================================================
  // QUOTES
  // ============================================================================

  async createQuote(quoteData: CRMQuoteFormData): Promise<string> {
    try {
      const quote: Omit<CRMQuote, 'id' | 'createdAt' | 'updatedAt' | 'totals' | 'files' | 'lastSentAt'> = {
        ...quoteData,
        status: 'draft',
        files: []
      };

      // Calculate totals
      const subtotal = quoteData.lineItems.reduce((sum, item) => 
        sum + (item.qty * item.unitPriceNet * (1 - item.discountPercent / 100)), 0
      );
      const discount = quoteData.lineItems.reduce((sum, item) => 
        sum + (item.qty * item.unitPriceNet * (item.discountPercent / 100)), 0
      );
      const net = subtotal - discount;
      const tax = net * 0.19; // 19% VAT
      const gross = net + tax;

      const totals = { subtotal, discount, net, tax, gross };

      const docRef = await addDoc(collection(db, COLLECTIONS.QUOTES), {
        ...quote,
        totals,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating CRM quote:', error);
      throw error;
    }
  }

  async updateQuoteStatus(quoteId: string, status: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.QUOTES, quoteId);
      const updates: any = { 
        status, 
        updatedAt: serverTimestamp() 
      };

      if (status === 'sent') {
        updates.lastSentAt = serverTimestamp();
      }

      await updateDoc(docRef, updates);

      // Auto-update opportunity stage if quote is sent
      if (status === 'sent') {
        const quoteDoc = await getDoc(docRef);
        const opportunityId = quoteDoc.data()?.opportunityId;
        if (opportunityId) {
          await this.updateOpportunityStage(opportunityId, 'quotation-sent');
        }
      }

      // Auto-update opportunity stage if quote is accepted
      if (status === 'accepted') {
        const quoteDoc = await getDoc(docRef);
        const opportunityId = quoteDoc.data()?.opportunityId;
        if (opportunityId) {
          await this.updateOpportunityStage(opportunityId, 'won');
        }
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      throw error;
    }
  }

  // ============================================================================
  // ACTIVITIES
  // ============================================================================

  async createActivity(activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVITIES), {
        ...activityData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating CRM activity:', error);
      throw error;
    }
  }

  async getActivities(parentId: string, parentType: string): Promise<CRMActivity[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ACTIVITIES),
        where('parent.id', '==', parentId),
        where('parent.type', '==', parentType),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueAt: doc.data().dueAt?.toDate(),
        doneAt: doc.data().doneAt?.toDate()
      })) as CRMActivity[];
    } catch (error) {
      console.error('Error fetching CRM activities:', error);
      throw error;
    }
  }

  // ============================================================================
  // PIPELINES
  // ============================================================================

  async getPipelines(): Promise<CRMPipeline[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PIPELINES),
        orderBy('isDefault', 'desc'),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CRMPipeline[];
    } catch (error) {
      console.error('Error fetching CRM pipelines:', error);
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getCRMStats(): Promise<CRMStats> {
    try {
      const [accounts, opportunities, quotes] = await Promise.all([
        this.getAccounts(),
        this.getOpportunities(),
        this.getQuotes()
      ]);

      const totalValue = opportunities.reduce((sum, opp) => sum + opp.amountNet, 0);
      const wonValue = opportunities
        .filter(opp => opp.stage === 'won')
        .reduce((sum, opp) => sum + opp.amountNet, 0);
      
      const conversionRate = opportunities.length > 0 
        ? (opportunities.filter(opp => opp.stage === 'won').length / opportunities.length) * 100 
        : 0;

      return {
        totalAccounts: accounts.length,
        totalContacts: 0, // TODO: Implement contact count
        totalOpportunities: opportunities.length,
        totalQuotes: quotes.length,
        totalValue,
        wonValue,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getQuotes(): Promise<CRMQuote[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.QUOTES),
        where('ownerUserId', '==', this.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        validityUntil: doc.data().validityUntil?.toDate() || new Date(),
        lastSentAt: doc.data().lastSentAt?.toDate()
      })) as CRMQuote[];
    } catch (error) {
      console.error('Error fetching CRM quotes:', error);
      // Fallback: Fetch all and filter client-side while indexes are building
      try {
        const allSnapshot = await getDocs(collection(db, COLLECTIONS.QUOTES));
        const filtered = allSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            validityUntil: doc.data().validityUntil?.toDate() || new Date(),
            lastSentAt: doc.data().lastSentAt?.toDate()
          }))
          .filter((quote: any) => quote.ownerUserId === this.currentUser.uid)
          .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return filtered as CRMQuote[];
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  // GDPR tools
  async gdprExport(clientId: string): Promise<{ url: string; path: string }> {
    const call = httpsCallable(functions, 'gdprExport');
    const res = await call({ clientId, concernID: this.concernID } as any);
    return res.data as any;
  }

  async deleteClientCascade(clientId: string, mode: 'anonymize' | 'remove' = 'anonymize') {
    const call = httpsCallable(functions, 'deleteClientCascade');
    const res = await call({ clientId, concernID: this.concernID, mode } as any);
    return res.data as any;
  }
}

export default CRMService;







