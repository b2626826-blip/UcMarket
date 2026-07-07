import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Object.values(firebaseConfig).every(Boolean);

const app = firebaseEnabled ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = firebaseEnabled ? new GoogleAuthProvider() : null;
export const githubProvider = firebaseEnabled ? new GithubAuthProvider() : null;
export const facebookProvider = firebaseEnabled ? new FacebookAuthProvider() : null;

export const OAuthProviders = {
  GOOGLE: googleProvider,
  GITHUB: githubProvider,
  FACEBOOK: facebookProvider,
};
