import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BannerPage({ params }: Props) {
  const { id } = await params;

  const { data: banner, error } = await supabase
    .from('banners')
    .select('html')
    .eq('id', id)
    .single();

  if (error || !banner) {
    notFound();
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: banner.html }}
      style={{ margin: 0, padding: 0 }}
    />
  );
}
