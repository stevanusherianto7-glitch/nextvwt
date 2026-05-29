import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json({ limit: "32kb" }));
const server = http.createServer(app);

const forceDevServer = process.argv.includes("--dev") || process.env.NEXTVWT_DEV_SERVER === "true" || process.env.NODE_ENV === "development";
// Default server mode is production/static.
// This prevents `pnpm start` on Windows from accidentally running Vite middleware
// and serving /src/App.tsx + node_modules/.vite, which can create React/Zustand hook runtime conflicts.
const isProduction = !forceDevServer;
const PORT = Number(process.env.PORT || 3000);
const MAX_CHANNEL_USERS = Number(process.env.MAX_CHANNEL_USERS || 10);
const CHANNEL_JOIN_SECRET = process.env.CHANNEL_JOIN_SECRET?.trim() || "";
const LOCK_ALL_CHANNELS = process.env.LOCK_ALL_CHANNELS === "true";
const CHANNEL_PASSWORDS_RAW = process.env.CHANNEL_PASSWORDS || process.env.PROTECTED_CHANNELS || "";
const REQUIRE_GOOGLE_AUTH = process.env.REQUIRE_GOOGLE_AUTH === "true";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";

function parseChannelPasswords(raw: string): Map<string, string> {
  const entries = new Map<string, string>();

  raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [channel, ...passwordParts] = item.split(":");
      const normalizedChannel = channel?.trim();
      const password = passwordParts.join(":").trim();

      if (/^\d{1,6}$/.test(normalizedChannel || "") && password) {
        entries.set(normalizedChannel, password);
      }
    });

  return entries;
}

