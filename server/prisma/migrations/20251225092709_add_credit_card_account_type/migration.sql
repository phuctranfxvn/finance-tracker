-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'CREDIT_CARD';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "bankName" TEXT;

-- AlterTable
ALTER TABLE "Saving" ADD COLUMN     "settlementTransactionId" TEXT;
