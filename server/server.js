import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import paymentsRouter from './routes/payments.js';
import ticketsRouter from './routes/tickets.js';
import fuelRouter from './routes/fuel.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
// CORS with credentials so the client can send/receive cookies
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const serverOrigin = process.env.SERVER_ORIGIN || 'http://localhost:5050';
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // behind proxy (Render/Heroku) so secure cookies work
}

// --- Auth Helpers ---
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dev-secret-change-me';
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_REDIRECT_URI = process.env.AUTH0_REDIRECT_URI || `${serverOrigin}/api/auth/callback`;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || undefined; // optional API audience

function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
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
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie('session', sessionToken, cookieOptions);

    const redirectPath = decodeURIComponent(state || '/') || '/';
    // Redirect back to client root; client router will handle the rest
    res.redirect(redirectPath);
  } catch (err) {
    console.error('Auth callback failed', err);
    res.status(500).json({ message: 'Auth failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Protect APIs: require a valid session
app.use('/api/tickets', verifySession, ticketsRouter);
app.use('/api/payments', verifySession, paymentsRouter);
app.use('/api/fuel', verifySession, fuelRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
