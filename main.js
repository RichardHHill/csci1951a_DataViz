
const MAX_WIDTH = Math.max(1080, window.innerWidth);
const margin = {top: 40, right: 100, bottom: 40, left: 175};

// Assumes the same graph width, height dimensions as the example dashboard. Feel free to change these if you'd like
let graph_1_width = (MAX_WIDTH / 2) - 10, graph_1_height = 250;
let graph_2_width = MAX_WIDTH - 10, graph_2_height = 400;
let graph_3_width = (MAX_WIDTH / 2) - 10, graph_3_height = 575;

initialDates = [1955,1986]
var dateRange = initialDates
var useTotal = true // Total Games vs Win Pct

document.getElementById("minWins").addEventListener("change", newMin)

function newMin(event) {
    val = event.target.value
    if (!isNaN(val)) { setData(dateRange, useTotal, parseInt(val)) }
}

$("#dateText").text(initialDates.join("-"))
    .css({"margin-left": margin.left})

$("#dateSlider").slider({
    min: 1873,
    max: 2017,
    values: initialDates,
    range: true,
    change: function(event, ui) { dateRange = ui.values; setData(dateRange, useTotal) },
    slide: function(event, ui) { $("#dateText").text(ui.values.join("-")) }
}).css({"margin-left": margin.left, "width": graph_1_width - margin.left - margin.right})

// Initialize Bar Chart

let bar_svg = d3.select("#graph1")
    .append("svg")
    .attr("width", graph_1_width)
    .attr("height", graph_1_height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)

let x = d3.scaleLinear()
    .range([0, graph_1_width - margin.left - margin.right])

let y = d3.scaleBand()
    .range([0, graph_1_height - margin.top - margin.bottom])
    .padding(0.1)

let countRef = bar_svg.append("g")

let y_axis_label = bar_svg.append("g")

let x_axis_text = bar_svg.append("text")
        .attr("transform", `translate(
            ${(graph_1_width - margin.left - margin.right) / 2},
            ${graph_1_height - margin.top - margin.bottom + 25}
        )`)
        .style("text-anchor", "middle")

let title_text = bar_svg.append("text")
    .attr("transform", `translate(
        ${(graph_1_width - margin.left - margin.right) / 2},
        ${-10}
    )`)  
    .style("text-anchor", "middle")
    .style("font-size", 15)


// Initialize Map

let path = d3.geoPath()
let projection = d3.geoEqualEarth()

let map_svg = d3.select("#graph2")
    .append("svg")
    .attr("width", graph_2_width)
    .attr("height", graph_2_height)
    .attr("viewBox", "200 200 " + graph_2_width * 1.3 + " " + graph_2_height / 2)
    .append("g")
    .attr("transform", `translate(${margin.left + 100}, ${margin.top})`)

d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(map) {
    map_svg.selectAll("path")
        .data(map.features)
        .enter()
        .append("path")
        .attr("d", d3.geoPath().projection(projection))
})

let tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

function setData(dates, total, minWins=10) {
    d3.select(".legendCells").remove()
    d3.selectAll(".meanLine").remove()
    useTotal = total
    
    if (total) {
        document.getElementById("winPct").style.display = "none"
    } else {
        document.getElementById("winPct").style.display = null
    }
    
    d3.csv("football.csv").then(function(data) {
        data = data.filter(function(d) {
            year = parseInt(d.date.substring(0,4))
            return dates[0] <= year && year <= dates[1]
        })

        fData = data.filter(function(d) { return d.away_score != d.home_score })

        for (i=0; i<fData.length; i++) {
            if (fData[i].home_score > fData[i].away_score) {
                fData[i].selected = fData[i].home_team
            } else {
                fData[i].selected = fData[i].away_team
            }
        }

        if (total) {
            function roll(v) { return v.length }
        } else {
            function roll(v) {
                if (v.length >= minWins) {
                    total_games = data.filter(function(d) { return [d.home_team, d.away_team].includes(v[0].selected) }).length
                    return Math.round(v.length / total_games * 100) / 100
                }
            }
        }

        let nestedData = d3.nest()
            .key(function(d) { return d.selected })
            .rollup(roll)
            .entries(fData)

        mapData = d3.map()

        nameChanges = new Map([
            ["United States", "USA"],
            ["China PR", "China"]
        ])

        for (i=0; i<nestedData.length; i++) {
            name = nameChanges.get(nestedData[i].key) || nestedData[i].key
            mapData.set(name, nestedData[i].value)
        }

        colorScale = d3.scaleSequential()
            .domain(d3.extent(Array.from(mapData.values())))
            .interpolator(d3.interpolateYlGnBu)
            .unknown("#000")

        colorLegend = d3.legendColor()
            .labelFormat(d3.format((total) ? ".0f": ".2f"))
            .cells(8)
            .scale(colorScale)
        
        map_svg.append("g")
            .attr("transform", `translate(50, 0)`)
            .call(colorLegend)

        map_svg.selectAll("path")
            .attr("fill", function(d) { return colorScale(mapData.get(d.properties.name) || 0) })
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9)
                tooltip.html(d.properties.name + ": " + (mapData.get(d.properties.name) || 0))
                    .style("left", d3.event.pageX + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            }).on("mouseout", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0)
            })
        
        // Select 10 Greatest for Bar Chart

        let average = d3.sum(nestedData, function(d) { return d.value }) / nestedData.length

        nestedData = nestedData.filter(function(d) { return !isNaN(d.value) })
            .sort(function(a,b) { return b.value - a.value })
            .slice(0,10)

        x.domain([0, d3.max(nestedData, function(d) { return d.value })])

        y.domain(nestedData.map(function(d) { return d.key }))

        let bars = bar_svg.selectAll("rect").data(nestedData)

        bars.enter()
            .append("rect")
            .merge(bars)
            .transition()
            .duration(1000)
            .attr("x", x(0))
            .attr("y", function(d) { return y(d.key) })
            .attr("width", function(d) { return x(d.value) })
            .attr("height", y.bandwidth())
            .style("fill", function(d) { 
                name = nameChanges.get(d.key) || d.key
                return colorScale(mapData.get(name)) 
            })

        bar_svg.append("g")
            .attr("transform", `translate(${x(average)}, 0)`)
            .append("line")
            .attr("y2", graph_1_height - margin.top - margin.bottom)
            .attr("class", "meanLine")
            .style("stroke", "#ff0000")
            .style("stroke-width", "3px")

        bar_svg.append("g")
            .attr("transform", `translate(${x(average)}, 0)`)
            .append("text")
            .attr("y", graph_1_height - margin.top - margin.bottom + 10)
            .attr("class", "meanLine")
            .style("fill", "#ff0000")
            .text("Mean: " + Math.round(average * 100) / 100)
        
        let counts = countRef.selectAll("text").data(nestedData)

        counts.enter()
            .append("text")
            .merge(counts)
            .transition()
            .duration(1000)
            .attr("x", function(d) { return x(d.value) + 10 })
            .attr("y", function(d) { return y(d.key) + 10 })
            .style("text-anchor", "start")
            .text(function(d) { return d.value })

        y_axis_label.call(d3.axisLeft(y))
        x_axis_text.text((total) ? "Wins" : "Win %")
        title_text.text("Top 10 Countries (" + dates.join("-") + ")")

        bars.exit().transition().attr("width", 0).remove()
        counts.exit().remove()
    })
}

setData(dateRange, useTotal)
