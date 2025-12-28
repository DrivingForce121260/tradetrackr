# Offline Messaging Guide (Tradetrackr)

- Firebase offline persistence is enabled in `src/config/firebase.ts`.
- An offline queue is implemented to capture outbound messaging actions while offline.
- The UI currently has no automatic visibility for offline queue flush; this guide outlines how it should behave.
- Key concepts:
  - Online/offline detection via `navigator.onLine`
  - Queue storage in `localStorage` under `tradetrackr_offline_queue_v1`
  - Flush when network connectivity is restored
- Status: baseline for further automation and tests.







