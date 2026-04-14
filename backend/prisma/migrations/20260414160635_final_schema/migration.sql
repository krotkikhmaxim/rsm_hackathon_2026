-- CreateTable
CREATE TABLE "EnterpriseProfile" (
    "id" SERIAL NOT NULL,
    "enterprise_code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "host_count" INTEGER NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "EnterpriseProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Threat" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "object" TEXT,
    "source" TEXT,
    "cia_flags" TEXT,
    "cluster" TEXT,

    CONSTRAINT "Threat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "enterprise_code" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "predicted_threat" TEXT NOT NULL,
    "predicted_cluster" TEXT NOT NULL,
    "predicted_object" TEXT,
    "season" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "error_cluster" TEXT,
    "error_object" TEXT,
    "horizon" TEXT DEFAULT '7 дней',
    "Float" DOUBLE PRECISION,

    CONSTRAINT "PredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" SERIAL NOT NULL,
    "rec_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "threatId" INTEGER NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseProfile_enterprise_code_key" ON "EnterpriseProfile"("enterprise_code");

-- CreateIndex
CREATE UNIQUE INDEX "Threat_code_key" ON "Threat"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionLog_request_id_key" ON "PredictionLog"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_rec_code_key" ON "Recommendation"("rec_code");

-- AddForeignKey
ALTER TABLE "PredictionLog" ADD CONSTRAINT "PredictionLog_enterprise_code_fkey" FOREIGN KEY ("enterprise_code") REFERENCES "EnterpriseProfile"("enterprise_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "Threat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
