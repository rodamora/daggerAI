import { nanoid } from 'nanoid'
import { DirectedAcyclicGraph } from 'typescript-graph'
import { Task } from './task'

export class Squad {
  private graph: DirectedAcyclicGraph<string> = new DirectedAcyclicGraph()
  private env: Record<string, string> = {}
  private queue: string[] = []
  private order: Task[] = []

  private tasks: Task[] = []

  connect(from: Task, to: Task) {
    const fromTask = this.tasks.find(t => t.id === from.id)!
    const toTask = this.tasks.find(t => t.id === to.id)!

    if (!fromTask || !toTask) {
      throw new Error('Task not found')
    }

    fromTask.adjacentTo.push(to.id)
    toTask.adjancentFrom.push(from.id)

    this.graph.addEdge(from.graphId, to.graphId)
  }

  add(task: Task) {
    task.id = nanoid()
    task.graphId = this.graph.insert(task.id)
    this.tasks.push(task)
  }

  sortedTasks() {
    return this.graph
      .topologicallySortedNodes()
      .map(n => this.tasks.find(t => t.id === n)!)
  }

  async evaluate() {
    // Get the nodes in the graph in order of execution
    const tasks = this.graph
      .topologicallySortedNodes()
      .map(n => this.tasks.find(t => t.id === n)!)

    const firstTask = tasks[0]!

    // the queue holds the nodes that need to be executed during each loop
    this.queue = [firstTask.id]
    // the order the nodes were executed
    this.order = []

    // Keep running the loop until there are no more tasks to execute
    while (true) {
      const nextTask = this.findNextTask(this.queue)
      if (!nextTask) {
        break
      }

      // Remove the next task from the queue
      this.queue.splice(this.queue.indexOf(nextTask.id), 1)
      // Add the next task to the order array
      this.order.push(nextTask)

      // Executes the task
      const taskResponse = await nextTask.execute(this)
      // Store the task response in the environment
      this.env[nextTask.name] = taskResponse

      // Add the IDs of the tasks that the current task is adjacent to to the queue
      for (const id of nextTask.adjacentTo) {
        this.queue.push(id)
      }
    }

    // Return the environment object containing the results of all executed tasks
    return this.env
  }

  private findNextTask(ids: string[]) {
    const sortedTasks = this.graph
      .topologicallySortedNodes()
      .map(id => this.tasks.find(t => t.id === id)!)
    return sortedTasks.find(n => ids.includes(n.id))
  }
}
