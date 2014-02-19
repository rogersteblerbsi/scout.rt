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
package org.eclipse.scout.rt.ui.json;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.client.ClientSyncJob;
import org.eclipse.scout.rt.client.ui.action.view.IViewButton;
import org.eclipse.scout.rt.client.ui.desktop.DesktopEvent;
import org.eclipse.scout.rt.client.ui.desktop.DesktopListener;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class JsonDesktop extends AbstractJsonRenderer<IDesktop> {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(JsonDesktop.class);
  private static final String WIDGET_ID = "Desktop";

  private JSONArray m_jsonFormsArray;
  private DesktopListener m_desktopListener;
  private List<JsonViewButton> m_jsonViewButtons;
  private JsonOutline m_jsonOutline;

  public JsonDesktop(IDesktop desktop, IJsonSession jsonSession) {
    super(desktop, jsonSession);
    m_jsonFormsArray = new JSONArray();
    m_jsonViewButtons = new LinkedList<JsonViewButton>();
  }

  public IDesktop getDesktop() {
    return getModelObject();
  }

  @Override
  public String getId() {
    return WIDGET_ID;
  }

  @Override
  protected void attachModel() throws JsonUIException {
    new ClientSyncJob("Desktop opened", getJsonSession().getClientSession()) {
      @Override
      protected void runVoid(IProgressMonitor monitor) throws Throwable {
        if (!getDesktop().isOpened()) {
          fireDesktopOpenedFromUIInternal();
        }
        if (!getDesktop().isGuiAvailable()) {
          fireGuiAttachedFromUIInternal();
        }
      }
    }.runNow(new NullProgressMonitor());

    for (IViewButton viewButton : getDesktop().getViewButtons()) {
      JsonViewButton button = new JsonViewButton(viewButton, getJsonSession());
      button.init();
      m_jsonViewButtons.add(button);
    }
    m_jsonOutline = new JsonOutline(this, getDesktop().getOutline(), getJsonSession());
    m_jsonOutline.init();

    //FIXME add listener afterwards -> don't handle events, refactor
    super.attachModel();

    if (m_desktopListener == null) {
      m_desktopListener = new P_DesktopListener();
      getDesktop().addDesktopListener(m_desktopListener);
    }
  }

  @Override
  protected void detachModel() throws JsonUIException {
    super.detachModel();

    if (m_desktopListener != null) {
      getDesktop().removeDesktopListener(m_desktopListener);
      m_desktopListener = null;
    }
  }

  @Override
  public JSONObject toJson() throws JsonUIException {
    JSONObject jsonResponse = new JSONObject();
    try {
      jsonResponse.put("id", getId());
      jsonResponse.put("forms", m_jsonFormsArray);
      JSONArray viewButtons = new JSONArray();
      for (JsonViewButton jsonViewButton : m_jsonViewButtons) {
        viewButtons.put(jsonViewButton.toJson());
      }
      jsonResponse.put("viewButtons", viewButtons);
      jsonResponse.put("outline", m_jsonOutline.toJson());

      return jsonResponse;
    }
    catch (JSONException e) {
      throw new JsonUIException(e.getMessage(), e);
    }
  }

  @Override
  public void handleUiEvent(JsonRequest req, JsonResponse res) throws JsonUIException {
    if ("startup".equals(req.getEventType())) {
      handleUiStartupEvent(req, res);
    }
  }

  protected void handleUiStartupEvent(JsonRequest req, JsonResponse res) throws JsonUIException {
    //Instruct gui to create desktop
    res.addCreateEvent(this.toJson());
  }

  protected JSONObject formToJson(IForm form) throws JsonUIException {
    try {
      JSONObject jsonForm = new JSONObject();
      jsonForm.put("formId", form.getFormId());
      jsonForm.put(IForm.PROP_TITLE, form.getTitle());
      jsonForm.put(IForm.PROP_ICON_ID, form.getIconId());
      return jsonForm;
    }
    catch (JSONException e) {
      throw new JsonUIException(e.getMessage(), e);
    }
  }

  protected void fireDesktopOpenedFromUIInternal() {
    if (getDesktop() != null) {
      getDesktop().getUIFacade().fireDesktopOpenedFromUI();
    }
  }

  protected void fireGuiAttachedFromUIInternal() {
    if (getDesktop() != null) {
      getDesktop().getUIFacade().fireGuiAttached();
    }
  }

  protected void fireGuiDetachedFromUIInternal() {
    if (getDesktop() != null) {
      getDesktop().getUIFacade().fireGuiDetached();
    }
  }

  private class P_DesktopListener implements DesktopListener {
    @Override
    public void desktopChanged(final DesktopEvent e) {
      switch (e.getType()) {
        case DesktopEvent.TYPE_OUTLINE_CHANGED:
          m_jsonOutline = new JsonOutline(JsonDesktop.this, e.getOutline(), getJsonSession());
          m_jsonOutline.init();//TODO read outline from widget cache? map modelId jsonId? send create event?
//          getJsonSession().currentUIResponse().addCreateEvent(m_jsonOutline.toJson());
          getJsonSession().currentUIResponse().addUpdateEvent(getId(), "outline", m_jsonOutline.toJson());
          break;
        case DesktopEvent.TYPE_FORM_ADDED: {

          IForm form = e.getForm();
          JSONObject jsonForm;
          try {
            jsonForm = formToJson(form);
            m_jsonFormsArray.put(jsonForm);
          }
          catch (JsonUIException e1) {
            LOG.error("", e1);
          }

          LOG.info("Form added.");
          break;
        }
      }
    }
  }

}
