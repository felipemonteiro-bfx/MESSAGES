'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, Save, X, Sparkles, Loader2, Store, DollarSign, NotebookPen, FolderOpen, Wrench, Key, CreditCard, Hash, Globe2 } from 'lucide-react';
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
  });
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const folders = ['Pessoal', 'Trabalho', 'Casa', 'Veículo', 'Eletrônicos', 'Outros'];
  const currencies = [
    { code: 'BRL', symbol: 'R$', label: 'Real' },
    { code: 'USD', symbol: 'US$', label: 'Dólar' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
  ];

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
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64Data = await readFileAsBase64(file);
      const prompt = `Analise esta nota fiscal e extraia em JSON:
      {
        "product_name": "nome",
        "purchase_date": "YYYY-MM-DD",
        "category": "categoria",
        "warranty_months": 12,
        "price": 0.00,
        "currency": "BRL ou USD ou EUR",
        "store": "loja",
        "nfe_key": "44 dígitos",
        "serial_number": "Número de série"
      }`;

      const result = await model.generateContent([{ inlineData: { data: base64Data, mimeType: file.type } }, prompt]);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

      setFormData(prev => ({
        ...prev,
        ...data,
        name: data.product_name || prev.name,
        original_price: data.price || prev.original_price,
        // Se for USD ou EUR, no app real buscaríamos taxa de câmbio. Aqui simularemos BRL = USD * 5
        price: data.currency === 'BRL' ? data.price : data.price * 5.2,
      }));

      toast.success('IA: Dados globais processados!');
    } catch (err: any) {
      toast.error("Erro ao processar com IA.");
    } finally {
      setAnalyzing(false);
    }
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

      const payload = { ...formData, invoice_url };
      const { error } = initialData?.id 
        ? await supabase.from('warranties').update(payload).eq('id', initialData.id)
        : await supabase.from('warranties').insert({ ...payload, user_id: user.id });

      if (error) throw error;
      toast.success('Guardião: Nota salva!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-2xl border-none">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-emerald-800 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-600" /> Documentação Global
            </h2>
            <div className="group relative border-2 border-dashed border-teal-100 rounded-3xl p-8 transition-all hover:border-emerald-400 hover:bg-emerald-50/30 flex flex-col items-center gap-4 text-center">
              <input type="file" id="file-upload" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              <div><p className="font-bold text-slate-700">{file ? file.name : 'Clique para subir Nota Brasileira ou Estrangeira'}</p></div>
              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 relative z-10">
                    <Button type="button" size="sm" onClick={handleAIAnalysis} disabled={analyzing} className="bg-emerald-600">
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Processar com IA
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => setFile(null)} className="h-10 w-10 p-0 rounded-xl"><X className="h-5 w-5" /></Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-lg font-black text-emerald-800 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-600" /> Valorização e Moeda</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1"><Globe2 className="h-4 w-4 text-emerald-600" /> Moeda de Compra</label>
                <div className="flex gap-2">
                  {currencies.map(curr => (
                    <button key={curr.code} type="button" onClick={() => setFormData({...formData, currency: curr.code})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${formData.currency === curr.code ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-white text-slate-400 border-slate-50 hover:bg-slate-50'}`}>{curr.symbol} {curr.code}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1"><DollarSign className="h-4 w-4 text-emerald-600" /> Preço Original ({formData.currency})</label>
                <Input type="number" step="0.01" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1"><Calculator className="h-4 w-4 text-emerald-600" /> Valor Convertido para Patrimônio (R$)</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Valor final em Real para o dashboard" />
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Este valor será usado no seu Score de Proteção e Balanço Financeiro.</p>
              </div>
            </div>

            <h2 className="text-lg font-black text-emerald-800 flex items-center gap-2 pt-4"><div className="h-2 w-2 rounded-full bg-emerald-600" /> Dados Técnicos</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Input label="Nome do Produto" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Data Compra" type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} required />
                <Input label="Garantia (Meses)" type="number" value={formData.warranty_months} onChange={(e) => setFormData({ ...formData, warranty_months: parseInt(e.target.value) })} required />
              </div>
              <Input label="Número de Série (S/N)" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />
              <Input label="Chave NF-e" value={formData.nfe_key} onChange={(e) => setFormData({ ...formData, nfe_key: e.target.value })} />
            </div>
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
