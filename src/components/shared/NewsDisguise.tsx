'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, Share2, MoreVertical, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  image: string;
  category: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Global Markets Rally as Tech Sector Rebounds',
    source: 'Financial Times',
    time: '2h ago',
    image: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'Business'
  },
  {
    id: '2',
    title: 'New Study Reveals Surprising Benefits of Coffee',
    source: 'Health Daily',
    time: '4h ago',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'Health'
  },
  {
    id: '3',
    title: 'SpaceX Launches Another Batch of Starlink Satellites',
    source: 'Tech Crunch',
    time: '5h ago',
    image: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'Science'
  },
  {
    id: '4',
    title: 'Local Art Exhibition Draws Record Crowds',
    source: 'City News',
    time: '6h ago',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'Culture'
  },
   {
    id: '5',
    title: 'Weather Forecast: Heavy Rain Expected This Weekend',
    source: 'Weather Channel',
    time: '7h ago',
    image: 'https://images.unsplash.com/photo-1514632595-4944383f2737?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'Weather'
  }
];

interface NewsDisguiseProps {
  onUnlockRequest: () => void;
}

export default function NewsDisguise({ onUnlockRequest }: NewsDisguiseProps) {
  const [currentDate, setCurrentDate] = useState<string>('');
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateDate();
    // Update periodically if needed, but static for now is fine
  }, []);

  const handleDateClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 500) { // Double click threshold: 500ms
      onUnlockRequest();
    }
    setLastClickTime(now);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-gray-600" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Daily Brief</h1>
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-gray-600" />
          <div 
            className="flex items-center gap-1 text-sm text-gray-500 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors"
            onClick={handleDateClick}
            title="Today's Date"
          >
            <Clock className="w-4 h-4" />
            <span>{currentDate}</span>
          </div>
        </div>
      </header>

      {/* Categories */}
      <nav className="overflow-x-auto whitespace-nowrap px-4 py-3 border-b border-gray-100 hide-scrollbar">
        {['Top Stories', 'For You', 'Business', 'Tech', 'Science', 'Health', 'Sports', 'Entertainment'].map((cat, i) => (
          <button 
            key={cat} 
            className={`mr-6 text-sm font-medium ${i === 0 ? 'text-blue-600 border-b-2 border-blue-600 pb-2' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {MOCK_NEWS.map((news, index) => (
          <article key={news.id} className="group cursor-pointer">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {news.category}
                  <span className="text-gray-400 font-normal">• {news.source}</span>
                </div>
                <h2 className="text-lg font-bold leading-snug group-hover:text-blue-700 transition-colors line-clamp-3">
                  {news.title}
                </h2>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{news.time}</span>
                  <div className="flex gap-3">
                    <Share2 className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </div>
                </div>
              </div>
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                <img 
                  src={news.image} 
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            {index < MOCK_NEWS.length - 1 && <hr className="my-4 border-gray-100" />}
          </article>
        ))}
      </main>

       {/* Bottom Nav (Disguise) */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center text-xs font-medium text-gray-500">
          <div className="flex flex-col items-center gap-1 text-blue-600">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
            </div>
            <span>Home</span>
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="w-6 h-6 bg-gray-100 rounded-full" />
             <span>Search</span>
          </div>
           <div className="flex flex-col items-center gap-1">
             <div className="w-6 h-6 bg-gray-100 rounded-full" />
             <span>Saved</span>
          </div>
           <div className="flex flex-col items-center gap-1">
             <div className="w-6 h-6 bg-gray-100 rounded-full" />
             <span>Profile</span>
          </div>
       </div>
    </div>
  );
}
