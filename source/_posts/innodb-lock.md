---
title: innodb中的锁
date: 2017-01-12 17:30:45
toc: true
tags:
- mysql
---

## 一致性非锁定读
>何谓数据版本？即为数据增加一个版本标识，在基于数据库表的版本解决方案中，一般是通过为数据库表增加一个 “version” 字段来实现。读取出数据时，将此版本号一同读出，之后更新时，对此版本号加一。此时，将提交数据的版本数据与数据库表对应记录的当前版本信息进行比对，如果提交的数据版本号大于数据库表当前版本号，则予以更新，否则认为是过期数据。

通过行多版本控制（multi versioning）的方式来读取当前执行时间数据库中行的数据。如果读取的行正在执行delete或update操作，这时读取操作不会因此去等待行上锁的释放。相反，InnoDB存储引擎会读取行的一个快照数据。快照数据指该行的之前版本的数据，该实现是通过undo段来完成，而undo用来在事务中回滚数据，因此快照数据本身没有额外的开销。

每行记录可能有多个版本。

在read committed和repeatable read级别下，InnoDB存储引擎使用非锁定的一致性读。在read committed级别下，总是读取被锁定行的最新一份快照数据。而repeatable read级别下，读取事务开始时的行数据版本。



## 一致性锁定读

### Shared and Exclusive Locks
共享锁（S lock）：允许事务读一行数据
排他锁（X lock）：允许事务删除或更新一行数据

用户显式对数据库读取操作加锁以保证数据逻辑的一致性。
InnoDB存储引擎对于select语句支持两种一致性的锁定读操作：
select ... for update
select ... lock in share mode
select ... for update对读取的行记录加一个X锁，其他事务不能对已锁定的行加任何锁。select ... lock in share mode对读取的行记录加一个S锁，其他事务可以向被锁定的行S锁，但如果加X锁，则被阻塞。
上述两个语句必须在一个事务中，事务提交了，锁就释放了。



### Phantom problem
Phantom problem（幻读）是指同一事务下，连续执行两次同样的sql语句可能导致不同的结果，每二次的sql语句可能返回之前不存在的行。

record lock:  单行记录上的锁
gap lock: 间隙锁，锁定一个范围，但不包含记录本身
next-key lock: gap lock+record lock,锁定一个范围，并且锁定记录本身。next-key lock是索引记录锁加上前一间隙上的间隙锁。

一个小栗子
```
create table t(a int, b int, primary key(a), key(b));
insert into t select 1,1;
insert into t select 3,3;
insert into t select 5,5;
insert into t select 7,7;
insert into t select 9,9;
```


时间|会话A|会话B
---|---|---
1|begin;|
2|select * from t where a = 5 for update;|
3| |begin;
4| |insert into t select 4,4;(阻塞)
5|commit;| (insert成功)
6| | commit;
可以看到，会话B中的insert语句将被阻塞。

sql语句通过索引列b进行查询，innodb将使用next-key locking技术加锁，innodb还会对辅助索引下一个键值加上gap lock。
在执行insert语句前，如`insert into t select 4,4;`,会检查b的间隙(3,5)这个区间是否存在gap锁，如果存在，则阻塞。
使用`SHOW ENGINE INNODB STATUS\G`查询状态，可以看到
```
TRANSACTIONS
------------
Trx id counter 7454
Purge done for trx's n:o < 7444 undo n:o < 0 state: running but idle
History list length 21
LIST OF TRANSACTIONS FOR EACH SESSION:
---TRANSACTION 7453, ACTIVE 6 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 2 lock struct(s), heap size 1136, 1 row lock(s), undo log entries 1
MySQL thread id 16, OS thread handle 5208, query id 115 localhost ::1 root executing
insert into t select 4,4
------- TRX HAS BEEN WAITING 6 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 39 page no 4 n bits 80 index b of table `hello`.`t` trx id 7453 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 4 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000005; asc     ;;
 1: len 4; hex 80000005; asc     ;;

```



gap lock的作用是为了阻止多个事务将记录插入到同一范围，避免Phantom problem问题。在上一栗子中，会话A已经锁定了b=5的记录，如果没有gap lock锁定b间隙(3, 5),则插入记录[4, 5]成功，就会发生Phantom problem问题。

但在唯一索引上，next-key lock会降级为record lock。如锁住了a=5的记录，不需要a间隙(3, 5),因为a是唯一索引，不能再插入一个a=5的记录。

时间|会话A|会话B
---|---|---
1|begin;|
2|select * from t where a = 5 for update;|
3| | begin;
4| | insert into t select 4,4;(不阻塞,成功)
5|commit;| 
6| | commit;

删除时也不能删除有行锁的记录。



innodb支持如下锁：
+ Shared and Exclusive Locks	共享锁和排他锁
+ Intention Locks	意向锁
+ Record Locks	行锁
+ Gap Locks		间隙锁
+ Next-Key Locks	Next-Key锁
+ Insert Intention Locks	
+ AUTO-INC Locks 

详细可见：[InnoDB Locking](https://dev.mysql.com/doc/refman/5.6/en/innodb-locking.html)

写得比较简单，如有错误，还望指教。

参考：
[MySQL技术内幕](https://book.douban.com/subject/24708143/)
[何登成的技术博客-MySQL 加锁处理分析](http://hedengcheng.com/?p=771)