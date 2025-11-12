import { AuthGuard } from '@/components/auth/auth-guard';
import { PostDetailPageClient } from '@/components/dashboard/divar-posts/post-detail-page-client';

type PostDetailPageProps = {
  params: {
    id: string;
  };
};

export default function DashboardPostDetailPage({ params }: PostDetailPageProps) {
  return (
    <AuthGuard>
      <PostDetailPageClient postId={params.id} />
    </AuthGuard>
  );
}
