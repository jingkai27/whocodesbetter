# CodeDuel Implementation Master Plan

Context: 
Come up with a project that i can implement and try to do in a week with the following skillsets. it should be fun and interesting and novel, think of it as a pet project that ii can deploy quickly
Large-Scale Systems Experience
* Distributed systems projects (even academic ones)
* Projects handling concurrent users or high throughput
* Database optimization work (SQL/NoSQL)
* Caching implementations (Redis, Memcached)
* Message queues (Kafka, RabbitMQ)
Messaging/Social Features (Highly Relevant)
* Real-time chat applications
* WebSocket implementations
* Push notification systems
* User connection/social graph features
* Content sharing mechanisms

Ensure robust testing as well

This document outlines the detailed technical approach to building CodeDuel, a real-time 1v1 coding competition platform.

## **Phase 1: Foundation & Infrastructure (Day 1)**

### **1.1 Project Initialization**
- **Monorepo Structure**: TurboRepo or Nx.
    - `apps/web`: Next.js (React) + TailwindCSS.
    - `apps/server`: Node.js (Express) or Go (Gin/Fiber).
    - `packages/shared`: Shared types (TypeScript interfaces for API/WS), utilities.
    - `packages/ui`: Shared UI components.
- **Environment Setup**:
    - `docker-compose.yml`: PostgreSQL, Redis, and optionally a local code execution service (Piston).
- **Authentication**:
    - JWT-based auth (Access/Refesh tokens).
    - OAuth providers (GitHub/Google) via Passport.js or Auth.js.

### **1.2 Database Schema (PostgreSQL)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  elo_rating INT DEFAULT 1200,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  problem_id UUID REFERENCES problems(id),
  winner_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACTIVE, FINISHED
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'EASY', -- EASY, MEDIUM, HARD
  test_cases JSONB NOT NULL -- [{input: "...", output: "..."}]
);
```

### **1.3 Real-time Layer (Redis + WebSocket)**
- **Tech**: Socket.IO (easier rooms/namespaces) or WS + Redis Pub/Sub.
- **Events**:
    - `join_lobby`: Connect to matchmaking.
    - `match_found`: Server notifies clients to join unique room `match:{id}`.
    - `code_update`: Broadcast Operational Transform (OT) or simple diffs.

---

## **Phase 2: Core Execution & Mechanics (Day 2-3)**

### **2.1 Code Execution Engine**
- **Integration**: Piston API (supports multiple languages, sandboxed).
- **Flow**:
    1. Client sends code + language.
    2. Server adds job to Redis Queue (BullMQ).
    3. Worker processes job -> hits Piston container.
    4. Result returned to Client via WebSocket.
- **Security**: Timeouts (5s limit), memory limits.

### **2.2 Matchmaking System**
- **Logic**:
    - Simple `setInterval` loop checking Redis 'Lobby' set.
    - Match players with ELO within range +/- 200.
    - Scale search range over time if no match found.

### **2.3 The Editor (Frontend)**
- **Monaco Editor**:
    - Configured for TS/JS/Python support.
    - Custom theme (CodeDuel Dark).
- **Synchronization**:
    - Debounced emits (every 100-300ms) of cursor/content changes.
    - Blind mode: Opponent code is blurry until game over (spectators see clear).

---

## **Phase 3: Social & Meta-Game (Day 4-6)**

### **3.1 Messaging**
- **Chat**:
    - Global Lobby Chat (Redis Streams or simple broadcasting).
    - In-game Chat (Room based).
- **Persistence**: Store last 50 messages in Redis, archive to Postgres for history.

### **3.2 Spectator Mode**
- **State Handling**:
    - Spectators join room `match:{id}`.
    - Receive initial state dump (current code of both players).
    - Listen to `code_update` events via specific room.
    - Spectator-only chat room `match:{id}:spectator`.

### **3.3 Replays**
- **Event Sourcing**:
    - Record essential events (key presses/diffs + timestamps) to JSON file or Blob storage.
    - **Replay Player**: Frontend component that iterates through events array to reconstruct state at time `t`.

---

## **Phase 4: Launch Prep (Day 7)**

### **4.1 Deployment Strategy**
- **Backend**: Railway or Render (easy Docker support).
- **Frontend**: Vercel.
- **Data**: Managed Postgres/Redis (Neon/Upstash or Railway internal).

### **4.2 Content**
- Check LeetCode/CodeWars for open problems.
- Format: Markdown description + JSON test cases.

## **Execution Checklist**

- [ ] **Day 1**: Init Repo, Docker-Compose, DB Schema, Basic Auth API.
- [ ] **Day 2**: Connect Piston, Build Matchmaking Queue, Redis Match State.
- [ ] **Day 3**: React Frontend, Monaco Editor, Real-time Sync.
- [ ] **Day 4**: Chat, User Profiles, Friend System.
- [ ] **Day 5**: Spectator View, Event Recording.
- [ ] **Day 6**: Leaderboards, Replay UI, Polish.
- [ ] **Day 7**: Production Env, Seed Data, Deploy.
