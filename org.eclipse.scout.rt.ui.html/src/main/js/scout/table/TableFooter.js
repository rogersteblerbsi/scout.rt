/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.TableFooter = function() {
  scout.TableFooter.parent.call(this);

  this.resizing = false;
  this._tableRowsChangedHandler = this._onTableRowsChanged.bind(this);
  this._tableRowsFilteredHandler = this._onTableRowsFiltered.bind(this);
  this._tableAddFilterHandler = this._onTableAddFilter.bind(this);
  this._tableRemoveFilterHandler = this._onTableRemoveFilter.bind(this);
  this._tableRowsSelectedHandler = this._onTableRowsSelected.bind(this);
  this._tableStatusChangedHandler = this._onTableStatusChanged.bind(this);
  this._tableColumnStructureChangedHandler = this._onColumnStructureChanged.bind(this);
};
scout.inherits(scout.TableFooter, scout.Widget);

scout.TableFooter.prototype._init = function(options) {
  scout.TableFooter.parent.prototype._init.call(this, options);
  this.table = options.table;

  // Keystroke context for the search field.
  // TODO [5.2] dwi: migrate search-field to widget, so that this keystroke code is not in table footer class anymore.
  this.searchFieldKeyStrokeContext = new scout.InputFieldKeyStrokeContext();
  this.searchFieldKeyStrokeContext.$bindTarget = function() {
    return this._$textFilter;
  }.bind(this);
  this.searchFieldKeyStrokeContext.$scopeTarget = function() {
    return this._$textFilter;
  }.bind(this);
};

scout.TableFooter.prototype._render = function($parent) {
  var filter;
  $parent = $parent || this.table.$container;

  this.$container = $parent.appendDiv('table-footer');
  this._$window = $parent.window();
  this._$body = $parent.body();

  this.htmlComp = new scout.HtmlComponent(this.$container, this.session);
  this.htmlComp.setLayout(new scout.TableFooterLayout(this));

  // --- container for an open control ---
  this.$controlContainer = this.$container.appendDiv('table-control-container').hide();
  this.$controlContent = this.$controlContainer.appendDiv('table-control-content');

  // --- table controls section ---
  this._$controls = this.$container.appendDiv('table-controls');

  // --- info section ---
  this._$info = this.$container.appendDiv('table-info');

  // text filter
  this._$textFilter = scout.fields.makeTextField($parent, 'table-text-filter')
    .appendTo(this._$info)
    .on('input', '', $.debounce(this._onFilterInput.bind(this)))
    .placeholder(this.session.text('ui.FilterBy_'));
  filter = this.table.getFilter(scout.TableTextUserFilter.Type);
  if (filter) {
    this._$textFilter.val(filter.text);
  }

  // load info ("X rows loaded, click to reload")
  this._$infoLoad = this._$info
    .appendDiv('table-info-item table-info-load')
    .on('click', '', this._onInfoLoadClick.bind(this));

  // filter info ("X rows filtered by Y, click to remove filter")
  this._$infoFilter = this._$info
    .appendDiv('table-info-item table-info-filter')
    .on('click', '', this._onInfoFilterClick.bind(this));

  // selection info ("X rows selected, click to select all/none")
  this._$infoSelection = this._$info
    .appendDiv('table-info-item table-info-selection')
    .on('click', '', this._onInfoSelectionClick.bind(this));

  // table status
  this._$infoTableStatus = this._$info
    .appendDiv('table-info-item table-info-status')
    .on('mousedown', this._onStatusMousedown.bind(this));
  this._$infoTableStatusIcon = this._$infoTableStatus
    .appendSpan('icon font-icon');

  // ------

  this._renderControls();
  this._renderInfo();
  this._updateInfoVisibility();

  this.table.on('rowsInserted', this._tableRowsChangedHandler);
  this.table.on('rowsDeleted', this._tableRowsChangedHandler);
  this.table.on('allRowsDeleted', this._tableRowsChangedHandler);
  this.table.on('rowsFiltered', this._tableRowsFilteredHandler);
  this.table.on('addFilter', this._tableAddFilterHandler);
  this.table.on('removeFilter', this._tableRemoveFilterHandler);
  this.table.on('rowsSelected', this._tableRowsSelectedHandler);
  this.table.on('statusChanged', this._tableStatusChangedHandler);
  this.table.on('columnStructureChanged', this._tableColumnStructureChangedHandler);

  this.session.keyStrokeManager.installKeyStrokeContext(this.searchFieldKeyStrokeContext);
};

