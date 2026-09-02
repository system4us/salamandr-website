// Central place for links repeated across the marketing site. Edit here, not per-page.
const BASE = import.meta.env.BASE_URL;

export const SITE = {
  name: 'Salamandr',
  tagline: 'The helpdesk you actually own',
  // This site's own source (the product itself isn't on GitHub).
  githubUrl: 'https://github.com/system4us/salamandr-website',
  homeUrl: BASE,
  docsUrl: `${BASE}docs/what-is-salamandr/`,
  quickstartUrl: `${BASE}docs/quickstart/`,
  compareUrl: `${BASE}compare/`,
  industriesUrl: `${BASE}industries/`,
  apiReferenceUrl: `${BASE}docs/api-reference/`,
  editionsUrl: `${BASE}#editions`,
  contextRailUrl: `${BASE}context-rail/`,
  buildPluginUrl: `${BASE}docs/build-a-plugin/`,
  extensionKindsUrl: `${BASE}docs/extension-kinds/`,
  faviconUrl: `${BASE}favicon.svg`
};
