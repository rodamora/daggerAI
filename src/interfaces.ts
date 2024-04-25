import { AgentParams } from './agent'
import { LLMModel } from './llm/base'

export interface SquadDefinition {
  tasks: TaskDefinition[]
  edges: SquadEdge[]
}

export interface SquadEdge {
  from: string
  to: string
}

export interface TaskDefinition {
  id: string
  name: string
  description: string
  expectedOutput: string
  agent: AgentParams
  llm: LLMModel
  tools: string[]
}
