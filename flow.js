


$("#dateText2").text(1964)
    .css({"margin-left": margin.left})

$("#dateSlider2").slider({
    min: 1873,
    max: 2017,
    value: 1964,
    change: function(event, ui) { setFlowData(ui.value) },
    slide: function(event, ui) { $("#dateText2").text(ui.value) }
}).css({"margin-left": margin.left, "width": graph_3_width - margin.left - margin.right})


let flow_svg = d3.select("#graph3")
    .append("svg")
    .attr("width", graph_3_width + margin.left + margin.right)
    .attr("height", graph_3_height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)

let flow_title_text = flow_svg.append("text")
    .attr("transform", `translate(
        ${(graph_3_width - margin.left - margin.right) / 2},
        ${-10}
    )`)  
    .style("text-anchor", "middle")
    .style("font-size", 15)

function setFlowData(date) {
    d3.select(".node").remove()
    d3.select(".edge").remove()

    d3.csv("football.csv").then(function(data) {
        data = data.filter(function(d) { return date === parseInt(d.date.substring(0,4)) })
        
        preLinks = new Set()
        preNodes = new Set()
        for (i=0; i<data.length; i++) {
            home = data[i].home_team
            away = data[i].away_team
            
            if (home > away) {
                preLinks.add([away, home])
            } else {
                preLinks.add([home, away])
            }

            preNodes.add(home)
            preNodes.add(away)
        }

        links = []
        nodes = []

        for (item of preLinks) {
            links.push({"source": item[0], "target": item[1]})
        }

        for (item of preNodes) {
            nodes.push({"name": item})
        }       

        let link = flow_svg.append("g")
            .attr("class", "edge")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .style("stroke", "aaa")
            .style("stroke-width", 2)

        let node = flow_svg.append("g")
            .attr("class", "node")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g")

        node.append("circle")
            .attr("r", 4)
            .attr("fill", "#ff00ff")
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9)
                tooltip.html(d.name)
                    .style("left", d3.event.pageX + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            }).on("mouseout", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0)
            })

        node.append("text")
            .text(function(d) { return d.name })
            .attr("class", "nodeName")
            .attr("x", 4)
            .attr("y", 2)
            .style("opacity", 0.3)

        d3.forceSimulation(nodes)
            .force("link", d3.forceLink()
                .id(function(d) {return d.name })
                .links(links)
            )
            .force("charge", d3.forceManyBody().strength(-2))
            .force("center", d3.forceCenter((graph_3_width-margin.right)/2, (graph_3_height-margin.bottom)/2))
            .force("link", d3.forceLink(links).distance(30).strength(2))
            .on("end", ticked)
        
        function ticked() {
            link.attr("x1", function(d) { return d.source.x })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; })
        
            node.attr("transform", function(d) { return `translate(${d.x}, ${d.y})`})
        }

        flow_title_text.text("How Are Countries Connected By Football in " + date + "?")
    })
}

setFlowData(1964)
