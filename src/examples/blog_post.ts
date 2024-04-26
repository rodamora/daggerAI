import { resolve } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../', '.env') })

import { Agent } from '../core/agent'
import { Squad } from '../core/squad'
import { Task } from '../core/task'
import { ChatAnthropic } from '../llm/anthropic'
import { SerperTool } from '../tools/serper'

async function runSquad() {
  const squad = new Squad()

  const llm = new ChatAnthropic({
    model: 'claude-3-haiku-20240307',
    maxTokens: 4000,
  })

  const blogWriter = new Agent({
    role: 'Social Media Blog Writer',
    backstory:
      'As a Social Media Blog Writer, I create engaging and shareable content tailored to a target audience. From topic ideation to keyword research and captivating introductions, I deliver high-quality blog posts that drive traffic and engagement.',
    goal: 'Create amazing social media blog posts.',
  })

  const research = new Task({
    name: 'Research',
    description: 'Research the topic for the blog post.',
    expectedOutput: 'A list of key points and sources for the blog post.',
    agent: blogWriter,
    tools: [new SerperTool()],
    llm,
  })

  const outline = new Task({
    name: 'Blog Post Outline',
    description: 'Create an outline for the blog post.',
    expectedOutput: 'A structured outline for the blog post.',
    agent: blogWriter,
    llm,
  })

  const blogPost = new Task({
    name: 'Blog Post',
    description: 'Write the blog post.',
    expectedOutput: 'A well-written and engaging blog post.',
    agent: blogWriter,
    llm,
  })

  // register the tasks into the squad
  squad.add(research)
  squad.add(outline)
  squad.add(blogPost)

  // connect the tasks to define the order of execution
  squad.connect(research, outline)
  squad.connect(outline, blogPost)

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

  const finalResults = await squad.evaluate()
  console.log(finalResults)
}

runSquad()
