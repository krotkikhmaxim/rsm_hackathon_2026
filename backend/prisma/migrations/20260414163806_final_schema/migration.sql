/*
  Warnings:

  - You are about to drop the column `Float` on the `PredictionLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PredictionLog" DROP COLUMN "Float",
ADD COLUMN     "estimated_damage" DOUBLE PRECISION;
