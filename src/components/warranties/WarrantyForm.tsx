'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, Save, X, Sparkles, Loader2, Store, DollarSign, NotebookPen, FolderOpen, Wrench, Key, CreditCard, Hash, Globe2, FileSearch } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface WarrantyFormProps {
  initialData?: any;
}

export const WarrantyForm = ({ initialData }: WarrantyFormProps) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || '',
    purchase_date: initialData?.purchase_date || new Date().toISOString().split('T')[0],
    warranty_months: initialData?.warranty_months || 12,
    price: initialData?.price || '',
    currency: initialData?.currency || 'BRL',
    original_price: initialData?.original_price || '',
    store: initialData?.store || '',
    notes: initialData?.notes || '',
    folder: initialData?.folder || 'Pessoal',
    care_tips: initialData?.care_tips || '',
    maintenance_frequency_months: initialData?.maintenance_frequency_months || 6,
    last_maintenance_date: initialData?.last_maintenance_date || '',
    nfe_key: initialData?.nfe_key || '',
    total_installments: initialData?.total_installments || 1,
    paid_installments: initialData?.paid_installments || 1,
    installment_value: initialData?.installment_value || '',
    serial_number: initialData?.serial_number || '',
    card_brand: initialData?.card_brand || '',
  });
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAIAnalysis = async () => {
    if (!file) {
      toast.error('Selecione uma imagem da nota fiscal!');
      return;
    }
    setAnalyzing(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave Gemini não encontrada nas variáveis de ambiente.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64Data = await readFileAsBase64(file);
      
      const prompt = `Você é um especialista em documentos fiscais brasileiros. 
      Analise esta imagem de nota fiscal ou cupom fiscal e extraia exatamente os seguintes campos em formato JSON puro (sem markdown):
      {
        "product_name": "Nome principal do produto comprado",
        "purchase_date": "Data da compra em formato YYYY-MM-DD",
        "price": valor numérico total (ex: 1500.50),
        "store": "Nome da loja ou Razão Social",
        "card_brand": "Identifique se foi Visa, Mastercard, Elo e o nível (Gold, Platinum, Black) se estiver escrito",
        "nfe_key": "Chave de acesso de 44 dígitos (remova espaços)",
        "serial_number": "Número de série se estiver visível"
      }
      Se não encontrar algum campo, deixe vazio. Retorne apenas o JSON.`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        },
        prompt
      ]);

      const responseText = result.response.text().replace(/```json|```/g, '').trim();
      const extractedData = JSON.parse(responseText);

      setFormData(prev => ({
        ...prev,
        name: extractedData.product_name || prev.name,
        purchase_date: extractedData.purchase_date || prev.purchase_date,
        price: extractedData.price || prev.price,
        store: extractedData.store || prev.store,
        card_brand: extractedData.card_brand || prev.card_brand,
        nfe_key: extractedData.nfe_key || prev.nfe_key,
        serial_number: extractedData.serial_number || prev.serial_number
      }));

      toast.success('Nota analisada com sucesso pela IA!');
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao ler a nota. Verifique se a imagem está nítida.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      let invoice_url = initialData?.invoice_url || null;
      if (file) {
        const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('invoices').upload(filePath, file);
        invoice_url = supabase.storage.from('invoices').getPublicUrl(filePath).data.publicUrl;
      }
      const { error } = initialData?.id 
        ? await supabase.from('warranties').update({ ...formData, invoice_url }).eq('id', initialData.id)
        : await supabase.from('warranties').insert({ ...formData, user_id: user.id, invoice_url });
      if (error) throw error;
      toast.success('Nota salva com sucesso!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-2xl border-none bg-white dark:bg-slate-900">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-600" /> Upload de Documento</h2>
            <div className="group relative border-2 border-dashed border-teal-100 dark:border-white/5 rounded-3xl p-10 transition-all hover:border-emerald-400 hover:bg-emerald-50/30 flex flex-col items-center gap-4 text-center">
              <input type="file" id="file-upload" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="h-20 w-20 rounded-2xl bg-teal-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><Upload className="h-10 w-10" /></div>
              <div className="space-y-1">
                <p className="font-black text-slate-700 dark:text-slate-200">{file ? file.name : 'Clique ou arraste a nota fiscal'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suporta JPG, PNG e PDF</p>
              </div>
              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 relative z-30">
                    <Button type="button" size="sm" onClick={handleAIAnalysis} disabled={analyzing} className="bg-emerald-600 shadow-xl shadow-emerald-500/20">
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {analyzing ? 'IA Analisando...' : 'Processar com IA'}
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="h-10 w-10 p-0 rounded-xl"><X className="h-5 w-5" /></Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2"><div className="h-4 w-1 bg-emerald-600 rounded-full" /> Dados Automatizados</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Nome do Ativo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Loja" value={formData.store} onChange={(e) => setFormData({ ...formData, store: e.target.value })} />
                  <Input label="Valor (R$)" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1"><CreditCard className="h-4 w-4 text-emerald-600" /> Cartão Utilizado</label>
                  <Input placeholder="Extraído pela IA" value={formData.card_brand} onChange={(e) => setFormData({ ...formData, card_brand: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Data Compra" type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} required />
                  <Input label="Garantia (Meses)" type="number" value={formData.warranty_months} onChange={(e) => setFormData({ ...formData, warranty_months: parseInt(e.target.value) })} required />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2"><div className="h-4 w-1 bg-emerald-600 rounded-full" /> Identificação Técnica</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Número de Série (S/N)" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />
                <Input label="Chave NF-e (44 dígitos)" value={formData.nfe_key} onChange={(e) => setFormData({ ...formData, nfe_key: e.target.value })} />
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-teal-50 dark:border-white/5">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 font-bold">Cancelar</Button>
            <Button type="submit" disabled={loading} className="px-10 h-14 text-base shadow-xl shadow-emerald-500/20">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              Finalizar Registro
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};