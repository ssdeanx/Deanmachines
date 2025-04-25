/**
 * OpenTelemetry Tracing Service for Mastra
 * 
 * This module provides OpenTelemetry initialization and tracing functionality
 * for the DeanMachines AI platform. It sets up auto-instrumentation and provides
 * utilities to interact with the OpenTelemetry API.
 */
import process from 'process';
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { CompositePropagator } from '@opentelemetry/core';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import {
  propagation,
  context,
  trace,
  metrics,
  Meter,
  MeterProvider,
  Counter,
  Histogram,
  Tracer,
} from '@opentelemetry/api';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { createLogger } from '@mastra/core/logger';
import {
  OTelInitOptions,
  resourceFromAttributes,
  detectResources,
} from './types';

const logger = createLogger({ name: 'opentelemetry-tracing', level: 'info' });

let tracerInstance: Tracer | null = null;
let meterProviderInstance: MeterProvider | null = null;
let meterInstance: Meter | null = null;

/**
 * Initialize OpenTelemetry with default settings for Mastra projects
 * @param serviceName Name of the service (default: 'mastra-service')
 * @param serviceVersion Version of the service (default: '1.0.0')
 * @returns Object with tracer, meterProvider, and meter
 */
export function initializeDefaultTracing(
  serviceName = 'mastra-service',
  serviceVersion = '1.0.0'
): {
  tracer: Tracer | null;
  meterProvider: MeterProvider | null;
  meter: Meter | null;
} {
  initOpenTelemetry({
    serviceName,
    serviceVersion,
    environment: process.env.NODE_ENV || 'development',
    enabled: process.env.OTEL_ENABLED !== 'false',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    metricsEnabled: process.env.OTEL_METRICS_ENABLED !== 'false',
    metricsIntervalMs: parseInt(process.env.OTEL_METRICS_INTERVAL_MS || '60000', 10),
    samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || '1.0'),
  });

  return {
    tracer: tracerInstance,
    meterProvider: meterProviderInstance,
    meter: meterInstance,
  };
}

export function logWithTraceContext(
  target: Console | Record<string, (...args: any[]) => void>,
  level: string,
  message: string,
  data?: Record<string, any>
): void {
  const span = trace.getSpan(context.active());
  const traceFields = span
    ? { trace_id: span.spanContext().traceId, span_id: span.spanContext().spanId }
    : {};
  const fn = (target as any)[level] ?? (target as any).info ?? console.log;
  fn.call(target, message, { ...data, ...traceFields });
}

export function initOpenTelemetry(
  options: OTelInitOptions & { exporters?: Array<{ type: 'otlp' | 'console'; endpoint?: string; headers?: Record<string, string>; metricsInterval?: number }>; metricsEnabled?: boolean; metricsIntervalMs?: number }
): NodeSDK | null {
  const {
    serviceName = 'deanmachines-ai',
    serviceVersion = '1.0.0',
    environment = 'development',
    enabled = true,
    samplingRatio = 1.0,
    exporters,
    metricsEnabled = true,
    metricsIntervalMs = 60000,
    endpoint: defaultEndpoint,
    headers: defaultHeaders,
  } = options;

  // Determine exporter configurations (multi-provider support)
  const exporterConfigs = (exporters && exporters.length > 0)
    ? exporters
    : defaultEndpoint
      ? [{ type: 'otlp', endpoint: defaultEndpoint, headers: defaultHeaders || {}, metricsInterval: metricsIntervalMs }]
      : [];

  if (!enabled || exporterConfigs.length === 0) {
    logger.info('OpenTelemetry tracing is disabled or no exporters configured');
    tracerInstance = null;
    meterProviderInstance = null;
    meterInstance = null;
    return null;
  }

  // Use the first exporter for setup
  const firstExporter = exporterConfigs[0];
  const traceEndpoint = firstExporter.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const traceHeaders = firstExporter.headers || {};

  const detected = detectResources();
  const manual = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  });
  const resource = detected.merge(manual);

  const propagator = new CompositePropagator({
    propagators: [new B3Propagator()],
  });
  propagation.setGlobalPropagator(propagator);

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(samplingRatio),
  });

  const traceExporter = new OTLPTraceExporter({
    url: traceEndpoint,
    headers: traceHeaders,
  });

  const metricReader =
    metricsEnabled
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: (traceEndpoint || '').replace('/v1/traces', '/v1/metrics'),
            headers: traceHeaders,
          }),
          exportIntervalMillis: firstExporter.metricsInterval ?? metricsIntervalMs,
        })
      : undefined;

  const config: NodeSDKConfiguration = {
    resource,
    sampler,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req: any) =>
            req.url?.includes('/health') ?? false,
        },
      }),
    ],
    autoDetectResources: false,
    textMapPropagator: propagator,
    logRecordProcessors: [],
    metricReader: metricReader as any,
    views: [],
    resourceDetectors: [],
    contextManager: undefined as any,
    logRecordProcessor: undefined as any,
    spanLimits: undefined as any,
    idGenerator: undefined as any,
  };

  const sdk = new NodeSDK(config);

  // Add additional span processors for multi-provider trace export
  exporterConfigs.slice(1).forEach(cfg => {
    const exporter = cfg.type === 'console'
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: cfg.endpoint, headers: cfg.headers });
    // @ts-ignore: adding span processor to underlying provider
    (trace.getTracerProvider() as any).addSpanProcessor(new BatchSpanProcessor(exporter));
  });

  try {
    sdk.start();
    logger.info('OpenTelemetry SDK initialized');

    tracerInstance = trace.getTracer(serviceName);
    meterProviderInstance = metrics;
    meterInstance = metrics.getMeter(serviceName + '-metrics');
  } catch (err) {
    logger.error('Error initializing OpenTelemetry SDK', { error: (err as Error).message });
    tracerInstance = null;
    meterProviderInstance = null;
    meterInstance = null;
  }

  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    logger.info('OpenTelemetry SDK shut down');
    process.exit(0);
  });

  return sdk;
}

export function getTracer(): Tracer | null {
  return tracerInstance;
}

export function getMeterProvider(): MeterProvider | null {
  return meterProviderInstance;
}

export function getMeter(): Meter | null {
  return meterInstance;
}

export function createCounter(name: string, description?: string): Counter {
  const meter = meterInstance || metrics.getMeter('mastra-metrics');
  return meter.createCounter(name, { description });
}

export function createHistogram(name: string, description?: string): Histogram {
  const meter = meterInstance || metrics.getMeter('mastra-metrics');
  return meter.createHistogram(name, { description });
}

export default {
  init: initOpenTelemetry,
  initializeDefaultTracing,
  getTracer,
  getMeterProvider,
  getMeter,
  logWithTraceContext,
  createCounter,
  createHistogram,
};
