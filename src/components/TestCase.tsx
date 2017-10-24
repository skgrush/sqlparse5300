import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

import {parse, SyntaxError} from "../parser/sql-parser"

interface TestCaseProps {
  inputText: string
}

interface TestCaseState {
  status: string
  results: any
}

export default class TestCase extends React.Component<TestCaseProps, TestCaseState> {
  constructor(props) {
    super(props)
    this.state = {
      status: 'init',
      results: null
    }
    this.run = this.run.bind(this)
  }

  componentDidMount() {
    this.run()
  }

  run() {
    let status = ''
    let results = null
    try {
      results = parse(this.props.inputText, undefined)
      status = "Query parsed"
    } catch (ex) {
      const err: SyntaxError = ex
      status = err.message
    }
    this.setState({ status, results })
  }

  render() {
    return (
      <div className="testcase">
        <hr />
        <pre><code>{this.props.inputText}</code></pre>
        <div>Status: {this.state.status}</div>
        <div><JSONPretty json={this.state.results} /></div>
      </div>
    )
  }
}
