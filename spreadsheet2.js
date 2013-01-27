function stub(e) {
	return false;
}

sys = {
	'r1': null,
	'c1': null,
	'r2': null,
	'rc': null,
	'isMouseDown': null,
};


$(document).ready(function() {
	// cursor keys only in keydown
	// $(document).on("keydown", keypress);
	// disable selection on the page
	$(document).on("selectstart", stub);

	// $(document).on("click", "#table >tbody >tr >td", function(event) {
		// $(this).toggleClass('cell_highlight_over');
		// console.debug('Mouse click: R' + (this.parentNode.rowIndex - 2) + 'C' + (this.cellIndex - 2));
	// });
	for (var i = 0; i < 10; i++)
		addColumns();
	addRows(10);

	$(document).on("mousedown", "#table >tbody >tr >td", function(event) {
		if (event.which != 1)
			// need left button
			return;
		sys.isMouseDown = true;
		sys.r1 = this.parentNode.rowIndex - 2;
		sys.c1 = this.cellIndex - 2;
		console.debug('Mouse down: R' + sys.r1 + 'C' + sys.c1);
		onmouseover(sys.r1, sys.c1);
		// $(document).on("mousedown", stub);
		// $(document).on("selectstart", stub);
	});

	$(document).on("mouseup", "#table >tbody >tr >td", function(event) {
		if (event.which != 1)
			// need left button
			return;
		console.debug('Mouse up: R' + (this.parentNode.rowIndex - 2) + 'C' + (this.cellIndex - 2));
		// $(document).off("mousedown", stub);
		// $(document).off("selectstart", stub);
		sys.isMouseDown = false;
	});

	function onmouseover(r2, c2) {
		if (!sys.isMouseDown)
			return;
		var r1 = sys.r1;
		var c1 = sys.c1;
		console.debug('Mouse over: R' + r2 + 'C' + c2);
		if (r2 === sys.r2 && c2 === sys.c2)
		    // already highlighted
		    return;
		$("#table >tbody >tr >td").removeClass('cell_selected');
		sys.r2 = r2;
		sys.c2 = c2;
		
		var _r1 = Math.min(r1, r2);
		var _r2 = Math.max(r1, r2, 0);
		var _c1 = Math.min(c1, c2);
		var _c2 = Math.max(c1, c2, 0);
		for (var r = _r1; r <= _r2; r++) {
			for (var c = _c1; c <= _c2; c++) {
				cell = $('#table')[0].rows[r + 2].cells[c + 2];
				$(cell).addClass('cell_selected');
			}
		}		
	}
	
	$(document).on("mouseover", "#table >tbody >tr >td", function(event) {
		var r2 = this.parentNode.rowIndex - 2;
		var c2 = this.cellIndex - 2;
		onmouseover(r2, c2);
	});

});

function isInteger(n) {
	return n === +n && n === (n | 0);
}

newCell = $('<td class="cell">#</td>');
newGroup = $('<td class="colgroup">&nbsp;</td>');
newHeader = $('<td class="colheader">1</td>');

function addRows(count) {
	count = count || 1
	lastTr = $('#table >tbody >tr').last()[0];
	tr = $('<tr></tr>');
	// tr = $('#table tr').eq(-1).after('<tr></tr>');
	tr.append(newGroup.clone());
	tr.append(newHeader.clone());
	for (var i = 0; i < lastTr.cells.length - 2; i++)
		tr.append(newCell.clone());
	for (var i = 0; i < count; i++)
		tr.clone().insertAfter(lastTr);
}

function addColumns(count, index) {
	count = count || 1;
	$('#table >tbody >tr').each(function() {
		var td = $(this).children('td');
		if (this.rowIndex == 0)
			if (isInteger(index))
				td.eq(index + 2).before(newGroup.clone());
			else
				td.eq(-1).after(newGroup.clone());
		else if (this.rowIndex == 1)
			if (isInteger(index))
				td.eq(index + 2).before(newHeader.clone());
			else
				td.eq(-1).after(newHeader.clone());
		else if (isInteger(index))
			td.eq(index + 2).before(newCell.clone());
		else
			td.eq(-1).after(newCell.clone());
	});
}
