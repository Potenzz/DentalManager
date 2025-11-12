# 🦷 DentalApp Database Restore Guide

This document explains how to **restore the DentalApp PostgreSQL database** on a new PC using the latest backup file from the main PC.

---

## 🧩 Overview

You will:

1. Create a PostgreSQL backup on the **main PC**
2. Copy it to the **target PC**
3. Restore it cleanly using `pg_restore`

---

## ⚙️ Prerequisites

Before starting:

- PostgreSQL is installed on both machines (same major version recommended)
- The app is **not running** during restore
- You know the database credentials  
  _(from `.env` or environment variables)_

Example:

```bash
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/dentalapp
```

## 🧭 Steps to Restore Database on Another PC

### 🖥️ Step 1 — Create Backup on Main PC

- Generate the backup.dump file from the backup page from the app.

### Step 2 — Copy Backup File to Target PC

- Transfer the backup file to the second PC using USB, network share, cloud, or SCP.

= Example destination path:
C:\db_backups\backup.dump

### 🧹 Step 3 — Prepare the Target PC

- Stop the DentalApp application to avoid database locks.
- Ensure PostgreSQL is installed and running.

- (Optional but recommended) Drop the existing database:

```
PGPASSWORD='mypassword' dropdb -U postgres -h localhost dentalapp
```

### ♻️ Step 4 — Restore the Database

# Case1: when we got a zip folder.

-linux bash

# 4.1) unzip to a directory

```
unzip backup.zip -d /tmp/dental_dump_dir
```

# 4.2) restore into an already-created DB named 'dentalapp'

```
PGPASSWORD='mypassword' createdb -U postgres -h localhost -O postgres dentalapp   # optional
PGPASSWORD='mypassword' pg_restore -U postgres -h localhost -d dentalapp -j 4 /tmp/dental_dump_dir

or
PGPASSWORD='mypassword' /usr/lib/postgresql/17/bin/pg_restore -v -U postgres -h localhost -C -d postgres /tmp/dental_dump_dir
```

# Case2: when we got a tar folder.

-linux bash

# 4.1) unzip to a directory

```
# create target dir and extract
mkdir -p /tmp/dental_dump_dir
tar -xzf backup.tar.gz -C /tmp/dental_dump_dir
```

# 4.2) restore into an already-created DB named 'dentalapp'

```
PGPASSWORD='mypassword' createdb -U postgres -h localhost -O postgres dentalapp   # optional
PGPASSWORD='mypassword' pg_restore -U postgres -h localhost -d dentalapp -j 4 /tmp/dental_dump_dir

or
PGPASSWORD='mypassword' /usr/lib/postgresql/17/bin/pg_restore -v -U postgres -h localhost -C -d postgres /tmp/dental_dump_dir
```

### ✅ Step 5 — Verify the Restore

- Check that the tables are restored successfully:

```
PGPASSWORD='mypassword' psql -U postgres -h localhost -d dentalapp -c "\dt"
```

- You should see all the application tables listed.

### 🧩 Step 6 — Update App Configuration

- Ensure the .env file on the target PC points to the correct database:

```
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/dentalapp
```

- Then start the DentalApp application and verify that it connects and displays data correctly.

# 🧠 Step 7 — Tips

- IMP: Use the same PostgreSQL version as the main PC. - currently more than v17.

- For large databases, use parallel restore for speed:

```
pg_restore -U postgres -j 4 -d dentalapp backup.dump
```

- Always keep at least one recent backup archived safely.

# If such error came:

- pg_restore: error: unsupported version (1.16) in file header

- use cmd:

- 1. Add PGDG (official PostgreSQL) APT repo and its key, then update and install client-17

```
sudo apt update && sudo apt install -y wget ca-certificates gnupg lsb-release
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install -y postgresql-client-17
```

- 2. Run pg_restore from the installed v17 binary (replace password as needed)

```
PGPASSWORD='mypassword' /usr/lib/postgresql/17/bin/pg_restore -v -U postgres -h localhost -C -d postgres ./backup.dump
```


# If error comes while creating normal db with password: 

- then, give the postgres user its password. 
```
sudo -u postgres psql -c "ALTER ROLE postgres WITH PASSWORD 'mypassword';"
```
