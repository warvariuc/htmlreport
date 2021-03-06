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
	if (table.rows.length == 3 && table.rows[0].cells.length == 3) {
		addColumns(10);
		addRows(10);
		for (var r = 2; r < table.rows.length; r++) {
			var row = table.rows[r];
			for (var c = 2; c < row.cells.length; c++) {
				var cell = row.cells[c];
				cell.innerHTML = sprintf('%d x %d', r - 1, c - 1);
			}
		}
	}
});

$(document).on("selectstart", false);

// make pressing Enter in a dialog as submit
$(document).on("keyup", ".ui-dialog", function(e) {
	if (e.keyCode === $.ui.keyCode.ENTER)
		$(".ui-dialog-buttonpane button:contains('Ok')").first().click()
});

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
				if (_r2 > r2 || _c2 > c2)
					return select(r1, c1, _r2, _c2);
				if (cell.classList.contains('merged-cell')) {
					var merged = getMergeData(cell);
					var _r1 = Math.min(merged.r, r1);
					var _c1 = Math.min(merged.c, c1);
					if (_r1 < r1 || _c1 < c1)
						return select(_r1, _c1, r2, c2);
				}
				cell.classList.add('cell-selected');
			}
		}
	}

	clear_selection();
	sys.selectionStart = selectionStart;
	sys.selectionEnd = selectionEnd;

	if (table.rows.length == 2) {
		sys.c1 = selectionStart.cellIndex;
		sys.c2 = selectionEnd.cellIndex;
		return
	} else if (table.rows[0].cells.length == 2) {
		sys.r1 = selectionStart.parentNode.rowIndex;
		sys.r2 = selectionEnd.parentNode.rowIndex;
		return
	}
	var _ = normalize_selection(selectionStart, selectionEnd);
	select(Math.max(_.r1, 2), Math.max(_.c1, 2), _.r2, _.c2);
}

