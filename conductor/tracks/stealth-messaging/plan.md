# Stealth Messaging App Plan (Project Pivot)

## 1. Overview
Transform the current application into a **Stealth Messaging App** disguised as a **News Aggregator**.
- **Public Face:** Fully functional News App (fetching real or mock news).
- **Hidden Access:** Double-tap on the "Date/Time" header element reveals a PIN pad.
- **Secret Core:** Encrypted messaging platform (Telegram-like).

## 2. Core Features

### The Disguise (News App)
- [ ] **News Feed:** Fetch news from a public API (e.g., NewsAPI, GNews) or RSS feeds.
- [ ] **UI:** Standard news app layout (Headlines, Categories, Search).
- [ ] **Stealth Trigger:** 
    - Component: Date/Time display in the header.
    - Action: Double-tap/click.
    - Result: Opens PIN modal.

### Security Layer
- [ ] **PIN Protection:** 4-digit PIN entry.
- [ ] **Panic Button:** Quick exit to News Feed.
- [ ] **Data Encryption:** Local storage encryption (optional but recommended for "stealth").

### The Messaging Core (Secret)
- [ ] **Contacts:** Add by unique nickname/ID.
- [ ] **Chat Interface:**
    - Real-time messaging (Supabase Realtime).
    - Text, Audio (Voice Notes), Video, Images.
    - "Delete for everyone" feature.
- [ ] **Media Handling:** Secure upload/viewing (Supabase Storage).

## 3. Technical Stack Changes
- **Database:** specific tables for `chats`, `messages`, `contacts` (Supabase).
- **State Management:** Zustand or Context for "Disguise Mode" and "Auth".
- **Realtime:** Supabase Realtime for instant message delivery.

## 4. Migration Steps
1.  **Refactor DisguiseProvider:**
    - Replace "Notepad" with "News Feed" component.
    - Implement the Double-Tap + PIN logic.
2.  **Database Setup:** Create Schema for Messaging.
3.  **Frontend Implementation:**
    - Build `NewsFeed` component.
    - Build `MessagingDashboard` (Chat list, Chat view).
    - Build `ContactManager`.
4.  **Cleanup:** Remove or hide "Warranty Tracker" specific code (unless it's kept as a second decoy).

## 5. Questions for User
- Should we completely remove the "Warranty Tracker" features?
- Do you have a preferred News API source (and API Key)?
- Should the PIN be hardcoded initially or user-configurable?
