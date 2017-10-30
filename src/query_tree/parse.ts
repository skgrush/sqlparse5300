// tslint:disable
import Node from './node'
import {Operation, Projection, From, Where} from './operation'

// convert json produced by peg to Tree
export default function parseSQLToTree(sql): Node {
  // TODO: fix order of tree hierarchy

  if(sql[0].length === 4) {
    console.log("Parsing Pair")
    return parsePair(sql[0][0], sql[0][1], sql[0][3]);
  } else if(sql[0].what) {
    return parseIndividual(sql[0])
  } else {
    throw new Error('Cant parse sql to tree')
  }
}

function parseIndividual(sql): Node {
  let projectArgs = sql.what.targetlist
  let op = new Projection()
  projectArgs.forEach(arg => op.addTarget(arg))
  let root = new Node(op)

  let fromArgs = sql.from
  let from = new From()
  from.addTarget(fromArgs)
  let fromNode = new Node(from)
  root.addNode(fromNode)

  let whereArgs = sql.where
  let where = new Where()
  where.addTarget(whereArgs)
  let whereNode = new Node(where)
  fromNode.addNode(whereNode)

  return root
}

function parsePair(lhs, operation, rhs): Node {
  let lhsNode = parseIndividual(lhs)
  let rhsNode = parseIndividual(rhs)
  let op = new Operation(operation)
  let root = new Node(op)
  root.addNode(lhsNode)
  root.addNode(rhsNode)
  console.log(root)
  return root
}
