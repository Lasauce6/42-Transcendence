# Frontend

Application Angular pour l'interface utilisateur de Transcendence (projet 42).

## Stack technique

| Composant | Technologie |
| --- | --- |
| Framework | Angular 21.2.x |
| Langage | TypeScript ~5.9.2 |
| Outil de build | Angular CLI (Vite) via `@angular/build` |
| Package manager | npm 11.14.1 |
| Style | SCSS (Sass) |
| Routing | `@angular/router` ^21.2.0 |
| Reativite | Angular Signals (natif) |
| Forms | `@angular/forms` (installe, non utilise) |
| HTTP | `@angular/common` (installe, non utilise) |
| RxJS | ~7.8.0 |
| Tests | Vitest ^4.0.8 (pas Karma/Jasmine) |
| Formatage | Prettier ^3.8.1 |
| Runtime (Docker) | Node.js 20 Alpine |

> **Note:** Ce projet utilise l'architecture **standalone** (pas de NgModules), pattern par defaut depuis Angular 19+.

## Structure du projet

```
frontend/
  Dockerfile                   # Image Node 20 Alpine + ng serve
  package.json                 # Dependances et scripts
  angular.json                 # Configuration Angular CLI
  tsconfig.json                # Configuration TypeScript racine
  tsconfig.app.json            # Config TS pour l'app
  tsconfig.spec.json           # Config TS pour les tests (Vitest)
  .prettierrc                  # Configuration Prettier
  .editorconfig                # Regles d'edition
  public/
    favicon.ico                # Favicon statique
  src/
    index.html                 # Point d'entree HTML
    main.ts                    # Bootstrap de l'application
    styles.scss                # Styles globaux (vide)
    app/
      app.ts                   # Composant racine (standalone)
      app.html                 # Template du composant racine
      app.scss                 # Styles du composant racine (vide)
      app.config.ts            # Configuration de l'app (providers)
      app.routes.ts            # Tableau de routes (vide)
      app.spec.ts              # Test du composant racine
```

## Etat actuel

Le frontend est un **projet Angular 21 fraichement genere** par Angular CLI. Il contient uniquement:

- La page d'accueil par defaut d'Angular
- Le composant racine `App` avec un signal TypeScript
- L'infrastructure de routing prete mais vide
- Aucun composant, service, garde, intercepteur ou pipe custom

## Architecture

### Composants standalone

Le projet utilise l'architecture **standalone** (pas de NgModules):

```typescript
// app.ts - Pattern a suivre pour les composants futurs
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],  // Dependances declarees directement
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frontend');
}
```

