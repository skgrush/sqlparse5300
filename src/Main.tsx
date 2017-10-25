import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

import {parse, SyntaxError} from './parser/peg/sql'

import QueryInput from './components/QueryInput'
import RelationsInput from './components/RelationsInput'
import Tests from './components/Tests'

export interface MainState {
  relationsInputText: string
  queryInputText: string
}

export default class Main extends React.Component<any, MainState> {
  status: string
  queryJSON: any

  constructor(props: any) {
    super(props)
    this.state = {
      relationsInputText: "",
      queryInputText: ""
    }

    this.onRelationsInputUpdate = this.onRelationsInputUpdate.bind(this)
    this.onQueryInputUpdate = this.onQueryInputUpdate.bind(this)
    this.parseQuery = this.parseQuery.bind(this)

    this.status = ""
    this.queryJSON = null
  }

  onRelationsInputUpdate(text: string): void {
    this.setState({relationsInputText: text})
  }

  onQueryInputUpdate(text: string): void {
    this.setState({queryInputText: text})
    this.parseQuery(text)
  }

  parseQuery(query: string): void {
    this.status = "Parsing query"
    try {
      this.queryJSON = parse(query, undefined)
      this.status = "Query parsed"
      console.log(this.queryJSON)
    } catch (ex) {
      const err: SyntaxError = ex
      this.status = err.message
      this.queryJSON = null
      console.error(err)
    }
  }

  render() {
    return (
      <main id="main">
        <RelationsInput onUpdate={this.onRelationsInputUpdate} />
        <QueryInput onUpdate={this.onQueryInputUpdate} />
        <div id="parse-status">{this.status}</div>
        <div id="query-output-test">
          <JSONPretty json={this.queryJSON} />
        </div>
        <Tests />
      </main>
    )
  }
}
