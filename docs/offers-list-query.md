# Offers List Query - InvoicingPortal

## Collection Path

```
offers (ROOT collection)
```

## Query

```typescript
const offersQ = query(
  collection(db, 'offers'), 
  where('concernID', '==', concernID)
);
```

## Key Points

- **Collection**: ROOT-level `offers` collection (not under `concerns/`)
- **Filter**: Uses `concernID` (uppercase `ID`) to filter by tenant
- **No orderBy**: The query does not use `orderBy`, so no composite index is required
- **Data Mapping**: Results are mapped with `d.data()` spread first, then `id: d.id` override

## Code Location

**File**: `src/components/invoicing/InvoicingPortal.tsx`

### Initial Load (Lines 119-132)

```typescript
// Load offers, orders, invoices (customers are loaded by editors individually)
const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

const [offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
  getDocs(offersQ),
  getDocs(ordersQ),
  getDocs(invoicesQ),
]);

// Spread data first, then override with d.id to ensure correct Firestore document ID
setOffers(offersSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Offer[]);
```

### Refresh Function (Lines 139-155)

```typescript
const refreshAll = async () => {
  if (!concernID) return;
  // Reload offers, orders, invoices (customers are loaded by editors individually)
  const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
  const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
  const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

  const [offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
    getDocs(offersQ),
    getDocs(ordersQ),
    getDocs(invoicesQ),
  ]);

  // Spread data first, then override with d.id to ensure correct Firestore document ID
  setOffers(offersSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Offer[]);
  setOrders(ordersSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Order[]);
  setInvoices(invoicesSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Invoice[]);
};
```

## Required Offer Fields for Display

For an offer to appear correctly in the list, it must have:

| Field | Type | Description |
|-------|------|-------------|
| `concernID` | string | Tenant ID (uppercase!) |
| `number` | string | Offer number (e.g., "2025-0001") |
| `state` | string | Status: `'draft'`, `'sent'`, `'accepted'`, `'rejected'` |
| `clientSnapshot` | object | Customer info for display |
| `issueDate` | string | ISO date string |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

## Notes

- The `createSalesOfferFromEmailInquiry` Cloud Function writes to the same ROOT `offers` collection
- It uses `concernID` (uppercase) to match the existing data model
- No composite index needed since there's no `orderBy` clause



