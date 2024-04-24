import { ToolCall } from './tool'
import { EventEmitter } from 'stream'

export type ToolRunEvent = ToolCall & { output?: string }
export type AgentRunEvent = {
  key: string
  name: string
  task: string
  output: string
}
export type SquadRunEvent = { name: string; output?: string }

export interface SquadEvents {
  'squad.started': [SquadRunEvent]
  'squad.finished': [SquadRunEvent]
  'agent.thinking': [AgentRunEvent]
  'agent.finished': [AgentRunEvent]
  'agent.failed': [AgentRunEvent]
  'tool.called': [ToolRunEvent]
  'tool.finished': [ToolRunEvent]
  'tool.failed': [ToolRunEvent]
}

export type SquadEvent = SquadEvents
export type SquadEventEmitter = EventEmitter<SquadEvents>
