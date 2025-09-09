-- Remove unique constraint from phone column in clients table
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_phone_key";
