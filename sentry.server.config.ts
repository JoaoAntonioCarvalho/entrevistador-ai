import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  enabled: process.env.NODE_ENV === 'production',

  beforeSend(event, _hint) {
    if (event.request?.url) {
      event.tags = {
        ...event.tags,
        api_route: event.request.url.replace(/^.*\/api\//, '/api/'),
      };
    }
    return event;
  },
});
