# Permissions Audit (Auto-generated)

- Collected from firestore.rules and src/* role guards
- Goal: reuse existing enforcement and identify gaps only

## Collections – Current Roles and Status

- projects: role-gated (admin/office/foreman write; broad read within concern). Status: VALIDATED (hardened)
- timeEntries (punches/timesheets/leave): admin/supervisor/owner checks present. Status: VALIDATED
- lookupOptions: read any auth, modify admin/office. Status: VALIDATED (hardened)
- personnel: read/write with hasAnyRole(['admin','office']) and readers include foreman/viewer. Status: VALIDATED
- invoices (offers/orders/invoices/payments): office/admin + concern checks. Status: VALIDATED
- materials: read any auth; modify admin/office; delete admin. Status: VALIDATED (hardened)

## Role Sources Detected

- Firestore rules use getUserData().role with helpers isAdmin(), isOffice(), hasAnyRole([...])
- Frontend: useAuth().hasPermission(...) used across components; also direct user.role checks in some templates
- Users docs store role (seen in rules and UserManagement)

## UI Guards Detected

- hasPermission('...') in many components (CRM, Reports, Docs, Dashboard tiles)
- Some direct role comparisons: user.role === 'admin' | 'office'

## Conclusion

- Existing framework: roles on users + central helpers in rules + hasPermission hook on frontend. Reuse.
- Remaining improvement (optional): replace remaining direct user.role checks with hasPermission incrementally.
