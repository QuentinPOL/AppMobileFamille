// api/index.ts
import cors from "cors";
import express from "express";
import login from "./auth/login";
import me from "./auth/me";
import register from "./auth/register";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.options("/api/auth/register", (_req, res) => res.sendStatus(204));
app.post("/api/auth/register", (req, res) => register(req as any, res as any));

app.options("/api/auth/login", (_req, res) => res.sendStatus(204));
app.post("/api/auth/login", (req, res) => login(req as any, res as any));

app.options("/api/auth/me", (_req, res) => res.sendStatus(204));
app.get("/api/auth/me", (req, res) => me(req as any, res as any));

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});