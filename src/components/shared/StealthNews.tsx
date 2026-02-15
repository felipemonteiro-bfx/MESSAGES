'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, Share2, MoreVertical, Clock, MessageCircle, TrendingUp, Calendar, ExternalLink, Bell, Home, LogOut, X, Bookmark, User, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { createClient } from '@/lib/supabase/client';

const SAVED_NEWS_KEY = 'stealth_news_saved';
const ALERTAS_ULTIMA_HORA_KEY = 'stealth_alertas_ultima_hora';
function getAlertasUltimaHora(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(ALERTAS_ULTIMA_HORA_KEY);
  return v === null || v === 'true';
}
function saveAlertasUltimaHora(on: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTAS_ULTIMA_HORA_KEY, String(on));
}
type SavedItem = { id: string; title: string; url?: string; source: string; time: string };
function getSavedList(): SavedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_NEWS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function getSavedIds(): Set<string> {
  return new Set(getSavedList().map((s) => s.id));
}
function toggleSaved(item: { id: string; title: string; url?: string; source: string; time: string }): boolean {
  const list = getSavedList();
  const idx = list.findIndex((s) => s.id === item.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(SAVED_NEWS_KEY, JSON.stringify(list));
    return false;
  }
  list.unshift({ id: item.id, title: item.title, url: item.url, source: item.source, time: item.time });
  localStorage.setItem(SAVED_NEWS_KEY, JSON.stringify(list));
  return true;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  image: string;
  category: string;
  url?: string;
  description?: string;
}

interface StealthNewsProps {
  onUnlockRequest: () => void;
  onMessageNotification?: (message: string) => void;
}

