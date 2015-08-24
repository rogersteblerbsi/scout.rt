/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.server;

import java.util.concurrent.TimeUnit;

import org.eclipse.scout.rt.platform.config.AbstractBooleanConfigProperty;
import org.eclipse.scout.rt.platform.config.AbstractPortConfigProperty;
import org.eclipse.scout.rt.platform.config.AbstractPositiveIntegerConfigProperty;
import org.eclipse.scout.rt.platform.config.AbstractPositiveLongConfigProperty;
import org.eclipse.scout.rt.platform.config.AbstractStringConfigProperty;
import org.eclipse.scout.rt.server.session.ServerSessionProviderWithCache;

/**
 *
 */
public final class ServerConfigProperties {
  private ServerConfigProperties() {
  }

  public static class ClusterSyncUserProperty extends AbstractStringConfigProperty {

    @Override
    protected String getDefaultValue() {
      return "system";
    }

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.clustersync.ClusterSynchronizationService#user";
    }
  }

  public static class ClusterSyncNodeIdProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.clusterNodeId";
    }
  }

  /**
   * expiration for {@link ServerSessionProviderWithCache} in milliseconds. Default is one day.
   */
  public static class ServerSessionCacheExpirationProperty extends AbstractPositiveLongConfigProperty {

    @Override
    protected Long getDefaultValue() {
      return Long.valueOf(TimeUnit.DAYS.toMillis(1));
    }

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.session.ServerSessionProviderWithCache#expiration";
    }
  }

  public static class RemoteFilesRootDirProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.file.RemoteFileService#rootPath";
    }
  }

  public static class ImapHostProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#host";
    }
  }

  public static class ImapPortProperty extends AbstractPortConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#port";
    }
  }

  public static class ImapMailboxProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#mailbox";
    }
  }

  public static class ImapUsernameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#userName";
    }
  }

  public static class ImapPasswordProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#password";
    }
  }

  public static class ImapSslProtocolsProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.imap.AbstractIMAPService#sslProtocols";
    }
  }

  public static class SmtpHostProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#host";
    }
  }

  public static class SmtpPortProperty extends AbstractPortConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#port";
    }
  }

  public static class SmtpUsernameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#username";
    }
  }

  public static class SmtpPasswordProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#password";
    }
  }

  public static class SmtpSubjectPrefixProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#subjectPrefix";
    }
  }

  public static class SmtpDefaultFromEmailProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#defaultFromEmail";
    }
  }

  public static class SmtpDebugReceiverEmailProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#debugReceiverEmail";
    }
  }

  public static class SmtpSslProtocolsProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#sslProtocols";
    }
  }

  public static class SmtpUseAuthenticationProperty extends AbstractBooleanConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#useAuthentication";
    }
  }

  public static class SmtpUseSmtpsProperty extends AbstractBooleanConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.smtp.AbstractSMTPService#useSmtps";
    }
  }

  public static class SqlTransactionMemberIdProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#transactionMemberId";
    }
  }

  public static class SqlJndiNameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jndiName";
    }
  }

  public static class SqlJndiInitialContextFactoryProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jndiInitialContextFactory";
    }
  }

  public static class SqlJndiProviderUrlProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jndiProviderUrl";
    }
  }

  public static class SqlJndiUrlPkgPrefixesProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jndiUrlPkgPrefixes";
    }
  }

  public static class SqlJdbcMappingNameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcMappingName";
    }
  }

  public static class SqlJdbcDriverNameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcDriverName";
    }
  }

  public static class SqlJdbcPropertiesProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcProperties";
    }
  }

  public static class SqlUsernameProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#username";
    }
  }

  public static class SqlPasswordProperty extends AbstractStringConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#password";
    }
  }

  public static class SqlDirectJdbcConnectionProperty extends AbstractBooleanConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#directJdbcConnection";
    }
  }

  public static class SqlJdbcPoolConnectionLifetimeProperty extends AbstractPositiveLongConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcPoolConnectionLifetime";
    }
  }

  public static class SqlJdbcPoolConnectionBusyTimeoutProperty extends AbstractPositiveLongConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcPoolConnectionBusyTimeout";
    }
  }

  public static class SqlJdbcStatementCacheSizeProperty extends AbstractPositiveIntegerConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcStatementCacheSize";
    }
  }

  public static class SqlJdbcPoolSizeProperty extends AbstractPositiveIntegerConfigProperty {

    @Override
    public String getKey() {
      return "org.eclipse.scout.rt.server.services.common.jdbc.AbstractSqlService#jdbcPoolSize";
    }
  }
}
