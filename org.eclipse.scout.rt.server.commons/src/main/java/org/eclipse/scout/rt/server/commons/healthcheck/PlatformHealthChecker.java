/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.server.commons.healthcheck;

import org.eclipse.scout.rt.platform.IPlatform.State;
import org.eclipse.scout.rt.platform.IPlatformListener;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.PlatformEvent;

@Order(PlatformHealthChecker.ORDER) // ensure to be the last platform listener
public class PlatformHealthChecker extends AbstractHealthChecker implements IPlatformListener {
  public static final int ORDER = 100_000;

  private volatile boolean m_platformStarted = false;

  @Override
  protected boolean execCheckHealth(HealthCheckCategoryId category) throws Exception {
    return m_platformStarted;
  }

  @Override
  public void stateChanged(PlatformEvent event) {
    m_platformStarted = event.getState() == State.PlatformStarted;
  }
}
