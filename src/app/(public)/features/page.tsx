// Generated on June 10, 2025
'use client';

import { motion } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Shield, Cpu, Globe, Rocket, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "22 Specialized AI Agents",
    description: "Complete agent ecosystem including Master, Code, Git, Graph, Data, Research, Documentation, Design, and more - each with specialized capabilities and tools.",
    category: "Mastra AI",
    highlights: ["Master Agent Orchestration", "Code Analysis & Generation", "Git Repository Management", "Graph Generation & Analysis"]
  },
  {
    icon: Cpu,
    title: "Advanced Code Graph Generation",
    description: "Intelligent repository analysis with multi-format graph generation (SVG, HTML, JSON) using MCP tools and agent coordination for comprehensive code visualization.",
    category: "Code Analysis",
    highlights: ["GitHub Repository Analysis", "Multi-Format Graphs", "Dependency Mapping", "Interactive Visualizations"]
  },
  {
    icon: Zap,
    title: "CopilotKit Integration",
    description: "Full CopilotKit integration with 22 agent endpoints, real-time chat interfaces, and multi-agent collaboration through modern UI components.",
    category: "User Interface",
    highlights: ["Real-time Agent Chat", "Multi-Agent Coordination", "Research Canvas", "Interactive Playgrounds"]
  },
  {
    icon: Shield,
    title: "LibSQL Vector Memory",
    description: "Advanced memory system using LibSQL/Turso with vector storage, semantic search, and intelligent context retention across all agents.",
    category: "Memory",
    highlights: ["Vector Storage", "Semantic Search", "Persistent Memory", "Cross-Agent Context"]
  },
  {
    icon: Globe,
    title: "Model Context Protocol (MCP)",
    description: "Full MCP integration for advanced AI-driven code understanding, tool interoperability, and seamless agent communication.",
    category: "Integration",
    highlights: ["MCP Tools", "Agent Interoperability", "Code Understanding", "Tool Coordination"]
  },
  {
    icon: Rocket,
    title: "LangSmith Observability",
    description: "Complete observability with LangSmith tracing, OpenTelemetry integration, and comprehensive monitoring for all agent interactions.",
    category: "Observability",
    highlights: ["LangSmith Tracing", "Performance Monitoring", "Agent Analytics", "Debug Insights"]
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-24 bg-gradient-to-br from-background via-background/95 to-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
                Powerful <span className="text-primary neon-text">Features</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Explore the real capabilities of DeanMachines RSC - a production-ready multi-agent platform with 22 specialized AI agents, advanced code analysis, and comprehensive GitHub repository visualization.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, rotateX: 2 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 h-full backdrop-blur-xl group-hover:neon-glow">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {feature.category}
                        </Badge>
                        <motion.div
                          className="p-3 rounded-full bg-primary/10"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <feature.icon className="w-6 h-6 text-primary" />
                        </motion.div>
                      </div>
                      <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.highlights.map((highlight, highlightIndex) => (
                          <motion.li
                            key={highlight}
                            className="flex items-center text-sm text-muted-foreground"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: highlightIndex * 0.1 }}
                            viewport={{ once: true }}
                          >
                            <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                            {highlight}
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Specs Section */}
        <section className="py-24 bg-gradient-to-br from-background to-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Technical <span className="text-primary neon-text">Specifications</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built with Next.js 15, TypeScript, Mastra AI Framework, and Google Gemini 2.5 Flash for production-grade AI applications.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "AI Agents", value: "22", icon: Brain },
                { label: "CopilotKit Endpoints", value: "22", icon: Zap },
                { label: "Workflow Types", value: "3", icon: Cpu },
                { label: "MCP Tools", value: "5+", icon: Globe }
              ].map((spec, index) => (
                <motion.div
                  key={spec.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 backdrop-blur-xl hover:neon-glow text-center">
                    <CardContent className="pt-6">
                      <motion.div
                        className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <spec.icon className="w-6 h-6 text-primary" />
                      </motion.div>
                      <div className="text-2xl font-bold text-primary neon-text mb-1">
                        {spec.value}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {spec.label}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
