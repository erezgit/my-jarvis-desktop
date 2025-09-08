import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { TerminalApi } from './terminal-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  terminal: new TerminalApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
