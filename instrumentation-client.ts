import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  enabled: process.env.NODE_ENV === 'production',

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'AbortError',
  ],

  beforeSend(event) {
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      f => f.filename?.includes('chrome-extension')
        || f.filename?.includes('moz-extension')
    )) {
      return null;
    }
    return event;
  },
});
