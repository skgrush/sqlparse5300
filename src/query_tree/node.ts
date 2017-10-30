import {Operation} from './operation'

export default
class Node {
  operation: Operation
  children: Node[] = []
  depth: number = 0

  constructor(operation: Operation) {
    this.operation = operation
  }

  addNode(node: Node) {
    node.depth = this.depth + 1
    this.children.push(node)
  }
}
