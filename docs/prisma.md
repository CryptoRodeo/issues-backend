# Prisma Cheatsheet

This project uses the Prisma ORM (Object Relational Mapping).

Official docs: https://www.prisma.io/docs/orm

## Core Concepts

### Schema
The `schema.prisma` file is where you describe your data models, data source and generator
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int @id @default(autoincrement())
  name      String
  email     String
  posts     Post[]
  createdAt DateTime @default(now())
}
```

### Model
Each model in `schema.prisma` maps to a table in the database.
```prisma
model Issue {
  id    String @id @default(uuid())
  title String
}
```
### Prisma Client Commands :robot:
The client generates the code that talks to the database
```typescript
const prisma = new PrismaClient() // Client
await prisma.issue.findMany() // Using the client
```


## Commands

### Schema and Migrations :book:

There are two main migration commands:

`npx prisma migrate dev`
- **For development/local work**
- Creates new migration files when you change the schema
- Applies migrations to your dev database
- Regenerates the Prisma client
- Can reset/recreate your database if needed

```bash
# After changing schema.prisma, run this:
npx prisma migrate dev --name describe_what_you_changed

# Example:
npx prisma migrate dev --name add_new_field
```
`npx prisma migrate deploy`
- **For production/staging servers**
- Only applies to existing migration files
- Doesn't create new migrations
- Doesn't regenerate the client
- Never resets the database (safe for production data)

```bash
# During deployment we run:
npx prisma migrate deploy

# This looks at all migration files and applies any that haven't been run yet.
# It's safe because it won't create new migrations or reset data.
```

| Command                                                 | Use Case                                                                          |
|---------------------------------------------------------|-----------------------------------------------------------------------------------|
| `npx prisma migrate dev --name <name>`                  | Create and apply migration in dev                                                 |
| `npx prisma migrate reset`                              | :warning: **Reset the database**, apply all migrations, and re-seed (**dev only**)|
| `npx prisma migrate status`                             | See if your local DB is in sync with the migration history                        |
| `npx prisma db push`                                    | Apply schema changes **without creating a migration** (useful for prototyping)    |
| `npx prisma migrate deploy`                             | :ship: Apply pending migration in **production**                                  |
| `npx prisma migrate resolve --applied <migration_name>` | Mark migration as applied without running it (manual conflict resolution)         |


## Prisma Client :robot:
| Command               | Use Case                                          |
|-----------------------|---------------------------------------------------|
| `npx prisma generate` | Regenerate the Prisma Client after schema changes |
| `npx prisma format`   | Format your `schema.prisma` file                  |

## Inspect the Database :mag:
| Command               | Use Case                                                                          |
|-----------------------|-----------------------------------------------------------------------------------|
| `npx prisma studio`   | Launch a GUI to view and edit your database records                               |
| `npx prisma db pull`  | Introspect an **existing database** into your Prisma models (reverse engineer DB) |


## Command Dev Workflow :computer:

**After editing `schema.prisma`** :pencil:
```bash
npx prisma migrate dev --name add_new_field
```

**Reset and reseed dev DB**
```bash
npx prisma migrate reset
```

**View the DB in a GUI**
```bash
npx prisma studio
```

**Prototype without migrations**
```bash
npx prisma db push
```

**Production deploy**
```bash
npx prisma migrate deploy
```

**Notes**
- `migrate dev` regenerates the client automatically. No need to run `npx prisma generate` after.
- :warning: **Never use `migrate reset`** in production, it wipes the DB!
