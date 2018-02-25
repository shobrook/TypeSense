var margin = {top: 30, right: 10, bottom: 50, left: 0},
width = 320,
height = 320;

var data = [{sentiment: -10, id:0, author: true},
{sentiment: 40, id:1, author: false},
{sentiment: -10, id:2, author: true},
{sentiment: -50, id:3, author: true},
{sentiment: 30, id:4, author: false},
{sentiment: 60, id:5, author: true},
{sentiment: 50, id:6, author: true},
{sentiment: -20, id:7, author: false},
{sentiment: -10, id:8, author: true},
{sentiment: 40, id:9, author: false},
{sentiment: -10, id:10, author: true},
{sentiment: -50, id:11, author: true},
{sentiment: 30, id:12, author: false},
{sentiment: 60, id:13, author: true},
{sentiment: 50, id:14, author: true},
{sentiment: -20, id:15, author: false},
{sentiment: -20, id:16, author: false}].reverse();

// Add svg to
var svg = d3.select('body').append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// set the ranges
var y = d3.scaleBand()
.range([height, 0])
.padding(0.52);

var x = d3.scaleLinear()
.range([0, width]);

// Scale the range of the data in the domains
x.domain(d3.extent(data, function (d) {
return d.sentiment;
}));
y.domain(data.map(function (d) {
return d.id;
}));

// append the rectangles for the bar chart
svg.selectAll(".bar")
.data(data)
.enter().append("rect")
.attr("class", function (d) {
  return "bar bar--" + (d.sentiment < 0 ? "negative" : "positive");
})
.attr("x", function (d) {
  return x(Math.min(5, d.sentiment * 0.5));
})
.attr("y", function (d) {
  return y(d.id);
})
.attr("width", function (d) {
  return Math.abs(x(d.sentiment * 0.5) - x(0));
})
.attr("fill", function(d) {
  if (d.author) {
    if (d.sentiment < 0) {
      return "#ff5e66";
    } else {
      return "#6dd792";
    }
  } else {
    return "rgba(0, 0, 0, 0.0)"
  }
})
.attr("stroke-linecap", "round")
.attr("stroke", function(d) {
  if (d.sentiment < 0) {
    return "#ff5e66";
  } else {
    return "#6dd792";
  }
})
.attr("stroke-width", "2px")
.attr("height", y.bandwidth())
.attr("rx", "1.5px");
