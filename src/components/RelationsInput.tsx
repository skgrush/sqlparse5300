import * as React from "react"

const Tracer = require('pegjs-backtrace')

import {parseRelations} from '../parser/parsing'
import {Catalog} from '../parser/types'

const DEFAULT_INPUT = `
Sailors(sid:integer, sname:string, rating:integer, age:real)
Boats(bid:integer, bname:string, color:string)
Reserves(sid:integer, bid:integer, day:date)
`

export interface RelationsInputOutput {
  catalog: Catalog.Catalog | null
  error: null | Error
  traceback: '' | string
}

export interface RelationsInputProps {
  onUpdate: (output: RelationsInputOutput) => void
}

interface RelationsInputState {
  catalog: Catalog.Catalog | null
  text: string
}

export default class RelationsInput extends React.Component<RelationsInputProps, RelationsInputState> {

  constructor(props) {
    super(props)
    this.state = {
      catalog: null,
      text: DEFAULT_INPUT
    }

    this.run = this.run.bind(this)
    this.onChange = this.onChange.bind(this)
  }

  run(e?) {
    const text = this.state.text
    if (e) e.preventDefault()

    const tracer = new Tracer(text, {
      useColor: false,
      showTrace: true
    })

    let catalog: Catalog.Catalog|null = null
    try {
      catalog = parseRelations(text, {tracer})
      this.props.onUpdate({ catalog, error: null, traceback: '' })
    } catch (ex) {
      this.props.onUpdate({
        catalog,
        error: ex,
        traceback: tracer.getParseTreeString()
      })
    }
    this.setState({catalog})
  }

  onChange(event) {
    this.setState({text: event.target.value})
  }

  render() {
    return (
      <div id="relations-input-wrapper">
        <textarea
          id="relations-input"
          value={this.state.text}
          cols={80}
          rows={10}
          onChange={this.onChange}
        />
        <button onClick={this.run}>Parse Relations</button>
      </div>
    )
  }
}
