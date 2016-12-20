---
title: hexo next 添加背景图片
date: 2016-10-10 22:43:41
tags:
- hexo
---
记录一下怎样在hexo的next主题上添加背景图片
<!--more-->
1.  在hexo（hexo工程文件）-> themes -> next -> source -> images 下添加背景图片background.png
2.  hexo（hexo工程文件）-> themes -> next -> source -> css -> _schemes -> Mist -> index.styl，在文件开头添加如下样式：
```
@media screen and (min-width: 768px) {
    body { 
    	background:url(/images/background.png);
    	background-size: 100% 100%;
    	background-attachment:fixed
    }
}
```

3. 如果需要去掉上方导航栏的背景色，可以在 hexo（hexo工程文件）-> themes -> next -> source -> css -> _schemes -> Mist -> _header.styl 文件开始，将   
`.header { background: $whitesmoke; }` 修改为  
`.header { background: none; }`

参考：  
[给hexo个人博客 next主题添加背景图片](http://blog.csdn.net/wang631106979/article/details/51375184)