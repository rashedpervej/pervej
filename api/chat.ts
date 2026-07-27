import { GoogleGenAI } from "@google/genai";

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
You are a friendly creative consultant and the digital representation of Rashed Pervej.
Rashed is an award-winning Senior Visualizer, Brand Identity Expert, Motion Graphics Designer, and Packaging Specialist from Bangladesh.

RESPONDING RULES:
1. MEDIUM LENGTH replies of around 100–180 words. Give warm, complete, and highly informative answers with sufficient details about Rashed's designs, experiences, or project process, so potential clients can fully understand and connect with his expertise.
2. Structure replies elegantly with 2–4 paragraphs or clean, beautiful list points. Use double line breaks between paragraphs for premium readability.
3. Keep responses conversational, engaging, and professional. Ensure they sound highly informative without being overly wordy or dry.
4. Sound like a friendly, high-end human creative consultant, NOT an AI assistant. Avoid saying "As an AI..." or "I am an AI...".
5. Highlight important keywords (company names like **Chaldal**, **Sheba**, **Go Nature BD**, locations, tools, roles, links, or contact details if asked) using markdown bold (**keyword**), which automatically renders them in purple.
6. Do NOT list contact details (email, phone, behance) unless the user explicitly asks for them.
7. Keep replies extremely scannable, clean, and mobile-friendly.
8. If more details or context are needed to help them, ask a single short follow-up question instead of a long explanation.
9. ALWAYS read and consider the previous conversation history before answering short follow-up questions like "price?", "how much?", "what about this?", or "only 5?". Never answer them in isolation. Use the preceding messages to understand what specific topic (packaging, branding, location, tools, etc.) the user is referring to.
10. NEVER end a message mid-sentence or truncate the response. Always finish your thought completely.

RASHED'S BACKSTORY & CREDENTIALS:
- Role: Senior Visualizer / Art Director & Visual Storyteller. 6+ years experience.
- Location: Jashore, Bangladesh (Open to remote/hybrid/onsite globally).
- Experience: Senior Visualizer at Go Nature BD (health & wellness packaging, 3D renders), Visualizer at Sheba Platform Ltd (FinTech, sManager), Visual Graphic Designer at Chaldal Ltd (grocery logistics).
- Skills: Premium product packaging, brand identity, dynamic motion graphics (Adobe After Effects), Photoshop, Illustrator.
- Contact (only share if asked): email rashedpervej2011@gmail.com, WhatsApp +8801932623969.

Example of your style:
User: "Where is he based?"
Your response: "Rashed is based in **Jashore, Bangladesh**. He works with clients locally and internationally, offering **Remote** and **Hybrid** collaboration depending on the project."
`;

export default async function handler(req: any, res: any) {
  // Only allow POST request
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    const totalTokens = response.usageMetadata?.totalTokenCount || null;
    res.status(200).json({ text: response.text, tokenUsage: totalTokens });
  } catch (error: any) {
    console.warn("Gemini API Status (using local fallback response):", error?.message || error);
    
    // Safe keyword matching fallback engine for Rashed's portfolio chatbot
    const { message, history } = req.body;
    const cleanMsg = (message || "").toLowerCase();
    let reply = "";

    // Detect short follow-ups or ambiguous questions
    const isShortFollowUp = cleanMsg.length < 25 || 
      cleanMsg.includes("price") || 
      cleanMsg.includes("cost") || 
      cleanMsg.includes("how much") || 
      cleanMsg.includes("about this") || 
      cleanMsg.includes("only 5") || 
      cleanMsg.includes("why") || 
      cleanMsg.includes("what about");

    let inferredTopic = "";
    if (isShortFollowUp && history && Array.isArray(history) && history.length > 0) {
      // Find the last user or model message topic to maintain conversation context
      const lastMessages = [...history].reverse();
      for (const h of lastMessages) {
        const text = (h.content || h.text || "").toLowerCase();
        if (text.includes("brand") || text.includes("worked") || text.includes("company") || text.includes("client")) {
          inferredTopic = "brands";
          break;
        } else if (text.includes("pack") || text.includes("box") || text.includes("label") || text.includes("dieline") || text.includes("3d")) {
          inferredTopic = "packaging";
          break;
        } else if (text.includes("tool") || text.includes("software") || text.includes("photoshop") || text.includes("after effects") || text.includes("illustrator")) {
          inferredTopic = "tools";
          break;
        } else if (text.includes("motion") || text.includes("video") || text.includes("animate")) {
          inferredTopic = "motion";
          break;
        } else if (text.includes("where") || text.includes("location") || text.includes("based") || text.includes("bangladesh")) {
          inferredTopic = "location";
          break;
        } else if (text.includes("contact") || text.includes("hire") || text.includes("email") || text.includes("phone")) {
          inferredTopic = "contact";
          break;
        }
      }
    }

    if (cleanMsg.includes("price") || cleanMsg.includes("how much") || cleanMsg.includes("cost") || cleanMsg.includes("rate") || cleanMsg.includes("budget")) {
      reply = `Rashed's project pricing is tailored to the specific scope, complexity, and unique deliverables of each brand. He generally structures his offerings into:

• **Brand Identity Design**: Complete branding packages including logos, typography guidelines, and style guides.
• **Product Packaging & 3D Dielines**: High-fidelity, print-ready packaging files optimized for production.
• **Motion Graphics**: Dynamic visual animations and high-impact social media assets.

He is very flexible and offers custom-tailored quotes. Would you like to share a brief overview of your design needs or timeline so he can provide a personalized estimate?`;
    } else if (cleanMsg.includes("only 5") || cleanMsg.includes("5 years") || cleanMsg.includes("only 5?")) {
      reply = `Rashed actually has over **6+ years** of rich professional design experience! 

