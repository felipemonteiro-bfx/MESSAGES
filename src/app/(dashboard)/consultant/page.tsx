'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles, Send, Loader2, Bot, User, ShieldCheck, Scale, History, RotateCcw, TrendingUp, Info } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function AIConsultantPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([
    { role: 'model', parts: [{ text: 'Olá! Sou seu Consultor de Patrimônio Guardião. Analisei seu cofre e estou pronto para te ajudar com orientações jurídicas, dicas de conservação ou estratégias de revenda. Em que posso ser útil?' }] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [warranties, setWarranties] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    const { data } = await supabase.from('warranties').select('*');
    if (data) setWarranties(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const newMessages: { role: 'user' | 'model'; parts: { text: string }[] }[] = [
      ...messages,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Contexto enriquecido com os bens do usuário
      const assetContext = warranties.map(w => `- ${w.name} (Cat: ${w.category}, Valor: R$${w.price}, Compra: ${w.purchase_date})`).join('\n');
      
      const systemPrompt = `Você é o Consultor Private do "Guardião de Notas". 
      Sua missão é ajudar o usuário a gerir seu patrimônio durável.
      Bens do usuário:\n${assetContext}\n
      Diretrizes: Seja formal mas moderno, use o CDC (Código de Defesa do Consumidor) quando necessário e dê dicas de valorização. 
      Sempre tente conectar as respostas com os bens que ele já possui.`;

      const chat = model.startChat({
        history: messages.map(m => ({ role: m.role, parts: m.parts })),
        generationConfig: { maxOutputTokens: 800 }
      });

      // Envia o prompt de sistema na primeira mensagem ou como contexto oculto (simulado aqui via prefixo)
      const result = await chat.sendMessage(`${systemPrompt}\n\nPergunta do Usuário: ${userText}`);
      const botText = result.response.text();

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: botText }] }]);
    } catch (err) {
      toast.error('Ocorreu um erro na consultoria.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', parts: [{ text: 'Canal de consultoria reiniciado. Como posso te orientar agora?' }] }]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Wealth <span className="text-emerald-600">Advisor</span></h1>
          <p className="text-slate-500 font-medium text-sm">Consultoria privada de patrimônio e direitos do consumidor.</p>
        </div>
        <Button variant="outline" onClick={clearChat} className="gap-2 border-teal-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest h-12 px-6">
          <RotateCcw className="h-4 w-4" /> Reiniciar Advisor
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar de Contexto IA */}
        <div className="lg:col-span-1 space-y-6 hidden lg:block">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-6 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              <TrendingUp className="h-4 w-4" /> Contexto do Advisor
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-slate-500 uppercase">Patrimônio Analisado</p>
                <p className="text-xl font-black">R$ {warranties.reduce((acc, curr) => acc + Number(curr.price), 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-slate-500 uppercase">Itens Monitorados</p>
                <p className="text-xl font-black">{warranties.length}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">O Advisor utiliza o CDC 2026 e algoritmos de depreciação técnica para suas respostas.</p>
          </Card>

          <div className="p-6 rounded-[32px] bg-emerald-50 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"><Info className="h-4 w-4" /> Sugestão de Pergunta</div>
            <p className="text-xs font-bold text-emerald-900 italic">"Qual dos meus itens tem a melhor liquidez para revenda hoje?"</p>
          </div>
        </div>

        {/* Interface de Chat */}
        <Card className="lg:col-span-3 h-[700px] flex flex-col shadow-2xl border-none overflow-hidden bg-white">
          <div className="p-6 border-b border-teal-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20"><Bot className="h-6 w-6" /></div>
              <div><h3 className="font-black text-slate-900 uppercase tracking-tighter">Chat de Consultoria</h3><p className="text-[9px] font-black text-emerald-600 uppercase">IA Gemini 1.5 Flash Ativa</p></div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest"><div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" /> Privado</div>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20 no-scrollbar">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-6 rounded-[32px] shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-teal-50 rounded-tl-none'}`}>
                    <div className="flex items-center gap-2 mb-3 opacity-40">
                      {msg.role === 'model' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      <span className="text-[9px] font-black uppercase tracking-widest">{msg.role === 'model' ? 'Advisor' : 'Proprietário'}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-emerald-600 text-white p-4 rounded-[24px] shadow-lg flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Processando Ativos...</span>
                </div>
              </motion.div>
            )}
          </CardContent>

          <div className="p-6 bg-white border-t border-teal-50">
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <input 
                type="text" 
                placeholder="Ex: Como proteger meu Macbook de oxidação?" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 h-16 px-8 bg-slate-50 border-2 border-teal-50 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700"
              />
              <Button type="submit" disabled={loading} className="h-16 w-16 p-0 rounded-2xl shadow-xl shadow-emerald-600/20"><Send className="h-6 w-6" /></Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
