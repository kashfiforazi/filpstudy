import React, { useState, useEffect, useRef } from 'react';
import { Book, StickyNote, Bookmark, Category, UserPreferences } from '../types';
import { dbInstance } from '../db';
import { PRELOADED_BOOKS, GET_MOCK_BOOK_PAGES, TextbookPage } from '../services/preloadedBooks';
import DrawingCanvas from './DrawingCanvas';
import { 
  X, ChevronLeft, ChevronRight, BookOpen, Search, BookmarkCheck, Bookmark as BookmarkIcon,
  StickyNote as NotesIcon, Pencil, Paintbrush, Eraser, Columns, Square, Maximize2, Minimize2,
  ZoomIn, ZoomOut, Compass, Trash2, Plus, Edit2, RotateCcw, AlertTriangle, Check
} from 'lucide-react';

interface ReaderPanelProps {
  book: Book;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export default function ReaderPanel({ book, onClose, preferences, onUpdatePreferences }: ReaderPanelProps) {
  // Navigation & Sizing states
  const [totalPages, setTotalPages] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-indexed. For double page, is the LEFT page.
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // Scale divider 1x, 1.1x, 1.2x
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState<'single' | 'double'>(preferences.readingMode || 'double');

  // Bookmarks, Sticky Notes, Annotations state layers
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarkAdder, setShowBookmarkAdder] = useState(false);
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [newBookmarkCat, setNewBookmarkCat] = useState('Revision Alert');

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [showNotesSidebar, setShowNotesSidebar] = useState(false);

