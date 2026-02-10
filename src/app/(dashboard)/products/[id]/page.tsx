'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Image as ImageIcon, X, Upload } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
    const { data: warrantyData } = await supabase.from('warranties').select('*').eq('id', id).single();
    if (!warrantyData) return setWarranty(null);
    setWarranty(warrantyData);
    
    const { data: logData } = await supabase.from('maintenance_logs').select('*').eq('warranty_id', id).order('date', { ascending: false });
    setLogs(logData || []);

    const { data: photoData } = await supabase.from('asset_photos').select('*').eq('warranty_id', id).order('captured_at', { ascending: false });
    setPhotos(photoData || []);
    
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile?.is_premium && photos.length >= 2) {
      toast.error('Galeria estendida é um recurso Pro!');
      return;
    }

    setUploadingPhoto(true);
    try {
      const filePath = `audits/${id}/${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, file);
      if (uploadError) throw uploadError;

      const photo_url = supabase.storage.from('invoices').getPublicUrl(filePath).data.publicUrl;
      const { error: dbError } = await supabase.from('asset_photos').insert({
        warranty_id: id,
        photo_url,
        label: 'Vistoria Digital'
      });

      if (dbError) throw dbError;
      toast.success('Foto de auditoria salva!');
      fetchData();
    } catch (err) {
      toast.error('Erro ao subir foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold">Editar Ativo</Button></Link>
        </div>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100 shadow-sm">Auditado</div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Módulo de Vistoria Digital (Galeria) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="h-1.5 w-full bg-emerald-500" />
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                  <Camera className="h-5 w-5 text-emerald-600" /> Vistoria Digital 360º
                </CardTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prova visual de estado e conservação</p>
              </div>
              <div className="relative">
                <input type="file" id="audit-upload" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                <Button size="sm" disabled={uploadingPhoto} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Nova Foto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {photos.length === 0 ? (
                <div className="py-12 text-center space-y-4 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                  <ImageIcon className="h-12 w-12 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Registre fotos do produto hoje para provar seu bom estado em caso de sinistro ou venda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <motion.div key={photo.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group relative aspect-square rounded-[24px] overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-md">
                      <img src={photo.photo_url} alt="Audit" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button className="p-2 bg-white rounded-full text-slate-900 shadow-xl"><ExternalLink className="h-4 w-4" /></button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-xl backdrop-blur-sm border border-white/20">
                        <p className="text-[8px] font-black text-slate-900 dark:text-white uppercase text-center leading-none">Visto em {new Date(photo.captured_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico Consolidado</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor Real Hoje</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
            <p className="text-[9px] text-emerald-500 mt-4 italic flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Auditado pelo Guardião</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento de autenticidade para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}