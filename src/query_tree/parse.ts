// tslint:disable
import Node from './node'
import {Operation, Projection, From, Where} from './operation'

// convert json produced by peg to Tree
export default function parseSQLToTree(sql): Node {
  // TODO: fix order of tree hierarchy

  let projectArgs = sql[0].what.targetlist
  let op = new Projection()
  projectArgs.forEach(arg => op.addTarget(arg))
  let root = new Node(op)

  let fromArgs = sql[0].from
  let from = new From()
  from.addTarget(fromArgs)
  let fromNode = new Node(from)
  root.addNode(fromNode)

  let whereArgs = sql[0].where
  let where = new Where()
  where.addTarget(whereArgs)
  let whereNode = new Node(where)
  fromNode.addNode(whereNode)

  return root
}
