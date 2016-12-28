---
title: java 路径
tags:
  - java
categories:
  - java
date: 2016-10-10 22:30:02
---

总结了一下java中获取路径的一些方法。
<!--more-->


### 相对路径
System.getProperty("user.dir") 可以获取java虚拟机调用目录，即当前用户目录。  
JAVA IO操作中相对路径都是该路径。  



```
public class Path {
    public static void main(String[] args) {
        System.out.println(System.getProperty("user.dir"));
    }
}
```
如Path类位于`E:\java`  
运行Path类：
```
$ java Path
E:\java
```
可以看到输入Path类所在路径


但在tomcat启动的web项目中，System.getProperty("user.dir")获取到的是`tomcat/bin`目录  
在eclipse或idea等IDE中获取的结果也不样  
使用相对目录的缺点是**无法获取一致的路径**


### classpath
默认情况下classpath即编译文件.class的输出路径。  
####  Class.getResource
Class.getResource("/") 可以获取表示classpath的URL  
Class.getResource("") 可以获取表示该类编译后class文件所在目录的URL
```
package com.study.path;

import org.junit.Test;

public class ClassPath {

    @Test
    public void testClassGetResource() {
        System.out.println(this.getClass().getResource("").getPath());
        System.out.println(this.getClass().getResource("/").getPath());
    }
}
```
输出
```
/F:/maven_study/target/test-classes/com/study/path/     # ClassPath.class目录
/F:/maven_study/target/test-classes/
    
```
**URL使用了utf-8字符集对路径进行了编码，会对中文和空格进行转换，可以调用URLDecoder.decode方法进行解码获取原始路径。**
```
String classPath = java.net.URLDecoder.decode(classPath, "utf-8");
```

#### ClassLoader.getResource
ClassLoader.getResource("")  可以获取表示classpath的URL
**ClassLoader.getResource("/")返回null，参数不能以/开始**
```
@Test
public void testClassLoaderGetResource() {
    System.out.println(Thread.currentThread().getContextClassLoader().getResource("").getPath());
}
```
输出
```
/F:/maven_study/target/test-classes/
```


*建议使用ClassLoader.getResource*



参考:
[java代码中获取classpath路径 ](http://blog.csdn.net/magi1201/article/details/18731581)