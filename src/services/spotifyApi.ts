import axios, { type AxiosResponse } from 'axios';
import { SpotifyAuth } from './spotifyAuth';

const API_BASE_URL = 'https://api.spotify.com/v1';

// Spotify API Types
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: Array<{ url: string }>;
  popularity: number;
  external_urls: { spotify: string };
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export interface TopTracksResponse {
  items: SpotifyTrack[];
  total: number;
}

export class SpotifyApi {
  private static async makeRequest<T>(url: string): Promise<T> {
    const token = SpotifyAuth.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    try {
      const response: AxiosResponse<T> = await axios.get(`${API_BASE_URL}${url}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        console.error('Spotify API Error:', {
          status,
          url: `${API_BASE_URL}${url}`,
          error: errorData
        });

        if (status === 401) {
          SpotifyAuth.logout();
          throw new Error('Authentication expired. Please log in again.');
        }
        
        if (status === 403) {
          if (errorData?.error?.message?.includes('Development mode')) {
            throw new Error('Spotify app is in Development Mode. You need to add your account to the app\'s user list in the Spotify Developer Dashboard, or request a quota extension.');
          }
          throw new Error(`Access forbidden (403): ${errorData?.error?.message || 'Your Spotify app may be in Development Mode. Check your app settings in the Spotify Developer Dashboard.'}`);
        }
        
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        throw new Error(`Spotify API error (${status}): ${errorData?.error?.message || error.message}`);
      }
      
      throw error;
    }
  }

  static async getCurrentUser(): Promise<SpotifyUser> {
    return this.makeRequest<SpotifyUser>('/me');
  }

  static async getRecentlyPlayed(limit: number = 20): Promise<RecentlyPlayedItem[]> {
    const response = await this.makeRequest<{ items: RecentlyPlayedItem[] }>(
      `/me/player/recently-played?limit=${limit}`
    );
    return response.items;
  }

  static async getTopTracks(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term',
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    const response = await this.makeRequest<TopTracksResponse>(
      `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
    );
    return response.items;
  }

  static async getTopArtists(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term',
    limit: number = 20
  ): Promise<SpotifyArtist[]> {
    const response = await this.makeRequest<{ items: SpotifyArtist[] }>(
      `/me/top/artists?time_range=${timeRange}&limit=${limit}`
    );
    return response.items;
  }

  static async getAllTimeRangeData(): Promise<{
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
  }> {
    const [
      shortTermTracks, mediumTermTracks, longTermTracks,
      shortTermArtists, mediumTermArtists, longTermArtists
    ] = await Promise.all([
      this.getTopTracks('short_term', 50),
      this.getTopTracks('medium_term', 50),
      this.getTopTracks('long_term', 50),
      this.getTopArtists('short_term', 50),
      this.getTopArtists('medium_term', 50),
      this.getTopArtists('long_term', 50),
    ]);

    return {
      tracks: {
        short_term: shortTermTracks,
        medium_term: mediumTermTracks,
        long_term: longTermTracks,
      },
      artists: {
        short_term: shortTermArtists,
        medium_term: mediumTermArtists,
        long_term: longTermArtists,
      },
    };
  }

  static generateMonthlyData<T extends { name: string }>(
    shortTerm: T[], 
    mediumTerm: T[], 
    longTerm: T[]
  ): Array<{ month: string; data: T[] }> {
    const now = new Date();
    const months = [];
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      let data: T[];
      if (i === 0) {
        // Current month - use short term data
        data = shortTerm.slice(0, 10);
      } else if (i <= 1) {
        // Last 1-2 months - blend short and medium term
        data = this.blendData(shortTerm, mediumTerm, 0.7).slice(0, 10);
      } else if (i <= 6) {
        // Last 2-6 months - use medium term data
        data = mediumTerm.slice(0, 10);
      } else {
        // 6+ months ago - blend medium and long term
        data = this.blendData(mediumTerm, longTerm, 0.3).slice(0, 10);
      }
      
      months.push({ month: monthName, data });
    }
    
    return months;
  }

  private static blendData<T extends { name: string }>(primary: T[], secondary: T[], primaryWeight: number): T[] {
    const blended = [...primary];
    const secondaryWeight = 1 - primaryWeight;
    
    // Add some variation by including items from secondary list
    secondary.forEach((item, index) => {
      if (Math.random() < secondaryWeight && index < blended.length / 2) {
        // Replace some items with secondary data for variation
        const replaceIndex = Math.floor(Math.random() * Math.min(blended.length, 5));
        if (!blended.some(b => b.name === item.name)) {
          blended[replaceIndex] = item;
        }
      }
    });
    
    return blended;
  }

  static async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    const ids = trackIds.join(',');
    const response = await this.makeRequest<{ audio_features: SpotifyAudioFeatures[] }>(
      `/audio-features?ids=${ids}`
    );
    return response.audio_features;
  }

  static async getTrackWithFeatures(trackId: string): Promise<{
    track: SpotifyTrack;
    features: SpotifyAudioFeatures;
  }> {
    const [track, features] = await Promise.all([
      this.makeRequest<SpotifyTrack>(`/tracks/${trackId}`),
      this.makeRequest<SpotifyAudioFeatures>(`/audio-features/${trackId}`),
    ]);
    return { track, features };
  }
}