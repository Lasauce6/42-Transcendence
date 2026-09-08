interface OAuthProviderConfig {
  clientId: string;
  authorizeUrl: string;
  scope: string;
}

const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    clientId: 'TODO_CLIENT_ID',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
  },
  github: {
    clientId: 'TODO_CLIENT_ID',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    scope: 'read:user user:email',
  },
  fortytwo: {
    clientId: 'TODO_CLIENT_ID',
    authorizeUrl: 'https://api.intra.42.fr/oauth/authorize',
    scope: 'public',
  },
};
