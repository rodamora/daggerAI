import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../../', '.env') })

import { Agent } from '../core/agent'
import { Squad } from '../core/squad'
import { Task } from '../core/task'
import { ChatAnthropic } from '../llm/anthropic'

async function runSquad() {
  const squad = new Squad()

  const llm = new ChatAnthropic({
    model: 'claude-3-haiku-20240307',
    maxTokens: 4000,
  })

  // const llm = new ChatOpenAI({
  //   model: 'gpt-3.5-turbo',
  //   maxTokens: 4000,
  // })

  const salesAssistant = new Agent({
    role: 'Sales Improver',
    backstory: 'You are a sales specialist.',
    goal: 'You always want to increase sales',
  })

  const salesStrategy = new Task({
    name: 'Sales Strategy',
    description: 'Think of a strategy to increase sales.',
    expectedOutput: 'A markdown list of strategies to increase sales.',
    agent: salesAssistant,
    tools: [],
    memories: [],
    inputs: [],
    llm,
  })

  const salesPlan = new Task({
    name: 'Sales Plan',
    description: 'Create a plan to implement the strategy.',
    expectedOutput: 'A markdown list of steps to implement the strategy.',
    agent: salesAssistant,
    tools: [],
    memories: [],
    inputs: [],
    llm,
  })

  const salesResponsibilities = new Task({
    name: 'Sales Execution',
    description: 'Create a list of responsible people for each step.',
    expectedOutput: 'A markdown list of responsible people for each step.',
    agent: salesAssistant,
    tools: [],
    memories: [],
    inputs: [],
    llm,
  })

  squad.add(salesStrategy)
  squad.add(salesPlan)
  squad.add(salesResponsibilities)

  squad.connect(salesStrategy, salesPlan)
  squad.connect(salesPlan, salesResponsibilities)

  // you can list to various events to get updates on the squad progress
  squad.events.on('squad.started', () => {
    console.log('Squad started!')
  })

  squad.events.on('agent.thinking', task => {
    console.log(`Task started: ${task.name}`)
  })

  squad.events.on('agent.finished', task => {
    console.log(`Task finished: ${task.output}`)
  })

  squad.events.on('tool.called', tool => {
    console.log(`Tool called: ${tool.name}`)
  })

  squad.events.on('tool.finished', tool => {
    console.log(`Tool finished: ${tool.name}`)
  })

  squad.events.on('squad.finished', () => {
    console.log('Squad finished!')
  })

  const results = await squad.evaluate({ inputs: [] })
  console.log(results)
}

runSquad()
