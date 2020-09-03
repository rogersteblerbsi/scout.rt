/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.platform.config;

import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsNull.nullValue;

import org.eclipse.scout.rt.platform.Bean;
import org.hamcrest.MatcherAssert;
import org.junit.Test;

/**
 * Tests for {@link AbstractLongConfigProperty}
 */
public class LongConfigPropertyTest {

  @Test
  public void testDefaultForEmptyValue() {
    Long propertyValue = CONFIG.getPropertyValue(SampleTestProperty.class);
    MatcherAssert.assertThat(propertyValue, is(42L));
  }

  @Test
  public void testParse() {
    MatcherAssert.assertThat(new SampleTestProperty().parse(null), is(nullValue()));
    MatcherAssert.assertThat(new SampleTestProperty().parse("0"), is(0L));
  }

  @Bean
  public static class SampleTestProperty extends AbstractLongConfigProperty {

    @Override
    public Long getDefaultValue() {
      return 42L;
    }

    @Override
    public String description() {
      return null;
    }

    @Override
    public String getKey() {
      return "testKey";
    }
  }

}
