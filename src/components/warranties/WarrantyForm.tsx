'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, Save, X, Sparkles, Loader2, Store, DollarSign, NotebookPen, FolderOpen, Wrench, Key, CreditCard, Hash, Globe2, Umbrella, ShieldCheck } from 'lucide-react';
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
    insurance_policy: initialData?.insurance_policy || '',
    insurance_company: initialData?.insurance_company || '',
    insurance_expires_at: initialData?.insurance_expires_at || '',
  });
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const folders = ['Pessoal', 'Trabalho', 'Casa', 'Veículo', 'Eletrônicos', 'Outros'];

  const handleAIAnalysis = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro!');
      return;
    }
    setAnalyzing(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      };

      const base64Data = await readFileAsBase64(file);
      const prompt = `Analise esta nota fiscal ou apólice e extraia em JSON:
      {
        "product_name": "nome",
        "purchase_date": "YYYY-MM-DD",
        "price": 0.00,
        "currency": "BRL/USD/EUR",
        "store": "loja",
        "nfe_key": "44 dígitos",
        "serial_number": "S/N",
        "insurance_company": "seguradora se houver",
        "insurance_policy": "número da apólice se houver"
      }`;

      const result = await model.generateContent([{ inlineData: { data: base64Data, mimeType: file.type } }, prompt]);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

      setFormData(prev => ({ ...prev, ...data, name: data.product_name || prev.name }));
      toast.success('IA: Documento auditado com sucesso!');
    } catch (err: any) { toast.error("Erro ao processar com IA."); } finally { setAnalyzing(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

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
      toast.success('Guardião: Dados protegidos!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-2xl border-none">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Seção de Upload */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-emerald-800 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-600" /> Documentação do Patrimônio
            </h2>
            <div className="group relative border-2 border-dashed border-teal-100 rounded-3xl p-8 transition-all hover:border-emerald-400 hover:bg-emerald-50/30 flex flex-col items-center gap-4 text-center">
              <input type="file" id="file-upload" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              <p className="font-bold text-slate-700">{file ? file.name : 'Suba Nota Fiscal ou Apólice de Seguro'}</p>
              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 relative z-10">
                    <Button type="button" size="sm" onClick={handleAIAnalysis} disabled={analyzing} className="bg-emerald-600">
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {analyzing ? 'Auditando...' : 'Processar com IA'}
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => setFile(null)} className="h-10 w-10 p-0 rounded-xl"><X className="h-5 w-5" /></Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2"><div className="h-4 w-1 bg-emerald-600 rounded-full" /> Identificação e Valor</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1"><FolderOpen className="h-4 w-4 text-emerald-600" /> Pasta de Destino</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {folders.map(f => (<button key={f} type="button" onClick={() => setFormData({...formData, folder: f})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.folder === f ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{f}</button>))}
                  </div>
                </div>
                <Input label="O que você comprou?" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <Input label="Valor Pago (Moeda Original)" type="number" step="0.01" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} />
                <Input label="Data Compra" type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} required />
                <Input label="Garantia (Meses)" type="number" value={formData.warranty_months} onChange={(e) => setFormData({ ...formData, warranty_months: parseInt(e.target.value) })} required />
              </div>
            </section>

            {/* NOVO: Seção de Seguro Existente */}
            <section className="space-y-6 bg-cyan-50/30 p-8 rounded-[32px] border border-cyan-100">
              <h3 className="text-sm font-black text-cyan-800 uppercase tracking-widest flex items-center gap-2"><Umbrella className="h-4 w-4 text-cyan-600" /> Cobertura de Seguro</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <Input label="Seguradora" placeholder="Ex: Porto Seguro, Azul..." value={formData.insurance_company} onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })} />
                <Input label="Nº da Apólice" placeholder="Código do contrato" value={formData.insurance_policy} onChange={(e) => setFormData({ ...formData, insurance_policy: e.target.value })} />
                <Input label="Vencimento Seguro" type="date" value={formData.insurance_expires_at} onChange={(e) => setFormData({ ...formData, insurance_expires_at: e.target.value })} />
              </div>
              <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-tighter">Dica: O Guardião avisará 10 dias antes do seguro vencer.</p>
            </section>

            <section className="space-y-6">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2"><div className="h-4 w-1 bg-emerald-600 rounded-full" /> Dados Técnicos Extra</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Número de Série (S/N)" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />
                <Input label="Chave NF-e (44 dígitos)" value={formData.nfe_key} onChange={(e) => setFormData({ ...formData, nfe_key: e.target.value })} />
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-teal-50">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 font-bold">Cancelar</Button>
            <Button type="submit" disabled={loading} className="px-10 h-14 text-base">{loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}Salvar no Guardião</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};