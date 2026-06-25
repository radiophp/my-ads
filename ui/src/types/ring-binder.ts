export type RingBinderFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  savedPostCount?: number;
};

export type RingBinderFolderListResponse = {
  folders: RingBinderFolder[];
  limit: number;
  remaining: number;
};

export type SavedFolderEntry = {
  id: string;
  folderId: string;
  folderName: string;
  createdAt: string;
};

export type PostSavedFoldersResponse = {
  saved: SavedFolderEntry[];
  note: {
    content: string;
    updatedAt: string;
  } | null;
};
