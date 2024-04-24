import { SquadEventEmitter } from './events'

const FINAL_ANSWER = 'Final Answer:'
const ERROR_MISSING_ACTION_AFTER_THOUGHT =
  "I made a mistake providing an invalid format: I missed the 'Action:' after 'Thought:'. I will fix it next time, and I will not use a tool I have already used.\n"
const ERROR_MISSING_ACTION_INPUT_AFTER_ACTION =
  "I made a mistake providing an invalid format: I missed the 'Action Input:' after 'Action:'. I will fix it next time, and don't use a tool I have already used.\n"
const ERROR_FINAL_ANSWER_AND_PARSABLE_ACTION =
  'I made a mistake, I tried both performing an Action and giving a Final Answer, I must choose one or the other. I will fix it next time.\n'

export class SquadResponseParser {
  emitter: SquadEventEmitter | null = null

  parse(response: string): AgentStep | AgentFinish {
    const includesFinalAnswer = response.includes(FINAL_ANSWER)

    const hasActionAndInput =
      /Action\s*\d*\s*:[\s]*(.*?)[\s]*Action\s*\d*\s*Input\s*\d*\s*:[\s]*(.*)/g.test(
        response,
      )

    if (hasActionAndInput && includesFinalAnswer) {
      throw new ParserError(
        'Error parsing LLM ouput.',
        ERROR_FINAL_ANSWER_AND_PARSABLE_ACTION,
      )
    }

    if (includesFinalAnswer) {
      const finalAnswer = response.split(FINAL_ANSWER)[1]
      if (finalAnswer) {
        return new AgentFinish(finalAnswer.trim())
      }
    }

    if (hasActionAndInput) {
      const actionRegex = /Action:\s*(.*?)\s*\nAction Input/
      const actionInputRegex = /Action Input:\s*([\s\S]+)/

      let actionMatch = response.match(actionRegex)
      const action = actionMatch?.[1]?.trim()
      let actionInputMatch = response.match(actionInputRegex)
      const actionInput = actionInputMatch?.[1]?.trim() || ''

      if (actionInput) {
        const jsonActionInput = JSON.parse(actionInput.trim()) as object
        return new AgentStep(
          new AgentAction(action!, jsonActionInput, response),
        )
      }
    }

    const hasAction = /Action:\s*(.*?)\s*/.test(response)
    const hasActionInput = /[\s]*Action\s*\d*\s*Input\s*\d*\s*:[\s]*(.*)/.test(
      response,
    )

    if (!hasAction) {
      throw new ParserError(
        'Error parsing LLM ouput.',
        ERROR_MISSING_ACTION_AFTER_THOUGHT,
      )
    }

    if (hasActionInput && !hasAction) {
      throw new ParserError(
        'Error parsing LLM ouput.',
        ERROR_MISSING_ACTION_INPUT_AFTER_ACTION,
      )
    }

    const finalAnswer = response.split(FINAL_ANSWER)[1]
    return new AgentFinish(
      finalAnswer?.trim() || 'It was not possible to execute the task.',
    )
  }
}

export class AgentFinish {
  constructor(public response: string) {}
}

export class AgentAction {
  constructor(
    public tool: string,
    public toolInput: object,
    public log: string,
  ) {}
}

export class AgentStep {
  constructor(public action: AgentAction, public observation?: string) {}
}

export class ParserError extends Error {
  constructor(message: string, public observation: string) {
    super(message)
  }
}

export type Observation = string
