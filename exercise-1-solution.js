/**
 * Exercise 1: Connection Pool Monitor - SOLUTION
 * 
 * Complete implementation of a connection pool monitor that tracks socket lifecycle
 * and demonstrates the difference between socket creation and handle allocation.
 * 
 * Key concepts demonstrated:
 * - Socket vs handle lifecycle tracking
 * - Connection reuse vs creation performance
 * - Memory and resource management
 * - TCP connection state monitoring
 * 
 * To run: node exercise-1-solution.js
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
    
    // Track when _handle is created
    this._trackHandleCreation();
    
    // Track connection establishment time
    this.once('connect', () => {
      this.metrics.connected = performance.now();
      console.log(`[Socket ${this.socketId}] Connected at ${this.metrics.connected.toFixed(2)}ms (${(this.metrics.connected - this.metrics.created).toFixed(2)}ms after creation)`);
    });
    
    // Monitor socket lifecycle events
    this.on('close', (hadError) => {
      this.metrics.destroyed = performance.now();
      console.log(`[Socket ${this.socketId}] Closed${hadError ? ' with error' : ''} at ${this.metrics.destroyed.toFixed(2)}ms`);
    });
    
    this.on('error', (err) => {
      console.log(`[Socket ${this.socketId}] Error: ${err.message}`);
    });
    
    this.on('data', (data) => {
      this.metrics.bytesRead += data.length;
    });
    
    this.on('drain', () => {
      console.log(`[Socket ${this.socketId}] Drain event - can write again`);
    });
    
    // Track when the socket is destroyed
    const originalDestroy = this.destroy.bind(this);
    this.destroy = (...args) => {
      if (!this.destroyed) {
        console.log(`[Socket ${this.socketId}] Destroying socket`);
      }
      return originalDestroy(...args);
    };
  }
  
  /**
   * Track when the internal handle is created
   * The handle is the actual system resource that manages the TCP connection
   */
  _trackHandleCreation() {
    // Watch for _handle property being set
    let handle = this._handle;
    const checkHandle = () => {
      if (this._handle && !handle) {
        handle = this._handle;
        this.metrics.handleCreated = performance.now();
        console.log(`[Socket ${this.socketId}] Handle created at ${this.metrics.handleCreated.toFixed(2)}ms`);
      }
      if (!this.destroyed) {
        setImmediate(checkHandle);
      }
    };
    checkHandle();
  }
  
  /**
   * Check if socket has an active handle
   * @returns {boolean} - true if socket has active handle
   */
  hasActiveHandle() {
    return this._handle && !this._handle.destroyed;
  }
  
  /**
   * Get current memory usage for this socket
   * @returns {object} - Memory usage information
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      socketBufferSize: this.readableLength + this.writableLength,
      hasHandle: this.hasActiveHandle()
    };
  }
  
  /**
   * Override connect method to track connection attempts
   */
  connect(...args) {
    console.log(`[Socket ${this.socketId}] Attempting to connect...`);
    const startTime = performance.now();
    
    // Set up timing metrics
    this.once('connect', () => {
      const connectTime = performance.now() - startTime;
      console.log(`[Socket ${this.socketId}] Connection established in ${connectTime.toFixed(2)}ms`);
    });
    
    this.once('error', (err) => {
      const errorTime = performance.now() - startTime;
      console.log(`[Socket ${this.socketId}] Connection failed after ${errorTime.toFixed(2)}ms: ${err.message}`);
    });
    
    return super.connect(...args);
  }
  
  /**
   * Override write method to track bytes written
   */
  write(data, encoding, callback) {
    const dataLength = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, encoding);
    this.metrics.bytesWritten += dataLength;
    
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
      age: performance.now() - this.metrics.created,
      state: this.readyState
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
    
    // Start cleanup timer
    this.startCleanupTimer();
  }
  
  /**
   * Acquire a socket from pool or create new one
   * @param {object} options - Connection options (host, port, etc.)
   * @returns {Promise<MonitoredSocket>} - Promise that resolves to a socket
   */
  async acquire(options) {
    this.metrics.acquisitions++;
    
    // Check if there's an available socket in the pool
    if (this.available.length > 0) {
      const socket = this.available.pop();
      this.inUse.add(socket);
      socket.metrics.reuseCount++;
      this.totalReused++;
      
      console.log(`[Pool] Reused socket ${socket.socketId}. Total reused: ${this.totalReused}`);
      this.emit('socketReused', socket);
      return socket;
    }
    
    // If not available and under maxSockets, create new socket
    if (this.inUse.size < this.maxSockets) {
      const socket = new MonitoredSocket();
      this.inUse.add(socket);
      this.totalCreated++;
      
      try {
        await this._connectSocket(socket, options);
        console.log(`[Pool] Created new socket ${socket.socketId}. Total created: ${this.totalCreated}`);
        this.emit('socketCreated', socket);
        return socket;
      } catch (error) {
        this.inUse.delete(socket);
        this.metrics.failures++;
        throw error;
      }
    }
    
    // If at maxSockets limit, wait for a socket to be released
    console.log(`[Pool] Waiting for socket to be released...`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.metrics.timeouts++;
        reject(new Error('Timeout waiting for socket'));
      }, 5000);
      
      this.once('socketReleased', () => {
        clearTimeout(timeout);
        this.acquire(options).then(resolve).catch(reject);
      });
    });
  }
  
  /**
   * Helper method to connect a socket
   */
  _connectSocket(socket, options) {
    return new Promise((resolve, reject) => {
      const { host = 'localhost', port = 80, ...otherOptions } = options;
      
      socket.connect(port, host, otherOptions, () => {
        resolve(socket);
      });
      
      socket.once('error', reject);
    });
  }
  
  /**
   * Release socket back to pool for reuse
   * @param {MonitoredSocket} socket - Socket to release back to pool
   */
  release(socket) {
    this.metrics.releases++;
    
    // Remove socket from inUse set
    if (!this.inUse.has(socket)) {
      console.log(`[Pool] Warning: Releasing socket ${socket.socketId} that wasn't in use`);
      return;
    }
    
    this.inUse.delete(socket);
    
    // Check if socket is still healthy/connected
    if (this._isSocketHealthy(socket)) {
      // If pool not full, add to available pool
      if (this.available.length < this.maxSockets) {
        this.available.push(socket);
        console.log(`[Pool] Released healthy socket ${socket.socketId} to pool`);
        this.emit('socketReleased', socket);
        return;
      }
    }
    
    // If pool is full or socket unhealthy, destroy the socket
    console.log(`[Pool] Destroying socket ${socket.socketId} (${this._isSocketHealthy(socket) ? 'pool full' : 'unhealthy'})`);
    socket.destroy();
    this.emit('socketDestroyed', socket);
  }
  
  /**
   * Check if socket is healthy and can be reused
   */
  _isSocketHealthy(socket) {
    return socket.readyState === 'open' && 
           socket.hasActiveHandle() && 
           !socket.destroyed &&
           !socket.pending;
  }
  
  /**
   * Cleanup all sockets and close pool
   */
  async destroy() {
    console.log('[Pool] Destroying connection pool...');
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Close all sockets in available pool
    for (const socket of this.available) {
      socket.destroy();
    }
    this.available.length = 0;
    
    // Close all sockets in inUse set
    for (const socket of this.inUse) {
      socket.destroy();
    }
    this.inUse.clear();
    
    console.log('[Pool] All sockets destroyed');
    this.emit('destroyed');
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
      reuseRate: this.totalReused / Math.max(this.totalCreated, 1),
      efficiency: (this.totalReused / Math.max(this.metrics.acquisitions, 1)) * 100
    };
  }
  
  /**
   * Periodic cleanup of stale connections
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = performance.now();
      let cleaned = 0;
      
      // Remove stale connections from available pool
      this.available = this.available.filter(socket => {
        const isStale = !this._isSocketHealthy(socket) || 
                       (now - socket.metrics.created) > 300000; // 5 minutes
        
        if (isStale) {
          console.log(`[Pool] Cleaning up stale socket ${socket.socketId}`);
          socket.destroy();
          cleaned++;
          return false;
        }
        return true;
      });
      
      if (cleaned > 0) {
        console.log(`[Pool] Cleaned up ${cleaned} stale connections`);
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * Demo function to test the connection pool and show performance differences
 */
