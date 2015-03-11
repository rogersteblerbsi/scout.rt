package org.eclipse.scout.rt.server;

import org.eclipse.scout.rt.platform.cdi.IBeanContext;
import org.eclipse.scout.rt.platform.cdi.IBeanContributor;
import org.eclipse.scout.rt.platform.inventory.IClassInventory;
import org.eclipse.scout.rt.server.admin.inspector.ProcessInspector;
import org.eclipse.scout.rt.server.cdi.ServerBeanInstanceFactory;
import org.eclipse.scout.rt.server.job.internal.ServerJobManager;
import org.eclipse.scout.rt.server.session.ServerSessionProvider;
import org.eclipse.scout.rt.server.session.ServerSessionProviderWithCache;

public class ServerBeanContributor implements IBeanContributor {

  @Override
  public void contributeBeans(IClassInventory classInventory, IBeanContext context) {
    context.registerClass(ProcessInspector.class);
    context.registerClass(ServerJobManager.class);
    context.registerClass(ServerBeanInstanceFactory.class);
    context.registerClass(ServerSessionProvider.class);
    context.registerClass(ServerSessionProviderWithCache.class);
  }
}
