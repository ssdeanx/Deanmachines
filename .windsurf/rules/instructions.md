---
trigger: always_on
---

# Dean Machines RSC - Development Instructions

## 🚀 PROJECT OVERVIEW

Dean Machines RSC is a cutting-edge AI platform combining modern web technologies with advanced AI capabilities. It serves as both a functional AI assistant ecosystem and a showcase of modern development practices.

### Core Philosophy

**Modern-First**: Latest web technologies including Tailwind CSS v4 (container queries, OKLCH colors), Next.js 15 App Router, React 19 concurrent features.

**AI-Native Design**: Every aspect designed for seamless AI interaction through CopilotKit and Mastra framework integration.

**Visual Excellence**: Electric neon theme with lightning effects, 3D transforms, and hardware-accelerated animations.

**Developer Experience**: Reference implementation demonstrating best practices for modern web development with AI.

### Technology Stack

**Frontend**: Next.js 15, React 19, TypeScript 5.8, Tailwind CSS v4
**AI**: Mastra Core v0.10.5, Google Gemini 2.5 Flash, CopilotKit v1.8.14
**Infrastructure**: Supabase Auth, LangSmith, OpenTelemetry, LibSQL/Turso

## 🎨 VISUAL DESIGN SYSTEM

Electric neon theme creates immersive environment reflecting AI energy and innovation through interactive 3D experiences.

### Design Philosophy

**Electric Energy Metaphor**: Visual design inspired by electrical phenomena—lightning, energy fields, electromagnetic effects. Reinforces AI capabilities with futuristic aesthetic.

**Depth Through Technology**: Uses cutting-edge web tech for genuine depth—3D transforms, perspective effects, hardware-accelerated animations for immersive user interaction.

**Performance-First Beauty**: All effects optimized for 60fps performance. Lightning uses efficient particles, glass morphism uses CSS backdrop filters, 3D transforms use GPU acceleration.

### Implementation

**OKLCH Color Space**: Wider gamut support for vibrant colors on modern displays with accessibility compliance.

**Layered Effects**: Organized z-index hierarchy from background lightning (z-0) to content (z-30) for depth without UI overwhelm.

**Contextual Adaptation**: Effects adapt to context—subtle in docs, dramatic in playground, balanced on landing pages.

## 🏗️ FRONTEND ARCHITECTURE

Next.js 15 App Router with two primary route groups for optimal performance and developer experience.

### Route Groups

**Playground `(playground)`**: AI-interactive features requiring authentication. Specialized layouts and CopilotKit providers optimize AI experience.

**Public `(public)`**: Marketing, docs, general pages optimized for SEO and fast loading without AI overhead.

### Architecture Principles

**Hierarchical Providers**: Root layout provides global functionality, group layouts add specialized providers.

**Container Query First**: All components use container queries for flexible, context-aware responsive design.

**TypeScript-First**: Comprehensive interfaces, JSDoc documentation, proper error handling for maintainability.

## 🤖 AI INTEGRATION

Core innovation combining Mastra agent framework with CopilotKit frontend integration for collaborative AI experience.

### Multi-Agent System

**22 Specialized Agents**: Domain-specific agents (code, data, research, design, marketing, debug, quality) for deeper expertise.

**Master Agent Orchestration**: Intelligent router coordinating specialized agents and multi-agent workflows.

**Context-Aware Intelligence**: Agents maintain user context, project state, and interaction history.

### AG-UI Protocol

**Real-Time Communication**: Event-driven communication beyond request-response for interactive AI experiences.

**State Synchronization**: Automatic frontend-backend state sync with real-time UI updates.

**Tool Integration**: Agents trigger frontend actions and interact with browser APIs seamlessly.

### CopilotKit Experience

**Contextual Assistance**: AI appears in sidebars, modals, or full-screen based on user needs.

**Agent Switching**: Seamless switching between specialized agents with adaptive interfaces.

**Collaborative Workflows**: Multi-agent collaboration with clear visualization.

## 🎭 ANIMATION SYSTEM

Cohesive animation experience reinforcing electric theme with excellent performance. Every animation serves a purpose.

### Philosophy

**Purposeful Motion**: Entrance animations establish hierarchy, hover effects provide feedback, background effects create atmosphere.

**Performance-First**: Hardware acceleration, 60fps optimization, respects `prefers-reduced-motion`.

**Contextual Adaptation**: Dramatic effects in playground/landing, subtle in docs/settings.

### Technical Details

**Electric Theme**: Lightning flashes, electric pulses, storm movements create consistent AI processing metaphor.

**3D Depth**: Genuine 3D transforms for tactile interactions—cards lift and rotate in 3D space.

**Stack**: Framer Motion for complex animations, CSS for performance-critical effects, GPU acceleration.

