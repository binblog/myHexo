---
title: gradle 入门
date: 2016-11-13 16:33:23
tags:
---
###  安装

在 [官网](http://www.gradle.org/downloads) 下载（仅需要 Gradle的二进制发布包）  

解压，将解压目录中的bin目录添加到环境变量中  

环境变量中添加GRADLE_USER_HOME， 指定GRADLE用户空间目录  
如果使用maven，也需要在环境变量中添加M2_HOME ，指向maven的安装目录。  

命令行运行gradle，安装成功则可以看到如下结果
```
# gradle
Starting a Gradle Daemon (subsequent builds will be faster)
:help

Welcome to Gradle 3.1.

To run a build, run gradle <task> ...

To see a list of available tasks, run gradle tasks

To see a list of command-line options, run gradle --help

To see more detail about a task, run gradle help --task <task>

BUILD SUCCESSFUL

Total time: 8.051 secs
C:\Users\bin>
```

GRADLE_USER_HOME中已生成如下目录
```
|-- caches
|-- daemon
|-- native
```


### 配置java项目

创建目录结构
```
mkdir -p src/main/java/hello
vim  src/main/java/hello/HelloWorld.java
```

HelloWorld.java内容为
```
package hello;

public class HelloWorld {
   public static void main(String[] args) {
           System.out.println("hello,gradle");
    }
}

```

创建build.gradle，内容为
```
apply plugin: 'java'
```
此时项目目录结构为
```
|-- build.gradle
|-- src
    |-- main
        |-- java
            |-- hello
                |-- HelloWorld.java
```
运行gradle任务
```
gradle build
```
该任务执行以下操作：编译、执行单元测试、组装Jar文件

成功后可以看到输入`BUILD SUCCESSFUL`

此时当前目录生成build目录，其中关键子目录
- classes: 保存被编译后的.class文件
- reports: 构建报告（如：测试报告）
- lib: 组装好的项目包（通常为：.jar或者.war文件）


### 申明依赖
创建测试类
```
mkdir -p src/test/java/hello
vim src/test/java/hello/HelloTest.java
```


HelloTest内容为
```
package hello;

import org.junit.Test;

public class HelloTest {
    @Test
    public void test() {
    System.out.println("hello,test");
    }

}

```

引用了junit的类，所以需要申明依赖于junit，build.gradle中添加内容
```
repositories {
    mavenLocal()
    mavenCentral()
}

dependencies {
    compile "junit:junit:4.12"
}
```
repositories定义告诉构建系统通过Maven中央库来检索项目依赖的软件包  
dependencies则声明项目依赖  

运行`gradle build`可以看到构建成功。

需要注意的是，上述代码声明的依赖compile范围的，即这个库在编译和运行时都需要（如果构建WAR文件，这个依赖文件会包括在/WEB-INF/libs目录下），
另外值得注意的依赖类型包括：

- providedCompile：在编译期间需要这个依赖包，但在运行期间可能由容器提供相关组件（比如：Java Servlet API）
- testCompile：依赖项仅在构建和运行测试代码时需要，在项目运行时不需要这个依赖项。

所以junit的声明应该为
```
dependencies {
    testCompile(  
        "junit:junit:4.11"  
    ) 
}
```


### maven远程地址
```
repositories {
    mavenLocal()
    mavenCentral()
}
```
根据上述定义，Gradle会使用本地仓库，本地仓库路径使用maven配置路径，即M2_HOME/conf/settings.xml中localRepository指定目录，如果本地仓库不存在相关依赖，Gradle会创建maven远程仓库下载，默认地址为 https://repo1.maven.org/maven2/ ，下载速度较慢，可以将下载地址修改为国内的Maven镜像仓库。  
在GRADLE_USER_HOME/ 下添加文件init.gradle，内容如下：
```
allprojects{
    repositories {
        def REPOSITORY_URL = 'http://maven.aliyun.com/nexus/content/groups/public/'
        all { ArtifactRepository repo ->
            if(repo instanceof MavenArtifactRepository){
                def url = repo.url.toString()
                if (url.startsWith('https://repo1.maven.org/maven2') || url.startsWith('https://jcenter.bintray.com/')) {
                    project.logger.lifecycle "Repository ${repo.url} replaced by $REPOSITORY_URL."
                    remove repo
                }
            }
        }
        maven {
            url REPOSITORY_URL
        }
    }
}
```
init.gradle文件其实是Gradle的初始化脚本(Initialization Scripts)，也是运行时的全局配置。
上述代码将默认地址修改为阿里提供的maven仓库。

运行`gradle build`可以看到如下输出
```
Starting a Gradle Daemon (subsequent builds will be faster)
Repository https://repo1.maven.org/maven2/ replaced by http://maven.aliyun.com/nexus/content/groups/public/.
Repository https://repo1.maven.org/maven2/ replaced by http://maven.aliyun.com/nexus/content/groups/public/.

```


### Gradle Wrappe
Gradle Wrapper是开始一个Gradle构建的首选方式。它包含了windows批处理以及OS X和Linux的Shell脚本。这些脚本允许我们在没有安装Gradle的系统上执行Gradle构建。  
build.gradle如下内容
```
task wrapper(type: Wrapper) {
    gradleVersion = '3.1'
}
```

下载和初始化wrapper脚本，执行命令
```
gradle wrapper
```
`BUILD SUCCESSFUL`后，可以看到当前目录已生成了gradle，gradlew，gradlew.bat，当前目录概要为
```
|-- build
|-- build.gradle
|-- gradle
|-- gradlew
|-- gradlew.bat
|-- src
```
现在Gradle Wrapper已经可以用于构建系统了，在任何地方，都运行wrapper脚本来构建系统
```
./gradlew build
```
当第一次通过wrapper使用指定版本的Gradle构建系统时，wrapper首先下载对应版本的Gradle可执行文件。  
可以直接将下载好的对应版本的Gradle可执行文件放到GRADLE_USER_HOME/wrapper/dists下对应的目录。

### 多模块项目
创建一个新的目录，初始化
```
gradle init
```
此时项目目录结构为
```
├── build.gradle
├── gradle
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew
├── gradlew.bat
└── settings.gradle
```
创建两个子模块core和web，创建模块目录
```
mkdir -p core/src/main/java
mkdir -p core/src/test/java
mkdir -p web/src/main/java
mkdir -p web/src/test/java
```

修改settings.gradle 文件，引入子模块
```
include 'core','web'  
```

修改build.gradle，内容为
```
apply plugin: 'java'

// 所有子模块的通用配置
subprojects { 
    apply plugin: 'java'
		
    repositories {
    	mavenLocal()
    	mavenCentral()
    }
    
    dependencies {
        testCompile(  
            "junit:junit:4.11"  
        ) 
    }

}

// 子模块配置
project(':core') {  
    dependencies {
    	compile "joda-time:joda-time:2.2"
    }
}  


project(':web') {  

}
```

子模块配置也可以写在子模块目录build.gradle下。




参考  
[使用Gradle构建Java项目](http://www.importnew.com/15881.html)  
[Gradle构建多模块项目 ](https://yq.aliyun.com/articles/25589)  
[Gradle 修改 Maven 仓库地址](https://yrom.net/blog/2015/02/07/change-gradle-maven-repo-url/)

更多文档  
[Gradle 用户手册](http://pkaq.org/gradledoc/docs/userguide/userguide.html)