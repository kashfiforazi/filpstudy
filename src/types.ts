export interface Book {
  id: string;
  title: string;
  category: string;
  coverImage: string; // Base64 data URL or standard local asset URL
  pdfFile: Blob | string; // Stored file Blob or preloaded URL path
  isFeatured: boolean;
  order?: number;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  bookId: string;
  page: number;
  content: string;
  x: number; // Percent positioning inside the page
  y: number; // Percent positioning inside the page
  color: string; // Hex color code or Tailwind name wrapper
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  label: string;
  category: string;
  createdAt: number;
}

export interface DrawingData {
  bookId: string;
  page: number;
  canvasData: string; // PNG Base64 data URL
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  readingMode: 'single' | 'double';
  lastBookId: string | null;
  lastPage: number;
}

export interface Category {
  id: string;
  name: string;
}
