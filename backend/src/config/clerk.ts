import { createClerkClient } from '@clerk/backend';
import { env } from './env';

export const isClerkConfigured = Boolean(env.CLERK_SECRET_KEY);

export const clerkClient = isClerkConfigured
  ? createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY })
  : null;

