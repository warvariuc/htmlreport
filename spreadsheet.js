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
	r1 : null,
	c1 : null,
	r2 : null,
	c2 : null,
};

var table;

$(function() {
	table = document.getElementById('table');
	// cursor keys only in keydown
	// $(document).on("keydown", keypress);
	// disable selection on the page
	$(document).on("selectstart", stub);

	$(document).on("mousedown", "#table>tbody>tr>td", function(e) {
		if (e.which != 1 || e.shiftKey || e.altKey || e.ctrlKey)
			// need left button without keyboard modifiers
			return;
		sys.isMouseDown = true;
		sys.selectionStart = this;
		on_mouse_over_cell(this);
		// $(document).on("mousedown", stub);
	});

	$(document).on("mouseup", "#table>tbody>tr>td", function(e) {
		if (!sys.isMouseDown)
			return;
		// $(document).off("mousedown", stub);
		sys.isMouseDown = false;
	});

	$(document).on("mouseover", "#table>tbody>tr>td", function(e) {
		// $("#status_bar").text('' + this.parentNode.rowIndex + ', ' + this.cellIndex);
		on_mouse_over_cell(this);
	});

	function on_mouse_over_cell(selectionEnd) {
		if (sys.isMouseDown && sys.selectionEnd !== selectionEnd)
			set_selection(sys.selectionStart, selectionEnd);
	}

	function set_selection(selectionStart, selectionEnd) {

		function select(r1, c1, r2, c2) {
			sys.selectionHasMergedCells = false;
			sys.r1 = r1;
			sys.c1 = c1;
			sys.r2 = r2;
			sys.c2 = c2;
			// not very nice iterative solution, but it's simple and it works. A recursive solution would be nicer.
			for (var r = r1; r <= r2; r++) {
				for (var c = c1; c <= c2; c++) {
					var cell = table.rows[r].cells[c];
					var _r2 = Math.max(r2, r + cell.rowSpan - 1)
					var _c2 = Math.max(c2, c + cell.colSpan - 1)
					if (_r2 > r2 || _c2 > c2) {
						select(r1, c1, _r2, _c2);
						return;
					}
					if (cell.classList.contains('hidden_cell')) {
						sys.selectionHasMergedCells = true;
						var _ = cell.getAttribute('data-merged').split(',');
						var _r1 = Math.min(parseInt(_[0]), r1);
						var _c1 = Math.min(parseInt(_[1]), c1);
						if (_r1 < r1 || _c1 < c1) {
							select(_r1, _c1, r2, c2);
							return;
						}
					}
					cell.classList.add('cell_selected');
				}
			}
		}

		clear_selection();
		sys.selectionStart = selectionStart;
		sys.selectionEnd = selectionEnd;
		var _ = normalize_selection(selectionStart, selectionEnd);
		select(Math.max(_.r1, 2), Math.max(_.c1, 2), _.r2, _.c2);

	}

	function clear_selection() {
		if (sys.r1 === null)
			return;
		for (var rowNo = sys.r1; rowNo <= sys.r2; rowNo++) {
			for (var colNo = sys.c1; colNo <= sys.c2; colNo++)
				table.rows[rowNo].cells[colNo].classList.remove('cell_selected');
		}
		sys.r1 = null;
		sys.c1 = null;
		sys.r2 = null;
		sys.c2 = null;
	}

	function reset_selection() {
		clear_selection();
		sys.selectionStart = sys.selectionEnd = null;
	}

	function normalize_selection(selectionStart, selectionEnd) {
		var r1, c1, r2, c2;
		if (selectionStart.classList.contains('cell')) {
			// a simple cell was the start
			r1 = selectionStart.parentNode.rowIndex;
			c1 = selectionStart.cellIndex;
			r2 = selectionEnd.parentNode.rowIndex;
			c2 = selectionEnd.cellIndex;
		} else if (selectionStart.classList.contains('colheader')) {
			// a column header was the start
			r1 = 2;
			c1 = selectionStart.cellIndex;
			r2 = table.rows.length - 1;
			c2 = selectionEnd.cellIndex;
		} else if (selectionStart.classList.contains('rowheader')) {
			// a row header was the start
			r1 = selectionStart.parentNode.rowIndex;
			c1 = 2;
			r2 = selectionEnd.parentNode.rowIndex;
			c2 = table.rows[0].cells.length - 1;
		}
		return {
			r1 : Math.min(r1, r2),
			c1 : Math.min(c1, c2),
			r2 : Math.max(r1, r2),
			c2 : Math.max(c1, c2),
		}
	}

	function merge_selection() {
		var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
		for (var r = _.r1; r <= _.r2; r++) {
			for (var c = _.c1; c <= _.c2; c++) {
				if (r == _.r1 && c == _.c1)
					continue;
				var cell = table.rows[r].cells[c];
				cell.classList.add('hidden_cell');
				cell.setAttribute('data-merged', [_.r1, _.c1].join(','));
			}
		}
		var cell = table.rows[_.r1].cells[_.c1];
		cell.colSpan = _.c2 - _.c1 + 1;
		cell.rowSpan = _.r2 - _.r1 + 1;
		sys.selectionHasMergedCells = true;
	}

	function split_selection() {
		for (var r = sys.r1; r <= sys.r2; r++) {
			for (var c = sys.c1; c <= sys.c2; c++) {
				var cell = table.rows[r].cells[c];
				cell.classList.remove('hidden_cell');
				cell.removeAttribute('data-merged');
				cell.rowSpan = 1;
				cell.colSpan = 1;
			}
		}
		sys.selectionHasMergedCells = false;
	}


	$.contextMenu({
		selector : '#table>tbody>tr>td.cell_selected',
		build : function($trigger, e) {
			if (sys.selectionHasMergedCells)
				return {
					items : {
						split_cells : {
							name : "Split merged cells in the selection",
							callback : split_selection,
						},
					}
				}
			else if (sys.selectionStart !== sys.selectionEnd)
				return {
					items : {
						merge_selection : {
							name : "Merge selected cells",
							callback : merge_selection,
						},
					}
				}
		}
	});

	$.contextMenu({
		selector : '#table>tbody>tr>td.colheader',
		build : function($trigger, e) {
			var el = $trigger[0];
			if (!sys.selectionStart)
				set_selection(el, el);
			else {
				if (sys.selectionStart.classList.contains('colheader')) {
					var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
					if (el.cellIndex < _.c1 || el.cellIndex > _.c2)
						set_selection(el, el);
				} else
					set_selection(el, el);
			}
			return {
				items : {
					insert_columns : {
						name : "Insert columns",
						callback : function(e) {
							var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
							reset_selection();
							addColumns(_.c2 - _.c1 + 1, _.c1);
						}
					},
				}
			}
		}
	});

	$.contextMenu({
		selector : '#table>tbody>tr>td.rowheader',
		build : function($trigger, e) {
			var el = $trigger[0];
			if (!sys.selectionStart)
				set_selection(el, el);
			else {
				if (sys.selectionStart.classList.contains('rowheader')) {
					var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
					if (el.parentNode.rowIndex < _.r1 || el.parentNode.rowIndex > _.r2)
						set_selection(el, el);
				} else
					set_selection(el, el);
			}
			return {
				items : {
					insert_rows : {
						name : "Insert rows",
						callback : function(e) {
							var _ = normalize_selection(sys.selectionStart, sys.selectionEnd);
							reset_selection();
							addRows(_.r2 - _.r1 + 1, _.r1);
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
			if (sys.draggingStart.classList.contains("colheader"))
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
	// index doesn't count group and header columns
	count = count || 1;
	index = (index === undefined) ? -1 : index + 2;
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
		table.rows[index].cells[1].innerHTML = index - 1;
}

function addColumns(count, index) {
	count = count || 1;
	index = (index === undefined) ? -1 : index + 2;
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
		table.rows[1].cells[index].innerHTML = index - 1;
	}
}
