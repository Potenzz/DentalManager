
These are the approach, required in special case when: 
we migrating db from backup file to one pc1 to pc2. where pc1 was in dev mode. 

so to just get the data from backup db, and start fresh migrations with prisma in pc2. we follow below approach. 
else, we need to copy the pc1 migrations folder as well. instead of below approach.


# ✅ Starting point (what we already have)

* `backup.tar.gz` on PC2
* `prisma/schema.prisma` (from GitHub) in your repo
* `.env` with `DATABASE_URL` (or `packages/db/.env` used by your scripts)

---

# 1 — Extract and restore the DB backup

```bash
# create extraction dir and extract
mkdir -p /tmp/dental_dump_dir
tar -xzf /path/to/backup.tar.gz -C /tmp/dental_dump_dir

# create DB (if not exists) and restore (data-only or custom format)
PGPASSWORD='mypassword' createdb -U postgres -h localhost -O postgres dentalapp
PGPASSWORD='mypassword' pg_restore -U postgres -h localhost -d dentalapp -j 4 /tmp/dental_dump_dir
# (or use /usr/lib/postgresql/<ver>/bin/pg_restore if version mismatch)
```
# 1.2 — (If needed) fix postgres user password / auth

If `createdb` or `pg_restore` fails with password auth:

```bash
# set postgres role password
sudo -u postgres psql -c "ALTER ROLE postgres WITH PASSWORD 'mypassword';"
```
---

# 2 — Confirm DB has tables

```bash
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "\dt"
```

---

## 3 — Let Prisma create the schema (RUN ONCE)

```bash
npx prisma migrate dev --config=packages/db/prisma/prisma.config.ts
```

Expected:

```
Your database is now in sync with your schema.
```

This step:

* Creates tables, enums, indexes, FKs
* Creates `_prisma_migrations`
* Creates the first local migration

---

## 4 — Restore DATA ONLY from backup

```bash
PGPASSWORD='mypassword' pg_restore -U postgres -h localhost -d dentalapp -Fd /tmp/dental_dump_dir --data-only --disable-triggers
```

⚠️ This will also restore old `_prisma_migrations` rows — we fix that next.

---

## 5 — Remove old Prisma bookkeeping from backup

```bash
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "TRUNCATE TABLE _prisma_migrations;"
```

This:

* Does NOT touch data
* Does NOT touch schema
* Removes old PC1 migration history

---

## 6 — Re-register the current migration as applied (CRITICAL STEP)

Replace the migration name with the one created in step 3
(example: `20260103121811`).

```bash
npx prisma migrate resolve --applied 20260103121811 --config=packages/db/prisma/prisma.config.ts
```

This tells Prisma:

> “Yes, this migration already created the schema.”

---

## 7 — Verify Prisma state

```bash
npx prisma migrate status --config=packages/db/prisma/prisma.config.ts
```

Expected:

```
1 migration found in prisma/migrations
Database schema is up to date!
```

---

# 10 — Run your project migration command (global npm script)

Now run:

```bash
npm run db:migrate
# or, if your script uses flags, it will use the same schema/env
```

It should no longer print drift or ask to reset.

---

# 11 — Extra / troubleshooting commands we used (keep these handy)

* Inspect migration rows:

```bash
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "SELECT id,migration_name,finished_at FROM _prisma_migrations ORDER BY finished_at;"
```

* Recreate DB from saved backup (if needed):


```bash
PGPASSWORD='mypassword' dropdb -U postgres -h localhost dentalapp
PGPASSWORD='mypassword' createdb -U postgres -h localhost dentalapp
PGPASSWORD='mypassword' pg_restore -U postgres -h localhost -d dentalapp /path/to/backup.dump
```

* Show top of a file:

```bash
sed -n '1,60p' packages/db/prisma/migrations/20251203101323_init/migration.sql
```

