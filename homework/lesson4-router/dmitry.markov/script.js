// jshint asi: true
;(function () {
  'use strict'

  angular.element(document).ready(() => {
    angular.element(document.querySelector('#mySpinner')).detach()
  })

  angular.module('userList', ['angular-ladda',
                              'ngAnimate',
                              'ngStorage',
                              'toastr',
                              'ui.bootstrap',
                              'ui.router'])
  let app = angular.module('userList')

  app.config(($stateProvider, $urlRouterProvider, toastrConfig) => {
    /**
     * @desc Задаем дефолтные стили для toastr
     */
    angular.extend(toastrConfig, {
      positionClass: 'toast-bottom-center',
      timeOut: 3500
    })

    /**
     * @desc Роутинг приложения
     */
    $stateProvider
      .state('user', {
        abstract: true,
        name: 'user',
        url: ''
      })
      .state('user.list', {
        name: 'userList',
        url: '/user',
        data: { pageTitle: 'User List' },
        component: 'userList',
        resolve: {
          users: userService => userService.getUsers()
        }
      })
      .state('user.card', {
        name: 'userCard',
        url: '/user/{id}',
        data: { pageTitle: 'User Details' },
        component: 'userCard',
        resolve: {
          user: (userService, $transition$) => userService.getUser($transition$.params().id),
          index: $transition$ => $transition$.params().id
        }
      })
      .state('login', {
        name: 'login',
        url: '/login',
        data: { pageTitle: 'Login' },
        component: 'appLogin',
        resolve: {
          isAuthed: authService => authService.isAuthorized()
        }
      })
    $urlRouterProvider
      .when('/', '/user')
      .otherwise('/user')
  })

  app.run(($rootScope, $state, $transitions, toastr) => {
    // Чтобы менять <title> страницы
    $rootScope.$state = $state

    /**
     * @desc Если пользователь не залогинен, посылаем на логин
     */
    $transitions.onStart({ to: 'user.**' }, trans => {
      let auth = trans.injector().get('authService')
      if (!auth.isAuthorized()) {
        toastr.warning(`Пожалуйста, залогиньтесь`)
        return trans.router.stateService.target('login')
      }
    })

    /**
     * @desc Показываем спиннер, пока route грузится (и резолвится)
     */
    $transitions.onStart({ }, trans => {
      let SpinnerService = trans.injector().get('spinnerService')
      SpinnerService.transitionStart()
      trans.promise.finally(SpinnerService.transitionEnd)
    })
  })

  app.component('appRoot', {
    template: `
      <div class="container">
        <app-nav></app-nav>
        <div ui-view></div>
      </div>
    `
  })

  app.component('appNav', {
    templateUrl: 'app-nav.html',
    controller ($state, authService) {
      this.isNavCollapsed = true
      this.isAuthed = authService.isAuthorized()

      /**
       * @desc Проверяем, не залогинился ли пользователь, чтобы сменить Login на Logout
       */
      this.$doCheck = () => {
        this.isAuthed = authService.isAuthorized()
      }

      /**
       * @desc Отправляем команду выхода из системы в authService
       */
      this.logout = $event => {
        $event.stopPropagation()
        if (authService.logout()) {
          this.isAuthed = null
          $state.go('login')
        }
      }
    }
  })

  app.component('appLogin', {
    templateUrl: 'app-login.html',
    bindings: {
      isAuthed: '<'
    },
    controller ($state, authService) {
      this.login = null
      this.password = null
      this.loginSuccess = false

      /**
       * @desc Отправляем данные формы в сервис authService
       */
      this.doLogin = () => {
        const loginFormData = {
          login: this.login,
          password: this.password
        }
        this.loginLoading = true
        authService.login(loginFormData)
          .then(status => {
            $state.go('user.list')
            this.loginSuccess = true
            this.loginLoading = false

        }).catch(status => {
            this.loginLoading = false
        })
      }

      /**
       * @desc Отправляем команду выхода из системы в authService
       */
      this.logout = $event => {
        $event.stopPropagation()
        if (authService.logout()) this.isAuthed = null
      }
    }
  })

  app.component('userList', {
    templateUrl: 'user-list.html',
    bindings: {
      users: '<'
    },
    controller ($state) {
      /**
       * @desc Переходим на userCard по клику на строку таблицы
       */
      this.goUserCard = index => {
        $state.go('user.card', { id: index })
      }
    }
  })

  app.component('userCard', {
    templateUrl: 'user-card.html',
    bindings: {
      user: '<',
      index: '<'
    },
    controller ($state, backgroundService, countryService, userService) {
      this.$onInit = () => {
        // получаем полное имя
        this.fullName = this.user.firstName + ' ' + this.user.surname
        // получаем название страны по коду
        this.country = countryService[this.user.country]
        // задаем аватар по-умолчанию, если нет фото
        this.avatar = this.user.photo ? this.user.photo : 'https://top.kz/assets/empty-avatar-c8775f1f4a1c5f0be17dfe4ae0de5fad.png'
        // задаем рандомный беграунд
        this.background = { 'background-image': 'url(' + backgroundService.getRandom() + ')' }
      }

      /**
       * @desc Удаление пользователя через сервис и переход на список пользователей
       */
      this.deleteUser = ($event, index) => {
        $event.stopPropagation()
        userService.deleteUser(index)
        $state.go('user.list', null, { reload: 'user.list' })
      }
    }
  })

  /**
   * @name userService
   * @desc Сервис для работы с данными пользователей
   */
  app.service('userService', function ($http, $q, toastr) {
    const url = 'https://learn.javascript.ru/courses/groups/api/participants?key=1gvlw0r'
    let users = null

    /**
     * @desc Получение списка всех пользователей
     * @returns {Promise}
     */
    this.getUsers = () => {
      if (users) { return $q.resolve(users) }
      return $http.get(url)
                  .then(res => users = res.data,
                        err => { toastr.info(err.data) })
    }

    /**
     * @desc Получение данных пользователя. Если нет в кэше, делаем запрос и сохраняем
     * @param {Number} index - индекс пользователя в массиве
     * @returns {Promise}
     */
    this.getUser = id => {
      if (users) { return $q.resolve(users[id]) }
      return $http.get(url)
                  .then(res => {
                    users = res.data
                    return users[id]
                  }, err => { toastr.info(err.data) })
    }

    /**
     * @desc Удаление пользователя из локального массива
     * @param {Number} index - индекс пользователя в массиве
     */
    this.deleteUser = id => {
      const deleted = users.splice(id, 1)
      toastr.error(`Пользователь ${deleted[0].firstName} удален`)
    }
  })

  /**
   * @name authService
   * @desc Сервис авторизации
   */
  app.service('authService', function ($q, $timeout, $localStorage, toastr) {
    let auth = $localStorage.auth || null
    const userCredentials = {
      login: 'admin',
      password: 'admin'
    }

    /**
     * @desc Возвращает объект авторизации или null если неавторизован
     * @returns {Object|null}
     */
    this.isAuthorized = () => auth

    /**
     * @desc Пытаемся залогиниться с данными формы и сохраняем в localStorage и auth
     * @param {Object} loginFormData - содержит логин и пароль
     * @returns {Promise} имитация запроса к backend
     */
    this.login = loginFormData => {
      let deferred = $q.defer()

      $timeout(() => {
        if (loginFormData.login === userCredentials.login &&
            loginFormData.password === userCredentials.password) {
          $localStorage.auth = auth = loginFormData
          toastr.success(`Вы успешно авторизовались`)
          deferred.resolve(200)
        } else {
          toastr.error(`Логин или пароль не подходят`)
          deferred.reject(403)
        }
      }, 1000)

      return deferred.promise
    }

    /**
     * @desc Деавторизация пользователя
     * @returns {Boolean}
     */
    this.logout = () => {
      try {
        auth = null
        delete $localStorage.auth
        toastr.success(`Вы успешло вышли из системы`)

        return true
      } catch (e) {
        toastr.error(`Неожиданный поворот`)
        return false
      }
    }
  })

  /**
   * @name spinnerService
   * @desc Возвращает спиннер
   * @returns {Object}
   */
  app.service('spinnerService', function () {
    let count = 0

    /**
     * @desc Добавляет спиннер на страницу при смене раута
     */
    function showSpinner () {
      let elem = angular.element(document.querySelector('body'))
      elem.append(`
        <div class="text-center" id="mySpinner">
          <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
          </div>
          <div class="loading-text">Загрузка</div>
        </div>
      `)
    }

    /**
     * @desc Удаляет спиннер при смене раута
     */
    function hideSpinner () {
      let elem = angular.element(document.querySelector('#mySpinner'))
      elem.detach()
    }

    return {
      transitionStart () { if (++count > 0) showSpinner() },
      transitionEnd () { if (--count <= 0) hideSpinner() }
    }
  })

  /**
   * @name countryService
   * @desc Возвращает коллекцию стран
   * @returns {Object}
   */
  app.factory('countryService', function () {
    const countries = {
      ca: 'Канада',
      ru: 'Российская Федерация',
      ua: 'Украина'
    }

    return countries
  })

  /**
   * @name backgroundService
   * @desc Возвращает случайный фон для карточек пользователя
   */
  app.service('backgroundService', function () {
    const backgrounds = ['//cdn.shopify.com/s/files/1/0691/5403/t/130/assets/insta-1.jpg',
                         '//mark.addmin.ru/images/background-1716350_960_720.jpg',
                         '//mark.addmin.ru/images/background-1774911_960_720.jpg',
                         '//mark.addmin.ru/images/background-1695799_960_720.jpg',
                         '//cdn.shopify.com/s/files/1/0691/5403/t/130/assets/insta-2.jpg',
                         '//mark.addmin.ru/images/background-1709785_960_720.jpg']
    /**
     * @name getRandom
     * @kind function
     * @desc Выбирает случайный элемент из массива backgrounds
     * @returns {String}
     */
    this.getRandom = () => backgrounds[Math.round(Math.random() * (backgrounds.length - 1))]
  })

})()
