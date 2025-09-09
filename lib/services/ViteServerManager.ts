import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import * as net from 'net'

export class ViteServerManager {
  private viteProcess: ChildProcess | null = null
  private port: number = 5174
  private actualPort: number = 5174
  private ready: boolean = false
  
  async start(): Promise<void> {
    if (this.viteProcess) {
      console.log('Vite server already running')
      return
    }
    
    // Check if port is available
    const isPortAvailable = await this.checkPort(this.port)
    if (!isPortAvailable) {
      console.log(`Port ${this.port} is already in use, assuming Vite is running`)
      this.ready = true
      return
    }
    
    console.log('Starting Vite development server...')
    
    const viteExecutable = join(
      __dirname,
      '../../preview-server/node_modules/.bin/vite'
    )
    
    // In development: run Vite dev server
    if (process.env.NODE_ENV !== 'production') {
      try {
        this.viteProcess = spawn('npx', ['vite', 'dev'], {
          cwd: join(__dirname, '../../preview-server'),
          env: { 
            ...process.env, 
            PORT: String(this.port),
            NODE_ENV: 'development'
          },
          shell: true
        })
        
        this.viteProcess.stdout?.on('data', (data) => {
          const output = data.toString()
          console.log('Vite:', output)
          
          // Extract actual port from Vite output
          const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)\//)
          if (portMatch) {
            this.actualPort = parseInt(portMatch[1])
            console.log(`Vite server detected on port ${this.actualPort}`)
          }
          
          if (output.includes('ready in') || output.includes('Local:')) {
            this.ready = true
            console.log('✅ Vite server ready on port', this.actualPort)
          }
        })
        
        this.viteProcess.stderr?.on('data', (data) => {
          console.error('Vite error:', data.toString())
        })
        
        this.viteProcess.on('error', (error) => {
          console.error('Failed to start Vite process:', error)
        })
        
        this.viteProcess.on('exit', (code) => {
          console.log(`Vite process exited with code ${code}`)
          this.viteProcess = null
          this.ready = false
        })
        
      } catch (error) {
        console.error('Failed to spawn Vite process:', error)
        throw error
      }
    } else {
      // In production: serve built files
      this.serveStaticBuild()
    }
    
    // Wait for server to be ready
    await this.waitForReady()
  }
  
  private async checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer()
      
      server.once('error', () => {
        resolve(false)
      })
      
      server.once('listening', () => {
        server.close()
        resolve(true)
      })
      
      server.listen(port)
    })
  }
  
  private async waitForReady(): Promise<void> {
    const maxAttempts = 60 // 6 seconds total
    let attempts = 0
    
    while (!this.ready && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
      
      // Also check if server is responding
      if (attempts % 10 === 0) {
        try {
          const response = await fetch(`http://localhost:${this.actualPort}`)
          if (response.ok) {
            this.ready = true
            break
          }
        } catch {
          // Server not ready yet
        }
      }
    }
    
    if (!this.ready) {
      throw new Error('Vite server failed to start within timeout')
    }
  }
  
  stop(): void {
    if (this.viteProcess) {
      console.log('Stopping Vite server...')
      this.viteProcess.kill('SIGTERM')
      this.viteProcess = null
      this.ready = false
    }
  }
  
  private serveStaticBuild(): void {
    // For production, we'll serve pre-built files
    // This would be implemented with a simple static server
    console.log('Production mode: Would serve static preview files')
    this.ready = true
  }
  
  isReady(): boolean {
    return this.ready
  }
  
  getPort(): number {
    return this.actualPort
  }
}