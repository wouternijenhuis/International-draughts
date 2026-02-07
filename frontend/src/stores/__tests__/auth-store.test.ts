import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../auth-store';

// Mock the api client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false, error: null });
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('sets error on failed login', async () => {
    const { apiClient } = await import('@/lib/api-client');
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Unauthorized'));
    
    await useAuthStore.getState().login('test@test.com', 'wrong');
    expect(useAuthStore.getState().error).toBe('Invalid email or password');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets user on successful login', async () => {
    const mockUser = { userId: '123', username: 'test', token: 'abc', expiresAt: new Date(Date.now() + 86400000).toISOString() };
    const { apiClient } = await import('@/lib/api-client');
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockUser);
    
    await useAuthStore.getState().login('test@test.com', 'pass');
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('clears user on logout', async () => {
    useAuthStore.setState({
      user: { userId: '123', username: 'test', token: 'abc', expiresAt: new Date(Date.now() + 86400000).toISOString() }
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears error', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('returns false for expired token', () => {
    useAuthStore.setState({
      user: { userId: '123', username: 'test', token: 'abc', expiresAt: new Date(Date.now() - 1000).toISOString() }
    });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});
