---
title: spring加载配置-源码简析
date: 2016-12-15 09:30:06
tags:
- 源码
---
bean类
~~~
public class Blog {
    private String title;

    ... getter and settter
}
~~~

spring.xml配置  
```
    <bean id="blog" class="spring.bean.Blog">
        <property name="title" value="hello spring"></property>
    </bean>
```


测试方法
```
	@Test
    public void test() {
        BeanFactory xmlBeanFactory = new XmlBeanFactory(new ClassPathResource("spring.xml"));
        Blog bean = (Blog)xmlBeanFactory.getBean("blog");

        Assert.assertEquals(bean.getTitle(), "hello spring");
    }
```


 `XmlBeanFactory`继承于`DefaultListableBeanFactory`，`DefaultListableBeanFactory`是整个bean加载的核心部分，是Spring注册及加载的bean的默认实现。 `XmlBeanFactory`只是使用了自定义的XML读取器`XmlBeanDefinitionReader`



```
BeanFactory bf = new XmlBeanFactory(new ClassPathResource("spring.xml"));
```
加载过程大致示意图
![@startuml
XmlBeanFactory->XmlBeanDefinitionReader: loadBeanDefinitions(resource)
XmlBeanDefinitionReader->DefaultBeanDefinitionDocumentReader:doRegisterBeanDefinitions(document)
DefaultBeanDefinitionDocumentReader->BeanDefinitionParserDelegate:parseBeanDefinitionElement(ele)
BeanDefinitionParserDelegate->BeanDefinitionParserDelegate:parseBeanDefinitionElement(ele)
@enduml](http://www.plantuml.com/plantuml/png/fOsn3i8m44FtVWLZ6V837JAWm8mwTJqbfegKvj3bEl3tfA9Ba418ZBQVxMb99r2-a5UMXx7JIplSOeuQEO-W01aEYIcqIUa5XLVnE7RTXvwnrQ4rQHiwzkk2hFjuu15pB0fvVmWxM1z-63AsJQya1UAGC9DYk6-o9Su9MxslIBturlvl-ma0)


跟踪`XmlBeanFactory`的构造方法，

```
	public XmlBeanFactory(Resource resource, BeanFactory parentBeanFactory) ... {
		super(parentBeanFactory);
		this.reader.loadBeanDefinitions(resource);	// 注:this.reader为XmlBeanDefinitionReader
	}
```

XmlBeanDefinitionReader.loadBeanDefinitions：
```
public int loadBeanDefinitions(Resource resource) ... {
	return loadBeanDefinitions(new EncodedResource(resource));
}
  
public int loadBeanDefinitions(EncodedResource encodedResource) ... {
    ...
	
	//获取配置文件的InputStream
	InputStream inputStream = encodedResource.getResource().getInputStream();	
	// 构造InputSource
   	InputSource inputSource = new InputSource(inputStream);	
	// 解析InputSource
	return doLoadBeanDefinitions(inputSource, encodedResource.getResource());	
}
  
protected int doLoadBeanDefinitions(InputSource inputSource, Resource resource)     ... {
    // 获取Document对象
	Document doc = doLoadDocument(inputSource, resource);	
	// 解析Document
	return registerBeanDefinitions(doc, resource);	
}  
  
public int registerBeanDefinitions(Document doc, Resource resource) ... {
	...
	// 创建DefaultBeanDefinitionDocumentReader对象
	BeanDefinitionDocumentReader documentReader = createBeanDefinitionDocumentReader();	
	// 解析documentReader 注:createReaderContext()创建XmlReaderContext对象	
	documentReader.registerBeanDefinitions(doc, createReaderContext(resource));	
}
```

DefaultBeanDefinitionDocumentReader.registerBeanDefinitions:
```
public void registerBeanDefinitions(Document doc, XmlReaderContext readerContext) {
	...
	// 获取root元素
	Element root = doc.getDocumentElement();	
	// 解析root元素
	doRegisterBeanDefinitions(root);	
}
   
protected void doRegisterBeanDefinitions(Element root) {
	...
	// 创建BeanDefinitionParserDelegate对象
	this.delegate = createDelegate(getReaderContext(), root, parent);	
	preProcessXml(root);	// 模板方法，提供给子类扩展
	parseBeanDefinitions(root, this.delegate);		// 解析root元素
	postProcessXml(root);	// 模板方法，提供给子类扩展
}
  
protected void parseBeanDefinitions(Element root, BeanDefinitionParserDelegate delegate) {
	if (delegate.isDefaultNamespace(root)) {
		NodeList nl = root.getChildNodes();
		for (int i = 0; i < nl.getLength(); i++) {
			Node node = nl.item(i);
			if (node instanceof Element) {
				Element ele = (Element) node;
				if (delegate.isDefaultNamespace(ele)) {
					parseDefaultElement(ele, delegate);	// 解析node结点
				}
				else {
					delegate.parseCustomElement(ele);
				}
			}
		}
	}
	else {
		delegate.parseCustomElement(root);
	}
}
```
上述方法根据Namespace Uri判断node是否为Spring定义的元素，如果是，则调用parseDefaultElement方法解析元素。
用户可以自定义标签及标签解析器。

```
	private void parseDefaultElement(Element ele, BeanDefinitionParserDelegate delegate) {
		if (delegate.nodeNameEquals(ele, IMPORT_ELEMENT)) {	// 解析import标签
			importBeanDefinitionResource(ele);
		}
		else if (delegate.nodeNameEquals(ele, ALIAS_ELEMENT)) {	// 解析alias标签
			processAliasRegistration(ele);
		}
		else if (delegate.nodeNameEquals(ele, BEAN_ELEMENT)) {	// 解析bean标签
			processBeanDefinition(ele, delegate);
		}
		else if (delegate.nodeNameEquals(ele, NESTED_BEANS_ELEMENT)) {	// 解析beans标签
			doRegisterBeanDefinitions(ele);
		}
	}
```

`parseDefaultElement`方法对import，alias，bean，beans标签进行了解析，这里主要看bean的解析过程：
```
protected void processBeanDefinition(Element ele, BeanDefinitionParserDelegate delegate) {
	// 解析元素,解析结果为BeanDefinitionHolder对象
	BeanDefinitionHolder bdHolder = delegate.parseBeanDefinitionElement(ele);	
	if (bdHolder != null) {
		bdHolder = delegate.decorateBeanDefinitionIfRequired(ele, bdHolder);	// 装饰模式
		
		// 注册BeanDefinition，即将解析结果存储在registry对象中.
		BeanDefinitionReaderUtils.registerBeanDefinition(bdHolder,getReaderContext().getRegistry());	
		
		// 发送事件
		getReaderContext().fireComponentRegistered(new BeanComponentDefinition(bdHolder));
	}
}
```

BeanDefinitionHolder中包含了BeanDefinition实例。     
BeanDefinition是配置文件中`<bean>`标签在容器中的内部表示形式。  
BeanDefinition存在子类RootBeanDefinition和ChildBeanDefinition。ChildBeanDefinition表示子`<bean>`,而
RootBeanDefinition表示父`<bean>`和没有父`<bean>`的bean，是最常用的实现类。  
spring将配置文件中<bean>配置信息转化为beanDefinition对象，并注册到容器中。

`delegate.parseBeanDefinitionElement`将调用BeanDefinitionParserDelegate.parseBeanDefinitionElement方法:
```
public BeanDefinitionHolder parseBeanDefinitionElement(Element ele, BeanDefinition containingBean) {
	// 解析bean元素
	AbstractBeanDefinition beanDefinition = parseBeanDefinitionElement(ele, beanName, containingBean);

	String beanClassName = beanDefinition.getBeanClassName();

	String[] aliasesArray = StringUtils.toStringArray(aliases);
	return new BeanDefinitionHolder(beanDefinition, beanName, aliasesArray);
}

public AbstractBeanDefinition parseBeanDefinitionElement(Element ele, String beanName, BeanDefinition containingBean) {
        
    ...
	className = ele.getAttribute(CLASS_ATTRIBUTE).trim(); // 解析className

	parent = ele.getAttribute(PARENT_ATTRIBUTE);


	AbstractBeanDefinition bd = createBeanDefinition(className, parent);

	parseBeanDefinitionAttributes(ele, beanName, containingBean, bd);	// 解析"scope","scope"等属性
	bd.setDescription(DomUtils.getChildElementValueByTagName(ele, DESCRIPTION_ELEMENT));

	parseMetaElements(ele, bd);	// 解析meta属性
	parseLookupOverrideSubElements(ele, bd.getMethodOverrides());	// 处理lookup-method元素
	parseReplacedMethodSubElements(ele, bd.getMethodOverrides());	// 处理replaced-method元素

	parseConstructorArgElements(ele, bd);	// 解析constructor-arg构造方法参数
	parsePropertyElements(ele, bd);	// 解析property元素
	parseQualifierElements(ele, bd);	//解析qualifier元素

	bd.setResource(this.readerContext.getResource());
	bd.setSource(extractSource(ele));

	return bd;
}
```

看一下属性的解析过程`parsePropertyElements`
```
	public void parsePropertyElements(Element beanEle, BeanDefinition bd) {
		NodeList nl = beanEle.getChildNodes();
		for (int i = 0; i < nl.getLength(); i++) {
			Node node = nl.item(i);
			if (isCandidateElement(node) && nodeNameEquals(node, PROPERTY_ELEMENT)) {
				parsePropertyElement((Element) node, bd);
			}
		}
	}
```
遍历所有的子元素，如果是property节点，则进行处理

```
public void parsePropertyElement(Element ele, BeanDefinition bd) {
	...
	Object val = parsePropertyValue(ele, bd, propertyName);
	PropertyValue pv = new PropertyValue(propertyName, val);
	parseMetaElements(ele, pv);
	pv.setSource(extractSource(ele));
	bd.getPropertyValues().addPropertyValue(pv);		
}

```
这里只是把属性的propername，type等基本消息读取存放到PropertyValues中，并没有解析属性的值。


最后看一下注册过程`BeanDefinitionReaderUtils.registerBeanDefinition(bdHolder, getReaderContext().getRegistry());`  
BeanDefinitionReaderUtils.registerBeanDefinition内容为：
```
public static void registerBeanDefinition(
		BeanDefinitionHolder definitionHolder, BeanDefinitionRegistry registry) ...{

	// 为bean注册beanname
	String beanName = definitionHolder.getBeanName();
	registry.registerBeanDefinition(beanName, definitionHolder.getBeanDefinition());

	// 为bean注册别名
	String[] aliases = definitionHolder.getAliases();
	if (aliases != null) {
		for (String alias : aliases) {
			registry.registerAlias(beanName, alias);
		}
	}
}
		
```

最终将调用到DefaultListableBeanFactory.registerBeanDefinition方法:  
~~~java
	@Override
	public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition) ... {
		...
		this.beanDefinitionMap.put(beanName, beanDefinition);

	}	
~~~
最后，bean解析结果beanDefinition存储在DefaultListableBeanFactory的`Map<String, BeanDefinition> beanDefinitionMap`属性中。

