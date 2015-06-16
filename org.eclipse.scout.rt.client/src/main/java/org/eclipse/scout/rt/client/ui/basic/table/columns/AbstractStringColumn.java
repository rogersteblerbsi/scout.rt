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
package org.eclipse.scout.rt.client.ui.basic.table.columns;

import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.annotations.ClassId;
import org.eclipse.scout.commons.annotations.ConfigProperty;
import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.extension.ui.basic.table.columns.IStringColumnExtension;
import org.eclipse.scout.rt.client.ui.basic.cell.Cell;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.table.ITableRow;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.client.ui.form.fields.IValueField;
import org.eclipse.scout.rt.client.ui.form.fields.stringfield.AbstractStringField;
import org.eclipse.scout.rt.client.ui.form.fields.stringfield.IStringField;

/**
 * Column holding Strings
 */
@ClassId("e564abbc-5f57-4ccc-a50c-003c408df519")
public abstract class AbstractStringColumn extends AbstractColumn<String> implements IStringColumn {
  // DO NOT init members, this has the same effect as if they were set AFTER
  // initConfig()

  public AbstractStringColumn() {
    super();
  }

  /*
   * Configuration
   */

  /**
   * Configures the maximum length of text in this column. This configuration only limits the text length
   * in case of editable cells.
   * <p>
   * Subclasses can override this method. Default is {@code 4000}.
   *
   * @return Maximum length of text in an editable cell.
   */
  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(130)
  protected int getConfiguredMaxLength() {
    return 4000;
  }

  /**
   * Configures whether the input is masked (e.g. similar as when entering a password in a text field). This
   * configuration only masks the input in the string field in case of an editable cell.
   * <p>
   * Subclasses can override this method. Default is {@code false}.
   *
   * @return {@code true} if the input in the string field in case of an editable cell is masked, {@code false}
   *         otherwise.
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(140)
  protected boolean getConfiguredInputMasked() {
    return false;
  }

  /**
   * Configures the display format of this column.
   * <p>
   * Subclasses can override this method. Default is {@code null}.
   *
   * @return Either {@code null}, {@link IStringColumn#FORMAT_LOWER} or {@link IStringColumn#FORMAT_UPPER}.
   */
  @ConfigProperty(ConfigProperty.STRING)
  @Order(150)
  protected String getConfiguredDisplayFormat() {
    return null;
  }

  /**
   * Configures whether the text is automatically wrapped in the table cell / string field for editable cells. The text
   * is only wrapped if the text is too long to fit in one row.
   * <p>
   * Subclasses can override this method. Default is {@code false}.
   *
   * @return {@code true} if the text is wrapped, {@code false} otherwise.
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(160)
  protected boolean getConfiguredTextWrap() {
    return false;
  }

  @ConfigProperty(ConfigProperty.STRING)
  @Order(170)
  protected String getConfiguredFormat() {
    return null;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(180)
  protected boolean getConfiguredSelectAllOnEdit() {
    return true;
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    setInputMasked(getConfiguredInputMasked());
    setDisplayFormat(getConfiguredDisplayFormat());
    setMaxLength(getConfiguredMaxLength());
    setTextWrap(getConfiguredTextWrap());
    setSelectAllOnEdit(getConfiguredSelectAllOnEdit());
  }

  /*
   * Runtime
   */
  @Override
  public void setInputMasked(boolean b) {
    propertySupport.setPropertyBool(IStringField.PROP_INPUT_MASKED, b);
  }

  @Override
  public boolean isInputMasked() {
    return propertySupport.getPropertyBool(IStringField.PROP_INPUT_MASKED);
  }

  @Override
  public void setDisplayFormat(String s) {
    propertySupport.setPropertyString(IStringField.PROP_FORMAT, s);
  }

  @Override
  public String getDisplayFormat() {
    return propertySupport.getPropertyString(IStringField.PROP_FORMAT);
  }

  @Override
  public void setTextWrap(boolean b) {
    propertySupport.setPropertyBool(IStringField.PROP_WRAP_TEXT, b);
  }

