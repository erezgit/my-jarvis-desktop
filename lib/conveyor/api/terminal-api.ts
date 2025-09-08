import { ConveyorApi } from '@/lib/preload/shared'

export class TerminalApi extends ConveyorApi {
  create = (id: string) => this.invoke('terminal:create', id)
  destroy = (id: string) => this.invoke('terminal:destroy', id)
  write = (id: string, data: string) => this.invoke('terminal:write', id, data)
  resize = (id: string, cols: number, rows: number) => this.invoke('terminal:resize', id, cols, rows)
  clear = (id: string) => this.invoke('terminal:clear', id)
  
  // Event listeners
  onData = (id: string, callback: (data: string) => void) => {
    return this.on(`terminal:data:${id}`, callback)
  }
  
  onExit = (id: string, callback: (code: number) => void) => {
    return this.on(`terminal:exit:${id}`, callback)
  }
}