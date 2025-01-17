/*
 * Copyright (c) 2010, 2025 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.dataobject.testing.signature;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import org.eclipse.scout.rt.platform.util.CollectionUtility;
import org.junit.Test;

public abstract class AbstractDataObjectSignatureTestCompletenessTest {

  @Test
  public void testDataObjectSignatureTestCompleteness() throws IOException {
    DataObjectSignatureCompletenessTestSupport test = createTestSupport();
    getPathExclusions().forEach(test::addPathExclusion);
    test.doTest();
    test.failOnError();
  }

  protected DataObjectSignatureCompletenessTestSupport createTestSupport() {
    return new DataObjectSignatureCompletenessTestSupport();
  }

  protected List<Path> getPathExclusions() {
    return CollectionUtility.arrayList();
  }
}
