---
title: tomcat配置https
date: 2016-11-06 17:23:19
tags:
  - java
categories: 
- java
---

记录一下tomcat配置https的过程
##### 生成密钥 
```
$ keytool -genkey -alias tomcat  -keyalg RSA  -keystore tomcat.keystore
$ $Enter keystore password:
$ Re-enter new password:
$ What is your first and last name?
  [Unknown]:  a
$ What is the name of your organizational unit?
  [Unknown]:  a
$ What is the name of your organization?
  [Unknown]:  a
$ What is the name of your City or Locality?
  [Unknown]:  a
$ What is the name of your State or Province?
  [Unknown]:  a
$ What is the two-letter country code for this unit?
  [Unknown]:  a
$ Is CN=a, OU=a, O=a, L=a, ST=a, C=a correct?
  [no]:  y

$Enter key password for <tomcat>
        (RETURN if same as keystore password):
$Re-enter new password:

```
`-keyalg RSA` 指定密钥的算法  
上述操作需要输入keystore password密钥库口令和key password密钥口令。密钥库口令用于打开密钥库，而密钥口令用于在java中加载PrivateKey
执行完了后可以看到当前目前已生成了tomcat.keystore文件。




#### 导出crt证书
```
$ keytool -export -file tomcat.crt   -alias tomcat -keystore tomcat.keystore
$ Enter keystore password:
Certificate stored in file <tomcat.crt>
```
密码使用上面输入的密钥库口令

#### 将crt证书导入到JVM密钥库
```
$ sudo keytool -import -keystore $JAVA_HOME/jre/lib/security/cacerts -file tomcat.crt -alias  tomcat
Enter keystore password:
Owner: CN=a, OU=a, O=a, L=a, ST=a, C=a
Issuer: CN=a, OU=a, O=a, L=a, ST=a, C=a
Serial number: 140233f6
Valid from: Fri Oct 28 11:41:25 UTC 2016 until: Thu Jan 26 11:41:25 UTC 2017
Certificate fingerprints:
         MD5:  94:24:86:8B:23:81:54:76:CA:52:7B:58:0C:6F:4A:5E
         SHA1: B7:53:92:61:92:16:1F:B3:07:63:5C:F6:67:A0:FD:7B:DD:A8:A0:50
         SHA256: B7:91:A5:B2:C7:46:C4:29:EB:31:78:C0:92:6F:A6:19:DA:B1:2C:5C:AF:57:30:D0:62:B2:55:9D:40:36:80:C2
         Signature algorithm name: SHA1withDSA
         Version: 3

Extensions:

#1: ObjectId: 2.5.29.14 Criticality=false
SubjectKeyIdentifier [
KeyIdentifier [
0000: 46 CD 82 57 6D DF 5D 82   35 59 B7 44 A0 99 58 36  F..Wm.].5Y.D..X6
0010: 97 4F 11 35                                        .O.5
]
]

$ Trust this certificate? [no]:  y
Certificate was added to keystore

```
密码使用changeit，这是JVM密钥库的密钥库口令


#### 修改tomcat配置
修改tomcat/conf/server.xml的配置
将
```
<!--
    <Connector port="8443" protocol="org.apache.coyote.http11.Http11Protocol"
               maxThreads="150" SSLEnabled="true" scheme="https" secure="true"
               clientAuth="false" sslProtocol="TLS" />
    -->
```
修改为
```
<Connector port="8443" protocol="org.apache.coyote.http11.Http11Protocol"
               maxThreads="150" SSLEnabled="true" scheme="https" secure="true"
                keyAlias="tomcat"
               clientAuth="false" sslProtocol="TLS" keystoreFile="tomcat.keystore" keystorePass="123456"
 />

```
keystoreFile指向上一步中生成的tomcat.keystore文件，keystorePass使用tomcat.keystore生成时的密钥库口令。

此时tomcat7可以正常启动，但用chrome访问时会出现如下错误
![image](/images/tomcat_https/1.png)



而在tomcat8 中，可以在logs/catalina.out查看到如下异常：
![image](/images/tomcat_https/2.png)

将上述配置重新修改为以下内容，指定加密算法套件。
```
<Connector port="8443" protocol="org.apache.coyote.http11.Http11Protocol"
               maxThreads="150" SSLEnabled="true" scheme="https" secure="true"
                keyAlias="tomcat"
               clientAuth="false" sslProtocol="TLS" keystoreFile="tomcat.keystore" keystorePass="123456"
	ciphers="TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
   TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384,TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,TLS_ECDHE_RSA_WITH_RC4_128_SHA,
   TLS_RSA_WITH_AES_128_CBC_SHA256,TLS_RSA_WITH_AES_128_CBC_SHA,TLS_RSA_WITH_AES_256_CBC_SHA256,
   TLS_RSA_WITH_AES_256_CBC_SHA,SSL_RSA_WITH_RC4_128_SHA"
 />

```

重启tomcat，则可以正常访问。




[tomcat-SSL/TLS 配置](http://wiki.jikexueyuan.com/project/tomcat/ssl-tls.html)

[数字证书及CA的扫盲介绍](http://kb.cnblogs.com/page/194742/)


[完美配置Tomcat的HTTPS](http://blog.csdn.net/huaishuming/article/details/8965597)



[各种数字证书区别 ](http://blog.csdn.net/nuanchun666/article/details/2947451)





