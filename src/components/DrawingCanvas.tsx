import React, { useRef, useState, useEffect } from 'react';
import { dbInstance } from '../db';

interface DrawingCanvasProps {
  bookId: string;
  page: number;
  tool: 'pencil' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | null;
  color: string;
  strokeWidth: number;
  isActive: boolean;
}

export default function DrawingCanvas({
  bookId,
  page,
  tool,
  color,
  strokeWidth,
  isActive
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Load drawings from database whenever bookId or page shifts
  useEffect(() => {
    let active = true;
    const loadDrawing = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure crisp canvas dimensions aligned with actual DOM sizing
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Clear existing canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        const data = await dbInstance.getDrawing(bookId, page);
        if (data && active) {
          const img = new Image();
          img.onload = () => {
            if (active) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          };
          img.src = data.canvasData;
        }
      } catch (err) {
        console.warn('Error loading page drawing: ', err);
      }
    };

    loadDrawing();

    // Re-trigger load on resize
    const handleResize = () => {
      loadDrawing();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [bookId, page]);

  // Serializes current canvas state to IndexedDB with debounce
  const saveCanvasData = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL();
      // If the canvas is blank/cleared, delete it from the DB to preserve storage
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const allBlank = !buffer.data.some(channelValue => channelValue !== 0);
        if (allBlank) {
          await dbInstance.deleteDrawing(bookId, page);
          return;
        }
      }
      await dbInstance.saveDrawing(bookId, page, dataUrl);
    } catch (e) {
      console.warn('Failed to serialise drawing layer: ', e);
    }
  };

  // Convert raw client coordinates to canvas space coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!tool || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent default scrolling on mobile touch interaction
    if (e.cancelable) e.preventDefault();

    setIsDrawing(true);
    const coords = getCoordinates(e);
    setStartX(coords.x);
    setStartY(coords.y);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    // Configure stroke styling properties
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'highlighter') {
      ctx.strokeStyle = color.startsWith('#') ? hexToRgba(color, 0.45) : color;
      ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 2.5; // Bigger clear surface area for eraser
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !tool || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e);

    if (['line', 'rect', 'circle'].includes(tool) && snapshot) {
      ctx.putImageData(snapshot, 0, 0); // Restore previous frame snapshot before drawing temporary preview shape
    }

    if (tool === 'pencil' || tool === 'highlighter' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.beginPath();
      ctx.rect(startX, startY, coords.x - startX, coords.y - startY);
      ctx.stroke();
    } else if (tool === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(coords.x - startX, 2) + Math.pow(coords.y - startY, 2));
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasData();
  };

  const clearCanvasCompletely = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasData();
  };

  // Exposed method via React global trigger windows/custom handles for clear canvas controls
  useEffect(() => {
    const handleClearTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.bookId === bookId && customEvent.detail?.page === page) {
        clearCanvasCompletely();
      }
    };
    window.addEventListener('flipstudy-clear-canvas', handleClearTrigger);
    return () => {
      window.removeEventListener('flipstudy-clear-canvas', handleClearTrigger);
    };
  }, [bookId, page]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-25 w-full h-full pointer-events-auto ${
        tool ? 'cursor-crosshair' : 'pointer-events-none'
      }`}
      onMouseDown={startDraw}
      onMouseMove={draw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={startDraw}
      onTouchMove={draw}
      onTouchEnd={endDraw}
    />
  );
}

// Convert common Hex colors to semi-transparent RGBA formats for highlighting highlights
function hexToRgba(hex: string, alpha: number): string {
  // Check if shorthand conversion is needed
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
