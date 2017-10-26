import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

const Tracer = require('pegjs-backtrace')

import {Catalog} from 'parser/types'
import {parseRelations, parseSql, sqlToRelationalAlgebra} from './parser/parsing'

import QueryInput from './components/QueryInput'
import RelationsInput from './components/RelationsInput'
import Tests from './components/Tests'

import {htmlHLR} from './parser/relationalText'

export interface MainState {
  relationsInputText: string
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
      relationsInputText: "",
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

  onRelationsInputUpdate(text: string): void {
    this.setState({relationsInputText: text})
  }

  onQueryInputUpdate(text: string): void {
    this.setState({queryInputText: text},
      () => this.parseQuery())

  }

  parseQuery(): void {
    this.setState({
      status: "Parsing relations",
      queryJSON: null,
      relJSON: null,
      debug: ""
    })
    const relatTracer = new Tracer(this.state.relationsInputText, {
      useColor: false,
      showTrace: true
    })
    let queryJSON
    let relJSON
    let catalog
    try {
      catalog = parseRelations(this.state.relationsInputText, {tracer: relatTracer})
      this.setState({
        catalog,
        status: "Parsed relations"
      })
    } catch (ex) {
      this.setState({
        status: `Parsing Relations:  ${ex.message}`,
        relJSON: null,
        queryJSON: null,
        catalog: null,
        debug: relatTracer.getParseTreeString()
      })
      console.error("ERR1", ex)
      return
    }

    this.setState({status: "Parsing query"})
    const queryTracer = new Tracer(this.state.queryInputText, {
      useColor: false,
      showTrace: true
    })
    try {
      queryJSON = parseSql(this.state.queryInputText, {tracer: queryTracer})
      this.setState({
        queryJSON,
        status: "Query parsed"
      })
    } catch (ex) {
      const err: SyntaxError = ex
      this.setState({
        status: `Parsing query:  ${err.message}`,
        debug: queryTracer.getParseTreeString()
      })
      console.error("ERR2", err)
      return
    }

    this.setState({status: "Generating relational algebra"})
    try {
      relJSON = sqlToRelationalAlgebra(queryJSON, catalog as any)
      this.setState({
        relJSON,
        status: "Generated relational algebra"
      })
    } catch (ex) {
      console.error("ERR3", ex)
      this.setState({
        status: ex.message,
      })
      return
    }
  }

  render() {
    return (
      <main id="main">
        <RelationsInput onUpdate={this.onRelationsInputUpdate} />
        <QueryInput onUpdate={this.onQueryInputUpdate} />
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
        <Tests />
      </main>
    )
  }
}
