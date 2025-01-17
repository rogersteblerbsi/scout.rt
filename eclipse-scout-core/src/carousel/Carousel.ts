/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {arrays, CarouselEventMap, CarouselLayout, CarouselModel, Device, events, GridData, HtmlComponent, InitModelOf, ObjectOrChildModel, SingleLayout, Widget} from '../index';

export class Carousel extends Widget implements CarouselModel {
  declare model: CarouselModel;
  declare self: Carousel;
  declare eventMap: CarouselEventMap;

  statusEnabled: boolean;
  gridData: GridData;
  moveThreshold: number;
  widgets: Widget[];
  currentItem: number;

  /**
   * last translation position
   */
  positionX: number;
  $carouselItems: JQuery[];
  $carouselStatusItems: JQuery[];
  $carouselFilmstrip: JQuery;
  /**
   * carousel status bar (containing current position)
   */
  $carouselStatus: JQuery;
  htmlCompFilmstrip: HtmlComponent;
  htmlCompStatus: HtmlComponent;

  constructor() {
    super();
    this.statusEnabled = true;
    this.currentItem = 0;
    this.moveThreshold = 0.25;
    this.widgets = [];
    this.$carouselItems = [];
    this.$carouselStatusItems = [];
    this.positionX = 0;
    this._addWidgetProperties(['widgets']);
  }

  protected override _init(model: InitModelOf<this>) {
    super._init(model);
    this._setGridData(this.gridData);
    this.widgets = arrays.ensure(this.widgets);
  }

  protected _setGridData(gridData: GridData) {
    this._setProperty('gridData', new GridData(gridData));
  }

  protected override _render() {
    // add container
    this.$container = this.$parent.appendDiv('carousel')
      // Tooltips on elements in the filmstrip will check all pseudo scroll parents (i.e. elements marked with 'pseudo-scrollable') if the anchor is visible.
      .data('pseudo-scrollable', true);

    this.htmlComp = HtmlComponent.install(this.$container, this.session);
    this.htmlComp.setLayout(new CarouselLayout(this));

    // add content filmstrip
    this.$carouselFilmstrip = this.$container.appendDiv('carousel-filmstrip');
    this._registerCarouselFilmstripEventListeners();
    this.htmlCompFilmstrip = HtmlComponent.install(this.$carouselFilmstrip, this.session);
  }

  protected override _remove() {
    this._removeStatus();
    super._remove();
  }

  protected override _renderProperties() {
    super._renderProperties();

    this._renderWidgets();
    this._renderCurrentItem(); // must be called after renderWidgets
    this._renderStatusEnabled();
  }

  setStatusEnabled(statusEnabled: boolean) {
    this.setProperty('statusEnabled', statusEnabled);
  }

  protected _renderStatusEnabled() {
    if (this.statusEnabled) {
      this._renderStatus();
      this._renderStatusItems();
      this._renderCurrentStatusItem();
    } else {
      this._removeStatus();
    }
    this.invalidateLayoutTree();
  }

  protected _renderStatus() {
    if (!this.$carouselStatus) {
      this.$carouselStatus = this.$container.appendDiv('carousel-status');
      this.htmlCompStatus = HtmlComponent.install(this.$carouselStatus, this.session);
    }
    this.$carouselStatus.toggleClass('touch', Device.get().supportsOnlyTouch());
  }

  protected _removeStatus() {
    if (this.$carouselStatus) {
      this.$carouselStatus.remove();
      this.$carouselStatus = null;
    }
  }

  protected _renderStatusItems() {
    if (!this.$carouselStatus) {
      return;
    }
    this.$carouselStatusItems = [];
    this.$carouselStatus.empty();
    const touch = Device.get().supportsOnlyTouch();
    this.$carouselItems.forEach(($item, index) => {
      let $statusItem = this.$carouselStatus.appendDiv('status-item');
      this.$carouselStatusItems.push($statusItem);
      if (!touch) {
        $statusItem.on('mousedown', () => this.setCurrentItem(index));
      }
    });
  }

  protected _renderCurrentStatusItem() {
    if (!this.$carouselStatus) {
      return;
    }
    this.$carouselStatusItems.forEach((e: JQuery, i: number) => {
      e.toggleClass('current-item', i === this.currentItem);
    });
  }

