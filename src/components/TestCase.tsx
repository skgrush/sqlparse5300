import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

import {Catalog} from '../parser/types'
import {parseSql, SqlSyntaxError, sqlToRelationalAlgebra} from '../parser/parsing'
import {htmlHLR} from '../parser/relationalText'

const Tracer = require('pegjs-backtrace')

interface TestCaseProps {
  catalog: Catalog | null
  queryInputText: string
  doRun: boolean
  anchor: string
  name?: string
}

interface TestCaseState {
  status: string
  queryJSON: any
  relAlJSON: any
  relAlHTML: JSX.Element | null
  color: string
  debug: any
}

export default class TestCase extends React.Component<TestCaseProps, TestCaseState> {
  constructor(props) {
    super(props)
    this.state = this.initialState()
    this.run = this.run.bind(this)
  }

  componentDidMount() {
    this.propsReceived(this.props)
  }

  componentWillReceiveProps(newProps: TestCaseProps) {
    this.propsReceived(newProps)
  }

  propsReceived(newProps: TestCaseProps) {
    const {catalog, queryInputText, doRun} = this.props
    if (newProps.catalog !== catalog ||
        newProps.queryInputText !== queryInputText ||
        newProps.doRun !== doRun
       ) {
      this.setState(this.initialState(), () => {
        if (newProps.catalog && newProps.queryInputText && newProps.doRun)
          this.run(newProps)
      })
    }
  }

  initialState(): TestCaseState {
    return {
      status: 'init',
      queryJSON: null,
      relAlJSON: null,
      relAlHTML: null,
      color: 'currentcolor',
      debug: ''
    }
  }

  run(props: TestCaseProps = this.props) {

    const catalog = props.catalog as Catalog

    const tracer = new Tracer(props.queryInputText, {
      useColor: false,
      showTrace: true
    })

    let status = ''
    let queryJSON = null
    let relAlJSON = null
    let relAlHTML = null
    let color = 'currentcolor'
    let debug = ''

    try {
      queryJSON = parseSql(props.queryInputText, {tracer})
      status = "SQL Scanned and Tokenized"
      color = "green"
    } catch (ex) {
      if (ex instanceof SqlSyntaxError)
        status = `Parser Error [0]: ${ex.message}`
      else
        status = `Parser Error [1]: ${ex}`
      color = "red"
      debug = tracer.getParseTreeString()
    }

    if (queryJSON) {
      try {
        relAlJSON = sqlToRelationalAlgebra(queryJSON, catalog)
        status = "SQL Parsed and converted to Relational Algebra"
        color = "green"
      } catch (ex) {
        status = `Parser Error [2]: ${ex}`
        color = "red"
      }
    }
    if (relAlJSON) {
      try {
        relAlHTML = htmlHLR(relAlJSON)
        status = "Relational Algebra rendered to HTML"
        color = "green"
      } catch (ex) {
        status = `HTML Conversion Error: ${ex}`
        color = "red"
      }
    }

    this.setState({ status, queryJSON, relAlJSON, relAlHTML, color, debug })
  }

  render() {
    return (
      <section id={this.props.anchor} className="testcase">
        <hr />
        <h3>{this.props.name || this.props.anchor}</h3>
        <pre><code>{this.props.queryInputText}</code></pre>
        <div className="testcase-status" style={{color: this.state.color}}>
          Status: {this.state.status || "OK"}
        </div>
        <div className="testcase-inner">
          <div className="relal-html" data-empty={!this.state.relAlHTML}>
            <h4>Relational Algebra</h4>
            {this.state.relAlHTML}
          </div>
          <div className="sql-json" data-empty={!this.state.queryJSON}>
            <h4>SQL Structure</h4>
            <JSONPretty json={this.state.queryJSON} />
          </div>
          <div className="relal-json" data-empty={!this.state.relAlJSON}>
            <h4>Relational Algebra Structure</h4>
            <JSONPretty json={this.state.relAlJSON} />
          </div>
          <div className="traceback" data-empty={!this.state.debug}>
            <h4>Error Traceback</h4>
            <pre><code>{this.state.debug}</code></pre>
          </div>
        </div>
      </section>
    )
  }
}
