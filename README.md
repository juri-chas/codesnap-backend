# CodeSnap Backend

REST API for sharing and discovering code snippets. Built with Fastify, TypeScript, and SQLite (Drizzle ORM).

## Requirements

- Node.js 18+
- npm

## Getting started

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000`.

## Environment variables

| Variable     | Default                  | Description           |
|--------------|--------------------------|-----------------------|
| `PORT`       | `3000`                   | Port to listen on     |
| `JWT_SECRET` | `codesnap-dev-secret`    | JWT signing secret    |

Set `JWT_SECRET` to a strong random value in production.

## Project structure

```
src/
├── controllers/    # Request handlers
├── db/             # Drizzle schema and database connection
├── middleware/     # Auth middleware
├── routes/         # Route registration
├── app.ts          # Fastify app factory
└── server.ts       # Entry point
```

## API endpoints

### Auth
| Method | Path             | Auth | Description          |
|--------|------------------|------|----------------------|
| POST   | /auth/register   | —    | Register new user    |
| POST   | /auth/login      | —    | Login, returns JWT   |

### Snippets
| Method | Path                     | Auth     | Description                   |
|--------|--------------------------|----------|-------------------------------|
| GET    | /snippets                | —        | List snippets (supports `?q=`, `?language=`, `?tag=`) |
| POST   | /snippets                | Required | Create snippet                |
| GET    | /snippets/trending       | —        | Trending snippets (supports `?window=30d`) |
| GET    | /snippets/:id            | —        | Get snippet by ID             |
| DELETE | /snippets/:id            | Required | Delete own snippet            |

### Comments
| Method | Path                        | Auth     | Description              |
|--------|-----------------------------|----------|--------------------------|
| GET    | /snippets/:id/comments      | —        | List comments            |
| POST   | /snippets/:id/comments      | Required | Add comment              |

### Stars
| Method | Path                   | Auth     | Description           |
|--------|------------------------|----------|-----------------------|
| POST   | /snippets/:id/star     | Required | Star a snippet        |
| DELETE | /snippets/:id/star     | Required | Unstar a snippet      |
| GET    | /me/starred            | Required | My starred snippets   |

### Tags
| Method | Path   | Auth | Description              |
|--------|--------|------|--------------------------|
| GET    | /tags  | —    | All tags with counts     |

### Users
| Method | Path              | Auth     | Description                     |
|--------|-------------------|----------|---------------------------------|
| GET    | /users/:username  | —        | Public profile with snippets    |
| PATCH  | /me               | Required | Update own bio (max 300 chars)  |

## Branch naming

`feature/[task-shortname]` — e.g. `feature/auth`, `feature/comments`
