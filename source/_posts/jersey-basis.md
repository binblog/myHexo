---
title: resteasy入门
date: 2016-11-06 17:29:38
tags:
- java
---

### 集成tomcat
创建maven项目
```
mvn archetype:generate -DgroupId=com.maven -DartifactId=resteasyD  -DinteractiveMode=false -DarchetypeCatalog=local
```

pom文件
```
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.maven</groupId>
  <artifactId>resteasyD</artifactId>
  <packaging>war </packaging>
  <version>1.0-SNAPSHOT</version>
  <name>resteasyD</name>
  <url>http://maven.apache.org</url>
  <dependencies>

    <dependency>
      <groupId>org.jboss.resteasy</groupId>
      <artifactId>resteasy-jaxrs</artifactId>
      <version>2.2.1.GA</version>
      <exclusions>
        <exclusion>
          <groupId>commons-httpclient</groupId>
          <artifactId>commons-httpclient</artifactId>
        </exclusion>
        <exclusion>
          <groupId>javax.servlet</groupId>
          <artifactId>servlet-api</artifactId>
        </exclusion>
        <exclusion>
          <groupId>javax.xml.bind</groupId>
          <artifactId>jaxb-api</artifactId>
        </exclusion>
        <exclusion>
          <groupId>com.sun.xml.bind</groupId>
          <artifactId>jaxb-impl</artifactId>
        </exclusion>
      </exclusions>
    </dependency>

    <dependency>
      <groupId>org.jboss.resteasy</groupId>
      <artifactId>resteasy-jettison-provider</artifactId>
      <version>2.2.1.GA</version>
      <exclusions>
        <exclusion>
          <groupId>javax.xml.bind</groupId>
          <artifactId>jaxb-api</artifactId>
        </exclusion>
        <exclusion>
          <groupId>com.sun.xml.bind</groupId>
          <artifactId>jaxb-impl</artifactId>
        </exclusion>
        <exclusion>
          <groupId>javax.xml.stream</groupId>
          <artifactId>stax-api</artifactId>
        </exclusion>
      </exclusions>
    </dependency>

  </dependencies>


</project>

```

创建service类
```
package com.maven.resteasy;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;

@Path(value = "echo")
public class Echo {
    @GET
    @Path(value = "/{message}")
    public String echoService(@PathParam("message") String message)
    {
        return message;
    }
}
```

main目录下添加配置webapp/WEB-INF/web.xml，内容如下
```
<!DOCTYPE web-app PUBLIC
 "-//Sun Microsystems, Inc.//DTD Web Application 2.3//EN"
 "http://java.sun.com/dtd/web-app_2_3.dtd" >

<web-app>
	<context-param>
        <param-name>resteasy.resources</param-name>
        <param-value>com.maven.resteasy.Echo</param-value>
    </context-param>

   <listener>
      <listener-class>
         org.jboss.resteasy.plugins.server.servlet.ResteasyBootstrap
      </listener-class>
   </listener>

   <servlet>
      <servlet-name>Resteasy</servlet-name>
      <servlet-class>org.jboss.resteasy.plugins.server.servlet.HttpServletDispatcher</servlet-class>
   </servlet>

   <servlet-mapping>
      <servlet-name>Resteasy</servlet-name>
      <url-pattern>/*</url-pattern>
   </servlet-mapping>
</web-app>

```
配置中resteasy.resources对应的val指向Echo服务类。




项目结构为
```
|-- resteasyD
    |-- main
        |-- java
            |-- com.maven.resteasy
                |-- Echo.java
    |-- webapp
        |-- WEB-INF
            |-- web.xml
```

使用maven导出war，放到tomcat/webapps下运行  
浏览器访问 http://localhost:8080/resteasyD-1.0-SNAPSHOT/echo/123 (resteasyD-1.0-SNAPSHOT为导出war包名)，可以看到浏览器显示服务器返回的字符串"123"

### 集成Grizzly
引用
```
	"org.glassfish.jersey.containers:jersey-container-grizzly2-servlet:2.16"
	"org.glassfish.jersey.media:jersey-media-moxy:2.16"
```

```
public class Blog {
    private String title;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }	
}

@Path("blog")
public class BlogService {
    private Logger logger = LoggerFactory.getLogger(BlogService.class);

    @GET
    @Path("ping")
    @Produces(MediaType.TEXT_PLAIN)
    public String getIt() {
        return "hello,client";
    }

    @GET
    @Path("{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Blog getBlog(@PathParam("id") long id) {
        Blog blog = new Blog();
        blog.setTitle("id is " + id);
        return blog;
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.TEXT_PLAIN)
    public String addBlog(Blog blog) {
        logger.info("post blog : {}", blog);
        return "post success";
    }

    @DELETE
    @Path("{id}")
    @Produces(MediaType.TEXT_PLAIN)
    public String delete(@PathParam("id") long id) {
        logger.info("delete id : " + id);

        return "delete success";
    }

    @PUT
    @Path("{id}")
    @Produces(MediaType.TEXT_PLAIN)
    @Consumes(MediaType.APPLICATION_JSON)
    public String put(@PathParam("id")long id,Blog blog) {
        logger.info("id : {}, blog : {}", id , blog);

        return "put success";
    }
}
```

启动Grizzly服务器
```
public class JerseyMain {
    // Base URI the Grizzly HTTP server will listen on
    public static final String BASE_URI = "http://localhost:8080/";

    /**
     * Starts Grizzly HTTP server exposing JAX-RS resources defined in this application.
     * @return Grizzly HTTP server.
     */
    public static HttpServer startServer() {
        // create a resource config that scans for JAX-RS resources and providers
        // in com.example package
        final ResourceConfig rc = new ResourceConfig().packages("service.blog");

        // create and start a new instance of grizzly http server
        // exposing the Jersey application at BASE_URI
        return GrizzlyHttpServerFactory.createHttpServer(URI.create(BASE_URI), rc);
    }

    /**
     * Main method.
     * @param args
     * @throws IOException
     */
    public static void main(String[] args) throws IOException {
        final HttpServer server = startServer();
        System.out.println(String.format("Jersey app started with WADL available at "
                + "%sapplication.wadl\nHit enter to stop it...", BASE_URI));
        System.in.read();
        server.stop();
    }
}
```

参考：  
[利用resteasy框架构建rest webservice----第一波：快速构建HelloWorld（实例、教程） ](http://blog.csdn.net/rnzuozuo/article/details/38349403)