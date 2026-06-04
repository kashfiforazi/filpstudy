import { Book, StickyNote, Bookmark, DrawingData } from './types';

const DB_NAME = 'FlipStudy_DB';
const DB_VERSION = 2;

export class LibraryDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Books store
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }

        // Bookmarks store
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }

        // Drawings store - composite key bookId + page
        if (!db.objectStoreNames.contains('drawings')) {
          db.createObjectStore('drawings', { keyPath: 'id' });
        }

        // Custom categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- Books Management ---
  async getAllBooks(): Promise<Book[]> {
    const store = await this.getStore('books');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getBook(id: string): Promise<Book | undefined> {
    const store = await this.getStore('books');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBook(book: Book): Promise<void> {
    const store = await this.getStore('books', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBook(id: string): Promise<void> {
    const store = await this.getStore('books', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sticky Notes Management ---
  async getNotesForBook(bookId: string): Promise<StickyNote[]> {
    const store = await this.getStore('notes');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allNotes = request.result as StickyNote[];
        resolve(allNotes.filter(n => n.bookId === bookId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveNote(note: StickyNote): Promise<void> {
    const store = await this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id: string): Promise<void> {
    const store = await this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Bookmarks Management ---
  async getBookmarksForBook(bookId: string): Promise<Bookmark[]> {
    const store = await this.getStore('bookmarks');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result as Bookmark[];
        resolve(all.filter(b => b.bookId === bookId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const store = await this.getStore('bookmarks', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(bookmark);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBookmark(id: string): Promise<void> {
    const store = await this.getStore('bookmarks', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Drawings Management ---
  async getDrawing(bookId: string, page: number): Promise<DrawingData | null> {
    const store = await this.getStore('drawings');
    const id = `${bookId}_${page}`;
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDrawing(bookId: string, page: number, canvasData: string): Promise<void> {
    const store = await this.getStore('drawings', 'readwrite');
    const id = `${bookId}_${page}`;
    return new Promise((resolve, reject) => {
      const request = store.put({ id, bookId, page, canvasData });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDrawing(bookId: string, page: number): Promise<void> {
    const store = await this.getStore('drawings', 'readwrite');
    const id = `${bookId}_${page}`;
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Categories ---
  async getAllCategories(): Promise<{ id: string, name: string }[]> {
    const store = await this.getStore('categories');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCategory(category: { id: string, name: string }): Promise<void> {
    const store = await this.getStore('categories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(category);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const store = await this.getStore('categories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Backup & Restore / Database Clear ---
  async clearAllData(): Promise<void> {
    const db = await this.init();
    const stores = ['books', 'notes', 'bookmarks', 'drawings', 'categories'];
    const transaction = db.transaction(stores, 'readwrite');
    
    return new Promise<void>((resolve, reject) => {
      let completed = 0;
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }
}

export const dbInstance = new LibraryDB();
