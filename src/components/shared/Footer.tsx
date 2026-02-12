import { Mail, Phone, MapPin, ShieldCheck, Globe } from 'lucide-react';
import Image from 'next/image';

export const Footer = () => {
  const logoUrl = "https://lh3.googleusercontent.com/gg-dl/AOI_d_9yfHBtXafzC8T3snFo7GdIXq6HQDLrt7Z5UxvjYWabsrwlj0P8aBncqzU2Ovv-1swtO5xi4N4ASTShjz3534eDjmZkVM-5XpKtkgZOgKZCfKpV3R-f4L2vd4ROx6xEZznyzv0oVwwV508ew19R7APwkVR_qqSSXJtDnNWguraFqE-xLQ=s1024-rj";

  return (
    <footer className="mt-20 border-t border-teal-100 bg-white/50 backdrop-blur-sm pt-16 pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Coluna 1: Logo e Descrição */}
          <div className="md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src={logoUrl} alt="Logo" fill className="object-cover" unoptimized />
              </div>
              <span className="text-lg font-black text-slate-900">Guardião<span className="text-emerald-600">.</span></span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              A maior plataforma de inteligência e gestão de garantias do Brasil. Protegendo seu patrimônio com tecnologia.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" /> Dados Criptografados
            </div>
          </div>

          {/* Coluna 2: Institucional */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institucional</h4>
            <ul className="space-y-2 text-sm font-bold text-slate-600">
              <li className="hover:text-emerald-600 cursor-pointer transition-colors">Termos de Uso</li>
              <li className="hover:text-emerald-600 cursor-pointer transition-colors">Privacidade</li>
              <li className="hover:text-emerald-600 cursor-pointer transition-colors">Compliance</li>
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
                    <p className="text-xs font-bold text-slate-700">suporte@guardiaonotas.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Telefone</p>
                    <p className="text-xs font-bold text-slate-700">(11) 9999-9999</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 group">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Sede</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">Av. Paulista, 1000 - 12º Andar<br />Bela Vista, São Paulo - SP</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-teal-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            © 2026 Guardião de Notas S.A. | CNPJ: 00.000.000/0001-00
          </p>
          <div className="flex gap-6 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
            <span>Brasil</span>
            <span>Global Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
