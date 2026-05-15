-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentHeadId" TEXT,
ADD COLUMN     "paymentSubHeadId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentHeadId_fkey" FOREIGN KEY ("paymentHeadId") REFERENCES "PaymentHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentSubHeadId_fkey" FOREIGN KEY ("paymentSubHeadId") REFERENCES "PaymentSubHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
