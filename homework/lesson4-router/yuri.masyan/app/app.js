/**
 * Created by y.masyan on 08.02.2017.
 */

angular.module('app', ['ui.router', 'ngMaterial'])
.run(function($http, $transitions) {
  // $transitions.onEnter({ entering: 'admin' }, function(transition, state) {
  //   var AuditService = trans.injector().get('AuditService');
  //   AuditService.log("Entered " + state.name + " module while transitioning to " + transition.to().name);
  // })
  // $http.get('data/people.json', { cache: true });
})
  .service('PeopleService', function($http) {
    var service = {
      getAllPeople: function() {
        return $http.get('http://test-api.javascript.ru/v1/iliakan/users/', { cache: true }).then(function(resp) {
          console.log(resp);
          return resp.data;
        });
      },
      getPersonById: function(id) {
        return $http.get('http://test-api.javascript.ru/v1/iliakan/users/'+id, { cache: true }).then(function(resp) {
          return resp.data;
        });
      },

      getPerson: function(id) {
        function personMatchesParam(person) {
          return person.id === id;
        }

        return service.getAllPeople().then(function (people) {
          return people.find(personMatchesParam)
        });
      }
    }

    return service;
  })

  .factory('inboxService', function ($http) {
    let inboxService = {};

    inboxService.data = [];
    inboxService.getData = function () {
      $http({
        method: 'GET',
        url: 'https://learn.javascript.ru/courses/groups/api/participants?key=1gvlw0r'
      }).then(function (response) {
        console.log('Данные получены!');
        inboxService.data = response.data;
        for (let i = 0; i < inboxService.data.length; i++) {
          inboxService.data[i].messageReceived = new Date(3600 * 24 * 365 * 47 * 1000 * Math.random());
        }
      });
    };
    inboxService.getData();

    return inboxService;
  })

  .component('inboxComponent', {
    template: `
<div class="inbox col-sm-10">
    <input type="text" class="form-control" placeholder="Temporary search field" ng-model="text">
    <ul class="list-unstyled">
        <message-component card="card" time="$ctrl.currentTime" delete="$ctrl.deleteItem(x)" ng-repeat="card in $ctrl.cards.data | orderBy: 'messageReceived' : true | filter: text" ></message-component>
    </ul>
</div>`,
    controller: function (inboxService) {

      this.currentTime = new Date();
      this.cards = inboxService;


      this.deleteItem = (index) => {
        this.cards.data.splice(this.cards.data.indexOf(index), 1)
      };
      this.name = 'John';
      this.isShown = true;

      this.checkMe = (show) => {
        this.isShown = show
      };

    }
  })

  .component('messageComponent', {
    template: `
<li class="email-item row">
    <div class="people col-sm-3">
        <ul class="mail-icons list-inline">
            <li>
                <input type="checkbox" class="mail-select">
            </li>
            <li>
                <span class="glyphicon glyphicon-star-empty"></span>
            </li>
            <li>
                <span class="glyphicon glyphicon-cutlery"></span>
            </li>
        </ul>

        <span class="people-names">
            {{$ctrl.card.firstName}} {{$ctrl.card.surname}}
                </span>
    </div><!-- people -->

    <div class="message col-sm-7">
        <div class="clipper">
            <h3>About your pizza</h3>
            -
            <p>Тестовый текст, содержащий имя {{$ctrl.card.firstName}} и страну {{$ctrl.card.country}}</p>
        </div>
    </div><!-- message -->

    <div class="date col-sm-2">
        <date class="pull-right">
            <!--{{$ctrl.card.messageReceived | date}}-->
            <!--{{$ctrl.time | date}}-->
            {{($ctrl.card.messageReceived) | DaysAgo}}</date>
    </div><!-- date -->
    <button ng-click="$ctrl.callbackDelete({x: $ctrl.card})">Delete</button>
</li>
`,
    controller: function () {
    },
    bindings: {
      card: '<card',
      time: '<time',
      callbackDelete: '&delete',
    }
  })
  .filter('DaysAgo', function () {
    return function (date, ...args) {
      // console.log(date);
      date = date.getTime();
      let time = new Date();
      time = time.getTime();
      let days = Math.round((time - date) / 3600 / 24);
      return `прошло ${days} дней`;
    }
  })