/*
 * Copyright (c) BSI Business Systems Integration AG. All rights reserved.
 * http://www.bsiag.com/
 */
package org.eclipse.scout.rt.dataobject.lookup.fixture;

public class FixtureData {
  private final Long m_id;
  private final String m_text;
  private final String m_additionalData;
  private final Boolean m_active;

  public FixtureData(Long id, String text, String additionalData, Boolean active) {
    m_id = id;
    m_text = text;
    m_additionalData = additionalData;
    m_active = active;
  }

  public Long getId() {
    return m_id;
  }

  public String getText() {
    return m_text;
  }

  public String getAdditionalData() {
    return m_additionalData;
  }

  public Boolean getActive() {
    return m_active;
  }

  @Override
  public String toString() {
    return "FixtureData [m_id=" + m_id + ", m_text=" + m_text + ", m_additionalData=" + m_additionalData + ", m_active=" + m_active + "]";
  }
}
