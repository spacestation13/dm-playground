import { EmulatorService } from './EmulatorService'
import { commandQueueService } from './commandQueueSingleton'

export const emulatorService = new EmulatorService()

commandQueueService.setSender((value) => {
	emulatorService.sendPort('controller', value)
})

emulatorService.addEventListener('receivedOutput', (event) => {
	const detail = (event as CustomEvent<{ port: string; data: string }>).detail
	if (detail.port === 'controller') {
		commandQueueService.handleInput(detail.data)
	}
})

emulatorService.addEventListener('resetOutputConsole', () => {
	commandQueueService.handleInput('HELLO\0')
})
