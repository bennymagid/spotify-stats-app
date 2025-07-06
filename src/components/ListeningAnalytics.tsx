import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { SpotifyTrack } from '../services/spotifyApi';

interface ListeningAnalyticsProps {
  recentTracks: SpotifyTrack[];
  topTracks: SpotifyTrack[];
}

const COLORS = ['#1db954', '#1ed760', '#1aa34a', '#158c3d', '#0f6930'];

export const ListeningAnalytics: React.FC<ListeningAnalyticsProps> = ({ 
  recentTracks, 
  topTracks 
}) => {
  const artistAnalytics = useMemo(() => {
    const recentArtists = recentTracks.reduce((acc, track) => {
      track.artists.forEach(artist => {
        acc[artist.name] = (acc[artist.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topArtists = topTracks.reduce((acc, track) => {
      track.artists.forEach(artist => {
        acc[artist.name] = (acc[artist.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const combined = Object.entries(recentArtists)
      .map(([name, recentCount]) => ({
        name,
        recent: recentCount,
        allTime: topArtists[name] || 0,
      }))
      .sort((a, b) => b.recent - a.recent)
      .slice(0, 10);

    return combined;
  }, [recentTracks, topTracks]);

  const genreData = useMemo(() => {
    // Simple genre estimation based on track/artist patterns
    const genres: Record<string, number> = {};
    
    [...recentTracks, ...topTracks].forEach(track => {
      // This is a simplified genre detection - in reality you'd need more sophisticated analysis
      const trackName = track.name.toLowerCase();
      const artistName = track.artists[0]?.name.toLowerCase() || '';
      
      if (trackName.includes('remix') || trackName.includes('mix')) {
        genres['Electronic/Dance'] = (genres['Electronic/Dance'] || 0) + 1;
      } else if (artistName.includes('hip') || trackName.includes('rap')) {
        genres['Hip Hop/Rap'] = (genres['Hip Hop/Rap'] || 0) + 1;
      } else if (trackName.includes('acoustic') || trackName.includes('folk')) {
        genres['Folk/Acoustic'] = (genres['Folk/Acoustic'] || 0) + 1;
      } else if (trackName.includes('rock') || artistName.includes('rock')) {
        genres['Rock'] = (genres['Rock'] || 0) + 1;
      } else {
        genres['Pop/Other'] = (genres['Pop/Other'] || 0) + 1;
      }
    });

    return Object.entries(genres)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [recentTracks, topTracks]);

  const trackLengthData = useMemo(() => {
    const buckets = {
      'Short (< 3 min)': 0,
      'Medium (3-4 min)': 0,
      'Long (4-5 min)': 0,
      'Very Long (> 5 min)': 0,
    };

    [...recentTracks, ...topTracks].forEach(track => {
      const minutes = track.duration_ms / 60000;
      if (minutes < 3) buckets['Short (< 3 min)']++;
      else if (minutes < 4) buckets['Medium (3-4 min)']++;
      else if (minutes < 5) buckets['Long (4-5 min)']++;
      else buckets['Very Long (> 5 min)']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [recentTracks, topTracks]);

  if (recentTracks.length === 0 && topTracks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Load some tracks to see your listening analytics!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🎵 Your Listening Analytics</h2>
      
      {/* Artist Comparison */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Artist Listening Patterns</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Comparing recent listening vs. all-time favorites
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={artistAnalytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="recent" fill="#1db954" name="Recent Plays" />
              <Bar dataKey="allTime" fill="#1aa34a" name="All-Time Favorites" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Genre Distribution */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Music Genre Distribution</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Estimated genres based on track and artist names
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {genreData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Track Length Preferences */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Track Length Preferences</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          How long are the songs you listen to?
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={trackLengthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#1db954" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginTop: '40px'
      }}>
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1db954' }}>
            {new Set(recentTracks.flatMap(t => t.artists.map(a => a.name))).size}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Unique Artists (Recent)</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ff9800' }}>
            {new Set(topTracks.flatMap(t => t.artists.map(a => a.name))).size}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Unique Artists (Top)</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2196f3' }}>
            {Math.round([...recentTracks, ...topTracks].reduce((acc, track) => acc + track.duration_ms, 0) / 60000)}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Total Minutes</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#f3e5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#9c27b0' }}>
            {new Set([...recentTracks, ...topTracks].map(t => t.album.name)).size}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Unique Albums</p>
        </div>
      </div>
    </div>
  );
};

export default ListeningAnalytics;