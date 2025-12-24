-- CreateTable
CREATE TABLE "SavingCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavingCategory_userId_name_key" ON "SavingCategory"("userId", "name");

-- AddForeignKey
ALTER TABLE "SavingCategory" ADD CONSTRAINT "SavingCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Saving" ADD COLUMN     "savingCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Saving" ADD CONSTRAINT "Saving_savingCategoryId_fkey" FOREIGN KEY ("savingCategoryId") REFERENCES "SavingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
