---
title: dubbo与dubbox入门
date: 2016-11-06 17:32:23
tags:
- java
---
记录一下dobbu的入门过程

### dubbo service
pom中添加依赖
```
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>dubbo</artifactId>
    <version>2.5.6</version>
</dependency>
```

定义服务接口和服务类
```
package com.study.service;

public interface HelloService {
    public String hello(String user) ;
}


package com.study.service.impl;

import com.study.service.HelloService;

public class HelloServiceImpl implements HelloService {
    public String hello(String user) {
        System.out.println(" user : " + user + " say hello !");
        return "hello ! " + user;
    }
}
```

在目录resources/META-INF/spring下添加application.xml
（该目录不可任意修改，dubbo默认会读取该目录所有配置文件），文件内容如下
```
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"  
       xsi:schemaLocation="http://www.springframework.org/schema/beans    
       http://www.springframework.org/schema/beans/spring-beans.xsd  
        http://code.alibabatech.com/schema/dubbo
        http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <!-- 提供方应用信息，用于计算依赖关系 -->
    <dubbo:application name="base-service"  />
    <!-- 用dubbo协议在29115端口暴露服务 -->
    <dubbo:protocol name="dubbo" port="29115" />

    <!-- 定义接口实现类 -->
    <bean id="helloService" class="com.study.service.HelloService"></bean>
    <!-- 声明需要暴露的服务接口 -->
    <dubbo:service interface="com.study.service.impl.HelloServiceImpl" ref="helloService" timeout="6000"  registry="N/A" />
</beans>
```
配置文件中`registry="N/A" `表示暴露的服务接口不注册任何注册中心。

resources下添加log配置log4j.properties：
```
log4j.rootLogger=info, console

log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.Threshold=debug
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%5p %d{MM-dd HH:mm:ss}(%F:%L): %m%n
```
此时配置文件目录结构为：
```
|-- resources
    |-- META-INF
        |-- spring
            |-- application.xml
    |-- log4j.properties
    
```

添加主程序
```
public class Main
{
    public static void main( String[] args )
    {

        com.alibaba.dubbo.container.Main.main(args);
    }
}
```
com.alibaba.dubbo.container.Main是dubbo提供的类，可以用来启动dubbo服务端。
运行Main.main方法，就已经完成了服务端的配置了。



window下查看29115端口的占用情况
```
> netstat -aon|findstr 29115
  TCP    0.0.0.0:29115          0.0.0.0:0              LISTENING       4484
  TCP    10.3.20.42:61814       10.3.20.42:29115       TIME_WAIT       0
  TCP    [::]:29115             [::]:0                 LISTENING       4484
```

### dubbo client

配置文件内容：
```
<!-- 服务消费者应用名称，不要与提供者应用名称一致 -->
<dubbo:application name="base-client" />

<!-- 生成远程服务代理，可以和本地bean一样使用HelloService -->
<dubbo:reference id="helloService" interface="com.study.service.helloService" url="dubbo://127.0.0.1:29115"  timeout="60000"/>
```
`url="dubbo://127.0.0.1:29115"`表示通过url直接连接服务端。  
客户端需要使用服务端暴露的服务接口`com.study.service.IService`，可以直接copy源文件或将其打包jar。

测试方法
```
public static void main( String[] args ) {
    ClassPathXmlApplicationContext ctx = new  
    ClassPathXmlApplicationContext(new String[]{"classpath:META-INF/spring/application.xml"});
    ctx.start();
    
    HelloService service = (HelloService)ctx.getBean("helloService");
    
    System.out.println(service.hello("bin"));
}

```
运行main方法，客户端就可以远程调用服务端的方法了。

### zookeeper注册中心 
上述简单实例中并没有使用注册中心，下面使用zookeeper作为注册中心  
服务端pom中添加zk依赖：
```
<!-- zookeeper 注册中心 -->
<dependency>
  <groupId>org.apache.zookeeper</groupId>
  <artifactId>zookeeper</artifactId>
  <version>3.3.3</version>
  <exclusions>
    <exclusion>
      <artifactId>log4j</artifactId>
      <groupId>log4j</groupId>
    </exclusion>
  </exclusions>
</dependency>

<dependency>
  <groupId>com.github.sgroschupf</groupId>
  <artifactId>zkclient</artifactId>
  <version>0.1</version>
</dependency>
```
修改配置文件为：
```
<!-- 提供方应用信息，用于计算依赖关系 -->
<dubbo:application name="base-service"  />
<!-- 使用zookeeper注册中心暴露服务地址 -->
<dubbo:registry address="zookeeper://54.70.215.146:2181" />
<!-- 用dubbo协议在29115端口暴露服务 -->
<dubbo:protocol name="dubbo" port="29115" />

<!-- 定义接口实现类 -->
<bean id="baseService" class="com.study.service.BaseService"></bean>
<!-- 声明需要暴露的服务接口 -->
<dubbo:service interface="com.study.service.IService" ref="baseService" timeout="6000"/>
```
重启服务端，在zk客户端中可以查看dubbo生成的文件
```
[zk: 127.0.0.1:2181(CONNECTED) 1] ls /
[dubbo, zookeeper]
```


