import * as React from "react"

export interface QueryInputProps {
  onUpdate: (text: string) => void
  disabled: boolean
}

export default class QueryInput extends React.Component<QueryInputProps, any> {
  textInput: HTMLTextAreaElement

  constructor(props: QueryInputProps) {
    super(props)

    this.onSubmit = this.onSubmit.bind(this)
  }

  onSubmit(e?) {
    if (e) e.preventDefault()
    console.info("Submitting:", this.textInput.value)
    this.props.onUpdate(this.textInput.value)
  }
  render() {
    return (
      <div id="query-input-wrapper">
        <textarea
          id="query-input"
          placeholder="Query..."
          cols={80}
          rows={10}
          ref={(input: HTMLTextAreaElement) => {this.textInput = input}}
        />
        <button
          disabled={this.props.disabled}
          onClick={this.onSubmit}
        >Parse Query</button>
      </div>
    )
  }
}
