/**
 * Exercise 2: Event Loop Phase Detector - SOLUTION
 * 
 * Complete implementation of an event loop phase detector that tracks TCP events
 * and correlates them with event loop phases to understand Node.js scheduling.
 * 
 * Key concepts demonstrated:
 * - Event loop phase detection using scheduler timing
 * - Async hooks for tracking TCP operations
 * - Correlation between network I/O and event loop phases
 * - Performance implications of phase scheduling
 * 
 * To run: node exercise-2-solution.js
 */

const net = require('net');
const async_hooks = require('async_hooks');
const { performance } = require('perf_hooks');

/**
 * EventLoopTracer tracks which event loop phase is currently executing
 * and correlates TCP events with these phases
 */
class EventLoopTracer {
  constructor() {
    this.phases = new Map([
      ['timers', { count: 0, operations: [] }],
      ['pending', { count: 0, operations: [] }],
      ['idle', { count: 0, operations: [] }],
      ['poll', { count: 0, operations: [] }],
      ['check', { count: 0, operations: [] }],
      ['close', { count: 0, operations: [] }]
    ]);
    
    this.currentPhase = 'unknown';
    this.operations = new Map();
    this.phaseHistory = [];
    this.isTracking = false;
    this.asyncHook = null;
    this.phaseDetectors = new Map();
    this.lastPhaseChange = performance.now();
    
    console.log('[Tracer] EventLoopTracer initialized');
  }
  
  /**
   * Start tracking event loop phases using scheduler timing patterns
   */
  startTracking() {
    this.isTracking = true;
    
    // Set up phase detection using different scheduling mechanisms
    this.setupPhaseDetection();
    
    // Implement async_hooks to track TCP operations
    this.setupAsyncHooks();
    
    // Start continuous phase detection
    this.startPhaseDetectionLoop();
    
    console.log('[Tracer] Started tracking event loop phases');
  }
  
  /**
   * Set up phase detection using scheduler timing patterns
   */
  setupPhaseDetection() {
    // Timers phase - setTimeout executes here
    this.detectPhase('timers', () => setTimeout(() => {
      this.recordPhase('timers');
    }, 0));
    
    // Check phase - setImmediate executes here
    this.detectPhase('check', () => setImmediate(() => {
      this.recordPhase('check');
    }));
    
    // Poll phase detection - I/O operations typically happen here
    // We can detect this by monitoring when other phases are NOT active
    this.detectPhase('poll', () => {
      // Poll phase is when we're waiting for I/O
      process.nextTick(() => {
        if (this.currentPhase === 'unknown') {
          this.recordPhase('poll');
        }
      });
    });
  }
  
  /**
   * Set up async_hooks to track TCP operations
   */
  setupAsyncHooks() {
    this.asyncHook = async_hooks.createHook({
      init: (asyncId, type, triggerAsyncId, resource) => {
        if (this.isTracking && this.isTCPRelated(type)) {
          const operation = {
            asyncId,
            type,
            triggerAsyncId,
            phase: this.currentPhase,
            timestamp: performance.now(),
            stage: 'init'
          };
          
          this.operations.set(asyncId, operation);
          this.trackTCPOperation('init', operation);
        }
      },
      
      before: (asyncId) => {
        if (this.isTracking && this.operations.has(asyncId)) {
          const operation = this.operations.get(asyncId);
          operation.beforeTimestamp = performance.now();
          operation.beforePhase = this.currentPhase;
          
          this.trackTCPOperation('before', operation);
        }
      },
      
      after: (asyncId) => {
        if (this.isTracking && this.operations.has(asyncId)) {
          const operation = this.operations.get(asyncId);
          operation.afterTimestamp = performance.now();
          operation.afterPhase = this.currentPhase;
          operation.duration = operation.afterTimestamp - operation.beforeTimestamp;
          
          this.trackTCPOperation('after', operation);
        }
      },
      
      destroy: (asyncId) => {
        if (this.isTracking && this.operations.has(asyncId)) {
          const operation = this.operations.get(asyncId);
          operation.destroyTimestamp = performance.now();
          operation.destroyPhase = this.currentPhase;
          
          this.trackTCPOperation('destroy', operation);
        }
      }
    });
    
    this.asyncHook.enable();
  }
  
