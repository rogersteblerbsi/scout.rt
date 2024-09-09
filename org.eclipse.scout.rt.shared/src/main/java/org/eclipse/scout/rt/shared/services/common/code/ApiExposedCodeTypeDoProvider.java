/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.shared.services.common.code;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.eclipse.scout.rt.api.data.code.CodeTypeDo;
import org.eclipse.scout.rt.api.data.code.IApiExposedCodeTypeDoProvider;
import org.eclipse.scout.rt.platform.BEANS;

public class ApiExposedCodeTypeDoProvider implements IApiExposedCodeTypeDoProvider {

  @Override
  public Set<CodeTypeDo> provide() {
    Set<ICodeType> codeTypes = new HashSet<>();
    BEANS.all(IApiExposedCodeTypeContributor.class).forEach(contributor -> contributor.contribute(codeTypes));
    return codeTypes.stream()
        .map(ICodeType::toDo)
        .filter(Objects::nonNull)
        .filter(codeType -> codeType.getId() != null) // id is mandatory
        .collect(Collectors.toSet());
  }
}
