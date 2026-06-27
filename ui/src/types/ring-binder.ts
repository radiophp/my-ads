export type RingBinderFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  savedPostCount?: number;
  sharedWithPhones?: string[];
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

export type RingBinderShare = {
  id: string;
  folderId: string;
  folderName: string;
  sharedWithUser: { id: string; phone: string };
  createdAt: string;
};

export type SharedUserEntry = {
  user: { id: string; phone: string };
  folders: Array<{ id: string; name: string }>;
};

export type AllSharedUsersResponse = {
  users: SharedUserEntry[];
  limit: number;
  used: number;
};

export type SharedWithMeFolder = {
  id: string;
  folderId: string;
  folderName: string;
  ownerId: string;
  ownerPhone: string;
  createdAt: string;
};
