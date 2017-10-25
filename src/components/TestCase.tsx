import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

import {parse, SyntaxError} from "../parser/sql-parser"

const Tracer = require('pegjs-backtrace')

interface TestCaseProps {
  inputText: string
}

interface TestCaseState {
  status: string
  results: any
  color: string
  traceback: string
}

export default class TestCase extends React.Component<TestCaseProps, TestCaseState> {
  constructor(props) {
    super(props)
    this.state = {
      status: 'init',
      results: null,
      color: 'currentcolor',
      traceback: ''
    }
    this.run = this.run.bind(this)
  }

  componentDidMount() {
    this.run()
  }

  run() {
    const text = this.props.inputText
    const tracer = new Tracer(text, {
      useColor: false,
      showTrace: true
    })

    let status = ''
    let results = null
    let color = ''
    let traceback = ''

    try {
      results = parse(text, {tracer})
      status = ""
      color = "green"
    } catch (ex) {
      const err: SyntaxError = ex
      status = err.message
      color = "red"
      traceback = tracer.getParseTreeString()
    }
    this.setState({ status, results, color, traceback })
  }

  render() {
    return (
      <div className="testcase">
        <hr />
        <pre><code>{this.props.inputText}</code></pre>
        <div style={{color: this.state.color}}>
          Status: {this.state.status || "OK"}
        </div>
        <div>
          <JSONPretty json={this.state.results} />
          <div className="traceback">
            <pre><code>
              {this.state.traceback}
            </code></pre>
          </div>
        </div>
      </div>
    )
  }
}
