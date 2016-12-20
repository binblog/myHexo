---
title: node js安装及hexo简单使用
date: 2016-10-08 23:14:20
tags:
- hexo
---
### 安装
从 [node.js官网](https://nodejs.org/en/) 下载安装文件，正常安装即可  
安装完成后，在cmd中运行命令，查看到版本号即安装成功  
```
    $ npm -v
    2.15.9
```
<!--more-->
### 配置
```
    // 设置npm安装程序时的默认位置
    npm config set prefix "E:\node"
    
    
    // 设置npm安装程序时的缓存位置
    npm config set cache "E:\nodeCache"
```
运行下面命令可查看配置结果
```
    $ npm config get prefix
    e:\node
    
    # npm config get cache
    E:\nodeCache
```
我的是win7系统，所以在`计算机-属性-高级系统设置-高级-环境变量中`中的Path变量中添加npm安装程序目录E:\node    
必须配置该参数，否则无法在cmd中直接调用node的全局模块。


### 安装模板
以安装hexo为例  
运行命令  
```
$ npm install hexo-cli -g  
```

-g参数表示安装为全局模块

安装完成后运行命令查看版本
```
    $ hexo version
    hexo-cli: 1.0.2
    os: Windows_NT 6.1.7601 win32 ia32
    http_parser: 2.7.0
    node: 4.6.0
    v8: 4.5.103.37
    uv: 1.9.1
    zlib: 1.2.8
    ares: 1.10.1-DEV
    icu: 56.1
    modules: 46
    openssl: 1.0.2j
```
安装成功。

### 简单记录hexo的使用
#### 入门使用
```
$ hexo init hexo  #执行init命令初始化到你指定的hexo目录  
$ cd hexo

$ hexo g #生成静态文件
$ hexo s #运行服务器
INFO  Start processing
INFO  Hexo is running at http://localhost:4000/. Press Ctrl+C to stop.
```
这时访问 http://localhost:4000/ 可以看到如下界面：
![image](/images/nodeJs-hexo/hexo_first.png)

此时hexo已经正常运行，使用的是默认主题landscape。  

运行`$ hexo init hexo `后可以看到hexo目录结构大致为
```
|-- _config.yml
|-- public
|-- scaffolds
|-- scripts
|-- source
   |-- _posts
|-- themes
```
其中_config.yml文件用于配置hexo，source下存放的是markdown 语法的文章内容，public存放的是hexo生成的静态文件，themes为主题文件


对主题的使用，请参考流行主题NexT ： [NexT文档](http://theme-next.iissnan.com/)

常用命令
```
文章中插入阅读更多`<!--more-->`
分类，二级类
categories:
- f2e
- html、css


$ hexo n "文件名"	# 生成新的文章
$hexo new draft "草稿文件" #生成一个草稿文件(并不会在博客中显示)
$hexo publish "草稿文件名" #发布草稿文件 (默认发布到_posts,类似于移动文件)
$hexo server --draft #开启服务，会渲染草稿文件

$hexo clean #清理工作目录
$hexo g #生成public pages
$hexo d #git部署(配置过_config.yml)

hexo d -g #合并上两个操作

```

#### 发布
发布时出现异常
```
$ hexo d
ERROR Deployer not found: git
```

运行以下命令安装git发布工具
```
    $ npm install hexo-deployer-git --save
```

_config.yml中发布信息可以使用如下配置
```
deploy:  
type: git
repository: https://usename:password@github.com/...
branch: master
```
在repository的url中带上github用户名及密码 https://usename:password@github.com/...  
参考：  
[使用Hexo搭建个人博客(基于hexo3.0)](http://opiece.me/2015/04/09/hexo-guide/)  
[Hexo+nexT页脚美化](http://www.wuxubj.cn/2016/07/footer-beautify-of-nexT/index.html)
