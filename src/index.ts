import * as React from "react"
import * as ReactDOM from "react-dom"

import './styles/tests.scss'

import Main from './Main'

import Tree from './components/d3Tree'

ReactDOM.render(
  React.createElement(Tree),
  document.getElementById("content")
)
