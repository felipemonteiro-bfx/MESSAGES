'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Menu, Share2, MoreVertical, Clock, MessageCircle, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Top Stories', 'Brasil', 'Mundo', 'Tecnologia', 'Esportes', 'Saúde', 'Economia', 'Entretenimento'];

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
  }, [selectedCategory]);

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
    const prefixes = [
      'Nova descoberta científica',
      'Atualização importante',
      'Notícia urgente',
      'Desenvolvimento recente',
      'Informação atualizada'
    ];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const truncated = content.substring(0, 50);
    return `${randomPrefix}: ${truncated}...`;
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      // Usar NewsAPI (gratuita) ou fallback para mock
      // Para produção, você precisará de uma chave API
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY || '';
      const country = selectedCategory === 'Brasil' ? 'br' : 'us';
      
      let fetchedNews: NewsItem[] = [];

      if (apiKey) {
        try {
          const response = await fetch(
            `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=20&apiKey=${apiKey}`
          );
          const data = await response.json();
          
          if (data.articles) {
            fetchedNews = data.articles.slice(0, 20).map((article: any, index: number) => ({
              id: `news-${index}`,
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

      setNews(fetchedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews(getMockNews(selectedCategory));
    } finally {
      setLoading(false);
    }
  };

  const getMockNews = (category: string): NewsItem[] => {
    const baseNews: NewsItem[] = [
      {
        id: '1',
        title: 'Mercado financeiro registra alta após anúncio do governo',
        source: 'G1 Economia',
        time: '15min atrás',
        image: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&auto=format&fit=crop&q=60',
        category: 'Economia'
      },
      {
        id: '2',
        title: 'Nova tecnologia promete revolucionar comunicação digital',
        source: 'TechNews Brasil',
        time: '1h atrás',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=60',
        category: 'Tecnologia'
      },
      {
        id: '3',
        title: 'Seleção brasileira anuncia convocados para próximos jogos',
        source: 'ESPN Brasil',
        time: '2h atrás',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60',
        category: 'Esportes'
      },
      {
        id: '4',
        title: 'Pesquisa revela avanços no tratamento de doenças crônicas',
        source: 'Folha Saúde',
        time: '3h atrás',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&fit=crop&q=60',
        category: 'Saúde'
      },
      {
        id: '5',
        title: 'Festival de música reúne milhares em São Paulo',
        source: 'Veja Entretenimento',
        time: '4h atrás',
        image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&fit=crop&q=60',
        category: 'Entretenimento'
      },
      {
        id: '6',
        title: 'ONU discute novas medidas para mudanças climáticas',
        source: 'BBC Mundo',
        time: '5h atrás',
        image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&auto=format&fit=crop&q=60',
        category: 'Mundo'
      },
      {
        id: '7',
        title: 'Startup brasileira recebe investimento milionário',
        source: 'Exame',
        time: '6h atrás',
        image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=60',
        category: 'Tecnologia'
      },
      {
        id: '8',
        title: 'Novo aplicativo facilita comunicação entre usuários',
        source: 'TecMundo',
        time: '7h atrás',
        image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=60',
        category: 'Tecnologia'
      }
    ];

    if (category === 'Top Stories') {
      return baseNews;
    }

    return baseNews.filter(n => {
      if (category === 'Brasil') return n.source.includes('Brasil') || n.source.includes('G1') || n.source.includes('Folha');
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Notícias em Tempo Real</h1>
            <p className="text-[10px] text-gray-400 font-medium">Atualizado a cada 5 minutos • Brasil e Mundo</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-gray-600" />
          <div 
            className="flex items-center gap-1 text-sm text-gray-500 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors"
            onClick={handleSecretButton}
            title="Data e Hora - Clique duas vezes para acessar"
          >
            <Clock className="w-4 h-4" />
            <span className="capitalize">{currentDate}</span>
          </div>
        </div>
      </header>

      {/* Botão Secreto: "Fale Conosco" */}
      <div className="px-4 py-2 border-b border-gray-100">
        <button
          onClick={handleSecretButton}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-blue-600 font-medium text-sm shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Fale Conosco
          <span className="text-xs text-blue-400 ml-auto">Suporte 24/7</span>
        </button>
      </div>

      {/* Categories */}
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

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {news.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhuma notícia encontrada no momento</p>
                <p className="text-sm mt-2">Tente novamente em alguns instantes</p>
              </div>
            ) : (
              news.map((item, index) => (
                <article key={item.id} className="group cursor-pointer">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {item.category}
                        <span className="text-gray-400 font-normal">• {item.source}</span>
                      </div>
                      <h2 className="text-lg font-bold leading-snug group-hover:text-blue-700 transition-colors line-clamp-3">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{item.time}</span>
                        <div className="flex gap-3">
                          <Share2 className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </div>
                      </div>
                    </div>
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  {index < news.length - 1 && <hr className="my-4 border-gray-100" />}
                </article>
              ))
            )}
          </>
        )}
      </main>

      {/* Bottom Nav (Disguise) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center text-xs font-medium text-gray-500">
              <div className="flex flex-col items-center gap-1 text-blue-600">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
            </div>
            <span>Início</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-gray-100 rounded-full" />
            <span>Buscar</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-gray-100 rounded-full" />
            <span>Salvos</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-gray-100 rounded-full" />
            <span>Perfil</span>
          </div>
      </div>
    </div>
  );
}
