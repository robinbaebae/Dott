import { NextResponse } from 'next/server';

/**
 * Fetch with timeout - 장시간 API 호출에 타임아웃 적용
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`요청 시간이 초과되었습니다 (${timeout / 1000}초)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Promise with timeout - 어떤 Promise든 타임아웃 적용
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(message || `작업 시간이 초과되었습니다 (${timeoutMs / 1000}초)`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * API 라우트 에러 핸들러 래퍼
 * try-catch 보일러플레이트 제거 + 일관된 에러 응답
 */
export function apiHandler<T>(
  handler: (request: Request) => Promise<T>
) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다';
      const isTimeout = message.includes('시간이 초과');

      console.error(`[API Error] ${request.method} ${request.url}:`, error);

      return NextResponse.json(
        { error: message },
        { status: isTimeout ? 504 : 500 }
      );
    }
  };
}

/**
 * 재시도 로직이 포함된 async 함수 래퍼
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; backoff?: boolean } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) break;

      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * 간단한 인메모리 캐시
 */
const cache = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number = 60000): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}