scout.TableFooter.prototype._remove = function() {
  this.session.keyStrokeManager.uninstallKeyStrokeContext(this.searchFieldKeyStrokeContext);
  this._hideTableStatusTooltip();
  this.$resizer = null;
  this.open = false;

  this.table.off('rowsInserted', this._tableRowsChangedHandler);
  this.table.off('rowsDeleted', this._tableRowsChangedHandler);
  this.table.off('allRowsDeleted', this._tableRowsChangedHandler);
  this.table.off('rowsFiltered', this._tableRowsFilteredHandler);
  this.table.off('addFilter', this._tableAddFilterHandler);
  this.table.off('removeFilter', this._tableRemoveFilterHandler);
  this.table.off('rowsSelected', this._tableRowsSelectedHandler);
  this.table.off('statusChanged', this._tableStatusChangedHandler);
  this.table.off('columnStructureChanged', this._tableColumnStructureChangedHandler);

  scout.TableFooter.parent.prototype._remove.call(this);
};

scout.TableFooter.prototype._renderResizerVisible = function() {
  if (this.selectedControl.resizerVisible) {
    this._renderResizer();
    this.$controlContainer.addClass('has-resizer');
  } else if (this.$resizer) {
    this.$resizer.remove();
    this.$resizer = null;
    this.$controlContainer.removeClass('has-resizer');
  }
};

scout.TableFooter.prototype._renderResizer = function() {
  if (this.$resizer) {
    return;
  }
  this.$resizer = this.$controlContainer.prependDiv('table-control-resize')
    .on('mousedown', '', resize.bind(this));

  function resize(event) {
    // Remember current height and start position
    var startHeight = this.$controlContainer.height(),
      startX = Math.floor(event.pageY);
    this._$window
      .on('mousemove.tablefooter', resizeMove.bind(this))
      .one('mouseup', resizeEnd.bind(this));
    this._$body.addClass('row-resize');
    this.resizing = true;

    function resizeMove(event) {
      if (!this.rendered) {
        // footer may be removed in the meantime
        return;
      }
      // Calculate position delta
      var x = Math.floor(event.pageY);
      var dx = x - startX;
      // Ensure control container does not get bigger than the table
      var maxHeight = this.table.$container.height() - this.table.footer.$container.height();
      // Calculate new height of table control container
      var newHeight = Math.min(startHeight - dx, maxHeight);
      this.$controlContainer.height(newHeight);
      var controlContainerInsets = scout.graphics.getInsets(this.$controlContainer);
      this.$controlContent.outerHeight(newHeight - controlContainerInsets.vertical());
      this._revalidateTableLayout();
    }

    function resizeEnd() {
      if (this.rendered && this.$controlContainer.height() < 100) {
        this.selectedControl.setSelected(false);
      }

      this._$window.off('mousemove.tablefooter');
      this._$body.removeClass('row-resize');
      this.resizing = false;
    }

    return false;
  }
};

scout.TableFooter.prototype._renderControls = function() {
  var controls = this.table.tableControls;
  if (controls) {
    controls.forEach(function(control) {
      control.setParent(this);
      control.render(this._$controls);
    }.bind(this));
  } else {
    this._$controls.empty();
  }
};

scout.TableFooter.prototype._renderInfo = function() {
  this._renderInfoLoad();
  this._renderInfoTableStatus();
  this._renderInfoFilter();
  this._renderInfoSelection();
};