  // PDF.js renderer metrics & controllers
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfPagesCache, setPdfPagesCache] = useState<Record<number, string>>({}); // pageNum -> image Data URL (or let canvas load directly)
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Search inside PDF parameter variables
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page: number, matches: string[] }[]>([]);
  const [showSearchBox, setShowSearchBox] = useState(false);

  // Drawing Tools setups
  const [activeTool, setActiveTool] = useState<'pencil' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | null>(null);
  const [brushColor, setBrushColor] = useState('#FF6B81'); // Sakura pink default stroke
  const [brushWidth, setBrushWidth] = useState(3);
  
  // Custom states for drag-and-drop Sticky notes
  const [activeNoteDragId, setActiveNoteDragId] = useState<string | null>(null);
  const readerContainerRef = useRef<HTMLDivElement | null>(null);

  // Page elements & PDF loading
  const isMockBook = typeof book.pdfFile === 'string' && book.pdfFile.startsWith('mock');
  const mockPages = isMockBook ? GET_MOCK_BOOK_PAGES(book.id) : [];

  // Initialize PDF document if not a mock textbook
  useEffect(() => {
    if (isMockBook) {
      setTotalPages(mockPages.length);
      setCurrentPage(preferences.lastBookId === book.id ? Math.min(preferences.lastPage, mockPages.length) : 1);
      setPdfDoc(null);
      setPdfError(null);
      return;
    }

    const initPdf = async () => {
      setPdfLoading(true);
      setPdfError(null);
      try {
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          throw new Error('PDF.js CDN library is not available. Please verify connection.');
        }
        
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

        let fileData: any = book.pdfFile;
        if (book.pdfFile instanceof Blob) {
          fileData = new Uint8Array(await book.pdfFile.arrayBuffer());
        }

        const loadingTask = pdfjs.getDocument({ data: fileData });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(preferences.lastBookId === book.id ? Math.min(preferences.lastPage, doc.numPages) : 1);
      } catch (err: any) {
        setPdfError(err.message || 'Error occurred initializing PDF document layers.');
        console.error(err);
      } finally {
        setPdfLoading(false);
      }
    };

    initPdf();
  }, [book.id]);

  // Save progress automatically
  useEffect(() => {
    onUpdatePreferences({
      lastBookId: book.id,
      lastPage: currentPage
    });
    dbInstance.getBook(book.id).then(b => {
      if (b) {
        // We can save reader state context back to metadata
      }
    });
  }, [currentPage, book.id]);

  // Load Bookmarks and list elements
  const reloadAnnotations = async () => {
    const listBookmarks = await dbInstance.getBookmarksForBook(book.id);
    const listNotes = await dbInstance.getNotesForBook(book.id);
    setBookmarks(listBookmarks);
    setNotes(listNotes);
  };

  useEffect(() => {
    reloadAnnotations();
  }, [book.id, currentPage]);

  // Handle PDF rendering into raw canvas tags for double-page or single-page viewing
  const renderPdfPageCanvas = async (pageNum: number, canvasElement: HTMLCanvasElement | null) => {
    if (!canvasElement || !pdfDoc || pageNum < 1 || pageNum > totalPages) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;

      // Fit page to component column sizes smoothly
      const viewport = page.getViewport({ scale: 1.5 });
      canvasElement.width = viewport.width;
      canvasElement.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (e) {
      console.warn('Canvas render interrupted/error: ', e);
    }
  };

  // Triggers canvas render dynamically on components loading states
  const LeftPdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const RightPdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const SinglePdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isMockBook && pdfDoc) {
      if (readingMode === 'double') {
        renderPdfPageCanvas(currentPage, LeftPdfCanvasRef.current);
        renderPdfPageCanvas(currentPage + 1, RightPdfCanvasRef.current);
      } else {
        renderPdfPageCanvas(currentPage, SinglePdfCanvasRef.current);
      }
    }
  }, [currentPage, readingMode, pdfDoc, totalPages, isMockBook]);

  // Bookmark functions
  const handleAddBookmark = async () => {
    if (!newBookmarkLabel.trim()) return;

    const newMark: Bookmark = {
      id: 'mark_' + Date.now(),
      bookId: book.id,
      page: currentPage,
      label: newBookmarkLabel.trim(),
      category: newBookmarkCat,
      createdAt: Date.now()
    };

    await dbInstance.saveBookmark(newMark);
    setNewBookmarkLabel('');
    setShowBookmarkAdder(false);
    reloadAnnotations();
  };

  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbInstance.deleteBookmark(id);
    reloadAnnotations();
  };

  // Sticky Notes functions
  const handleAddStickyNote = async (pageTarget: number) => {
    const newSticky: StickyNote = {
      id: 'note_' + Date.now(),
      bookId: book.id,
      page: pageTarget,
      content: 'Write study note...',
      x: 35, // Centered percents
      y: 35,
      color: '#FFF9A6' // Post-it traditional yellow
    };

    await dbInstance.saveNote(newSticky);
    reloadAnnotations();
  };

  const handleUpdateNoteContent = async (id: string, text: string) => {
    const activeNote = notes.find(n => n.id === id);
    if (!activeNote) return;

    const updated = { ...activeNote, content: text };
    await dbInstance.saveNote(updated);
    reloadAnnotations();
  };

  const handleUpdateNoteColor = async (id: string, colorCode: string) => {
    const activeNote = notes.find(n => n.id === id);
    if (!activeNote) return;

    const updated = { ...activeNote, color: colorCode };
    await dbInstance.saveNote(updated);
    reloadAnnotations();
  };

  const handleDeleteSticky = async (id: string) => {
    await dbInstance.deleteNote(id);
    reloadAnnotations();
  };

  // Note Drag & Drop repositioning math handles (percentage offsets)
  const handleNoteDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeNoteDragId) return;
    const targetElement = document.getElementById(`draggable-postit-${activeNoteDragId}`);
    const parentContainer = targetElement?.parentElement;
    if (!targetElement || !parentContainer) return;

    const parentRect = parentContainer.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate percent positions
    const relX = clientX - parentRect.left;
    const relY = clientY - parentRect.top;
    
    let percentX = Math.max(0, Math.min(90, (relX / parentRect.width) * 100));
    let percentY = Math.max(0, Math.min(90, (relY / parentRect.height) * 100));

    // Instant visually smooth style updating without lagging through state re-renders
    targetElement.style.left = `${percentX}%`;
    targetElement.style.top = `${percentY}%`;
  };

  const handleNoteDragStop = async (id: string) => {
    if (!activeNoteDragId) return;
    setActiveNoteDragId(null);

    const targetElement = document.getElementById(`draggable-postit-${id}`);
    if (targetElement) {
      const pxLeft = parseFloat(targetElement.style.left);
      const pxTop = parseFloat(targetElement.style.top);

      const activeNote = notes.find(n => n.id === id);
      if (activeNote) {
        const updated = {
          ...activeNote,
          x: isNaN(pxLeft) ? activeNote.x : pxLeft,
          y: isNaN(pxTop) ? activeNote.y : pxTop
        };
        await dbInstance.saveNote(updated);
        reloadAnnotations();
      }
    }
  };

  // In-text Search Simulation
  const handleTextSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchQuery.toLowerCase().trim();
    const matchesFound: { page: number, matches: string[] }[] = [];

    if (isMockBook) {
      // Search local loaded mock chapters text strings
      mockPages.forEach((p, idx) => {
        const textBlob = (p.title + ' ' + p.subTitle + ' ' + p.paragraphs.join(' ')).toLowerCase();
        if (textBlob.includes(term)) {
          const sentences = (p.title + '. ' + p.paragraphs.join('. ')).split(/[.!?]/);
          const relatedSentences = sentences
            .filter(s => s.toLowerCase().includes(term))
            .map(s => s.trim())
            .slice(0, 3);
          matchesFound.push({
            page: idx + 1,
            matches: relatedSentences
          });
        }
      });
    } else if (pdfDoc) {
      // Simulate/extract PDF search pages
      for (let pNum = 1; pNum <= totalPages; pNum++) {
        try {
          const page = await pdfDoc.getPage(pNum);
          const txtContent = await page.getTextContent();
          const pageTextString = txtContent.items.map((item: any) => item.str).join(' ');
          
          if (pageTextString.toLowerCase().includes(term)) {
            matchesFound.push({
              page: pNum,
              matches: [`Found match inside page ${pNum} content streams`]
            });
          }
        } catch (ex) {
          // Skip page read fails
        }
      }
    }

    setSearchResults(matchesFound);
  };

  // Navigation handlers (Double or Single page incremental steps)
  const nextPage = () => {
    const step = readingMode === 'double' ? 2 : 1;
    if (currentPage + step <= totalPages) {
      setCurrentPage(prev => prev + step);
    }
  };

  const prevPage = () => {
    const step = readingMode === 'double' ? 2 : 1;
    if (currentPage - step >= 1) {
      setCurrentPage(prev => Math.max(1, prev - step));
    }
  };

  // Flip Study Fullscreen controllers
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      readerContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Clear Active Drawing Trigger Event Dispenser
  const dispatchClearCanvas = (pageNum: number) => {
    if (confirm(`Clear all pencil sketches and highlighters on Page ${pageNum}?`)) {
      const event = new CustomEvent('flipstudy-clear-canvas', {
        detail: { bookId: book.id, page: pageNum }
      });
      window.dispatchEvent(event);
    }
  };

  // Clear all drawings (pencil/highlighter) and sticky notes on the current active view (both left and right pages if double mode)
  const handleClearPageDrawingsAndNotes = async () => {
    const pageL = currentPage;
    const pageR = readingMode === 'double' && currentPage < totalPages ? currentPage + 1 : null;
    
    let confirmMsg = `Are you sure you want to delete all sketches (drawings) and sticky note text on Page ${pageL}`;
    if (pageR) {
      confirmMsg += ` and Page ${pageR}`;
    }
    confirmMsg += `?`;

    if (confirm(confirmMsg)) {
      // 1. Clear drawings (canvas triggers)
      const eventL = new CustomEvent('flipstudy-clear-canvas', {
        detail: { bookId: book.id, page: pageL }
      });
      window.dispatchEvent(eventL);

      if (pageR) {
        const eventR = new CustomEvent('flipstudy-clear-canvas', {
          detail: { bookId: book.id, page: pageR }
        });
        window.dispatchEvent(eventR);
      }

      // 2. Clear notes
      const notesToDelete = notes.filter(n => n.page === pageL || (pageR && n.page === pageR));
      for (const note of notesToDelete) {
        await dbInstance.deleteNote(note.id);
      }

      // 3. Reload annotations from database
      await reloadAnnotations();
    }
  };

  // Reset/Restart the entire textbook's study session, deleting all annotations
  const handleResetEntireBook = async () => {
    if (confirm("Reset Textbook? This will permanently delete ALL drawings, highlighters, sticky notes, and bookmarks of this textbook to restart your session.")) {
      // 1. Delete drawings
      for (let p = 1; p <= totalPages; p++) {
        await dbInstance.deleteDrawing(book.id, p);
        const event = new CustomEvent('flipstudy-clear-canvas', {
          detail: { bookId: book.id, page: p }
        });
        window.dispatchEvent(event);
      }

      // 2. Delete notes and bookmarks
      const bookNotes = await dbInstance.getNotesForBook(book.id);
      for (const note of bookNotes) {
        await dbInstance.deleteNote(note.id);
      }

      const bookBookmarks = await dbInstance.getBookmarksForBook(book.id);
      for (const bm of bookBookmarks) {
        await dbInstance.deleteBookmark(bm.id);
      }

      // Reset reading level to page 1
      setCurrentPage(1);

      // 3. Reload
      await reloadAnnotations();
    }
  };

  // Mock Textbook render page layout builder
  const renderMockPageContent = (pageNum: number, pageObj: TextbookPage) => {
    if (!pageObj) return null;
    return (
      <div className="flex flex-col h-full bg-[#FAF9F5] p-8 sm:p-11 select-text relative">
        {/* Margin Accent Line (Classic parchment design layout) */}
        <div className="absolute top-0 bottom-0 left-[35px] border-r border-[#E9E4DB] select-none" />

        {/* Top Header info */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-gray-500 border-b border-[#F2ECE0] pb-2 mb-6 select-none">
          <span>{pageObj.chapter}</span>
          <span className="font-serif px-2 py-0.5 bg-rose-50 text-rose-500 rounded border border-rose-100">
            {pageObj.kanjiAesthetic || '研究'}
          </span>
          <span>FLIPSTUDY HSC 2027</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-between max-w-sm pl-4 relative">
          <div>
            <h3 className="font-sans font-bold text-xl text-[#1a1a1c] leading-tight mb-2">
              {pageObj.title}
            </h3>
            <p className="font-serif text-[#CBBCA9] text-xs font-semibold tracking-wide italic mb-4 leading-relaxed">
              {pageObj.subTitle}
            </p>

            <div className="flex flex-col gap-3 font-serif text-xs leading-relaxed text-gray-800 tracking-wide text-justify">
              {pageObj.paragraphs.map((p, i) => (
                <p key={i} className="first-line:pl-3">{p}</p>
              ))}
            </div>
          </div>

          {/* Subject formulas block & visual outlines */}
          <div>
            {pageObj.formulas && pageObj.formulas.length > 0 && (
              <div className="my-5 p-3.5 bg-[#FAF9F5] border border-[#E9E4DB] rounded-lg shadow-sm font-mono text-[10px] text-gray-700 flex flex-col gap-1 pr-[45px]">
                <span className="text-[9px] font-semibold text-[#1C1C1E] uppercase tracking-wider mb-0.5 select-none text-rose-600 block">
                  Reference Formulas / 公式:
                </span>
                {pageObj.formulas.map((f, fi) => (
                  <div key={fi} className="border-b border-gray-100 dark:border-zinc-800 last:border-0 pb-1">
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Diagrams elements styles */}
            {pageObj.diagramType === 'wave' && (
              <div className="h-16 w-full opacity-65 flex items-end justify-between select-none relative pb-1">
                {[...Array(20)].map((_, index) => {
                  const amp = Math.sin(index / 2.5) * 30 + 35;
                  return (
                    <div 
                      key={index} 
                      className="w-1.5 bg-rose-200 border border-rose-300 rounded-full" 
                      style={{ height: `${amp}%` }} 
                    />
                  );
                })}
              </div>
            )}

            {pageObj.diagramType === 'benzene' && (
              <div className="h-16 w-full flex items-center justify-center select-none opacity-40">
                <div className="w-12 h-12 relative border-2 border-gray-600 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 rotate-45 border-2 border-dashed border-gray-500" />
                </div>
              </div>
            )}

            {pageObj.diagramType === 'dna' && (
              <div className="h-14 w-full flex items-center justify-center gap-1 select-none opacity-50">
                {[...Array(12)].map((_, i) => {
                  const h1 = Math.sin(i / 1.5) * 20 + 25;
                  const h2 = Math.cos(i / 1.5) * 20 + 25;
                  return (
                    <div key={i} className="flex flex-col items-center justify-between h-12 w-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <div className="w-[1px] flex-1 bg-gray-300" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Page numbers */}
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mt-6 pt-2 border-t border-[#F2ECE0]/70 select-none">
          <span>HSC Syllabus Course Reader</span>
          <span className="font-semibold text-gray-700 bg-[#E8E6DB]/50 px-2.5 py-0.5 rounded-full">
            Page {pageNum} of {totalPages}
          </span>
        </div>
      </div>
    );
  };

  const isLeftPageBookmarked = bookmarks.some(b => b.page === currentPage);
  const isRightPageBookmarked = bookmarks.some(b => b.page === currentPage + 1);

  // Hex brush colors choices list
  const colorPalette = [
    '#FF6B81', // Sakura Pink
    '#FFD1DC', // Pastel Pink Highlighter
    '#FFC048', // Amber Orange
    '#1DD1A1', // Emerald Mint
    '#54A0FF', // Sky Blue
    '#5F27CD', // Neon Lavender
    '#2C3E50', // Dark Charcoal
  ];

  return (
    <div 
      ref={readerContainerRef}
      className={`fixed inset-0 z-40 flex bg-[#1E1E22] text-[#1C1C1E] transition-all overflow-hidden ${
        isFullscreen ? 'p-0' : 'p-3'
      }`}
    >
      {/* LEFT COLUMN: Floating Quick Study Utility Toolbar Panel */}
      <div className="hidden lg:flex flex-col justify-between items-center w-16 bg-[#161619] border border-[#2F2F32]/50 py-5 rounded-l-2xl pr-0.5 shadow-xl select-none">
        <div className="flex flex-col gap-6 items-center">
          {/* Logo brand / Back key */}
          <button 
            onClick={onClose}
            className="p-2.5 bg-[#2A2A2E] text-white hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer shadow-md"
            title="Return to Bookshelf"
          >
            <Compass size={18} />
          </button>

          <div className="w-8 h-[1px] bg-zinc-800" />

          {/* Active Tool Selectors */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTool(activeTool === 'pencil' ? null : 'pencil')}
              className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                activeTool === 'pencil' 
                  ? 'bg-[#FFD1DC] text-[#1C1C1E] scale-105 shadow' 
                  : 'text-gray-400 hover:bg-[#202024]/80'
              }`}
              title="Brush Drawing Tool (⌥B)"
            >
              <Paintbrush size={16} />
            </button>

            <button
              onClick={() => setActiveTool(activeTool === 'highlighter' ? null : 'highlighter')}
              className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                activeTool === 'highlighter' 
                  ? 'bg-amber-100 text-amber-800 scale-105 shadow' 
                  : 'text-gray-400 hover:bg-[#202024]/80'
              }`}
              title="Highlighter Tool (⌥H)"
            >
              <Pencil size={15} />
            </button>

            <button
              onClick={() => setActiveTool(activeTool === 'eraser' ? null : 'eraser')}
              className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                activeTool === 'eraser' 
                  ? 'bg-red-100 text-red-800 scale-105 shadow' 
                  : 'text-gray-400 hover:bg-[#202024]/80'
              }`}
              title="Eraser Tool (⌥E)"
            >
              <Eraser size={16} />
            </button>
          </div>

          {/* Shapes additions sub-palette */}
          <div className="flex flex-col gap-1.5 bg-[#202023] p-1.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => { setActiveTool('line'); }}
              className={`p-1.5 rounded text-[10px] cursor-pointer font-bold ${activeTool === 'line' ? 'bg-zinc-700 text-rose-300' : 'text-gray-400'}`}
              title="Draw straight lines"
            >
              ╱
            </button>
            <button
              onClick={() => { setActiveTool('rect'); }}
              className={`p-1.5 rounded cursor-pointer ${activeTool === 'rect' ? 'bg-zinc-700 text-rose-300' : 'text-gray-400'}`}
              title="Draw rect frames"
            >
              <Square size={10} />
            </button>
            <button
              onClick={() => { setActiveTool('circle'); }}
              className={`p-1.5 rounded text-xs cursor-pointer font-bold ${activeTool === 'circle' ? 'bg-zinc-700 text-rose-300' : 'text-gray-400'}`}
              title="Draw dynamic circles"
            >
              ◯
            </button>
          </div>

          {/* Thickness toggle sliders */}
          {activeTool && (
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <span className="text-[9px] font-mono text-zinc-500">WIDTH</span>
              <input 
                type="range" 
                min={1} 
                max={25} 
                value={brushWidth} 
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                className="w-10 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFD1DC]"
              />
              <span className="text-[10px] font-mono font-semibold text-zinc-400">{brushWidth}px</span>
            </div>
          )}

          {/* Brush active color circle selection */}
          {activeTool && activeTool !== 'eraser' && (
            <div className="flex flex-col gap-1.5 mt-3 bg-[#1A1A1D] p-1.5 rounded-lg">
              {colorPalette.map(c => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  className={`w-4 h-4 rounded-full border cursor-pointer border-transparent transition-transform hover:scale-110 ${
                    brushColor === c ? 'scale-125 border-white ring-1 ring-rose-400' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Color: ${c}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Clear & Restart controls */}
        <div className="flex flex-col gap-3.5 items-center w-full border-t border-zinc-805/50 pt-4 px-1">
          <button
            onClick={handleClearPageDrawingsAndNotes}
            className="p-2.5 text-zinc-400 hover:text-[#FFD1DC] hover:bg-zinc-850 rounded-xl transition-all cursor-pointer"
            title="Clear visible pages (Drawings & Notes together)"
          >
            <RotateCcw size={16} />
          </button>
          <span className="text-[8px] font-mono text-zinc-500 tracking-wider text-center select-none -mt-2">PAGE CLEAR</span>

          <div className="w-8 h-[1px] bg-zinc-800 my-1" />

          <button
            onClick={handleResetEntireBook}
            className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 rounded-xl transition-all cursor-pointer"
            title="Full Textbook Reset (Delete drawings, notes, bookmarks to Restart)"
          >
            <Trash2 size={16} fill="none" />
          </button>
          <span className="text-[8px] font-mono text-zinc-500 tracking-wider text-center select-none -mt-2">RESET BOOK</span>
        </div>
      </div>

      {/* CENTRAL COLUMN: Textbook workspace viewport */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 rounded-2xl md:rounded-r-2xl shadow-inner border-l border-zinc-800">
        
        {/* Top Control Header Toolbar */}
        <div className="flex h-14 bg-[#141416] items-center justify-between px-4 sm:px-6 border-b border-zinc-900 select-none">
          <div className="flex items-center gap-3">
            {/* Small Back key layout */}
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              <Compass size={16} />
            </button>

            <div>
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-gray-200 truncate max-w-[120px] sm:max-w-xs md:max-w-sm">
                {book.title}
              </h1>
              <p className="text-[10px] text-[#CBBCA9] font-mono">
                {isMockBook ? 'Syllabus Course Reader' : 'NESA Classroom Material'}
              </p>
            </div>
          </div>

          {/* Reading utility controls */}
          <div className="flex items-center gap-1 sm:gap-2.5 text-xs">
            {/* Search toggler */}
            <button
              onClick={() => setShowSearchBox(!showSearchBox)}
              className={`p-2 rounded-lg cursor-pointer relative ${showSearchBox ? 'bg-zinc-800 text-rose-300' : 'text-gray-400 hover:bg-zinc-900'}`}
              title="Search textbook contents"
            >
              <Search size={15} />
            </button>

            {/* Bookmark button toggler */}
            <button
              onClick={() => setShowBookmarkAdder(!showBookmarkAdder)}
              className="p-2 text-gray-400 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer"
              title="Set dynamic bookmark"
            >
              <BookmarkIcon size={15} />
            </button>

            {/* Post-it adds triggers */}
            <button
              onClick={() => handleAddStickyNote(currentPage)}
              className="p-2 text-gray-400 hover:text-[#FFF9A6] hover:bg-zinc-900 rounded-lg cursor-pointer"
              title="Place a post-it sticky note on page"
            >
              <Plus size={15} />
            </button>

            {/* Quick Drawings & Notes Clear action */}
            <button
              onClick={handleClearPageDrawingsAndNotes}
              className="p-2 text-rose-350 hover:text-rose-450 hover:bg-zinc-905 rounded-lg cursor-pointer"
              title="Clear all drawings & notes on this page view"
            >
              <RotateCcw size={15} />
            </button>

            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

            {/* Thumbnails Sidebar key */}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-lg cursor-pointer ${showThumbnails ? 'bg-zinc-800 text-[#FFD1DC]' : 'text-gray-400 hover:bg-zinc-900'}`}
              title="ToC / Thumbnails Outline"
            >
              <BookOpen size={15} />
            </button>

            {/* Double/Single Mode selectors */}
            <button
              onClick={() => {
                const updated = readingMode === 'double' ? 'single' : 'double';
                setReadingMode(updated);
                onUpdatePreferences({ readingMode: updated });
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white cursor-pointer"
            >
              <Columns size={12} />
              <span>{readingMode === 'double' ? 'Double' : 'Single'} Page</span>
            </button>

            {/* Scaling / Zoom controllers */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-1.5 py-1">
              <button 
                onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} 
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <ZoomOut size={11} />
              </button>
              <span className="text-[10px] font-mono text-gray-400 px-1 select-none">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button 
                onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} 
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <ZoomIn size={11} />
              </button>
            </div>

            {/* Fullscreen icon */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E22] rounded-lg cursor-pointer"
              title="Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Central Display: PDF / Virtual textbooks pages */}
        <div 
          className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-auto paper-texture-dark"
          onMouseMove={handleNoteDragMove}
          onTouchMove={handleNoteDragMove}
          onMouseUp={() => activeNoteDragId && handleNoteDragStop(activeNoteDragId)}
          onTouchEnd={() => activeNoteDragId && handleNoteDragStop(activeNoteDragId)}
        >
          {/* Internal Search box overlays */}
          {showSearchBox && (
            <div className="absolute top-4 right-4 z-35 w-80 bg-zinc-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Search Textbook Index</span>
                <button onClick={() => setShowSearchBox(false)} className="p-1 text-zinc-500 hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </div>

              <form onSubmit={handleTextSearch} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. standing waves, calculus..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-950 text-white border border-zinc-800 rounded-lg focus:outline-none focus:border-rose-400"
                />
                <button type="submit" className="px-3 bg-rose-400/20 text-rose-300 hover:bg-rose-400/30 text-xs font-semibold rounded-lg border border-rose-400/30 cursor-pointer">
                  Query
                </button>
              </form>

              {searchResults.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {searchResults.map((matchObj, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => {
                        setCurrentPage(matchObj.page);
                        setShowSearchBox(false);
                      }}
                      className="text-left py-2 px-2.5 bg-zinc-950/50 hover:bg-zinc-800 text-[10px] text-gray-300 rounded border border-zinc-800 transition-colors"
                    >
                      <div className="font-mono text-rose-400 font-semibold uppercase mb-0.5">PAGE {matchObj.page}</div>
                      {matchObj.matches.map((matchText, mIdx) => (
                        <p key={mIdx} className="line-clamp-2 italic text-gray-400">"{matchText}"</p>
                      ))}
                    </button>
                  ))}
                </div>
              ) : searchQuery && (
                <p className="text-[10px] text-gray-500 text-center italic py-2">No results matching term.</p>
              )}
            </div>
          )}

          {/* Bookmark placement selection overlays */}
          {showBookmarkAdder && (
            <div className="absolute top-4 left-4 z-35 w-72 bg-zinc-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Add Study Bookmark</span>
                <button onClick={() => setShowBookmarkAdder(false)} className="p-1 text-zinc-500 hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  required
                  value={newBookmarkLabel}
                  onChange={(e) => setNewBookmarkLabel(e.target.value)}
                  placeholder="e.g. Chapter 1 Formula Summary"
                  className="px-2.5 py-1.5 text-xs bg-zinc-950 text-white border border-zinc-800 rounded-lg focus:outline-none focus:border-rose-400"
                />

                <select
                  value={newBookmarkCat}
                  onChange={(e) => setNewBookmarkCat(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-zinc-950 text-white border border-zinc-800 rounded-lg focus:outline-none focus:border-rose-400"
                >
                  <option value="Revision Alert">Revision Alert</option>
                  <option value="Difficult Topic">Difficult Topic</option>
                  <option value="NESA Exam Prep">NESA Exam Prep</option>
                  <option value="Key Highlight">Key Highlight</option>
                </select>

                <button 
                  onClick={handleAddBookmark}
                  className="py-1.5 bg-[#FFD1DC] text-[#1C1C1E] text-xs font-semibold rounded-lg hover:bg-[#ffb9ca] transition-colors cursor-pointer"
                >
                  Set Bookmark On Page {currentPage}
                </button>
              </div>
            </div>
          )}

          {/* Loading panel */}
          {pdfLoading && (
            <div className="flex flex-col items-center gap-2.5 p-6 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse text-xs text-gray-400 font-mono">
              <div className="w-8 h-8 rounded-full border-2 border-[#FFD1DC] border-t-transparent animate-spin mb-1" />
              Rendering PDF.js Streams...
            </div>
          )}

          {/* Render error handling templates */}
          {pdfError && (
            <div className="max-w-md p-6 bg-zinc-900 rounded-xl border border-red-950/60 text-center flex flex-col gap-3">
              <AlertTriangle className="text-red-500 mx-auto" size={36} />
              <div className="text-red-400 text-xs font-semibold uppercase tracking-wider font-mono">
                TEXTBOOK INITIALIZATION FAILED
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {pdfError}
              </p>
              <button 
                onClick={onClose}
                className="py-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors cursor-pointer mx-auto"
              >
                Return to Library Shelf
              </button>
            </div>
          )}

          {/* Core Textbook Double / Single container frame sits here */}
          {!pdfLoading && !pdfError && (
            <div 
              style={{ transform: `scale(${zoomLevel})` }}
              className="flex items-center justify-center transition-all duration-300 ease-out origin-center"
            >
              
              {/* Dynamic Physical Book open view mockup container */}
              <div className="relative flex flex-col sm:flex-row shadow-2xl rounded-xl overflow-visible max-w-5xl bg-white scale-[0.98] sm:scale-100 transition-transform">
                
                {/* Physical binding leather line shadows behind layout (simulates book-depth thickness stacking in paper sheets) */}
                <div className="absolute -inset-1.5 border border-zinc-900/35 rounded-xl bg-zinc-900/40 -z-5 blur-sm" />
                <div className="absolute -right-3 bottom-2 top-2 w-3 bg-zinc-800/80 rounded-r border-r border-[#1C1C1E] -z-10 shadow-md transform skew-y-3" />
                <div className="absolute -left-3 bottom-2 top-2 w-3 bg-zinc-800/80 rounded-l border-l border-[#1C1C1E] -z-10 shadow-md transform -skew-y-3" />

                {/* DOUBLE PAGE VIEW */}
                {readingMode === 'double' ? (
                  <>
                    {/* LEFT PAGE CARD */}
                    <div className="w-[340px] sm:w-[410px] md:w-[460px] h-[550px] relative overflow-hidden bg-[#FAF9F5] border-r border-gray-200/80 book-page-left flex-shrink-0 select-text">
                      {/* PDFjs Render layer */}
                      {!isMockBook && (
                        <canvas ref={LeftPdfCanvasRef} className="absolute inset-0 w-full h-full object-cover" />
                      )}

                      {/* Mock Syllabus Page content */}
                      {isMockBook && mockPages[currentPage - 1] && (
                        renderMockPageContent(currentPage, mockPages[currentPage - 1])
                      )}

                      {/* Draggable Post-it sticky notes layer inside left page boundaries */}
                      <div className="absolute inset-0 pointer-events-none z-30">
                        {notes.filter(n => n.page === currentPage).map(note => (
                          <div
                            key={note.id}
                            id={`draggable-postit-${note.id}`}
                            className="absolute pointer-events-auto p-2.5 w-32 rounded-lg shadow-md border border-yellow-300/40 text-left font-serif text-[10px] flex flex-col gap-1 transition-all"
                            style={{ 
                              left: `${note.x}%`, 
                              top: `${note.y}%`, 
                              backgroundColor: note.color,
                            }}
                            onMouseDown={(e) => {
                              // Enable drag triggers on post-it
                              setActiveNoteDragId(note.id);
                              e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center justify-between border-b border-black/5 pb-1 select-none">
                              <div className="flex gap-1">
                                {['#FFF9A6', '#FFD1DC', '#E0FFFF', '#F0FFF0'].map(cc => (
                                  <button
                                    key={cc}
                                    onClick={() => handleUpdateNoteColor(note.id, cc)}
                                    className="w-2 h-2 rounded-full border border-black/10 cursor-pointer"
                                    style={{ backgroundColor: cc }}
                                  />
                                ))}
                              </div>
                              <button 
                                onClick={() => handleDeleteSticky(note.id)} 
                                className="text-zinc-500 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                            <textarea
                              value={note.content}
                              onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                              className="w-full bg-transparent border-0 resize-none outline-none focus:ring-0 p-0 text-[10px] leading-tight font-serif"
                              rows={4}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Canvas drawing overlay layer */}
                      <DrawingCanvas
                        bookId={book.id}
                        page={currentPage}
                        tool={activeTool}
                        color={brushColor}
                        strokeWidth={brushWidth}
                        isActive={true}
                      />

                      {/* Bookmark Ribbon Flag overlay if page bookmarked */}
                      {isLeftPageBookmarked && (
                        <div className="absolute top-0 right-4 z-30 w-6 h-10 bg-rose-400 shadow-md flex items-center justify-center text-white text-[9px] font-sans rounded-b select-none">
                          <BookmarkCheck size={12} className="mt-1" />
                        </div>
                      )}
                    </div>

                    {/* PHYSICAL MID-SPINE SHADOW SEPARATOR */}
                    <div className="hidden sm:block absolute top-0 bottom-0 left-1/2 -ml-[15px] w-[30px] z-30 pointer-events-none book-spine-shadow" />

                    {/* RIGHT PAGE CARD */}
                    <div className="w-[340px] sm:w-[410px] md:w-[460px] h-[550px] relative overflow-hidden bg-[#FAF9F5] book-page-right flex-shrink-0 select-text">
                      {/* Check page boundaries parameters */}
                      {currentPage + 1 <= totalPages ? (
                        <>
                          {/* PDFjs Render layer */}
                          {!isMockBook && (
                            <canvas ref={RightPdfCanvasRef} className="absolute inset-0 w-full h-full object-cover" />
                          )}

                          {/* Mock Syllabus text render */}
                          {isMockBook && mockPages[currentPage] && (
                            renderMockPageContent(currentPage + 1, mockPages[currentPage])
                          )}

                          {/* Sticky Notes page 2 */}
                          <div className="absolute inset-0 pointer-events-none z-30">
                            {notes.filter(n => n.page === currentPage + 1).map(note => (
                              <div
                                key={note.id}
                                id={`draggable-postit-${note.id}`}
                                className="absolute pointer-events-auto p-2.5 w-32 rounded-lg shadow-md border border-yellow-300/40 text-left font-serif text-[10px] flex flex-col gap-1 transition-all"
                                style={{ 
                                  left: `${note.x}%`, 
                                  top: `${note.y}%`, 
                                  backgroundColor: note.color,
                                }}
                                onMouseDown={(e) => {
                                  setActiveNoteDragId(note.id);
                                  e.stopPropagation();
                                }}
                              >
                                <div className="flex items-center justify-between border-b border-black/5 pb-1 select-none">
                                  <div className="flex gap-1">
                                    {['#FFF9A6', '#FFD1DC', '#E0FFFF', '#F0FFF0'].map(cc => (
                                      <button
                                        key={cc}
                                        onClick={() => handleUpdateNoteColor(note.id, cc)}
                                        className="w-2 h-2 rounded-full border border-black/10 cursor-pointer"
                                        style={{ backgroundColor: cc }}
                                      />
                                    ))}
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteSticky(note.id)} 
                                    className="text-zinc-500 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                                <textarea
                                  value={note.content}
                                  onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                                  className="w-full bg-transparent border-0 resize-none outline-none focus:ring-0 p-0 text-[10px] leading-tight font-serif"
                                  rows={4}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Drawings overlay canvas */}
                          <DrawingCanvas
                            bookId={book.id}
                            page={currentPage + 1}
                            tool={activeTool}
                            color={brushColor}
                            strokeWidth={brushWidth}
                            isActive={true}
                          />

                          {/* Bookmark Ribbon */}
                          {isRightPageBookmarked && (
                            <div className="absolute top-0 right-4 z-30 w-6 h-10 bg-rose-400 shadow-md flex items-center justify-center text-white text-[9px] font-sans rounded-b select-none">
                              <BookmarkCheck size={12} className="mt-1" />
                            </div>
                          )}
                        </>
                      ) : (
                        /* Blank/Japanese logo back cover of the open book if odd pages count */
                        <div className="w-full h-full bg-[#FAF9F5] p-10 flex flex-col items-center justify-center select-none text-center">
                          <span className="text-[#E7DBCA] text-8xl font-serif">印</span>
                          <h4 className="text-sm font-semibold tracking-wide text-gray-400 mt-4 uppercase">
                            FLIPSTUDY END PAPER
                          </h4>
                          <p className="text-xs text-gray-300 font-mono mt-1">
                            HSC 2027 Syllabus Curriculum Completed
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  
                  /* SINGLE PAGE VIEW MODE Layout */
                  <div className="w-[340px] sm:w-[430px] md:w-[480px] h-[550px] relative overflow-hidden bg-[#FAF9F5] book-page-left select-text">
                    {/* Render page */}
                    {!isMockBook && (
                      <canvas ref={SinglePdfCanvasRef} className="absolute inset-0 w-full h-full object-cover" />
                    )}

                    {isMockBook && mockPages[currentPage - 1] && (
                      renderMockPageContent(currentPage, mockPages[currentPage - 1])
                    )}

                    {/* Draggable Post-it sticky notes layer in single page boundary */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                      {notes.filter(n => n.page === currentPage).map(note => (
                        <div
                          key={note.id}
                          id={`draggable-postit-${note.id}`}
                          className="absolute pointer-events-auto p-2.5 w-32 rounded-lg shadow-md border border-yellow-300/40 text-left font-serif text-[10px] flex flex-col gap-1 transition-all"
                          style={{ 
                            left: `${note.x}%`, 
                            top: `${note.y}%`, 
                            backgroundColor: note.color,
                          }}
                          onMouseDown={(e) => {
                            setActiveNoteDragId(note.id);
                            e.stopPropagation();
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-black/5 pb-1 select-none">
                            <div className="flex gap-1">
                              {['#FFF9A6', '#FFD1DC', '#E0FFFF', '#F0FFF0'].map(cc => (
                                <button
                                  key={cc}
                                  onClick={() => handleUpdateNoteColor(note.id, cc)}
                                  className="w-2 h-2 rounded-full border border-black/10 cursor-pointer"
                                  style={{ backgroundColor: cc }}
                                />
                              ))}
                            </div>
                            <button 
                              onClick={() => handleDeleteSticky(note.id)} 
                              className="text-zinc-500 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <textarea
                            value={note.content}
                            onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                            className="w-full bg-transparent border-0 resize-none outline-none focus:ring-0 p-0 text-[10px] leading-tight font-serif"
                            rows={4}
                          />
                        </div>
                      ))}
                    </div>

                    <DrawingCanvas
                      bookId={book.id}
                      page={currentPage}
                      tool={activeTool}
                      color={brushColor}
                      strokeWidth={brushWidth}
                      isActive={true}
                    />

                    {isLeftPageBookmarked && (
                      <div className="absolute top-0 right-4 z-30 w-6 h-10 bg-rose-400 shadow-md flex items-center justify-center text-white text-[9px] font-sans rounded-b select-none">
                        <BookmarkCheck size={12} className="mt-1" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Nav overlays (Interactive floating bottom book controllers) */}
          <div className="absolute bottom-5 z-30 flex items-center gap-4 bg-[#141416]/95 backdrop-blur border border-zinc-800 rounded-full px-5 py-2.5 shadow-2xl select-none">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1 || pdfLoading}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-gray-300 disabled:opacity-20 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="text-xs font-mono text-gray-300 tracking-wider flex items-center gap-1.5">
              <span>PAGE</span>
              <span className="font-semibold text-rose-300 text-sm">
                {currentPage}
              </span>
              {readingMode === 'double' && currentPage + 1 <= totalPages && (
                <>
                  <span>-</span>
                  <span className="font-semibold text-rose-300 text-sm">
                    {currentPage + 1}
                  </span>
                </>
              )}
              <span className="text-gray-600">/</span>
              <span>{totalPages}</span>
            </div>

            <button
              onClick={nextPage}
              disabled={(readingMode === 'double' ? currentPage + 2 > totalPages : currentPage + 1 > totalPages) || pdfLoading}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-gray-300 disabled:opacity-20 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Bookmarks, Note Cards and Chapter Outlines Sidebar Drawer */}
      {showThumbnails && (
        <div className="w-80 bg-[#161619] border-l border-zinc-900 flex flex-col justify-between rounded-r-2xl shadow-2xl select-none z-30 flex-shrink-0 animate-slide-in">
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Outline Header */}
            <div className="flex items-center justify-between p-4.5 border-b border-zinc-900 bg-zinc-950">
              <div className="flex items-center gap-1.5">
                <BookmarkIcon size={14} className="text-[#FFD1DC]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Outline & Annotations</span>
              </div>
              <button 
                onClick={() => setShowThumbnails(false)}
                className="p-1 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Outlines Navigation Tabs */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              
              {/* Study Notes segment */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-mono tracking-wider text-gray-500 uppercase">
                  Textbook Study Notes ({notes.length})
                </span>

                <div className="flex flex-col gap-2">
                  {notes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => setCurrentPage(note.page)}
                      className="text-left p-2.5 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/60 rounded-xl transition-all"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-mono font-semibold text-rose-300 uppercase">PAGE {note.page}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: note.color }} />
                      </div>
                      <p className="text-[10px] text-gray-300 font-serif line-clamp-2">
                        {note.content || 'Blank post-it note...'}
                      </p>
                    </button>
                  ))}

                  {notes.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic text-center py-2">No active stick-it notes placed.</p>
                  )}
                </div>
              </div>

              {/* Bookmarks Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-mono tracking-wider text-gray-500 uppercase">
                  Saved Bookmarks ({bookmarks.length})
                </span>

                <div className="flex flex-col gap-2">
                  {bookmarks.map((mark) => (
                    <div 
                      key={mark.id}
                      onClick={() => setCurrentPage(mark.page)}
                      className="group flex items-center justify-between p-2.5 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 rounded-xl cursor-all transition-all"
                    >
                      <div className="text-left">
                        <div className="text-[9px] font-mono text-[#CBBCA9] font-medium uppercase">{mark.category}</div>
                        <h4 className="text-[10px] font-semibold text-gray-200 mt-0.5 max-w-[150px] truncate">{mark.label}</h4>
                        <span className="text-[8px] font-mono text-zinc-500">Page {mark.page}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteBookmark(mark.id, e)}
                        className="p-1 rounded opacity-40 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                        title="Delete Bookmark"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {bookmarks.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic text-center py-2">No pages bookmarked.</p>
                  )}
                </div>
              </div>

              {/* Simulated Syllabus ToC structure if mock study book */}
              {isMockBook && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-mono tracking-wider text-gray-500 uppercase">
                    Table of Contents / 目次
                  </span>

                  <div className="flex flex-col gap-1.5">
                    {mockPages.map((pageObj, pageIdx) => (
                      <button
                        key={pageIdx}
                        onClick={() => setCurrentPage(pageIdx + 1)}
                        className={`text-left text-[11px] font-medium py-1.5 px-2.5 rounded-lg border transition-all truncate cursor-pointer ${
                          currentPage === pageIdx + 1 
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold' 
                            : 'bg-zinc-950/15 text-gray-400 border-transparent hover:bg-zinc-900 hover:text-gray-200'
                        }`}
                      >
                        {pageIdx + 1}. {pageObj.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick reading help advice */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950/50 text-[10px] text-zinc-500 leading-normal font-sans text-center">
            Annotations & notes save automatically inside secure browser storage.
          </div>
        </div>
      )}
    </div>
  );
}
