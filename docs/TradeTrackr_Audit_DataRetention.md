# TradeTrackr Data Retention Policy

This document defines data retention, disposal, and deletion procedures for the TradeTrackr portal.

## 1) Scope
- Applies to user data, chat data, messages, media attachments, logs, telemetry, and audit trails.
- Data retention periods are aligned with legal/compliance requirements and tenancy policies.

## 2) Data Categories & Retention Periods
- Users: Retention until user deletion (subject to legal holds for security events).
- Chats: Retention should cover last message and metadata for audit trail; consider 7 years for business records (adjust per policy).
- Messages: Retain text, media references with timestamps; media objects retained per storage policy (see storage rules).
- Media: Attachments stored in Cloud Storage; retention per policy (e.g., 7 years for business records).
- Telemetry: Retain logs for operational analytics for a defined period.

-## Appendix A: Detailed Retention Matrix
- Data Category: Users
  - Retention: Until account deletion; otherwise per-policy holds
  - Rationale: Identity lifecycle; compliance
  - Deletion Trigger: User deletion request; policy expiration
  - Disposal: Logical deletion, archiving
  - Data Owner: Security Officer
- Data Category: Chats
  - Retention: Last message metadata for audit; 7 years default
  - Rationale: Chat history for compliance and business records
  - Deletion Trigger: Policy expiration or legal holds
  - Disposal: Archive or purge per policy
  - Data Owner: Compliance Lead
- Data Category: Messages
  - Retention: Text and metadata for 7 years; media references per policy
  - Rationale: Individual conversations for audits
  - Deletion Trigger: Expiration, legal hold
  - Disposal: Per policy
  - Data Owner: Data Governance
- Data Category: Media
  - Retention: Attachments per policy (e.g., 7 years)
  - Disposal: Storage-based deletion with rules
  - Data Owner: Storage Admin
- Data Category: Telemetry
  - Retention: 1 year (adjust as needed)
  - Disposal: Anonymization after retention
  - Data Owner: Platform Ops
- Data Category: Logs/Audit Trails
  - Retention: 7 years (or per policy)
  - Disposal: Secure deletion or archival
  - Data Owner: Compliance & Security

- Data Category: Users
  - Retention: Until account deletion; otherwise per-policy holds
  - Rationale: Identity lifecycle; compliance
  - Deletion Trigger: User deletion request; policy expiration
  - Disposal: Logical deletion, archiving
- Data Category: Chats
  - Retention: Last message metadata for audit; 7 years default
  - Rationale: Chat history for compliance and business records
  - Deletion Trigger: Policy expiration or legal holds
  - Disposal: Archive or purge per policy
- Data Category: Messages
  - Retention: Text and metadata for 7 years; media references per policy
  - Rationale: Individual conversations for audits
  - Deletion Trigger: Expiration, legal hold
- Data Category: Media
  - Retention: Attachments per policy (e.g., 7 years)
  - Disposal: Storage-based deletion with rules
- Data Category: Telemetry
  - Retention: 1 year (adjust as needed)
  - Disposal: Anonymization after retention
- Data Category: Logs/Audit Trails
  - Retention: 7 years (or per policy)
  - Disposal: Secure deletion or archival

## 4) Detailed Retention Schedule (Appendix A)
- See notes in Appendix A for categories, retention durations, and owners
- Data Category: Users
  - Retention: Until account deletion; otherwise per-policy holds
  - Rationale: Identity lifecycle; compliance
  - Deletion Trigger: User deletion request; policy expiration
  - Disposal: Logical deletion, archiving
- Data Category: Chats
  - Retention: Last message metadata for audit; 7 years default
  - Rationale: Chat history for compliance and business records
  - Deletion Trigger: Policy expiration or legal holds
- Data Category: Messages
  - Retention: Text and metadata for 7 years; media references per policy
  - Rationale: Individual conversations for audits
  - Deletion Trigger: Expiration, legal hold
- Data Category: Media
  - Retention: Attachments per policy (e.g., 7 years)
  - Disposal: Storage-based deletion with rules
- Data Category: Telemetry
  - Retention: 1 year (adjust as needed)
  - Disposal: Anonymization after retention
- Data Category: Logs/Audit Trails
  - Retention: 7 years (or per policy)
  - Disposal: Secure deletion or archival

## 4) Deletion Triggers & Processes
- User data requests (ERD, data deletion requests)
- Retention policy expiration
- Legal holds


## 3) Detailed Retention Schedule
- Data Category: Users
  - Retention: Until account deletion; otherwise per-policy holds
  - Rationale: Identity lifecycle; compliance
  - Deletion Trigger: User deletion request; policy expiration
  - Disposal: Logical deletion, archiving
- Data Category: Chats
  - Retention: Last message metadata for audit; 7 years default
  - Rationale: Chat history for compliance and business records
  - Deletion Trigger: Policy expiration or legal holds
- Data Category: Messages
  - Retention: Text and metadata for 7 years; media references per policy
  - Rationale: Individual conversations for audits
  - Deletion Trigger: Expiration, legal hold
- Data Category: Media
  - Retention: Attachments per policy (e.g., 7 years)
  - Disposal: Storage-based deletion with rules
- Data Category: Telemetry
  - Retention: 1 year (adjust as needed)
  - Disposal: Anonymization after retention
- Data Category: Logs/Audit Trails
  - Retention: 7 years (or per policy)
  - Disposal: Secure deletion or archival

## 4) Deletion Triggers & Processes
- User data requests (ERD, data deletion requests)
- Retention policy expiration
- Legal holds


## 3) Deletion Triggers
- User-initiated deletion (account removal, data erasure requests)
- Retention policy expiration
- Legal hold scenarios (inactive accounts, compliance requests)

## 4) Data Disposal
- Logical deletion in Firestore; remove media references; delete Storage assets per rules
- Secure wipe for storage when possible per platform capabilities

## 5) Roles & Responsibilities
- Data Owner: who is responsible for retention policy updates
- Compliance Officer: monitors regulatory alignment
- System Admin: enforces retention rules in code and config

## 6) Exceptions & Overrides
- Document any legal holds or exemptions with justification


