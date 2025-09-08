import { z } from 'zod'

export const terminalIpcSchema = {
  'terminal:create': {
    args: z.tuple([z.string()]), // terminal ID
    return: z.boolean(),
  },
  'terminal:destroy': {
    args: z.tuple([z.string()]), // terminal ID
    return: z.void(),
  },
  'terminal:write': {
    args: z.tuple([z.string(), z.string()]), // terminal ID, data
    return: z.void(),
  },
  'terminal:resize': {
    args: z.tuple([z.string(), z.number(), z.number()]), // terminal ID, cols, rows
    return: z.void(),
  },
  'terminal:clear': {
    args: z.tuple([z.string()]), // terminal ID
    return: z.void(),
  },
} as const