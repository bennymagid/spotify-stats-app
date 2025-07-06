import { useState, useEffect } from 'react'
import { SpotifyAuth } from './services/spotifyAuth'
import { SpotifyApi, type SpotifyTrack } from './services/spotifyApi'
import SpotifyCallback from './components/SpotifyCallback'
import SpotifyPlayerComponent from './components/SpotifyPlayer'
import ListeningAnalytics from './components/ListeningAnalytics'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([])
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'recent' | 'top' | 'analytics'>('recent')
  const [selectedTrackUri, setSelectedTrackUri] = useState<string>('')

  // Helper function to get artist stats
  const getArtistStats = (tracks: SpotifyTrack[]) => {
    const artistCounts = tracks.reduce((acc, track) => {
      track.artists.forEach(artist => {
        acc[artist.name] = (acc[artist.name] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }

  useEffect(() => {
    setIsAuthenticated(SpotifyAuth.isAuthenticated())
  }, [])

  const handleLogin = async () => {
    try {
      await SpotifyAuth.initiateAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleLogout = () => {
    SpotifyAuth.logout()
    setIsAuthenticated(false)
    setUser(null)
    setRecentTracks([])
    setTopTracks([])
  }

  const loadRecentTracks = async () => {
    setLoading(true)
    setError('')
    try {
      if (!user) {
        const userData = await SpotifyApi.getCurrentUser()
        setUser(userData)
      }
      
      const recentlyPlayed = await SpotifyApi.getRecentlyPlayed(20)
      const tracks = recentlyPlayed.map(item => item.track)
      setRecentTracks(tracks)
      setActiveTab('recent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent tracks')
    } finally {
      setLoading(false)
    }
  }

  const loadTopTracks = async () => {
    setLoading(true)
    setError('')
    try {
      if (!user) {
        const userData = await SpotifyApi.getCurrentUser()
        setUser(userData)
      }
      
      const tracks = await SpotifyApi.getTopTracks('long_term', 20)
      setTopTracks(tracks)
      setActiveTab('top')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top tracks')
    } finally {
      setLoading(false)
    }
  }

  // Check if we're on the callback page
  if (window.location.pathname === '/callback') {
    return <SpotifyCallback />
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Stats</h1>
        
        {!isAuthenticated ? (
          <div>
            <p>Connect your Spotify account to view your listening stats</p>
            <button onClick={handleLogin}>Login with Spotify</button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button 
                onClick={loadRecentTracks} 
                disabled={loading}
                style={{ 
                  backgroundColor: activeTab === 'recent' ? '#1db954' : '#f0f0f0',
                  color: activeTab === 'recent' ? 'white' : 'black',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                {loading && activeTab === 'recent' ? 'Loading...' : 'Recent Tracks'}
              </button>
              <button 
                onClick={loadTopTracks} 
                disabled={loading} 
                style={{ 
                  backgroundColor: activeTab === 'top' ? '#1db954' : '#f0f0f0',
                  color: activeTab === 'top' ? 'white' : 'black',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                {loading && activeTab === 'top' ? 'Loading...' : 'Top Tracks'}
              </button>
              <button 
                onClick={() => setActiveTab('analytics')} 
                disabled={loading}
                style={{ 
                  backgroundColor: activeTab === 'analytics' ? '#1db954' : '#f0f0f0',
                  color: activeTab === 'analytics' ? 'white' : 'black',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                Analytics
              </button>
              <button 
                onClick={handleLogout} 
                style={{ 
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
            
            {/* Spotify Player */}
            {isAuthenticated && (
              <SpotifyPlayerComponent 
                trackUri={selectedTrackUri}
                onTrackChange={(track) => console.log('Now playing:', track)}
              />
            )}
            
            {user && (
              <div>
                <h2>Welcome, {user.display_name}!</h2>
                {SpotifyAuth.needsReauth() && (
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '1px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    margin: '15px 0',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                      ⚠️ <strong>Enhanced Features Available!</strong><br />
                      Update your permissions to enable in-app music playback.
                    </p>
                    <button
                      onClick={() => SpotifyAuth.forceReauth()}
                      style={{
                        backgroundColor: '#1db954',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '15px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Enable Player Features
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div style={{ 
                color: 'red', 
                margin: '10px 0', 
                padding: '15px', 
                border: '1px solid #ffcdd2', 
                borderRadius: '8px', 
                backgroundColor: '#ffebee',
                textAlign: 'left',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <strong>Error:</strong> {error}
                {error.includes('Development Mode') && (
                  <div style={{ marginTop: '10px', fontSize: '14px' }}>
                    <p><strong>How to fix:</strong></p>
                    <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
                      <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a></li>
                      <li>Open your app settings</li>
                      <li>Go to "Users and Access"</li>
                      <li>Add your Spotify email/username to the user list</li>
                      <li>Or request a quota extension to move out of Development Mode</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
            
            {/* Recent Tracks */}
            {activeTab === 'recent' && recentTracks.length > 0 && (
              <div>
                <h3>Your Recent Tracks</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Last {recentTracks.length} tracks you've listened to
                </p>
                
                {/* Artist Stats for Recent Tracks */}
                <div style={{ 
                  backgroundColor: '#e8f5e8', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>🎵 Most Played Artists (Recent)</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {getArtistStats(recentTracks).map(({ name, count }) => (
                      <span key={name} style={{ 
                        backgroundColor: '#1db954', 
                        color: 'white', 
                        padding: '5px 10px', 
                        borderRadius: '15px', 
                        fontSize: '14px' 
                      }}>
                        {name} ({count})
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                  {recentTracks.map((track, index) => (
                    <div key={`${track.id}-${index}`} style={{ 
                      border: '1px solid #ddd', 
                      padding: '15px', 
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      {track.album.images[0] && (
                        <img 
                          src={track.album.images[0].url} 
                          alt={track.album.name}
                          style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{track.name}</h4>
                        <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                          by {track.artists.map(a => a.name).join(', ')}
                        </p>
                        <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
                          Album: {track.album.name} • {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                          <button
                            onClick={() => {
                              const trackUri = `spotify:track:${track.id}`;
                              setSelectedTrackUri(trackUri);
                            }}
                            style={{
                              backgroundColor: '#1db954',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '15px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ▶️ Play
                          </button>
                          <a 
                            href={track.external_urls.spotify} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#1db954', 
                              textDecoration: 'none', 
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            Open in Spotify ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Tracks */}
            {activeTab === 'top' && topTracks.length > 0 && (
              <div>
                <h3>Your Top Tracks</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Your most played tracks of all time
                </p>
                
                {/* Artist Stats for Top Tracks */}
                <div style={{ 
                  backgroundColor: '#fff3e0', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>🏆 Your Favorite Artists</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {getArtistStats(topTracks).map(({ name, count }) => (
                      <span key={name} style={{ 
                        backgroundColor: '#ff9800', 
                        color: 'white', 
                        padding: '5px 10px', 
                        borderRadius: '15px', 
                        fontSize: '14px' 
                      }}>
                        {name} ({count})
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                  {topTracks.map((track, index) => (
                    <div key={track.id} style={{ 
                      border: '1px solid #ddd', 
                      padding: '15px', 
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      <div style={{ 
                        backgroundColor: '#1db954', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '30px', 
                        height: '30px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </div>
                      {track.album.images[0] && (
                        <img 
                          src={track.album.images[0].url} 
                          alt={track.album.name}
                          style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{track.name}</h4>
                        <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                          by {track.artists.map(a => a.name).join(', ')}
                        </p>
                        <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
                          Album: {track.album.name} • {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                          <button
                            onClick={() => {
                              const trackUri = `spotify:track:${track.id}`;
                              setSelectedTrackUri(trackUri);
                            }}
                            style={{
                              backgroundColor: '#1db954',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '15px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ▶️ Play
                          </button>
                          <a 
                            href={track.external_urls.spotify} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#1db954', 
                              textDecoration: 'none', 
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            Open in Spotify ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <ListeningAnalytics 
                recentTracks={recentTracks} 
                topTracks={topTracks} 
              />
            )}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
