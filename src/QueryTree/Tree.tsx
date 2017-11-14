import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {tree} from 'd3-hierarchy'
import {select} from 'd3-selection'

import * as types from '../parser/types'

interface TreeProps {
  id: string
  hlr: types.HighLevelRelationish
}

interface TreeState {
  width: number
  height: number
}

export default class Tree extends React.Component<TreeProps, any> {
  svg: SVGSVGElement | null

  constructor(props: TreeProps) {
    super(props)

    this.state = {
      width: 400,
      height: 400
    }
  }

  render() {
    return (
      <svg
        ref={node => this.svg = node}
        width={this.state.width}
        height={this.state.height}
      />
    )
  }
}
