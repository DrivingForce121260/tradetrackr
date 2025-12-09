// ============================================================================
// CATEGORY ROUTING LOGIC
// ============================================================================
// Deterministic category mapping for documents with optional AI fallback
// Integrates with normalized category system from /categories/{categoryId}

import { DocumentType, getDocumentTypeConfig } from '@/types/documents';
import { Category } from '@/types/category';
import { fetchCategoriesForOrg, buildCategoryTree } from '@/lib/categories/categoryHelpers';

export interface CategoryDecision {
  categoryId: string | null;
  confidence: number;
  source: "explicit" | "filename" | "docType" | "content" | "ai";
  candidates?: { categoryId: string; confidence: number }[];
  reason?: string;
}

export interface CategoryRoutingInput {
  orgId: string;
  projectId: string;
  filename: string;
  mimeType: string;
  docType?: DocumentType | null;
  textSample?: string | null;
  explicitCategoryId?: string | null;
}

/**
 * Determine category for a document using deterministic rules
 * Returns category decision with confidence score
 */
export async function determineCategoryForDocument(
  input: CategoryRoutingInput
): Promise<CategoryDecision> {
  const { orgId, filename, mimeType, docType, textSample, explicitCategoryId } = input;

  // Rule 1: Explicit category from UI/context (highest priority)
  if (explicitCategoryId) {
    // Validate that category belongs to same org
    try {
      const categories = await fetchCategoriesForOrg(orgId);
      const category = categories.find(c => c.categoryId === explicitCategoryId && c.active);
      
      if (category) {
        return {
          categoryId: explicitCategoryId,
          confidence: 1.0,
          source: "explicit",
          reason: `Explicitly assigned category: ${category.path.join(' > ')}`
        };
      }
    } catch (error) {
      console.warn('[categoryRouting] Failed to validate explicit category:', error);
    }
  }

  // Load all categories for this org
  let categories: Category[] = [];
  try {
    categories = await fetchCategoriesForOrg(orgId);
  } catch (error) {
    console.error('[categoryRouting] Failed to load categories:', error);
    return {
      categoryId: null,
      confidence: 0,
      source: "explicit",
      reason: "Failed to load categories"
    };
  }

  // Rule 2: Document type → default category mapping
  if (docType) {
    const docTypeConfig = getDocumentTypeConfig(docType);
    if (docTypeConfig) {
      const categoryMatch = mapDocumentTypeToCategory(docTypeConfig.category, categories);
      if (categoryMatch) {
        return {
          categoryId: categoryMatch.categoryId,
          confidence: 0.9,
          source: "docType",
          reason: `Mapped from document type "${docTypeConfig.labelDe}" to category "${categoryMatch.path.join(' > ')}"`
        };
      }
    }
  }

  // Rule 3: Filename heuristics
  const filenameMatch = matchCategoryByFilename(filename, categories);
  if (filenameMatch && filenameMatch.confidence >= 0.9) {
    return {
      categoryId: filenameMatch.categoryId,
      confidence: filenameMatch.confidence,
      source: "filename",
      reason: filenameMatch.reason
    };
  }

  // Rule 4: Content heuristics (if textSample available)
  if (textSample) {
    const contentMatch = matchCategoryByContent(textSample, categories);
    if (contentMatch && contentMatch.confidence >= 0.9) {
      return {
        categoryId: contentMatch.categoryId,
        confidence: contentMatch.confidence,
        source: "content",
        reason: contentMatch.reason
      };
    }
  }

  // Collect candidates from lower-confidence matches
  const candidates: { categoryId: string; confidence: number }[] = [];
  
  if (filenameMatch && filenameMatch.confidence >= 0.6) {
    candidates.push({
      categoryId: filenameMatch.categoryId!,
      confidence: filenameMatch.confidence
    });
  }

  if (textSample) {
    const contentMatch = matchCategoryByContent(textSample, categories);
    if (contentMatch && contentMatch.confidence >= 0.6) {
      // Avoid duplicates
      if (!candidates.find(c => c.categoryId === contentMatch.categoryId)) {
        candidates.push({
          categoryId: contentMatch.categoryId!,
          confidence: contentMatch.confidence
        });
      }
    }
  }

  // If we have candidates but no high-confidence match, return them
  if (candidates.length > 0) {
    return {
      categoryId: null,
      confidence: Math.max(...candidates.map(c => c.confidence)),
      source: "filename",
      candidates,
      reason: `Found ${candidates.length} candidate categories`
    };
  }

  // No match found
  return {
    categoryId: null,
    confidence: 0,
    source: "explicit",
    reason: "No category match found"
  };
}

/**
 * Map document type category (e.g., "client", "material") to actual category
 */
function mapDocumentTypeToCategory(
  docTypeCategory: string,
  categories: Category[]
): Category | null {
  // Try to find a category that matches the document type category
  // Look for root categories or categories with matching names
  
  // First, try exact match on root categories
  const rootMatch = categories.find(c => 
    c.depth === 0 && 
    c.active &&
    c.name.toLowerCase() === docTypeCategory.toLowerCase()
  );
  
  if (rootMatch) return rootMatch;

  // Try partial match (e.g., "client" matches "Clients" or "Kunden")
  const partialMatch = categories.find(c =>
    c.depth === 0 &&
    c.active &&
    (c.name.toLowerCase().includes(docTypeCategory.toLowerCase()) ||
     docTypeCategory.toLowerCase().includes(c.name.toLowerCase()))
  );

  if (partialMatch) return partialMatch;

  // Try German translations
  const germanMap: Record<string, string[]> = {
    'client': ['kunde', 'kunden', 'client', 'clients'],
    'material': ['material', 'materialien', 'waren'],
    'personnel': ['personal', 'mitarbeiter', 'personnel'],
    'project': ['projekt', 'projekte', 'project', 'projects'],
    'quality': ['qualität', 'qualitaet', 'quality'],
    'compliance': ['compliance', 'konformität', 'konformitaet']
  };

  const germanTerms = germanMap[docTypeCategory.toLowerCase()] || [];
  const germanMatch = categories.find(c =>
    c.depth === 0 &&
    c.active &&
    germanTerms.some(term => c.name.toLowerCase().includes(term))
  );

  return germanMatch || null;
}

