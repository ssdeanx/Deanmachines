// Generated on 2025-01-27
'use client';

import { motion } from 'framer-motion';
import { TopNavbar } from '@/components/landing/TopNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Phone, 
  MessageCircle,
  Send,
  CheckCircle,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Contact page with multiple communication channels
 * 
 * Features contact form, office locations, and team information
 * Dark theme with yellow neon accents for consistent branding
 * 
 * @returns {JSX.Element} The rendered contact page
 */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setSubmitted(true);
  };

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      description: "Get in touch via email",
      value: "hello@deanmachines.com",
      action: "mailto:hello@deanmachines.com",
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      description: "Speak with our team",
      value: "+1 (555) 123-4567",
      action: "tel:+15551234567",
      color: "bg-green-500/10 border-green-500/20"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Live Chat",
      description: "Chat with support",
      value: "Available 24/7",
      action: "#",
      color: "bg-purple-500/10 border-purple-500/20"
    }
  ];

  const offices = [
    {
      city: "San Francisco",
      country: "USA",
      address: "123 Market Street, Suite 400",
      timezone: "PST (UTC-8)",
      hours: "9AM - 6PM"
    },
    {
      city: "London", 
      country: "UK",
      address: "45 King's Road, Chelsea",
      timezone: "GMT (UTC+0)",
      hours: "9AM - 6PM"
    },
    {
      city: "Tokyo",
      country: "Japan", 
      address: "1-1 Shibuya, Shibuya City",
      timezone: "JST (UTC+9)",
      hours: "9AM - 6PM"
    }
  ];

  const team = [
    {
      name: "Sarah Chen",
      role: "Head of Customer Success",
      bio: "Expert in AI implementation and customer onboarding",
      image: "/api/placeholder/100/100",
      social: {
        linkedin: "#",
        twitter: "#"
      }
    },
    {
      name: "Marcus Rodriguez",
      role: "Technical Support Lead",
      bio: "Specializes in complex integrations and troubleshooting",
      image: "/api/placeholder/100/100",
      social: {
        linkedin: "#",
        github: "#"
      }
    },
    {
      name: "Dr. Emily Watson",
      role: "AI Research Director",
      bio: "PhD in AI/ML with 10+ years in research and development",
      image: "/api/placeholder/100/100",
      social: {
        linkedin: "#",
        twitter: "#"
      }
    }
  ];

  const faqs = [
    {
      question: "How quickly can I get started?",
      answer: "You can create your first AI agent in under 5 minutes with our quick start guide."
    },
    {
      question: "Do you offer enterprise support?",
      answer: "Yes, we provide 24/7 dedicated support, custom training, and SLA guarantees for enterprise customers."
    },
    {
      question: "Can I integrate with my existing systems?",
      answer: "DeanMachines RSC supports hundreds of integrations including APIs, webhooks, and custom connectors."
    }
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-primary" />
            </motion.div>
            
            <motion.h1 
              className="text-4xl sm:text-5xl font-extrabold text-foreground mb-6"
              animate={{ 
                textShadow: [
                  "0 0 10px rgba(241, 196, 15, 0.3)",
                  "0 0 20px rgba(241, 196, 15, 0.5)",
                  "0 0 10px rgba(241, 196, 15, 0.3)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Message <span className="text-primary neon-text">Sent!</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Thank you for reaching out! We&apos;ll get back to you within 24 hours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-4"
            >
              <Button 
                asChild 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow pulse-glow"
              >
                <Link href="/docs">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Explore Documentation
                </Link>
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Or{' '}
                <button 
                  onClick={() => setSubmitted(false)}
                  className="text-primary hover:text-primary/80 neon-text font-medium"
                >
                  send another message
                </button>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6"
            animate={{ 
              textShadow: [
                "0 0 10px rgba(241, 196, 15, 0.3)",
                "0 0 20px rgba(241, 196, 15, 0.5)",
                "0 0 10px rgba(241, 196, 15, 0.3)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Get in <span className="text-primary neon-text">Touch</span>
          </motion.h1>
          <motion.p 
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Have questions about DeanMachines RSC? Need help with implementation? 
            Our team of AI experts is here to help you succeed.
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Methods */}
          {contactMethods.map((method, index) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
            >
              <Card className={`glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 h-full ${method.color}`}>
                <CardHeader className="text-center">
                  <div className="text-primary bg-primary/10 p-3 rounded-lg w-fit mx-auto mb-4">
                    {method.icon}
                  </div>
                  <CardTitle className="text-xl text-foreground">{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-foreground font-medium mb-4">{method.value}</p>
                  <Button 
                    asChild 
                    className="w-full glass-effect border-primary/30 hover:border-primary/60"
                    variant="outline"
                  >
                    <Link href={method.action}>
                      Contact Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="glass-effect border-primary/20 neon-glow">
              <CardHeader>
                <CardTitle className="text-2xl text-primary neon-text">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="name" className="text-foreground">
                        Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="glass-effect border-primary/30 focus:border-primary/60"
                        required
                      />
                    </motion.div>

                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="email" className="text-foreground">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="glass-effect border-primary/30 focus:border-primary/60"
                        required
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="company" className="text-foreground">
                      Company
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your company name"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="glass-effect border-primary/30 focus:border-primary/60"
                    />
                  </motion.div>

                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="subject" className="text-foreground">
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="What can we help you with?"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className="glass-effect border-primary/30 focus:border-primary/60"
                      required
                    />
                  </motion.div>

                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="message" className="text-foreground">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your project or question..."
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      className="glass-effect border-primary/30 focus:border-primary/60 min-h-[120px]"
                      required
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow pulse-glow"
                      disabled={isLoading || !formData.name || !formData.email || !formData.subject || !formData.message}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          <span>Sending...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Office Locations & Team */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-8"
          >
            {/* Office Locations */}
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl text-primary neon-text flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Our Offices
                </CardTitle>
                <CardDescription>
                  Visit us at one of our global locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {offices.map((office) => (
                    <motion.div
                      key={office.city}
                      className="p-4 rounded-lg glass-effect border border-primary/10"
                      whileHover={{ scale: 1.02, borderColor: "rgba(241, 196, 15, 0.3)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{office.city}</h3>
                        <Badge variant="outline" className="glass-effect text-xs">
                          {office.country}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{office.address}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{office.hours}</span>
                        </div>
                        <span>{office.timezone}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl text-primary neon-text">
                  Quick Answers
                </CardTitle>
                <CardDescription>
                  Frequently asked questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      className="p-4 rounded-lg glass-effect border border-primary/10"
                      whileHover={{ scale: 1.02, borderColor: "rgba(241, 196, 15, 0.3)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <h4 className="font-medium text-foreground mb-2">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Meet Our <span className="text-primary neon-text">Team</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The experts behind DeanMachines RSC are here to support your success
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 1 }}
              >
                <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 text-center">
                  <CardHeader>
                    <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-xl text-foreground">{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{member.bio}</p>
                    <div className="flex justify-center gap-3">
                      {member.social.linkedin && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={member.social.linkedin}>
                            <Linkedin className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      {member.social.twitter && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={member.social.twitter}>
                            <Twitter className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      {member.social.github && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={member.social.github}>
                            <Github className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
