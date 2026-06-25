import { apiSlice } from '../baseApi';

type BankAccount = {
  id: string;
  bankName: string;
  cardNumber: string;
  cardHolderName: string;
  sheba: string;
};

type PaymentRequest = {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  discountCodeId: string | null;
  inviteCodeId: string | null;
  originalPrice: number;
  discountAmount: number | null;
  taxPercentage: number;
  taxAmount: number;
  finalAmount: number;
  inviteBonusDays: number | null;
  receiptUrl: string | null;
  status: 'INITIATED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason: string | null;
  featureExtras: Record<string, number>;
  adminAdjustedPrice: number | null;
  adminNote: string | null;
  adminReviewedAt: string | null;
  adminReviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  package?: { id: string; title: string; imageUrl?: string; durationDays?: number };
  user?: { id: string; phone: string; firstName: string | null; lastName: string | null };
};

type PaginatedPayments = {
  items: PaymentRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type InitiatePaymentPayload = {
  packageId: string;
  discountCode?: string;
  inviteCode?: string;
};

type FinalizePaymentPayload = {
  featureExtras: Record<string, number>;
  amount: number;
  adminNote?: string;
};

type CodeValidationResult =
  | { valid: true; codeId: string; adjustedPrice?: number; discountAmount?: number; bonusDays?: number }
  | { valid: false; message: string; remainingAttempts?: number };

const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBankAccounts: builder.query<BankAccount[], void>({
      query: () => '/user-panel/payments/bank-accounts',
    }),
    initiatePayment: builder.mutation<PaymentRequest, InitiatePaymentPayload>({
      query: (body) => ({
        url: '/user-panel/payments/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    validateCode: builder.mutation<CodeValidationResult, { packageId: string; code: string; type: 'discount' | 'invite' }>({
      query: (body) => ({
        url: '/user-panel/payments/validate-code',
        method: 'POST',
        body,
      }),
    }),
    uploadReceipt: builder.mutation<PaymentRequest, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/user-panel/payments/upload-receipt/${id}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ['Payments'],
    }),
    reUploadReceipt: builder.mutation<PaymentRequest, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/user-panel/payments/re-upload-receipt/${id}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ['Payments'],
    }),
    getMyPayments: builder.query<PaginatedPayments, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/user-panel/payments',
        params,
      }),
      providesTags: ['Payments'],
    }),
    getPayment: builder.query<PaymentRequest, string>({
      query: (id) => `/user-panel/payments/${id}`,
      providesTags: ['Payments'],
    }),
    getAdminPayments: builder.query<
      PaginatedPayments,
      { status?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/admin/payments',
        params,
      }),
      providesTags: ['Payments'],
    }),
    finalizePayment: builder.mutation<PaymentRequest, { id: string; body: FinalizePaymentPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/payments/${id}/finalize`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    approvePayment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/payments/${id}/approve`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Payments', 'UserSubscription'],
    }),
    rejectPayment: builder.mutation<void, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/admin/payments/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Payments'],
    }),
    cancelPayment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/user-panel/payments/${id}/cancel`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Payments'],
    }),
    getPendingPayment: builder.query<PaymentRequest | null, void>({
      query: () => '/user-panel/payments/pending/current',
      providesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetBankAccountsQuery,
  useInitiatePaymentMutation,
  useValidateCodeMutation,
  useUploadReceiptMutation,
  useReUploadReceiptMutation,
  useGetMyPaymentsQuery,
  useGetPaymentQuery,
  useGetAdminPaymentsQuery,
  useFinalizePaymentMutation,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
  useCancelPaymentMutation,
  useGetPendingPaymentQuery,
} = paymentsApi;
