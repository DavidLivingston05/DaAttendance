import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import app from "./api/index";

// Load local environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite HMR middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets in production build
    const express = require("express");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with secure MongoDB Atlas connection!`);
  });
}

startServer();
