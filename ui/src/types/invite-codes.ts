export type InviteCode = {
  id: string;
  code: string;
  inviterUserId: string;
  bonusDays: number;
  monthlyInviteLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateInviteCodePayload = {
  code: string;
  inviterUserId: string;
  bonusDays?: number;
  monthlyInviteLimit?: number;
  isActive?: boolean;
};

export type UpdateInviteCodePayload = Partial<CreateInviteCodePayload>;
