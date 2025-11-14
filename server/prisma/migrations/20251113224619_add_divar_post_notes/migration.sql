-- CreateTable
CREATE TABLE "DivarPostNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivarPostNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DivarPostNote_postId_idx" ON "DivarPostNote"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "DivarPostNote_userId_postId_key" ON "DivarPostNote"("userId", "postId");

-- AddForeignKey
ALTER TABLE "DivarPostNote" ADD CONSTRAINT "DivarPostNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivarPostNote" ADD CONSTRAINT "DivarPostNote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