  recalcTransformation() {
    this.positionX = this.currentItem * this.$container.width() * -1;
    this.$carouselFilmstrip.css({
      transform: 'translateX(' + this.positionX + 'px)'
    });
    this.$carouselFilmstrip.one('transitionend', () => this.session.desktop.repositionTooltips());
  }

  setCurrentItem(currentItem: number) {
    this.setProperty('currentItem', currentItem);
  }

  protected _renderCurrentItem() {
    this._renderItemsInternal(this.currentItem, false);
    this._renderCurrentStatusItem();
    this.invalidateLayoutTree();
  }

  protected _renderItemsInternal(item: number, skipRemove: boolean) {
    item = item || this.currentItem;
    if (!skipRemove) {
      this.widgets.forEach((w, j) => {
        if (w.rendered && (j < item - 1 || j > item + 1)) {
          w.remove();
        }
      });
    }
    for (let i = Math.max(item - 1, 0); i < Math.min(item + 2, this.widgets.length); i++) {
      let widget = this.widgets[i];
      if (!widget.rendered) {
        widget.render(this.$carouselItems[i]);
        widget.invalidateLayoutTree();
      }
    }
  }

  setWidgets(widgets: ObjectOrChildModel<Widget>[]) {
    this.setProperty('widgets', widgets);
  }

  protected _renderWidgets() {
    this.$carouselFilmstrip.empty();
    this.$carouselItems = this.widgets.map((widget, index) => {
      let $carouselItem = this.$carouselFilmstrip.appendDiv('carousel-item');
      let htmlComp = HtmlComponent.install($carouselItem, this.session);
      htmlComp.setLayout(new SingleLayout());

      // Only the current item (always 0 initially) may get the focus, otherwise the browser would scroll to reveal the focus which breaks the carousel
      if (index !== 0) {
        $carouselItem.addClass('prevent-initial-focus');
      }
      $carouselItem.on('focusin', event => {
        // During rendering, a parent widget may want to restore the focus.
        // Because this would break the carousel (see above), the focus will be reset to the previously focused element
        if (this.currentItem !== index) {
          queueMicrotask(() => {
            // Reset focus to the previously focused element
            if (event.relatedTarget instanceof HTMLElement) {
              event.relatedTarget.focus();
            }
            this.$container[0].scrollLeft = 0;
          });
        }
      });

      // Add the CSS classes of the widget to be able to style the carousel items.
      // Use a suffix to prevent conflicts
      let cssClasses = widget.cssClassAsArray();
      cssClasses.forEach(cssClass => $carouselItem.addClass(cssClass + '-carousel-item'));
      return $carouselItem;
    });

    this._renderStatusItems();

    // reset current item
    this.setCurrentItem(0);
  }

  protected _registerCarouselFilmstripEventListeners() {
    let $window = this.$carouselFilmstrip.window();
    this.$carouselFilmstrip.on('mousedown touchstart', event => {
      let origPageX = events.pageX(event);
      let origPosition = this.positionX;
      let minPositionX = this.$container.width() - this.$carouselFilmstrip.width();
      let containerWidth = this.$container.width();
      $window.on('mousemove.carouselDrag touchmove.carouselDrag', event => {
        let pageX = events.pageX(event);
        let moveX = pageX - origPageX;
        let positionX = origPosition + moveX;
        if (positionX !== this.positionX && positionX <= 0 && positionX >= minPositionX) {
          this.$carouselFilmstrip.css({
            transform: 'translateX(' + positionX + 'px)'
          });
          this.positionX = positionX;
          // item
          let i = positionX / containerWidth * -1;
          this._renderItemsInternal(positionX < origPosition ? Math.floor(i) : Math.ceil(i), true);
        }
      });
      $window.on('mouseup.carouselDrag touchend.carouselDrag touchcancel.carouselDrag', e => {
        $window.off('.carouselDrag');
        // show only whole items
        let mod = this.positionX % containerWidth;
        let newCurrentItem = this.currentItem;
        if (this.positionX < origPosition && mod / containerWidth < (0 - this.moveThreshold)) { // next
          newCurrentItem = Math.ceil(this.positionX / containerWidth * -1);
        } else if (this.positionX > origPosition && mod / containerWidth >= this.moveThreshold - 1) { // prev
          newCurrentItem = Math.floor(this.positionX / containerWidth * -1);
        }
        this.setCurrentItem(newCurrentItem);
        if (mod !== 0) {
          this.positionX = newCurrentItem * containerWidth * -1;
          this.recalcTransformation();
        }
      });
    });
  }
}
