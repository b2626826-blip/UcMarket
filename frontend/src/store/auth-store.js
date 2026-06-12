const SESSION_KEY = "ucmarket-dev-session";

function readSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

const state = {
  user: readSession()
};

export const authStore = {
  async refreshSession() {
    state.user = readSession();
    return state.user;
  },
  isAuthenticated() {
    return Boolean(state.user);
  },
  isAdmin() {
    return state.user?.role === "admin";
  },
  getUser() {
    return state.user;
  },
  async logout() {
    writeSession(null);
    state.user = null;
  }
};
