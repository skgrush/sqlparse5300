import * as React from "react"

import TestCase from './TestCase'
import {selectTests} from "../parser/tests"

interface TestsState {
  results: any[]
}

export default class Tests extends React.Component<any, TestsState> {
  constructor(props) {
    super(props)
    this.state = {
      results: []
    }

    this.run = this.run.bind(this)
  }

  run(e?) {
    if (e) e.preventDefault()
    const res = selectTests.map((testStr, idx) => <TestCase inputText={testStr} key={idx} />)
    this.setState({ results: res })
  }

  render() {
    return (
      <div id="tests-div">
        <button onClick={this.run}>Run Tests</button>
        <div>
          {...this.state.results}
        </div>
      </div>
    )
  }
}
