"use strict";

function last(array) {
	return array[array.length - 1];
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
	// $(".ui-dialog-content").css("padding", 0);
	// disable selection on the page
	$(document).on("selectstart", false);

	$(document).on("dblclick", "#table > tbody > tr > td.cell", function(e) {
		if (e.which != 1 || e.shiftKey || e.altKey || e.ctrlKey)
			// need left button without keyboard modifiers
			return;
		formatSelection();
	});

	$(document).on("mousedown", "#table > tbody > tr > td", function(e) {
		if (e.which != 1 || e.shiftKey || e.altKey || e.ctrlKey)
			// need left button without keyboard modifiers
			return;
		reset_selection();
		sys.isMouseDown = true;
		sys.selectionStart = this;
		on_mouse_over_cell(this);
	});

	$(document).on("mouseup", "#table > tbody > tr > td", function(e) {
		if (!sys.isMouseDown)
			return;
		sys.isMouseDown = false;
	});

	$(document).on("mouseover", "#table > tbody > tr > td", function(e) {
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

	function mergeSelectedCells() {
		for (var r = sys.r1; r <= sys.r2; r++) {
			for (var c = sys.c1; c <= sys.c2; c++) {
				if (r == sys.r1 && c == sys.c1)
					continue;
				var cell = table.rows[r].cells[c];
				cell.classList.add('hidden_cell');
				cell.setAttribute('data-merged', [sys.r1, sys.c1].join(','));
			}
		}
		var cell = table.rows[sys.r1].cells[sys.c1];
		cell.colSpan = sys.c2 - sys.c1 + 1;
		cell.rowSpan = sys.r2 - sys.r1 + 1;
		sys.selectionHasMergedCells = true;
	}

	function splitSelectedCells() {
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

	function clearSelectionContents() {
		for (var r = sys.r1; r <= sys.r2; r++) {
			for (var c = sys.c1; c <= sys.c2; c++) {
				var cell = table.rows[r].cells[c];
				cell.innerHTML = '';
			}
		}
	}


	$.contextMenu({
		selector : '#table > tbody > tr > td.cell_selected',
		build : function($trigger, e) {
			var items = {};
			if (sys.selectionHasMergedCells)
				items['split_cells'] = {
					'name' : "Split merged cells",
					'callback' : splitSelectedCells,
					'icon' : 'split_cell',
				};
			else if (sys.selectionStart !== sys.selectionEnd)
				items['mergeSelectedCells'] = {
					'name' : "Merge selected cells",
					'callback' : mergeSelectedCells,
					'icon' : 'merge_cells',
				};
			items['clear_contents'] = {
				'name' : "Clear contents",
				'callback' : clearSelectionContents,
				'icon' : 'clear_cell_contents',
			};
			items['formatSelectedCells'] = {
				'name' : "Format...",
				'callback' : formatSelection,
			};

			return {
				'items' : items
			}
		}
	});

	$.contextMenu({
		selector : '#table > tbody > tr > td.colheader',
		build : function($trigger, e) {
			var el = $trigger[0];
			if (!sys.selectionStart)
				set_selection(el, el);
			else {
				if (sys.selectionStart.classList.contains('colheader')) {
					if (el.cellIndex < sys.c1 || el.cellIndex > sys.c2)
						set_selection(el, el);
				} else
					set_selection(el, el);
			}
			return {
				items : {
					insert_columns : {
						name : "Insert columns",
						callback : function(e) {
							addColumns(sys.c2 - sys.c1 + 1, sys.c1 - 2);
							set_selection(sys.selectionStart, sys.selectionEnd);
						}
					},
				}
			}
		}
	});

	$.contextMenu({
		selector : '#table > tbody > tr > td.rowheader',
		build : function($trigger, e) {
			var el = $trigger[0];
			if (!sys.selectionStart)
				set_selection(el, el);
			else {
				if (sys.selectionStart.classList.contains('rowheader')) {
					if (el.parentNode.rowIndex < sys.r1 || el.parentNode.rowIndex > sys.r2)
						set_selection(el, el);
				} else
					set_selection(el, el);
			}
			return {
				items : {
					insert_rows : {
						name : "Insert rows",
						callback : function(e) {
							addRows(sys.r2 - sys.r1 + 1, sys.r1 - 2);
							set_selection(sys.selectionStart, sys.selectionEnd);
						}
					},
				}
			}
		}
	});

	$(document).on("mousedown", "#table > tbody > tr > td.colheader, #table > tbody > tr > td.rowheader", function(e) {
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
	for (var r = 2; r < table.rows.length; r++) {
		var row = table.rows[r];
		for (var c = 2; c < row.cells.length; c++) {
			var cell = row.cells[c];
			cell.innerHTML = sprintf('%d x %d', r - 1, c - 1);
		}
	}

});

function formatSelection() {
	var cell = table.rows[sys.r1].cells[sys.c1];
	var content = cell.innerHTML;
	var vertAlign = cell.style.verticalAlign;
	var horizAlign = cell.style.textAlign;
	for (var r = sys.r1; r <= sys.r2; r++) {
		for (var c = sys.c1; c <= sys.c2; c++) {
			var cell = table.rows[r].cells[c];
			if (cell.classList.contains('hidden_cell'))
				continue;
			if (content !== cell.innerHTML && content !== undefined)
				content = undefined;
			if (vertAlign !== cell.style.verticalAlign && vertAlign !== undefined)
				vertAlign = undefined;
			if (horizAlign !== cell.style.textAlign && horizAlign !== undefined)
				horizAlign = undefined;
		}
	}
	var htmlEditor;
	$("#cell_editor").dialog({
		title : "Format cells",
		resizable : true,
		autoOpen : true,
		modal : true,
		// width : 400,
		// height : 400,
		open : function() {
			htmlEditor = CKEDITOR.replace('html_editor', {
				toolbar : [['Undo', 'Redo', '-', 'Bold', 'Italic', 'Source']],
				resize_enabled : false,
				removePlugins : 'elementspath',
				enterMode : CKEDITOR.ENTER_BR,
				startupFocus : true,
			});
			htmlEditor.setData(content || '');
			if (vertAlign === undefined)
				$('#cell_editor .vert_alignment').prop('selectedIndex', -1);
			else
				$('#cell_editor .vert_alignment').val(vertAlign);
			if (horizAlign === undefined)
				$('#cell_editor .horiz_alignment').prop('selectedIndex', -1);
			else
				$('#cell_editor .horiz_alignment').val(horizAlign);
		},
		close : function() {
			CKEDITOR.instances.html_editor.destroy();
		},
		buttons : {
			'Ok' : function() {
				for (var r = sys.r1; r <= sys.r2; r++) {
					for (var c = sys.c1; c <= sys.c2; c++) {
						var cell = table.rows[r].cells[c];
						if (cell.classList.contains('hidden_cell'))
							continue;
						if (htmlEditor.checkDirty())
							cell.innerHTML = htmlEditor.getData();
						var vertAlign = $('#cell_editor .vert_alignment').val();
						if (vertAlign !== null)
							cell.style.verticalAlign = vertAlign;
						var horizAlign = $('#cell_editor .horiz_alignment').val();
						if (horizAlign !== null)
						cell.style.textAlign = horizAlign;
					}
				}
				$(this).dialog('close');
			},
			'Cancel' : function() {
				$(this).dialog('close');
			}
		},
	});

}

var newCell = '<td class="cell">&nbsp;</td>';
var newColGroup = '<td class="colgroup">&nbsp;</td>';
var newRowGroup = '<td class="rowgroup">&nbsp;</td>';
var newColHeader = '<td class="colheader" style="width: 50px">1</td>';
var newRowHeader = '<td class="rowheader" style="height: 20px">1</td>';

function addRows(count, rowNo) {
	// index doesn't count group and header columns
	count = count || 1;
	rowNo = (rowNo === undefined) ? table.rows.length : rowNo + 2;
	var colCount = table.rows[0].cells.length;
	for (var i = 0; i < count; i++) {
		var row = table.insertRow(rowNo)
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
	for (var _rowNo = rowNo; _rowNo < rowCount; _rowNo++) {
		// set row number
		table.rows[_rowNo].cells[1].innerHTML = _rowNo - 1;
		for (var _colNo = 2; _colNo < colCount; _colNo++) {
			var cell = table.rows[_rowNo].cells[_colNo];
			var merged = cell.getAttribute('data-merged');
			if (merged) {
				var _ = merged.split(',');
				var r = parseInt(_[0]);
				var c = parseInt(_[1]);
				cell.setAttribute('data-merged', [r + count, c].join(','));
			}
		}

	}
}

function addColumns(count, colNo) {
	count = count || 1;
	colNo = (colNo === undefined) ? table.rows[0].cells.length : colNo + 2;
	var rowCount = table.rows.length;
	for (var i = 0; i < count; i++)
		for (var rowNo = 0; rowNo < rowCount; rowNo++) {
			var row = table.rows[rowNo];
			var td = row.insertCell(colNo);
			if (rowNo == 0)
				td.outerHTML = newColGroup
			else if (rowNo == 1)
				td.outerHTML = newColHeader
			else
				td.outerHTML = newCell
		}
	// update numbering
	var colCount = table.rows[0].cells.length;
	for (var _colNo = colNo; _colNo < colCount; _colNo++) {
		// set column number in the header
		table.rows[1].cells[_colNo].innerHTML = _colNo - 1;
		for (var _rowNo = 2; _rowNo < rowCount; _rowNo++) {
			var cell = table.rows[_rowNo].cells[_colNo];
			var merged = cell.getAttribute('data-merged');
			if (merged) {
				var _ = merged.split(',');
				var r = parseInt(_[0]);
				var c = parseInt(_[1]);
				cell.setAttribute('data-merged', [r, c + count].join(','));
			}
		}
	}
}
