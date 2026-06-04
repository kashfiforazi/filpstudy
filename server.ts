import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // CORS middleware to support external deployments (Vercel/GitHub Pages) connecting back to this backend securely
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize Gemini Client with standard telemetry headers
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for FlipStudy Professional AI Tutor Chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, context } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ 
          reply: "⚠️ **Gemini API Key is missing!**\n\nTo activate me, please search for **Settings > Secrets** in your AI Studio workspace and specify the `GEMINI_API_KEY` value. Once set, I can guide you through Wave Dynamics, CRISPR mechanics, organic bonds, vectors, and more!" 
        });
      }

      // Build context instruction dynamically which can adapt whether they are reading a textbook page OR on library dashboard!
      let systemInstruction = `You are "Sora", a highly professional, academic, yet friendly and motivating AI Study Tutor integrated into the "FlipStudy" digital textbook platform.
Your goal is to help Higher School Certificate (HSC) students master complex academic syllabus materials.

Tone of Voice:
- Maintain a professional, scholar-like, but welcoming and encouraging tone.
- Be supportive, concise, and focused on helping they succeed in their HSC study goals.
- Always use proper formatting: wrap mathematical expressions, formulas, and chemistry equations using markdown code blocks or clean formatting.
- Be deeply polite and warm (using Japanese-minimalism inspired aesthetic politeness).

CURRENT STUDY SESSION CONTEXT:
`;

      if (context) {
        if (context.isReading && context.currentBook) {
          systemInstruction += `The student is currently READING a textbook inside the FlipStudy double-page digital reader.
- Textbook Title: "${context.currentBook.title}" (Category/Subject: ${context.currentBook.category})
- Active Reading Page: Page ${context.currentPage} / ${context.totalPages || 5}
`;
          if (context.pageObj) {
            systemInstruction += `- Active Chapter: ${context.pageObj.chapter || 'Syllabus Focus'}
- Active Page Title: "${context.pageObj.title || ''}"
- Active Page Subtitle: "${context.pageObj.subTitle || ''}"
- Explicit Textbook Content of this visible page:
---
${context.pageObj.paragraphs ? context.pageObj.paragraphs.join('\n\n') : 'Syllabus content loading...'}
---
`;
            if (context.pageObj.formulas && context.pageObj.formulas.length > 0) {
              systemInstruction += `- Formulas displayed on this page: ${context.pageObj.formulas.map((f: string) => `\`${f}\``).join(', ')}\n`;
            }
          }
          if (context.notesOnPage && context.notesOnPage.length > 0) {
            systemInstruction += `- Helpful user annotations / stickies written on this page: "${context.notesOnPage.map((n: any) => n.text).join('; ')}"\n`;
          }
          
          systemInstruction += `\nSince the student is actively reading this page, prioritize explaining concepts, equations, and questions explicitly related to "${context.pageObj?.title || 'this section'}". If they ask general equations, tie them back beautifully to the Wave Dynamics or Calculus in front of them.`;
        } else {
          // Home page context
          systemInstruction += `The student is in their Central Classroom Dashboard.
- Total Books in Bookshelf: ${context.totalBooks || 0}
- Subject Categories of syllabus: ${context.subjects || 'Physics, Mathematics, Chemistry, Biology'}
- Daily Study Target Progress: Checked ${context.completedGoals || 0} of ${context.totalGoals || 0} daily goals.
`;
          if (context.goalsList && context.goalsList.length > 0) {
            systemInstruction += `- Current academic checklist objectives: ${context.goalsList.map((g: any) => `"${g.text}" (${g.completed ? 'completed' : 'pending'})`).join(', ')}\n`;
          }
          
          systemInstruction += `\nEncourage them to work on their pending goals! You can provide study strategies, explain general definitions for Physics/Chemistry/Mathematics, suggest notes management, or recommend checking outstanding syllabus chapters.`;
        }
      } else {
        systemInstruction += `The student is on the main bookshelf. Offer friendly guidance.`;
      }

      systemInstruction += `\n\nFORMATTING CONSTRAINTS:
1. Limit replies to a maximum of 3 highly structured, elegant paragraphs, or use scannable bullet points for step-by-step math or science breakdowns.
2. Maintain clean, visually satisfying typography.
3. Finish with a brief, warm, inspiring study signature (e.g. "Let's master Page ${context?.currentPage || 1} together! 🌸" or "Keep up the momentum, your HSC score is built step-by-step!").`;

      // Transform messages into GenAI SDK chats input contents: [{ role, parts: [{ text }] }]
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Query content utilizing modern gemini-3.5-flash as specified in guidelines
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I apologize, I'm currently unable to process that study wave. Please ask me again, and we can solve it!";
      res.json({ reply: replyText });
    } catch (e: any) {
      console.error("Express backend Gemini proxy route error: ", e);
      res.status(500).json({ error: e?.message || "An error occurred with the Gemini API tutor proxy." });
    }
  });

  // API Route to proxy external PDFs / Google Drive files and bypass CORS restrictions
  app.get("/api/proxy-pdf", async (req, res) => {
    try {
      const pdfUrlParam = req.query.url as string;
      if (!pdfUrlParam) {
        return res.status(400).send("Missing 'url' query parameter.");
      }

      // Convert Google Drive view links to direct download link automatically
      let targetUrl = pdfUrlParam;
      if (targetUrl.includes("drive.google.com")) {
        const fileIdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          targetUrl = `https://docs.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch PDF. Status: ${response.status}`);
      }

      // Set MIME type
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.toLowerCase().includes("pdf")) {
        res.setHeader("content-type", contentType);
      } else {
        res.setHeader("content-type", "application/pdf");
      }

      // Transfer the buffer
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error("PDF Proxy Error: ", err);
      res.status(500).send(`PDF Proxy failed: ${err.message || err}`);
    }
  });

  // Vite middleware for dev environment / static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FlipStudy Server Ready] Running on port ${PORT}`);
  });
}

startServer();
