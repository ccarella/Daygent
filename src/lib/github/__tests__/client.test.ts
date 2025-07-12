import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloError, gql } from '@apollo/client';
import { GitHubGraphQLClient, createGitHubGraphQLClient } from '../client';
import { GitHubGraphQLClientError } from '../utils';

// Mock Apollo Client
vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    ApolloClient: vi.fn(),
    createHttpLink: vi.fn(() => 'httpLink'),
    InMemoryCache: vi.fn(() => 'cache'),
  };
});

// Mock Apollo Link modules
const mockSetContext = vi.fn();
vi.mock('@apollo/client/link/context', () => ({
  setContext: vi.fn((callback) => {
    mockSetContext.mockImplementation(callback);
    return 'authLink';
  }),
}));

vi.mock('@apollo/client/link/error', () => ({
  onError: vi.fn(() => 'errorLink'),
}));

vi.mock('@apollo/client/link/retry', () => ({
  RetryLink: vi.fn(() => 'retryLink'),
}));

describe('GitHubGraphQLClient', () => {
  let client: GitHubGraphQLClient;
  let mockApolloClient: {
    query: ReturnType<typeof vi.fn>;
    mutate: ReturnType<typeof vi.fn>;
    clearStore: ReturnType<typeof vi.fn>;
    resetStore: ReturnType<typeof vi.fn>;
  };
  let mockGetAuth: ReturnType<typeof vi.fn>;
  let mockOnRateLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAuth = vi.fn(() => ({ type: 'user', token: 'test-token' }));
    mockOnRateLimit = vi.fn();

    mockApolloClient = {
      query: vi.fn(),
      mutate: vi.fn(),
      clearStore: vi.fn(),
      resetStore: vi.fn(),
    };

    (ApolloClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockApolloClient);

    client = new GitHubGraphQLClient({
      getAuth: mockGetAuth,
      onRateLimit: mockOnRateLimit,
    });
  });

  describe('constructor', () => {
    it('should create Apollo client with correct configuration', () => {
      expect(ApolloClient).toHaveBeenCalledWith({
        link: expect.anything(),
        cache: expect.anything(),
        defaultOptions: {
          query: {
            fetchPolicy: 'cache-first',
            errorPolicy: 'all',
          },
          watchQuery: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          },
        },
      });
    });
  });

  describe('query', () => {
    const testQuery = gql`
      query TestQuery {
        viewer {
          login
        }
      }
    `;

    it('should execute query successfully', async () => {
      const mockData = { viewer: { login: 'testuser' } };
      mockApolloClient.query.mockResolvedValue({ data: mockData });

      const result = await client.query(testQuery);
      expect(result).toEqual(mockData);
      expect(mockApolloClient.query).toHaveBeenCalledWith({
        query: testQuery,
        variables: undefined,
        fetchPolicy: 'cache-first',
      });
    });

    it('should pass variables to query', async () => {
      const mockData = { repository: { name: 'test' } };
      const variables = { owner: 'testowner', name: 'testrepo' };
      mockApolloClient.query.mockResolvedValue({ data: mockData });

      const result = await client.query(testQuery, variables);
      expect(result).toEqual(mockData);
      expect(mockApolloClient.query).toHaveBeenCalledWith({
        query: testQuery,
        variables,
        fetchPolicy: 'cache-first',
      });
    });

    it('should use custom fetch policy', async () => {
      const mockData = { viewer: { login: 'testuser' } };
      mockApolloClient.query.mockResolvedValue({ data: mockData });

      await client.query(testQuery, undefined, { fetchPolicy: 'network-only' });
      expect(mockApolloClient.query).toHaveBeenCalledWith({
        query: testQuery,
        variables: undefined,
        fetchPolicy: 'network-only',
      });
    });

    it('should handle rate limit warning', async () => {
      const mockData = { viewer: { login: 'testuser' } };
      const headers = new Map([
        ['X-RateLimit-Remaining', '50'],
        ['X-RateLimit-Reset', '1234567890'],
      ]);

      mockApolloClient.query.mockResolvedValue({
        data: mockData,
        context: { response: { headers } },
      });

      await client.query(testQuery);
      expect(mockOnRateLimit).toHaveBeenCalledWith(50, new Date(1234567890 * 1000));
    });

    it('should retry on retryable errors', async () => {
      // Mock console.log to avoid noise in test output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const networkError = new ApolloError({ 
        networkError: { statusCode: 500, name: 'NetworkError', message: 'Internal Server Error' } 
      });
      
      let callCount = 0;
      mockApolloClient.query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(networkError);
        }
        return Promise.resolve({ data: { viewer: { login: 'testuser' } } });
      });

      const result = await client.query(testQuery);
      expect(result).toEqual({ viewer: { login: 'testuser' } });
      expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
      
      consoleLogSpy.mockRestore();
    });

    it('should not retry when retry option is false', async () => {
      const networkError = new ApolloError({ 
        networkError: { statusCode: 500, name: 'NetworkError', message: 'Internal Server Error' } 
      });
      mockApolloClient.query.mockRejectedValue(networkError);

      await expect(
        client.query(testQuery, undefined, { retry: false }),
      ).rejects.toThrow(GitHubGraphQLClientError);
      expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    });

    it('should throw GitHubGraphQLClientError on non-retryable errors', async () => {
      const apolloError = new ApolloError({
        graphQLErrors: [{ message: 'Field not found', extensions: {} }],
      });
      mockApolloClient.query.mockRejectedValue(apolloError);

      await expect(client.query(testQuery)).rejects.toThrow(GitHubGraphQLClientError);
    });
  });

  describe('mutate', () => {
    const testMutation = gql`
      mutation TestMutation($input: String!) {
        testMutation(input: $input) {
          success
        }
      }
    `;

    it('should execute mutation successfully', async () => {
      const mockData = { testMutation: { success: true } };
      mockApolloClient.mutate.mockResolvedValue({ data: mockData });

      const result = await client.mutate(testMutation, { input: 'test' });
      expect(result).toEqual(mockData);
      expect(mockApolloClient.mutate).toHaveBeenCalledWith({
        mutation: testMutation,
        variables: { input: 'test' },
      });
    });

    it('should throw error when mutation returns no data', async () => {
      mockApolloClient.mutate.mockResolvedValue({ data: null });

      await expect(client.mutate(testMutation)).rejects.toThrow(
        'Mutation returned no data',
      );
    });

    it('should throw GitHubGraphQLClientError on Apollo errors', async () => {
      const apolloError = new ApolloError({
        graphQLErrors: [{ message: 'Invalid input', extensions: {} }],
      });
      mockApolloClient.mutate.mockRejectedValue(apolloError);

      await expect(client.mutate(testMutation)).rejects.toThrow(
        GitHubGraphQLClientError,
      );
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      client.clearCache();
      expect(mockApolloClient.clearStore).toHaveBeenCalled();
    });

    it('should reset cache', () => {
      client.resetCache();
      expect(mockApolloClient.resetStore).toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should handle null auth', async () => {
      mockGetAuth.mockReturnValue(null);
      
      // Trigger the auth link callback to test the warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create a new client with null auth to trigger the warning
      new GitHubGraphQLClient({
        getAuth: () => null,
        onRateLimit: mockOnRateLimit,
      });

      // Call the setContext callback
      expect(mockSetContext).toBeDefined();
      const result = mockSetContext(undefined, { headers: {} });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No authentication token available'),
      );
      expect(result).toEqual({ headers: {} });
      
      consoleSpy.mockRestore();
    });
  });
});

describe('createGitHubGraphQLClient', () => {
  it('should create client with provider token getter', () => {
    const mockGetProviderToken = vi.fn(() => 'test-token');
    const client = createGitHubGraphQLClient(mockGetProviderToken);

    expect(client).toBeInstanceOf(GitHubGraphQLClient);
  });

  it('should handle null provider token', () => {
    const mockGetProviderToken = vi.fn(() => null);
    const client = createGitHubGraphQLClient(mockGetProviderToken);

    expect(client).toBeInstanceOf(GitHubGraphQLClient);
  });
});