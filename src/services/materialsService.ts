/**
 * Materials Service for TradeTrackr
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles materials/inventory management:
 * - Material master data CRUD
 * - Stock movements (in/out/adjust)
 * - Integration with supplier deliveries
 *
 * All operations are scoped to the current concern (multi-tenant).
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  QueryFilter,
  batchWrite,
  BatchOperation,
} from '@/services/dataClient';
import {
  Material,
  MaterialCreateInput,
  MaterialUpdateInput,
  MaterialStatus,
  MaterialMovement,
  MaterialMovementCreateInput,
  MovementReference,
} from '@/types/materials';
import { DeliveryLineItem, SupplierDelivery } from '@/types/procurement';
import { UserSnapshot } from '@/types/suppliers';

const MATERIALS_COLLECTION = 'materials';
const MOVEMENTS_COLLECTION = 'materialMovements';

// ============================================
// SANITIZATION HELPERS
// ============================================

function sanitizeForWrite<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (value === undefined) {
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const v = value as Record<string, unknown>;
      // Check if it's a special marker object
      if ('__fieldValue' in v) {
        result[key as keyof T] = value as T[keyof T];
      } else {
        const sanitized = sanitizeForWrite(v);
        if (Object.keys(sanitized).length > 0) {
          result[key as keyof T] = sanitized as T[keyof T];
        }
      }
    } else if (Array.isArray(value)) {
      result[key as keyof T] = value.map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizeForWrite(item as Record<string, unknown>);
        }
        return item;
      }) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize material name for matching
 */
function normalizeMaterialName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Calculate material status based on stock levels
 */
function calculateMaterialStatus(
  onHand: number,
  minStock?: number | null,
  reorderPoint?: number | null
): MaterialStatus {
  if (onHand <= 0) {
    return 'out_of_stock';
  }
  if (minStock && onHand <= minStock) {
    return 'low_stock';
  }
  if (reorderPoint && onHand <= reorderPoint) {
    return 'low_stock';
  }
  return 'available';
}

// ============================================
// MATERIALS SERVICE CLASS
// ============================================

export class MaterialsService {
  private concernID: string;

  constructor(concernID: string) {
    if (!concernID) {
      throw new Error('MaterialsService requires concernID');
    }
    this.concernID = concernID;
  }

  // ========================================
  // MATERIAL CRUD
  // ========================================

