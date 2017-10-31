import * as React from 'react'
import Node from 'query_tree/node'
import '../styles/tree.scss'

interface TreeProps {
  root: Node
  margin: number
}

interface TreeState {
}

export default
class Tree extends React.Component<TreeProps, TreeState> {
  render() {
      const rows: JSX.Element[] = []
      let frontier: Node[] = [this.props.root]
      let key = 0
      while (frontier.length > 0) {
        let node: Node = frontier.shift() as Node
        const row = <TreeRow
                      node={node}
                      key={key}
                      offset={node.depth}/>
        rows.push(row)
        frontier = node.children.concat(frontier)
        key++
      }
      return (
      <div>
        {rows}
      </div>
      )
  }
}

interface TreeRowProps {
  offset: number
  node: Node
}

interface TreeRowState {
}

class TreeRow extends React.Component<TreeRowProps, TreeRowState> {
  render() {
    return (
      <div className="tree-row">
        {"-".repeat(this.props.offset) + `${this.props.offset})`} {this.props.node.operation.html}
      </div>
    )
  }
}
