import { PostHog } from 'posthog-node';
import { posthogIngestHost, posthogProjectToken } from '@/lib/posthog-env';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const token = posthogProjectToken();
  if (!token) return null;
  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: posthogIngestHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
