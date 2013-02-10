"use strict";

function last(array) {
	return array[array.length - 1];
}

function stub(e) {
	return false;
}

function isInteger(n) {
	return n === +n && n === (n | 0);
}

var sys = {
	selectionStart : null,
	selectionEnd : null,
	draggingStart : null,
};

var table;

$(function() {
	table = document.getElementById('table');
	// cursor keys only in keydown
	// $(document).on("keydown", keypress);
	// disable selection on the page
	$(document).on("selectstart", stub);

	// $(document).on("click", "#table >tbody >tr >td", function(e) {
	// $(this).toggleClass('cell_highlight_over');
	// console.debug('Mouse click: R' + (this.parentNode.rowIndex - 2) + 'C' + (this.cellIndex - 2));
	// });

	$(document).on("mousedown", "#table>tbody>tr>td.cell", function(e) {
		if (e.which != 1)
			// need left button
			return;
		sys.isMouseDown = true;
		sys.selectionStart = this;
		// console.debug('Mouse down: R' + sys.r1 + 'C' + sys.c1);
		on_mouse_over_cell(this);
		// $(document).on("mousedown", stub);
		// $(document).on("selectstart", stub);
	});

	$(document).on("mouseup", "#table>tbody>tr>td", function(e) {
		if (!sys.isMouseDown)
			return;
		// console.debug('Mouse up: R' + (this.parentNode.rowIndex - 2) + 'C' + (this.cellIndex - 2));
		// $(document).off("mousedown", stub);
		// $(document).off("selectstart", stub);
		sys.isMouseDown = false;
	});

	$(document).on("mouseover", "#table>tbody>tr>td", function(e) {
		$("#status_bar").text('' + this.parentNode.rowIndex + ', ' + this.cellIndex);
		on_mouse_over_cell(this);
	});

	function on_mouse_over_cell(selectionEnd) {
		if (!sys.isMouseDown)
			return;
		// console.debug('Mouse over: R' + r2 + 'C' + c2);
		if (sys.selectionEnd === selectionEnd)
			// already highlighted
			return;
		set_selection(undefined, selectionEnd);
	}

	function set_selection(selectionStart, selectionEnd) {
		sys.selectionStart = selectionStart || sys.selectionStart;
		sys.selectionEnd = selectionEnd || sys.selectionEnd;

		$("#table>tbody>tr>td").removeClass('cell_selected');
		var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
		select_cells(_.r1, _.c1, _.r2, _.c2);
	}

	function reset_selection() {
		clear_selection();
		sys.selectionStart = sys.selectionEnd = null;
	}

	function normalize_selection(selectionStart, selectionEnd) {
		var r1 = selectionStart.parentNode.rowIndex - 2;
		var c1 = selectionStart.cellIndex - 2;
		var r2 = selectionEnd.parentNode.rowIndex - 2;
		var c2 = selectionEnd.cellIndex - 2;
		return {
			r1 : Math.max(Math.min(r1, r2), 0),
			c1 : Math.max(Math.min(c1, c2), 0),
			r2 : Math.max(r1, r2, 0),
			c2 : Math.max(c1, c2, 0),
		}
	}

	function clear_selection() {
		$("#table>tbody>tr>td").removeClass('cell_selected');
	}

	/* indexes do not take into account group and header cells */
	function select_cells(r1, c1, r2, c2) {
		clear_selection();
		function select(_r1, _c1, _r2, _c2) {
			// not very nice iterative solution, but it's simple and it works. A recursive way would be nice
			for (var r = _r1; r <= _r2; r++) {
				for (var c = _c1; c <= _c2; c++) {
					var cell = table.rows[r + 2].cells[c + 2];
					var __r2 = Math.max(_r2, r + cell.rowSpan - 1)
					var __c2 = Math.max(_c2, c + cell.colSpan - 1)
					if (__r2 > _r2 || __c2 > _c2) {
						select(_r1, _c1, __r2, __c2);
						return;
					}
					cell = $(cell);
					if (cell.hasClass('hidden_cell')) {
						var _ = cell.attr('data-merged').split(',');
						var __r1 = Math.min(parseInt(_[0]) - 2, _r1);
						var __c1 = Math.min(parseInt(_[1]) - 2, _c1);
						if (__r1 < _r1 || __c1 < _c1) {
							select(__r1, __c1, _r2, _c2);
							return;
						}
					}
					$(cell).addClass('cell_selected');
				}
			}
		}
		select(r1, c1, r2, c2);
	}


	$(document).on("click", "#table>tbody>tr>td.colheader", function(e) {
		if (e.shiftKey)
			return;
		var rows = table.rows;
		set_selection(rows[2].cells[this.cellIndex], rows[rows.length - 1].cells[this.cellIndex]);
	});

	/* indexes do not take into account group and header cells */
	function merge_cells(r1, c1, r2, c2) {
		reset_selection();
		for (var r = r1; r <= r2; r++) {
			for (var c = c1; c <= c2; c++) {
				if (r == r1 && c == c1)
					continue;
				var cell = $(table.rows[r + 2].cells[c + 2]);
				cell.addClass('hidden_cell');
				cell.attr('data-merged', [r1 + 2, c1 + 2].join(','));
			}
		}
		var cell = table.rows[r1 + 2].cells[c1 + 2];
		cell.colSpan = c2 - c1 + 1;
		cell.rowSpan = r2 - r1 + 1;
	}

	function split_cell() {
	}


	$.contextMenu({
		selector : '#table>tbody>tr>td.cell_selected',
		build : function($trigger, e) {
			return {
				items : {
					merge_cells : {
						name : "Merge selected cells",
						callback : function(e) {
							var selectionStart = sys.selectionStart
							var _ = normalize_selection(selectionStart, sys.selectionEnd);
							merge_cells(_.r1, _.c1, _.r2, _.c2);
							set_selection(selectionStart, selectionStart);
						}
					},
				}
			}
		}
	});

	$(document).on("mousedown", "#table>tbody>tr>td.colheader,#table>tbody>tr>td.rowheader", function(e) {
		if (!e.shiftKey)
			return;
		sys.draggingStart = $(this);
		sys.draggingStart.data("startX", e.pageX);
		sys.draggingStart.data("startY", e.pageY);
		sys.draggingStart.data("startWidth", $(this).width());
		sys.draggingStart.data("startHeight", $(this).height());
	});

	$(document).on("mousemove", function(e) {
		if (sys.draggingStart) {
			if (sys.draggingStart.hasClass("colheader"))
				sys.draggingStart.width(sys.draggingStart.data("startWidth") + (e.pageX - sys.draggingStart.data("startX")));
			else
				sys.draggingStart.height(sys.draggingStart.data("startHeight") + (e.pageY - sys.draggingStart.data("startY")));
		}
	});

	$(document).on("mouseup", function() {
		if (sys.draggingStart) {
			sys.draggingStart = null;
		}
	});

	addColumns(10);
	addRows(10);
});

