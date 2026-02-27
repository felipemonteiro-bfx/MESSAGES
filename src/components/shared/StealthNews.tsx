'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, Share2, MoreVertical, Clock, MessageCircle, TrendingUp, Calendar, ExternalLink, Bell, Home, LogOut, X, Bookmark, User, ArrowLeft, Copy, Link2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { createClient } from '@/lib/supabase/client';
import { NewsCardSkeleton } from '@/components/ui/Skeleton';
import { getImageByCategory, getImageForArticle, getCategoryImage, CATEGORY_COLORS } from '@/lib/news-images';
import { useStealthOnboarding, DateHint } from '@/components/shared/StealthOnboarding';

const SAVED_NEWS_KEY = 'n24h_saved_articles';
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
}

export default function StealthNews({ onUnlockRequest }: StealthNewsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>('');
  const lastClickRef = useRef<number>(0);
  const [selectedCategory, setSelectedCategoryState] = useState(() => {
    if (typeof window === 'undefined') return 'Top Stories';
    return localStorage.getItem('n24h_selected_category') || 'Top Stories';
  });
  const [dateFilter, setDateFilterState] = useState<'today' | 'week' | 'month' | 'all'>(() => {
    if (typeof window === 'undefined') return 'today';
    const v = localStorage.getItem('n24h_date_filter');
    return (v === 'today' || v === 'week' || v === 'month' || v === 'all') ? v : 'today';
  });
  const [breakingNews, setBreakingNews] = useState<string[]>([]);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setSelectedCategory = useCallback((cat: string) => {
    setSelectedCategoryState(cat);
    try { localStorage.setItem('n24h_selected_category', cat); } catch {}
  }, []);
  const setDateFilter = useCallback((f: 'today' | 'week' | 'month' | 'all') => {
    setDateFilterState(f);
    try { localStorage.setItem('n24h_date_filter', f); } catch {}
  }, []);

  const categories = ['Top Stories', 'Amazonas', 'Brasil', 'Mundo', 'Tecnologia', 'Esportes', 'Saúde', 'Economia', 'Entretenimento', 'Política', 'Ciência'];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [articleMenuId, setArticleMenuId] = useState<string | null>(null);
  const [readingArticle, setReadingArticle] = useState<NewsItem | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [sharePopup, setSharePopup] = useState<{ title: string; url: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { registerAndSubscribe, isSupported, isSubscribed } = usePushSubscription();
  const { showHint, dismiss: dismissHint } = useStealthOnboarding();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setSavedIds(getSavedIds());
  }, [showSaved]);

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
            } else {
              setMessageAlerts([]);
            }
          } catch {
            // Silenciosamente ignorar
          }
        };

        // Verificação inicial
        await checkUnread();

        // Buscar chatIds do usuário para filtrar o canal realtime
        let userChatIds: Set<string> = new Set();
        try {
          const chatsRes = await fetch('/api/chats?mode=main');
          if (chatsRes.ok) {
            const { chats } = await chatsRes.json();
            if (chats) {
              userChatIds = new Set(chats.map((c: { id: string }) => c.id));
            }
          }
        } catch {
          // Continuar sem filtro se falhar
        }

        // Polling a cada 60s como fallback (realtime é o primário)
        const interval = setInterval(checkUnread, 60000);

        const setupStealthChannel = () => {
          const ch = supabase
            .channel('stealth-msg-alerts')
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }, (payload: any) => {
              const newMsg = payload.new as { id: string; sender_id: string; content: string; chat_id: string };
              if (newMsg.sender_id !== user.id && (userChatIds.size === 0 || userChatIds.has(newMsg.chat_id))) {
                checkUnread();
              }
            })
            .subscribe((status: string) => {
              if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                if (!mounted) return;
                setTimeout(() => {
                  if (!mounted) return;
                  if (channel) supabase.removeChannel(channel);
                  channel = setupStealthChannel();
                }, 5000);
              }
            });
          return ch;
        };

        channel = setupStealthChannel();

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
  }, [generateFakeNewsFromMessage]);


  // Cache de notícias
  const newsCacheRef = useRef<{ [key: string]: { news: NewsItem[], timestamp: number } }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const fetchNews = async () => {
    const cacheKey = `${selectedCategory}-${dateFilter}`;
    const cached = newsCacheRef.current[cacheKey];
    const STALE_AGE = 15 * 60 * 1000; // 15 min = considerar obsoleto

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setNews(cached.news);
      setLoading(false);
      return;
    }
    // Stale-while-revalidate: mostrar cache antigo imediatamente (melhor UX)
    if (cached && cached.news.length > 0 && Date.now() - cached.timestamp < STALE_AGE) {
      setNews(cached.news);
      setLoading(false);
    } else {
      setLoading(true);
    }
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
    const imgFor = (id: string, title?: string, cat?: string) =>
      title && cat ? getImageForArticle({ id, title, category: cat }) : getImageByCategory(id);
    const w = (path: string) => `https://pt.wikipedia.org/wiki/${path}`;
    const baseNews: NewsItem[] = [
      { id: '1', title: 'Mercado financeiro registra alta após anúncio do governo', source: 'G1 Economia', time: '15min atrás', image: imgFor('1', 'Mercado financeiro', 'Economia'), category: 'Economia', url: w('Mercado_financeiro'), description: 'Índices sobem com expectativa de novas medidas econômicas.' },
      { id: '2', title: 'Nova tecnologia promete revolucionar comunicação digital', source: 'TechNews Brasil', time: '1h atrás', image: imgFor('2', 'Nova tecnologia', 'Tecnologia'), category: 'Tecnologia', url: w('Comunica%C3%A7%C3%A3o_digital'), description: 'Empresas apostam em ferramentas mais seguras e rápidas.' },
      { id: '3', title: 'Seleção brasileira anuncia convocados para próximos jogos', source: 'ESPN Brasil', time: '2h atrás', image: imgFor('3', 'Seleção brasileira', 'Esportes'), category: 'Esportes', url: w('Sele%C3%A7%C3%A3o_Brasileira_de_Futebol'), description: 'Técnico divulga lista de atletas para a data FIFA.' },
      { id: '4', title: 'Pesquisa revela avanços no tratamento de doenças crônicas', source: 'Folha Saúde', time: '3h atrás', image: imgFor('4', 'Pesquisa saúde', 'Saúde'), category: 'Saúde', url: w('Doen%C3%A7a_cr%C3%B4nica'), description: 'Estudo aponta redução de sintomas com novo protocolo.' },
      { id: '5', title: 'Festival de música reúne milhares em São Paulo', source: 'Veja Entretenimento', time: '4h atrás', image: imgFor('5', 'Festival música', 'Entretenimento'), category: 'Entretenimento', url: w('Festival_de_m%C3%BAsica'), description: 'Evento acontece no fim de semana com várias atrações.' },
      { id: '6', title: 'ONU discute novas medidas para mudanças climáticas', source: 'BBC Mundo', time: '5h atrás', image: imgFor('6', 'ONU clima', 'Mundo'), category: 'Mundo', url: w('Mudan%C3%A7a_clim%C3%A1tica'), description: 'Cúpula define metas para a próxima década.' },
      { id: '7', title: 'Startup brasileira recebe investimento milionário', source: 'Exame', time: '6h atrás', image: imgFor('Tecnologia'), category: 'Tecnologia', url: w('Startup'), description: 'Rodada de investimento deve acelerar expansão.' },
      { id: '8', title: 'Novo aplicativo facilita comunicação entre usuários', source: 'TecMundo', time: '7h atrás', image: imgFor('Tecnologia'), category: 'Tecnologia', url: w('Aplicativo_m%C3%B3vel'), description: 'Plataforma ganha destaque no mercado nacional.' },
      { id: '9', title: 'Congresso aprova projeto de lei sobre reforma tributária', source: 'Estadão Política', time: '2h atrás', image: imgFor('Política'), category: 'Política', url: w('Reforma_tribut%C3%A1ria_no_Brasil'), description: 'Texto segue para sanção presidencial.' },
      { id: '10', title: 'Eleições municipais: candidatos divulgam propostas', source: 'Folha Política', time: '4h atrás', image: imgFor('Política'), category: 'Política', url: w('Elei%C3%A7%C3%B5es_municipais_no_Brasil'), description: 'Campanha entra na reta final em várias cidades.' },
      { id: '11', title: 'Descoberta científica pode mudar tratamento do câncer', source: 'BBC Ciência', time: '1h atrás', image: imgFor('Ciência'), category: 'Ciência', url: w('C%C3%A2ncer'), description: 'Pesquisadores identificam novo mecanismo celular.' },
      { id: '12', title: 'Missão espacial coleta amostras de asteroide', source: 'G1 Ciência', time: '6h atrás', image: imgFor('Ciência'), category: 'Ciência', url: w('Osiris-Rex'), description: 'Material deve chegar à Terra no próximo ano.' },
      { id: '13', title: 'Dólar cai e bolsa sobe com notícias do exterior', source: 'Valor Econômico', time: '20min atrás', image: imgFor('Economia'), category: 'Economia', url: w('Ibovespa'), description: 'Mercado reage a indicadores internacionais.' },
      { id: '14', title: 'Banco Central mantém Selic estável', source: 'InfoMoney', time: '45min atrás', image: imgFor('Economia'), category: 'Economia', url: w('Taxa_Selic'), description: 'Comitê de política monetária se reúne nesta semana.' },
      { id: '15', title: 'UOL Esportes: resultado dos jogos da rodada', source: 'UOL Esportes', time: '1h atrás', image: imgFor('Esportes'), category: 'Esportes', url: w('Campeonato_Brasileiro_de_Futebol'), description: 'Confira placar de todos os jogos.' },
      { id: '16', title: 'Lance!: transferências do futebol brasileiro', source: 'Lance!', time: '2h atrás', image: imgFor('Esportes'), category: 'Esportes', url: w('Janela_de_transfer%C3%AAncias'), description: 'Clubes fecham contratações para a temporada.' },
      { id: '17', title: 'Ministério da Saúde anuncia nova campanha de vacinação', source: 'Agência Brasil', time: '30min atrás', image: imgFor('Saúde'), category: 'Saúde', url: w('Vacina'), description: 'Meta é imunizar grupos prioritários.' },
      { id: '18', title: 'Hospitais recebem novos equipamentos de diagnóstico', source: 'R7 Saúde', time: '3h atrás', image: imgFor('Saúde'), category: 'Saúde', url: w('Equipamento_m%C3%A9dico'), description: 'Investimento em tecnologia médica.' },
      { id: '19', title: 'Netflix anuncia novas séries brasileiras', source: 'AdoroCinema', time: '1h atrás', image: imgFor('Entretenimento'), category: 'Entretenimento', url: w('Netflix'), description: 'Produções nacionais em destaque.' },
      { id: '20', title: 'Globo estreia nova novela no horário nobre', source: 'O Globo', time: '5h atrás', image: imgFor('Entretenimento'), category: 'Entretenimento', url: w('Telenovela'), description: 'Elenco e sinopse são divulgados.' },
      { id: '21', title: 'Guerra na Ucrânia: últimas atualizações', source: 'Reuters', time: '25min atrás', image: imgFor('21', 'Guerra Ucrânia', 'Mundo'), category: 'Mundo', url: w('Invas%C3%A3o_Russa_da_Ucr%C3%A2nia_em_2022'), description: 'Situação no front e negociações.' },
      { id: '22', title: 'Cúpula do G20 debate economia global', source: 'AFP', time: '4h atrás', image: imgFor('22', 'G20 economia', 'Mundo'), category: 'Mundo', url: w('G20'), description: 'Líderes discutem cooperação internacional.' },
      { id: '23', title: 'El País: crise migratória na Europa', source: 'El País', time: '6h atrás', image: imgFor('23', 'Crise migratória', 'Mundo'), category: 'Mundo', url: w('Crise_migrat%C3%B3ria_na_Europa'), description: 'Países buscam soluções conjuntas.' },
      { id: '24', title: 'Inteligência artificial: novas ferramentas para empresas', source: 'CNN Brasil Tech', time: '50min atrás', image: imgFor('Tecnologia'), category: 'Tecnologia', url: w('Intelig%C3%AAncia_artificial'), description: 'Startups apostam em soluções com IA.' },
      { id: '25', title: 'Celulares 5G: preços caem no Brasil', source: 'TudoCelular', time: '2h atrás', image: imgFor('Tecnologia'), category: 'Tecnologia', url: w('5G'), description: 'Modelos mais acessíveis chegam ao mercado.' },
      { id: '26', title: 'Senado analisa mudanças na Previdência', source: 'Gazeta do Povo', time: '3h atrás', image: imgFor('Política'), category: 'Política', url: w('Previd%C3%AAncia_social_no_Brasil'), description: 'Proposta deve ser votada em breve.' },
      { id: '27', title: 'Correio Braziliense: orçamento federal aprovado', source: 'Correio Braziliense', time: '5h atrás', image: imgFor('Política'), category: 'Política', url: w('Lei_or%C3%A7ament%C3%A1ria_anual'), description: 'Congressistas fecham acordo.' },
      { id: '28', title: 'Pesquisa com células-tronco avança no país', source: 'Revista Pesquisa Fapesp', time: '2h atrás', image: imgFor('Ciência'), category: 'Ciência', url: w('C%C3%A9lula-tronco'), description: 'Laboratórios brasileiros na vanguarda.' },
      { id: '29', title: 'Nature: novo estudo sobre mudanças climáticas', source: 'Nature', time: '8h atrás', image: imgFor('Ciência'), category: 'Ciência', url: w('Aquecimento_global'), description: 'Artigo publicado em revista internacional.' },
      { id: '30', title: 'Ibovespa fecha em alta pelo terceiro dia', source: 'Bloomberg Brasil', time: '10min atrás', image: imgFor('Economia'), category: 'Economia', url: w('Ibovespa'), description: 'Commodities e bancos puxam alta.' },
      { id: '31', title: 'Campeonato Brasileiro: tabela e jogos', source: 'GE GloboEsporte', time: '40min atrás', image: imgFor('Esportes'), category: 'Esportes', url: w('Campeonato_Brasileiro_de_Futebol'), description: 'Confira a classificação atualizada.' },
      { id: '32', title: 'Olimpíadas 2028: preparação dos atletas', source: 'Olympics.com', time: '5h atrás', image: imgFor('Esportes'), category: 'Esportes', url: w('Jogos_Ol%C3%ADmpicos_de_Ver%C3%A3o_de_2028'), description: 'Comitês nacionais definem estratégia.' },
      { id: '33', title: 'ANS regulamenta planos de saúde', source: 'Saúde Business', time: '1h atrás', image: imgFor('Saúde'), category: 'Saúde', url: w('Ag%C3%AAncia_Nacional_de_Sa%C3%BAde_Suplementar'), description: 'Novas regras entram em vigor.' },
      { id: '34', title: 'Spotify lança playlist oficial da Copa', source: 'Rolling Stone Brasil', time: '2h atrás', image: imgFor('Entretenimento'), category: 'Entretenimento', url: w('Spotify'), description: 'Músicas para torcer.' },
      { id: '35', title: 'YouTube anuncia mudanças para criadores', source: 'TecMundo', time: '4h atrás', image: imgFor('Entretenimento'), category: 'Entretenimento', url: w('YouTube'), description: 'Nova política de monetização.' },
      { id: '36', title: 'CNN: tensão no Oriente Médio', source: 'CNN Internacional', time: '35min atrás', image: imgFor('36', 'CNN Oriente Médio', 'Mundo'), category: 'Mundo', url: w('Conflito_Israel-Hamas'), description: 'Análise da situação regional.' },
      { id: '37', title: 'Criptomoedas: mercado reage a decisão regulatória', source: 'CoinTelegraph Brasil', time: '55min atrás', image: imgFor('Tecnologia'), category: 'Tecnologia', url: w('Criptomoeda'), description: 'Autoridades definem marco legal.' },
      { id: '38', title: 'TSE divulga calendário eleitoral', source: 'Jovem Pan News', time: '1h atrás', image: imgFor('Política'), category: 'Política', url: w('Tribunal_Superior_Eleitoral'), description: 'Datas das próximas eleições.' },
      { id: '39', title: 'NASA confirma missão à Lua em 2026', source: 'Space.com', time: '3h atrás', image: imgFor('Ciência'), category: 'Ciência', url: w('Programa_Artemis'), description: 'Programa Artemis segue no cronograma.' },
      { id: '40', title: 'Terra: previsão do tempo para o fim de semana', source: 'Terra', time: '12min atrás', image: imgFor('40', 'Previsão tempo', 'Mundo'), category: 'Mundo', url: w('Previs%C3%A3o_do_tempo'), description: 'Frente fria avança pelo país.' },
      { id: '41', title: 'Nível do Rio Negro sobe e preocupa moradores da zona ribeirinha de Manaus', source: 'G1 Amazonas', time: '20min atrás', image: imgFor('41', 'Rio Negro Manaus', 'Amazonas'), category: 'Amazonas', url: w('Rio_Negro_(Amazonas)'), description: 'Defesa Civil monitora áreas de risco em Manaus.' },
      { id: '42', title: 'Zona Franca de Manaus recebe novos investimentos em tecnologia', source: 'Portal Em Tempo', time: '1h atrás', image: imgFor('42', 'Zona Franca Manaus', 'Amazonas'), category: 'Amazonas', url: w('Zona_Franca_de_Manaus'), description: 'Empresas do PIM ampliam produção no polo industrial.' },
      { id: '43', title: 'Festival de Parintins terá novidades para próxima edição', source: 'Amazonas1', time: '2h atrás', image: imgFor('43', 'Festival Parintins', 'Amazonas'), category: 'Amazonas', url: w('Festival_Folcl%C3%B3rico_de_Parintins'), description: 'Organização promete estrutura ampliada para o Bumbódromo.' },
      { id: '44', title: 'Operação apreende embarcação com carga ilegal no Rio Solimões', source: 'Portal do Holanda', time: '3h atrás', image: imgFor('44', 'Rio Solimões operação', 'Amazonas'), category: 'Amazonas', url: w('Rio_Solim%C3%B5es'), description: 'Base Arpão intercepta transporte irregular no interior do Amazonas.' },
      { id: '45', title: 'Prefeitura de Manaus anuncia obras de infraestrutura na Zona Norte', source: 'G1 Amazonas', time: '4h atrás', image: imgFor('45', 'Manaus infraestrutura', 'Amazonas'), category: 'Amazonas', url: w('Manaus'), description: 'Investimentos em pavimentação e drenagem nos bairros.' },
      { id: '46', title: 'Pesquisadores do INPA descobrem nova espécie de planta na Amazônia', source: 'Portal Em Tempo', time: '5h atrás', image: imgFor('46', 'INPA Amazônia', 'Amazonas'), category: 'Amazonas', url: w('Instituto_Nacional_de_Pesquisas_da_Amaz%C3%B4nia'), description: 'Espécie foi encontrada em reserva florestal no interior do estado.' },
    ];

    if (category === 'Top Stories') return baseNews;
    return baseNews.filter(n => {
      if (category === 'Amazonas') return n.category === 'Amazonas';
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

  const getDefaultImage = (category?: string): string => getCategoryImage(category);

  // Usar SVG data URI como fonte primária (funciona offline, sem CORS)
  // Fallback para Unsplash se browser permitir
  const proxyImage = (url: string, category?: string): string => {
    // Em produção ou se tiver URL real, tenta Unsplash primeiro
    if (url && url.length > 10 && url.startsWith('http') && !url.includes('data:')) {
      return url;
    }
    // Fallback: usar SVG data URI (sempre funciona)
    return getImageByCategory(category);
  };

  const handleShare = useCallback((title: string, url: string) => {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      setSharePopup({ title, url });
    }
  }, []);

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

  if (!isMounted) {
    return null;
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0e1621] dark:to-[#0e1621] text-gray-900 dark:text-gray-100 font-sans pb-20 safe-area-top"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      suppressHydrationWarning
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
              className="fixed left-0 top-0 bottom-0 w-[280px] md:w-[320px] max-w-[85vw] bg-white dark:bg-[#17212b] shadow-xl z-[160] flex flex-col border-r border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                <span className="font-bold text-gray-900 dark:text-white">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-2 flex flex-col gap-1">
                <button
                  onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
                >
                  <Home className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Início
                </button>
                {isSupported && (
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await handleEnablePush();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
                  >
                    <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    {isSubscribed ? 'Alertas ativados' : 'Receber alertas de notícias'}
                  </button>
                )}
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
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-3 shadow-sm safe-area-top">
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
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate">Noticias24h</h1>
                <p className="text-[10px] text-gray-400 font-medium">Atualizado 24h • Brasil e Mundo</p>
              </div>
              <button onClick={() => setSearchOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Buscar">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative shrink-0">
                <div
                  className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  onClick={handleSecretButton}
                  title="Data e Hora"
                  suppressHydrationWarning
                >
                  <Clock className="w-4 h-4" />
                  <span className="capitalize hidden sm:inline" suppressHydrationWarning>{currentDate}</span>
                </div>
                <DateHint show={showHint} onDismiss={dismissHint} />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Botão secreto discreto (duplo clique na data é o principal) */}
      <div className="px-4 md:px-8 py-1.5 border-b border-gray-100 flex items-center justify-between gap-2 max-w-6xl mx-auto">
        <span />
        <button onClick={handleSecretButton} className="text-xs text-gray-500 hover:text-gray-700 transition-colors py-1" data-testid="fale-conosco-btn" aria-label="Fale Conosco">
          Fale Conosco
        </button>
      </div>


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
      <div className="px-4 md:px-8 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-[#0e1621]/80 max-w-6xl mx-auto" suppressHydrationWarning>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar" suppressHydrationWarning>
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {(['today', 'week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                dateFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
      <nav className="overflow-x-auto whitespace-nowrap px-4 md:px-8 py-3 border-b border-gray-100 dark:border-gray-700 hide-scrollbar max-w-6xl mx-auto">
        {categories.map((cat) => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            className={`mr-6 text-sm font-medium transition-colors ${
              selectedCategory === cat 
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-2' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
              <NewsCardSkeleton key={i} />
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
                  <article key={item.id} className="group relative bg-white dark:bg-[#17212b] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (articleMenuId) setArticleMenuId(null);
                        else if (item.url) { setReadingArticle(item); setIframeError(false); }
                      }}
                    >
                      <div className="flex flex-col md:flex-col">
                        <div 
                          className="aspect-video md:aspect-[16/10] w-full overflow-hidden relative group-hover:scale-105 transition-transform duration-300"
                          style={{ 
                            backgroundColor: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || '#3b82f6',
                            backgroundImage: `url("${proxyImage(item.image, item.category)}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            minHeight: '180px'
                          }}
                          role="img"
                          aria-label={`Imagem da categoria ${item.category}`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5">
                            <span className="text-white font-bold text-lg drop-shadow-lg opacity-60 select-none">{item.category || 'Notícia'}</span>
                          </div>
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
                                  if (item.url) handleShare(item.title, item.url);
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
                                        if (item.url) handleShare(item.title, item.url);
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
      {!readingArticle && (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 md:px-8 py-2 flex justify-around md:justify-center md:gap-12 lg:gap-16 items-center text-xs font-medium text-gray-500 dark:text-gray-400 safe-area-inset-bottom z-30 max-w-6xl mx-auto">
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
      )}

      {/* Leitor de Artigos em Iframe */}
      <AnimatePresence>
        {readingArticle && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-0 z-50 bg-white dark:bg-[#0e1621] flex flex-col"
          >
            <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#17212b] safe-area-inset-top shrink-0">
              <button
                onClick={() => setReadingArticle(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{readingArticle.title}</p>
                <p className="text-[11px] text-gray-500">{readingArticle.source}</p>
              </div>
              <button
                onClick={() => {
                  if (readingArticle.url) window.open(readingArticle.url, '_blank', 'noopener,noreferrer');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Abrir externamente"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </button>
            </header>
            {iframeError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-2">Conteúdo não disponível</p>
                <p className="text-sm text-gray-500 mb-6">Este site não permite visualização incorporada.</p>
                <button
                  onClick={() => { if (readingArticle.url) window.open(readingArticle.url, '_blank', 'noopener,noreferrer'); }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir em nova aba
                </button>
              </div>
            ) : (
              <iframe
                src={readingArticle.url}
                className="flex-1 w-full border-none"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onError={() => setIframeError(true)}
                title={readingArticle.title}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup de Compartilhamento (Fallback Desktop) */}
      <AnimatePresence>
        {sharePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSharePopup(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Compartilhar</h3>
                <p className="text-xs text-gray-500 truncate mt-1">{sharePopup.title}</p>
              </div>
              <div className="py-2">
                <button
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => {
                    navigator.clipboard.writeText(sharePopup.url).then(() => toast.success('Link copiado!'));
                    setSharePopup(null);
                  }}
                >
                  <Copy className="w-4 h-4 text-gray-500" /> Copiar link
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(sharePopup.title + ' ' + sharePopup.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => setSharePopup(null)}
                >
                  <Link2 className="w-4 h-4 text-green-600" /> WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePopup.title)}&url=${encodeURIComponent(sharePopup.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => setSharePopup(null)}
                >
                  <Share2 className="w-4 h-4 text-sky-500" /> Twitter / X
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(sharePopup.url)}&text=${encodeURIComponent(sharePopup.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => setSharePopup(null)}
                >
                  <Share2 className="w-4 h-4 text-blue-500" /> Telegram
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

