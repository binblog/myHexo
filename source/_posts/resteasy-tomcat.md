---
title: resteasy与tomcat构建rest服务
date: 2016-11-06 17:29:38
tags:
- java
---
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

参考：  
[利用resteasy框架构建rest webservice----第一波：快速构建HelloWorld（实例、教程） ](http://blog.csdn.net/rnzuozuo/article/details/38349403)