Throughout this journey, he spent more than 3 years as a Visual Graphic Designer at **Chaldal Ltd.** (grocery logistics) and is currently leading visual design and packaging as the Senior Visualizer at **Go Nature BD** (premium health & wellness). He has a proven track record of handling projects from initial branding concepts down to the final print production setups with vendors. Would you like to hear about his recent brand campaigns or custom visual solutions?`;
    } else if (cleanMsg.includes("where") || cleanMsg.includes("location") || cleanMsg.includes("based") || cleanMsg.includes("live") || cleanMsg.includes("bangladesh") || cleanMsg.includes("jashore") || inferredTopic === "location") {
      reply = `Rashed is based in **Jashore, Bangladesh**, but his creative services are fully global! He collaborates with clients worldwide using a highly efficient remote and hybrid workflow.

He has successfully partnered with international brands across the **USA** and **Belgium**, adapting easily to different time zones to guarantee seamless communication and prompt project updates. Are you looking to hire a senior designer for a remote-first or hybrid creative project?`;
    } else if (cleanMsg.includes("contact") || cleanMsg.includes("hire") || cleanMsg.includes("email") || cleanMsg.includes("phone") || cleanMsg.includes("whatsapp") || cleanMsg.includes("reach") || cleanMsg.includes("behance") || cleanMsg.includes("linkedin") || cleanMsg.includes("social") || inferredTopic === "contact") {
      reply = `You can get in touch with Rashed directly through any of his active creative channels:

• **Email**: [rashedpervej2011@gmail.com](mailto:rashedpervej2011@gmail.com)
• **WhatsApp / Phone**: **+8801932623969**
• **LinkedIn**: [linkedin.com/in/rpervej](https://linkedin.com/in/rpervej)
• **Behance Portfolio**: [be.net/rashedpervej](https://be.net/rashedpervej)

He is always open to discussing new contract opportunities, remote roles, premium packaging commissions, or corporate motion designs. Let me know if you would like me to help draft a proposal summary for him!`;
    } else if (cleanMsg.includes("brand") || cleanMsg.includes("company") || cleanMsg.includes("experience") || cleanMsg.includes("worked") || cleanMsg.includes("clients") || cleanMsg.includes("job") || cleanMsg.includes("work") || inferredTopic === "brands") {
      reply = `Rashed has spent over 6 years partnering with prominent national brands and high-growth startups globally. Some of his key professional milestones include:

• **Go Nature BD**: Spearheading high-end product packaging, 3D structure designs, and print pre-press setups.
• **Sheba Platform Ltd**: Designing marketing campaigns and visual assets for major FinTech solutions (like sManager).
• **Chaldal Ltd**: Leading digital promos, visual identity assets, and marketing layouts for Bangladesh's top grocery platform.

His broad skill set allows him to serve as a versatile creative partner who handles everything from digital motion to physical print assets. What specific type of project are you looking to collaborate on?`;
    } else if (cleanMsg.includes("pack") || cleanMsg.includes("box") || cleanMsg.includes("label") || cleanMsg.includes("print") || cleanMsg.includes("dieline") || cleanMsg.includes("3d") || inferredTopic === "packaging") {
      reply = `Packaging is one of Rashed's greatest strengths. He specializes in designing premium **Product Packaging Layouts** and photo-realistic **3D Dieline Renders**, with extensive experience in the healthcare, cosmetics, and supplement industries.

His end-to-end process covers structure development, aesthetic typographic layouts, pre-press quality checks, and active alignment with print vendors. This guarantees that your physical packages turn out exactly as beautiful as they look in the digital mockups. Do you have an active packaging project you are preparing to launch?`;
    } else if (cleanMsg.includes("tool") || cleanMsg.includes("software") || cleanMsg.includes("photoshop") || cleanMsg.includes("after effects") || cleanMsg.includes("illustrator") || cleanMsg.includes("skills") || inferredTopic === "tools") {
      reply = `To deliver world-class creative layouts, Rashed utilizes a top-tier software suite tailored for high-fidelity brand graphics:

• **Adobe Photoshop**: For complex digital manipulation, lighting, and realistic 3D product visual mockups.
• **Adobe Illustrator**: For crisp vector assets, logos, typography arrangements, and millimeter-precise print dielines.
• **Adobe After Effects**: For fluid kinetic typography, brand intro motion, and dynamic video ads.

He also integrates modern AI-driven visual enhancement workflows to accelerate production times and refine texture quality. Is there a specific creative format or resolution you need for your brand files?`;
    } else if (cleanMsg.includes("motion") || cleanMsg.includes("video") || cleanMsg.includes("animate") || cleanMsg.includes("effects") || cleanMsg.includes("campaign") || inferredTopic === "motion") {
      reply = `Rashed brings static visual designs to life through dynamic **Motion Graphics** using Adobe After Effects. He excels at crafting high-impact digital promotional videos, custom animated logos, and engaging storytelling sequences for marketing campaigns.

By handling the entire lifecycle—from storyboards and asset generation to final rendering and transitions—he creates highly engaging visual touchpoints for your audience. Would you like to check out some of his featured motion showreels or campaign designs?`;
    } else {
      reply = `Rashed Pervej is a seasoned **Senior Visualizer** and Art Director with over **6+ years** of professional experience in high-end brand identity design, premium packaging solutions, and advanced motion graphics.

He has a rich history of collaborating with top-tier organizations like **Chaldal**, **Sheba Platform**, and **Go Nature BD**. He is currently based in Bangladesh and is fully available for remote, hybrid, or freelance creative collaborations globally. How can I help you explore his work, check his credentials, or get in touch for an upcoming design task?`;
    }

    return res.status(200).json({ text: reply });
  }
}
