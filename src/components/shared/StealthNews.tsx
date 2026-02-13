'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, Share2, MoreVertical, Clock, MessageCircle, TrendingUp, Calendar, ExternalLink, Bell, Home, LogOut, X, Bookmark, User } from 'lucide-react';
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
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [clickCount, setClickCount] = useState(0);
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

  // Simular notificações de mensagens como notícias
  useEffect(() => {
    // Verificar mensagens a cada 30 segundos
    const checkMessages = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Verificar se há mensagens não lidas
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('*, chats!inner(chat_participants!inner(user_id))')
          .neq('sender_id', user.id)
          .is('read_at', null)
          .limit(1);

        if (unreadMessages && unreadMessages.length > 0 && onMessageNotification) {
          const message = unreadMessages[0];
          // Criar notificação disfarçada de notícia
          const fakeNewsTitle = generateFakeNewsTitle(message.content);
          onMessageNotification(fakeNewsTitle);
        }
      } catch (error) {
        // Silenciosamente ignorar erros
      }
    };

    const messageCheckInterval = setInterval(checkMessages, 30000);
    return () => clearInterval(messageCheckInterval);
  }, [onMessageNotification]);

  const generateFakeNewsTitle = (content: string): string => {
    const newsTemplates = [
      'BREAKING: Nova descoberta científica revela avanços significativos',
      'URGENTE: Atualização importante sobre desenvolvimentos recentes',
      'NOTÍCIA: Informação atualizada sobre situação atual',
      'DESTAQUE: Nova informação relevante para o público',
      'ATUALIZAÇÃO: Desenvolvimento importante que você precisa saber',
      'ALERTA: Nova informação de interesse público',
      'MANCHETE: Descoberta recente gera repercussão',
      'EXCLUSIVO: Informação importante divulgada agora',
      'ÚLTIMA HORA: Desenvolvimento em tempo real',
      'AO VIVO: Acompanhe a cobertura completa'
    ];
    const sources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo', 'Estadão', 'Reuters', 'AFP', 'Valor', 'R7', 'Terra', 'Jovem Pan', 'Gazeta do Povo', 'InfoMoney', 'TecMundo', 'Lance!', 'GE', 'AdoroCinema', 'Space.com', 'Nature'];
    const randomTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const truncated = content.substring(0, 40);
    return `${randomTemplate} - ${randomSource}`;
  };

  // Notificações "última hora" periódicas (respeita preferência)
  useEffect(() => {
    if (news.length === 0 || showSaved || !getAlertasUltimaHora()) return;
    const interval = setInterval(() => {
      if (!getAlertasUltimaHora()) return;
      const item = news[Math.floor(Math.random() * news.length)];
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
    
    // Usar cache se ainda válido
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setNews(cached.news);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Usar NewsAPI (gratuita) ou fallback para mock
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY || '';
      const country = selectedCategory === 'Brasil' ? 'br' : 'us';
      
      let fetchedNews: NewsItem[] = [];

      if (apiKey) {
        try {
          // Buscar notícias de múltiplas fontes mundiais
          const newsPromises: Promise<Response>[] = [];
          
          // Notícias do país selecionado
          newsPromises.push(
            fetch(`https://newsapi.org/v2/top-headlines?country=${country}&pageSize=10&apiKey=${apiKey}`)
          );
          
          // Notícias internacionais (sempre incluir em Top Stories e Mundo)
          if (selectedCategory === 'Mundo' || selectedCategory === 'Top Stories') {
            newsPromises.push(
              fetch(`https://newsapi.org/v2/top-headlines?category=general&language=en&pageSize=10&apiKey=${apiKey}`)
            );
            newsPromises.push(
              fetch(`https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=5&apiKey=${apiKey}`)
            );
          }
          
          // Notícias por categoria específica
          if (selectedCategory !== 'Top Stories' && selectedCategory !== 'Brasil' && selectedCategory !== 'Mundo') {
            const categoryMap: { [key: string]: string } = {
              'Tecnologia': 'technology',
              'Esportes': 'sports',
              'Saúde': 'health',
              'Economia': 'business',
              'Entretenimento': 'entertainment',
              'Política': 'general',
              'Ciência': 'science'
            };
            
            const apiCategory = categoryMap[selectedCategory] || 'general';
            newsPromises.push(
              fetch(`https://newsapi.org/v2/top-headlines?category=${apiCategory}&language=pt&pageSize=15&apiKey=${apiKey}`)
            );
          }
          
          // Aguardar todas as respostas
          const responses = await Promise.allSettled(newsPromises);
          const allArticles: any[] = [];
          
          // Processar respostas bem-sucedidas
          for (const result of responses) {
            if (result.status === 'fulfilled') {
              try {
                const data = await result.value.json();
                if (data.articles && Array.isArray(data.articles)) {
                  allArticles.push(...data.articles);
                }
              } catch (e) {
                // Ignorar erros de parsing
              }
            }
          }
          
          // Remover duplicatas e limitar
          const uniqueArticles = Array.from(
            new Map(allArticles.map((article: any) => [article.url || article.title, article])).values()
          ).slice(0, 30);
          
          if (uniqueArticles.length > 0) {
            fetchedNews = uniqueArticles.map((article: any, index: number) => ({
              id: `news-${index}-${Date.now()}`,
              title: article.title || 'Sem título',
              source: article.source?.name || 'Fonte desconhecida',
              time: getTimeAgo(new Date(article.publishedAt)),
              image: article.urlToImage || getDefaultImage(),
              category: getCategoryFromTitle(article.title || ''),
              url: article.url,
              description: article.description
            }));
          }
        } catch (apiError) {
          console.error('NewsAPI error:', apiError);
        }
      }

      // Fallback para notícias mock se API falhar
      if (fetchedNews.length === 0) {
        fetchedNews = getMockNews(selectedCategory);
      }

      // Filtrar por data se necessário
      if (dateFilter !== 'all') {
        const now = new Date();
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
          if (unit === 'min') return value < 120; // Menos de 2 horas
          if (unit === 'h') return value < 2;
          return false;
        })
        .map(item => item.id)
        .slice(0, 3); // Máximo 3 breaking news
      
      // Salvar no cache
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
    const baseNews: NewsItem[] = [
      { id: '1', title: 'Mercado financeiro registra alta após anúncio do governo', source: 'G1 Economia', time: '15min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: 'https://www.google.com/search?q=mercado+financeiro+brasil', description: 'Índices sobem com expectativa de novas medidas econômicas.' },
      { id: '2', title: 'Nova tecnologia promete revolucionar comunicação digital', source: 'TechNews Brasil', time: '1h atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: 'https://www.google.com/search?q=tecnologia+comunicação+digital', description: 'Empresas apostam em ferramentas mais seguras e rápidas.' },
      { id: '3', title: 'Seleção brasileira anuncia convocados para próximos jogos', source: 'ESPN Brasil', time: '2h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: 'https://www.google.com/search?q=seleção+brasileira+futebol', description: 'Técnico divulga lista de atletas para a data FIFA.' },
      { id: '4', title: 'Pesquisa revela avanços no tratamento de doenças crônicas', source: 'Folha Saúde', time: '3h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: 'https://www.google.com/search?q=saúde+doenças+crônicas', description: 'Estudo aponta redução de sintomas com novo protocolo.' },
      { id: '5', title: 'Festival de música reúne milhares em São Paulo', source: 'Veja Entretenimento', time: '4h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: 'https://www.google.com/search?q=festival+música+São+Paulo', description: 'Evento acontece no fim de semana com várias atrações.' },
      { id: '6', title: 'ONU discute novas medidas para mudanças climáticas', source: 'BBC Mundo', time: '5h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=ONU+mudanças+climáticas', description: 'Cúpula define metas para a próxima década.' },
      { id: '7', title: 'Startup brasileira recebe investimento milionário', source: 'Exame', time: '6h atrás', image: img('1559136555-9303baea8ebd'), category: 'Tecnologia', url: 'https://www.google.com/search?q=startup+investimento+brasil', description: 'Rodada de investimento deve acelerar expansão.' },
      { id: '8', title: 'Novo aplicativo facilita comunicação entre usuários', source: 'TecMundo', time: '7h atrás', image: img('1512941937669-90a1b58e7e9c'), category: 'Tecnologia', url: 'https://www.google.com/search?q=aplicativo+comunicação', description: 'Plataforma ganha destaque no mercado nacional.' },
      { id: '9', title: 'Congresso aprova projeto de lei sobre reforma tributária', source: 'Estadão Política', time: '2h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: 'https://www.google.com/search?q=reforma+tributária+brasil', description: 'Texto segue para sanção presidencial.' },
      { id: '10', title: 'Eleições municipais: candidatos divulgam propostas', source: 'Folha Política', time: '4h atrás', image: img('1529107386315-e1a2ed48a620'), category: 'Política', url: 'https://www.google.com/search?q=eleições+municipais', description: 'Campanha entra na reta final em várias cidades.' },
      { id: '11', title: 'Descoberta científica pode mudar tratamento do câncer', source: 'BBC Ciência', time: '1h atrás', image: img('1532094349884-543bc11b234d'), category: 'Ciência', url: 'https://www.google.com/search?q=pesquisa+câncer+ciência', description: 'Pesquisadores identificam novo mecanismo celular.' },
      { id: '12', title: 'Missão espacial coleta amostras de asteroide', source: 'G1 Ciência', time: '6h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: 'https://www.google.com/search?q=missão+espacial+asteroide', description: 'Material deve chegar à Terra no próximo ano.' },
      { id: '13', title: 'Dólar cai e bolsa sobe com notícias do exterior', source: 'Valor Econômico', time: '20min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: 'https://www.google.com/search?q=dólar+bolsa+hoje', description: 'Mercado reage a indicadores internacionais.' },
      { id: '14', title: 'Banco Central mantém Selic estável', source: 'InfoMoney', time: '45min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: 'https://www.google.com/search?q=selic+banco+central', description: 'Comitê de política monetária se reúne nesta semana.' },
      { id: '15', title: 'UOL Esportes: resultado dos jogos da rodada', source: 'UOL Esportes', time: '1h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: 'https://www.google.com/search?q=resultados+futebol+hoje', description: 'Confira placar de todos os jogos.' },
      { id: '16', title: 'Lance!: transferências do futebol brasileiro', source: 'Lance!', time: '2h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: 'https://www.google.com/search?q=transferências+futebol', description: 'Clubes fecham contratações para a temporada.' },
      { id: '17', title: 'Ministério da Saúde anuncia nova campanha de vacinação', source: 'Agência Brasil', time: '30min atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: 'https://www.google.com/search?q=campanha+vacinação+2025', description: 'Meta é imunizar grupos prioritários.' },
      { id: '18', title: 'Hospitais recebem novos equipamentos de diagnóstico', source: 'R7 Saúde', time: '3h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: 'https://www.google.com/search?q=hospitais+equipamentos', description: 'Investimento em tecnologia médica.' },
      { id: '19', title: 'Netflix anuncia novas séries brasileiras', source: 'AdoroCinema', time: '1h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: 'https://www.google.com/search?q=netflix+séries+brasil', description: 'Produções nacionais em destaque.' },
      { id: '20', title: 'Globo estreia nova novela no horário nobre', source: 'O Globo', time: '5h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: 'https://www.google.com/search?q=novela+globo+2025', description: 'Elenco e sinopse são divulgados.' },
      { id: '21', title: 'Guerra na Ucrânia: últimas atualizações', source: 'Reuters', time: '25min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=ucrânia+guerra', description: 'Situação no front e negociações.' },
      { id: '22', title: 'Cúpula do G20 debate economia global', source: 'AFP', time: '4h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=G20+cúpula', description: 'Líderes discutem cooperação internacional.' },
      { id: '23', title: 'El País: crise migratória na Europa', source: 'El País', time: '6h atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=migração+europa', description: 'Países buscam soluções conjuntas.' },
      { id: '24', title: 'Inteligência artificial: novas ferramentas para empresas', source: 'CNN Brasil Tech', time: '50min atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: 'https://www.google.com/search?q=IA+empresas', description: 'Startups apostam em soluções com IA.' },
      { id: '25', title: 'Celulares 5G: preços caem no Brasil', source: 'TudoCelular', time: '2h atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: 'https://www.google.com/search?q=5G+celular+preço', description: 'Modelos mais acessíveis chegam ao mercado.' },
      { id: '26', title: 'Senado analisa mudanças na Previdência', source: 'Gazeta do Povo', time: '3h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: 'https://www.google.com/search?q=previdência+reforma', description: 'Proposta deve ser votada em breve.' },
      { id: '27', title: 'Correio Braziliense: orçamento federal aprovado', source: 'Correio Braziliense', time: '5h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: 'https://www.google.com/search?q=orçamento+federal', description: 'Congressistas fecham acordo.' },
      { id: '28', title: 'Pesquisa com células-tronco avança no país', source: 'Revista Pesquisa Fapesp', time: '2h atrás', image: img('1532094349884-543bc11b234d'), category: 'Ciência', url: 'https://www.google.com/search?q=células+tronco+pesquisa', description: 'Laboratórios brasileiros na vanguarda.' },
      { id: '29', title: 'Nature: novo estudo sobre mudanças climáticas', source: 'Nature', time: '8h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: 'https://www.google.com/search?q=mudanças+climáticas+ciência', description: 'Artigo publicado em revista internacional.' },
      { id: '30', title: 'Ibovespa fecha em alta pelo terceiro dia', source: 'Bloomberg Brasil', time: '10min atrás', image: img('1611974765270-ca1258634369'), category: 'Economia', url: 'https://www.google.com/search?q=ibovespa+hoje', description: 'Commodities e bancos puxam alta.' },
      { id: '31', title: 'Campeonato Brasileiro: tabela e jogos', source: 'GE GloboEsporte', time: '40min atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: 'https://www.google.com/search?q=brasileirão+tabela', description: 'Confira a classificação atualizada.' },
      { id: '32', title: 'Olimpíadas 2028: preparação dos atletas', source: 'Olympics.com', time: '5h atrás', image: img('1574629810360-7efbbe195018'), category: 'Esportes', url: 'https://www.google.com/search?q=olimpíadas+2028', description: 'Comitês nacionais definem estratégia.' },
      { id: '33', title: 'ANS regulamenta planos de saúde', source: 'Saúde Business', time: '1h atrás', image: img('1559757148-5c350d0d3c56'), category: 'Saúde', url: 'https://www.google.com/search?q=ANS+planos+saúde', description: 'Novas regras entram em vigor.' },
      { id: '34', title: 'Spotify lança playlist oficial da Copa', source: 'Rolling Stone Brasil', time: '2h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: 'https://www.google.com/search?q=spotify+playlist', description: 'Músicas para torcer.' },
      { id: '35', title: 'YouTube anuncia mudanças para criadores', source: 'TecMundo', time: '4h atrás', image: img('1470229722913-7c0e2dbbafd3'), category: 'Entretenimento', url: 'https://www.google.com/search?q=youtube+criadores', description: 'Nova política de monetização.' },
      { id: '36', title: 'CNN: tensão no Oriente Médio', source: 'CNN Internacional', time: '35min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=oriente+médio', description: 'Análise da situação regional.' },
      { id: '37', title: 'Criptomoedas: mercado reage a decisão regulatória', source: 'CoinTelegraph Brasil', time: '55min atrás', image: img('1518770660439-4636190af475'), category: 'Tecnologia', url: 'https://www.google.com/search?q=criptomoedas+regulação', description: 'Autoridades definem marco legal.' },
      { id: '38', title: 'TSE divulga calendário eleitoral', source: 'Jovem Pan News', time: '1h atrás', image: img('1541872703-74c5e44368f9'), category: 'Política', url: 'https://www.google.com/search?q=TSE+calendário+eleitoral', description: 'Datas das próximas eleições.' },
      { id: '39', title: 'NASA confirma missão à Lua em 2026', source: 'Space.com', time: '3h atrás', image: img('1446776811953-b23d57bd21aa'), category: 'Ciência', url: 'https://www.google.com/search?q=NASA+lua+2026', description: 'Programa Artemis segue no cronograma.' },
      { id: '40', title: 'Terra: previsão do tempo para o fim de semana', source: 'Terra', time: '12min atrás', image: img('1611273426858-450d8e3c9fce'), category: 'Mundo', url: 'https://www.google.com/search?q=previsão+tempo', description: 'Frente fria avança pelo país.' }
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
    const images = [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  // Botão oculto: "Fale Conosco" ou duplo clique na data
  const handleSecretButton = () => {
    const now = Date.now();
    if (now - lastClickTime < 500) {
      // Duplo clique detectado
      setClickCount(prev => prev + 1);
      if (clickCount >= 1) {
        onUnlockRequest();
        setClickCount(0);
      }
    } else {
      setClickCount(0);
    }
    setLastClickTime(now);
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
      className="min-h-screen bg-white text-gray-900 font-sans pb-20 safe-area-top"
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
              className="fixed left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-xl z-[160] flex flex-col border-r border-gray-200"
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
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm safe-area-top">
        <div className="flex items-center justify-between gap-2">
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
              >
                <Clock className="w-4 h-4" />
                <span className="capitalize hidden sm:inline">{currentDate}</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Botão secreto discreto (duplo clique na data é o principal) */}
      <div className="px-4 py-1.5 border-b border-gray-100 flex items-center justify-between gap-2">
        <span />
        <button onClick={handleSecretButton} className="text-xs text-gray-500 hover:text-gray-700 transition-colors py-1">
          Fale Conosco
        </button>
      </div>
      <div className="px-4 py-2 border-b border-gray-100">
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

      {/* Seção de Destaques */}
      {selectedCategory === 'Top Stories' && displayedNews.length > 0 && !showSaved && (
        <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Em Destaque</h2>
          </div>
          <div className="space-y-2">
            {displayedNews.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 bg-white rounded-lg border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
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
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
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
      <nav className="overflow-x-auto whitespace-nowrap px-4 py-3 border-b border-gray-100 hide-scrollbar">
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

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-6 pb-24">
        {showSaved ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Notícias salvas</h2>
              <button onClick={() => setShowSaved(false)} className="text-sm text-blue-600 font-medium">Voltar</button>
            </div>
            {getSavedList().length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma notícia salva</p>
                <p className="text-sm mt-1">Toque em ⋮ em uma notícia e escolha &quot;Salvar&quot;</p>
              </div>
            ) : (
              getSavedList().map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer"
                  onClick={() => s.url && window.open(s.url, '_blank')}
                >
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.source} • {s.time}</p>
                </div>
              ))
            )}
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-6 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                  <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {displayedNews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhuma notícia encontrada</p>
                <p className="text-sm mt-2">{searchQuery ? 'Tente outros termos' : 'Puxe para atualizar'}</p>
              </div>
            ) : (
              displayedNews.map((item, index) => {
                const isSaved = savedIds.has(item.id);
                const menuOpen = articleMenuId === item.id;
                return (
                  <article key={item.id} className="group relative">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (articleMenuId) setArticleMenuId(null);
                        else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide flex-wrap">
                            {breakingNews.includes(item.id) && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">BREAKING</span>
                            )}
                            <span>{item.category}</span>
                            <span className="text-gray-400 font-normal">• {item.source}</span>
                          </div>
                          <h2 className="text-lg font-bold leading-snug group-hover:text-blue-700 transition-colors line-clamp-3">{item.title}</h2>
                          {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{item.time}</span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </a>
                              )}
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.share && item.url) {
                                    navigator.share({ title: item.title, text: item.description || item.title, url: item.url }).catch(() => {});
                                  }
                                }}
                              >
                                <Share2 className="w-4 h-4 text-gray-400" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded relative"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArticleMenuId(menuOpen ? null : item.id);
                                }}
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                {menuOpen && (
                                  <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      onClick={(e) => { e.stopPropagation(); if (item.url) window.open(item.url, '_blank'); setArticleMenuId(null); }}
                                    >
                                      <ExternalLink className="w-4 h-4" /> Abrir em nova aba
                                    </button>
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (navigator.share && item.url) navigator.share({ title: item.title, url: item.url }).catch(() => {});
                                        setArticleMenuId(null);
                                      }}
                                    >
                                      <Share2 className="w-4 h-4" /> Compartilhar
                                    </button>
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        </div>
                      </div>
                    </div>
                    {index < displayedNews.length - 1 && <hr className="my-4 border-gray-100" />}
                  </article>
                );
              })
            )}
          </>
        )}
      </main>

      {/* Bottom Nav - 100% funcional */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center text-xs font-medium text-gray-500 safe-area-inset-bottom z-30">
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