## 🛠️ DEVELOPMENT WORKFLOW

Emphasizes consistency, quality, maintainability with cutting-edge web technologies.

### Standards

**TypeScript-First**: Comprehensive interfaces, JSDoc documentation, proper error handling.

**Electric Theme Integration**: OKLCH colors, glass morphism, 3D transforms, electric animations.

**Performance**: React.memo, proper dependencies, hardware-accelerated animations.

**Accessibility**: ARIA labels, keyboard navigation, focus management, reduced motion support.

### Quality Process

**Code Review**: Pattern adherence, performance implications, accessibility compliance.

**Testing**: Unit tests, integration tests for AI, E2E for critical workflows.

**Documentation**: TSDoc with examples, parameters, usage guidelines.

## 🔧 TECHNICAL IMPLEMENTATION (STANDARDS)

The technical implementation follows established patterns that ensure consistency, maintainability, and scalability across the entire platform. These standards have been developed through extensive frontend work and proven in production.

### File Organization Strategy

**Category-Based Structure**: Components are organized by category (landing, copilotkit, effects, ui) rather than feature, allowing for better reusability and clearer separation of concerns.

**Route-Based Pages**: The App Router structure follows Next.js 15 conventions with proper route grouping, layouts, and page organization that optimizes for both development experience and performance.

**Utility Organization**: Hooks, utilities, and effects are organized by function and reusability, with clear naming conventions that make their purpose immediately apparent.

### Naming Convention Philosophy

**Consistency Across Layers**: Naming conventions are consistent across all layers of the application—from file names to CSS classes to TypeScript interfaces. This consistency reduces cognitive load and improves developer experience.

**Semantic Clarity**: Names clearly indicate purpose and scope. Component names describe what they do, file names match their contents, and CSS classes describe their visual effect.

**Future-Proof Patterns**: Naming patterns are designed to scale with the platform, allowing for easy addition of new components, features, and integrations without breaking existing conventions.

### Code Quality Framework

**Documentation-Driven Development**: Every component includes comprehensive TSDoc documentation that serves as both specification and usage guide. This documentation is maintained as code evolves.

**Error Handling Strategy**: All components include proper error boundaries and fallback states, ensuring that failures in one component don't cascade through the application.

**Performance Monitoring**: Code quality includes performance considerations, with regular monitoring of bundle size, render performance, and animation frame rates.

## 🚀 DEPLOYMENT & ENVIRONMENT (PRODUCTION)

The deployment strategy emphasizes reliability, performance, and maintainability across development, staging, and production environments. The platform is designed for edge deployment with global distribution capabilities.

### Environment Configuration Strategy

**Layered Configuration**: Environment variables are organized by concern—AI services, database connections, authentication, and observability. This organization makes configuration management clearer and reduces deployment errors.

**Security-First Approach**: Sensitive configuration is handled through secure environment variable management, with clear separation between public and private keys. No sensitive information is ever committed to the repository.

**Development Parity**: Development and production environments maintain parity in configuration structure, ensuring that deployment issues are caught early in the development process.

### Development Workflow

**Dual-Server Architecture**: The platform runs two development servers—Next.js for the frontend and Mastra for the AI backend. This separation allows for independent development and testing of each layer.

**Quality Gates**: The development workflow includes multiple quality gates—TypeScript checking, ESLint validation, unit testing, and end-to-end testing. These gates ensure code quality before deployment.

**Performance Monitoring**: Development includes performance monitoring tools that track bundle size, render performance, and AI response times, ensuring that performance regressions are caught early.

## 📊 PERFORMANCE & MONITORING (OPTIMIZATION)

Performance is a core requirement for Dean Machines RSC, ensuring that the advanced visual effects and AI interactions remain smooth and responsive across all devices and network conditions.

### Performance Philosophy

**User Experience First**: Performance optimization focuses on user-perceived performance—fast initial loads, smooth animations, and responsive AI interactions. Technical metrics serve the goal of excellent user experience.

**Progressive Enhancement**: The platform provides a baseline experience that works everywhere, with enhanced features for capable devices and fast connections. This ensures accessibility while leveraging modern capabilities.

**Continuous Monitoring**: Performance is monitored continuously in both development and production, with automated alerts for regressions and regular optimization reviews.

### Monitoring Strategy

**Comprehensive Observability**: The monitoring stack provides visibility into every layer of the application—from frontend performance through AI model execution to database queries. This comprehensive view enables rapid issue identification and resolution.

**AI-Specific Metrics**: Beyond traditional web metrics, the platform monitors AI-specific performance indicators like model response times, agent switching latency, and context processing efficiency.

**User-Centric Analytics**: Monitoring focuses on user-centric metrics that directly impact the AI collaboration experience, ensuring that optimizations improve real user outcomes rather than just technical benchmarks.
