'use strict';

var d3 = window.d3 = require('d3');
var _ = require('lodash');

var locale = require('../resources/fr-FR.js');

var margin = {
		top: 20,
		right: 20,
		bottom: 30,
		left: 50
	},
  width = 500 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

var svg = d3.select('body').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
	.append('g')
  	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


var focusTimeFormat = locale.timeFormat('%b %Y'),
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

function statusColor (status) {
	switch (status) {
		case 'danger': return 'red';
		case 'warning': return 'orange';
		case 'success': return 'green';
		default: return 'grey';
	}
}

function statusText (status) {
	switch (status) {
		case 'danger': return 'certification expiree';
		case 'warning': return 'expire sous 6 mois';
		case 'success': return 'certification valide';
		default: return 'jamais forme(e)';
	}
}

d3
	.json('../resources/00009408.json', function (error, data) {
		data = _(data).map(function (entry, date) {
			return {
				validityStatus: entry.certificates['1'] ? entry.certificates['1'].validityStatus : 'none',
				date: new Date(date)
			};
		}).sortBy('date').value();

		var x = d3.time.scale().domain([_.minBy(data, 'date').date, _.maxBy(data, 'date').date]).range([0, width]).nice();
		var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(width / 100);


// GRID
		var grid = svg.append('g');
		grid.append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis
        .tickSize(-height, 0)
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


// ---------------------------------------------------------
// LINES AND AREAS DEFINITION
// ---------------------------------------------------------

		var countLine = d3.svg.line()
	    .x(function(d) {
	    	return x(d.date);
	    })
	    .y(1);

		function segment (entries) {
			return _(entries).tail().reduce(function (segments, entry) {
				var segment = _.last(segments);
				if(entry.validityStatus !== _.last(segment).validityStatus) {
					segments.push([entry]);
				}

				segment.push(entry);
				return segments;
			}, [[_.first(entries)]]);
		}

    svg.append('g').selectAll('path')
      .data(segment(data))
	    .enter().append('path')
	      .attr('class', 'count area')
			  .attr('d', d3.svg.area()
				  .x(countLine.x())
				  .y0(countLine.y())
				  .y1(height))
			  .style('fill', function (d) {
			  	return statusColor(d[0].validityStatus);
			  });

// COORDINATES HIGHLIGHT PLACEHOLDER
		var highlightCoordinates = svg.append('g')
			.style('display', 'none')
			.attr('class', 'coordinates');

	  svg.append('g').selectAll('path')
      .data(segment(data))
	    .enter().append('path')
	      .attr('d', countLine)
	      .attr('class', 'count line')
	      .style('stroke', function (d) {
			  	return statusColor(d[0].validityStatus);
			  });


// ---------------------------------------------------------
// HIGHLIGHT DEFINITION
// ---------------------------------------------------------

		var highlight = svg.append('g')
			.style('display', 'none');

		var highlightAbscissa = highlightCoordinates.append('path')
			.attr('d', 'M0,0V' + height);

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
			  highlightCount.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ',' +  1 + ')');
			  highlightCount.select('text')
			  	.transition().duration(100).ease(d3.ease('linear'))
			  	.attr('transform', 'translate(0, -8)')
			  	.text('SST : ' + statusText(d.validityStatus))
			  	.style('fill', statusColor(d.validityStatus));
		  	highlightCount.select('circle').style('stroke', statusColor(d.validityStatus));

		  	highlightAbscissa.transition().duration(100).ease(d3.ease('linear')).attr('transform', 'translate(' + x(d.date) + ', 0)');
			});
	});
