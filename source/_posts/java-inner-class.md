---
title: java 内部类
date: 2016-10-10 22:34:14
tags:
  - java
categories:
  - java
---

本文记录了笔者对于内部类的一些思考及使用总结


**成员内部类方法可以访问其外部类所有成员（属性和方法）（包括private成员）** 而外部类也可以调用内部类所有成员(包括private成员)  
**成员内部类可以用可见性修饰符private,protected,public修饰**

**方法内部类可以访问其外部类所有成员(包括private成员)，也可以访问所在方法`final`修饰的局部变量**

<!--more-->

非静态内部类依赖于外部类，不能有*非final修饰的static属性*。

静态内部类可以使用可见性修饰符修饰，不能访问外部类非static的属性和方法。

### 使用情景  
使用内部类主要利用它的两个特点： 
1. 内部类拥有指向外部类的一个引用，所以它们能访问外部类的成员（包括private成员）——毋需取得任何资格。  
2. 内部类可以使用可见性修饰符修饰，可以非常方便地隐藏实施细节。

```
interface Selector<T> {
    boolean end();
    T current();
    void next();
}


public class Sequence<T> {
    private T[] o;
    private int next = 0;
    public Sequence(int size) {
        o = (T[]) new Object[size];
    }
    public void add(T x) {
        if(next < o.length) {
            o[next] = x;
            next++;
        }
    }

    private class SSelector<T> implements Selector<T> {
        int i = 0;
        public boolean end() {
            return i == o.length;
        }
        public T current() {
            return (T)o[i];
        }
        public void next() {
            if(i < o.length) i++;
        }
    }
    public Selector getSelector() {
        return new SSelector();
    }
}
```
Sequence如果不使用内部类，是无法实现一个Selector对T[]进行操作，因为T[]数组是private，外部类无法访问。   
同时SSelector使用了private修饰，其他类可以使用
`Selector s = new Sequence(10).getSelector();`
来引用，但完成无法访问SSelector的实现。  
使用内部类可完全禁止其他人依赖类型编码，并可将具体的实施细节完全隐藏起来。

 **匿名内部类实现事件回调**  
 由于内部类的这两个特点，使得内部类非常适用于实现事件回调操作。
 
 ```
 Arrays.sort(persons, new Comparator<Person>() {
    public int compare(Person p1, Person p2) {
        return p1.getAge() - p2.getAge();
    }
});
```
这是匿名内部类最常使用的情况了



**双重继承**  
这种使用情况并不多
```
class Camera {
    public void photograph() {};
}

class  PlayStation {
    public void play() {};
}

public class  Phone extends  PlayStation {
    class  PhoneWithCamera  extends  Camera {
        public void screenshot() {
            play();
            photograph();
        }
    }
}

```
内部类PhoneWithCamera可以同时调用Camera和PlayStation类的方法，与双重继承有点相似   
但其实内部类更类似于自动组合了其外部类：
```
class  PhoneWithCamera  extends  Camera { 
    private Phone phone =  new Phone(); // 组合了一个外部类对象
}
```


**由于内部类自动持有对外部类的引用，所以也要考虑其对内存回收的影响**