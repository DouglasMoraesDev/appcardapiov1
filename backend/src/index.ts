import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import logger from './logger';
import { resolveTenant } from './middleware/multiTenant';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import usersRouter from './routes/users';
import tablesRouter from './routes/tables';
import ordersRouter from './routes/orders';
import feedbacksRouter from './routes/feedbacks';
import establishmentRouter from './routes/establishment';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import debugRouter from './routes/debug';
import { registerClient } from './notifications';
import path from 'path';

dotenv.config();

const app = express();
// When running behind a proxy (Railway, Heroku, etc.) enable trust proxy so
// express-rate-limit and cookie handling respect X-Forwarded-* headers.
if (process.env.NODE_ENV === 'production') {
	app.set('trust proxy', 1);
}
const port = process.env.PORT || 4000;

// In production, require a non-default JWT secret to be set
if (process.env.NODE_ENV === 'production') {
	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret || jwtSecret === 'changeme') {
		console.error('FATAL: JWT_SECRET is not set or is using the default value. Aborting startup.');
		process.exit(1);
	}
}

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://appcardapiov1-production.up.railway.app';
if (FRONTEND_ORIGIN) {
	// build allowed origins list from env; during development also allow localhost
	const allowedOrigins = FRONTEND_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
	if (process.env.NODE_ENV !== 'production') {
		// permissões locais úteis para desenvolvimento (não afeta produção)
		allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:5173');
	}
	const allowedHostnames = allowedOrigins.map(o => {
		try { return new URL(o).hostname; } catch { return o; }
	});
	app.use(cors({ origin: (origin, cb) => {
		// allow non-browser requests (like curl, undefined origin)
		if (!origin) return cb(null, true);
		try {
			const incomingHost = new URL(origin).hostname;
			if (allowedHostnames.indexOf(incomingHost) !== -1) return cb(null, true);
		} catch (e) {
			// if origin is not a valid URL, fallthrough to string match
			if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
		}
		console.warn('CORS: rejected origin', origin);
		return cb(new Error('Not allowed by CORS'));
	}, credentials: true }));
} else {
	// No FRONTEND_ORIGIN configured: allow any origin (reflect) to support
	// serving frontend and assets from the same host in production.
	app.use(cors({ origin: true, credentials: true }));
}
app.use(express.json());
app.use(cookieParser());
// Resolve tenant early for all requests (header/query/domain/user)
app.use(resolveTenant);

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/establishment', establishmentRouter);
app.use('/api/auth', authRouter);
app.use('/api/debug', debugRouter);
app.use('/api/admin', adminRouter);

// Notifications stream (SSE)
app.get('/api/notifications/stream', (req, res) => {
	registerClient(res);
});

// API root
app.get('/api', (req, res) => res.send({ ok: true, api: '/api' }));

// Serve frontend static files from frontend/dist when present
const staticPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
try {
	app.use(express.static(staticPath));
	app.get('*', (req, res) => {
		// If request starts with /api, ignore and let API routes handle it
		if (req.path.startsWith('/api')) return res.status(404).send({ error: 'API route not found' });
		return res.sendFile(path.join(staticPath, 'index.html'));
	});
} catch (err) {
	console.warn('Frontend static assets not found, skipping static serve');
}

app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
// Generic error handler
app.use((err: any, req: any, res: any, next: any) => {
	logger.error(err);
	if (res.headersSent) return next(err);
	return res.status(500).json({ error: 'Internal server error' });
});
