import { createClient } from '@/lib/supabase/server';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { notFound } from 'next/navigation';

export default async function EditWarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: warranty } = await supabase
    .from('warranties')
    .select('*')
    .eq('id', id)
    .single();

  if (!warranty) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Editar Garantia</h1>
        <p className="text-secondary">Atualize os detalhes do seu produto.</p>
      </div>
      
      <WarrantyForm initialData={warranty} />
    </div>
  );
}