客户端修改配置文件：
```
<!-- 服务消费者应用名称，不要与提供者应用名称一致 -->
<dubbo:application name="base-client" />
<!-- 使用zookeeper注册中心订阅服务地址 -->
<dubbo:registry address="zookeeper://54.70.215.146:2181"/>

<dubbo:reference id="service" interface="com.study.service.IService"   timeout="60000"/>
```
此时可以通过注册中心访问服务端了。




### dubbox入门
dubbox是当当网对ddubbo的开源扩展，支持REST风格远程调用。项目地址：https://github.com/dangdangdotcom/dubbox  

dubbox并没有上传jar到maven仓库，所以需要编译java代码
```
git clone https://github.com/dangdangdotcom/dubbox
```
在checkout出来的dubbox目录执行mvn install -Dmaven.test.skip=true来尝试编译一下dubbo（并将dubbo的jar安装到本地maven库）
（maven下载相关依赖包可能速度比较慢，我是在亚马逊 aws上编译成功的。）

这一步完成后，maven项目就可以直接引用dubbo 2.8.4了



### dubbox service
将上述dubbo service项目中pom中添加
```       
<dependency>
  <groupId>com.alibaba</groupId>
  <artifactId>dubbo</artifactId>
  <version>2.8.4</version>
</dependency>

<!--  RESTEasy，JBoss实现JAX-RS -->
<dependency>
  <groupId>org.jboss.resteasy</groupId>
  <artifactId>resteasy-jaxrs</artifactId>
  <version>3.0.7.Final</version>
</dependency>
<dependency>
  <groupId>org.jboss.resteasy</groupId>
  <artifactId>resteasy-client</artifactId>
  <version>3.0.7.Final</version>
</dependency>


<!-- tomcat -->
<dependency>
  <groupId>org.apache.tomcat.embed</groupId>
  <artifactId>tomcat-embed-core</artifactId>
  <version>8.0.11</version>
</dependency>
<dependency>
  <groupId>org.apache.tomcat.embed</groupId>
  <artifactId>tomcat-embed-logging-juli</artifactId>
  <version>8.0.11</version>
</dependency>

<dependency>
  <groupId>javax.validation</groupId>
  <artifactId>validation-api</artifactId>
  <version>1.0.0.GA</version>
</dependency>
```
**（记得删除原来dubbo的引用）**

这里重新执行main方法，并使用dubbo client仍然能调用成功。

#### REST远程调用
配置文件resources/META-INF/spring/application.xml 添加rest协议：
```
<!-- 使用tomcat开放rest接口 -->
<dubbo:protocol name="rest" port="8888" threads="500" contextpath="services" server="tomcat" accepts="500"/>
```

rest接口及实现
```
package com.study.service;

public interface EchoService {
    String echo(String msg);
}
    


package com.study.service.impl;

import com.study.service.EchoService;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;  

     
@Path(value = "echo")
public class EchoServiceImpl implements EchoService{
    @GET
    @Path(value = "/{message}")
    public String echo(@PathParam("message") String message)
    {
        return message;
    }
}
```

配置文件resources/META-INF/spring/application.xml 添加rest开放接口
```
<bean id="echoService" class="com.study.service.impl.EchoServiceImpl"></bean>
<dubbo:service interface="com.study.service.EchoService" ref="echoService"  protocol="rest"/>
```
声明helloService使用dubbo协议，修改为
```
<dubbo:service interface="com.study.service.HelloService" ref="helloService" timeout="6000" protocol="dubbo"/>
```

重新执行main方法，使用浏览器访问 http://localhost:8888/services/echo/123 就可以看到浏览器显示服务端返回的字符串"123"


待扩展：  
dubbo 监控  
dubbox 基于Kryo和FST的Java高效序列化实现
