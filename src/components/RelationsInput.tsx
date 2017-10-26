import * as React from "react"

export interface RelationsInputProps {
  onUpdate: (text: string) => void
}

export default class RelationsInput extends React.Component<RelationsInputProps, any> {
  render() {
    return (
      <div id="relations-input-wrapper">
        <textarea id="relations-input" onChange={(e) => this.props.onUpdate(e.target.value)} />
      </div>
    )
  }
}
