// Optional Algolia client for portal search
// Enable by providing VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_KEY, VITE_ALGOLIA_INDEX

let client: any = null;
let index: any = null;

function init() {
  const appId = import.meta.env.VITE_ALGOLIA_APP_ID as string | undefined;
  const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY as string | undefined;
  const idx = import.meta.env.VITE_ALGOLIA_INDEX as string | undefined;
  if (!appId || !searchKey || !idx) return null;
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const algoliasearch = require('algoliasearch/lite');
    client = algoliasearch(appId, searchKey);
    index = client.initIndex(idx);
  }
  return { index };
}

export async function searchDocuments(queryText: string) {
  const ag = init();
  if (!ag) return { hits: [] };
  const res = await ag.index.search(queryText, { hitsPerPage: 20 });
  return res;
}














