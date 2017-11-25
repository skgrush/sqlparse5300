import * as React from 'react'
import * as d3 from 'd3'
import '../styles/tree.scss'
import Node from '../query_tree/node'

/*
Code based on: http://www.d3noob.org/2014/01/tree-diagrams-in-d3js_11.html
*/

interface TreeProps {
    root: Node
    id: string
}

interface D3Node {
    name: string
    parent: string
    children?: D3Node[]
}

function convertToD3Node(root: Node, parent: string = "null"): D3Node {
    let name = root.operation.symbolName || "NO NAME????"
    let d3Root = {
        name,
        parent,
        children: root.children.map(node => convertToD3Node(node, name))
    }

    return d3Root
}

export default
class Tree extends React.Component<TreeProps, any> {
    constructor(props) {
        super(props)

        this.initialize = this.initialize.bind(this)
        this.update = this.update.bind(this)
    }

    initialize() {
        // ************** Generate the tree diagram  *****************
        let margin = { top: 40, right: 120, bottom: 40, left: 120 },
            width = 960 - margin.right - margin.left,
            height = 960 - margin.top - margin.bottom;

        let i = 0;

        let tree = d3.layout.tree()
            .size([height, width]);

        let diagonal = d3.svg.diagonal()
            .projection(function (d) { return [d.x, d.y]; });

        let svg = d3.select(`div#d3-tree-${this.props.id}`).append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let root = convertToD3Node(this.props.root)

        this.setState({
            tree, diagonal, svg, root, i
        }, this.update)
    }
    update() {
        let tree = this.state.tree
        let root = this.state.root
        let svg = this.state.svg
        let diagonal = this.state.diagonal
        let i = this.state.i

        // Compute the new tree layout.
        let nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function (d) { d.y = d.depth * 100; });

        // Declare the nodesâ€¦
        let node = svg.selectAll("g.node")
            .data(nodes, function (d) { return d.id || (d.id = ++i); });

        // Enter the nodes.
        let nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        nodeEnter.append("circle")
            .attr("r", 10)
            .style("fill", "#fff");

        nodeEnter.append("text")
            .attr("y", function (d) {
                return d.children || d._children ? -18 : 18;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function (d) { return d.name; })
            .style("fill-opacity", 1);

        // Declare the linksâ€¦
        let link = svg.selectAll("path.link")
            .data(links, function (d) { return d.target.id; });

        // Enter the links.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", diagonal);
    }

    componentDidMount() {
        this.initialize()
    }

    render() {
        return <div id={`d3-tree-${this.props.id}`}></div>
    }
}