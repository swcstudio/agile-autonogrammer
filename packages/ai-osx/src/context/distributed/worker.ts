/**
 * AI-OSX Distributed Computing Worker
 * 
 * Main Cloudflare Worker script for the Brain-Braun-Beyond distributed computing layer
 */

import { 
  CloudflareDistributedCompute, 
  type CloudflareWorkerEnv, 
  type DistributedProcessingRequest 
} from './cloudflare_worker';
import { FieldResonanceManager } from './field_resonance_durable_object';

// Export Durable Object class
export { FieldResonanceManager };

export default {
  async fetch(request: Request, env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<Response> {
    try {
      // Add CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
        'Access-Control-Max-Age': '86400',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Initialize distributed compute engine
      const compute = new CloudflareDistributedCompute(env, ctx, request.cf || {});

      // Route requests based on path
      switch (path) {
        case '/health':
          return handleHealthCheck(env, corsHeaders);

        case '/process':
          return await handleProcessingRequest(request, compute, corsHeaders);

        case '/status':
          return await handleStatusRequest(request, env, corsHeaders);

        case '/analytics':
          return await handleAnalyticsRequest(request, env, corsHeaders);

        case '/field/resonance':
          return await handleFieldResonanceRequest(request, env, corsHeaders);

        case '/queue/status':
          return await handleQueueStatusRequest(request, env, corsHeaders);

        case '/metrics':
          return await handleMetricsRequest(request, env, corsHeaders);

        default:
          return new Response('Not Found', { 
            status: 404, 
            headers: corsHeaders 
          });
      }

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },

  async queue(batch: MessageBatch<any>, env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<void> {
    try {
      const compute = new CloudflareDistributedCompute(env, ctx, {});

      for (const message of batch.messages) {
        try {
          await processQueueMessage(message, compute, env, ctx);
          message.ack();
        } catch (error) {
          console.error('Queue message processing failed:', error);
          message.retry();
        }
      }
    } catch (error) {
      console.error('Queue batch processing failed:', error);
    }
  },

  async scheduled(event: ScheduledEvent, env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<void> {
    try {
      // Scheduled tasks for maintenance and optimization
      switch (event.cron) {
        case '*/5 * * * *': // Every 5 minutes
          await performMaintenanceTasks(env, ctx);
          break;
        case '0 * * * *': // Every hour
          await optimizeResourceAllocation(env, ctx);
          break;
        case '0 0 * * *': // Daily
          await generateDailyReports(env, ctx);
          break;
      }
    } catch (error) {
      console.error('Scheduled task failed:', error);
    }
  }
};

async function handleHealthCheck(env: CloudflareWorkerEnv, corsHeaders: Record<string, string>): Promise<Response> {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    region: env.EDGE_REGION || 'unknown',
    processingTier: env.PROCESSING_TIER || 'standard',
    services: {
      ai: !!env.AI,
      vectorize: !!env.CONTEXT_VECTORS,
      kv: !!env.AI_CONTEXT_CACHE,
      r2: !!env.AI_MODEL_STORAGE,
      d1: !!env.ANALYTICS_DB,
      queues: !!env.BRAIN_PROCESSING_QUEUE,
      durableObjects: !!env.COGNITIVE_COORDINATOR
    },
    capabilities: {
      brainProcessing: true,
      braunComputing: true,
      beyondTranscendence: true,
      fieldResonance: true,
      contextEngineering: true
    }
  };

  return new Response(JSON.stringify(healthStatus), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

async function handleProcessingRequest(
  request: Request, 
  compute: CloudflareDistributedCompute, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const processingRequest: DistributedProcessingRequest = await request.json();
    
    // Validate request
    if (!processingRequest.id || !processingRequest.type) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Missing required fields: id, type'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Process the request
    const response = await compute.processDistributedRequest(processingRequest);

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown processing error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleStatusRequest(
  request: Request, 
  env: CloudflareWorkerEnv, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get('id');
  const sessionId = url.searchParams.get('session');

  if (!requestId && !sessionId) {
    return new Response('Missing required parameter: id or session', {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    let status;

    if (requestId) {
      // Get status for specific request
      const result = await env.PROCESSING_RESULTS.get(`result:${requestId}`);
      status = {
        requestId,
        found: !!result,
        result: result ? JSON.parse(result) : null,
        timestamp: new Date().toISOString()
      };
    } else if (sessionId) {
      // Get session status
      const sessionData = await env.AI_CONTEXT_CACHE.get(`session:${sessionId}`, 'json');
      status = {
        sessionId,
        found: !!sessionData,
        data: sessionData,
        timestamp: new Date().toISOString()
      };
    }

    return new Response(JSON.stringify(status), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleAnalyticsRequest(
  request: Request, 
  env: CloudflareWorkerEnv, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const timeframe = url.searchParams.get('timeframe') || '1h';
  const metric = url.searchParams.get('metric') || 'all';

  try {
    let query = 'SELECT * FROM processing_analytics WHERE timestamp > datetime("now", "-1 hour")';
    
    switch (timeframe) {
      case '1h':
        query = 'SELECT * FROM processing_analytics WHERE timestamp > datetime("now", "-1 hour")';
        break;
      case '24h':
        query = 'SELECT * FROM processing_analytics WHERE timestamp > datetime("now", "-1 day")';
        break;
      case '7d':
        query = 'SELECT * FROM processing_analytics WHERE timestamp > datetime("now", "-7 days")';
        break;
    }

    const result = await env.ANALYTICS_DB.prepare(query).all();
    
    // Process analytics data
    const analytics = {
      timeframe,
      totalRequests: result.results.length,
      successRate: result.results.filter(r => r.success).length / result.results.length,
      averageProcessingTime: result.results.reduce((sum: number, r: any) => 
        sum + (r.processing_time || 0), 0) / result.results.length,
      processingTypes: aggregateByField(result.results, 'processing_type'),
      edgeLocations: aggregateByField(result.results, 'edge_location'),
      priorityDistribution: aggregateByField(result.results, 'priority'),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(analytics), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Analytics query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleFieldResonanceRequest(
  request: Request, 
  env: CloudflareWorkerEnv, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session') || 'default';

  try {
    // Get Durable Object instance
    const durableObjectId = env.FIELD_RESONANCE_MANAGER.idFromName(`field:${sessionId}`);
    const fieldManager = env.FIELD_RESONANCE_MANAGER.get(durableObjectId);

    // Forward request to Durable Object
    const response = await fieldManager.fetch(request);
    
    // Add CORS headers to response
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        ...corsHeaders
      }
    });

    return modifiedResponse;

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Field resonance request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleQueueStatusRequest(
  request: Request, 
  env: CloudflareWorkerEnv, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Note: Queue metrics are not directly accessible via API
    // This is a placeholder implementation
    const queueStatus = {
      brain_processing: {
        name: 'BRAIN_PROCESSING_QUEUE',
        estimated_depth: 'unknown', // Would need custom tracking
        status: 'operational'
      },
      braun_compute: {
        name: 'BRAUN_COMPUTE_QUEUE',
        estimated_depth: 'unknown',
        status: 'operational'
      },
      beyond_transcendence: {
        name: 'BEYOND_TRANSCENDENCE_QUEUE',
        estimated_depth: 'unknown',
        status: 'operational'
      }
    };

    return new Response(JSON.stringify(queueStatus), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Queue status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleMetricsRequest(
  request: Request, 
  env: CloudflareWorkerEnv, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Collect system metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      region: env.EDGE_REGION || 'unknown',
      processing_tier: env.PROCESSING_TIER || 'standard',
      
      // Storage metrics (estimated)
      storage: {
        kv_namespaces: {
          ai_context_cache: await getKVMetrics(env.AI_CONTEXT_CACHE),
          brain_state_store: await getKVMetrics(env.BRAIN_STATE_STORE),
          beyond_field_data: await getKVMetrics(env.BEYOND_FIELD_DATA)
        }
      },
      
      // Recent processing activity
      recent_activity: await getRecentActivity(env.ANALYTICS_DB),
      
      // System capabilities
      capabilities: {
        max_compute_units: env.MAX_COMPUTE_UNITS,
        ai_models_available: !!env.AI,
        vectorize_enabled: !!env.CONTEXT_VECTORS,
        durable_objects_active: true
      }
    };

    return new Response(JSON.stringify(metrics), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Metrics collection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function processQueueMessage(
  message: Message<any>, 
  compute: CloudflareDistributedCompute, 
  env: CloudflareWorkerEnv, 
  ctx: ExecutionContext
): Promise<void> {
  const messageData = message.body;

  switch (messageData.type) {
    case 'distributed_processing':
      await compute.processDistributedRequest(messageData.request);
      break;
      
    case 'computation_complete':
      await handleComputationComplete(messageData, env);
      break;
      
    case 'field_analysis':
      await handleFieldAnalysis(messageData, env);
      break;
      
    default:
      console.warn('Unknown message type:', messageData.type);
  }
}

async function handleComputationComplete(messageData: any, env: CloudflareWorkerEnv): Promise<void> {
  // Store computation results
  await env.COGNITIVE_ARTIFACTS.put(
    `computation:${messageData.requestId}`,
    JSON.stringify(messageData.result)
  );
  
  // Update session state
  const sessionKey = `session:${messageData.sessionId}`;
  const sessionData = await env.AI_CONTEXT_CACHE.get(sessionKey, 'json') || {};
  sessionData.lastComputation = {
    requestId: messageData.requestId,
    timestamp: messageData.timestamp,
    type: 'braun'
  };
  
  await env.AI_CONTEXT_CACHE.put(sessionKey, JSON.stringify(sessionData));
}

async function handleFieldAnalysis(messageData: any, env: CloudflareWorkerEnv): Promise<void> {
  // Store field analysis results
  await env.BEYOND_FIELD_DATA.put(
    `analysis:${messageData.requestId}`,
    JSON.stringify(messageData.transcendenceData),
    { expirationTtl: 7200 } // 2 hours
  );
}

async function performMaintenanceTasks(env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<void> {
  // Clean up expired data
  console.log('Performing maintenance tasks...');
  
  // This would need custom implementation to list and clean up expired entries
  // KV and R2 have automatic expiration, but manual cleanup might be needed
}

async function optimizeResourceAllocation(env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<void> {
  console.log('Optimizing resource allocation...');
  
  // Analyze recent processing patterns and adjust resource allocation
  // This would be a more complex implementation in practice
}

async function generateDailyReports(env: CloudflareWorkerEnv, ctx: ExecutionContext): Promise<void> {
  console.log('Generating daily reports...');
  
  // Generate summary reports and store them
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dailyStats = await env.ANALYTICS_DB.prepare(`
    SELECT 
      processing_type,
      COUNT(*) as count,
      AVG(processing_time) as avg_time,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
    FROM processing_analytics 
    WHERE DATE(timestamp) = DATE(?)
    GROUP BY processing_type
  `).bind(yesterday.toISOString().split('T')[0]).all();
  
  await env.COGNITIVE_ARTIFACTS.put(
    `daily-report:${yesterday.toISOString().split('T')[0]}`,
    JSON.stringify({
      date: yesterday.toISOString().split('T')[0],
      statistics: dailyStats.results,
      generated_at: new Date().toISOString()
    })
  );
}

// Helper functions
function aggregateByField(results: any[], field: string): Record<string, number> {
  return results.reduce((acc, item) => {
    const value = item[field] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function getKVMetrics(kv: KVNamespace): Promise<any> {
  // KV metrics are not directly available via API
  // This would require custom tracking or estimation
  return {
    estimated_keys: 'unknown',
    status: 'operational'
  };
}

async function getRecentActivity(db: D1Database): Promise<any> {
  try {
    const result = await db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
        AVG(processing_time) as avg_processing_time
      FROM processing_analytics 
      WHERE timestamp > datetime('now', '-1 hour')
    `).first();
    
    return result;
  } catch (error) {
    return {
      total_requests: 0,
      successful_requests: 0,
      avg_processing_time: 0
    };
  }
}