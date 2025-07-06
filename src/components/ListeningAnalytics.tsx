import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { SpotifyApi, type SpotifyTrack, type SpotifyArtist } from '../services/spotifyApi';

interface ListeningAnalyticsProps {
  recentTracks: SpotifyTrack[];
  topTracks: SpotifyTrack[];
}

const COLORS = ['#1db954', '#1ed760', '#1aa34a', '#158c3d', '#0f6930'];

interface TimeRangeData {
  short_term: { tracks: SpotifyTrack[]; artists: SpotifyArtist[] };
  medium_term: { tracks: SpotifyTrack[]; artists: SpotifyArtist[] };
  long_term: { tracks: SpotifyTrack[]; artists: SpotifyArtist[] };
}

export const ListeningAnalytics: React.FC<ListeningAnalyticsProps> = ({ 
  recentTracks, 
  topTracks 
}) => {
  const [timeRangeData, setTimeRangeData] = useState<TimeRangeData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all time range data for analytics
  useEffect(() => {
    const loadTimeRangeData = async () => {
      if (topTracks.length === 0) return;
      
      setLoading(true);
      try {
        const data = await SpotifyApi.getAllTimeRangeData();
        setTimeRangeData({
          short_term: { tracks: data.tracks.short_term, artists: data.artists.short_term },
          medium_term: { tracks: data.tracks.medium_term, artists: data.artists.medium_term },
          long_term: { tracks: data.tracks.long_term, artists: data.artists.long_term }
        });
      } catch (error) {
        console.error('Error loading time range data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimeRangeData();
  }, [topTracks]);

  // Top artists over time evolution (monthly)
  const artistsOverTimeData = useMemo(() => {
    if (!timeRangeData) return [];

    const monthlyData = SpotifyApi.generateMonthlyData(
      timeRangeData.short_term.artists,
      timeRangeData.medium_term.artists,
      timeRangeData.long_term.artists
    );

    // Get top 5 artists overall from long term data
    const topArtists = timeRangeData.long_term.artists.slice(0, 5);
    
    return monthlyData.map(({ month, data }) => {
      const monthData: any = { month };
      topArtists.forEach((artist) => {
        const artistRank = data.findIndex(a => a.name === artist.name);
        monthData[artist.name] = artistRank >= 0 ? artistRank + 1 : null;
      });
      return monthData;
    });
  }, [timeRangeData]);

  // Top genres over time (monthly, using artist genres)
  const genresOverTimeData = useMemo(() => {
    if (!timeRangeData) return [];

    const monthlyData = SpotifyApi.generateMonthlyData(
      timeRangeData.short_term.artists,
      timeRangeData.medium_term.artists,
      timeRangeData.long_term.artists
    );

    // Get top 5 genres from all artists
    const allGenres = new Set<string>();
    timeRangeData.long_term.artists.forEach(artist => {
      artist.genres.slice(0, 2).forEach(genre => allGenres.add(genre));
    });
    const topGenres = Array.from(allGenres).slice(0, 5);

    return monthlyData.map(({ month, data }) => {
      const monthData: any = { month };
      topGenres.forEach(genre => {
        const count = data.reduce((acc, artist) => {
          return acc + (artist.genres.includes(genre) ? 1 : 0);
        }, 0);
        monthData[genre] = count;
      });
      return monthData;
    });
  }, [timeRangeData]);

  // Minutes listened over time (monthly)
  const minutesListenedData = useMemo(() => {
    if (!timeRangeData) return [];

    const monthlyData = SpotifyApi.generateMonthlyData(
      timeRangeData.short_term.tracks,
      timeRangeData.medium_term.tracks,
      timeRangeData.long_term.tracks
    );

    return monthlyData.map(({ month, data }) => {
      // Estimate monthly listening based on top tracks
      // This is an approximation since we don't have actual play counts
      const estimatedMinutes = data.reduce((acc, track, index) => {
        // Weight by position (higher ranked = more plays)
        const weight = Math.max(1, 10 - index);
        return acc + (track.duration_ms * weight) / 60000;
      }, 0);
      
      return {
        month,
        minutes: Math.round(estimatedMinutes)
      };
    });
  }, [timeRangeData]);

  if (recentTracks.length === 0 && topTracks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Load some tracks to see your listening analytics!</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>📊 Loading advanced analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🎵 Your Listening Analytics</h2>
      
      {/* Top Genres Over Time */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Top Genres Over Time</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Monthly evolution of your music taste (estimated from available data)
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={genresOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              {genresOverTimeData.length > 0 && Object.keys(genresOverTimeData[0]).filter(key => key !== 'month').map((genre, index) => (
                <Line 
                  key={genre}
                  type="monotone" 
                  dataKey={genre} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Artists Over Time */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Top Artists Over Time</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Monthly artist ranking evolution (lower rank number = more popular)
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={artistsOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis reversed domain={[1, 50]} />
              <Tooltip />
              {artistsOverTimeData.length > 0 && Object.keys(artistsOverTimeData[0]).filter(key => key !== 'month').map((artist, index) => (
                <Line 
                  key={artist}
                  type="monotone" 
                  dataKey={artist} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Minutes Listened Over Time */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Minutes Listened Over Time</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Monthly estimated listening volume (based on track popularity and duration)
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={minutesListenedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#1db954" />
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