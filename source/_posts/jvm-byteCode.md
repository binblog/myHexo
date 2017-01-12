---
title: jvm字节码执行
date: 2017-01-12 10:26:06
toc: true
tags:
- jvm
---

## 栈桢
Java虚拟机栈是线程运行时的数据结构。而栈桢（Stack Frame）是虚拟机栈的栈元素，用于支持虚拟机进行方法调用和执行。一个方法开始执行时，jvm都会创建一个栈桢并添加到虚拟机栈顶，而方法执行完成或抛出异常后将移除该栈桢。  
每一个栈桢都包含如下元素：  
+ 局部变量表
+ 方法返回地址
+ 操作数栈
+ 动态连接

### 局部变量表
局部变量表是一组变量值存储空间，包含了在方法执行时使用的所有的变量。包括`this`，所有的方法参数和方法内定义的局部变量。编译期间，局部变量表的最大容量就已经确定，存储在Class文件中方法的Code属性的max_locals数据项中。

局部变量与数组类似，通过索引来寻址。第一个局部变量的索引为零。实例方法中，第0个局部变量是`this`

单个局部变量空间可以保存boolean，byte，char，short，int，float，reference或returnAddress类型的值。而long类型或double类型的值将占用两个连续的局部变量空间。

### 操作数栈
操作数栈是一个后入先出栈。编译期间，操作数栈的最大深度也确定，存储在Class文件中方法的Code属性的max_stacks数据项中。
执行字节码时，会不断操作数栈，类似于本地cpu使用通用寄存器。
操作数栈是一个后入先出栈。大多数JVM字节代码通过push, pop, duplicate, swap，执行产生或消耗值的操作来操作操作数。因此，在字节代码中非常频繁地在局部变量数组和操作数堆栈之间移动值。 例如，简单的变量初始化导致与操作数栈交互的两个字节代码。  
`int i = 0;`  
该代码将会被编译为如下byte code：
```
 0:	iconst_0	// Push 0 to top of the operand stack
 1:	istore_1	// Pop value from top of operand stack and store as local variable 1
```


### 方法返回地址
方法退出后，都需要回到方法被调用的位置，程序才能继续执行。方法返回时可能需要在栈帧中保存一些信息，用于帮助恢复它的上层方法的执行状态。一般，方法正常退出，调用者的PC计数器的值可以作为返回地址，栈帧中很可能保存这种值。而方法异常退出时，返回地址是通过异常处理器确定的，栈帧一般不会保存这部分信息。
方法退出的过程实际是等于把当前栈帧出栈，因些退出时可能执行的操作有：恢复上层方法的局部变量表和操作数栈，把返回值（如果有）压入调用者栈帧的操作数栈中，调整PC计数器的值以指向方法调用指令后面的一条指令等。

### 动态连接
C/C ++代码通常编译为object文件，然后将多个object文件链接在一起，产生可用文件，如exe或dll。在链接阶段期间，每个目标文件中的符号引用被替换为实际存储器地址。 但在Java中，这个链接阶段可以在编译或运行时完成。  

当编译Java类时，变量和方法引用都作为符号引用存储在类的常量池中。符号引用是逻辑引用，而不是指向实际物理内存位置的直接引用。JVM实现可以选择何时解析符号引用，它可以发生在类加载后的类文件验证期间（静态解析），或符号引用第一次使用时（延迟解析）。
除了invokedynamic指令外，虚拟机会对符号引用第一次解析结果进行缓存，以后的引用可以直接使用缓存的结果 。


## 解析/分派
Java虚拟机中提供了5条方法调用字节码指令：
+ invokestatic：调用静态方法
+ invokespecial：调用实例构造器<init>方法，私有方法和父类方法
+ invokevirtual：调用所有的虚方法
+ invokeinterface：调用接口方法，会在运行时再确定一个实现该接口的对象。  
+ invokedynamic: 先在运行时动态解析出调用点限定符所引用的方法，然后再执行该方法。

### 静态解析
在类加载的解析阶段，会将一部分符号引用转化为直接引用，这种解析能成立的前提是：方法在程序真正运行之前就有一个可确定的调用版本，并且这个方法的调用版本在运行期不可改变。也就是，调用目标在程序代码写好，编译器进行编译时必须确定下来。主要包括静态方法和私有方法两大类。静态方法与类型直接关联，私有方法在外部不可访问。它们不可能通过继承或重写其他版本。   
只要能被invokestatic和invokespecial指令调用的方法，都可以在解析阶段确定唯一的调用版本，包括静态方法，私有方法，实例构造器，父类方法，它们在类加载时间就会把符号引用解析为该方法的直接引用。这些方法称为非虚方法。其他方法则为虚方法。而final方法虽然使用invokevirtual，但它无法被覆盖，也是一种非虚方法。

### 分派
一个小栗子
```
public class Dispatch {
    public void printTime(java.util.Date date) {
        System.out.println("date : " + date.toString());
    }

    public  void printTime(java.sql.Time time) {
        System.out.println("time : " + time.toString());
    }

    public static void main(String[] args) {
        Dispatch dispatch = new Dispatch();
        java.util.Date date = new java.util.Date();
        java.util.Date time = new java.sql.Time(date.getTime());
        dispatch.printTime(date);
        dispatch.printTime(time);
    }
}
```
输入结果：
```
date : Thu Jan 12 10:57:22 GMT+08:00 2017
date : 10:57:22
```
我们都知道，java.sql.Time time继承了java.util.Date。可以看到，上述代码中两次`printTime`都调用了重载方法`printTime(java.util.Date date)`, 而方法中`date.toString()`则分别调用到`Date.toString()`和`Time.toString()`方法。

