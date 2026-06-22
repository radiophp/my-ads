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
  receiptUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
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
  }),
});

export const {
  useGetBankAccountsQuery,
  useInitiatePaymentMutation,
  useUploadReceiptMutation,
  useReUploadReceiptMutation,
  useGetMyPaymentsQuery,
  useGetPaymentQuery,
  useGetAdminPaymentsQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} = paymentsApi;
