---
title: effective java 泛型
date: 2016-11-06 17:37:02
tags:
- java
---
### 不要在再使用原生态类型
声明中具有一个或多个 *类型参数* 的类或接口就是泛型

原生态类型：即不带任何实际类型参数的泛型，如List<E>对应的原生态类型为List。  
**如果使用原生态类型，就失去了泛型在安全性和表述性方面所有优势。**

原生态类型List与参数化类型List<E>之间有区别在于前者逃避了泛型检查，而后者则表明它能够持有任意类型的对象。而且泛型有子类型化的规则，List<String>是原生态类型List的一个子类型，但不是参数化类型List<Object>的子类型。

如果不关心或不确定实际的类型参数，可以使用无限制的通配符类型Set<?>，通配符类型是安全，不能将任何元素（除了null之外）放到Set<?>。

由于泛型在运行时被擦除，**在类文字（class literal）中必须使用原生态类型** 规范不允许使用参数化类型（但允许数组类型和基本类型），即List.class，String[].class和int.class是合法的，但List<String>.class和List<?>.class不合法。  

在参数化类型而非无限制通配符上使用instanceof操作符是非法的。`set instanceof Set<?>`是合法的，但与`set instanceof Set`无任何区别。

对泛型使用instanceof操作首选方案：
```java
if(set instanceof Set) {
    Set<?> m = (Set<?>)set;
}
```
注意此处将set转换为通配符类型Set<?>，而不是原生类型Set


### 消除非受检警告
**尽可能消除每一个非受检警告**
如果无法消除警告，而且可以证明引起警告的代码是类型安全的（只在在这种情况下），可以用一个@SuppressWarnings("unchecked")  
**应该始终在尽可能小的范围中使用SuppressWarnings注解。永远不要在整个类上使用SuppressWarnings，这么做会掩盖重要的警告**  



### 列表优先于数组
数组是协变的：如果Sub是Sup的子类型，则Sub[]是Sup[]的子类型。  
泛型是不可变的：对于任意两个不同的类型T1和T2，List<T1>既不是List<T2>的子类型，也不是List<T2>的超类型。

创建泛型，参数化类型或参数化类型的数组都是非法的，如下语句无法通过编译：`new E()`, `new List<String>[]`和`new List<E>()`

如果创建泛型数组合法，则编译器在其他正确的程序中发生的转换就会在运行时失败。
```
List<String>[] strings = new List<String>[1];   // 假设编译通过
List<Integer> ints = Arrays.asList(42);
Object[] objects = strings;     // 数组是协变的，转化为Object[]就失去了类型检查
objects[1] = ints;
String s = strings[0].get(0);   //抛出异常ClassCastException
```
如果创建泛型数组出错，最好的解决方案是优先使用集合类型List<E>，而不是数组类型E[]。


### 优先使用泛型
设计新类型时，如果客户需要（与Object）进行类型转换才能使用，则可以考虑使用泛型。
如
```java
public class Stack {
    Object[] elements;  // 对象存储数组
    public Object pop() {
        ...
    }
    
    public void push(Object e) {
        ..
    }
    ... 
}
```
可以使用泛型
```java
public class Stack<E> {
    E[] elements;  // 对象存储数组
    
    @SuppressWarnings("unchecked")
    public Stack() {
        elements = (E())new Object[default_initial_capacity];   // !   
    }
    
    public E pop() {
        ...
    }
    
    public void push(E e) {
        ..
    }
    ... 
}
```
注意上述代码中 `elements = (E())new Object[default_initial_capacity];` 语句中将Object数组转化为泛型数组，在无法使用列表的情况下，可以使用这种方法创建泛型数组。但相关的数组必须保存在一个私有的域中，永远不要返回给客户或传给任何方法，必须该数组不会存储类型错误的对象。


这个问题可以使用第二种方法，将elements域的类型改用Object[]，pop方法使用
```java
public E pop() {
    @SuppressWarnings("unchecked")
    E result = (E)elements[--size];
    ...
}
```
数组类型的未受检转换比变量的未受检转换更危险，建议使用第二种方法。但如果需要从数组多处读取元素，第二种方法又需要多次转换，所以第一种更常用。

### 优先考虑泛型方法
与类型一样，为了确保新方法不用转换就可以使用，可以优先考虑泛型方法

###  利用有限制通配符提升api的灵活性
上述的Stack类中增加一个方法，将Iterable中所有的元素都加入到Stack中：
```java
public void pushAll(Iterable<E> src) {
    for(E e: src) {
        push(e);
    }
}
```
但这个方法无法将Iterable<Integer>加入到Stack<Number>中，所以需要使用*有限制的通配符类型*，修改pushAll方法为
```java
public void pushAll(Iterable<? extends E> src) {
    for(E e: src) {
        push(e);
    }
}
```
`Iterable<？ extends E> src`表示*类型为E的某种子类的Iterable*。  
Stack类同样提供弹出所有元素到指定集合的方法：
```java
public void popAll(Collection<? super E> dst) {
    while(!isEmpty()) {
        dst.add(pop());
    }
}
```
Collection<? super E> dst表示*类型为E的某种超类的集合*  

为了获得最大限度的灵活性，要在表示生产者或消费者的输入参数上使用通配符类型。如果某个输入参数即是生产者，又是消费者，则应该使用严格的类型匹配。  
**PECS表示producter-extends,consumer-super**   
对于参数类型T的提供类，使用<? extends T>。如pushAll方法中的src参数产生E实例供Stack使用，所以src参数为提供都，类型为Iterable<? extends E>  
对于参数类型T的消费者，使用<? super E>。如popAll的dst参数通过Stack消费E实例，所以dst参数为消费者，类型为Collection<? super E> dst。

**不要使用通配符类型作为返回类型，它会强制用户在客户端使用通配符类型**  

考虑一个方法声明，该方法作用是求List中最大的元素。
```
public static <T> T max(List<T> list) { ... }
```
但该方法声明存在问题，既然求最大的元素，那就要求List中每个元素都能够与列表其他元素相比较，所以可能要求它们实现Comparable接口：
```
	public static <T extends Comparable> T max(List<T> list) { ... 	}
```
但Comparable为泛型接口：
```
public interface Comparable<T> {
    public int compareTo(T o);
}
```
所以需要将Comparable指定参数类型，所有的类型都可以与自身相比较，而且max方法要求参数类型T可以与其他参数类型T相比较，所以T应该实现Comparable<T>
```
	public static <T extends Comparable<T>> T max(List<T> list) { ... }
```
这样通过某个包含类型参数本身的表达式来限制类型参数，就是递归类型限制。

考虑下面两个接口：
```
public interface ScheduledFuture<V> extends Delayed, Future<V> {
}

public interface Delayed extends Comparable<Delayed> {
}
```
如下代码无法编译
```
List<ScheduledFuture> list = new ArrayList<ScheduledFuture>();
System.out.println(max(list));

```
ScheduledFuture继承了其父接口Delayed的Comparable声明，但它并没有声明自身实现Comparable<ScheduledFuture>
(ScheduledFuture也是泛型接口，此处为了方便展示直接使用原生态类型)

这里可以看到max方法中参数list为生产者，而Comparable<T>为消费者，Comparable.compareTo操作需要消费list中的T实例（并产生表示大小关系的数值），所以max声明修改
```
public static <T extends Comparable<? super T>> T max(List<? extends T> list) { ... }
```
现在可以看到List<ScheduledFuture> 可以作为max的传入参数了  

Comparable始终都是消费者，使用Comparable<? super T>优先于Comparable<T>,Comparator也是一样。


### 优先使用类型安全的异构容器