const createGraph = (data) => {
	const sentimentTable = data.reverse();

	let margin = {"top": 0, "right": 0, "bottom": 0, "left": 0}
	let width = 400;
	let height = 320;

	var graphSVG = d3.select("#graph")
									 .append("svg")
									 .attr("width", width + margin["left"] + margin["right"])
									 .attr("height", height + margin["top"] + margin["bottom"])
									 .append('g')
									 .attr("transform", "translate(" + margin["left"] + ',' + margin["top"] + ')');

	// Sets the ranges
	var y = d3.scaleBand().range([height, 0]).padding(0.52);
	var x = d3.scaleLinear().range([0, width]);

	// Scale the range of the data in the domains
	x.domain(d3.extent(sentimentTable, (table) => {
		return table["sentiment"];
	}));
	y.domain(sentimentTable.map((table) => {
		return table["id"];
	}));

	// Appends the rectangles for the bar chart
	graphSVG.selectAll(".bar")
					.data(sentimentTable)
					.enter()
					.append("rect")
					.attr("class", (table) => {
						return "bar bar--" + (table["sentiment"] < 0 ? "negative" : "positive");
					})
					.attr('x', (table) => {
						return x(Math.min(7, table["sentiment"] * 0.5));
					})
					.attr('y', (table) => {
						return y(table["id"]);
					})
					.attr("width", (table) => {
						return Math.abs(x(table["sentiment"] * 0.55) - x(0));
					})
					.attr("fill", (table) => {
						if (table["received"]) {
							if (table["sentiment"] < 0) {
								return "#FF5E66";
							} else {
								return "#6DD792";
							}
						} else {
							return "RGBA(0, 0, 0, 0.0)";
						}
					})
					.attr("stroke-linecap", "round")
					.attr("stroke", (table) => {
						if (table["sentiment"] < 0) {
							return "#FF5E66";
						} else {
							return "#6DD792";
						}
					})
					.attr("stroke-width", "2px")
					.attr("height", y.bandwidth())
					.attr("rx", "1.5px"); // QUESTION: What's this?

	// Appends the X and Y axes
	graphSVG.append("line")
					.attr("x1", width / 2)
					.attr("y1", 0)
					.attr("x2", width / 2)
					.attr("y2", height)
					.style("stroke-width", 2)
					.style("stroke", "#F1F0F0")
					.style("fill", '1');
	graphSVG.append("line")
					.attr("x1", 0)
					.attr("y1", height - 1)
					.attr("x2", width)
					.attr("y2", height - 1)
					.style("stroke-width", 2)
					.style("stroke", "#F1F0F0")
					.style("fill", '1');
}

// Pulls the current conversation's sentiment table and graphs it
chrome.storage.local.get("currentThread", (sentimentTable) => {
	if (sentimentTable["currentThread"].length < 17) {
		document.getElementById("box").style.display = "none";
		document.getElementById("error-box").style.display = "inline";
	} else {
		createGraph(sentimentTable["currentThread"]);
	}
});