  /**
   * Get all materials for the concern
   */
  async getMaterials(projectId?: string): Promise<Material[]> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
    ];

    if (projectId) {
      filters.push({ field: 'projectId', op: '==', value: projectId });
    }

    const result = await queryDocs<Material>(MATERIALS_COLLECTION, filters, {
      orderBy: { field: 'name', dir: 'asc' },
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  /**
   * Get a material by ID
   */
  async getMaterialById(id: string): Promise<Material | null> {
    const doc = await getDoc<Material>(MATERIALS_COLLECTION, id);

    if (!doc) return null;

    if (doc.data.concernID !== this.concernID) return null;

    return { id: doc.doc_id, ...doc.data };
  }

  /**
   * Find material by SKU
   */
  async findBySku(sku: string): Promise<Material | null> {
    if (!sku) return null;

    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
      { field: 'sku', op: '==', value: sku.trim() },
    ];

    const result = await queryDocs<Material>(MATERIALS_COLLECTION, filters);

    if (result.items.length === 0) return null;

    return { id: result.items[0].doc_id, ...result.items[0].data };
  }

  /**
   * Find material by name and unit (for matching when no SKU)
   */
  async findByNameAndUnit(name: string, unit: string): Promise<Material | null> {
    const normalizedName = normalizeMaterialName(name);

    // Get all materials and filter client-side
    const all = await this.getMaterials();

    return (
      all.find((m) => normalizeMaterialName(m.name) === normalizedName && m.unit === unit) ||
      null
    );
  }

  /**
   * Create a new material
   */
  async createMaterial(input: MaterialCreateInput, user?: UserSnapshot): Promise<string> {
    const rawData = {
      concernID: this.concernID,
      projectId: input.projectId || null,
      projectSnapshot: input.projectSnapshot || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sku: input.sku?.trim() || null,
      category: input.category?.trim() || null,
      unit: input.unit,
      supplierId: input.supplierId || null,
      supplierSnapshot: input.supplierSnapshot || null,
      stock: {
        onHand: input.stock?.onHand || 0,
        reserved: input.stock?.reserved || 0,
        available: (input.stock?.onHand || 0) - (input.stock?.reserved || 0),
      },
      lastPurchasePriceNet: input.lastPurchasePriceNet || null,
      vatRate: input.vatRate || null,
      status: input.status || 'available',
      minStock: input.minStock || null,
      reorderPoint: input.reorderPoint || null,
      notes: input.notes?.trim() || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user || null,
      updatedBy: user || null,
    };

    const data = sanitizeForWrite(rawData as Record<string, unknown>);
    const doc = await addDoc(MATERIALS_COLLECTION, data);
    return doc.doc_id;
  }

  /**
   * Update a material
   */
  async updateMaterial(
    id: string,
    updates: MaterialUpdateInput,
    user?: UserSnapshot
  ): Promise<void> {
    const existing = await this.getMaterialById(id);
    if (!existing) throw new Error('MATERIAL_NOT_FOUND');

    const rawData: Record<string, unknown> = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user || null,
    };

    // Recalculate status if stock changed
    if (updates.stock) {
      const onHand = updates.stock.onHand ?? existing.stock.onHand;
      rawData.status = calculateMaterialStatus(
        onHand,
        updates.minStock ?? existing.minStock,
        updates.reorderPoint ?? existing.reorderPoint
      );
    }

    const data = sanitizeForWrite(rawData);
    await updateDoc(MATERIALS_COLLECTION, id, data);
  }

  // ========================================
  // STOCK MOVEMENTS
  // ========================================

  /**
   * Get movements for a material
   */
  async getMovementsByMaterial(materialId: string): Promise<MaterialMovement[]> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
      { field: 'materialId', op: '==', value: materialId },
    ];

    const result = await queryDocs<MaterialMovement>(MOVEMENTS_COLLECTION, filters, {
      orderBy: { field: 'at', dir: 'desc' },
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  /**
   * Record a stock movement
   * Updates material stock atomically via batch write
   */
  async recordMovement(
    input: MaterialMovementCreateInput,
    user?: UserSnapshot
  ): Promise<string> {
    const material = await this.getMaterialById(input.materialId);

    if (!material) {
      throw new Error('MATERIAL_NOT_FOUND');
    }

    // Calculate new stock
    let qtyChange = input.qty;
    if (input.type === 'out') {
      qtyChange = -Math.abs(input.qty); // Ensure negative for outbound
    } else if (input.type === 'in') {
      qtyChange = Math.abs(input.qty); // Ensure positive for inbound
    }
    // 'adjust' can be positive or negative

    const newOnHand = (material.stock?.onHand || 0) + qtyChange;
    const reserved = material.stock?.reserved || 0;
    const newAvailable = newOnHand - reserved;

    // Create movement document
    const movementData = sanitizeForWrite({
      concernID: this.concernID,
      materialId: input.materialId,
      projectId: input.projectId || null,
      type: input.type,
      qty: input.qty,
      reference: input.reference || null,
      at: input.at || serverTimestamp(),
      notes: input.notes?.trim() || null,
      createdBy: user || null,
      createdAt: serverTimestamp(),
    } as Record<string, unknown>);

    // Generate a movement ID
    const movementId =
      (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2);

    // Calculate new status
    const newStatus = calculateMaterialStatus(newOnHand, material.minStock, material.reorderPoint);

    // Execute batch write
    const operations: BatchOperation[] = [
      {
        type: 'set',
        path: `${MOVEMENTS_COLLECTION}/${movementId}`,
        data: movementData as Record<string, unknown>,
      },
      {
        type: 'update',
        path: `${MATERIALS_COLLECTION}/${input.materialId}`,
        data: {
          'stock.onHand': newOnHand,
          'stock.available': newAvailable,
          status: newStatus,
          updatedAt: serverTimestamp(),
          updatedBy: user || null,
        } as Record<string, unknown>,
      },
    ];

    await batchWrite(operations);

    return movementId;
  }

  // ========================================
  // DELIVERY INTEGRATION
  // ========================================

  /**
   * Process inbound stock from a confirmed supplier delivery
   */
  async processDeliveryInbound(
    delivery: SupplierDelivery,
    user?: UserSnapshot
  ): Promise<DeliveryLineItem[]> {
    const updatedLineItems: DeliveryLineItem[] = [];

    for (const lineItem of delivery.lineItems) {
      try {
        // 1. Find or create material
        let material: Material | null = null;

        // Try to find by SKU first
        if (lineItem.sku) {
          material = await this.findBySku(lineItem.sku);
        }

        // If no SKU or not found, try by name + unit
        if (!material) {
          material = await this.findByNameAndUnit(lineItem.description, lineItem.unit);
        }

        // Create new material if not found
        if (!material) {
          const materialId = await this.createMaterial(
            {
              name: lineItem.description,
              sku: lineItem.sku,
              unit: lineItem.unit,
              projectId: delivery.project?.projectId,
              projectSnapshot: delivery.project,
              supplierId: delivery.supplierId,
              supplierSnapshot: delivery.supplierSnapshot,
              stock: { onHand: 0 },
              status: 'available',
            },
            user
          );

          material = await this.getMaterialById(materialId);
        }

        if (!material) {
          console.error('Failed to create/find material for line item:', lineItem);
          updatedLineItems.push(lineItem);
          continue;
        }

        // 2. Create inbound movement
        const reference: MovementReference = {
          supplierDeliveryId: delivery.id,
          deliveryNoteNumber: delivery.deliveryNoteNumber,
          supplierId: delivery.supplierId,
          supplierName: delivery.supplierSnapshot?.name,
        };

        if (delivery.purchaseOrderId) {
          reference.purchaseOrderId = delivery.purchaseOrderId;
          reference.orderNumber = delivery.purchaseOrderNumber;
        }

        await this.recordMovement(
          {
            materialId: material.id,
            projectId: delivery.project?.projectId,
            type: 'in',
            qty: lineItem.qtyDelivered,
            reference,
            at: serverTimestamp(),
            notes: `Wareneingang von ${delivery.supplierSnapshot?.name || 'Lieferant'}: Lieferschein ${delivery.deliveryNoteNumber}`,
          },
          user
        );

        // 3. Update supplier info on material if newer
        await this.updateMaterial(
          material.id,
          {
            supplierId: delivery.supplierId,
            supplierSnapshot: delivery.supplierSnapshot,
          },
          user
        );

        // 4. Add linkedMaterialId to line item
        updatedLineItems.push({
          ...lineItem,
          linkedMaterialId: material.id,
        });
      } catch (error) {
        console.error('Error processing delivery line item:', lineItem, error);
        updatedLineItems.push(lineItem); // Keep original without link
      }
    }

    return updatedLineItems;
  }

  /**
   * Get materials summary for dashboard
   */
  async getMaterialsSummary(): Promise<{
    total: number;
    available: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }> {
    const materials = await this.getMaterials();

    let available = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const m of materials) {
      switch (m.status) {
        case 'available':
          available++;
          break;
        case 'low_stock':
          lowStock++;
          break;
        case 'out_of_stock':
          outOfStock++;
          break;
      }

      if (m.lastPurchasePriceNet && m.stock?.onHand) {
        totalValue += m.lastPurchasePriceNet * m.stock.onHand;
      }
    }

    return {
      total: materials.length,
      available,
      lowStock,
      outOfStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }
}

/**
 * Create a MaterialsService instance
 */
export function createMaterialsService(concernID: string): MaterialsService {
  return new MaterialsService(concernID);
}
