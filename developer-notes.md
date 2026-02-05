Developer Notes
<br>
This is for you to remember.

### Redis Set-up: 
What is Redis? 

1. Set up Redis Container in Docker Compose: `docker-compose.yml (lines 20-33)`. A Redis Server on 6349 will start. 
2. Have it configured in the `.env` file. This allows app to find out where Redis is. 
3. Set redis URL in the `env.ts` file in the `server/src/config/env.ts`. So that the server can find where the redis, when locally hosted is on localhost:6349
4. Create a redis client in the server. 
5. Use it throughout the app. Using file exports on the redis helper, it will create helper objects that uses the redis client. Refer to `/server/src/services/redis.ts`. Some example of functions used are `lobbyQueue` and `userSockets`.
6. Afterwards, Socket.io will also import and use Redis. This is seen under the `src/socket` folder lololol.  

## Match-making
```
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYER 1 (ELO: 1500)                         │
│                 Clicks "Find Match" button                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. Frontend emits event
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (dashboard/page.tsx line 48)                         │
│  joinLobby();  // Emits 'join_lobby' to server                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Socket.IO sends to server
                              ▼
╔═════════════════════════════════════════════════════════════════╗
║                         SERVER SIDE                             ║
╚═════════════════════════════════════════════════════════════════╝
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Socket Handler (socket/index.ts lines 98-115)                │
│  socket.on('join_lobby', async () => {                         │
│    // 1. Add to Redis sorted set (sorted by ELO)              │
│    await lobbyQueue.add(user.id, user.eloRating);             │
│                                                                 │
│    // 2. Tell user their position                             │
│    socket.emit('lobby_joined', { position, estimatedWait });  │
│                                                                 │
│    // 3. Try to find match immediately                        │
│    await tryMatchmaking(user.id, user.eloRating, io);         │
│  });                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. Store in Redis
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Redis Sorted Set (services/redis.ts line 29)                 │
│  ZADD lobby:queue 1500 "user123"                              │
│                                                                 │
│  Current Queue:                                                │
│  ┌──────────────────────────────────────┐                     │
│  │ user456 → ELO: 1450                  │                     │
│  │ user123 → ELO: 1500  ← YOU           │                     │
│  │ user789 → ELO: 1550                  │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. Background loop checks
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Matchmaking Loop (socket/index.ts lines 565-584)             │
│  setInterval(async () => {                                     │
│    // Runs EVERY 2 SECONDS                                    │
│    const users = await lobbyQueue.getAllUsers();              │
│    for (const user of users) {                                │
│      await tryMatchmaking(user.id, user.elo, io);            │
│    }                                                           │
│  }, 2000);                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 5. Find opponent
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ELO-Based Matching (services/redis.ts lines 72-85)          │
│                                                                 │
│  Your ELO: 1500                                               │
│  Wait time: 0 seconds → Range: ±200                           │
│  Search: 1300-1700                                            │
│                                                                 │
│  Wait time: 20 seconds → Range: ±300                          │
│  Search: 1200-1800                                            │
│                                                                 │
│  Wait time: 60 seconds → Range: ±500 (MAX)                    │
│  Search: 1000-2000                                            │
│                                                                 │
│  ✅ Found: user789 (ELO: 1550)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 6. Create match
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Match Creation (socket/index.ts lines 507-549)               │
│  1. Remove both from queue                                     │
│  2. Create match in PostgreSQL database                       │
│  3. Store in Redis for quick access                           │
│  4. Get both players' socket IDs                              │
│  5. Join both to Socket.IO room: "match:abc123"               │
│  6. Emit 'match_found' to both players                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 7. Both players notified
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PLAYER 1 & PLAYER 2                               │
│         Receive 'match_found' event                            │
│         Redirected to /match/abc123                            │
│              🎉 MATCH STARTS! 🎉                               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```text
codeduels/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/          # Pages (landing, login, register, dashboard, auth callback)
│   │       ├── lib/          # API client, Socket.IO client
│   │       └── hooks/        # useAuth hook with Zustand
│   └── server/               # Express + Socket.IO backend
│       └── src/
│           ├── config/       # Environment configuration
│           ├── db/           # PostgreSQL connection, migrations, seeds
│           ├── routes/       # Auth & user endpoints
│           ├── middleware/   # JWT authentication
│           ├── services/     # Auth service, Redis client
│           └── socket/       # Real-time matchmaking
├── packages/
│   ├── shared/               # TypeScript types (User, Match, Problem, Socket events)
│   └── ui/                   # Shared UI components (placeholder)
├── docker-compose.yml        # PostgreSQL, Redis, Piston
├── turbo.json                # TurboRepo config
└── package.json              # Workspace config
```
  
## To Run
- Start databases: `docker compose up -d`
- Run migrations: `npm run db:migrate`
- Seed sample data: `npm run db:seed`
- Start development: `npm run dev`  