/**
 * Match category by filename patterns
 */
function matchCategoryByFilename(
  filename: string,
  categories: Category[]
): { categoryId: string; confidence: number; reason: string } | null {
  const lowerFilename = filename.toLowerCase();

  // Filename pattern mappings (similar to document type routing)
  const patterns: Array<{
    regex: RegExp;
    categoryNames: string[];
    confidence: number;
    label: string;
  }> = [
    {
      regex: /rechnung|invoice|inv[_-]?\d+/i,
      categoryNames: ['rechnung', 'rechnungen', 'invoice', 'invoices', 'finance', 'finanzen'],
      confidence: 0.95,
      label: 'Rechnung'
    },
    {
      regex: /lieferschein|delivery[_-]?note/i,
      categoryNames: ['lieferschein', 'lieferscheine', 'delivery', 'logistics', 'logistik'],
      confidence: 0.94,
      label: 'Lieferschein'
    },
    {
      regex: /angebot|quote|offer/i,
      categoryNames: ['angebot', 'angebote', 'quote', 'quotes', 'offers'],
      confidence: 0.93,
      label: 'Angebot'
    },
    {
      regex: /vertrag|contract/i,
      categoryNames: ['vertrag', 'verträge', 'contract', 'contracts'],
      confidence: 0.92,
      label: 'Vertrag'
    },
    {
      regex: /stundenzettel|timesheet/i,
      categoryNames: ['stundenzettel', 'timesheet', 'personal', 'mitarbeiter'],
      confidence: 0.91,
      label: 'Stundenzettel'
    },
    {
      regex: /abnahme|acceptance/i,
      categoryNames: ['abnahme', 'acceptance', 'abnahmeprotokoll'],
      confidence: 0.90,
      label: 'Abnahmeprotokoll'
    }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(lowerFilename)) {
      // Find matching category
      const matchingCategory = categories.find(c =>
        c.active &&
        pattern.categoryNames.some(name =>
          c.name.toLowerCase().includes(name) ||
          c.path.some(p => p.toLowerCase().includes(name))
        )
      );

      if (matchingCategory) {
        return {
          categoryId: matchingCategory.categoryId,
          confidence: pattern.confidence,
          reason: `Filename matches "${pattern.label}" pattern, mapped to category "${matchingCategory.path.join(' > ')}"`
        };
      }
    }
  }

  return null;
}

/**
 * Match category by content/text sample
 */
function matchCategoryByContent(
  textSample: string,
  categories: Category[]
): { categoryId: string; confidence: number; reason: string } | null {
  const lowerText = textSample.toLowerCase();

  // Content anchor phrases
  const anchors: Array<{
    keywords: string[];
    categoryNames: string[];
    confidence: number;
    label: string;
  }> = [
    {
      keywords: ['rechnungsnummer', 'invoice number', 'rech.-nr', 'inv. no.'],
      categoryNames: ['rechnung', 'rechnungen', 'invoice', 'finance'],
      confidence: 0.97,
      label: 'Invoice'
    },
    {
      keywords: ['lieferschein-nr', 'delivery note no', 'lieferscheinnummer'],
      categoryNames: ['lieferschein', 'delivery', 'logistics'],
      confidence: 0.96,
      label: 'Delivery Note'
    },
    {
      keywords: ['angebotsnummer', 'quote no', 'angebot-nr'],
      categoryNames: ['angebot', 'quote', 'offers'],
      confidence: 0.95,
      label: 'Quote'
    },
    {
      keywords: ['abnahmeprotokoll', 'acceptance protocol'],
      categoryNames: ['abnahme', 'acceptance'],
      confidence: 0.93,
      label: 'Acceptance Report'
    },
    {
      keywords: ['stundennachweis', 'arbeitszeitnachweis', 'timesheet'],
      categoryNames: ['stundenzettel', 'timesheet', 'personal'],
      confidence: 0.91,
      label: 'Timesheet'
    }
  ];

  for (const anchor of anchors) {
    const matchCount = anchor.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
    if (matchCount > 0) {
      // Find matching category
      const matchingCategory = categories.find(c =>
        c.active &&
        anchor.categoryNames.some(name =>
          c.name.toLowerCase().includes(name) ||
          c.path.some(p => p.toLowerCase().includes(name))
        )
      );

      if (matchingCategory) {
        return {
          categoryId: matchingCategory.categoryId,
          confidence: anchor.confidence,
          reason: `Content contains "${anchor.label}" anchor phrase, mapped to category "${matchingCategory.path.join(' > ')}"`
        };
      }
    }
  }

  return null;
}

/**
 * AI-based category suggestion (optional, backend-only)
 * Only called when deterministic confidence < 0.6
 */
export async function suggestCategoryViaAI(input: {
  orgId: string;
  filename: string;
  textSample: string;
  availableCategories: Array<{categoryId: string; path: string[]}>;
}): Promise<CategoryDecision> {
  // TODO: Implement AI-based category suggestion
  // This would use Gemini or similar LLM to analyze the document
  // and suggest the most likely category from availableCategories
  
  // For now, return no match
  return {
    categoryId: null,
    confidence: 0,
    source: "ai",
    reason: "AI category suggestion not yet implemented"
  };
}

