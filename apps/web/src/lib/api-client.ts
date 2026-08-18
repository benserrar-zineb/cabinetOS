// Client API minimal, partage par les ecrans du module Patient. Les appels passent
// par la passerelle Next.js (/api/... -> backend, voir next.config.ts) : meme
// origine du point de vue du navigateur, les cookies de session circulent sans
// configuration CORS cote backend.

export interface ApiSuccess<T> {
  data: T;
  meta: { warnings?: string[] };
}

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { organizationId: string },
): Promise<ApiSuccess<T>> {
  const { organizationId, headers, ...rest } = options;

  const response = await fetch(path, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-organization-id': organizationId,
      ...headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? 'Une erreur est survenue.';
    throw new ApiRequestError(response.status, message);
  }

  return body as ApiSuccess<T>;
}