  /**
   * Check if async operation type is TCP related
   */
  isTCPRelated(type) {
    return ['TCPWRAP', 'TCPSERVERWRAP', 'TCPCONNECTWRAP', 'SHUTDOWNWRAP'].includes(type);
  }
  
  /**
   * Start continuous phase detection loop
   */
  startPhaseDetectionLoop() {
    const detectCurrentPhase = () => {
      if (!this.isTracking) return;
      
      // Use timing patterns to detect current phase
      const now = performance.now();
      
      // Schedule detection for next tick
      setImmediate(() => {
        this.recordPhase('check');
        process.nextTick(detectCurrentPhase);
      });
      
      setTimeout(() => {
        this.recordPhase('timers');
      }, 0);
    };
    
    detectCurrentPhase();
  }
  
  /**
   * Record phase transition
   */
  recordPhase(phaseName) {
    if (this.currentPhase !== phaseName) {
      const now = performance.now();
      const duration = now - this.lastPhaseChange;
      
      this.phaseHistory.push({
        from: this.currentPhase,
        to: phaseName,
        timestamp: now,
        duration: duration
      });
      
      this.currentPhase = phaseName;
      this.lastPhaseChange = now;
      
      if (this.phases.has(phaseName)) {
        this.phases.get(phaseName).count++;
      }
    }
  }
  
  /**
   * Implement phase detection using scheduler timing
   */
  detectPhase(phaseName, scheduler) {
    this.phaseDetectors.set(phaseName, scheduler);
    
    // Execute the scheduler periodically
    const interval = setInterval(() => {
      if (this.isTracking) {
        scheduler();
      } else {
        clearInterval(interval);
      }
    }, 10);
  }
  
  /**
   * Track TCP operations and correlate with event loop phases
   */
  trackTCPOperation(operation, details) {
    const phaseData = this.phases.get(this.currentPhase);
    if (phaseData) {
      phaseData.operations.push({
        operation,
        details,
        timestamp: performance.now()
      });
    }
    
    console.log(`[Tracer] TCP ${operation} (${details.type || 'unknown'}) in phase: ${this.currentPhase} at ${details.timestamp?.toFixed(2) || 'unknown'}ms`);
  }
  
  /**
   * Stop tracking event loop phases
   */
  stopTracking() {
    this.isTracking = false;
    
    if (this.asyncHook) {
      this.asyncHook.disable();
    }
    
    console.log('[Tracer] Stopped tracking event loop phases');
  }
  
  /**
   * Get current event loop phase
   */
  getCurrentPhase() {
    return this.currentPhase;
  }
  
  /**
   * Get comprehensive tracking statistics
   */
  getStatistics() {
    const stats = {
      currentPhase: this.currentPhase,
      totalPhaseTransitions: this.phaseHistory.length,
      phaseDistribution: {},
      operationsByPhase: {},
      averagePhaseDuration: {},
      totalOperations: this.operations.size,
      recentHistory: this.phaseHistory.slice(-10)
    };
    
    // Calculate phase distribution
    for (const [phase, data] of this.phases.entries()) {
      stats.phaseDistribution[phase] = data.count;
      stats.operationsByPhase[phase] = data.operations.length;
    }
    
    // Calculate average phase durations
    const phaseDurations = new Map();
    for (const transition of this.phaseHistory) {
      if (!phaseDurations.has(transition.from)) {
        phaseDurations.set(transition.from, []);
      }
      phaseDurations.get(transition.from).push(transition.duration);
    }
    
    for (const [phase, durations] of phaseDurations.entries()) {
      if (durations.length > 0) {
        stats.averagePhaseDuration[phase] = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
    }
    
    return stats;
  }
}

/**
 * TrackedServer wraps a TCP server with event loop phase tracking
 */
class TrackedServer {
  constructor(tracer) {
    this.tracer = tracer;
    this.server = null;
    this.connectionCount = 0;
    this.connections = new Map();
  }
  
