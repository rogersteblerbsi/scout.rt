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
package org.eclipse.scout.rt.platform.job.internal;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.ToStringBuilder;
import org.eclipse.scout.rt.platform.job.IBlockingCondition;
import org.eclipse.scout.rt.platform.job.IFuture;
import org.eclipse.scout.rt.platform.job.IJobManager;
import org.eclipse.scout.rt.platform.job.JobException;
import org.eclipse.scout.rt.platform.job.internal.future.IFutureTask;
import org.eclipse.scout.rt.platform.job.listener.JobEvent;
import org.eclipse.scout.rt.platform.job.listener.JobEventType;

/**
 * Implementation of {@link IBlockingCondition}.
 */
public class BlockingCondition implements IBlockingCondition {

  private volatile boolean m_blocking;
  private final String m_name;

  private final Lock m_lock;
  private final Condition m_unblockedCondition;
  private final Set<IFutureTask<?>> m_blockedJobFutures;

  private final JobManager m_jobManager;

  protected BlockingCondition(final String name, final boolean blocking, final JobManager jobManager) {
    m_name = StringUtility.nvl(name, "n/a");
    m_blocking = blocking;
    m_jobManager = jobManager;

    m_lock = new ReentrantLock();
    m_unblockedCondition = m_lock.newCondition();
    m_blockedJobFutures = Collections.synchronizedSet(new HashSet<IFutureTask<?>>()); // synchronized because modified/read by different threads.
  }

  @Override
  public String getName() {
    return m_name;
  }

  @Override
  public boolean isBlocking() {
    return m_blocking;
  }

  @Override
  public void setBlocking(final boolean blocking) {
    if (m_blocking == blocking) {
      return;
    }

    m_lock.lock();
    try {
      if (m_blocking == blocking) { // check again with the monitor owned.
        return;
      }

      if (!(m_blocking = blocking)) {
        // Unset blocking state so it is in correct state once this method returns.
        // That is crucial, if the invoker in turn waits for not-blocked jobs to complete, and expects just released jobs to be unblocked.
        // Otherwise, jobs that are unblocked by this invocation might be ignored, because still in blocked state.
        for (final IFutureTask<?> blockedJobFuture : new HashSet<>(m_blockedJobFutures)) {
          unregisterAndMarkAsUnblocked(blockedJobFuture);
        }

        // Wake-up blocked threads.
        m_unblockedCondition.signalAll();
      }
    }
    finally {
      m_lock.unlock();
    }
  }

  @Override
  public void waitFor() {
    waitFor(-1L, TimeUnit.MILLISECONDS);
  }

  @Override
  public void waitFor(final long timeout, final TimeUnit unit) {
    final JobFutureTask<?> currentTask = (JobFutureTask<?>) IFuture.CURRENT.get();
    if (currentTask != null) {
      blockManagedThread(currentTask, timeout, unit);
    }
    else {
      blockArbitraryThread(timeout, unit);
    }
  }

