// List components
export {
  VirtualList,
  WindowVirtualList,
  VirtualMasonry,
} from './VirtualList';
export type {
  VirtualListProps,
  WindowVirtualListProps,
  VirtualMasonryProps,
} from './VirtualList';

// Grid components
export {
  VirtualGrid,
  DynamicVirtualGrid,
  VirtualTable,
} from './VirtualGrid';
export type {
  VirtualGridProps,
  DynamicVirtualGridProps,
  VirtualTableProps,
} from './VirtualGrid';

// Hooks
export {
  useEnhancedVirtualizer,
  useInfiniteVirtualizer,
  useBidirectionalInfiniteVirtualizer,
  useSizeCache,
  useScrollSync,
  useDynamicVirtualizer,
  useVirtualizerPerformance,
} from './hooks';
export type {
  UseVirtualizerOptions,
  UseInfiniteVirtualizerOptions,
  UseBidirectionalInfiniteOptions,
} from './hooks';

// Re-export core types from @tanstack/react-virtual
export type {
  VirtualItem,
  Virtualizer,
  VirtualizerOptions,
  Range,
  ScrollToOptions,
  ScrollToOffsetOptions,
} from '@tanstack/react-virtual';

// Export utility functions
export { 
  defaultRangeExtractor,
  observeElementOffset,
  observeElementRect,
  elementScroll,
} from '@tanstack/react-virtual';

// Example implementations
import React from 'react';
import { VirtualGrid, type VirtualList, type VirtualTable } from './index';

// Example: Simple virtual list
export const ExampleVirtualList = () => {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));

  return (
    <VirtualList
      items={items}
      height={600}
      itemHeight={80}
      renderItem={(item) => (
        <div className="p-4 border-b">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
      )}
    />
  );
};

// Example: Virtual image grid
export const ExampleVirtualImageGrid = () => {
  const images = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    src: `https://picsum.photos/200/200?random=${i}`,
    title: `Image ${i}`,
  }));

  return (
    <DynamicVirtualGrid
      items={images}
      height={600}
      minColumnWidth={200}
      maxColumnWidth={300}
      gap={16}
      renderCell={(item) => (
        <div className="relative group">
          <img
            src={item.src}
            alt={item.title}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <p className="text-white font-medium">{item.title}</p>
          </div>
        </div>
      )}
    />
  );
};

// Example: Virtual data table
export const ExampleVirtualTable = () => {
  interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    joinDate: string;
  }

  const users: User[] = Array.from({ length: 10000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['Admin', 'User', 'Manager'][i % 3],
    status: i % 4 === 0 ? 'inactive' : 'active',
    joinDate: new Date(2020, 0, 1 + i).toISOString().split('T')[0],
  }));

  return (
    <VirtualTable
      data={users}
      height={600}
      columns={[
        { key: 'id', header: 'ID', width: 80 },
        { key: 'name', header: 'Name', width: 200 },
        { key: 'email', header: 'Email', width: 250 },
        { key: 'role', header: 'Role', width: 120 },
        {
          key: 'status',
          header: 'Status',
          width: 100,
          render: (value: string) => (
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                value === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {value}
            </span>
          ),
        },
        { key: 'joinDate', header: 'Join Date', width: 120 },
      ]}
      onRowClick={(user) => {
        console.log('Clicked user:', user);
      }}
    />
  );
};

// Example: Infinite scroll with loading
export const ExampleInfiniteScroll = () => {
  const [items, setItems] = React.useState(
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      content: `Initial item ${i}`,
    }))
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  const loadMore = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newItems = Array.from({ length: 50 }, (_, i) => ({
      id: items.length + i,
      content: `Loaded item $items.length + i`,
    }));
    
    setItems(prev => [...prev, ...newItems]);
    setIsLoading(false);
    
    // Stop after 500 items
    if (items.length + newItems.length >= 500) {
      setHasMore(false);
    }
  };

  return (
    <VirtualList
      items={items}
      height={600}
      itemHeight={60}
      loadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      renderItem={(item) => (
        <div className="p-4 border-b">
          {item.content}
        </div>
      )}
      renderLoader={() => (
        <div className="p-4 text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading more...</p>
        </div>
      )}
      renderEmpty={() => (
        <div className="text-center text-muted-foreground">
          No items to display
        </div>
      )}
    />
  );
};

// Import components for examples
import { DynamicVirtualGrid } from './VirtualGrid';