  /**
   * Start the server with tracking
   */
  listen(port, callback) {
    const creationPhase = this.tracer.getCurrentPhase();
    console.log(`[Server] Creating server in phase: ${creationPhase}`);
    
    this.server = net.createServer((socket) => {
      const connectionPhase = this.tracer.getCurrentPhase();
      const connectionId = ++this.connectionCount;
      
      console.log(`[Server] New connection #${connectionId} in phase: ${connectionPhase}`);
      
      this.connections.set(connectionId, {
        socket,
        createdPhase: connectionPhase,
        createdAt: performance.now()
      });
      
      this.tracer.trackTCPOperation('connection', {
        connectionId,
        phase: connectionPhase,
        timestamp: performance.now()
      });
      
      socket.on('data', (data) => {
        const dataPhase = this.tracer.getCurrentPhase();
        console.log(`[Server] Data received on connection #${connectionId} in phase: ${dataPhase}`);
        
        this.tracer.trackTCPOperation('data_received', {
          connectionId,
          dataLength: data.length,
          phase: dataPhase,
          timestamp: performance.now()
        });
        
        // Echo back with phase information
        const response = `Echo from ${dataPhase} phase: ${data}`;
        socket.write(response);
        
        this.tracer.trackTCPOperation('data_sent', {
          connectionId,
          dataLength: response.length,
          phase: this.tracer.getCurrentPhase(),
          timestamp: performance.now()
        });
      });
      
      socket.on('end', () => {
        const endPhase = this.tracer.getCurrentPhase();
        console.log(`[Server] Connection #${connectionId} ended in phase: ${endPhase}`);
        
        this.tracer.trackTCPOperation('connection_end', {
          connectionId,
          phase: endPhase,
          timestamp: performance.now()
        });
        
        this.connections.delete(connectionId);
      });
      
      socket.on('error', (err) => {
        console.log(`[Server] Connection #${connectionId} error: ${err.message}`);
      });
    });
    
    this.server.listen(port, () => {
      const listenPhase = this.tracer.getCurrentPhase();
      console.log(`[Server] Server listening on port ${port} in phase: ${listenPhase}`);
      
      this.tracer.trackTCPOperation('server_listen', {
        port,
        phase: listenPhase,
        timestamp: performance.now()
      });
      
      if (callback) callback();
    });
  }
  
  /**
   * Close the server
   */
  close() {
    if (this.server) {
      const closePhase = this.tracer.getCurrentPhase();
      console.log(`[Server] Closing server in phase: ${closePhase}`);
      
      this.tracer.trackTCPOperation('server_close', {
        phase: closePhase,
        timestamp: performance.now()
      });
      
      this.server.close();
    }
  }
}

/**
 * TrackedClient wraps a TCP client with event loop phase tracking
 */
class TrackedClient {
  constructor(tracer) {
    this.tracer = tracer;
    this.socket = null;
    this.messageCount = 0;
    this.isConnected = false;
  }
  
  /**
   * Connect to server
   */
  async connect(port, host = 'localhost') {
    const connectPhase = this.tracer.getCurrentPhase();
    console.log(`[Client] Initiating connection in phase: ${connectPhase}`);
    
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.connect(port, host, () => {
        const connectedPhase = this.tracer.getCurrentPhase();
        this.isConnected = true;
        
        console.log(`[Client] Connected in phase: ${connectedPhase}`);
        
        this.tracer.trackTCPOperation('client_connect', {
          host,
          port,
          phase: connectedPhase,
          timestamp: performance.now()
        });
        
        resolve();
      });
      
      this.socket.on('data', (data) => {
        const dataPhase = this.tracer.getCurrentPhase();
        console.log(`[Client] Received data in phase: ${dataPhase}: ${data}`);
        
        this.tracer.trackTCPOperation('client_data_received', {
          dataLength: data.length,
          phase: dataPhase,
          timestamp: performance.now()
        });
      });
      
      this.socket.on('error', (err) => {
        console.log(`[Client] Socket error: ${err.message}`);
        reject(err);
      });
      
      this.socket.on('close', () => {
        const closePhase = this.tracer.getCurrentPhase();
        this.isConnected = false;
        
        console.log(`[Client] Connection closed in phase: ${closePhase}`);
        
        this.tracer.trackTCPOperation('client_close', {
          phase: closePhase,
          timestamp: performance.now()
        });
      });
    });
  }
  
  /**
   * Send data to server
   */
  send(data) {
    if (!this.isConnected || !this.socket) {
      console.log('[Client] Not connected, cannot send data');
      return;
    }
    
    const sendPhase = this.tracer.getCurrentPhase();
    const messageId = ++this.messageCount;
    
    console.log(`[Client] Sending message #${messageId} in phase: ${sendPhase}: ${data}`);
    
    this.tracer.trackTCPOperation('client_send', {
      messageId,
      dataLength: data.length,
      phase: sendPhase,
      timestamp: performance.now()
    });
    
    this.socket.write(data);
  }
  
  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      const disconnectPhase = this.tracer.getCurrentPhase();
      console.log(`[Client] Disconnecting in phase: ${disconnectPhase}`);
      
      this.tracer.trackTCPOperation('client_disconnect', {
        phase: disconnectPhase,
        timestamp: performance.now()
      });
      
      this.socket.destroy();
    }
  }
}

