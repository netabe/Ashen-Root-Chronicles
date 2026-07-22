var Header = {

	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);
	},

	options: {},

	canTravel: function() {
		return $('div#header div.headerButton').length > 1;
	},

	addLocation: function(text, id, module, before) {
		const toAdd = $('<div>').attr('id', "location_" + id)
			.addClass('headerButton')
			.text(text).click(function() {
				if(Header.canTravel()) {
					Engine.travelTo(module);
				}
			});

		if (before && $(`#location_${before}`).length > 0) {
			toAdd.insertBefore(`#location_${before}`);
		} else {
			toAdd.appendTo($('div#header'));
		}

		setTimeout(Header.checkOverflow, 0);
		return toAdd;
	},

	checkOverflow: function() {
		var header = $('div#header');
		var buttons = header.children('.headerButton');
		if (buttons.length === 0) return;

		var dropdown = $('#headerDropdown');
		var dropdownList = $('#headerDropdownList');

		header.css('overflow', 'visible');

		if (dropdownList.length === 0) {
			dropdownList = $('<div>').attr('id', 'headerDropdownList').appendTo('body');
			dropdown = $('<div>').attr('id', 'headerDropdown')
				.addClass('headerButton')
				.text('更多 ▾')
				.click(function(e) {
					e.stopPropagation();
					Header.positionDropdown();
					$('#headerDropdownList').toggle();
				})
				.appendTo(header);
		}

		dropdownList.empty();
		dropdownList.hide();

		var headerWidth = header.width();
		var dropdownWidth = dropdown.outerWidth(true) || 65;
		var availableWidth = headerWidth - dropdownWidth - 10;

		var allButtonWidth = 0;
		buttons.each(function() {
			if ($(this).attr('id') === 'headerDropdown') return;
			allButtonWidth += $(this).outerWidth(true);
		});

		if (allButtonWidth <= availableWidth) {
			dropdown.hide();
			buttons.each(function() {
				if ($(this).attr('id') !== 'headerDropdown') $(this).show();
			});
			return;
		}

		dropdown.show();
		var usedWidth = 0;
		var visibleCount = 0;

		buttons.each(function() {
			if ($(this).attr('id') === 'headerDropdown') return;
			var w = $(this).outerWidth(true);
			if (usedWidth + w <= availableWidth) {
				usedWidth += w;
				$(this).show();
				visibleCount++;
			} else {
				$(this).hide();
				var clone = $(this).clone(true);
				clone.removeClass('headerButton').addClass('headerDropdownItem');
				clone.click(function(e) {
					e.stopPropagation();
					$('#headerDropdownList').hide();
				});
				dropdownList.append(clone);
			}
		});
	},

	positionDropdown: function() {
		var dropdown = $('#headerDropdown');
		var list = $('#headerDropdownList');
		var offset = dropdown.offset();
		list.css({
			top: (offset.top + dropdown.outerHeight()) + 'px',
			left: Math.max(10, Math.min(offset.left, $(window).width() - 200)) + 'px'
		});
	},

	hideDropdown: function() {
		$('#headerDropdownList').hide();
	}
};

$(document).click(function() {
	Header.hideDropdown();
});
