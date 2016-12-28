---
title: java转义字符
date: 2016-11-06 17:06:37
tags:
  - java
categories: 
- java
---
简单总结了java中转义字符的使用。

<!--more-->

**八进制转义序列**
`\` + 三位八进制数字  
范围: `'\000'`~`'\377'`  
如 `\101` 表示`A`（101为十进制数字65）
 
参考：[ASCII字符集](https://zh.wikipedia.org/wiki/ASCII)


**Unicode转义字符**  
`\u` + 四个十六进制数字
范围: `\u0000` ~ `\ufffff`

参考：[Unicode字符列表](https://zh.wikipedia.org/wiki/Unicode%E5%AD%97%E7%AC%A6%E5%88%97%E8%A1%A8)


**特殊字符**  
双引号：\\"  
单引号：\\'  
反斜线：\\\\


**控制字符**  
回车：\r  
换行：\n  
走纸换页：\f  
横向跳格：\t  
退格：\b


**正则表达式中需要转义的字符**

元字符 | 说明
---|---
^ | 匹配整个字符串的起始位置，或者行的起始位置，如果在字符组内部，则表示排除型（negative）字符组
$ | 匹配整个字符串的结束位置，或者行的结束位置
() | 分组，提供反向引用(gourp1) \1或多选分支
* + ? | 量词，限定之前元素出现的次数
. | 默认情况下匹配换行符之外的任意字符，在多行模式下可以匹配换行符
[ | 字符组的起始符号
\ | 反斜线用来表示转义序列，或去掉元字符的转义
{ | 重现限定符的开始
&#124; | 划分多选分支（括号没有出现时，可以想象括号出现在整个表达式最外层）

表格中的元字符在正则表达式中使用，需要使用反斜杠`\`转义为普通字符，但`\`在java中是特殊字符，需要使用`\\`表示

```
String t = "123|456|789";

		
t.replace("|", ",");    // 123,456,789

t.replaceAll("\\|", ",");   // 123,456,789

t.replaceFirst("\\|", ","); // 123,456|789
```

注意上面三个方法，  
`replace(char oldChar, char newChar) `两个参数都是字符串，所以`|`不需要转义。 
`replace(CharSequence target, CharSequence replacement) 
`与`replaceAll(String regex, String replacement) `第一个参数为正则表达式，第二个参数为字符串。所以`|`需要使用转义`\\|`

参考  
[
正则表达式（一）：纠结的转义](http://www.infoq.com/cn/news/2011/01/regular-expressions-1)  
[你真的会用java replaceAll函数吗？](http://www.cnblogs.com/iyangyuan/p/4809582.html)  
[Java转义符\\|](http://www.cnblogs.com/yaochc/p/4574910.html)