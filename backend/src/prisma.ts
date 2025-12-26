import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let _connected = false;
export function isPrismaConnected() {
	return _connected;
}

export async function connectPrisma(retries = 10, delayMs = 5000) {
	const rawUrl = process.env.DATABASE_URL || '';
	const masked = rawUrl.replace(/(\/\/).*@/, '$1****@');
	if (rawUrl) console.log('[prisma] datasource:', masked);
	for (let i = 0; i < retries; i++) {
		try {
			await prisma.$connect();
			_connected = true;
			console.log('[prisma] connected');
			return;
		} catch (e) {
			_connected = false;
			const errMsg = (e as any)?.message || String(e);
			console.error(`[prisma] connection failed (attempt ${i + 1}/${retries}):`, errMsg);
			if (i < retries - 1) {
				// exponential backoff
				const wait = Math.min(delayMs * Math.pow(2, i), 60000);
				console.log(`[prisma] retrying in ${wait}ms`);
				await new Promise((r) => setTimeout(r, wait));
			}
		}
	}
	console.error('[prisma] could not connect after retries, routes will return 503 until DB is reachable');
}

export default prisma;
