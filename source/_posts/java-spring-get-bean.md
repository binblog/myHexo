---
title: spring获取bean - 源码简析
date: 2016-12-16 07:45:24
tags:
- 源码
---
```
    Blog bean = (Blog)xmlBeanFactory.getBean("blog");
```


XmlBeanFactory继承了AbstractBeanFactory，`getBean`将调用AbstractBeanFactory.doGetBean方法。该方法是读取bean的实现。


AbstractBeanFactory.doGetBean：
```
protected <T> T doGetBean(
		final String name, final Class<T> requiredType, final Object[] args, boolean typeCheckOnly) ... {
	final String beanName = transformedBeanName(name);	// 处理别名

	Object sharedInstance = getSingleton(beanName);		// 从单例缓存中获取
	
	// 父Factory
	BeanFactory parentBeanFactory = getParentBeanFactory();
	
	// 配置文件
	final RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);

	
	// 处理依赖
	String[] dependsOn = mbd.getDependsOn();
	
	// bean范围为Singleton
	if (mbd.isSingleton()) {

		sharedInstance = getSingleton(beanName, new ObjectFactory<Object>() {
					
					public Object getObject() throws BeansException {
						...
						return createBean(beanName, mbd, args);		// 真正创建bean
						
					}
				});
				bean = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
	} else if() {	// 其他处理
		...
	}		
}
```
`getObjectForBeanInstance`方法会根据参数beanInstance进行处理，如果beanInstance是FactoryBean会创建bean，返回直接返回beanInstance。

需要注意，这里调用了两个重载方法 `getSingleton(String beanName)`和`getSingleton(String beanName, ObjectFactory<?> singletonFactory)`  

重载方法一`getSingleton(beanName)`从容器中获取单例bean。  
DefaultSingletonBeanRegistry.getSingleton:
```
	protected Object getSingleton(String beanName, boolean allowEarlyReference) {
		...
		Object singletonObject = this.singletonObjects.get(beanName);	
		
				singletonObject = this.earlySingletonObjects.get(beanName);
				
		}
		return (singletonObject != NULL_OBJECT ? singletonObject : null);
	}
```
singletonObject用于缓存单例的bean
earlySingletonObjects则缓存正在创建的bean



重载方法二`getSingleton(String beanName, ObjectFactory<?> singletonFactory)`会通过ObjectFactory创建一个单例bean。
DefaultSingletonBeanRegistry.getSingleton(String beanName, ObjectFactory<?> singletonFactory):
```
public Object getSingleton(String beanName, ObjectFactory<?> singletonFactory) {
	beforeSingletonCreation(beanName);	// 错误检查,子类可扩展
	
	singletonObject = singletonFactory.getObject();		// 创建bean
	newSingleton = true;
	
	afterSingletonCreation(beanName);
	
	if (newSingleton) {
		addSingleton(beanName, singletonObject);	// 将bean加入到singletonObject等缓存中
	}
	
}
```


bean创建过程在`return createBean(beanName, mbd, args);`代码，
`createBean`方法由AbstractAutowireCapableBeanFactory实现：
```
protected Object createBean(String beanName, RootBeanDefinition mbd, Object[] args) ... {
	
	// 解析class
	Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
	
	// 注意，如果resolveBeforeInstantiation返回非null对象，这里将直接返回
	Object bean = resolveBeforeInstantiation(beanName, mbdToUse);
	if (bean != null) {
		return bean;
	}
	
	// 创建bean
	Object beanInstance = doCreateBean(beanName, mbdToUse, args);
	
	return beanInstance;
}

protected Object resolveBeforeInstantiation(String beanName, RootBeanDefinition mbd) {
	bean = applyBeanPostProcessorsBeforeInstantiation(targetType, beanName);
	
	if (bean != null) {
		bean = applyBeanPostProcessorsAfterInitialization(bean, beanName);
	}

}
```
`resolveBeforeInstantiation`会调用前置处理方法InstantiationAwareBeanPostProcessor.postProcessBeforeInstantiation,如果InstantiationAwareBeanPostProcessor.postProcessBeforeInstantiation返回非null对象,createBean将直接返回该对象,所以用户可以通过实现InstantiationAwareBeanPostProcessor.postProcessBeforeInstantiation自定义bean对象。


