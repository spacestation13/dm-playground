import { CommandQueueService } from './CommandQueueService'
export type { Process, ProcessExit } from './CommandQueueService'

export const commandQueueService = new CommandQueueService()