async function demo() {
  console.log('=== Connection Pool Monitor Demo ===\n');
  
  // Create a simple echo server for testing
  const server = net.createServer((socket) => {
    console.log(`[Server] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
      // Echo back with some processing delay
      setTimeout(() => {
        socket.write(`Echo: ${data}`);
      }, 10);
    });
    
    socket.on('end', () => {
      console.log('[Server] Client disconnected');
    });
    
    socket.on('error', (err) => {
      console.log(`[Server] Socket error: ${err.message}`);
    });
  });
  
  await new Promise(resolve => {
    server.listen(8080, () => {
      console.log('[Server] Echo server listening on port 8080\n');
      resolve();
    });
  });
  
  // Create connection pool
  const pool = new ConnectionPool(3);
  
  try {
    console.log('--- Testing Connection Pool Performance ---\n');
    
    // Test 1: Create and use multiple connections
    console.log('1. Creating multiple connections...');
    const connections = [];
    
    for (let i = 0; i < 5; i++) {
      const socket = await pool.acquire({ host: 'localhost', port: 8080 });
      connections.push(socket);
      
      // Send test data
      socket.write(`Test message ${i}`);
      
      // Show socket metrics
      console.log(`   Socket ${socket.socketId} metrics:`, JSON.stringify(socket.getMetrics(), null, 2));
    }
    
    console.log('\n2. Pool state after acquisitions:');
    console.log('   Pool metrics:', JSON.stringify(pool.getMetrics(), null, 2));
    
    // Test 2: Release and reuse connections
    console.log('\n3. Releasing connections...');
    for (const socket of connections) {
      pool.release(socket);
    }
    
    console.log('\n4. Pool state after releases:');
    console.log('   Pool metrics:', JSON.stringify(pool.getMetrics(), null, 2));
    
    // Test 3: Acquire again to show reuse
    console.log('\n5. Acquiring again to demonstrate reuse...');
    const reusedConnections = [];
    
    for (let i = 0; i < 3; i++) {
      const socket = await pool.acquire({ host: 'localhost', port: 8080 });
      reusedConnections.push(socket);
      
      socket.write(`Reused message ${i}`);
      console.log(`   Reused socket ${socket.socketId}, reuse count: ${socket.metrics.reuseCount}`);
    }
    
    console.log('\n6. Final pool metrics:');
    console.log('   Pool metrics:', JSON.stringify(pool.getMetrics(), null, 2));
    
    // Test 4: Performance comparison
    console.log('\n--- Performance Comparison ---');
    await performanceTest(pool);
    
    // Cleanup
    for (const socket of reusedConnections) {
      pool.release(socket);
    }
    
    await pool.destroy();
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    server.close();
  }
}

/**
 * Performance test comparing new connections vs pooled connections
 */
async function performanceTest(pool) {
  const iterations = 10;
  
  // Test new connections
  console.log('Testing new connections...');
  const newConnStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const socket = new MonitoredSocket();
    await new Promise((resolve, reject) => {
      socket.connect(8080, 'localhost', resolve);
      socket.once('error', reject);
    });
    socket.write('test');
    socket.destroy();
  }
  
  const newConnTime = performance.now() - newConnStart;
  
  // Test pooled connections
  console.log('Testing pooled connections...');
  const poolStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const socket = await pool.acquire({ host: 'localhost', port: 8080 });
    socket.write('test');
    pool.release(socket);
  }
  
  const poolTime = performance.now() - poolStart;
  
  console.log(`\nPerformance Results (${iterations} iterations):`);
  console.log(`  New connections: ${newConnTime.toFixed(2)}ms`);
  console.log(`  Pooled connections: ${poolTime.toFixed(2)}ms`);
  console.log(`  Speed improvement: ${((newConnTime - poolTime) / newConnTime * 100).toFixed(1)}%`);
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { MonitoredSocket, ConnectionPool };