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
	r1 : null,
	c1 : null,
	r2 : null,
	rc : null,
	isMouseDown : null,
	selectionStart : null,
	selectionEnd : null,
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
		var _ = normalize_selection(sys.selectionStart.parentNode.rowIndex - 2, sys.selectionStart.cellIndex - 2, sys.selectionEnd.parentNode.rowIndex - 2, sys.selectionEnd.cellIndex - 2);
		select_cells(_.r1, _.c1, _.r2, _.c2);
	}

	function reset_selection() {
		clear_selection();
		sys.selectionStart = sys.selectionEnd = null;
	}

	function normalize_selection(r1, c1, r2, c2) {
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
		var rows = table.rows;
		for (var r = r1; r <= r2; r++) {
			for (var c = c1; c <= c2; c++) {
				var cell = rows[r + 2].cells[c + 2];
				$(cell).addClass('cell_selected');
			}
		}
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
				var cell = table.rows[r + 2].cells[c + 2];
				$(cell).addClass('hidden_cell');
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
							var _ = normalize_selection(selectionStart.parentNode.rowIndex - 2, selectionStart.cellIndex - 2, sys.selectionEnd.parentNode.rowIndex - 2, sys.selectionEnd.cellIndex - 2);
							merge_cells(_.r1, _.c1, _.r2, _.c2);
							set_selection(selectionStart, selectionStart);
						}
					},
				}
			}
		}
	});

	var start = null;

	$(document).on("mousedown", "#table>tbody>tr>td.colheader,#table>tbody>tr>td.rowheader", function(e) {
		if (!e.shiftKey)
			return;
		start = $(this);
		start.data("startX", e.pageX);
		start.data("startY", e.pageY);
		start.data("startWidth", $(this).width());
		start.data("startHeight", $(this).height());
		// $(start).addClass("resizing");
	});

	$(document).on("mousemove", function(e) {
		if (start) {
			if (start.hasClass("colheader"))
				start.width(start.data("startWidth") + (e.pageX - start.data("startX")));
			else
				start.height(start.data("startHeight") + (e.pageY - start.data("startY")));
		}
	});

	$(document).on("mouseup", function() {
		if (start) {
			// $(start).removeClass("resizing");
			start = null;
		}
	});

	addColumns(10);
	addRows(10);
});

var newCell = '<td class="cell">#</td>',
	newColGroup = '<td class="colgroup">&nbsp;</td>',
	newColHeader = '<td class="colheader">1</td>',
	newRowGroup = '<td class="rowgroup">&nbsp;</td>',
	newRowHeader = '<td class="rowheader">1</td>';

function addRows(count, index) {
	count = count || 1;
	if (index === undefined)
		index = -1
	var colCount = last(table.rows).cells.length;
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
}
