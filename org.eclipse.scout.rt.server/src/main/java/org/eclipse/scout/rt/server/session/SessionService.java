/*
 * Copyright (c) 2010, 2025 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.server.session;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.shared.session.ISessionService;
import org.eclipse.scout.rt.shared.session.LoadInitialVariablesResponse;

public class SessionService implements ISessionService {

  @Override
  public LoadInitialVariablesResponse loadInitialVariables() {
    Map<String, Serializable> additionalData = new HashMap<>();

    interceptAdditionalData(additionalData);

    return BEANS.get(LoadInitialVariablesResponse.class)
        .withAdditionalData(additionalData);
  }

  /**
   * Hook to modify the additional data
   */
  protected void interceptAdditionalData(Map<String, Serializable> additionalData) {
    // NOP
  }
}
