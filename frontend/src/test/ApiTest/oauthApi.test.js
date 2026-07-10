import { describe, it, expect, beforeEach } from 'vitest';
import { firebaseLogin } from '../../api/oauthApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('oauthApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('firebaseLogin：POST /api/auth/oauth/firebase 帶 { idToken, provider }', async () => {
    await firebaseLogin('tok', 'google');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/auth/oauth/firebase'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ idToken: 'tok', provider: 'google' }));
  });
});
