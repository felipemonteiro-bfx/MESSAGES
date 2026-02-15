import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-20 border-t border-teal-100 bg-white/50 backdrop-blur-sm pt-16 pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Coluna 1: Logo e Descrição */}
          <div className="md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-black text-slate-900">Noticias<span className="text-emerald-600">24h</span></span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Portal de notícias atualizado 24 horas. Cobertura completa do Brasil e do mundo ao seu alcance.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" /> Dados Criptografados
            </div>
          </div>

          {/* Coluna 2: Institucional */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institucional</h4>
            <ul className="space-y-2 text-sm font-bold text-slate-600">
              <li><a href="/termos" className="hover:text-emerald-600 transition-colors">Termos de Uso</a></li>
              <li><a href="/privacidade" className="hover:text-emerald-600 transition-colors">Privacidade</a></li>
              <li><a href="/sobre" className="hover:text-emerald-600 transition-colors">Sobre Nós</a></li>
            </ul>
          </div>

          {/* Coluna 3: Fale Conosco */}
          <div className="md:col-span-2 space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fale Conosco</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">E-mail</p>
                    <p className="text-xs font-bold text-slate-700">contato@noticias24h.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Telefone</p>
                    <p className="text-xs font-bold text-slate-700">(11) 3000-0000</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 group">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Redação</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">São Paulo, SP - Brasil</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-teal-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            © {new Date().getFullYear()} Noticias24h. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
            <span>Brasil</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
