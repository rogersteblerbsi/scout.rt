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
package org.eclipse.scout.rt.spec.client.gen;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.MatrixUtility;
import org.eclipse.scout.commons.annotations.Doc.Filtering;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.osgi.BundleInspector.IClassFilter;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPage;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.spec.client.SpecUtility;
import org.eclipse.scout.rt.spec.client.config.entity.IDocEntityConfig;
import org.eclipse.scout.rt.spec.client.config.entity.IDocEntityTableConfig;
import org.eclipse.scout.rt.spec.client.gen.extract.IDocTextExtractor;
import org.eclipse.scout.rt.spec.client.gen.filter.IDocFilter;
import org.eclipse.scout.rt.spec.client.out.IDocSection;
import org.eclipse.scout.rt.spec.client.out.IDocTable;
import org.eclipse.scout.rt.spec.client.out.internal.DocTable;
import org.eclipse.scout.rt.spec.client.out.internal.Section;

/**
 * Some utility methods for {@link IDocTextExtractor}.
 */
public final class DocGenUtility {

  private DocGenUtility() {
  }

  /**
   * The headers of a list of {@link IDocTextExtractor}
   * 
   * @param properties
   *          {@link IDocTextExtractor} (may be <code>null</code>)
   * @return The headers of a list of {@link IDocTextExtractor}.
   */
  public static String[] getHeaders(List<? extends IDocTextExtractor<?>> properties) {
    List<String> headers = new ArrayList<String>();
    if (properties != null) {
      for (IDocTextExtractor<?> p : properties) {
        headers.add(p.getHeader());
      }
    }
    return CollectionUtility.toArray(headers, String.class);
  }

  /**
   * Returns the texts for a scout model object for a list of {@link IDocTextExtractor} properties.
   * 
   * @param object
   *          the scout model object
   * @param properties
   *          the list of {@link IDocTextExtractor}
   * @return the texts for a scout model object for a list of {@link IDocTextExtractor} properties.
   */
  public static <T> String[] getTexts(T object, List<IDocTextExtractor<T>> properties) {
    if (properties != null) {
      String[] row = new String[properties.size()];
      for (int i = 0; i < properties.size(); i++) {
        IDocTextExtractor<T> p = properties.get(i);
        row[i] = p.getText(object);
      }
      return row;
    }
    return null;
  }

  /**
   * Creates a {@link IDocTable} for a single scout entity according to the configuration.
   * <p>
   * E.g. to create a table describing form fields
   * </p>
   * 
   * @param entities
   * @param config
   *          {@link IDocEntityConfig}
   * @param transposedLayout
   *          whether headers and entries are filled into table as columns instead of rows
   * @return {@link IDocTable}
   */
  public static <T> IDocTable createDocTable(T entity, IDocEntityConfig<T> config, boolean transposedLayout) {
    List<IDocTextExtractor<T>> textExtractors = config.getPropertyTextExtractors();
    List<String[]> rows = new ArrayList<String[]>();
    String[] texts = DocGenUtility.getTexts(entity, textExtractors);
    if (texts != null && texts.length > 0) {
      rows.add(texts);
      String[][] rowArray = CollectionUtility.toArray(rows, String[].class);
      String[] headers = DocGenUtility.getHeaders(textExtractors);
      return new DocTable(headers, rowArray, transposedLayout);
    }
    return null;
  }

  /**
   * Creates a {@link IDocSection} for a number of scout entities, according to the configuration.
   * <p>
   * E.g. to create a description for form fields with a table containing all form fields
   * </p>
   * 
   * @param entities
   * @param config
   *          {@link IDocEntityConfig}
   * @param transposedLayout
   *          whether headers and entries are filled into table as columns instead of rows
   * @return {@link IDocTable}
   */
  public static <T> IDocSection createDocSection(Collection<T> entities, IDocEntityTableConfig<T> config, boolean transposedLayout) {
    List<IDocTextExtractor<T>> textExtractors = config.getTextExtractors();
    final List<String[]> rows = new ArrayList<String[]>();
    for (T e : entities) {
      if (isAccepted(e, config.getFilters())) {
        String[] row = getTexts(e, textExtractors);
        rows.add(row);
      }
    }
    if (rows.size() > 0) {
      String[][] rowArray = CollectionUtility.toArray(rows, String[].class);
      MatrixUtility.sortWithComparators(rowArray, config.getSortColumns());
      String[] headers = getHeaders(textExtractors);
      IDocTable table = new DocTable(headers, rowArray, transposedLayout);
      return new Section(config.getTitle(), table);
    }
    return null;
  }

  /**
   * Returns <code>true</code>, if the scoutObject is accepted by all filters.
   * 
   * @param scoutObject
   * @param filters
   *          {@link IDocFilter}s (may be <code>null</code>)
   * @return <code>true</code>, if the scoutObject is accepted by all filters.
   */
  @SuppressWarnings("unchecked")
  public static <T> boolean isAccepted(T scoutObject, List<IDocFilter<T>> filters) {
    if (filters == null) {
      return true;
    }
    if (!isAccepted(scoutObject, filters, Filtering.REJECT, Filtering.TRANSPARENT)) {
      return false;
    }
    // for fields consider hierarchy
    if (scoutObject instanceof IFormField) {
      IFormField superField = ((IFormField) scoutObject).getParentField();
      while (superField != null) {
        // TODO ASA howto generics: is there a better way?
        ArrayList<IDocFilter<IFormField>> fieldFilters = new ArrayList<IDocFilter<IFormField>>();
        for (IDocFilter<T> f : filters) {
          fieldFilters.add((IDocFilter<IFormField>) f);
        }
        if (!isAccepted(superField, fieldFilters, Filtering.REJECT, Filtering.ACCEPT_REJECT_CHILDREN)) {
          return false;
        }
        superField = superField.getParentField();
      }

    }
    return true;
  }

  private static <T> boolean isAccepted(T scoutObject, List<IDocFilter<T>> filters, Filtering... notAccepted) {
    for (IDocFilter<T> filter : filters) {
      Filtering filterResult = filter.accept(scoutObject);
      if (Arrays.asList(notAccepted).contains(filterResult)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @return all doc entity classes (forms, pages, ...) in all available bundles
   * @throws ProcessingException
   */
  public static Set<Class<?>> getAllDocEntityClasses() throws ProcessingException {
    return SpecUtility.getAllClasses(new IClassFilter() {
      // TODO ASA accept other types that needs to be linked like [[CompanyForm|Company]
      @Override
      public boolean accept(Class c) {
        return IForm.class.isAssignableFrom(c) || IPage.class.isAssignableFrom(c);
      }
    });
  }

}
