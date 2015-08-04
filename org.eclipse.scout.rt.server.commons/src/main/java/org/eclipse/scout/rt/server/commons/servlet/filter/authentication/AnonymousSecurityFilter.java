/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.server.commons.servlet.filter.authentication;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.scout.commons.security.SimplePrincipal;
import org.eclipse.scout.rt.platform.BEANS;

/**
 * A security filter allowing anonymous access to the application.
 */
public class AnonymousSecurityFilter extends AbstractChainableSecurityFilter {

  public static final String ANONYMOUS_USER_NAME = "anonymous";

  @Override
  protected int negotiate(HttpServletRequest req, HttpServletResponse resp, PrincipalHolder holder) throws IOException, ServletException {
    holder.setPrincipal(new SimplePrincipal(ANONYMOUS_USER_NAME));
    return STATUS_CONTINUE_WITH_PRINCIPAL;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
    if (isLogoutRequest(req)) {
      BEANS.get(ServletFilterHelper.class).doLogout(req);
      BEANS.get(ServletFilterHelper.class).forwardToLogoutForm(req, res);
      return;
    }

    super.doFilterInternal(req, res, chain);
  }

  private boolean isLogoutRequest(HttpServletRequest req) {
    return "/logout".equals(req.getPathInfo());
  }

  @Override
  public void destroy() {
  }
}
