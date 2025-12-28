# Firestore Security Rules for Procurement Collections

This document describes the Firestore security rules for the procurement-related collections.

## Collections Covered

- `procurementRequests` - Purchase requests / RFQs (Anfragen)
- `purchaseOrders` - Purchase orders (Bestellungen)
- `supplierDeliveries` - Supplier deliveries (Lieferungen)
- `supplierInvoices` - Supplier invoices (Eingangsrechnungen)
- `materials` - Material/inventory items
- `materialMovements` - Stock movement history
- `procurementCounters` - Number sequence counters

## Rules Block

Add the following rules to your `firestore.rules` file, inside the `match /databases/{database}/documents` block:

```javascript
    // ==========================================
    // PROCUREMENT COLLECTIONS
    // ==========================================

    // Procurement Requests (Anfragen)
    match /procurementRequests/{requestId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.supplierId != null &&
        request.resource.data.requestNumber != null;
      
      allow update: if isSignedIn() && 
        resource.data.concernID == getUserConcernId() &&
        request.resource.data.concernID == resource.data.concernID;
      
      allow delete: if false; // Soft delete via status only
    }

    // Purchase Orders (Bestellungen)
    match /purchaseOrders/{orderId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.supplierId != null &&
        request.resource.data.orderNumber != null;
      
      allow update: if isSignedIn() && 
        resource.data.concernID == getUserConcernId() &&
        request.resource.data.concernID == resource.data.concernID;
      
      allow delete: if false;
    }

    // Supplier Deliveries (Lieferungen)
    match /supplierDeliveries/{deliveryId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.supplierId != null &&
        request.resource.data.deliveryNoteNumber != null;
      
      allow update: if isSignedIn() && 
        resource.data.concernID == getUserConcernId() &&
        request.resource.data.concernID == resource.data.concernID;
      
      allow delete: if false;
    }

    // Supplier Invoices (Eingangsrechnungen)
    match /supplierInvoices/{invoiceId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.supplierId != null &&
        request.resource.data.invoiceNumber != null;
      
      allow update: if isSignedIn() && 
        resource.data.concernID == getUserConcernId() &&
        request.resource.data.concernID == resource.data.concernID;
      
      allow delete: if false;
    }

    // Materials (Materialien / Inventar)
    match /materials/{materialId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.name != null &&
        request.resource.data.unit != null;
      
      allow update: if isSignedIn() && 
        resource.data.concernID == getUserConcernId() &&
        request.resource.data.concernID == resource.data.concernID;
      
      allow delete: if false;
    }

    // Material Movements (Lagerbewegungen)
    match /materialMovements/{movementId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow create: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId() &&
        request.resource.data.materialId != null &&
        request.resource.data.type in ['in', 'out', 'adjust'];
      
      allow update: if false; // Movements are immutable
      allow delete: if false;
    }

    // Procurement Counters (Nummernkreise)
    match /procurementCounters/{counterId} {
      allow read: if isSignedIn() && 
        resource.data.concernID == getUserConcernId();
      
      allow write: if isSignedIn() && 
        request.resource.data.concernID == getUserConcernId();
    }
```

## Helper Functions Required

Ensure these helper functions are defined in your rules file (they likely already exist from suppliers):

```javascript
function isSignedIn() {
  return request.auth != null;
}

function getUserConcernId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.concernID;
}
```

## Deployment

After updating `firestore.rules`, deploy with:

```bash
firebase deploy --only firestore:rules
```



