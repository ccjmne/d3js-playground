'use strict';
/* jshint camelcase: false */

require('./scripts/employeeStats.js');

var d3 = window.d3 = require('d3');
var _ = require('lodash');

var locale = require('./resources/fr-FR.js');
var focusTimeFormat = locale.timeFormat('%d %b %Y'),
	axisTimeFormat = locale.timeFormat.multi([
	  ['.%L', function (d) { return d.getMilliseconds(); }],
	  [':%S', function (d) { return d.getSeconds(); }],
	  ['%I:%M', function (d) { return d.getMinutes(); }],
	  ['%I %p', function (d) { return d.getHours(); }],
	  ['%a %d', function (d) { return d.getDay() && d.getDate() !== 1; }],
	  ['%b %d', function (d) { return d.getDate() !== 1; }],
	  ['%B', function (d) { return d.getMonth(); }],
	  ['%Y', function () { return true; }]
	]);

var dateBisector = d3.bisector(function (d) {
	return d.date;
}).left;

function getClosestEntry (data, scale, pos) {
	var date = scale.invert(pos),
		idx = dateBisector(data, date),
		hi = data[idx],
		lo = data[idx -1];

	if (hi === undefined) {
		return lo;
	}

	if (lo === undefined) {
		return hi;
	}

	return date - lo.date > hi.date - date ? hi : lo;
}

var cert, certData;

var certificates;
d3.json('./resources/certificates.json', function (error, data) {
	certificates = data;

	var select = d3.select('body').append('select');
	select.selectAll('option').data(_.values(certificates)).enter().append('option').attr('value', function (d) { return d.cert_pk; }).text(function (d) { return d.cert_short; });
	select.node().addEventListener('change', function () {
		displayData(this.value);
	}, false);
});


// ---------------------------------------------------------
// SVG CREATION
// ---------------------------------------------------------

var margin = {
		top: 20,
		right: 100,
		bottom: 30,
		left: 50
	},
  width = 580 - margin.left - margin.right,
  height = 150 - margin.top - margin.bottom;

var svg = d3.select('body').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
	.append('g')
  	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

var x = d3.time.scale().range([0, width]).nice();
var y = d3.scale.linear().range([height, 0]).nice();

var xAxis = d3.svg.axis().orient('bottom').ticks(width / 100);
var yAxis = d3.svg.axis().orient('left').ticks(height / 30);



// GRID
var grid = svg.append('g');
grid.append('g')
  .attr('class', 'grid x')
  .attr('transform', 'translate(0,' + height + ')');
grid.append('g')         
  .attr('class', 'grid y');

// AXES
svg.append('g')
	.attr('transform', 'translate(0,' + height+ ')')
	.attr('class', 'x axis');
svg.append('g')
	.attr('class', 'y axis');



// ---------------------------------------------------------
// LINES AND AREAS FUNCTIONS DEFINITION
// ---------------------------------------------------------

var countLine = d3.svg.line()
  .interpolate('monotone')
  .x(function (d) { return x(d.date); })
  .y(function (d) { return y(d.count); });
var targetLine = d3.svg.line()
  .interpolate('monotone')
  .x(countLine.x())
  .y(function (d) { return y(d.target); });

var areaAboveCount = d3.svg.area()
  .interpolate('monotone')
  .x(countLine.x())
  .y0(countLine.y())
  .y1(0);
var areaAboveTarget = d3.svg.area()
  .interpolate('monotone')
  .x(targetLine.x())
  .y0(targetLine.y())
  .y1(0);
var areaBelowCount = d3.svg.area()
  .interpolate('monotone')
  .x(countLine.x())
  .y0(countLine.y())
  .y1(height);
var areaBelowTarget = d3.svg.area()
  .interpolate('monotone')
  .x(targetLine.x())
  .y0(targetLine.y())
  .y1(height);



// ---------------------------------------------------------
// SVG ELEMENTS PLACEHOLDERS
// ---------------------------------------------------------

// CLIPPING AREAS
var defs = svg.append('defs');
defs.append('clipPath')
  .attr('id', 'clip-count')
  .append('path');
defs.append('clipPath')
  .attr('id', 'clip-target')
  .append('path');

// AREAS
svg.append('path')
  .attr('class', 'count area')
  .attr('clip-path', 'url(#clip-target)');
svg.append('path')
  .attr('class', 'target area')
  .attr('clip-path', 'url(#clip-count)');

// COORDINATES HIGHLIGHT PLACEHOLDER
var highlightCoordinates = svg.append('g')
	.style('display', 'none');

// LINES
svg.append('path')
  .attr('class', 'target line');
svg.append('path')
  .attr('class', 'count line');



// ---------------------------------------------------------
// HIGHLIGHT ELEMENTS
// ---------------------------------------------------------

var highlight = svg.append('g')
	.style('display', 'none');

var highlightAbscissa = highlightCoordinates.append('g');
highlightAbscissa.append('path').attr('d', 'M0,0V' + height)
	.attr('class', 'highlight-coordinates');
