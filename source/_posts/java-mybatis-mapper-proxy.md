---
title: mybatis mapper动态代理实现
date: 2016-12-11 07:44:49
tags:
- 源码
---
### 简单实例
```
Mapper接口
public interface BlogMapper {
    Blog selectBlog(long id);
}


@Test
public void test() throws IOException {
    String resource = "mybatis-config.xml";
    InputStream inputStream = Resources.getResourceAsStream(resource);
    SqlSessionFactory sqlSessionFactory  = new SqlSessionFactoryBuilder().build(inputStream);

    SqlSession session = sqlSessionFactory.openSession();
    try {
        BlogMapper mapper = session.getMapper(BlogMapper.class);
        Blog blog = mapper.selectBlog(1);

        System.out.println(blog);
    } finally {
        session.close();
    }
}
```
我们都知道，通过`session.getMapper`可以获取mybatis生成的BlogMapper代理类，调用`mapper.selectBlog`方法将执行数据库查询，并将返回查询结果。

### mapper代理实现
跟踪`session.getMapper`方法，最终调用到`DefaultSqlSession.getMapper`方法
```
  public <T> T getMapper(Class<T> type) {
      return configuration.<T>getMapper(type, this);
  }
```
`Configuration.getMapper`内容如下
```
  public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
      return mapperRegistry.getMapper(type, sqlSession);
  }
```
可以看到这里将调用mapperRegistry.getMapper生成代理类。

### mapperRegistry初始化
先看一下mapperRegistry的初始化过程
`SqlSessionFactoryBuilder().build(inputStream);`构造初始环境，并会调用到`mapperElement(root.evalNode("mappers"))`方法，该方法会解析配置文件中的mappers标签配置。
```
  private void mapperElement(XNode parent) throws Exception {
    if (parent != null) {
      for (XNode child : parent.getChildren()) {
        if ("package".equals(child.getName())) {
          ...
        } else {
          String resource = child.getStringAttribute("resource");
          String url = child.getStringAttribute("url");
          String mapperClass = child.getStringAttribute("class");
          if (resource != null && url == null && mapperClass == null) {
            ...
          } else if (resource == null && url != null && mapperClass == null) {
            ...
          } else if (resource == null && url == null && mapperClass != null) {
            Class<?> mapperInterface = Resources.classForName(mapperClass);
            configuration.addMapper(mapperInterface);
          } else {
            throw new BuilderException("A mapper element may only specify a url, resource or class, but not more than one.");
          }
        }
      }
    }
  }
```
方法中对mappers标签配置的resource，url，class属性分别进行解析。而对class属性的解析`configuration.addMapper(mapperInterface);`会调用MapperRegistry.addMapper方法：
```
public <T> void addMapper(Class<T> type) {
	...
	knownMappers.put(type, new MapperProxyFactory<T>(type));	// 添加代理生成工厂
	MapperAnnotationBuilder parser = new MapperAnnotationBuilder(config, type);	// 解析class
        parser.parse();
}		
```

MapperAnnotationBuilder.parse
```
  public void parse() {
    ...
      Method[] methods = type.getMethods();
      for (Method method : methods) {
        parseStatement(method);	// 解析方法

      }
   
   
  }
```
`parseStatement(method)`会将class中的方法解析为MappedStatement对象,并存储在configuration.mappedStatements属性中。

### mapperRegistry生成代理
mapperRegistry.getMapper内容如下
```
public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
    ...
    return mapperProxyFactory.newInstance(sqlSession);
}
```

MapperProxyFactory.newInstance会创建一个代理对象
```
  public T newInstance(SqlSession sqlSession) {
    final MapperProxy<T> mapperProxy = new MapperProxy<T>(sqlSession, mapperInterface, methodCache);
    return newInstance(mapperProxy);
  }

  protected T newInstance(MapperProxy<T> mapperProxy) {
    return (T) Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[] { mapperInterface }, mapperProxy);
  }
```
`MapperProxy`即为动态代理类，实现了InvocationHandler接口，当调用mapper接口的方法时，将调用到MapperProxy的invoke方法：
```
public class MapperProxy<T> implements InvocationHandler, Serializable {
    ...
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    if (Object.class.equals(method.getDeclaringClass())) {  // 
      try {
        return method.invoke(this, args);
      } catch (Throwable t) {
        throw ExceptionUtil.unwrapThrowable(t);
      }
    }
    final MapperMethod mapperMethod = cachedMapperMethod(method);
    return mapperMethod.execute(sqlSession, args);
    }
}
```
如果执行的方法不是Object方法，将执行`mapperMethod.execute`方法
```
public Object execute(SqlSession sqlSession, Object[] args) {
    Object result;
    if (SqlCommandType.INSERT == command.getType()) {
      Object param = method.convertArgsToSqlCommandParam(args);
      result = rowCountResult(sqlSession.insert(command.getName(), param));
    } else if (SqlCommandType.UPDATE == command.getType()) {
      ...
    } else if (SqlCommandType.DELETE == command.getType()) {
      ...
    } else if (SqlCommandType.SELECT == command.getType()) {
      ...
    } else {
      throw new BindingException("Unknown execution method for: " + command.getName());
    }
    ...
    return result;
  }
```
`mapperMethod.execute`方法会转化参数，调用SqlSession进行insert/update/delete/select操作,最后处理结果并返回。