scout.TableFooter.prototype._renderInfoLoad = function() {
  var $info = this._$infoLoad,
    numRows = this.table.rows.length;

  $info.empty();
  if (!this._compactStyle) {
    $info.appendSpan().text(this.session.text('ui.NumRowsLoaded', this.computeCountInfo(numRows)));
    if (this.table.hasReloadHandler) {
      $info.appendBr();
      $info.appendSpan('table-info-button').text(this.session.text('ui.ReloadData')).appendTo($info);
    }
  } else {
    $info.appendSpan().text(this.session.text('ui.NumRowsLoadedMin'));
    $info.appendBr();
    $info.appendSpan('table-info-button').text(this.computeCountInfo(numRows));
  }
  $info.setEnabled(this.table.hasReloadHandler);

  if (!this.htmlComp.layouting) {
    this.invalidateLayoutTree(false);
  }
};

scout.TableFooter.prototype._renderInfoFilter = function() {
  var $info = this._$infoFilter;
  var numRowsFiltered = this.table.filteredRows().length;
  var filteredBy = this.table.filteredBy().join(', '); // filteredBy() returns an array

  $info.empty();
  if (!this._compactStyle) {
    if (filteredBy) {
      $info.appendSpan().text(this.session.text('ui.NumRowsFilteredBy', this.computeCountInfo(numRowsFiltered), filteredBy));
    } else {
      $info.appendSpan().text(this.session.text('ui.NumRowsFiltered', this.computeCountInfo(numRowsFiltered)));
    }
    $info.appendBr();
    $info.appendSpan('table-info-button').text(this.session.text('ui.RemoveFilter')).appendTo($info);
  } else {
    $info.appendSpan().text(this.session.text('ui.NumRowsFilteredMin'));
    $info.appendBr();
    $info.appendSpan('table-info-button').text(this.computeCountInfo(numRowsFiltered));
  }

  if (!this.htmlComp.layouting) {
    this.invalidateLayoutTree(false);
  }
};

scout.TableFooter.prototype._renderInfoSelection = function() {
  var $info = this._$infoSelection,
    numRows = this.table.filteredRows().length,
    numRowsSelected = this.table.selectedRows.length,
    all = numRows > 0 && numRows === numRowsSelected;

  $info.empty();
  if (!this._compactStyle) {
    $info.appendSpan().text(this.session.text('ui.NumRowsSelected', this.computeCountInfo(numRowsSelected)));
    $info.appendBr();
    $info.appendSpan('table-info-button').text(this.session.text(all ? 'ui.SelectNone' : 'ui.SelectAll')).appendTo($info);
  } else {
    $info.appendSpan().text(this.session.text('ui.NumRowsSelectedMin'));
    $info.appendBr();
    $info.appendSpan('table-info-button').text(this.computeCountInfo(numRowsSelected));
  }

  if (!this.htmlComp.layouting) {
    this.invalidateLayoutTree(false);
  }
};

scout.TableFooter.prototype._renderInfoTableStatus = function() {
  var $info = this._$infoTableStatus;
  var tableStatus = this.table.tableStatus;
  $info.removeClass(scout.Status.cssClasses);
  if (tableStatus) {
    $info.addClass(tableStatus.cssClass());
  }

  if (!this.htmlComp.layouting) {
    this.invalidateLayoutTree(false);
  }
};

scout.TableFooter.prototype._updateInfoVisibility = function() {
  this._updateInfoFilterVisibility();
  this._updateInfoSelectionVisibility();
  this._updateInfoTableStatusVisibility();
};

scout.TableFooter.prototype._updateInfoFilterVisibility = function() {
  var visible = this.table.filteredBy().length > 0;
  this._setInfoVisible(this._$infoFilter, visible);
};

scout.TableFooter.prototype._updateInfoSelectionVisibility = function() {
  var visible = this.table.multiSelect;
  this._setInfoVisible(this._$infoSelection, visible);
};

scout.TableFooter.prototype._updateInfoTableStatusVisibility = function() {
  var visible = this.table.tableStatus;
  if (visible) {
    // If the uiState of the tableStatus was not set to hidden (either manually by the
    // user or automatically by a timeout or other event), show the tooltip when the
    // "info visible" animation has finished. Otherwise, we don't show the tooltip to
    // not disturb the user.
    var complete = null;
    if (!scout.isOneOf(this.table.tableStatus.uiState, 'user-hidden', 'auto-hidden')) {
      this._$infoTableStatus.addClass('tooltip-active'); // color icon before animation starts
      complete = function() {
        // Same check is required again, because this function is called asynchronously
        if (this.table.tableStatus && !scout.isOneOf(this.table.tableStatus.uiState, 'user-hidden', 'auto-hidden')) {
          this._showTableStatusTooltip();
        }
      }.bind(this);
    }
    this._setInfoVisible(this._$infoTableStatus, true, complete);
  } else {
    this._hideTableStatusTooltip();
    this._setInfoVisible(this._$infoTableStatus, false);
  }
};

