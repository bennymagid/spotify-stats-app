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
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        SpotifyAuth.logout();
        throw new Error('Authentication expired. Please log in again.');
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
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    const response = await this.makeRequest<TopTracksResponse>(
      `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
    );
    return response.items;
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