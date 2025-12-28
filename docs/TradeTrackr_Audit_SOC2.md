# TradeTrackr Portal Audit — SOC 2 Mapping

This document maps the TradeTrackr portal controls to the SOC 2 Trust Services Criteria (TSC).
Audience: Internal auditors, security/compliance officers.

## 1. Scope and Assumptions
- SOC 2 scope applies to Security, Availability, Processing Integrity, Confidentiality, and Privacy controls.
- System under audit: TradeTrackr frontend, Firestore/Storage backend, Cloud Functions, and supporting infrastructure.
- Multi-tenancy is enforced via `concernID` across chats, messages, and participants.

## 2. Trust Services Criteria Mapping
Note: The SOC 2 TSC in practice requires mapping to the five categories. Here we provide a pragmatic, audit-ready mapping of TradeTrackr controls.

### 2.6 SOC 2 Control Matrix (TradeTrackr mappings)

This matrix maps core TradeTrackr controls to SOC 2 Trust Services Criteria (simplified for audit purposes). It lists the SOC 2 criteria, the corresponding TradeTrackr control, and the primary evidence sources.

### 2.6.1 SOC 2 Control IDs & Owners (Draft)

This is a placeholder for formalizing SOC 2 control IDs and owners. The table will be filled with concrete IDs (e.g., CC1.1, CC1.2, etc.), mapped owners, and primary evidence sources.

| CC ID | SOC 2 Criterion | TradeTrackr Control | Owner | Evidence Sources | Status |
|---|---|---|---|---|---|
| CC1.1 | Security | Multi-tenant isolation via `concernID` and per-chat/participant access rules; UI and API access controlled by permissions | TBD | `firestore.rules`, `storage.rules`, `MessagingContext` access checks | Draft |
| CC1.2 | Security | Authentication & authorization via Firebase Auth tokens; role-based access (admin/manager) | TBD | Firebase Auth config; Firestore rules | Draft |
| CC1.3 | Change Management | Atomic writes and controlled updates via Firestore transactions | TBD | `MessagingService` transactions | Draft |
| CC2.1 | Availability | Real-time listeners and offline persistence | TBD | `enableIndexedDbPersistence`, offlineQueue | Draft |
| CC2.2 | Availability | DR planning notes | TBD | System architecture notes | Draft |
| CC3.1 | Processing Integrity | Forwarding, editing, and deletion actions via transactions | TBD | `sendMessage`, `handleForwardMessage`, `handleDeleteMessage` | Draft |
| CC4.1 | Confidentiality | Media storage with per-tenant access rules | TBD | `storage.rules` | Draft |
| CC5.1 | Privacy | Privacy controls and edit history | TBD | `originalText`, `editedAt` fields | Draft |

Notes:
- This is a draft; IDs and owners can be filled in with your official SOC 2 IDs
- Evidence sources should be populated during the audit evidence collection

### 2.6.1 SOC 2 Control IDs & Owners (Draft)
- Table skeleton with CC IDs, criteria, ownership, and evidence sources
| CC ID | SOC 2 Criterion | TradeTrackr Control | Owner | Evidence Sources | Status |
|---|---|---|---|---|---|
| CC1.1 | Security | [To be mapped] | TBD | [To be collected] | Draft |

### 2.6 SOC 2 Control Matrix (TradeTrackr mappings)

This matrix maps core TradeTrackr controls to SOC 2 Trust Services Criteria (simplified for audit purposes). It lists the SOC 2 criteria, the corresponding TradeTrackr control, owner, and primary evidence sources.

| SOC 2 Criteria | CC/Control | Owner | Evidence Source | Notes |
|---|---|---|---|---|
| CC1.1 Security | Multi-tenant isolation via `concernID` and per-chat/participant access rules; UI and API access controlled by permissions | Security Architect / Platform Owner | `firestore.rules`, `storage.rules`, `MessagingContext` access checks | Core tenant isolation
| CC1.2 Security | Authentication & authorization via Firebase Auth tokens; role-based access (admin/manager) | Security Engineer | Firebase Auth config; Firestore rules | Admin controls
| CC1.3 Change Management | Atomic writes and controlled updates via Firestore transactions | Engineering Lead | `MessagingService` transactions | End-to-end integrity
| CC2.1 Availability | Real-time listeners and offline persistence | Reliability Engineer | `enableIndexedDbPersistence`, offlineQueue | Offline resiliency
| CC2.2 Availability | DR planning notes | Architecture Lead | System architecture notes | DR posture
| CC3.1 Processing Integrity | Forwarding, editing, and deletion through transactions | Engineering Lead | `sendMessage`, `handleForwardMessage`, `handleDeleteMessage` | Integrity
| CC4.1 Confidentiality | Tenant-scoped media storage | Security Engineer | `storage.rules` | Data confinement
| CC4.2 Confidentiality (data in transit) | Encryption & secure access | Security Engineer | Network controls, storage access | In transit
| CC5.1 Privacy | Privacy controls in UI; edit history | Privacy Officer | `originalText`, `editedAt` fields | Privacy alignment

Notes:
- This matrix is a draft; official SOC 2 IDs can be added when provided
- Evidence sections should be populated with live artifacts during audit

