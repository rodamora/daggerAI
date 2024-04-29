import { SquadEventEmitter } from './events'
import { interpolateVariablesIntoPrompt } from './helpers'
import { SQUAD_PROMPTS } from './prompts'

export interface Tool {
  code: string
  name: string
  description: string
  params: Record<string, string>
  execute: (input: any) => Promise<string>
}

export interface ToolCall {
  name: string
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
    const selectedTool = this.tools.find(tool => tool.name === calling.name)

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
        output: 'Max attempts reached. Moving on.',
      })

      return new ToolError(`\nMoving on then. ${formatPrompt}`)
    }

    // Returns ToolError if the tool does not exist
    if (!selectedTool) {
      this.runAttempts++

      this.events.emit('tool.failed', {
        ...calling,
        output: 'Action does not exist.',
      })

      return new ToolError(
        `Action '${calling.name}' don't exist, these are the only available Actions: ${toolNames}`,
      )
    }

    // Returns ToolError if the tool call does not have a name
    const selectedToolHasName = calling.name
    if (!selectedToolHasName) {
      this.runAttempts++

      this.events.emit('tool.failed', {
        ...calling,
        output: 'Forgot the action name.',
      })

      return new ToolError(
        `I forgot the Action name, these are the only available Actions: ${toolNames}`,
      )
    }

    try {
      this.events.emit('tool.called', calling)
      const output = await selectedTool.execute(calling.toolInput)
      this.events.emit('tool.finished', { ...calling, output })

      return output as string
    } catch (error) {
      return new ToolError(
        `I used the tool wrong, these are the correct instructions: ${selectedTool.description}`,
      )
    }
  }
}
