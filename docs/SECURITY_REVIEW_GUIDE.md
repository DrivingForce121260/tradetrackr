# Security Review Guide for Messaging (Tradetrackr)

- Purpose: Ensure chat/messaging data access complies with security requirements.
- Key areas:
  - Firestore Rules: ensure only authorized users can read/write chats, messages, and participants.
  - Ensure offline queue writes do not bypass security checks when flushed online.
- Checklist:
- [ ] Review users/roles and access controls for chat types (direct, group, controlling).
- [ ] Validate field-level access on `messages`, `chats`, and `chat_participants`.
- [ ] Ensure audit/logging is in place for sensitive operations.
- [ ] Validate offline flush uses authenticated user context when replaying writes.