scout.TableFooter.prototype._setInfoVisible = function($info, visible, complete) {
  if ($info.isVisible() === visible && !(visible && $info.data('hiding'))) {
    if (complete) {
      complete();
    }
    return;
  }
  var animate = this.rendered; // Animate only on a user interaction, no while the table gets rendered
  if (!animate) {
    $info.setVisible(visible);
    return;
  }
  if (visible) {
    var animationOpts = {
      progress: this.revalidateLayout.bind(this),
      complete: function() {
        if (complete) {
          complete();
        }
      }.bind(this)
    };
    // Save complete function so that layout may use it
    $info.data('animationComplete', animationOpts.complete);
    // If info is shown the first time, set the width to 0 to make animation work
    if ($info[0].style.width === '') {
      $info.cssWidth(0);
    }
    $info.show().stop().widthToContent(animationOpts);
  } else {
    // Mark element as hiding so that the layout does not try to resize it
    $info.data('hiding', true);
    $info.stop().animate({
      width: 0
    }, {
      progress: this.revalidateLayout.bind(this),
      complete: function() {
        $info.removeData('hiding');
        $info.hide();
      }
    });
  }
};

scout.TableFooter.prototype._toggleTableInfoTooltip = function($info, tooltipType) {
  if (this._tableInfoTooltip && this._tableInfoTooltip.rendered) {
    this._tableInfoTooltip.remove();
    this._tableInfoTooltip = null;
  } else {
    this._tableInfoTooltip = scout.create(tooltipType, {
      parent: this,
      tableFooter: this,
      cssClass: 'table-info-tooltip',
      arrowPosition: 50,
      arrowPositionUnit: '%',
      $anchor: $info
    });
    this._tableInfoTooltip.render();
  }
};

scout.TableFooter.prototype.computeCountInfo = function(n) {
  if (scout.nvl(n, 0) === 0) {
    if (this._compactStyle) {
      return this.session.text('ui.TableRowCount', 0);
    } else {
      return this.session.text('ui.TableRowCount0');
    }
  } else if (n === 1) {
    return this.session.text('ui.TableRowCount1');
  } else {
    return this.session.text('ui.TableRowCount', n);
  }
};

/* open, close and resize of the container */

scout.TableFooter.prototype._revalidateTableLayout = function() {
  this.table.htmlComp.revalidateLayoutTree();
};

scout.TableFooter.prototype.openControlContainer = function(control) {
  if (this.open) {
    // Calling open again may resize the container -> don't return
  }
  this.animating = true;
  this.open = true;

  var allowedControlHeight = this.computeControlContainerHeight(this.table, control);

  var insets = scout.graphics.getInsets(this.$controlContainer);
  this.$controlContent.outerHeight(allowedControlHeight - insets.vertical());

  // If container is opened the first time, set the height to 0 to make animation work
  if (this.$controlContainer[0].style.height === '') {
    this.$controlContainer.outerHeight(0);
  }

  if (this.$controlContainer.outerHeight() > allowedControlHeight) {
    // Container gets smaller -> layout first to prevent having a white area
    this.table.invalidateLayoutTree();
  }

  // open container, stop existing (close) animations before
  // use delay to make sure form is rendered and layouted with new size
  this.$controlContainer.stop(true).show().delay(1).animate({
    height: allowedControlHeight
  }, {
    duration: this.rendered ? control.animateDuration : 0,
    complete: function() {
      this.animating = false;
      control.onControlContainerOpened();
      this.table.invalidateLayoutTree();
    }.bind(this)
  });
};

