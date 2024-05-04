import { LLM } from '../llm/base'
import { Agent } from './agent'
import {
  convertToXmlTag,
  convertZodSchemaToJson,
  dedent,
  interpolateVariablesIntoPrompt,
  logWithColor,
  removeDiacritics,
} from './helpers'
import { Node } from './node'
import {
  AgentAction,
  AgentFinish,
  AgentStep,
  ParserError,
  SquadResponseParser,
} from './parser'
import { SQUAD_PROMPTS } from './prompts'
import { Squad } from './squad'
import { Tool, ToolError, ToolResponse, ToolRunner } from './tool'

export class Task extends Node {
  override type: string = 'task'

  agent: Agent

  name: string
  description: string
  expectedOutput: string

  tools: Tool[]
  memories: string[]
  inputs: TaskInput[]

  llm: LLM

  // the max attemps to execute this task
  maxAttempts: number = 10

  constructor(params: TaskParams) {
    super()
    this.id = params.id || ''
    this.name = params.name
    this.description = params.description
    this.agent = params.agent
    this.expectedOutput = params.expectedOutput
    this.tools = params.tools || []
    this.inputs = params.inputs || []
    this.memories = params.memories || []
    this.llm = params.llm
  }

  async execute(squad: Squad) {
    let llmPrompt = this.buildInitialPrompt(squad)

    const llmParser = new SquadResponseParser()
    const toolRunner = new ToolRunner(this.tools, squad.events)

    squad.events.emit('agent.started', {
      agent: this.agent.id,
      name: this.name,
      task: this.id,
      output: `Executing task *${this.name}*`,
    })

    let intermediateSteps: [AgentAction | null, ToolResponse | undefined][] = []
    let iterations = 0

    let sources: any[] = []

    while (this.shouldContinue(iterations)) {
      if (squad.verbose) {
        logWithColor(`Running Iteration ${iterations}`, 'blue')
      }

      try {
        let promptWithSteps =
          llmPrompt + this.buildIntermediateStepsPrompt(intermediateSteps)

        if (squad.verbose) {
          logWithColor(`LLM Prompt: ${promptWithSteps}`, 'yellow')
        }

        squad.events.emit('agent.thinking', {
          agent: this.agent.id,
          name: this.name,
          task: this.id,
          output: '',
        })

        const response = await this.llm.invoke(promptWithSteps)

        if (squad.verbose) {
          logWithColor(response as string, 'green')
        }

        const nextStep = llmParser.parse(response as string)

        if (squad.verbose) {
          logWithColor(`Next step: ${JSON.stringify(nextStep)}`, 'magenta')
        }

        if (nextStep instanceof AgentFinish) {
          this.output = nextStep.response

          squad.events.emit('agent.finished', {
            agent: this.agent.id,
            name: this.name,
            output: this.output,
            task: this.id,
            sources,
          })

          return this.output
        }

        if (nextStep instanceof AgentStep) {
          intermediateSteps.push([
            nextStep.action,
            { text: nextStep.observation! },
          ])
          const action = nextStep.action

          const output = await toolRunner.run({
            tool: action.tool,
            toolInput: action.toolInput,
          })

          if (output instanceof ToolError) {
            intermediateSteps.push([null, { text: output.observation }])
          } else {
            logWithColor(`Tool output: ${JSON.stringify(output)}`, 'red')

            if (output.sources) {
              sources = [...sources, ...output.sources]
            }
            intermediateSteps.push([null, output])
          }
        }
      } catch (error) {
        const err = error as Error

        if (squad.verbose) {
          logWithColor(err.message, 'red')
        }

        if (error instanceof ParserError) {
          intermediateSteps.push([null, { text: error.observation }])
        } else {
          intermediateSteps.push([null, { text: err.message }])
        }
      }

      logWithColor(`Finished iteration`, 'red')

      iterations++
    }

    return 'The agent exceeded the maximum number of attempts.'
  }

  shouldContinue(iterations: number) {
    return iterations < this.maxAttempts
  }

  getToolsPrompt() {
    return interpolateVariablesIntoPrompt(SQUAD_PROMPTS.tools, {
      toolNames: this.tools.map(t => t.name).join(', '),
      tools: this.tools
        .map(
          t =>
            `${t.name}, the tool params: ${convertZodSchemaToJson(t.schema)}`,
        )
        .join('\n'),
    })
  }

  buildIntermediateStepsPrompt(
    intermediateSteps: [AgentAction | null, ToolResponse | undefined][],
  ) {
    let prompt = ''
    if (intermediateSteps.length) {
      intermediateSteps.forEach(([action, response]) => {
        if (action) {
          prompt += `\n\n${action.log}`
        }
        if (response && response.text) {
          prompt += `\nObservation: ${response.text}`
        }
      })
    }
    return prompt
  }

  getUserInputsPrompt() {
    if (!this.inputs || !this.inputs.length) {
      return ''
    }

    let finalUserInputs = '\nHere is additional data for your tasks:\n'
    for (const input of this.inputs) {
      if (!input.value) continue
      const tag = convertToXmlTag(input.label, input.value)
      finalUserInputs += `\n${tag}\n`
    }

    return finalUserInputs
  }

  getNoToolsPrompt() {
    return SQUAD_PROMPTS.noTools
  }

  getExpectedOutputPrompt() {
    return interpolateVariablesIntoPrompt(SQUAD_PROMPTS.expectedOutput, {
      expectedOutput: this.expectedOutput,
    })
  }

  getTaskKickoffPrompt() {
    return SQUAD_PROMPTS.kickoff
  }

  getCurrentTaskPrompt(squad: Squad) {
    let taskPrompt = interpolateVariablesIntoPrompt(SQUAD_PROMPTS.task, {
      input: this.description,
    })

    let previousTasksIds = this.adjancentFrom
    if (!previousTasksIds.length) {
      return taskPrompt
    }

    const previousTasks = squad.nodesById(previousTasksIds)
    const taskContext = previousTasks.map(t => t.nodeOutput()).join('\n')

    if (taskContext) {
      taskPrompt += interpolateVariablesIntoPrompt(
        SQUAD_PROMPTS.taskWithContext,
        { context: taskContext },
      )
    }

    return dedent`${taskPrompt}`
  }

  getAdditionalInstructions(squad: Squad) {
    if (squad.instructions) {
      return `\n\n<important_user_instructions>${squad.instructions}</important_user_instructions>`
    }
    return ''
  }

  /**
   * Builds the initial prompt for the LLM.
   * It uses different prompts if there are tools involved in the task.
   */
  buildInitialPrompt(squad: Squad) {
    const isTaskWithsTools = this.tools.length > 0

    let prompt = this.agent.getRolePlaying()

    if (isTaskWithsTools) {
      prompt += this.getToolsPrompt()
    } else {
      prompt += this.getNoToolsPrompt()
    }

    prompt += this.getCurrentTaskPrompt(squad)
    prompt += this.getUserInputsPrompt()
    prompt += this.getExpectedOutputPrompt()
    prompt += this.getAdditionalInstructions(squad)
    prompt += this.getTaskKickoffPrompt()

    return dedent`${prompt}`
  }

  override nodeOutput() {
    return `${convertToXmlTag(
      removeDiacritics(this.name).toLocaleLowerCase(),
      this.output || '',
    )}`
  }
}

export interface TaskParams {
  id?: string
  name: string
  description: string
  expectedOutput: string
  agent: Agent
  llm: LLM
  tools?: Tool[]
  inputs?: TaskInput[]
  memories?: string[]
}

export interface TaskInput {
  label: string
  value: string
}