在`java.util.Date time = new java.sql.Time(date.getTime());`这个变量定义语句中，java.util.Date为变量的**静态类型**或外观类型，而java.sql.Time为变量的**实际类型**。变量本身的静态类型不会被改变，并且最终的静态类型是在编译期可知。而实际类型在运行期才可确定，编译器在编译程序的时候并不知道一个对象的实际类型是什么。

**因为静态类型是编译期可知的，虚拟机（准确来说是编译器）在重载时通过参数的静态类型而不是实际类型作为判定依据的，来决定使用哪个重载方法。这是静态分派。**
**而对于重写方法的调用，虚拟机需要在运行期间确认调用者的实际类型，如果实际类型中找不到方法定义，则按继承关系从下往上对其父类进行查找。这是动态分派。**

通过`javap -v Dispatch.class`可以查看class中方法字节码，可以看到main方法中如下代码
```
        dispatch.printTime(date);
        dispatch.printTime(time);
```
被编译为如下字节码
```
aload_1		
aload_2
invokevirtual #19                 // Method printTime:(Ljava/util/Date;)V
aload_1
aload_3
invokevirtual #19                 // Method printTime:(Ljava/util/Date;)V
return
```
可以看到，编译期间，已经决定了这两行代码将调用重载方法`printTime(java.util.Date date)`。

而`printTime(java.util.Date date)`方法中的`date.toString()`调用将编译为如下字节码：
```
aload_1
invokevirtual #7                  // Method java/util/Date.toString:()Ljava/lang/String;
```
invokevirtual指令执行时会先确定接收者的实际类型，所以两次调用invokevirtual指令会将把常量池方法符号引用解析到了不同的直接引用。

## 字节码执行
java编译器输入的指令流，基本上是一种基于栈的指令集架构，指令流中指令大部分都是零地址指令，它们依赖操作数栈进行工作。
一个坏味道的小栗子
```
public class FinallyDemo {

    public static int getVal() {
        int i = 0;
        try {
            i = i + 1;
            return i;
        } finally {
            i = 2;
        }
    }

    public static void main(String[] args) {
        System.out.println(getVal());
    }
}
```
上述代码中finally的语句是一定执行的，也就是i会被赋值为2，但程序最终输出结果是1。


通过javap解析class文件，查看到getVal方法解析结果如下：
```
  public static int getVal();
    descriptor: ()I		// 方法描述
    flags: ACC_PUBLIC, ACC_STATIC	// 方法标识:public 
    Code:	// 字节码
      stack=2, locals=3, args_size=0	// 操作数栈深度为2, 局部变量容量为3 方法个数为0
         0: iconst_0	// push一个int常量（0）到操作栈顶
         1: istore_0	// 将操作栈顶int值存到第0个索引的局部变量(int i = 0;)
         2: iload_0		// 将第0个索引的局部变量加载到操作栈顶
         3: iconst_1	// push一个int常量（1）到操作栈顶
         4: iadd		// 从操作栈中pop出两个int值,执行add,并将结果push到操作栈顶
         5: istore_0	// 将操作栈顶int值存到第0个索引的局部变量(i = i + 1;)
         6: iload_0		// 将第0个索引的局部变量加载到操作栈顶
         7: istore_1	// 将操作栈顶int值存到第1个索引的局部变量(这里将i的值复制了一份存到第1个索引的局部变量)
         8: iconst_2	// push一个int常量（2）到操作栈顶
         9: istore_0	// 将操作栈顶int值存到第0个索引的局部变量(i = 2;)
        10: iload_1		// 将第1个索引的局部变量加载到操作栈顶
        11: ireturn		// pop操作栈顶的int值,并将其推入调用器的帧的操作数栈。(返回第1个索引的局部变量的值)
        12: astore_2	// 将异常reference存到第2个索引的局部变量(开始异常处理了)
        13: iconst_2	// push一个int常量（2）到操作栈顶
        14: istore_0	// 将操作栈顶int值存到第0个索引的局部变量(i = 2;)
        15: aload_2		// 将第2个索引的局部变量加载到操作栈顶
        16: athrow		// 通过athrow退出
      Exception table:	// 异常表
         from    to  target type		
             2     8    12   any	// 在#2到#7发生的所有异常，都跳转到#12开始处理。
      LineNumberTable:
        line 8: 0
        line 10: 2
        line 11: 6
        line 13: 8
        line 11: 10
        line 13: 12
      StackMapTable: number_of_entries = 1
        frame_type = 255 /* full_frame */
          offset_delta = 12
          locals = [ int ]
          stack = [ class java/lang/Throwable ]
```

可以看到finally 中的语句`i = 2;`被编译成了两份字节码，一份在正常执行的流程中，另一份在异常处理的流程，这样保证了无论是正常执行还是抛出异常，都能执行finally 中的语句。
```
		 6: iload_0		// 将第0个索引的局部变量加载到操作栈顶
		 7: istore_1	// 将操作栈顶int值存到第1个索引的局部变量(这里将i的值复制了一份存到第1个索引的局部变量)
		 8: iconst_2	// push一个int常量（2）到操作栈顶
		 ...
		 10: iload_1		// 将第1个索引的局部变量加载到操作栈顶
         11: ireturn		// pop操作栈顶的int值,并将其推入调用器的帧的操作数栈。(返回第1个索引的局部变量的值)
```
在上面代码中，可以看到jvm将i的值复制了一份，存放到另一个变量中，最后该变量的值返回,所以上面例子中最后返回的值是1。


错漏之处，还望指教。

参考：
[深入理解Java虚拟机（第2版）](https://book.douban.com/subject/24722612/)
[The Java Virtual Machine Instruction Set ](https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-6.html)