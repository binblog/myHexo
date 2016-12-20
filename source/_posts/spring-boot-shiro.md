---
title: spring boot 配置shiro
date: 2016-10-08 23:23:30
tags:
  - java
categories: 
- java
---
## spring boot 配置shiro
<!--more-->
### 由于使用了maven，所以先编辑pom
```
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>1.3.5.RELEASE</version>
</parent>

<dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <dependency>
      <groupId>org.apache.shiro</groupId>
      <artifactId>shiro-spring</artifactId>
      <version>1.3.2</version>
    </dependency>
</dependencies>
```

### 添加主程序类和一个服务类
```
@EnableWebMvc
@Configuration
@EnableAutoConfiguration
@ComponentScan
public class Application extends WebMvcConfigurerAdapter {
    public static void main(String[] args) throws Exception {
        SpringApplication.run(Application.class, args);
    }
}

@RestController
@RequestMapping("/user")
public class UserController {
    @ResponseBody
    @RequestMapping(value = "/hello")
    public String hello() {
        return "hello ";
    }
}
```
此时运行主程序类，浏览器访问 http://localhost:8080/user/hello ,可以看到服务器返回字符串：hello

### 实现用户认证
**现在实现需求：用户需要登录后才能访问地址 http://localhost:8080/user/hello **
#### 实现AuthorizingRealm
AuthorizingRealm是shiro中的权限管理器，可以对用户进行认证和授权操作  
添加如下类：
```
public class SimpleRealm  extends AuthorizingRealm {

    /**
     * 授权
     */
    @Override
    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principalCollection) {
        return null;
    }

    /**
     * 认证
     */
    @Override
    protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken authenticationToken) throws AuthenticationException {
        UsernamePasswordToken credentials = (UsernamePasswordToken) authenticationToken;

        String userName = credentials.getUsername();
        String password = new String(credentials.getPassword());

        // 固定用户：u1:123和u2:123
        if( (userName.equals("u1") && password.equals("123")) || (userName.equals("u2") && password.equals("123"))) {
            return new SimpleAuthenticationInfo(userName, password,userName);
        } else {
            throw new AuthenticationException();
        }

    }
}
```
`doGetAuthenticationInfo`方法对用户身份进行认证操作，SimpleRealm固定了两个用户，这里可以实现从数据库中查询用户信息进行认证。  
`doGetAuthorizationInfo`方法对用户身份进行授权操作，暂不使用

#### 配置过滤器
添加如下配置类：  
```
@Configuration
public class ShiroConfiguration {
    /**
     * 创建ShiroFilterFactoryBean，提供给spring使用
     */
    @Bean
    public ShiroFilterFactoryBean shiroFilter() {
        ShiroFilterFactoryBean factoryBean = new ShiroFilterFactoryBean();
        factoryBean.setSecurityManager(securityManager());  // 配置安全管理器

        Map<String, String> filterChainDefinitionMapping = new LinkedHashMap<>();
        filterChainDefinitionMapping.put("/user/**", "authc");
        factoryBean.setFilterChainDefinitionMap(filterChainDefinitionMapping);

        return factoryBean;
    }


    public DefaultWebSecurityManager securityManager() {
        final DefaultWebSecurityManager securityManager
                = new DefaultWebSecurityManager();
        List<Realm> list = new ArrayList<>();
        list.add(new SimpleRealm());    // 使用SimpleRealm权限管理器
        securityManager.setRealms(list);
        return securityManager;
    }
}

```

`filterChainDefinitionMapping.put("/user/**", "authc");`配置了调用以/user开始的url，必须通过authc这个过滤器（authc是shiro默认提供的form认证过滤器）

这里访问http://localhost:8080/user/hello，可以看到浏览器自动跳转到http://localhost:8080/login.jsp ，这是当用户没有进行认证操作时，shiro自动将url跳转到login.jsp页面（可通过`factoryBean.setLoginUrl(String);`进行配置）。

#### 添加用户登录接口
UserController中添加如下方法：
```
@ResponseBody
@RequestMapping(value = "/login")
public String login(@RequestParam("user")String user, @RequestParam("password")String password) {
    Subject subject = SecurityUtils.getSubject();
    UsernamePasswordToken token = new UsernamePasswordToken(user, password);
    try {
        subject.login(token);   // 用户认证并登录
        return "login success";
    } catch (AuthenticationException e) {
        e.printStackTrace();
        return "login fail";
    }
}
```
调用`subject.login(token);`，shiro将进行用户认证操作，用户信息错误将抛出异常。



