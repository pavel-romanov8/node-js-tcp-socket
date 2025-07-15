# TCP and Node.js Server Internals - Exercises

This repository contains hands-on exercises to help you understand TCP internals in Node.js. These exercises accompany the article about TCP and Node.js server internals.

## Prerequisites

- Node.js 16+ (exercises use modern async/await syntax)
- Basic understanding of JavaScript and Node.js
- Familiarity with TCP/IP concepts
- Linux/macOS for full debugging capabilities (Windows users can still run most exercises)

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/pavel-romanov8/node-js-tcp-socket.git
   cd node-js-tcp-socket
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Exercise Structure

Each exercise comes in two versions:
- **Starter files** (`exercise-X-starter.js`): Contains boilerplate code with TODOs for you to complete
- **Solution files** (`exercise-X-solution.js`): Complete implementations with detailed comments

## Exercises

### Exercise 1: Connection Pool Monitor
**File**: `exercise-1-starter.js` | **Solution**: `exercise-1-solution.js`

Build a connection pool monitor that tracks the lifecycle of sockets and their internal handles. This exercise helps you understand how Node.js manages TCP connections under the hood.

**What you'll learn:**
- How `_handle` lifecycle differs from socket lifecycle
- The cost of creating new TCP connections
- When Node.js actually allocates system resources

**Run it:**
```bash
node exercise-1-starter.js
```

### Exercise 2: Event Loop Phase Detector
**File**: `exercise-2-starter.js` | **Solution**: `exercise-2-solution.js`

Create a tool that detects which event loop phase is processing your TCP events. This reveals how Node.js schedules network I/O operations.

**What you'll learn:**
- How the poll phase handles network I/O
- Why TCP events might be delayed
- The relationship between libuv and the Node.js event loop

**Run it:**
```bash
node exercise-2-starter.js
```

### Exercise 3: TCP Backpressure Visualizer
**File**: `exercise-3-starter.js` | **Solution**: `exercise-3-solution.js`

Build a tool that visualizes TCP backpressure in real-time, showing how Node.js streams interact with kernel buffers.

**What you'll learn:**
- How Node.js streams interact with TCP send buffers
- When and why backpressure occurs
- The relationship between application-level and kernel-level buffering
- How to handle high-throughput scenarios properly

**Run it:**
```bash
node exercise-3-starter.js
```

## Debugging Tips

1. **Enable Node.js networking debug output:**
   ```bash
   NODE_DEBUG=net node exercise-X-starter.js
   ```

2. **See actual system calls (Linux/macOS):**
   ```bash
   strace -e trace=network node exercise-X-starter.js
   ```

3. **Monitor TCP connection states:**
   ```bash
   netstat -an | grep YOUR_PORT
   ```

4. **Test with different Node.js versions:**
   ```bash
   nvm use 16 && node exercise-X-starter.js
   nvm use 18 && node exercise-X-starter.js
   ```

## Learning Path

1. Start with Exercise 1 to understand connection lifecycle
2. Move to Exercise 2 to learn about event loop scheduling
3. Complete Exercise 3 to understand flow control and backpressure

## Troubleshooting

- **Port already in use**: Change the port numbers in the exercises
- **Permission denied**: Some debug tools require elevated privileges
- **Windows compatibility**: Most exercises work on Windows, but some debugging tools are Unix-specific

## Related Resources

- [Node.js TCP Socket Documentation](https://nodejs.org/api/net.html)
- [libuv Documentation](https://docs.libuv.org/en/v1.x/)
- [TCP/IP Illustrated](https://www.amazon.com/TCP-Illustrated-Volume-Implementation-v/dp/0201633469)

## Contributing

Found an issue or have suggestions? Please open an issue or submit a pull request.

## License

ISC