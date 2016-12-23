---
title: mysql整数类型范围
date: 2016-10-26 21:41:5i9
tags: mysql
---
mysql建表语句中，  
varchar(5)表示varchar最多可以存储5个字符（不是字节）  
decimal(18,9)表示小数点两边各存储9个数字，一共使用9个字节：小数点前的数字用4个字节，小数点后的数字用4个字节，小数点占1个字节。      
**但整数类型int(5)并不表示int只可以存储5位的整数，`(5)`对于大多数应该没有意义，它不会限制值的合法范围，只是规定了MySql的一些交互工具（如MySql命令行客户端）用于显示字符的个数。对于存储和计算来说，int(1)和int(20)是相同的**  *这点可能会造成误导，必须小心*


<!--more-->
下面是整数类型真正的有效值范围


type | Storage(Bytes) | Minimum Value | Maximum Value 
---|---|---|---
TINYINT | 1 | -128 | 127
Unsigned TINYINT | 1| 0 | 255
SMALLINT | 2 | -32768 | 32768
Unsigned | 2 | 0 | 65535
MEDIUMINT | 3 | -8388608 | 8388608
Unsigned | 3 | 0 | 16777215
INT	|4	|-2147483648|	2147483647
Unsigned | 4 | 0 | 4294967295
BIGINT|8|-9223372036854775808|9223372036854775807
Unsigned|8|	0 |18446744073709551615



