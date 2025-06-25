'use client';

import { motion } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Code,
  Brain,
  Rocket,
  ArrowLeft,
  Github,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface DocsLayoutProps {
  children: React.ReactNode;
}

/**
 * Documentation layout with sidebar navigation and electric neon theme
 *
 * Provides consistent layout for all documentation pages with:
 * - Sidebar navigation with categories
 * - Electric neon styling
 * - Responsive design
 * - Breadcrumb navigation
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
  const documentationSections = [
    {
      category: "Getting Started",
      icon: <BookOpen className="w-4 h-4" />,
      items: [
        { title: "Installation", href: "/docs/installation", badge: "Essential" },
        { title: "Environment Setup", href: "/docs/environment", badge: "Required" },
        { title: "Basic Concepts", href: "/docs/concepts", badge: null },
        { title: "Architecture Overview", href: "/docs/architecture", badge: "Important" }
      ]
    },
    {
      category: "Mastra Framework",
      icon: <Brain className="w-4 h-4" />,
      items: [
        { title: "Agents", href: "/docs/mastra/agents", badge: "Core" },
        { title: "Memory & Storage", href: "/docs/mastra/memory", badge: "Advanced" },
        { title: "Tools & MCP", href: "/docs/mastra/tools", badge: "Popular" },
        { title: "Workflows", href: "/docs/mastra/workflows", badge: "Automation" }
      ]
    },
    {
      category: "CopilotKit Integration",
      icon: <Code className="w-4 h-4" />,
      items: [
        { title: "Setup & Configuration", href: "/docs/copilotkit/setup", badge: "Essential" },
        { title: "Components & Hooks", href: "/docs/copilotkit/components", badge: "UI" },
        { title: "Agent Integration", href: "/docs/copilotkit/agents", badge: "Core" },
        { title: "Custom Actions", href: "/docs/copilotkit/actions", badge: "Advanced" }
      ]
    },
    {
      category: "Deployment & Production",
      icon: <Rocket className="w-4 h-4" />,
      items: [
        { title: "Production Setup", href: "/docs/deployment/production", badge: "Important" },
        { title: "Environment Variables", href: "/docs/deployment/environment", badge: "Security" },
        { title: "Monitoring & Observability", href: "/docs/deployment/monitoring", badge: "LangSmith" },
        { title: "Scaling & Performance", href: "/docs/deployment/scaling", badge: "Advanced" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Sidebar Navigation */}
          <motion.aside
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="sticky top-24 space-y-6">
              {/* Back to Docs */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start glass-effect border border-primary/20"
              >
                <Link href="/docs">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Docs
                </Link>
              </Button>

              {/* Navigation Sections */}
              <Card className="glass-effect border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary neon-text">Navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentationSections.map((section) => (
                    <div key={section.category}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-primary">{section.icon}</div>
                        <h3 className="font-medium text-foreground text-sm">{section.category}</h3>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {section.items.map((item) => (
                          <li key={item.title}>
                            <Link
                              href={item.href}
                              className="flex items-center justify-between text-sm text-muted-foreground hover:text-primary transition-colors group py-1"
                            >
                              <span className="group-hover:neon-text">{item.title}</span>
                              {item.badge && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs glass-effect ml-2"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Separator className="mt-3 bg-primary/10" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="glass-effect border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-primary">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-full justify-start text-xs"
                  >
                    <Link href="/playground">
                      <Rocket className="w-3 h-3 mr-2" />
                      Playground
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-full justify-start text-xs"
                  >
                    <Link href="https://github.com/ssdeanx/deanmachines-rsc" target="_blank">
                      <Github className="w-3 h-3 mr-2" />
                      GitHub
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.aside>

          {/* Main Content */}
          <motion.main
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="glass-effect-strong rounded-lg border border-primary/20 neon-border">
              <div className="p-8 prose prose-lg max-w-none">
                {children}
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
