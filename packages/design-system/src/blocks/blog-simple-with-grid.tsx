'use client';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function SimpleBlogWithGrid() {
  return (
    <div className="relative overflow-hidden py-20 md:py-0">
      <div className="py-4 md:py-10 overflow-hidden relative  px-4 md:px-8">
        <GridPatternContainer className="opacity-50" />
        <div className="relative z-20 py-10 ">
          <h1
            className={cn(
              'scroll-m-20 text-4xl font-bold text-center md:text-left tracking-tight text-black dark:text-white mb-6'
            )}
          >
            Blog
          </h1>

          <p className="text-lg text-neutral-600 dark:text-neutral-400-foreground max-w-xl !mb-6 text-center md:text-left">
            Discover insightful resources and expert advice from our seasoned team to elevate your
            knowledge.
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between pb-20 max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full relative z-20">
          {blogs.map((blog, index) => (
            <BlogCard blog={blog} key={blog.title + index} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm mr-4  text-black px-2 py-1  relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm" />
      <span className="font-medium text-black dark:text-white">DevStudio</span>
    </Link>
  );
};

export const BlogCard = ({ blog }: { blog: Blog }) => {
  const truncate = (text: string, length: number) => {
    return text.length > length ? text.slice(0, length) + '...' : text;
  };
  return (
    <Link
      className="shadow-derek rounded-3xl border dark:border-neutral-800 w-full bg-white dark:bg-neutral-900  overflow-hidden  hover:scale-[1.02] transition duration-200"
      href={`/blog/${blog.slug}`}
    >
      {blog.image ? (
        <BlurImage
          src={blog.image || ''}
          alt={blog.title}
          height="800"
          width="800"
          className="h-52 object-cover object-top w-full"
        />
      ) : (
        <div className="h-52 flex items-center justify-center bg-white dark:bg-neutral-900">
          <Logo />
        </div>
      )}
      <div className="p-4 md:p-8 bg-white dark:bg-neutral-900">
        <div className="flex space-x-2 items-center  mb-2">
          <Image
            src={blog.authorAvatar}
            alt={blog.author}
            width={20}
            height={20}
            className="rounded-full h-5 w-5"
          />
          <p className="text-sm font-normal text-neutral-600 dark:text-neutral-400">
            {blog.author}
          </p>
        </div>
        <p className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
          {blog.title}
        </p>
        <p className="text-left text-sm mt-2 text-neutral-600 dark:text-neutral-400">
          {truncate(blog.description, 100)}
        </p>
      </div>
    </Link>
  );
};

type Blog = {
  title: string;
  description: string;
  slug: string;
  image: string;
  author: string;
  authorAvatar: string;
};
const blogs: Blog[] = [
  {
    title: 'Changelog for 2024',
    description:
      'Explore the latest updates and enhancements in our 2024 changelog. Discover new features and improvements that enhance user experience.',
    slug: 'changelog-for-2024',
    image:
      'https://images.unsplash.com/photo-1696429175928-793a1cdef1d3?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Manu Arora',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
  {
    title: 'Understanding React Hooks',
    description: 'A comprehensive guide to understanding and using React Hooks in your projects.',
    slug: 'understanding-react-hooks',
    image:
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=3542&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Manu Arora',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
  {
    title: 'CSS Grid Layout',
    description: 'Learn how to create complex layouts easily with CSS Grid.',
    slug: 'css-grid-layout',
    image:
      'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Manu Arora',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
  {
    title: 'JavaScript ES2021 Features',
    description: 'An overview of the new features introduced in JavaScript ES2021.',
    slug: 'javascript-es2021-features',
    image:
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=4846&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Manu Arora',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
  {
    title: 'Building RESTful APIs with Node.js',
    description: 'Step-by-step guide to building RESTful APIs using Node.js and Express.',
    slug: 'building-restful-apis-with-nodejs',
    image:
      'https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?q=80&w=5069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Manu Arora',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
  {
    title: 'Mastering TypeScript',
    description:
      'A deep dive into TypeScript, its features, and how to effectively use it in your projects.',
    slug: 'mastering-typescript',
    image:
      'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=3212&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    author: 'Jane Doe',
    authorAvatar: 'https://assets.aceternity.com/manu.png',
  },
];

interface IBlurImage {
  height?: any;
  width?: any;
  src?: string | any;
  objectFit?: any;
  className?: string | any;
  alt?: string | undefined;
  layout?: any;
  [x: string]: any;
}

export const BlurImage = ({
  height,
  width,
  src,
  className,
  objectFit,
  alt,
  layout,
  ...rest
}: IBlurImage) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <Image
      className={cn(
        'transition duration-300 transform',
        isLoading ? 'blur-sm scale-105' : 'blur-0 scale-100',
        className
      )}
      onLoadingComplete={() => setLoading(false)}
      src={src}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      blurDataURL={src}
      layout={layout}
      alt={alt ? alt : 'Avatar'}
      {...rest}
    />
  );
};

export function GridPatternContainer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,white,transparent)]',
        className
      )}
    >
      <GridPattern />
    </div>
  );
}
export function GridPattern() {
  const columns = 30;
  const rows = 11;
  return (
    <div className="flex bg-gray-200 dark:bg-neutral-700 flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex flex-shrink-0 rounded-[1px] ${
                index % 2 === 0
                  ? 'bg-gray-100 dark:bg-neutral-800'
                  : 'bg-gray-100 dark:bg-neutral-800 shadow-[0px_0px_0px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_0px_3px_rgba(0,0,0,0.2)_inset]'
              }`}
            />
          );
        })
      )}
    </div>
  );
}
