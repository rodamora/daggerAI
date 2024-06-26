import { interpolateVariablesIntoPrompt } from './helpers'
import { SQUAD_PROMPTS } from './prompts'

export class Agent {
  id: string
  role: string
  goal: string
  backstory: string

  constructor(params: AgentParams) {
    this.id = params.id
    this.role = params.role
    this.goal = params.goal
    this.backstory = params.backstory
  }

  getRolePlaying() {
    return interpolateVariablesIntoPrompt(SQUAD_PROMPTS.rolePlaying, {
      role: this.role,
      backstory: this.backstory,
      goal: this.goal,
    })
  }
}

export interface AgentParams {
  id: string
  role: string
  goal: string
  backstory: string
}
