DROP TABLE IF EXISTS "Reservation";--> statement-breakpoint
DROP TABLE IF EXISTS "User";--> statement-breakpoint
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE varchar(255);