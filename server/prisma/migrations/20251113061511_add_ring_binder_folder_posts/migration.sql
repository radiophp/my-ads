-- CreateTable
CREATE TABLE "RingBinderFolderPost" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RingBinderFolderPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RingBinderFolderPost_postId_idx" ON "RingBinderFolderPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "RingBinderFolderPost_folderId_postId_key" ON "RingBinderFolderPost"("folderId", "postId");

-- AddForeignKey
ALTER TABLE "RingBinderFolderPost" ADD CONSTRAINT "RingBinderFolderPost_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "RingBinderFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RingBinderFolderPost" ADD CONSTRAINT "RingBinderFolderPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
