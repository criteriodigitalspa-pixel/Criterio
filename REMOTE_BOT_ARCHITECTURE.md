# 🤖 REMOTE BOT ARCHITECTURE & WHATSAPP CONNECTION

**CRITICAL DOC FOR FUTURE AGENTS:** This file explains how the React Application ("Agent Studio") connects securely to the Headless Remote PC running the WhatsApp Bot.

---

## 1. The Core Concept: "Secure Push" (Post-Single-Tenancy)

Unlike traditional setups where the Remote PC scans the entire `personas` database, we use a **"Secure Dead Drop"** architecture to prevent data leakage and excessive permissions.

- **Agent Studio (Frontend)**: Calculates the necessary configuration (System Prompt + Enabled Actions) and "pushes" a single JSON packet.
- **Remote PC (Backend)**: Listens **only** to that specific packet and updates its internal brain ("Hot Reload").
- **Firestore**: Acts as the secure middleware via the `deployments` collection.

---

## 2. Components

### A. The "Deployer" (Agent Studio)
- **Location**: `src/pages/AgentStudio/index.jsx`
- **Trigger**: The **Purple Rocket Button (🚀)** in the header.
- **Logic**:
  1. Fetches the currently selected **Main Persona**.
  2. Fetches all **Enabled Actions** owned by the user.
  3. Constructs a lightweight JSON payload.
  4. Writes to: `deployments/whatsapp_bot_config` (Firestore).

### B. The "Listener" (Remote PC)
- **Location**: `Mirror_Private/remote_watcher_v2.js`
- **Role**: Runs permanently on the Remote PC (using `node`).
- **Function**:
  1. Authenticates via `service_account.json` (Firebase Admin SDK).
  2. Subscribes (`onSnapshot`) to `deployments/whatsapp_bot_config`.
  3. On change: Updates the local variable `currentBrain`.
  4. Uses this brain to answer WhatsApp messages (via `handleIncomingMessage` or similar logic).

### C. The Gatekeeper (Firestore Rules)
- **Location**: `firestore.rules` (Firebase Console)
- **Rule Block**:
  ```javascript
  // 🚀 DEPLOYMENTS collection
  match /deployments/{docId} {
    allow write: if request.auth != null; // Admin sends updates
    allow read: if request.auth != null;  // Remote Bot reads updates
  }
  ```

---

## 3. Remote PC Setup Instructions

If the Remote PC is reset or a new one is provisioned:

1. **Install Node.js**: Ensure modern version (v18+).
2. **Clone Repo**: Pull this repository to `C:\Users\...\antigravity\scratch` (or desired path).
3. **Download Service Account**:
   - Go to [Firebase Console](https://console.firebase.google.com/) -> Project Settings -> Service Accounts.
   - Generate New Private Key.
   - Save file as `Mirror_Private/service_account.json`. (THIS FILE IS GIT-IGNORED FOR SAFETY).
4. **Install Dependencies**:
   ```bash
   cd Mirror_Private
   npm install firebase-admin
   ```
5. **Run the Watcher**:
   ```bash
   node remote_watcher_v2.js
   ```
   *Expected Output:* `🛰️ Iniciando Secure Watcher V2... 👂 Escuchando cambios...`

---

## 4. Key Files Reference

| Purpose | File Path | Description |
| :--- | :--- | :--- |
| **Frontend UI** | `scratch/frontend/src/pages/AgentStudio/index.jsx` | Contains `handleDeploy` and Rocket button logic. |
| **Remote Script** | `scratch/Mirror_Private/remote_watcher_v2.js` | The actual listener script running on the remote machine. |
| **Bridge Logic** | `scratch/Mirror_Private/remote_bridge.js` | (Legacy/Alternative) Direct DB connection script. |
| **Security** | `scratch/firestore.rules` | Defines write/read permissions for the `deployments` collection. |

---

> **NOTE:** Any changes to the `actions` schema or `personas` data structure MUST be reflected in `handleDeploy` (to package it correctly) and `remote_watcher_v2.js` (to interpret it correctly).
