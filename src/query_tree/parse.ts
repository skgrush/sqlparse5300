import Node from './node'
import {Operation, Projection} from './operation'
import {HighLevelRelationish} from '../parser/types'

// const typeMap = {
//   "projection": Projection
// }
//
// function createOperationFromRel(relation: HighLevelRelationish): Operation {
//   switch(relation.type) {
//     case "projection":
//       return createProjectionFromRel(relation)
//     default:
//       throw new Error("Could not create operation from relational algebra")
//   }
// }
//
// function createProjectionFromRel(relation: any): Projection {
//   let operation = new Projection()
//   relation.columns.forEach(col => {
//     let arg = `${col.relation.name} ${col.name}`
//     if(col.as) arg += ` as ${col.as}`
//     operation.addArgument(arg)
//   })
//
//   return operation
// }
//
// function getChildren(rel: HighLevelRelationish): HighLevelRelationish[]  {
//     return []
// }
//
// // convert json produced by peg to Tree
// export default function parseSQLToTree(rel: HighLevelRelationish): Node {
//   // input: some relational alg data
//   // create tree of nodes with data
//
//   //grab data
//   //create operation
//   //create node
//   //create each child
//   //add children
//   let operation = createOperationFromRel(rel)
//   let root = new Node(operation)
//   getChildren(rel).forEach(childRel => {
//     let child = parseSQLToTree(childRel)
//     root.addNode(child)
//   })
//
//   return root
// }
//
// function parseIndividual(sql: HighLevelRelationish): Node {
//   // let projectArgs = sql.what.targetlist
//   // let op = new Projection()
//   // projectArgs.forEach(arg => op.addTarget(arg))
//   // let root = new Node(op)
//   //
//   // let fromArgs = sql.from
//   // let from = new From()
//   // from.addTarget(fromArgs)
//   // let fromNode = new Node(from)
//   // root.addNode(fromNode)
//   //
//   // let whereArgs = sql.where
//   // let where = new Where()
//   // where.addTarget(whereArgs)
//   // let whereNode = new Node(where)
//   // fromNode.addNode(whereNode)
//   //
//   // return root
//   return new Node(new Operation("WORKING ON IT"))
// }
//
// function parsePair(lhs, operation, rhs): Node {
//   let lhsNode = parseIndividual(lhs)
//   let rhsNode = parseIndividual(rhs)
//   let op = new Operation(operation)
//   let root = new Node(op)
//   root.addNode(lhsNode)
//   root.addNode(rhsNode)
//   console.log(root)
//   return root
// }
