-- Update schema to remove User and Reservation tables
-- and update Chat table to use external user IDs

-- Step 1: Drop foreign key constraint if it exists
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_userId_User_id_fk";

-- Step 2: Change userId column type to varchar(255) to store external user IDs
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE varchar(255);

-- Step 3: Drop the User table (no longer needed)
DROP TABLE IF EXISTS "User";

-- Step 4: Reservation table already dropped in previous migration
