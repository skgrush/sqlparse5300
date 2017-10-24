import Operation from './operation'

export default
class Node {
  operation: Operation
  children: Node[] = []

  constructor(operation: Operation) {
    this.operation = operation
  }

  addNode(node: Node) {
    this.children.push(node)
  }
}
