import React, { useState, useEffect } from 'react';
import { Book, Category, UserPreferences } from './types';
import { dbInstance } from './db';
import { PRELOADED_BOOKS, GET_MOCK_BOOK_PAGES } from './services/preloadedBooks';
import AdminPanel from './components/AdminPanel';
import ReaderPanel from './components/ReaderPanel';
import AIChatbot from './components/AIChatbot';
import { 
  Library, Search, Star, BookOpen, Compass, Shield, HelpCircle, 
  Settings, ChevronRight, Sun, Moon, Info, BookCheck, Plus, Trash2, Check, Flame, Sparkles
} from 'lucide-react';

export default function App() {
  const [initLoaded, setInitLoaded] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Dynamic study stats and custom study goals states
  const [stats, setStats] = useState({
    booksCount: 0,
    notesCount: 0,
    bookmarksCount: 0,
    categoriesCount: 0
  });

  const [studentGoals, setStudentGoals] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem('flipstudy_goals_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: '1', text: 'Revise standard formulas of Physics electromagnetism', completed: false },
      { id: '2', text: 'Solve 3 calculus integration problems in Math Ext 2', completed: false },
      { id: '3', text: 'Highlight specs in organic Spectrophotometry outcomes', completed: false },
    ];
  });

  const [newGoalText, setNewGoalText] = useState('');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Theme & Reading preferences
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [readingPrefs, setReadingPrefs] = useState<UserPreferences>({
    theme: 'light',
    readingMode: 'double',
    lastBookId: null,
    lastPage: 1
  });

  // Admin and Reader panels toggle states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  // Background Sakura Blossom Petals
  const [petals, setPetals] = useState<{ id: number, left: string, delay: string, duration: string, scale: number }[]>([]);

  // Initialize DB and seeds
  useEffect(() => {
    const bootstrap = async () => {
      await dbInstance.init();
      
      // Load categories
      let existingCats = await dbInstance.getAllCategories();
      if (existingCats.length === 0) {
        const defaultCats = [
          { id: 'cat_phys', name: 'Physics' },
          { id: 'cat_math', name: 'Mathematics' },
          { id: 'cat_chem', name: 'Chemistry' },
          { id: 'cat_bio', name: 'Biology' }
        ];
        for (const c of defaultCats) {
          await dbInstance.saveCategory(c);
        }
        existingCats = defaultCats;
      }
      setCategories(existingCats);

      // Load books
      let existingBooks = await dbInstance.getAllBooks();
      const hasSeeded = localStorage.getItem('flipstudy_initial_seeded_v2');
      if (existingBooks.length === 0 && !hasSeeded) {
        for (const b of PRELOADED_BOOKS) {
          await dbInstance.saveBook(b);
        }
        localStorage.setItem('flipstudy_initial_seeded_v2', 'true');
        existingBooks = await dbInstance.getAllBooks();
      }
      
      // Sort books based on order or creation date
      existingBooks.sort((a, b) => (a.order || 0) - (b.order || 0));
      setBooks(existingBooks);

      // Load preferences from localStorage
      const savedTheme = localStorage.getItem('flipstudy_theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        const preSelTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(preSelTheme);
      }

      const savedPrefs = localStorage.getItem('flipstudy_preferences');
      if (savedPrefs) {
        setReadingPrefs(JSON.parse(savedPrefs));
      }

      await recalculateStats(existingBooks, existingCats);
      setInitLoaded(true);
    };

    bootstrap();
  }, []);

  // Sync preferences with localStorage on updates
  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    const nextPrefs = { ...readingPrefs, ...updated };
    setReadingPrefs(nextPrefs);
    localStorage.setItem('flipstudy_preferences', JSON.stringify(nextPrefs));
  };

  // Sync student study goals to localStorage
  useEffect(() => {
    localStorage.setItem('flipstudy_goals_v2', JSON.stringify(studentGoals));
  }, [studentGoals]);

  // Recalculate stats dynamically from IndexedDB stores
  const recalculateStats = async (currentBooks: Book[], currentCats: Category[]) => {
    try {
      let notesAccum = 0;
      let bookmarksAccum = 0;
      for (const b of currentBooks) {
        const bookNotes = await dbInstance.getNotesForBook(b.id);
        const bookBms = await dbInstance.getBookmarksForBook(b.id);
        notesAccum += bookNotes.length;
        bookmarksAccum += bookBms.length;
      }
      setStats({
        booksCount: currentBooks.length,
        notesCount: notesAccum,
        bookmarksCount: bookmarksAccum,
        categoriesCount: currentCats.length
      });
    } catch (e) {
      console.warn("Could not calculate dynamic study statistics: ", e);
    }
  };

  // Add study goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: 'goal_' + Date.now(),
      text: newGoalText.trim(),
      completed: false
    };
    setStudentGoals(prev => [...prev, newGoal]);
    setNewGoalText('');
  };

  // Toggle study goal completion
  const handleToggleGoal = (id: string) => {
    setStudentGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  // Delete study goal
  const handleDeleteGoal = (id: string) => {
    setStudentGoals(prev => prev.filter(g => g.id !== id));
  };

  // Switch dark/light modes
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('flipstudy_theme', nextTheme);
  };

  // Generate romantic floating Sakura petals particles
  useEffect(() => {
    const activePetals = [...Array(15)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${12 + Math.random() * 12}s`,
      scale: 0.5 + Math.random() * 0.8
    }));
    setPetals(activePetals);
  }, []);

  // Logo clicking tracker for secret admin console triggers
  const handleLogoClick = () => {
    setLogoClickCount(prev => {
      const next = prev + 1;
      if (next === 5) {
        setIsAdminOpen(true);
        // Reset counter
        return 0;
      }
      // Reset counter if they wait too long
      const timer = setTimeout(() => {
        setLogoClickCount(0);
      }, 2500);
      
      return next;
    });
  };

  // Reload current database books
  const handleRefreshLibrary = async () => {
    const refreshedBooks = await dbInstance.getAllBooks();
    refreshedBooks.sort((a, b) => (a.order || 0) - (b.order || 0));
    setBooks(refreshedBooks);

    const refreshedCats = await dbInstance.getAllCategories();
    setCategories(refreshedCats);

    await recalculateStats(refreshedBooks, refreshedCats);
  };

  // Resume studying continuing card target
  const lastBookResumable = books.find(b => b.id === readingPrefs.lastBookId);

  // Search filter evaluation
  const filteredBooks = books.filter(b => {
    const matchCat = selectedCategory === 'All' || b.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const featuredBooks = books.filter(b => b.isFeatured);

  return (
    <div className={`flex flex-col md:flex-row min-h-screen font-serif transition-colors duration-500 overflow-hidden select-none ${theme === 'dark' ? 'dark text-zinc-100 bg-[#121110]' : 'text-black bg-white'}`}>
      
      {/* Immersive Falling Sakura Petals Backdrop */}
      {theme === 'light' && petals.map(p => (
        <div
          key={p.id}
          className={`sakura-petal sakura-${(p.id % 5) + 1}`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `scale(${p.scale})`,
            opacity: 0.35
          }}
        />
      ))}

      {/* Sidebar Navigation - Desktop View */}
      <aside className="hidden md:flex w-20 flex-col items-center py-8 bg-zinc-50 dark:bg-[#1A1816] border-r border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
        <div 
          onClick={handleLogoClick}
          className="mb-12 cursor-pointer relative group active:scale-95 transition-transform"
          title="Click 5 times for Admin Mode"
        >
          <div className="w-12 h-12 bg-[#FFD1DC] dark:bg-[#5C454B] rounded-full flex items-center justify-center shadow-sm border border-[#F8BBD0] dark:border-[#7A5B60]">
            <span className="text-[#333333] dark:text-rose-100 font-bold text-xl leading-none">F</span>
          </div>
          {logoClickCount > 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-rose-500 dark:text-rose-300 bg-[#FFD1DC] dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {logoClickCount}/5
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-8 flex-1">
          <button 
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className={`p-3 rounded-xl transition-all shadow-sm border cursor-pointer ${
              selectedCategory === 'All' && searchQuery === ''
                ? 'bg-white dark:bg-zinc-800 border-[#E5E0D5] dark:border-zinc-750 text-[#333333] dark:text-white'
                : 'border-transparent text-[#7B746B] dark:text-gray-400 hover:bg-[#FFD1DC]/40'
            }`}
            title="Syllabus Library"
          >
            <Library size={18} />
          </button>

          <button 
            onClick={() => setIsAdminOpen(true)}
            className="p-3 hover:bg-[#FFD1DC] dark:hover:bg-rose-950/30 text-[#7B746B] dark:text-gray-400 hover:text-[#333333] dark:hover:text-rose-200 transition-colors rounded-xl cursor-pointer"
            title="Open Admin Console"
          >
            <Shield size={18} />
          </button>

          <button 
            onClick={toggleTheme}
            className="p-3 hover:bg-[#FFD1DC] dark:hover:bg-rose-950/30 text-[#7B746B] dark:text-gray-400 hover:text-[#333333] dark:hover:text-rose-200 transition-colors rounded-xl cursor-pointer"
            title={theme === 'light' ? 'Midnight Theme' : 'Paper Theme'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </nav>

        <div className="mt-auto">
          <div className="w-10 h-10 rounded-full border-2 border-[#DCD3C1] dark:border-zinc-800 p-1">
            <div className="w-full h-full bg-[#E5E0D5] dark:bg-zinc-700 rounded-full"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-[#121110]/80 border-b border-zinc-200 dark:border-zinc-800/60 select-none py-3.5 px-4 flex items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <div className="w-9 h-9 bg-[#FFD1DC] dark:bg-[#5C454B] rounded-full flex items-center justify-center shadow-sm border border-[#F8BBD0] dark:border-[#7A5B60]">
              <span className="text-[#333333] dark:text-rose-100 font-bold text-lg">F</span>
            </div>
            <div>
              <span className="font-sans font-extrabold tracking-tight text-sm text-[#333333] dark:text-white uppercase">
                Flip<span className="text-rose-500">Study</span>
              </span>
              <p className="text-[8px] uppercase font-mono tracking-wider text-[#7B746B] dark:text-gray-500">HSC 2027 Reader</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {logoClickCount > 0 && (
              <span className="text-[9px] font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full animate-bounce">
                Keys {logoClickCount}/5
              </span>
            )}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="p-1.5 text-[#7B746B] hover:text-rose-500 transition-colors"
            >
              <Shield size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 text-[#7B746B] hover:text-[#333333] transition-colors"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Primary Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col gap-8">
          
          {/* Header Title area */}
          <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 select-none border-b border-zinc-200 dark:border-zinc-800/60 pb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black dark:text-white">FlipStudy</h1>
              <p className="text-zinc-700 dark:text-gray-400 font-sans text-xs mt-1.5 uppercase tracking-widest font-semibold">
                Syllabus digital library • HSC 2027 Premium System
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your library..."
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 py-2 pin-l-2 pr-8 focus:outline-none focus:border-[#FFD1DC] dark:focus:border-rose-400 font-sans italic text-xs text-black dark:text-white"
              />
              <span className="absolute right-2 top-2.5 text-[#7B746B] dark:text-gray-400">
                <Search size={14} />
              </span>
            </div>
          </header>

          {/* Grid columns section */}
          <div className="grid grid-cols-12 gap-8 items-start">
            
            {/* LEFT AREA: Continual Banner & Books Grid */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
              
              {/* Study Resumption Banner */}
              {lastBookResumable && (
                <section className="relative bg-zinc-100 dark:bg-zinc-800/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden group">
                  <div className="relative z-10 w-full sm:w-2/3">
                    <span className="bg-white dark:bg-zinc-800/80 backdrop-blur-sm text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-sans font-bold text-black dark:text-rose-200 mb-4 inline-block shadow-sm">
                      Continue Reading
                    </span>
                    <h2 className="text-2xl font-bold mb-2 text-black dark:text-white leading-tight">
                      {lastBookResumable.title}
                    </h2>
                    <p className="text-zinc-700 dark:text-gray-400 font-sans text-xs mb-6 font-medium">
                      {lastBookResumable.category} Syllabus • Page {readingPrefs.lastPage} of local IndexedDB data
                    </p>
                    <button
                      onClick={() => setActiveBook(lastBookResumable)}
                      className="bg-black dark:bg-[#FFD1DC] text-white dark:text-[#333333] font-sans text-xs font-bold px-6 py-3 rounded-full hover:bg-zinc-900 dark:hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      RESUME READING
                    </button>
                  </div>

                  <div className="absolute right-8 top-1/2 -translate-y-1/2 rotate-6 shadow-2xl transition-transform group-hover:rotate-0 duration-500 hidden sm:block">
                    <div 
                      className="w-28 h-36 border-l-4 border-black dark:border-rose-400 rounded-sm relative shadow-2xl overflow-hidden"
                      style={{ background: lastBookResumable.coverImage.startsWith('linear-gradient') ? lastBookResumable.coverImage : 'white' }}
                    >
                      {!lastBookResumable.coverImage.startsWith('linear-gradient') && (
                        <img src={lastBookResumable.coverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/5 to-black/20 mix-blend-multiply opacity-80" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200/50 to-white/10 dark:to-white/5 pointer-events-none"></div>
                </section>
              )}

              {/* Subject Pill Filters */}
              <section className="select-none flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-1.5 rounded-full text-xs font-sans font-medium cursor-pointer transition-all border ${
                    selectedCategory === 'All'
                      ? 'bg-rose-100 text-black border-rose-200 font-bold shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-gray-400 border-zinc-200 dark:border-zinc-800 hover:border-gray-300'
                  }`}
                >
                  All Textbooks
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.name)}
                    className={`px-4 py-1.5 rounded-full text-xs font-sans font-medium cursor-pointer transition-all border ${
                      selectedCategory === c.name
                        ? 'bg-rose-100 text-black border-rose-200 font-bold shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-850 dark:text-gray-400 border-transparent hover:border-zinc-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </section>

              {/* Bookshelf Shelf */}
              <section>
                <div className="flex justify-between items-center mb-6 select-none">
                  <h3 className="text-xl font-bold font-sans text-black dark:text-white flex items-center gap-1">
                    My Classroom Bookshelf
                  </h3>
                  <span className="text-xs text-zinc-700 dark:text-gray-400 font-sans">
                    {filteredBooks.length} Books Total
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-zinc-50 dark:bg-[#1A1816]/30 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 min-h-[300px]">
                  {filteredBooks.map((b) => {
                    const isLinearGrad = b.coverImage.startsWith('linear-gradient');
                    return (
                      <div 
                        key={b.id}
                        onClick={() => setActiveBook(b)}
                        className="group cursor-pointer flex flex-col text-left"
                      >
                        <div className="aspect-[3/4] w-full rounded-xl mb-3 shadow-md group-hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between p-4"
                          style={{ background: isLinearGrad ? b.coverImage : 'white' }}
                        >
                          {!isLinearGrad && (
                            <img 
                              src={b.coverImage} 
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              referrerPolicy="no-referrer"
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/5 to-black/20 mix-blend-multiply opacity-80" />
                          <div className="absolute inset-y-0 left-0 w-[4px] bg-black/10 z-10" />

                          {/* Subject badge label */}
                          <div className="relative z-10 self-start text-[8px] font-sans font-black opacity-60 bg-black/40 text-white px-1.5 py-0.5 rounded uppercase">
                            {b.category.substring(0, 3)}
                          </div>

                          <div className="relative z-10 flex flex-col justify-end">
                            {isLinearGrad ? (
                              <h4 className="font-sans font-bold text-xs leading-snug text-white line-clamp-3">
                                {b.title}
                              </h4>
                            ) : (
                              <div className="bg-black/40 backdrop-blur-sm p-1.5 rounded">
                                <h4 className="font-sans font-bold text-[9px] leading-snug text-white line-clamp-2">
                                  {b.title}
                                </h4>
                              </div>
                            )}
                          </div>

                          {/* Hover state marker */}
                          <div className="absolute top-0 right-3 z-20 w-2.5 h-4 bg-rose-450 group-hover:h-6 transition-all rounded-b" />
                        </div>

                        <p className="text-sm font-sans font-bold leading-tight text-black dark:text-zinc-200 line-clamp-2 mb-0.5">
                          {b.title}
                        </p>
                        <p className="text-[10px] text-zinc-650 dark:text-gray-400 font-sans uppercase">
                          {b.category} Syllabus
                        </p>
                      </div>
                    );
                  })}

                  {/* Add New PDF Trigger Block */}
                  <div 
                    onClick={() => setIsAdminOpen(true)}
                    className="aspect-[3/4] w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center group hover:border-[#FFD1DC] transition-colors cursor-pointer bg-zinc-100/40"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-2 group-hover:bg-[#FFD1DC] transition-colors">
                      <Plus className="w-5 h-5 text-zinc-700 dark:text-gray-300" />
                    </div>
                    <span className="text-[10px] font-sans font-bold text-zinc-700 dark:text-gray-400">UPLOAD PDF</span>
                  </div>

                  {filteredBooks.length === 0 && (
                    <div className="col-span-12 py-10 flex flex-col justify-center items-center select-none text-center">
                      <HelpCircle className="text-gray-300 dark:text-zinc-650 animate-bounce mb-2" size={32} />
                      <p className="text-xs text-[#7B746B] dark:text-gray-400 font-sans">No matched textbooks on bookshelf.</p>
                      <button
                        onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                        className="mt-3 py-1 px-3 bg-[#FFD1DC]/20 hover:bg-[#FFD1DC]/35 text-xs font-semibold rounded-full text-rose-600 border border-thin border-rose-350 transition-colors cursor-pointer"
                      >
                        Reset Library Filters
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* HIGHLIGHTED PEDAGOGY DETAILS */}
              <section className="bg-white dark:bg-[#1C1A18] rounded-3xl p-6 border border-[#E5E0D5] dark:border-zinc-800 select-none">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-[#7B746B] dark:text-rose-300" size={16} />
                  <h3 className="text-xs font-bold uppercase font-mono tracking-widest text-[#333333] dark:text-white">
                    Study Center Methodology
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#7B746B] dark:text-zinc-400 leading-relaxed">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[#333333] dark:text-zinc-200">1. Handwriting Canvas Layer</span>
                    <p>Sketch, solve mechanics equations, or draw vector graphs over NESA outcomes. Your sketches persist on page IndexedDB nodes automatically.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[#333333] dark:text-zinc-200">2. Floating Notes System</span>
                    <p>Create color-coded sticky notes on syllabus sections. Drag notes anywhere or edit context on-the-fly.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[#333333] dark:text-zinc-200">3. Custom PDF Integration</span>
                    <p>Load real NESA textbooks. FlipStudy will serve fast PDF layers, highlighter paths, and annotations synchronously.</p>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT AREA: Features & Stats Layout */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              
              {/* Daily Student Study Goals Interactive Checklist */}
              <div className="bg-white dark:bg-[#1C1A18] rounded-3xl p-6 sm:p-8 shadow-sm border border-zinc-250 dark:border-zinc-800/85">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-805/60 mb-4">
                  <h4 className="text-sm font-sans font-black uppercase tracking-wider flex items-center gap-2 text-black dark:text-white">
                    <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                    Daily Study Goals
                  </h4>
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-mono px-2 py-0.5 rounded-full font-bold">
                    {studentGoals.filter(g => g.completed).length}/{studentGoals.length} DONE
                  </span>
                </div>

                {/* Checklist items list */}
                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                  {studentGoals.map(goal => (
                    <div 
                      key={goal.id} 
                      className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                        goal.completed 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 opacity-75' 
                          : 'bg-zinc-50/50 dark:bg-zinc-900/35 border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleGoal(goal.id)}
                        className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                          goal.completed 
                            ? 'bg-emerald-500 border-emerald-600 text-white' 
                            : 'bg-white dark:bg-zinc-855 border-zinc-350 dark:border-zinc-700 hover:border-zinc-450'
                        }`}
                      >
                        {goal.completed && <Check size={12} className="stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-sans flex-1 leading-relaxed text-black dark:text-zinc-200 ${goal.completed ? 'line-through text-zinc-450 dark:text-zinc-500' : ''}`}>
                        {goal.text}
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-zinc-400 hover:text-red-500 p-0.5 rounded opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {studentGoals.length === 0 && (
                    <p className="text-[11px] italic font-sans text-zinc-500 text-center py-4">
                      All caught up! Add a new study task below.
                    </p>
                  )}
                </div>

                {/* Add task simple inline form */}
                <form onSubmit={handleAddGoal} className="mt-4 flex gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                  <input
                    type="text"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Add custom study target..."
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-lg focus:outline-none focus:border-rose-450 text-black dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-black dark:bg-zinc-800 text-white hover:bg-zinc-900 dark:hover:bg-zinc-750 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    ADD
                  </button>
                </form>
              </div>

              {/* Dynamic Classroom Insights / Statistics Dashboard card */}
              <div className="bg-white dark:bg-[#1C1A18] rounded-3xl p-6 sm:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-sm font-sans font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-black dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  Classroom Analytics
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    <p className="text-2xl font-serif font-bold text-black dark:text-white">
                      {stats.booksCount || books.length}
                    </p>
                    <p className="text-[9px] text-zinc-600 dark:text-gray-400 font-sans font-bold tracking-wider uppercase">
                      SYLLABI BOOKS
                    </p>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    <p className="text-2xl font-serif font-bold text-black dark:text-white">
                      {stats.notesCount}
                    </p>
                    <p className="text-[9px] text-zinc-600 dark:text-gray-400 font-sans font-bold tracking-wider uppercase">
                      STICKY NOTES
                    </p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    <p className="text-2xl font-serif font-bold text-black dark:text-white">
                      {stats.bookmarksCount}
                    </p>
                    <p className="text-[9px] text-zinc-600 dark:text-gray-400 font-sans font-bold tracking-wider uppercase">
                      BOOKMARKS SET
                    </p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    <p className="text-2xl font-serif font-bold text-black dark:text-white">
                      {stats.categoriesCount || categories.length}
                    </p>
                    <p className="text-[9px] text-zinc-600 dark:text-gray-400 font-sans font-bold tracking-wider uppercase">
                      SUBJECT TYPES
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 text-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B2A496] dark:text-zinc-500 font-bold">
                    🛡️ SECURED DEVICE STORAGE
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Status Bar / Footer */}
          <footer className="mt-auto flex items-center justify-between border-t border-[#E5E0D5] dark:border-zinc-800/60 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-sans text-[#7B746B] dark:text-gray-400 uppercase tracking-widest font-bold">
                All data synced locally inside IndexedDB
              </span>
            </div>
            
            <div className="flex gap-6 items-center">
              <span className="text-[10px] font-sans text-[#333333] dark:text-gray-450 hover:text-[#FFD1DC] cursor-pointer">
                PWA INSTALLABLE
              </span>
              <span className="text-[10px] font-sans text-[#333333] dark:text-gray-450 hover:text-[#FFD1DC] cursor-pointer">
                NATURAL TONES EDITION v2.0
              </span>
            </div>
          </footer>

        </main>
      </div>

      {/* ADMIN CONSOLE PANEL MODAL */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshLibrary={handleRefreshLibrary}
        categories={categories}
        books={books}
      />

      {/* PRIMARY READER LAYER DISPLAY */}
      {activeBook && (
        <ReaderPanel
          book={activeBook}
          onClose={() => { setActiveBook(null); handleRefreshLibrary(); }}
          preferences={readingPrefs}
          onUpdatePreferences={handleUpdatePreferences}
        />
      )}

      {/* SORA - PROFESSIONAL EXPERT AI STUDY TUTOR */}
      <AIChatbot
        currentBook={activeBook}
        currentPage={readingPrefs?.lastPage || 1}
        pageObj={activeBook ? (GET_MOCK_BOOK_PAGES(activeBook.id)?.[(readingPrefs?.lastPage || 1) - 1] || null) : null}
        isReading={activeBook !== null}
        totalBooks={books.length}
        completedGoals={studentGoals.filter(g => g.completed).length}
        totalGoals={studentGoals.length}
        goalsList={studentGoals}
        categories={categories}
      />
    </div>
  );
}
