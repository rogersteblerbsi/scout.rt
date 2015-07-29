scout.ViewMenuPopup = function(session, $tab, viewMenus, naviBounds, breadcrumbEnabled) {
  scout.ViewMenuPopup.parent.call(this, session);
  this.$tab = $tab;
  this.$headBlueprint = this.$tab;
  this.viewMenus = viewMenus;
  this._naviBounds = naviBounds;
  this._breadcrumbEnabled = breadcrumbEnabled;
  this._tooltip;
  this._tooltipDelay;
};
scout.inherits(scout.ViewMenuPopup, scout.PopupWithHead);

scout.ViewMenuPopup.MAX_MENU_WIDTH = 300;

scout.ViewMenuPopup.prototype._render = function($parent) {
  scout.ViewMenuPopup.parent.prototype._render.call(this, $parent);

  this.viewMenus.forEach(function(viewMenu) {
    viewMenu.render(this.$body);
    viewMenu.afterSendDoAction = this.close.bind(this);
    this.addChild(viewMenu);
  }, this);
  this.alignTo();
};

/**
 * @override PopupWithHead.js
 */
scout.ViewMenuPopup.prototype._renderHead = function() {
  scout.ViewMenuPopup.parent.prototype._renderHead.call(this);

  this._copyCssClassToHead('view-button-tab');

  this.$head.removeClass('popup-head'); // FIXME AWE: use CSS class?
  this.$head.css('text-align', 'left');
  this.$head.css('background-color', 'white');
  this.$head.css('color', '#006c86');
};

/**
 * @override PopupWithHead.js
 */
scout.ViewMenuPopup.prototype._modifyBody = function() {
  this.$body.removeClass('popup-body');
  this.$body.addClass('view-menu-popup-body');
};

/**
 * @override PopupWithHead.js
 */
scout.ViewMenuPopup.prototype._modifyHeadChildren = function() {
  var $blueprintTitle = this.$tab.find('.view-button-tab-title');

  var $icon = this.$head.find('.icon'),
    $title = this.$head.find('.view-button-tab-title'),
    $viewMenuButton = this.$head.find('.view-menu-button');

  $icon.css('font-size', 20);
  $icon.css('display', 'inline-block');

  var titleVisible = !this._breadcrumbEnabled;
  if (titleVisible) {
    $title.setVisible(true);
    $title.css('display', 'inline-block');
    $title.css('text-align', 'left');
    $title.css('margin-left', '8px');
    scout.graphics.setSize($title, scout.graphics.getSize($blueprintTitle));
  }

  $viewMenuButton.css('display', 'inline-block');
  $viewMenuButton.addClass('menu-open');
};

scout.ViewMenuPopup.prototype.alignTo = function() {
  var pos = this.$tab.offset(),
    headSize = scout.graphics.getSize(this.$tab, true),
    bodyTop = headSize.height;

  scout.graphics.setBounds(this.$head, pos.left, pos.top, headSize.width, headSize.height);

  this.$deco.cssLeft(pos.left);
  this.$deco.cssTop(bodyTop);
  this.$deco.cssWidth(headSize.width - 1);

  this.$body.cssWidth(Math.min(scout.ViewMenuPopup.MAX_MENU_WIDTH, this._naviBounds.width));
  this.$body.cssTop(bodyTop);

  this.setLocation(new scout.Point(0, 0));
};

scout.ViewMenuPopup.prototype._createKeyStrokeAdapter = function() {
  return new scout.ViewMenuPopupKeyStrokeAdapter(this);
};
