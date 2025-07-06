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

  // Top artists over time evolution
  const artistsOverTimeData = useMemo(() => {
    if (!timeRangeData) return [];

    const periods = [
      { name: 'Last 4 weeks', data: timeRangeData.short_term.artists },
      { name: 'Last 6 months', data: timeRangeData.medium_term.artists },
      { name: 'All time', data: timeRangeData.long_term.artists }
    ];

    // Get top 5 artists overall
    const allArtists = [...timeRangeData.long_term.artists.slice(0, 5)];
    
    return periods.map(period => {
      const periodData: any = { period: period.name };
      allArtists.forEach((artist) => {
        const artistRank = period.data.findIndex(a => a.name === artist.name);
        periodData[artist.name] = artistRank >= 0 ? artistRank + 1 : null;
      });
      return periodData;
    });
  }, [timeRangeData]);

  // Top genres over time (using artist genres)
  const genresOverTimeData = useMemo(() => {
    if (!timeRangeData) return [];

    const periods = [
      { name: 'Last 4 weeks', data: timeRangeData.short_term.artists },
      { name: 'Last 6 months', data: timeRangeData.medium_term.artists },
      { name: 'All time', data: timeRangeData.long_term.artists }
    ];

    // Get top 5 genres from all artists
    const allGenres = new Set<string>();
    timeRangeData.long_term.artists.forEach(artist => {
      artist.genres.slice(0, 2).forEach(genre => allGenres.add(genre));
    });
    const topGenres = Array.from(allGenres).slice(0, 5);

    return periods.map(period => {
      const periodData: any = { period: period.name };
      topGenres.forEach(genre => {
        const count = period.data.reduce((acc, artist) => {
          return acc + (artist.genres.includes(genre) ? 1 : 0);
        }, 0);
        periodData[genre] = count;
      });
      return periodData;
    });
  }, [timeRangeData]);

  // Minutes listened over time
  const minutesListenedData = useMemo(() => {
    if (!timeRangeData) return [];

    const periods = [
      { name: 'Last 4 weeks', tracks: timeRangeData.short_term.tracks },
      { name: 'Last 6 months', tracks: timeRangeData.medium_term.tracks },
      { name: 'All time', tracks: timeRangeData.long_term.tracks }
    ];

    return periods.map(period => {
      const totalMinutes = period.tracks.reduce((acc, track) => acc + track.duration_ms, 0) / 60000;
      return {
        period: period.name,
        minutes: Math.round(totalMinutes)
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
          How your music taste evolves across different time periods
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={genresOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              {genresOverTimeData.length > 0 && Object.keys(genresOverTimeData[0]).filter(key => key !== 'period').map((genre, index) => (
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
          Artist ranking evolution (lower is better)
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={artistsOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis reversed domain={[1, 50]} />
              <Tooltip />
              {artistsOverTimeData.length > 0 && Object.keys(artistsOverTimeData[0]).filter(key => key !== 'period').map((artist, index) => (
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
          Your listening volume across different time periods
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={minutesListenedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
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