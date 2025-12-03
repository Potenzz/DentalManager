
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

---

# 2 — Confirm DB has tables

```bash
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "\dt"
```

---

# 3 — (If needed) fix postgres user password / auth

If `createdb` or `pg_restore` fails with password auth:

```bash
# set postgres role password
sudo -u postgres psql -c "ALTER ROLE postgres WITH PASSWORD 'mypassword';"
```
---

# 4 — Inspect `_prisma_migrations` in restored DB

```bash
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"
```

**Why:** the backup included `_prisma_migrations` from the original PC, which causes Prisma to detect "missing migrations" locally.

---

# 5 — (If present) remove old Prisma bookkeeping from DB

> We prefer to *not* use the old history from PC1 and create a fresh baseline on PC2.

```bash
# truncate migration records (bookkeeping only)
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "TRUNCATE TABLE _prisma_migrations;"
# verify
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "SELECT count(*) FROM _prisma_migrations;"
```

**Why:** remove migration rows copied from PC1 so we can register a clean baseline for PC2.

---

# 6 — Create a migrations directory + baseline migration folder (bookkeeping)

From project root (where `prisma/schema.prisma` lives — in your repo it’s `packages/db/prisma/schema.prisma`):

```bash
# create migrations dir if missing (adjust path if your prisma folder is elsewhere)
mkdir -p packages/db/prisma/migrations

# create a timestamped folder (example uses date command)
folder="packages/db/prisma/migrations/$(date +%Y%m%d%H%M%S)_init"
mkdir -p "$folder"

# create placeholder migration files
cat > "$folder/migration.sql" <<'SQL'
-- Baseline migration for PC2 (will be replaced with real SQL)
SQL

cat > "$folder/README.md" <<'TXT'
Initial baseline migration created on PC2.
This is intended as a bookkeeping-only migration.
TXT

# confirm folder name
ls -la packages/db/prisma/migrations
```

**Why:** Prisma requires at least one migration file locally as a baseline.

---

# 7 — Generate the full baseline SQL (so Prisma’s expected schema matches DB)

Use Prisma `migrate diff` to produce SQL that creates your current schema, writing it into the migration file you created:

```bash
# replace the folder name with the real one printed above, e.g. 20251203101323_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel=packages/db/prisma/schema.prisma \
  --script > packages/db/prisma/migrations/20251203101323_init/migration.sql
```

If your shell complains about line breaks, run the whole command on one line (as above).

**Fallback (if `migrate diff` not available):**

```bash
PGPASSWORD='mypassword' pg_dump -U postgres -h localhost -s dentalapp > /tmp/dental_schema.sql
cp /tmp/dental_schema.sql packages/db/prisma/migrations/20251203101323_init/migration.sql
```

**Why:** this makes the migration file contain CREATE TABLE / CREATE TYPE / FK / INDEX statements matching the DB so Prisma's expected schema = actual DB.

---

# 8 — Register the baseline migration with Prisma (using the exact env/schema your scripts use)

Important: use same env file and `--schema` (and `--config` if used) that your npm script uses. Example for your repo:

```bash
# from repo root, mark applied for the migrations folder we created
npx dotenv -e packages/db/.env -- npx prisma migrate resolve --applied "20251203101323_init" --schema=packages/db/prisma/schema.prisma
```

**Why:** record the baseline in `_prisma_migrations` with the checksum matching the `migration.sql` file.

---


# 9 — Verify status and generate client

```bash
# same env/schema flags
npx dotenv -e packages/db/.env -- npx prisma migrate status --schema=packages/db/prisma/schema.prisma

npx dotenv -e packages/db/.env -- npx prisma generate --schema=packages/db/prisma/schema.prisma
```

You should see:

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