过滤配置修改：
```
Map<String, String> filterChainDefinitionMapping = new LinkedHashMap<>();

filterChainDefinitionMapping.put("/user/login", "anon");    // 不需要任何过滤器

filterChainDefinitionMapping.put("/user/**", "authc");
```
__注意路径表达式按事先定义好的顺序判断传入的请求，并遵循 FIRST MATCH WINS 这一原则。/user/login必须要/user/**之前加入filterChainDefinitionMapping，如果调换顺序，当访问/user/login时，由于先匹配了`("/user/**", "authc")`,则`("/user/login", "anon")`永远不匹配到__


访问登录接口  
http://localhost:8080/user/login?user=u1&password=123 完成登录, 再访问
http://localhost:8080/user/hello
可以看到访问正常

### 实例用户授权
**现在实现需求：UserController添加一个sendGift接口，该接口必须拥有admin角色的用户才能访问**

添加sendGift接口
```
@ResponseBody
@RequestMapping(value = "/sendGift")
public String sendGift() {
    return "success";
}
```
添加url过滤：
```
Map<String, String> filterChainDefinitionMapping = new LinkedHashMap<>();

filterChainDefinitionMapping.put("/user/login", "anon");

filterChainDefinitionMapping.put("/user/sendGift", "authc,roles[user]");

filterChainDefinitionMapping.put("/user/**", "authc");
```

`filterChainDefinitionMapping.put("/user/sendGift", "authc,roles[user]");`配置了访问`/user/sendGift`的用户必须拥有user角色( roles也是shrio默认提供的角色过滤器)  
可以发现，此时即使u1登录了，当访问 http://localhost:8080/user/sendGift 时，仍然返回401的访问错误。

这里需要修改SimpleRealm中的授权操作，对用户添加对应的角色权限
修改SimpleRealm中的doGetAuthorizationInfo方法为
```
/**
 * 授权
 */
@Override
protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principalCollection) {
    Set<String> names = principalCollection.getRealmNames();
    SimpleAuthorizationInfo authorizationInfo = new SimpleAuthorizationInfo();
    if(names.contains("u1")) {
        authorizationInfo.addRole("user");  // 为u1用户添加user角色
    }
    return authorizationInfo;
}
```
此时用户u1只要登录，就可以访问 http://localhost:8080/user/sendGift 了

**现对需求进行扩展，要求sendGift接口不仅user角色可以访问，admin管理角色也可以访问**  
尝试对url过滤配置进行如下修改
```
Map<String, String> filterChainDefinitionMapping = new LinkedHashMap<>();

filterChainDefinitionMapping.put("/user/login", "anon");

filterChainDefinitionMapping.put("/user/sendGift", "authc,roles[user,admin]");