/**
 * Demo function to show event loop phase detection in action
 */
async function demo() {
  console.log('=== Event Loop Phase Detector Demo ===\n');
  
  const tracer = new EventLoopTracer();
  tracer.startTracking();
  
  // Allow tracer to stabilize
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const server = new TrackedServer(tracer);
  const client = new TrackedClient(tracer);
  
  try {
    // Scenario 1: Server startup - which phase?
    console.log('\n1. Starting server...');
    await new Promise(resolve => {
      server.listen(8081, resolve);
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Scenario 2: Client connection - which phase?
    console.log('\n2. Connecting client...');
    await client.connect(8081);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Scenario 3: Data exchange - which phases?
    console.log('\n3. Exchanging data...');
    client.send('Hello from client!');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Scenario 4: Rapid operations - phase transitions
    console.log('\n4. Testing rapid operations...');
    for (let i = 0; i < 5; i++) {
      client.send(`Rapid message ${i}`);
      await new Promise(resolve => setImmediate(resolve));
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Scenario 5: Mixed with other async operations
    console.log('\n5. Mixed async operations...');
    await demonstratePhaseLatency(tracer, client);
    
    // Show statistics
    console.log('\n=== Event Loop Phase Statistics ===');
    const stats = tracer.getStatistics();
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    // Clean up
    client.disconnect();
    server.close();
    tracer.stopTracking();
    
    console.log('\nDemo completed');
  }
}

/**
 * Create artificial load in different phases
 */
function createPhaseLoad() {
  console.log('Creating load across different phases...');
  
  // Timers phase load
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      // Simulate work in timers phase
      const start = performance.now();
      while (performance.now() - start < 1) {} // 1ms busy work
    }, i);
  }
  
  // Check phase load
  for (let i = 0; i < 10; i++) {
    setImmediate(() => {
      // Simulate work in check phase
      const start = performance.now();
      while (performance.now() - start < 1) {} // 1ms busy work
    });
  }
  
  // Microtask queue load
  for (let i = 0; i < 10; i++) {
    Promise.resolve().then(() => {
      // Simulate work in microtask queue
      const start = performance.now();
      while (performance.now() - start < 0.5) {} // 0.5ms busy work
    });
  }
}

/**
 * Demonstrate phase timing differences
 */
async function demonstratePhaseLatency(tracer, client) {
  console.log('\n=== Phase Latency Demonstration ===');
  
  const measurements = [];
  
  // Measure latency in different phases
  for (let i = 0; i < 5; i++) {
    const phase = tracer.getCurrentPhase();
    const start = performance.now();
    
    client.send(`Latency test ${i} in ${phase}`);
    
    // Create some load to see phase effects
    createPhaseLoad();
    
    const end = performance.now();
    const latency = end - start;
    
    measurements.push({
      iteration: i,
      phase,
      latency,
      timestamp: start
    });
    
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  console.log('Latency measurements:');
  measurements.forEach(m => {
    console.log(`  ${m.iteration}: ${m.latency.toFixed(2)}ms in ${m.phase} phase`);
  });
  
  const avgLatency = measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
  console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { EventLoopTracer, TrackedServer, TrackedClient };