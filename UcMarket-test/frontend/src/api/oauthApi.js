import { postApi } from './client';

export function firebaseLogin(idToken, provider) {
  return postApi('/api/auth/oauth/firebase', { idToken, provider });
}
