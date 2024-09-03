/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {InitModelOf, TooltipSupport} from '../index';

export const STATIC_TOOLTIP_VISIBLE = 3000;

export class StaticTooltip extends TooltipSupport {

  constructor(options: InitModelOf<TooltipSupport>) {
    let defaultOptions = {
      delay: STATIC_TOOLTIP_VISIBLE
    };
    super($.extend({}, defaultOptions, options));
  }

  protected override _onMouseEnter(event: JQuery.MouseEnterEvent) {
    // NOP
  }

  open($comp: JQuery) {
    this._showTooltip($comp);
    this._tooltipTimeoutId = setTimeout(this._destroyTooltip.bind(this), this._options.delay);
  }
}
