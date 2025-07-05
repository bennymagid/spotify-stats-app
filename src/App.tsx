import { useState, useEffect } from 'react'
import { SpotifyAuth } from './services/spotifyAuth'
import { SpotifyApi, type SpotifyTrack, type SpotifyAudioFeatures } from './services/spotifyApi'
import SpotifyCallback from './components/SpotifyCallback'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([])
  const [trackFeatures, setTrackFeatures] = useState<SpotifyAudioFeatures[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

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
    setTrackFeatures([])
  }

  const loadUserData = async () => {
    setLoading(true)
    setError('')
    try {
      const userData = await SpotifyApi.getCurrentUser()
      setUser(userData)
      
      const recentlyPlayed = await SpotifyApi.getRecentlyPlayed(10)
      const tracks = recentlyPlayed.map(item => item.track)
      setRecentTracks(tracks)
      
      const trackIds = tracks.map(track => track.id)
      const features = await SpotifyApi.getAudioFeatures(trackIds)
      setTrackFeatures(features)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
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
              <button onClick={loadUserData} disabled={loading}>
                {loading ? 'Loading...' : 'Load My Recent Tracks'}
              </button>
              <button onClick={handleLogout} style={{ marginLeft: '10px' }}>
                Logout
              </button>
            </div>
            
            {user && (
              <div>
                <h2>Welcome, {user.display_name}!</h2>
              </div>
            )}
            
            {error && (
              <div style={{ color: 'red', margin: '10px 0' }}>
                Error: {error}
              </div>
            )}
            
            {recentTracks.length > 0 && (
              <div>
                <h3>Your Recent Tracks with Audio Features:</h3>
                <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                  {recentTracks.map((track, index) => {
                    const features = trackFeatures[index]
                    return (
                      <div key={track.id} style={{ 
                        border: '1px solid #ddd', 
                        padding: '15px', 
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                      }}>
                        <h4>{track.name}</h4>
                        <p>by {track.artists.map(a => a.name).join(', ')}</p>
                        <p>Album: {track.album.name}</p>
                        
                        {features && (
                          <div style={{ marginTop: '10px' }}>
                            <h5>Audio Features:</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                              <div>Danceability: {(features.danceability * 100).toFixed(1)}%</div>
                              <div>Energy: {(features.energy * 100).toFixed(1)}%</div>
                              <div>Valence: {(features.valence * 100).toFixed(1)}%</div>
                              <div>Tempo: {features.tempo.toFixed(0)} BPM</div>
                              <div>Acousticness: {(features.acousticness * 100).toFixed(1)}%</div>
                              <div>Instrumentalness: {(features.instrumentalness * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
