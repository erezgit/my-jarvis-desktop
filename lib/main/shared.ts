import { ipcMain } from 'electron'
import { ipcSchemas, validateArgs, validateReturn, type ChannelArgs, type ChannelReturn } from '@/lib/conveyor/schemas'

/**
 * Helper to register IPC handlers
 * @param channel - The IPC channel to register the handler for
 * @param handler - The handler function to register
 * @returns void
 */
// Keep track of registered handlers
const registeredHandlers = new Set<string>()

export const handle = <T extends keyof typeof ipcSchemas>(
  channel: T,
  handler: (...args: ChannelArgs<T>) => ChannelReturn<T>
) => {
  // Check if handler is already registered
  if (registeredHandlers.has(channel)) {
    console.log(`IPC handler "${channel}" is already registered, skipping registration`)
    return
  }
  
  try {
    ipcMain.handle(channel, async (_, ...args) => {
      try {
        const validatedArgs = validateArgs(channel, args)
        const result = await handler(...validatedArgs)

        return validateReturn(channel, result)
      } catch (error) {
        console.error(`IPC Error in ${channel}:`, error)
        throw error
      }
    })
    
    // Mark as registered
    registeredHandlers.add(channel)
    console.log(`Successfully registered IPC handler "${channel}"`)
  } catch (error) {
    console.error(`Failed to register IPC handler "${channel}":`, error)
    // Don't throw error, continue app startup
  }
}
