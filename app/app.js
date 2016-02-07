'use strict';

require('./scripts/employeeStats.js');

var d3 = window.d3 = require('d3');
var _ = require('lodash');

var locale = require('./resources/fr-FR.js');

var margin = {
		top: 20,
		right: 20,
		bottom: 30,
		left: 50
	},
  width = 500 - margin.left - margin.right,
  height = 150 - margin.top - margin.bottom;

var svg = d3.select('body').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
	.append('g')
  	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


var focusTimeFormat = locale.timeFormat('%d %b %Y'),
	axisTimeFormat = locale.timeFormat.multi([
	  ['.%L', function(d) { return d.getMilliseconds(); }],
	  [':%S', function(d) { return d.getSeconds(); }],
	  ['%I:%M', function(d) { return d.getMinutes(); }],
	  ['%I %p', function(d) { return d.getHours(); }],
	  ['%a %d', function(d) { return d.getDay() && d.getDate() !== 1; }],
	  ['%b %d', function(d) { return d.getDate() !== 1; }],
	  ['%B', function(d) { return d.getMonth(); }],
	  ['%Y', function() { return true; }]
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

d3
	.json('./resources/2399.json', function (error, data) {
		data = _(data).map(function (entry, date) {
			return {
				count: entry.certificates['1'].count,
				target: entry.certificates['1'].target,
				date: new Date(date)
			};
		}).sortBy('date').value();

		var x = d3.time.scale().domain([_.minBy(data, 'date').date, _.maxBy(data, 'date').date]).range([0, width]).nice();
		var y = d3.scale.linear().domain([0, _.reduce(data, function (max, entry) {
			return _.max([max, entry.count, entry.target]);
		}, 0)]).range([height, 0]).nice();

		var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(width / 100);
		var yAxis = d3.svg.axis().scale(y).orient('left').ticks(height / 30);


// GRID
		var grid = svg.append('g');
		grid.append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis
        .tickSize(-height, 0)
        .tickFormat('')
      );
    grid.append('g')         
      .attr('class', 'grid')
      .call(yAxis
        .tickSize(-width, 0)
        .tickFormat('')
      );


// AXES
		svg.append('g')
			.attr('transform', 'translate(0,' + height+ ')')
			.attr('class', 'x axis')
			.call(xAxis
				.tickSize(6, 0)
				.tickFormat(axisTimeFormat)
			);
		svg.append('g')
			.attr('class', 'y axis')
			.call(
				yAxis.tickSize(6, 0)
				.tickFormat(d3.format('d'))
			);


// ---------------------------------------------------------
// LINES AND AREAS DEFINITION
// ---------------------------------------------------------

		var countLine = d3.svg.line()
	    .interpolate('monotone')
	    .x(function(d) {
	    	return x(d.date);
	    })
	    .y(function(d) {
	    	return y(d.count);
	    });
		var targetLine = d3.svg.line()
	    .interpolate('monotone')
	    .x(countLine.x())
	    .y(function(d) {
	    	return y(d.target);
	    });

// CLIPPING AREAS
		var defs = svg.append('defs');
		defs.append('clipPath')
		  .attr('id', 'clip-count')
		  .append('path')
			  .datum(data)
			  .attr('d', d3.svg.area()
			    .interpolate('monotone')
				  .x(countLine.x())
				  .y0(countLine.y())
				  .y1(0));
		defs.append('clipPath')
		  .attr('id', 'clip-target')
		  .append('path')
			  .datum(data)
			  .attr('d', d3.svg.area()
			    .interpolate('monotone')
				  .x(targetLine.x())
				  .y0(targetLine.y())
				  .y1(0));

// AREAS
		svg.append('path')
		  .datum(data)
		  .attr('class', 'count area')
		  .attr('clip-path', 'url(#clip-target)')
		  .attr('d', d3.svg.area()
		    .interpolate('monotone')
			  .x(countLine.x())
			  .y0(countLine.y())
			  .y1(height));
		svg.append('path')
		  .datum(data)
		  .attr('class', 'target area')
		  .attr('clip-path', 'url(#clip-count)')
		  .attr('d', d3.svg.area()
		    .interpolate('monotone')
			  .x(targetLine.x())
			  .y0(targetLine.y())
			  .y1(height));

// COORDINATES HIGHLIGHT PLACEHOLDER
		var highlightCoordinates = svg.append('g')
			.style('display', 'none');

// LINES
	  svg.append('path')
      .attr('class', 'target line')
      .datum(data)
      .attr('d', targetLine);
	  svg.append('path')
      .attr('class', 'count line')
      .datum(data)
      .attr('d', countLine);


// ---------------------------------------------------------
// HIGHLIGHT DEFINITION
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
			.attr('class', 'tooltip')
			.attr('text-anchor', 'middle');

		var highlightCount = highlight.append('g');
		highlightCount.append('circle') 
      .attr('class', 'count line')
      .attr('r', 4);
		highlightCount.append('text')
				.attr('class', 'tooltip')
				.attr('text-anchor', 'middle');


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
      	var d = getClosestEntry(data, x, d3.mouse(this)[0]);
			  highlightCount.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ',' +  y(d.count) + ')');
			  highlightCount.select('text')
			  	.transition().duration(100).ease(d3.ease('linear'))
			  	.attr('transform', 'translate(0, ' + (d.target > d.count ? 17 : -8) + ')')
			  	.text('SST : ' + d.count);

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
	});
