---
title: innodb中的锁
date: 2017-01-12 17:30:45
tags:
---
共享锁（S lock）：允许事务读一行数据
排他锁（X lock）：允许事务删除或更新一行数据

一致性非锁定读
>何谓数据版本？即为数据增加一个版本标识，在基于数据库表的版本解决方案中，一般是通过为数据库表增加一个 “version” 字段来实现。读取出数据时，将此版本号一同读出，之后更新时，对此版本号加一。此时，将提交数据的版本数据与数据库表对应记录的当前版本信息进行比对，如果提交的数据版本号大于数据库表当前版本号，则予以更新，否则认为是过期数据。

通过行多版本控制（multi versioning）的方式来读取当前执行时间数据库中行的数据。如果读取的行正在执行delete或update操作，这时读取操作不会因此去等待行上锁的释放。相反，InnoDB存储引擎会读取行的一个快照数据。快照数据指该行的之前版本的数据，该实现是通过undo段来完成，而undo用来在事务中回滚数据，因此快照数据本身没有额外的开销。

每行记录可能有多个版本。

在read committed和repeatable read级别下，InnoDB存储引擎使用非锁定的一致性读。在read committed级别下，总是读取被锁定行的最新一份快照数据。而repeatable read级别下，读取事务开始时的行数据版本。

**例子**

一致性锁定读
用户显式对数据库读取操作加锁以保证数据逻辑的一致性。
InnoDB存储引擎对于select语句支持两种一致性的锁定读操作：
select ... for update
select ... lock in share mode
select ... for update对读取的行记录加一个X锁，其他事务不能对已锁定的行加任何锁。select ... lock in share mode对读取的行记录加一个S锁，其他事务可以向被锁定的行S锁，但如果加X锁，则被阻塞。

但一致性非锁定读都可以读取。
上述两个语句必须在一个事务中，事务提交了，锁就释放了。


record lock:  单行记录上的锁
gap lock: 间隙锁，锁定一个范围，但不包含记录本身
next-key lock: gap lock+record lock,锁定一个范围，并且锁定记录本身。


Phantom problem（幻读）是指同一事务下，连续执行两次同样的sql语句可能导致不同的结果，每二次的sql语句可能返回之前不存在的行。

参考：
[MySQL技术内幕](https://book.douban.com/subject/24708143/)
[何登成的技术博客-MySQL 加锁处理分析](http://hedengcheng.com/?p=771)