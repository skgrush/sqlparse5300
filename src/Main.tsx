import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

import {Catalog} from 'parser/types'
import {parseRelations, parseSql, sqlToRelationalAlgebra} from './parser/parsing'

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
  relJSON: any
  catalog: Catalog | null

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
    this.catalog = null
    this.queryJSON = null
    this.relJSON = null
  }

  onRelationsInputUpdate(text: string): void {
    this.setState({relationsInputText: text})
  }

  onQueryInputUpdate(text: string): void {
    this.setState({queryInputText: text})
    this.parseQuery()
  }

  parseQuery(): void {
    this.status = "Parsing relations"
    try {
      this.catalog = parseRelations(this.state.relationsInputText)
    } catch (ex) {
      this.status = ex.message
      this.relJSON = this.queryJSON = this.catalog = null
      console.error(ex)
      return
    }

    this.status = "Parsing query"
    try {
      this.queryJSON = parseSql(this.state.queryInputText)
      this.status = "Query parsed"
      console.log(this.queryJSON)
    } catch (ex) {
      const err: SyntaxError = ex
      this.status = err.message
      this.relJSON = this.queryJSON = this.catalog = null
      console.error(err)
      return
    }

    this.status = "Generating relational algebra"
    try {
      this.relJSON = sqlToRelationalAlgebra(this.queryJSON, this.catalog)
    } catch (ex) {
      this.status = ex.message
      this.relJSON = this.queryJSON = this.catalog = null
      return
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
