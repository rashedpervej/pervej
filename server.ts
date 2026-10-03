import dotenv from "dotenv";
// Load environment variables immediately before any routes or handlers are imported
dotenv.config({ override: true });

// If GEMINI_API_KEY has the container placeholder "MY_GEMINI_API_KEY", clean it up
if (process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
  delete process.env.GEMINI_API_KEY;
}
if (process.env.VITE_GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
  delete process.env.VITE_GEMINI_API_KEY;
}
dotenv.config({ override: true });

import fs from "fs";
import express from "express";

// Process level resilience for Windows file watcher locking (EBUSY)
process.on("uncaughtException", (err: any) => {
  if (err?.code === "EBUSY" || err?.syscall === "watch") {
    console.warn("[FSWatcher Safeguard] Transient file lock safely handled:", err.message);
    return;
  }
  console.error("Uncaught exception in server process:", err);
});
import path from "path";
import { createServer as createViteServer } from "vite";
import chatHandler from "./api/chat";
import contactHandler from "./api/contact";
import { getLeads, updateLead, deleteLead } from "./api/leads";
import healthHandler from "./api/health";
import snapshotHandler from "./api/snapshot";
import { injectSocialMeta } from "./api/socialMeta";
import vaultHandler from "./api/vault";
import proxyChatCompletionsHandler from "./api/proxy";

// Initialize Express
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxies (Cloud Run, Cloudflare, Nginx, load balancers)
app.set("trust proxy", 1);

app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://generativelanguage.googleapis.com https://api.openai.com https://openrouter.ai https://api.cerebras.ai https://api.mistral.ai; frame-ancestors 'self';"
  );
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

// API routes FIRST
app.get("/api/health", healthHandler);
app.head("/api/health", healthHandler);
app.get("/api/health/db", healthHandler);
app.head("/api/health/db", healthHandler);
app.post("/api/chat", chatHandler);
app.post("/api/contact", contactHandler);
app.get("/api/leads", getLeads);
app.post("/api/leads/update", updateLead);
app.post("/api/leads/delete", deleteLead);
app.get("/api/snapshot", snapshotHandler);
app.post("/api/snapshot", snapshotHandler);
app.all("/api/vault", vaultHandler);
app.post("/api/vault/test", vaultHandler);
app.post("/api/vaultTest", vaultHandler);
app.all("/api/keys/audit", vaultHandler);
app.get("/api/keys/usage", vaultHandler);
app.get("/api/usage", vaultHandler);

// OpenAI-Compatible Proxy Gateway for prec_ Master Key (Local & Cloud)
app.post("/v1/chat/completions", proxyChatCompletionsHandler);
app.post("/api/v1/chat/completions", proxyChatCompletionsHandler);
app.options("/v1/chat/completions", (req, res) => res.status(200).end());
app.options("/api/v1/chat/completions", (req, res) => res.status(200).end());
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      { id: "gemini-2.0-flash", object: "model", owned_by: "precious-vault" },
      { id: "llama-3.3-70b-versatile", object: "model", owned_by: "precious-vault" },
      { id: "llama-3.3-70b-versatile", object: "model", owned_by: "precious-vault" },
    ],
  });
});

// Configure Vite or Static Asset Serving
async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const publicPath = path.join(process.cwd(), "public");

  // Always serve static assets from dist/assets and public with correct MIME types
  if (fs.existsSync(path.join(distPath, "assets"))) {
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
      })
    );
  }
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // Transparent backward-compatibility for legacy /src/assets/images paths
  app.get("/src/assets/images/:file", (req, res, next) => {
    const filePath = path.join(publicPath, req.params.file);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    next();
  });

  // Transparent fallback for legacy og-image.jpg requests to og-image.webp
  app.get("/og-image.jpg", (req, res) => {
    const webpPath = path.join(publicPath, "og-image.webp");
    if (fs.existsSync(webpPath)) {
      return res.sendFile(webpPath);
    }
    res.status(404).send("Not found");
  });

  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
      },
      preview: {
        allowedHosts: true,
      },
      appType: "custom",
    });

    // SPA HTML renderer with dynamic OG & Twitter meta tag injection
    const serveIndexHtml = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const url = req.originalUrl;
      // Skip API routes, Vite internal modules, source files, and assets with extensions
      if (
        req.method !== "GET" ||
        url.startsWith("/api") ||
        url.startsWith("/@") ||
        url.startsWith("/src") ||
        url.startsWith("/node_modules") ||
        Boolean(path.extname(url.split("?")[0]))
      ) {
        return next();
      }

      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          const finalHtml = await injectSocialMeta(template, req);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
        }
      } catch (e: any) {
        console.error("Error transforming dev index.html with OG tags:", e);
        // Resilient fallback: serve untransformed index.html so the preview is never blank
        try {
          const indexPath = path.resolve(process.cwd(), "index.html");
          if (fs.existsSync(indexPath)) {
            const rawTemplate = fs.readFileSync(indexPath, "utf-8");
            return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(rawTemplate);
          }
        } catch {
          // Pass along if reading file fails
        }
      }
      next();
    };

    // 1. Vite middlewares for client scripts, CSS, HMR, assets, and pre-bundled deps
    app.use(vite.middlewares);

    // 2. SPA route fallback with dynamic OG meta injection for all client routes (e.g. /, /admin)
    app.use("*", serveIndexHtml);

    console.log("Vite development server middleware loaded with allowedHosts and dynamic OG meta injection.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
      })
    );
    // Serve compiled static assets from dist without automatically intercepting index.html
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        },
      })
    );
    app.get("*", async (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      try {
        const indexHtmlPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexHtmlPath)) {
          const rawHtml = fs.readFileSync(indexHtmlPath, "utf-8");
          const finalHtml = await injectSocialMeta(rawHtml, req);
          return res.status(200).set({ "Content-Type": "text/html" }).send(finalHtml);
        }
      } catch (err) {
        console.error("Error serving index.html with OG tags in production:", err);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist/ with dynamic OG meta injection.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT} [NODE_ENV=${process.env.NODE_ENV || "development"}]`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
