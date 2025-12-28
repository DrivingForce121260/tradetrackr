# Firestore Indexes for Procurement Collections

This document describes the composite indexes required for efficient querying of procurement-related collections.

## Required Indexes

Add the following indexes to your `firestore.indexes.json` file:

```json
{
  "indexes": [
    // Existing indexes...
    
    // Procurement Requests
    {
      "collectionGroup": "procurementRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "supplierId", "order": "ASCENDING" },
        { "fieldPath": "requestedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "procurementRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "requestedAt", "order": "DESCENDING" }
      ]
    },
    
    // Purchase Orders
    {
      "collectionGroup": "purchaseOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "supplierId", "order": "ASCENDING" },
        { "fieldPath": "orderedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "purchaseOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "orderedAt", "order": "DESCENDING" }
      ]
    },
    
    // Supplier Deliveries
    {
      "collectionGroup": "supplierDeliveries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "supplierId", "order": "ASCENDING" },
        { "fieldPath": "deliveredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "supplierDeliveries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "deliveredAt", "order": "DESCENDING" }
      ]
    },
    
    // Supplier Invoices
    // Per-supplier query (getInvoicesBySupplier)
    {
      "collectionGroup": "supplierInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "supplierId", "order": "ASCENDING" },
        { "fieldPath": "invoiceDate", "order": "DESCENDING" },
        { "fieldPath": "__name__", "order": "DESCENDING" }
      ]
    },
    // Global query (listInvoices in ProcurementPortal)
    {
      "collectionGroup": "supplierInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "invoiceDate", "order": "DESCENDING" },
        { "fieldPath": "__name__", "order": "DESCENDING" }
      ]
    },
    // Status filter query
    {
      "collectionGroup": "supplierInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "invoiceDate", "order": "DESCENDING" }
      ]
    },
    
    // Materials
    {
      "collectionGroup": "materials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "materials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "materials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "materials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "sku", "order": "ASCENDING" }
      ]
    },
    
    // Material Movements
    {
      "collectionGroup": "materialMovements",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernID", "order": "ASCENDING" },
        { "fieldPath": "materialId", "order": "ASCENDING" },
        { "fieldPath": "at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Deployment

After updating `firestore.indexes.json`, deploy with:

```bash
firebase deploy --only firestore:indexes
```

Note: Index creation can take several minutes. Monitor progress in the Firebase Console under Firestore > Indexes.

## Troubleshooting

### "requires an index" Error

If you see an error like:
```
FirebaseError: The query requires an index. You can create it here: https://...
```

1. The error message contains a direct link to create the missing index in Firebase Console
2. Alternatively, ensure `firestore.indexes.json` contains the required index and run:
   ```bash
   firebase deploy --only firestore:indexes
   ```
3. Wait 2-5 minutes for the index to build (check status in Firebase Console > Firestore > Indexes)

### Key Index for supplierInvoices (Global Query)

The `listInvoices()` method in `procurementService.ts` requires:
```json
{
  "collectionGroup": "supplierInvoices",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "concernID", "order": "ASCENDING" },
    { "fieldPath": "invoiceDate", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
}
```

The `__name__` field ensures stable pagination and sorting.

