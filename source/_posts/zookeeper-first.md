---
title: zookeeper入门
date: 2017-01-09 14:37:41
toc: true
tags: 
  - java
---
## 安装
1.[官网](http://zookeeper.apache.org/)下载，解压
```
# wget -c http://mirrors.cnnic.cn/apache/zookeeper/stable/zookeeper-3.4.9.tar.gz
# tar -xvz -f zookeeper-3.4.9.tar.gz
# cd zookeeper-3.4.9
```
我下载的是最新的稳定版本3.4.9

2.添加配置  
conf目录下默认提供了一个简单的配置文件zoo_sample.cfg作为参考  
创建文件conf/zoo.cfg，内容为
```
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/my/zookeeper-3.4.9/serviceData
clientPort=2181
```
注意先创建dataDir

3.启动
```
# bin/zkServer.sh start
# jps
5156 QuorumPeerMain
6120 Jps
```
默认将使用conf/zoo.cfg作为配置文件启动zookeeper。
jps可以看到QuorumPeerMain进程正在运行。

4.连接
zkCli是zookeeper提供的客户端。
```
# bin/zkCli.sh -server 127.0.0.1:2181
[zk: 127.0.0.1:2181(CONNECTED) 1] ls /
[zookeeper]
[zk: 127.0.0.1:2181(CONNECTED) 2] quit	
#
```

5.关闭
```
# bin/zkServer.sh stop
ZooKeeper JMX enabled by default
Using config: /usr/local/my/zookeeper-3.4.9/bin/../conf/zoo.cfg
Stopping zookeeper ... STOPPED
```



## 单机伪集群配置 

1.创建dataDir：server0和server1，这两个目录下创建myid文件，内容分别为0,1
```
# cat server0/myid
0
# cat server1/myid
1
```
myid中的数字表示服务器id


2.创建两个配置文件conf/zoo0.cfg和conf/zoo1.cfg，内容为

```
#conf/zoo0.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/my/zookeeper-3.4.9/server0
clientPort=2180

server.0=127.0.0.1:2880:3880
server.1=127.0.0.1:2881:3881

#conf/zoo1.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/my/zookeeper-3.4.9/server1
clientPort=2181

server.0=127.0.0.1:2880:3880
server.1=127.0.0.1:2881:3881
```
server.A=B：C：D:其中 A 是一个数字，就是myid里的那个数字，表示这个是第几号服务器；B 是这个服务器的 ip 地址,C和D是两个端口。


两个端口的作用，官网描述如下：


>Finally, note the two port numbers after each server name: “ 2888” and “3888”. Peers use the former port to connect to other peers. Such a connection is necessary so that peers can communicate, for example, to agree upon the order of updates. More specifically, a ZooKeeper server uses this port to connect followers to the leader. When a new leader arises, a follower opens a TCP connection to the leader using this port. Because the default leader election also uses TCP, we currently require another port for leader election. This is the second port in the server entry.


简单来说，第一个端口用来集群成员的信息交换以及与集群中的Leader 服务器交换信息，第二个端口是在leader挂掉时专门用来进行选举leader所用。

因为是伪分布式，所以dataDir,clientPort也不一样，同时C,D两个端口也不能相同。

3.启动
```
# bin/zkServer.sh start zoo0.cfg
# bin/zkServer.sh start zoo1.cfg
# jps
17759 Jps
17701 QuorumPeerMain
17664 QuorumPeerMain
```

可以看到两个QuorumPeerMain进程进行运行

4.查看节点状态
```
# bin/zkServer.sh status zoo0.cfg
ZooKeeper JMX enabled by default
Using config: /usr/local/my/zookeeper-3.4.9/bin/../conf/zoo0.cfg
Mode: follower
# bin/zkServer.sh status zoo1.cfg
ZooKeeper JMX enabled by default
Using config: /usr/local/my/zookeeper-3.4.9/bin/../conf/zoo1.cfg
Mode: leader
```

5.同步操作
```
# bin/zkCli.sh -server 127.0.0.1:2180
[zk: 127.0.0.1:2180(CONNECTED) 0] ls /
[zookeeper]
[zk: 127.0.0.1:2180(CONNECTED) 1] ls
[zk: 127.0.0.1:2180(CONNECTED) 2] create /hello "hello"
Created /hello
[zk: 127.0.0.1:2180(CONNECTED) 3] ls /
[hello, zookeeper]
[zk: 127.0.0.1:2180(CONNECTED) 4] quit
Quitting...
# bin/zkCli.sh -server 127.0.0.1:2181
[zk: 127.0.0.1:2181(CONNECTED) 0] ls /
[hello, zookeeper]
```
可以看到zookeeper主从同步成功了。

## 使用
ZooKeeper 支持某些特定的命令与linux进行交互。它们大多是查询命令，用来获取 ZooKeeper 服务的当前状态及相关信息。

ZooKeeper 四字命令 |  功能描述 
---|---
conf | 输出相关服务配置的详细信息。
cons | 列出所有连接到服务器的客户端的完全的连接 / 会话的详细信息。包括“接受 / 发送”的包数量、会话 id 、操作延迟、最后的操作执行等等信息。
dump | 列出未经处理的会话和临时节点。
envi | 输出关于服务环境的详细信息（区别于 conf 命令）。
reqs | 列出未经处理的请求
ruok | 测试服务是否处于正确状态。如果确实如此，那么服务返回“ imok ”，否则不做任何相应。
stat | 输出关于性能和连接的客户端的列表。
wchs | 列出服务器 watch 的详细信息。
wchc | 通过 session 列出服务器 watch 的详细信息，它的输出是一个与 watch 相关的会话的列表。
wchp | 通过路径列出服务器 watch 的详细信息。它输出一个与 session 相关的路径。

```
$ echo conf | nc 127.0.0.1 2181
clientPort=2181
dataDir=/usr/local/my/zookeeper-3.4.9/server1/version-2
dataLogDir=/usr/local/my/zookeeper-3.4.9/server1/version-2
tickTime=2000
maxClientCnxns=60
minSessionTimeout=4000
maxSessionTimeout=40000
serverId=1
initLimit=10
syncLimit=5
electionAlg=3
electionPort=3881
quorumPort=2881
peerType=0
```


zkCli客户端也提供了丰富的操作命令
```
$ bin\zkCli.sh -server 127.0.0.1:2181
[zk: 127.0.0.1:2181(CONNECTED) 1] help
ZooKeeper -server host:port cmd args
        stat path [watch]	# 获取znode属性，并且监听其是否存在
        set path data [version]	# 设置znode数据
        ls path [watch] # 查看子znode
        delquota [-n|-b] path # 删除quota设置
        ls2 path [watch] # 查看znode详细信息
        setAcl path acl	# 设置权限
        setquota -n|-b val path	# 设置quota配置
        history	# 查看历史
        redo cmdno	# 重做命令
        printwatches on|off	# 
        delete path [version] #删除znode
        sync path # 同步znode
        listquota path	
        rmr path # 递归删除节点及子znode
        get path [watch] # 
        create [-s] [-e] path data acl	# 创建znode
        addauth scheme auth	# 
        quit
        getAcl path
        close
        connect host:port
```

使用get可以查看node详细信息
```
[zk: localhost:2181(CONNECTED) 1] get /zookeeper

cZxid = 0x0    # 节点创建时的zxid
ctime = Thu Jan 01 08:00:00 GMT+08:00 1970    # 节点创建时的时间戳
mZxid = 0x0    # 节点最新一次更新发生时的zxid    
mtime = Thu Jan 01 08:00:00 GMT+08:00 1970    # 节点最新一次更新发生时的时间戳
pZxid = 0x0
cversion = -1    # 子版本号
dataVersion = 0	   # 数据版本号
aclVersion = 0    # 权限版本号
ephemeralOwner = 0x0    # 如果该节点为ephemeral节点, ephemeralOwner值表示与该节点绑定的session id. 否则, 该值为0
dataLength = 0    # 节点数据的字节数
numChildren = 1    # 子节点个数
```

## 权限
zookeeper中权限通常表示为scheme:id:permissions
1.scheme: scheme对应于采用哪种方案来进行权限管理，zookeeper实现了一个pluggable的ACL方案，可以通过扩展scheme，来扩展ACL的机制。zookeeper-3.4.4缺省支持下面几种scheme:
- world: 它下面只有一个id, 叫anyone, world:anyone代表任何人，zookeeper中对所有人有权限的结点就是属于world:anyone的
- auth: 它不需要id, 只要是通过authentication的user都有权限（zookeeper支持通过kerberos来进行authencation, 也支持username/password形式的authentication)
- digest: 它对应的id为username:BASE64(SHA1(password))，它需要先通过username:password形式的authentication
- ip: 它对应的id为客户机的IP地址，设置的时候可以设置一个ip段，比如ip:192.168.1.0/16, 表示匹配前16个bit的IP段
- super: 在这种scheme情况下，对应的id拥有超级权限，可以做任何事情(cdrwa)
- 另外，zookeeper-3.4.4的代码中还提供了对sasl的支持，不过缺省是没有开启的，需要配置才能启用。
sasl: sasl的对应的id，是一个通过sasl authentication用户的id，zookeeper-3.4.4中的sasl authentication是通过kerberos来实现的，也就是说用户只有通过了kerberos认证，才能访问它有权限的node.

