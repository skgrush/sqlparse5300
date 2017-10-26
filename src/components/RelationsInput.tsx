import * as React from "react"

const DEFAULT_INPUT = `
Sailors(sid:integer, sname:string, rating:integer, age:real)
Boats(bid:integer, bname:string, color:string)
Reserves(sid:integer, bid:integer, day:date)
`

export interface RelationsInputProps {
  onUpdate: (text: string) => void
}

export default class RelationsInput extends React.Component<RelationsInputProps, any> {

  componentDidMount() {
    if (DEFAULT_INPUT) {
      this.props.onUpdate(DEFAULT_INPUT)
    }
  }

  render() {
    return (
      <div id="relations-input-wrapper">
        <textarea
          id="relations-input"
          defaultValue={DEFAULT_INPUT}
          cols={80}
          rows={10}
          onChange={(e) => this.props.onUpdate(e.target.value)}
        />
      </div>
    )
  }
}
