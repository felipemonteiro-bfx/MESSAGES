import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({
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

  if (!warranty) notFound();

  const expirationDate = calculateExpirationDate(warranty.purchase_date, warranty.warranty_months);
  const daysRemaining = getDaysRemaining(expirationDate);
  const isExpired = daysRemaining < 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500 font-bold mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Button>
      </Link>

      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">{warranty.name}</h1>
            <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {isExpired ? 'Proteção Encerrada' : 'Garantia Ativa'}
            </div>
          </div>
          <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Categoria Geral'}</p>
        </div>
        <Link href={`/products/edit/${warranty.id}`}>
          <Button size="lg" className="gap-2 px-8">
            <Pencil className="h-5 w-5" /> Editar Dados
          </Button>
        </Link>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Informações Principais */}
        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-none bg-white shadow-sm p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor Pago</p>
              <p className="text-lg font-black text-slate-900">R$ {Number(warranty.price || 0).toLocaleString('pt-BR')}</p>
            </Card>
            <Card className="border-none bg-white shadow-sm p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Economia</p>
              <p className="text-lg font-black text-pink-600">R$ {Number(warranty.total_saved || 0).toLocaleString('pt-BR')}</p>
            </Card>
            <Card className="border-none bg-white shadow-sm p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Loja</p>
              <p className="text-sm font-bold text-slate-700 truncate">{warranty.store || '---'}</p>
            </Card>
            <Card className="border-none bg-white shadow-sm p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Restam</p>
              <p className={`text-lg font-black ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>{isExpired ? '0' : daysRemaining} dias</p>
            </Card>
          </div>

          <Card className="border-none shadow-xl shadow-emerald-500/5">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <Sparkles className="h-5 w-5" /> Inteligência do Guardião
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Dicas de Longevidade
                </h4>
                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 italic text-emerald-800 font-medium leading-relaxed">
                  "{warranty.care_tips || 'A IA ainda não processou dicas para este produto. Tente reprocessar a nota.'}"
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-emerald-600" /> Observações Internas
                </h4>
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-600 text-sm leading-relaxed">
                  {warranty.notes || 'Nenhuma observação cadastrada.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar de Documentação */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-2 w-full bg-slate-900" />
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Documento Original</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {warranty.invoice_url ? (
                <div className="space-y-4">
                  <div className="aspect-[3/4] bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-8 text-center">Pré-visualização disponível apenas para usuários Pro</p>
                  </div>
                  <a 
                    href={warranty.invoice_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Abrir Nota Fiscal <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <Package className="h-12 w-12 text-slate-200 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">Nenhuma nota anexada</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-6 rounded-[32px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-500/20 space-y-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Umbrella className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-black leading-tight">Proteger este Bem?</h4>
            <p className="text-xs font-medium text-emerald-100 leading-relaxed">Simule o valor de um seguro contra roubo e danos para este item usando nossa IA.</p>
            <Link href={`/insurance/simulator/${warranty.id}`} className="block">
              <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase tracking-widest py-3">Simular Seguro Agora</Button>
            </Link>
          </div>

          <div className="p-6 rounded-[32px] bg-slate-900 text-white shadow-xl shadow-slate-900/20 space-y-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-black leading-tight">Acionar Garantia?</h4>
            <p className="text-xs font-medium text-slate-400 leading-relaxed">Use o nosso Dossiê Jurídico para facilitar seu atendimento na assistência técnica.</p>
            <Button variant="ghost" className="w-full bg-white/10 text-white font-black text-[10px] uppercase tracking-widest py-3">Gerar Dossiê do Item</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
