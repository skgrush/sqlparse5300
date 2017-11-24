import * as React from 'react'
import * as d3 from 'd3'
import '../styles/tree.scss'

/*
Code based on: http://www.d3noob.org/2014/01/tree-diagrams-in-d3js_11.html
*/

export default
class Tree extends React.Component<any, any> {
    constructor(props) {
        super(props)

        this.initialize = this.initialize.bind(this)
        this.update = this.update.bind(this)
    }

    initialize() {
        console.log("Initializing")
        let treeData = [
            {
                "name": "Top Level",
                "parent": "null",
                "children": [
                    {
                        "name": "Level 2: A",
                        "parent": "Top Level",
                        "children": [
                            {
                                "name": "Son of A",
                                "parent": "Level 2: A"
                            },
                            {
                                "name": "Daughter of A",
                                "parent": "Level 2: A"
                            }
                        ]
                    },
                    {
                        "name": "Level 2: B",
                        "parent": "Top Level"
                    }
                ]
            }
        ];

        // ************** Generate the tree diagram  *****************
        let margin = { top: 20, right: 120, bottom: 20, left: 120 },
            width = 960 - margin.right - margin.left,
            height = 500 - margin.top - margin.bottom;

        let i = 0;

        let tree = d3.layout.tree()
            .size([height, width]);

        let diagonal = d3.svg.diagonal()
            .projection(function (d) { return [d.x, d.y]; });

        let svg = d3.select("div#d3-tree").append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let root = treeData[0]

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
        return <div id="d3-tree"></div>
    }
}