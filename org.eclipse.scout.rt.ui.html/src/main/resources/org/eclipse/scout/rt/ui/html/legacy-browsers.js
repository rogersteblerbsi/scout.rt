/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
var entries = document.getElementsByClassName('scout');
if (entries && entries.length) {
  var xmlHttp = new XMLHttpRequest();
  // noinspection JSFunctionExpressionToArrowFunction
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status >= 200 && xmlHttp.status < 300) {
      entries[0].innerHTML = xmlHttp.responseText;
      var i,
        buttons = document.getElementsByClassName('button'),
        loadingRoots = document.getElementsByClassName('application-loading-root');
      for (i = 0; i < buttons.length; i++) {
        buttons[i].classList.add('hidden');
      }
      for (i = 0; i < loadingRoots.length; i++) {
        loadingRoots[i].classList.add('hidden');
      }
    }
  };
  xmlHttp.open('GET', 'unsupported-browser.html', true);
  xmlHttp.send(null);
}