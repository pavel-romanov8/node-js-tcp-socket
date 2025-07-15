/**
 * Exercise 3: TCP Backpressure Visualizer
 * 
 * Build a tool that visualizes TCP backpressure in real-time, showing how Node.js 
 * streams interact with kernel buffers and demonstrating flow control mechanisms.
 * 
 * Learning objectives:
 * - Understand how Node.js streams interact with TCP send buffers
 * - Learn when and why backpressure occurs
 * - See the relationship between application-level and kernel-level buffering
 * - Learn how to handle high-throughput scenarios properly
 * 
 * To run: node exercise-3-starter.js
 */

const net = require('net');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

/**
 * BackpressureMonitor tracks and visualizes TCP backpressure in real-time
 */
class BackpressureMonitor extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.stats = {
      writeAttempts: 0,
      backpressureEvents: 0,
      maxBufferSize: 0,
      drainEvents: 0,
      totalBytesWritten: 0,
      totalBytesRead: 0,
      writeFailures: 0
    };
    
    this.bufferHistory = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    console.log(`[Monitor] BackpressureMonitor created for socket`);
  }
  
  /**
   * Start monitoring the socket for backpressure
   */
  startMonitoring() {
    this.isMonitoring = true;
    
    // TODO: Override the socket's write method to track backpressure
    // You need to:
    // 1. Save the original write method
    // 2. Create a new write method that tracks stats
    // 3. Check the return value of write() - false indicates backpressure
    // 4. Update buffer size metrics
    
    // TODO: Track drain events
    // Drain events indicate that the socket is ready to accept more data
    // Listen for 'drain' event and update stats
    
    // TODO: Set up periodic buffer monitoring
    // Create an interval that records buffer states for visualization
    
    // TODO: Track other relevant socket events (error, close, etc.)
    
    console.log('[Monitor] Started monitoring for backpressure');
  }
  
  /**
   * Stop monitoring the socket
   */
  stopMonitoring() {
    this.isMonitoring = false;
    
    // TODO: Clean up intervals and restore original methods
    
    console.log('[Monitor] Stopped monitoring');
  }
  
  /**
   * TODO: Record current buffer state for history tracking
   */
  recordBufferState() {
    // TODO: Capture current buffer metrics:
    // - socket.writableLength (Node.js internal buffer)
    // - socket.writableHighWaterMark (buffer limit)
    // - socket.bufferSize (if available)
    // - Current timestamp
    
    const state = {
      timestamp: performance.now(),
      writableLength: 0, // TODO: Get from socket
      writableHighWaterMark: 0, // TODO: Get from socket
      bufferUtilization: 0, // TODO: Calculate percentage
      backpressureActive: false // TODO: Determine if backpressure is active
    };
    
    this.bufferHistory.push(state);
    
    // Keep only recent history (last 100 entries)
    if (this.bufferHistory.length > 100) {
      this.bufferHistory.shift();
    }
    
    return state;
  }
  
  /**
   * TODO: Check if socket is currently experiencing backpressure
   * @returns {boolean} - true if backpressure is active
   */
  isBackpressureActive() {
    // TODO: Determine if backpressure is currently active
    // Check writableLength vs writableHighWaterMark
    // Or check if recent writes returned false
    
    return false;
  }
  
  /**
   * TODO: Get current buffer utilization as percentage
   * @returns {number} - Buffer utilization percentage (0-100)
   */
  getBufferUtilization() {
    // TODO: Calculate buffer utilization percentage
    // writableLength / writableHighWaterMark * 100
    
    return 0;
  }
  
  /**
   * Create ASCII visualization of buffer state
   * @param {number} width - Width of the visualization bar
   * @returns {string} - ASCII visualization
   */
  visualize(width = 50) {
    const utilization = this.getBufferUtilization();
    const filled = Math.floor((utilization / 100) * width);
    const empty = width - filled;
    
    // TODO: Create a more sophisticated visualization
    // Show different colors/chars for different buffer states
    // Include numeric information
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentage = utilization.toFixed(1);
    
    return `[${bar}] Buffer: ${percentage}% (Backpressure: ${this.isBackpressureActive() ? 'YES' : 'NO'})`;
  }
  
  /**
   * TODO: Create a real-time dashboard showing buffer states
   */
  displayDashboard() {
    // TODO: Clear console and display current state
    // Show:
    // - Current buffer visualization
    // - Statistics (writes, drains, backpressure events)
    // - Recent buffer history
    // - Write/read rates
    
    console.log('\n=== TCP Backpressure Dashboard ===');
    console.log(this.visualize());
    console.log(`Stats: ${JSON.stringify(this.stats, null, 2)}`);
  }
  
  /**
   * TODO: Simulate backpressure by writing large amounts of data
   * @param {number} chunkSize - Size of each data chunk
   * @param {number} chunks - Number of chunks to write
   */
  async simulateBackpressure(chunkSize = 1024 * 64, chunks = 100) {
    // TODO: Generate and write data to trigger backpressure
    // Track how the socket responds
    // Wait for drain events between writes if needed
    
    console.log(`[Monitor] Simulating backpressure with ${chunks} chunks of ${chunkSize} bytes`);
  }
  
  /**
   * Get comprehensive monitoring statistics
   * @returns {object} - Complete statistics object
   */
  getStats() {
    return {
      ...this.stats,
      currentBufferState: this.recordBufferState(),
      backpressureActive: this.isBackpressureActive(),
      bufferUtilization: this.getBufferUtilization(),
      bufferHistory: this.bufferHistory.slice(-10) // Last 10 entries
    };
  }
}