function clear_selection() {
	var rowCount = table.rows.length;
	for (var rowNo = 0; rowNo < rowCount; rowNo++) {
		var cells = table.rows[rowNo].cells;
		var colCount = cells.length;
		for (var colNo = 0; colNo < colCount; colNo++)
			cells[colNo].classList.remove('cell-selected');
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
	} else if (selectionStart.classList.contains('col-header')) {
		// a column header was the start
		r1 = 2;
		c1 = selectionStart.cellIndex;
		r2 = table.rows.length - 1;
		c2 = selectionEnd.cellIndex;
	} else if (selectionStart.classList.contains('row-header')) {
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

function mergeCells(_sys) {
	for (var r = _sys.r1; r <= _sys.r2; r++) {
		for (var c = _sys.c1; c <= _sys.c2; c++) {
			if (r == _sys.r1 && c == _sys.c1)
				continue;
			var cell = table.rows[r].cells[c];
			cell.classList.add('merged-cell');
			cell.setAttribute('data-merge', [r - _sys.r1, c - _sys.c1].join(','));
		}
	}
	var cell = table.rows[_sys.r1].cells[_sys.c1];
	cell.colSpan = _sys.c2 - _sys.c1 + 1;
	cell.rowSpan = _sys.r2 - _sys.r1 + 1;
}

function splitSelectedCells() {
	for (var r = sys.r1; r <= sys.r2; r++) {
		for (var c = sys.c1; c <= sys.c2; c++) {
			var cell = table.rows[r].cells[c];
			cell.classList.remove('merged-cell');
			cell.removeAttribute('data-merge');
			cell.rowSpan = 1;
			cell.colSpan = 1;
		}
	}
}

function clearSelectionContents() {
	for (var r = sys.r1; r <= sys.r2; r++) {
		for (var c = sys.c1; c <= sys.c2; c++) {
			var cell = table.rows[r].cells[c];
			// clear only visible cells
			if (!cell.classList.contains('merged-cell'))
				cell.innerHTML = '';
		}
	}
}

// context menu for selected cells
$.contextMenu({
	selector : '#table > tbody > tr > td.cell-selected',
	build : function($trigger, e) {
		var items = {};
		var selectionHasMergedCells = false;
		var vertSelectionSections = {};
		var horizSelectionSections = {};
		for (var r = sys.r1; r <= sys.r2; r++) {
			for (var c = sys.c1; c <= sys.c2; c++) {
				if (table.rows[r].cells[c].classList.contains('merged-cell'))
					selectionHasMergedCells = true;
				// ensure that you cannot merge cells from different sections
				vertSelectionSections[table.rows[0].cells[c].textContent] = 1;
				horizSelectionSections[table.rows[r].cells[0].textContent] = 1;
			}
		}
		if (selectionHasMergedCells)
			items['split_cells'] = {
				'name' : "Split merged cells",
				'callback' : splitSelectedCells,
				'icon' : 'split_cell',
			};
		else if ((sys.c1 != sys.c2 || sys.r1 != sys.r2) && Object.keys(vertSelectionSections).length == 1 && Object.keys(horizSelectionSections).length == 1)
			items['mergeCells'] = {
				'name' : "Merge selected cells",
				'callback' : function() {
					mergeCells(sys)
				},
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

// column/row resizing
$(document).on("mousedown", "#table > tbody > tr > td.col-header, #table > tbody > tr > td.row-header", function(e) {
	if (!e.ctrlKey)
		return;
	sys.draggingStart = $(this);
	sys.draggingStart.data("startX", e.pageX);
	sys.draggingStart.data("startY", e.pageY);
	sys.draggingStart.data("startWidth", sys.draggingStart.width());
	sys.draggingStart.data("startHeight", sys.draggingStart.height());
});

$(document).on("mouseup", function() {
	sys.draggingStart = null;
});

$(document).on("mousemove", function(e) {
	if (!sys.draggingStart)
		return;
	if (sys.draggingStart.hasClass("col-header")) {
		var headerTd = sys.draggingStart;
		var newWidth = headerTd.data("startWidth") + e.pageX - headerTd.data("startX");
		resizeColumn(headerTd, newWidth)
	} else {
		var headerTd = sys.draggingStart;
		var newHeight = headerTd.data("startHeight") + e.pageY - headerTd.data("startY");
		resizeRow(headerTd, newHeight);
	}
});

function resizeColumn($headerTd, newWidth) {
	var $headerDiv = $headerTd.children('div');
	var $sectionTd = $('#' + table.rows[0].cells[$headerTd[0].cellIndex].textContent);
	var $sectionDiv = $sectionTd.children('div');
	$sectionDiv.hide();
	$headerDiv.hide();
	$headerTd.width(newWidth);
	$headerDiv.width($headerTd.width());
	$sectionDiv.width($sectionTd.width());
	$sectionDiv.show();
	$headerDiv.show();
}

function resizeRow($headerTd, newHeight) {
	var $headerDiv = $headerTd.children('div');
	var $sectionTd = $('#' + table.rows[$headerTd[0].parentNode.rowIndex].cells[0].textContent);
	var $sectionDiv = $sectionTd.children('div');
	$headerDiv.hide();
	$sectionDiv.hide();
	$headerTd.height(newHeight);
	$headerDiv.height($headerTd.height());
	$sectionDiv.height($sectionTd.height());
	$headerDiv.show();
	$sectionDiv.show();
}

function formatSelection() {
	var cell = table.rows[sys.r1].cells[sys.c1];
	var content = cell.innerHTML;
	var vertAlign = cell.style.verticalAlign;
	var horizAlign = cell.style.textAlign;
	for (var r = sys.r1; r <= sys.r2; r++) {
		for (var c = sys.c1; c <= sys.c2; c++) {
			var cell = table.rows[r].cells[c];
			if (cell.classList.contains('merged-cell'))
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
			htmlEditor = CKEDITOR.replace($('#cell_editor *[name="html_editor"]')[0], {
				toolbar : [['Undo', 'Redo', '-', 'Bold', 'Italic', 'Source']],
				resize_enabled : false,
				removePlugins : 'elementspath',
				enterMode : CKEDITOR.ENTER_BR,
				startupFocus : true,
			});
			htmlEditor.setData(content || '');
			if (vertAlign === undefined)
				$('#cell_editor *[name="vert_alignment"]').prop('selectedIndex', -1);
			else
				$('#cell_editor *[name="vert_alignment"]').val(vertAlign);
			if (horizAlign === undefined)
				$('#cell_editor *[name="horiz_alignment"]').prop('selectedIndex', -1);
			else
				$('#cell_editor *[name="horiz_alignment"]').val(horizAlign);
		},
		close : function() {
			CKEDITOR.instances.html_editor.destroy();
		},
		buttons : {
			'Ok' : function() {
				for (var r = sys.r1; r <= sys.r2; r++) {
					for (var c = sys.c1; c <= sys.c2; c++) {
						var cell = table.rows[r].cells[c];
						if (cell.classList.contains('merged-cell'))
							continue;
						if (htmlEditor.checkDirty())
							cell.innerHTML = htmlEditor.getData();
						var vertAlign = $('#cell_editor *[name="vert_alignment"]').val();
						if (vertAlign !== null)
							cell.style.verticalAlign = vertAlign;
						var horizAlign = $('#cell_editor *[name="horiz_alignment"]').val();
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
var newColSection = '<td class="col-section"><div></div></td>';
var newRowSection = '<td class="row-section"><div></div></td>';
var newColHeader = '<td class="col-header"><div></div></td>';
var newRowHeader = '<td class="row-header"><div></div></td>';

function addRows(count, rowNo) {
	// index doesn't count group and header columns
	count = count || 1;
	rowNo = (rowNo === undefined) ? table.rows.length : rowNo + 2;
	var colCount = table.rows[0].cells.length;
	for (var i = 0; i < count; i++) {
		var row = table.insertRow(rowNo);
		var td = row.insertCell(-1);
		td.outerHTML = newRowSection;

		var prevRow = table.rows[rowNo + 1];
		if (prevRow)
			table.rows[rowNo].cells[0].innerHTML = prevRow.cells[0].innerHTML;

		td = row.insertCell(-1);
		td.outerHTML = newRowHeader;
		for (var colNo = 0; colNo < colCount - 2; colNo++) {
			td = row.insertCell(-1);
			td.outerHTML = newCell;
		}
	}
	updateNumbering(rowNo, null);
}

function addColumns(count, colNo) {
	count = count || 1;
	colNo = (colNo === undefined) ? table.rows[0].cells.length : colNo + 2;
	for (var i = 0; i < count; i++)
		for (var rowNo = 0; rowNo < table.rows.length; rowNo++) {
			var row = table.rows[rowNo];
			var td = row.insertCell(colNo);
			if (rowNo == 0) {
				td.outerHTML = newColSection;
				var prevCell = row.cells[colNo + 1];
				if (prevCell)
					// copy section id from the shifted column
					row.cells[colNo].innerHTML = prevCell.innerHTML;
			} else if (rowNo == 1)
				td.outerHTML = newColHeader;
			else
				td.outerHTML = newCell;
		}
	updateNumbering(null, colNo);
}

function updateNumbering(rowNo, colNo) {
	// horizontal headers and sections
	for (var rowNo = table.rows.length - 1; rowNo >= 1; rowNo--) {
		if (rowNo >= 2)
			// set header row number
			table.rows[rowNo].cells[1].children[0].textContent = rowNo - 1;

		var cell = table.rows[rowNo].cells[0];
		var prevCell = table.rows[rowNo + 1];
		if (prevCell)
			prevCell = prevCell.cells[0];
		cell.id = null;
		cell.classList.remove('vert-section');
		var _sectionId = cell.textContent;
		if (_sectionId)
			cell.classList.add('merged-cell');
		if (sectionId === _sectionId) {
			if (_sectionId)
				sectionSpan++;
		} else {
			if (sectionId) {
				prevCell.classList.remove('merged-cell');
				prevCell.classList.add('vert-section');
				prevCell.id = sectionId;
				prevCell.rowSpan = sectionSpan;
				// resizeColumn($(prevCell), '');
			}
			sectionSpan = 0;
			if (_sectionId)
				sectionSpan++;
			sectionId = _sectionId;
		}
	}

	// vertical headers and sections
	var sectionCells = table.rows[0].cells;
	var colCount = sectionCells.length;
	var sectionId = undefined;
	var sectionSpan = 0;
	for (var colNo = colCount - 1; colNo >= 1; colNo--) {
		if (colNo >= 2)
			// set header column number
			table.rows[1].cells[colNo].children[0].textContent = colNo - 1;

		var cell = sectionCells[colNo];
		var prevCell = sectionCells[colNo + 1];
		cell.id = null;
		cell.classList.remove('vert-section');
		var _sectionId = cell.textContent;
		if (_sectionId)
			cell.classList.add('merged-cell');
		if (sectionId === _sectionId) {
			if (_sectionId)
				sectionSpan++;
		} else {
			if (sectionId) {
				prevCell.classList.remove('merged-cell');
				prevCell.classList.add('vert-section');
				prevCell.id = sectionId;
				prevCell.colSpan = sectionSpan;
				resizeColumn($(prevCell), '');
			}
			sectionSpan = 0;
			if (_sectionId)
				sectionSpan++;
			sectionId = _sectionId;
		}
	}
}

function getMergeData(cell) {
	var merged = cell.getAttribute('data-merge');
	if (merged) {
		var _ = merged.split(',');
		var merged = {
			r : cell.parentNode.rowIndex - parseInt(_[0]),
			c : cell.cellIndex - parseInt(_[1]),
		};
		merged['cell'] = table.rows[merged.r].cells[merged.c];
		return merged;
	}
}

function removeColumns(colNo, count) {
	colNo += 2;
	count = count || 1;
	for (var i = 0; i < count; i++) {
		var $sectionTd = $('#' + table.rows[0].cells[colNo].textContent);
		$sectionTd.children('div').hide();
		$sectionTd.attr('colSpan', 1);
		for (var rowNo = 0; rowNo < table.rows.length; rowNo++)
			table.rows[rowNo].deleteCell(colNo);
	}
	updateNumbering(null, colNo);
}

function removeRows(rowNo, count) {
	rowNo += 2;
	count = count || 1;
	for (var i = 0; i < count; i++)
		table.deleteRow(rowNo);
	updateNumbering(rowNo, null);
}

function editSection(index, span, vertical) {
	if (vertical) {
		var sectionClass = "vert-section";
		var r1 = 0;
		var c1 = index;
	} else {
		var sectionClass = "horiz-section";
		var r1 = index;
		var c1 = 0;
	}
	var sectionTd = table.rows[r1].cells[c1];
	var isNewSection = !sectionTd.classList.contains(sectionClass);
	var sectionIdField = $('#section_editor *[name="section_id"]');

	$("#section_editor").dialog({
		'title' : isNewSection ? "Create section" : "Edit section",
		'autoOpen' : true,
		'modal' : true,
		'open' : function() {
			sectionIdField.val(sectionTd.id);
		},
		buttons : {
			'Ok' : function() {
				var sectionId = sectionIdField.val();
				if (!/^([\w\d])+$/.test(sectionId))
					return alert('Invalid section identifier.');
				var existing = document.getElementById(sectionId);
				if (existing && existing !== sectionTd)
					return alert('This identifier is already used. Choose another.');
				sectionTd.classList.add(sectionClass);
				sectionTd.id = sectionId;
				sectionTd.children[0].textContent = sectionId;
				sectionTd.title = sectionId;
				if (vertical) {
					if (isNewSection)
						sectionTd.colSpan = span;
					for (var c = c1 + 1; c < c1 + sectionTd.colSpan; c++) {
						var cell = table.rows[0].cells[c];
						cell.children[0].textContent = sectionId;
						cell.classList.add('merged-cell');
					}
					resizeColumn($(sectionTd), '');
				} else {
					if (isNewSection)
						sectionTd.rowSpan = span;
					for (var r = r1 + 1; r < r1 + sectionTd.rowSpan; r++) {
						var cell = table.rows[r].cells[0];
						cell.children[0].textContent = sectionId;
						cell.classList.add('merged-cell');
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

$.contextMenu({
	selector : '#table > tbody > tr > td.table-corner',
	build : function($trigger, e) {
		var el = $trigger[0];
		return {
			items : {
				add_column : {
					name : "Add a column",
					callback : function(e) {
						addColumns();
					}
				},
				add_row : {
					name : "Add a row",
					callback : function(e) {
						addRows();
					}
				},
			}
		}
	}
});

$.contextMenu({
	selector : '#table > tbody > tr > td.col-header',
	build : function($trigger, e) {
		var el = $trigger[0];
		if (!sys.selectionStart)
			set_selection(el, el);
		else {
			if (sys.selectionStart.classList.contains('col-header')) {
				if (el.cellIndex < sys.c1 || el.cellIndex > sys.c2)
					set_selection(el, el);
			} else
				set_selection(el, el);
		}
		var items = {
			'insert_columns' : {
				'name' : "Insert columns",
				'callback' : function(e) {
					addColumns(sys.c2 - sys.c1 + 1, sys.c1 - 2);
					set_selection(sys.selectionStart, sys.selectionEnd);
				},
			},
			'remove_columns' : {
				'name' : "Remove columns",
				'callback' : function(e) {
					removeColumns(sys.c1 - 2, sys.c2 - sys.c1 + 1);
					reset_selection();
				},
			},
		};
		var isOk = true;
		for (var colNo = sys.c1; colNo <= sys.c2; colNo++)
			if (table.rows[0].cells[colNo].textContent)
				isOk = false;
		if (isOk)
			items['create_section'] = {
				'name' : "Create section",
				'callback' : function(e) {
					editSection(sys.c1, sys.c2 - sys.c1 + 1, 1)
				},
			};
		items['clear_contents'] = {
			'name' : "Clear contents",
			'callback' : clearSelectionContents,
			'icon' : 'clear_cell_contents',
		};
		return {
			'items' : items,
		}
	}
});

$(document).on("dblclick", "#table > tbody > tr > td.vert-section", function(e) {
	// double click on vertical section id - edit section
	if (e.which != 1 || e.shiftKey || e.altKey || e.ctrlKey)
		// need left button without keyboard modifiers
		return;
	editSection(this.cellIndex, 1, 1);
});

$(document).on("dblclick", "#table > tbody > tr > td.horiz-section", function(e) {
	// double click on horizontal section id - edit section
	if (e.which != 1 || e.shiftKey || e.altKey || e.ctrlKey)
		// need left button without keyboard modifiers
		return;
	editSection(this.parentNode.rowIndex, 1, 0);
});

$.contextMenu({
	selector : '#table > tbody > tr > td.row-header',
	build : function($trigger, e) {
		var el = $trigger[0];
		if (!sys.selectionStart)
			set_selection(el, el);
		else {
			if (sys.selectionStart.classList.contains('row-header')) {
				if (el.parentNode.rowIndex < sys.r1 || el.parentNode.rowIndex > sys.r2)
					set_selection(el, el);
			} else
				set_selection(el, el);
		}
		var items = {
			'insert_rows' : {
				'name' : "Insert rows",
				'callback' : function(e) {
					addRows(sys.r2 - sys.r1 + 1, sys.r1 - 2);
					set_selection(sys.selectionStart, sys.selectionEnd);
				},
			},
			'remove_rows' : {
				'name' : "Remove rows",
				'callback' : function(e) {
					removeRows(sys.r1 - 2, sys.r2 - sys.r1 + 1);
					reset_selection();
				},
			},
		};
		var isOk = true;
		for (var rowNo = sys.r1; rowNo <= sys.r2; rowNo++)
			if (table.rows[rowNo].cells[0].textContent)
				isOk = false;
		if (isOk)
			items['create_section'] = {
				'name' : "Create section",
				'callback' : function(e) {
					editSection(sys.r1, sys.r2 - sys.r1 + 1, 0)
				},
			};
		items['clear_contents'] = {
			'name' : "Clear contents",
			'callback' : clearSelectionContents,
			'icon' : 'clear_cell_contents',
		};
		return {
			'items' : items,
		}
	}
});
