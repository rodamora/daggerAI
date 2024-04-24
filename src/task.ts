import {
  convertToXmlTag,
  dedent,
  interpolateVariablesIntoPrompt,
  logWithColor,
} from './helpers'
import {
  AgentAction,
  Observation,
  AgentFinish,
  AgentStep,
  ParserError,
  SquadResponseParser,
} from './parser'
import { SQUAD_PROMPTS } from './prompts'
import { Squad } from './squad'
import { Tool, ToolError, ToolRunner } from './tool'
import { Agent } from './agent'
import { LLM } from './llm/base'

export class Task {
  graphId: string = ''
  id: string = ''

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

  // controls the order of execution
  adjacentTo: string[] = []
  adjancentFrom: string[] = []

  // the final output of the task
  output: string | null = null

  constructor(params: TaskParams) {
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
    const toolRunner = new ToolRunner(this.tools)
    // toolRunner.emitter = this.emitter

    // this.emitter?.emit('agent.thinking', {
    //   key: this.agent.id,
    //   name: this.agent.name,
    //   task: task.id,
    //   output: `Executing task *${task.name}*`,
    // })

    let intermediateSteps: [AgentAction | null, Observation | undefined][] = []
    let iterations = 0

    while (this.shouldContinue(iterations)) {
      try {
        let promptWithSteps =
          llmPrompt + this.buildIntermediateStepsPrompt(intermediateSteps)

        logWithColor(`LLM Prompt: ${promptWithSteps}`, 'yellow')
        const response = await this.llm.invoke(promptWithSteps)
        logWithColor(response as string, 'green')
        const nextStep = llmParser.parse(response as string)

        if (nextStep instanceof AgentFinish) {
          this.output = nextStep.response
          return this.output
        }

        if (nextStep instanceof AgentStep) {
          intermediateSteps.push([nextStep.action, nextStep.observation])
          const action = nextStep.action

          const output = await toolRunner.run({
            name: action.tool,
            toolInput: action.toolInput,
          })

          if (output instanceof ToolError) {
            intermediateSteps.push([null, output.observation])
          } else {
            intermediateSteps.push([null, output])
          }
        }
      } catch (error) {
        const err = error as Error

        logWithColor(err.message, 'red')

        if (error instanceof ParserError) {
          intermediateSteps.push([null, error.observation])
        } else {
          intermediateSteps.push([null, err.message])
        }
      }

      iterations++
    }

    return 'The agent exceeded the maximum number of attempts.'
  }

  shouldContinue(iterations: number) {
    return iterations < this.maxAttempts
  }

  getToolsPrompt() {
    return interpolateVariablesIntoPrompt(SQUAD_PROMPTS.tools, {
      tools: this.tools
        .map(t => `Name: ${t.name} Description: ${t.description}`)
        .join('\n'),
      toolNames: this.tools.map(t => t.name).join(', '),
    })
  }

  buildIntermediateStepsPrompt(
    intermediateSteps: [AgentAction | null, Observation | undefined][],
  ) {
    let prompt = ''
    if (intermediateSteps.length) {
      intermediateSteps.forEach(([action, observation]) => {
        if (action) {
          prompt += `\n\n${action.log}`
        }

        if (observation) {
          prompt += `\nObservation: ${observation}`
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

    const allSquadTasks = squad.sortedTasks()
    const previousTasks = previousTasksIds.map(t =>
      allSquadTasks.find(task => task.id === t),
    )
    const taskContext = previousTasks.map(t => t?.output).join('\n')

    if (taskContext) {
      taskPrompt += interpolateVariablesIntoPrompt(
        SQUAD_PROMPTS.taskWithContext,
        { context: taskContext },
      )
    }

    return dedent`${taskPrompt}`
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
    prompt += this.getTaskKickoffPrompt()

    return dedent`${prompt}`
  }
}

export interface TaskParams {
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
