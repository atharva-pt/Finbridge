-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