filterChainDefinitionMapping.put("/user/**", "authc");
```
但现在导致的问题是sendGift接口不仅admin角色无法访问，连原来的user角色都不可以访问了。原因是roles默认过滤器对`[user,admin]`处理是要求用户同时拥有user和admin两个角色。  
这里我们需要自定义一个过滤器，支持只要拥有user角色或admin角色就通过验证的需求。
```
public class MyRolesAuthorizationFilter  extends AuthorizationFilter {
    @Override
    protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) throws Exception {
        Subject subject = this.getSubject(request, response);
        String[] rolesArray = (String[])((String[])mappedValue);
        if(rolesArray != null && rolesArray.length != 0) {
            for(String role : rolesArray) {
                if(subject.hasRole(role)) { // 只在用户拥有定义中的任一角色，则通过验证
                    return true;
                }
            }

            return false;
        } else {
            return true;
        }
    }
}
```
url配置修改为：
```
@Bean
public ShiroFilterFactoryBean shiroFilter() {
    ShiroFilterFactoryBean factoryBean = new ShiroFilterFactoryBean();
    factoryBean.setSecurityManager(securityManager());  // 配置安全管理器

    // 配置自定义的过滤器
    Map<String,Filter> map = new HashMap<>();
    map.put("myRoles", new MyRolesAuthorizationFilter());
    factoryBean.setFilters(map);

    Map<String, String> filterChainDefinitionMapping = new LinkedHashMap<>();
    filterChainDefinitionMapping.put("/user/login", "anon");
    filterChainDefinitionMapping.put("/user/sendGift", "authc,myRoles[user,admin]");    // 使用自定义的过滤器myRoles
    filterChainDefinitionMapping.put("/user/**", "authc");
    factoryBean.setFilterChainDefinitionMap(filterChainDefinitionMapping);
    
    return factoryBean;
}
```
此时只要通过登录，拥有user角色的u1可以访问 http://localhost:8080/user/sendGift 。  
其他用户如u2，只要拥有user角色或admin角色也就可以访问 http://localhost:8080/user/sendGift


## jquery ajax实现CORS跨域，shrio的一些问题  
### jquery发送Cookies
要实现跨域，spring boot需要添加如下配置，允许客户端跨域访问
```
@Configuration
public class WebConfig extends WebMvcConfigurerAdapter {
    public void addCorsMappings(CorsRegistry registry) {
            registry.addMapping("/**")
                    .allowedOrigins("http://127.0.0.1:9090")
                    .allowedMethods("PUT", "DELETE", "GET", "POST", "OPTIONS")
                    .allowedHeaders("X-Requested-With", "Content-Type", "Accept", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers")
                    .allowCredentials(true).maxAge(3600);

    }
}
```
`allowedOrigins`方法配置允许访问的客户端域名，上述代码允许域名为http://127.0.0.1:9090的地址跨域访问。  


shiro实现了session管理，如下代码可以获取session
```
Subject subject = SecurityUtils.getSubject();
Session session = subject.getSession();
```
shiro使用session记录用户的登录信息，但在跨域访问的情况下，jquery不会将收到的Cookies发送到服务端，导致shiro用户登录信息丢失。
```
$.ajax({
    url: "http://localhost:8080/user/login?user=u1&password=123",
    type: 'GET' 
});

$.ajax({
    url: "http://localhost:8080/user/hello",
    type: 'GET' 
});
        
```
连续调用上述两个ajax请求，在firefox firebug中查看网络请求：
![image](/images/spring_shiro/1.png)  
可以看到服务器已经将Cookies返回，其中JSESSIONID就是sessionId，但jquery在第二次请求中并没有将返回的Cookies发送到服务端，导致第二次请求失败。
可以使用withCredentials参数要求jquery ajax中携带服务端返回的Cookies
```
$.ajax({
    url: "http://localhost:8080/user/login?user=u1&password=123",
    type: 'GET',
    xhrFields: {
    	withCredentials: true
    }
});
$.ajax({
    url: "http://localhost:8080/user/hello",
    type: 'GET',
    xhrFields: {
    	withCredentials: true
    }
});

```
![image](/images/spring_shiro/2.png)
可以看到第二次请求已经携带第一次请求返回的Cookies了。

### 复杂CORS跨域请求，OPTIONS请求的处理
当调用如delete等复杂CORS跨域请求时，浏览器会先发送一种"预请求"OPTIONS，此时服务端也需要返回"预回应"作为响应。预请求实际上是对服务端的一种权限请求，只有当预请求成功返回，实际请求才开始执行。  

但shiro默认提供的form认证过滤器FormAuthenticationFilter对于"预请求"OPTIONS无法通过验证，所以这里重写FormAuthenticationFilter，对OPTIONS进行特别操作：
```
public class MyFormAuthorizationFilter extends FormAuthenticationFilter {
    protected boolean isAccessAllowed(ServletRequest servletRequest, ServletResponse servletResponse, Object o) {
        HttpServletRequest httpServletRequest = WebUtils.toHttp(servletRequest);
        if("OPTIONS".equals(httpServletRequest.getMethod())) {
            return true;
        }
        return super.isAccessAllowed(servletRequest, servletResponse, o);
    }
}
```
这里允许所有的OPTIONS通过验证，所以服务器不能再开放类型为OPTIONS的接口了，否则会很危险。  
当然这种处理只是临时处理方案，更合适的方案可以在阅读shiro相关源码再探讨。





参考：  
[apache-shiro-1.2.x-reference](https://waylau.gitbooks.io/apache-shiro-1-2-x-reference/content/)  
[极客学院](http://wiki.jikexueyuan.com/project/shiro/)