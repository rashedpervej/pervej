import fs from "fs";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import chatHandler from "./api/chat";
import contactHandler from "./api/contact";
import { getLeads, updateLead, deleteLead } from "./api/leads";
import healthHandler from "./api/health";
import snapshotHandler from "./api/snapshot";
import { injectSocialMeta } from "./api/socialMeta";

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxies (Cloud Run, Cloudflare, Nginx, load balancers)
app.set("trust proxy", 1);

app.use(express.json());

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