  /**
   * Blocks the current thread if being managed by {@link IJobManager}. That is if the thread as a {@link JobFutureTask}
   * associated.
   */
  protected void blockManagedThread(final JobFutureTask<?> jobTask, final long timeout, final TimeUnit unit) {
    m_lock.lock();
    try {
      if (!m_blocking) {
        return;
      }

      registerAndMarkAsBlocked(jobTask);
      m_jobManager.fireEvent(new JobEvent(m_jobManager, JobEventType.BLOCKED, jobTask, this));

      // Pass the mutex to next task if being a mutex task.
      if (jobTask.isMutexTask()) {
        Assertions.assertTrue(jobTask.isMutexOwner(), "Unexpected inconsistency: Current FutureTask must be mutex owner [task=%s, thread=%s]", jobTask, Thread.currentThread().getName());
        m_jobManager.getMutexSemaphores().passMutexToNextTask(jobTask);
      }

      blockUntilSignaledOrTimeout(timeout, unit, new IBlockingGuard() {

        @Override
        public boolean shouldBlock() {
          // This method is called once the condition is signaled or a spurious wake-up occurs.
          // However, even if being signaled, this BlockingCondition might be armed anew the time this thread finally acquires the monitor lock.
          // For that reason, the blocking state must be set anew.
          if (m_blocking && !jobTask.isBlocked()) {
            registerAndMarkAsBlocked(jobTask);
          }

          return m_blocking;
        }
      });
    }
    catch (final InterruptedException e) {
      Thread.currentThread().interrupt(); // Restore the interrupted status because cleared by catching InterruptedException.
      unregisterAndMarkAsUnblocked(jobTask);
      throw new JobException(String.format("Interrupted while waiting for a blocking condition to fall. [blockingCondition=%s, thread=%s]", m_name, Thread.currentThread().getName()), e);
    }
    catch (final TimeoutException e) {
      unregisterAndMarkAsUnblocked(jobTask);
      throw new JobException(String.format("Timeout elapsed while waiting for a blocking condition to fall. [blockingCondition=%s, thread=%s]", m_name, Thread.currentThread().getName()), e);
    }
    finally {
      // Note: If released gracefully, the job's blocking-state is unset by the releaser.

      m_lock.unlock();
      m_jobManager.fireEvent(new JobEvent(m_jobManager, JobEventType.UNBLOCKED, jobTask, this));
    }

    // Acquire the mutex anew if being a mutex task.
    if (jobTask.isMutexTask()) {
      m_jobManager.getMutexSemaphores().acquire(jobTask); // Wait until the mutex is acquired.
    }

    m_jobManager.fireEvent(new JobEvent(m_jobManager, JobEventType.RESUMED, jobTask, this));
  }

  /**
   * Blocks the current thread if not being managed by {@link IJobManager}.
   */
  protected void blockArbitraryThread(final long timeout, final TimeUnit unit) {
    m_lock.lock();
    try {
      if (!m_blocking) {
        return;
      }

      blockUntilSignaledOrTimeout(timeout, unit, new IBlockingGuard() {

        @Override
        public boolean shouldBlock() {
          return m_blocking; // This method is called once the condition is signaled or a spurious wake-up occurs.
        }
      });
    }
    catch (final InterruptedException e) {
      Thread.currentThread().interrupt(); // Restore the interrupted status because cleared by catching InterruptedException.
      throw new JobException(String.format("Interrupted while waiting for a blocking condition to fall. [blockingCondition=%s, thread=%s]", m_name, Thread.currentThread().getName()), e);
    }
    catch (final TimeoutException e) {
      throw new JobException(String.format("Timeout elapsed while waiting for a blocking condition to fall. [blockingCondition=%s, thread=%s]", m_name, Thread.currentThread().getName()), e);
    }
    finally {
      m_lock.unlock();
    }
  }

  protected void unregisterAndMarkAsUnblocked(final IFutureTask<?> futureTask) {
    futureTask.setBlocked(false);
    m_blockedJobFutures.remove(futureTask);
  }

  protected void registerAndMarkAsBlocked(final IFutureTask<?> futureTask) {
    futureTask.setBlocked(true);
    m_blockedJobFutures.add(futureTask);
  }

  /**
   * Blocks the current thread until being signaled and {@link IBlockingGuard#shouldBlock()} evaluates to
   * <code>false</code>, or the timeout elapses.
   */
  protected void blockUntilSignaledOrTimeout(final long timeout, final TimeUnit unit, final IBlockingGuard guard) throws InterruptedException, TimeoutException {
    if (timeout == -1L) {
      while (guard.shouldBlock()) {
        m_unblockedCondition.await();
      }
    }
    else {
      long nanos = unit.toNanos(timeout);
      while (guard.shouldBlock() && nanos > 0L) {
        nanos = m_unblockedCondition.awaitNanos(nanos);
      }

      if (nanos <= 0L) {
        throw new TimeoutException();
      }
    }
  }

  @Override
  public String toString() {
    final ToStringBuilder builder = new ToStringBuilder(this);
    builder.attr("name", m_name);
    builder.attr("blocking", m_blocking);
    return builder.toString();
  }

  /**
   * Guard to protect against spurious wake-ups and to ensure the condition to be still <code>true</code> once being
   * unblocked.
   */
  public static interface IBlockingGuard {

    /**
     * @return <code>true</code> to keep the waiting thread blocked, or <code>false</code> to release it.
     */
    boolean shouldBlock();
  }
}
