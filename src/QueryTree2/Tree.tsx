import * as React from 'react'

import * as d3 from 'd3'

interface TreeProps {
  id: string
}

interface TreeState {
  tree: any // d3.layout.Tree
}

export default class Tree extends React.Component<any, any> {
  svg: any
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.svg = d3.select(`#${this.props.id}`).append("svg")

  }

  render() {
    return (
      <div id={this.props.id} className="Tree">

      </div>
    )
  }
}
