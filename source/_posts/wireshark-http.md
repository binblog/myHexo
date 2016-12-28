---
title: Wireshark分析http请求
date: 2016-11-27 17:00:48
toc: true
tags: http
---
使用Wireshark分析一个http请求的栗子，包括握手，挥手过程，内容传输等。
<!--more-->


## 一个小栗子
client(10.3.20.42)向server(ec2-54-70-215-146....)发送http请求，获取一个html页面。
```
curl http://54.70.215.146:8080/
```

使用Wireshark抓包
![image](http://ofbrwsjmr.bkt.clouddn.com/wireshark_http/1.png)



## 三次握手

报文NO34,NO45,NO46为三次握手报文。（NO序号为Wireshark创建的序号，与http无关）

已知tcp报文格式为
![tcp报文格式](http://ofbrwsjmr.bkt.clouddn.com/wireshark_http/3.png)


需要关注的tcp标志
>SYN：携带这个标志的包表示正在发起连接请求。因为连接是双向的，所以建立连接时，双方都要发一个SYN。  
FIN: 携带这个标志位的包表示正在请求终止连接。因为连接是双向的，所以彻底关闭一个连接时，双方都要发一个FIN。  
RST：用于重置一个混乱的连接，或拒绝一个无效的请求。

>seq号：TCP提供有序的传输，所以每个数据段都要标上一个序号。当接收方接收到乱序的包时，可以根据序号重新排序。TCP是双向的，双方都可以是发送方，所以各自维护了一个Seq号。  
ack号：确认号，接收方向发送方确认已经收到了哪些字节。如甲向乙发送了“Seq:x   len:y”的数据段给乙，那乙回复Ack为x+y，表示它已经收到x+y之前的所有字节。同样，Ack号恰好应该是发送方下一个Seq号。

三次握手过程为

![@startuml
	Client->>Server:SYN=1 seq=x 
	Server->>Client:SYN=1 ACK=1 seq=y ack=x+1
	Client->>Server:ACK=1 seq=x+1 ack=y+1
@enduml](/images/wireshark_http/1.png)

(ACK=1表示ACK标志为1，ack则表示ack确认号)  
现在来看报文No34,No45,No46  
NO34是Client向Server发送SYN标识报文，seq=0，len=0  
NO45是Server回复报文，seq=0，len=0， ack=1  
No46是Client回复报文，seq=1，ack=1


## Http请求
报文NO47是Client向Server发送的http请求
详细的报文内容为
![image](http://ofbrwsjmr.bkt.clouddn.com/wireshark_http/2.png?v=20150430)

红框为Wireshark为分析的结果，可以查看到网络分层结构
```
Ethernet II 以太网协议  
Internet Protocol Version 4  ip协议  
Transmission Control Protocol  tcp协议
Hypertext Transfer Protocol 超文本(http)协议

```

一个完整的http报文包括如下内容  
![image](http://ofbrwsjmr.bkt.clouddn.com/wireshark_http/4.png)



黑框为原始的报文数据，以16进制显示（我点击了红框中的Transmission Control Protocol，所以黑框中选中了tcp协议的数据）
按照上图tcp报文格式，可以自行分析tcp协议的数据：
```
f868  源端口63592
1f90  目的端口8080
4b056340  序号号1258644288 
e7fec30c  确认号3892232972 
5018  	二进制1010(数据偏移)00000(保留)011000 (标识位)
0100  窗口256
2c72 检验和   
0000 紧急指针
```
注意图中seq：1，ack：83是Wireshark对tcp进行了分析处理，将Tcp开始序号置为0了，不是真实的序号。  
配置“编辑 -> 首选项 -> Protocols -> Tcp”中，将Relative sequence numbers的选项取消，则可以可以看到真实的序号号和确认号了
![image](http://ofbrwsjmr.bkt.clouddn.com/wireshark_http/5.png)

报文NO48为Server回复的Ack报文，ack=1+82=83

## Http回应
NO49到NO53，是TCP层收到上层大块报文后分解发出的数据段。TCP根据MSS（即每个TCP包所能携带的最大数据量，报文NO34中已经指定了MSS为1460）进行分段发送。

这几个TCP segment数据段的ack都是83，len都是1460

报文No54为Client发送的Ack报文，ack = 1+1406*5=7301，seq=83，表示已经成功接收seq7301前的数据


NO55到NO57依然为TCP segment数据段。  
报文NO58是Server发送的Http报文，包括了html页面中剩余部分，与前面的TCP segment数据段构成完整的html页面。  

NO59是Client发送的ack
NO60包括了两个标志，一个是Server的ack标志，别一个是Fin标志，表示Server请求关闭连接。  

## 四次挥手
四次挥手过程

![@startuml
	Server->>Client: FIN=1 seq=x
	Client->>Server: ACK=1 seq=y ack=x+1
	Client->>Server: FIN=1 seq=x
	Server->>Client: ACK=1 ack=y+1
@enduml](/images/wireshark_http/2.png)

上面已经说了，  
报文60包括了FIN标志，Seq=82  
NO62也包括了两个标志，一个ACK标志，ack序号为84，同时它也包括了FIN标志，seq序号为11370  
报文No63为Server回复的ACK报文，ack序号为11371，四次挥手完成。

至此，一次完整的http请求完成了。



上述内容中并没有包括tcp的一个重要协议：滑动窗口协议(如报文NO34声明了自己的接收窗口Win=9182)  
[TCP协议的滑动窗口具体是怎样控制流量的？ -郭无心的回答](https://www.zhihu.com/question/32255109/answer/68558623)  

参考  
[Wireshark网络分析就这么简单](https://book.douban.com/subject/26268767/)  
[wireshark中“tcp segment of a reassembled pdu”的解释](http://blog.csdn.net/doupei2006/article/details/7539945)
[TCP三次握手四次挥手](https://segmentfault.com/a/1190000006885287)  
[TCP报文结构 ](http://blog.csdn.net/qq_16681169/article/details/50831856)

[网络基本功系列](https://wizardforcel.gitbooks.io/network-basic/content/index.html)