package org.eclipse.scout.rt.testing.server.runner;

import java.util.List;

import org.eclipse.scout.rt.server.IServerJobFactory;
import org.eclipse.scout.rt.testing.shared.runner.AbstractRunBeforesInSeparateScoutSession;
import org.junit.runners.model.FrameworkMethod;
import org.junit.runners.model.Statement;

/**
 * Invokes all methods of a test class annotated with {@link org.junit.BeforeClass} in a separate Scout server session
 * and therefore in a separate Scout transaction.
 */
public class RunBeforesInSeparateScoutServerSession extends AbstractRunBeforesInSeparateScoutSession {
  private final ScoutServerJobWrapperStatement m_beforesStatement;

  public RunBeforesInSeparateScoutServerSession(IServerJobFactory factory, Statement statement, List<FrameworkMethod> befores, Object target) {
    super(statement, befores, target);
    m_beforesStatement = new ScoutServerJobWrapperStatement(factory, new Statement() {
      @Override
      public void evaluate() throws Throwable {
        evaluateBefores();
      }
    });
  }

  @Override
  protected void evaluateBeforesInScoutSession() throws Throwable {
    m_beforesStatement.evaluate();
  }

}
