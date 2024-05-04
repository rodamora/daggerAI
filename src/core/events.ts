import { Source } from './interfaces'
import { ToolCall, ToolResponse } from './tool'

import { EventEmitter as NodeEventEmitter } from 'events'

interface TypedEventEmitter<T>
  extends Omit<NodeEventEmitter, 'on' | 'emit' | 'off'> {
  on<K extends keyof T>(event: K, listener: (args: T[K]) => void): this
  emit<K extends keyof T>(event: K, args: T[K]): boolean
  off<K extends keyof T>(event: K, listener: (args: T[K]) => void): this
}

export type ToolCallEvent = ToolCall
export type ToolResponseEvent = ToolResponse
export type AgentFinishedEvent = {
  agent: string
  name: string
  task: string
  output: string
  sources: Source[]
}
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
  'agent.started': AgentRunEvent
  'agent.thinking': AgentRunEvent
  'agent.finished': AgentFinishedEvent
  'agent.failed': AgentRunEvent
  'tool.called': ToolCallEvent
  'tool.finished': ToolCall & ToolResponse
  'tool.failed': ToolResponse
}

export type SquadEvent = SquadEvents
export type SquadEventEmitter = TypedEventEmitter<SquadEvents>
