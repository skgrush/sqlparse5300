import * as React from "react"

import * as JSONPretty from 'react-json-pretty'

const Tracer = require('pegjs-backtrace')

import {Catalog} from './parser/types'

import RelationsInput, {RelationsInputOutput} from './components/RelationsInput'
import QueryInput from './components/QueryInput'
import Tests from './components/Tests'
import TestCase from './components/TestCase'

export interface MainState {
  queryInputText: string
  status: string
  queryJSON: any
  relJSON: any
  catalog: Catalog.Catalog | null

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
    })

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
        <div id="main-output">
          <TestCase
            catalog={this.state.catalog}
            queryInputText={this.state.queryInputText}
            doRun={true} // bad idea??
            anchor="main-test"
            resultTuple={(window as any).mainResult}
            name="Main Test"
            showStructures={undefined}
          />
          <div id="debug-output" data-empty={!this.state.debug}>
            <pre><code>{this.state.debug}</code></pre>
          </div>
        </div>
        <hr />
        <hr />
        <Tests catalog={this.state.catalog} />
      </main>
    )
  }
}
