# Advanced Memory Processors

This module provides production-ready memory processors optimized for handling conversations with up to 1 million tokens of context.

## Key Features

- **High Token Limit Support**: Optimized for handling up to 1M tokens in context window
- **Google Embeddings Integration**: Using Google's embedding model (8192 token support)
- **Production-Grade Metrics**: Comprehensive observability with counters, histograms, and tracing
- **Multi-Mode Memory**: Adaptive processing based on conversation dynamics
- **Semantic Clustering**: Groups similar messages to reduce redundancy
- **Enhanced Importance Scoring**: Prioritizes messages based on multiple factors
- **Metadata-Aware Filtering**: Intelligent filtering based on metadata and tags

## Memory Processors

### Core Processors

- `TokenLimiter`: Enforces token limits with intelligent truncation
- `ToolCallFilter`: Removes verbose tool calls to save context space
- `HighVolumeContextProcessor`: Prioritizes recent and important messages
- `SemanticEmbeddingProcessor`: Uses embeddings for relevance filtering

### Advanced Processors

- `SemanticClusteringProcessor`: Groups semantically similar messages
- `EnhancedImportanceProcessor`: Multi-factor message importance scoring
- `AdaptiveContextManager`: Dynamic context allocation based on conversation
- `MetadataAwareFilter`: Filters messages based on metadata and tags
- `MultiModeMemory`: Adaptive memory strategies for different conversation phases

## Usage

### Basic Usage

```typescript
import { createAdvancedMemory } from '../database';

// Create memory with default settings (1M token support)
const memory = await createAdvancedMemory();
```

### With Multi-Mode Memory

```typescript
import { createAdvancedMemory } from '../database';

// Create memory with multi-mode adaptive processing
const memory = await createAdvancedMemory({
  multiMode: true,
  initialMode: 'deep' // Start in deep mode for maximum context
});
```

### With Custom Processors

```typescript
import { 
  createAdvancedMemory, 
  TokenLimiter, 
  ToolCallFilter 
} from '../database';

// Create memory with custom processor chain
const memory = await createAdvancedMemory({
  customProcessors: [
    new TokenLimiter(100000),
    new ToolCallFilter()
  ]
});
```

## Memory Modes

The `MultiModeMemory` processor supports these modes:

- **Fast**: Optimized for quick exchanges, prioritizes recency
- **Deep**: Optimized for complex reasoning, preserves more context
- **Focus**: Concentrates on recent exchanges with minimal context
- **Broad**: Maintains wide coverage of the conversation

## Implementation Details

- **Token Counting**: Uses Google embeddings for accurate token counting
- **Embedding Cache**: Caches embeddings to avoid redundant calculations
- **Error Handling**: Robust error handling with graceful degradation
- **Observability**: Detailed tracing and metrics for production monitoring 