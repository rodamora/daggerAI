import { ZodSchema } from 'zod'
import { SquadEventEmitter } from './events'
import { interpolateVariablesIntoPrompt } from './helpers'
import { JSONValue, Source } from './interfaces'
import { SQUAD_PROMPTS } from './prompts'

export interface Tool {
  name: string
  description: string
  schema: ZodSchema
  execute: (input: any) => Promise<ToolResponse>
}

export interface ToolResponse {
  text: string
  sources?: Source[]
  actions?: ToolCall[]
  metadata?: JSONValue
}

export interface ToolCall {
  tool: string
  toolInput: object
}

export class ToolError {
  constructor(public observation: string) {}
}

/**
 * This class is responsible for running the tools
 * the LLM decides to call.
 */
export class ToolRunner {
  runAttempts = 0
  maxRunAttemps = 5

  constructor(public tools: Tool[], public events: SquadEventEmitter) {}

  async run(calling: ToolCall) {
    const toolNames = this.tools.map(t => t.name).join(', ')
    const selectedTool = this.tools.find(tool => tool.name === calling.tool)

    // We limit the number of times we try to run a tool
    const hasToolAttemptsReachedMax = this.runAttempts >= this.maxRunAttemps
    if (hasToolAttemptsReachedMax) {
      const formatPrompt = interpolateVariablesIntoPrompt(
        SQUAD_PROMPTS.format,
        {
          toolNames,
        },
      )

      this.events.emit('tool.failed', {
        ...calling,
        text: 'Max attempts reached. Moving on.',
      })

      return new ToolError(`\nMoving on then. ${formatPrompt}`)
    }

    // Returns ToolError if the tool does not exist
    if (!selectedTool) {
      this.runAttempts++

      this.events.emit('tool.failed', {
        ...calling,
        text: 'Action does not exist.',
      })

      return new ToolError(
        `Action '${calling.tool}' don't exist, these are the only available Actions: ${toolNames}`,
      )
    }

    // Returns ToolError if the tool call does not have a name
    const selectedToolHasName = calling.tool
    if (!selectedToolHasName) {
      this.runAttempts++

      this.events.emit('tool.failed', {
        ...calling,
        text: 'Forgot the action name.',
      })

      return new ToolError(
        `I forgot the Action name, these are the only available Actions: ${toolNames}`,
      )
    }

    try {
      this.events.emit('tool.called', calling)
      const response = await selectedTool.execute(calling.toolInput)
      this.events.emit('tool.finished', { ...calling, ...response })

      return response
    } catch (error) {
      return new ToolError(
        `I used the tool wrong, these are the correct instructions: ${selectedTool.description}`,
      )
    }
  }
}
