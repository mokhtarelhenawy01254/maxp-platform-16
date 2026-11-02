/**
 * youtubeTransport.js
 * Centralized transport wrapper for all external YouTube & Google OAuth requests.
 * In testing / mock mode (process.env.YOUTUBE_MOCK === '1'), intercepts all HTTP calls
 * to provide deterministic mock responses without hitting external APIs.
 */

const axios = require('axios');
const crypto = require('crypto');

function isMock() {
  return process.env.YOUTUBE_MOCK === '1';
}

async function mockCall(config) {
  if (process.env.YOUTUBE_MOCK_FAIL === '1') {
    const error = new Error('mock failure');
    error.response = {
      status: 500,
      data: { error: { code: 500, message: 'mock failure' } },
    };
    throw error;
  }

  const url = String(config.url || '');
  const method = String(config.method || 'GET').toUpperCase();

  // 1) OAuth Token exchange or refresh
  if (url.includes('oauth2.googleapis.com/token') || url.includes('/token')) {
    const isRefresh = (typeof config.data === 'string' && config.data.includes('grant_type=refresh_token')) ||
      (config.data && config.data.grant_type === 'refresh_token');
    return {
      status: 200,
      data: {
        access_token: 'mock_at_' + crypto.randomBytes(8).toString('hex'),
        refresh_token: isRefresh ? undefined : 'mock_rt_' + crypto.randomBytes(8).toString('hex'),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      },
    };
  }

  // 2) Channel details: mine=true
  if (url.includes('/youtube/v3/channels')) {
    const channelId = config.params?.id || 'mock_channel';
    return {
      status: 200,
      data: {
        items: [
          {
            id: channelId,
            snippet: {
              title: 'QA Channel',
              description: 'QA Channel Description',
              thumbnails: {
                default: { url: 'https://example.com/mock-avatar.png' },
              },
            },
            contentDetails: {
              relatedPlaylists: {
                uploads: 'UU' + String(channelId).replace(/^UC/, ''),
              },
            },
          },
        ],
      },
    };
  }

  // 2.5) Playlist items (course videos listing)
  if (url.includes('/youtube/v3/playlistItems')) {
    const playlistId = config.params?.playlistId || 'mock_playlist';
    if (playlistId === 'unavailable_playlist' || playlistId === 'private_playlist') {
      const error = new Error('Playlist unavailable');
      error.response = {
        status: 404,
        data: { error: { code: 404, message: 'The playlist was not found or is private' } },
      };
      throw error;
    }
    return {
      status: 200,
      data: {
        items: [
          {
            id: 'mock_pi_1',
            contentDetails: { videoId: 'mockVid_1' },
            snippet: {
              title: 'الدرس 1: مقدمة المسار وأساسيات التدريب',
              description: 'شرح تمهيدي للكورس ومحتوياته',
              resourceId: { videoId: 'mockVid_1' },
              thumbnails: {
                high: { url: 'https://img.youtube.com/vi/mockVid_1/hqdefault.jpg' },
              },
            },
          },
          {
            id: 'mock_pi_2',
            contentDetails: { videoId: 'mockVid_2' },
            snippet: {
              title: 'الدرس 2: التطبيق العملي وبناء المشروع',
              description: 'تطبيق عملي خطوة بخطوة',
              resourceId: { videoId: 'mockVid_2' },
              thumbnails: {
                high: { url: 'https://img.youtube.com/vi/mockVid_2/hqdefault.jpg' },
              },
            },
          },
          {
            id: 'mock_pi_3',
            contentDetails: { videoId: 'mockVid_3' },
            snippet: {
              title: 'الدرس 3: أفضل الممارسات والاستراتيجيات المتقدمة',
              description: 'خاتمة السلسلة والمفاهيم المتقدمة',
              resourceId: { videoId: 'mockVid_3' },
              thumbnails: {
                high: { url: 'https://img.youtube.com/vi/mockVid_3/hqdefault.jpg' },
              },
            },
          },
        ],
      },
    };
  }

  // 3) Resumable video upload initiation
  if (url.includes('/upload/youtube/v3/videos') && (url.includes('uploadType=resumable') || config.params?.uploadType === 'resumable')) {
    const sessionUuid = crypto.randomUUID();
    return {
      status: 200,
      headers: {
        location: `mock://youtube/upload/${sessionUuid}`,
      },
      data: {},
    };
  }

  // 4) Upload video binary to resumable upload URI
  if (url.startsWith('mock://youtube/upload/') || (method === 'PUT' && url.includes('mock://'))) {
    const vidId = 'mockVid_' + crypto.randomBytes(6).toString('hex');
    return {
      status: 200,
      data: {
        id: vidId,
        status: {
          uploadStatus: 'uploaded',
        },
      },
    };
  }

  // 5) Video status and details polling
  if (url.includes('/youtube/v3/videos')) {
    const rawId = config.params?.id || 'mockVid_default';
    const ids = String(rawId).split(',').map((id) => id.trim()).filter(Boolean);
    const mockDurations = {
      mockVid_1: 'PT15M30S',
      mockVid_2: 'PT25M10S',
      mockVid_3: 'PT40M00S',
    };
    return {
      status: 200,
      data: {
        items: ids.map((vidId, idx) => ({
          id: vidId,
          snippet: {
            title: `QA Video ${vidId}`,
            description: 'Uploaded via QA',
          },
          contentDetails: {
            duration: mockDurations[vidId] || `PT${(idx + 1) * 10}M00S`,
          },
          status: {
            uploadStatus: 'processed',
            privacyStatus: config.params?.privacyStatus || 'private',
            failureReason: null,
          },
        })),
      },
    };
  }

  // Fallback mock response
  return {
    status: 200,
    data: { success: true, mock: true },
  };
}

async function call(config) {
  if (isMock()) {
    return mockCall(config);
  }
  return axios({ timeout: 20000, ...config });
}

module.exports = {
  call,
  isMock,
  get MOCK() {
    return isMock();
  },
};
