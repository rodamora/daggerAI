import { Input } from './input'
import { Task } from './task'

export class Node {
  id: string = ''
  graphId: string = ''
  type: string = ''

  // controls the order of execution
  adjacentTo: string[] = []
  adjancentFrom: string[] = []

  output: string | null = null

  nodeOutput() {
    return ''
  }
}

export type NodeTypes = Task | Input