scout.TableFooter.prototype.closeControlContainer = function(control) {
  if (!this.open) {
    return;
  }
  this.open = false;
  this.animating = true;
  this.table.invalidateLayoutTree();

  this.$controlContainer.stop(true).show().animate({
    height: 0
  }, {
    duration: control.animateDuration,
    done: function() {
      this.animating = false;
      this.$controlContainer.hide();
      control.onControlContainerClosed();
    }.bind(this)
  });
};

scout.TableFooter.prototype.computeControlContainerHeight = function(table, control, growControl) {
  var menuBarHeight = 0,
    footerHeight = 0,
    containerHeight = scout.graphics.getSize(table.$container).height,
    maxControlHeight,
    controlContainerHeight = 0,
    dataMargins = scout.graphics.getMargins(table.$data),
    dataMarginsHeight = dataMargins.top + dataMargins.bottom,
    menuBar = table.menuBar,
    htmlMenuBar = scout.HtmlComponent.get(menuBar.$container),
    footer = table.footer,
    header = table.header,
    htmlContainer = table.htmlComp,
    containerSize = htmlContainer.getAvailableSize()
    .subtract(htmlContainer.getInsets());

  if (!footer) {
    return;
  }

  if (menuBar.visible) {
    menuBarHeight = scout.MenuBarLayout.size(htmlMenuBar, containerSize).height;
  }
  // Layout table footer and add size of footer (including the control content) to 'height'
  footerHeight = scout.graphics.getSize(footer.$container).height;
  if (footer.open) {
    if (footer.animating) {
      // Layout may be called when container stays open but changes its size using an animation.
      // At that time the controlContainer has not yet the final size, therefore measuring is not possible, but not necessary anyway.
      controlContainerHeight = control.height;
    } else {
      // Measure the real height
      controlContainerHeight = scout.graphics.getSize(footer.$controlContainer).height;
      // Expand control height? (but only if not resizing)
      if (!footer.resizing && growControl) {
        controlContainerHeight = Math.max(control.height, controlContainerHeight);
      }
    }
  }
  // Crop control height (don't do it if table does not have the correct size yet)
  if (this.table.htmlComp.layouted) {
    maxControlHeight = containerHeight - (dataMarginsHeight + menuBarHeight + footerHeight);
    controlContainerHeight = Math.min(controlContainerHeight, maxControlHeight);
  }
  return controlContainerHeight;
};

scout.TableFooter.prototype._hideTableStatusTooltip = function() {
  clearTimeout(this._autoHideTableStatusTooltipTimeoutId);
  if (this._tableStatusTooltip && this._tableStatusTooltip.rendered) {
    this._tableStatusTooltip.remove();
    this._tableStatusTooltip = null;
  }
};

scout.TableFooter.prototype._showTableStatusTooltip = function() {
  // Remove existing tooltip (might have the wrong css class)
  if (this._tableStatusTooltip && this._tableStatusTooltip.rendered) {
    this._tableStatusTooltip.remove();
  }

  var tableStatus = this.table.tableStatus;
  var text = (tableStatus ? tableStatus.message : null);
  if (scout.strings.empty(text)) {
    return; // Refuse to show empty tooltip
  }

  // Create new tooltip
  var opts = {
    parent: this,
    text: text,
    severity: tableStatus.severity,
    autoRemove: !tableStatus.isError(),
    $anchor: this._$infoTableStatusIcon
  };
  this._tableStatusTooltip = scout.create('Tooltip', opts);
  this._tableStatusTooltip.render();

  // Adjust icon style
  this._$infoTableStatus.addClass('tooltip-active');
  this._tableStatusTooltip.on('remove', function() {
    this._$infoTableStatus.removeClass('tooltip-active');
    // When the tooltip is removed (e.g. because of the auto-remove timeout, or
    // The user clicked somewhere) set the uiStatus accordingly. Otherwise, it
    // might pop up again when the table layout is revalidated.
    clearTimeout(this._autoHideTableStatusTooltipTimeoutId);
    if (this.table.tableStatus && !this.table.tableStatus.isError()) {
      this.table.tableStatus.uiState = 'auto-hidden';
    }
  }.bind(this));

  // Auto-hide unimportant messages
  clearTimeout(this._autoHideTableStatusTooltipTimeoutId);
  if (!tableStatus.isError() && !this.table.tableStatus.uiState) {
    // Already set status to 'auto-hidden', in case the user changes outline before timeout elapses
    this.table.tableStatus.uiState = 'auto-hidden';
    this._autoHideTableStatusTooltipTimeoutId = setTimeout(function() {
      this._hideTableStatusTooltip();
    }.bind(this), 5000);
  }
};

