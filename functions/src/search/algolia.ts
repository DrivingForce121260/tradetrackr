import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

let algoliaClient: any = null;
function getAlgolia() {
  const appId = process.env.ALGOLIA_APP_ID || functions.config().algolia?.app_id;
  const apiKey = process.env.ALGOLIA_ADMIN_KEY || functions.config().algolia?.admin_key;
  const indexName = process.env.ALGOLIA_INDEX || functions.config().algolia?.index || 'project_documents';
  if (!appId || !apiKey) return null;
  if (!algoliaClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const algoliasearch = require('algoliasearch');
    algoliaClient = algoliasearch(appId, apiKey);
  }
  return { index: algoliaClient.initIndex(indexName) };
}

export const onProjectDocumentSearchSync = functions.firestore
  .document('project_documents/{documentId}')
  .onWrite(async (change, context) => {
    const ag = getAlgolia();
    if (!ag) return; // disabled unless configured
    const id = context.params.documentId as string;
    if (!change.after.exists) {
      await ag.index.deleteObject(id);
      return;
    }
    const data = change.after.data() as any;
    const record = {
      objectID: id,
      concernID: data.concernID,
      projectId: data.projectId,
      displayName: data.displayName,
      description: data.description || '',
      category: data.category,
      tags: data.tags || [],
      status: data.status || 'draft',
      version: data.version || 1,
      uploadedBy: data.uploadedBy,
      uploadedAt: (data.uploadDate && data.uploadDate.toMillis) ? data.uploadDate.toMillis() : Date.now(),
      size: data.fileSize || 0,
      mimeType: data.mimeType || '',
      searchableText: data.searchableText || '',
    };
    await ag.index.saveObject(record);
  });














