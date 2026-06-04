import React, { useState, useEffect } from 'react';
import { Book, Category } from '../types';
import { dbInstance } from '../db';
import { 
  X, Plus, Trash2, Edit3, Image, FileText, Star, 
  ArrowUp, ArrowDown, Download, Upload, RefreshCw, Zap
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshLibrary: () => void;
  categories: Category[];
  books: Book[];
}

export default function AdminPanel({ isOpen, onClose, onRefreshLibrary, categories, books }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'books' | 'categories' | 'backup'>('books');
  
  // Custom states for adding/editing a book
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [coverFileName, setCoverFileName] = useState('');
  const [coverBase64, setCoverBase64] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  // Custom states for category
  const [newCatName, setNewCatName] = useState('');
  
  // Reset fields
  const resetForm = () => {
    setEditingBookId(null);
    setTitle('');
    setCategory(categories[0]?.name || 'Physics');
    setIsFeatured(false);
    setCoverFileName('');
    setCoverBase64('');
    setPdfFileName('');
    setPdfBlob(null);
  };

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
  }, [categories]);

  // Handle Cover Upload (to Base64 image)
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle PDF Upload
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    setPdfBlob(file);
  };

  // Save Book
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category.trim()) {
      alert('Please fill in required fields.');
      return;
    }

    const trimmedCategory = category.trim();
    const bookId = editingBookId || 'book_' + Date.now();
    let finalCover = coverBase64;
    
    // If we're creating new books and haven't uploaded an image, let's auto-generate a beautiful minimalist color gradient!
    if (!finalCover) {
      const gradients = [
        'linear-gradient(135deg, #FFD1DC 0%, #FFA07A 100%)', // Orange/Rose
        'linear-gradient(135deg, #FFE4E1 0%, #D8BFD8 100%)', // Lavender
        'linear-gradient(135deg, #FAF0E6 0%, #C8B9A6 100%)', // Wood
        'linear-gradient(135deg, #E0FFFF 0%, #B0C4DE 100%)', // Tokyo Sky
        'linear-gradient(135deg, #111827 0%, #374151 100%)'  // Midnight
      ];
      finalCover = gradients[Math.floor(Math.random() * gradients.length)];
    }

    const currentBook = books.find(b => b.id === bookId);
    const finalPdf = pdfBlob || currentBook?.pdfFile || 'mock-physics';

    const bookToSave: Book = {
      id: bookId,
      title: title.trim(),
      category: trimmedCategory,
      coverImage: finalCover,
      pdfFile: finalPdf,
      isFeatured,
      createdAt: currentBook?.createdAt || Date.now(),
      order: currentBook?.order || (books.length + 1)
    };

    // Auto-save category to DB if it doesn't exist
    const catExists = categories.some(c => c.name.toLowerCase() === trimmedCategory.toLowerCase());
    if (!catExists) {
      await dbInstance.saveCategory({
        id: 'cat_' + Date.now(),
        name: trimmedCategory
      });
    }

    await dbInstance.saveBook(bookToSave);
    resetForm();
    onRefreshLibrary();
    alert('Textbook saved successfully!');
  };

  // Delete Book
  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to delete this textbook? This will permanently erase the book and all its associated drawings, sticky notes, and bookmarks.')) {
      try {
        // Delete all notes for this book
        const notesList = await dbInstance.getNotesForBook(id);
        for (const n of notesList) {
          await dbInstance.deleteNote(n.id);
        }

        // Delete all bookmarks for this book
        const bookmarksList = await dbInstance.getBookmarksForBook(id);
        for (const b of bookmarksList) {
          await dbInstance.deleteBookmark(b.id);
        }

        // Delete drawings
        // Up to 50 pages or total pages to be safe, clean all drawing keys
        for (let p = 1; p <= 50; p++) {
          await dbInstance.deleteDrawing(id, p);
        }

        // Delete the book itself
        await dbInstance.deleteBook(id);
        onRefreshLibrary();
        alert('Textbook deleted successfully!');
      } catch (err) {
        console.warn('Error during book deletion: ', err);
        alert('Could not delete textbook. Please try again.');
      }
    }
  };

  // Select Book for Editing
  const startEditBook = (book: Book) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setCategory(book.category);
    setIsFeatured(book.isFeatured);
    setCoverBase64(book.coverImage.startsWith('data:') ? book.coverImage : '');
    setCoverFileName(book.coverImage.startsWith('data:') ? 'uploaded_cover.png' : 'Preloaded Gradient');
    setPdfFileName(book.pdfFile instanceof Blob ? 'Uploaded PDF Document' : 'Preloaded Textbook System');
    setPdfBlob(null);
  };

  // Shift order of book (Up / Down)
  const adjustOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= books.length) return;

    const currentBook = { ...books[index] };
    const siblingBook = { ...books[targetIndex] };

    // Swap ordering parameters
    const temp = currentBook.order || 0;
    currentBook.order = siblingBook.order || 0;
    siblingBook.order = temp;

    await dbInstance.saveBook(currentBook);
    await dbInstance.saveBook(siblingBook);
    onRefreshLibrary();
  };

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cleanName = newCatName.trim();
    if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      alert('Category already exists!');
      return;
    }

    await dbInstance.saveCategory({
      id: 'cat_' + Date.now(),
      name: cleanName
    });
    setNewCatName('');
    onRefreshLibrary();
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Delete the "${name}" category? Books in this category will remain, but the category selector will be cleaned.`)) {
      await dbInstance.deleteCategory(id);
      onRefreshLibrary();
    }
  };

  // Backup data - Export whole library including drawings/notes as JSON!
  const exportLibrary = async () => {
    try {
      const allBooks = await dbInstance.getAllBooks();
      const exportData = [];
      
      // Convert blobs to serializable form for backup
      for (const b of allBooks) {
        let pdfData: string | null = null;
        if (b.pdfFile instanceof Blob) {
          pdfData = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(b.pdfFile as Blob);
          });
        }

        exportData.push({
          id: b.id,
          title: b.title,
          category: b.category,
          coverImage: b.coverImage,
          pdfData: pdfData,
          isFeatured: b.isFeatured,
          order: b.order,
          createdAt: b.createdAt
        });
      }

      const allCategories = await dbInstance.getAllCategories();
      const completeBackup = {
        version: '1.0',
        exportedAt: Date.now(),
        books: exportData,
        categories: allCategories
      };

      const blob = new Blob([JSON.stringify(completeBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flipstudy_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exporting library data: ' + err);
    }
  };

  // Restore data from loaded JSON
  const importLibrary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          if (!raw.books || !raw.categories) {
            alert('Invalid backup structure!');
            return;
          }

          // Restore categories
          for (const c of raw.categories) {
            await dbInstance.saveCategory(c);
          }

          // Restore books with reconstructed PDF Blobs
          for (const b of raw.books) {
            let pdfFile: Blob | string = 'mock-physics';
            if (b.pdfData && b.pdfData.startsWith('data:')) {
              const response = await fetch(b.pdfData);
              pdfFile = await response.blob();
            }

            await dbInstance.saveBook({
              id: b.id,
              title: b.title,
              category: b.category,
              coverImage: b.coverImage,
              pdfFile: pdfFile,
              isFeatured: b.isFeatured,
              order: b.order,
              createdAt: b.createdAt
            });
          }

          alert('FlipStudy library restored successfully!');
          onRefreshLibrary();
        } catch (je) {
          alert('JSON Parse Error: ' + je);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Error reading backup file: ' + err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-[#121214]/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-[#1C1A18] rounded-2xl shadow-xl border border-[#E5E0D5] dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D5] dark:border-zinc-850 bg-[#F3EFE7] dark:bg-[#121110]">
          <div className="flex items-center gap-2">
            <span className="text-[#FFD1DC] text-2xl font-serif">印</span>
            <div>
              <h2 className="text-lg font-bold font-sans tracking-tight text-[#333333] dark:text-white">
                Admin Library Center
              </h2>
              <p className="text-[10px] uppercase font-mono tracking-wider text-[#7B746B] dark:text-gray-500">管理者コンソール</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Console Navigation */}
        <div className="flex border-b border-[#E5E0D5] dark:border-zinc-800 bg-white dark:bg-[#1A1816]">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 py-3 text-sm font-medium tracking-tight border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'books'
                ? 'border-[#FFD1DC] text-[#333333] dark:text-white font-extrabold'
                : 'border-transparent text-[#7B746B] hover:text-gray-600'
            }`}
          >
            Manage Textbooks ({books.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 text-sm font-medium tracking-tight border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'border-[#FFD1DC] text-[#333333] dark:text-white font-extrabold'
                : 'border-transparent text-[#7B746B] hover:text-gray-600'
            }`}
          >
            Manage Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 text-sm font-medium tracking-tight border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'border-[#FFD1DC] text-[#333333] dark:text-white font-extrabold'
                : 'border-transparent text-[#7B746B] hover:text-gray-600'
            }`}
          >
            Data Backup & Export
          </button>
        </div>

        {/* Console Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F9F7F2] dark:bg-[#121110]">
          {activeTab === 'books' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add/Edit Book Form (5 columns) */}
              <form onSubmit={handleSaveBook} className="lg:col-span-5 bg-white dark:bg-[#1C1C22] p-5 rounded-xl border border-[#E9E4DB] dark:border-[#2C2C32] flex flex-col gap-4">
                <span className="text-xs uppercase font-mono tracking-wider text-gray-400">
                  {editingBookId ? 'Edit Textbook' : 'Create New Textbook'}
                </span>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Book Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. HSC 2027 Advanced Mathematics"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-[#FFD1DC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Academic Subject Category <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    list="admin-category-suggestions"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Type customized subject manually or choose..."
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-[#FFD1DC] text-black dark:text-white"
                  />
                  <datalist id="admin-category-suggestions">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {/* Cover Image Upload (Base64) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Minimalist Cover Image (PNG/JPEG)
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer text-xs text-gray-500">
                      <Image size={15} />
                      <span className="truncate">{coverFileName || 'Select custom cover art...'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleCoverChange} 
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      If left empty, a gorgeous minimalist geometric color gradient is generated.
                    </p>
                  </div>
                </div>

                {/* PDF Resource File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    NESA Syllabus PDF Document (.pdf)
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer text-xs text-gray-500">
                      <FileText size={15} />
                      <span className="truncate">{pdfFileName || 'Choose Textbook PDF...'}</span>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        onChange={handlePdfChange} 
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      If empty, FlipStudy will dynamically generate immersive educational pages!
                    </p>
                  </div>
                </div>

                {/* Highlight/Featured book */}
                <div className="flex items-center justify-between py-1 px-1 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 ml-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Highlight in Shelf Shelf?</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded text-rose-400 focus:ring-rose-300 border-gray-300"
                  />
                </div>

                {/* Buttons controls */}
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-1.5 text-xs font-medium border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer text-gray-600 dark:text-gray-300"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 text-xs font-semibold bg-[#FFD1DC] text-[#1C1C1E] rounded-lg hover:bg-[#ffb9ca] cursor-pointer shadow-sm transition-colors"
                  >
                    {editingBookId ? 'Update Textbook' : 'Create Textbook'}
                  </button>
                </div>
              </form>

              {/* Books List (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase font-mono tracking-wider text-gray-400">
                    Active Library Books ({books.length})
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Use Up/Down controls to reorder bookshelf books
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {books.map((b, index) => (
                    <div 
                      key={b.id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#1C1C22] rounded-xl border border-[#E9E4DB] dark:border-[#2C2C32] hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {/* Little Miniature Card Cover */}
                        <div 
                          className="w-10 h-14 rounded-md shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ background: b.coverImage.startsWith('linear-gradient') ? b.coverImage : 'transparent' }}
                        >
                          {!b.coverImage.startsWith('linear-gradient') && (
                            <img src={b.coverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          {b.coverImage.startsWith('linear-gradient') && (
                            <span className="text-[7px] font-serif text-gray-400 select-none">HSC</span>
                          )}
                        </div>

                        <div className="max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xs">
                          <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {b.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-md">
                              {b.category}
                            </span>
                            {b.isFeatured && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-md flex items-center gap-0.5">
                                <Star size={8} className="fill-amber-500 text-amber-500" /> Featured
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-gray-400">
                              {b.pdfFile instanceof Blob ? 'Custom Web PDF' : 'Mock Syllabus'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls (Order + Edit + Delete) */}
                      <div className="flex items-center gap-1">
                        {/* Order adjustment buttons */}
                        <button
                          disabled={index === 0}
                          onClick={() => adjustOrder(index, 'up')}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move up on shelf"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          disabled={index === books.length - 1}
                          onClick={() => adjustOrder(index, 'down')}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move down on shelf"
                        >
                          <ArrowDown size={13} />
                        </button>

                        <div className="h-4 w-[1px] bg-gray-200 dark:bg-zinc-800 mx-1" />

                        {/* Edit & delete buttons */}
                        <button
                          onClick={() => startEditBook(b)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#CBBCA9] hover:text-rose-500 cursor-pointer"
                          title="Edit textbook parameters"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(b.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Delete textbook"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {books.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400 bg-white dark:bg-[#1C1C22] rounded-xl border border-dashed border-[#E9E4DB] dark:border-[#2C2C32]">
                      No textbooks loaded. Create one on the left to get started!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="max-w-xl mx-auto flex flex-col gap-6">
              {/* Category form */}
              <form onSubmit={handleAddCategory} className="bg-white dark:bg-[#1C1C22] p-5 rounded-xl border border-[#E9E4DB] dark:border-[#2C2C32] flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Create New Subject Category
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Mathematics Extension 2, Economics, English..."
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-[#FFD1DC]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 mt-5 bg-[#FFD1DC] text-[#1C1C1E] text-xs font-semibold rounded-lg hover:bg-[#ffb9ca] shadow-sm transition-colors cursor-pointer self-start"
                >
                  Add Subject
                </button>
              </form>

              {/* Categories list */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-gray-400">
                  Existing Academic Categories
                </span>
                
                <div className="flex flex-wrap gap-2.5 p-4 bg-white dark:bg-[#1C1C22] rounded-xl border border-[#E9E4DB] dark:border-[#2C2C32]">
                  {categories.map((c) => (
                    <div 
                      key={c.id} 
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF9F5] dark:bg-zinc-900 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-800 rounded-full"
                    >
                      <span>{c.name}</span>
                      {['Physics', 'Mathematics', 'Chemistry', 'Biology'].includes(c.name) ? (
                        <span className="text-[8px] text-gray-400 font-serif select-none" title="Built-in System Category">(System)</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="max-w-xl mx-auto flex flex-col gap-6">
              <div className="bg-white dark:bg-[#1C1C22] p-6 rounded-xl border border-[#E9E4DB] dark:border-[#2C2C32]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Backup and Migrate Library
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Export your entire digital shelf as a single consolidated JSON archive. 
                  This backup is highly protective and captures user uploaded textbooks, cover art configurations, categories list structure, annotations, bookmarks, and settings.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Backup export key */}
                  <button
                    onClick={exportLibrary}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FAF9F5] dark:bg-zinc-900 hover:bg-[#F3ECE0] dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-200 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} className="text-[#CBBCA9]" />
                    Export Local Library JSON
                  </button>

                  {/* Backup import key */}
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FFD1DC]/10 dark:bg-rose-950/10 hover:bg-[#FFD1DC]/20 dark:hover:bg-rose-950/20 border border-dashed border-rose-300 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 rounded-lg shadow-sm transition-all cursor-pointer text-center">
                    <Upload size={14} className="text-[#FFD1DC]" />
                    <span>Upload & Restore Archive</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={importLibrary} 
                    />
                  </label>
                </div>
              </div>

              {/* Reset database */}
              <div className="bg-red-50 dark:bg-rose-950/5 p-6 rounded-xl border border-red-100 dark:border-rose-950/40">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1.5">
                  <Zap size={14} /> Clear Local Database
                </h3>
                <p className="text-xs text-red-600 dark:text-rose-300/80 leading-relaxed mb-4">
                  This operation deletes all saved book drawings, canvas overlays, post-it notes, bookmarks list, custom added PDFs, and custom subjects. The default mock textbook catalog will reinitialize on your next visit. This operation is irreversible.
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('CRITICAL WARN: Are you absolutely certain you want to purge all local library state? This resets FlipStudy back to fresh state.')) {
                      await dbInstance.clearAllData();
                      alert('Purge complete! Reloading...');
                      window.location.reload();
                    }
                  }}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Purge & Restore Factory Seed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
