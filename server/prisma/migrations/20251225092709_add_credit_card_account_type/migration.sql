-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'AccountType' AND e.enumlabel = 'CREDIT_CARD') THEN
    ALTER TYPE "AccountType" ADD VALUE 'CREDIT_CARD';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "bankName" TEXT;

-- AlterTable
ALTER TABLE "Saving" ADD COLUMN IF NOT EXISTS "settlementTransactionId" TEXT;