var highlightAbscissaTick = highlightAbscissa.append('g').attr('class', 'axis');
highlightAbscissaTick.append('path').attr('d', 'M0,' + height + 'v15');
highlightAbscissaTick.append('text').attr('transform', 'translate(0, ' + (height + 25) + ')').attr('text-anchor', 'middle');

var highlightOrdinateCount = highlightCoordinates.append('path')
	.attr('d', 'M0,0H' + width)
	.attr('class', 'highlight-coordinates');
var highlightOrdinateTarget = highlightCoordinates.append('path')
	.attr('d', 'M0,0H' + width)
	.attr('class', 'highlight-coordinates');

var highlightTarget = highlight.append('g');
highlightTarget.append('circle') 
  .attr('class', 'target line')
  .attr('r', 4);
highlightTarget.append('text')
	.attr('class', 'target')
	.attr('text-anchor', 'middle');

var highlightCount = highlight.append('g');
highlightCount.append('circle') 
  .attr('class', 'count line')
  .attr('r', 4);
highlightCount.append('text')
	.attr('class', 'count')
	.attr('text-anchor', 'middle');

var legend = svg.append('g').attr('transform', 'translate(' + width + ', ' + height/2 + ')').style('fill', 'black');
legend.append('path').attr('d', 'M10,-10h40').attr('class', 'line count');
//legend.append('circle').attr('r', 4).attr('cx', 30).attr('cy', -10).attr('class', 'line count');
var certLegend = legend.append('text').attr('class', 'count').attr('transform', 'translate(55, -5)');
legend.append('path').attr('d', 'M10,10h40').attr('class', 'line target').style('shape-rendering', 'crispEdges');
//legend.append('circle').attr('r', 4).attr('cx', 30).attr('cy', 10).attr('class', 'line target');
legend.append('text').attr('class', 'target').attr('transform', 'translate(55, 15)').text('Cible');



// ---------------------------------------------------------
// HOVERING ZONE
// ---------------------------------------------------------

svg.append('rect')
  .attr('width', width)
  .attr('height', height)
  .style('fill', 'none')
  .style('pointer-events', 'all')
  .on('mouseover', function () {
  	highlight.style('display', null);
  	highlightCoordinates.style('display', null);
  	grid.style('display', 'none');
  })
  .on('mouseout', function () {
  	highlight.style('display', 'none');
  	highlightCoordinates.style('display', 'none');
  	grid.style('display', null);
  })
  .on('mousemove', function () {
		var d = getClosestEntry(certData, x, d3.mouse(this)[0]);
	  highlightCount.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ',' +  y(d.count) + ')');
	  highlightCount.select('text')
	  	.transition().duration(100).ease(d3.ease('linear'))
	  	.attr('transform', 'translate(0, ' + (d.target > d.count ? 17 : -8) + ')')
	  	.text(cert.cert_short + ' : ' + d.count);

	  highlightTarget.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ',' +  y(d.target) + ')');
	  highlightTarget.select('text')
	  	.transition().duration(100).ease(d3.ease('linear'))
	  	.attr('transform', 'translate(0, ' + (d.target > d.count ? -8 : 17) + ')')
	  	.text('Cible : ' + d.target);

		highlightAbscissa.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ', 0)');
		highlightOrdinateCount.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(0, ' + y(d.count) + ')');
		highlightOrdinateTarget.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(0, ' + y(d.target) + ')');

		highlightAbscissaTick.select('text').text(focusTimeFormat(d.date));
	});



function displayData (cert_pk) {
	d3.json('./resources/2399.json', function (error, data) {
		cert = certificates[cert_pk];
		certData = _(data).map(function (entry, date) {
			return {
				count: entry.certificates[cert_pk].count,
				target: entry.certificates[cert_pk].target,
				date: new Date(date)
			};
		}).sortBy('date').value();

		x.domain([_.minBy(certData, 'date').date, _.maxBy(certData, 'date').date]).nice();
		y.domain([0, _.reduce(certData, function (max, entry) {
			return _.max([max, entry.count, entry.target]);
		}, 0)]).nice();

		xAxis.scale(x);
		yAxis.scale(y);

	  svg.select('.x.axis').transition().duration(1000).call(xAxis.tickSize(6, 0).tickFormat(axisTimeFormat));
		svg.select('.y.axis').transition().duration(1000).call(yAxis.tickSize(6, 0).tickFormat(d3.format('d')));

		svg.select('.grid.x').transition().duration(1000).call(xAxis.tickSize(-height, 0).tickFormat(''));
	  svg.select('.grid.y').transition().duration(1000).call(yAxis.tickSize(-width, 0).tickFormat(''));

	  svg.select('#clip-count path').transition().duration(1000).attr('d', areaAboveCount(certData));
	  svg.select('#clip-target path').transition().duration(1000).attr('d', areaAboveTarget(certData));
	  svg.select('.count.area').transition().duration(1000).attr('d', areaBelowCount(certData));
	  svg.select('.target.area').transition().duration(1000).attr('d', areaBelowTarget(certData));

	  svg.select('.target.line').transition().duration(1000).attr('d', targetLine(certData));
	  svg.select('.count.line').transition().duration(1000).attr('d', countLine(certData));

	  certLegend.text(cert.cert_short);
	});
}

displayData('1');
