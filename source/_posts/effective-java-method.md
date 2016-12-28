---
title: effective java - 方法
date: 2016-10-12 22:35:24
toc: true
tags:
  - java
categories: 
- java
---
[《Effective Java》](https://book.douban.com/subject/3360807/)读书笔记，关于方法系列。
<!--more-->

## 检查参数有效性
应该在方法开头检查参数，如索引值必须大于0，对象引用不能为null（“应该在发生错误之后尽快检测错误”）

对于公有方法，要用Javadoc的@throws标签在文档中说明违反参数限制会抛出的异常。通常抛出IllegalArgumentException，IndexOutOfBoundException，NullPointerException异常。

如果因为无效参数值导致计算过程抛出的异常，与文档标明方法将抛出的异常不相符，应该使用异常转译。

对于未导出的方法，作为包的创建者，你可以控制这个方法将在哪些情况下被调用，因此你可以确保只将有效的参数值传递进来，所以，非公有方法应该使用断言（assertion）检查参数

**对于有些参数，方法本身没有用到，却被保存起来以后使用，检验这类参数的有效性尤其重要。**


如果有效检查非常昂贵或不切实际，可不用检查。如Collections.sort(List)不用提前检查每个元素是否能够相互比较，这正是sort方法应该做的事情。


<!--more-->

## 必要时进行保护性拷贝
考虑下面这个类是否为一个不可变类：
```
public class Period {
    private final Date start;
    private final Date end;
    
    public Period(Date start, Date end) {
    	if(start.compareTo(end) > 0) {
    		throw new IllegalArgumentException(start + " after " + end);
    	}
    	this.start = start;
    	this.end = end;
     }
    
    public Date getStart() { return start; 	}
    
    public Date getEnd() { return end;	}

}
```
	

这并不是一个不可变类，如：
```
Date start = new Date();
Date end = new Date();
Period period = new Period(start, end);
end.setYear(78);
```
可以看到period的内部被破坏

**对于构造器的每个可变参数进行保护性拷贝是必要的**
```
public Period(Date start, Date end) {
    if(start.compareTo(end) > 0) {
    	throw new IllegalArgumentException(start + " after " + end);
    }
    this.start = new Date(start.getTime());
    this.end = new Date(end.getTime());
}
```
 	
**保护性拷贝在检查参数的有效性之前进行，并且有效性检查是针对拷贝之后的对象，而不是针对原始对象。** 这样可以避免在“从检查参数开始，执行到拷贝参数之间的时间段”，其他线程修改参数

这里没有使用clone方法，因为Date非final类，不能保证子类clone方法一定返回类为java.util.Date的对象，子类可以返回恶意破坏的实例。**对于参数类型可以被不信任方子类化的参数，不要使用clone方法进行保护性拷贝**

上面period仍然可以被改变：
```
Period period = new Period(new Date(), new Date());
period.end.setYear(78);
```
**对返回可变域进行保护性拷贝**
```
public Date getStart() { return new Date(start.getTime()); 	}
public Date getEnd() { return new Date(end.getTime());	}
```

访问方法进行保护性拷贝可以使用clone方法，因为确认Period内部实例为java.util.Date的对象

接受客户提供的对象，有必要考虑一下你的类是否容忍对象进入数据结构后发生变化，同样，返回内部可变组件到客户端之前也要考虑是否容忍对象改变。

## 慎用重载
要调用哪个重载方法，是在编译时做出的决定。
避免胡乱使用重载机制，才能不会陷入到“对于任何一组实例的参数，哪个重载方法是适用的”的困扰中。
**安全而保守的策略是，永远不要导出两个具有相同参数数目的重载方法。如果方法使用可变参数，保守的策略是根本不要重载它。**  
**但如果两个重载方法在同样的参数上被调用，它们执行相同的功能，重载就不会带来危害。可以让更具体化的重载方法把调用转发给更一般的重载方法。**
```
public boolean contentEquals(StringBuffer sb) {
    return contentEquals((CharSequence)sb);
}
```


**自动装箱和泛型，会使谨慎重载显得更加重要了。**


下述代码无法正常删除list中的正数：
```
Set<Integer> set = new TreeSet<Integer>();
List<Integer> list = new ArrayList<Integer>();

for(int i = -3; i < 3; i++) {
    set.add(i);
    list.add(i);
}

for(int i = 0; i < 3; i++) {
    set.remove(i);
    list.remove(i);
}
System.out.println(set + " " + list);
```	
上述代码中输出结果为
`[-3, -2, -1] [-2, 0, 2]`    
因为set只有remove(Object o)方法，而list重载了remove(Object o)和remove(int index)方法，这里调用到remove(int index)，即删除对应下标的元素。
```
for(int i = 0; i < 3; i++) {
    set.remove(i);
    list.remove((Integer)i);
}
```
上述代码才可以正常删除list中的正数。
 
## 慎用可变参数 
在定义参数数目不定的方法时，可变参数方法是一种很方便的方式，但是它们不应该被滥用，如果使用不恰当，会产生混乱的结果  

## 返回零长度的数组或集合，而不是null

## 为所有导出的api编写文档注释
**在每个被导出的类，接口，构造器，方法和域声明之前增加一个文档注释**

**方法的文档注释应该简洁地描述它和客户端之间的约定。这个约定应该说明方法做了什么，而不是怎么做。**  
文档还应该列举这个方法的所有前提条件和后置条件。前提条件是指为了使客户端能够调用这个方法，必须满足的条件。后置条件指调用成功后，哪些条件必须满足。