/**
 * SlowServer simulates a server that processes data slowly to create backpressure
 */
class SlowServer {
  constructor(port, processingDelay = 100) {
    this.port = port;
    this.processingDelay = processingDelay;
    this.server = null;
    this.connections = new Map();
    this.connectionCount = 0;
    
    // TODO: Create the server with slow processing
    // Each incoming data chunk should be processed with a delay
    // This will help demonstrate backpressure scenarios
  }
  
  /**
   * TODO: Start the slow server
   */
  start() {
    // TODO: Create server that:
    // 1. Accepts connections
    // 2. Processes incoming data slowly (with delay)
    // 3. Sends responses back
    // 4. Tracks connection states
    
    console.log(`[SlowServer] Starting server on port ${this.port} with ${this.processingDelay}ms delay`);
  }
  
  /**
   * TODO: Stop the server
   */
  stop() {
    // TODO: Close server and all connections
    
    console.log('[SlowServer] Stopping server');
  }
  
  /**
   * TODO: Set processing delay to simulate different server speeds
   * @param {number} delay - Processing delay in milliseconds
   */
  setProcessingDelay(delay) {
    this.processingDelay = delay;
    console.log(`[SlowServer] Processing delay set to ${delay}ms`);
  }
}

/**
 * DataGenerator creates data streams at various rates to test backpressure
 */
class DataGenerator {
  constructor() {
    this.isGenerating = false;
    this.generatedBytes = 0;
    this.generationRate = 1024; // bytes per interval
    this.interval = null;
  }
  
  /**
   * TODO: Start generating data at specified rate
   * @param {net.Socket} socket - Socket to write data to
   * @param {number} bytesPerSecond - Data generation rate
   */
  start(socket, bytesPerSecond = 1024 * 1024) {
    // TODO: Generate data at the specified rate
    // Monitor if writes are successful or if backpressure occurs
    // Adjust generation rate based on socket feedback
    
    this.isGenerating = true;
    console.log(`[DataGenerator] Starting data generation at ${bytesPerSecond} bytes/second`);
  }
  
  /**
   * TODO: Stop data generation
   */
  stop() {
    this.isGenerating = false;
    
    // TODO: Clear intervals and clean up
    
    console.log('[DataGenerator] Stopped data generation');
  }
  
  /**
   * TODO: Generate test data of specified size
   * @param {number} size - Size of data to generate
   * @returns {Buffer} - Generated data
   */
  generateData(size) {
    // TODO: Create test data
    // You can use random data, repeated patterns, or structured data
    
    return Buffer.alloc(size, 'A'); // Simple implementation
  }
  
  /**
   * TODO: Adjust generation rate based on backpressure feedback
   * @param {boolean} backpressureDetected - Whether backpressure was detected
   */
  adjustRate(backpressureDetected) {
    // TODO: Implement adaptive rate adjustment
    // Slow down when backpressure is detected
    // Speed up when socket is ready for more data
    
    if (backpressureDetected) {
      console.log('[DataGenerator] Backpressure detected, slowing down');
    }
  }
}

/**
 * Demo function to demonstrate TCP backpressure visualization
 */
async function demo() {
  console.log('=== TCP Backpressure Visualizer Demo ===\n');
  
  const server = new SlowServer(8082, 50); // 50ms processing delay
  const generator = new DataGenerator();
  
  // TODO: Start the slow server
  
  // TODO: Create client connection
  
  // TODO: Set up backpressure monitoring
  
  try {
    console.log('1. Starting slow server...');
    // TODO: Start server
    
    console.log('2. Connecting client...');
    // TODO: Create client connection
    
    console.log('3. Setting up backpressure monitoring...');
    // TODO: Create monitor and start monitoring
    
    console.log('4. Testing normal data flow...');
    // TODO: Send small amounts of data at normal rate
    
    console.log('5. Simulating backpressure scenario...');
    // TODO: Generate large amounts of data quickly to trigger backpressure
    
    console.log('6. Demonstrating flow control...');
    // TODO: Show how to properly handle backpressure with drain events
    
    console.log('7. Performance comparison...');
    // TODO: Compare performance with and without proper backpressure handling
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    // TODO: Clean up resources
    console.log('\nDemo completed');
  }
}

/**
 * TODO: Helper function to demonstrate proper backpressure handling
 * Shows the correct way to handle write() return values and drain events
 */
async function demonstrateProperFlowControl() {
  console.log('\n=== Proper Flow Control Example ===');
  
  // TODO: Create example that shows:
  // 1. Checking write() return value
  // 2. Waiting for drain event when write returns false
  // 3. Resuming writes after drain
  // 4. Comparing this approach with naive continuous writing
  
  console.log('Flow control demonstration completed');
}

/**
 * TODO: Helper function to create different backpressure scenarios
 * Tests various combinations of data rates and server speeds
 */
async function testBackpressureScenarios() {
  console.log('\n=== Backpressure Scenarios ===');
  
  // TODO: Test different scenarios:
  // 1. Slow server + fast client
  // 2. Fast server + very fast client
  // 3. Variable data rates
  // 4. Large chunks vs small chunks
  
  console.log('Backpressure scenarios testing completed');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { BackpressureMonitor, SlowServer, DataGenerator };