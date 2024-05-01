import { EventEmitter } from 'events'
import { nanoid } from 'nanoid'
import { DirectedAcyclicGraph } from 'typescript-graph'
import { SquadEventEmitter } from './events'
import { removeDiacritics } from './helpers'
import { Input, InputValue } from './input'
import { Node, NodeTypes } from './node'
import { Task } from './task'

export interface SquadEvaluateParams {
  // the values of the input from the user
  inputs: InputValue[]
  instructions?: string
}

export interface SquadParams {
  verbose?: boolean
}

export class Squad {
  private graph: DirectedAcyclicGraph<string> = new DirectedAcyclicGraph()
  private env: Record<string, string> = {}
  private queue: string[] = []
  private order: Task[] = []
  private nodes: Node[] = []
  private history: string[] = []

  // additional instructions the user can send to the squad
  inputs: InputValue[] = []
  instructions: string = ''

  events = new EventEmitter() as SquadEventEmitter
  verbose: boolean = false

  constructor(params: SquadParams = {}) {
    this.verbose = params.verbose || false
  }

  async evaluate(params: SquadEvaluateParams) {
    this.inputs = params.inputs
    this.instructions = params.instructions || ''

    // find the nodes with no incoming edges
    let inDegree: { [id: string]: number } = {}
    for (const node of this.nodes) {
      inDegree[node.id] = node.adjancentFrom.length
    }

    // the queue starts with the nodes that have no incoming edges
    this.queue = Object.keys(inDegree).filter(id => inDegree[id] === 0)

    // the order the nodes were executed
    this.order = []

    // Keep running the loop until there are no more nodes to execute
    while (true) {
      const nextNode = this.findNextNode(this.queue) as NodeTypes

      if (!nextNode) {
        break
      }

      // Remove the next node from the queue
      this.queue.splice(this.queue.indexOf(nextNode.id), 1)

      if (nextNode.type === 'input') {
        const inputNode = nextNode as Input

        if (!this.inputs) {
          throw new Error('Inputs are required')
        }

        const input = this.inputs.find(
          i =>
            removeDiacritics(i.name).toLowerCase() ===
            removeDiacritics(inputNode.name).toLowerCase(),
        )

        inputNode.output = input?.value || ''
      }

      if (nextNode.type === 'task') {
        const taskNode = nextNode as Task
        // Add the next node to the order array
        this.order.push(taskNode)
        // Executes the node
        const taskResponse = await taskNode.execute(this)
        // Store the node response in the environment
        ;(this.env as any)[taskNode.id] = taskResponse
      }

      this.history.push(nextNode.id)

      // Add the IDs of the nodes that the current node is adjacent to to the queue
      for (const id of nextNode.adjacentTo) {
        if (this.history.includes(id) || this.queue.includes(id)) {
          continue
        }

        this.queue.push(id)
      }
    }

    this.events.emit('squad.finished', {
      name: 'Squad',
      output: Object.values(this.env).join('\n\n'),
    })

    // Return the environment object containing the results of all executed tasks
    return this.env
  }

  private recalculateInDegree(id: string) {
    const node = this.nodes.find(t => t.id === id)!
    const dependencies = node.adjancentFrom
    return dependencies.filter(d => !this.history.includes(d)).length
  }

  private findNextNode(ids: string[]) {
    for (let id of ids) {
      const degree: number = this.recalculateInDegree(id)
      if (degree === 0) {
        return this.nodes.find(t => t.id === id)
      }
    }
    return null
  }

  connect(from: Node, to: Node) {
    const fromNode = this.nodes.find(t => t.id === from.id)!
    const toNode = this.nodes.find(t => t.id === to.id)!

    if (!fromNode || !toNode) {
      throw new Error('Node not found')
    }

    fromNode.adjacentTo.push(to.id)
    toNode.adjancentFrom.push(from.id)

    this.graph.addEdge(from.graphId, to.graphId)
  }

  add(node: Node) {
    if (!node.id) {
      node.id = nanoid()
    }
    node.graphId = this.graph.insert(node.id)
    this.nodes.push(node)
  }

  sortedNodes() {
    return this.graph
      .topologicallySortedNodes()
      .map(n => this.nodes.find(t => t.id === n)!)
  }

  nodesById(ids: string[]) {
    const allNodes = this.sortedNodes()
    return ids.map(t => allNodes.find(n => n.id === t)) as NodeTypes[]
  }
}
