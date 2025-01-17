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
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.Assert;

public class DataObjectSignatureCompletenessTestSupport {

  protected Path m_root;

  protected final Pattern m_dataObjectFilePattern;
  protected final Pattern m_signatureTestFilePattern;
  protected final Pattern m_packagePattern;
  protected final Pattern m_packageNamePrefixPattern;

  protected final List<Path> m_pathExclusions;
  protected final List<String> m_errMessages;

  protected final Map<Path, String> m_dataObjectFiles;
  protected final Map<Path, String> m_signatureTestFiles;

  public DataObjectSignatureCompletenessTestSupport() {
    m_root = Path.of("..").toAbsolutePath().normalize();

    m_dataObjectFilePattern = createDataObjectFilePattern();
    m_signatureTestFilePattern = createSignatureTestFilePattern();
    m_packagePattern = createPackageNamePattern();
    m_packageNamePrefixPattern = createPackageNamePrefixPattern();

    m_pathExclusions = new ArrayList<>();
    m_errMessages = new ArrayList<>();

    m_dataObjectFiles = new HashMap<>();
    m_signatureTestFiles = new HashMap<>();
  }

  public Path getRoot() {
    return m_root;
  }

  public void setRoot(Path root) {
    m_root = root;
  }

  public void addPathExclusion(Path path) {
    m_pathExclusions.add(path);
  }

  protected Pattern createDataObjectFilePattern() {
    return Pattern.compile("@TypeVersion\\(");
  }

  protected Pattern createSignatureTestFilePattern() {
    return Pattern.compile("extends \\w*DataObjectSignatureTest\\s+");
  }

  protected Pattern createPackageNamePattern() {
    return Pattern.compile("^\\s*package\\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\\.[a-zA-Z_][a-zA-Z0-9_]*)*)\\s*;", Pattern.MULTILINE);
  }

  protected Pattern createPackageNamePrefixPattern() {
    return Pattern.compile("String getPackageNamePrefix\\(\\)\\s+\\{\\s+return\\s+\"([^\"]+)\";\\s+}");
  }

  public void doTest() throws IOException {
    collectFiles();

    m_dataObjectFiles.forEach((filePath, packageName) -> {
      if (m_signatureTestFiles.values().stream()
          .noneMatch(packageNamePrefix -> packageName.startsWith(packageNamePrefix))) {
        m_errMessages.add("No DataObjectSignatureTest found for " + filePath.getFileName());
      }
    });
  }

  protected void collectFiles() throws IOException {
    Files.walkFileTree(getRoot(), new SimpleFileVisitor<>() {
      @Override
      public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
        Path fileName = dir.getFileName();
        if (fileName != null && (".git".equals(fileName.toString()) || "node_modules".equals(fileName.toString())) || isExcluded(dir)) {
          return FileVisitResult.SKIP_SUBTREE;
        }
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
        Path fileName = file.getFileName();
        if (fileName != null && fileName.toString().toLowerCase().endsWith(".java") && !isExcluded(file)) {
          checkFile(file);
        }
        return FileVisitResult.CONTINUE;
      }
    });
  }

  protected void checkFile(Path path) throws IOException {
    String content = Files.readString(path);
    if (!path.toString().contains(Path.of("src/test").toString()) && m_dataObjectFilePattern.matcher(content).find()) {
      Matcher matcher = m_packagePattern.matcher(content);
      if (matcher.find()) {
        String packageName = matcher.group(1);
        m_dataObjectFiles.put(path, packageName);
      }
    }
    else if (path.getFileName().toString().endsWith("DataObjectSignatureTest.java") && m_signatureTestFilePattern.matcher(content).find()) {
      Matcher matcher = m_packageNamePrefixPattern.matcher(content);
      if (matcher.find()) {
        String packageNamePrefix = matcher.group(1);
        m_signatureTestFiles.put(path, packageNamePrefix);
      }
    }
  }

  protected boolean isExcluded(Path path) {
    if (getRoot().getNameCount() >= path.getNameCount()) {
      return false;
    }
    Path subpath = path.subpath(getRoot().getNameCount(), path.getNameCount());
    for (Path pathExclusion : m_pathExclusions) {
      if (subpath.endsWith(pathExclusion)) {
        return true;
      }
    }
    return false;
  }

  public List<String> getErrorMessages() {
    return Collections.unmodifiableList(m_errMessages);
  }

  public void failOnError() {
    List<String> err = getErrorMessages();
    if (err.isEmpty()) {
      return;
    }
    StringBuilder sb = new StringBuilder();
    sb.append(err.get(0));
    for (int i = 1; i < err.size(); i++) {
      sb.append("\n").append(err.get(i));
    }
    String message = sb.toString();
    Assert.fail(message);
  }
}
