import { createHash, timingSafeEqual } from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'ai-together-secret-2026';

// ============ PASSWORD HASHING ============
export function hashPassword(plain) {
    return createHash('sha256').update(plain + TOKEN_SECRET).digest('hex');
}

export function verifyPassword(plain, hashed) {
    const computed = hashPassword(plain);
    try {
        return timingSafeEqual(Buffer.from(computed), Buffer.from(hashed));
    } catch {
        return false;
    }
}

// ============ TOKEN ============
export function createToken(userId) {
    const payload = JSON.stringify({ uid: userId, iat: Date.now() });
    const signature = createHash('sha256').update(payload + TOKEN_SECRET).digest('hex');
    return Buffer.from(payload).toString('base64') + '.' + signature;
}

export function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    try {
        const payloadB64 = parts[0];
        const sig = parts[1];
        const payload = Buffer.from(payloadB64, 'base64').toString();
        const expected = createHash('sha256').update(payload + TOKEN_SECRET).digest('hex');

        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

        const data = JSON.parse(payload);
        // Token expires after 7 days
        if (Date.now() - data.iat > 7 * 24 * 60 * 60 * 1000) return null;
        return data;
    } catch {
        return null;
    }
}

// ============ AUTH HELPER FOR API ROUTES ============
export function getAuthUser(req) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    return verifyToken(token);
}

// Returns null if auth OK, or a NextResponse error if not
export function requireAuth(req) {
    const user = getAuthUser(req);
    if (!user) {
        return { error: 'Unauthorized', status: 401 };
    }
    return null;
}

// ============ URL VALIDATION (anti-SSRF) ============
export function isValidWebhookUrl(url) {
    try {
        const u = new URL(url);
        if (u.protocol !== 'https:') return false;
        // Block private IPs
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
        if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
        if (host.endsWith('.local') || host.endsWith('.internal')) return false;
        return true;
    } catch {
        return false;
    }
}
