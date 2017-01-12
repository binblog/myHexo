---
title: spring-support
date: 2017-01-12 14:42:14、
toc: true
tags:
- 源码
---
在{% post_link java-spring-get-bean %} 中简单描述了spring创建bean的过程。


已知，通过自定义BeanPostProcessor，可以在bean创建前后自定义自己的操作。

一个小栗子：
```
public class MyBeanProcessor implements BeanPostProcessor {

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("BeforeInitialization : " + beanName + " , " + bean);
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("AfterInitialization : " + beanName + " , " + bean);
        return bean;
    }
}
```
非常简单，仅仅是输出一些信息。

spring.xml配置:
```
<bean id="myBeanProcessor" class="spring.processor.MyBeanProcessor"></bean>
<bean id="blog" class="spring.bean.Blog" >
	<property name="title" value="hello spring" ></property>
</bean>
```

使用{% post_link java-spring-load-config %}中的测试方法
```
@Test
public void test() {
	BeanFactory beanFactory = new XmlBeanFactory(new ClassPathResource("spring.xml"));
	Blog bean = (Blog)beanFactory.getBean("blog");
	Assert.assertEquals(bean.getTitle(), "hello spring");
}
```

这时并没有输出MyBeanProcessor中定义的信息，而把测试方法修改为如下：
```
@Test
public void test() {
	ClassPathXmlApplicationContext beanFactory = new ClassPathXmlApplicationContext("spring.xml");
	Blog bean = (Blog)beanFactory.getBean("blog");
	Assert.assertEquals(bean.getTitle(), "hello spring");
}
```
可以看到程序输出了MyBeanProcessor中定义的信息。

org.springframework.context.support.ClassPathXmlApplicationContext是spring support中的类。下面看一下如何实现。

```
public ClassPathXmlApplicationContext(String[] configLocations, boolean refresh,
	ApplicationContext parent) throws BeansException {

	super(parent);
	setConfigLocations(configLocations);
	if (refresh) {
		refresh();
	}
}
```

核心方法为refresh():
```
public void refresh() throws BeansException, IllegalStateException {
	synchronized (this.startupShutdownMonitor) {
		// 准备刷新上下文环境
		prepareRefresh();

		// 初始化BeanFactory，并进行xml文件读取
		ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

		// 对beanFacotry进行各种功能填充
		prepareBeanFactory(beanFactory);

		try {
			// 提供给子类覆盖方法做额外处理
			postProcessBeanFactory(beanFactory);

			// 激活BeanFactoryPostProcessors
			invokeBeanFactoryPostProcessors(beanFactory);

			// 注册拦截Bean创建的Bean处理器(这里只是注册,真正调用在getBean的时候)
			registerBeanPostProcessors(beanFactory);

			// 初始化应用消息广播器,即不同语言的消息体,国际化处理
			initMessageSource();

			// 初始化广播器,并放到上下文中	
			initApplicationEventMulticaster();

			// 提供给子类初始化其他的Bean
			onRefresh();

			// 在所有注册的bean中查找Listener bean,注册到消息广播中
			registerListeners();

			// 初始化剩下的单实例(InitializingBean,DisposableBean, Aware对象等)
			finishBeanFactoryInitialization(beanFactory);

			// 完成刷新过程,通知生命周期处理器
			finishRefresh();
		}

		...

		finally {
			// Reset common introspection caches in Spring's core, since we
			// might not ever need metadata for singleton beans anymore...
			resetCommonCaches();
		}
	}
}
```
## 初始化BeanFactory
ClassPathXmlApplicationContext的继承层次很深:
ClassPathXmlApplicationContext -> AbstractXmlApplicationContext -> AbstractRefreshableConfigApplicationContext -> AbstractRefreshableApplicationContext -> AbstractApplicationContext
而AbstractApplicationContext -> ConfigurableApplicationContext -> ApplicationContext -> ListableBeanFactory,HierarchicalBeanFactory -> BeanFactory

可以看到 ClassPathXmlApplicationContext实现了BeanFactory接口，而调用方法`getBean`将执行到AbstractApplicationContext.getBean:
```
public Object getBean(String name) throws BeansException {
	assertBeanFactoryActive();	// 判断BeanFactory是否为Active
	return getBeanFactory().getBean(name);	// 通过getBeanFactory()获取beanFactory，并生成bean
}
```
而getBeanFactory在AbstractRefreshableApplicationContext中实现
```
@Override
public final ConfigurableListableBeanFactory getBeanFactory() {
	synchronized (this.beanFactoryMonitor) {
		if (this.beanFactory == null) {
			throw new IllegalStateException("BeanFactory not initialized or already closed - " +
					"call 'refresh' before accessing beans via the ApplicationContext");
		}
		return this.beanFactory;
	}
}
```
同步方法，方法返回了beanFactory属性，beanFactory属性的刷新要通过如下方法：
```
protected final void refreshBeanFactory() throws BeansException {
	if (hasBeanFactory()) {	 // 销毁已存在的beanFactory
		destroyBeans();
		closeBeanFactory();
	}

	...
	DefaultListableBeanFactory beanFactory = createBeanFactory();	// 创建beanFactory

}

protected DefaultListableBeanFactory createBeanFactory() {
	return new DefaultListableBeanFactory(getInternalParentBeanFactory());
}
```

回到refresh()方法,refresh()中通过`ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();`获取beanFactory。
```
protected ConfigurableListableBeanFactory obtainFreshBeanFactory() {
	refreshBeanFactory();
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();
	...
	return beanFactory;
}
```

## 激活BeanFactoryPostProcessors
refresh()中通过`invokeBeanFactoryPostProcessors(beanFactory);`激活BeanFactoryPostProcessors。
```
protected void invokeBeanFactoryPostProcessors(ConfigurableListableBeanFactory beanFactory) {
	PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(beanFactory, getBeanFactoryPostProcessors());
}
```

PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors
```

```

## 注册BeanPostProcessors处理器
refresh()中通过`registerBeanPostProcessors(beanFactory);`注册BeanPostProcessors处理器
```
protected void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory) {
	PostProcessorRegistrationDelegate.registerBeanPostProcessors(beanFactory, this);
}


```