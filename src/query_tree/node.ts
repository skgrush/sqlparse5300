import {QTOperation, Relation, Join, Restriction, Projection, Rename,
        Operation} from './operation'

import {Rel} from '../parser/types'

// if RelRelation:    just name
// if RelJoin:        ....
// if RelRestriction: SYM _ (conditions)
// if RelProjection:  SYM _ (columns)
// if RelRename:      SYM _ (A / B)
// if RelOperation:   hlr SYM hlr

export default class Node {
  hlr: Rel.HighLevelRelationish
  operation: QTOperation
  children: Node[] = []
  depth: number = 0

  constructor(hlr: Rel.HighLevelRelationish, depth: number = 0) {
    this.hlr = hlr
    this.depth = depth
    this.generateOpAndKids()
  }

  generateOpAndKids() {
    if (this.hlr instanceof Rel.Relation) {
      this.operation = new Relation(this.hlr)
    } else if (this.hlr instanceof Rel.Join) {
      this.operation = new Join(this.hlr)
      this.addNode(new Node(this.hlr.lhs, this.depth + 1))
      this.addNode(new Node(this.hlr.rhs, this.depth + 1))
    } else if (this.hlr instanceof Rel.Restriction) {
      this.operation = new Restriction(this.hlr)
      this.addNode(new Node(this.hlr.args, this.depth + 1))
    } else if (this.hlr instanceof Rel.Projection) {
      this.operation = new Projection(this.hlr)
      this.addNode(new Node(this.hlr.args, this.depth + 1))
    } else if (this.hlr instanceof Rel.Rename) {
      this.operation = new Rename(this.hlr)
      this.addNode(new Node(this.hlr.args, this.depth + 1))
    } else if (this.hlr instanceof Rel.Operation) {
      this.operation = new Operation(this.hlr)
      this.addNode(new Node(this.hlr.lhs as Rel.HighLevelRelationish, this.depth + 1))
      this.addNode(new Node(this.hlr.rhs as Rel.HighLevelRelationish, this.depth + 1))
    } else {
      console.error("Unknown type", this.hlr)
      throw new Error("Unknown op type")
    }
  }

  addNode(node: Node) {
    node.depth = this.depth + 1
    this.children.push(node)
  }
}
