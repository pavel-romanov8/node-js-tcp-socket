/**
 * Exercise 1: Connection Pool Monitor
 * 
 * Build a connection pool monitor that tracks the lifecycle of sockets and their internal handles.
 * This exercise helps you understand how Node.js manages TCP connections under the hood.
 * 
 * Learning objectives:
 * - Understand the difference between socket lifecycle and _handle lifecycle
 * - Learn the cost of creating new TCP connections vs reusing them
 * - Discover when Node.js actually allocates system resources
 * 
 * To run: node exercise-1-starter.js
 */

const net = require('net');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

/**
 * MonitoredSocket extends net.Socket to track connection lifecycle and metrics
 */
class MonitoredSocket extends net.Socket {
  constructor(options) {
    super(options);
    this.socketId = Math.random().toString(36).substr(2, 9);
    this.metrics = {
      created: performance.now(),
      handleCreated: null,
      connected: null,
      destroyed: null,
      bytesRead: 0,
      bytesWritten: 0,
      reuseCount: 0
    };
    
    console.log(`[Socket ${this.socketId}] Created at ${this.metrics.created.toFixed(2)}ms`);
    
    // TODO: Track when _handle is created
    // Hint: The _handle property is set when the socket is actually used
    // You can use Object.defineProperty or check periodically
    
    // TODO: Track connection establishment time
    // Hint: Listen for 'connect' event and record the timestamp
    
    // TODO: Monitor socket lifecycle events
    // Hint: Listen for 'close', 'error', 'data', 'drain' events
    
    // TODO: Track when the socket is destroyed
    // Hint: Override the destroy() method or listen for 'close' event
  }
  
  /**
   * TODO: Implement method to check if socket has an active handle
   * @returns {boolean} - true if socket has active handle
   */
  hasActiveHandle() {
    // TODO: Check if this.handle exists and is not null
    return false;
  }
  
  /**
   * TODO: Implement method to get current memory usage for this socket
   * @returns {object} - Memory usage information
   */
  getMemoryUsage() {
    // TODO: Return object with information about memory usage
    // Hint: You can use process.memoryUsage() and track per-socket metrics
    return {
      rss: 0,
      heapUsed: 0,
      socketBufferSize: 0
    };
  }
  
  /**
   * TODO: Override connect method to track connection attempts
   */
  connect(...args) {
    // TODO: Log connection attempt
    // TODO: Call parent connect method
    // TODO: Set up timing metrics
    return super.connect(...args);
  }
  
  /**
   * TODO: Override write method to track bytes written
   */
  write(data, encoding, callback) {
    // TODO: Update bytesWritten metric
    // TODO: Call parent write method
    return super.write(data, encoding, callback);
  }
  
  /**
   * Get comprehensive metrics for this socket
   * @returns {object} - Complete metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      hasHandle: this.hasActiveHandle(),
      memoryUsage: this.getMemoryUsage(),
      isConnected: this.readyState === 'open',
      age: performance.now() - this.metrics.created
    };
  }
}

/**
 * ConnectionPool manages a pool of reusable TCP connections
 */
class ConnectionPool extends EventEmitter {
  constructor(maxSockets = 5) {
    super();
    this.available = [];
    this.inUse = new Set();
    this.maxSockets = maxSockets;
    this.totalCreated = 0;
    this.totalReused = 0;
    this.metrics = {
      acquisitions: 0,
      releases: 0,
      timeouts: 0,
      failures: 0
    };
    
    console.log(`[Pool] Created with max size: ${maxSockets}`);
  }
  
  /**
   * TODO: Implement acquire() - get a socket from pool or create new one
   * @param {object} options - Connection options (host, port, etc.)
   * @returns {Promise<MonitoredSocket>} - Promise that resolves to a socket
   */
  async acquire(options) {
    this.metrics.acquisitions++;
    
    // TODO: Check if there's an available socket in the pool
    // TODO: If available, remove it from pool and add to inUse
    // TODO: If not available and under maxSockets, create new socket
    // TODO: If at maxSockets limit, wait for a socket to be released
    // TODO: Handle connection setup and return the socket
    
    // For now, just create a new socket (replace this with proper pool logic)
    const socket = new MonitoredSocket();
    this.inUse.add(socket);
    this.totalCreated++;
    
    console.log(`[Pool] Acquired socket. Created: ${this.totalCreated}, Reused: ${this.totalReused}`);
    return socket;
  }
  
  /**
   * TODO: Implement release() - return socket to pool for reuse
   * @param {MonitoredSocket} socket - Socket to release back to pool
   */
  release(socket) {
    this.metrics.releases++;
    
    // TODO: Remove socket from inUse set
    // TODO: Check if socket is still healthy/connected
    // TODO: If healthy and pool not full, add to available pool
    // TODO: If pool is full or socket unhealthy, destroy the socket
    // TODO: Emit 'socketReleased' event
    
    console.log(`[Pool] Released socket ${socket.socketId}`);
  }
  
  /**
   * TODO: Implement destroy() - cleanup all sockets and close pool
   */
  async destroy() {
    // TODO: Close all sockets in available pool
    // TODO: Close all sockets in inUse set
    // TODO: Clear all collections
    // TODO: Emit 'destroyed' event
    
    console.log('[Pool] Destroyed');
  }
  
  /**
   * Get comprehensive pool metrics
   * @returns {object} - Pool statistics
   */
  getMetrics() {
    return {
      ...this.metrics,
      available: this.available.length,
      inUse: this.inUse.size,
      totalCreated: this.totalCreated,
      totalReused: this.totalReused,
      maxSockets: this.maxSockets,
      reuseRate: this.totalReused / Math.max(this.totalCreated, 1)
    };
  }
  
  /**
   * TODO: Implement periodic cleanup of stale connections
   */
  startCleanupTimer() {
    // TODO: Set up interval to check for stale connections
    // TODO: Remove connections that have been idle too long
    // TODO: Check for connections that have lost their handles
  }
}

/**
 * Demo function to test the connection pool
 */
async function demo() {
  console.log('=== Connection Pool Monitor Demo ===\n');
  
  // Create a simple echo server for testing
  const server = net.createServer((socket) => {
    console.log(`[Server] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
      socket.write(`Echo: ${data}`);
    });
    
    socket.on('end', () => {
      console.log('[Server] Client disconnected');
    });
  });
  
  server.listen(8080, () => {
    console.log('[Server] Echo server listening on port 8080\n');
  });
  
  // Create connection pool
  const pool = new ConnectionPool(3);
  
  // TODO: Demonstrate the difference between creating new connections vs reusing them
  // TODO: Show metrics for each approach
  // TODO: Compare performance and resource usage
  
  // Example usage (expand this):
  try {
    const socket1 = await pool.acquire({ host: 'localhost', port: 8080 });
    console.log('Socket 1 metrics:', socket1.getMetrics());
    
    // TODO: Use the socket to send/receive data
    // TODO: Release the socket back to pool
    // TODO: Acquire it again and show reuse
    // TODO: Create multiple connections and show pool behavior
    
    console.log('\nPool metrics:', pool.getMetrics());
    
    // TODO: Cleanup
    await pool.destroy();
    server.close();
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { MonitoredSocket, ConnectionPool };