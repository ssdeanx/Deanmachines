// Generated on 2025-01-27 - Complete Interactive Demo Page
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Zap, 
  Brain, 
  MessageSquare, 
  Code, 
  Sparkles,
  Send,
  Rocket,
  Users,
  Globe,
  ArrowRight
} from 'lucide-react';

interface DemoMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
}

/**
 * Interactive demo page showcasing DeanMachines RSC capabilities
 * Features live AI interaction, code generation, and agent simulation
 */
export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Welcome to DeanMachines RSC! I\'m your AI assistant. Ask me anything about automation, code generation, or how I can help streamline your workflow.',
      timestamp: Date.now() - 1000
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [codeExample, setCodeExample] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  // Demo stats animation
  const [visibleStats, setVisibleStats] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleStats(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "I can help you build autonomous AI agents that understand context and execute complex tasks. Would you like me to generate some code for you?",
        "Here's how I can streamline your workflow: I can automate repetitive tasks, generate boilerplate code, and integrate with your existing systems. What specific challenge are you facing?",
        "DeanMachines RSC specializes in intelligent automation. I can create custom agents for customer support, data processing, or code generation. What would you like to automate?",
        "Let me show you the power of AI-driven development. I can generate React components, API endpoints, database schemas, and more. What shall we build together?"
      ];

      const aiMessage: DemoMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateCodeExample = () => {
    const examples = [
      `// AI-Generated React Component
export const SmartButton = ({ onClick, children, ...props }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async (e) => {
    setIsLoading(true);
    await onClick?.(e);
    setIsLoading(false);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className="smart-btn"
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
};`,
      `// Autonomous API Endpoint
export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    
    // AI-powered processing
    const result = await aiAgent.process({
      prompt,
      context,
      capabilities: ['code-gen', 'analysis', 'optimization']
    });
    
    return Response.json({ 
      success: true, 
      data: result,
      processingTime: '0.3s'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}`,
      `// Intelligent Database Query
const smartQuery = await db.query(\`
  SELECT users.*, 
         COUNT(projects.id) as project_count,
         AVG(reviews.rating) as avg_rating
  FROM users
  LEFT JOIN projects ON users.id = projects.user_id
  LEFT JOIN reviews ON projects.id = reviews.project_id
  WHERE users.status = 'active'
    AND users.created_at > NOW() - INTERVAL '30 days'
  GROUP BY users.id
  HAVING project_count > 0
  ORDER BY avg_rating DESC, project_count DESC
  LIMIT 50
\`);`
    ];

    setCodeExample(examples[Math.floor(Math.random() * examples.length)]);
  };

  const demoStats = [
    { icon: Rocket, value: '10k+', label: 'Agents Deployed', color: 'text-yellow-400' },
    { icon: Users, value: '99.9%', label: 'Success Rate', color: 'text-green-400' },
    { icon: Zap, value: '0.3s', label: 'Response Time', color: 'text-blue-400' },
    { icon: Globe, value: '24/7', label: 'Availability', color: 'text-purple-400' }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <TopNavbar />
      
      {/* Animated Background */}
      <motion.div 
        style={{ y: backgroundY }}
        className="fixed inset-0 opacity-20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-blue-500/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </motion.div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            style={{ y: textY }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-6 py-2 mb-8"
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Live Interactive Demo</span>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent mb-8">
              Experience the
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Future of AI
              </span>
            </h1>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Interact with our AI agents, generate code in real-time, and see how DeanMachines RSC 
              transforms your development workflow with cutting-edge automation.
            </p>

            {/* Real-time Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {demoStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: visibleStats >= index ? 1 : 0.3,
                    y: 0,
                    scale: visibleStats === index ? 1.05 : 1
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center"
                >
                  <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                  <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code Gen
                </TabsTrigger>
                <TabsTrigger value="agents" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Agents
                </TabsTrigger>
              </TabsList>

              {/* AI Chat Demo */}
              <TabsContent value="chat" className="mt-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Conversational AI Assistant
                    </h3>
                    <p className="text-gray-300">
                      Experience natural language interactions with our AI. Ask questions, 
                      request code generation, or get help with complex problems.
                    </p>
                      <div className="space-y-3">
                      {[
                        "Generate a React component for me",
                        "How can I optimize my database queries?",
                        "Create an API endpoint for user authentication",
                        "Build a responsive dashboard layout"
                      ].map((suggestion, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setInputMessage(suggestion)}
                          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                    {/* Chat Header */}
                    <div className="border-b border-white/10 p-4 bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white font-medium">AI Assistant</span>
                        <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                          Online
                        </Badge>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="h-96 overflow-y-auto p-4 space-y-4">
                      <AnimatePresence>
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-xl ${
                                message.type === 'user'
                                  ? 'bg-yellow-400 text-black'
                                  : 'bg-white/10 text-white border border-white/20'
                              }`}
                            >
                              {message.content}
                            </div>
                          </motion.div>
                        ))}
                        
                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Input */}
                    <div className="border-t border-white/10 p-4">
                      <div className="flex gap-2">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask me anything..."
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputMessage.trim() || isTyping}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Code Generation Demo */}
              <TabsContent value="code" className="mt-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Intelligent Code Generation
                    </h3>
                    <p className="text-gray-300">
                      Watch as our AI generates production-ready code tailored to your needs. 
                      From React components to API endpoints, databases schemas, and more.
                    </p>

                    <div className="space-y-4">
                      <Button
                        onClick={generateCodeExample}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-medium"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate New Code Example
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        <Badge variant="outline" className="justify-center py-2 border-yellow-400/30 text-yellow-400">
                          React Components
                        </Badge>
                        <Badge variant="outline" className="justify-center py-2 border-blue-400/30 text-blue-400">
                          API Endpoints
                        </Badge>
                        <Badge variant="outline" className="justify-center py-2 border-green-400/30 text-green-400">
                          Database Queries
                        </Badge>
                        <Badge variant="outline" className="justify-center py-2 border-purple-400/30 text-purple-400">
                          Type Definitions
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                    <div className="border-b border-white/10 p-4 bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Code className="w-5 h-5 text-yellow-400" />
                        <span className="text-white font-medium">Generated Code</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="p-4 h-96 overflow-y-auto">
                      {codeExample ? (
                        <motion.pre
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="text-sm text-gray-300 whitespace-pre-wrap font-mono"
                        >
                          <code>{codeExample}</code>
                        </motion.pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Click &quot;Generate New Code Example&quot; to see AI in action</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* AI Agents Demo */}
              <TabsContent value="agents" className="mt-8">
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Autonomous AI Agents in Action
                    </h3>
                    <p className="text-gray-300 max-w-3xl mx-auto">
                      Watch our AI agents work autonomously to complete complex tasks, 
                      make decisions, and integrate with various systems.
                    </p>
                  </div>                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      {
                        name: "Code Review Agent",
                        status: "active",
                        task: "Analyzing pull request #247",
                        progress: 85,
                        icon: Code,
                        color: "text-blue-400"
                      },
                      {
                        name: "Customer Support Agent",
                        status: "active",
                        task: "Handling 3 concurrent chats",
                        progress: 92,
                        icon: MessageSquare,
                        color: "text-green-400"
                      },
                      {
                        name: "Data Processing Agent",
                        status: "active",
                        task: "Processing 10k records",
                        progress: 67,
                        icon: Brain,
                        color: "text-purple-400"
                      }
                    ].map((agent, index) => (
                      <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-lg bg-${agent.color.split('-')[1]}-400/20`}>
                            <agent.icon className={`w-5 h-5 ${agent.color}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{agent.name}</h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-400 uppercase">
                                {agent.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 mb-4">{agent.task}</p>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className={agent.color}>{agent.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full bg-gradient-to-r from-${agent.color.split('-')[1]}-400 to-${agent.color.split('-')[1]}-500`}
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.progress}%` }}
                              transition={{ duration: 1, delay: index * 0.2 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-full px-6 py-3"
                    >
                      <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-white font-medium">
                        All agents operating at optimal performance
                      </span>
                    </motion.div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-yellow-400/10 border border-yellow-400/20 rounded-3xl p-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent mb-6">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of developers using DeanMachines RSC to build the future of AI-powered applications.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-semibold px-8 py-3 text-lg"
              >
                Start Building Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
              >
                View Documentation
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