var newCell = '<td class="cell">#</td>';
var newColGroup = '<td class="colgroup">&nbsp;</td>';
var newColHeader = '<td class="colheader">1</td>';
var newRowGroup = '<td class="rowgroup">&nbsp;</td>';
var newRowHeader = '<td class="rowheader">1</td>';

function addRows(count, index) {
	count = count || 1;
	if (index === undefined)
		index = -1
	var colCount = table.rows[0].cells.length;
	for (var i = 0; i < count; i++) {
		var row = table.insertRow(index)
		var td = row.insertCell(-1)
		td.outerHTML = newRowGroup
		td = row.insertCell(-1)
		td.outerHTML = newRowHeader
		for (var colNo = 0; colNo < colCount - 2; colNo++) {
			td = row.insertCell(-1)
			td.outerHTML = newCell
		}
	}
	// update numbering
	var rowCount = table.rows.length;
	if (index == -1)
		index = rowCount - count;
	for (; index < rowCount; index++)
		table.rows[index].cells[1].innerHTML = index;
}

function addColumns(count, index) {
	count = count || 1;
	if (index === undefined)
		index = -1
	var rowCount = table.rows.length;
	for (var i = 0; i < count; i++)
		for (var rowNo = 0; rowNo < rowCount; rowNo++) {
			var row = table.rows[rowNo];
			var td = row.insertCell(index);
			if (rowNo == 0)
				td.outerHTML = newColGroup
			else if (rowNo == 1)
				td.outerHTML = newColHeader
			else
				td.outerHTML = newCell
		}
	// update numbering
	var colCount = table.rows[0].cells.length;
	if (index == -1)
		index = colCount - count;
	for (; index < colCount; index++) {
		table.rows[1].cells[index].innerHTML = index;
	}
}
