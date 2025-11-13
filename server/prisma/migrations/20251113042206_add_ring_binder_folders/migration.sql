-- CreateTable
CREATE TABLE "RingBinderFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RingBinderFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RingBinderFolder_userId_idx" ON "RingBinderFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RingBinderFolder_userId_name_key" ON "RingBinderFolder"("userId", "name");

-- AddForeignKey
ALTER TABLE "RingBinderFolder" ADD CONSTRAINT "RingBinderFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
