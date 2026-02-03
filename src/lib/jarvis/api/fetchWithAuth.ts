/**
 * fetchWithAuth - Authenticated fetch wrapper for Jarvis API
 *
 * Automatically includes:
 * - X-Jarvis-Secret header for API authentication
 * - X-Timezone header for date boundary handling
 *
 * Use these helpers instead of direct fetch() calls to /api/jarvis/* endpoints.
 */

/**
 * Get the API secret from environment
 * In browser, uses NEXT_PUBLIC_JARVIS_SECRET
 */
function getApiSecret(): string | undefined {
  if (typeof window !== 'undefined') {
    // Browser environment - use public env var
    return process.env.NEXT_PUBLIC_JARVIS_SECRET;
  }
  // Server environment - use private env var
  return process.env.JARVIS_API_SECRET;
}

/**
 * Get the user's timezone
 */
function getTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }
  return 'UTC';
}

/**
 * Build headers with authentication and timezone
 */
function buildAuthHeaders(additionalHeaders?: HeadersInit): Headers {
  const headers = new Headers(additionalHeaders);

  const secret = getApiSecret();
  if (secret) {
    headers.set('X-Jarvis-Secret', secret);
  }

  headers.set('X-Timezone', getTimezone());

  return headers;
}

/**
 * Authenticated fetch wrapper for Jarvis API
 *
 * Automatically adds X-Jarvis-Secret and X-Timezone headers.
 *
 * @param url - URL to fetch (can be relative like '/api/jarvis/chat')
 * @param options - Standard fetch options
 * @returns Promise<Response>
 *
 * @example
 * ```ts
 * const response = await fetchJarvisAPI('/api/jarvis/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ messages, systemPrompt }),
 * });
 * ```
 */
export async function fetchJarvisAPI(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = buildAuthHeaders(options.headers);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * POST helper for Jarvis API
 *
 * @param url - URL to POST to
 * @param body - Request body (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Promise<Response>
 *
 * @example
 * ```ts
 * const response = await postJarvisAPI('/api/jarvis/chat', {
 *   messages,
 *   systemPrompt,
 * });
 * ```
 */
export async function postJarvisAPI<T = unknown>(
  url: string,
  body: T,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  const headers = buildAuthHeaders(options.headers);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * GET helper for Jarvis API
 *
 * @param url - URL to GET
 * @param options - Additional fetch options
 * @returns Promise<Response>
 *
 * @example
 * ```ts
 * const response = await getJarvisAPI('/api/jarvis/briefing');
 * const data = await response.json();
 * ```
 */
export async function getJarvisAPI(
  url: string,
  options: Omit<RequestInit, 'method'> = {}
): Promise<Response> {
  const headers = buildAuthHeaders(options.headers);

  return fetch(url, {
    ...options,
    method: 'GET',
    headers,
  });
}

/**
 * PATCH helper for Jarvis API
 *
 * @param url - URL to PATCH
 * @param body - Request body (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Promise<Response>
 */
export async function patchJarvisAPI<T = unknown>(
  url: string,
  body: T,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  const headers = buildAuthHeaders(options.headers);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * DELETE helper for Jarvis API
 *
 * @param url - URL to DELETE
 * @param options - Additional fetch options
 * @returns Promise<Response>
 */
export async function deleteJarvisAPI(
  url: string,
  options: Omit<RequestInit, 'method'> = {}
): Promise<Response> {
  const headers = buildAuthHeaders(options.headers);

  return fetch(url, {
    ...options,
    method: 'DELETE',
    headers,
  });
}

/**
 * POST binary data to Jarvis API (for audio streaming)
 *
 * @param url - URL to POST to
 * @param body - Binary data (ArrayBuffer, Blob, etc.)
 * @param contentType - Content type header
 * @param additionalHeaders - Extra headers (e.g., X-Session-Id)
 * @returns Promise<Response>
 *
 * @example
 * ```ts
 * const response = await postBinaryJarvisAPI(
 *   '/api/jarvis/stt',
 *   audioBuffer,
 *   'application/octet-stream',
 *   { 'X-Session-Id': sessionId }
 * );
 * ```
 */
export async function postBinaryJarvisAPI(
  url: string,
  body: BodyInit,
  contentType: string,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const headers = buildAuthHeaders(additionalHeaders);
  headers.set('Content-Type', contentType);

  return fetch(url, {
    method: 'POST',
    headers,
    body,
  });
}

/**
 * Create an authenticated EventSource URL for SSE connections
 *
 * Note: EventSource doesn't support custom headers, so for SSE connections
 * the secret must be passed as a query parameter. The server should validate
 * both header and query parameter.
 *
 * @param baseUrl - Base URL for the SSE endpoint
 * @param params - Additional query parameters
 * @returns URL with auth token in query string
 *
 * @example
 * ```ts
 * const url = buildSSEUrl('/api/jarvis/stt', {
 *   sessionId: 'xxx',
 *   model: 'nova-3',
 * });
 * const eventSource = new EventSource(url);
 * ```
 */
export function buildSSEUrl(
  baseUrl: string,
  params: Record<string, string> = {}
): string {
  const url = new URL(baseUrl, window.location.origin);

  // Add auth token to query params for SSE (since EventSource doesn't support headers)
  const secret = getApiSecret();
  if (secret) {
    url.searchParams.set('_secret', secret);
  }

  // Add timezone
  url.searchParams.set('_tz', getTimezone());

  // Add additional params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
