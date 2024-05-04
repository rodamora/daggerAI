import { LLMModel } from '../llm/base'
import { AgentParams } from './agent'

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

export interface Source {
  title: string
  url: string
  content: string
  images?: string[]
  rawContent?: string
}

export type JSONValue = string | number | boolean | JSONObject | JSONArray

interface JSONObject {
  [x: string]: JSONValue
}

interface JSONArray extends Array<JSONValue> {}
