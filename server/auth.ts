import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function getFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.projectId) {
        return config.projectId;
      }
    }
  } catch (e) {
    console.warn('[Auth] Could not read firebase-applet-config.json', e);
  }
  return 'gemini-journal-507808';
}

// Public key cache for Firebase ID tokens
interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}
let certCache: CertCache | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && certCache.expiresAt > now) {
    return certCache.certs;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch certs: ${res.statusText}`);
    }

    // Cache headers
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

    const certs = (await res.json()) as Record<string, string>;

    // Allow test verification key strictly in automated unit/integration test runs
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.ENABLE_TEST_AUTH === 'true' &&
      process.env.TEST_AUTH_PUBLIC_KEY
    ) {
      certs['test-key'] = process.env.TEST_AUTH_PUBLIC_KEY;
    }

    certCache = {
      certs,
      expiresAt: now + maxAge * 1000,
    };
    return certs;
  } catch (err) {
    console.error('[Auth] Error fetching Google public certs:', err);
    if (certCache) return certCache.certs;
    throw err;
  }
}

/**
 * Validates a Firebase ID Token using Google's public certificates.
 * Enforces cryptographic signature check, issuer, audience, and expiration.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<AuthenticatedUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing or malformed ID token');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT structure');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  const headerJson = Buffer.from(headerB64, 'base64url').toString('utf-8');
  const header = JSON.parse(headerJson);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID (kid)');
  }

  // Decode payload
  const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  const payload = JSON.parse(payloadJson);

  const now = Math.floor(Date.now() / 1000);

  // Expiration check
  if (!payload.exp || payload.exp < now) {
    throw new Error('Token has expired');
  }

  // Issued at check (clock skew allowance of 5 minutes)
  if (!payload.iat || payload.iat > now + 300) {
    throw new Error('Token issued in the future');
  }

  // Audience & Issuer check — MUST be non-empty to prevent cross-project confused deputy attacks
  const projectId = getFirebaseProjectId();
  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    throw new Error('Server configuration error: Firebase Project ID is required to verify tokens');
  }
  if (payload.aud !== projectId) {
    throw new Error(`Token audience mismatch. Expected ${projectId}, got ${payload.aud}`);
  }
  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Token issuer mismatch. Expected ${expectedIss}, got ${payload.iss}`);
  }

  // Subject (UID) check
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new Error('Token sub (UID) is invalid');
  }

  // Cryptographic Signature verification
  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error(`No certificate found for key ID: ${header.kid}`);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signatureBuffer = Buffer.from(signatureB64, 'base64url');

  const isValid = verifier.verify(cert, signatureBuffer);
  if (!isValid) {
    throw new Error('Invalid cryptographic signature for Firebase ID token');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

/**
 * Express middleware to strictly require and verify Firebase Authentication.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization header. A valid Firebase ID token is required.',
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty bearer token' });
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    req.user = user;
    next();
  } catch (err: any) {
    console.warn('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