  @Override
  public boolean isTextWrap() {
    return propertySupport.getPropertyBool(IStringField.PROP_WRAP_TEXT);
  }

  @Override
  public boolean isSelectAllOnEdit() {
    return propertySupport.getPropertyBool(IStringField.PROP_SELECT_ALL_ON_FOCUS);
  }

  @Override
  public void setSelectAllOnEdit(boolean b) {
    propertySupport.setPropertyBool(IStringField.PROP_SELECT_ALL_ON_FOCUS, b);
  }

  @Override
  public void setMaxLength(int len) {
    if (len > 0) {
      propertySupport.setPropertyInt(IStringField.PROP_MAX_LENGTH, len);
    }
    refreshValues();
  }

  @Override
  public int getMaxLength() {
    int len = propertySupport.getPropertyInt(IStringField.PROP_MAX_LENGTH);
    if (len <= 0) {
      len = 200;
    }
    return len;
  }

  @Override
  public boolean isEmpty() {
    ITable table = getTable();
    if (table != null) {
      for (int i = 0, ni = table.getRowCount(); i < ni; i++) {
        String value = getValue(table.getRow(i));
        if (value != null && value.length() > 0) {
          return false;
        }
      }
    }
    return true;
  }

  @Override
  protected String parseValueInternal(ITableRow row, Object rawValue) throws ProcessingException {
    String validValue = null;
    if (rawValue == null) {
      validValue = null;
    }
    else if (rawValue instanceof String) {
      validValue = (String) rawValue;
    }
    else {
      validValue = rawValue.toString();
    }
    return validValue;
  }

  /**
   * do not use or override this internal method<br>
   * subclasses perform specific value validations here and set the
   * default textual representation of the value
   */
  @Override
  protected String/* validValue */validateValueInternal(ITableRow row, String rawValue) throws ProcessingException {
    if (rawValue != null && rawValue.length() == 0) {
      return null;
    }
    return rawValue;
  }

  @Override
  protected IFormField prepareEditInternal(ITableRow row) throws ProcessingException {
    IValueField<String> f = getDefaultEditor();
    mapEditorFieldProperties((IStringField) f);
    return f;
  }

  @Override
  protected IStringField createDefaultEditor() {
    return new AbstractStringField() {
    };
  }

  protected void mapEditorFieldProperties(IStringField f) {
    super.mapEditorFieldProperties(f);
    f.setInputMasked(isInputMasked());
    f.setFormat(getDisplayFormat());
    f.setSelectAllOnFocus(isSelectAllOnEdit());
    f.setMaxLength(getMaxLength());
    boolean multi = (getTable() != null ? getTable().isMultilineText() : isTextWrap());
    f.setMultilineText(multi);
    f.setWrapText(isTextWrap());
    f.setWrapText(true); // avoid to have an horizontal scroll bar
  }

  @Override
  protected void decorateCellInternal(Cell cell, ITableRow row) {
    super.decorateCellInternal(cell, row);
    cell.setText(formatValueInternal((String) cell.getValue()));
  }

  private String formatValueInternal(String value) {
    String format = getDisplayFormat();
    if (format != null && value != null) {
      if (FORMAT_LOWER.equals(format)) {
        return value.toLowerCase();
      }
      else if (FORMAT_UPPER.equals(format)) {
        value.toUpperCase();
      }
    }
    return value;
  }

  @Override
  public int compareTableRows(ITableRow r1, ITableRow r2) {
    String s1 = getValue(r1);
    String s2 = getValue(r2);
    return StringUtility.compareIgnoreCase(s1, s2);
  }

  protected static class LocalStringColumnExtension<OWNER extends AbstractStringColumn> extends LocalColumnExtension<String, OWNER> implements IStringColumnExtension<OWNER> {

    public LocalStringColumnExtension(OWNER owner) {
      super(owner);
    }
  }

  @Override
  protected IStringColumnExtension<? extends AbstractStringColumn> createLocalExtension() {
    return new LocalStringColumnExtension<AbstractStringColumn>(this);
  }
}
