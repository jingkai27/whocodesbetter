<div align="center">

# WhoCodesBetter?

![WhoCodesBetter? Banner](path/to/your/banner-image.png)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

### *Bringing Competition To Coding*

Inspired by: CodeDuel [https://github.com/eladlevi013/CodeDuel](https://github.com/eladlevi013/CodeDuel)

</div>


## Description

Not gonna lie, I thought that the CodeDuels idea was pretty cool. I have always been wondering what and how in-app messaging, matchmaking and coding works. So I decided to try to create one all by myself. 

Here are some of the lessons that I have learnt from this experience, including some of the features that I have built into the app. 
<br/>

---

## Key Features Implemented
  - Monorepo: TurboRepo with npm workspaces
  - Database: PostgreSQL with migrations for users, problems, matches, OAuth accounts,
  refresh tokens
  - Authentication: Email/password + GitHub OAuth with JWT access/refresh tokens
  - API Endpoints: Register, login, logout, refresh, profile management, leaderboard
  - Real-time: Socket.IO with matchmaking queue (join/leave lobby)
  - Frontend: Landing page, auth pages, dashboard with ELO display and "Find Match" button
  - Docker: PostgreSQL 16, Redis 7, Piston code execution engine  