export type RingBinderFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type RingBinderFolderListResponse = {
  folders: RingBinderFolder[];
  maxFolders: number;
};
