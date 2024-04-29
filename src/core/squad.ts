import EventEmitter from 'events'
import { nanoid } from 'nanoid'
import { DirectedAcyclicGraph } from 'typescript-graph'
import { SquadEventEmitter } from './events'
import { Input, InputValue } from './input'
import { Node, NodeTypes } from './node'
import { Task } from './task'
import { removeDiacritics } from './helpers'

export interface SquadEvaluateParams {
  // the values of the input from the user
  inputs: InputValue[]
  instructions?: string
}

export class Squad {
  private graph: DirectedAcyclicGraph<string> = new DirectedAcyclicGraph()
  private env: Record<string, string> = {}
  private queue: string[] = []
  private order: Task[] = []
  private nodes: Node[] = []
  public events: SquadEventEmitter = new EventEmitter()

  // additional instructions the user can send to the squad
  inputs: InputValue[] = []
  instructions: string = ''

  async evaluate(params: SquadEvaluateParams) {
    this.inputs = params.inputs
    this.instructions = params.instructions || ''

    // find the nodes with no incoming edges
    let inDegree: { [key: string]: number } = {}
    for (const node of this.nodes) {
      inDegree[node.id] = node.adjancentFrom.length
    }

    // the queue starts with the nodes that have no incoming edges
    this.queue = Object.keys(inDegree).filter(key => inDegree[key] === 0)

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
        this.env[nextNode.name] = taskResponse
      }

      // Add the IDs of the nodes that the current node is adjacent to to the queue
      for (const id of nextNode.adjacentTo) {
        this.queue.push(id)
      }
    }

    // Return the environment object containing the results of all executed tasks
    return this.env
  }

  private findNextNode(ids: string[]) {
    const sortedNodes = this.graph
      .topologicallySortedNodes()
      .map(id => this.nodes.find(t => t.id === id)!)
    return sortedNodes.find(n => ids.includes(n.id))
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
