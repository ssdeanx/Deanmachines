"use client";

import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiInfo,
  FiAlertTriangle,
  FiCode,
  FiBook,
  FiZap,
  FiSettings,
  FiDatabase,
  FiGitBranch,
  FiUsers,
  FiTool,
  FiLayers,
  FiCpu,
  FiGlobe,
  FiShield,
  FiTrendingUp,
  FiStar,
  FiArrowRight,
  FiChevronDown,
  FiChevronRight,
  FiPlay,
  FiPause,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiEye,
  FiHeart,
  FiBookmark,
  FiShare2,
  FiMessageSquare,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUser,
  FiHome,
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiMenu,
  FiX,
  FiPlus,
  FiMinus,
  FiEdit,
  FiTrash2,
  FiSave,
  FiUploadCloud,
  FiDownloadCloud
} from 'react-icons/fi';
import {
  HiSparkles,
  HiLightningBolt,
  HiCube,
  HiChip,
  HiColorSwatch,
  HiTemplate,
  HiPuzzle,
  HiBeaker,
  HiAcademicCap,
  HiLightBulb,
  HiFlag,
  HiGift,
  HiStar as HiStarSolid
} from 'react-icons/hi';
import {
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiTailwindcss,
  SiNodedotjs,
  SiGithub,
  SiGoogle,
  SiOpenai,
  SiVercel,
  SiSupabase
} from 'react-icons/si';
import { cn } from '@/lib/utils';

/**
 * Professional MDX components for DeanMachines RSC documentation
 *
 * Provides consistent, accessible, and beautifully styled components
 * that integrate seamlessly with the electric neon theme.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings with consistent hierarchy
    h1: ({ children, ...props }) => (
      <h1
        className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8 text-foreground neon-text"
        {...props}
      >
        {children}
      </h1>
    ),

    h2: ({ children, ...props }) => (
      <h2
        className="scroll-m-20 border-b border-primary/20 pb-2 text-3xl font-semibold tracking-tight mb-6 text-foreground"
        {...props}
      >
        {children}
      </h2>
    ),

    h3: ({ children, ...props }) => (
      <h3
        className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4 text-primary"
        {...props}
      >
        {children}
      </h3>
    ),

    h4: ({ children, ...props }) => (
      <h4
        className="scroll-m-20 text-xl font-semibold tracking-tight mb-3 text-foreground"
        {...props}
      >
        {children}
      </h4>
    ),

    // Paragraphs with proper spacing
    p: ({ children, ...props }) => (
      <p
        className="leading-7 mb-6 text-muted-foreground"
        {...props}
      >
        {children}
      </p>
    ),

    // Links with external link indicators
    a: ({ href, children, ...props }) => {
      const isExternal = href?.startsWith('http');

      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 inline-flex items-center gap-1"
            {...props}
          >
            {children}
            <FiExternalLink className="h-3 w-3" />
          </a>
        );
      }

      return (
        <Link
          href={href || '#'}
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          {...props}
        >
          {children}
        </Link>
      );
    },

    // Lists with proper spacing
    ul: ({ children, ...props }) => (
      <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }) => (
      <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
        {children}
      </ol>
    ),

    // Code blocks with syntax highlighting and copy functionality
    code: ({ children, className, ...props }) => {
      const isInline = !className;

      if (isInline) {
        return (
          <code
            className="relative rounded bg-primary/10 text-primary px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold border border-primary/20"
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = className?.replace('language-', '') || 'text';

      return (
        <div className="relative group my-6">
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t-lg border border-b-0 border-primary/20">
            <Badge variant="secondary" className="text-xs font-mono">
              {language}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => navigator.clipboard?.writeText(String(children))}
                  >
                    <FiCopy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy code</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ScrollArea className="max-h-96">
            <pre className="overflow-x-auto rounded-b-lg border border-primary/20 bg-zinc-950 py-4 px-6 text-sm">
              <code className={cn("relative font-mono text-zinc-100", className)} {...props}>
                {children}
              </code>
            </pre>
          </ScrollArea>
        </div>
      );
    },

    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Enhanced Tables with shadcn/ui components
    table: ({ children, ...props }) => (
      <div className="my-8">
        <div className="rounded-lg border border-primary/20 glass-effect overflow-hidden">
          <Table {...props}>
            {children}
          </Table>
        </div>
      </div>
    ),

    thead: ({ children, ...props }) => (
      <TableHeader {...props}>
        {children}
      </TableHeader>
    ),

    tbody: ({ children, ...props }) => (
      <TableBody {...props}>
        {children}
      </TableBody>
    ),

    tr: ({ children, ...props }) => (
      <TableRow className="hover:bg-primary/5 transition-colors" {...props}>
        {children}
      </TableRow>
    ),

    th: ({ children, ...props }) => (
      <TableHead className="font-semibold text-primary bg-primary/5" {...props}>
        {children}
      </TableHead>
    ),

    td: ({ children, ...props }) => (
      <TableCell {...props}>
        {children}
      </TableCell>
    ),

    // Horizontal rule
    hr: ({ ...props }) => (
      <Separator className="my-8" {...props} />
    ),

    // Images with Next.js optimization and hover effects
    img: ({ src, alt, ...props }) => (
      <div className="my-6 group">
        <div className="relative overflow-hidden rounded-lg border border-primary/20 glass-effect hover:border-primary/40 transition-all duration-300">
          <Image
            src={src || ''}
            alt={alt || ''}
            width={800}
            height={400}
            className="rounded-lg transition-transform duration-300 group-hover:scale-105"
            {...props}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        {alt && (
          <p className="text-sm text-muted-foreground text-center mt-2 italic">
            {alt}
          </p>
        )}
      </div>
    ),

    // Custom components
    Alert,
    AlertTitle,
    AlertDescription,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    Badge,
    Button,
    Separator,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Progress,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    ScrollArea,

    // React Icons - Feather
    FiExternalLink,
    FiCopy,
    FiCheck,
    FiInfo,
    FiAlertTriangle,
    FiCode,
    FiBook,
    FiZap,
    FiSettings,
    FiDatabase,
    FiGitBranch,
    FiUsers,
    FiTool,
    FiLayers,
    FiCpu,
    FiGlobe,
    FiShield,
    FiTrendingUp,
    FiStar,
    FiArrowRight,
    FiChevronDown,
    FiChevronRight,
    FiPlay,
    FiPause,
    FiDownload,
    FiUpload,
    FiRefreshCw,
    FiEye,
    FiHeart,
    FiBookmark,
    FiShare2,
    FiMessageSquare,
    FiMail,
    FiPhone,
    FiMapPin,
    FiCalendar,
    FiClock,
    FiUser,
    FiHome,
    FiSearch,
    FiFilter,
    FiGrid,
    FiList,
    FiMenu,
    FiX,
    FiPlus,
    FiMinus,
    FiEdit,
    FiTrash2,
    FiSave,
    FiUploadCloud,
    FiDownloadCloud,

    // React Icons - Heroicons
    HiSparkles,
    HiLightningBolt,
    HiCube,
    HiChip,
    HiColorSwatch,
    HiTemplate,
    HiPuzzle,
    HiBeaker,
    HiAcademicCap,
    HiLightBulb,
    HiFlag,
    HiGift,
    HiStarSolid,

    // React Icons - Simple Icons
    SiTypescript,
    SiReact,
    SiNextdotjs,
    SiTailwindcss,
    SiNodedotjs,
    SiGithub,
    SiGoogle,
    SiOpenai,
    SiVercel,
    SiSupabase,

    ...components,
  };
}
