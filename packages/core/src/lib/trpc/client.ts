import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import { type AppRouter } from '../../../../api/trpc/routers';
import superjson from 'superjson';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get base URL for API
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative URL
    return '';
  }
  
  if (process.env.VERCEL_URL) {
    // Reference for Vercel
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.RENDER_INTERNAL_URL) {
    // Reference for Render
    return `http://${process.env.RENDER_INTERNAL_URL}`;
  }
  
  // Assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Create tRPC client
export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        return {
          // Add any custom headers here
        };
      },
    }),
  ],
});

// Create vanilla client for server-side usage
export const vanillaClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});