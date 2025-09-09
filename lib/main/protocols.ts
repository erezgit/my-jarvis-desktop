import { protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

export function registerResourcesProtocol() {
  // Check if protocol is already registered to prevent duplicate registration errors
  if (protocol.isProtocolHandled('res')) {
    console.log('Protocol "res" is already registered, skipping registration')
    return
  }
  
  try {
    protocol.handle('res', async (request) => {
      try {
        const url = new URL(request.url)
        // Combine hostname and pathname to get the full path
        const fullPath = join(url.hostname, url.pathname.slice(1))
        const filePath = join(__dirname, '../../resources', fullPath)
        return net.fetch(pathToFileURL(filePath).toString())
      } catch (error) {
        console.error('Protocol error:', error)
        return new Response('Resource not found', { status: 404 })
      }
    })
    console.log('Successfully registered "res" protocol')
  } catch (error) {
    console.error('Failed to register res protocol:', error)
    // Don't throw error, continue app startup
  }
}
