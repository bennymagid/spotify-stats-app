import { useState, useEffect, useRef } from 'react';
import { SpotifyAuth } from '../services/spotifyAuth';
import type { SpotifyPlayer, SpotifyPlayerState } from '../types/spotify';

interface SpotifyPlayerProps {
  trackUri?: string;
  onTrackChange?: (track: any) => void;
}

export const SpotifyPlayerComponent: React.FC<SpotifyPlayerProps> = ({ 
  trackUri, 
  onTrackChange 
}) => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    // Check if we need re-authentication for streaming
    if (SpotifyAuth.needsReauth()) {
      setNeedsReauth(true);
      return;
    }

    const initializePlayer = () => {
      if (!window.Spotify || !window.Spotify.Player) {
        console.log('Spotify SDK not loaded yet');
        return;
      }

      const token = SpotifyAuth.getAccessToken();
      if (!token) return;

      // Double-check streaming scopes before initializing player
      if (!SpotifyAuth.hasStreamingScopes()) {
        setNeedsReauth(true);
        return;
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Spotify Stats Player',
        getOAuthToken: (cb) => {
          const currentToken = SpotifyAuth.getAccessToken();
          if (currentToken) {
            cb(currentToken);
          }
        },
        volume: 0.5,
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setIsPremium(true);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state: SpotifyPlayerState | null) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
        setPosition(state.position);
        setDuration((state.track_window.current_track as any)?.duration_ms || 0);

        if (onTrackChange) {
          onTrackChange(state.track_window.current_track);
        }
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Failed to initialize:', message);
        setIsPremium(false);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Failed to authenticate:', message);
        setIsPremium(false);
      });

      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account error:', message);
        setIsPremium(false);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    // Wait for Spotify SDK to load
    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (player) {
        player.disconnect();
      }
    };
  }, []);

  // Update position while playing
  useEffect(() => {
    if (!isPaused && player) {
      intervalRef.current = window.setInterval(async () => {
        const state = await player.getCurrentState();
        if (state) {
          setPosition(state.position);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, player]);

  const playTrack = async (uri: string) => {
    if (!deviceId || !isReady) return;

    try {
      const token = SpotifyAuth.getAccessToken();
      if (!token) return;

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [uri],
        }),
      });

      if (response.status === 401) {
        // Token lacks streaming permissions or is invalid
        console.error('401 Unauthorized - need re-authentication for playback');
        setNeedsReauth(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Playback error:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const togglePlayPause = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (needsReauth) {
    return (
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#ffebee', 
        border: '1px solid #f44336', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 15px 0', color: '#c62828' }}>
          🔄 <strong>Player Permissions Update Required</strong><br />
          Your login needs additional permissions for music playback.
        </p>
        <button
          onClick={() => SpotifyAuth.forceReauth()}
          style={{
            backgroundColor: '#1db954',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Update Permissions
        </button>
      </div>
    );
  }

  if (isPremium === false) {
    return (
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#fff3e0', 
        border: '1px solid #ffb74d', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#e65100' }}>
          🎵 <strong>Spotify Premium Required</strong><br />
          In-app playback requires a Spotify Premium subscription. 
          You can still use the "Open in Spotify" links to play tracks!
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        border: '1px solid #2196f3', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>🔄 Initializing Spotify Player...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#1db954', 
      color: 'white', 
      padding: '15px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {currentTrack && (
          <>
            {currentTrack.album.images[0] && (
              <img 
                src={currentTrack.album.images[0].url} 
                alt={currentTrack.album.name}
                style={{ width: '60px', height: '60px', borderRadius: '4px' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                {currentTrack.name}
              </h4>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
                {currentTrack.artists.map((artist: any) => artist.name).join(', ')}
              </p>
            </div>
          </>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={togglePlayPause}
            style={{
              backgroundColor: 'white',
              color: '#1db954',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          
          {currentTrack && (
            <div style={{ fontSize: '12px', minWidth: '80px' }}>
              {formatTime(position)} / {formatTime(duration)}
            </div>
          )}
        </div>
      </div>
      
      {trackUri && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => playTrack(trackUri)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Play Selected Track
          </button>
        </div>
      )}
    </div>
  );
};

export default SpotifyPlayerComponent;