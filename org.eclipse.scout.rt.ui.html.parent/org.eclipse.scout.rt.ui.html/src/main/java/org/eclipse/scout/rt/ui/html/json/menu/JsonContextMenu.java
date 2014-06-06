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
package org.eclipse.scout.rt.ui.html.json.menu;

import org.eclipse.scout.rt.client.ui.action.menu.root.ContextMenuEvent;
import org.eclipse.scout.rt.client.ui.action.menu.root.ContextMenuListener;
import org.eclipse.scout.rt.client.ui.action.menu.root.IContextMenu;
import org.eclipse.scout.rt.ui.html.json.AbstractJsonPropertyObserver;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonResponse;

public class JsonContextMenu extends AbstractJsonPropertyObserver<IContextMenu> {

  private ContextMenuListener m_contextMenuListener;

  public JsonContextMenu(IContextMenu model, IJsonSession jsonSession, String id) {
    super(model, jsonSession, id);
  }

  @Override
  protected void attachModel() {
    super.attachModel();

    if (m_contextMenuListener == null) {
      m_contextMenuListener = new P_ContextMenuListener();
      getModel().addContextMenuListener(m_contextMenuListener);
    }
  }

  @Override
  protected void detachModel() {
    super.detachModel();

    if (m_contextMenuListener != null) {
      getModel().removeContextMenuListener(m_contextMenuListener);
      m_contextMenuListener = null;
    }
  }

  @Override
  public String getObjectType() {
    return "ContextMenu";
  }

  @Override
  public void handleUiEvent(JsonEvent event, JsonResponse res) {
  }

  public void handleModelContextMenuChanged(ContextMenuEvent event) {
    if (ContextMenuEvent.TYPE_STRUCTURE_CHANGED == event.getEventType()) {
      handleModelContextMenuStructureChanged(event);
    }
  }

  public void handleModelContextMenuStructureChanged(ContextMenuEvent event) {
    IJsonAdapter<?> owner = getJsonSession().getJsonAdapter(event.getSource().getOwner());
    if (owner instanceof IContextMenuOwner) {
      ((IContextMenuOwner) owner).handleModelContextMenuChanged(event);
    }
  }

  protected class P_ContextMenuListener implements ContextMenuListener {

    @Override
    public void contextMenuChanged(ContextMenuEvent event) {
      handleModelContextMenuChanged(event);
    }

  }

}
