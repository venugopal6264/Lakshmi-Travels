import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import paymentsRouter from './routes/payments.js';
import ticketsRouter from './routes/tickets.js';
import fuelRouter from './routes/fuel.js';
import vehiclesRouter from './routes/vehicles.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
// CORS with credentials so the client can send/receive cookies
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const serverOrigin = process.env.SERVER_ORIGIN || 'http://localhost:5050';
const allowedOrigins = new Set([
  clientOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (no Origin) and whitelisted origins
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Ensure preflight handled for all routes
// In Express 5, use a RegExp for catch-all preflight handling
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // behind proxy (Render/Heroku) so secure cookies work
}
// Extra headers for reliability with some hosts/proxies
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin === clientOrigin || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  next();
});

// --- Auth Helpers ---
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dev-secret-change-me';
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_REDIRECT_URI = process.env.AUTH0_REDIRECT_URI || `${serverOrigin}/api/auth/callback`;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || undefined; // optional API audience
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === 'true';

function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifySession(req, res, next) {
  if (req.method === 'OPTIONS') return next(); // allow CORS preflight without auth
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid session' });
  }
}

function getCookieOptions(req) {
  const prod = process.env.NODE_ENV === 'production';
  const origin = req.headers.origin;
  const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1');
  return {
    httpOnly: true,
    sameSite: isLocalhost ? 'lax' : (prod ? 'none' : 'lax'),
    secure: prod && !isLocalhost,
  maxAge: 24 * 60 * 60 * 1000,
  };
}

// Start login by redirecting to Auth0
app.get('/api/auth/login', (req, res) => {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
    return res.status(500).json({ message: 'Auth0 is not configured on the server' });
  }
  const state = encodeURIComponent(req.query.redirect || '/');
  const authorizeUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', AUTH0_REDIRECT_URI);
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  if (AUTH0_AUDIENCE) authorizeUrl.searchParams.set('audience', AUTH0_AUDIENCE);
  authorizeUrl.searchParams.set('state', state);
  res.redirect(authorizeUrl.toString());
});

// Auth0 callback exchanges code for tokens and sets our own session cookie
app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: AUTH0_REDIRECT_URI,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Auth0 token error:', tokenJson);
      return res.status(400).json(tokenJson);
    }

    // Optionally fetch user info
    const userInfoRes = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const user = await userInfoRes.json();

    // Issue our own session cookie
    const sessionToken = signSession({
      sub: user.sub,
      name: user.name,
      email: user.email,
      picture: user.picture,
    });
  res.cookie('session', sessionToken, getCookieOptions(req));

    const redirectPath = decodeURIComponent(state || '/') || '/';
    // Redirect back to client root; client router will handle the rest
    res.redirect(redirectPath);
  } catch (err) {
    console.error('Auth callback failed', err);
    res.status(500).json({ message: 'Auth failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const clearOpts = getCookieOptions(req);
  res.clearCookie('session', { httpOnly: true, sameSite: clearOpts.sameSite, secure: clearOpts.secure });
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.json({ user: null });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// Dev-only login: enable with ALLOW_DEV_LOGIN=true (do NOT enable in production)
app.post('/api/auth/dev-login', (req, res) => {
  if (!ALLOW_DEV_LOGIN) return res.status(403).json({ message: 'Disabled' });
  const { email = 'dev@example.com', name = 'Dev User' } = req.body || {};
  const user = { sub: `dev|${email}`, email, name };
  const sessionToken = signSession(user);
  res.cookie('session', sessionToken, getCookieOptions(req));
  res.json({ user });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
})
.catch((error) => console.error('MongoDB connection error:', error));

// Protect APIs: require a valid session
app.use('/api/tickets', verifySession, ticketsRouter);
app.use('/api/payments', verifySession, paymentsRouter);
app.use('/api/fuel', verifySession, fuelRouter);
app.use('/api/vehicles', verifySession, vehiclesRouter);

// --- Users API (removed admin management per request) ---


// Login with username/password -> sets session cookie (for local or password-based fallback)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username and password are required' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const sessionToken = signSession({ sub: String(user._id), username: user.username, role: user.role });
    res.cookie('session', sessionToken, getCookieOptions(req));
    res.json({ user: { sub: String(user._id), username: user.username, role: user.role } });
  } catch (e) {
    console.error('Password login failed', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
