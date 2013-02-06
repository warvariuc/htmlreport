function stub(e) {
	return false;
}

function isInteger(n) {
	return n === +n && n === (n | 0);
}

sys = {
	r1 : null,
	c1 : null,
	r2 : null,
	rc : null,
	isMouseDown : null,
};

$(function() {
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
		sys.r1 = this.parentNode.rowIndex - 2;
		sys.c1 = this.cellIndex - 2;
		// console.debug('Mouse down: R' + sys.r1 + 'C' + sys.c1);
		on_mouse_over_cell(sys.r1, sys.c1);
		// $(document).on("mousedown", stub);
		// $(document).on("selectstart", stub);
	});

	$(document).on("mouseup", "#table>tbody>tr>td", function(e) {
		if (e.which != 1)
			// need left button
			return;
		// console.debug('Mouse up: R' + (this.parentNode.rowIndex - 2) + 'C' + (this.cellIndex - 2));
		// $(document).off("mousedown", stub);
		// $(document).off("selectstart", stub);
		sys.isMouseDown = false;
		var _ = normalize_selection(sys.r1, sys.c1, sys.r2, sys.c2);
		sys.r1 = _[0];
		sys.c1 = _[1];
		sys.r2 = _[2];
		sys.c2 = _[3];
	});

	function on_mouse_over_cell(r2, c2) {
		if (!sys.isMouseDown)
			return;
		// console.debug('Mouse over: R' + r2 + 'C' + c2);
		if (r2 === sys.r2 && c2 === sys.c2)
			// already highlighted
			return;
		sys.r2 = r2;
		sys.c2 = c2;

		$("#table>tbody>tr>td").removeClass('cell_selected');
		var _ = normalize_selection(sys.r1, sys.c1, sys.r2, sys.c2);
		select_cells(_[0], _[1], _[2], _[3]);
	}

	function normalize_selection(r1, c1, r2, c2) {
		return [Math.max(Math.min(r1, r2), 0), Math.max(Math.min(c1, c2), 0), Math.max(r1, r2, 0), Math.max(c1, c2, 0)]
	}

	function clear_selection(reset) {
		if (reset)
			sys.r1 = sys.c1 = sys.r2 = sys.c2 = null;
		$("#table>tbody>tr>td").removeClass('cell_selected');
	}

    /* indexes do not take into account group and header cells */
	function select_cells(r1, c1, r2, c2) {
		clear_selection();
		for (var r = r1; r <= r2; r++) {
			for (var c = c1; c <= c2; c++) {
				cell = document.getElementById('table').rows[r + 2].cells[c + 2];
				$(cell).addClass('cell_selected');
			}
		}
	}

	$(document).on("mouseover", "#table>tbody>tr>td", function(e) {
		$("#status_bar").text('' + this.parentNode.rowIndex + ', ' + this.cellIndex);
		on_mouse_over_cell(this.parentNode.rowIndex - 2, this.cellIndex - 2);
	});


    $(document).on("click", "#table>tbody>tr>td.colheader", function(e) {
        var table = document.getElementById('table');
        sys.r1 = 0;
        sys.c1 = sys.c2 = this.cellIndex - 2;
        sys.r2 = table.rows.length - 3;
        select_cells(sys.r1, sys.c1, sys.r2, sys.c2);
    });

	function merge_cells(r1, c1, r2, c2) {
		clear_selection(1);
		var table = document.getElementById('table');
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
							merge_cells(sys.r1, sys.c1, sys.r2, sys.c2);
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
		start.data("startWidth" , $(this).width());
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

	for (var i = 0; i < 10; i++)
		addColumns();
	addRows(10);
});

newCell = $('<td class="cell">#</td>');
newColGroup = $('<td class="colgroup">&nbsp;</td>');
newColHeader = $('<td class="colheader">1</td>');
newRowGroup = $('<td class="rowgroup">&nbsp;</td>');
newRowHeader = $('<td class="rowheader">1</td>');

function addRows(count) {
	count = count || 1;
	var lastTr = $('#table>tbody>tr').last()[0];
	var tr = $('<tr></tr>');
	// tr = $('#table tr').eq(-1).after('<tr></tr>');
	tr.append(newRowGroup.clone());
	tr.append(newRowHeader.clone());
	for (var i = 0; i < lastTr.cells.length - 2; i++)
		tr.append(newCell.clone());
	for (var i = 0; i < count; i++)
		tr.clone().insertAfter(lastTr);
}

function addColumns(count, index) {
	count = count || 1;
	$('#table>tbody>tr').each(function() {
		var td = $(this).children('td');
		if (this.rowIndex == 0)
			if (isInteger(index))
				td.eq(index + 2).before(newColGroup.clone());
			else
				td.eq(-1).after(newColGroup.clone());
		else if (this.rowIndex == 1)
			if (isInteger(index))
				td.eq(index + 2).before(newColHeader.clone());
			else
				td.eq(-1).after(newColHeader.clone());
		else if (isInteger(index))
			td.eq(index + 2).before(newCell.clone());
		else
			td.eq(-1).after(newCell.clone());
	});
}
