/**
 * Exercise 3: TCP Backpressure Visualizer - SOLUTION
 * 
 * Complete implementation of a TCP backpressure visualizer that demonstrates
 * flow control mechanisms and proper handling of high-throughput scenarios.
 * 
 * Key concepts demonstrated:
 * - Real-time monitoring of TCP buffer states
 * - Detection and visualization of backpressure events
 * - Proper flow control with drain events
 * - Performance comparison of different approaches
 * 
 * To run: node exercise-3-solution.js
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
      writeFailures: 0,
      avgWriteTime: 0
    };
    
    this.bufferHistory = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.originalWrite = null;
    this.dashboardInterval = null;
    this.writeTimings = [];
    
    console.log(`[Monitor] BackpressureMonitor created for socket`);
  }
  
  /**
   * Start monitoring the socket for backpressure
   */
  startMonitoring() {
    this.isMonitoring = true;
    
    // Override the socket's write method to track backpressure
    this.originalWrite = this.socket.write.bind(this.socket);
    this.socket.write = (...args) => {
      const startTime = performance.now();
      this.stats.writeAttempts++;
      
      // Get data size for statistics
      const data = args[0];
      const dataSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, args[1] || 'utf8');
      this.stats.totalBytesWritten += dataSize;
      
      // Call original write and check return value
      const canWriteMore = this.originalWrite(...args);
      
      const writeTime = performance.now() - startTime;
      this.writeTimings.push(writeTime);
      
      // Calculate average write time (keep last 100 measurements)
      if (this.writeTimings.length > 100) {
        this.writeTimings.shift();
      }
      this.stats.avgWriteTime = this.writeTimings.reduce((a, b) => a + b, 0) / this.writeTimings.length;
      
      // Check for backpressure
      if (!canWriteMore) {
        this.stats.backpressureEvents++;
        console.log(`[Monitor] Backpressure detected! Buffer: ${this.socket.writableLength}/${this.socket.writableHighWaterMark}`);
        this.emit('backpressure', {
          bufferSize: this.socket.writableLength,
          highWaterMark: this.socket.writableHighWaterMark,
          timestamp: performance.now()
        });
      }
      
      // Update max buffer size
      this.stats.maxBufferSize = Math.max(this.stats.maxBufferSize, this.socket.writableLength);
      
      return canWriteMore;
    };
    
    // Track drain events
    this.socket.on('drain', () => {
      this.stats.drainEvents++;
      console.log(`[Monitor] Drain event - socket ready for more data`);
      this.emit('drain', {
        bufferSize: this.socket.writableLength,
        timestamp: performance.now()
      });
    });
    
    // Track data events for read statistics
    this.socket.on('data', (data) => {
      this.stats.totalBytesRead += data.length;
    });
    
    // Track socket errors and close events
    this.socket.on('error', (err) => {
      console.log(`[Monitor] Socket error: ${err.message}`);
      this.stats.writeFailures++;
    });
    
    this.socket.on('close', () => {
      console.log(`[Monitor] Socket closed`);
      this.stopMonitoring();
    });
    
    // Set up periodic buffer monitoring
    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.recordBufferState();
      }
    }, 100); // Record every 100ms
    
    // Start dashboard updates
    this.startDashboard();
    
    console.log('[Monitor] Started monitoring for backpressure');
  }
  
  /**
   * Stop monitoring the socket
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Restore original write method
    if (this.originalWrite) {
      this.socket.write = this.originalWrite;
    }
    
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }
    
    console.log('[Monitor] Stopped monitoring');
  }
  
  /**
   * Record current buffer state for history tracking
   */
  recordBufferState() {
    const writableLength = this.socket.writableLength || 0;
    const highWaterMark = this.socket.writableHighWaterMark || 16384;
    const utilization = (writableLength / highWaterMark) * 100;
    
    const state = {
      timestamp: performance.now(),
      writableLength,
      writableHighWaterMark: highWaterMark,
      bufferUtilization: utilization,
      backpressureActive: this.isBackpressureActive(),
      pending: this.socket.pending || false,
      readyState: this.socket.readyState
    };
    
    this.bufferHistory.push(state);
    
    // Keep only recent history (last 100 entries)
    if (this.bufferHistory.length > 100) {
      this.bufferHistory.shift();
    }
    
    return state;
  }
  
  /**
   * Check if socket is currently experiencing backpressure
   */
  isBackpressureActive() {
    if (!this.socket || this.socket.destroyed) return false;
    
    const writableLength = this.socket.writableLength || 0;
    const highWaterMark = this.socket.writableHighWaterMark || 16384;
    
    // Backpressure is active when buffer is near or at capacity
    return writableLength >= highWaterMark * 0.8; // 80% threshold
  }
  
  /**
   * Get current buffer utilization as percentage
   */
  getBufferUtilization() {
    if (!this.socket || this.socket.destroyed) return 0;
    
    const writableLength = this.socket.writableLength || 0;
    const highWaterMark = this.socket.writableHighWaterMark || 16384;
    
    return (writableLength / highWaterMark) * 100;
  }
  
  /**
   * Create ASCII visualization of buffer state
   */
  visualize(width = 50) {
    const utilization = this.getBufferUtilization();
    const filled = Math.floor((utilization / 100) * width);
    const empty = width - filled;
    
    // Different visualization for different states
    let fillChar = '█';
    let emptyChar = '░';
    
    if (this.isBackpressureActive()) {
      fillChar = '▓'; // Different pattern for backpressure
    } else if (utilization > 50) {
      fillChar = '▒'; // Warning level
    }
    
    const bar = fillChar.repeat(filled) + emptyChar.repeat(empty);
    const percentage = utilization.toFixed(1);
    const bytes = this.socket.writableLength || 0;
    const maxBytes = this.socket.writableHighWaterMark || 16384;
    
    return `[${bar}] ${percentage}% (${bytes}/${maxBytes} bytes) ${this.isBackpressureActive() ? '⚠️  BACKPRESSURE' : '✅ OK'}`;
  }
  
  /**
   * Start real-time dashboard updates
   */
  startDashboard() {
    this.dashboardInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.displayDashboard();
      }
    }, 1000); // Update every second
  }
  
  /**
   * Display real-time dashboard
   */
  displayDashboard() {
    // Clear console (works in most terminals)
    process.stdout.write('\x1Bc');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('               TCP BACKPRESSURE DASHBOARD');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();
    
    // Buffer visualization
    console.log('Buffer State:');
    console.log(this.visualize(60));
    console.log();
    
    // Statistics
    console.log('Statistics:');
    console.log(`  Write attempts:      ${this.stats.writeAttempts.toLocaleString()}`);
    console.log(`  Backpressure events: ${this.stats.backpressureEvents.toLocaleString()}`);
    console.log(`  Drain events:        ${this.stats.drainEvents.toLocaleString()}`);
    console.log(`  Bytes written:       ${(this.stats.totalBytesWritten / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Bytes read:          ${(this.stats.totalBytesRead / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Max buffer size:     ${this.stats.maxBufferSize.toLocaleString()} bytes`);
    console.log(`  Avg write time:      ${this.stats.avgWriteTime.toFixed(3)}ms`);
    console.log();
    
    // Rates
    const runtime = (performance.now() - (this.bufferHistory[0]?.timestamp || performance.now())) / 1000;
    const writeRate = this.stats.totalBytesWritten / runtime / 1024; // KB/s
    const readRate = this.stats.totalBytesRead / runtime / 1024; // KB/s
    
    console.log('Throughput:');
    console.log(`  Write rate:          ${writeRate.toFixed(2)} KB/s`);
    console.log(`  Read rate:           ${readRate.toFixed(2)} KB/s`);
    console.log(`  Backpressure ratio:  ${((this.stats.backpressureEvents / Math.max(this.stats.writeAttempts, 1)) * 100).toFixed(2)}%`);
    console.log();
    
    // Buffer history (mini chart)
    console.log('Buffer History (last 20 samples):');
    this.displayMiniChart();
    console.log();
    
    console.log('Legend: █ Normal  ▒ High  ▓ Backpressure  ░ Empty');
    console.log('═══════════════════════════════════════════════════════════');
  }
  
  /**
   * Display mini chart of buffer utilization
   */
  displayMiniChart() {
    const recent = this.bufferHistory.slice(-20);
    if (recent.length === 0) return;
    
    const maxUtil = Math.max(...recent.map(s => s.bufferUtilization));
    const height = 10;
    
    for (let level = height; level > 0; level--) {
      let line = `${(level * 10).toString().padStart(3)}% `;
      
      for (const state of recent) {
        const normalizedHeight = (state.bufferUtilization / Math.max(maxUtil, 100)) * height;
        if (normalizedHeight >= level) {
          line += state.backpressureActive ? '▓' : '█';
        } else {
          line += ' ';
        }
      }
      
      console.log(line);
    }
    
    console.log('     ' + '─'.repeat(recent.length));
  }
  
  /**
   * Simulate backpressure by writing large amounts of data
   */
  async simulateBackpressure(chunkSize = 1024 * 64, chunks = 100) {
    console.log(`[Monitor] Simulating backpressure with ${chunks} chunks of ${chunkSize} bytes`);
    
    const data = Buffer.alloc(chunkSize, 'X');
    let writtenChunks = 0;
    
    const writeChunk = () => {
      if (writtenChunks >= chunks) {
        console.log('[Monitor] Backpressure simulation completed');
        return;
      }
      
      const canWrite = this.socket.write(data);
      writtenChunks++;
      
      if (canWrite) {
        // Can write more immediately
        setImmediate(writeChunk);
      } else {
        // Wait for drain event
        console.log(`[Monitor] Waiting for drain after chunk ${writtenChunks}`);
        this.socket.once('drain', () => {
          setImmediate(writeChunk);
        });
      }
    };
    
    writeChunk();
  }
  
  /**
   * Get comprehensive monitoring statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentBufferState: this.recordBufferState(),
      backpressureActive: this.isBackpressureActive(),
      bufferUtilization: this.getBufferUtilization(),
      bufferHistory: this.bufferHistory.slice(-10),
      efficiency: {
        backpressureRatio: (this.stats.backpressureEvents / Math.max(this.stats.writeAttempts, 1)) * 100,
        drainRatio: (this.stats.drainEvents / Math.max(this.stats.backpressureEvents, 1)),
        avgWriteTime: this.stats.avgWriteTime
      }
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
    this.totalProcessed = 0;
  }
  
  /**
   * Start the slow server
   */
  start() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        const connectionId = ++this.connectionCount;
        console.log(`[SlowServer] New connection #${connectionId}`);
        
        this.connections.set(connectionId, {
          socket,
          processed: 0,
          startTime: performance.now()
        });
        
        socket.on('data', async (data) => {
          // Simulate slow processing
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
          
          const connection = this.connections.get(connectionId);
          if (connection) {
            connection.processed += data.length;
            this.totalProcessed += data.length;
          }
          
          // Send acknowledgment back (small response to avoid affecting client buffer)
          socket.write(`ACK-${data.length}`);
        });
        
        socket.on('end', () => {
          console.log(`[SlowServer] Connection #${connectionId} ended`);
          this.connections.delete(connectionId);
        });
        
        socket.on('error', (err) => {
          console.log(`[SlowServer] Connection #${connectionId} error: ${err.message}`);
          this.connections.delete(connectionId);
        });
      });
      
      this.server.listen(this.port, () => {
        console.log(`[SlowServer] Server listening on port ${this.port} with ${this.processingDelay}ms delay`);
        resolve();
      });
    });
  }
  
  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('[SlowServer] Server stopped');
      console.log(`[SlowServer] Total processed: ${(this.totalProcessed / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  
  /**
   * Set processing delay to simulate different server speeds
   */
  setProcessingDelay(delay) {
    this.processingDelay = delay;
    console.log(`[SlowServer] Processing delay set to ${delay}ms`);
  }
  
  /**
   * Get server statistics
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      totalProcessed: this.totalProcessed,
      processingDelay: this.processingDelay,
      connections: Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        processed: conn.processed,
        duration: performance.now() - conn.startTime
      }))
    };
  }
}

/**
 * DataGenerator creates data streams at various rates to test backpressure
 */
class DataGenerator {
  constructor() {
    this.isGenerating = false;
    this.generatedBytes = 0;
    this.generationRate = 1024;
    this.interval = null;
    this.adaptiveMode = false;
    this.currentRate = 1024;
    this.monitor = null;
  }
  
  /**
   * Start generating data at specified rate
   */
  start(socket, bytesPerSecond = 1024 * 1024, adaptive = false) {
    this.isGenerating = true;
    this.generationRate = bytesPerSecond;
    this.currentRate = bytesPerSecond;
    this.adaptiveMode = adaptive;
    
    // If adaptive mode and monitor available, adjust rate based on backpressure
    if (adaptive && socket._backpressureMonitor) {
      this.monitor = socket._backpressureMonitor;
      this.monitor.on('backpressure', () => this.adjustRate(true));
      this.monitor.on('drain', () => this.adjustRate(false));
    }
    
    console.log(`[DataGenerator] Starting ${adaptive ? 'adaptive ' : ''}data generation at ${bytesPerSecond} bytes/second`);
    
    const chunkSize = 1024; // 1KB chunks
    const intervalMs = (chunkSize / this.currentRate) * 1000;
    
    const generateData = () => {
      if (!this.isGenerating) return;
      
      const data = this.generateData(chunkSize);
      const canWrite = socket.write(data);
      this.generatedBytes += chunkSize;
      
      if (!canWrite && !this.adaptiveMode) {
        // Wait for drain if not in adaptive mode
        socket.once('drain', () => {
          setTimeout(generateData, intervalMs);
        });
      } else {
        // Continue generating
        setTimeout(generateData, (chunkSize / this.currentRate) * 1000);
      }
    };
    
    generateData();
  }
  
  /**
   * Stop data generation
   */
  stop() {
    this.isGenerating = false;
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    console.log(`[DataGenerator] Stopped. Generated ${(this.generatedBytes / 1024 / 1024).toFixed(2)} MB total`);
  }
  
  /**
   * Generate test data of specified size
   */
  generateData(size) {
    // Create structured test data for better debugging
    const pattern = `DATA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-`;
    const patternBuffer = Buffer.from(pattern);
    const result = Buffer.alloc(size);
    
    let offset = 0;
    while (offset < size) {
      const remaining = size - offset;
      const copySize = Math.min(remaining, patternBuffer.length);
      patternBuffer.copy(result, offset, 0, copySize);
      offset += copySize;
    }
    
    return result;
  }
  
  /**
   * Adjust generation rate based on backpressure feedback
   */
  adjustRate(backpressureDetected) {
    if (!this.adaptiveMode) return;
    
    if (backpressureDetected) {
      // Reduce rate by 50%
      this.currentRate = Math.max(this.currentRate * 0.5, this.generationRate * 0.1);
      console.log(`[DataGenerator] Backpressure detected, reducing rate to ${(this.currentRate / 1024).toFixed(2)} KB/s`);
    } else {
      // Increase rate by 20%, up to original rate
      this.currentRate = Math.min(this.currentRate * 1.2, this.generationRate);
      console.log(`[DataGenerator] Drain detected, increasing rate to ${(this.currentRate / 1024).toFixed(2)} KB/s`);
    }
  }
  
  /**
   * Get generation statistics
   */
  getStats() {
    return {
      isGenerating: this.isGenerating,
      generatedBytes: this.generatedBytes,
      originalRate: this.generationRate,
      currentRate: this.currentRate,
      adaptiveMode: this.adaptiveMode
    };
  }
}

/**
 * Demo function to demonstrate TCP backpressure visualization
 */
async function demo() {
  console.log('=== TCP Backpressure Visualizer Demo ===\n');
  
  const server = new SlowServer(8082, 50);
  const generator = new DataGenerator();
  let client = null;
  let monitor = null;
  
  try {
    console.log('1. Starting slow server...');
    await server.start();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('2. Connecting client...');
    client = new net.Socket();
    await new Promise((resolve, reject) => {
      client.connect(8082, 'localhost', resolve);
      client.on('error', reject);
    });
    
    console.log('3. Setting up backpressure monitoring...');
    monitor = new BackpressureMonitor(client);
    client._backpressureMonitor = monitor; // Attach for adaptive mode
    monitor.startMonitoring();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('4. Testing normal data flow...');
    generator.start(client, 64 * 1024, false); // 64KB/s
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    generator.stop();
    
    console.log('\n5. Simulating backpressure scenario...');
    await monitor.simulateBackpressure(1024 * 128, 50); // Large chunks
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n6. Demonstrating adaptive flow control...');
    generator.start(client, 512 * 1024, true); // 512KB/s with adaptive mode
    
    await new Promise(resolve => setTimeout(resolve, 8000));
    generator.stop();
    
    console.log('\n7. Performance comparison...');
    await demonstrateProperFlowControl();
    
    // Show final statistics
    console.log('\n=== Final Statistics ===');
    console.log('Monitor stats:', JSON.stringify(monitor.getStats(), null, 2));
    console.log('Server stats:', JSON.stringify(server.getStats(), null, 2));
    console.log('Generator stats:', JSON.stringify(generator.getStats(), null, 2));
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    // Clean up
    if (monitor) monitor.stopMonitoring();
    if (client) client.destroy();
    if (server) server.stop();
    
    console.log('\nDemo completed');
  }
}

/**
 * Demonstrate proper backpressure handling
 */
async function demonstrateProperFlowControl() {
  console.log('\n=== Proper Flow Control Comparison ===');
  
  // Test without proper flow control
  const testNaive = async () => {
    console.log('Testing naive approach (ignoring backpressure)...');
    const socket = new net.Socket();
    const monitor = new BackpressureMonitor(socket);
    
    await new Promise((resolve, reject) => {
      socket.connect(8082, 'localhost', resolve);
      socket.on('error', reject);
    });
    
    monitor.startMonitoring();
    
    const startTime = performance.now();
    const data = Buffer.alloc(1024 * 32, 'N'); // 32KB chunks
    let chunks = 0;
    
    // Naive: ignore write() return value
    for (let i = 0; i < 100; i++) {
      socket.write(data);
      chunks++;
    }
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const naiveTime = performance.now() - startTime;
    const naiveStats = monitor.getStats();
    
    monitor.stopMonitoring();
    socket.destroy();
    
    return { time: naiveTime, stats: naiveStats };
  };
  
  // Test with proper flow control
  const testProper = async () => {
    console.log('Testing proper approach (respecting backpressure)...');
    const socket = new net.Socket();
    const monitor = new BackpressureMonitor(socket);
    
    await new Promise((resolve, reject) => {
      socket.connect(8082, 'localhost', resolve);
      socket.on('error', reject);
    });
    
    monitor.startMonitoring();
    
    const startTime = performance.now();
    const data = Buffer.alloc(1024 * 32, 'P'); // 32KB chunks
    let chunks = 0;
    
    // Proper: respect write() return value and wait for drain
    const writeChunk = () => {
      return new Promise((resolve) => {
        const canWrite = socket.write(data);
        chunks++;
        
        if (canWrite) {
          setImmediate(resolve);
        } else {
          socket.once('drain', resolve);
        }
      });
    };
    
    for (let i = 0; i < 100; i++) {
      await writeChunk();
    }
    
    const properTime = performance.now() - startTime;
    const properStats = monitor.getStats();
    
    monitor.stopMonitoring();
    socket.destroy();
    
    return { time: properTime, stats: properStats };
  };
  
  try {
    const naiveResult = await testNaive();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Cool down
    const properResult = await testProper();
    
    console.log('\nComparison Results:');
    console.log(`Naive approach:  ${naiveResult.time.toFixed(2)}ms, ${naiveResult.stats.efficiency.backpressureRatio.toFixed(2)}% backpressure`);
    console.log(`Proper approach: ${properResult.time.toFixed(2)}ms, ${properResult.stats.efficiency.backpressureRatio.toFixed(2)}% backpressure`);
    console.log(`Improvement: ${((naiveResult.time - properResult.time) / naiveResult.time * 100).toFixed(1)}% faster`);
    
  } catch (error) {
    console.error('Flow control comparison failed:', error);
  }
}

/**
 * Test different backpressure scenarios
 */
async function testBackpressureScenarios() {
  console.log('\n=== Backpressure Scenarios Testing ===');
  
  const scenarios = [
    { name: 'Slow server + Fast client', serverDelay: 100, clientRate: 1024 * 1024 },
    { name: 'Fast server + Very fast client', serverDelay: 10, clientRate: 2048 * 1024 },
    { name: 'Variable rate client', serverDelay: 50, clientRate: 512 * 1024 },
  ];
  
  for (const scenario of scenarios) {
    console.log(`\nTesting: ${scenario.name}`);
    
    const server = new SlowServer(8083, scenario.serverDelay);
    await server.start();
    
    const client = new net.Socket();
    await new Promise((resolve, reject) => {
      client.connect(8083, 'localhost', resolve);
      client.on('error', reject);
    });
    
    const monitor = new BackpressureMonitor(client);
    monitor.startMonitoring();
    
    const generator = new DataGenerator();
    generator.start(client, scenario.clientRate, true);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    generator.stop();
    const stats = monitor.getStats();
    
    console.log(`  Backpressure events: ${stats.backpressureEvents}`);
    console.log(`  Efficiency: ${stats.efficiency.backpressureRatio.toFixed(2)}% backpressure rate`);
    
    monitor.stopMonitoring();
    client.destroy();
    server.stop();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Backpressure scenarios testing completed');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { BackpressureMonitor, SlowServer, DataGenerator };