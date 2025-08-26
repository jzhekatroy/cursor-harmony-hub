-- AlterTable
ALTER TABLE "public"."teams" ADD COLUMN     "publicServiceCardsWithPhotos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicTheme" TEXT NOT NULL DEFAULT 'light';
