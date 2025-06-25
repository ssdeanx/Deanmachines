// Generated on June 10, 2025
'use client';

import { motion } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Brain, Building, Rocket } from 'lucide-react';

const solutions = [
  {
    title: "AI Chatbots & Virtual Assistants",
    description: "Build intelligent conversational agents with advanced memory and context understanding for customer support, sales, and internal operations.",
    features: ["Natural Language Processing", "Context Retention", "Multi-turn Conversations", "Custom Training", "24/7 Availability", "Multi-language Support"],
    useCases: ["Customer Support", "Sales Assistant", "Internal Help Desk", "Lead Qualification"],
    pricing: "Starting at $99/month",
    category: "Communication",
    gradient: "from-primary/20 to-primary/5",
    icon: Brain
  },
  {
    title: "Data Analysis & Insights",
    description: "Automated data processing and insights generation with AI-powered analytics for real-time decision making and predictive modeling.",
    features: ["Real-time Processing", "Pattern Recognition", "Predictive Analytics", "Custom Reports", "Data Visualization", "Automated Alerts"],
    useCases: ["Business Intelligence", "Market Analysis", "Risk Assessment", "Performance Monitoring"],
    pricing: "Starting at $199/month",
    category: "Analytics",
    gradient: "from-blue-500/20 to-blue-500/5",
    icon: Zap
  },
  {
    title: "Content Generation & Management",
    description: "Create high-quality content at scale with AI-driven writing, editing, and content management tools for marketing and documentation.",
    features: ["SEO Optimization", "Multiple Formats", "Brand Voice", "Quality Control", "Content Planning", "Performance Tracking"],
    useCases: ["Marketing Content", "Documentation", "Social Media", "Email Campaigns"],
    pricing: "Starting at $149/month",
    category: "Content",
    gradient: "from-purple-500/20 to-purple-500/5",
    icon: Rocket
  },
  {
    title: "Enterprise AI Automation",
    description: "Comprehensive AI automation solutions for large organizations with custom workflows, enterprise security, and dedicated support.",
    features: ["Custom Workflows", "Enterprise Security", "Dedicated Support", "API Integration", "Compliance Tools", "Advanced Analytics"],
    useCases: ["Process Automation", "Document Processing", "Compliance Monitoring", "Workflow Optimization"],
    pricing: "Custom Pricing",
    category: "Enterprise",
    gradient: "from-green-500/20 to-green-500/5",
    icon: Building
  }
];

const industries = [
  { name: "Healthcare", icon: "🏥", description: "AI-powered patient care and medical analysis" },
  { name: "Finance", icon: "🏦", description: "Automated trading and risk assessment" },
  { name: "E-commerce", icon: "🛒", description: "Personalized shopping and recommendation engines" },
  { name: "Education", icon: "🎓", description: "Intelligent tutoring and learning systems" },
  { name: "Manufacturing", icon: "🏭", description: "Predictive maintenance and quality control" },
  { name: "Real Estate", icon: "🏘️", description: "Property valuation and market analysis" }
];

export default function SolutionsPage() {
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
                AI <span className="text-primary neon-text">Solutions</span> for Every Need
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Transform your business with our comprehensive suite of AI-powered solutions designed for maximum impact and efficiency across all industries.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Solutions Grid */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {solutions.map((solution, index) => (
                <motion.div
                  key={solution.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, rotateX: 2 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className={`glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 h-full backdrop-blur-xl group-hover:neon-glow bg-gradient-to-br ${solution.gradient}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {solution.category}
                        </Badge>
                        <motion.div
                          className="p-3 rounded-full bg-primary/10"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <solution.icon className="w-6 h-6 text-primary" />
                        </motion.div>
                      </div>
                      <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {solution.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed mb-4">
                        {solution.description}
                      </CardDescription>
                      <div className="text-primary font-semibold mb-4">
                        {solution.pricing}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Key Features</h4>
                        <ul className="space-y-1">
                          {solution.features.slice(0, 4).map((feature, featureIndex) => (
                            <motion.li
                              key={feature}
                              className="flex items-center text-sm text-muted-foreground"
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: featureIndex * 0.1 }}
                              viewport={{ once: true }}
                            >
                              <CheckCircle className="w-3 h-3 text-primary mr-2 flex-shrink-0" />
                              {feature}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Use Cases</h4>
                        <div className="flex flex-wrap gap-2">
                          {solution.useCases.map((useCase) => (
                            <Badge key={useCase} variant="outline" className="text-xs border-primary/30">
                              {useCase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Industries Section */}
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
                Industry <span className="text-primary neon-text">Applications</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our AI solutions are tailored for specific industry needs and challenges.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {industries.map((industry, index) => (
                <motion.div
                  key={industry.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 backdrop-blur-xl hover:neon-glow text-center">
                    <CardContent className="pt-6">
                      <div className="text-4xl mb-4">{industry.icon}</div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{industry.name}</h3>
                      <p className="text-sm text-muted-foreground">{industry.description}</p>
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
                Ready to Transform Your Business?
              </h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Get started with our AI solutions today and see the difference in your productivity and efficiency.
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
                    <Link href="/contact">Get Started Today</Link>
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
                    <Link href="/demo">Request Demo</Link>
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
