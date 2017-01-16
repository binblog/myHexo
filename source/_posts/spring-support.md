---
title: spring-support
date: 2017-01-12 14:42:14、
toc: true
tags:
- 源码
---
在{% post_link java-spring-get-bean %} 中简单描述了spring创建bean的过程。


下面，通过自定义BeanPostProcessor，在bean创建前后自定义自己的操作。
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
这时可以看到程序输出了MyBeanProcessor中定义的信息。

org.springframework.context.support.ClassPathXmlApplicationContext是spring support中的类。下面简单看一下它做了哪些工作。

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
	return getBeanFactory().getBean(name);	// 通过getBeanFactory()获取beanFactory，并使用beanFactory生成bean
}
```
getBeanFactory在AbstractRefreshableApplicationContext中实现
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
可以看到该方法先调用了`refreshBeanFactory();`来刷新beanFactory，再通过`getBeanFactory()`获取beanFactory。


## 激活BeanFactoryPostProcessors
通过BeanFactoryPostProcessor，可以对beanFactory进行处理，如修改其他BeanDefinition的配置。
refresh()中通过`invokeBeanFactoryPostProcessors(beanFactory);`激活BeanFactoryPostProcessors。
```
protected void invokeBeanFactoryPostProcessors(ConfigurableListableBeanFactory beanFactory) {
	PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(beanFactory, getBeanFactoryPostProcessors());
}
```

PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors方法支持周期性的，一次性的和优先级的Processor，下面仅摘录部分示意代码
```
public static void invokeBeanFactoryPostProcessors(
	ConfigurableListableBeanFactory beanFactory, List<BeanFactoryPostProcessor> beanFactoryPostProcessors) {
	...
	String[] postProcessorNames =
					beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
	for (String ppName : postProcessorNames) {
		if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
			priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
			processedBeans.add(ppName);
		}
	}				
	
	// Now, invoke the postProcessBeanFactory callback of all processors handled so far.
	invokeBeanFactoryPostProcessors(registryPostProcessors, beanFactory);
	invokeBeanFactoryPostProcessors(regularPostProcessors, beanFactory);
}	
```

## 注册BeanPostProcessors处理器
通过BeanPostProcessors，可以在bean创建过程中执行自定义操作，如重写`postProcessBeforeInitialization`方法并返回非null值，那spring将直接使用该返回值给bean赋值。
refresh()中通过`registerBeanPostProcessors(beanFactory);`注册BeanPostProcessors处理器
```
protected void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory) {
	PostProcessorRegistrationDelegate.registerBeanPostProcessors(beanFactory, this);
}
```

PostProcessorRegistrationDelegate.registerBeanPostProcessors中也是获取xml配置中的BeanPostProcessor处理器，并注册到beanFactory中，在spring创建bean时，将获取beanFactory中的BeanPostProcessor并调用。
```
public static void registerBeanPostProcessors(
		ConfigurableListableBeanFactory beanFactory, AbstractApplicationContext applicationContext) {
	String[] postProcessorNames = beanFactory.getBeanNamesForType(BeanPostProcessor.class, true, false);
	
	// First, register the BeanPostProcessors that implement PriorityOrdered.
	sortPostProcessors(beanFactory, priorityOrderedPostProcessors);
	registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors);
	...
}		
```

## 初始化事件广播器
Spring事件体系包括三个组件：事件，事件监听器，事件广播器。事件广播器负责将事件广播给监听器。
`initApplicationEventMulticaster`将初始化广播器,并放到beanFactory中  
```
protected void initApplicationEventMulticaster() {
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();
	// beanFactory中包含了事件广播器
	if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {	
		this.applicationEventMulticaster =
				beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);
	}
	else {	// 使用默认的事件广播器
		this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
		beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
	}
}
```

## 初始化事件监听器
事件监听器负责监听事件，并做出处理。
registerListeners将初始化事件监听器，并添加到事件广播器上。
```
protected void registerListeners() {
	// Register statically specified listeners first.
	for (ApplicationListener<?> listener : getApplicationListeners()) {
		getApplicationEventMulticaster().addApplicationListener(listener);
	}

	// Do not initialize FactoryBeans here: We need to leave all regular beans
	// uninitialized to let post-processors apply to them!
	String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
	for (String listenerBeanName : listenerBeanNames) {
		getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
	}

	// Publish early application events now that we finally have a multicaster...
	...
}
```

## finishRefresh

```
protected void finishRefresh() {
	// Initialize lifecycle processor for this context.
	initLifecycleProcessor();

	// Propagate refresh to lifecycle processor first.
	getLifecycleProcessor().onRefresh();

	// Publish the final event.
	publishEvent(new ContextRefreshedEvent(this));

	// Participate in LiveBeansView MBean, if active.
	LiveBeansView.registerApplicationContext(this);
}
```
LifecycleProcessor是spring生命周期的管理。可以定义spring启动start，停止stop，或刷新onRefresh等操作。

```
protected void initLifecycleProcessor() {
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();
	if (beanFactory.containsLocalBean(LIFECYCLE_PROCESSOR_BEAN_NAME)) {
		this.lifecycleProcessor =
				beanFactory.getBean(LIFECYCLE_PROCESSOR_BEAN_NAME, LifecycleProcessor.class);
	}
	else {	// 使用默认的LifecycleProcessor
		DefaultLifecycleProcessor defaultProcessor = new DefaultLifecycleProcessor();
		defaultProcessor.setBeanFactory(beanFactory);
		this.lifecycleProcessor = defaultProcessor;
		beanFactory.registerSingleton(LIFECYCLE_PROCESSOR_BEAN_NAME, this.lifecycleProcessor);
	}
}
```


