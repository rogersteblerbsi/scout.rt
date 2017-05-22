package org.eclipse.scout.rt.shared.http.transport;

import java.io.IOException;

import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.methods.HttpOptions;
import org.apache.http.client.methods.HttpPatch;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpRequestBase;

import com.google.api.client.http.HttpMethods;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.LowLevelHttpRequest;

/**
 * <p>
 * Unfortunately {@link com.google.api.client.http.apache.ApacheHttpTransport} does not support the Apache HTTP client
 * library for versions greater than 4.3 (actually version Google HTTP Client 1.22 is built with version Apache HTTP
 * Client 4.0.1 dating back to 2009).
 * </p>
 * <p>
 * This implementation of a {@link HttpTransport} should work with newer versions of the Apache HTTP client.
 * </p>
 *
 * @see "<a href="https://github.com/google/google-http-java-client/issues/250">Support for Apache http client v4.3 #250</a>"
 */
public class ApacheHttpTransport extends HttpTransport {

  private final HttpClient m_httpClient;

  public ApacheHttpTransport(HttpClient httpClient) {
    m_httpClient = httpClient;
  }

  @Override
  protected LowLevelHttpRequest buildRequest(String method, String url) throws IOException {
    if (method == null) {
      return null;
    }
    HttpRequestBase req;
    if (HttpMethods.GET.equalsIgnoreCase(method)) {
      req = new HttpGet(url);
    }
    else if (HttpMethods.POST.equalsIgnoreCase(method)) {
      req = new HttpPost(url);
    }
    else if (HttpMethods.PUT.equalsIgnoreCase(method)) {
      req = new HttpPut(url);
    }
    else if (HttpMethods.DELETE.equalsIgnoreCase(method)) {
      req = new HttpDelete(url);
    }
    else if (HttpMethods.OPTIONS.equalsIgnoreCase(method)) {
      req = new HttpOptions(url);
    }
    else if (HttpMethods.HEAD.equalsIgnoreCase(method)) {
      req = new HttpHead(url);
    }
    else if (HttpMethods.PATCH.equalsIgnoreCase(method)) {
      req = new HttpPatch(url);
    }
    else {
      throw new UnsupportedOperationException("Unknown request method: " + method);
    }
    return createRequestInternal(req);
  }

  protected ApacheHttpRequest createRequestInternal(HttpRequestBase req) {
    return new ApacheHttpRequest(m_httpClient, req);
  }

}