export default function StealthNews({ onUnlockRequest, onMessageNotification }: StealthNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>('');
  const lastClickRef = useRef<number>(0);
  const [selectedCategory, setSelectedCategory] = useState('Top Stories');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [breakingNews, setBreakingNews] = useState<string[]>([]);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Top Stories', 'Brasil', 'Mundo', 'Tecnologia', 'Esportes', 'Saúde', 'Economia', 'Entretenimento', 'Política', 'Ciência'];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [articleMenuId, setArticleMenuId] = useState<string | null>(null);
  const [alertasUltimaHora, setAlertasUltimaHora] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { registerAndSubscribe, isSupported, isSubscribed } = usePushSubscription();

  useEffect(() => {
    setSavedIds(getSavedIds());
  }, [showSaved]);

  useEffect(() => {
    setAlertasUltimaHora(getAlertasUltimaHora());
  }, [menuOpen]);

  useEffect(() => {
    if (!articleMenuId) return;
    const close = () => setArticleMenuId(null);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [articleMenuId]);

  const displayedNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return news;
    return news.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.source.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }, [news, searchQuery]);

  const handleMenuClick = () => setMenuOpen(true);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSearchOpen(false);
  };

  const handleSaveArticle = (item: NewsItem) => {
    const nowSaved = toggleSaved({ id: item.id, title: item.title, url: item.url, source: item.source, time: item.time });
    setSavedIds(getSavedIds());
    setArticleMenuId(null);
    toast.success(nowSaved ? 'Notícia salva' : 'Removida dos salvos');
  };

  const handleSair = async () => {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleEnablePush = async () => {
    const { ok, message } = await registerAndSubscribe();
    if (ok) toast.success(message, { duration: 4000 });
    else toast.error(message, { duration: 5000 });
  };

  useEffect(() => {
    // Atualizar data apenas no cliente para evitar hydration mismatch
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      }));
    };
    updateDate();
    fetchNews();
    
    // Atualizar notícias a cada 5 minutos
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [selectedCategory, dateFilter]);

  // ============================================================
  // Sistema de notificação de mensagens disfarçadas como notícias
  // Mensagens não lidas aparecem como "notícias" no feed
  // O usuário reconhece pelo indicador sutil (● azul no canto)
  // Clicar na "notícia" abre o modo mensagens
  // ============================================================
  const [messageAlerts, setMessageAlerts] = useState<NewsItem[]>([]);
  const lastCheckedRef = useRef<string | null>(null);

  // Gerar notícia fake convincente a partir de uma mensagem real
  const generateFakeNewsFromMessage = useCallback((
    msgId: string,
    senderNickname: string,
    _content: string,
    count: number
  ): NewsItem => {
    // Pool de templates realistas — cada mensagem gera uma "notícia" diferente
    const templates = [
      { title: 'Governo anuncia novas medidas econômicas para o próximo trimestre', source: 'G1 Economia', category: 'Economia', desc: 'Pacote inclui ajustes fiscais e incentivos para setores estratégicos da economia nacional.' },
      { title: 'Estudo revela avanço significativo no tratamento de doenças autoimunes', source: 'BBC Saúde', category: 'Saúde', desc: 'Pesquisadores identificaram novo mecanismo que pode beneficiar milhões de pacientes.' },
      { title: 'Startup brasileira capta R$ 200 milhões em rodada de investimento', source: 'TechCrunch Brasil', category: 'Tecnologia', desc: 'Empresa de inteligência artificial atrai investidores internacionais.' },
      { title: 'Seleção brasileira convoca novos jogadores para eliminatórias', source: 'GE Esportes', category: 'Esportes', desc: 'Técnico surpreende com convocação de atletas que atuam no exterior.' },
      { title: 'ONU aprova resolução sobre mudanças climáticas com apoio recorde', source: 'Reuters', category: 'Mundo', desc: 'Acordo prevê metas mais ambiciosas para redução de emissões até 2030.' },
      { title: 'Banco Central sinaliza possível corte na taxa de juros', source: 'Valor Econômico', category: 'Economia', desc: 'Ata do Copom indica espaço para flexibilização da política monetária.' },
      { title: 'Nova descoberta científica pode revolucionar energia renovável', source: 'Nature Brasil', category: 'Ciência', desc: 'Material desenvolvido em laboratório brasileiro aumenta eficiência de painéis solares.' },
      { title: 'Festival internacional de cinema anuncia filmes brasileiros na seleção', source: 'Folha Ilustrada', category: 'Entretenimento', desc: 'Três produções nacionais competem por prêmios na mostra principal.' },
      { title: 'Congresso vota projeto de lei sobre regulamentação digital', source: 'Estadão Política', category: 'Política', desc: 'Texto define regras para plataformas e proteção de dados dos usuários.' },
      { title: 'Pesquisa aponta crescimento do mercado de trabalho no Brasil', source: 'IBGE', category: 'Economia', desc: 'Taxa de desemprego recua pelo terceiro mês consecutivo.' },
      { title: 'Nova vacina contra dengue começa a ser distribuída em capitais', source: 'CNN Brasil Saúde', category: 'Saúde', desc: 'Ministério da Saúde amplia programa de imunização para grupos prioritários.' },
      { title: 'Inteligência artificial: empresa lança assistente que entende português', source: 'TecMundo', category: 'Tecnologia', desc: 'Ferramenta promete facilitar o dia a dia de milhões de brasileiros.' },
      { title: 'Champions League: clubes definem confrontos das quartas de final', source: 'ESPN', category: 'Esportes', desc: 'Sorteio realizado nesta manhã define os próximos jogos do torneio.' },
      { title: 'Cúpula do G7 discute cooperação econômica global', source: 'AFP', category: 'Mundo', desc: 'Líderes debatem medidas para estabilizar mercados internacionais.' },
      { title: 'Telescópio James Webb captura imagem inédita de galáxia distante', source: 'Space.com', category: 'Ciência', desc: 'Descoberta pode ajudar a entender a formação do universo primitivo.' },
      { title: 'Streaming: plataforma anuncia série original gravada no Brasil', source: 'AdoroCinema', category: 'Entretenimento', desc: 'Produção conta com elenco internacional e locações em cinco estados.' },
      { title: 'STF julga ação sobre reforma administrativa', source: 'Poder360', category: 'Política', desc: 'Decisão pode impactar milhares de servidores públicos em todo o país.' },
      { title: 'Exportações brasileiras batem recorde no primeiro bimestre', source: 'Bloomberg Brasil', category: 'Economia', desc: 'Commodities agrícolas e minerais lideram crescimento das vendas externas.' },
    ];

    // Selecionar template baseado no hash do msgId (determinístico)
    const hash = msgId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0);
    const idx = Math.abs(hash) % templates.length;
    const template = templates[idx];

    // Tempo "Agora" ou "Xmin atrás" baseado em quantas mensagens
    const timeLabel = count <= 1 ? 'Agora' : `${Math.min(count * 2, 15)}min atrás`;

    return {
      id: `msg-alert-${msgId}`,
      title: template.title,
      source: template.source,
      time: timeLabel,
      image: '', // Sem imagem — aparece como notícia de texto (mais realista para breaking)
      category: template.category,
      description: template.desc,
      // Não tem url — clicar abre o modo mensagens
    };
  }, []);

  // Verificar mensagens não lidas e gerar alertas disfarçados
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<ReturnType<typeof import('@/lib/supabase/client').createClient>['channel']> | null = null;

    const initMessageCheck = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Função para verificar mensagens não lidas (endpoint leve e dedicado)
        const checkUnread = async () => {
          try {
            const response = await fetch('/api/messages/unread');
            if (!response.ok) return;
            const { unread } = await response.json();

            if (!mounted) return;

            if (unread && unread.length > 0) {
              // Gerar notícias fake para cada mensagem não lida (máx 3)
              const alerts = unread.slice(0, 3).map((msg: { id: string; content: string; senderNickname: string }, i: number) => {
                return generateFakeNewsFromMessage(msg.id, msg.senderNickname, msg.content, i);
              });
              setMessageAlerts(alerts);

              // Notificar o provider (para toast sutil) — apenas na primeira vez que detecta nova msg
              if (onMessageNotification && lastCheckedRef.current !== unread[0].id) {
                lastCheckedRef.current = unread[0].id;
                onMessageNotification(alerts[0].title);
              }
            } else {
              setMessageAlerts([]);
            }
          } catch {
            // Silenciosamente ignorar
          }
        };

        // Verificação inicial
        await checkUnread();

        // Polling a cada 20 segundos
        const interval = setInterval(checkUnread, 20000);

        // Realtime: escutar novas mensagens para notificação instantânea
        channel = supabase
          .channel('stealth-msg-alerts')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          }, (payload) => {
            const newMsg = payload.new as { id: string; sender_id: string; content: string; chat_id: string };
            if (newMsg.sender_id !== user.id) {
              // Nova mensagem recebida — verificar imediatamente
              checkUnread();
            }
          })
          .subscribe();

        return () => {
          clearInterval(interval);
          if (channel) supabase.removeChannel(channel);
        };
      } catch {
        // Silenciosamente ignorar
      }
    };

    const cleanup = initMessageCheck();
    return () => {
      mounted = false;
      cleanup?.then(fn => fn?.());
    };
  }, [onMessageNotification, generateFakeNewsFromMessage]);

  // Notificações "última hora" periódicas (respeita preferência)
  useEffect(() => {
    if (news.length === 0 || showSaved || !getAlertasUltimaHora()) return;
    const interval = setInterval(() => {
      if (!getAlertasUltimaHora()) return;
      // Usar índice baseado em timestamp para seleção determinística
      const index = Math.floor((Date.now() / 1000) % news.length);
      const item = news[index];
      if (!item) return;
      toast.info(item.title, {
        duration: 5000,
        icon: '📰',
        description: `${item.source} • ${item.time}`,
      });
    }, 45000);
    return () => clearInterval(interval);
  }, [news, showSaved]);

  // Cache de notícias
  const newsCacheRef = useRef<{ [key: string]: { news: NewsItem[], timestamp: number } }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const fetchNews = async () => {
    const cacheKey = `${selectedCategory}-${dateFilter}`;
    const cached = newsCacheRef.current[cacheKey];
    
    // Usar cache client-side se ainda válido
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setNews(cached.news);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let fetchedNews: NewsItem[] = [];

      // Buscar notícias reais via API server-side (que faz scraping de RSS feeds)
      try {
        const response = await fetch(`/api/news?category=${encodeURIComponent(selectedCategory)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.articles && data.articles.length > 0) {
            fetchedNews = data.articles.map((article: {
              id: string;
              title: string;
              source: string;
              timeAgo: string;
              image: string;
              category: string;
              url: string;
              description: string;
            }) => ({
              id: article.id,
              title: article.title,
              source: article.source,
              time: article.timeAgo,
              image: article.image,
              category: article.category,
              url: article.url,
              description: article.description,
            }));
          }
        }
      } catch (apiError) {
        console.warn('Erro ao buscar notícias da API:', apiError);
      }

      // Fallback para notícias mock se API falhar
      if (fetchedNews.length === 0) {
        fetchedNews = getMockNews(selectedCategory);
      }

      // Filtrar por data se necessário
      if (dateFilter !== 'all') {
        fetchedNews = fetchedNews.filter(item => {
          const timeMatch = item.time.match(/(\d+)(min|h|d) atrás/);
          if (!timeMatch) return true;
          const value = parseInt(timeMatch[1]);
          const unit = timeMatch[2];
          if (dateFilter === 'today') {
            return unit !== 'd' || value === 0;
          }
          if (dateFilter === 'week') {
            return unit !== 'd' || value < 7;
          }
          if (dateFilter === 'month') {
            return unit !== 'd' || value < 30;
          }
          return true;
        });
      }

      // Adicionar badge BREAKING NEWS para notícias recentes (últimas 2 horas)
      const breakingNewsIds = fetchedNews
        .filter(item => {
          const timeMatch = item.time.match(/(\d+)(min|h) atrás/);
          if (!timeMatch) return false;
          const value = parseInt(timeMatch[1]);
          const unit = timeMatch[2];
          if (unit === 'min') return value < 120;
          if (unit === 'h') return value < 2;
          return false;
        })
        .map(item => item.id)
        .slice(0, 5); // Máximo 5 breaking news
      
      // Salvar no cache client-side
      newsCacheRef.current[cacheKey] = {
        news: fetchedNews,
        timestamp: Date.now()
      };
      
      setBreakingNews(breakingNewsIds);
      setNews(fetchedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews(getMockNews(selectedCategory));
    } finally {
      setLoading(false);
    }
  };

  const getMockNews = (category: string): NewsItem[] => {
    const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=60`;
    // URLs para artigos reais (Wikipedia e fontes verificáveis) em vez de buscas no Google
    const w = (path: string) => `https://pt.wikipedia.org/wiki/${path}`;
    const baseNews: NewsItem[] = [
      { id: '1', title: 'Mercado financeiro registra alta após anúncio do governo', source: 'G1 Economia', time: '15min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: w('Mercado_financeiro'), description: 'Índices sobem com expectativa de novas medidas econômicas.' },
      { id: '2', title: 'Nova tecnologia promete revolucionar comunicação digital', source: 'TechNews Brasil', time: '1h atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: w('Comunica%C3%A7%C3%A3o_digital'), description: 'Empresas apostam em ferramentas mais seguras e rápidas.' },
      { id: '3', title: 'Seleção brasileira anuncia convocados para próximos jogos', source: 'ESPN Brasil', time: '2h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: w('Sele%C3%A7%C3%A3o_Brasileira_de_Futebol'), description: 'Técnico divulga lista de atletas para a data FIFA.' },
      { id: '4', title: 'Pesquisa revela avanços no tratamento de doenças crônicas', source: 'Folha Saúde', time: '3h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: w('Doen%C3%A7a_cr%C3%B4nica'), description: 'Estudo aponta redução de sintomas com novo protocolo.' },
      { id: '5', title: 'Festival de música reúne milhares em São Paulo', source: 'Veja Entretenimento', time: '4h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: w('Festival_de_m%C3%BAsica'), description: 'Evento acontece no fim de semana com várias atrações.' },
      { id: '6', title: 'ONU discute novas medidas para mudanças climáticas', source: 'BBC Mundo', time: '5h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('Mudan%C3%A7a_clim%C3%A1tica'), description: 'Cúpula define metas para a próxima década.' },
      { id: '7', title: 'Startup brasileira recebe investimento milionário', source: 'Exame', time: '6h atrás', image: img('1559136555-9303baea8ebd'), category: 'Tecnologia', url: w('Startup'), description: 'Rodada de investimento deve acelerar expansão.' },
      { id: '8', title: 'Novo aplicativo facilita comunicação entre usuários', source: 'TecMundo', time: '7h atrás', image: img('1512941937669-90a1b58e7e9c'), category: 'Tecnologia', url: w('Aplicativo_m%C3%B3vel'), description: 'Plataforma ganha destaque no mercado nacional.' },
      { id: '9', title: 'Congresso aprova projeto de lei sobre reforma tributária', source: 'Estadão Política', time: '2h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: w('Reforma_tribut%C3%A1ria_no_Brasil'), description: 'Texto segue para sanção presidencial.' },
      { id: '10', title: 'Eleições municipais: candidatos divulgam propostas', source: 'Folha Política', time: '4h atrás', image: img('1529107386315-e1a2ed48a620'), category: 'Política', url: w('Elei%C3%A7%C3%B5es_municipais_no_Brasil'), description: 'Campanha entra na reta final em várias cidades.' },
      { id: '11', title: 'Descoberta científica pode mudar tratamento do câncer', source: 'BBC Ciência', time: '1h atrás', image: img('1532094349884-543bc11b234d'), category: 'Ciência', url: w('C%C3%A2ncer'), description: 'Pesquisadores identificam novo mecanismo celular.' },
      { id: '12', title: 'Missão espacial coleta amostras de asteroide', source: 'G1 Ciência', time: '6h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: w('Osiris-Rex'), description: 'Material deve chegar à Terra no próximo ano.' },
      { id: '13', title: 'Dólar cai e bolsa sobe com notícias do exterior', source: 'Valor Econômico', time: '20min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: w('Ibovespa'), description: 'Mercado reage a indicadores internacionais.' },
      { id: '14', title: 'Banco Central mantém Selic estável', source: 'InfoMoney', time: '45min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: w('Taxa_Selic'), description: 'Comitê de política monetária se reúne nesta semana.' },
      { id: '15', title: 'UOL Esportes: resultado dos jogos da rodada', source: 'UOL Esportes', time: '1h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: w('Campeonato_Brasileiro_de_Futebol'), description: 'Confira placar de todos os jogos.' },
      { id: '16', title: 'Lance!: transferências do futebol brasileiro', source: 'Lance!', time: '2h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: w('Janela_de_transfer%C3%AAncias'), description: 'Clubes fecham contratações para a temporada.' },
      { id: '17', title: 'Ministério da Saúde anuncia nova campanha de vacinação', source: 'Agência Brasil', time: '30min atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: w('Vacina'), description: 'Meta é imunizar grupos prioritários.' },
      { id: '18', title: 'Hospitais recebem novos equipamentos de diagnóstico', source: 'R7 Saúde', time: '3h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: w('Equipamento_m%C3%A9dico'), description: 'Investimento em tecnologia médica.' },
      { id: '19', title: 'Netflix anuncia novas séries brasileiras', source: 'AdoroCinema', time: '1h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: w('Netflix'), description: 'Produções nacionais em destaque.' },
      { id: '20', title: 'Globo estreia nova novela no horário nobre', source: 'O Globo', time: '5h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: w('Telenovela'), description: 'Elenco e sinopse são divulgados.' },
      { id: '21', title: 'Guerra na Ucrânia: últimas atualizações', source: 'Reuters', time: '25min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('Invas%C3%A3o_Russa_da_Ucr%C3%A2nia_em_2022'), description: 'Situação no front e negociações.' },
      { id: '22', title: 'Cúpula do G20 debate economia global', source: 'AFP', time: '4h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('G20'), description: 'Líderes discutem cooperação internacional.' },
      { id: '23', title: 'El País: crise migratória na Europa', source: 'El País', time: '6h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('Crise_migrat%C3%B3ria_na_Europa'), description: 'Países buscam soluções conjuntas.' },
      { id: '24', title: 'Inteligência artificial: novas ferramentas para empresas', source: 'CNN Brasil Tech', time: '50min atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: w('Intelig%C3%AAncia_artificial'), description: 'Startups apostam em soluções com IA.' },
      { id: '25', title: 'Celulares 5G: preços caem no Brasil', source: 'TudoCelular', time: '2h atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: w('5G'), description: 'Modelos mais acessíveis chegam ao mercado.' },
      { id: '26', title: 'Senado analisa mudanças na Previdência', source: 'Gazeta do Povo', time: '3h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: w('Previd%C3%AAncia_social_no_Brasil'), description: 'Proposta deve ser votada em breve.' },
      { id: '27', title: 'Correio Braziliense: orçamento federal aprovado', source: 'Correio Braziliense', time: '5h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: w('Lei_or%C3%A7ament%C3%A1ria_anual'), description: 'Congressistas fecham acordo.' },
      { id: '28', title: 'Pesquisa com células-tronco avança no país', source: 'Revista Pesquisa Fapesp', time: '2h atrás', image: img('1532094349884-543bc11b234d'), category: 'Ciência', url: w('C%C3%A9lula-tronco'), description: 'Laboratórios brasileiros na vanguarda.' },
      { id: '29', title: 'Nature: novo estudo sobre mudanças climáticas', source: 'Nature', time: '8h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: w('Aquecimento_global'), description: 'Artigo publicado em revista internacional.' },
      { id: '30', title: 'Ibovespa fecha em alta pelo terceiro dia', source: 'Bloomberg Brasil', time: '10min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: w('Ibovespa'), description: 'Commodities e bancos puxam alta.' },
      { id: '31', title: 'Campeonato Brasileiro: tabela e jogos', source: 'GE GloboEsporte', time: '40min atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: w('Campeonato_Brasileiro_de_Futebol'), description: 'Confira a classificação atualizada.' },
      { id: '32', title: 'Olimpíadas 2028: preparação dos atletas', source: 'Olympics.com', time: '5h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: w('Jogos_Ol%C3%ADmpicos_de_Ver%C3%A3o_de_2028'), description: 'Comitês nacionais definem estratégia.' },
      { id: '33', title: 'ANS regulamenta planos de saúde', source: 'Saúde Business', time: '1h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: w('Ag%C3%AAncia_Nacional_de_Sa%C3%BAde_Suplementar'), description: 'Novas regras entram em vigor.' },
      { id: '34', title: 'Spotify lança playlist oficial da Copa', source: 'Rolling Stone Brasil', time: '2h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: w('Spotify'), description: 'Músicas para torcer.' },
      { id: '35', title: 'YouTube anuncia mudanças para criadores', source: 'TecMundo', time: '4h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: w('YouTube'), description: 'Nova política de monetização.' },
      { id: '36', title: 'CNN: tensão no Oriente Médio', source: 'CNN Internacional', time: '35min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('Conflito_Israel-Hamas'), description: 'Análise da situação regional.' },
      { id: '37', title: 'Criptomoedas: mercado reage a decisão regulatória', source: 'CoinTelegraph Brasil', time: '55min atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: w('Criptomoeda'), description: 'Autoridades definem marco legal.' },
      { id: '38', title: 'TSE divulga calendário eleitoral', source: 'Jovem Pan News', time: '1h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: w('Tribunal_Superior_Eleitoral'), description: 'Datas das próximas eleições.' },
      { id: '39', title: 'NASA confirma missão à Lua em 2026', source: 'Space.com', time: '3h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: w('Programa_Artemis'), description: 'Programa Artemis segue no cronograma.' },
      { id: '40', title: 'Terra: previsão do tempo para o fim de semana', source: 'Terra', time: '12min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: w('Previs%C3%A3o_do_tempo'), description: 'Frente fria avança pelo país.' }
    ];

    if (category === 'Top Stories') return baseNews;
    return baseNews.filter(n => {
      if (category === 'Brasil') return n.source.includes('Brasil') || n.source.includes('G1') || n.source.includes('Folha') || n.source.includes('ESPN') || n.source.includes('UOL') || n.source.includes('Globo') || n.source.includes('Gazeta') || n.source.includes('Correio') || n.source.includes('Lance') || n.source.includes('GE') || n.source.includes('Jovem Pan') || n.source.includes('Agência Brasil') || n.source.includes('R7') || n.source.includes('Estadão') || n.source.includes('Valor') || n.source.includes('InfoMoney') || n.source.includes('Exame') || n.source.includes('TecMundo') || n.source.includes('CNN Brasil') || n.source.includes('Bloomberg Brasil') || n.source.includes('Rolling Stone Brasil') || n.source.includes('CoinTelegraph Brasil');
      if (category === 'Mundo') return n.category === 'Mundo';
      return n.category === category;
    });
  };

  const getCategoryFromTitle = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('tecnologia') || lower.includes('app') || lower.includes('digital')) return 'Tecnologia';
    if (lower.includes('esporte') || lower.includes('futebol') || lower.includes('jogo')) return 'Esportes';
    if (lower.includes('saúde') || lower.includes('médico') || lower.includes('tratamento')) return 'Saúde';
    if (lower.includes('economia') || lower.includes('mercado') || lower.includes('financeiro')) return 'Economia';
    if (lower.includes('música') || lower.includes('festival') || lower.includes('show')) return 'Entretenimento';
    return 'Geral';
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return `${Math.floor(diffMins / 1440)}d atrás`;
  };

  const getDefaultImage = (): string => {
    // Usar imagem fixa para evitar hydration mismatch e 404s
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
  };

  // Proxy de imagens para evitar CORS com fontes externas
  const proxyImage = (url: string): string => {
    if (!url) return getDefaultImage();
    // Imagens do Unsplash e Supabase não precisam de proxy
    if (url.includes('unsplash.com') || url.includes('supabase.co') || url.includes('pravatar.cc')) {
      return url;
    }
    return `/api/news/image?url=${encodeURIComponent(url)}`;
  };

  // Botão oculto: "Fale Conosco" ou duplo clique na data — resposta instantânea
  const handleSecretButton = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 350) {
      lastClickRef.current = 0;
      onUnlockRequest();
      return;
    }
    lastClickRef.current = now;
  };

  // Sugestão iPhone: Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      setIsRefreshing(true);
      fetchNews().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setPullStartY(0);
      });
    } else {
      setPullDistance(0);
      setPullStartY(0);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-gray-900 font-sans pb-20 safe-area-top"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Menu lateral */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[150]"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="menu-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] md:w-[320px] max-w-[85vw] bg-white shadow-xl z-[160] flex flex-col border-r border-gray-200"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-bold text-gray-900">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-2 flex flex-col gap-1">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
                >
                  <Home className="w-5 h-5 text-gray-500" />
                  Início
                </button>
                {isSupported && (
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await handleEnablePush();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
                  >
                    <Bell className="w-5 h-5 text-gray-500" />
                    {isSubscribed ? 'Alertas ativados' : 'Receber alertas de notícias'}
                  </button>
                )}
                <button
                  onClick={() => {
                    const next = !getAlertasUltimaHora();
                    setAlertasUltimaHora(next);
                    saveAlertasUltimaHora(next);
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
                >
                  <span className="flex items-center gap-3"><span>📰</span>Alertas &quot;última hora&quot;</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getAlertasUltimaHora() ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{getAlertasUltimaHora() ? 'Ligado' : 'Desligado'}</span>
                </button>
                <button
                  onClick={handleSair}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-medium mt-auto"
                >
                  <LogOut className="w-5 h-5" />
                  Sair
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sugestão iPhone: Indicador de Pull-to-Refresh */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center bg-blue-50 text-blue-600 py-2 z-20 transition-transform"
          style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
        >
          {pullDistance > 50 ? (
            <span className="text-sm font-semibold">Solte para atualizar</span>
          ) : (
            <span className="text-sm">Puxe para atualizar</span>
          )}
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-8 py-3 shadow-sm safe-area-top">
        <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto">
          {searchOpen ? (
            <>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notícias..."
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Fechar busca">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleMenuClick} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Menu">
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 truncate">Notícias em Tempo Real</h1>
                <p className="text-[10px] text-gray-400 font-medium">Atualizado a cada 5 min • Brasil e Mundo</p>
              </div>
              <button onClick={() => setSearchOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Buscar">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <div
                className="flex items-center gap-1 text-sm text-gray-500 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors shrink-0"
                onClick={handleSecretButton}
                title="Data e Hora"
                suppressHydrationWarning
              >
                <Clock className="w-4 h-4" />
                <span className="capitalize hidden sm:inline">{currentDate}</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Botão secreto discreto (duplo clique na data é o principal) */}
      <div className="px-4 md:px-8 py-1.5 border-b border-gray-100 flex items-center justify-between gap-2 max-w-6xl mx-auto">
        <span />
        <button onClick={handleSecretButton} className="text-xs text-gray-500 hover:text-gray-700 transition-colors py-1">
          Fale Conosco
        </button>
      </div>
      <div className="px-4 md:px-8 py-2 border-b border-gray-100 max-w-6xl mx-auto">
        {isSupported && (
          <button
            type="button"
            onClick={handleEnablePush}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 font-medium text-sm border border-gray-200"
          >
            <Bell className="w-4 h-4" />
            {isSubscribed ? 'Alertas de notícias ativados' : 'Receber alertas de notícias'}
          </button>
        )}
      </div>

      {/* ===== ALERTAS DE MENSAGENS DISFARÇADOS DE NOTÍCIAS ===== */}
      {/* Aparecem como "Última Hora" no topo — clicar abre o modo mensagens */}
      {/* Indicador sutil: pequeno ● azul no canto inferior direito do card */}
      {messageAlerts.length > 0 && !showSaved && (
        <div className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-50 via-red-50 to-orange-50 border-b-2 border-red-200 max-w-6xl mx-auto animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <Zap className="w-4 h-4 text-red-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <h2 className="text-xs font-bold text-red-700 uppercase tracking-wider">Última Hora</h2>
            <span className="text-[10px] text-red-400 font-medium ml-auto">Agora</span>
          </div>
          <div className="space-y-2">
            {messageAlerts.map((alert) => (
              <div
                key={alert.id}
                className="relative flex items-start gap-3 p-3 md:p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-red-100 cursor-pointer hover:bg-red-50/80 hover:shadow-lg hover:border-red-200 transition-all duration-200 group"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlockRequest();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnlockRequest(); } }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wide animate-pulse">
                      Urgente
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">{alert.source}</span>
                    <span className="text-[10px] text-gray-400">• {alert.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-red-800 transition-colors">
                    {alert.title}
                  </h3>
                  {alert.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{alert.description}</p>
                  )}
                </div>
                {/* Indicador sutil — só o usuário sabe que significa mensagem */}
                <span className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full opacity-60" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Destaques */}
      {selectedCategory === 'Top Stories' && displayedNews.length > 0 && !showSaved && (
        <div className="px-4 md:px-8 py-4 md:py-5 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-b border-red-100 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Em Destaque</h2>
          </div>
          <div className="grid grid-cols-1 md:cols-2 gap-3">
            {displayedNews.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-3 md:p-4 bg-white rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 hover:shadow-md transition-all"
                onClick={() => {
                  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">Breaking</span>
                    <span className="text-xs text-gray-500">{item.source}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de Data */}
      {!showSaved && (
      <div className="px-4 md:px-8 py-2 border-b border-gray-100 bg-gray-50/80 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {(['today', 'week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                dateFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter === 'today' ? 'Hoje' : filter === 'week' ? 'Esta Semana' : filter === 'month' ? 'Este Mês' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Categories */}
      {!showSaved && (
      <nav className="overflow-x-auto whitespace-nowrap px-4 md:px-8 py-3 border-b border-gray-100 hide-scrollbar max-w-6xl mx-auto">
        {categories.map((cat) => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            className={`mr-6 text-sm font-medium transition-colors ${
              selectedCategory === cat 
                ? 'text-blue-600 border-b-2 border-blue-600 pb-2' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>
      )}

      {/* Main Content - Layout responsivo: mobile 1 coluna, desktop grid bonito */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24">
        {showSaved ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Notícias salvas</h2>
              <button onClick={() => setShowSaved(false)} className="text-sm text-blue-600 font-medium hover:underline">Voltar</button>
            </div>
            {getSavedList().length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Bookmark className="w-14 h-14 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Nenhuma notícia salva</p>
                <p className="text-sm mt-1">Toque em ⋮ em uma notícia e escolha &quot;Salvar&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSavedList().map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:shadow-md cursor-pointer transition-all"
                    onClick={() => s.url && window.open(s.url, '_blank')}
                  >
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.source} • {s.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="aspect-video bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-5 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {displayedNews.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg font-medium">Nenhuma notícia encontrada</p>
                <p className="text-sm mt-2">{searchQuery ? 'Tente outros termos' : 'Puxe para atualizar'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {displayedNews.map((item, index) => {
                const isSaved = savedIds.has(item.id);
                const menuOpen = articleMenuId === item.id;
                return (
                  <article key={item.id} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (articleMenuId) setArticleMenuId(null);
                        else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <div className="flex flex-col md:flex-col">
                        <div className="aspect-video md:aspect-[16/10] w-full bg-gray-100 overflow-hidden">
                          <img src={proxyImage(item.image)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = getDefaultImage(); }} />
                        </div>
                        <div className="p-4 md:p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide flex-wrap mb-2">
                            {breakingNews.includes(item.id) && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">BREAKING</span>
                            )}
                            <span>{item.category}</span>
                            <span className="text-gray-400 font-normal">• {item.source}</span>
                          </div>
                          <h2 className="text-base md:text-lg font-bold leading-snug group-hover:text-blue-600 transition-colors line-clamp-3 mb-2">{item.title}</h2>
                          {item.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>}
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                            <span className="text-xs text-gray-500">{item.time}</span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                </a>
                              )}
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.share && item.url) {
                                    navigator.share({ title: item.title, text: item.description || item.title, url: item.url }).catch(() => {});
                                  }
                                }}
                              >
                                <Share2 className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArticleMenuId(menuOpen ? null : item.id);
                                }}
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                {menuOpen && (
                                  <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg mx-1"
                                      onClick={(e) => { e.stopPropagation(); if (item.url) window.open(item.url, '_blank'); setArticleMenuId(null); }}
                                    >
                                      <ExternalLink className="w-4 h-4" /> Abrir em nova aba
                                    </button>
                                    <button
                                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg mx-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (navigator.share && item.url) navigator.share({ title: item.title, url: item.url }).catch(() => {});
                                        setArticleMenuId(null);
                                      }}
                                    >
                                      <Share2 className="w-4 h-4" /> Compartilhar
                                    </button>
                                    <button
                                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg mx-1"
                                      onClick={(e) => { e.stopPropagation(); handleSaveArticle(item); }}
                                    >
                                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}`} /> {isSaved ? 'Remover dos salvos' : 'Salvar'}
                                    </button>
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            }
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Nav - 100% funcional */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 md:px-8 py-2 flex justify-around md:justify-center md:gap-12 lg:gap-16 items-center text-xs font-medium text-gray-500 safe-area-inset-bottom z-30 max-w-6xl mx-auto">
        <button onClick={scrollToTop} className="flex flex-col items-center gap-1 text-blue-600 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Home className="w-4 h-4 text-blue-600" />
          </div>
          <span>Início</span>
        </button>
        <button onClick={() => { setShowSaved(false); setSearchOpen(true); searchInputRef.current?.focus(); }} className="flex flex-col items-center gap-1 hover:text-gray-900 transition-colors">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-4 h-4 text-gray-600" />
          </div>
          <span>Buscar</span>
        </button>
        <button onClick={() => { setSearchOpen(false); setShowSaved(true); setSavedIds(getSavedIds()); }} className="flex flex-col items-center gap-1 hover:text-gray-900 transition-colors relative">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-gray-600" />
          </div>
          <span>Salvos</span>
          {getSavedList().length > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {getSavedList().length}
            </span>
          )}
        </button>
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 hover:text-gray-900 transition-colors relative">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <span>Perfil</span>
        </button>
      </nav>
    </div>
  );
}