### Configuration de l'app

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
```

### Routes

Routes definies dans `app.routes.ts` (actuellement vide):

```typescript
export const routes: Routes = [];
```

### Tests

Le projet utilise **Vitest** (pas Karma/Jasmine):

- Runner: `@angular/build:unit-test` (Vitest-based)
- Types: `vitest/globals` dans `tsconfig.spec.json`
- DOM: `jsdom` ^28.0.0
- Commande: `ng test`

## Scripts npm

| Script | Commande | Description |
| --- | --- | --- |
| `start` | `ng serve` | Serveur de developpement (port 4200) |
| `build` | `ng build` | Build de production |
| `watch` | `ng build --watch` | Mode watch (development) |
| `test` | `ng test` | Lancer les tests unitaires |
| `ng` | `ng` | Acces direct au CLI Angular |

## Configuration

### Prettier

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

### TypeScript

- Mode strict active
- Target: ES2022
- Angular strict templates actives

### angular.json

- Builder: `@angular/build:application` (Vite)
- Style par defaut: SCSS
- Prefixe des composants: `app`
- Budget production: 500kB warning / 1MB error (initial)

## Connexion au backend

Le frontend communique avec le backend via Nginx (reverse proxy):

| Type | URL | Destination |
| --- | --- | --- |
| REST API | `/api/*` | `http://backend:8000` |
| Admin | `/admin/*` | `http://backend:8000` |
| WebSocket | `/ws/*` | `http://backend:8000` |
| Frontend | `/*` | `http://frontend:4200` |

Depuis le navigateur, tout passe par le meme origine (port 80 via Nginx), pas de CORS.

### Endpoints backend disponibles

| Endpoint | Methode | Description |
| --- | --- | --- |
| `/api/register/` | POST | Inscription |
| `/api/token/` | POST | Login (JWT) |
| `/api/token/refresh/` | POST | Refresh token |
| `/api/token/verify/` | POST | Verifier token |
| `/api/channels/` | GET/POST | Canaux de chat |
| `/api/channels/{uuid}/` | CRUD | Canal specifique |
| `/api/channels/{uuid}/messages/` | GET | Messages d'un canal |
| `/api/messages/` | GET/POST | Messages |
| `/api/messages/{uuid}/` | CRUD | Message specifique |
| `/ws/chat/{room_name}/` | WebSocket | Chat temps reel |

## Consignes pour les implementations futures

### Organisation du code

```
src/app/
  core/                       # Singleton services, guards, intercepteurs
    services/
      auth.service.ts         # Gestion JWT (login, logout, token refresh)
      api.service.ts          # Client HTTP generique
      websocket.service.ts    # Gestion connexion WebSocket
    guards/
      auth.guard.ts           # Garde de route protegee
    intercepteurs/
      auth.interceptor.ts     # Ajout automatique du header JWT
  shared/                     # Composants, pipes, directives reutilisables
    components/
      header/
        header.ts
        header.html
        header.scss
      footer/
        footer.ts
        footer.html
        footer.scss
    pipes/
    directives/
  features/                   # Modules fonctionnels
    auth/
      login/
        login.ts
        login.html
        login.scss
      register/
        register.ts
        register.html
        register.scss
    chat/
      channel-list/
        channel-list.ts
        channel-list.html
        channel-list.scss
      channel-detail/
        channel-detail.ts
        channel-detail.html
        channel-detail.scss
    profile/
      profile.ts
      profile.html
      profile.scss
  app/
    app.ts
    app.html
    app.scss
    app.config.ts
    app.routes.ts
```

### Composants

- Chaque composant dans son propre dossier avec 3 fichiers: `.ts`, `.html`, `.scss`.
- Toujours `standalone: true` (pas de NgModules).
- Prefixe de selector: `app-`.
- Utiliser `signal()` pour l'etat local reactif.
- Utiliser `computed()` et `effect()` derives quand necessaire.

### Services

- Injecter avec `@Injectable({ providedIn: 'root' })`.
- Utiliser `HttpClient` pour les appels API (ajouter `provideHttpClient()` dans `app.config.ts`).
- Creer un intercepteur pour ajouter le token JWT automatiquement.

### Routing

- Definir les routes dans `app.routes.ts`.
- Utiliser `loadComponent` pour le lazy loading:
  ```typescript
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/channel-list/channel-list')
      .then(m => m.ChannelListComponent),
  }
  ```
- Proteger les routes avec des guards:
  ```typescript
  { path: 'chat', component: ChannelListComponent, canActivate: [authGuard] }
  ```

### Etat et signaux

- Preferer `signal()` pour l'etat local des composants.
- Utiliser `http.get()` avec `toSignal()` ( RxJS ) pour les donnees API.
- Pour l'etat partage, creer des services avec des signaux exposes.

### Styles

- SCSS par defaut (configure dans `angular.json`).
- Encapsulation emulee (defaut Angular, scopes les styles par composant).
- Pas de framework CSS installe. Choisir et installer un si necessaire (ex: Tailwind).

### Tests

- Fichiers `*.spec.ts` a cote des composants.
- Utiliser `TestBed` et les utilitaires Vitest (`describe`, `it`, `expect`).
- Executer: `ng test` ou `npm test`.

### Points d'attention

- `HttpClient` n'est pas encore configure. Ajouter `provideHttpClient()` dans `app.config.ts` avant de faire des appels API.
- `@angular/forms` est installe mais pas utilise. Ajouter `provideForms()` si besoin de formulaires.
- Les styles globaux (`styles.scss`) sont vides. Ajouter un reset CSS ou des styles de base.
- Le `app.html` contient la page d'accueil Angular par defaut (a remplacer).
- Aucune route n'est definie. Commencer par configurer les routes principales.
