import * as React from "react"

import {parse, SyntaxError} from './parser/sql-parser'
import QueryInput from './components/QueryInput'
import RelationsInput from './components/RelationsInput'

export interface MainState {
  relationsInputText: string
  queryInputText: string
}

export default class Main extends React.Component<any, MainState> {
  status: string
  queryJSON: string

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
    this.queryJSON = ""
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
      const output = parse(query, undefined)
      this.status = "Query parsed"
      this.queryJSON = JSON.stringify(output)
      console.log(output)
    } catch (ex) {
      const err: SyntaxError = ex
      this.status = err.message
      this.queryJSON = ""
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
          <pre><code>
            {this.queryJSON}
          </code></pre>
        </div>
      </main>
    )
  }
}
