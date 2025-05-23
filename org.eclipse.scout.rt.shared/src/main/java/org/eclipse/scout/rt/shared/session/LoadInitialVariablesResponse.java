/*
 * Copyright (c) 2010, 2025 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.shared.session;

import java.io.Serializable;
import java.util.Map;

import org.eclipse.scout.rt.platform.Bean;

@Bean
public class LoadInitialVariablesResponse implements Serializable {
  private static final long serialVersionUID = 1L;

  private Map<String, Serializable> m_additionalData;

  public LoadInitialVariablesResponse withAdditionalData(Map<String, Serializable> additionalData) {
    m_additionalData = additionalData;
    return this;
  }

  public Map<String, Serializable> getAdditionalData() {
    return m_additionalData;
  }
}
