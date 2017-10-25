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
      let node = this.props.root
      let depth = 0
      while (node) {
        const row = <TreeRow
                      node={node}
                      key={depth}
                      offset={this.props.margin * depth}/>
        rows.push(row)
        depth++
        node = node.children[0]
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
      <div className="tree-row" style={{paddingLeft: this.props.offset}}>
        {this.props.node.operation.name} ({this.props.node.operation.arguments.map(arg => {
          return arg + ", "
        })})
      </div>
    )
  }
}