- Notes:
- This matrix is intended for auditing and may be refined to exact SOC 2 wording. If you want, we can align with CC IDs from your official SOC 2 control matrix.
- Evidence sections should be filled with live artifact references during audit evidence collection.

### 2.6 SOC 2 Control Matrix (TradeTrackr mappings)

This matrix maps core TradeTrackr controls to SOC 2 Trust Services Criteria (simplified for audit purposes). It lists the SOC 2 criteria, the corresponding TradeTrackr control, owner, and primary evidence sources.

| SOC 2 Criteria | TradeTrackr Control / Mechanism | Owner | Evidence / Source | Notes |
|---|---|---|---|---|
| CC1.1 Security | Multi-tenant isolation via `concernID` and per-chat/participant access rules; UI and API access controlled by permissions | Security Architect / Platform Owner | `firestore.rules`, `storage.rules`, and `MessagingContext` access checks | Core tenant isolation for chats and messages
| CC1.2 Security | Authentication & authorization via Firebase Auth tokens; role-based access (admin/manager) | Security Engineer | Firebase Auth config; Firestore security rules | Elevates admin controls
| CC1.3 Change Management | Atomic writes and controlled updates via Firestore transactions | Engineering Lead | `MessagingService` transactions; code review artifacts | Prevents partial writes
| CC2.1 Availability | Real-time listeners and UI responsiveness; offline persistence | Reliability Engineer | `enableIndexedDbPersistence`, offlineQueue | Offline resiliency
| CC2.2 Availability | Redundancy planning and DR notes (in-scope vs. out-of-scope) | Architecture Lead | System architecture notes | Consider DR posture
| CC3.1 Processing Integrity | Atomic writes on messages and chat metadata via Firestore transactions | Engineering Lead | `sendMessage`, `handleForwardMessage`, `handleDeleteMessage` | End-to-end integrity
| CC4.1 Confidentiality | Media storage access restricted per tenant; thumbnails secured | Security Engineer | `storage.rules` | Tenant-scoped media
| CC4.2 Confidentiality (data in transit) | Encryption at rest and in transit where applicable; secure delivery of strikes | Security Eng | Storage and network controls notes | Data-in-transit controls
| CC5.1 Privacy | Data minimization and privacy protections in UI; audit trails on edits | Privacy Officer | UI rendering, `originalText`/`editedAt` fields | Privacy alignment

Notes:
- This matrix is a working draft; IDs can be extended to official SOC 2 IDs if provided.
- Evidence sections should be filled with live artifacts during audit evidence collection.

### 2.1 Security
- Access control for UI and API surfaces is enforced by:
  - `MessagingContext` and `MessagingService` enforcing chat participation and `concernID`.
  - Firestore security rules ensuring only participants can read/write messages.
- Authentication and authorization:
  - Firebase Auth tokens provide user identity; roles are enforced by Firestore rules (roles: `admin`, `manager`).
- Change management:
  - All data writes go through Firestore transactions to ensure atomic updates.
- Asset protection:
  - Media stored in Cloud Storage with per-chat paths; rules enforce authentication and per-tenant access.

### 2.2 Availability
- Real-time listeners for chats and messages ensure fresh data delivery.
- Offline support via IndexedDB and an offline queue to preserve write intent during outages.
- Redundancy considerations (backups, cross-region storage) are outside current implementation but noted for review.

### 2.3 Processing Integrity
- Atomic writes via Firestore `runTransaction` for messages, chat metadata, and unread counts.
- Forwarding, editing, and deletion actions use transactional updates where supported.
- Change controls include a formal edit history (originalText, isEdited, editedAt).

### 2.4 Confidentiality
- Data is scoped by `concernID` and per-user access rules; only participants can access chat data.
- Media access is restricted by Storage rules; thumbnails and media URLs are protected by authentication checks.

### 2.5 Privacy
- Personal data exposure is minimized; display names are derived from user profiles with restricted visibility.
- Data retention and deletion policies are documented in the retention appendix.

## 3. Roles & Responsibilities
- Security & Compliance Lead: owns SOC 2 mapping, evidence collection, and policy updates.
- Data Protection Officer (DPO) liaison: coordinates privacy controls with stakeholders.
- System Owners: maintain system components (frontend, backend services, storage).
- Auditors: read-only review of the audit docs and evidence.

## 4. Evidence & Artifacts
- Security rules and access policy definitions: `firestore.rules`, `storage.rules`
- Transactional logic and data models: `src/services/messagingService.ts`, `src/contexts/MessagingContext.tsx`
- Identity & access control: Firebase Auth configuration and role-based access
- Availability & backup: architecture notes and any backup strategies
- Data retention policies: see appendix

## 5. Evidence Collection Plan
- Collect policy documents, code ownership, and access control matrices
- Extract logs and change histories from the version control system
- Produce traceability from controls to system configurations
- Organize evidence by control category

## 6. Exceptions & Deviations
- Any deviations from SOC 2 criteria must be documented with risk assessment and remediation plans

## 7. Appendices
- Appendix A: SOC 2 mapping matrix (per control -> TradeTrackr control)
- Appendix B: Supporting evidence catalog
- Appendix C: Mapping to other standards (ISO 27001, etc.)

## 8. Export & Documentation Formats
- The SOC2 SOC 2 mapping is intended for audit use and can be exported to PDF or Confluence
- Template sections are defined for alignment with internal audit policies


