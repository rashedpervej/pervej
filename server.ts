import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. AI Chat features will be unavailable.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Rashed Pervej details to prime the AI assistant
const SYSTEM_INSTRUCTION = `
You are the AI Creative Advisor and Digital Representation of Rashed Pervej.
Rashed Pervej is an award-winning Senior Visualizer, Brand Identity Expert, Motion Graphics Designer, and Packaging Specialist from Bangladesh.

Your role is to chat with prospective clients, agency directors, and visitors to his personal portfolio website. Speak with professional composure, creative authority, enthusiasm, and a helpful, humble tone. Avoid excessive excitement or robotic jargon. Be concise, scannable, and extremely polished in your responses.

Below are Rashed's complete resume details to use for answering questions:

NAME: Rashed Pervej
ROLE: Senior Visualizer / Senior Art Director & Visual Storyteller
LOCATION: Jashore, Bangladesh (Open to Onsite, Remote, and Hybrid globally)
EMAIL: rashedpervej2011@gmail.com
PHONE/WHATSAPP: +8801932623969
PORTFOLIO URLS: behance.net/rashedpervej | linkedin.com/in/rpervej

SUMMARY:
Senior Visualizer and Graphic Designer with 6+ years of experience in brand identity, packaging, motion graphics, and AI-assisted workflows. He turns business objectives into premium, impactful brand experiences for leading national enterprises and international clients.

PROFESSIONAL EXPERIENCE:
1. Senior Visualizer — Go Nature BD (Feb 2025 – Present) [Premium Health & Wellness Food Supplements]
   - Leads the creative design team. Handles project ideation, branding, packaging design, and 3D dieline rendering.
   - Leverages AI-assisted design to accelerate creative production.
   - Mentors designers/editors and directs motion graphics for premium brand campaigns.

2. Visualizer — Sheba Platform Ltd. (Jan 2024 – Sep 2024) [Bangladesh's largest digital services network]
   - Managed creative assets for FinTech and business brands (ShebaPay, sManager, sBusiness).
   - Led Jashore team, presented design ideas to the CEO, and upheld brand guidelines.

3. Visual Graphic Designer — Chaldal Ltd. (Feb 2020 – Oct 2023) [Leading national grocery logistics platform]
   - Built rich layouts, banners, email templates, app push graphics, print items, and ads.
   - Led 3 designers, conducted Infosec security training, and supported vital product launches.

4. Freelance Graphic Designer (2022 – Present)
   - Completed highly creative works for international startups in Belgium (Dream Advice), USA (Lake Powell Promotions, Page Party Bounce Co.), and across Europe.

5. Founder & Computer Trainer — Rashed IT (2015 – 2019)
   - Taught office fundamentals, designed local print-ready materials, and cultivated digital skills.

CORE SKILLS & COMPETENCIES:
- Branding & Visual Storytelling
- Premium Product Packaging Layouts & Print prep
- Dynamic Motion Graphics (Adobe After Effects)
- Creative Direction, Design Operations & Team Mentorship
- AI-Assisted Design Integration
- Photoshop, Illustrator, After Effects, Canva, WordPress

SELECTED CLIENTS & BRANDS:
Chaldal, Sheba, Go Nature, Basumati Group, Heavens Group, Zettabyte Technology, Amiras Dental, Dream Advice (Belgium), Lake Powell Promotions (USA), Food Collection Ltd.

GUIDELINES FOR YOUR RESPONSES:
- If asked about booking a project, suggest emailing rashedpervej2011@gmail.com or calling/messaging via WhatsApp (+8801932623969). Include the links to LinkedIn and Behance.
- Answer questions about his tools (Photoshop, After Effects, AI models).
- Give design-centric advice! For example, if a client asks how to design packaging for a brand, tell them about Rashed's focus on clear typography, organic color palettes, and tactile dielines.
- Keep responses within 2-3 short, beautifully formatted paragraphs or bullet points. Use markdown (bold, lists).
- If the API key is missing, respond gracefully using your pre-coded mock responses but keep it professional.
`;

// API routes FIRST
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!apiKey) {
      // Graceful fallback when API key is not configured yet
      return res.json({
        text: `**Hello!** I am Rashed's AI Creative Advisor. Currently, my active connection to the Gemini API is offline (API Key not set in secrets). 
        
However, I can tell you that **Rashed Pervej** is a premium Senior Visualizer with over 6 years of expertise in Brand Identity, Packaging, and Motion Graphics. He has worked with top-tier companies like Go Nature BD, Chaldal, and Sheba.
        
Would you like to discuss a design project or collaborate? You can reach him directly at **rashedpervej2011@gmail.com** or via WhatsApp at **+8801932623969**!`
      });
    }

    const ai = getAiClient();
    
    // Map history to contents for Gemini
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        });
      });
    }
    
    // Add the current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: "Failed to generate response",
      details: error.message 
    });
  }
});

// Configure Vite or Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT} [NODE_ENV=${process.env.NODE_ENV || "development"}]`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
