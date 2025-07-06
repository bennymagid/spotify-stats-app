// Spotify Authentication Service using Authorization Code with PKCE
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

// Generate random string for PKCE
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Generate code challenge for PKCE
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export class SpotifyAuth {
  private static readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-read-recently-played',
    'user-top-read',
    'user-read-currently-playing',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ];

  static async initiateAuth(): Promise<void> {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: this.SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: REDIRECT_URI,
    });

    window.location.href = `${AUTH_ENDPOINT}?${params}`;
  }

  static async handleCallback(code: string): Promise<string> {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      throw new Error('No code verifier found');
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || 'Token exchange failed');
    }

    // Store tokens and scopes
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
    localStorage.setItem('spotify_expires_at', (Date.now() + data.expires_in * 1000).toString());
    localStorage.setItem('spotify_scopes', data.scope || this.SCOPES.join(' '));
    
    // Clean up
    localStorage.removeItem('spotify_code_verifier');
    
    return data.access_token;
  }

  static getAccessToken(): string | null {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');
    
    if (!token || !expiresAt) return null;
    
    if (Date.now() > parseInt(expiresAt)) {
      this.logout();
      return null;
    }
    
    return token;
  }

  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  static logout(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
    localStorage.removeItem('spotify_scopes');
  }

  static getCurrentScopes(): string[] {
    const scopes = localStorage.getItem('spotify_scopes');
    return scopes ? scopes.split(' ') : [];
  }

  static hasRequiredScopes(requiredScopes: string[]): boolean {
    const currentScopes = this.getCurrentScopes();
    return requiredScopes.every(scope => currentScopes.includes(scope));
  }

  static hasStreamingScopes(): boolean {
    return this.hasRequiredScopes(['streaming', 'user-read-playback-state', 'user-modify-playback-state']);
  }

  static async forceReauth(): Promise<void> {
    // Clear existing tokens to force fresh authentication
    this.logout();
    // Initiate new auth flow
    await this.initiateAuth();
  }

  static needsReauth(): boolean {
    // Check if we're authenticated but missing streaming scopes
    return this.isAuthenticated() && !this.hasStreamingScopes();
  }
}