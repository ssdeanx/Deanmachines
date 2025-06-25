// Generated on June 10, 2025
'use client';

import { motion } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, Zap, BookOpen, Github, ExternalLink, Target, Award, Globe, Rocket } from 'lucide-react';

const stats = [
  { number: "10k+", label: "Active Users", icon: Users, description: "Developers building with our platform" },
  { number: "99.9%", label: "Uptime", icon: Zap, description: "Reliable infrastructure you can count on" },
  { number: "24/7", label: "Support", icon: BookOpen, description: "Round-the-clock assistance and documentation" },
  { number: "Open", label: "Source", icon: Github, description: "Transparent and community-driven development" }
];

const team = [
  {
    name: "AI Research Team",
    role: "Core Development",
    description: "Leading experts in AI agent development, machine learning, and neural networks with decades of combined experience.",
    expertise: ["Machine Learning", "Neural Networks", "Natural Language Processing", "Computer Vision"],
    badge: "Research"
  },
  {
    name: "Engineering Team",
    role: "Platform Architecture",
    description: "Building scalable and robust infrastructure for AI applications with focus on performance and reliability.",
    expertise: ["Cloud Architecture", "Microservices", "API Design", "Performance Optimization"],
    badge: "Engineering"
  },
  {
    name: "DevX Team",
    role: "Developer Experience",
    description: "Creating intuitive tools, comprehensive documentation, and seamless developer workflows.",
    expertise: ["Developer Tools", "Documentation", "SDK Development", "Community Building"],
    badge: "DevX"
  }
];

const values = [
  {
    title: "Innovation First",
    description: "We push the boundaries of what&apos;s possible with AI technology, constantly exploring new frontiers.",
    icon: Rocket
  },
  {
    title: "Developer Focused",
    description: "Everything we build is designed with developers in mind, prioritizing ease of use and powerful capabilities.",
    icon: Target
  },
  {
    title: "Open & Transparent",
    description: "We believe in open-source principles and transparent development processes.",
    icon: Globe
  },
  {
    title: "Quality Excellence",
    description: "We maintain the highest standards in code quality, documentation, and user experience.",
    icon: Award
  }
];

const milestones = [
  { year: "2023", title: "Founded", description: "Started with a vision to democratize AI development" },
  { year: "2024", title: "First Release", description: "Launched our initial platform with core AI agent capabilities" },
  { year: "2024", title: "10k Users", description: "Reached 10,000 active developers building AI applications" },
  { year: "2025", title: "Enterprise Ready", description: "Launched enterprise features and dedicated support" }
];

export default function AboutPage() {
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
                About <span className="text-primary neon-text">DeanMachines</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                We&apos;re pioneering the future of AI-driven applications with cutting-edge technology, 
                autonomous agents, and a developer-first approach. Our mission is to democratize AI 
                and make intelligent applications accessible to everyone.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
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
                        <stat.icon className="w-6 h-6 text-primary" />
                      </motion.div>
                      <div className="text-2xl font-bold text-primary neon-text mb-1">
                        {stat.number}
                      </div>
                      <div className="text-sm font-semibold text-foreground mb-2">
                        {stat.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.description}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 bg-gradient-to-br from-background to-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Our <span className="text-primary neon-text">Mission</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                To empower developers and organizations worldwide with the most advanced AI tools and platforms, 
                making artificial intelligence accessible, reliable, and transformative for businesses of all sizes.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 backdrop-blur-xl hover:neon-glow text-center h-full">
                    <CardContent className="pt-6">
                      <motion.div
                        className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <value.icon className="w-6 h-6 text-primary" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">{value.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Our <span className="text-primary neon-text">Team</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Meet the experts behind DeanMachines RSC, dedicated to pushing the boundaries of AI technology.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  whileHover={{ scale: 1.02, rotateY: 5 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 h-full backdrop-blur-xl group-hover:neon-glow">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {member.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {member.name}
                      </CardTitle>
                      <CardDescription className="text-primary font-medium">
                        {member.role}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {member.description}
                      </p>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2 text-sm">Expertise</h4>
                        <div className="flex flex-wrap gap-1">
                          {member.expertise.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs border-primary/30">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
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
                Our <span className="text-primary neon-text">Journey</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Key milestones in our mission to revolutionize AI development.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 backdrop-blur-xl hover:neon-glow">
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-primary neon-text mb-2">{milestone.year}</div>
                      <h3 className="font-semibold text-foreground mb-2">{milestone.title}</h3>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center glass-effect rounded-2xl p-12 border border-primary/20 backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Join the AI Revolution
              </h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Be part of the community building the future of intelligent applications. 
                Contribute to our open-source projects or start building your own AI solutions.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow pulse-glow"
                  >
                    <Link href="/docs">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Read Documentation
                    </Link>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    asChild
                    className="glass-effect border-primary/30 hover:border-primary/60"
                  >
                    <Link href="https://github.com/your-repo/deanmachines-rsc" target="_blank">
                      <Github className="w-4 h-4 mr-2" />
                      View on GitHub
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
