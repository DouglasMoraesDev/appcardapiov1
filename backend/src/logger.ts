const isProd = process.env.NODE_ENV === 'production';

export const info = (...args: any[]) => console.log('[info]', ...args);
export const warn = (...args: any[]) => console.warn('[warn]', ...args);
export const error = (...args: any[]) => console.error('[error]', ...args);

export const safeErrorResponse = (res: any, message = 'Internal server error') => {
  // Log full error server-side, but return a generic message to client
  try {
    return res.status(500).json({ error: message });
  } catch (e) {
    return;
  }
};

export default { info, warn, error, safeErrorResponse };
