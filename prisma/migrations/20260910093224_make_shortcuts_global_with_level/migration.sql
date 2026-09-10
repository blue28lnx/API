/*
  Warnings:

  - You are about to drop the column `userId` on the `shortcuts` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- DropForeignKey
ALTER TABLE "public"."shortcuts" DROP CONSTRAINT "shortcuts_userId_fkey";

-- DropIndex
DROP INDEX "public"."shortcuts_userId_idx";

-- DropIndex
DROP INDEX "public"."shortcuts_userId_tool_idx";

-- AlterTable
ALTER TABLE "shortcuts" DROP COLUMN "userId",
ADD COLUMN     "level" "Level" NOT NULL DEFAULT 'BEGINNER';

-- CreateIndex
CREATE INDEX "shortcuts_tool_level_idx" ON "shortcuts"("tool", "level");
