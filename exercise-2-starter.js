/**
 * Exercise 2: Event Loop Phase Detector
 * 
 * Create a tool that detects which event loop phase is processing your TCP events.
 * This reveals how Node.js schedules network I/O operations and helps understand
 * the relationship between libuv and the Node.js event loop.
 * 
 * Learning objectives:
 * - Understand how the poll phase handles network I/O
 * - Learn why TCP events might be delayed
 * - Discover the relationship between libuv and the Node.js event loop
 * - Track async operations through event loop phases
 * 
 * To run: node exercise-2-starter.js
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
    this.phases = new Map();
    this.currentPhase = 'unknown';
    this.operations = new Map();
    this.phaseHistory = [];
    this.isTracking = false;
    
    console.log('[Tracer] EventLoopTracer initialized');
  }
  
  /**
   * Start tracking event loop phases
   */
  startTracking() {
    this.isTracking = true;
    
    // TODO: Set up phase detection using different scheduling mechanisms
    // Hint: Use setTimeout for timers phase, setImmediate for check phase
    
    // TODO: Implement async_hooks to track TCP operations
    // You'll need to track init, before, after, and destroy events
    // Focus on tracking TCP handles and network operations
    
    // TODO: Create a mechanism to detect the current phase
    // You can use the timing of different schedulers to infer the current phase
    
    console.log('[Tracer] Started tracking event loop phases');
  }
  
  /**
   * Stop tracking event loop phases
   */
  stopTracking() {
    this.isTracking = false;
    
    // TODO: Clean up async_hooks and timers
    
    console.log('[Tracer] Stopped tracking event loop phases');
  }
  
  /**
   * TODO: Implement phase detection using scheduler timing
   * @param {string} phaseName - Name of the phase to detect
   * @param {function} scheduler - Scheduler function (setTimeout, setImmediate, etc.)
   */
  detectPhase(phaseName, scheduler) {
    // TODO: Use the scheduler to determine when this phase is active
    // You can measure timing differences between schedulers
    // Example: setImmediate executes in check phase, setTimeout in timers phase
  }
  
  /**
   * TODO: Track TCP operations and correlate with event loop phases
   * @param {string} operation - Operation type (connect, read, write, etc.)
   * @param {object} details - Operation details
   */
  trackTCPOperation(operation, details) {
    // TODO: Record the operation with current phase information
    // Include timing information and phase context
    
    console.log(`[Tracer] TCP Operation: ${operation} in phase: ${this.currentPhase}`);
  }
  
  /**
   * TODO: Get current event loop phase
   * @returns {string} - Current phase name
   */
  getCurrentPhase() {
    // TODO: Implement logic to determine current phase
    // You can use timing patterns or other heuristics
    
    return this.currentPhase;
  }
  
  /**
   * TODO: Get comprehensive tracking statistics
   * @returns {object} - Statistics about phase transitions and TCP operations
   */
  getStatistics() {
    // TODO: Return statistics about:
    // - How many operations occurred in each phase
    // - Average timing between phases
    // - TCP operation distribution across phases
    
    return {
      currentPhase: this.currentPhase,
      phaseHistory: this.phaseHistory,
      operations: Array.from(this.operations.values()),
      totalOperations: this.operations.size
    };
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
    
    // TODO: Create the actual server and instrument it with tracking
    // You should track:
    // - Server creation phase
    // - New connection events
    // - Data reception events
    // - Connection close events
  }
  
  /**
   * TODO: Start the server with tracking
   * @param {number} port - Port to listen on
   * @param {function} callback - Callback when server is ready
   */
  listen(port, callback) {
    // TODO: Create server and set up event handlers
    // Track which phase each server event occurs in
    
    console.log(`[Server] Starting server on port ${port}`);
  }
  
  /**
   * TODO: Close the server
   */
  close() {
    // TODO: Close server and clean up tracking
    
    console.log('[Server] Closing server');
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
    
    // TODO: Create the actual client socket and instrument it with tracking
  }
  
  /**
   * TODO: Connect to server
   * @param {number} port - Port to connect to
   * @param {string} host - Host to connect to
   * @returns {Promise} - Promise that resolves when connected
   */
  async connect(port, host = 'localhost') {
    // TODO: Create connection and track which phase it occurs in
    // Track connection establishment timing
    
    console.log(`[Client] Connecting to ${host}:${port}`);
  }
  
  /**
   * TODO: Send data to server
   * @param {string} data - Data to send
   */
  send(data) {
    // TODO: Send data and track which phase the write occurs in
    // Track write completion timing
    
    console.log(`[Client] Sending: ${data}`);
  }
  
  /**
   * TODO: Disconnect from server
   */
  disconnect() {
    // TODO: Close connection and track cleanup phase
    
    console.log('[Client] Disconnecting');
  }
}

/**
 * Demo function to show event loop phase detection in action
 */
async function demo() {
  console.log('=== Event Loop Phase Detector Demo ===\n');
  
  const tracer = new EventLoopTracer();
  tracer.startTracking();
  
  // TODO: Create server and client with tracking
  const server = new TrackedServer(tracer);
  const client = new TrackedClient(tracer);
  
  try {
    // TODO: Demonstrate phase detection with different scenarios:
    
    // Scenario 1: Server startup - which phase?
    console.log('1. Starting server...');
    // TODO: Start server and show which phase it starts in
    
    // Scenario 2: Client connection - which phase?
    console.log('2. Connecting client...');
    // TODO: Connect client and show connection phase
    
    // Scenario 3: Data exchange - which phases?
    console.log('3. Exchanging data...');
    // TODO: Send data back and forth, show read/write phases
    
    // Scenario 4: Rapid operations - phase transitions
    console.log('4. Testing rapid operations...');
    // TODO: Send multiple messages quickly, observe phase behavior
    
    // Scenario 5: Mixed with other async operations
    console.log('5. Mixed async operations...');
    // TODO: Mix TCP operations with timers, promises, etc.
    
    // Show final statistics
    console.log('\n=== Final Statistics ===');
    console.log(JSON.stringify(tracer.getStatistics(), null, 2));
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    // TODO: Clean up
    tracer.stopTracking();
    console.log('\nDemo completed');
  }
}

/**
 * TODO: Helper function to create artificial load in different phases
 * This helps demonstrate how different types of operations affect phase timing
 */
function createPhaseLoad() {
  // TODO: Create operations that will execute in different phases:
  // - setTimeout for timers phase
  // - setImmediate for check phase  
  // - Promise.resolve() for nextTick/microtask queue
  // - fs operations for I/O callbacks
  
  console.log('Creating load across different phases...');
}

/**
 * TODO: Helper function to demonstrate phase timing differences
 * Show how the same operation can have different latencies in different phases
 */
async function demonstratePhaseLatency() {
  console.log('\n=== Phase Latency Demonstration ===');
  
  // TODO: Measure operation latency in different phases
  // Compare TCP operations when event loop is in different states
  
  console.log('Latency demonstration completed');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { EventLoopTracer, TrackedServer, TrackedClient };