2.id: id与scheme是紧密相关的，具体的情况在上面介绍scheme的过程都已介绍，这里不再赘述。

3.permission: zookeeper目前支持下面一些权限：
- CREATE(c): 创建权限，可以在当前node下创建child node
- DELETE(d): 删除权限，可以删除当前的node下的child node
- READ(r): 读权限，可以获取当前node的数据，可以list当前node所有的child nodes
- WRITE(w): 写权限，可以向当前node写数据
- ADMIN(a): 管理权限，可以设置当前node的permission
	
## java客户端
zookeeper提供了java客户端

```
<dependency>
    <groupId>org.apache.zookeeper</groupId>
    <artifactId>zookeeper</artifactId>
    <version>3.4.9</version>
</dependency>
```
一个小栗子
```
	@Test
    public void helloZookeeper() throws IOException, KeeperException, InterruptedException, NoSuchAlgorithmException {
        Watcher basicWatcher = new Watcher() {
            public void process(WatchedEvent event) {
                System.out.println(event.getPath() + " processed event : " + event.getType() );
            }
        };

        // 连接ZooKeeper
        ZooKeeper zk = new ZooKeeper("localhost:2181",5000, basicWatcher);


        // 权限管理
        List<ACL> acls = new ArrayList<ACL>();
        Id id = new Id("digest",DigestAuthenticationProvider.generateDigest("admin:admin"));
        acls.add(new ACL(ZooDefs.Perms.ALL, id));
        // 为会话添加身份
        zk.addAuthInfo("digest", "admin:admin".getBytes());

        // 创建一个目录节点
        zk.create("/hello", "hello,zookeeper".getBytes(), acls,
                CreateMode.PERSISTENT);



        // 获取子node，最后一个参数为true，将使用basicWatcher监听/hello
        zk.getChildren("/hello", true);

        // 创建一个子目录节点
        zk.create("/hello/node1", null,
                ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);

        // 修改子目录节点数据,最后一个参数为dataVersion，在并发情况下可以实现乐观锁，用-1匹配所有版本
        zk.setData("/hello/node1", "first".getBytes(), 0);
        zk.setData("/hello/node1", "second".getBytes(), 1);

        // 删除node
        zk.delete("/hello/node1", 2);
        zk.delete("/hello", 0);
    }
```	

参考：  
[说说Zookeeper中的ACL](http://www.wuzesheng.com/?p=2438)
[zookeeper之zkCli的使用](http://yingshin.github.io/c/cpp/2016/09/24/zkcli-introduction)