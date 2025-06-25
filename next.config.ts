// Import Next.js config
import type { NextConfig } from 'next';
// Import MDX config
import createMDX from '@next/mdx';
// Import remark and rehype plugins
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkToc from 'remark-toc';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
//import remarkExternalLinks from 'remark-external-links';

const nextConfig: NextConfig = {
  // Configure pageExtensions to include MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  serverExternalPackages: [
    '@mastra/*',
    '@agentic/*',
    'isolated-vm',
    '@ai-sdk/google',
    'ai',
    'shelljs',
    'crawlee',
    'dayjs',
    '@xenova/transformers',
    'node-fetch',
    'isomorphic-git',
    'isomorphic-fetch',
    'jsinspect-plus',
    'jsdom',
    '@isomorphic-git/lightning-fs',
    'marked',
    'js-yaml',
    'vitest',
    'jszip',
    'zod',
    'eslintcc',
    'langsmith',
    'langsmith/vercel',
    '@copilotkit/runtime',
    'quick-lru',
    'langfuse-vercel',
    'langfuse',
    '@mastra/agui',
    '@inquirer/prompts',
    'simple-git',
    'papaparse',
    'yaml',
    'eslint',
    'typescript',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'freestyle-sandboxes',
    'fast-xml-parser',
    'fs-extra',
    'ky',
    'p-throttle',
    'octokit',
    'wikibase-sdk',
    'wikibase-sdk/wikidata.org',
    'resend'
  ],
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@copilotkit/react-core',
      '@copilotkit/react-ui',
      '@copilotkit/react-textarea',
      '@copilotkit/react-form',
      'lucide-react',
      'framer-motion',
    ]
  },

  // Bundle analyzer
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          copilotkit: {
            test: /[\\/]node_modules[\\/]@copilotkit[\\/]/,
            name: 'copilotkit',
            chunks: 'all',
          },
          mastra: {
            test: /[\\/]node_modules[\\/]@mastra[\\/]/,
            name: 'mastra',
            chunks: 'all',
          }
        }
      };
    }
    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,
  poweredByHeader: false,

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ];
  }
};

// Configure MDX with essential plugins
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      // GitHub Flavored Markdown support
      remarkGfm,
      // Frontmatter support
      remarkFrontmatter,
      // Table of contents generation
      remarkToc,
      // External links support
     // remarkExternalLinks,

    ],
    rehypePlugins: [
      // Auto-generate heading IDs for linking
      rehypeSlug,
      // Syntax highlighting for code blocks
      rehypeHighlight,
      rehypeAutolinkHeadings,
      rehypePrettyCode
    ],
  },
});

// Combine MDX and Next.js config
export default withMDX(nextConfig);
