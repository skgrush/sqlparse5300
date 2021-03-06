import * as React from "react"
import * as JSONPretty from 'react-json-pretty'
const Tracer = require('pegjs-backtrace')

import {ResultTuple} from '../parser/tests'
import {Catalog} from '../parser/types'
import {parseSql, SqlSyntaxError, sqlToRelationalAlgebra} from '../parser/parsing'
import {htmlHLR} from '../parser/relationalText'

import {Projection} from '../query_tree/operation'
import Node from '../query_tree/node'
import Tree from '../components/tree'

interface TestCaseProps {
  catalog: Catalog.Catalog | null
  queryInputText: string
  doRun: boolean
  anchor: string
  resultTuple: ResultTuple
  showStructures: boolean | undefined
  name?: string
}

interface TestCaseState {
  status: string
  treeStatus: string
  queryJSON: any
  relAlJSON: any
  root: Node | null
  relAlHTML: JSX.Element | null
  color: string
  tscolor: string
  debug: any
  showStructures: boolean
}

export default class TestCase extends React.Component<TestCaseProps, TestCaseState> {

  constructor(props) {
    super(props)
    this.state = this.initialState()

    this.run = this.run.bind(this)
    this.toggleStructures = this.toggleStructures.bind(this)
  }

  componentDidMount() {
    this.propsReceived(this.props)
  }

  componentWillReceiveProps(newProps: TestCaseProps) {
    this.propsReceived(newProps)
  }

  propsReceived(newProps: TestCaseProps) {
    const {catalog, queryInputText, doRun, showStructures} = this.props
    if (newProps.showStructures !== undefined)
      this.setState({showStructures: newProps.showStructures})

    // if any test-related props are different, reset state.
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
      treeStatus: '',
      queryJSON: null,
      relAlJSON: null,
      relAlHTML: null,
      root: null,
      color: 'currentcolor',
      tscolor: 'currentcolor',
      debug: '',
      showStructures: Boolean(this.props.showStructures)
    }
  }

  run(props: TestCaseProps = this.props) {

    const catalog = props.catalog as Catalog.Catalog

    const tracer = new Tracer(props.queryInputText, {
      useColor: false,
      showTrace: true
    })

    let status
    let treeStatus = ''
    let queryJSON
    let relAlJSON
    let relAlHTML
    let root: Node | null = null
    let color = 'currentcolor'
    let tscolor = 'currentcolor'
    let debug = ''

    try {
      queryJSON = parseSql(props.queryInputText, {tracer})
      this.props.resultTuple[0] = queryJSON
      status = "SQL Scanned and Tokenized"
      color = "green"
    } catch (ex) {
      if (ex instanceof SqlSyntaxError)
        status = `Parser Syntax Error: ${ex.message}`
      else
        status = `Other Parser ${ex}`
      console.error(ex)
      color = "red"
      debug = tracer.getParseTreeString()
    }

    if (queryJSON) {
      try {
        relAlJSON = sqlToRelationalAlgebra(queryJSON, catalog)
        this.props.resultTuple[1] = relAlJSON
        status = "SQL Parsed and converted to Relational Algebra"
        color = "green"
      } catch (ex) {
        this.props.resultTuple[0] = ex
        status = `Relational Algebra ${ex}`
        color = "red"
        console.error(ex)
      }
    }
    if (relAlJSON) {
      try {
        relAlHTML = htmlHLR(relAlJSON)
        status = "Relational Algebra rendered to HTML"
        color = "green"
      } catch (ex) {
        this.props.resultTuple[1] = ex
        status = `HTML Conversion Error: ${ex}`
        color = "red"
        console.error(ex)
      }
      if (relAlJSON)
        try {
          root = new Node(relAlJSON)
          status = "Tree Generated"
          color = "green"
        } catch (ex) {
          treeStatus = `Tree Error: ${ex}`
          tscolor = "red"
          console.error(ex)
        }
    }

    this.setState({
      status,
      treeStatus,
      queryJSON,
      relAlJSON,
      relAlHTML,
      root,
      color,
      tscolor,
      debug
    })
  }

  toggleStructures(e) {
    this.setState({showStructures: !this.state.showStructures})
  }

  render() {
    return (
      <section id={this.props.anchor} className="testcase">
        <hr />
        <h3>{this.props.name || this.props.anchor}</h3>
        <pre><code>{this.props.queryInputText}</code></pre>
        <div className="testcase-status">
          <span style={{color: this.state.color}}>
            Status: {this.state.status || "OK"}
          </span>
          { this.state.treeStatus && (
            <span style={{color: this.state.tscolor}}>
              Tree Status: {this.state.treeStatus}
            </span>
          )}
        </div>
        { (this.state.queryJSON || this.state.relAlJSON) && (
            <button onClick={this.toggleStructures}>
              {this.state.showStructures ? "Hide" : "Show"} Structures
            </button>
          )
        }
        <div className="testcase-inner">
          <div className="relal-html" data-empty={!this.state.relAlHTML}>
            <h4>Relational Algebra</h4>
            {this.state.relAlHTML}
          </div>
          <div
            className="sql-json"
            data-empty={!(this.state.queryJSON && this.state.showStructures)}
          >
            <h4>SQL Structure</h4>
            <JSONPretty json={this.state.queryJSON} />
          </div>
          <div
            className="relal-json"
            data-empty={!(this.state.relAlJSON && this.state.showStructures)}
          >
            <h4>Relational Algebra Structure</h4>
            <JSONPretty json={this.state.relAlJSON} />
          </div>
          <div className="tree" data-empty={!this.state.root}>
            <h4>Tree</h4>
            { this.state.root &&
                <Tree root={this.state.root} margin={10} />
            }
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
