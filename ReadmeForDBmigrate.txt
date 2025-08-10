while updating whole schema for payment, 

firstly just update this line in schema: and follow all steps. then update other schema from github.

totalBilled Decimal @db.Decimal(10, 2)




1. firstly create backup: 

pg_dump -U your_db_user -h localhost -p 5432 your_db_name > backup_before_totalBilled.sql
$ pg_dump -U postgres -h localhost -p 5432 dentalapp > backup_before_totalBilled.sql

2. - now update the schema: 
totalBilled Decimal @db.Decimal(10, 2)


3. create migration not apply yet
npx prisma migrate dev --create-only --name rename-billedamount-to-totalbilled


4. edit migration.sql file: 

replace whatever prisma put there: 

ALTER TABLE "public"."ServiceLine"
RENAME COLUMN "billedAmount" TO "totalBilled";

ALTER TABLE "public"."ServiceLine"
ALTER COLUMN "totalBilled" TYPE DECIMAL(10,2) USING "totalBilled"::DECIMAL(10,2);

5. npx prisma migrate dev


6. if anythign goes wrong ,do restore backup.
psql -U your_db_user -h localhost -p 5432 your_db_name < backup_before_totalBilled.sql


