import { useEffect, useState } from 'react';
import { SpotifyAuth } from '../services/spotifyAuth';

const SpotifyCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        await SpotifyAuth.handleCallback(code);
        setStatus('success');
        
        // Redirect to main app after successful auth
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      {status === 'loading' && (
        <div>
          <h2>Authenticating with Spotify...</h2>
          <p>Please wait while we complete the authentication process.</p>
        </div>
      )}
      {status === 'success' && (
        <div>
          <h2>✅ Authentication Successful!</h2>
          <p>Redirecting you back to the app...</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h2>❌ Authentication Failed</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'}>
            Return to App
          </button>
        </div>
      )}
    </div>
  );
};

export default SpotifyCallback;