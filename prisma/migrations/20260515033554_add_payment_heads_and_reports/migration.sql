-- CreateTable
CREATE TABLE "PaymentHead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSubHead" (
    "id" TEXT NOT NULL,
    "paymentHeadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSubHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "period" TEXT,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHead_companyId_name_key" ON "PaymentHead"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSubHead_paymentHeadId_name_key" ON "PaymentSubHead"("paymentHeadId", "name");

-- AddForeignKey
ALTER TABLE "PaymentHead" ADD CONSTRAINT "PaymentHead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubHead" ADD CONSTRAINT "PaymentSubHead_paymentHeadId_fkey" FOREIGN KEY ("paymentHeadId") REFERENCES "PaymentHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
