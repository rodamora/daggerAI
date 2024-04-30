import { ToolCall } from './tool'

import { EventEmitter as NodeEventEmitter } from 'events'

interface TypedEventEmitter<T>
  extends Omit<NodeEventEmitter, 'on' | 'emit' | 'off'> {
  on<K extends keyof T>(event: K, listener: (args: T[K]) => void): this
  emit<K extends keyof T>(event: K, args: T[K]): boolean
  off<K extends keyof T>(event: K, listener: (args: T[K]) => void): this
}

export type ToolRunEvent = ToolCall & { output?: string }
export type AgentRunEvent = {
  agent: string
  name: string
  task: string
  output: string
}
export type SquadRunEvent = { name: string; output?: string }

export interface SquadEvents {
  'squad.started': SquadRunEvent
  'squad.finished': SquadRunEvent
  'agent.thinking': AgentRunEvent
  'agent.finished': AgentRunEvent
  'agent.failed': AgentRunEvent
  'tool.called': ToolRunEvent
  'tool.finished': ToolRunEvent
  'tool.failed': ToolRunEvent
}

export type SquadEvent = SquadEvents
export type SquadEventEmitter = TypedEventEmitter<SquadEvents>