AbstractAutowireCapableBeanFactory.doCreateBean:
```
protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final Object[] args) {
	BeanWrapper instanceWrapper = null;
	
	// 创建属性为空的bean
	instanceWrapper = createBeanInstance(beanName, mbd, args);
	
	// processor处理
	if (!mbd.postProcessed) {
		applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
		mbd.postProcessed = true;
	}
	
	Object exposedObject = bean;
	// 注入属性
	populateBean(beanName, mbd, instanceWrapper);

	// 调用init方法
	if (exposedObject != null) {
		exposedObject = initializeBean(beanName, exposedObject, mbd);
	}

	// 注册
	registerDisposableBeanIfNecessary(beanName, bean, mbd);
}
  
protected Object initializeBean(final String beanName, final Object bean, RootBeanDefinition mbd) {
	// 调用BeanNameAware,BeanClassLoaderAware,BeanFactoryAware的set方法
	invokeAwareMethods(beanName, bean);	
	
	// ProcessorsBeforeInitialization方法
	wrappedBean = applyBeanPostProcessorsBeforeInitialization(wrappedBean, beanName);	

	// 调用init-method方法
	invokeInitMethods()	
	
	// 调用后处理器BeanPostProcessorsAfterInitialization.postProcessAfterInitialization 
	wrappedBean = applyBeanPostProcessorsAfterInitialization(wrappedBean, beanName);	

}

```

看一下beanWrapper的创建过程
```
protected BeanWrapper createBeanInstance(String beanName, RootBeanDefinition mbd, Object[] args) {
	Class<?> beanClass = resolveBeanClass(mbd, beanName);
	
	...
	// BeanPostProcessors是否指定构造方法
	Constructor<?>[] ctors = determineConstructorsFromBeanPostProcessors(beanClass, beanName);
	if (ctors != null ||
			mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_CONSTRUCTOR ||
			mbd.hasConstructorArgumentValues() || !ObjectUtils.isEmpty(args))  {
		return autowireConstructor(beanName, mbd, ctors, args);
	}
	
	// 没有指定，直接调用无参构造方法
	return instantiateBean(beanName, mbd);

}
```

`autowireConstructor`逻辑非常复杂，这里不展开。

```
protected BeanWrapper instantiateBean(final String beanName, final RootBeanDefinition mbd) {
	...
	Object beanInstance;
	
	beanInstance = getInstantiationStrategy().instantiate(mbd, beanName, parent);	// 创建bena
	BeanWrapper bw = new BeanWrapperImpl(beanInstance);	// 创建beanWrapper
	initBeanWrapper(bw);	// 注册用户自定义的处理器
	return bw;
	
}
```
`getInstantiationStrategy()`返回CglibSubclassingInstantiationStrategy，CglibSubclassingInstantiationStrategy继承 SimpleInstantiationStrategy,`getInstantiationStrategy().instantiate`调用到
SimpleInstantiationStrategy.instantiate:
```
public Object instantiate(RootBeanDefinition bd, String beanName, BeanFactory owner) {
	constructorToUse = (Constructor<?>) bd.resolvedConstructorOrFactoryMethod;
	
	
		final Class<?> clazz = bd.getBeanClass();
		
		constructorToUse =	clazz.getDeclaredConstructor((Class[]) null);	// 获取构造方法
		
		return BeanUtils.instantiateClass(constructorToUse); // 返回实例
}

public static <T> T instantiateClass(Constructor<T> ctor, Object... args)... {
	ReflectionUtils.makeAccessible(ctor);
	return ctor.newInstance(args);	// 返回实例
}

```


在读取配置时，已经将属性的propername，type等基本消息读取存放到PropertyValues中，
`populateBean`解析属性的值，并注入到bean中。
```
protected void populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw) {
	PropertyValues pvs = mbd.getPropertyValues();	// 已从配置中读取的属性信息

	...
	
	if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME ||
			mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
		MutablePropertyValues newPvs = new MutablePropertyValues(pvs);

		// 通过bean name自动注入
		if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME) {
			autowireByName(beanName, mbd, bw, newPvs);
		}

		// 通过bean type自动注入
		if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
			autowireByType(beanName, mbd, bw, newPvs);
		}

		pvs = newPvs;
	}


	boolean hasInstAwareBpps = hasInstantiationAwareBeanPostProcessors();
	// 根据需要进行postProcesst处理
	for (BeanPostProcessor bp : getBeanPostProcessors()) {
		if (bp instanceof InstantiationAwareBeanPostProcessor) {
			InstantiationAwareBeanPostProcessor ibp = (InstantiationAwareBeanPostProcessor) bp;
			pvs = ibp.postProcessPropertyValues(pvs, filteredPds, bw.getWrappedInstance(), beanName);
			if (pvs == null) {
				return;
			}
		}
	}

	// 将值注到bean中
	applyPropertyValues(beanName, mbd, bw, pvs);
}

```


查看一下通过bean name获取属性值
```
protected void autowireByName(
			String beanName, AbstractBeanDefinition mbd, BeanWrapper bw, MutablePropertyValues pvs) {
	for (String propertyName : propertyNames) {
		Object bean = getBean(propertyName);	// 获取bean
		pvs.add(propertyName, bean);	// 将bean添加到属性中
		registerDependentBean(propertyName, beanName);	// 声明依赖
	}			
}
```

属性的注入也是比较复杂的过程，这里不再展开了...
 




