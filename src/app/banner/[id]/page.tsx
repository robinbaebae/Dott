import { auth } from '@/auth';
import { sanitizeHtml } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/supabase';
import { notFound, redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BannerPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const { id } = await params;

  const { data: banner } = await supabaseAdmin
    .from('banners')
    .select('html')
    .eq('id', id)
    .eq('user_id', session.user.email)
    .single();

  if (!banner) {
    notFound();
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(banner.html) }}
      style={{ margin: 0, padding: 0 }}
    />
  );
}