const channelPasswords = parseChannelPasswords(CHANNEL_PASSWORDS_RAW);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const log = {
  info: (...args: unknown[]) => {
    if (!isProduction) console.log(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const io = new Server(server, {
  cors: {
    origin: isProduction ? allowedOrigins : allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 256 * 1024,
  pingTimeout: 20000,
  pingInterval: 10000,
});

interface User {
  id: string;
  name: string;
  channel: string;
  locationState: string;
  isSpeaking: boolean;
  avatarDataUrl?: string;
  lastHeartbeat: number;
}

interface JoinChannelPayload {
  name?: unknown;
  channel?: unknown;
  locationState?: unknown;
  pin?: unknown;
  avatarDataUrl?: unknown;
}

interface TargetPayload {
  targetId?: unknown;
  sdp?: unknown;
  candidate?: unknown;
}


interface GoogleSessionProfile {
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
  createdAt: number;
}

interface GoogleTokenInfoResponse {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
}

const googleSessions = new Map<string, GoogleSessionProfile>();
const GOOGLE_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanupGoogleSessions(): void {
  const now = Date.now();
  for (const [token, profile] of googleSessions.entries()) {
    if (now - profile.createdAt > GOOGLE_SESSION_TTL_MS) {
      googleSessions.delete(token);
    }
  }
}

function getSessionFromSocket(socket: Socket): GoogleSessionProfile | null {
  if (!REQUIRE_GOOGLE_AUTH) return {
    email: "guest@local.nextvwt",
    emailVerified: true,
    name: "Guest",
    picture: "",
    createdAt: Date.now(),
  };

  const token = socket.handshake.auth?.sessionToken;
  if (typeof token !== "string" || token.length < 20) return null;
  const session = googleSessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > GOOGLE_SESSION_TTL_MS) {
    googleSessions.delete(token);
    return null;
  }
  return session;
}

async function verifyGoogleCredential(credential: unknown): Promise<GoogleSessionProfile> {
  if (!REQUIRE_GOOGLE_AUTH) {
    throw new Error("Google Auth sedang nonaktif di server.");
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID belum dikonfigurasi di server.");
  }

  if (typeof credential !== "string" || credential.length < 100 || credential.length > 4096) {
    throw new Error("Credential Google tidak valid.");
  }

  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);

  const response = await fetch(url, { method: "GET" });
  const tokenInfo = await response.json().catch(() => null) as GoogleTokenInfoResponse | null;

  if (!response.ok || !tokenInfo) {
    throw new Error(tokenInfo?.error_description || "Token Google tidak bisa diverifikasi.");
  }

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google Client ID tidak cocok dengan token login.");
  }

  const email = typeof tokenInfo.email === "string" ? tokenInfo.email.toLowerCase().trim() : "";
  const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

  if (!email || !emailVerified) {
    throw new Error("Gmail belum terverifikasi oleh Google.");
  }

  return {
    email,
    emailVerified: true,
    name: typeof tokenInfo.name === "string" && tokenInfo.name.trim() ? tokenInfo.name.trim() : email.split("@")[0],
    picture: typeof tokenInfo.picture === "string" ? tokenInfo.picture : "",
    createdAt: Date.now(),
  };
}

const users = new Map<string, User>();

const ZOMBIE_TIMEOUT_MS = 30_000;
const RATE_LIMIT_WINDOW_MS = 10_000;

const rateLimits: Record<string, { max: number }> = {
  "join-channel": { max: 10 },
  "speaking-status": { max: 80 },
  "audio-stream": { max: 120 },
  heartbeat: { max: 30 },
  "webrtc-offer": { max: 60 },
  "webrtc-answer": { max: 60 },
  "webrtc-ice": { max: 240 },
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(socketId: string, eventName: keyof typeof rateLimits): boolean {
  const limit = rateLimits[eventName];
  const now = Date.now();
  const key = `${socketId}:${eventName}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit.max) {
    log.warn(`[RateLimit] Drop '${eventName}' dari socket ${socketId}`);
    return true;
  }

  return false;
}

function cleanupRateLimits(socketId: string): void {
  for (const key of rateBuckets.keys()) {
    if (key.startsWith(`${socketId}:`)) {
      rateBuckets.delete(key);
    }
  }
}

function isValidChannel(channel: unknown): channel is string {
  return typeof channel === "string" && /^\d{1,6}$/.test(channel.trim());
}

function sanitizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 50) return null;
  return trimmed;
}

function sanitizeLocation(locationState: unknown): string {
  if (typeof locationState !== "string") return "Unknown";
  const trimmed = locationState.trim().replace(/\s+/g, " ").slice(0, 100);
  return trimmed || "Unknown";
}

function sanitizeAvatarDataUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  const trimmed = value.trim();
  // Avatar dari client wajib berupa data URL WebP hasil kompresi lokal.
  // Batas dibuat kecil agar aman untuk payload Socket.IO dan cepat di HP.
  if (!trimmed.startsWith("data:image/webp;base64,")) return "";
  if (Buffer.byteLength(trimmed, "utf8") > 120 * 1024) return "";
  return trimmed;
}

function getRequiredChannelPin(channel: string): string | null {
  const protectedPin = channelPasswords.get(channel);
  if (protectedPin) return protectedPin;

  // Backward compatible mode only if explicitly enabled.
  // Default policy NextVWT: semua user bebas masuk channel mana pun.
  // Channel baru terkunci hanya bila pengelola menetapkan password untuk channel itu.
  if (LOCK_ALL_CHANNELS && CHANNEL_JOIN_SECRET) return CHANNEL_JOIN_SECRET;

  return null;
}

function validateChannelAccess(channel: string, pin: unknown): { ok: true } | { ok: false; code: string; message: string } {
  const requiredPin = getRequiredChannelPin(channel);
  if (!requiredPin) return { ok: true };

  if (typeof pin !== "string" || pin.trim() === "") {
    return {
      ok: false,
      code: "PASSWORD_REQUIRED",
      message: `Channel ${channel} membutuhkan password dari pengelola channel.`,
    };
  }

  if (pin !== requiredPin) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Password channel tidak valid.",
    };
  }

  return { ok: true };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadSize(value: unknown): number {
  if (typeof value === "string") return Buffer.byteLength(value, "utf8");
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function isSafeSignalingPayload(value: unknown, maxBytes = 64 * 1024): boolean {
  return isPlainObject(value) && getPayloadSize(value) <= maxBytes;
}

function getUsersInChannel(channel: string): User[] {
  return Array.from(users.values()).filter((u) => u.channel === channel);
}

setInterval(() => {
  const now = Date.now();
  for (const [socketId, user] of users.entries()) {
    if (now - user.lastHeartbeat > ZOMBIE_TIMEOUT_MS) {
      log.warn(`[Server] Cleaning zombie user: ${user.name} (${socketId})`);
      io.to(user.channel).emit("user-left", socketId);
      users.delete(socketId);
      cleanupRateLimits(socketId);
    }
  }
}, 15_000);

function handleConnection(socket: Socket): void {
  log.info(`[Socket] Connected: ${socket.id}`);

  const getReachablePeer = (targetId: unknown): User | null => {
    if (typeof targetId !== "string" || targetId.length > 128) return null;
    const sender = users.get(socket.id);
    const target = users.get(targetId);
    if (!sender || !target || sender.channel !== target.channel) return null;
    return target;
  };

  socket.on("join-channel", (data: JoinChannelPayload = {}) => {
    if (isRateLimited(socket.id, "join-channel")) return;

    const googleProfile = getSessionFromSocket(socket);
    if (REQUIRE_GOOGLE_AUTH && !googleProfile) {
      socket.emit("join-error", { code: "AUTH_REQUIRED", message: "Login Gmail terverifikasi sedang nonaktif untuk prototype ini." });
      return;
    }

    const name = sanitizeName(data.name);
    if (!name || !isValidChannel(data.channel)) {
      socket.emit("join-error", { code: "INVALID_PAYLOAD", message: "Nama atau channel tidak valid." });
      return;
    }

    const channel = data.channel.trim();
    const access = validateChannelAccess(channel, data.pin);
    if (access.ok === false) {
      socket.emit("join-error", { code: access.code, channel, message: access.message });
      return;
    }
    const currentChannelUsers = getUsersInChannel(channel).filter((u) => u.id !== socket.id);
    if (currentChannelUsers.length >= MAX_CHANNEL_USERS) {
      socket.emit("join-error", { code: "CHANNEL_FULL", message: "Channel penuh." });
      return;
    }

    const existing = users.get(socket.id);
    if (existing) {
      socket.leave(existing.channel);
      io.to(existing.channel).emit("user-left", socket.id);
    }

    const user: User = {
      id: socket.id,
      name,
      channel,
      locationState: sanitizeLocation(data.locationState),
      isSpeaking: false,
      avatarDataUrl: sanitizeAvatarDataUrl(data.avatarDataUrl),
      lastHeartbeat: Date.now(),
    };

    users.set(socket.id, user);
    socket.join(user.channel);

    io.to(user.channel).emit("user-joined", {
      id: user.id,
      name: user.name,
      channel: user.channel,
      locationState: user.locationState,
      isSpeaking: false,
      avatarDataUrl: user.avatarDataUrl || '',
    });

    socket.emit("join-success", {
      id: user.id,
      name: user.name,
      channel: user.channel,
      locationState: user.locationState,
      isSpeaking: false,
      avatarDataUrl: user.avatarDataUrl || '',
      protected: Boolean(getRequiredChannelPin(user.channel)),
    });

    socket.emit(
      "channel-users",
      getUsersInChannel(user.channel).map((u) => ({
        id: u.id,
        name: u.name,
        channel: u.channel,
        locationState: u.locationState,
        isSpeaking: u.isSpeaking,
        avatarDataUrl: u.avatarDataUrl || '',
      }))
    );

    log.info(`[Socket] ${user.name} joined channel ${user.channel}`);
  });

  socket.on("speaking-status", (isSpeaking: unknown) => {
    if (isRateLimited(socket.id, "speaking-status")) return;
    if (typeof isSpeaking !== "boolean") return;

    const user = users.get(socket.id);
    if (!user) return;

    user.isSpeaking = isSpeaking;
    user.lastHeartbeat = Date.now();

    io.to(user.channel).emit("user-speaking", {
      userId: socket.id,
      isSpeaking: user.isSpeaking,
    });
  });

  socket.on("audio-stream", (audioData: ArrayBuffer | Buffer | unknown) => {
    if (isRateLimited(socket.id, "audio-stream")) return;
    const user = users.get(socket.id);
    if (!user) return;

    const size = getPayloadSize(audioData);
    if (size <= 0 || size > 64 * 1024) return;

    socket.broadcast.to(user.channel).emit("audio-stream", {
      userId: socket.id,
      audioData,
    });
  });

  socket.on("heartbeat", (data?: { timestamp?: number }) => {
    if (isRateLimited(socket.id, "heartbeat")) return;
    const user = users.get(socket.id);
    if (user) user.lastHeartbeat = Date.now();
    
    if (data?.timestamp) {
      socket.emit("heartbeat_ack", { timestamp: data.timestamp });
    }
  });

  socket.on("webrtc-offer", (data: TargetPayload = {}) => {
    if (isRateLimited(socket.id, "webrtc-offer")) return;
    if (!isSafeSignalingPayload(data.sdp)) return;
    if (!getReachablePeer(data.targetId)) return;

    io.to(data.targetId as string).emit("webrtc-offer", {
      senderId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on("webrtc-answer", (data: TargetPayload = {}) => {
    if (isRateLimited(socket.id, "webrtc-answer")) return;
    if (!isSafeSignalingPayload(data.sdp)) return;
    if (!getReachablePeer(data.targetId)) return;

    io.to(data.targetId as string).emit("webrtc-answer", {
      senderId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on("webrtc-ice", (data: TargetPayload = {}) => {
    if (isRateLimited(socket.id, "webrtc-ice")) return;
    if (!isSafeSignalingPayload(data.candidate, 16 * 1024)) return;
    if (!getReachablePeer(data.targetId)) return;

    io.to(data.targetId as string).emit("webrtc-ice", {
      senderId: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on("disconnect", (reason) => {
    const user = users.get(socket.id);
    if (user) {
      if (user.isSpeaking) {
        io.to(user.channel).emit("user-speaking", { userId: socket.id, isSpeaking: false });
      }

      io.to(user.channel).emit("user-left", socket.id);
      users.delete(socket.id);
      log.info(`[Socket] ${user.name} disconnected (${reason})`);
    }
    cleanupRateLimits(socket.id);
  });
}


io.use((socket, next) => {
  if (!REQUIRE_GOOGLE_AUTH) return next();

  const session = getSessionFromSocket(socket);
  if (!session) {
    return next(new Error("Login Gmail terverifikasi sedang nonaktif untuk prototype ini."));
  }

  socket.data.googleProfile = session;
  return next();
});

io.on("connection", handleConnection);

async function startServer(): Promise<void> {
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, users: users.size, googleAuthRequired: REQUIRE_GOOGLE_AUTH, googleAuthConfigured: Boolean(GOOGLE_CLIENT_ID) });
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const credential = req.body?.credential;
      const verified = await verifyGoogleCredential(credential);
      const sessionToken = crypto.randomBytes(32).toString("base64url");
      googleSessions.set(sessionToken, verified);
      cleanupGoogleSessions();

      res.status(200).json({
        ok: true,
        profile: {
          email: verified.email,
          emailVerified: verified.emailVerified,
          name: verified.name,
          picture: verified.picture,
          sessionToken,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login Google gagal.";
      res.status(401).json({ ok: false, message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = typeof req.body?.sessionToken === "string" ? req.body.sessionToken : "";
    if (token) googleSessions.delete(token);
    res.status(200).json({ ok: true });
  });

  if (!isProduction) {
    console.log("[Server] DEV mode aktif: memakai Vite middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] PRODUCTION mode aktif: serve static dist, tanpa Vite middleware/HMR.");
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");

    app.use((req, res, next) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      next();
    });

    app.use(express.static(distPath, { index: false, etag: false, lastModified: false }));
    app.get("*", (_req, res) => {
      res.sendFile(indexPath);
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NextVWT PTT running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Zombie cleanup active (interval: 15s, timeout: 30s)`);
    if (isProduction && allowedOrigins.length === 0) {
      console.warn("[Server] Production tanpa ALLOWED_ORIGINS: koneksi browser lintas origin akan ditolak.");
    }
  });
}

startServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
