import Keycloak from "keycloak-js";

const KEYCLOAK_URL =
  import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || "link-wars";
const KEYCLOAK_CLIENT_ID =
  import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "link-wars-portal";

// Singleton state
const state = {
  instance: null as Keycloak | null,
  initPromise: null as Promise<boolean> | null,
};

function getKeycloakInstance(): Keycloak {
  if (!state.instance) {
    state.instance = new Keycloak({
      url: KEYCLOAK_URL,
      realm: KEYCLOAK_REALM,
      clientId: KEYCLOAK_CLIENT_ID,
    });
  }
  return state.instance;
}

export async function initKeycloak(): Promise<Keycloak | null> {
  const kc = getKeycloakInstance();

  // If already initialized, return instance if authenticated
  if (kc.didInitialize) {
    return kc.authenticated ? kc : null;
  }

  // If initialization is in progress, wait and return result
  if (state.initPromise) {
    const authenticated = await state.initPromise;
    return authenticated ? kc : null;
  }

  // Start initialization
  state.initPromise = kc.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  const authenticated = await state.initPromise;
  return authenticated ? kc : null;
}

export function getKeycloak(): Keycloak {
  return getKeycloakInstance();
}

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export function parseUserFromToken(kc: Keycloak): KeycloakUser | null {
  if (!kc.tokenParsed) return null;

  const token = kc.tokenParsed as {
    sub: string;
    preferred_username: string;
    email: string;
    given_name?: string;
    family_name?: string;
    realm_access?: { roles: string[] };
  };

  return {
    id: token.sub,
    username: token.preferred_username,
    email: token.email,
    firstName: token.given_name,
    lastName: token.family_name,
    roles: token.realm_access?.roles || [],
  };
}
