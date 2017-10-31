import {QTOperation, Relation, Join, Restriction, Projection, Rename,
        Operation} from './operation'

import * as types from '../parser/types'

// if RelRelation:    just name
// if RelJoin:        ....
// if RelRestriction: SYM _ (conditions)
// if RelProjection:  SYM _ (columns)
// if RelRename:      SYM _ (A / B)
// if RelOperation:   hlr SYM hlr

export default class Node {
  hlr: types.HighLevelRelationish
  operation: QTOperation
  children: Node[] = []
  depth: number = 0

  constructor(hlr: types.HighLevelRelationish) {
    this.hlr = hlr
    this.generateOpAndKids()
  }

  generateOpAndKids() {
    if (this.hlr instanceof types.RelRelation) {
      this.operation = new Relation(this.hlr)
    } else if (this.hlr instanceof types.RelJoin) {
      this.operation = new Join(this.hlr)
      this.addNode(new Node(this.hlr.lhs))
      this.addNode(new Node(this.hlr.rhs))
    } else if (this.hlr instanceof types.RelRestriction) {
      this.operation = new Restriction(this.hlr)
      this.addNode(new Node(this.hlr.args))
    } else if (this.hlr instanceof types.RelProjection) {
      this.operation = new Projection(this.hlr)
      this.addNode(new Node(this.hlr.args))
    } else if (this.hlr instanceof types.RelRename) {
      this.operation = new Rename(this.hlr)
      this.addNode(new Node(this.hlr.args))
    } else if (this.hlr instanceof types.RelOperation) {
      this.operation = new Operation(this.hlr)
      this.addNode(new Node(this.hlr.lhs as types.HighLevelRelationish))
      this.addNode(new Node(this.hlr.rhs as types.HighLevelRelationish))
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