scout.TableFooter.prototype.onControlSelected = function(control) {
  var previousControl = this.selectedControl;
  this.selectedControl = control;

  if (control) {
    this._renderResizerVisible();
    if (previousControl && previousControl.height !== control.height) {
      this.openControlContainer(control);
    }
  }
};

scout.TableFooter.prototype._onStatusMousedown = function(event) {
  // Toggle tooltip
  if (this._tableStatusTooltip && this._tableStatusTooltip.rendered) {
    this._hideTableStatusTooltip();
    this.table.tableStatus.uiState = 'user-hidden';
  } else {
    this._showTableStatusTooltip();
    if (this._tableStatusTooltip.rendered) {
      this.table.tableStatus.uiState = 'user-shown';
    }
  }
};

scout.TableFooter.prototype._onFilterInput = function(event) {
  var filter,
    $input = $(event.currentTarget),
    filterText = $input.val();

  if (filterText) {
    filter = scout.create('TableTextUserFilter', {
      session: this.session,
      table: this.table
    });

    filter.text = filterText;
    this.table.addFilter(filter);
  } else if (!filterText) {
    this.table.removeFilterByKey(scout.TableTextUserFilter.Type);
  }

  this.table.filter();
  this.validateLayoutTree();
  event.stopPropagation();
};

scout.TableFooter.prototype._onInfoLoadClick = function() {
  if (!this._$infoLoad.isEnabled()) {
    return;
  }
  if (this._compactStyle) {
    this._toggleTableInfoTooltip(this._$infoLoad, 'TableInfoLoadTooltip');
  } else {
    this.table.reload();
  }
};

scout.TableFooter.prototype._onInfoFilterClick = function() {
  if (this._compactStyle) {
    this._toggleTableInfoTooltip(this._$infoFilter, 'TableInfoFilterTooltip');
  } else {
    this.table.resetFilter();
  }
};

scout.TableFooter.prototype._onInfoSelectionClick = function() {
  if (this._compactStyle) {
    this._toggleTableInfoTooltip(this._$infoSelection, 'TableInfoSelectionTooltip');
  } else {
    this.table.toggleSelection();
  }
};

scout.TableFooter.prototype._onTableRowsChanged = function(event) {
  this._renderInfoLoad();
};

scout.TableFooter.prototype._onTableRowsFiltered = function(event) {
  this._renderInfoFilter();
  this._renderInfoSelection();
};

scout.TableFooter.prototype._onTableAddFilter = function(event) {
  this._renderInfoFilter();
  this._updateInfoFilterVisibility();
  if (event.filter.filterType === scout.TableTextUserFilter.Type) {
    // Do not update the content when the value does not change. This is the case when typing text in
    // the UI. If we would call val() unconditionally, the current cursor position will get lost.
    var currentText = this._$textFilter.val();
    if (currentText !== event.filter.text) {
      this._$textFilter.val(event.filter.text);
    }
  }
};

scout.TableFooter.prototype._onTableRemoveFilter = function(event) {
  this._renderInfoFilter();
  this._updateInfoFilterVisibility();
  if (event.filter.filterType === scout.TableTextUserFilter.Type) {
    this._$textFilter.val('');
  }
};

scout.TableFooter.prototype._onTableRowsSelected = function(event) {
  this._renderInfoSelection();
};

scout.TableFooter.prototype._onTableStatusChanged = function(event) {
  this._renderInfoTableStatus();
  this._updateInfoTableStatusVisibility();
};

scout.TableFooter.prototype._onColumnStructureChanged = function(event) {
  var controls = this.table.tableControls;
  if (controls) {
    controls.forEach(function(control) {
      if (control.selected) {
        control.removeContent();
        control.renderContent();
      }
    }.bind(this));
  } else {
    this._$controls.empty();
  }

};