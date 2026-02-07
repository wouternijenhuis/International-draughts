import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from './api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('API Client', () => {
  describe('apiGet', () => {
    it('should make a GET request and return JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await apiGet<{ status: string }>('/health');
      expect(result).toEqual({ status: 'healthy' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should throw ApiError on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not found' }),
      });

      await expect(apiGet('/missing')).rejects.toThrow(ApiError);
      await expect(apiGet('/missing')).rejects.toThrow();
    });
  });

  describe('apiPost', () => {
    it('should make a POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const result = await apiPost<{ id: number }>('/items', { name: 'test' });
      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
    });
  });

  describe('apiPatch', () => {
    it('should make a PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      });

      const result = await apiPatch<{ updated: boolean }>('/items/1', { name: 'updated' });
      expect(result).toEqual({ updated: true });
    });
  });

  describe('apiDelete', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await expect(apiDelete('/items/1')).resolves.toBeUndefined();
    });

    it('should throw on failed delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ message: 'Not allowed' }),
      });

      await expect(apiDelete('/items/1')).rejects.toThrow(ApiError);
    });
  });
});
