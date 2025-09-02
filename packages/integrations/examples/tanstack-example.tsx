import React from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * TanStack Query Integration Example
 * Demonstrates data fetching and caching with TanStack Query in Katalyst
 */

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// API functions
const fetchPosts = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
};

const createPost = async (newPost: { title: string; body: string }) => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...newPost, userId: 1 }),
  });
  if (!response.ok) throw new Error('Failed to create post');
  return response.json();
};

// Posts component
const PostsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  
  // Query for fetching posts
  const { data: posts, isLoading, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
  
  // Mutation for creating a post
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (newPost) => {
      // Optimistically update the cache
      queryClient.setQueryData(['posts'], (old: any) => [newPost, ...(old || [])]);
      setTitle('');
      setBody('');
    },
    onError: (error) => {
      console.error('Error creating post:', error);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && body) {
      createPostMutation.mutate({ title, body });
    }
  };
  
  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  
  return (
    <div>
      {/* Create Post Form */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Create New Post</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Post body"
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={createPostMutation.isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: createPostMutation.isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: createPostMutation.isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {createPostMutation.isLoading ? 'Creating...' : 'Create Post'}
          </button>
        </form>
      </div>
      
      {/* Posts List */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Posts</h3>
          <button
            onClick={() => refetch()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
        
        {posts?.map((post: any) => (
          <div
            key={post.id}
            style={{
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{post.title}</h4>
            <p style={{ margin: 0, color: '#666' }}>{post.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TanStackExample: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2>TanStack Query Example</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Demonstrating data fetching, caching, and mutations with TanStack Query
        </p>
        <PostsList />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default TanStackExample;