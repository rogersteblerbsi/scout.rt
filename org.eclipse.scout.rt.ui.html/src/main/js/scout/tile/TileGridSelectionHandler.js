/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.TileGridSelectionHandler = function(tileGrid) {
  this.tileGrid = tileGrid;
};

scout.TileGridSelectionHandler.prototype.selectTileOnMouseDown = function(event) {
  if (!this.isSelectable()) {
    return;
  }

  var $tile = $(event.currentTarget);
  var tile = $tile.data('widget');

  if (tile instanceof scout.PlaceholderTile) {
    return;
  }
  if (tile.selected && event.which === 3) {
    // Do not toggle if context menus should be shown and tile already is selected
    return;
  }

  // Clicking a tile selects it, CTRL-click toggles the selection
  var selected = true;
  if (event.ctrlKey) {
    selected = !tile.selected;
  }

  // If multiSelect is enabled, CTRL-Click on a tile adds or removes that tile to or from the selection
  if (event.ctrlKey && this.isMultiSelect()) {
    if (selected) {
      this.addTilesToSelection(tile);
      this.setFocusedTile(tile);
    } else {
      this.deselectTile(tile);
      this.setFocusedTile(null);
    }
    return;
  }

  // If multi selection is disabled or no CTRL key is pressed, only the clicked tile may be selected
  if (selected) {
    this.selectTile(tile);
    this.setFocusedTile(tile);
  } else {
    this.deselectAllTiles();
    this.setFocusedTile(null);
  }
};

scout.TileGridSelectionHandler.prototype.getSelectedTiles = function(event) {
  return this.tileGrid.selectedTiles;
};

scout.TileGridSelectionHandler.prototype.isSelectable = function() {
  return this.tileGrid.selectable;
};

scout.TileGridSelectionHandler.prototype.isMultiSelect = function() {
  return this.tileGrid.multiSelect;
};

scout.TileGridSelectionHandler.prototype.addTilesToSelection = function(tiles) {
  this.tileGrid.addTilesToSelection(tiles);
};

scout.TileGridSelectionHandler.prototype.selectTile = function(tile) {
  this.tileGrid.selectTile(tile);
};

scout.TileGridSelectionHandler.prototype.deselectTile = function(tile) {
  this.tileGrid.deselectTile(tile);
};

scout.TileGridSelectionHandler.prototype.deselectAllTiles = function() {
  this.tileGrid.deselectAllTiles();
};

scout.TileGridSelectionHandler.prototype.setFocusedTile = function(tile) {
  this.tileGrid.setFocusedTile(tile);
};
