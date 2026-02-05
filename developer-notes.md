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

