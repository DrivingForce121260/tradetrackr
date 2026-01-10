/**
 * Template Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles document template CRUD with versioning.
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  QueryFilter,
} from '@/services/dataClient';
import { getAccessToken } from '@/lib/auth/oidc-client';
import { Template, TemplateHistory, TemplateKind } from '@/types/templates';

const TEMPLATES = 'templates';
const TEMPLATES_HISTORY = 'templates_history';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface SaveTemplateInput {
  concernID: string;
  userUid: string;
  data: Omit<Template, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy' | 'active'> & {
    active?: boolean;
  };
}

export const templateService = {
  async list(concernID: string): Promise<Template[]> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: concernID },
    ];

    const result = await queryDocs<Template>(TEMPLATES, filters, {
      orderBy: { field: 'updatedAt', dir: 'desc' },
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  },

  async get(templateId: string): Promise<Template | null> {
    const doc = await getDoc<Template>(TEMPLATES, templateId);
    return doc ? { id: doc.doc_id, ...doc.data } : null;
  },

  async getActive(
    concernID: string,
    type: TemplateKind,
    locale: 'de' | 'en',
    useFor?: 'invoice' | 'offer' | 'order' | 'report'
  ): Promise<Template | null> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: concernID },
      { field: 'type', op: '==', value: type },
      { field: 'locale', op: '==', value: locale },
      { field: 'active', op: '==', value: true },
    ];

    if (useFor) {
      filters.push({ field: 'useFor', op: '==', value: useFor });
    }

    const result = await queryDocs<Template>(TEMPLATES, filters);

    if (result.items.length === 0) return null;

    return { id: result.items[0].doc_id, ...result.items[0].data };
  },

  async create(input: SaveTemplateInput): Promise<string> {
    const now = new Date().toISOString();
    const payload = {
      ...input.data,
      concernID: input.concernID,
      version: 1,
      createdBy: input.userUid,
      createdAt: now,
      updatedAt: now,
      active: Boolean(input.data.active),
    };

    const doc = await addDoc(TEMPLATES, payload);
    return doc.doc_id;
  },

  async update(templateId: string, userUid: string, update: Partial<Template>): Promise<void> {
    // Fetch current to archive
    const current = await this.get(templateId);
    if (!current) throw new Error('Template not found');

    // Archive current html into history
    const history: Omit<TemplateHistory, 'id'> = {
      templateId,
      concernID: current.concernID,
      version: current.version,
      htmlBody: current.htmlBody,
      createdAt: new Date().toISOString(),
      createdBy: userUid,
    };

    await addDoc(TEMPLATES_HISTORY, history);

    // Increment version on save
    const nextVersion = (current.version || 0) + 1;
    await updateDoc(TEMPLATES, templateId, {
      ...update,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    });
  },

  async setActive(templateId: string, active: boolean): Promise<void> {
    await updateDoc(TEMPLATES, templateId, { active });
  },

  async duplicate(templateId: string, userUid: string): Promise<string> {
    const t = await this.get(templateId);
    if (!t) throw new Error('Template not found');

    const copy = { ...t } as Partial<Template>;
    delete copy.id;
    copy.name = `${t.name} (Copy)`;
    copy.version = 1;
    copy.active = false;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.createdBy = userUid;

    const doc = await addDoc(TEMPLATES, copy);
    return doc.doc_id;
  },

  async listHistory(templateId: string): Promise<TemplateHistory[]> {
    const filters: QueryFilter[] = [
      { field: 'templateId', op: '==', value: templateId },
    ];

    const result = await queryDocs<TemplateHistory>(TEMPLATES_HISTORY, filters, {
      orderBy: { field: 'version', dir: 'desc' },
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  },

  async restoreVersion(templateId: string, version: number, userUid: string): Promise<void> {
    const filters: QueryFilter[] = [
      { field: 'templateId', op: '==', value: templateId },
      { field: 'version', op: '==', value: version },
    ];

    const result = await queryDocs<TemplateHistory>(TEMPLATES_HISTORY, filters);

    if (result.items.length === 0) throw new Error('Version not found');

    const hist = result.items[0].data;
    await this.update(templateId, userUid, { htmlBody: hist.htmlBody });
  },

  async uploadLogo(concernID: string, file: File): Promise<string> {
    const token = await getAccessToken();

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`${API_BASE}/api/v1/storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        path: `branding/${concernID}/logo.png`,
        data: base64Data,
        contentType: file.type || 'image/png',
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    // Get the download URL
    const urlResponse = await fetch(
      `${API_BASE}/api/v1/storage/url?path=${encodeURIComponent(`branding/${concernID}/logo.png`)}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!urlResponse.ok) {
      throw new Error(`Failed to get download URL: ${urlResponse.status}`);
    }

    const urlResult = await urlResponse.json();
    return urlResult.url;
  },
};
