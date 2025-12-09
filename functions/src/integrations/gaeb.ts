// GAEB parser stubs (detailed implementation to be filled with spec-compliant parsing)
export function detectGaebType(bytes: Buffer): 'GAEB90' | 'GAEB200_XML33' | 'GAEB_DA_XML21' | 'UNKNOWN' {
  const head = bytes.slice(0, 64).toString('utf8');
  if (head.includes('<GAEB')) return 'GAEB200_XML33';
  if (head.includes('<DA')) return 'GAEB_DA_XML21';
  return 'UNKNOWN';
}

export interface GaebNode { id: string; short: string; long?: string; qty?: number; unit?: string; price?: number; children?: GaebNode[] }

export function parseGaebXml(xml: string): GaebNode {
  // TODO: real parsing; return sample root
  return { id: 'ROOT', short: 'LV', children: [] };
}

export function exportGaebXml(root: GaebNode): string {
  // TODO: real export in GAEB XML format
  return '<GAEB></GAEB>';
}














