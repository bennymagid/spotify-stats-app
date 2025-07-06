import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type SpotifyTrack, type SpotifyArtist } from '../services/spotifyApi';

interface ListeningAnalyticsProps {
  recentTracks: SpotifyTrack[];
  topTracks: SpotifyTrack[];
  allTimeRangeData: {
    tracks: {
      short_term: SpotifyTrack[];
      medium_term: SpotifyTrack[];
      long_term: SpotifyTrack[];
    };
    artists: {
      short_term: SpotifyArtist[];
      medium_term: SpotifyArtist[];
      long_term: SpotifyArtist[];
    };
  } | null;
}

const COLORS = ['#1db954', '#1ed760', '#1aa34a', '#158c3d', '#0f6930'];

export const ListeningAnalytics: React.FC<ListeningAnalyticsProps> = ({ 
  recentTracks, 
  topTracks,
  allTimeRangeData
}) => {
  // Genre distribution across time periods (stacked bar chart)
  const genreComparisonData = useMemo(() => {
    if (!allTimeRangeData) return [];

    const timeRanges = [
      { name: 'Last 4 weeks', artists: allTimeRangeData.artists.short_term },
      { name: 'Last 6 months', artists: allTimeRangeData.artists.medium_term },
      { name: 'All time', artists: allTimeRangeData.artists.long_term }
    ];

    // Get all unique genres from long term data (most comprehensive)
    const allGenres = new Set<string>();
    allTimeRangeData.artists.long_term.forEach(artist => {
      artist.genres.slice(0, 2).forEach(genre => allGenres.add(genre));
    });
    const topGenres = Array.from(allGenres).slice(0, 5);

    return timeRanges.map(({ name, artists }) => {
      const total = artists.length;
      const genreCounts: Record<string, number> = {};
      
      // Count artists by genre
      topGenres.forEach(genre => {
        genreCounts[genre] = artists.filter(artist => 
          artist.genres.includes(genre)
        ).length;
      });

      // Convert to percentages
      const percentages: any = { period: name };
      topGenres.forEach(genre => {
        percentages[genre] = total > 0 ? Math.round((genreCounts[genre] / total) * 100) : 0;
      });

      return percentages;
    });
  }, [allTimeRangeData]);

  // Artist ranking comparison across time periods
  const artistRankingData = useMemo(() => {
    if (!allTimeRangeData) return [];

    // Get top 8 artists from long term (all time favorites)
    const topArtists = allTimeRangeData.artists.long_term.slice(0, 8);

    return topArtists.map(artist => {
      const shortTermRank = allTimeRangeData.artists.short_term.findIndex(a => a.name === artist.name);
      const mediumTermRank = allTimeRangeData.artists.medium_term.findIndex(a => a.name === artist.name);
      const longTermRank = allTimeRangeData.artists.long_term.findIndex(a => a.name === artist.name);

      return {
        artist: artist.name.length > 15 ? artist.name.substring(0, 15) + '...' : artist.name,
        'Last 4 weeks': shortTermRank >= 0 ? shortTermRank + 1 : null,
        'Last 6 months': mediumTermRank >= 0 ? mediumTermRank + 1 : null,
        'All time': longTermRank + 1
      };
    });
  }, [allTimeRangeData]);

  // Listening intensity comparison
  const listeningIntensityData = useMemo(() => {
    if (!allTimeRangeData) return [];

    const timeRanges = [
      { 
        name: 'Last 4 weeks', 
        tracks: allTimeRangeData.tracks.short_term,
        description: '~4 weeks of data'
      },
      { 
        name: 'Last 6 months', 
        tracks: allTimeRangeData.tracks.medium_term,
        description: '~6 months of data'
      },
      { 
        name: 'All time', 
        tracks: allTimeRangeData.tracks.long_term,
        description: 'Your entire Spotify history'
      }
    ];

    return timeRanges.map(({ name, tracks, description }) => {
      // Calculate average track length
      const avgTrackLength = tracks.length > 0 
        ? tracks.reduce((sum, track) => sum + track.duration_ms, 0) / tracks.length / 60000
        : 0;

      return {
        period: name,
        'Unique tracks': tracks.length,
        'Avg track length (min)': Math.round(avgTrackLength * 10) / 10,
        description
      };
    });
  }, [allTimeRangeData]);

  if (recentTracks.length === 0 && topTracks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Load some tracks to see your listening analytics!</p>
      </div>
    );
  }

  if (!allTimeRangeData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>📊 Load your top tracks to see detailed analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🎵 Your Listening Analytics</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Comparing your music taste across three real time periods from Spotify
      </p>
      
      {/* Genre Distribution Comparison */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Genre Distribution by Time Period</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Percentage of artists in your top lists by genre (based on Spotify's genre data)
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={genreComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              {genreComparisonData.length > 0 && Object.keys(genreComparisonData[0])
                .filter(key => key !== 'period')
                .map((genre, index) => (
                  <Bar 
                    key={genre} 
                    dataKey={genre} 
                    stackId="genres"
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Artist Ranking Comparison */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Top Artists Ranking Comparison</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          How your all-time favorite artists rank in different time periods (lower number = higher rank)
        </p>
        <div style={{ height: '400px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart 
              data={artistRankingData} 
              layout="horizontal"
              margin={{ left: 100, right: 30, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 50]} />
              <YAxis 
                type="category" 
                dataKey="artist" 
                width={90}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value, name) => [
                  value ? `#${value}` : 'Not in top 50', 
                  name
                ]}
              />
              <Bar dataKey="Last 4 weeks" fill="#1db954" />
              <Bar dataKey="Last 6 months" fill="#1aa34a" />
              <Bar dataKey="All time" fill="#158c3d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listening Activity Comparison */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Listening Activity Comparison</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Your music discovery and listening patterns across time periods
        </p>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={listeningIntensityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Unique tracks" fill="#1db954" name="Unique Top Tracks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p><strong>Note:</strong> "Unique tracks" shows how many different songs made it to your top lists in each time period.</p>
          <p>More tracks in recent periods might indicate increased music discovery.</p>
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
            {allTimeRangeData?.artists.short_term.length || 0}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Top Artists (4 weeks)</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ff9800' }}>
            {allTimeRangeData?.artists.medium_term.length || 0}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Top Artists (6 months)</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2196f3' }}>
            {allTimeRangeData?.artists.long_term.length || 0}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Top Artists (All time)</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#f3e5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#9c27b0' }}>
            {new Set([
              ...allTimeRangeData?.artists.short_term.flatMap(a => a.genres) || [],
              ...allTimeRangeData?.artists.medium_term.flatMap(a => a.genres) || [],
              ...allTimeRangeData?.artists.long_term.flatMap(a => a.genres) || []
            ]).size}
          </h4>
          <p style={{ margin: 0, color: '#666' }}>Unique Genres</p>
        </div>
      </div>

      {/* Data Explanation */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginTop: '40px',
        fontSize: '14px',
        color: '#666'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>About This Data</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>Last 4 weeks:</strong> Your most played tracks and artists from approximately the last month</li>
          <li><strong>Last 6 months:</strong> Your most played tracks and artists from approximately the last 6 months</li>
          <li><strong>All time:</strong> Your most played tracks and artists calculated over your entire Spotify listening history</li>
          <li><strong>Genres:</strong> Based on Spotify's genre classifications for your top artists</li>
          <li><strong>Rankings:</strong> Lower numbers indicate higher popularity in that time period</li>
        </ul>
      </div>
    </div>
  );
};

export default ListeningAnalytics;