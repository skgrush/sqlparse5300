import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

const Tracer = require('pegjs-backtrace')

import {Catalog} from 'parser/types'
import {parseSql, sqlToRelationalAlgebra, SqlSyntaxError} from './parser/parsing'

import RelationsInput, {RelationsInputOutput} from './components/RelationsInput'
import QueryInput from './components/QueryInput'
import Tests from './components/Tests'

import {htmlHLR} from './parser/relationalText'

export interface MainState {
  queryInputText: string
  status: string
  queryJSON: any
  relJSON: any
  catalog: Catalog | null
  debug: string
}

export default class Main extends React.Component<any, MainState> {

  constructor(props: any) {
    super(props)
    this.state = {
      queryInputText: "",
      status: "",
      catalog: null,
      queryJSON: null,
      relJSON: null,
      debug: ""
    }

    this.onRelationsInputUpdate = this.onRelationsInputUpdate.bind(this)
    this.onQueryInputUpdate = this.onQueryInputUpdate.bind(this)
    this.parseQuery = this.parseQuery.bind(this)

  }

  onRelationsInputUpdate(output: RelationsInputOutput) {
    if (output.error) {
      this.setState({
        catalog: null,
        status: `Error Parsing Relations:  ${output.error}`,
        debug: output.traceback
      })
    } else {
      this.setState({
        catalog: output.catalog,
        status: "Successfully Parsed Relations",
        debug: ''
      })
    }
  }

  onQueryInputUpdate(text: string): void {
    this.setState({
      status: "Parsing Query...",
      queryInputText: text,
      queryJSON: null,
      relJSON: null,
      debug: ""
    },
      () => this.parseQuery())

  }

  parseQuery(): void {
    const {queryInputText, catalog} = this.state

    let queryJSON
    let relJSON

    const tracer = new Tracer(queryInputText, {
      useColor: false,
      showTrace: true
    })
    try {
      queryJSON = parseSql(queryInputText, {tracer})
      this.setState({
        queryJSON,
        status: "Query parsed; Generating relational algebra..."
      })
    } catch (ex) {
      const err: SqlSyntaxError = ex
      this.setState({
        status: `Error Parsing Query:  ${err.message}`,
        debug: tracer.getParseTreeString()
      })
      throw err
    }

    try {
      relJSON = sqlToRelationalAlgebra(queryJSON, catalog as Catalog)
      this.setState({
        relJSON,
        status: "Generated relational algebra"
      })
    } catch (ex) {
      this.setState({
        status: `Error Generating Relational Algebra:  ${ex.message}`,
      })
      throw ex
    }
  }

  render() {
    return (
      <main id="main">
        <RelationsInput onUpdate={this.onRelationsInputUpdate} />
        <QueryInput
          onUpdate={this.onQueryInputUpdate}
          disabled={!this.state.catalog}
        />
        <div id="parse-status">{this.state.status}</div>
        <h3>SQL</h3>
        <div id="query-output-test">
          <JSONPretty json={this.state.queryJSON} />
        </div>
        <h3>Relational JSON</h3>
        <div id="rel-output">
          <JSONPretty json={this.state.relJSON} />
        </div>
        <h3>Relational HTML</h3>
        <div id="rel-html">
          {
            this.state.relJSON &&
            htmlHLR(this.state.relJSON)
          }
        </div>
        <div id="debug-output">
          <pre><code>{this.state.debug}</code></pre>
        </div>
        <Tests catalog={this.state.catalog} />
      </main>
    )
  }
}
