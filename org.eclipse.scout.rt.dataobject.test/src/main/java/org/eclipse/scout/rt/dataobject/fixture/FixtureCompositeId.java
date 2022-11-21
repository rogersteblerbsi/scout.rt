/*
 * Copyright (c) 2010-2022 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.dataobject.fixture;

import java.util.UUID;

import org.eclipse.scout.rt.dataobject.id.AbstractCompositeId;
import org.eclipse.scout.rt.dataobject.id.IdTypeName;
import org.eclipse.scout.rt.dataobject.id.RawTypes;
import org.eclipse.scout.rt.platform.util.StringUtility;

@IdTypeName("scout.FixtureCompositeId")
public final class FixtureCompositeId extends AbstractCompositeId {
  private static final long serialVersionUID = 1L;

  private FixtureCompositeId(FixtureStringId c1, FixtureUuId c2) {
    super(c1, c2);
  }

  @RawTypes
  public static FixtureCompositeId of(String c1, UUID c2) {
    if (StringUtility.isNullOrEmpty(c1) || c2 == null) {
      return null;
    }
    return new FixtureCompositeId(FixtureStringId.of(c1), FixtureUuId.of(c2));
  }

  public static FixtureCompositeId of(FixtureStringId c1, FixtureUuId c2) {
    if (c1 == null || c2 == null) {
      return null;
    }
    return new FixtureCompositeId(c1, c2);
  }
}
